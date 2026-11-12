// Track 05 · 2020: the chart-topper, a first for Korean acts, English lyrics but K-pop at heart, the lightstick sea.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand,
  txt, around, rise, sticker, label, drawLine, rgba, SERIF, SERIF_B, SANS, COND, ITAL_B, MONO, BLACK,
} from './lib.mjs';
import { lightstick } from './props.mjs';
import { group, crowd, spotlight } from './people.mjs';

const P = ERA.c20;
const BPM = 114;

function discoBall(ctx, t, x, y, r) {
  ctx.strokeStyle = rgba(P.ink, 0.5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  for (let row = -8; row < 8; row++) for (let c = -10; c < 10; c++) {
    const lat = (row + 0.5) / 8, w = Math.sqrt(Math.max(0, 1 - lat * lat)) * r;
    const lon = (c / 10) * Math.PI + t * 0.8;
    if (Math.cos(lon) < 0) continue;
    const xx = x + Math.sin(lon) * w, yy = y + lat * r;
    const b = 0.3 + 0.7 * Math.abs(Math.sin(row * 3.1 + c * 1.7 + t * 4));
    ctx.fillStyle = `rgba(${Math.round(180 + 75 * b)},${Math.round(160 + 80 * b)},255,${0.5 + 0.5 * b})`;
    ctx.fillRect(xx - 7 * Math.cos(lon), yy - 6, 14 * Math.cos(lon), 12);
  }
  ctx.restore();
}

// ---------- 1. number one ----------
const ROWS = ['', '', '', '', ''];
function chartScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  discoBall(ctx, t, 1640, 260, 130);
  const t0 = CH.c20.from + 0.1;
  txt(ctx, '2020', 120, 210, { size: 200, font: COND, color: P.acc, align: 'left', a: fadeIn(t, t0, 0.2) });
  rise(ctx, '美国公告牌单曲榜', 130, 360, t, at('bts', '公告牌') - 0.2, { size: 56, font: SERIF_B, color: P.ink, align: 'left' });
  const tIn = at('bts', 'Dynamite') - 0.15, tTop = at('bts', '第一名') - 0.25;
  const climb = easeIO(prog(t, tTop - 0.2, tTop + 0.6));
  ROWS.forEach((_, i) => {
    const y = 450 + (i + climb) * 80;
    ctx.fillStyle = rgba(P.ink, 0.07); ctx.fillRect(130, y, 1000, 64);
    txt(ctx, String(i + 1 + Math.round(climb)), 180, y + 34, { size: 38, font: COND, color: rgba(P.ink, 0.5) });
    ctx.fillStyle = rgba(P.ink, 0.18); ctx.fillRect(250, y + 22, 280 + rand(i) * 300, 20);
  });
  const ip = easeOut(prog(t, tIn, tIn + 0.4));
  if (ip > 0) {
    const y = lerp(450 + 5.4 * 80, 450, climb);
    ctx.save(); ctx.globalAlpha *= ip;
    ctx.fillStyle = climb >= 1 ? P.acc2 : P.acc; ctx.fillRect(130, y, 1000, 64);
    txt(ctx, climb >= 1 ? '1' : '↑', 180, y + 34, { size: 40, font: COND, color: P.bg });
    txt(ctx, 'Dynamite', 250, y + 34, { size: 40, font: ITAL_B, color: P.bg, align: 'left' });
    txt(ctx, '防弹少年团', 1100, y + 34, { size: 32, font: SANS, color: P.bg, align: 'right' });
    ctx.restore();
  }
  const sp = pop(t, tTop + 0.6, 0.4);
  around(ctx, 1500, 560, sp, sp, () => {
    txt(ctx, '#1', 1500, 560, { size: 260, font: COND, color: P.acc2 });
    label(ctx, 'HOT 100  ·  2020', 1500, 720, P.ink, { align: 'center' });
  }, 0.06);
}

