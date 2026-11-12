// Props: the little prince's asteroid, rose, volcano, lamp, watering can, plus UI-ish icons (doc, picture, cube, code, camera).
import { C, ZH, EN, MONO, txt, card, star, rand } from './lib.mjs';

const OUT = '#2b1a55';
const GREY = { a: '#e6e6f0', b: '#cfd0e2', c: '#b8bad2', line: '#8a90bc' };
function ell(ctx, x, y, rx, ry, fill, stroke = OUT, lw = 5, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// Little round planet; (x,y) = centre.
export function asteroid(ctx, t, x, y, r, o = {}) {
  const { mode = 'color' } = o;
  const g = mode === 'color';
  ctx.save();
  if (g) {
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffe1a8'); gr.addColorStop(1, '#e8a25c');
    ctx.fillStyle = gr;
  } else ctx.fillStyle = GREY.a;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = g ? OUT : GREY.line; ctx.lineWidth = 6; ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = rand(i + 4) * 6.28, d = r * (0.25 + rand(i + 9) * 0.5);
    ell(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.09, r * 0.06, g ? 'rgba(160,90,40,0.35)' : GREY.b, null);
  }
  ctx.restore();
}

export function rose(ctx, t, x, y, s = 1, o = {}) {
  const { mode = 'color', dome = 0 } = o;
  const g = mode === 'color', L = g ? OUT : GREY.line;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 2) * 0.04);
  ctx.strokeStyle = g ? '#2f8f4e' : GREY.c; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -40, 0, -80); ctx.stroke();
  ell(ctx, -18, -36, 18, 9, g ? '#4cc27a' : GREY.b, L, 3, -0.5);
  ell(ctx, 16, -52, 16, 8, g ? '#4cc27a' : GREY.b, L, 3, 0.5);
  ell(ctx, 0, -100, 26, 24, g ? '#ff4d6d' : GREY.a, L, 4);
  ell(ctx, -10, -108, 13, 15, g ? '#ff7a8f' : GREY.b, null, 0, -0.4);
  ell(ctx, 10, -106, 12, 14, g ? '#e8344e' : GREY.b, null, 0, 0.4);
  if (dome) {
    ctx.globalAlpha *= dome;
    ctx.fillStyle = 'rgba(200,235,255,0.25)'; ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-50, 4); ctx.lineTo(-50, -100); ctx.arc(0, -100, 50, Math.PI, 0); ctx.lineTo(50, 4); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

export function volcano(ctx, t, x, y, s = 1, o = {}) {
  const { mode = 'color', smoke = 1 } = o;
  const g = mode === 'color', L = g ? OUT : GREY.line;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-20, -60); ctx.lineTo(20, -60); ctx.lineTo(60, 0); ctx.closePath();
  ctx.fillStyle = g ? '#9b6bd1' : GREY.b; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 5; ctx.stroke();
  ell(ctx, 0, -60, 20, 7, g ? '#ff7a59' : GREY.c, L, 4);
  if (g && smoke) for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    ell(ctx, Math.sin(k * 6 + i) * 10, -70 - k * 80, 10 + k * 16, 10 + k * 14, `rgba(255,255,255,${0.5 * (1 - k)})`, null);
  }
  ctx.restore();
}

export function lamp(ctx, t, x, y, s = 1, o = {}) {
  const { mode = 'color' } = o;
  const g = mode === 'color', L = g ? OUT : GREY.line;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (g) {
    const gl = ctx.createRadialGradient(0, -150, 4, 0, -150, 90);
    gl.addColorStop(0, 'rgba(255,220,120,0.65)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gl; ctx.fillRect(-90, -240, 180, 180);
  }
  ctx.fillStyle = g ? '#3b3566' : GREY.c; ctx.fillRect(-6, -130, 12, 130);
  ctx.fillRect(-22, -8, 44, 10);
  card(ctx, -22, -180, 44, 50, { fill: g ? '#ffe28a' : GREY.a, r: 8, ew: 4, edge: L, drop: 0 });
  ctx.beginPath(); ctx.moveTo(-30, -180); ctx.lineTo(0, -205); ctx.lineTo(30, -180); ctx.closePath();
  ctx.fillStyle = g ? '#3b3566' : GREY.c; ctx.fill();
  ctx.restore();
}

// Watering can; (x,y) = handle grip point.
export function wateringCan(ctx, t, x, y, s = 1, o = {}) {
  const { rot = 0, pour = 0, ghost = false } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(rot);
  if (ghost) ctx.globalAlpha *= 0.45;
  ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 30, 28, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 5; ctx.stroke();
  card(ctx, -45, 30, 90, 70, { fill: '#5aa9e6', r: 16, ew: 5, edge: OUT, drop: 0 });
  ctx.fillStyle = '#5aa9e6'; ctx.strokeStyle = OUT; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(40, 80); ctx.lineTo(100, 38); ctx.lineTo(108, 48); ctx.lineTo(44, 96); ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(ctx, 106, 40, 10, 14, '#7cc3f0', OUT, 4, 0.9);
  if (pour > 0) for (let i = 0; i < 8; i++) {
    const k = (t * 2.2 + i / 8) % 1;
    ell(ctx, 112 + k * 40 + (i % 3) * 6, 50 + k * 140, 4, 8, `rgba(120,200,255,${pour * (1 - k)})`, null);
  }
  ctx.restore();
}

// ---------- icons ----------
export function docIcon(ctx, x, y, s = 1, color = C.lilac) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  card(ctx, -50, -64, 100, 128, { fill: C.cream, r: 12, ew: 5, edge: OUT, drop: 6 });
  ctx.fillStyle = color; ctx.fillRect(-32, -42, 64, 12);
  ctx.fillStyle = '#c4bedf';
  for (let i = 0; i < 4; i++) ctx.fillRect(-32, -14 + i * 20, 64 - (i % 2) * 18, 8);
  txt(ctx, 'PRD', 0, -62 - 22, { size: 30, font: EN, color });
  ctx.restore();
}

