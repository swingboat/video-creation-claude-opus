// Procedural, seed-stable canvas textures (no external image assets needed).
import * as THREE from 'three';
import { fbm2, mulberry32, vnoise2, clamp } from './math';

type RGB = [number, number, number];

function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTex(c: HTMLCanvasElement, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** height field → tangent-space normal map */
function normalFromHeight(h: Float32Array, w: number, hh: number, strength: number) {
  const c = canvas(w, hh);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const l = h[y * w + ((x - 1 + w) % w)], r = h[y * w + ((x + 1) % w)];
      const u = h[((y - 1 + hh) % hh) * w + x], d = h[((y + 1) % hh) * w + x];
      let nx = (l - r) * strength, ny = (u - d) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, false);
}

function fieldTex(
  w: number,
  hh: number,
  fn: (u: number, v: number) => { c: RGB; h: number; r?: number },
  normalStrength: number,
) {
  const c = canvas(w, hh);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, hh);
  const rc = canvas(w, hh);
  const rctx = rc.getContext('2d')!;
  const rimg = rctx.createImageData(w, hh);
  const height = new Float32Array(w * hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const s = fn(x / w, y / hh);
      const i = (y * w + x) * 4;
      img.data[i] = clamp(s.c[0]) * 255;
      img.data[i + 1] = clamp(s.c[1]) * 255;
      img.data[i + 2] = clamp(s.c[2]) * 255;
      img.data[i + 3] = 255;
      const r = clamp(s.r ?? 0.8) * 255;
      rimg.data[i] = r; rimg.data[i + 1] = r; rimg.data[i + 2] = r; rimg.data[i + 3] = 255;
      height[y * w + x] = s.h;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return {
    map: toTex(c),
    normalMap: normalFromHeight(height, w, hh, normalStrength),
    roughnessMap: toTex(rc, false),
  };
}

// tileable noise by sampling on a torus-like wrap
const tn = (u: number, v: number, f: number, oct = 4, seed = 0) => {
  // blend 4 samples so the result tiles
  const a = fbm2(u * f + seed, v * f + seed * 0.7, oct);
  const b = fbm2((u - 1) * f + seed, v * f + seed * 0.7, oct);
  const c = fbm2(u * f + seed, (v - 1) * f + seed * 0.7, oct);
  const d = fbm2((u - 1) * f + seed, (v - 1) * f + seed * 0.7, oct);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};

