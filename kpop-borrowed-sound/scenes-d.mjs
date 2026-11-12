// Track 03 · 2007–2009: the hook song, repetition, the three singles, and songwriters from abroad.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand, beat,
  txt, around, rise, sticker, label, drawLine, measure, rgba, SERIF, SERIF_B, SANS, COND, ITAL, ITAL_B, MONO, BLACK,
} from './lib.mjs';
import { eqBars } from './props.mjs';
import { figure, pose, group } from './people.mjs';

const P = ERA.c07;
const BPM = 128;

function dots(ctx, t, color = 'rgba(255,47,134,0.10)') {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color;
  for (let y = 30; y < H; y += 60) for (let x = (y / 60) % 2 ? 30 : 60; x < W; x += 60) {
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- 1. the new weapon: the hook ----------
function hookScene(ctx, t) {
  dots(ctx, t);
  const t0 = CH.c07.from + 0.15;
  txt(ctx, '2007', 160, 220, { size: 200, font: COND, color: P.acc, align: 'left', a: fadeIn(t, t0, 0.2) });
  rise(ctx, '一件新武器', 170, 400, t, at('hook', '新武器') - 0.15, { size: 84, font: SERIF, color: P.ink, align: 'left' });
  // the hook swings in from the top
  const th = at('hook', '洗脑副歌') - 0.2;
  const drop = easeOut(prog(t, th - 0.6, th + 0.2));
  const sw = Math.sin((t - th) * 3) * 0.18 * Math.exp(-Math.max(0, t - th) * 0.8);
  ctx.save();
  ctx.translate(1380, -40); ctx.rotate(sw);
  ctx.strokeStyle = P.ink; ctx.lineWidth = 6;
  const L = lerp(0, 520, drop);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L); ctx.stroke();
  ctx.strokeStyle = P.acc; ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, L); ctx.lineTo(0, L + 200); ctx.arc(-80, L + 200, 80, 0, Math.PI * 0.95); ctx.stroke();
  ctx.fillStyle = P.acc; ctx.beginPath(); ctx.moveTo(-176, L + 200); ctx.lineTo(-150, L + 120); ctx.lineTo(-136, L + 214); ctx.closePath(); ctx.fill();
  ctx.restore();
  const tp = pop(t, th, 0.45);
  around(ctx, 640, 690, tp, tp, () => {
    txt(ctx, '洗脑副歌', 640, 690, { size: 190, font: SERIF, color: P.acc });
    txt(ctx, 'THE HOOK', 640, 850, { size: 72, font: COND, color: P.acc2, track: 16 });
  }, -0.03);
}

// ---------- 2. one word, one move, on repeat ----------
function repeatScene(ctx, t) {
  dots(ctx, t);
  const tw = at('repeat', '短短的词') - 0.1, tm = at('repeat', '简单的动作') - 0.1;
  const tr = at('repeat', '反复出现') - 0.1, tf = at('repeat', '忘不掉') - 0.1;
  const up = easeIO(prog(t, tr - 0.2, tr + 0.4));
  const wp = pop(t, tw, 0.4);
  around(ctx, 520, lerp(430, 260, up), wp * lerp(1, 0.7, up), wp, () => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(300, 330, 440, 200, 100); ctx.fill();
    txt(ctx, '一个词', 520, 430, { size: 90, font: SERIF, color: P.acc });
  });
  const mp = pop(t, tm, 0.4);
  around(ctx, 1380, lerp(470, 280, up), mp * lerp(1, 0.6, up), mp, () => {
    ctx.fillStyle = P.acc2; ctx.beginPath(); ctx.arc(1380, 430, 230, 0, Math.PI * 2); ctx.fill();
    const k = 0.5 - 0.5 * Math.cos((t * BPM) / 60 * Math.PI);
    figure(ctx, 1380, 640, 0.7, pose('point', 'wave', k), { color: '#fff' });
    txt(ctx, '一个动作', 1380, 720, { size: 60, font: SERIF, color: P.ink });
  });
  // a song timeline where the chorus keeps coming back
  if (t > tr - 0.2) {
    const parts = ['C', 'V', 'C', 'V', 'C', 'B', 'C', 'C'];
    const x0 = 110, wseg = 190;
    parts.forEach((p, i) => {
      const a = fadeIn(t, tr + i * 0.12, 0.2);
      const isC = p === 'C';
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = isC ? P.acc : rgba(P.ink, 0.15);
      ctx.beginPath(); ctx.roundRect(x0 + i * wseg, 600, wseg - 14, 150, 18); ctx.fill();
      txt(ctx, isC ? '副歌' : p === 'V' ? '主歌' : '桥段', x0 + i * wseg + (wseg - 14) / 2, 675, { size: 44, font: SANS, color: isC ? '#fff' : P.ink });
      ctx.restore();
    });
    const head = x0 + ((t - tr) / (tf + 1 - tr)) * wseg * 8;
    ctx.fillStyle = P.ink; ctx.fillRect(Math.min(head, x0 + wseg * 8), 580, 6, 190);
    const n = parts.filter((p, i) => p === 'C' && x0 + i * wseg < head).length;
    if (n) txt(ctx, `×${n}`, 1750, 675, { size: 90, font: COND, color: P.acc2 });
  }
  const fp = pop(t, tf, 0.4);
  around(ctx, W / 2, 835, fp, fp, () => sticker(ctx, '听一遍就忘不掉', W / 2, 835, { fill: P.ink, color: '#fff', font: SERIF, size: 50, rot: -0.03 }));
}

