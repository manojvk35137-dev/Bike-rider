import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import {
  createAsphaltRoadTexture, createAsphaltRoughnessTexture,
  createGuardrailTexture, createHighwaySignTexture,
} from './textures';

export interface HighwaySegment { group: THREE.Group; z: number; }

export class SceneryManager {
  public scene: THREE.Scene;
  public segments: HighwaySegment[] = [];
  private roadTex: THREE.CanvasTexture;
  private guardrailTex: THREE.CanvasTexture;
  private roadMat!: THREE.MeshStandardMaterial;
  private guardrailMat!: THREE.MeshStandardMaterial;
  private terrainMat!: THREE.MeshStandardMaterial;
  private curbMat!: THREE.MeshStandardMaterial;
  private treeTrunkGeo!: THREE.CylinderGeometry;
  private treeCanopyGeo1!: THREE.IcosahedronGeometry;
  private treeCanopyGeo2!: THREE.IcosahedronGeometry;
  private trunkMat!: THREE.MeshStandardMaterial;
  private foliageMats: THREE.MeshStandardMaterial[] = [];
  private lampMat!: THREE.MeshStandardMaterial;
  private buildingMats: THREE.MeshStandardMaterial[] = [];
  private reflectorMatAmber = new THREE.MeshBasicMaterial({ color: 0xffb52e });
  private reflectorMatRed = new THREE.MeshBasicMaterial({ color: 0xff4545 });
  private distantSkylineGroup = new THREE.Group();

  constructor(scene: THREE.Scene, maxAnisotropy = 8) {
    this.scene = scene;
    this.roadTex = createAsphaltRoadTexture(maxAnisotropy);
    this.guardrailTex = createGuardrailTexture(maxAnisotropy);
    this.initMaterials();
    this.buildInitialSegments();
    this.buildDistantSkyline();
  }

