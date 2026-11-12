// The digging field drawn as a cross-section: grass, soil layers, a water table, wells, dirt piles and signs.
import { C, W, H, prog, lerp, clamp, easeOut, txt } from './lib.mjs';

export const GY = 600; // ground surface
export const CELL = 60; // one dig unit
export const WATER = GY + 4 * CELL; // the model: water at the 4th cell

function rnd(i) {
  const x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
}

// Soil cross-section; o.waterGlow 0..1 highlights the water layer, o.x0/x1 limit the width.
export function field(ctx, t, o = {}) {
  const { x0 = 0, x1 = W, waterGlow = 0, y = GY } = o;
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, C.soil); g.addColorStop(1, C.soilDeep);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y, x1 - x0, H - y);
  // pebbles
  ctx.fillStyle = 'rgba(70,40,20,0.28)';
  for (let i = 0; i < 70; i++) {
    const px = x0 + rnd(i) * (x1 - x0), py = y + 40 + rnd(i + 50) * (H - y - 40);
    ctx.beginPath(); ctx.ellipse(px, py, 6 + rnd(i + 9) * 10, 4 + rnd(i + 3) * 5, rnd(i) * 3, 0, Math.PI * 2); ctx.fill();
  }
  // water table
  const wy = y + 4 * CELL;
  const wg = ctx.createLinearGradient(0, wy, 0, wy + 70);
  wg.addColorStop(0, `rgba(90,195,255,${0.92 + 0.08 * waterGlow})`);
  wg.addColorStop(1, 'rgba(40,130,225,0.85)');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(x0, wy);
  for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, wy + Math.sin(x * 0.02 + t * 2) * 5);
  ctx.lineTo(x1, wy + 70); ctx.lineTo(x0, wy + 70); ctx.closePath(); ctx.fill();
  if (waterGlow > 0) {
    ctx.save();
    ctx.globalAlpha = waterGlow * (0.6 + 0.4 * Math.sin(t * 6));
    ctx.strokeStyle = C.white; ctx.lineWidth = 5; ctx.setLineDash([18, 14]);
    ctx.strokeRect(x0 + 8, wy - 4, x1 - x0 - 16, 76);
    ctx.restore();
  }
  // grass strip with tufts
  ctx.fillStyle = C.grass;
  ctx.fillRect(x0, y - 16, x1 - x0, 24);
  ctx.fillStyle = C.grassDeep;
  ctx.fillRect(x0, y + 4, x1 - x0, 8);
  ctx.fillStyle = C.grass;
  for (let x = x0 + 10; x < x1; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 8, y - 34 - (x % 3) * 5); ctx.lineTo(x + 16, y - 14); ctx.fill();
  }
}

// A well shaft at x with `depth` in cells (fractional ok). o.water 0..1 fills it, o.rock shows a stone at the bottom.
export function well(ctx, t, x, depth, o = {}) {
  const { w = 130, water = 0, rock = 0, y = GY } = o;
  const d = depth * CELL;
  if (d > 0.5) {
    ctx.fillStyle = C.soilDark;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - 4, w, d + 4, [0, 0, 22, 22]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - w / 2, y - 4, 16, d);
    // dug cell ticks
    ctx.strokeStyle = 'rgba(255,230,200,0.35)'; ctx.lineWidth = 3;
    for (let k = 1; k < depth; k++) { ctx.beginPath(); ctx.moveTo(x + w / 2 - 22, y + k * CELL); ctx.lineTo(x + w / 2, y + k * CELL); ctx.stroke(); }
  }
  if (rock > 0) {
    ctx.save();
    ctx.translate(x + 10, y + d - 22); ctx.scale(rock, rock);
    ctx.fillStyle = '#9aa1ad'; ctx.strokeStyle = '#5f6672'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-48, 18); ctx.lineTo(-38, -14); ctx.lineTo(-6, -26); ctx.lineTo(34, -16); ctx.lineTo(46, 18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (water > 0) {
    const top = lerp(WATER - GY + y, y + 30, water);
    ctx.fillStyle = C.water;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, top);
    for (let k = 0; k <= 8; k++) ctx.lineTo(x - w / 2 + 4 + ((w - 8) * k) / 8, top + Math.sin(k + t * 9) * 5);
    ctx.lineTo(x + w / 2 - 4, WATER - GY + y + 40); ctx.lineTo(x - w / 2 + 4, WATER - GY + y + 40); ctx.closePath(); ctx.fill();
  }
  // dirt pile grows with what was dug out
  const pile = clamp(depth / 4) * 70;
  if (pile > 1) {
    ctx.fillStyle = C.soil;
    ctx.beginPath(); ctx.moveTo(x + w / 2 + 6, y - 6); ctx.quadraticCurveTo(x + w / 2 + 60, y - 6 - pile * 1.8, x + w / 2 + 130, y - 6);
    ctx.closePath(); ctx.fill();
  }
}

// Little clods flying from a well to its pile while digging. phase u from the dig cycle.
export function clods(ctx, x, u, o = {}) {
  const { y = GY, dir = 1 } = o;
  if (u < 0.6) return;
  const p = (u - 0.6) / 0.4;
  ctx.fillStyle = C.soilDeep;
  for (let i = 0; i < 5; i++) {
    const vx = (90 + i * 26) * dir, vy = -180 - i * 30;
    const px = x + vx * p, py = y - 20 + vy * p + 380 * p * p;
    ctx.beginPath(); ctx.arc(px, py, 9 - i, 0, Math.PI * 2); ctx.fill();
  }
}

// Wooden sign with a letter (A/B/C) standing on the ground.
export function sign(ctx, x, label, a = 1, o = {}) {
  if (a <= 0) return;
  const { y = GY, color = C.cream } = o;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 6, y - 110, 12, 100);
  ctx.fillStyle = color; ctx.strokeStyle = '#6b4424'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(x - 44, y - 160, 88, 64, 14); ctx.fill(); ctx.stroke();
  txt(ctx, label, x, y - 127, { size: 44, color: C.ink });
  ctx.restore();
}

// Water burst out of a well, starting at t0.
export function splash(ctx, t, t0, x, o = {}) {
  const { y = GY, n = 26 } = o;
  const dt = t - t0;
  if (dt < 0 || dt > 2.2) return;
  ctx.fillStyle = C.water;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (rnd(i) - 0.5) * 1.6, v = 600 + rnd(i + 7) * 500;
    const d = Math.max(0, dt - rnd(i + 2) * 0.3);
    const px = x + Math.cos(a) * v * d * 0.6, py = y + Math.sin(a) * v * d + 900 * d * d;
    if (py > y + 10) continue;
    ctx.globalAlpha = clamp(1 - d / 1.6);
    ctx.beginPath(); ctx.ellipse(px, py, 10, 15, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// A puff of smoke where the gem vanishes.
export function poof(ctx, t, t0, x, y) {
  const p = prog(t, t0, t0 + 0.6);
  if (p <= 0 || p >= 1) return;
  ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - p)})`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 30 + 110 * easeOut(p);
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 34 * (1 - p * 0.6), 0, Math.PI * 2); ctx.fill();
  }
}
