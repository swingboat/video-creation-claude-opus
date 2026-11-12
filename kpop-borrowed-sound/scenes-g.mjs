// Track 06 · now: one song, several genres; and new groups borrowing Jersey club and Y2K drums.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand,
  txt, around, rise, sticker, label, drawLine, rgba, SERIF, SERIF_B, SANS, COND, ITAL, ITAL_B, MONO, BLACK,
} from './lib.mjs';
import { group } from './people.mjs';

const P = ERA.cnow;

function grid(ctx) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(P.acc, 0.08); ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function phone(ctx, t, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(12,33,64,0.18)'; ctx.beginPath(); ctx.roundRect(-190, -370, 400, 760, 60); ctx.fill();
  ctx.fillStyle = P.ink; ctx.beginPath(); ctx.roundRect(-200, -380, 400, 760, 60); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-182, -362, 364, 724, 46); ctx.fill();
  txt(ctx, 'NOW PLAYING', 0, -300, { size: 22, font: MONO, color: P.acc, track: 4 });
  ctx.save(); ctx.translate(0, -90); ctx.rotate(t * 0.6);
  const g = ctx.createLinearGradient(-150, -150, 150, 150);
  g.addColorStop(0, P.acc); g.addColorStop(0.5, P.acc2); g.addColorStop(1, '#7ee0ff');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  txt(ctx, '一首新歌', 0, 130, { size: 44, font: SERIF_B, color: P.ink });
  txt(ctx, '3:12', -150, 250, { size: 20, font: MONO, color: rgba(P.ink, 0.5), align: 'left' });
  ctx.fillStyle = rgba(P.ink, 0.12); ctx.fillRect(-150, 200, 300, 8);
  ctx.fillStyle = P.acc2; ctx.fillRect(-150, 200, 300 * ((t * 0.05) % 1), 8);
  ctx.restore();
}

// ---------- 1. one song, many genres ----------
const CHIPS = [['HIP-HOP', '#0c2140', '#fff'], ['POP', '#ff5fae', '#fff'], ['JERSEY', '#2d74ff', '#fff'], ['R&B', '#7ee0ff', '#0c2140'], ['ROCK', '#ffffff', '#0c2140'], ['EDM', '#ffd23f', '#0c2140']];
const SECTIONS = [
  { w: '主歌', zh: '主歌', g: '嘻哈', en: 'HIP-HOP', fill: '#0c2140', fg: '#fff', wave: (x, t) => Math.sign(Math.sin(x * 0.09 + t * 6)) * (0.4 + 0.6 * rand(Math.floor(x / 14))) },
  { w: '副歌', zh: '副歌', g: '流行', en: 'POP', fill: '#ff5fae', fg: '#fff', wave: (x, t) => Math.sin(x * 0.05 + t * 4) },
  { w: '桥段', zh: '桥段', g: '另一种节拍', en: 'NEW BEAT', fill: '#2d74ff', fg: '#fff', wave: (x, t) => (Math.floor(x / 20) % 3 === 0 ? 1 : 0.15) * Math.sin(x * 0.3 + t * 10) },
];
function songScene(ctx, t) {
  grid(ctx);
  const tp = S('parts') - 0.3, mv = easeIO(prog(t, tp, tp + 0.8));
  phone(ctx, t, lerp(W / 2, 320, mv), 580, lerp(1, 0.7, mv));
  rise(ctx, '最近的歌', lerp(W / 2, 320, mv), lerp(110, 200, mv), t, at('switch', '最近的歌') - 0.15, { size: lerp(64, 48, mv), font: SERIF, color: P.ink });
  // genre chips orbit the phone
  const tc = at('switch', '好几种曲风') - 0.2;
  CHIPS.forEach(([s, fill, color], i) => {
    const p = pop(t, tc + i * 0.08, 0.35) * (1 - mv);
    const a = (i / CHIPS.length) * Math.PI * 2 + t * 0.4;
    sticker(ctx, s, W / 2 + Math.cos(a) * 470, 580 + Math.sin(a) * 300, { fill, color, sc: p, a: p, size: 42, rot: Math.sin(a) * 0.1 });
  });
  if (mv <= 0) return;
  // the song structure ribbon
  const x0 = 640, w = 1180, sw = w / 3;
  label(ctx, '1 SONG  =  3 GENRES', x0, 230, P.acc, { a: mv });
  SECTIONS.forEach((s, i) => {
    const tw = at('parts', s.w) - 0.15, on = fadeIn(t, tw, 0.3);
    const x = x0 + i * sw;
    ctx.save(); ctx.globalAlpha *= mv * (0.25 + 0.75 * on);
    ctx.fillStyle = s.fill; ctx.beginPath(); ctx.roundRect(x + 6, 300, sw - 12, 420, 24); ctx.fill();
    ctx.strokeStyle = s.fg; ctx.lineWidth = 4; ctx.beginPath();
    for (let k = 0; k <= sw - 60; k += 4) ctx.lineTo(x + 30 + k, 430 + s.wave(k, t) * 60 * on);
    ctx.stroke();
    txt(ctx, s.zh, x + sw / 2, 580, { size: 64, font: SERIF, color: s.fg });
    txt(ctx, s.en, x + sw / 2, 660, { size: 36, font: COND, color: s.fg, track: 6 });
    ctx.restore();
    const gp = pop(t, at('parts', s.g) - 0.1, 0.35);
    around(ctx, x + sw / 2, 800, gp, gp, () => txt(ctx, s.g, x + sw / 2, 800, { size: 46, font: SERIF_B, color: P.ink }));
  });
  const ph = x0 + w * easeIO(prog(t, at('parts', '主歌') - 0.15, atEnd('parts', '节拍')));
  ctx.fillStyle = P.acc2; ctx.fillRect(ph - 3, 280, 6, 460);
  ctx.beginPath(); ctx.arc(ph, 280, 12, 0, Math.PI * 2); ctx.fill();
}