export function picIcon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  card(ctx, -64, -52, 128, 104, { fill: '#2a2470', r: 12, ew: 5, edge: OUT, drop: 6 });
  ell(ctx, 28, -20, 12, 12, C.gold, null);
  ctx.fillStyle = C.mint;
  ctx.beginPath(); ctx.moveTo(-56, 44); ctx.lineTo(-16, -4); ctx.lineTo(10, 24); ctx.lineTo(28, 8); ctx.lineTo(56, 44); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function cubeIcon(ctx, x, y, s = 1, color = C.sky, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = (px, py, pz) => [(px * c - pz * sn) * 50, py * 50 - (px * sn + pz * c) * 22];
  const faces = [
    [[[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]], '#ffffff'],
    [[[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], color],
    [[[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], 'rgba(0,0,0,0.22)'],
  ];
  for (const [f, fill] of faces) {
    ctx.beginPath(); f.forEach((q) => ctx.lineTo(...P(...q))); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = fill === color ? 'rgba(0,0,0,0)' : fill === '#ffffff' ? 'rgba(255,255,255,0.45)' : fill; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
  }
  ctx.restore();
}

export function codeIcon(ctx, x, y, s = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  card(ctx, -70, -54, 140, 108, { fill: '#1d1846', r: 14, ew: 5, edge: OUT, drop: 6 });
  [C.pink, C.gold, C.mint].forEach((c, i) => ell(ctx, -50 + i * 18, -38, 6, 6, c, null));
  const cols = [C.orange, C.sky, C.lilac, C.mint];
  for (let i = 0; i < 4; i++) {
    const w = 30 + rand(i + 2) * 70 * Math.min(1, Math.max(0, t * 3 - i));
    ctx.fillStyle = cols[i]; ctx.fillRect(-52 + (i % 2) * 14, -16 + i * 18, w, 9);
  }
  ctx.restore();
}

export function bugIcon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = OUT; ctx.lineWidth = 5;
  for (const dy of [-14, 4, 22]) { ctx.beginPath(); ctx.moveTo(-44, dy); ctx.lineTo(44, dy - 6); ctx.stroke(); }
  ell(ctx, 0, 4, 30, 40, '#e8344e');
  ell(ctx, 0, -38, 18, 15, OUT, null);
  ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 40); ctx.stroke();
  ctx.restore();
}

export function cameraIcon(ctx, x, y, s = 1, color = C.sky) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  card(ctx, -46, -30, 74, 60, { fill: color, r: 10, ew: 4, edge: OUT, drop: 0 });
  ctx.fillStyle = color; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(28, -6); ctx.lineTo(52, -22); ctx.lineTo(52, 22); ctx.lineTo(28, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(ctx, -10, 0, 14, 14, '#1d1846', OUT, 3);
  ctx.restore();
}

// App badge: rounded tile with a short code + name underneath.
export function appTile(ctx, x, y, s, code, name, color, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  card(ctx, -70, -70, 140, 140, { fill: color, r: 34, ew: 6, edge: OUT, drop: 10 });
  txt(ctx, code, 0, 2, { size: o.codeSize ?? 58, font: EN, color: OUT });
  if (name) txt(ctx, name, 0, 110, { size: 36, font: EN, color: C.white });
  ctx.restore();
}

// Terminal-style chip, e.g. "$ blender -b"
export function termChip(ctx, x, y, text, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.font = `28px ${MONO}`;
  const w = ctx.measureText(text).width + 40;
  card(ctx, -w / 2, -26, w, 52, { fill: '#14103a', r: 12, ew: 3, edge: C.mint, drop: 0 });
  txt(ctx, text, 0, 1, { size: 28, font: MONO, color: C.mint });
  ctx.restore();
}

export function sparkleField(ctx, t, x, y, w, h, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + rand(i) * 2) + i));
    ctx.save(); ctx.globalAlpha *= a;
    star(ctx, x + rand(i + 1) * w, y + rand(i + 7) * h, 6 + rand(i + 3) * 8, i % 2 ? C.gold : '#fff3c4', t * 0.5 + i);
    ctx.restore();
  }
}
void ZH;
