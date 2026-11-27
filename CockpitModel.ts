import * as THREE from 'three';
import { MotorcycleConfig } from './motorcycles';
import { createMirrorReflectionTexture } from './textures';

export class CockpitModel {
  public group = new THREE.Group();
  public handlebarsGroup = new THREE.Group();
  public currentBike!: MotorcycleConfig;
  public dashCanvas: HTMLCanvasElement;
  public dashTexture: THREE.CanvasTexture;
  private dashCtx: CanvasRenderingContext2D;
  private rightGripMesh?: THREE.Mesh;
  private rightLeverMesh?: THREE.Mesh;
  private leftLeverMesh?: THREE.Mesh;

  constructor(bike: MotorcycleConfig) {
    this.group.add(this.handlebarsGroup);
    this.dashCanvas = document.createElement('canvas');
    this.dashCanvas.width = 512;
    this.dashCanvas.height = 256;
    this.dashCtx = this.dashCanvas.getContext('2d')!;
    this.dashTexture = new THREE.CanvasTexture(this.dashCanvas);
    this.dashTexture.colorSpace = THREE.SRGBColorSpace;
    this.dashTexture.anisotropy = 4;
    this.setMotorcycle(bike);
  }

  public setMotorcycle(bike: MotorcycleConfig) {
    this.currentBike = bike;
    this.group.clear();
    this.handlebarsGroup.clear();
    this.group.add(this.handlebarsGroup);
    this.rightGripMesh = this.rightLeverMesh = this.leftLeverMesh = undefined;
    this.buildCockpit();
    this.updateDash(0, 0.2, 1, 0);
  }