// ---------- 2. borrowing back: Jersey club + Y2K ----------
const ROWS = [['KICK', [0, 3, 6, 8, 10, 12, 14], P.acc], ['CLAP', [4, 12], P.acc2], ['HAT', [1, 3, 5, 7, 9, 11, 13, 15], '#7ee0ff'], ['BELL', [2, 6, 10, 14], '#ffd23f']];
function retroScene(ctx, t) {
  grid(ctx);
  const t0 = S('retro') - 0.1;
  rise(ctx, '新组合 · 反过来借', 140, 150, t, t0, { size: 70, font: SERIF, color: P.ink, align: 'left' });
  // step sequencer playing the Jersey club bar heard in the music
  const tB = at('parts', '桥段') - 0.1, B = 60 / 140, step = Math.floor(Math.max(0, t - tB) / (B / 4)) % 16;
  const gp = fadeIn(t, at('retro', '泽西') - 0.2, 0.4);
  ctx.save(); ctx.globalAlpha *= gp;
  ctx.fillStyle = P.ink; ctx.beginPath(); ctx.roundRect(120, 260, 1060, 480, 26); ctx.fill();
  ROWS.forEach(([name, hits, color], r) => {
    const y = 330 + r * 100;
    txt(ctx, name, 160, y + 30, { size: 24, font: MONO, color: '#9fb6d6', align: 'left', track: 3 });
    for (let k = 0; k < 16; k++) {
      const x = 290 + k * 54, on = hits.includes(k), now = k === step;
      ctx.fillStyle = on ? (now ? '#ffffff' : color) : now ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(x, y, 44, 60, 8); ctx.fill();
    }
  });
  ctx.restore();
  around(ctx, 650, 790, pop(t, at('retro', '泽西') - 0.1, 0.4), 1, () => sticker(ctx, 'JERSEY CLUB', 650, 790, { fill: P.acc2, color: '#fff', size: 44, rot: -0.04 }));
  // an iridescent Y2K disc
  const tm = at('retro', '千禧年') - 0.2, mp = pop(t, tm, 0.5);
  around(ctx, 1560, 480, mp, mp, () => {
    ctx.save(); ctx.translate(1560, 480); ctx.rotate(t * 1.5);
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = `hsla(${(k * 30 + t * 60) % 360},90%,75%,0.9)`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 250, (k * Math.PI) / 6, ((k + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    txt(ctx, 'Y2K', 1560, 480, { size: 140, font: ITAL_B, color: '#fff', stroke: P.acc, sw: 10 });
    label(ctx, '千禧年复古鼓点', 1560, 790, P.ink, { align: 'center' });
  });
  const te = at('retro', '轻轻松松') - 0.3, ep = fadeIn(t, te, 0.5);
  if (ep > 0) {
    ctx.save(); ctx.globalAlpha *= ep;
    group(ctx, t, 1560, 930, 360, 5, 0.3, { bpm: 70, poses: ['idle', 'wave'], color: P.ink, rim: P.acc2, hairs: ['long', 'pony', 'short'], sync: 0.4 });
    ctx.restore();
  }
}

export const scenes = [
  { id: 'song', from: CH.cnow.from, to: S('retro') - 0.2, draw: songScene, cut: true },
  { id: 'retro', from: S('retro') - 0.2, to: CH.cnow.to, draw: retroScene },
];

export const events = [
  { type: 'rewind', t: CH.cnow.from - 0.35 },
  ...CHIPS.map((_, i) => ({ type: 'pop', t: at('switch', '好几种曲风') - 0.2 + i * 0.08, f: 500 + i * 80, amp: 0.5 })),
  { type: 'whoosh', t: S('parts') - 0.3, d: 0.8, amp: 0.4 },
  { type: 'scratch', t: at('parts', '副歌') - 0.2 },
  { type: 'scratch', t: at('parts', '桥段') - 0.2 },
  { type: 'stamp', t: at('retro', '泽西') - 0.1, amp: 0.5 },
  { type: 'ding', t: at('retro', '千禧年') - 0.2, n: 93 },
];
