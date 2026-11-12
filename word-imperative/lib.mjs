// Shared helpers: fonts, easing, timeline lookups and reusable cartoon drawings.
import { GlobalFonts } from '@napi-rs/canvas';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const W = 1920, H = 1080, FPS = 30;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// ---------- fonts ----------
if (!existsSync(here('./build/fonts/YuantiSC-Bold.ttf'))) {
  spawnSync(here('./.venv/bin/python'), [here('./fonts.py')], { stdio: 'inherit' });
}
const reg = (p, name) => existsSync(p) && GlobalFonts.registerFromPath(p, name);
reg(here('./build/fonts/YuantiSC-Bold.ttf'), 'YuanB');
reg(here('./build/fonts/PingFangSC-Semibold.ttf'), 'PingB');
reg('/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', 'RoundB');
reg('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', 'UniB');
reg('/System/Library/Fonts/Hiragino Sans GB.ttc', 'HiraGB');
export const ZH = 'YuanB, RoundB, UniB, HiraGB';
export const EN = 'RoundB, YuanB, UniB, HiraGB';

// ---------- timeline ----------
export const TL = JSON.parse(readFileSync(here('./build/timeline.json')));
export const SEG = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
export const DURATION = TL.duration;
export const S = (id) => SEG[id].start;
export const E = (id) => SEG[id].end;

// Word boundary for `word` inside segment `id` (taken from the TTS timestamps, never estimated).
export function word(id, w, nth = 0) {
  const s = SEG[id];
  let i = -1;
  for (let k = 0; k <= nth; k++) i = s.text.indexOf(w, i + 1);
  if (i < 0) throw new Error(`"${w}" not in ${id}`);
  const hit = s.words.find((x) => x.idx <= i && i < x.idx + x.text.length) ?? s.words.find((x) => x.idx >= i);
  const last = [...s.words].reverse().find((x) => x.idx < i + w.length) ?? hit;
  return { start: hit.start, end: last.end };
}
export const at = (id, w, nth) => word(id, w, nth).start;

// ---------- math ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeBack = (t) => {
  const c1 = 2.2, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const elastic = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
// pop-in scale with overshoot that starts at t0
export const pop = (t, t0, d = 0.45) => easeBack(prog(t, t0, t0 + d));
export const fadeIn = (t, t0, d = 0.3) => easeOut(prog(t, t0, t0 + d));

export const C = {
  bg0: '#24135a', bg1: '#4a2596', gold: '#ffc93c', goldDeep: '#f29e0c', red: '#ff4d5e', mint: '#3ddc97',
  sky: '#4cc9f0', pink: '#ff8fab', cream: '#fff6e0', ink: '#2b1a55', white: '#ffffff', lilac: '#c9b6ff',
};
export const LETTER_COLORS = ['#ff8fab', '#ffc93c', '#4cc9f0', '#3ddc97', '#ff9f43', '#c9b6ff', '#ff8fab', '#ffc93c', '#4cc9f0', '#3ddc97'];

