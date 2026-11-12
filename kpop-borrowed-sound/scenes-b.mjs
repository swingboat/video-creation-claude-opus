// Track 01 · 1992: the living-room TV debut, the recipe, the lowest score, the chart run, rule #1.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand, beat,
  txt, around, rise, sticker, label, drawLine, measure, SERIF, SERIF_B, SANS, COND, ITAL, MONO, BLACK,
} from './lib.mjs';
import { crtTV } from './props.mjs';
import { group, spotlight, crowd } from './people.mjs';
import { scanlines, glow } from './fx.mjs';
import { vhs, stageShot, STAGE } from './vhs.mjs';

const P = ERA.c92;
const BPM = 104;
const tRoom = at('y92', '一个') - 0.15;

// ---------- the picture inside the TV ----------
// Drawn fallback: a broadcast medium shot of a lit stage, shot over the studio audience.
function drawnStage(ctx, t, w, h) {
  const pan = Math.sin(t * 0.25) * w * 0.04;
  ctx.save(); ctx.translate(pan, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#120c22'); g.addColorStop(0.7, '#2c1830'); g.addColorStop(1, '#1a0f14');
  ctx.fillStyle = g; ctx.fillRect(-w * 0.1, 0, w * 1.2, h);
  // arch of bulbs on the set
  for (let k = 0; k < 26; k++) {
    const a = Math.PI + (k / 25) * Math.PI, x = w / 2 + Math.cos(a) * w * 0.46, y = h * 0.62 + Math.sin(a) * h * 0.5;
    const on = 0.6 + 0.4 * Math.sin(t * 6 + k * 0.9);
    glow(ctx, x, y, h * 0.05, 'rgba(255,200,120,A)', 0.5 * on);
    ctx.fillStyle = `rgba(255,235,200,${on})`; ctx.beginPath(); ctx.arc(x, y, h * 0.008, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 3; i++) spotlight(ctx, w * (0.22 + i * 0.28) + Math.sin(t * 0.8 + i) * 40, -20, w * 0.4, h, 'rgba(255,225,190,A)', 0.3);
  // haze
  const hz = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.85);
  hz.addColorStop(0, 'rgba(200,170,220,0)'); hz.addColorStop(1, 'rgba(200,170,220,0.22)');
  ctx.fillStyle = hz; ctx.fillRect(-w * 0.1, 0, w * 1.2, h);
  ctx.fillStyle = '#2a1c26'; ctx.fillRect(-w * 0.1, h * 0.8, w * 1.2, h * 0.2);
  // dancers with a touch of motion blur
  const opt = { bpm: BPM, poses: ['step', 'point', 'hips', 'cross'], color: '#140c12', rim: '#ffb46a', hairs: ['short', 'short', 'short'] };
  ctx.globalAlpha *= 0.35; group(ctx, t - 0.04, w / 2, h * 0.86, w * 0.42, 3, h / 700, opt);
  ctx.globalAlpha /= 0.35; group(ctx, t, w / 2, h * 0.86, w * 0.42, 3, h / 700, opt);
  glow(ctx, w * 0.72, h * 0.12, h * 0.35, 'rgba(255,240,210,A)', 0.55);
  ctx.restore();
  crowd(ctx, t, h * 0.98, 1, { color: '#07040a', bounce: 0.4, bpm: BPM, W: w });
}

function stage(ctx, t, w, h, o = {}) {
  vhs(ctx, t, w, h, (c, w, h) => {
    if (STAGE) stageShot(c, t, w, h, tRoom, BPM);
    else drawnStage(c, t, w, h);
    if (o.chyron) {
      const a = o.chyron;
      c.save(); c.globalAlpha *= a;
      c.fillStyle = 'rgba(10,20,80,0.85)'; c.fillRect(w * 0.06, h * 0.72, w * 0.62 * a, h * 0.13);
      c.fillStyle = '#f2c14e'; c.fillRect(w * 0.06, h * 0.72, 10, h * 0.13);
      txt(c, o.name, w * 0.09, h * 0.765, { size: h * 0.05, font: SANS, color: '#fff', align: 'left' });
      if (o.song) txt(c, o.song, w * 0.09, h * 0.82, { size: h * 0.04, font: SANS, color: '#f2c14e', align: 'left' });
      c.restore();
    }
    txt(c, '新人选秀  1992', w - 30, 40, { size: h * 0.035, font: SANS, color: 'rgba(255,255,255,0.75)', align: 'right' });
  });
  scanlines(ctx, 0, 0, w, h, 0.12, t);
}

// ---------- 1. year card → the living room ----------
function yearScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = CH.c92.from + 0.1;
  // odometer roll from 2026 back to 1992
  const p = easeOut(prog(t, t0, t0 + 1.0));
  const n = Math.round(lerp(2026, 1992, p));
  txt(ctx, String(n), W / 2, 520, { size: 420, font: COND, color: P.acc, track: 10 });
  label(ctx, 'TRACK 01  ·  NEW JACK SWING', W / 2, 800, P.ink, { align: 'center', a: fadeIn(t, t0 + 0.6) });
}

