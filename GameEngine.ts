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
  steerLeft: boolean; steerRight: boolean; throttle: boolean;
  brake: boolean; horn: boolean; boost: boolean;
}
export interface RemotePlayerState {
  playerId: string; x: number; z: number;
  rotation?: number; speed?: number; bikeId?: string;
}
interface RemoteBike {
  group: THREE.Group; targetX: number; targetZ: number;
  targetRotation: number; speed: number; bikeId: string;
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

  public playerX = 0; public playerZ = 0;
  public speedKmh = 0; public targetSpeedKmh = 0;
  public currentLean = 0; public targetLean = 0;
  public gear = 1; public rpmNorm = 0.2;
  public distanceMeters = 0; public score = 0;
  public closeCallsCount = 0; public comboStreak = 0;
  public maxSpeedReached = 0; public timeLeft = 75;
  public isCrashing = false;
  private crashTimer = 0;
  private crashAngularVel = new THREE.Vector3();
  public inputs: InputState = {
    steerLeft: false, steerRight: false, throttle: false,
    brake: false, horn: false, boost: false,
  };
  public isRunning = false; public isPaused = false; public isGameOver = false;
  public mode: GameMode = 'one-way';
  public throttleIntensity = 0; public brakeIntensity = 0;
  private clock: THREE.Clock;
  private animFrameId = 0;
  private isSoftwareGl = false;
  private remoteBikes = new Map<string, RemoteBike>();
  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (finalStats: GameStats) => void;

