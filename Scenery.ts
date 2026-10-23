
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import {
  createAsphaltRoadTexture,
  createAsphaltRoughnessTexture,
  createGuardrailTexture,
  createHighwaySignTexture,
} from './textures';

export interface HighwaySegment {
  group: THREE.Group;
  z: number;
}

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

  constructor(scene: THREE.Scene, maxAnisotropy: number = 8) {
    this.scene = scene;

    this.roadTex = createAsphaltRoadTexture(maxAnisotropy);
    this.guardrailTex = createGuardrailTexture(maxAnisotropy);

    this.distantSkylineGroup = new THREE.Group();

    this.initMaterials();
    this.buildInitialSegments();
    this.buildDistantSkyline();
  }

  private initMaterials() {
    const roadRoughTex = createAsphaltRoughnessTexture();

    this.roadTex.repeat.set(1, 4);
    roadRoughTex.repeat.set(1, 4);

    // Road: reduce metallic/environment reflections.
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughnessMap: roadRoughTex,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    this.guardrailMat = new THREE.MeshStandardMaterial({
      map: this.guardrailTex,
      roughness: 0.35,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0x223625,
      roughness: 0.95,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x3e4249,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.centerBarrierMat = new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.75,
      metalness: 0.15,
    });

    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9,
    });

    this.foliageMat1 = new THREE.MeshStandardMaterial({
      color: 0x1f472f,
      roughness: 0.85,
    });

    this.foliageMat2 = new THREE.MeshStandardMaterial({
      color: 0x27593c,
      roughness: 0.8,
    });

    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2,
    });

    this.buildingMat1 = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.6,
    });

    this.buildingMat2 = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.4,
      roughness: 0.5,
    });

    this.reflectorMatAmber = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
    });

    this.reflectorMatRed = new THREE.MeshBasicMaterial({
      color: 0xef4444,
    });

    this.treeTrunkGeo = new THREE.CylinderGeometry(
      0.25, 0.38, 2.4, 8
    );

    this.treeCanopyGeo1 = new THREE.ConeGeometry(
      1.8, 3.2, 8
    );

    this.treeCanopyGeo2 = new THREE.ConeGeometry(
      1.3, 2.4, 8
    );
  }

  private buildInitialSegments() {
    const { SEGMENT_LENGTH, ACTIVE_SEGMENTS } = GAME_CONSTANTS;

    for (let i = -1; i < ACTIVE_SEGMENTS - 1; i++) {
      const zPos = -i * SEGMENT_LENGTH;
      const seg = this.createSegment(zPos, i % 3 === 0);

      this.segments.push(seg);
      this.scene.add(seg.group);
    }
  }

  private createSegment(
    zPos: number,
    hasGantry: boolean
  ): HighwaySegment {
    const segGroup = new THREE.Group();
    segGroup.position.z = zPos;

    const {
      HIGHWAY_WIDTH,
      SEGMENT_LENGTH,
      GUARDRAIL_OFFSET,
    } = GAME_CONSTANTS;

    // Road surface.
    const roadGeo = new THREE.PlaneGeometry(
      HIGHWAY_WIDTH,
      SEGMENT_LENGTH
    );

    roadGeo.rotateX(-Math.PI / 2);

    const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);

    roadMesh.position.set(
      0,
      0,
      -SEGMENT_LENGTH / 2
    );

    roadMesh.receiveShadow = true;
    segGroup.add(roadMesh);

    // Roadside curbs.
    const curbGeo = new THREE.BoxGeometry(
      0.5,
      0.15,
      SEGMENT_LENGTH
    );

    const leftCurb = new THREE.Mesh(
      curbGeo,
      this.curbMat
    );

    leftCurb.position.set(
      -HIGHWAY_WIDTH / 2 - 0.25,
      0.05,
      -SEGMENT_LENGTH / 2
    );

    const rightCurb = leftCurb.clone();

    rightCurb.position.x = HIGHWAY_WIDTH / 2 + 0.25;

    segGroup.add(leftCurb, rightCurb);

    // Ground on both sides of the highway.
    const terrainGeo = new THREE.PlaneGeometry(
      160,
      SEGMENT_LENGTH
    );

    terrainGeo.rotateX(-Math.PI / 2);

    const leftTerrain = new THREE.Mesh(
      terrainGeo,
      this.terrainMat
    );

    leftTerrain.position.set(
      -HIGHWAY_WIDTH / 2 - 80,
      -0.05,
      -SEGMENT_LENGTH / 2
    );

    leftTerrain.receiveShadow = true;
    segGroup.add(leftTerrain);

    const rightTerrain = new THREE.Mesh(
      terrainGeo,
      this.terrainMat
    );

    rightTerrain.position.set(
      HIGHWAY_WIDTH / 2 + 80,
      -0.05,
      -SEGMENT_LENGTH / 2
    );

    rightTerrain.receiveShadow = true;
    segGroup.add(rightTerrain);

    // Metal guardrails.
    const railGeo = new THREE.BoxGeometry(
      0.2,
      0.75,
      SEGMENT_LENGTH
    );

    const leftRail = new THREE.Mesh(
      railGeo,
      this.guardrailMat
    );

    leftRail.position.set(
      -GUARDRAIL_OFFSET,
      0.44,
      -SEGMENT_LENGTH / 2
    );

    leftRail.castShadow = true;
    segGroup.add(leftRail);

    const rightRail = new THREE.Mesh(
      railGeo,
      this.guardrailMat
    );

    rightRail.position.set(
      GUARDRAIL_OFFSET,
      0.44,
      -SEGMENT_LENGTH / 2
    );

    rightRail.castShadow = true;
    segGroup.add(rightRail);

    // Guardrail posts and reflectors.
    const postGeo = new THREE.CylinderGeometry(
      0.06,
      0.06,
      0.85,
      8
    );

    const reflGeo = new THREE.BoxGeometry(
      0.06,
      0.12,
      0.16
    );

    for (
      let pz = 4;
      pz < SEGMENT_LENGTH;
      pz += 8
    ) {
      const leftPost = new THREE.Mesh(
        postGeo,
        this.guardrailMat
      );

      leftPost.position.set(
        -GUARDRAIL_OFFSET - 0.09,
        0.42,
        -pz
      );

      const rightPost = new THREE.Mesh(
        postGeo,
        this.guardrailMat
      );

      rightPost.position.set(
        GUARDRAIL_OFFSET + 0.09,
        0.42,
        -pz
      );

      const leftRefl = new THREE.Mesh(
        reflGeo,
        this.reflectorMatAmber
      );

      leftRefl.position.set(
        -GUARDRAIL_OFFSET + 0.12,
        0.52,
        -pz
      );

      const rightRefl = new THREE.Mesh(
        reflGeo,
        this.reflectorMatRed
      );

      rightRefl.position.set(
        GUARDRAIL_OFFSET - 0.12,
        0.52,
        -pz
      );

      segGroup.add(
        leftPost,
        rightPost,
        leftRefl,
        rightRefl
      );
    }

    // Streetlights.
    this.addStreetlight(
      segGroup,
      -GUARDRAIL_OFFSET - 1.4,
      -12,
      true
    );

    this.addStreetlight(
      segGroup,
      GUARDRAIL_OFFSET + 1.4,
      -52,
      false
    );

    // Procedural trees on both sides.
    for (
      let tz = 6;
      tz < SEGMENT_LENGTH;
      tz += 11
    ) {
      const xLeft =
        -GUARDRAIL_OFFSET - 4.5 - Math.random() * 14;

      const xRight =
        GUARDRAIL_OFFSET + 4.5 + Math.random() * 14;

      this.addProceduralTree(
        segGroup,
        xLeft,
        -tz - (Math.random() - 0.5) * 3
      );

      this.addProceduralTree(
        segGroup,
        xRight,
        -tz - (Math.random() - 0.5) * 3
      );
    }

    // Random roadside building.
    if (Math.random() > 0.45) {
      const bW = 18 + Math.random() * 14;
      const bH = 12 + Math.random() * 20;
      const bD = 28 + Math.random() * 22;

      const bGeo = new THREE.BoxGeometry(
        bW,
        bH,
        bD
      );

      const bMesh = new THREE.Mesh(
        bGeo,
        Math.random() > 0.5
          ? this.buildingMat1
          : this.buildingMat2
      );

      const isLeft = Math.random() > 0.5;

      bMesh.position.set(
        isLeft
          ? -42 - Math.random() * 20
          : 42 + Math.random() * 20,
        bH / 2,
        -SEGMENT_LENGTH * 0.5
      );

      bMesh.castShadow = true;
      segGroup.add(bMesh);
    }

    // Overhead highway gantry.
    if (hasGantry) {
      this.addOverheadGantry(
        segGroup,
        -SEGMENT_LENGTH * 0.5
      );
    }

    return {
      group: segGroup,
      z: zPos,
    };
  }

  private addStreetlight(
    parent: THREE.Group,
    x: number,
    z: number,
    isLeft: boolean
  ) {
    const lampGroup = new THREE.Group();

    lampGroup.position.set(x, 0, z);

    const mastGeo = new THREE.CylinderGeometry(
      0.1,
      0.15,
      8.2,
      8
    );

    const mast = new THREE.Mesh(
      mastGeo,
      this.lampMat
    );

    mast.position.y = 4.1;
    lampGroup.add(mast);

    const armGeo = new THREE.CylinderGeometry(
      0.06,
      0.08,
      3.6,
      8
    );

    armGeo.rotateZ(Math.PI / 2);

    const arm = new THREE.Mesh(
      armGeo,
      this.lampMat
    );

    arm.position.set(
      isLeft ? 1.6 : -1.6,
      8.0,
      0
    );

    lampGroup.add(arm);

    const headGeo = new THREE.BoxGeometry(
      0.9,
      0.2,
      0.4
    );

    const head = new THREE.Mesh(
      headGeo,
      this.lampMat
    );

    head.position.set(
      isLeft ? 3.2 : -3.2,
      7.9,
      0
    );

    lampGroup.add(head);

    const ledGeo = new THREE.PlaneGeometry(
      0.8,
      0.35
    );

    ledGeo.rotateX(Math.PI / 2);

    const ledMat = new THREE.MeshBasicMaterial({
      color: 0xfff6e5,
    });

    const led = new THREE.Mesh(ledGeo, ledMat);

    led.position.set(
      isLeft ? 3.2 : -3.2,
      7.78,
      0
    );

    lampGroup.add(led);
    parent.add(lampGroup);
  }

  private addProceduralTree(
    parent: THREE.Group,
    x: number,
    z: number
  ) {
    const treeGroup = new THREE.Group();

    treeGroup.position.set(x, 0, z);

    const scale = 0.9 + Math.random() * 0.45;

    treeGroup.scale.set(
      scale,
      scale,
      scale
    );

    const trunk = new THREE.Mesh(
      this.treeTrunkGeo,
      this.trunkMat
    );

    trunk.position.y = 1.2;
    trunk.castShadow = true;

    treeGroup.add(trunk);

    const c1 = new THREE.Mesh(
      this.treeCanopyGeo1,
      this.foliageMat1
    );

    c1.position.y = 3.0;
    c1.castShadow = true;

    treeGroup.add(c1);

    const c2 = new THREE.Mesh(
      this.treeCanopyGeo2,
      this.foliageMat2
    );

    c2.position.y = 4.5;
    c2.castShadow = true;

    treeGroup.add(c2);

    parent.add(treeGroup);
  }

  private addOverheadGantry(
    parent: THREE.Group,
    z: number
  ) {
    const gantry = new THREE.Group();

    gantry.position.set(0, 0, z);

    const {
      HIGHWAY_WIDTH,
      GUARDRAIL_OFFSET,
    } = GAME_CONSTANTS;

    const postMat = this.lampMat;

    const postGeo = new THREE.CylinderGeometry(
      0.22,
      0.28,
      8.2,
      8
    );

    const leftPost = new THREE.Mesh(
      postGeo,
      postMat
    );

    leftPost.position.set(
      -GUARDRAIL_OFFSET - 0.8,
      4.1,
      0
    );

    gantry.add(leftPost);

    const rightPost = new THREE.Mesh(
      postGeo,
      postMat
    );

    rightPost.position.set(
      GUARDRAIL_OFFSET + 0.8,
      4.1,
      0
    );

    gantry.add(rightPost);

    const trussGeo = new THREE.BoxGeometry(
      HIGHWAY_WIDTH + 3.2,
      0.9,
      0.9
    );

    const truss = new THREE.Mesh(
      trussGeo,
      postMat
    );

    truss.position.set(0, 7.8, 0);

    gantry.add(truss);

    const signTex = createHighwaySignTexture(
      'NORTH METRO / AIRPORT',
      'INTERSTATE HIGHWAY 95'
    );

    const signGeo = new THREE.PlaneGeometry(
      7.2,
      3.4
    );

    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.35,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const signMesh = new THREE.Mesh(
      signGeo,
      signMat
    );

    signMesh.position.set(0, 7.8, 0.48);

    gantry.add(signMesh);
    parent.add(gantry);
  }

  private buildDistantSkyline() {
    this.distantSkylineGroup.position.set(
      0,
      0,
      -680
    );

    const mountainGeo = new THREE.ConeGeometry(
      120,
      75,
      6
    );

    const mountainMat = new THREE.MeshBasicMaterial({
      color: 0x1f2e42,
    });

    const mountainPositions = [
      -260,
      -130,
      0,
      130,
      260,
    ];

    mountainPositions.forEach((mx, idx) => {
      const m = new THREE.Mesh(
        mountainGeo,
        mountainMat
      );

      m.position.set(
        mx,
        22,
        -80 - idx * 25
      );

      m.scale.set(1.5, 0.75, 1);

      this.distantSkylineGroup.add(m);
    });

    // Keep distant geometric mountains hidden during testing.
    this.distantSkylineGroup.visible = false;

    this.scene.add(this.distantSkylineGroup);
  }

  public reset(playerZ: number = 0) {
    const { SEGMENT_LENGTH } = GAME_CONSTANTS;

    for (let i = 0; i < this.segments.length; i++) {
      const zPos =
        playerZ - (i - 1) * SEGMENT_LENGTH;

      this.segments[i].z = zPos;
      this.segments[i].group.position.z = zPos;
      this.segments[i].group.visible = true;
    }

    this.distantSkylineGroup.position.z =
      playerZ - 650;

    this.distantSkylineGroup.visible = false;
  }

  public update(playerZ: number) {
    const { SEGMENT_LENGTH } = GAME_CONSTANTS;

    this.distantSkylineGroup.position.z =
      playerZ - 650;

    // Keep skyline hidden while investigating the blue-road issue.
    this.distantSkylineGroup.visible = false;

    let moved = true;
    let guard = 0;

    while (
      moved &&
      guard < this.segments.length
    ) {
      moved = false;
      guard++;

      let minZ = Infinity;

      for (const s of this.segments) {
        if (s.z < minZ) {
          minZ = s.z;
        }
      }

      for (const seg of this.segments) {
        if (seg.z > playerZ + 50) {
          seg.z = minZ - SEGMENT_LENGTH;
          seg.group.position.z = seg.z;
          seg.group.visible = true;

          moved = true;
          break;
        }
      }
    }

    let hasNearbySegment = false;

    for (const s of this.segments) {
      if (
        s.z <= playerZ + SEGMENT_LENGTH &&
        s.z >= playerZ - SEGMENT_LENGTH * 2
      ) {
        hasNearbySegment = true;
        break;
      }
    }

    if (!hasNearbySegment) {
      this.reset(playerZ);
    }
  }
}
