import * as THREE from 'three';

/**
 * Creates high-detail procedural canvas textures for the motorcycle game.
 * Uses SRGBColorSpace and sets anisotropy.
 */

export function createAsphaltRoadTexture(maxAnisotropy: number = 8): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Gritty realistic asphalt base
  ctx.fillStyle = '#202227';
  ctx.fillRect(0, 0, width, height);

  // Multi-pass noise aggregate for realistic bitumen and gravel grain
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 28;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Realistic tire rubber tracks in each lane center
  const laneCenters = [0.125 * width, 0.375 * width, 0.625 * width, 0.875 * width];
  ctx.fillStyle = 'rgba(12, 14, 18, 0.32)';
  for (const center of laneCenters) {
    ctx.fillRect(center - 44, 0, 26, height);
    ctx.fillRect(center + 18, 0, 26, height);
  }

  // Road shoulders: Solid white outer lines with rumble strip tick markings
  ctx.fillStyle = '#f0f3f6';
  ctx.fillRect(20, 0, 16, height); // Left shoulder line
  ctx.fillRect(width - 36, 0, 16, height); // Right shoulder line

  // Yellow warning curbs along far borders
  ctx.fillStyle = '#eab308';
  for (let y = 0; y < height; y += 64) {
    ctx.fillRect(4, y, 12, 32);
    ctx.fillRect(width - 16, y, 12, 32);
  }

  // Inner dashed lane dividing lines (3 lines for 4 lanes: at 25%, 50%, 75%)
  const dashPositions = [0.25 * width, 0.50 * width, 0.75 * width];
  const dashLength = 180;
  const gapLength = 160;
  const totalPeriod = dashLength + gapLength;

  ctx.fillStyle = '#f8fafc';
  for (let y = 0; y < height; y += totalPeriod) {
    for (const x of dashPositions) {
      ctx.fillRect(x - 5, y + 20, 10, dashLength);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

export function createAsphaltRoughnessTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base roughness: grey (medium roughness ~0.7)
  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, width, height);

  // Smooth polished tire tracks have lower roughness (darker in roughness map)
  ctx.fillStyle = '#787878';
  const laneCenters = [0.125 * width, 0.375 * width, 0.625 * width, 0.875 * width];
  for (const center of laneCenters) {
    ctx.fillRect(center - 22, 0, 14, height);
    ctx.fillRect(center + 9, 0, 14, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createGuardrailTexture(maxAnisotropy: number = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#626872');
  grad.addColorStop(0.2, '#c4cdd8');
  grad.addColorStop(0.5, '#4b515b');
  grad.addColorStop(0.8, '#cbd3dd');
  grad.addColorStop(1, '#565c66');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  // Red & Amber road barrier reflectors
  for (let x = 32; x < 512; x += 128) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, 48, 14, 32);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 64, 48, 14, 32);
  }

  // Vertical bolt posts every 128px
  ctx.fillStyle = '#2c3038';
  for (let x = 64; x < 512; x += 128) {
    ctx.fillRect(x - 5, 0, 10, 128);
    ctx.fillStyle = '#14171c';
    ctx.beginPath();
    ctx.arc(x, 36, 4, 0, Math.PI * 2);
    ctx.arc(x, 92, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3038';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

export function createCarbonFiberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181a1e';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#2b2e35';
  for (let x = 0; x < 64; x += 8) {
    for (let y = 0; y < 64; y += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 7, 7);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createMirrorReflectionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#384d66');
  grad.addColorStop(0.48, '#0b192c');
  grad.addColorStop(0.52, '#1f242d');
  grad.addColorStop(1, '#0f1115');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(124, 66);
  ctx.lineTo(132, 66);
  ctx.lineTo(148, 128);
  ctx.lineTo(108, 128);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createHighwaySignTexture(text: string, subtext: string = 'METROPOLIS EXPRESSWAY'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f6336';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 224);

  ctx.fillStyle = '#ffd100';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(subtext, 256, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(text, 256, 135);

  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SPEED LIMIT 100  |  NEXT EXIT 2 KM', 256, 195);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Atmosphere sky gradient from zenith down to horizon and ground
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0.0, '#0c1829');   // Deep indigo zenith
  skyGrad.addColorStop(0.2, '#183457');   // Upper troposphere blue
  skyGrad.addColorStop(0.42, '#2f5b8a');  // Rich daytime azure
  skyGrad.addColorStop(0.62, '#5e8cb5');  // Soft atmospheric haze
  skyGrad.addColorStop(0.74, '#d98b58');  // Warm twilight / sunset golden band
  skyGrad.addColorStop(0.82, '#fca364');  // Radiant horizon glow
  skyGrad.addColorStop(0.87, '#384d3b');  // Distant tree line / foothill band
  skyGrad.addColorStop(1.0, '#162218');   // Dark terrain base
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Radiant Sun disk with golden corona near horizon (facing oncoming traffic / highway heading)
  const sunX = width * 0.5;
  const sunY = height * 0.74;
  const sunRadius = 220;

  const sunCorona = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, sunRadius);
  sunCorona.addColorStop(0.0, '#ffffff');
  sunCorona.addColorStop(0.12, '#fff7ed');
  sunCorona.addColorStop(0.3, 'rgba(254, 215, 170, 0.75)');
  sunCorona.addColorStop(0.6, 'rgba(249, 115, 22, 0.25)');
  sunCorona.addColorStop(1.0, 'rgba(234, 88, 12, 0)');

  ctx.fillStyle = sunCorona;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Sharp bright solar core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  // 3. Clouds: Soft procedural cumulus banks and wispy cirrus across the sky
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 28; i++) {
    const cx = (i * 78 + (i % 3) * 45) % width;
    const cy = 200 + (i % 5) * 85 + Math.sin(i * 1.5) * 35;
    const cw = 140 + (i % 4) * 60;
    const ch = 35 + (i % 3) * 20;

    const cloudGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw);
    cloudGrad.addColorStop(0, 'rgba(255, 240, 225, 0.32)');
    cloudGrad.addColorStop(0.4, 'rgba(255, 230, 210, 0.18)');
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = cloudGrad;

    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Distant Layered Mountain Silhouettes along the horizon
  // Far Ridge
  ctx.fillStyle = 'rgba(32, 48, 68, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.86);
  for (let x = 0; x <= width; x += 32) {
    const my = height * 0.82 + Math.sin(x * 0.008) * 35 + Math.cos(x * 0.02) * 18;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Near Ridge
  ctx.fillStyle = 'rgba(20, 32, 46, 0.95)';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.86);
  for (let x = 0; x <= width; x += 24) {
    const my = height * 0.84 + Math.sin(x * 0.015 + 1.2) * 25 + Math.cos(x * 0.035) * 12;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