// ---------- text & shapes ----------
export function txt(ctx, s, x, y, o = {}) {
  const { size = 80, font = ZH, color = C.white, align = 'center', base = 'middle', stroke, sw = 12, shadow } = o;
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowOffsetY = size * 0.08;
    ctx.shadowBlur = 0;
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.strokeText(s, x, y);
    ctx.shadowColor = 'transparent';
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function measure(ctx, s, size, font = ZH) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

export function card(ctx, x, y, w, h, o = {}) {
  const { r = 32, fill = C.cream, edge = C.ink, ew = 6, drop = 12 } = o;
  ctx.save();
  if (drop) {
    ctx.fillStyle = 'rgba(15,5,45,0.45)';
    ctx.beginPath(); ctx.roundRect(x, y + drop, w, h, r); ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  if (ew) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = ew;
    ctx.stroke();
  }
  ctx.restore();
}

// Apply a scale/alpha transform around (x,y) for the duration of fn.
export function around(ctx, x, y, sc, alpha, fn, rot = 0) {
  if (alpha <= 0.001 || sc <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

export function arrow(ctx, x1, y1, x2, y2, o = {}) {
  const { color = C.gold, w = 10, head = 30, p = 1 } = o;
  if (p <= 0) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p);
  const a = Math.atan2(y - y1, x - x1);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x - Math.cos(a) * head * 0.6, y - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(a - 0.45) * head, y - Math.sin(a - 0.45) * head);
  ctx.lineTo(x - Math.cos(a + 0.45) * head, y - Math.sin(a + 0.45) * head);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function star(ctx, x, y, r, color = C.gold, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Radiating sparkles that fly out from (x,y) starting at t0.
export function burst(ctx, t, t0, x, y, o = {}) {
  const { n = 10, r = 220, size = 22, colors = [C.gold, C.pink, C.sky, C.mint], dur = 0.7 } = o;
  const p = prog(t, t0, t0 + dur);
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const d = r * easeOut(p);
    star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, size * (1 - p), colors[i % colors.length], p * 3);
  }
}

// Speech-motion lines / emphasis marks.
export function shakeOf(t, t0, amp = 14, dur = 0.35) {
  const p = prog(t, t0, t0 + dur);
  if (p <= 0 || p >= 1) return [0, 0];
  const k = amp * (1 - p);
  return [Math.sin(t * 90) * k, Math.cos(t * 77) * k * 0.6];
}

// ---------- crown ----------
export function crown(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-60, 30); ctx.lineTo(-70, -30); ctx.lineTo(-35, 0); ctx.lineTo(0, -45);
  ctx.lineTo(35, 0); ctx.lineTo(70, -30); ctx.lineTo(60, 30); ctx.closePath();
  ctx.fillStyle = C.gold; ctx.fill();
  ctx.strokeStyle = C.goldDeep; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = C.goldDeep; ctx.fillRect(-60, 16, 120, 14);
  for (const [jx, jy, c] of [[-70, -34, C.red], [0, -50, C.sky], [70, -34, C.mint], [0, 6, C.red]]) {
    ctx.beginPath(); ctx.arc(jx, jy, 10, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
  }
  ctx.restore();
}

// ---------- the emperor ----------
// (x,y) = feet centre. o.talk 0..1 opens the mouth, o.point raises the right arm (0..1),
// o.mood: 'happy' | 'stern' | 'shock'.
export function emperor(ctx, t, x, y, s, o = {}) {
  const { talk = 0, point = 0, mood = 'happy', wave = 0 } = o;
  const bob = Math.sin(t * 4) * 4;
  ctx.save();
  ctx.translate(x, y + bob * s);
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // shadow
  ctx.fillStyle = 'rgba(10,0,40,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 120, 18, 0, 0, Math.PI * 2); ctx.fill();
  // cape
  ctx.fillStyle = '#c81d4e';
  ctx.beginPath(); ctx.moveTo(-70, -215); ctx.quadraticCurveTo(-150, -60, -125, 0); ctx.lineTo(125, 0);
  ctx.quadraticCurveTo(150, -60, 70, -215); ctx.closePath(); ctx.fill();
  // robe
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath(); ctx.moveTo(-60, -220); ctx.lineTo(60, -220); ctx.lineTo(95, 0); ctx.lineTo(-95, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.fillRect(-12, -215, 24, 215);
  ctx.fillRect(-95, -18, 190, 18);
  // ermine collar
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(0, -215, 82, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink;
  for (const dx of [-50, -18, 18, 50]) { ctx.beginPath(); ctx.arc(dx, -212, 4, 0, Math.PI * 2); ctx.fill(); }
  // left arm (waving or resting)
  const la = -0.35 - wave * (1.9 + Math.sin(t * 12) * 0.35);
  limb(ctx, -62, -195, la + Math.PI / 2, 95);
  // right arm (pointing)
  const ra = lerp(Math.PI / 2 + 0.35, -0.25, easeOut(point));
  limb(ctx, 62, -195, ra, 105, point > 0.5);
  // head
  ctx.fillStyle = '#ffd7b5';
  ctx.beginPath(); ctx.arc(0, -300, 78, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb4a2';
  ctx.beginPath(); ctx.arc(-46, -280, 13, 0, Math.PI * 2); ctx.arc(46, -280, 13, 0, Math.PI * 2); ctx.fill();
  // eyes (blink every few seconds)
  const blink = (t % 3.3) < 0.12 ? 0.15 : 1;
  ctx.fillStyle = C.ink;
  for (const dx of [-28, 28]) { ctx.beginPath(); ctx.ellipse(dx, -315, 9, 12 * blink, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7;
  const tilt = mood === 'stern' ? 0.35 : mood === 'shock' ? -0.25 : -0.1;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * 14, -340 + (mood === 'stern' ? 6 : 0));
    ctx.lineTo(k * 44, -340 - tilt * 30 * 1);
    ctx.stroke();
  }
  // moustache
  ctx.fillStyle = '#5a3a22';
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -282);
    ctx.quadraticCurveTo(k * 30, -300, k * 52, -282); ctx.quadraticCurveTo(k * 60, -268, k * 44, -270);
    ctx.quadraticCurveTo(k * 26, -280, 0, -272); ctx.closePath(); ctx.fill();
  }
  // mouth
  ctx.fillStyle = '#7a1f2b';
  const open = clamp(talk);
  if (open > 0.05 || mood === 'shock') {
    ctx.beginPath(); ctx.ellipse(0, -255, 18, 6 + 16 * Math.max(open, mood === 'shock' ? 0.8 : 0), 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#7a1f2b'; ctx.lineWidth = 6;
    ctx.beginPath();
    if (mood === 'stern') { ctx.moveTo(-16, -252); ctx.lineTo(16, -252); } else ctx.arc(0, -264, 18, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  crown(ctx, x, y + bob * s - 382 * s, 0.85 * s, Math.sin(t * 3) * 0.04);
}

function limb(ctx, x, y, ang, len, finger = false) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 34;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = '#ffd7b5';
  ctx.beginPath(); ctx.arc(ex, ey, 19, 0, Math.PI * 2); ctx.fill();
  if (finger) {
    ctx.strokeStyle = '#ffd7b5'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ang) * 30, ey + Math.sin(ang) * 30); ctx.stroke();
  }
}

// Mouth openness for a voiced line, driven by its word timings.
export function talkLevel(t, ids) {
  for (const id of ids) {
    const s = SEG[id];
    if (t < s.start || t > s.end) continue;
    if (s.words.some((w) => t >= w.start && t <= w.end)) return 0.45 + 0.55 * Math.abs(Math.sin(t * 22));
  }
  return 0;
}

// ---------- confetti ----------
function rand(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export function confetti(ctx, t, t0, n = 160) {
  const dt = t - t0;
  if (dt < 0) return;
  const cols = [C.gold, C.pink, C.sky, C.mint, C.red, C.lilac];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const x0 = side > 0 ? W + 20 : -20, y0 = H * 0.75;
    const vx = -side * (500 + rand(i) * 900), vy = -(900 + rand(i + 9) * 700);
    const d = Math.max(0, dt - rand(i + 3) * 0.25);
    const x = x0 + vx * d * Math.exp(-d * 0.6), y = y0 + vy * d + 900 * d * d;
    if (y > H + 40) continue;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(d * (4 + rand(i + 5) * 8));
    ctx.scale(1, Math.abs(Math.sin(d * 9 + i)));
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-11, -6, 22, 12);
    ctx.restore();
  }
}
