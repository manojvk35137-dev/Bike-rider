import * as THREE from 'three';
import { MotorcycleConfig } from '../motorcycles';
import { createMirrorReflectionTexture } from '../textures';

export class CockpitModel {
  public group: THREE.Group;
  public handlebarsGroup: THREE.Group;
  public currentBike!: MotorcycleConfig;

  // Dynamic canvas for live instrument cluster
  public dashCanvas: HTMLCanvasElement;
  public dashTexture: THREE.CanvasTexture;
  private dashCtx: CanvasRenderingContext2D;

  private rightGripMesh?: THREE.Mesh;
  private rightLeverMesh?: THREE.Mesh;
  private leftLeverMesh?: THREE.Mesh;

  constructor(bike: MotorcycleConfig) {
    this.group = new THREE.Group();
    this.handlebarsGroup = new THREE.Group();
    this.group.add(this.handlebarsGroup);

    this.dashCanvas = document.createElement('canvas');
    this.dashCanvas.width = 512;
    this.dashCanvas.height = 256;
    this.dashCtx = this.dashCanvas.getContext('2d')!;
    this.dashTexture = new THREE.CanvasTexture(this.dashCanvas);
    this.dashTexture.colorSpace = THREE.SRGBColorSpace;

    this.setMotorcycle(bike);
  }

  public setMotorcycle(bike: MotorcycleConfig) {
    this.currentBike = bike;

    // Clear existing cockpit parts
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    while (this.handlebarsGroup.children.length > 0) {
      this.handlebarsGroup.remove(this.handlebarsGroup.children[0]);
    }
    this.group.add(this.handlebarsGroup);

    this.buildCockpit();
    this.updateDash(0, 0.2, 1, 0);
  }