// ---------- 2. a first ----------
function firstScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 520); ctx.rotate(t * 0.15);
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.fillStyle = rgba(P.acc, i % 2 ? 0.06 : 0.12);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1200); ctx.lineTo(90, -1200); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const t0 = S('first') - 0.1;
  rise(ctx, '韩国歌手', W / 2, 250, t, at('first', '韩国歌手') - 0.1, { size: 80, font: SERIF, color: P.ink });
  const fp = pop(t, at('first', '第一次') - 0.1, 0.5);
  around(ctx, W / 2, 520, fp, fp, () => {
    txt(ctx, '第一次', W / 2, 520, { size: 250, font: SERIF, color: P.acc2 });
  });
  rise(ctx, '拿下单曲榜冠军', W / 2, 780, t, at('first', '冠军') - 0.4, { size: 80, font: SERIF, color: P.ink });
  // gold confetti
  const tc = at('first', '第一次');
  for (let i = 0; i < 90; i++) {
    const d = t - tc - rand(i) * 0.4;
    if (d < 0) continue;
    const x = W / 2 + (rand(i + 7) - 0.5) * 2200 * Math.min(1, d * 1.5), y = -40 + d * (180 + rand(i + 3) * 260) + Math.sin(d * 3 + i) * 20;
    if (y > H) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d * 5 + i);
    ctx.fillStyle = i % 3 ? P.acc2 : P.acc; ctx.fillRect(-8, -4, 16, 8);
    ctx.restore();
  }
}

// ---------- 3. English lyrics, K-pop machinery ----------
const CHECKS = [['舞台', 'STAGE'], ['粉丝', 'FANDOM'], ['打榜', 'STREAMING']];
function englishScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  spotlight(ctx, W / 2, -20, 1400, 1000, 'rgba(176,124,255,A)', 0.18);
  const te = at('english', '英文') - 0.2, ep = pop(t, te, 0.4);
  around(ctx, 480, 380, ep, ep, () => {
    ctx.fillStyle = P.paper; ctx.beginPath(); ctx.roundRect(170, 190, 620, 380, 20); ctx.fill();
    txt(ctx, 'LYRICS', 210, 240, { size: 26, font: MONO, color: P.acc, align: 'left', track: 4 });
    for (let k = 0; k < 6; k++) { ctx.fillStyle = rgba(P.ink, 0.25); ctx.fillRect(210, 290 + k * 40, 380 + rand(k + 4) * 160, 14); }
    txt(ctx, '100% 英文', 480, 535, { size: 46, font: SERIF_B, color: P.acc2 });
  }, -0.04);
  CHECKS.forEach(([zh, en], i) => {
    const tw = at('english', zh) - 0.1, p = fadeIn(t, tw, 0.25);
    const y = 250 + i * 120;
    ctx.save(); ctx.globalAlpha *= 0.3 + 0.7 * p;
    ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.strokeRect(1040, y - 30, 60, 60);
    if (p > 0) drawLine(ctx, [[1052, y], [1066, y + 16], [1092, y - 18]], easeOut(prog(t, tw, tw + 0.3)), { color: P.acc2, w: 9 });
    txt(ctx, zh, 1140, y, { size: 64, font: SERIF, color: P.ink, align: 'left' });
    txt(ctx, en, 1310, y + 6, { size: 28, font: MONO, color: P.acc, align: 'left', track: 4 });
    ctx.restore();
  });
  const tk = at('english', '地道') - 0.1, kp = prog(t, tk, tk + 0.2);
  if (kp > 0) around(ctx, 1320, 620, lerp(2, 1, easeOut(kp)), kp, () => {
    ctx.strokeStyle = P.acc2; ctx.lineWidth = 8; ctx.strokeRect(1080, 565, 480, 110);
    txt(ctx, '地道的 K-POP', 1320, 622, { size: 62, font: SERIF, color: P.acc2 });
  }, -0.06);
  group(ctx, t, W / 2, 940, 1300, 7, 0.45, { bpm: BPM, poses: ['point', 'hips', 'armsUp', 'step'], color: '#0d0620', rim: P.acc, hairs: ['short'] });
}