  private buildCockpit() {
    const bike = this.currentBike;
    const mirrorTex = createMirrorReflectionTexture();
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdce3e9, metalness: 0.94, roughness: 0.19 });
    const alloy = new THREE.MeshStandardMaterial({ color: 0x84919e, metalness: 0.86, roughness: 0.28 });
    const black = new THREE.MeshStandardMaterial({ color: 0x171a1f, metalness: 0.24, roughness: 0.58 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x090b0e, roughness: 0.96 });
    const paint = new THREE.MeshPhysicalMaterial({
      color: bike.cockpit.primaryColor, metalness: 0.48, roughness: 0.23,
      clearcoat: 0.9, clearcoatRoughness: 0.16,
    });
    const accent = new THREE.MeshStandardMaterial({ color: bike.cockpit.accentColor, metalness: 0.82, roughness: 0.24 });
    const mirrorGlass = new THREE.MeshStandardMaterial({ map: mirrorTex, metalness: 0.72, roughness: 0.2 });
    const screen = new THREE.MeshBasicMaterial({ map: this.dashTexture });
    const classic = bike.cockpit.dashType === 'classic-nacelle' || bike.cockpit.dashType === 'classic-500';
    const barMat = bike.cockpit.handlebarType === 'classic-chrome' || bike.cockpit.handlebarType === 'swept-touring' ? chrome : black;

    // Sculpted fuel tank and polished cap.
    const tankGeo = new THREE.SphereGeometry(0.25, 32, 24);
    tankGeo.scale(1.05, 0.76, 1.65);
    const tank = new THREE.Mesh(tankGeo, paint);
    tank.position.set(0, -0.32, -0.38);
    this.group.add(tank);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.046, 0.012, 32), chrome);
    cap.position.set(0, -0.205, -0.35);
    cap.rotation.x = -0.32;
    this.group.add(cap);
    const capInner = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.014, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.8, roughness: 0.3 }));
    capInner.position.y = 0.009;
    cap.add(capInner);

    // Tank centre strap and side knee pads.
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.42), chrome);
    strap.position.set(0, -0.215, -0.38);
    strap.rotation.x = -0.32;
    this.group.add(strap);
    const padGeo = new THREE.BoxGeometry(0.018, 0.105, 0.2);
    for (const side of [-1, 1]) {
      const pad = new THREE.Mesh(padGeo, rubber);
      pad.position.set(side * 0.19, -0.285, -0.36);
      pad.rotation.z = -side * 0.2;
      this.group.add(pad);
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.026, 0.085), accent);
      badge.position.set(side * 0.205, -0.245, -0.36);
      badge.rotation.z = -side * 0.18;
      this.group.add(badge);
    }

    // Steering yoke and fork caps.
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.085), alloy);
    yoke.position.set(0, -0.17, -0.48);
    yoke.rotation.x = 0.22;
    this.handlebarsGroup.add(yoke);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.018, 8), chrome);
    stem.position.set(0, -0.15, -0.48);
    this.handlebarsGroup.add(stem);
    for (const side of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.03, 20),
        bike.id === 'himalayan-450' ? accent : chrome);
      fork.position.set(side * 0.17, -0.15, -0.48);
      this.handlebarsGroup.add(fork);
      const riser = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.045, 0.036), alloy);
      riser.position.set(side * 0.09, -0.14, -0.46);
      this.handlebarsGroup.add(riser);
    }

    // Handlebar tube, grips, switch pods and levers.
    const centreBar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.36, 20), barMat);
    centreBar.rotation.z = Math.PI / 2;
    centreBar.position.set(0, -0.13, -0.46);
    this.handlebarsGroup.add(centreBar);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.24, 16), barMat);
      wing.rotation.set(0, side * 0.14, side * Math.PI / 2.3);
      wing.position.set(side * 0.24, -0.135, -0.45);
      this.handlebarsGroup.add(wing);
      const gripGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.145, 24);
      gripGeo.rotateZ(Math.PI / 2);
      const grip = new THREE.Mesh(gripGeo, rubber);
      grip.position.set(side * 0.35, -0.14, -0.435);
      this.handlebarsGroup.add(grip);
      if (side > 0) this.rightGripMesh = grip;
      const end = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 20), alloy);
      end.rotation.z = Math.PI / 2;
      end.position.set(side * 0.44, -0.14, -0.435);
      this.handlebarsGroup.add(end);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.044, 0.05), black);
      pod.position.set(side * 0.265, -0.135, -0.445);
      this.handlebarsGroup.add(pod);
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.014),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xdc3030 : 0xe5a52e }));
      button.position.set(0, 0.025, 0.005);
      pod.add(button);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.017), chrome);
      lever.position.set(side * 0.32, -0.15, -0.47);
      lever.rotation.y = -side * 0.16;
      this.handlebarsGroup.add(lever);
      if (side > 0) this.rightLeverMesh = lever;
      else this.leftLeverMesh = lever;
    }

    // Rear-view mirrors, with separate glass and shell.
    const round = bike.cockpit.mirrorType === 'vintage-chrome-round';
    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.22, 10), barMat);
      stem.position.set(side * 0.38, -0.025, -0.47);
      stem.rotation.z = -side * 0.42;
      this.handlebarsGroup.add(stem);
      const shellGeo = round ? new THREE.CylinderGeometry(0.056, 0.056, 0.02, 32) : new THREE.BoxGeometry(0.13, 0.075, 0.02);
      const shell = new THREE.Mesh(shellGeo, round ? chrome : black);
      shell.position.set(side * 0.47, 0.075, -0.46);
      shell.rotation.x = Math.PI / 2;
      shell.rotation.y = side * 0.2;
      this.handlebarsGroup.add(shell);
      const glassGeo = round ? new THREE.CircleGeometry(0.05, 32) : new THREE.PlaneGeometry(0.115, 0.06);
      const glass = new THREE.Mesh(glassGeo, mirrorGlass);
      glass.position.set(side * 0.47, 0.075, -0.447);
      glass.rotation.y = side * 0.2;
      this.handlebarsGroup.add(glass);
    }

    // Instrument cluster housing, bezel and live display.
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.13, 0.03), classic ? paint : black);
    housing.position.set(0, -0.11, -0.5);
    housing.rotation.x = -0.32;
    this.group.add(housing);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.252, 0.132, 0.008), chrome);
    bezel.position.set(0, -0.11, -0.481);
    bezel.rotation.x = -0.32;
    this.group.add(bezel);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.115), screen);
    display.position.set(0, -0.108, -0.475);
    display.rotation.x = -0.32;
    this.group.add(display);
  }

  public updateDash(speedKmh: number, rpmNorm: number, gear: number, distanceMeters: number) {
    const c = this.dashCtx, w = 512, h = 256, bike = this.currentBike;
    c.clearRect(0, 0, w, h);
    const classic = bike.cockpit.dashType === 'classic-nacelle' || bike.cockpit.dashType === 'classic-500';
    const adventure = bike.cockpit.dashType === 'himalayan-411-multi';
    const tft = bike.cockpit.dashType === 'himalayan-450-tft' || bike.cockpit.dashType === 'guerrilla-tft';
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, classic ? '#17191d' : '#0a111b');
    bg.addColorStop(1, classic ? '#050608' : '#172638');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    if (classic) {
      const cx = 256, cy = 124, r = 101, max = bike.id === 'bullet-500' ? 160 : 140;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = '#f3f0e6'; c.fill();
      c.lineWidth = 7; c.strokeStyle = '#b8c1c8'; c.stroke();
      c.fillStyle = '#20242a'; c.font = 'bold 15px serif'; c.fillText('ROYAL ENFIELD', cx, cy - 48);
      c.font = 'bold 10px sans-serif'; c.fillText(bike.name.toUpperCase(), cx, cy - 32);
      for (let s = 0; s <= max; s += 20) {
        const a = Math.PI * 0.75 + (s / max) * Math.PI * 1.5;
        c.strokeStyle = '#20242a'; c.lineWidth = 2; c.beginPath();
        c.moveTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78);
        c.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90); c.stroke();
        c.fillStyle = '#20242a'; c.font = 'bold 12px sans-serif';
        c.fillText(String(s), cx + Math.cos(a) * 66, cy + Math.sin(a) * 66 + 4);
      }
      const a = Math.PI * 0.75 + THREE.MathUtils.clamp(speedKmh / max, 0, 1) * Math.PI * 1.5;
      c.save(); c.translate(cx, cy); c.rotate(a); c.strokeStyle = '#c51f32'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-9, 0); c.lineTo(78, 0); c.stroke(); c.restore();
      c.fillStyle = '#1e293b'; c.fillRect(cx - 43, cy + 27, 86, 22);
      c.fillStyle = '#e5edf5'; c.font = 'bold 12px monospace'; c.fillText(`G:${gear} ${(distanceMeters / 1000).toFixed(1)} km`, cx, cy + 42);
      c.fillStyle = '#00d7ed'; c.font = 'bold 22px sans-serif'; c.fillText(`${Math.round(speedKmh)} KM/H`, cx, 248);
    } else if (adventure) {
      this.drawGauge(c, 145, 128, 82, speedKmh, 140, '#38bdf8', 'SPEED');
      this.drawGauge(c, 365, 78, 51, rpmNorm * 8, 8, '#f59e0b', 'RPM x1000');
      c.fillStyle = '#38bdf8'; c.font = 'bold 18px monospace'; c.fillText(`GEAR ${gear}`, 365, 181);
      c.fillStyle = '#a8b8c9'; c.font = '12px monospace'; c.fillText(`${(distanceMeters / 1000).toFixed(1)} KM`, 365, 207);
    } else if (tft) {
      const cx = 256, cy = 128, r = 105;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = '#101d2c'; c.fill();
      c.lineWidth = 5; c.strokeStyle = bike.id === 'guerrilla-450' ? '#eabf36' : '#32bde9'; c.stroke();
      c.beginPath(); c.arc(cx, cy, r - 9, Math.PI * 0.75, Math.PI * 0.75 + THREE.MathUtils.clamp(rpmNorm, 0, 1) * Math.PI * 1.5);
      c.strokeStyle = rpmNorm > 0.88 ? '#ef4444' : '#36c9ed'; c.lineWidth = 7; c.stroke();
      c.fillStyle = '#fff'; c.font = 'bold 56px sans-serif'; c.fillText(String(Math.round(speedKmh)), cx, cy + 10);
      c.fillStyle = '#a8bbce'; c.font = 'bold 14px sans-serif'; c.fillText('KM / H', cx, cy + 32);
      c.fillStyle = '#36c9ed'; c.font = 'bold 20px monospace'; c.fillText(`GEAR ${gear}`, cx, cy - 42);
      c.fillStyle = '#9aaec2'; c.font = '12px monospace'; c.fillText(`TRIP ${(distanceMeters / 1000).toFixed(1)} KM`, cx, cy + 67);
    } else {
      this.drawGauge(c, 175, 128, 91, speedKmh, 140, '#38bdf8', 'KM/H');
      c.beginPath(); c.arc(380, 128, 65, 0, Math.PI * 2); c.fillStyle = '#101b29'; c.fill();
      c.lineWidth = 3; c.strokeStyle = '#29c58b'; c.stroke();
      c.fillStyle = '#29c58b'; c.font = 'bold 13px sans-serif'; c.fillText('TRIPPER', 380, 98);
      c.fillStyle = '#f4c15d'; c.font = 'bold 25px monospace'; c.fillText(`G:${gear}`, 380, 137);
      c.fillStyle = '#b2c0cf'; c.font = '12px monospace'; c.fillText(`${(distanceMeters / 1000).toFixed(1)} KM`, 380, 160);
    }
    this.dashTexture.needsUpdate = true;
  }

  private drawGauge(c: CanvasRenderingContext2D, x: number, y: number, r: number, value: number, max: number, color: string, label: string) {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#111b28'; c.fill();
    c.lineWidth = 4; c.strokeStyle = '#647789'; c.stroke();
    c.beginPath(); c.arc(x, y, r - 7, Math.PI * 0.75, Math.PI * 0.75 + THREE.MathUtils.clamp(value / max, 0, 1) * Math.PI * 1.5);
    c.strokeStyle = color; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#b8c9d9'; c.font = 'bold 11px sans-serif'; c.fillText(label, x, y - 30);
    c.fillStyle = '#f5f8fb'; c.font = 'bold 29px monospace'; c.fillText(String(Math.round(value)), x, y + 24);
  }

  public updatePhysics(steerNorm: number, isBraking: boolean, throttleNorm: number, speedKmh: number, time: number) {
    const targetYaw = -steerNorm * 0.12;
    this.handlebarsGroup.rotation.y = THREE.MathUtils.lerp(this.handlebarsGroup.rotation.y, targetYaw, 0.15);
    const vibration = Math.sin(time * 48) * 0.00045 * Math.min(speedKmh / 90, 1.2);
    this.group.position.y = vibration;
    if (this.rightLeverMesh) this.rightLeverMesh.rotation.y = THREE.MathUtils.lerp(this.rightLeverMesh.rotation.y, isBraking ? -0.3 : -0.16, 0.25);
    if (this.rightGripMesh) this.rightGripMesh.rotation.x = throttleNorm * 0.35;
  }

  public dispose() {
    this.group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => m.dispose());
      }
    });
    this.dashTexture.dispose();
  }
}