  private buildCockpit() {
    const bike = this.currentBike;
    const mirrorTex = createMirrorReflectionTexture();

    // -------------------------------------------------------------
    // PBR REALISTIC AUTOMOTIVE MATERIALS
    // -------------------------------------------------------------
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.08,
    });

    const brushedAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.24,
    });

    const satinBlackMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      metalness: 0.35,
      roughness: 0.5,
    });

    const gripRubberMat = new THREE.MeshStandardMaterial({
      color: 0x121316,
      metalness: 0.04,
      roughness: 0.92,
    });

    const kneePadMat = new THREE.MeshStandardMaterial({
      color: 0x15171b,
      metalness: 0.02,
      roughness: 0.94,
    });

    // Automotive high-gloss paint with clearcoat
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: bike.cockpit.primaryColor,
      metalness: 0.45,
      roughness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: bike.cockpit.accentColor,
      metalness: 0.85,
      roughness: 0.18,
    });

    const mirrorGlassMat = new THREE.MeshStandardMaterial({
      map: mirrorTex,
      metalness: 0.95,
      roughness: 0.06,
    });

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.dashTexture,
    });

    const isClassicNacelle = bike.cockpit.dashType === 'classic-nacelle' || bike.cockpit.dashType === 'classic-500';
    const isChromeBar = bike.cockpit.handlebarType === 'classic-chrome' || bike.cockpit.handlebarType === 'swept-touring';
    const barMaterial = isChromeBar ? chromeMat : satinBlackMat;

    // ========================================================
    // 1. SCULPTED FUEL TANK TOP (CURVED REALISTIC GEOMETRY)
    // ========================================================
    // Teardrop contoured tank top visible in the lower center
    const tankGeo = new THREE.SphereGeometry(0.24, 24, 18);
    tankGeo.scale(1.0, 0.72, 1.6);
    const tankMesh = new THREE.Mesh(tankGeo, paintMat);
    tankMesh.position.set(0, -0.32, -0.38);
    this.group.add(tankMesh);

    // Chrome Monza flip-top fuel cap with knurled ring and hinge
    const capBaseGeo = new THREE.CylinderGeometry(0.042, 0.044, 0.012, 24);
    const capBase = new THREE.Mesh(capBaseGeo, brushedAlloyMat);
    capBase.position.set(0, -0.21, -0.34);
    capBase.rotation.x = -0.32;

    const capLidGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.014, 24);
    const capLid = new THREE.Mesh(capLidGeo, chromeMat);
    capLid.position.set(0, 0.01, 0);

    const keyholeGeo = new THREE.BoxGeometry(0.004, 0.016, 0.002);
    const keyhole = new THREE.Mesh(keyholeGeo, satinBlackMat);
    keyhole.position.set(0, 0.018, 0);
    keyhole.rotation.x = Math.PI / 2;

    capBase.add(capLid, keyhole);
    this.group.add(capBase);

    // Chrome Center Tank Tie-Down Strap / Console
    const strapGeo = new THREE.BoxGeometry(0.032, 0.006, 0.46);
    const strapMesh = new THREE.Mesh(strapGeo, chromeMat);
    strapMesh.position.set(0, -0.215, -0.38);
    strapMesh.rotation.x = -0.32;
    this.group.add(strapMesh);

    // Contoured Rubber Knee Grip Pads (Ribbed traction pads on tank shoulders)
    const padGeo = new THREE.BoxGeometry(0.018, 0.12, 0.22);
    const leftPad = new THREE.Mesh(padGeo, kneePadMat);
    leftPad.position.set(-0.19, -0.28, -0.36);
    leftPad.rotation.z = 0.22;

    const rightPad = leftPad.clone();
    rightPad.position.x = 0.19;
    rightPad.rotation.z = -0.22;
    this.group.add(leftPad, rightPad);

    // Royal Enfield Metallic 3D Winged Tank Badges
    const badgeGeo = new THREE.BoxGeometry(0.012, 0.038, 0.11);
    const leftBadge = new THREE.Mesh(badgeGeo, accentMat);
    leftBadge.position.set(-0.2, -0.24, -0.36);
    leftBadge.rotation.z = 0.18;

    const rightBadge = leftBadge.clone();
    rightBadge.position.x = 0.2;
    rightBadge.rotation.z = -0.18;
    this.group.add(leftBadge, rightBadge);

    // ========================================================
    // 2. UPPER TRIPLE CLAMP / FORK YOKE & STEERING STEM
    // ========================================================
    // Machined aluminum top yoke bridge
    const yokeGeo = new THREE.BoxGeometry(0.44, 0.032, 0.09);
    const yokeMesh = new THREE.Mesh(yokeGeo, brushedAlloyMat);
    yokeMesh.position.set(0, -0.17, -0.48);
    yokeMesh.rotation.x = 0.22;
    this.handlebarsGroup.add(yokeMesh);

    // Central Hexagonal Steering Stem Crown Nut
    const stemNutGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.018, 6);
    const stemNut = new THREE.Mesh(stemNutGeo, chromeMat);
    stemNut.position.set(0, -0.15, -0.48);
    stemNut.rotation.x = 0.22;
    this.handlebarsGroup.add(stemNut);

    // Fork Stanchion Caps (Gold on Himalayan 450 Showa USD forks, Chrome on classic)
    const forkCapGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16);
    const forkCapMat = bike.id === 'himalayan-450' ? accentMat : chromeMat;
    const leftForkCap = new THREE.Mesh(forkCapGeo, forkCapMat);
    leftForkCap.position.set(-0.17, -0.15, -0.48);
    leftForkCap.rotation.x = 0.22;

    const rightForkCap = leftForkCap.clone();
    rightForkCap.position.x = 0.17;
    this.handlebarsGroup.add(leftForkCap, rightForkCap);

    // Ignition Key Barrel & Stainless Key Bezel
    const ignGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.025, 16);
    const ignMesh = new THREE.Mesh(ignGeo, satinBlackMat);
    ignMesh.position.set(0, -0.155, -0.44);
    ignMesh.rotation.x = 0.22;

    // Small brass ignition key inserted
    const keyGeo = new THREE.BoxGeometry(0.014, 0.012, 0.004);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    const keyMesh = new THREE.Mesh(keyGeo, keyMat);
    keyMesh.position.set(0, 0.016, 0);
    ignMesh.add(keyMesh);
    this.handlebarsGroup.add(ignMesh);

    // ========================================================
    // 3. HANDLEBARS, RISERS, SWITCHGEAR & CONTROLS
    // ========================================================
    // Twin Handlebar Riser Clamp Blocks
    const riserGeo = new THREE.BoxGeometry(0.034, 0.045, 0.036);
    const leftRiser = new THREE.Mesh(riserGeo, brushedAlloyMat);
    leftRiser.position.set(-0.09, -0.14, -0.46);
    leftRiser.rotation.x = 0.22;

    const rightRiser = leftRiser.clone();
    rightRiser.position.x = 0.09;
    this.handlebarsGroup.add(leftRiser, rightRiser);

    // Chrome Riser Cap Hex Bolts
    const boltGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.006, 6);
    [-0.09, 0.09].forEach((rx) => {
      const b1 = new THREE.Mesh(boltGeo, chromeMat);
      b1.position.set(rx, -0.115, -0.47);
      const b2 = new THREE.Mesh(boltGeo, chromeMat);
      b2.position.set(rx, -0.115, -0.45);
      this.handlebarsGroup.add(b1, b2);
    });

    // Sweeping Tubular Handlebar
    // Center straight section
    const centerBarGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.34, 16);
    centerBarGeo.rotateZ(Math.PI / 2);
    const centerBar = new THREE.Mesh(centerBarGeo, barMaterial);
    centerBar.position.set(0, -0.13, -0.46);
    this.handlebarsGroup.add(centerBar);

    // Swept side wings (drops slightly and angles back toward rider)
    const wingGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.24, 16);
    wingGeo.rotateZ(Math.PI / 2.3);

    const leftWing = new THREE.Mesh(wingGeo, barMaterial);
    leftWing.position.set(-0.24, -0.135, -0.45);
    leftWing.rotation.y = 0.14;

    const rightWing = new THREE.Mesh(wingGeo, barMaterial);
    rightWing.position.set(0.24, -0.135, -0.45);
    rightWing.rotation.y = -0.14;
    this.handlebarsGroup.add(leftWing, rightWing);

    // Textured Diamond Rubber Hand Grips
    const gripGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.14, 20);
    gripGeo.rotateZ(Math.PI / 2);

    const leftGrip = new THREE.Mesh(gripGeo, gripRubberMat);
    leftGrip.position.set(-0.35, -0.14, -0.435);
    this.handlebarsGroup.add(leftGrip);

    this.rightGripMesh = new THREE.Mesh(gripGeo, gripRubberMat);
    this.rightGripMesh.position.set(0.35, -0.14, -0.435);
    this.handlebarsGroup.add(this.rightGripMesh);

    // Weighted Aluminum Bar Ends
    const barEndGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.025, 16);
    barEndGeo.rotateZ(Math.PI / 2);
    const leftBarEnd = new THREE.Mesh(barEndGeo, brushedAlloyMat);
    leftBarEnd.position.set(-0.43, -0.14, -0.435);
    const rightBarEnd = leftBarEnd.clone();
    rightBarEnd.position.x = 0.43;
    this.handlebarsGroup.add(leftBarEnd, rightBarEnd);

    // Control Switchgear Pods (Satin Black)
    const switchGeo = new THREE.BoxGeometry(0.046, 0.042, 0.046);

    // Right switchgear: Red engine kill rocker switch + Starter push button
    const rightSwitch = new THREE.Mesh(switchGeo, satinBlackMat);
    rightSwitch.position.set(0.265, -0.135, -0.445);

    const killRockerGeo = new THREE.BoxGeometry(0.018, 0.012, 0.016);
    const killRockerMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 }); // Red rocker
    const killRocker = new THREE.Mesh(killRockerGeo, killRockerMat);
    killRocker.position.set(0, 0.024, 0.005);
    rightSwitch.add(killRocker);

    // Left switchgear: Pass/beam toggle + Turn indicator + Horn button
    const leftSwitch = new THREE.Mesh(switchGeo, satinBlackMat);
    leftSwitch.position.set(-0.265, -0.135, -0.445);

    const hornButtonGeo = new THREE.BoxGeometry(0.014, 0.012, 0.014);
    const hornButtonMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Amber horn push
    const hornButton = new THREE.Mesh(hornButtonGeo, hornButtonMat);
    hornButton.position.set(0, -0.015, 0.02);
    leftSwitch.add(hornButton);

    this.handlebarsGroup.add(leftSwitch, rightSwitch);

    // Front Brake Master Cylinder with Translucent DOT4 Fluid Inspection Window
    const masterCylGeo = new THREE.BoxGeometry(0.042, 0.038, 0.042);
    const masterCyl = new THREE.Mesh(masterCylGeo, brushedAlloyMat);
    masterCyl.position.set(0.255, -0.11, -0.465);

    // Glass inspection window with amber brake fluid
    const fluidSightGeo = new THREE.CircleGeometry(0.01, 12);
    fluidSightGeo.rotateY(Math.PI / 2);
    const fluidSightMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
    const fluidSight = new THREE.Mesh(fluidSightGeo, fluidSightMat);
    fluidSight.position.set(0.22, 0, 0);
    masterCyl.add(fluidSight);
    this.handlebarsGroup.add(masterCyl);

    // Ergonomic Aluminum Brake and Clutch Levers
    const leverGeo = new THREE.BoxGeometry(0.13, 0.012, 0.016);
    const leverMaterial = isChromeBar ? chromeMat : brushedAlloyMat;

    this.leftLeverMesh = new THREE.Mesh(leverGeo, leverMaterial);
    this.leftLeverMesh.position.set(-0.32, -0.15, -0.47);
    this.leftLeverMesh.rotation.y = 0.16;
    this.handlebarsGroup.add(this.leftLeverMesh);

    this.rightLeverMesh = new THREE.Mesh(leverGeo, leverMaterial);
    this.rightLeverMesh.position.set(0.32, -0.15, -0.47);
    this.rightLeverMesh.rotation.y = -0.16;
    this.handlebarsGroup.add(this.rightLeverMesh);

    // ========================================================
    // 4. REARVIEW MIRRORS (OUTER CORNERS, CLEAR CENTER ROAD VIEW)
    // ========================================================
    const mirrorStemGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.22, 8);
    const mirrorStemMat = isChromeBar ? chromeMat : satinBlackMat;

    if (bike.cockpit.mirrorType === 'vintage-chrome-round') {
      // Vintage Round Chrome Mirrors (Bullet 350, Classic 350, Bullet 500)
      const mirrorShellGeo = new THREE.CylinderGeometry(0.054, 0.054, 0.018, 20);
      const mirrorGlassGeo = new THREE.CircleGeometry(0.051, 20);

      // Left Mirror
      const leftStem = new THREE.Mesh(mirrorStemGeo, mirrorStemMat);
      leftStem.position.set(-0.35, -0.04, -0.47);
      leftStem.rotation.z = -Math.PI * 0.28;
      this.handlebarsGroup.add(leftStem);

      const leftMirror = new THREE.Mesh(mirrorShellGeo, chromeMat);
      leftMirror.position.set(-0.44, 0.06, -0.46);
      leftMirror.rotation.x = Math.PI / 2;
      leftMirror.rotation.y = 0.24;
      this.handlebarsGroup.add(leftMirror);

      const leftGlass = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
      leftGlass.position.set(-0.44, 0.06, -0.448);
      leftGlass.rotation.y = 0.24;
      this.handlebarsGroup.add(leftGlass);

      // Right Mirror
      const rightStem = new THREE.Mesh(mirrorStemGeo, mirrorStemMat);
      rightStem.position.set(0.35, -0.04, -0.47);
      rightStem.rotation.z = Math.PI * 0.28;
      this.handlebarsGroup.add(rightStem);

      const rightMirror = leftMirror.clone();
      rightMirror.position.x = 0.44;
      rightMirror.rotation.y = -0.24;
      this.handlebarsGroup.add(rightMirror);

      const rightGlass = leftGlass.clone();
      rightGlass.position.x = 0.44;
      rightGlass.rotation.y = -0.24;
      this.handlebarsGroup.add(rightGlass);

    } else {
      // Modern Angular Roadster Mirrors (Hunter, Himalayan, Guerrilla)
      const mirrorShellGeo = new THREE.BoxGeometry(0.12, 0.07, 0.018);
      const mirrorGlassGeo = new THREE.PlaneGeometry(0.11, 0.062);

      const leftStem = new THREE.Mesh(mirrorStemGeo, mirrorStemMat);
      leftStem.position.set(-0.35, -0.04, -0.47);
      leftStem.rotation.z = -Math.PI * 0.28;
      this.handlebarsGroup.add(leftStem);

      const leftShell = new THREE.Mesh(mirrorShellGeo, satinBlackMat);
      leftShell.position.set(-0.44, 0.06, -0.46);
      leftShell.rotation.y = 0.26;
      this.handlebarsGroup.add(leftShell);

      const leftGlass = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
      leftGlass.position.set(-0.44, 0.06, -0.448);
      leftGlass.rotation.y = 0.26;
      this.handlebarsGroup.add(leftGlass);

      const rightStem = new THREE.Mesh(mirrorStemGeo, mirrorStemMat);
      rightStem.position.set(0.35, -0.04, -0.47);
      rightStem.rotation.z = Math.PI * 0.28;
      this.handlebarsGroup.add(rightStem);

      const rightShell = leftShell.clone();
      rightShell.position.x = 0.44;
      rightShell.rotation.y = -0.26;
      this.handlebarsGroup.add(rightShell);

      const rightGlass = leftGlass.clone();
      rightGlass.position.x = 0.44;
      rightGlass.rotation.y = -0.26;
      this.handlebarsGroup.add(rightGlass);
    }

    // ========================================================
    // 5. DASHBOARD INSTRUMENT CLUSTER
    // ========================================================
    // Recessed cleanly right in the center, angled towards rider
    const dashHousingGeo = new THREE.BoxGeometry(0.24, 0.12, 0.028);
    const dashHousing = new THREE.Mesh(dashHousingGeo, isClassicNacelle ? paintMat : satinBlackMat);
    dashHousing.position.set(0, -0.11, -0.5);
    dashHousing.rotation.x = -0.32;
    this.group.add(dashHousing);

    // Chrome Bezel Frame around instrument screen
    const bezelGeo = new THREE.BoxGeometry(0.246, 0.126, 0.008);
    const bezel = new THREE.Mesh(bezelGeo, chromeMat);
    bezel.position.set(0, -0.11, -0.495);
    bezel.rotation.x = -0.32;
    this.group.add(bezel);

    // Live Instrument Cluster Texture Display
    const screenGeo = new THREE.PlaneGeometry(0.235, 0.115);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, -0.108, -0.485);
    screenMesh.rotation.x = -0.32;
    this.group.add(screenMesh);
  }

  /**
   * Updates the digital/analog dashboard display on the motorcycle instrument panel in real time.
   */
  public updateDash(speedKmh: number, rpmNorm: number, gear: number, distanceMeters: number) {
    const ctx = this.dashCtx;
    const w = 512;
    const h = 256;
    const bike = this.currentBike;

    ctx.clearRect(0, 0, w, h);

    if (bike.cockpit.dashType === 'classic-nacelle' || bike.cockpit.dashType === 'classic-500') {
      // VINTAGE CASQUETTE ANALOG SPEEDOMETER (Bullet 350, Classic 350, Bullet 500)
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, w, h);

      // Vintage ivory/cream round dial face
      const cx = 256;
      const cy = 132;
      const radius = 104;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f9f7f0';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#c4cdd8'; // Chrome bezel
      ctx.stroke();

      // Royal Enfield insignia
      ctx.fillStyle = '#1c1e22';
      ctx.font = 'bold 15px serif';
      ctx.textAlign = 'center';
      ctx.fillText('ROYAL ENFIELD', cx, cy - 45);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#555e6d';
      ctx.fillText(bike.name.toUpperCase(), cx, cy - 30);

      // Speed graduations (0 to 140 or 160 km/h)
      const maxDialSpeed = bike.id === 'bullet-500' ? 160 : 140;
      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;

      ctx.strokeStyle = '#181a1f';
      ctx.fillStyle = '#181a1f';
      ctx.lineWidth = 2;
      for (let s = 0; s <= maxDialSpeed; s += 20) {
        const ratio = s / maxDialSpeed;
        const angle = startAngle + ratio * (endAngle - startAngle);
        const x1 = cx + Math.cos(angle) * (radius - 12);
        const y1 = cy + Math.sin(angle) * (radius - 12);
        const x2 = cx + Math.cos(angle) * (radius - 24);
        const y2 = cy + Math.sin(angle) * (radius - 24);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const tx = cx + Math.cos(angle) * (radius - 34);
        const ty = cy + Math.sin(angle) * (radius - 34);
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${s}`, tx, ty + 4);
      }

      // Small digital LCD window for odometer & gear
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 48, cy + 28, 96, 26);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`G:${gear} ${(distanceMeters / 1000).toFixed(1)}k`, cx, cy + 46);

      // Red needle indicator
      const currentRatio = Math.min(1, Math.max(0, speedKmh / maxDialSpeed));
      const needleAngle = startAngle + currentRatio * (endAngle - startAngle);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(needleAngle);
      ctx.strokeStyle = '#dc2626'; // Vivid red needle
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(radius - 20, 0);
      ctx.stroke();

      // Needle center cap
      ctx.fillStyle = '#1c1e22';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // High visibility speed readout
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${Math.round(speedKmh)} KM/H`, cx, 245);

    } else if (bike.cockpit.dashType === 'himalayan-411-multi') {
      // HIMALAYAN 411: DISTINCT 3-GAUGE ADVENTURE INSTRUMENT PANEL
      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, w, h);

      // 1. Left: Main Analog Speedometer
      const cx1 = 150;
      const cy1 = 125;
      const r1 = 80;
      ctx.beginPath();
      ctx.arc(cx1, cy1, r1, 0, Math.PI * 2);
      ctx.fillStyle = '#181c24';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPEED (KM/H)', cx1, cy1 - 32);

      const needleAngle1 = Math.PI * 0.75 + (Math.min(1, speedKmh / 140)) * Math.PI * 1.5;
      ctx.save();
      ctx.translate(cx1, cy1);
      ctx.rotate(needleAngle1);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r1 - 15, 0);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`${Math.round(speedKmh)}`, cx1, cy1 + 25);

      // 2. Right Top: Smaller Analog Tachometer (RPM x1000)
      const cx2 = 360;
      const cy2 = 85;
      const r2 = 55;
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
      ctx.fillStyle = '#181c24';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('RPM x1000', cx2, cy2 - 20);

      const rpmAngle = Math.PI * 0.75 + rpmNorm * Math.PI * 1.5;
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.rotate(rpmAngle);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r2 - 10, 0);
      ctx.stroke();
      ctx.restore();

      // 3. Right Bottom: Himalayan Digital Compass & Gear LCD Pod
      const cx3 = 360;
      const cy3 = 190;
      const r3 = 45;
      ctx.beginPath();
      ctx.arc(cx3, cy3, r3, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`GEAR: ${gear}`, cx3, cy3 - 10);
      ctx.fillStyle = '#10b981';
      ctx.fillText('NW 315°', cx3, cy3 + 12);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('24°C ADV', cx3, cy3 + 28);

    } else if (bike.cockpit.dashType === 'himalayan-450-tft' || bike.cockpit.dashType === 'guerrilla-tft') {
      // HIMALAYAN 450 & GUERRILLA 450: CIRCULAR 4-INCH FULL-COLOR TFT "TRIPPERDASH"
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      const cx = 256;
      const cy = 128;
      const r = 108;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = bike.id === 'guerrilla-450' ? '#facc15' : '#38bdf8';
      ctx.stroke();

      // Outer dynamic RPM gauge arc
      const rpmArcStart = Math.PI * 0.75;
      const rpmArcEnd = rpmArcStart + rpmNorm * Math.PI * 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 8, rpmArcStart, rpmArcEnd);
      ctx.strokeStyle = rpmNorm > 0.85 ? '#ef4444' : (bike.id === 'guerrilla-450' ? '#f59e0b' : '#00e5ff');
      ctx.lineWidth = 7;
      ctx.stroke();

      // Bold digital speed readout
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(speedKmh)}`, cx, cy + 8);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('KM / H', cx, cy + 28);

      // Gear indicator
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`GEAR ${gear}`, cx, cy - 35);

      // Trip stats
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`ODO: ${(distanceMeters / 1000).toFixed(1)} KM  |  MODE: PERF`, cx, cy + 62);

    } else {
      // HUNTER 350: OFFSET ASYMMETRIC ANALOG SPEEDO + TRIPPER POD
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(0, 0, w, h);

      const cx1 = 180;
      const cy1 = 128;
      const r1 = 95;
      ctx.beginPath();
      ctx.arc(cx1, cy1, r1, 0, Math.PI * 2);
      ctx.fillStyle = '#161922';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      const nAngle = Math.PI * 0.75 + (Math.min(1, speedKmh / 140)) * Math.PI * 1.5;
      ctx.save();
      ctx.translate(cx1, cy1);
      ctx.rotate(nAngle);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(r1 - 18, 0);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(speedKmh)}`, cx1, cy1 + 25);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('KM/H', cx1, cy1 + 45);

      const cx2 = 370;
      const cy2 = 128;
      const r2 = 65;
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#10b981';
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TRIPPER', cx2, cy2 - 28);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`G:${gear}`, cx2, cy2 + 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${(distanceMeters / 1000).toFixed(1)} KM`, cx2, cy2 + 30);
    }

    this.dashTexture.needsUpdate = true;
  }

  public updatePhysics(steerNorm: number, isBraking: boolean, throttleNorm: number, speedKmh: number, time: number) {
    // Handlebars counter-steer slightly into the turn
    const targetHandlebarYaw = -steerNorm * 0.12;
    this.handlebarsGroup.rotation.y = THREE.MathUtils.lerp(this.handlebarsGroup.rotation.y, targetHandlebarYaw, 0.15);

    // Natural engine & road vibration that scales with speed and RPM (single cylinder thump)
    const vibration = (Math.sin(time * 48) * 0.0005 + (Math.random() - 0.5) * 0.0003) * Math.min(speedKmh / 90, 1.2);
    this.group.position.y = vibration;

    // Front brake lever pull animation
    if (this.rightLeverMesh) {
      const targetBrakeAngle = isBraking ? -0.3 : -0.16;
      this.rightLeverMesh.rotation.y = THREE.MathUtils.lerp(this.rightLeverMesh.rotation.y, targetBrakeAngle, 0.25);
    }

    // Right throttle grip twist
    if (this.rightGripMesh) {
      this.rightGripMesh.rotation.x = throttleNorm * 0.35;
    }
  }
}
