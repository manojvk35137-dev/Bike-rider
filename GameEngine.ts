import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sounds } from '../audio/SoundEffects';
import { GAME_CONSTANTS, GameMode, GameStats } from './constants';
import { CockpitModel } from './models/CockpitModel';
import { SceneryManager } from './models/Scenery';
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

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private skyDome!: THREE.Mesh;

  // Selected motorcycle configuration
  public currentBike: MotorcycleConfig = MOTORCYCLE_REGISTRY[0];

  // Game submodules
  public cockpit: CockpitModel;
  public scenery: SceneryManager;
  public traffic: TrafficManager;

  // Player state
  public playerX: number = 0;
  public playerZ: number = 0;
  public speedKmh: number = 0;
  public targetSpeedKmh: number = 0;
  public currentLean: number = 0;
  public targetLean: number = 0;
  public gear: number = 1;
  public rpmNorm: number = 0.2;
  public distanceMeters: number = 0;
  public score: number = 0;
  public closeCallsCount: number = 0;
  public comboStreak: number = 0;
  public maxSpeedReached: number = 0;
  public timeLeft: number = 75; // for time-rush

  // Crash animation state
  public isCrashing: boolean = false;
  private crashTimer: number = 0;
  private crashAngularVel: THREE.Vector3 = new THREE.Vector3();

  // Control inputs
  public inputs: InputState = {
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
    horn: false,
    boost: false,
  };

  // State flags
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public mode: GameMode = 'one-way';

  // Loop & timing
  private clock: THREE.Clock;
  private animFrameId: number = 0;
  private isSoftwareGl: boolean = false;

  // Callbacks to UI
  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (finalStats: GameStats) => void;

  constructor(container: HTMLElement, initialBike: MotorcycleConfig = MOTORCYCLE_REGISTRY[0]) {
    this.container = container;
    this.currentBike = initialBike;

    // Detect software WebGL as per Three.js skill
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // Scene and Atmospheric Horizon Fog
    this.scene = new THREE.Scene();
    const horizonFogColor = new THREE.Color(0x8da7bf);
    this.scene.background = horizonFogColor;
    this.scene.fog = new THREE.Fog(horizonFogColor, GAME_CONSTANTS.FOG_NEAR, GAME_CONSTANTS.FOG_FAR);

    // Realistic Panoramic 360 Sky Dome with atmospheric sun, clouds & mountain ridges
    const skyGeo = new THREE.SphereGeometry(720, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(),
      side: THREE.BackSide,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Camera Setup - Realistic First-Person Rider Eye Level
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.05, 900);
    this.camera.position.set(0, GAME_CONSTANTS.CAMERA_HEIGHT, GAME_CONSTANTS.CAMERA_Z);
    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);

    // Studio Environment map via RoomEnvironment for realistic reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting
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

    const hemiLight = new THREE.HemisphereLight(0x7ea8cc, 0x223625, 0.95);
    this.scene.add(hemiLight);

    // Initialize Cockpit with selected motorcycle
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.cockpit = new CockpitModel(this.currentBike);
    this.camera.add(this.cockpit.group);
    this.scene.add(this.camera);

    this.scenery = new SceneryManager(this.scene, maxAnisotropy);
    this.traffic = new TrafficManager(this.scene, this.mode);

    this.traffic.onCollision = () => this.handleCrash();
    this.traffic.onCloseCall = (info) => this.handleCloseCall(info);

    this.clock = new THREE.Clock();

    // Set initial audio profile
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

  // Dynamic throttle and brake intensity for gradual acceleration and progressive braking
  public throttleIntensity: number = 0;
  public brakeIntensity: number = 0;

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

    this.camera.position.set(0, GAME_CONSTANTS.CAMERA_HEIGHT, GAME_CONSTANTS.CAMERA_Z);
    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);
    this.updateCameraPerspective();

    // Reset scenery & traffic around playerZ (0)
    this.scenery.reset(this.playerZ);
    this.traffic.reset(this.playerZ, mode);

    if (this.skyDome) {
      this.skyDome.position.set(this.camera.position.x, 0, this.playerZ);
    }

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

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStatsSnapshot(`CLOSE CALL! +${bonus}`, bonus));
    }
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
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateGameplay(delta: number) {
    const bike = this.currentBike;
    const {
      GUARDRAIL_OFFSET,
      MAX_LEAN_ANGLE,
    } = GAME_CONSTANTS;

    // 1. Steering & Lateral Movement
    let steerDir = 0;
    if (this.inputs.steerLeft) steerDir -= 1;
    if (this.inputs.steerRight) steerDir += 1;

    const safeSpeed = Math.max(0, isNaN(this.speedKmh) ? 0 : this.speedKmh);
    const speedRatio = Math.max(0.18, Math.min(1.0, safeSpeed / bike.topSpeedKmh));
    this.playerX += steerDir * bike.steerRate * speedRatio * delta;

    // Guardrail edge friction & soft clamping (NEVER an accidental crash during normal riding)
    const maxBoundX = GUARDRAIL_OFFSET - 0.75;
    if (Math.abs(this.playerX) > maxBoundX) {
      this.playerX = Math.sign(this.playerX) * maxBoundX;
      // Soft scrape friction slows down slightly without halting the motorcycle
      this.speedKmh = Math.max(0, safeSpeed - 18 * delta);
    }

    // Leaning kinematics
    this.targetLean = -steerDir * MAX_LEAN_ANGLE;
    this.currentLean = THREE.MathUtils.damp(this.currentLean, this.targetLean, 10, delta);

    // 2. Smooth Throttle, Progressive Braking & Realistic Coasting
    const topSpeed = this.inputs.boost ? bike.topSpeedKmh * 1.12 : bike.topSpeedKmh;

    const targetThrottle = this.inputs.throttle ? 1.0 : 0.0;
    this.throttleIntensity = THREE.MathUtils.damp(this.throttleIntensity, targetThrottle, 5.5, delta);

    const targetBrake = this.inputs.brake ? 1.0 : 0.0;
    this.brakeIntensity = THREE.MathUtils.damp(this.brakeIntensity, targetBrake, 8.0, delta);

    if (this.brakeIntensity > 0.05) {
      // Progressive Braking (takes ~3.0s to smoothly stop from 100 km/h)
      const brakeForce = bike.brakeRate * this.brakeIntensity;
      this.speedKmh = Math.max(0, safeSpeed - brakeForce * delta);
    } else if (this.throttleIntensity > 0.02) {
      // Smooth Acceleration based on motorcycle power curve
      const normalizedSpeed = Math.min(1.0, safeSpeed / topSpeed);
      const powerFactor = Math.max(0.12, 1.0 - Math.pow(normalizedSpeed, 1.6));
      const accel = bike.accelRate * this.throttleIntensity * powerFactor;
      this.speedKmh = Math.min(topSpeed, safeSpeed + accel * delta);
    } else {
      // Realistic Coasting: gradual rolling resistance & gentle engine braking
      // Motorcycle coasts smoothly for hundreds of meters; never drops to 0 instantly
      const coastDrag = 2.8 + (safeSpeed / 100) * 4.2;
      this.speedKmh = Math.max(0, safeSpeed - coastDrag * delta);
    }

    // Ensure speed is strictly a valid positive number
    if (isNaN(this.speedKmh) || this.speedKmh < 0) {
      this.speedKmh = 0;
    }

    if (this.speedKmh > this.maxSpeedReached) {
      this.maxSpeedReached = Math.round(this.speedKmh);
    }

    // 3. Transmission: 5-speed / 6-speed gear mapping
    this.updateGears();

    // 4. Longitudinal advancement forward along -Z strictly consistent with speed
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

    // 5. Update Camera & Cockpit First-Person Rider Dynamics
    const pitch =
      GAME_CONSTANTS.CAMERA_BASE_PITCH +
      (this.inputs.throttle ? -0.012 : 0) +
      (this.inputs.brake ? 0.024 : 0);

    // Lateral apex leaning shift (rider leans head into turn)
    this.camera.position.x = this.playerX + this.currentLean * 0.12;
    this.camera.position.y = GAME_CONSTANTS.CAMERA_HEIGHT;
    this.camera.position.z = this.playerZ + GAME_CONSTANTS.CAMERA_Z;

    this.camera.rotation.z = this.currentLean;
    this.camera.rotation.x = pitch;
    this.camera.rotation.y = -steerDir * 0.035;

    const time = this.clock.getElapsedTime();
    this.cockpit.updatePhysics(steerDir, this.inputs.brake, this.throttleIntensity, this.speedKmh, time);
    this.cockpit.updateDash(this.speedKmh, this.rpmNorm, this.gear, this.distanceMeters);

    // Keep Sky Dome centered around the camera so horizon is continuous
    if (this.skyDome) {
      this.skyDome.position.set(this.camera.position.x, 0, this.playerZ);
    }

    // 6. Update Highway Scenery and Traffic
    this.scenery.update(this.playerZ);
    this.traffic.update(delta, this.playerX, this.playerZ, this.speedKmh);

    // 7. Update Web Audio sounds with bike profile
    sounds.updateEngine(this.speedKmh, this.rpmNorm, this.inputs.throttle, this.inputs.brake);
    sounds.setHorn(this.inputs.horn);

    // 8. Dispatch stats to UI
    if (this.onStatsUpdate && Math.floor(time * 30) % 2 === 0) {
      this.onStatsUpdate(this.getStatsSnapshot());
    }
  }

  private updateGears() {
    const bike = this.currentBike;
    const maxSpeed = bike.topSpeedKmh;

    // 5-speed transmission for 350/500/411, 6-speed for modern Sherpa 450
    const has6Gears = bike.id.includes('450');
    const numGears = has6Gears ? 6 : 5;

    let targetGear = 1;
    let gearMin = 0;
    let gearMax = maxSpeed / numGears;

    for (let g = 1; g <= numGears; g++) {
      const gMin = ((g - 1) / numGears) * maxSpeed * 0.85;
      const gMax = (g / numGears) * maxSpeed * (g === numGears ? 1.05 : 0.95);
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

    const gearProgress = Math.min(1, Math.max(0, (this.speedKmh - gearMin) / Math.max(1, gearMax - gearMin)));
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
    this.camera.position.y = Math.max(0.35, this.camera.position.y - 1.8 * delta);

    // Keep scenery & sky updated throughout the crash sequence
    this.scenery.update(this.playerZ);
    if (this.skyDome) {
      this.skyDome.position.set(this.camera.position.x, 0, this.playerZ);
    }

    if (this.crashTimer > 1.3 && !this.isGameOver) {
      this.isGameOver = true;
      this.isRunning = false;
      if (this.onGameOver) {
        this.onGameOver(this.getStatsSnapshot());
      }
    }
  }

  public getStatsSnapshot(closeCallText: string | null = null, points: number = 0): GameStats {
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

    if (aspect < 1.0) {
      // Mobile Portrait Mode: widen vertical FOV so the handlebars, mirrors, and dashboard
      // are completely framed and clearly visible in the lower 35-40% of the screen
      const targetHFov = 72 * (Math.PI / 180);
      const vFovRad = 2 * Math.atan(Math.tan(targetHFov / 2) / aspect);
      this.camera.fov = Math.min(84, Math.max(62, vFovRad * (180 / Math.PI)));

      if (this.cockpit) {
        this.cockpit.group.scale.set(0.9, 0.9, 0.9);
        this.cockpit.group.position.set(0, -0.035, 0.03);
      }
    } else {
      // Landscape Mode (Desktop, Tablet, Landscape Phone)
      this.camera.fov = 60;
      if (this.cockpit) {
        this.cockpit.group.scale.set(1.0, 1.0, 1.0);
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
    sounds.stopAll();
    this.renderer.dispose();
  }
}