function room(ctx, t, zoom) {
  ctx.save();
  ctx.translate(W / 2, 470); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -470);
  // wallpaper
  ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-400, -400, W + 800, H + 800);
  for (let x = -400; x < W + 400; x += 60) { ctx.fillStyle = (x / 60) % 2 ? '#74512f' : '#5f4129'; ctx.fillRect(x, -400, 30, 1300); }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,220,170,0.08)'; ctx.beginPath(); ctx.arc(-300 + (i % 10) * 270, 40 + Math.floor(i / 10) * 200, 12, 0, Math.PI * 2); ctx.fill(); }
  // lamp glow
  const lg = ctx.createRadialGradient(250, 300, 10, 250, 300, 600);
  lg.addColorStop(0, 'rgba(255,190,110,0.45)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = lg; ctx.fillRect(-400, -300, 1400, 1400);
  ctx.fillStyle = '#f3d9a8'; ctx.beginPath(); ctx.moveTo(190, 220); ctx.lineTo(310, 220); ctx.lineTo(340, 330); ctx.lineTo(160, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b1b11'; ctx.fillRect(244, 330, 12, 420);
  // floor + cabinet
  ctx.fillStyle = '#3a2416'; ctx.fillRect(-400, 820, W + 800, 600);
  ctx.fillStyle = '#4a2f1c'; ctx.fillRect(560, 770, 800, 160);
  ctx.fillStyle = '#3a2416'; ctx.fillRect(590, 800, 360, 100); ctx.fillRect(970, 800, 360, 100);
  // plant
  ctx.fillStyle = '#7a3b22'; ctx.beginPath(); ctx.moveTo(1560, 900); ctx.lineTo(1700, 900); ctx.lineTo(1680, 1000); ctx.lineTo(1580, 1000); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#2f5a2a' : '#3d6e33';
    ctx.save(); ctx.translate(1630, 900); ctx.rotate(-1.2 + i * 0.3 + Math.sin(t + i) * 0.02);
    ctx.beginPath(); ctx.ellipse(0, -110, 26, 110, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

function roomScene(ctx, t) {
  const tSeo = S('seo');
  const zoom = lerp(1, 1.55, easeIO(prog(t, tSeo - 0.6, tSeo + 0.8)));
  room(ctx, t, zoom);
  ctx.save();
  ctx.translate(W / 2, 470); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -470);
  const chy = fadeIn(t, at('seo', '徐太志') - 0.1, 0.4);
  crtTV(ctx, t, W / 2, 470, 760, 520, (w, h) => stage(ctx, t, w, h, {
    chyron: chy, name: '徐太志和孩子们', song: t > at('seo', '我知道') - 0.1 ? '《我知道》 난 알아요' : '',
  }));
  ctx.restore();
  // family on the sofa, seen from behind
  const fy = lerp(0, 220, prog(zoom, 1, 1.55));
  ctx.fillStyle = '#120b06';
  ctx.beginPath(); ctx.roundRect(260, 900 + fy, 1400, 260, 60); ctx.fill();
  for (const [x, r] of [[700, 58], [900, 48], [1180, 62]]) {
    ctx.beginPath(); ctx.ellipse(x, 840 + fy, r, r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, 960 + fy, r * 1.9, r * 1.4, 0, Math.PI, 0); ctx.fill();
  }
}

// ---------- 2. the recipe ----------
function recipeScene(ctx, t) {
  ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);
  for (let y = 120; y < H; y += 56) { ctx.fillStyle = 'rgba(120,80,40,0.12)'; ctx.fillRect(0, y, W, 2); }
  label(ctx, 'RECIPE  ·  《我知道》 1992', 140, 140, '#7a4a28', { a: fadeIn(t, S('mix') - 0.1) });
  const items = [
    { w: '说唱', s: '美国说唱', en: 'RAP', fill: '#e9b872', x: 400, rot: -0.08 },
    { w: '新杰克', s: '新杰克摇摆', en: 'NEW JACK SWING', fill: '#d4482b', x: 960, rot: 0.05, color: '#fff' },
    { w: '韩语', s: '韩语流行', en: 'K-BALLAD', fill: '#58c9bf', x: 1520, rot: -0.04 },
  ];
  items.forEach((it, i) => {
    const t0 = at('mix', it.w) - 0.1, p = pop(t, t0, 0.4);
    around(ctx, it.x, 440, p, p, () => {
      ctx.fillStyle = 'rgba(60,30,10,0.25)'; ctx.fillRect(it.x - 225, 312, 460, 280);
      ctx.fillStyle = it.fill; ctx.fillRect(it.x - 230, 300, 460, 280);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(it.x - 60, 285, 120, 32);
      txt(ctx, it.s, it.x, 420, { size: 70, font: SERIF, color: it.color ?? '#1a120c' });
      txt(ctx, it.en, it.x, 510, { size: 38, font: COND, color: it.color ?? '#1a120c', track: 6 });
    }, it.rot);
    if (i < 2) txt(ctx, '+', it.x + 280, 440, { size: 110, font: BLACK, color: '#2b1b11', a: fadeIn(t, t0 + 0.3) });
  });
  const te = atEnd('mix', '流行歌') - 0.1, ep = pop(t, te, 0.5);
  around(ctx, W / 2, 790, ep, ep, () => {
    txt(ctx, '=', W / 2 - 330, 790, { size: 110, font: BLACK, color: '#2b1b11' });
    txt(ctx, '一首全新的韩语歌', W / 2 + 60, 790, { size: 96, font: SERIF, color: '#d4482b' });
  });
}

// ---------- 3. the judges' lowest score ----------
const BARS = [0.82, 0.74, 0.9, 0.68, 0.78, 0.31];
function scoreScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  rise(ctx, '评委打分', 200, 200, t, S('low') - 0.2, { size: 84, font: SERIF, color: P.ink, align: 'left' });
  label(ctx, 'JUDGES  ·  APRIL 1992', 206, 290, P.acc, { a: fadeIn(t, S('low')) });
  const tLow = at('low', '最低分') - 0.1;
  BARS.forEach((v, i) => {
    const x = 260 + i * 240, base = 880, hgt = 480 * v * easeOut(prog(t, S('low') + i * 0.08, S('low') + 0.5 + i * 0.08));
    const me = i === BARS.length - 1;
    ctx.fillStyle = me ? P.acc2 : 'rgba(246,230,204,0.25)';
    ctx.fillRect(x, base - hgt, 150, hgt);
    txt(ctx, me ? '他们' : `选手 ${i + 1}`, x + 75, base + 50, { size: 34, font: SANS, color: me ? P.acc : 'rgba(246,230,204,0.6)' });
  });
  const sp = prog(t, tLow, tLow + 0.18);
  if (sp > 0) around(ctx, 1535, 320, lerp(2, 1, easeOut(sp)), sp, () => {
    ctx.strokeStyle = P.acc2; ctx.lineWidth = 10; ctx.strokeRect(1365, 240, 340, 160);
    txt(ctx, '全场最低', 1535, 322, { size: 82, font: SERIF, color: P.acc2 });
  }, -0.12);
}

