// Shared helpers: fonts, easing, timeline lookups and generic drawing.
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
export const MONO = 'Menlo, RoundB, UniB';

// ---------- timeline ----------
export const TL = JSON.parse(readFileSync(here('./build/timeline.json')));
export const SEG = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
export const DURATION = TL.duration;
export const S = (id) => SEG[id].start;
export const E = (id) => SEG[id].end;

// Word boundary for `w` inside segment `id` (from the TTS timestamps, never estimated).
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
export const atEnd = (id, w, nth) => word(id, w, nth).end;

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
export const pop = (t, t0, d = 0.45) => easeBack(prog(t, t0, t0 + d));
export const fadeIn = (t, t0, d = 0.3) => easeOut(prog(t, t0, t0 + d));
export function rand(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const C = {
  bg0: '#0b0d2e', bg1: '#2a2470', ink: '#2b1a55', white: '#ffffff', cream: '#fff6e8',
  pink: '#ff8fb1', hot: '#ff4f8b', red: '#e8344e', gold: '#ffc93c', orange: '#ff9f43', sky: '#4cc9f0',
  mint: '#3ddc97', lilac: '#c9b6ff', grass: '#7bd389', coral: '#ff7a59', grey: '#8f93b8', ok: '#3ddc97', no: '#ff4d6d',
};
// one colour per tool, reused everywhere so the viewer can track the relay
export const TOOL = {
  fable: { name: 'Fable 5.1', color: '#c9b6ff', job: '写 PRD' },
  image: { name: 'Image 2.5', color: '#ff8fb1', job: '画参考图' },
  tripo: { name: 'Tripo', color: '#4cc9f0', job: '生成 3D' },
  opus: { name: 'Opus 5.5', color: '#ff9f43', job: '写代码' },
  astra: { name: 'Astra', color: '#3ddc97', job: '修 bug' },
  blender: { name: 'Blender', color: '#f5792a' },
  unity: { name: 'Unity', color: '#e6e8f5' },
};

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
    ctx.fillStyle = 'rgba(10,5,40,0.45)';
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

// Rounded pill with centered label; returns its width.
export function pill(ctx, label, cx, cy, o = {}) {
  const { size = 40, fill = C.gold, color = C.ink, font = ZH, pad = 34 } = o;
  const w = measure(ctx, label, size, font) + pad * 2, h = size * 1.7;
  card(ctx, cx - w / 2, cy - h / 2, w, h, { fill, r: h / 2, ew: 0, drop: 6 });
  txt(ctx, label, cx, cy + size * 0.04, { size, color, font });
  return w;
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
  const { color = C.gold, w = 10, head = 30, p = 1, dash } = o;
  if (p <= 0) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p);
  const a = Math.atan2(y - y1, x - x1);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x - Math.cos(a) * head * 0.6, y - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.setLineDash([]);
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

// Green check / red cross badge.
export function mark(ctx, x, y, ok, s = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = ok ? C.ok : C.no;
  ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.white; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ok) { ctx.moveTo(-16, 0); ctx.lineTo(-4, 13); ctx.lineTo(18, -12); }
  else { ctx.moveTo(-13, -13); ctx.lineTo(13, 13); ctx.moveTo(13, -13); ctx.lineTo(-13, 13); }
  ctx.stroke();
  ctx.restore();
}

// Section header pill ("第二部分 · 场景构建") sliding in at t0.
export function header(ctx, t, t0, num, title, color = C.gold) {
  const p = pop(t, t0 - 0.2, 0.5);
  around(ctx, W / 2, 110, p, p, () => {
    const w1 = measure(ctx, num, 40) + 60, w2 = measure(ctx, title, 56) + 70;
    const x0 = W / 2 - (w1 + w2) / 2;
    card(ctx, x0, 70, w1 + w2, 84, { fill: 'rgba(255,255,255,0.1)', ew: 0, drop: 0, r: 42 });
    card(ctx, x0 + 8, 78, w1, 68, { fill: color, ew: 0, drop: 0, r: 34 });
    txt(ctx, num, x0 + 8 + w1 / 2, 113, { size: 40, color: C.ink });
    txt(ctx, title, x0 + w1 + w2 / 2, 113, { size: 56, color: C.white });
  });
}

// Mouth/bob level for a voiced line, driven by word timings.
export function talkLevel(t, ids) {
  for (const id of ids) {
    const s = SEG[id];
    if (t < s.start || t > s.end) continue;
    if (s.words.some((w) => t >= w.start && t <= w.end)) return 0.45 + 0.55 * Math.abs(Math.sin(t * 22));
  }
  return 0;
}
export const ZH_LINES = TL.segments.filter((s) => s.voice === 'zh').map((s) => s.id);
export const PRINCE_LINES = TL.segments.filter((s) => s.voice === 'prince').map((s) => s.id);

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
