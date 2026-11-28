import * as THREE from "three";

/**
 * Shared road coordinate system.
 * s = distance along the road, x = lateral offset from the road centre.
 * All gameplay systems should use this same path for curves.
 */
export interface RoadSample {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  yaw: number;
  curvature: number;
}

export interface RoadPathOptions {
  /** Distance between control points in metres. */
  controlSpacing?: number;
  /** Maximum lateral displacement of the centre line in metres. */
  curveAmplitude?: number;
  /** Approximate wavelength of broad mountain bends in metres. */
  curveWavelength?: number;
  /** Vertical rise/fall amplitude in metres. */
  elevationAmplitude?: number;
}

export class RoadPath {
  private readonly spacing: number;
  private readonly amplitude: number;
  private readonly wavelength: number;
  private readonly elevation: number;
  private readonly curvePhase = 0.7;

  constructor(options: RoadPathOptions = {}) {
    this.spacing = options.controlSpacing ?? 20;
    this.amplitude = options.curveAmplitude ?? 34;
    this.wavelength = options.curveWavelength ?? 620;
    this.elevation = options.elevationAmplitude ?? 9;
  }

  /** Centre-line position in world coordinates for distance s. */
  getCenter(s: number): THREE.Vector3 {
    const x = this.amplitude * Math.sin((s / this.wavelength) + this.curvePhase)
      + this.amplitude * 0.28 * Math.sin((s / (this.wavelength * 0.47)) + 1.9);
    const y = this.elevation * Math.sin((s / (this.wavelength * 1.8)) + 0.4)
      + this.elevation * 0.22 * Math.sin((s / (this.wavelength * 0.72)) + 2.1);
    return new THREE.Vector3(x, y, -s);
  }

  sample(s: number): RoadSample {
    const eps = 0.5;
    const p = this.getCenter(s);
    const before = this.getCenter(s - eps);
    const after = this.getCenter(s + eps);
    const tangent = after.sub(before).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();

    const t0 = this.getCenter(s - 2);
    const t1 = this.getCenter(s + 2);
    const d0 = new THREE.Vector2(t0.x, t0.z);
    const d1 = new THREE.Vector2(p.x, p.z);
    const d2 = new THREE.Vector2(t1.x, t1.z);
    const a = d1.distanceTo(d0);
    const b = d2.distanceTo(d1);
    const c = d2.distanceTo(d0);
    const cross = (d1.x - d0.x) * (d2.y - d1.y) - (d1.y - d0.y) * (d2.x - d1.x);
    const curvature = (a * b * c) > 1e-6 ? (2 * cross) / (a * b * c) : 0;

    return {
      position: p,
      tangent,
      right,
      up,
      yaw: Math.atan2(-tangent.x, -tangent.z),
      curvature,
    };
  }

  /** Convert road-relative coordinates to a world position. */
  toWorld(s: number, lateral: number, height = 0): THREE.Vector3 {
    const sample = this.sample(s);
    return sample.position
      .clone()
      .addScaledVector(sample.right, lateral)
      .addScaledVector(sample.up, height);
  }

  /** Convert a road-relative heading into a world yaw. */
  getYaw(s: number): number {
    return this.sample(s).yaw;
  }

  getControlDistances(fromS: number, toS: number): number[] {
    const start = Math.floor(fromS / this.spacing) * this.spacing;
    const values: number[] = [];
    for (let s = start; s <= toS; s += this.spacing) values.push(s);
    return values;
  }
}
