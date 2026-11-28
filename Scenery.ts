import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { RoadPath } from './RoadPath';
import { MountainRoad } from './MountainRoad';

interface ScenicChunk { index: number; group: THREE.Group; }

/** Curved mountain highway scenery sharing one road coordinate system with gameplay. */
export class SceneryManager {
  public readonly scene: THREE.Scene;
  public readonly roadPath: RoadPath;
  public readonly mountainRoad: MountainRoad;
  private chunks = new Map<number, ScenicChunk>();
  private readonly chunkLength = GAME_CONSTANTS.SEGMENT_LENGTH;
  private readonly chunksAhead = GAME_CONSTANTS.ACTIVE_SEGMENTS + 2;
  private readonly chunksBehind = 2;
  private readonly sharedMaterials: THREE.Material[] = [];
  private readonly sharedGeometries: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene, maxAnisotropy = 8) {
    this.scene = scene;
    this.roadPath = new RoadPath({ controlSpacing: 20, curveAmplitude: 28, curveWavelength: 720, elevationAmplitude: 8 });
    this.mountainRoad = new MountainRoad(this.roadPath, {
      roadWidth: GAME_CONSTANTS.HIGHWAY_WIDTH, shoulderWidth: 2.4,
      segmentLength: this.chunkLength, segmentsAhead: this.chunksAhead,
      segmentsBehind: this.chunksBehind, samplesPerSegment: 24, anisotropy: maxAnisotropy,
    });
    this.mountainRoad.addTo(scene);
    this.createSharedAssets();
    this.reset(0);
  }

  private createSharedAssets() {
    this.sharedMaterials.push(
      new THREE.MeshStandardMaterial({ color: 0x66645d, roughness: 0.96 }),
      new THREE.MeshStandardMaterial({ color: 0x454a49, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x173d2a, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x28583a, roughness: 0.96 }),
      new THREE.MeshStandardMaterial({ color: 0x493322, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x38563a, roughness: 1 }),
    );
    this.sharedGeometries.push(new THREE.IcosahedronGeometry(1, 1), new THREE.ConeGeometry(1, 1, 7), new THREE.CylinderGeometry(0.12, 0.2, 2.4, 7));
  }

  private buildChunk(index: number): ScenicChunk {
    const group = new THREE.Group();
    const startS = index * this.chunkLength;
    const [rockMat, darkRockMat, pineMat, pineLightMat, trunkMat, grassMat] = this.sharedMaterials;
    const [rockGeo, pineGeo, trunkGeo] = this.sharedGeometries;
    for (const side of [-1, 1]) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(95, 1.2, this.chunkLength + 8), grassMat!);
      const shelfS = startS + this.chunkLength * 0.5;
      shelf.position.copy(this.roadPath.toWorld(shelfS, side * 63, -1.4));
      shelf.rotation.y = this.roadPath.getYaw(shelfS);
      shelf.receiveShadow = true;
      group.add(shelf);

      for (let i = 0; i < 4; i++) {
        const s = startS + 10 + i * 19 + Math.random() * 7;
        const lateral = side * (31 + Math.random() * 34);
        const height = 15 + Math.random() * 35;
        const rock = new THREE.Mesh(rockGeo!, Math.random() > 0.45 ? rockMat! : darkRockMat!);
        rock.position.copy(this.roadPath.toWorld(s, lateral, height * 0.34 - 1));
        rock.scale.set(18 + Math.random() * 25, height, 13 + Math.random() * 20);
        rock.rotation.set((Math.random() - 0.5) * 0.22, Math.random() * Math.PI, (Math.random() - 0.5) * 0.16);
        rock.castShadow = true; rock.receiveShadow = true; group.add(rock);
      }
      for (let i = 0; i < 11; i++) {
        const s = startS + 4 + i * 7 + Math.random() * 4;
        const lateral = side * (13 + Math.random() * 30);
        const tree = new THREE.Group();
        tree.position.copy(this.roadPath.toWorld(s, lateral, 0));
        tree.rotation.y = Math.random() * Math.PI * 2;
        tree.scale.setScalar(0.75 + Math.random() * 1.35);
        const trunk = new THREE.Mesh(trunkGeo!, trunkMat!); trunk.position.y = 1.1; trunk.castShadow = true; tree.add(trunk);
        const crown = new THREE.Mesh(pineGeo!, Math.random() > 0.5 ? pineMat! : pineLightMat!);
        crown.position.y = 3.1; crown.scale.set(1.35, 3.3, 1.35); crown.castShadow = true; tree.add(crown);
        group.add(tree);
      }
      for (let i = 0; i < 8; i++) {
        const s = startS + Math.random() * this.chunkLength;
        const boulder = new THREE.Mesh(rockGeo!, darkRockMat!);
        boulder.position.copy(this.roadPath.toWorld(s, side * (12 + Math.random() * 7), -0.15));
        const size = 0.5 + Math.random() * 2.2;
        boulder.scale.set(size * 1.4, size, size); boulder.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
        boulder.castShadow = true; group.add(boulder);
      }
    }
    return { index, group };
  }

  public reset(playerZ = 0) {
    for (const chunk of this.chunks.values()) { this.scene.remove(chunk.group); this.disposeChunk(chunk.group); }
    this.chunks.clear();
    this.update(playerZ);
  }

  public update(playerZ: number) {
    const distance = -playerZ;
    this.mountainRoad.update(distance);
    const current = Math.floor(distance / this.chunkLength);
    const first = current - this.chunksBehind;
    const last = current + this.chunksAhead;
    for (let index = first; index <= last; index++) {
      if (!this.chunks.has(index)) { const chunk = this.buildChunk(index); this.chunks.set(index, chunk); this.scene.add(chunk.group); }
    }
    for (const [index, chunk] of this.chunks) {
      if (index < first || index > last) { this.scene.remove(chunk.group); this.disposeChunk(chunk.group); this.chunks.delete(index); }
    }
  }

  private disposeChunk(group: THREE.Group) {
    group.traverse(object => {
      if (object instanceof THREE.Mesh && !this.sharedGeometries.includes(object.geometry)) object.geometry.dispose();
    });
  }

  public dispose() {
    for (const chunk of this.chunks.values()) { this.scene.remove(chunk.group); this.disposeChunk(chunk.group); }
    this.chunks.clear(); this.mountainRoad.dispose();
    this.sharedGeometries.forEach(g => g.dispose());
    this.sharedMaterials.forEach(m => m.dispose());
  }
}
