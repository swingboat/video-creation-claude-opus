// Track 04 · 2012: the upload, the first billion-view video, and the world pressing play without TV.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, easeIn, pop, fadeIn, rand,
  txt, around, rise, sticker, label, rgba, SERIF, SANS, COND, MONO, BLACK,
} from './lib.mjs';
import { crtTV, globe, project } from './props.mjs';
import { figure, pose } from './people.mjs';

const P = ERA.c12;
const BPM = 128;

function playIcon(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.55); ctx.lineTo(x + r * 0.6, y); ctx.lineTo(x - r * 0.4, y + r * 0.55); ctx.closePath(); ctx.fill();
}

// ---------- 1. uploaded ----------
function uploadScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = CH.c12.from + 0.1;
  txt(ctx, '2012', 120, 250, { size: 230, font: COND, color: P.acc, align: 'left', a: fadeIn(t, t0, 0.2) });
  label(ctx, 'SUMMER  ·  UPLOAD', 130, 420, P.ink, { a: fadeIn(t, t0 + 0.4) });
  const px = 1280, py = 470, pw = 1000, ph = 560;
  const ap = easeOut(prog(t, at('psy', '江南') - 0.5, at('psy', '江南') + 0.1));
  around(ctx, px, py, lerp(0.9, 1, ap), ap, () => {
    ctx.fillStyle = '#1d1d20'; ctx.beginPath(); ctx.roundRect(px - pw / 2 - 16, py - ph / 2 - 16, pw + 32, ph + 110, 22); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(px - pw / 2, py - ph / 2, pw, ph); ctx.clip();
    const g = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
    g.addColorStop(0, '#ff9a3c'); g.addColorStop(0.6, '#ff4f1f'); g.addColorStop(1, '#5a1208');
    ctx.fillStyle = g; ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.fillStyle = 'rgba(255,230,160,0.8)'; ctx.beginPath(); ctx.arc(px + 260, py - 40, 110, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a0b05'; ctx.fillRect(px - pw / 2, py + 170, pw, 200);
    const b = ((t * BPM) / 60) % 1;
    figure(ctx, px - 60, py + 200, 0.78, pose('ride', 'rideUp', b < 0.5 ? b * 2 : 2 - b * 2), { color: '#120402', hop: Math.abs(Math.sin(b * Math.PI)) * 22 });
    ctx.restore();
    txt(ctx, '《江南Style》', px - pw / 2 + 10, py + ph / 2 + 50, { size: 44, font: SANS, color: P.ink, align: 'left' });
    playIcon(ctx, px + pw / 2 - 40, py + ph / 2 + 50, 40, P.ink);
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(px - pw / 2, py + ph / 2 - 8, pw, 8);
    const tu = at('psy', '传上') - 0.1, up = easeIO(prog(t, tu, tu + 1.0));
    ctx.fillStyle = P.acc; ctx.fillRect(px - pw / 2, py + ph / 2 - 8, pw * up, 8);
    if (t > tu) txt(ctx, up < 1 ? `上传中  ${Math.round(up * 100)}%` : '已发布  ✓', px + pw / 2 - 100, py + ph / 2 + 50, { size: 32, font: MONO, color: up < 1 ? P.ink : P.acc2, align: 'right' });
  });
}

// ---------- 2. one billion ----------
const fmt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function billionScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = S('billion'), th = at('billion', '十亿') - 0.05;
  const p = prog(t, t0, th);
  const n = p >= 1 ? 1e9 : Math.pow(10, lerp(3, 9, easeIn(p)));
  const hit = t >= th;
  label(ctx, 'VIEWS  ·  播放次数', W / 2, 260, P.acc, { align: 'center', a: fadeIn(t, t0 - 0.2) });
  const punch = hit ? lerp(1.12, 1, easeOut(prog(t, th, th + 0.35))) : 1;
  around(ctx, W / 2, 470, punch, 1, () => txt(ctx, fmt(n), W / 2, 470, { size: 250, font: COND, color: hit ? P.acc2 : P.ink, track: 4 }));
  const hp = pop(t, th + 0.1, 0.45);
  around(ctx, W / 2, 700, hp, hp, () => txt(ctx, '十亿', W / 2, 700, { size: 150, font: SERIF, color: P.acc }));
  const tf = at('billion', '第一支') - 0.1, fp = pop(t, tf, 0.4);
  around(ctx, 1500, 250, fp, fp, () => sticker(ctx, 'FIRST EVER', 1500, 250, { fill: P.acc, color: '#fff', size: 46, rot: 0.08 }));
  label(ctx, 'YOUTUBE  ·  DEC 2012', W / 2, 860, P.ink, { align: 'center', a: fadeIn(t, th + 0.4) });
}

