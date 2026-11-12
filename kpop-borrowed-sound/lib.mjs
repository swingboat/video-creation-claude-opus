// Shared helpers: fonts, era palettes, timeline lookups, easing and editorial typography.
import { GlobalFonts } from '@napi-rs/canvas';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const W = 1920, H = 1080, FPS = 30;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// ---------- fonts ----------
if (!existsSync(here('./build/fonts/SongtiSC-Black.ttf'))) {
  spawnSync(here('./.venv/bin/python'), [here('./fonts.py')], { stdio: 'inherit' });
}
const reg = (p, name) => existsSync(p) && GlobalFonts.registerFromPath(p, name);
reg(here('./build/fonts/SongtiSC-Black.ttf'), 'SongBlack');
reg(here('./build/fonts/SongtiSC-Bold.ttf'), 'SongBold');
reg(here('./build/fonts/PingFangSC-Semibold.ttf'), 'PingB');
reg(here('./build/fonts/PingFangSC-Regular.ttf'), 'PingR');
reg(here('./build/fonts/Futura-CondExtraBold.ttf'), 'FuturaCX');
reg('/System/Library/Fonts/Supplemental/Georgia Italic.ttf', 'GeorgiaI');
reg('/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf', 'GeorgiaBI');
reg('/System/Library/Fonts/Supplemental/Arial Black.ttf', 'ArialBlk');
reg('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', 'UniB');
reg('/System/Library/Fonts/Hiragino Sans GB.ttc', 'HiraGB');
const FB = 'UniB, HiraGB';
export const SERIF = `SongBlack, ${FB}`; // headline Chinese
export const SERIF_B = `SongBold, ${FB}`;
export const SANS = `PingB, ${FB}`;
export const SANS_R = `PingR, ${FB}`;
export const COND = `FuturaCX, ArialBlk, PingB, ${FB}`; // big Latin display + years
export const BLACK = `ArialBlk, PingB, ${FB}`;
export const ITAL = `GeorgiaI, SongBold, ${FB}`;
export const ITAL_B = `GeorgiaBI, SongBlack, ${FB}`;
export const MONO = `Menlo, PingR, ${FB}`;

// ---------- timeline ----------
export const TL = JSON.parse(readFileSync(here('./build/timeline.json')));
export const SEG = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
export const DURATION = TL.duration;
export const TITLE = TL.title;
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
export const easeIn = (t) => t * t * t;
export const easeBack = (t) => {
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const pop = (t, t0, d = 0.4) => easeBack(prog(t, t0, t0 + d));
export const fadeIn = (t, t0, d = 0.3) => easeOut(prog(t, t0, t0 + d));
export const window_ = (t, a, b, f = 0.25) => clamp(Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b)));
export function rand(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- colours ----------
export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(a, b, t) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
}
export const rgba = (c, a) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};

// One palette per era: bg, ink (main text), accent, second accent, paper (cards).
export const ERA = {
  intro: { bg: '#15110d', ink: '#f3e9d8', acc: '#e9b872', acc2: '#c4553a', paper: '#efe2c9', tag: 'A 面', year: '' },
  c92: { bg: '#2b1b11', ink: '#f6e6cc', acc: '#f29b45', acc2: '#d4482b', paper: '#f1e0c2', tag: 'TRACK 01', year: '1992' },
  c96: { bg: '#0e1d24', ink: '#e7efe9', acc: '#58c9bf', acc2: '#f2c14e', paper: '#dfe9e4', tag: 'TRACK 02', year: '1996' },
  c07: { bg: '#f6cfe0', ink: '#2a0f2e', acc: '#ff2f86', acc2: '#6d4cff', paper: '#ffffff', tag: 'TRACK 03', year: '2007' },
  c12: { bg: '#0b0b0c', ink: '#f4f1ea', acc: '#ff4f1f', acc2: '#ffd23f', paper: '#1d1d20', tag: 'TRACK 04', year: '2012' },
  c20: { bg: '#1b1036', ink: '#f2eaff', acc: '#b07cff', acc2: '#ffd166', paper: '#2b1d52', tag: 'TRACK 05', year: '2020' },
  cnow: { bg: '#dcefff', ink: '#0c2140', acc: '#2d74ff', acc2: '#ff5fae', paper: '#ffffff', tag: 'TRACK 06', year: 'NOW' },
  method: { bg: '#101012', ink: '#f4f1ea', acc: '#ffd23f', acc2: '#ff4f1f', paper: '#1d1d22', tag: 'BONUS', year: '' },
  outro: { bg: '#15110d', ink: '#f3e9d8', acc: '#e9b872', acc2: '#c4553a', paper: '#efe2c9', tag: 'B 面', year: '' },
};
export const CHAPTERS = TL.segments.filter((s) => s.chapter).map((s, i, a) => ({
  key: s.chapter, from: i === 0 ? 0 : s.start - 1.1, to: a[i + 1] ? a[i + 1].start - 1.1 : 1e9,
}));
export const CH = Object.fromEntries(CHAPTERS.map((c) => [c.key, c]));
export const chapterAt = (t) => CHAPTERS.find((c) => t >= c.from && t < c.to) ?? CHAPTERS[0];

