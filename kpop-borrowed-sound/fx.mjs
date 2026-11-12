// Film-look post effects: grain, vignette, scanlines, light leaks, flashes and tape-glitch transitions.
import { createCanvas } from '@napi-rs/canvas';
import { W, H, clamp, prog, rand } from './lib.mjs';

// a handful of pre-baked grain plates, cycled per frame
const GRAIN = [...Array(6)].map((_, k) => {
  const c = createCanvas(W / 2, H / 2);
  const g = c.getContext('2d');
  const img = g.createImageData(W / 2, H / 2);
  let s = 1234 + k * 999;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = 128 + ((s >>> 24) - 128) * 0.9;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
});

export function grain(ctx, t, amount = 0.07) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(GRAIN[Math.floor(t * 24) % GRAIN.length], 0, 0, W, H);
  ctx.restore();
}

export function vignette(ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function scanlines(ctx, x, y, w, h, a = 0.18, t = 0) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 2);
  // rolling bright band, like an old CRT
  const by = y + (((t * 90) % (h + 200)) - 100);
  const g = ctx.createLinearGradient(0, by - 60, 0, by + 60);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, Math.max(y, by - 60), w, Math.min(120, y + h - (by - 60)));
  ctx.restore();
}

// Warm light leak sweeping across, used on chapter changes.
export function lightLeak(ctx, t, t0, d = 1.2, color = [255, 150, 60]) {
  const p = prog(t, t0, t0 + d);
  if (p <= 0 || p >= 1) return;
  const a = Math.sin(Math.PI * p) * 0.55;
  const x = -400 + p * (W + 800);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, H * 0.3, 0, x, H * 0.3, 900);
  g.addColorStop(0, `rgba(${color},${a})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function flash(ctx, t, t0, d = 0.18, color = '255,255,255', peak = 0.85) {
  const p = prog(t, t0, t0 + d);
  if (p <= 0 || p >= 1) return;
  ctx.fillStyle = `rgba(${color},${peak * (1 - p) * (1 - p)})`;
  ctx.fillRect(0, 0, W, H);
}

// Tape glitch: horizontal slices of the finished frame shoved sideways with an RGB split.
const tmp = createCanvas(W, H);
const tctx = tmp.getContext('2d');
export function glitch(ctx, canvas, t, t0, d = 0.35) {
  const p = prog(t, t0 - d / 2, t0 + d / 2);
  if (p <= 0 || p >= 1) return;
  const k = Math.sin(Math.PI * p);
  tctx.clearRect(0, 0, W, H);
  tctx.drawImage(canvas, 0, 0);
  const f = Math.floor(t * 30);
  for (let i = 0; i < 14; i++) {
    if (rand(f * 31 + i) > 0.55 * k + 0.15) continue;
    const y = Math.floor(rand(f * 17 + i) * H), h = 8 + rand(f * 7 + i) * 90 * k;
    const dx = (rand(f * 13 + i) - 0.5) * 260 * k;
    ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.35 * k;
  ctx.drawImage(tmp, 14 * k, 0);
  ctx.restore();
  ctx.fillStyle = `rgba(255,255,255,${0.08 * k})`;
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);
}

// Soft halo for glowing things (lightsticks, stage lights).
export function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(clamp(a))));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