// ---------- 3. three singles, and your hands already know the moves ----------
const SINGLES = [
  { w: 'Tell', title: 'Tell Me', by: 'Wonder Girls', year: '2007', bg: '#ff2f86', fg: '#fff' },
  { w: 'Gee', title: 'Gee', by: '少女时代', year: '2009', bg: '#ffffff', fg: '#ff2f86' },
  { w: 'Sorry', title: 'Sorry, Sorry', by: 'Super Junior', year: '2009', bg: '#2a0f2e', fg: '#f6cfe0' },
];
function cover(ctx, t, s, i, x, y) {
  ctx.fillStyle = 'rgba(42,15,46,0.25)'; ctx.fillRect(x - 200 + 12, y - 200 + 16, 400, 400);
  ctx.fillStyle = s.bg; ctx.fillRect(x - 200, y - 200, 400, 400);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 200, y - 200, 400, 400); ctx.clip();
  if (i === 0) for (let k = 0; k < 7; k++) { ctx.fillStyle = rgba('#ffffff', 0.12); ctx.beginPath(); ctx.arc(x + 120, y - 90, 40 + k * 45, 0, Math.PI * 2); ctx.fill(); }
  if (i === 1) for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? '#ff2f86' : '#6d4cff'; ctx.fillRect(x - 200 + k * 40, y + 110, 40, 90); }
  if (i === 2) { ctx.strokeStyle = '#ff2f86'; ctx.lineWidth = 8; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - 220, y - 160 + k * 60); ctx.lineTo(x + 220, y - 220 + k * 60); ctx.stroke(); } }
  ctx.restore();
  txt(ctx, s.title, x, y - 10, { size: s.title.length > 6 ? 54 : 92, font: ITAL_B, color: s.fg });
  txt(ctx, s.by, x, y + 60, { size: 30, font: SANS, color: s.fg });
  txt(ctx, s.year, x - 180, y - 170, { size: 28, font: MONO, color: s.fg, align: 'left' });
}
function singlesScene(ctx, t) {
  dots(ctx, t);
  const tHands = at('titles', '手已经') - 0.2;
  const lift = easeIO(prog(t, tHands - 0.3, tHands + 0.4));
  SINGLES.forEach((s, i) => {
    const tw = at('titles', s.w) - 0.15, p = pop(t, tw, 0.45);
    const x = 420 + i * 540, y = lerp(470, 300, lift);
    around(ctx, x, y, p * lerp(1, 0.62, lift), p, () => cover(ctx, t, s, i, x, y), (i - 1) * 0.05);
  });
  const gp = fadeIn(t, tHands, 0.4);
  if (gp > 0) {
    ctx.save(); ctx.globalAlpha *= gp;
    group(ctx, t, W / 2, 900, 1100, 5, 0.85, { bpm: BPM, poses: ['point', 'wave', 'hips', 'cross'], color: P.ink, rim: P.acc, hairs: ['long', 'pony', 'short'] });
    ctx.restore();
  }
}