// ---------- 3. no gatekeeper: the world presses play ----------
const PINS = [[126.98, 37.57], [139.69, 35.69], [116.4, 39.9], [100.5, 13.75], [106.8, -6.2], [72.88, 19.08], [55.27, 25.2], [37.62, 55.75],
  [2.35, 48.86], [-0.13, 51.51], [3.38, 6.52], [31.24, 30.04], [-46.63, -23.55], [-99.13, 19.43], [-74.0, 40.71], [-118.24, 34.05],
  [-79.38, 43.65], [151.21, -33.87], [-77.04, -12.05], [-3.7, 40.42], [13.4, 52.52], [120.98, 14.6], [18.42, -33.92], [-58.38, -34.6]];
function noTvScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const tOff = at('notv', '点头') - 0.1, off = prog(t, tOff, tOff + 0.35);
  const tW = at('notv', '全世界') - 0.2;
  const slide = easeIO(prog(t, tW - 0.3, tW + 0.6));
  const tvx = lerp(560, -500, slide);
  if (slide < 1) crtTV(ctx, t, tvx, 500, 640, 460, (w, h) => {
    const sy = off < 0.6 ? 1 - off / 0.6 * 0.99 : 0.01, sx = off < 0.6 ? 1 : 1 - (off - 0.6) / 0.4;
    if (off >= 1) return;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(sx, sy); ctx.translate(-w / 2, -h / 2);
    ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect((i * w) / 7, 0, w / 7 + 1, h * 0.7); });
    ctx.fillStyle = '#111'; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    txt(ctx, '电视台', w / 2, h * 0.85, { size: 48, font: SANS, color: '#fff' });
    ctx.restore();
    if (off > 0) { ctx.fillStyle = `rgba(255,255,255,${1 - off})`; ctx.fillRect(0, h / 2 - 3, w, 6); }
  }, { wood: '#3a3a40' });
  const gx = lerp(1450, W / 2, slide), r = lerp(330, 420, slide);
  const lon0 = 127 - Math.max(0, t - tW) * 32;
  globe(ctx, gx, 540, r, lon0, { dot: rgba(P.ink, 0.7), sea: '#18181c', tilt: 0.3 });
  PINS.forEach(([lon, lat], i) => {
    const tp = tW + 0.15 + i * 0.09, p = pop(t, tp, 0.35);
    if (p <= 0) return;
    const [x, y, z] = project(lon, lat, lon0, 0.3);
    if (z <= 0.05) return;
    const X = gx + x * r, Y = 540 + y * r;
    ctx.save(); ctx.globalAlpha *= Math.min(1, z * 2);
    ctx.fillStyle = P.acc; ctx.beginPath(); ctx.roundRect(X - 22 * p, Y - 16 * p, 44 * p, 32 * p, 8 * p); ctx.fill();
    playIcon(ctx, X, Y, 18 * p, '#fff');
    ctx.restore();
  });
  // finally, one big play button
  const tb = at('notv', '按下播放') - 0.1, bp = pop(t, tb, 0.4);
  const press = t > tb + 0.55 ? lerp(0.9, 1, easeOut(prog(t, tb + 0.55, tb + 0.8))) : 1;
  around(ctx, W / 2, 540, bp * press, bp, () => {
    ctx.fillStyle = P.acc; ctx.beginPath(); ctx.roundRect(W / 2 - 170, 540 - 120, 340, 240, 60); ctx.fill();
    playIcon(ctx, W / 2 + 10, 540, 120, '#fff');
  });
  if (slide >= 1) label(ctx, 'NO GATEKEEPER', W / 2, 960 - 40, P.acc2, { align: 'center', a: fadeIn(t, tW + 0.6) * (1 - bp) });
}

export const scenes = [
  { id: 'upload', from: CH.c12.from, to: S('billion') - 0.2, draw: uploadScene, cut: true },
  { id: 'billion', from: S('billion') - 0.2, to: S('notv') - 0.2, draw: billionScene, still: true },
  { id: 'notv', from: S('notv') - 0.2, to: CH.c12.to, draw: noTvScene },
];

export const events = [
  { type: 'rewind', t: CH.c12.from - 0.35 },
  { type: 'boom', t: CH.c12.from + 0.1, amp: 0.6 },
  { type: 'whoosh', t: at('psy', '江南') - 0.5, d: 0.6, amp: 0.4 },
  { type: 'riser', t: at('psy', '传上') - 0.1, d: 1.0 },
  { type: 'ding', t: at('psy', '传上') + 0.9, n: 86 },
  { type: 'riser', t: S('billion') - 0.1, d: at('billion', '十亿') - S('billion') + 0.05 },
  { type: 'boom', t: at('billion', '十亿') - 0.05, amp: 1, flash: true, peak: 0.6 },
  { type: 'stamp', t: at('billion', '第一支') - 0.05, amp: 0.6 },
  { type: 'buzz', t: at('notv', '点头') - 0.1 },
  { type: 'whoosh', t: at('notv', '全世界') - 0.5, d: 0.8, amp: 0.5 },
  ...PINS.map((_, i) => ({ type: 'pop', t: at('notv', '全世界') - 0.05 + i * 0.09, f: 600 + (i % 6) * 90, amp: 0.35 })),
  { type: 'click', t: at('notv', '按下播放') + 0.45 },
];
