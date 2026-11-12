// Props drawn in code: cassette, tape deck, CRT television, dot-matrix globe, lightstick, equaliser.
import { clamp, lerp, rand, txt, MONO, ITAL_B, COND, SANS, rgba } from './lib.mjs';
import { glow } from './fx.mjs';

// ---------- cassette (640 x 400 at s = 1, centred) ----------
export function cassette(ctx, t, x, y, s = 1, o = {}) {
  const { side = 'A', title = 'K-POP  1992 — NOW', body = '#1d1b1a', paper = '#efe2c9', stripe = '#e9b872', stripe2 = '#c4553a', spin = 1, wound = 0.5 } = o;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.roundRect(-312, -186, 640, 400, 26); ctx.fill();
  const g = ctx.createLinearGradient(0, -200, 0, 200);
  g.addColorStop(0, '#3a3735'); g.addColorStop(0.08, body); g.addColorStop(1, '#0f0e0d');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-320, -200, 640, 400, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3; ctx.stroke();
  for (const [sx, sy] of [[-292, -172], [292, -172], [-292, 172], [292, 172], [0, 172]]) {
    ctx.fillStyle = '#6d6862'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.stroke();
  }
  // label
  ctx.fillStyle = paper;
  ctx.beginPath(); ctx.roundRect(-270, -170, 540, 250, 12); ctx.fill();
  ctx.fillStyle = stripe; ctx.fillRect(-270, -26, 540, 22);
  ctx.fillStyle = stripe2; ctx.fillRect(-270, -4, 540, 12);
  ctx.fillStyle = '#1a1612'; ctx.fillRect(-270, -140, 62, 62);
  txt(ctx, side, -239, -108, { size: 52, font: COND, color: paper });
  txt(ctx, title, -186, -110, { size: 38, font: ITAL_B, color: '#2a1d14', align: 'left' });
  ctx.strokeStyle = 'rgba(42,29,20,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-186, -64); ctx.lineTo(250, -64); ctx.stroke();
  // window with reels
  ctx.fillStyle = '#0c0b0b';
  ctx.beginPath(); ctx.roundRect(-190, 18, 380, 112, 56); ctx.fill();
  ctx.fillStyle = 'rgba(160,140,120,0.18)';
  ctx.beginPath(); ctx.roundRect(-150, 40, 300, 68, 10); ctx.fill();
  const packs = [lerp(30, 66, 1 - wound), lerp(30, 66, wound)];
  [-120, 120].forEach((rx, i) => {
    ctx.fillStyle = '#4a3226';
    ctx.beginPath(); ctx.arc(rx, 74, packs[i], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efe7da';
    ctx.beginPath(); ctx.arc(rx, 74, 26, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(rx, 74); ctx.rotate(t * spin * 3.2 * (i ? 1.25 : 1));
    ctx.fillStyle = '#0c0b0b';
    for (let k = 0; k < 6; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(-4, 12, 8, 12);
    }
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  // bottom trapezoid
  ctx.fillStyle = '#2a2826';
  ctx.beginPath(); ctx.moveTo(-200, 200); ctx.lineTo(-170, 140); ctx.lineTo(170, 140); ctx.lineTo(200, 200); ctx.closePath(); ctx.fill();
  for (const hx of [-130, -60, 60, 130]) { ctx.fillStyle = '#0c0b0b'; ctx.beginPath(); ctx.arc(hx, 172, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ---------- tape deck front panel (1200 x 560 at s = 1, centred) ----------
export function deck(ctx, t, x, y, s, o = {}) {
  const { pressed = -1, vu = 0, door } = o;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -280, 0, 280);
  g.addColorStop(0, '#d9d4cb'); g.addColorStop(0.5, '#b9b3a8'); g.addColorStop(1, '#8e887d');
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(-590, -262, 1200, 560, 22); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-600, -280, 1200, 560, 22); ctx.fill();
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.04 + rand(i) * 0.05})`; ctx.fillRect(-600, -280 + i * 8, 1200, 1); }
  // cassette well
  ctx.fillStyle = '#1b1917'; ctx.beginPath(); ctx.roundRect(-560, -240, 640, 400, 18); ctx.fill();
  if (door) door(-240, -40);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.moveTo(-560, -240); ctx.lineTo(-300, -240); ctx.lineTo(-480, 160); ctx.lineTo(-560, 160); ctx.closePath(); ctx.fill();
  // VU meters
  [[160, -160], [400, -160]].forEach(([mx, my], i) => {
    ctx.fillStyle = '#f3e3b8'; ctx.beginPath(); ctx.roundRect(mx - 100, my - 70, 200, 140, 10); ctx.fill();
    ctx.strokeStyle = '#3a2e22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mx, my + 60, 100, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke();
    ctx.strokeStyle = '#c4553a'; ctx.beginPath(); ctx.arc(mx, my + 60, 100, Math.PI * 1.62, Math.PI * 1.78); ctx.stroke();
    txt(ctx, 'VU', mx, my + 30, { size: 22, font: MONO, color: '#3a2e22' });
    const lv = clamp(vu * (0.75 + 0.25 * Math.sin(t * 13 + i * 2) * Math.sin(t * 5.3 + i)));
    const a = Math.PI * lerp(1.25, 1.75, lv);
    ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx, my + 60); ctx.lineTo(mx + Math.cos(a) * 105, my + 60 + Math.sin(a) * 105); ctx.stroke();
  });
  // transport buttons
  const names = ['◀◀', '▶', '■', '▶▶', '●'];
  names.forEach((n, i) => {
    const bx = 130 + i * 92, by = 120, down = pressed === i ? 8 : 0;
    ctx.fillStyle = '#4a4540'; ctx.beginPath(); ctx.roundRect(bx - 40, by - 40 + 10, 80, 80, 8); ctx.fill();
    ctx.fillStyle = i === 4 ? '#c4553a' : '#e9e4da'; ctx.beginPath(); ctx.roundRect(bx - 40, by - 40 + down, 80, 80 - down, 8); ctx.fill();
    txt(ctx, n, bx, by + down / 2, { size: 30, font: SANS, color: i === 4 ? '#fff' : '#2a2622' });
  });
  txt(ctx, 'STEREO CASSETTE DECK', 300, -260 + 24, { size: 20, font: MONO, color: '#4a4540', track: 4 });
  ctx.restore();
}

// ---------- CRT television (screen w x h, centred); `screen` draws the picture in screen coordinates ----------
export function crtTV(ctx, t, x, y, w, h, screen, o = {}) {
  const { wood = '#5a3a22' } = o;
  const bw = w + 150, bh = h + 120;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(x - bw / 2 + 14, y - bh / 2 + 20, bw, bh, 28); ctx.fill();
  const g = ctx.createLinearGradient(x, y - bh / 2, x, y + bh / 2);
  g.addColorStop(0, wood); g.addColorStop(1, '#2e1d12');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 28); ctx.fill();
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.08 + rand(i + 4) * 0.08})`; ctx.lineWidth = 2;
    const yy = y - bh / 2 + 10 + i * (bh / 18);
    ctx.beginPath(); ctx.moveTo(x - bw / 2, yy); ctx.bezierCurveTo(x - bw / 4, yy + 6, x + bw / 4, yy - 6, x + bw / 2, yy + 3); ctx.stroke();
  }
  ctx.fillStyle = '#141210'; ctx.beginPath(); ctx.roundRect(x - w / 2 - 22, y - h / 2 - 22, w + 44, h + 44, 40); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 34); ctx.clip();
  ctx.fillStyle = '#0a0c0e'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.translate(x - w / 2, y - h / 2);
  screen(w, h);
  ctx.restore();
  const sg = ctx.createRadialGradient(x - w * 0.2, y - h * 0.3, 10, x, y, w * 0.75);
  sg.addColorStop(0, 'rgba(255,255,255,0.10)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 34); ctx.fill();
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#c9b48e'; ctx.beginPath(); ctx.arc(x + w / 2 + 44, y - h / 4 + i * 80, 16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- dot-matrix globe ----------
const LAND = [[-100, 45, 30, 20], [-85, 25, 12, 8], [-42, 72, 12, 8], [-62, -10, 14, 18], [-67, -35, 8, 15], [15, 50, 18, 10],
  [20, 8, 22, 25], [22, -20, 13, 13], [90, 52, 45, 17], [102, 25, 22, 12], [78, 20, 8, 10], [45, 25, 10, 9],
  [138, 36, 3, 7], [127.5, 37.5, 2.5, 3.5], [134, -25, 17, 11], [-110, 62, 22, 9],
  [116, 32, 9, 9], [104, 12, 6, 9], [114, -1, 14, 4], [122, 12, 2.5, 5], [143, 43, 2.5, 2.5], [130, 33, 2, 2]];
const isLand = (lon, lat) => LAND.some(([cx, cy, rx, ry]) => ((lon - cx) / rx) ** 2 + ((lat - cy) / ry) ** 2 < 1);
const DOTS = [];
for (let lat = -58; lat <= 78; lat += 1.5) for (let lon = -180; lon < 180; lon += 1.5) if (isLand(lon, lat)) DOTS.push([lon, lat]);

export function project(lon, lat, lon0, tilt = 0.35) {
  const l = ((lon - lon0) * Math.PI) / 180, p = (lat * Math.PI) / 180;
  const x = Math.cos(p) * Math.sin(l);
  const y0 = Math.sin(p), z0 = Math.cos(p) * Math.cos(l);
  const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt), z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
  return [x, -y, z];
}

export function globe(ctx, cx, cy, r, lon0, o = {}) {
  const { dot = '#f4f1ea', sea = '#1d1d22', rim = 'rgba(255,255,255,0.15)', tilt = 0.35 } = o;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, sea); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = dot;
  for (const [lon, lat] of DOTS) {
    const [x, y, z] = project(lon, lat, lon0, tilt);
    if (z <= 0) continue;
    ctx.globalAlpha = 0.25 + 0.6 * z;
    ctx.beginPath(); ctx.arc(cx + x * r, cy + y * r, r * 0.0048 * (0.6 + z * 0.6), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Great-circle arc from a to b ([lon,lat]) drawn up to fraction p, lifted off the surface.
export function arc3d(ctx, cx, cy, r, lon0, a, b, p, color, o = {}) {
  const { w = 4, lift = 0.18, tilt = 0.35 } = o;
  const v = ([lon, lat]) => { const L = (lon * Math.PI) / 180, P = (lat * Math.PI) / 180; return [Math.cos(P) * Math.cos(L), Math.sin(P), Math.cos(P) * Math.sin(L)]; };
  const A = v(a), B = v(b);
  const dot = clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1), om = Math.acos(dot);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  let pen = false, last = null;
  for (let i = 0; i <= 60 * p; i++) {
    const k = i / 60, s1 = Math.sin((1 - k) * om) / Math.sin(om), s2 = Math.sin(k * om) / Math.sin(om);
    const q = [A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2];
    const h = 1 + lift * Math.sin(Math.PI * k);
    const lon = (Math.atan2(q[2], q[0]) * 180) / Math.PI, lat = (Math.asin(clamp(q[1], -1, 1)) * 180) / Math.PI;
    const [x, y, z] = project(lon, lat, lon0, tilt);
    if (z < -0.05) { if (pen) ctx.stroke(); pen = false; continue; }
    const px = cx + x * r * h, py = cy + y * r * h;
    if (!pen) { ctx.beginPath(); ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    last = [px, py];
  }
  if (pen) ctx.stroke();
  ctx.restore();
  return last;
}

// ---------- lightstick ----------
export function lightstick(ctx, x, y, s, rot, color, a = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = '#e8e6ea'; ctx.beginPath(); ctx.roundRect(-7, 0, 14, 70, 6); ctx.fill();
  glow(ctx, 0, -18, 70, rgba(color, 'A'), 0.55 * a);
  ctx.fillStyle = color; ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.arc(0, -18, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-6, -24, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- equaliser bars ----------
export function eqBars(ctx, t, x, y, w, h, n, color, o = {}) {
  const { bpm = 120, seed = 1, gap = 0.3 } = o;
  const bw = w / n;
  const b = Math.exp(-(((t * bpm) / 60) % 1) * 4);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const lv = clamp(0.15 + 0.5 * Math.abs(Math.sin(t * (2 + rand(i + seed) * 5) + i)) * (0.6 + 0.4 * b) + 0.3 * b * rand(i * 3 + seed));
    ctx.fillRect(x + i * bw + bw * gap / 2, y - lv * h, bw * (1 - gap), lv * h);
  }
}
