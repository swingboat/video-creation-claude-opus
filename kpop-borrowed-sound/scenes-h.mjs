// Bonus track and B-side: the method (take → take apart → rebuild), the K-pop machine, the flip and the end card.
import {
  W, H, ERA, S, E, at, atEnd, CH, DURATION, prog, lerp, easeIO, easeOut, pop, fadeIn, rand,
  txt, around, rise, sticker, label, drawLine, rgba, measure, SERIF, SERIF_B, SANS, SANS_R, COND, ITAL, MONO, BLACK,
} from './lib.mjs';
import { cassette } from './props.mjs';

const P = ERA.method, O = ERA.outro;
const ERAS = ['c92', 'c96', 'c07', 'c12', 'c20', 'cnow'];
const GENRE = { c92: 'NEW JACK SWING', c96: 'DANCE POP', c07: 'ELECTROPOP', c12: 'ELECTRO HOUSE', c20: 'DISCO', cnow: 'JERSEY CLUB' };

// ---------- 1. thirty years, no single genre ----------
function secretScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = at('secret', '三十年') - 0.2, tx = at('secret', '某一种曲风') - 0.1;
  ERAS.forEach((k, i) => {
    const e = ERA[k], p = easeOut(prog(t, t0 + i * 0.1, t0 + 0.5 + i * 0.1));
    const y = 180 + i * 110, x = lerp(-W, 0, p);
    ctx.fillStyle = k === 'c12' ? '#1d1d20' : e.bg;
    ctx.fillRect(x + 120, y, 1680, 92);
    ctx.fillStyle = e.acc; ctx.fillRect(x + 120, y, 14, 92);
    txt(ctx, e.year, x + 170, y + 48, { size: 56, font: COND, color: e.acc, align: 'left' });
    txt(ctx, GENRE[k], x + 420, y + 48, { size: 44, font: COND, color: e.ink, align: 'left', track: 4 });
    drawLine(ctx, [[x + 400, y + 48], [x + 440 + measure(ctx, GENRE[k], 44, COND, 4), y + 48]], easeOut(prog(t, tx + i * 0.08, tx + 0.3 + i * 0.08)), { color: P.acc2, w: 8 });
  });
  const sp = pop(t, at('secret', '秘密') - 0.1, 0.45);
  around(ctx, 1500, 500, sp, sp, () => sticker(ctx, '秘密是？', 1500, 500, { fill: P.acc, color: '#111', font: SERIF, size: 80, rot: 0.06 }));
}

// ---------- 2. the method ----------
const STEPS = [['拿来', 'TAKE', '#ffd23f'], ['拆开', 'TAKE APART', '#ff4f1f'], ['重新组装', 'REBUILD', '#b07cff']];
function methodScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  rise(ctx, '一套方法', W / 2, 170, t, at('method', '一套方法') - 0.15, { size: 90, font: SERIF, color: P.ink });
  STEPS.forEach(([zh, en, color], i) => {
    const x = 400 + i * 560, y = 560, tw = at('method', zh) - 0.15, p = pop(t, tw, 0.45);
    if (i < 2) drawLine(ctx, [[x + 200, y], [x + 340, y]], prog(t, tw + 0.3, tw + 0.6), { color: rgba(P.ink, 0.5), w: 6 });
    around(ctx, x, y, p, p, () => {
      const d = t - tw;
      if (i === 1) {
        for (let q = 0; q < 4; q++) {
          const a = (q * Math.PI) / 2 + Math.PI / 4, off = Math.min(1, Math.max(0, d - 0.2) * 2) * 40;
          ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * off, y + Math.sin(a) * off);
          ctx.arc(x + Math.cos(a) * off, y + Math.sin(a) * off, 190, a - Math.PI / 4, a + Math.PI / 4); ctx.closePath(); ctx.fill();
        }
      } else if (i === 2) {
        const cols = ['#ffd23f', '#ff4f1f', '#58c9bf', '#b07cff'];
        for (let q = 0; q < 4; q++) {
          const a = (q * Math.PI) / 2 + Math.PI / 4, off = (1 - easeOut(prog(d, 0.1, 0.6))) * 120;
          ctx.fillStyle = cols[q]; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * off, y + Math.sin(a) * off);
          ctx.arc(x + Math.cos(a) * off, y + Math.sin(a) * off, 190, a - Math.PI / 4, a + Math.PI / 4); ctx.closePath(); ctx.fill();
        }
      } else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 190, 0, Math.PI * 2); ctx.fill(); }
      const pw = zh.length * 70 + 60;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(x - pw / 2, y - 60, pw, 100, 14); ctx.fill();
      txt(ctx, zh, x, y - 10, { size: zh.length > 2 ? 64 : 80, font: SERIF, color });
      txt(ctx, en, x, y + 250, { size: 36, font: COND, color, track: 5 });
    });
  });
}

