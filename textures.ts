import * as THREE from 'three';

/**
 * High-quality procedural textures for Bike Rider.
 * Textures are generated locally at runtime; no external image assets required.
 * Resolution is balanced for mobile GPUs to avoid excessive memory use.
 */

function finishTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy = 4,
  repeatS = true,
  repeatT = true
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeatT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  return { canvas, ctx };
}

export function createAsphaltRoadTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const width = 2048;
  const height = 2048;
  const { canvas, ctx } = makeCanvas(width, height);

  ctx.fillStyle = '#292b2e';
  ctx.fillRect(0, 0, width, height);

  // Multi-scale asphalt aggregate. Noise is kept subtle to avoid visual shimmer.
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const broad = Math.sin(x * 0.021) * 2.2 + Math.cos(y * 0.017) * 2.0;
      const grain = (Math.random() - 0.5) * 15;
      const value = broad + grain;
      pixels[i] = Math.max(0, Math.min(255, 41 + value));
      pixels[i + 1] = Math.max(0, Math.min(255, 43 + value));
      pixels[i + 2] = Math.max(0, Math.min(255, 46 + value));
      pixels[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Subtle wheel-worn strips.
  const laneCenters = [0.125, 0.375, 0.625, 0.875].map(v => v * width);
  for (const center of laneCenters) {
    const gradient = ctx.createLinearGradient(center - 70, 0, center + 70, 0);
    gradient.addColorStop(0, 'rgba(8,10,12,0)');
    gradient.addColorStop(0.5, 'rgba(8,10,12,0.19)');
    gradient.addColorStop(1, 'rgba(8,10,12,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(center - 70, 0, 140, height);
  }

  // Road edge lines and lane markings are drawn cleanly.
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(34, 0, 12, height);
  ctx.fillRect(width - 46, 0, 12, height);

  ctx.fillStyle = 'rgba(245,247,250,0.92)';
  const laneLines = [0.25, 0.5, 0.75].map(v => v * width);
  const dash = 190;
  const gap = 150;
  for (let y = 0; y < height; y += dash + gap) {
    for (const x of laneLines) {
      ctx.fillRect(x - 5, y, 10, dash);
    }
  }

  // Fine shoulder rumble marks.
  ctx.fillStyle = 'rgba(245,190,65,0.9)';
  for (let y = 0; y < height; y += 96) {
    ctx.fillRect(8, y, 12, 42);
    ctx.fillRect(width - 20, y, 12, 42);
  }

  return finishTexture(canvas, maxAnisotropy, true, true);
}

export function createAsphaltRoughnessTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, 0, width, height);

  // Slightly smoother wheel paths; asphalt remains predominantly rough.
  ctx.fillStyle = '#a9a9a9';
  for (const center of [0.125, 0.375, 0.625, 0.875]) {
    const x = center * width;
    ctx.fillRect(x - 18, 0, 12, height);
    ctx.fillRect(x + 6, 0, 12, height);
  }

  return finishTexture(canvas, 4, true, true);
}

export function createGuardrailTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 256);
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#59616b');
  gradient.addColorStop(0.18, '#d7dee6');
  gradient.addColorStop(0.42, '#858e99');
  gradient.addColorStop(0.58, '#424a54');
  gradient.addColorStop(0.82, '#c3ccd6');
  gradient.addColorStop(1, '#535b65');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 256);

  // Metallic highlight and repeating reflector panels.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 22, 1024, 5);
  for (let x = 48; x < 1024; x += 160) {
    ctx.fillStyle = '#d94841';
    ctx.fillRect(x, 94, 24, 58);
    ctx.fillStyle = '#f2b84b';
    ctx.fillRect(x + 76, 94, 24, 58);
    ctx.fillStyle = 'rgba(20,24,30,0.65)';
    ctx.fillRect(x - 4, 0, 5, 256);
  }

  return finishTexture(canvas, maxAnisotropy, true, false);
}

export function createCarbonFiberTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const light = ((x / 8 + y / 8) % 2) === 0;
      ctx.fillStyle = light ? '#292d34' : '#171a20';
      ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, y, 7, 1);
    }
  }

  const texture = finishTexture(canvas, 4, true, true);
  texture.repeat.set(8, 8);
  return texture;
}

export function createMirrorReflectionTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 256);
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#8ca9c2');
  gradient.addColorStop(0.42, '#405b75');
  gradient.addColorStop(0.52, '#202a35');
  gradient.addColorStop(1, '#10151c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(245, 130);
  ctx.lineTo(267, 130);
  ctx.lineTo(330, 256);
  ctx.lineTo(182, 256);
  ctx.closePath();
  ctx.fill();

  return finishTexture(canvas, 4, false, false);
}

export function createHighwaySignTexture(
  text: string,
  subtext = 'METROPOLIS EXPRESSWAY'
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.fillStyle = '#07512f';
  ctx.fillRect(0, 0, 1024, 512);

  const gloss = ctx.createLinearGradient(0, 0, 0, 512);
  gloss.addColorStop(0, 'rgba(255,255,255,0.12)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
  gloss.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 16;
  ctx.strokeRect(28, 28, 968, 456);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7d66b';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(subtext, 512, 120, 900);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 94px sans-serif';
  ctx.fillText(text, 512, 270, 900);

  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('SPEED LIMIT 100  |  NEXT EXIT 2 KM', 512, 390, 940);

  return finishTexture(canvas, 4, false, false);
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const { canvas, ctx } = makeCanvas(width, height);

  // Smooth continuous atmosphere gradient. No painted mountain/ground bands:
  // those hard edges were a likely source of the visible blue horizon stripe.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0.00, '#172b48');
  sky.addColorStop(0.22, '#315b86');
  sky.addColorStop(0.48, '#7299b7');
  sky.addColorStop(0.68, '#b7c8d1');
  sky.addColorStop(0.82, '#e5c6a4');
  sky.addColorStop(0.92, '#d9b99b');
  sky.addColorStop(1.00, '#c7b4a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Soft layered clouds with feathered edges.
  for (let i = 0; i < 42; i++) {
    const x = (i * 173 + (i % 4) * 61) % width;
    const y = 170 + (i % 7) * 72;
    const rx = 90 + (i % 5) * 34;
    const ry = 18 + (i % 4) * 10;
    const cloud = ctx.createRadialGradient(x, y, 4, x, y, rx);
    cloud.addColorStop(0, 'rgba(255,255,255,0.25)');
    cloud.addColorStop(0.55, 'rgba(255,255,255,0.11)');
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle sun glow; no sharp white disk or abrupt horizon silhouette.
  const sunX = width * 0.72;
  const sunY = height * 0.73;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 250);
  glow.addColorStop(0, 'rgba(255,244,220,0.42)');
  glow.addColorStop(0.35, 'rgba(255,220,185,0.20)');
  glow.addColorStop(1, 'rgba(255,220,185,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 250, sunY - 250, 500, 500);

  // Fine atmospheric haze at the lower edge for a soft horizon transition.
  const haze = ctx.createLinearGradient(0, height * 0.76, 0, height);
  haze.addColorStop(0, 'rgba(224,207,184,0)');
  haze.addColorStop(1, 'rgba(198,190,174,0.42)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.76, width, height * 0.24);

  return finishTexture(canvas, 4, true, false);
}