export function makeTextures() {
  const rnd = mulberry32(77);

  const bark = fieldTex(256, 512, (u, v) => {
    const fiss = Math.abs(Math.sin((u * 14 + tn(u, v, 6, 3, 3) * 0.9) * Math.PI));
    const ridge = Math.pow(fiss, 0.35);
    const n = tn(u, v, 18, 4, 5);
    const moss = clamp(tn(u, v, 4, 3, 11) * 1.8 + 0.1 - v * 0.5);
    const base: RGB = [0.25 + n * 0.05, 0.2 + n * 0.04, 0.16 + n * 0.03];
    const dark = 1 - ridge;
    let c: RGB = [base[0] * (1 - dark * 0.6), base[1] * (1 - dark * 0.6), base[2] * (1 - dark * 0.6)];
    c = [c[0] * (1 - moss) + 0.2 * moss, c[1] * (1 - moss) + 0.28 * moss, c[2] * (1 - moss) + 0.1 * moss];
    return { c, h: ridge * 0.8 + n * 0.2, r: 0.85 - moss * 0.1 };
  }, 6);

  const ground = fieldTex(512, 512, (u, v) => {
    const n = tn(u, v, 6, 5, 1);
    const moss = clamp(tn(u, v, 3, 4, 21) * 2.2 + 0.15);
    const leaves = clamp(tn(u, v, 22, 3, 41) * 3 - 0.3);
    const twig = Math.pow(Math.abs(tn(u, v, 9, 2, 61)), 0.15) < 0.35 ? 1 : 0;
    let c: RGB = [0.2 + n * 0.05, 0.15 + n * 0.04, 0.1 + n * 0.03];
    c = [c[0] * (1 - moss) + 0.16 * moss, c[1] * (1 - moss) + 0.26 * moss, c[2] * (1 - moss) + 0.07 * moss];
    const lv = vnoise2(u * 90, v * 90);
    c = [c[0] * (1 - leaves) + (0.42 + lv * 0.1) * leaves, c[1] * (1 - leaves) + (0.25 + lv * 0.06) * leaves, c[2] * (1 - leaves) + 0.1 * leaves];
    c = c.map((x) => x * (1 - twig * 0.25)) as RGB;
    return { c, h: n * 0.4 + moss * 0.3 + leaves * 0.3 + vnoise2(u * 160, v * 160) * 0.1, r: 0.92 - leaves * 0.2 };
  }, 3);

  const rock = fieldTex(512, 512, (u, v) => {
    const n = tn(u, v, 5, 5, 7);
    const crack = Math.pow(Math.abs(tn(u, v, 8, 3, 13)), 0.4);
    const lichen = clamp(tn(u, v, 10, 3, 17) * 3 - 0.8);
    let g = 0.36 + n * 0.12;
    g *= 0.65 + crack * 0.35;
    let c: RGB = [g * 0.98, g * 0.98, g * 0.95];
    c = [c[0] * (1 - lichen) + 0.36 * lichen, c[1] * (1 - lichen) + 0.42 * lichen, c[2] * (1 - lichen) + 0.2 * lichen];
    return { c, h: n * 0.6 + crack * 0.4, r: 0.75 };
  }, 4);

  const fabric = fieldTex(256, 256, (u, v) => {
    const wx = Math.sin(u * Math.PI * 2 * 64), wy = Math.sin(v * Math.PI * 2 * 64);
    const weave = (wx > 0 ? wy : -wy) * 0.5 + 0.5;
    const n = tn(u, v, 8, 3, 2);
    const g = 0.9 + n * 0.08 + weave * 0.06;
    return { c: [g, g, g], h: weave * 0.6 + n * 0.4, r: 0.85 };
  }, 2.2);

  const skin = fieldTex(256, 256, (u, v) => {
    const pores = vnoise2(u * 180, v * 180);
    const n = tn(u, v, 5, 3, 9);
    const g = 0.97 + n * 0.03;
    return { c: [g, g * 0.985, g * 0.98], h: pores * 0.4 + n * 0.3, r: 0.58 + n * 0.08 + pores * 0.05 };
  }, 0.8);

  const wood = fieldTex(256, 512, (u, v) => {
    const plank = Math.floor(u * 4);
    const gap = Math.abs((u * 4) % 1 - 0.5) > 0.47 ? 1 : 0;
    const grain = Math.sin((v * 40 + tn(u, v, 4, 3, plank) * 3) * Math.PI * 2) * 0.5 + 0.5;
    const n = tn(u, v, 10, 3, plank + 3);
    const k = 0.32 + grain * 0.06 + n * 0.05 + plank * 0.015;
    const c: RGB = [k, k * 0.72, k * 0.48].map((x) => x * (1 - gap * 0.7)) as RGB;
    return { c, h: grain * 0.3 - gap * 1.2 + n * 0.2, r: 0.8 };
  }, 4);

  const rope = fieldTex(128, 128, (u, v) => {
    const s = (u * 3 + v * 3) % 1;
    const strand = Math.pow(Math.sin(s * Math.PI), 0.6);
    const fib = vnoise2(u * 60 + v * 30, v * 20) * 0.15;
    const k = 0.55 * strand + 0.25 + fib;
    return { c: [k * 0.95, k * 0.8, k * 0.55], h: strand + fib, r: 0.9 };
  }, 5);

  // fawn coat: reddish brown with white spots along the back (u around body, v along body)
  const fawn = fieldTex(512, 256, (u, v) => {
    const back = Math.exp(-Math.pow((u - 0.25) * 5.5, 2)) + Math.exp(-Math.pow((u - 1.25) * 5.5, 2));
    const belly = Math.exp(-Math.pow((u - 0.75) * 4.5, 2));
    const r = rnd;
    void r;
    let spot = 0;
    for (let k = 0; k < 3; k++) {
      const row = 0.25 + (k - 1) * 0.07;
      const d = Math.abs(u - row) * 9;
      const sp = Math.sin(v * 30 + k * 1.7) * Math.sin(v * 13 + k);
      if (d < 0.35 && sp > 0.55) spot = 1;
    }
    spot *= v > 0.15 && v < 0.88 ? 1 : 0;
    const n = tn(u, v, 30, 3, 4) * 0.05;
    let c: RGB = [0.55 + n, 0.32 + n, 0.16 + n];
    c = [c[0] * (1 - back * 0.25), c[1] * (1 - back * 0.3), c[2] * (1 - back * 0.3)];
    c = [c[0] + (0.88 - c[0]) * belly * 0.75, c[1] + (0.8 - c[1]) * belly * 0.75, c[2] + (0.68 - c[2]) * belly * 0.75];
    if (spot) c = [0.93, 0.9, 0.84];
    const hair = vnoise2(u * 300, v * 40) * 0.4;
    return { c, h: hair, r: 0.8 };
  }, 1.5);

  return { bark, ground, rock, fabric, skin, wood, rope, fawn };
}