// ---------- 4. the lightstick sea ----------
const STICKS = [...Array(260)].map((_, i) => {
  const row = Math.floor(rand(i * 3) ** 1.6 * 9);
  return { x: rand(i * 5 + 1) * (W + 200) - 100, row, ph: rand(i + 9) * 6.28, c: rand(i + 21) < 0.85 ? '#b07cff' : '#ffd166' };
});
function fansScene(ctx, t) {
  ctx.fillStyle = '#0c0618'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1f1340'; ctx.fillRect(560, 260, 800, 180);
  for (let i = 0; i < 4; i++) spotlight(ctx, 700 + i * 170, 250, 260, 500, 'rgba(255,209,102,A)', 0.12);
  group(ctx, t, W / 2, 430, 420, 7, 0.32, { bpm: BPM, poses: ['armsUp', 'point'], color: '#05020a', rim: P.acc2 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of STICKS.slice().sort((a, b) => a.row - b.row)) {
    const sc = 0.35 + s.row * 0.11, y = 520 + s.row * 52;
    const rot = Math.sin(((t * BPM) / 60) * Math.PI + s.ph * 0.3) * 0.35;
    lightstick(ctx, s.x, y, sc, rot, s.c, 0.9);
  }
  ctx.restore();
  crowd(ctx, t, 930, 2, { color: '#030106', bounce: 1, bpm: BPM });
  const tl = at('fans', '应援棒') - 0.1;
  rise(ctx, '应援棒', 140, 170, t, tl, { size: 110, font: SERIF, color: P.ink, align: 'left' });
  label(ctx, 'LIGHTSTICK  ·  FANDOM', 150, 260, P.acc2, { a: fadeIn(t, tl + 0.3) });
  const tz = at('fans', '最重要的零件') - 0.1, zp = pop(t, tz, 0.5);
  around(ctx, 1560, 200, zp, zp, () => {
    ctx.save(); ctx.translate(1560, 200); ctx.rotate(t * 0.8);
    ctx.fillStyle = P.acc2;
    for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-16, -120, 32, 40); }
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c0618'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    lightstick(ctx, 1560, 220, 0.9, 0, P.acc, 1);
    txt(ctx, '最重要的零件', 1560, 380, { size: 50, font: SERIF_B, color: P.acc2 });
  });
}

export const scenes = [
  { id: 'chart20', from: CH.c20.from, to: S('first') - 0.2, draw: chartScene, cut: true },
  { id: 'first', from: S('first') - 0.2, to: S('english') - 0.2, draw: firstScene, still: true },
  { id: 'english', from: S('english') - 0.2, to: S('fans') - 0.2, draw: englishScene },
  { id: 'fans', from: S('fans') - 0.2, to: CH.c20.to, draw: fansScene },
];

export const events = [
  { type: 'rewind', t: CH.c20.from - 0.35 },
  { type: 'stamp', t: CH.c20.from + 0.1, amp: 0.6 },
  { type: 'whoosh', t: at('bts', 'Dynamite') - 0.15, d: 0.4, amp: 0.4 },
  { type: 'riser', t: at('bts', '第一名') - 0.45, d: 0.6 },
  { type: 'boom', t: at('bts', '第一名') + 0.35, amp: 0.7 },
  { type: 'ding', t: at('first', '第一次') - 0.05, n: 91 },
  { type: 'cheer', t: at('first', '第一次'), d: 2.5, amp: 0.7 },
  { type: 'pop', t: at('english', '英文') - 0.2, f: 600 },
  ...CHECKS.map(([zh]) => ({ type: 'tick', t: at('english', zh) - 0.05, f: 2000, amp: 0.6 })),
  { type: 'stamp', t: at('english', '地道') - 0.05, amp: 0.9 },
  { type: 'cheer', t: S('fans') - 0.1, d: 4.5, amp: 0.9 },
  { type: 'click', t: at('fans', '最重要的零件') - 0.05 },
];