// ---------- 4. the chart run ----------
const SONGS = ['城市之夜', '雨中旋律', '我知道', '夏日情歌', '再见初恋', '蓝色星光', '告白'];
function chartScene(ctx, t) {
  ctx.fillStyle = '#1e140c'; ctx.fillRect(0, 0, W, H);
  txt(ctx, 'K-POP CHART  1992', 160, 130, { size: 60, font: COND, color: P.acc, align: 'left', track: 6 });
  const tUp = at('chart', '冲上榜首') - 0.1, up = easeIO(prog(t, tUp, tUp + 0.9));
  const order = SONGS.map((s, i) => (s === '我知道' ? lerp(i, 0, up) : i < 2 ? lerp(i, i + 1, up) : i));
  SONGS.forEach((s, i) => {
    const y = 250 + order[i] * 92, me = s === '我知道';
    ctx.fillStyle = me ? P.acc : 'rgba(246,230,204,0.08)';
    ctx.fillRect(160, y, 760, 76);
    txt(ctx, String(Math.round(order[i]) + 1).padStart(2, '0'), 200, y + 40, { size: 44, font: COND, color: me ? '#1e140c' : P.ink, align: 'left' });
    txt(ctx, s, 300, y + 40, { size: 42, font: SANS, color: me ? '#1e140c' : P.ink, align: 'left' });
  });
  // week after week at number one
  const tW = at('chart', '一霸') - 0.1;
  txt(ctx, '每周榜首', 1060, 270, { size: 50, font: SERIF_B, color: P.ink, align: 'left', a: fadeIn(t, tW - 0.2) });
  for (let k = 0; k < 18; k++) {
    const p = pop(t, tW + k * 0.13, 0.3);
    around(ctx, 1110 + (k % 6) * 120, 400 + Math.floor(k / 6) * 140, p, p, () => {
      ctx.fillStyle = P.paper; ctx.fillRect(1060 + (k % 6) * 120, 350 + Math.floor(k / 6) * 140, 100, 110);
      txt(ctx, '#1', 1110 + (k % 6) * 120, 395 + Math.floor(k / 6) * 140, { size: 44, font: COND, color: P.acc2 });
      txt(ctx, `W${k + 1}`, 1110 + (k % 6) * 120, 440 + Math.floor(k / 6) * 140, { size: 22, font: MONO, color: '#7a4a28' });
    });
  }
}