/** alpha-tested leaf atlas: 4 leaf shapes in a 2x2 grid */
export function makeLeafAtlas() {
  const c = canvas(512);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(5);
  const shapes = [
    { w: 0.32, h: 0.86, col: '#4c6b2a' },
    { w: 0.42, h: 0.78, col: '#5b7a2c' },
    { w: 0.26, h: 0.9, col: '#3f5e26' },
    { w: 0.4, h: 0.7, col: '#6c7d33' },
  ];
  shapes.forEach((s, i) => {
    const ox = (i % 2) * 256, oy = Math.floor(i / 2) * 256;
    ctx.save();
    ctx.translate(ox + 128, oy + 128);
    // several leaves per cell for density
    for (let k = 0; k < 5; k++) {
      ctx.save();
      const a = (k / 5) * Math.PI * 2 + rnd() * 0.5;
      ctx.rotate(a);
      ctx.translate(0, -45);
      const lw = 128 * s.w * 0.55, lh = 128 * s.h * 0.62;
      const g = ctx.createLinearGradient(0, -lh, 0, lh);
      g.addColorStop(0, s.col);
      g.addColorStop(1, '#2d4219');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -lh);
      ctx.bezierCurveTo(lw, -lh * 0.5, lw, lh * 0.5, 0, lh);
      ctx.bezierCurveTo(-lw, lh * 0.5, -lw, -lh * 0.5, 0, -lh);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,150,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -lh);
      ctx.lineTo(0, lh);
      for (let j = -3; j <= 3; j++) {
        ctx.moveTo(0, j * lh * 0.25);
        ctx.lineTo(lw * 0.7, j * lh * 0.25 - lh * 0.15);
        ctx.moveTo(0, j * lh * 0.25);
        ctx.lineTo(-lw * 0.7, j * lh * 0.25 - lh * 0.15);
      }
      ctx.stroke();
      // water droplets
      for (let d = 0; d < 2; d++) {
        const dx = (rnd() - 0.5) * lw, dy = (rnd() - 0.5) * lh;
        ctx.fillStyle = 'rgba(230,240,255,0.55)';
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + rnd() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  });
  const t = toTex(c, true, false);
  t.generateMipmaps = true;
  return t;
}