// ---------- 3. the K-pop machine ----------
const INPUTS = [['说唱', '#e9b872'], ['迪斯科', '#b07cff'], ['电子', '#ff2f86'], ['R&B', '#58c9bf']];
function gear(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
  for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-r * 0.16, -r * 1.25, r * 0.32, r * 0.4); }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function machineScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const tm = at('machine', '这台机器') - 0.1, tOut = at('machine', '出来的') - 0.1, tK = at('machine', 'K-pop') - 0.1;
  const run = t > tm ? 1 : 0, shake = run * (t < tK + 0.5 ? Math.sin(t * 60) * 3 : 0);
  ctx.save(); ctx.translate(shake, 0);
  // funnel + body
  ctx.fillStyle = '#3a3a42';
  ctx.beginPath(); ctx.moveTo(560, 200); ctx.lineTo(1000, 200); ctx.lineTo(850, 380); ctx.lineTo(710, 380); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.roundRect(520, 380, 640, 470, 30); ctx.fill();
  gear(ctx, 700, 560, 80, t * 2 * run, P.acc);
  gear(ctx, 850, 650, 60, -t * 2.6 * run + 0.3, P.acc2);
  gear(ctx, 980, 540, 50, t * 3.2 * run, '#b07cff');
  for (let k = 0; k < 5; k++) { ctx.fillStyle = run && Math.sin(t * 10 + k) > 0 ? '#3ddc97' : '#45454f'; ctx.beginPath(); ctx.arc(600 + k * 40, 800, 10, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#111'; ctx.fillRect(1160, 700, 70, 110);
  ctx.restore();
  // genre chips drop into the funnel
  INPUTS.forEach(([s, fill], i) => {
    const tw = at('machine', s) - 0.1, d = t - tw;
    if (d < 0) return;
    const fall = Math.min(1, d / 0.7), y = lerp(-60, 330, fall * fall), x = lerp(500 + i * 180, 780, fall);
    sticker(ctx, s, x, y, { fill, color: '#111', font: SERIF, size: 48, sc: lerp(1, 0.4, fall), a: 1 - prog(d, 0.6, 0.75), rot: d * 2 * (i % 2 ? 1 : -1) });
  });
  // out comes a K-POP tape
  const op = easeOut(prog(t, tOut, tOut + 0.9));
  if (op > 0) cassette(ctx, t, lerp(1180, 1560, op), 760, 0.5, { title: 'K-POP', stripe: P.acc, stripe2: P.acc2, spin: 0.4 });
  const kp = pop(t, tK, 0.5);
  around(ctx, 1500, 330, kp, kp, () => {
    txt(ctx, 'K-POP', 1500, 330, { size: 220, font: COND, color: P.acc, track: 10 });
    label(ctx, 'TAKE  ·  TAKE APART  ·  REBUILD', 1500, 470, P.ink, { align: 'center', size: 22 });
  });
  for (let i = 0; i < 70; i++) {
    const d = t - tK - rand(i) * 0.3;
    if (d < 0) continue;
    const a = rand(i + 3) * Math.PI * 2, v = 400 + rand(i + 5) * 700;
    const x = 1500 + Math.cos(a) * v * d, y = 330 + Math.sin(a) * v * d + 500 * d * d;
    if (y > H) continue;
    ctx.fillStyle = ERA[ERAS[i % 6]].acc; ctx.fillRect(x - 7, y - 7, 14, 14);
  }
}

// ---------- 4. flip to side B ----------
function flipScene(ctx, t) {
  ctx.fillStyle = O.bg; ctx.fillRect(0, 0, W, H);
  const tf = at('bside', '翻到') - 0.1, tb = at('bside', 'B面');
  const p = easeIO(prog(t, tf, tb + 0.1));
  const sx = Math.cos(p * Math.PI);
  ctx.save(); ctx.translate(W / 2, 520); ctx.scale(Math.abs(sx) * 1.5, 1.5); ctx.translate(-W / 2, -520);
  cassette(ctx, t, W / 2, 520, 1, { side: p > 0.5 ? 'B' : 'A', title: p > 0.5 ? 'NEXT — ?' : 'K-POP  1992 — NOW', spin: 0.6, wound: p > 0.5 ? 0.9 : 0.1 });
  ctx.restore();
  label(ctx, p > 0.5 ? 'SIDE B' : 'SIDE A', W / 2, 900, O.acc, { align: 'center' });
}

// ---------- 5. your playlist + credits ----------
function endScene(ctx, t) {
  ctx.fillStyle = O.bg; ctx.fillRect(0, 0, W, H);
  const t0 = S('next') - 0.1;
  rise(ctx, '下一种被借来的声音', 160, 260, t, t0, { size: 96, font: SERIF, color: O.ink, align: 'left' });
  rise(ctx, '也许正藏在你的播放列表里', 166, 380, t, at('next', '也许') - 0.1, { size: 54, font: ITAL, color: O.acc, align: 'left' });
  const lp = easeOut(prog(t, at('next', '播放列表') - 0.3, at('next', '播放列表') + 0.4));
  ctx.save(); ctx.globalAlpha *= lp; ctx.translate(lerp(80, 0, lp), 0);
  ctx.fillStyle = O.paper; ctx.beginPath(); ctx.roundRect(1160, 180, 600, 560, 22); ctx.fill();
  txt(ctx, 'MY PLAYLIST', 1200, 230, { size: 24, font: MONO, color: '#7a5a3a', align: 'left', track: 4 });
  for (let k = 0; k < 5; k++) {
    const y = 300 + k * 84, cur = k === 4;
    ctx.fillStyle = cur ? O.acc2 : 'rgba(60,40,20,0.08)'; ctx.fillRect(1190, y - 32, 540, 66);
    txt(ctx, `0${k + 1}`, 1220, y, { size: 30, font: COND, color: cur ? '#fff' : '#7a5a3a', align: 'left' });
    if (cur) txt(ctx, Math.floor(t * 2) % 2 ? '下一首  ?' : '下一首  _', 1290, y, { size: 32, font: SANS, color: '#fff', align: 'left' });
    else { ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(1290, y - 8, 200 + rand(k) * 220, 16); }
  }
  ctx.restore();
  const tc = E('next') + 0.6, cp = fadeIn(t, tc, 0.6);
  if (cp > 0) {
    ctx.save(); ctx.globalAlpha *= cp;
    ctx.fillStyle = rgba(O.bg, 0.97); ctx.fillRect(0, 0, W, H);
    txt(ctx, '借来的声音', W / 2, 380, { size: 150, font: SERIF, color: O.ink });
    txt(ctx, 'Borrowed Sounds — thirty years of K-pop', W / 2, 500, { size: 44, font: ITAL, color: O.acc });
    ['旁白  微软 Edge 神经语音 · 晓晓', '画面与音乐  代码生成；1992 电视画面为 AI 生成的示意图（ChatGPT）', '灵感  @ameliax111 分享的 Manus K-pop 短片'].forEach((s, i) =>
      txt(ctx, s, W / 2, 640 + i * 56, { size: 30, font: SANS_R, color: rgba(O.ink, 0.75) }));
    ctx.restore();
  }
}

export const scenes = [
  { id: 'secret', from: CH.method.from, to: S('method') - 0.2, draw: secretScene, cut: true },
  { id: 'method', from: S('method') - 0.2, to: S('machine') - 0.2, draw: methodScene },
  { id: 'machine', from: S('machine') - 0.2, to: CH.outro.from, draw: machineScene },
  { id: 'flip', from: CH.outro.from, to: S('next') - 0.2, draw: flipScene, cut: true },
  { id: 'end', from: S('next') - 0.2, to: DURATION + 1, draw: endScene, still: true },
];

export const events = [
  { type: 'rewind', t: CH.method.from - 0.35 },
  ...ERAS.map((_, i) => ({ type: 'whoosh', t: at('secret', '三十年') - 0.2 + i * 0.1, d: 0.3, from: 800, to: 3000, amp: 0.25 })),
  { type: 'pop', t: at('secret', '秘密') - 0.1, f: 500 },
  ...ERAS.map((_, i) => ({ type: 'tick', t: at('secret', '某一种曲风') + i * 0.08, f: 1400, amp: 0.4 })),
  ...STEPS.map(([zh], i) => ({ type: i === 2 ? 'stamp' : 'pop', t: at('method', zh) - 0.15, f: 600 + i * 150, amp: 0.8 })),
  ...INPUTS.map(([s]) => ({ type: 'whoosh', t: at('machine', s) - 0.1, d: 0.6, from: 3000, to: 500, amp: 0.35 })),
  { type: 'click', t: at('machine', '这台机器') - 0.1 },
  { type: 'whoosh', t: at('machine', '出来的') - 0.1, d: 0.8, amp: 0.4 },
  { type: 'boom', t: at('machine', 'K-pop') - 0.1, amp: 0.8, flash: true, peak: 0.4 },
  { type: 'click', t: at('bside', '翻到') - 0.15 },
  { type: 'whoosh', t: at('bside', '翻到') - 0.05, d: 0.6, amp: 0.4 },
  { type: 'click', t: at('bside', 'B面') + 0.15 },
  { type: 'ding', t: E('next') + 0.6, n: 79, amp: 0.6 },
];
