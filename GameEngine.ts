import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sounds } from './src/audio/SoundEffects';
import { GAME_CONSTANTS, GameMode, GameStats } from './constants';
import { CockpitModel } from './CockpitModel';
import { SceneryManager } from './Scenery';
import { MOTORCYCLE_REGISTRY, MotorcycleConfig } from './motorcycles';
import { TrafficManager } from './TrafficManager';
import { createSkyDomeTexture } from './textures';

export interface InputState {
  steerLeft: boolean;
  steerRight: boolean;
  throttle: boolean;
  brake: boolean;
  horn: boolean;
  boost: boolean;
}

export interface RemotePlayerState {
  playerId: string;
  x: number;
  z: number;
  rotation?: number;
  speed?: number;
  bikeId?: string;
}

interface RemoteBike {
  group: THREE.Group;
  targetX: number;
  targetZ: number;
  targetRotation: number;
  speed: number;
  bikeId: string;
}

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private skyDome!: THREE.Mesh;

  public currentBike: MotorcycleConfig = MOTORCYCLE_REGISTRY[0];

  public cockpit: CockpitModel;
  public scenery: SceneryManager;
  public traffic: TrafficManager;

  public playerX = 0;
  public playerZ = 0;
  public speedKmh = 0;
  public targetSpeedKmh = 0;
  public currentLean = 0;
  public targetLean = 0;
  public gear = 1;
  public rpmNorm = 0.2;
  public distanceMeters = 0;
  public score = 0;
  public closeCallsCount = 0;
  public comboStreak = 0;
  public maxSpeedReached = 0;
  public timeLeft = 75;

  public isCrashing = false;
  private crashTimer = 0;
  private crashAngularVel = new THREE.Vector3();

  public inputs: InputState = {
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
    horn: false,
    boost: false,
  };

  public isRunning = false;
  public isPaused = false;
  public isGameOver = false;
  public mode: GameMode = 'one-way';

  public throttleIntensity = 0;
  public brakeIntensity = 0;

  private clock: THREE.Clock;
  private animFrameId = 0;
  private isSoftwareGl = false;

  private remoteBikes = new Map<string, RemoteBike>();

  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (finalStats: GameStats) => void;

  constructor(
    container: HTMLElement,
    initialBike: MotorcycleConfig = MOTORCYCLE_REGISTRY[0]
  ) {
    this.container = container;
    this.currentBike = initialBike;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;

      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext
        ? ext.UNMASKED_RENDERER_WEBGL
        : gl.RENDERER;
      const gpu = String(gl.getParameter(param));

      gl.getExtension('WEBGL_lose_context')?.loseContext();

      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );

    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const horizonFogColor = new THREE.Color(0x8da7bf);
    this.scene.background = horizonFogColor;
    this.scene.fog = new THREE.Fog(
      horizonFogColor,
      GAME_CONSTANTS.FOG_NEAR,
      GAME_CONSTANTS.FOG_FAR
    );

    const skyGeo = new THREE.SphereGeometry(720, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(),
      side: THREE.BackSide,
      fog: false,
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    const aspect = container.clientWidth / container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.05, 900);

    this.camera.position.set(
      0,
      GAME_CONSTANTS.CAMERA_HEIGHT,
      GAME_CONSTANTS.CAMERA_Z
    );

    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmrem.dispose();

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.4);
    sunLight.position.set(35, 75, -50);
    sunLight.castShadow = !this.isSoftwareGl;

    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 180;
      sunLight.shadow.camera.left = -30;
      sunLight.shadow.camera.right = 30;
      sunLight.shadow.camera.top = 30;
      sunLight.shadow.camera.bottom = -30;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }

    this.scene.add(sunLight);
    this.scene.add(new THREE.HemisphereLight(0x7ea8cc, 0x223625, 0.95));

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.cockpit = new CockpitModel(this.currentBike);
    this.camera.add(this.cockpit.group);
    this.scene.add(this.camera);

    this.scenery = new SceneryManager(this.scene, maxAnisotropy);
    this.traffic = new TrafficManager(this.scene, this.mode);

    this.traffic.onCollision = () => this.handleCrash();
    this.traffic.onCloseCall = (info) => this.handleCloseCall(info);

    this.clock = new THREE.Clock();
    sounds.setProfile(this.currentBike.sound);

    window.addEventListener('resize', this.onResize);
    this.updateCameraPerspective();
  }

  public setMotorcycle(bike: MotorcycleConfig) {
    this.currentBike = bike;
    this.cockpit.setMotorcycle(bike);
    sounds.setProfile(bike.sound);
    this.updateCameraPerspective();
  }

  private createRemoteBike(color = 0x2563eb): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 1.25),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.35,
        roughness: 0.5,
      })
    );
    body.position.y = 0.65;
    group.add(body);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.48),
      new THREE.MeshStandardMaterial({
        color: 0x202020,
        roughness: 0.85,
      })
    );
    seat.position.set(0, 0.88, 0.05);
    group.add(seat);

    const wheelGeometry = new THREE.CylinderGeometry(0.29, 0.29, 0.13, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.9,
    });

    for (const z of [-0.43, 0.48]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.3, z);
      group.add(wheel);
    }

    const handlebar = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.7 })
    );
    handlebar.position.set(0, 0.95, -0.18);
    group.add(handlebar);

    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    return group;
  }

  public updateRemotePlayer(state: RemotePlayerState) {
    if (
      !state ||
      typeof state.playerId !== 'string' ||
      !state.playerId ||
      state.playerId.length > 100 ||
      !Number.isFinite(state.x) ||
      !Number.isFinite(state.z)
    ) {
      return;
    }

    let remote = this.remoteBikes.get(state.playerId);

    if (!remote) {
      const group = this.createRemoteBike();
      this.scene.add(group);

      remote = {
        group,
        targetX: state.x,
        targetZ: state.z,
        targetRotation: 0,
        speed: 0,
        bikeId: '',
      };

      this.remoteBikes.set(state.playerId, remote);
    }

    remote.targetX = THREE.MathUtils.clamp(state.x, -20, 20);
    remote.targetZ = state.z;
    remote.targetRotation = Number.isFinite(state.rotation)
      ? state.rotation!
      : 0;
    remote.speed = Number.isFinite(state.speed)
      ? THREE.MathUtils.clamp(state.speed!, 0, 300)
      : 0;
    remote.bikeId = String(state.bikeId || '').slice(0, 40);
  }

  public removeRemotePlayer(playerId: string) {
    const remote = this.remoteBikes.get(playerId);
    if (!remote) return;

    this.scene.remove(remote.group);

    remote.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.geometry.dispose();

      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
    });

    this.remoteBikes.delete(playerId);
  }

  public clearRemotePlayers() {
    for (const playerId of [...this.remoteBikes.keys()]) {
      this.removeRemotePlayer(playerId);
    }
  }

  private updateRemoteBikes(delta: number) {
    for (const remote of this.remoteBikes.values()) {
      remote.group.position.x = THREE.MathUtils.damp(
        remote.group.position.x,
        remote.targetX,
        8,
        delta
      );

      remote.group.position.z = THREE.MathUtils.damp(
        remote.group.position.z,
        remote.targetZ,
        8,
        delta
      );

      remote.group.rotation.y = THREE.MathUtils.damp(
        remote.group.rotation.y,
        remote.targetRotation,
        8,
        delta
      );
    }
  }

  public startGame(mode: GameMode = 'one-way') {
    this.mode = mode;

    this.isGameOver = false;
    this.isCrashing = false;
    this.isPaused = false;

    this.crashTimer = 0;
    this.crashAngularVel.set(0, 0, 0);

    this.playerX = 0;
    this.playerZ = 0;
    this.speedKmh = 0;
    this.targetSpeedKmh = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this.closeCallsCount = 0;
    this.comboStreak = 0;
    this.maxSpeedReached = 0;
    this.timeLeft = mode === 'time-rush' ? 75 : 9999;

    this.gear = 1;
    this.rpmNorm = 0.2;
    this.currentLean = 0;
    this.targetLean = 0;
    this.throttleIntensity = 0;
    this.brakeIntensity = 0;

    this.camera.position.set(
      0,
      GAME_CONSTANTS.CAMERA_HEIGHT,
      GAME_CONSTANTS.CAMERA_Z
    );
    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);

    this.updateCameraPerspective();
    this.scenery.reset(this.playerZ);
    this.traffic.reset(this.playerZ, mode);
    this.clearRemotePlayers();

    this.skyDome.position.set(this.camera.position.x, 0, this.playerZ);

    this.isRunning = true;
    this.clock.start();

    if (!this.animFrameId) {
      this.tick();
    }
  }

  public pauseGame() {
    this.isPaused = true;
    sounds.stopAll();
  }

  public resumeGame() {
    this.isPaused = false;
    sounds.resume();
  }

  private handleCrash() {
    if (this.isCrashing || this.isGameOver) return;

    this.isCrashing = true;
    this.crashTimer = 0;

    this.crashAngularVel.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 15
    );

    sounds.playCrash();
    sounds.stopAll();
  }

  private handleCloseCall(info: { points: number; speedKmh: number }) {
    this.closeCallsCount++;
    this.comboStreak++;

    const bonus = info.points * Math.min(this.comboStreak, 5);
    this.score += bonus;

    if (this.mode === 'time-rush') {
      this.timeLeft += 2.5;
    }

    sounds.playCloseCall();

    this.onStatsUpdate?.(
      this.getStatsSnapshot(`CLOSE CALL! +${bonus}`, bonus)
    );
  }

  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);

    if (this.isRunning && !this.isPaused) {
      if (this.isCrashing) {
        this.updateCrash(delta);
      } else {
        this.updateGameplay(delta);
      }

      this.updateRemoteBikes(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateGameplay(delta: number) {
    const bike = this.currentBike;
    const { GUARDRAIL_OFFSET, MAX_LEAN_ANGLE } = GAME_CONSTANTS;

    let steerDir = 0;
    if (this.inputs.steerLeft) steerDir -= 1;
    if (this.inputs.steerRight) steerDir += 1;

    const safeSpeed = Math.max(
      0,
      Number.isFinite(this.speedKmh) ? this.speedKmh : 0
    );

    const speedRatio = Math.max(
      0.18,
      Math.min(1.0, safeSpeed / Math.max(1, bike.topSpeedKmh))
    );

    this.playerX += steerDir * bike.steerRate * speedRatio * delta;

    const maxBoundX = GUARDRAIL_OFFSET - 0.75;

    if (Math.abs(this.playerX) > maxBoundX) {
      this.playerX = Math.sign(this.playerX) * maxBoundX;
      this.speedKmh = Math.max(0, safeSpeed - 3 * delta);
    }

    this.targetLean = -steerDir * MAX_LEAN_ANGLE;
    this.currentLean = THREE.MathUtils.damp(
      this.currentLean,
      this.targetLean,
      8,
      delta
    );

    // No boost multiplier: use the motorcycle's normal configured top speed.
    const topSpeed = Math.max(1, bike.topSpeedKmh);

    // Smooth throttle and brake response.
    const targetThrottle = this.inputs.throttle ? 1 : 0;
    this.throttleIntensity = THREE.MathUtils.damp(
      this.throttleIntensity,
      targetThrottle,
      4.2,
      delta
    );

    const targetBrake = this.inputs.brake ? 1 : 0;
    this.brakeIntensity = THREE.MathUtils.damp(
      this.brakeIntensity,
      targetBrake,
      7,
      delta
    );

    const currentSpeed = Math.max(
      0,
      Number.isFinite(this.speedKmh) ? this.speedKmh : 0
    );

    if (this.brakeIntensity > 0.05) {
      // Firm but progressive braking.
      const brakeForce = bike.brakeRate * this.brakeIntensity;
      this.speedKmh = Math.max(
        0,
        currentSpeed - brakeForce * delta
      );
    } else if (this.throttleIntensity > 0.02) {
      // Keep useful acceleration at medium/high speeds without a boost.
      const normalizedSpeed = Math.min(1, currentSpeed / topSpeed);
      const powerFactor = Math.max(
        0.24,
        1 - Math.pow(normalizedSpeed, 1.35)
      );

      const acceleration =
        bike.accelRate *
        1.3 *
        this.throttleIntensity *
        powerFactor;

      this.speedKmh = Math.min(
        topSpeed,
        currentSpeed + acceleration * delta
      );
    } else {
      // Gentle coasting: releasing throttle should not drop speed abruptly.
      const coastDrag = 0.25 + (currentSpeed / 100) * 0.35;
      this.speedKmh = Math.max(
        0,
        currentSpeed - coastDrag * delta
      );
    }

    if (!Number.isFinite(this.speedKmh) || this.speedKmh < 0) {
      this.speedKmh = 0;
    }

    this.maxSpeedReached = Math.max(
      this.maxSpeedReached,
      Math.round(this.speedKmh)
    );

    this.updateGears();

    const speedMs = (this.speedKmh * 1000) / 3600;
    this.playerZ -= speedMs * delta;
    this.distanceMeters += speedMs * delta;

    if (this.speedKmh > 80) {
      this.score += Math.round((this.speedKmh - 80) * 0.14);
    }

    if (this.mode === 'time-rush') {
      this.timeLeft -= delta;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.handleCrash();
      }
    }

    const pitch =
      GAME_CONSTANTS.CAMERA_BASE_PITCH +
      (this.inputs.throttle ? -0.012 : 0) +
      (this.inputs.brake ? 0.024 : 0);

    this.camera.position.x = this.playerX + this.currentLean * 0.12;
    this.camera.position.y = GAME_CONSTANTS.CAMERA_HEIGHT;
    this.camera.position.z = this.playerZ + GAME_CONSTANTS.CAMERA_Z;

    this.camera.rotation.z = this.currentLean;
    this.camera.rotation.x = pitch;
    this.camera.rotation.y = -steerDir * 0.035;

    const time = this.clock.getElapsedTime();

    this.cockpit.updatePhysics(
      steerDir,
      this.inputs.brake,
      this.throttleIntensity,
      this.speedKmh,
      time
    );

    this.cockpit.updateDash(
      this.speedKmh,
      this.rpmNorm,
      this.gear,
      this.distanceMeters
    );

    this.skyDome.position.set(
      this.camera.position.x,
      0,
      this.playerZ
    );

    this.scenery.update(this.playerZ);
    this.traffic.update(delta, this.playerX, this.playerZ, this.speedKmh);

    sounds.updateEngine(
      this.speedKmh,
      this.rpmNorm,
      this.inputs.throttle,
      this.inputs.brake
    );

    sounds.setHorn(this.inputs.horn);

    if (this.onStatsUpdate && Math.floor(time * 30) % 2 === 0) {
      this.onStatsUpdate(this.getStatsSnapshot());
    }
  }

  private updateGears() {
    const bike = this.currentBike;
    const maxSpeed = bike.topSpeedKmh;
    const has6Gears = bike.id.includes('450');
    const numGears = has6Gears ? 6 : 5;

    let targetGear = 1;
    let gearMin = 0;
    let gearMax = maxSpeed / numGears;

    for (let g = 1; g <= numGears; g++) {
      const gMin = ((g - 1) / numGears) * maxSpeed * 0.85;
      const gMax =
        (g / numGears) *
        maxSpeed *
        (g === numGears ? 1.05 : 0.95);

      if (this.speedKmh >= gMin) {
        targetGear = g;
        gearMin = gMin;
        gearMax = gMax;
      }
    }

    if (targetGear !== this.gear) {
      sounds.playGearShift();
      this.gear = targetGear;
    }

    const gearProgress = Math.min(
      1,
      Math.max(
        0,
        (this.speedKmh - gearMin) / Math.max(1, gearMax - gearMin)
      )
    );

    this.rpmNorm = 0.2 + gearProgress * 0.8;
  }

  private updateCrash(delta: number) {
    this.crashTimer += delta;

    this.camera.rotation.x += this.crashAngularVel.x * delta;
    this.camera.rotation.y += this.crashAngularVel.y * delta;
    this.camera.rotation.z += this.crashAngularVel.z * delta;

    this.speedKmh = Math.max(0, this.speedKmh - 75 * delta);

    const speedMs = (this.speedKmh * 1000) / 3600;
    this.playerZ -= speedMs * delta;
    this.camera.position.z = this.playerZ;

    this.camera.position.y = Math.max(
      0.35,
      this.camera.position.y - 1.8 * delta
    );

    this.scenery.update(this.playerZ);
    this.skyDome.position.set(
      this.camera.position.x,
      0,
      this.playerZ
    );

    if (this.crashTimer > 1.3 && !this.isGameOver) {
      this.isGameOver = true;
      this.isRunning = false;
      this.onGameOver?.(this.getStatsSnapshot());
    }
  }

  public getStatsSnapshot(
    closeCallText: string | null = null,
    points = 0
  ): GameStats {
    return {
      speedKmh: Math.round(this.speedKmh),
      rpmNorm: this.rpmNorm,
      gear: this.gear,
      distanceMeters: Math.round(this.distanceMeters),
      score: this.score,
      closeCalls: this.closeCallsCount,
      combo: this.comboStreak,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      gameOver: this.isGameOver,
      gameStarted: this.isRunning,
      isPaused: this.isPaused,
      lastCloseCallText: closeCallText,
      lastCloseCallPoints: points,
    };
  }

  public updateCameraPerspective = () => {
    if (!this.container || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) return;

    const aspect = width / height;
    this.camera.aspect = aspect;

    if (aspect < 1) {
      const targetHFov = 72 * (Math.PI / 180);
      const vFovRad =
        2 * Math.atan(Math.tan(targetHFov / 2) / aspect);

      this.camera.fov = Math.min(
        84,
        Math.max(62, vFovRad * (180 / Math.PI))
      );

      if (this.cockpit) {
        this.cockpit.group.scale.set(0.9, 0.9, 0.9);
        this.cockpit.group.position.set(0, -0.035, 0.03);
      }
    } else {
      this.camera.fov = 60;

      if (this.cockpit) {
        this.cockpit.group.scale.set(1, 1, 1);
        this.cockpit.group.position.set(0, 0, 0);
      }
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onResize = () => {
    this.updateCameraPerspective();
  };

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animFrameId);
    this.clearRemotePlayers();
    sounds.stopAll();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