// ---------- 5. rule #1 ----------
function ruleScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = S('rule1') - 0.1;
  ctx.save(); ctx.globalAlpha *= fadeIn(t, t0, 0.5);
  ctx.font = `620px ${COND}`; ctx.strokeStyle = P.acc; ctx.lineWidth = 4; ctx.textBaseline = 'middle';
  ctx.strokeText('01', 120, 560);
  ctx.restore();
  label(ctx, '第一条规律', 840, 300, P.acc, { a: fadeIn(t, t0) });
  rise(ctx, '借来一种外国的声音', 840, 460, t, at('rule1', '借来') - 0.1, { size: 92, font: SERIF, color: P.ink, align: 'left' });
  const ta = at('rule1', '用韩语') - 0.1;
  drawLine(ctx, [[850, 560], [850, 640]], prog(t, ta - 0.3, ta), { color: P.acc, w: 6 });
  rise(ctx, '用韩语重新唱出来', 840, 740, t, ta, { size: 92, font: SERIF, color: P.acc, align: 'left' });
  drawLine(ctx, [[840, 810], [1640, 810]], easeOut(prog(t, ta + 0.6, ta + 1.4)), { color: P.acc2, w: 8 });
}

export const scenes = [
  { id: 'year92', from: CH.c92.from, to: tRoom, draw: yearScene, cutOut: true, still: true },
  { id: 'room', from: tRoom, to: S('mix') - 0.2, draw: roomScene, cut: true, still: true },
  { id: 'recipe', from: S('mix') - 0.2, to: S('low') - 0.2, draw: recipeScene },
  { id: 'score', from: S('low') - 0.2, to: S('chart') - 0.2, draw: scoreScene },
  { id: 'chart', from: S('chart') - 0.2, to: S('rule1') - 0.2, draw: chartScene },
  { id: 'rule1', from: S('rule1') - 0.2, to: CH.c92.to, draw: ruleScene },
];

export const events = [
  { type: 'rewind', t: CH.c92.from - 0.35 },
  ...[...Array(8)].map((_, i) => ({ type: 'tick', t: CH.c92.from + 0.1 + i * 0.11, f: 2600 - i * 120, amp: 0.6 })),
  { type: 'stamp', t: CH.c92.from + 1.1, amp: 0.7 },
  { type: 'whoosh', t: at('seo', '徐太志') - 0.2, d: 0.4, amp: 0.4 },
  ...['说唱', '新杰克', '韩语'].map((w) => ({ type: 'pop', t: at('mix', w) - 0.05, f: 520 })),
  { type: 'ding', t: atEnd('mix', '流行歌'), n: 81 },
  { type: 'buzz', t: at('low', '最低分') - 0.05 },
  { type: 'stamp', t: at('low', '最低分') + 0.05, amp: 1.1 },
  { type: 'riser', t: at('chart', '冲上榜首') - 0.6, d: 0.7 },
  { type: 'ding', t: at('chart', '冲上榜首') + 0.6, n: 88 },
  ...[...Array(18)].map((_, k) => ({ type: 'tick', t: at('chart', '一霸') - 0.05 + k * 0.13, f: 1500 + k * 40, amp: 0.4 })),
  { type: 'whoosh', t: S('rule1') - 0.3, d: 0.6, amp: 0.5 },
  { type: 'stamp', t: at('rule1', '用韩语') - 0.05, amp: 0.6 },
];