  private initMaterials() {
    const rough = createAsphaltRoughnessTexture();
    this.roadTex.wrapS = this.roadTex.wrapT = THREE.RepeatWrapping;
    rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
    this.roadTex.repeat.set(1, 4);
    rough.repeat.set(1, 4);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex, roughnessMap: rough, roughness: 0.96,
      metalness: 0, color: 0xffffff, side: THREE.DoubleSide,
    });
    this.guardrailMat = new THREE.MeshStandardMaterial({
      map: this.guardrailTex, roughness: 0.38, metalness: 0.62,
      side: THREE.DoubleSide,
    });
    this.terrainMat = new THREE.MeshStandardMaterial({ color: 0x34513b, roughness: 1 });
    this.curbMat = new THREE.MeshStandardMaterial({ color: 0x656c72, roughness: 0.88 });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x49301f, roughness: 0.98 });
    this.foliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x1c492e, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x2d633c, roughness: 0.94 }),
      new THREE.MeshStandardMaterial({ color: 0x3c7045, roughness: 0.96 }),
    ];
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x89949e, metalness: 0.7, roughness: 0.3 });
    this.buildingMats = [
      new THREE.MeshStandardMaterial({ color: 0x66717a, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0x9a8c79, roughness: 0.82 }),
      new THREE.MeshStandardMaterial({ color: 0x526575, roughness: 0.76 }),
    ];
    this.treeTrunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 3.1, 8);
    this.treeCanopyGeo1 = new THREE.IcosahedronGeometry(1.65, 1);
    this.treeCanopyGeo2 = new THREE.IcosahedronGeometry(1.2, 1);
  }

  private buildInitialSegments() {
    const { SEGMENT_LENGTH, ACTIVE_SEGMENTS } = GAME_CONSTANTS;
    for (let i = -1; i < ACTIVE_SEGMENTS - 1; i++) {
      const z = -i * SEGMENT_LENGTH;
      const segment = this.createSegment(z, i % 3 === 0);
      this.segments.push(segment);
      this.scene.add(segment.group);
    }
  }

  private createSegment(zPos: number, hasGantry: boolean): HighwaySegment {
    const group = new THREE.Group();
    group.position.z = zPos;
    const { HIGHWAY_WIDTH, SEGMENT_LENGTH, GUARDRAIL_OFFSET } = GAME_CONSTANTS;

    const roadGeo = new THREE.PlaneGeometry(HIGHWAY_WIDTH, SEGMENT_LENGTH, 1, 1);
    roadGeo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeo, this.roadMat);
    road.position.set(0, 0.012, -SEGMENT_LENGTH / 2);
    road.receiveShadow = true;
    group.add(road);

    const curbGeo = new THREE.BoxGeometry(0.5, 0.16, SEGMENT_LENGTH + 0.15);
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, this.curbMat);
      curb.position.set(side * (HIGHWAY_WIDTH / 2 + 0.25), 0.04, -SEGMENT_LENGTH / 2);
      curb.receiveShadow = true;
      group.add(curb);
    }

    const groundGeo = new THREE.PlaneGeometry(180, SEGMENT_LENGTH);
    groundGeo.rotateX(-Math.PI / 2);
    for (const side of [-1, 1]) {
      const ground = new THREE.Mesh(groundGeo, this.terrainMat);
      ground.position.set(side * (HIGHWAY_WIDTH / 2 + 90), -0.09, -SEGMENT_LENGTH / 2);
      ground.receiveShadow = true;
      group.add(ground);
    }

    const railGeo = new THREE.BoxGeometry(0.2, 0.72, SEGMENT_LENGTH + 0.12);
    const postGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.82, 8);
    const reflectorGeo = new THREE.BoxGeometry(0.06, 0.12, 0.15);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, this.guardrailMat);
      rail.position.set(side * GUARDRAIL_OFFSET, 0.43, -SEGMENT_LENGTH / 2);
      rail.castShadow = true; rail.receiveShadow = true; group.add(rail);
      for (let pz = 4; pz < SEGMENT_LENGTH; pz += 8) {
        const post = new THREE.Mesh(postGeo, this.lampMat);
        post.position.set(side * (GUARDRAIL_OFFSET + 0.08), 0.42, -pz);
        group.add(post);
        const reflector = new THREE.Mesh(reflectorGeo, side < 0 ? this.reflectorMatAmber : this.reflectorMatRed);
        reflector.position.set(side * (GUARDRAIL_OFFSET - 0.12), 0.52, -pz);
        group.add(reflector);
      }
    }

    this.addStreetlight(group, -GUARDRAIL_OFFSET - 1.5, -15, true);
    this.addStreetlight(group, GUARDRAIL_OFFSET + 1.5, -55, false);

    // Repeated tree clusters use shared geometry and materials for mobile performance.
    for (let tz = 5; tz < SEGMENT_LENGTH; tz += 14) {
      this.addProceduralTree(group, -GUARDRAIL_OFFSET - 5 - Math.random() * 12, -tz);
      this.addProceduralTree(group, GUARDRAIL_OFFSET + 5 + Math.random() * 12, -tz - 3);
    }

    if (Math.random() > 0.45) {
      const w = 16 + Math.random() * 16, h = 10 + Math.random() * 18, d = 22 + Math.random() * 20;
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.buildingMats[Math.floor(Math.random() * this.buildingMats.length)]);
      building.position.set(Math.random() > 0.5 ? -48 : 48, h / 2, -SEGMENT_LENGTH * 0.5);
      building.castShadow = true; building.receiveShadow = true;
      group.add(building);
      // Simple roofline and window strips add depth without many draw calls.
      const windows = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.16, 0.035),
        new THREE.MeshBasicMaterial({ color: 0xb7d2dc }));
      windows.position.set(building.position.x, h * 0.62, building.position.z - d / 2 - 0.025);
      group.add(windows);
    }
    if (hasGantry) this.addOverheadGantry(group, -SEGMENT_LENGTH * 0.5);
    return { group, z: zPos };
  }

  private addStreetlight(parent: THREE.Group, x: number, z: number, isLeft: boolean) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 8.1, 9), this.lampMat);
    mast.position.y = 4.05; g.add(mast);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 3.1, 8), this.lampMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(isLeft ? 1.35 : -1.35, 7.85, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.36), this.lampMat);
    head.position.set(isLeft ? 2.7 : -2.7, 7.75, 0); g.add(head);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xfff0ce }));
    lens.rotation.x = -Math.PI / 2; lens.position.set(isLeft ? 2.7 : -2.7, 7.65, 0); g.add(lens);
    parent.add(g);
  }

  private addProceduralTree(parent: THREE.Group, x: number, z: number) {
    const tree = new THREE.Group(); tree.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.55; tree.scale.setScalar(s);
    const trunk = new THREE.Mesh(this.treeTrunkGeo, this.trunkMat);
    trunk.position.y = 1.55; trunk.castShadow = true; tree.add(trunk);
    const lower = new THREE.Mesh(this.treeCanopyGeo1, this.foliageMats[Math.floor(Math.random() * this.foliageMats.length)]);
    lower.position.y = 3.35; lower.scale.set(1, 1.15, 0.9); lower.castShadow = true; tree.add(lower);
    const upper = new THREE.Mesh(this.treeCanopyGeo2, this.foliageMats[Math.floor(Math.random() * this.foliageMats.length)]);
    upper.position.y = 4.65; upper.scale.set(0.95, 1.1, 0.9); upper.castShadow = true; tree.add(upper);
    parent.add(tree);
  }

  private addOverheadGantry(parent: THREE.Group, z: number) {
    const g = new THREE.Group(); g.position.set(0, 0, z);
    const { HIGHWAY_WIDTH, GUARDRAIL_OFFSET } = GAME_CONSTANTS;
    const postGeo = new THREE.CylinderGeometry(0.18, 0.25, 8.1, 10);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, this.lampMat);
      post.position.set(side * (GUARDRAIL_OFFSET + 0.8), 4.05, 0);
      post.castShadow = true; g.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(HIGHWAY_WIDTH + 3.2, 0.72, 0.72), this.lampMat);
    beam.position.y = 7.75; g.add(beam);
    const signTex = createHighwaySignTexture('NORTH METRO / AIRPORT', 'INTERSTATE HIGHWAY 95');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.1),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }));
    sign.position.set(0, 7.75, 0.4); g.add(sign);
    parent.add(g);
  }

  private buildDistantSkyline() {
    this.distantSkylineGroup.position.set(0, 0, -680);
    const geo = new THREE.ConeGeometry(120, 75, 7);
    const mat = new THREE.MeshBasicMaterial({ color: 0x52677a, fog: true });
    [-260, -130, 0, 130, 260].forEach((x, i) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 22, -80 - i * 25); m.scale.set(1.5, 0.75, 1);
      this.distantSkylineGroup.add(m);
    });
    this.distantSkylineGroup.visible = false;
    this.scene.add(this.distantSkylineGroup);
  }

  public reset(playerZ = 0) {
    const length = GAME_CONSTANTS.SEGMENT_LENGTH;
    this.segments.forEach((s, i) => {
      s.z = playerZ - (i - 1) * length;
      s.group.position.z = s.z;
      s.group.visible = true;
    });
    this.distantSkylineGroup.position.z = playerZ - 650;
  }

  public update(playerZ: number) {
    const length = GAME_CONSTANTS.SEGMENT_LENGTH;
    let minZ = Math.min(...this.segments.map(s => s.z));
    for (const s of this.segments) {
      if (s.z > playerZ + 50) {
        s.z = minZ - length;
        s.group.position.z = s.z;
        minZ = s.z;
      }
    }
    this.distantSkylineGroup.position.z = playerZ - 650;
  }

  public dispose() {
    this.segments.forEach(s => {
      this.scene.remove(s.group);
      s.group.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => m.dispose());
        }
      });
    });
    this.scene.remove(this.distantSkylineGroup);
    this.roadTex.dispose(); this.guardrailTex.dispose();
    this.roadMat.dispose(); this.guardrailMat.dispose(); this.terrainMat.dispose(); this.curbMat.dispose();
  }
}
