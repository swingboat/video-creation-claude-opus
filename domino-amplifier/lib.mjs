// Shared helpers: fonts, easing, timeline lookups, text drawing.
import { GlobalFonts } from '@napi-rs/canvas';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const W = 1920, H = 1080, FPS = 30;
export const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// ---------- fonts ----------
if (!existsSync(here('./build/fonts/PingFangSC-Semibold.ttf'))) {
  spawnSync(here('./.venv/bin/python'), [here('./fonts.py')], { stdio: 'inherit' });
}
const reg = (p, name) => existsSync(p) && GlobalFonts.registerFromPath(p, name);
reg(here('./build/fonts/PingFangSC-Semibold.ttf'), 'PingB');
reg(here('./build/fonts/YuantiSC-Bold.ttf'), 'YuanB');
reg('/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', 'RoundB');
reg('/System/Library/Fonts/Hiragino Sans GB.ttc', 'HiraGB');
export const ZH = 'PingB, HiraGB';
export const NUM = 'RoundB, PingB';

// ---------- timeline + simulation events ----------
export const TL = JSON.parse(readFileSync(here('./build/timeline.json')));
export const EV = JSON.parse(readFileSync(here('./build/events.json')));
export const SEG = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
export const DURATION = TL.duration;

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

// ---------- math ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeBack = (t) => 1 + 3.2 * Math.pow(t - 1, 3) + 2.2 * Math.pow(t - 1, 2);
export const pop = (t, t0, d = 0.4) => easeBack(prog(t, t0, t0 + d));

// ---------- text ----------
export function txt(ctx, s, x, y, o = {}) {
  const { size = 48, font = ZH, color = '#fff', align = 'center', base = 'middle', shadow = true } = o;
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.25;
    ctx.shadowOffsetY = size * 0.05;
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

// glassy rounded panel
export function panel(ctx, x, y, w, h, r = 28, a = 0.55) {
  ctx.save();
  ctx.fillStyle = `rgba(14,16,24,${a})`;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const fmtHeight = (mm) => (mm < 100 ? `${+mm.toFixed(mm < 10 ? 1 : 0)} mm` : `${+(mm / 10).toFixed(mm < 1000 ? 0 : 1)} cm`);
