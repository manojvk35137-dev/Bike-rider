import * as THREE from 'three';

export type VehicleType = 'sedan' | 'suv' | 'van' | 'truck' | 'bus';

export interface VehicleInstance {
  mesh: THREE.Group;
  type: VehicleType;
  lane: number;
  x: number;
  z: number;
  targetX: number;
  speedKmh: number;
  baseSpeedKmh: number;
  length: number;
  width: number;
  height: number;
  passedPlayer: boolean;
  closeCallAwarded: boolean;
  taillightMat: THREE.MeshStandardMaterial;
  isBraking: boolean;
  colorName: string;
}

// Reusable shared materials and geometries for optimal mobile performance
let sharedGeometriesInitialized = false;
let wheelGeo: THREE.CylinderGeometry;
let rimGeo: THREE.CylinderGeometry;
let shadowGeo: THREE.PlaneGeometry;

let tireMat: THREE.MeshStandardMaterial;
let rimMat: THREE.MeshStandardMaterial;
let windowMat: THREE.MeshStandardMaterial;
let headlightMat: THREE.MeshStandardMaterial;
let chromeMat: THREE.MeshStandardMaterial;
let shadowMat: THREE.MeshBasicMaterial;

const CAR_COLORS = [
  { name: 'Red', hex: 0xd32f2f, metal: 0.4, rough: 0.25 },
  { name: 'Blue', hex: 0x1976d2, metal: 0.6, rough: 0.22 },
  { name: 'White', hex: 0xeeeeee, metal: 0.2, rough: 0.3 },
  { name: 'Dark Gray', hex: 0x2e3440, metal: 0.5, rough: 0.28 },
  { name: 'Yellow', hex: 0xfbc02d, metal: 0.3, rough: 0.3 },
  { name: 'Orange', hex: 0xf57c00, metal: 0.4, rough: 0.25 },
  { name: 'Black', hex: 0x18181b, metal: 0.8, rough: 0.15 },
];

function initSharedAssets() {
  if (sharedGeometriesInitialized) return;
  wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.23, 10);
  rimGeo.rotateZ(Math.PI / 2);

  shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);

  tireMat = new THREE.MeshStandardMaterial({
    color: 0x1f2328,
    roughness: 0.9,
    metalness: 0.05,
  });

  rimMat = new THREE.MeshStandardMaterial({
    color: 0xd0d5dd,
    roughness: 0.2,
    metalness: 0.85,
  });

  windowMat = new THREE.MeshStandardMaterial({
    color: 0x151b22,
    roughness: 0.15,
    metalness: 0.9,
  });

  headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    roughness: 0.1,
  });

  chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.15,
    metalness: 0.95,
  });

  // Soft contact shadow texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 5, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  sharedGeometriesInitialized = true;
}