// ---------- 4. written abroad, rebuilt in Seoul ----------
const DEMOS = [['DEMO · EUROPE', '欧洲', 260], ['DEMO · USA', '美国', 560]];
function writersScene(ctx, t) {
  dots(ctx, t, 'rgba(109,76,255,0.08)');
  DEMOS.forEach(([lab, w, y], i) => {
    const tw = at('writers', w) - 0.2, p = easeOut(prog(t, tw, tw + 0.5));
    const x = lerp(-300, 330, p);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.05 + i * 0.08);
    ctx.fillStyle = 'rgba(42,15,46,0.2)'; ctx.fillRect(-190, -90, 400, 210);
    ctx.fillStyle = '#fff'; ctx.fillRect(-200, -105, 400, 210);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = rgba(P.ink, 0.25); ctx.fillRect(-170, -40 + k * 22, 340, 2); }
    for (let k = 0; k < 9; k++) { ctx.fillStyle = P.ink; ctx.beginPath(); ctx.ellipse(-150 + k * 36, -40 + ((k * 37) % 5) * 22, 10, 7, -0.4, 0, Math.PI * 2); ctx.fill(); }
    txt(ctx, lab, 0, 75, { size: 26, font: MONO, color: P.acc2, track: 3 });
    txt(ctx, `${w}作曲人`, 0, -75, { size: 30, font: SANS, color: P.ink });
    ctx.restore();
    drawLine(ctx, [[560, y + 10 * i], [880, y + 10 * i], [1000, 520]], prog(t, tw + 0.4, tw + 1.0), { color: P.acc2, w: 5, dash: [14, 12] });
  });
  // the Seoul studio console
  const ts = at('writers', '首尔') - 0.2, sp = fadeIn(t, ts, 0.4);
  ctx.save(); ctx.globalAlpha *= 0.25 + 0.75 * sp;
  ctx.fillStyle = P.ink; ctx.beginPath(); ctx.roundRect(1000, 330, 800, 470, 24); ctx.fill();
  eqBars(ctx, t, 1040, 520, 720, 150, 24, P.acc, { bpm: BPM, seed: 5 });
  for (let k = 0; k < 10; k++) {
    const fx = 1060 + k * 70, fy = 640 + Math.sin(t * 2 + k) * 30 * sp;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(fx - 3, 590, 6, 160);
    ctx.fillStyle = k % 3 ? '#f6cfe0' : P.acc; ctx.fillRect(fx - 18, fy, 36, 22);
  }
  txt(ctx, 'SEOUL STUDIO', 1400, 380, { size: 34, font: MONO, color: '#f6cfe0', track: 6 });
  ctx.restore();
  const tr = at('writers', '重新组装') - 0.1, rp = pop(t, tr, 0.45);
  around(ctx, 1400, 900, rp, rp, () => sticker(ctx, '在首尔重新组装', 1400, 900, { fill: P.acc, color: '#fff', font: SERIF, size: 54, rot: 0.03 }));
}

export const scenes = [
  { id: 'hook', from: CH.c07.from, to: S('repeat') - 0.2, draw: hookScene, cut: true },
  { id: 'repeat', from: S('repeat') - 0.2, to: S('titles') - 0.2, draw: repeatScene },
  { id: 'singles', from: S('titles') - 0.2, to: S('writers') - 0.2, draw: singlesScene },
  { id: 'writers', from: S('writers') - 0.2, to: CH.c07.to, draw: writersScene },
];

export const events = [
  { type: 'rewind', t: CH.c07.from - 0.35 },
  { type: 'stamp', t: CH.c07.from + 0.15, amp: 0.6 },
  { type: 'whoosh', t: at('hook', '洗脑副歌') - 0.8, d: 0.8, from: 2000, to: 400, amp: 0.5 },
  { type: 'ding', t: at('hook', '洗脑副歌'), n: 88 },
  { type: 'pop', t: at('repeat', '短短的词') - 0.1, f: 800 },
  { type: 'pop', t: at('repeat', '简单的动作') - 0.1, f: 900 },
  ...[0, 2, 4, 6, 7].map((i) => ({ type: 'tick', t: at('repeat', '反复出现') - 0.1 + i * 0.12, f: 2400, amp: 0.4 })),
  { type: 'pop', t: at('repeat', '忘不掉') - 0.1, f: 650 },
  ...SINGLES.map((s) => ({ type: 'stamp', t: at('titles', s.w) - 0.1, amp: 0.5, flash: s.w === 'Gee' ? '255,255,255' : undefined, peak: 0.35 })),
  { type: 'whoosh', t: at('titles', '手已经') - 0.3, d: 0.6, amp: 0.4 },
  ...DEMOS.map(([, w]) => ({ type: 'whoosh', t: at('writers', w) - 0.2, d: 0.5, from: 600, to: 2500, amp: 0.4 })),
  { type: 'click', t: at('writers', '首尔') - 0.15 },
  { type: 'pop', t: at('writers', '重新组装') - 0.05, f: 700 },
];
