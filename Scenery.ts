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
  private centerBarrierMat!: THREE.MeshStandardMaterial;
  private treeTrunkGeo!: THREE.CylinderGeometry;
  private treeCanopyGeo1!: THREE.ConeGeometry;
  private treeCanopyGeo2!: THREE.ConeGeometry;
  private trunkMat!: THREE.MeshStandardMaterial;
  private foliageMat1!: THREE.MeshStandardMaterial;
  private foliageMat2!: THREE.MeshStandardMaterial;
  private lampMat!: THREE.MeshStandardMaterial;
  private buildingMat1!: THREE.MeshStandardMaterial;
  private buildingMat2!: THREE.MeshStandardMaterial;
  private reflectorMatAmber!: THREE.MeshBasicMaterial;
  private reflectorMatRed!: THREE.MeshBasicMaterial;
  private distantSkylineGroup: THREE.Group;

  constructor(scene: THREE.Scene, maxAnisotropy = 8) {
    this.scene = scene;
    this.roadTex = createAsphaltRoadTexture(maxAnisotropy);
    this.guardrailTex = createGuardrailTexture(maxAnisotropy);
    this.distantSkylineGroup = new THREE.Group();
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
      map: this.roadTex, roughnessMap: rough, roughness: 1,
      metalness: 0, color: 0xffffff, side: THREE.DoubleSide,
    });
    this.guardrailMat = new THREE.MeshStandardMaterial({
      map: this.guardrailTex, roughness: 0.42, metalness: 0.65,
      side: THREE.DoubleSide,
    });
    this.terrainMat = new THREE.MeshStandardMaterial({ color: 0x294331, roughness: 1, metalness: 0 });
    this.curbMat = new THREE.MeshStandardMaterial({ color: 0x555b61, roughness: 0.88 });
    this.centerBarrierMat = new THREE.MeshStandardMaterial({ color: 0x929ba3, roughness: 0.78, metalness: 0.12 });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x49301d, roughness: 0.95 });
    this.foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x1d4a30, roughness: 0.92 });
    this.foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x326644, roughness: 0.9 });
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x9ca8b2, metalness: 0.72, roughness: 0.3 });
    this.buildingMat1 = new THREE.MeshStandardMaterial({ color: 0x344657, roughness: 0.72, metalness: 0.12 });
    this.buildingMat2 = new THREE.MeshStandardMaterial({ color: 0x59616a, roughness: 0.75, metalness: 0.1 });
    this.reflectorMatAmber = new THREE.MeshBasicMaterial({ color: 0xffb12b });
    this.reflectorMatRed = new THREE.MeshBasicMaterial({ color: 0xff4545 });
    this.treeTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.8, 9);
    this.treeCanopyGeo1 = new THREE.ConeGeometry(1.9, 3.5, 9);
    this.treeCanopyGeo2 = new THREE.ConeGeometry(1.35, 2.7, 9);
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
    road.position.set(0, 0.006, -SEGMENT_LENGTH / 2);
    road.receiveShadow = true;
    group.add(road);

    const curbGeo = new THREE.BoxGeometry(0.5, 0.16, SEGMENT_LENGTH + 0.12);
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, this.curbMat);
      curb.position.set(side * (HIGHWAY_WIDTH / 2 + 0.25), 0.04, -SEGMENT_LENGTH / 2);
      curb.receiveShadow = true;
      group.add(curb);
    }

    const groundGeo = new THREE.PlaneGeometry(160, SEGMENT_LENGTH);
    groundGeo.rotateX(-Math.PI / 2);
    for (const side of [-1, 1]) {
      const ground = new THREE.Mesh(groundGeo, this.terrainMat);
      ground.position.set(side * (HIGHWAY_WIDTH / 2 + 80), -0.07, -SEGMENT_LENGTH / 2);
      ground.receiveShadow = true;
      group.add(ground);
    }

    const railGeo = new THREE.BoxGeometry(0.2, 0.75, SEGMENT_LENGTH + 0.1);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, this.guardrailMat);
      rail.position.set(side * GUARDRAIL_OFFSET, 0.44, -SEGMENT_LENGTH / 2);
      rail.castShadow = true;
      rail.receiveShadow = true;
      group.add(rail);
    }

    const postGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.85, 8);
    const reflectorGeo = new THREE.BoxGeometry(0.06, 0.12, 0.16);
    for (let pz = 4; pz < SEGMENT_LENGTH; pz += 8) {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, this.guardrailMat);
        post.position.set(side * (GUARDRAIL_OFFSET + 0.09), 0.42, -pz);
        group.add(post);
        const reflector = new THREE.Mesh(reflectorGeo, side < 0 ? this.reflectorMatAmber : this.reflectorMatRed);
        reflector.position.set(side * (GUARDRAIL_OFFSET - 0.12), 0.52, -pz);
        group.add(reflector);
      }
    }

    this.addStreetlight(group, -GUARDRAIL_OFFSET - 1.4, -12, true);
    this.addStreetlight(group, GUARDRAIL_OFFSET + 1.4, -52, false);

    // Tree spacing is intentionally moderate to protect mobile frame rate.
    for (let tz = 6; tz < SEGMENT_LENGTH; tz += 13) {
      this.addProceduralTree(group, -GUARDRAIL_OFFSET - 5 - Math.random() * 13, -tz);
      this.addProceduralTree(group, GUARDRAIL_OFFSET + 5 + Math.random() * 13, -tz - 2);
    }

    if (Math.random() > 0.55) {
      const w = 18 + Math.random() * 14, h = 12 + Math.random() * 20, d = 28 + Math.random() * 22;
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Math.random() > 0.5 ? this.buildingMat1 : this.buildingMat2);
      building.position.set(Math.random() > 0.5 ? -48 : 48, h / 2, -SEGMENT_LENGTH * 0.5);
      building.castShadow = true;
      group.add(building);
    }
    if (hasGantry) this.addOverheadGantry(group, -SEGMENT_LENGTH * 0.5);
    return { group, z: zPos };
  }

  private addStreetlight(parent: THREE.Group, x: number, z: number, isLeft: boolean) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 8.2, 9), this.lampMat);
    mast.position.y = 4.1; g.add(mast);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.5, 8), this.lampMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(isLeft ? 1.5 : -1.5, 8, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.42), this.lampMat);
    head.position.set(isLeft ? 3 : -3, 7.9, 0); g.add(head);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xfff5d8 }));
    led.rotation.x = -Math.PI / 2;
    led.position.set(isLeft ? 3 : -3, 7.78, 0);
    g.add(led); parent.add(g);
  }

  private addProceduralTree(parent: THREE.Group, x: number, z: number) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const s = 0.85 + Math.random() * 0.5;
    tree.scale.setScalar(s);
    const trunk = new THREE.Mesh(this.treeTrunkGeo, this.trunkMat);
    trunk.position.y = 1.4; trunk.castShadow = true; tree.add(trunk);
    const lower = new THREE.Mesh(this.treeCanopyGeo1, this.foliageMat1);
    lower.position.y = 3.2; lower.castShadow = true; tree.add(lower);
    const upper = new THREE.Mesh(this.treeCanopyGeo2, this.foliageMat2);
    upper.position.y = 4.7; upper.castShadow = true; tree.add(upper);
    parent.add(tree);
  }

  private addOverheadGantry(parent: THREE.Group, z: number) {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    const { HIGHWAY_WIDTH, GUARDRAIL_OFFSET } = GAME_CONSTANTS;
    const postGeo = new THREE.CylinderGeometry(0.2, 0.27, 8.2, 9);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, this.lampMat);
      post.position.set(side * (GUARDRAIL_OFFSET + 0.8), 4.1, 0);
      post.castShadow = true; g.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(HIGHWAY_WIDTH + 3.2, 0.85, 0.85), this.lampMat);
    beam.position.y = 7.8; g.add(beam);
    const signTexture = createHighwaySignTexture('NORTH METRO / AIRPORT', 'INTERSTATE HIGHWAY 95');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.4),
      new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }));
    sign.position.set(0, 7.8, 0.48); g.add(sign);
    parent.add(g);
  }

  private buildDistantSkyline() {
    this.distantSkylineGroup.position.set(0, 0, -680);
    const geo = new THREE.ConeGeometry(120, 75, 7);
    const mat = new THREE.MeshBasicMaterial({ color: 0x52677a, fog: true });
    [-260, -130, 0, 130, 260].forEach((x, i) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 22, -80 - i * 25);
      m.scale.set(1.5, 0.75, 1);
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
    this.distantSkylineGroup.visible = false;
  }

  public update(playerZ: number) {
    const length = GAME_CONSTANTS.SEGMENT_LENGTH;
    this.distantSkylineGroup.position.z = playerZ - 650;
    this.distantSkylineGroup.visible = false;

    let guard = 0, moved = true;
    while (moved && guard < this.segments.length) {
      moved = false; guard++;
      let minZ = Infinity;
      for (const s of this.segments) minZ = Math.min(minZ, s.z);
      for (const s of this.segments) {
        if (s.z > playerZ + 50) {
          s.z = minZ - length;
          s.group.position.z = s.z;
          s.group.visible = true;
          moved = true;
          break;
        }
      }
    }
    const nearby = this.segments.some(s =>
      s.z <= playerZ + length && s.z >= playerZ - length * 2);
    if (!nearby) this.reset(playerZ);
  }
}
