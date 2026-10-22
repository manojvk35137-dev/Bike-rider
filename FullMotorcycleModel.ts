import * as THREE from 'three';
import { MotorcycleConfig } from '../motorcycles';
import { createCarbonFiberTexture, createMirrorReflectionTexture } from '../textures';

/**
 * Creates a complete, highly detailed procedural 3D motorcycle model
 * for each of the seven Royal Enfield models.
 * Accurately models fuel tanks, seats, engine silhouettes, exhausts,
 * forks, wheels, handlebars, and lighting according to real-world specs.
 */

export function buildFullMotorcycleMesh(bike: MotorcycleConfig): THREE.Group {
  const root = new THREE.Group();

  // Materials
  const paintMat = new THREE.MeshStandardMaterial({
    color: bike.cockpit.primaryColor,
    metalness: 0.65,
    roughness: 0.25,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: bike.cockpit.accentColor,
    metalness: 0.8,
    roughness: 0.2,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.95,
    roughness: 0.12,
  });

  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    metalness: 0.6,
    roughness: 0.45,
  });

  const finsMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.3,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.5,
    roughness: 0.4,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x1c1815,
    roughness: 0.85,
    metalness: 0.05,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x17181c,
    roughness: 0.9,
    metalness: 0.02,
  });

  const headlampGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff3d6,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.2,
  });

  // 1. CHASSIS / CRADLE FRAME (Dual cradle steel frame)
  const backboneGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8);
  backboneGeo.rotateX(Math.PI / 2.3);
  const backbone = new THREE.Mesh(backboneGeo, frameMat);
  backbone.position.set(0, 0.7, 0.05);
  root.add(backbone);

  const downTubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8);
  const leftDownTube = new THREE.Mesh(downTubeGeo, frameMat);
  leftDownTube.position.set(-0.1, 0.45, 0.3);
  leftDownTube.rotation.x = -0.3;
  const rightDownTube = leftDownTube.clone();
  rightDownTube.position.x = 0.1;
  root.add(leftDownTube, rightDownTube);

  const swingarmGeo = new THREE.BoxGeometry(0.24, 0.05, 0.68);
  const swingarm = new THREE.Mesh(swingarmGeo, frameMat);
  swingarm.position.set(0, 0.38, -0.42);
  swingarm.rotation.x = 0.14;
  root.add(swingarm);

  // 2. ENGINE BLOCK & TRANSMISSION
  // Differentiate UCE 500cc vs J-Series 350cc vs LS410 vs Sherpa 452 Liquid-Cooled
  const crankcaseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.32, 16);
  crankcaseGeo.rotateZ(Math.PI / 2);
  const crankcase = new THREE.Mesh(crankcaseGeo, bike.id === 'bullet-500' ? chromeMat : engineMat);
  crankcase.position.set(0, 0.36, 0.02);
  root.add(crankcase);

  // Cylinder barrel with cooling fins
  const cylinderGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.32, 12);
  const cylinder = new THREE.Mesh(cylinderGeo, engineMat);
  // Sherpa 450 cylinder is inclined forward
  cylinder.rotation.x = bike.id.includes('450') ? -0.22 : 0;
  cylinder.position.set(0, 0.58, 0.08);
  root.add(cylinder);

  // Prominent horizontal cooling fins for air-cooled engines
  if (!bike.id.includes('450')) {
    for (let f = 0; f < 5; f++) {
      const finGeo = new THREE.CylinderGeometry(0.14 - f * 0.004, 0.14 - f * 0.004, 0.012, 12);
      const fin = new THREE.Mesh(finGeo, finsMat);
      fin.position.set(0, 0.48 + f * 0.045, 0.08);
      root.add(fin);
    }
  }

  // Radiator for Liquid-Cooled Sherpa 450 (Himalayan 450 & Guerrilla 450)
  if (bike.id.includes('450')) {
    const radiatorGeo = new THREE.BoxGeometry(0.26, 0.32, 0.05);
    const radMesh = new THREE.Mesh(radiatorGeo, frameMat);
    radMesh.position.set(0, 0.55, 0.32);
    root.add(radMesh);
  }

  // Oil cooler for Himalayan 411
  if (bike.id === 'himalayan-411') {
    const oilCoolerGeo = new THREE.BoxGeometry(0.08, 0.16, 0.04);
    const oilCooler = new THREE.Mesh(oilCoolerGeo, frameMat);
    oilCooler.position.set(0.16, 0.52, 0.25);
    root.add(oilCooler);
  }

  // 3. FUEL TANK (Distinct shapes for each family)
  let tankMesh: THREE.Mesh;
  if (bike.id === 'classic-350') {
    // Signature sculpted teardrop tank with knee recesses
    const tankGeo = new THREE.CylinderGeometry(0.15, 0.24, 0.58, 16);
    tankGeo.rotateX(Math.PI / 2);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.82, 0.15);
    tankMesh.scale.set(0.9, 0.75, 1.0);

    // Rubber knee pads
    const padGeo = new THREE.BoxGeometry(0.02, 0.12, 0.2);
    const leftPad = new THREE.Mesh(padGeo, leatherMat);
    leftPad.position.set(-0.16, 0.8, 0.12);
    const rightPad = leftPad.clone();
    rightPad.position.x = 0.16;
    root.add(leftPad, rightPad);
  } else if (bike.id === 'bullet-350' || bike.id === 'bullet-500') {
    // Rectangular / slab-sided vintage tank
    const tankGeo = new THREE.BoxGeometry(0.3, 0.26, 0.58);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.82, 0.15);

    // Gold pinstripe accent bands
    const stripeGeo = new THREE.BoxGeometry(0.305, 0.02, 0.54);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.set(0, 0.82, 0.15);
    root.add(stripe);
  } else if (bike.id === 'hunter-350') {
    // Chiseled roadster tank
    const tankGeo = new THREE.BoxGeometry(0.32, 0.24, 0.52);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.8, 0.14);
    tankMesh.scale.set(0.95, 0.85, 1);
  } else if (bike.id === 'himalayan-411') {
    // Angular, rugged adventure tank
    const tankGeo = new THREE.BoxGeometry(0.34, 0.32, 0.56);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.85, 0.15);

    // External steel subframe exo-cage (Himalayan 411 signature)
    const cageGeo = new THREE.TorusGeometry(0.24, 0.012, 8, 16, Math.PI);
    const leftCage = new THREE.Mesh(cageGeo, frameMat);
    leftCage.rotation.y = Math.PI / 2;
    leftCage.position.set(-0.2, 0.82, 0.2);
    const rightCage = leftCage.clone();
    rightCage.position.x = 0.2;
    root.add(leftCage, rightCage);
  } else if (bike.id === 'himalayan-450') {
    // Modern 17L adventure curvature tank
    const tankGeo = new THREE.CylinderGeometry(0.18, 0.34, 0.62, 16);
    tankGeo.rotateX(Math.PI / 2);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.88, 0.16);
    tankMesh.scale.set(0.95, 0.78, 1);
  } else {
    // Guerrilla 450: Scrambler / streetfighter flat teardrop tank
    const tankGeo = new THREE.BoxGeometry(0.33, 0.22, 0.48);
    tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, 0.78, 0.14);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.335, 0.06, 0.42), accentMat);
    stripe.position.set(0, 0.78, 0.14);
    root.add(stripe);
  }
  tankMesh.castShadow = true;
  root.add(tankMesh);

  // 4. SEAT STYLING
  if (bike.id === 'classic-350') {
    // Sprung single rider saddle + pillion seat
    const saddleGeo = new THREE.BoxGeometry(0.3, 0.09, 0.32);
    const saddle = new THREE.Mesh(saddleGeo, leatherMat);
    saddle.position.set(0, 0.78, -0.22);
    root.add(saddle);

    // Chrome seat springs
    const springGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const leftSpring = new THREE.Mesh(springGeo, chromeMat);
    leftSpring.position.set(-0.08, 0.71, -0.32);
    const rightSpring = leftSpring.clone();
    rightSpring.position.x = 0.08;
    root.add(leftSpring, rightSpring);

    const pillion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.28), leatherMat);
    pillion.position.set(0, 0.82, -0.56);
    root.add(pillion);
  } else if (bike.id === 'himalayan-411' || bike.id === 'himalayan-450') {
    // Dual-height stepped adventure tourer seat
    const frontSeat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.36), leatherMat);
    frontSeat.position.set(0, 0.82, -0.22);
    const rearSeat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.34), leatherMat);
    rearSeat.position.set(0, 0.92, -0.54);
    root.add(frontSeat, rearSeat);

    // Rear luggage carrier rack
    const rackGeo = new THREE.BoxGeometry(0.26, 0.03, 0.28);
    const rack = new THREE.Mesh(rackGeo, frameMat);
    rack.position.set(0, 0.94, -0.8);
    root.add(rack);
  } else if (bike.id === 'guerrilla-450' || bike.id === 'hunter-350') {
    // One-piece roadster/scrambler bench seat
    const seatGeo = new THREE.BoxGeometry(0.26, 0.09, 0.65);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.78, -0.36);
    root.add(seat);
  } else {
    // Bullet 350 & Bullet 500: Stepped contoured touring bench
    const seatGeo = new THREE.BoxGeometry(0.29, 0.11, 0.68);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.8, -0.36);
    root.add(seat);
  }

  // 5. EXHAUST SYSTEM
  // Classic peashooter vs Stubby roadster vs High-upswept ADV
  if (bike.id === 'hunter-350' || bike.id === 'guerrilla-450') {
    // Short stubby black upswept silencer
    const pipeGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.52, 12);
    pipeGeo.rotateX(Math.PI / 2.3);
    const silencer = new THREE.Mesh(pipeGeo, engineMat);
    silencer.position.set(0.18, 0.38, -0.35);
    root.add(silencer);
  } else if (bike.id === 'himalayan-411' || bike.id === 'himalayan-450') {
    // High-swept adventure canister
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.65, 12);
    pipeGeo.rotateX(Math.PI / 2.2);
    const silencer = new THREE.Mesh(pipeGeo, bike.id === 'himalayan-411' ? chromeMat : engineMat);
    silencer.position.set(0.2, 0.56, -0.42);
    root.add(silencer);
  } else {
    // Bullet 350, Classic 350, Bullet 500: Long chrome bottle/peashooter silencer
    const pipeGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.95, 12);
    pipeGeo.rotateX(Math.PI / 2);
    const silencer = new THREE.Mesh(pipeGeo, chromeMat);
    silencer.position.set(0.18, 0.28, -0.42);
    root.add(silencer);
  }

  // Exhaust manifold header pipe from cylinder head
  const headerGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.55, 10);
  headerGeo.rotateX(-Math.PI / 4);
  const header = new THREE.Mesh(headerGeo, chromeMat);
  header.position.set(0.12, 0.44, 0.22);
  root.add(header);

  // 6. WHEELS & TYRES
  // Himalayan 411/450: 21-inch front ADV spoke wheel
  // Hunter/Guerrilla: 17-inch alloy wheels with wide tires
  // Bullet/Classic: 19-inch front / 18-inch rear spoked wheels
  const isAlloy = bike.id === 'hunter-350' || bike.id === 'guerrilla-450';
  const frontRadius = bike.id.includes('himalayan') ? 0.42 : isAlloy ? 0.35 : 0.39;
  const rearRadius = isAlloy ? 0.34 : 0.36;

  addBikeWheel(root, 0, frontRadius, 0.95, frontRadius, 0.1, isAlloy, tireMat, chromeMat);
  addBikeWheel(root, 0, rearRadius, -0.75, rearRadius, isAlloy ? 0.16 : 0.12, isAlloy, tireMat, chromeMat);

  // 7. FRONT FORKS & SUSPENSION
  // Himalayan 450: Inverted USD Gold Showa forks!
  // Himalayan 411: Conventional 41mm with rubber gaiters
  // Classic/Bullet: Casquette sleeve forks
  const forkMat = bike.id === 'himalayan-450' ? accentMat : bike.cockpit.forkColor === 0xd0d5dd ? chromeMat : frameMat;
  const forkGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.92, 12);

  const leftFork = new THREE.Mesh(forkGeo, forkMat);
  leftFork.position.set(-0.12, 0.62, 0.75);
  leftFork.rotation.x = -0.38;
  const rightFork = leftFork.clone();
  rightFork.position.x = 0.12;
  root.add(leftFork, rightFork);

  // 8. HEADLIGHT & NACELLE
  if (bike.cockpit.dashType === 'classic-nacelle' || bike.cockpit.dashType === 'classic-500') {
    // Signature Royal Enfield Casquette nacelle
    const nacelleGeo = new THREE.BoxGeometry(0.28, 0.22, 0.25);
    const nacelle = new THREE.Mesh(nacelleGeo, paintMat);
    nacelle.position.set(0, 0.92, 0.62);
    root.add(nacelle);

    // Twin tiger-eye pilot lights
    const pilotGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const leftPilot = new THREE.Mesh(pilotGeo, headlampGlassMat);
    leftPilot.position.set(-0.11, 0.96, 0.72);
    const rightPilot = leftPilot.clone();
    rightPilot.position.x = 0.11;
    root.add(leftPilot, rightPilot);
  }

  // Main round 7-inch headlight lens
  const headlampGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16);
  headlampGeo.rotateX(Math.PI / 2);
  const headlamp = new THREE.Mesh(headlampGeo, headlampGlassMat);
  headlamp.position.set(0, 0.9, 0.75);
  root.add(headlamp);

  // 9. HANDLEBARS & MIRRORS
  const barGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.65, 10);
  barGeo.rotateZ(Math.PI / 2);
  const barMesh = new THREE.Mesh(barGeo, bike.cockpit.forkColor === 0xd0d5dd ? chromeMat : frameMat);
  barMesh.position.set(0, 1.02, 0.55);
  root.add(barMesh);

  // Mirrors
  const mirrorGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12);
  mirrorGeo.rotateX(Math.PI / 2);
  const mirrorMat = bike.cockpit.mirrorType === 'vintage-chrome-round' ? chromeMat : frameMat;
  const leftMirror = new THREE.Mesh(mirrorGeo, mirrorMat);
  leftMirror.position.set(-0.35, 1.15, 0.52);
  const rightMirror = leftMirror.clone();
  rightMirror.position.x = 0.35;
  root.add(leftMirror, rightMirror);

  // 10. WINDSCREEN (Himalayan 411 tall vs Himalayan 450 aero)
  if (bike.cockpit.windshieldType === 'tall-adv-411') {
    const screenGeo = new THREE.PlaneGeometry(0.28, 0.42);
    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.15, 0.68);
    screen.rotation.x = -0.22;
    root.add(screen);
  } else if (bike.cockpit.windshieldType === 'aero-adv-450') {
    const screenGeo = new THREE.PlaneGeometry(0.26, 0.32);
    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.1,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.12, 0.68);
    screen.rotation.x = -0.32;
    root.add(screen);
  }

  // Ground contact shadow plane
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const shadowGeo = new THREE.PlaneGeometry(0.9, 2.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false })
  );
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Rotate 180 deg so motorcycle faces forward along -Z
  root.rotation.y = Math.PI;

  return root;
}

