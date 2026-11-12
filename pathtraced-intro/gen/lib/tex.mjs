// Procedural textures -> build/tex/*.png
import { Plane, writePNG, mix, smooth } from './png.mjs';
import { rng } from './geo.mjs';

const OUT = new URL('../../build/tex/', import.meta.url).pathname;
const W = 2048, H = 240;

function ropeBorders(p) {
  for (let x = 0; x < W; x += 9) { p.dome(x, 7, 5, 0.7); p.dome(x + 4, H - 8, 5, 0.7); }
  p.rect(0, 15, W, 18, 0.45); p.rect(0, H - 19, W, H - 16, 0.45);
}
function clasps(p, n) { for (let i = 0; i < n; i++) { const x = (i + 0.5) * (W / n); p.rect(x - 14, 0, x + 14, H, 0.9); p.dome(x, 40, 7, 1); p.dome(x, H - 40, 7, 1); } }
function curl(p, cx, cy, r, turns, w, v) {
  let px = cx, py = cy;
  for (let t = 0; t <= turns * Math.PI * 2; t += 0.08) {
    const rr = r * (1 - t / (turns * Math.PI * 2 + 0.01)), x = cx + rr * Math.cos(t), y = cy + rr * 0.7 * Math.sin(t);
    p.line(px, py, x, y, w, v); px = x; py = y;
  }
}

function writeBand(name, height, colLow, colHigh, metalHigh) {
  const h = height.clone().blur(1);
  const mask = h.clone().map((v) => smooth(0.12, 0.3, v));
  const r = rng(9), noise = new Float32Array(W * H).map(() => r());
  const ch = [0, 1, 2].map((c) => new Float32Array(W * H).map((_, i) => mix(colLow[c] * (0.8 + 0.4 * noise[i]), colHigh[c] * (0.75 + 0.25 * h.d[i]), mask.d[i])));
  writePNG(`${OUT}${name}_base.png`, W, H, ch);
  writePNG(`${OUT}${name}_metal.png`, W, H, [mask.clone().map((v) => v * metalHigh).d]);
  writePNG(`${OUT}${name}_height.png`, W, H, [h.d]);
}

export function bandNYC() {
  const p = new Plane(W, H), r = rng(3);
  ropeBorders(p);
  for (let x = 0; x < W; x += 3) { const y = 205 + 5 * Math.sin(x / 11) + 3 * Math.sin(x / 4.3); p.max(x, y, 0.55); p.max(x, y + 1, 0.55); }
  for (let x = 0; x < W; x += 2) { const y = 214 + 4 * Math.sin(x / 7 + 1); p.max(x, y, 0.4); }
  const base = 198;
  for (let rep = 0; rep < 2; rep++) {
    const ox = rep * (W / 2);
    for (let x = 30; x < W / 2 - 30;) {
      const bw = 8 + r() * 16, bh = 22 + r() ** 2 * 100;
      p.rect(ox + x, base - bh, ox + x + bw, base, 0.75 + r() * 0.15);
      if (r() < 0.4) p.rect(ox + x + bw * 0.25, base - bh - 8 - r() * 10, ox + x + bw * 0.75, base - bh, 0.85);
      for (let wy = base - bh + 5; wy < base - 4; wy += 6) for (let wx = x + 2; wx < x + bw - 2; wx += 4) p.d[p.idx(Math.round(ox + wx), Math.round(wy))] *= 0.55;
      x += bw + r() * 3;
    }
    const tower = (cx, levels) => { let w = 46, y = base; for (const lh of levels) { p.rect(ox + cx - w / 2, y - lh, ox + cx + w / 2, y, 0.95); y -= lh; w *= 0.74; } p.line(ox + cx, y, ox + cx, y - 34, 3, 1); };
    tower(380, [70, 30, 22, 14, 10]);
    tower(820, [55, 40, 16, 12]);
    for (let i = 0; i < 7; i++) curl(p, ox + 80 + i * 140 + r() * 40, 58 + r() * 26, 34 + r() * 12, 2.2, 4, 0.65);
    for (let i = 0; i < 6; i++) { const cx = ox + r() * (W / 2), cy = 40 + r() * 40; for (let k = 0; k < 40; k++) p.max(cx + k * 2, cy + 6 * Math.sin(k / 4), 0.6); }
    for (let i = 0; i < 14; i++) p.dome(ox + r() * (W / 2), 45 + r() * 50, 8 + r() * 10, 0.5);
  }
  clasps(p, 4);
  writeBand('band_nyc', p, [0.2, 0.02, 0.03], [0.93, 0.91, 0.87], 0.85);
}

export function bandGold() {
  const p = new Plane(W, H), r = rng(11);
  ropeBorders(p);
  for (let i = 0; i < 900; i++) { const x = r() * W, y = 40 + r() * 110; p.dome(x, y, 6 + r() * 12, 0.45 + r() * 0.4); }
  for (let i = 0; i < 40; i++) { const x = r() * W, w = 3 + r() * 8; p.rect(x, 150, x + w, 205, 0.7 + r() * 0.3); }
  for (let x = 0; x < W; x += 2) p.max(x, 210 + 4 * Math.sin(x / 9), 0.5);
  clasps(p, 4);
  writeBand('band_gold', p, [0.22, 0.05, 0.03], [0.95, 0.68, 0.38], 0.9);
}

export function sunCorona() {
  const S = 1024, c = S / 2, r = rng(5);
  const g = new Plane(S, S);
  const rays = Array.from({ length: 260 }, () => ({ a: r() * Math.PI * 2, len: 0.15 + r() ** 2 * 0.3, w: 0.004 + r() * 0.01, b: 0.4 + r() * 0.6 }));
  g.map((_, x, y) => {
    const dx = (x - c) / c, dy = (y - c) / c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    let v = Math.exp(-((d / 0.32) ** 2)) * 1.0 + Math.exp(-d * 4) * 0.35;
    for (const ray of rays) {
      const da = Math.abs((((a - ray.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (d > 0.2 && d < 0.2 + ray.len && da < ray.w / d) v += ray.b * (1 - (d - 0.2) / ray.len) * (1 - da * d / ray.w) * 0.6;
    }
    return Math.min(1, v * smooth(1, 0.85, d));
  });
  const R = new Float32Array(g.d), G = g.d.map((v) => v ** 1.25 * 0.88), B = g.d.map((v) => v ** 1.9 * 0.65);
  writePNG(`${OUT}sun_corona.png`, S, S, [R, G, B]);
}

export function creditIcon() {
  const S = 64, p = new Plane(S, S);
  const sq = (a, b, w) => { p.rect(a, a, b, a + w); p.rect(a, b - w, b, b); p.rect(a, a, a + w, b); p.rect(b - w, a, b, b); };
  sq(4, 60, 2); sq(18, 46, 2);
  p.line(6, 6, 19, 19, 2); p.line(58, 6, 45, 19, 2); p.line(6, 58, 19, 45, 2); p.line(58, 58, 45, 45, 2);
  for (let i = 1; i < 63; i += 3) { p.max(i, 1, 0.6); p.max(i, 62, 0.6); p.max(1, i, 0.6); p.max(62, i, 0.6); }
  const a = p.d;
  writePNG(`${OUT}credit_icon.png`, S, S, [a.map(() => 0.85), a.map(() => 0.7), a.map(() => 0.45), a]);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  bandNYC(); bandGold(); sunCorona(); creditIcon();
  console.log('textures written to', OUT);
}