/** single big hero leaf with droplets for the opening shot */
export function makeHeroLeaf() {
  const c = canvas(512, 1024);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(19);
  ctx.translate(256, 512);
  const lw = 230, lh = 500;
  const g = ctx.createLinearGradient(-lw, 0, lw, 0);
  g.addColorStop(0, '#3b5a22');
  g.addColorStop(0.5, '#5f8a33');
  g.addColorStop(1, '#3a5520');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -lh);
  ctx.bezierCurveTo(lw * 1.1, -lh * 0.45, lw, lh * 0.6, 0, lh);
  ctx.bezierCurveTo(-lw, lh * 0.6, -lw * 1.1, -lh * 0.45, 0, -lh);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,230,160,0.5)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -lh);
  ctx.lineTo(0, lh);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let j = -7; j <= 7; j++) {
    const y = j * lh * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(lw * 0.4, y - 40, lw * 0.85, y - 90);
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(-lw * 0.4, y - 40, -lw * 0.85, y - 90);
    ctx.stroke();
  }
  for (let d = 0; d < 26; d++) {
    const dx = (rnd() - 0.5) * lw * 1.2, dy = (rnd() - 0.5) * lh * 1.4;
    const r = 4 + rnd() * 11;
    const rg = ctx.createRadialGradient(dx - r * 0.3, dy - r * 0.3, 1, dx, dy, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.35, 'rgba(160,200,140,0.5)');
    rg.addColorStop(0.9, 'rgba(30,50,20,0.55)');
    rg.addColorStop(1, 'rgba(30,50,20,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTex(c, true, false);
}

export function makeFernTex() {
  const c = canvas(256, 512);
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#3d5a1f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 512);
  ctx.lineTo(128, 0);
  ctx.stroke();
  for (let i = 0; i < 26; i++) {
    const y = 500 - i * 19;
    const len = 110 * Math.sin(((i + 2) / 30) * Math.PI) + 8;
    for (const s of [-1, 1]) {
      ctx.fillStyle = i % 2 ? '#4f7426' : '#46691f';
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.quadraticCurveTo(128 + s * len * 0.5, y - 16, 128 + s * len, y - 22);
      ctx.quadraticCurveTo(128 + s * len * 0.5, y + 2, 128, y + 6);
      ctx.fill();
    }
  }
  return toTex(c, true, false);
}

/** hair / beard strand card texture (white, tinted by material). alpha = strands */
export function makeStrandTex() {
  const c = canvas(128, 512);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(31);
  ctx.clearRect(0, 0, 128, 512);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 128;
    const len = 0.6 + rnd() * 0.4;
    const g = 0.65 + rnd() * 0.35;
    ctx.strokeStyle = `rgba(${g * 255},${g * 255},${g * 255},${0.7 + rnd() * 0.3})`;
    ctx.lineWidth = 1 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const wav = (rnd() - 0.5) * 18;
    ctx.bezierCurveTo(x + wav, 170, x - wav, 340, x + wav * 0.5, 512 * len);
    ctx.stroke();
  }
  return toTex(c, true, false);
}

export function makeSoftSprite() {
  const c = canvas(128);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTex(c, false, false);
}

export function makeMistSprite() {
  const c = canvas(256);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const dx = x / 128 - 1, dy = y / 128 - 1;
      const r = Math.hypot(dx, dy);
      const n = fbm2(x / 40, y / 40, 4) * 0.5 + 0.5;
      const a = clamp(1 - r) ** 1.5 * n;
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  ctx.putImageData(img, 0, 0);
  return toTex(c, false, false);
}

export function makeIrisTex(hex: string) {
  const c = canvas(256);
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(hex.length * 13 + hex.charCodeAt(1));
  // sclera
  ctx.fillStyle = '#efe9e2';
  ctx.fillRect(0, 0, 256, 256);
  // subtle veins near edges
  ctx.strokeStyle = 'rgba(190,90,90,0.18)';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    const a = rnd() * Math.PI * 2;
    ctx.moveTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128);
    ctx.lineTo(128 + Math.cos(a + 0.2) * 80, 128 + Math.sin(a + 0.2) * 80);
    ctx.stroke();
  }
  // iris occupies the centre (front of the eyeball maps to texture centre via custom UVs)
  const col = new THREE.Color(hex);
  const R = 62;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, R);
  g.addColorStop(0, `rgb(${col.r * 120},${col.g * 120},${col.b * 120})`);
  g.addColorStop(0.55, `rgb(${col.r * 255},${col.g * 255},${col.b * 255})`);
  g.addColorStop(0.9, `rgb(${col.r * 150},${col.g * 150},${col.b * 150})`);
  g.addColorStop(1, 'rgb(25,18,14)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, R, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    ctx.strokeStyle = `rgba(${200 * col.r + 40},${200 * col.g + 30},${200 * col.b + 20},0.35)`;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 22, 128 + Math.sin(a) * 22);
    ctx.lineTo(128 + Math.cos(a) * (R - 4), 128 + Math.sin(a) * (R - 4));
    ctx.stroke();
  }
  ctx.fillStyle = '#060404';
  ctx.beginPath();
  ctx.arc(128, 128, 24, 0, Math.PI * 2);
  ctx.fill();
  const t = toTex(c, true, false);
  return t;
}

/** canvas drawing for the cheek blush / skin redness overlay (alpha) */
export function makeBlushTex() {
  const c = canvas(256);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return toTex(c, false, false);
}