// ---------- text ----------
export function txt(ctx, s, x, y, o = {}) {
  const { size = 80, font = SANS, color = '#fff', align = 'center', base = 'middle', stroke, sw = 10, shadow, track = 0, a = 1 } = o;
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineJoin = 'round';
  if (track) ctx.letterSpacing = `${track}px`;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowBlur = size * 0.25;
    ctx.shadowOffsetY = size * 0.05;
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function measure(ctx, s, size, font = SANS, track = 0) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  if (track) ctx.letterSpacing = `${track}px`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

// Apply a scale/alpha/rotation around (x,y) for the duration of fn.
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

// Text revealed character by character from t0 (typewriter / caption-style build).
export function typeOn(ctx, s, x, y, t, t0, cps, o = {}) {
  const n = Math.floor(Math.max(0, t - t0) * cps);
  if (n <= 0) return;
  txt(ctx, [...s].slice(0, n).join(''), x, y, o);
}

// Headline that rises out of a mask line, editorial style.
export function rise(ctx, s, x, y, t, t0, o = {}) {
  const { size = 120, d = 0.5 } = o;
  const p = easeOut(prog(t, t0, t0 + d));
  if (p <= 0) return;
  const w = measure(ctx, s, size, o.font ?? SERIF, o.track ?? 0) + 40;
  const align = o.align ?? 'center';
  const x0 = align === 'left' ? x - 20 : align === 'right' ? x - w + 20 : x - w / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y - size * 0.75, w, size * 1.5); ctx.clip();
  txt(ctx, s, x, y + (1 - p) * size * 1.1, { ...o, size });
  ctx.restore();
}

// Tilted sticker label with a hard drop shadow (the "genre tag" look).
export function sticker(ctx, label, x, y, o = {}) {
  const { size = 44, fill = '#ffd23f', color = '#111', font = BLACK, rot = 0, sc = 1, a = 1, pad = 26, edge } = o;
  if (sc <= 0.001 || a <= 0.001) return;
  const w = measure(ctx, label, size, font) + pad * 2, h = size * 1.6;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.roundRect(-w / 2 + 8, -h / 2 + 10, w, h, 10); ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 4; ctx.stroke(); }
  txt(ctx, label, 0, size * 0.04, { size, color, font });
  ctx.restore();
  return w;
}

// Thin mono label with a leading rule: "— 1992 · SEOUL".
export function label(ctx, s, x, y, color, o = {}) {
  const { size = 26, a = 1, align = 'left' } = o;
  ctx.save();
  ctx.globalAlpha *= a;
  const w = measure(ctx, s, size, MONO, 3);
  const x0 = align === 'left' ? x : align === 'right' ? x - w - 70 : x - (w + 70) / 2;
  ctx.fillStyle = color; ctx.fillRect(x0, y - 1.5, 50, 3);
  txt(ctx, s, x0 + 70, y, { size, font: MONO, color, align: 'left', track: 3 });
  ctx.restore();
}

// Stroke that draws itself from p=0..1 along a polyline.
export function drawLine(ctx, pts, p, o = {}) {
  if (p <= 0) return;
  const { color = '#fff', w = 6, dash } = o;
  let total = 0;
  const segs = pts.slice(1).map((q, i) => { const l = Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); total += l; return l; });
  let left = total * clamp(p);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 0; i < segs.length && left > 0; i++) {
    const k = Math.min(1, left / segs[i]);
    ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k));
    left -= segs[i];
  }
  ctx.stroke();
  ctx.restore();
}

// Smooth beat pulse (0..1) at bpm, peaking on each beat.
export const beat = (t, bpm, sharp = 6) => Math.exp(-(((t * bpm) / 60) % 1) * sharp);