function addBikeWheel(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius: number,
  width: number,
  isAlloy: boolean,
  tireMat: THREE.Material,
  metalMat: THREE.Material
) {
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(x, y, z);

  // Tire torus
  const tireGeo = new THREE.TorusGeometry(radius, width * 0.5, 12, 24);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.y = Math.PI / 2;
  wheelGroup.add(tire);

  // Rim
  const rimGeo = new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, width * 0.8, 16, 1, true);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, metalMat);
  wheelGroup.add(rim);

  // Hub & Spokes / Alloy struts
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, width * 0.9, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, metalMat);
  wheelGroup.add(hub);

  if (isAlloy) {
    // 10-spoke cast alloy pattern
    for (let i = 0; i < 5; i++) {
      const spokeGeo = new THREE.BoxGeometry(0.02, radius * 1.55, 0.03);
      const spoke = new THREE.Mesh(spokeGeo, metalMat);
      spoke.rotation.x = (i * Math.PI) / 5;
      wheelGroup.add(spoke);
    }
  } else {
    // Classic Wire Spokes
    for (let i = 0; i < 16; i++) {
      const spokeGeo = new THREE.CylinderGeometry(0.003, 0.003, radius * 1.6, 6);
      const spoke = new THREE.Mesh(spokeGeo, metalMat);
      spoke.rotation.x = (i * Math.PI) / 8;
      spoke.rotation.z = (i % 2 === 0 ? 0.08 : -0.08);
      wheelGroup.add(spoke);
    }
  }

  // Front brake disc
  const discGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.01, 16);
  discGeo.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, metalMat);
  disc.position.x = width * 0.42;
  wheelGroup.add(disc);

  parent.add(wheelGroup);
}