export function createVehicleModel(type: VehicleType): { mesh: THREE.Group; taillightMat: THREE.MeshStandardMaterial; dimensions: { width: number; length: number; height: number } } {
  initSharedAssets();

  const group = new THREE.Group();
  const colorSpec = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorSpec.hex,
    metalness: colorSpec.metal,
    roughness: colorSpec.rough,
  });

  // Dedicated taillight material with dynamic emissive glow on braking
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0x990000,
    emissive: 0xee1111,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  let width = 1.9;
  let length = 4.6;
  let height = 1.45;

  if (type === 'sedan') {
    width = 1.85;
    length = 4.6;
    height = 1.42;

    // 1. Lower chassis / body
    const bodyGeo = new THREE.BoxGeometry(width, 0.55, length);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.52;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 2. Cabin / Greenhouse (positioned slightly rearward)
    const cabinGeo = new THREE.BoxGeometry(width * 0.88, 0.48, length * 0.52);
    const cabinMesh = new THREE.Mesh(cabinGeo, windowMat);
    cabinMesh.position.set(0, 0.98, 0.15);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // 3. Cabin roof lid
    const roofGeo = new THREE.BoxGeometry(width * 0.85, 0.05, length * 0.48);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(0, 1.24, 0.15);
    group.add(roofMesh);

    // 4. Wheels (4 wheels)
    addFourWheels(group, width, length, 0.32);

    // 5. Headlights (-Z front) & Taillights (+Z rear)
    addHeadlights(group, width, length, 0.52);
    addTaillights(group, width, length, 0.55, taillightMat);
    addShadow(group, width * 1.35, length * 1.15);

  } else if (type === 'suv') {
    width = 2.0;
    length = 4.9;
    height = 1.75;

    // 1. Main muscular body
    const bodyGeo = new THREE.BoxGeometry(width, 0.72, length);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.68;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 2. Tall cabin
    const cabinGeo = new THREE.BoxGeometry(width * 0.9, 0.6, length * 0.62);
    const cabinMesh = new THREE.Mesh(cabinGeo, windowMat);
    cabinMesh.position.set(0, 1.28, 0.22);
    cabinMesh.castShadow = true;
    group.add(cabinMesh);

    // 3. Roof rack rails
    const railGeo = new THREE.BoxGeometry(0.04, 0.04, length * 0.5);
    const leftRail = new THREE.Mesh(railGeo, chromeMat);
    leftRail.position.set(-width * 0.4, 1.62, 0.22);
    const rightRail = leftRail.clone();
    rightRail.position.x = width * 0.4;
    group.add(leftRail, rightRail);

    // 4. Wheels
    addFourWheels(group, width, length, 0.38);

    // 5. Headlights & Taillights
    addHeadlights(group, width, length, 0.68);
    addTaillights(group, width, length, 0.72, taillightMat);
    addShadow(group, width * 1.35, length * 1.15);

  } else if (type === 'van') {
    width = 2.05;
    length = 5.4;
    height = 2.15;

    // Boxy cargo van body
    const bodyGeo = new THREE.BoxGeometry(width, 1.35, length);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.98;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Front windshield wedge (facing -Z forward)
    const windshieldGeo = new THREE.BoxGeometry(width * 0.92, 0.55, 0.85);
    const windshieldMesh = new THREE.Mesh(windshieldGeo, windowMat);
    windshieldMesh.position.set(0, 1.25, -length * 0.35);
    group.add(windshieldMesh);

    addFourWheels(group, width, length, 0.36);
    addHeadlights(group, width, length, 0.75);
    addTaillights(group, width, length, 0.85, taillightMat);
    addShadow(group, width * 1.35, length * 1.12);

  } else if (type === 'truck') {
    width = 2.5;
    length = 8.5;
    height = 3.3;

    // 1. Front tractor cab (forward -Z)
    const cabGeo = new THREE.BoxGeometry(width * 0.95, 1.7, 2.4);
    const cabMesh = new THREE.Mesh(cabGeo, bodyMat);
    cabMesh.position.set(0, 1.25, -length * 0.32);
    cabMesh.castShadow = true;
    group.add(cabMesh);

    // Cab windshield
    const cabWinGeo = new THREE.BoxGeometry(width * 0.9, 0.65, 0.8);
    const cabWinMesh = new THREE.Mesh(cabWinGeo, windowMat);
    cabWinMesh.position.set(0, 1.62, -length * 0.38);
    group.add(cabWinMesh);

    // 2. Large Cargo Container (rearward +Z)
    const containerMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.45,
      metalness: 0.6,
    });
    const containerGeo = new THREE.BoxGeometry(width, 2.4, 5.8);
    const containerMesh = new THREE.Mesh(containerGeo, containerMat);
    containerMesh.position.set(0, 1.75, 1.1);
    containerMesh.castShadow = true;
    group.add(containerMesh);

    // Vertical chrome exhaust stack behind cab
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);
    const pipeMesh = new THREE.Mesh(pipeGeo, chromeMat);
    pipeMesh.position.set(width * 0.42, 2.1, -length * 0.18);
    group.add(pipeMesh);

    // Dual rear axle wheels (6 wheels total)
    addTruckWheels(group, width, length);

    addHeadlights(group, width, length, 0.75);
    addTaillights(group, width, length, 0.85, taillightMat);
    addShadow(group, width * 1.3, length * 1.1);

  } else if (type === 'bus') {
    width = 2.55;
    length = 11.2;
    height = 3.2;

    const busBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.3,
    });

    const bodyGeo = new THREE.BoxGeometry(width, 2.3, length);
    const bodyMesh = new THREE.Mesh(bodyGeo, busBodyMat);
    bodyMesh.position.y = 1.55;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    const winGeo = new THREE.BoxGeometry(width * 1.02, 0.75, length * 0.88);
    const winMesh = new THREE.Mesh(winGeo, windowMat);
    winMesh.position.set(0, 1.75, 0);
    group.add(winMesh);

    // Front windshield (facing -Z forward)
    const frontGlassGeo = new THREE.BoxGeometry(width * 0.94, 0.95, 0.3);
    const frontGlass = new THREE.Mesh(frontGlassGeo, windowMat);
    frontGlass.position.set(0, 1.65, -length * 0.49);
    group.add(frontGlass);

    addTruckWheels(group, width, length);

    addHeadlights(group, width, length, 0.75);
    addTaillights(group, width, length, 0.85, taillightMat);
    addShadow(group, width * 1.35, length * 1.1);
  }

  return {
    mesh: group,
    taillightMat,
    dimensions: { width, length, height },
  };
}

