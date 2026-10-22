
import * as THREE from 'three';
import { GAME_CONSTANTS, type GameMode } from './constants';
import {
  createVehicleModel,
  type VehicleInstance,
  type VehicleType,
} from './TrafficVehicles';

export class TrafficManager {
  public scene: THREE.Scene;
  public vehicles: VehicleInstance[] = [];
  public mode: GameMode = 'one-way';

  public onCollision?: () => void;
  public onCloseCall?: (info: {
    points: number;
    speedKmh: number;
    vehicleType: VehicleType;
  }) => void;

  constructor(scene: THREE.Scene, mode: GameMode = 'one-way') {
    this.scene = scene;
    this.mode = mode;
  }

  public reset(playerZ: number, mode: GameMode = 'one-way'): void {
    this.mode = mode;

    for (const vehicle of this.vehicles) {
      this.scene.remove(vehicle.mesh);
    }

    this.vehicles = [];

    for (let i = 0; i < 9; i++) {
      const spawnZ =
        playerZ - (45 + i * 32 + Math.random() * 15);

      this.spawnVehicle(spawnZ);
    }
  }

  private getRandomVehicleType(lane: number): VehicleType {
    if (lane === 3) {
      const r = Math.random();

      if (r < 0.45) return 'truck';
      if (r < 0.75) return 'bus';
      if (r < 0.9) return 'van';

      return 'suv';
    }

    if (lane === 0) {
      return Math.random() < 0.7 ? 'sedan' : 'suv';
    }

    const types: VehicleType[] = [
      'sedan',
      'suv',
      'van',
      'sedan',
    ];

    return types[Math.floor(Math.random() * types.length)]!;
  }

  private getLaneSpeed(lane: number): number {
    if (this.mode === 'two-way' && (lane === 0 || lane === 1)) {
      return -(80 + Math.random() * 30);
    }

    switch (lane) {
      case 0:
        return 115 + Math.random() * 20;
      case 1:
        return 98 + Math.random() * 18;
      case 2:
        return 85 + Math.random() * 16;
      case 3:
      default:
        return 70 + Math.random() * 18;
    }
  }

  public spawnVehicle(spawnZ: number): void {
    const laneIndex = Math.floor(
      Math.random() * GAME_CONSTANTS.LANES_COUNT,
    );

    const laneX = GAME_CONSTANTS.LANE_CENTERS[laneIndex];

    if (laneX === undefined) return;

    const minSpacing = 28;

    for (const vehicle of this.vehicles) {
      if (
        vehicle.lane === laneIndex &&
        Math.abs(vehicle.z - spawnZ) < minSpacing
      ) {
        return;
      }
    }

    const type = this.getRandomVehicleType(laneIndex);

    const { mesh, taillightMat, dimensions } =
      createVehicleModel(type);

    mesh.position.set(laneX, 0, spawnZ);

    const isOncoming =
      this.mode === 'two-way' &&
      (laneIndex === 0 || laneIndex === 1);

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

  public update(
    delta: number,
    playerX: number,
    playerZ: number,
    playerSpeedKmh: number,
  ): void {
    const {
      PLAYER_BOUNDS,
      CLOSE_CALL_MAX_DIST,
      CLOSE_CALL_MIN_SPEED_KMH,
      CLOSE_CALL_BONUS_SCORE,
    } = GAME_CONSTANTS;

    if (this.vehicles.length < GAME_CONSTANTS.MAX_TRAFFIC_COUNT) {
      let minZ = playerZ - 80;

      for (const vehicle of this.vehicles) {
        if (vehicle.z < minZ) {
          minZ = vehicle.z;
        }
      }

      this.spawnVehicle(
        minZ - (35 + Math.random() * 30),
      );
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];

      if (!vehicle) continue;

      const speedMs =
        (Math.abs(vehicle.speedKmh) * 1000) / 3600;

      if (vehicle.speedKmh >= 0) {
        vehicle.z -= speedMs * delta;
      } else {
        vehicle.z += speedMs * delta;
      }

      vehicle.mesh.position.z = vehicle.z;

      vehicle.x = THREE.MathUtils.lerp(
        vehicle.x,
        vehicle.targetX,
        0.05,
      );

      vehicle.mesh.position.x = vehicle.x;

      let needsBrake = false;

      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;

        const other = this.vehicles[j];

        if (!other) continue;

        if (
          other.lane === vehicle.lane &&
          other.z < vehicle.z &&
          vehicle.z - other.z < 26
        ) {
          needsBrake = true;
          break;
        }
      }

      if (needsBrake) {
        vehicle.speedKmh = Math.max(
          vehicle.baseSpeedKmh * 0.65,
          vehicle.speedKmh - 45 * delta,
        );

        vehicle.isBraking = true;
        vehicle.taillightMat.emissiveIntensity = 2.2;
      } else {
        vehicle.speedKmh = Math.min(
          vehicle.baseSpeedKmh,
          vehicle.speedKmh + 20 * delta,
        );

        vehicle.isBraking = false;
        vehicle.taillightMat.emissiveIntensity = 0.6;
      }

      const halfPlayerW = PLAYER_BOUNDS.width * 0.5;
      const halfPlayerL = PLAYER_BOUNDS.length * 0.5;
      const halfVehW = vehicle.width * 0.46;
      const halfVehL = vehicle.length * 0.46;

      const overlapX =
        Math.abs(playerX - vehicle.x) <
        halfPlayerW + halfVehW;

      const overlapZ =
        Math.abs(playerZ - vehicle.z) <
        halfPlayerL + halfVehL;

      if (overlapX && overlapZ) {
        this.onCollision?.();
        return;
      }

      const lateralDist = Math.abs(playerX - vehicle.x);

      const isAlongside =
        Math.abs(playerZ - vehicle.z) <
        (vehicle.length + PLAYER_BOUNDS.length) * 0.5;

      if (
        isAlongside &&
        lateralDist <= CLOSE_CALL_MAX_DIST &&
        lateralDist >= halfPlayerW + halfVehW
      ) {
        if (
          !vehicle.closeCallAwarded &&
          playerSpeedKmh >= CLOSE_CALL_MIN_SPEED_KMH
        ) {
          vehicle.closeCallAwarded = true;

          const speedFactor = Math.floor(playerSpeedKmh / 20);

          const points =
            CLOSE_CALL_BONUS_SCORE + speedFactor * 50;

          this.onCloseCall?.({
            points,
            speedKmh: playerSpeedKmh,
            vehicleType: vehicle.type,
          });
        }
      }

      const tooFarBehind =
        vehicle.z >
        playerZ + GAME_CONSTANTS.DESPAWN_BEHIND_DISTANCE;

      const tooFarAhead =
        vehicle.z <
        playerZ - GAME_CONSTANTS.SPAWN_AHEAD_DISTANCE - 80;

      if (tooFarBehind || tooFarAhead) {
        this.scene.remove(vehicle.mesh);
        this.vehicles.splice(i, 1);
      }
    }
  }
}