  constructor(container: HTMLElement, initialBike: MotorcycleConfig = MOTORCYCLE_REGISTRY[0]) {
    this.container = container;
    this.currentBike = initialBike;

    this.isSoftwareGl = (() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x91aabd);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.Fog(fogColor, GAME_CONSTANTS.FOG_NEAR, GAME_CONSTANTS.FOG_FAR);

    const skyGeo = new THREE.SphereGeometry(720, 48, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(),
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
      depthWrite: false,
      // Keep depth testing enabled so the sky cannot draw over the road or scenery.
      depthTest: true,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    const aspect = Math.max(0.1, container.clientWidth / Math.max(1, container.clientHeight));
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.05, 900);
    this.camera.position.set(0, GAME_CONSTANTS.CAMERA_HEIGHT, GAME_CONSTANTS.CAMERA_Z);
    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);
    this.skyDome.position.copy(this.camera.position);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
    sun.position.set(35, 75, -50);
    sun.castShadow = !this.isSoftwareGl;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 180;
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x9bbbd8, 0x263a2a, 1.0));

    const maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
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
    const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.42 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.88 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 1.25), metal);
    body.position.y = 0.65; group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.48), dark);
    seat.position.set(0, 0.88, 0.05); group.add(seat);
    const wheelGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.13, 20);
    for (const z of [-0.43, 0.48]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.3, z); group.add(wheel);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.75, roughness: 0.3 }));
    bar.position.set(0, 0.95, -0.18); group.add(bar);
    group.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    return group;
  }

  public updateRemotePlayer(state: RemotePlayerState) {
    if (!state || typeof state.playerId !== 'string' || !state.playerId ||
        state.playerId.length > 100 || !Number.isFinite(state.x) || !Number.isFinite(state.z)) return;
    let remote = this.remoteBikes.get(state.playerId);
    if (!remote) {
      const group = this.createRemoteBike();
      this.scene.add(group);
      remote = { group, targetX: state.x, targetZ: state.z, targetRotation: 0, speed: 0, bikeId: '' };
      this.remoteBikes.set(state.playerId, remote);
    }
    remote.targetX = THREE.MathUtils.clamp(state.x, -20, 20);
    remote.targetZ = state.z;
    remote.targetRotation = Number.isFinite(state.rotation) ? state.rotation! : 0;
    remote.speed = Number.isFinite(state.speed) ? THREE.MathUtils.clamp(state.speed!, 0, 300) : 0;
    remote.bikeId = String(state.bikeId || '').slice(0, 40);
  }

  public removeRemotePlayer(playerId: string) {
    const remote = this.remoteBikes.get(playerId);
    if (!remote) return;
    this.scene.remove(remote.group);
    remote.group.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => m.dispose());
    });
    this.remoteBikes.delete(playerId);
  }

  public clearRemotePlayers() {
    for (const id of [...this.remoteBikes.keys()]) this.removeRemotePlayer(id);
  }

  private updateRemoteBikes(delta: number) {
    for (const remote of this.remoteBikes.values()) {
      remote.group.position.x = THREE.MathUtils.damp(remote.group.position.x, remote.targetX, 8, delta);
      remote.group.position.z = THREE.MathUtils.damp(remote.group.position.z, remote.targetZ, 8, delta);
      remote.group.rotation.y = THREE.MathUtils.damp(remote.group.rotation.y, remote.targetRotation, 8, delta);
    }
  }

  public startGame(mode: GameMode = 'one-way') {
    this.mode = mode; this.isGameOver = false; this.isCrashing = false; this.isPaused = false;
    this.crashTimer = 0; this.crashAngularVel.set(0, 0, 0);
    this.playerX = 0; this.playerZ = 0; this.speedKmh = 0; this.targetSpeedKmh = 0;
    this.distanceMeters = 0; this.score = 0; this.closeCallsCount = 0; this.comboStreak = 0;
    this.maxSpeedReached = 0; this.timeLeft = mode === 'time-rush' ? 75 : 9999;
    this.gear = 1; this.rpmNorm = 0.2; this.currentLean = 0; this.targetLean = 0;
    this.throttleIntensity = 0; this.brakeIntensity = 0;
    this.camera.position.set(0, GAME_CONSTANTS.CAMERA_HEIGHT, GAME_CONSTANTS.CAMERA_Z);
    this.camera.rotation.set(GAME_CONSTANTS.CAMERA_BASE_PITCH, 0, 0);
    this.updateCameraPerspective();
    this.skyDome.position.copy(this.camera.position);
    this.scenery.reset(this.playerZ);
    this.traffic.reset(this.playerZ, mode);
    this.clearRemotePlayers();
    this.isRunning = true;
    this.clock.start();
    if (!this.animFrameId) this.tick();
  }

  public pauseGame() { this.isPaused = true; sounds.stopAll(); }
  public resumeGame() { this.isPaused = false; sounds.resume(); }

  private handleCrash() {
    if (this.isCrashing || this.isGameOver) return;
    this.isCrashing = true; this.crashTimer = 0;
    this.crashAngularVel.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 15);
    sounds.playCrash(); sounds.stopAll();
  }

  private handleCloseCall(info: { points: number; speedKmh: number }) {
    this.closeCallsCount++; this.comboStreak++;
    const bonus = info.points * Math.min(this.comboStreak, 5);
    this.score += bonus;
    if (this.mode === 'time-rush') this.timeLeft += 2.5;
    sounds.playCloseCall();
    this.onStatsUpdate?.(this.getStatsSnapshot(`CLOSE CALL! +${bonus}`, bonus));
  }

  private tick = () => {
    if (!this.isRunning && !this.isPaused) { this.animFrameId = 0; return; }
    this.animFrameId = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.isRunning && !this.isPaused) {
      if (this.isCrashing) this.updateCrash(delta);
      else this.updateGameplay(delta);
      this.updateRemoteBikes(delta);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private updateGameplay(delta: number) {
    const bike = this.currentBike;
    const { GUARDRAIL_OFFSET, MAX_LEAN_ANGLE } = GAME_CONSTANTS;
    let steerDir = 0;
    if (this.inputs.steerLeft) steerDir--;
    if (this.inputs.steerRight) steerDir++;
    const safeSpeed = Math.max(0, Number.isFinite(this.speedKmh) ? this.speedKmh : 0);
    const speedRatio = Math.max(0.18, Math.min(1, safeSpeed / Math.max(1, bike.topSpeedKmh)));
    this.playerX += steerDir * bike.steerRate * speedRatio * delta;
    const maxX = GUARDRAIL_OFFSET - 0.75;
    if (Math.abs(this.playerX) > maxX) {
      this.playerX = Math.sign(this.playerX) * maxX;
      this.speedKmh = Math.max(0, safeSpeed - 3 * delta);
    }
    this.targetLean = -steerDir * MAX_LEAN_ANGLE;
    this.currentLean = THREE.MathUtils.damp(this.currentLean, this.targetLean, 8, delta);
    const topSpeed = Math.max(1, bike.topSpeedKmh);
    this.throttleIntensity = THREE.MathUtils.damp(this.throttleIntensity, this.inputs.throttle ? 1 : 0, 4.2, delta);
    this.brakeIntensity = THREE.MathUtils.damp(this.brakeIntensity, this.inputs.brake ? 1 : 0, 7, delta);
    const currentSpeed = Math.max(0, Number.isFinite(this.speedKmh) ? this.speedKmh : 0);
    if (this.brakeIntensity > 0.05) {
      this.speedKmh = Math.max(0, currentSpeed - bike.brakeRate * this.brakeIntensity * delta);
    } else if (this.throttleIntensity > 0.02) {
      const normalized = Math.min(1, currentSpeed / topSpeed);
      const power = Math.max(0.24, 1 - Math.pow(normalized, 1.35));
      this.speedKmh = Math.min(topSpeed, currentSpeed + bike.accelRate * 1.3 * this.throttleIntensity * power * delta);
    } else {
      const drag = 0.25 + (currentSpeed / 100) * 0.35;
      this.speedKmh = Math.max(0, currentSpeed - drag * delta);
    }
    if (!Number.isFinite(this.speedKmh) || this.speedKmh < 0) this.speedKmh = 0;
    this.maxSpeedReached = Math.max(this.maxSpeedReached, Math.round(this.speedKmh));
    this.updateGears();
    const speedMs = this.speedKmh / 3.6;
    this.playerZ -= speedMs * delta;
    this.distanceMeters += speedMs * delta;
    if (this.speedKmh > 80) this.score += Math.round((this.speedKmh - 80) * 0.14);
    if (this.mode === 'time-rush') {
      this.timeLeft -= delta;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.handleCrash(); }
    }
    const pitch = GAME_CONSTANTS.CAMERA_BASE_PITCH + (this.inputs.throttle ? -0.012 : 0) + (this.inputs.brake ? 0.024 : 0);
    this.camera.position.set(this.playerX + this.currentLean * 0.12, GAME_CONSTANTS.CAMERA_HEIGHT, this.playerZ + GAME_CONSTANTS.CAMERA_Z);
    this.camera.rotation.z = this.currentLean;
    this.camera.rotation.x = pitch;
    this.camera.rotation.y = -steerDir * 0.035;
    this.skyDome.position.copy(this.camera.position);
    const time = this.clock.getElapsedTime();
    this.cockpit.updatePhysics(steerDir, this.inputs.brake, this.throttleIntensity, this.speedKmh, time);
    this.cockpit.updateDash(this.speedKmh, this.rpmNorm, this.gear, this.distanceMeters);
    this.scenery.update(this.playerZ);
    this.traffic.update(delta, this.playerX, this.playerZ, this.speedKmh);
    sounds.updateEngine(this.speedKmh, this.rpmNorm, this.inputs.throttle, this.inputs.brake);
    sounds.setHorn(this.inputs.horn);
    if (this.onStatsUpdate && Math.floor(time * 30) % 2 === 0) this.onStatsUpdate(this.getStatsSnapshot());
  }

  private updateGears() {
    const max = this.currentBike.topSpeedKmh;
    const count = this.currentBike.id.includes('450') ? 6 : 5;
    let gear = 1, min = 0, maxGear = max / count;
    for (let g = 1; g <= count; g++) {
      const gMin = ((g - 1) / count) * max * 0.85;
      const gMax = (g / count) * max * (g === count ? 1.05 : 0.95);
      if (this.speedKmh >= gMin) { gear = g; min = gMin; maxGear = gMax; }
    }
    if (gear !== this.gear) { sounds.playGearShift(); this.gear = gear; }
    const progress = THREE.MathUtils.clamp((this.speedKmh - min) / Math.max(1, maxGear - min), 0, 1);
    this.rpmNorm = 0.2 + progress * 0.8;
  }

  private updateCrash(delta: number) {
    this.crashTimer += delta;
    this.camera.rotation.x += this.crashAngularVel.x * delta;
    this.camera.rotation.y += this.crashAngularVel.y * delta;
    this.camera.rotation.z += this.crashAngularVel.z * delta;
    this.speedKmh = Math.max(0, this.speedKmh - 75 * delta);
    this.playerZ -= (this.speedKmh / 3.6) * delta;
    this.camera.position.z = this.playerZ;
    this.camera.position.y = Math.max(0.35, this.camera.position.y - 1.8 * delta);
    this.skyDome.position.copy(this.camera.position);
    this.scenery.update(this.playerZ);
    if (this.crashTimer > 1.3 && !this.isGameOver) {
      this.isGameOver = true; this.isRunning = false;
      this.onGameOver?.(this.getStatsSnapshot());
    }
  }

  public getStatsSnapshot(closeCallText: string | null = null, points = 0): GameStats {
    return {
      speedKmh: Math.round(this.speedKmh), rpmNorm: this.rpmNorm, gear: this.gear,
      distanceMeters: Math.round(this.distanceMeters), score: this.score,
      closeCalls: this.closeCallsCount, combo: this.comboStreak,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)), gameOver: this.isGameOver,
      gameStarted: this.isRunning, isPaused: this.isPaused,
      lastCloseCallText: closeCallText, lastCloseCallPoints: points,
    };
  }

  public updateCameraPerspective = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    this.camera.aspect = aspect;
    if (aspect < 1) {
      const targetH = 72 * Math.PI / 180;
      const vFov = 2 * Math.atan(Math.tan(targetH / 2) / aspect);
      this.camera.fov = Math.min(84, Math.max(62, vFov * 180 / Math.PI));
      if (this.cockpit) { this.cockpit.group.scale.setScalar(0.9); this.cockpit.group.position.set(0, -0.035, 0.03); }
    } else {
      this.camera.fov = 60;
      if (this.cockpit) { this.cockpit.group.scale.setScalar(1); this.cockpit.group.position.set(0, 0, 0); }
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onResize = () => this.updateCameraPerspective();

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = 0;
    this.clearRemotePlayers();
    sounds.stopAll();
    this.renderer.dispose();
    const skyMaterial = this.skyDome.material;
    if (Array.isArray(skyMaterial)) skyMaterial.forEach(m => m.dispose());
    else skyMaterial.dispose();
    this.skyDome.geometry.dispose();
    if (this.renderer.domElement.parentElement === this.container) this.container.removeChild(this.renderer.domElement);
  }
}
