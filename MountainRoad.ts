import * as THREE from "three";
import { RoadPath } from "./RoadPath";

export interface MountainRoadOptions {
  roadWidth?: number;
  shoulderWidth?: number;
  segmentLength?: number;
  segmentsAhead?: number;
  segmentsBehind?: number;
  samplesPerSegment?: number;
  anisotropy?: number;
}

/**
 * Procedural curved mountain-road mesh.
 * Keep one instance and call update(playerDistance) as the player advances.
 */
export class MountainRoad {
  readonly group = new THREE.Group();
  private readonly path: RoadPath;
  private readonly roadWidth: number;
  private readonly shoulderWidth: number;
  private readonly segmentLength: number;
  private readonly segmentsAhead: number;
  private readonly segmentsBehind: number;
  private readonly samplesPerSegment: number;
  private readonly roadMaterial: THREE.MeshStandardMaterial;
  private readonly shoulderMaterial: THREE.MeshStandardMaterial;
  private readonly railMaterial: THREE.MeshStandardMaterial;
  private readonly segmentMeshes = new Map<number, THREE.Group>();

  constructor(
    path: RoadPath,
    options: MountainRoadOptions = {},
  ) {
    this.path = path;
    this.roadWidth = options.roadWidth ?? 16.5;
    this.shoulderWidth = options.shoulderWidth ?? 2.2;
    this.segmentLength = options.segmentLength ?? 80;
    this.segmentsAhead = options.segmentsAhead ?? 10;
    this.segmentsBehind = options.segmentsBehind ?? 2;
    this.samplesPerSegment = options.samplesPerSegment ?? 20;

    const asphalt = this.makeAsphaltTexture(options.anisotropy ?? 8);
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x77766f,
      roughness: 1,
    });
    this.railMaterial = new THREE.MeshStandardMaterial({
      color: 0x9da5aa,
      metalness: 0.78,
      roughness: 0.32,
    });
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  update(playerDistance: number): void {
    const current = Math.floor(playerDistance / this.segmentLength);
    const first = current - this.segmentsBehind;
    const last = current + this.segmentsAhead;

    for (let index = first; index <= last; index++) {
      if (!this.segmentMeshes.has(index)) {
        const segment = this.buildSegment(index);
        this.segmentMeshes.set(index, segment);
        this.group.add(segment);
      }
    }

    for (const [index, mesh] of this.segmentMeshes) {
      if (index < first || index > last) {
        this.group.remove(mesh);
        this.disposeGroup(mesh);
        this.segmentMeshes.delete(index);
      }
    }
  }

  dispose(): void {
    for (const mesh of this.segmentMeshes.values()) this.disposeGroup(mesh);
    this.segmentMeshes.clear();
    this.group.removeFromParent();
    this.roadMaterial.map?.dispose();
    this.roadMaterial.dispose();
    this.shoulderMaterial.dispose();
    this.railMaterial.dispose();
  }

  private buildSegment(index: number): THREE.Group {
    const group = new THREE.Group();
    const startS = index * this.segmentLength;
    const road = this.buildStrip(startS, this.roadWidth, this.samplesPerSegment, 0.035);
    const shoulder = this.buildStrip(
      startS,
      this.roadWidth + this.shoulderWidth * 2,
      this.samplesPerSegment,
      0.005,
    );
    const shoulderMesh = new THREE.Mesh(shoulder, this.shoulderMaterial);
    shoulderMesh.receiveShadow = true;
    const roadMesh = new THREE.Mesh(road, this.roadMaterial);
    roadMesh.receiveShadow = true;
    roadMesh.castShadow = false;
    group.add(shoulderMesh, roadMesh);

    // Guardrails follow the exact same road path on both sides.
    for (const side of [-1, 1]) {
      const rail = this.buildRail(startS, side);
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);
    }

    // Dashed lane markings: four-lane highway, three dashed separators.
    for (let lane = 1; lane < 4; lane++) {
      const lateral = -this.roadWidth / 2 + (this.roadWidth / 4) * lane;
      for (let dash = 0; dash < 10; dash++) {
        const s0 = startS + dash * (this.segmentLength / 10) + 1.5;
        const s1 = s0 + 4.2;
        const a = this.path.toWorld(s0, lateral, 0.09);
        const b = this.path.toWorld(s1, lateral, 0.09);
        const mark = this.makeRibbon(a, b, 0.12, 0.025);
        const mesh = new THREE.Mesh(mark, new THREE.MeshBasicMaterial({ color: 0xe8e4d4 }));
        group.add(mesh);
      }
    }
    return group;
  }

  private buildStrip(startS: number, width: number, samples: number, lift: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const s = startS + (i / samples) * this.segmentLength;
      const centre = this.path.toWorld(s, 0, lift);
      const right = this.path.sample(s).right;
      const leftPoint = centre.clone().addScaledVector(right, -width / 2);
      const rightPoint = centre.clone().addScaledVector(right, width / 2);
      positions.push(leftPoint.x, leftPoint.y, leftPoint.z, rightPoint.x, rightPoint.y, rightPoint.z);
      uvs.push(0, i / samples, 1, i / samples);
      if (i < samples) {
        const n = i * 2;
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private buildRail(startS: number, side: number): THREE.Mesh {
    const points: THREE.Vector3[] = [];
    const samples = 20;
    const offset = side * (this.roadWidth / 2 + this.shoulderWidth * 0.72);
    for (let i = 0; i <= samples; i++) {
      const s = startS + (i / samples) * this.segmentLength;
      points.push(this.path.toWorld(s, offset, 0.92));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, samples * 3, 0.075, 8, false);
    return new THREE.Mesh(geometry, this.railMaterial);
  }

  private makeRibbon(a: THREE.Vector3, b: THREE.Vector3, width: number, lift: number): THREE.BufferGeometry {
    const direction = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(width / 2);
    const p0 = a.clone().add(side).add(new THREE.Vector3(0, lift, 0));
    const p1 = a.clone().sub(side).add(new THREE.Vector3(0, lift, 0));
    const p2 = b.clone().add(side).add(new THREE.Vector3(0, lift, 0));
    const p3 = b.clone().sub(side).add(new THREE.Vector3(0, lift, 0));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([
      p0.x,p0.y,p0.z, p1.x,p1.y,p1.z, p2.x,p2.y,p2.z, p3.x,p3.y,p3.z
    ], 3));
    g.setIndex([0,2,1,1,2,3]);
    g.computeVertexNormals();
    return g;
  }

  private makeAsphaltTexture(anisotropy: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to create asphalt texture canvas");
    ctx.fillStyle = "#303235";
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine procedural aggregate/noise, generated once and reused.
    for (let i = 0; i < 42000; i++) {
      const v = 35 + Math.floor(Math.random() * 42);
      const alpha = 0.08 + Math.random() * 0.18;
      ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      const size = Math.random() * 2.2 + 0.35;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 8);
    texture.anisotropy = anisotropy;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        // Shared road materials are disposed by dispose().
        for (const material of mesh.material) {
          if (material !== this.roadMaterial && material !== this.shoulderMaterial && material !== this.railMaterial) {
            material.dispose();
          }
        }
      } else if (mesh.material && mesh.material !== this.roadMaterial &&
        mesh.material !== this.shoulderMaterial && mesh.material !== this.railMaterial) {
        mesh.material.dispose();
      }
    });
  }
}
