import * as THREE from 'three';
import { GAME_CONSTANTS, GameMode } from './constants';
import { createVehicleModel, VehicleInstance, VehicleType } from './models/TrafficVehicles';

export class TrafficManager {
  public scene: THREE.Scene;
  public vehicles: VehicleInstance[] = [];
  public mode: GameMode = 'one-way';

  // Callbacks
  public onCollision?: () => void;
  public onCloseCall?: (info: { points: number; speedKmh: number; vehicleType: VehicleType }) => void;

  constructor(scene: THREE.Scene, mode: GameMode = 'one-way') {
    this.scene = scene;
    this.mode = mode;
  }

  public reset(playerZ: number, mode: GameMode = 'one-way') {
    this.mode = mode;
    // Clear all existing vehicles
    for (const v of this.vehicles) {
      this.scene.remove(v.mesh);
    }
    this.vehicles = [];

    // Seed initial traffic ahead along -Z
    for (let i = 0; i < 9; i++) {
      const spawnZ = playerZ - (45 + i * 32 + Math.random() * 15);
      this.spawnVehicle(spawnZ);
    }
  }

  private getRandomVehicleType(lane: number): VehicleType {
    if (lane === 3) {
      // Right slow lane: more trucks and buses
      const r = Math.random();
      if (r < 0.45) return 'truck';
      if (r < 0.75) return 'bus';
      if (r < 0.9) return 'van';
      return 'suv';
    } else if (lane === 0) {
      // Fast left lane: sedans and sport SUVs
      return Math.random() < 0.7 ? 'sedan' : 'suv';
    } else {
      const types: VehicleType[] = ['sedan', 'suv', 'van', 'sedan'];
      return types[Math.floor(Math.random() * types.length)];
    }
  }

  private getLaneSpeed(lane: number): number {
    if (this.mode === 'two-way' && (lane === 0 || lane === 1)) {
      // Oncoming traffic
      return -(80 + Math.random() * 30);
    }
    // One-way normal traffic speeds (km/h)
    switch (lane) {
      case 0: return 115 + Math.random() * 20; // 115 - 135 km/h
      case 1: return 98 + Math.random() * 18;  // 98 - 116 km/h
      case 2: return 85 + Math.random() * 16;  // 85 - 101 km/h
      case 3: default: return 70 + Math.random() * 18; // 70 - 88 km/h
    }
  }

  public spawnVehicle(spawnZ: number) {
    const laneIndex = Math.floor(Math.random() * GAME_CONSTANTS.LANES_COUNT);
    const laneX = GAME_CONSTANTS.LANE_CENTERS[laneIndex];

    // Check if there is already a vehicle too close in this lane
    const minSpacing = 28;
    for (const v of this.vehicles) {
      if (v.lane === laneIndex && Math.abs(v.z - spawnZ) < minSpacing) {
        return; // Avoid overlap
      }
    }

    const type = this.getRandomVehicleType(laneIndex);
    const { mesh, taillightMat, dimensions } = createVehicleModel(type);

    mesh.position.set(laneX, 0, spawnZ);

    // If oncoming traffic in two-way mode, rotate 180 degrees
    const isOncoming = this.mode === 'two-way' && (laneIndex === 0 || laneIndex === 1);
    if (isOncoming) {
      mesh.rotation.y = Math.PI;
    }

    const baseSpeed = this.getLaneSpeed(laneIndex);

    const vehicle: VehicleInstance = {
      mesh,
      type,
      lane: laneIndex,
      x: laneX,
      z: spawnZ,
      targetX: laneX,
      speedKmh: baseSpeed,
      baseSpeedKmh: baseSpeed,
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
      passedPlayer: false,
      closeCallAwarded: false,
      taillightMat,
      isBraking: false,
      colorName: type,
    };

    this.scene.add(mesh);
    this.vehicles.push(vehicle);
  }

  public update(delta: number, playerX: number, playerZ: number, playerSpeedKmh: number) {
    const { PLAYER_BOUNDS, CLOSE_CALL_MAX_DIST, CLOSE_CALL_MIN_SPEED_KMH, CLOSE_CALL_BONUS_SCORE } = GAME_CONSTANTS;

    // Maintain target count ahead
    if (this.vehicles.length < GAME_CONSTANTS.MAX_TRAFFIC_COUNT) {
      let minZ = playerZ - 80;
      for (const v of this.vehicles) {
        if (v.z < minZ) minZ = v.z;
      }
      this.spawnVehicle(minZ - (35 + Math.random() * 30));
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // Convert speed from km/h to m/s
      const speedMs = (Math.abs(v.speedKmh) * 1000) / 3600;
      // Normal traffic moves forward along -Z, oncoming moves towards +Z
      if (v.speedKmh >= 0) {
        v.z -= speedMs * delta;
      } else {
        v.z += speedMs * delta;
      }
      v.mesh.position.z = v.z;

      // Smooth lane following
      v.x = THREE.MathUtils.lerp(v.x, v.targetX, 0.05);
      v.mesh.position.x = v.x;

      // Traffic AI: Check if vehicle in front in same lane is too close -> brake
      let needsBrake = false;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (other.lane === v.lane && other.z < v.z && v.z - other.z < 26) {
          needsBrake = true;
          break;
        }
      }

      if (needsBrake) {
        v.speedKmh = Math.max(v.baseSpeedKmh * 0.65, v.speedKmh - 45 * delta);
        v.isBraking = true;
        v.taillightMat.emissiveIntensity = 2.2;
      } else {
        v.speedKmh = Math.min(v.baseSpeedKmh, v.speedKmh + 20 * delta);
        v.isBraking = false;
        v.taillightMat.emissiveIntensity = 0.6;
      }

      // Check Collision with Player Motorcycle
      const halfPlayerW = PLAYER_BOUNDS.width * 0.5;
      const halfPlayerL = PLAYER_BOUNDS.length * 0.5;
      const halfVehW = v.width * 0.46;
      const halfVehL = v.length * 0.46;

      const overlapX = Math.abs(playerX - v.x) < halfPlayerW + halfVehW;
      const overlapZ = Math.abs(playerZ - v.z) < halfPlayerL + halfVehL;

      if (overlapX && overlapZ) {
        this.onCollision?.();
        return;
      }

      // Check Close Call / Near Miss (Classic Traffic Rider mechanic)
      const lateralDist = Math.abs(playerX - v.x);
      const isAlongside = Math.abs(playerZ - v.z) < (v.length + PLAYER_BOUNDS.length) * 0.5;

      if (isAlongside && lateralDist <= CLOSE_CALL_MAX_DIST && lateralDist >= (halfPlayerW + halfVehW)) {
        if (!v.closeCallAwarded && playerSpeedKmh >= CLOSE_CALL_MIN_SPEED_KMH) {
          v.closeCallAwarded = true;
          const speedFactor = Math.floor(playerSpeedKmh / 20);
          const points = CLOSE_CALL_BONUS_SCORE + speedFactor * 50;
          this.onCloseCall?.({
            points,
            speedKmh: playerSpeedKmh,
            vehicleType: v.type,
          });
        }
      }

      // Despawn if vehicle is behind player (v.z > playerZ + DESPAWN) or too far ahead
      if (v.z > playerZ + GAME_CONSTANTS.DESPAWN_BEHIND_DISTANCE || v.z < playerZ - GAME_CONSTANTS.SPAWN_AHEAD_DISTANCE - 80) {
        this.scene.remove(v.mesh);
        this.vehicles.splice(i, 1);
      }
    }
  }
}