function addFourWheels(group: THREE.Group, w: number, l: number, y: number) {
  const halfW = w * 0.48;
  const halfL = l * 0.32;

  const positions = [
    [-halfW, y, halfL],
    [halfW, y, halfL],
    [-halfW, y, -halfL],
    [halfW, y, -halfL],
  ];

  positions.forEach(([x, py, z]) => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(x, py, z);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(x, py, z);
    group.add(tire, rim);
  });
}

function addTruckWheels(group: THREE.Group, w: number, l: number) {
  const halfW = w * 0.48;
  const positions = [
    [-halfW, 0.42, l * 0.38],
    [halfW, 0.42, l * 0.38],
    [-halfW, 0.42, -l * 0.28],
    [halfW, 0.42, -l * 0.28],
    [-halfW, 0.42, -l * 0.40],
    [halfW, 0.42, -l * 0.40],
  ];

  positions.forEach(([x, py, z]) => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(x, py, z);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(x, py, z);
    group.add(tire, rim);
  });
}

function addHeadlights(group: THREE.Group, w: number, l: number, y: number) {
  const headGeo = new THREE.BoxGeometry(0.24, 0.12, 0.05);
  const leftHead = new THREE.Mesh(headGeo, headlightMat);
  leftHead.position.set(-w * 0.36, y, -l * 0.5); // Front of vehicle facing forward (-Z)

  const rightHead = leftHead.clone();
  rightHead.position.x = w * 0.36;
  group.add(leftHead, rightHead);
}

function addTaillights(group: THREE.Group, w: number, l: number, y: number, mat: THREE.MeshStandardMaterial) {
  const tailGeo = new THREE.BoxGeometry(0.28, 0.12, 0.05);
  const leftTail = new THREE.Mesh(tailGeo, mat);
  leftTail.position.set(-w * 0.36, y, l * 0.5); // Rear of vehicle facing rear (+Z)

  const rightTail = new THREE.Mesh(tailGeo, mat);
  rightTail.position.set(w * 0.36, y, l * 0.5);
  group.add(leftTail, rightTail);

  // Rear European/Highway License Plate
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Euro yellow plate
    roughness: 0.3,
    metalness: 0.2,
  });
  const plateGeo = new THREE.BoxGeometry(0.36, 0.1, 0.02);
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, y - 0.12, l * 0.505);
  group.add(plate);

  // Dual Chrome Exhaust Pipes
  const exhaustGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.12, 10);
  exhaustGeo.rotateX(Math.PI / 2);
  const leftExhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  leftExhaust.position.set(-w * 0.32, 0.22, l * 0.5);
  const rightExhaust = leftExhaust.clone();
  rightExhaust.position.x = w * 0.32;
  group.add(leftExhaust, rightExhaust);
}

function addShadow(group: THREE.Group, w: number, l: number) {
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.scale.set(w, l, 1);
  shadow.position.set(0, 0.03, 0); // Slight offset above road to prevent Z-fighting
  group.add(shadow);
}
