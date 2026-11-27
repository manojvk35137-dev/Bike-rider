import * as THREE from 'three';

/** Locally generated PBR-style textures, sized for mid-range mobile GPUs. */
function finishTexture(canvas: HTMLCanvasElement, maxAnisotropy = 4, repeatS = true, repeatT = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeatT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, Math.min(maxAnisotropy, 8));
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  return { canvas, ctx };
}

export function createAsphaltRoadTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const width = 1024, height = 2048;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#292c30'; ctx.fillRect(0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height), data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const broad = Math.sin(x * 0.025) * 1.6 + Math.cos(y * 0.013) * 1.5;
      const grain = (Math.random() - 0.5) * 9;
      const n = broad + grain;
      data[i] = 40 + n; data[i + 1] = 43 + n; data[i + 2] = 47 + n; data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // Very subtle wheel-worn paths.
  for (const center of [0.125, 0.375, 0.625, 0.875].map(v => v * width)) {
    const g = ctx.createLinearGradient(center - 45, 0, center + 45, 0);
    g.addColorStop(0, 'rgba(8,10,12,0)'); g.addColorStop(0.5, 'rgba(8,10,12,0.13)'); g.addColorStop(1, 'rgba(8,10,12,0)');
    ctx.fillStyle = g; ctx.fillRect(center - 45, 0, 90, height);
  }
  // Continuous edge lines and broken lane lines.
  ctx.fillStyle = '#d9dde1'; ctx.fillRect(18, 0, 7, height); ctx.fillRect(width - 25, 0, 7, height);
  ctx.fillStyle = 'rgba(238,241,244,0.88)';
  for (let y = 0; y < height; y += 300) {
    for (const x of [0.25, 0.5, 0.75].map(v => v * width)) ctx.fillRect(x - 4, y, 8, 165);
  }
  ctx.fillStyle = 'rgba(238,184,70,0.88)';
  for (let y = 0; y < height; y += 100) {
    ctx.fillRect(5, y, 8, 44); ctx.fillRect(width - 13, y, 8, 44);
  }
  return finishTexture(canvas, maxAnisotropy, true, true);
}

export function createAsphaltRoughnessTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 1024);
  ctx.fillStyle = '#d6d6d6'; ctx.fillRect(0, 0, 512, 1024);
  for (const center of [0.125, 0.375, 0.625, 0.875]) {
    ctx.fillStyle = '#bcbcbc'; ctx.fillRect(center * 512 - 8, 0, 16, 1024);
  }
  return finishTexture(canvas, 4, true, true);
}

export function createGuardrailTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#59636d'); g.addColorStop(0.2, '#dce2e8');
  g.addColorStop(0.48, '#8d98a2'); g.addColorStop(0.7, '#454e58'); g.addColorStop(1, '#bfc8d0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, 20, 1024, 4);
  for (let x = 48; x < 1024; x += 160) {
    ctx.fillStyle = '#d94c45'; ctx.fillRect(x, 94, 22, 56);
    ctx.fillStyle = '#f0b84e'; ctx.fillRect(x + 74, 94, 22, 56);
    ctx.fillStyle = 'rgba(20,24,30,0.6)'; ctx.fillRect(x - 4, 0, 4, 256);
  }
  return finishTexture(canvas, maxAnisotropy, true, false);
}

export function createCarbonFiberTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = '#111419'; ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) {
    ctx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#292e35' : '#171b21';
    ctx.fillRect(x, y, 7, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x, y, 7, 1);
  }
  const t = finishTexture(canvas, 4, true, true); t.repeat.set(8, 8); return t;
}

export function createMirrorReflectionTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#9bb7cf'); g.addColorStop(0.4, '#55738e');
  g.addColorStop(0.53, '#273644'); g.addColorStop(1, '#111820');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.17)';
  ctx.beginPath(); ctx.moveTo(240, 125); ctx.lineTo(272, 125);
  ctx.lineTo(340, 256); ctx.lineTo(172, 256); ctx.closePath(); ctx.fill();
  return finishTexture(canvas, 4, false, false);
}

export function createHighwaySignTexture(text: string, subtext = 'METROPOLIS EXPRESSWAY'): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.fillStyle = '#07512f'; ctx.fillRect(0, 0, 1024, 512);
  const gloss = ctx.createLinearGradient(0, 0, 0, 512);
  gloss.addColorStop(0, 'rgba(255,255,255,0.13)'); gloss.addColorStop(0.55, 'rgba(255,255,255,0)');
  gloss.addColorStop(1, 'rgba(0,0,0,0.2)'); ctx.fillStyle = gloss; ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 14; ctx.strokeRect(28, 28, 968, 456);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f5d66c'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText(subtext, 512, 116, 900);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 88px sans-serif'; ctx.fillText(text, 512, 265, 900);
  ctx.font = 'bold 43px sans-serif'; ctx.fillText('SPEED LIMIT 100  |  NEXT EXIT 2 KM', 512, 390, 940);
  return finishTexture(canvas, 4, false, false);
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const width = 2048, height = 1024;
  const { canvas, ctx } = makeCanvas(width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#172b48'); sky.addColorStop(0.2, '#315b86');
  sky.addColorStop(0.46, '#789db9'); sky.addColorStop(0.68, '#b9cbd4');
  sky.addColorStop(0.83, '#e5c9ad'); sky.addColorStop(1, '#c9b7a3');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  // Soft cloud banks, avoiding sharp painted horizon bands.
  for (let i = 0; i < 38; i++) {
    const x = (i * 179 + (i % 5) * 47) % width;
    const y = 150 + (i % 8) * 67;
    const rx = 95 + (i % 4) * 32, ry = 18 + (i % 3) * 9;
    const cloud = ctx.createRadialGradient(x, y, 5, x, y, rx);
    cloud.addColorStop(0, 'rgba(255,255,255,0.24)');
    cloud.addColorStop(0.55, 'rgba(255,255,255,0.1)');
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cloud; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  const sx = width * 0.72, sy = height * 0.72;
  const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 260);
  glow.addColorStop(0, 'rgba(255,245,224,0.4)'); glow.addColorStop(0.4, 'rgba(255,222,190,0.17)');
  glow.addColorStop(1, 'rgba(255,222,190,0)');
  ctx.fillStyle = glow; ctx.fillRect(sx - 260, sy - 260, 520, 520);
  const haze = ctx.createLinearGradient(0, height * 0.76, 0, height);
  haze.addColorStop(0, 'rgba(224,207,184,0)'); haze.addColorStop(1, 'rgba(198,190,174,0.36)');
  ctx.fillStyle = haze; ctx.fillRect(0, height * 0.76, width, height * 0.24);
  return finishTexture(canvas, 4, true, false);
}
