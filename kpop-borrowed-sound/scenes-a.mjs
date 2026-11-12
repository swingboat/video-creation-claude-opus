// Cold open: the tape goes in, "what would 30 years sound like?", the borrowed-genre montage, the title card.
import {
  W, H, ERA, S, E, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand,
  txt, around, rise, sticker, label, measure, SERIF, COND, ITAL, MONO, BLACK,
} from './lib.mjs';
import { cassette, deck, eqBars } from './props.mjs';

const P = ERA.intro;
const tIn = 0.35, tSeat = 1.35, tPlay = atEnd('open', '播放键') - 0.05;

// ---------- 1. the deck ----------
function deckScene(ctx, t) {
  const zoom = lerp(1, 1.75, easeIO(prog(t, tPlay + 0.4, S('q') + 0.2)));
  const k = (zoom - 1) / 0.75;
  const g = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#2a2119'); g.addColorStop(1, P.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2 + 300 * k, -H / 2 + 50 * k);
  const ins = easeOut(prog(t, tIn, tSeat));
  const spin = t > tPlay ? t - tPlay : 0;
  deck(ctx, t, W / 2, 540, 1.25, {
    pressed: t > tPlay && t < tPlay + 0.35 ? 1 : t > tPlay + 0.35 ? 1 : -1,
    vu: t > tPlay ? 0.75 : 0,
    door: (x, y) => cassette(ctx, spin, x, y - (1 - ins) * 620, 0.9, { spin: 1, wound: 0.15 }),
  });
  ctx.restore();
  label(ctx, 'PLAY  ▶  1992 — NOW', 120, 980, P.acc, { a: fadeIn(t, tPlay, 0.4) * (1 - prog(t, S('q') - 0.6, S('q'))) });
}

// ---------- 2. "thirty years on one tape" ----------
function tapeScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const sp = t - tPlay;
  around(ctx, 620, 560, lerp(1.25, 1.32, prog(t, S('q'), S('borrow'))), 1, () => cassette(ctx, sp, 620, 560, 1, { spin: 1, wound: 0.15 + sp * 0.002 }), -0.06);
  label(ctx, 'SIDE A  ·  1992 → NOW', 1160, 270, P.acc, { a: fadeIn(t, S('q')) });
  const t30 = at('q', '三十年');
  around(ctx, 1160, 470, 1, fadeIn(t, t30 - 0.1, 0.2), () => {
    const n = Math.round(30 * easeOut(prog(t, t30 - 0.1, t30 + 0.6)));
    txt(ctx, String(n), 1150, 470, { size: 330, font: COND, color: P.acc, align: 'left' });
    txt(ctx, '年', 1160 + measure(ctx, '30', 330, COND) + 10, 520, { size: 120, font: SERIF, color: P.ink, align: 'left' });
  });
  rise(ctx, '录进一盘磁带', 1160, 720, t, at('q', '录进') - 0.05, { size: 104, font: SERIF, color: P.ink, align: 'left' });
  rise(ctx, '你会听到什么？', 1166, 840, t, at('q', '你会') - 0.05, { size: 54, font: ITAL, color: P.acc, align: 'left' });
}

// ---------- 3. genre flash cards ----------
const GENRES = [
  { w: '说唱', zh: '说唱', en: 'HIP-HOP · RAP', bg: '#e9b872', fg: '#1a120c' },
  { w: '新杰克', zh: '新杰克摇摆', en: 'NEW JACK SWING', bg: '#d4482b', fg: '#fff1dc' },
  { w: '电子舞曲', zh: '电子舞曲', en: 'EDM', bg: '#ff2f86', fg: '#ffffff' },
  { w: '迪斯科', zh: '迪斯科', en: 'DISCO', bg: '#6d4cff', fg: '#ffffff' },
  { w: '泽西', zh: '泽西俱乐部', en: 'JERSEY CLUB', bg: '#2d74ff', fg: '#ffffff' },
].map((g) => ({ ...g, t: at('borrow', g.w) - 0.06 }));
const tCollage = at('borrow', '这些声音') - 0.05;

function flashCards(ctx, t) {
  const i = GENRES.findLastIndex((g) => t >= g.t);
  if (i < 0) return;
  const g = GENRES[i];
  ctx.fillStyle = g.bg; ctx.fillRect(0, 0, W, H);
  const punch = lerp(1.1, 1, easeOut(prog(t, g.t, g.t + 0.25)));
  around(ctx, W / 2, H / 2, punch, 1, () => {
    txt(ctx, g.zh, W / 2, 470, { size: g.zh.length > 3 ? 230 : 300, font: SERIF, color: g.fg });
    txt(ctx, g.en, W / 2, 700, { size: 92, font: COND, color: g.fg, track: 12 });
  });
  txt(ctx, `0${i + 1} / 05`, 80, 90, { size: 30, font: MONO, color: g.fg, align: 'left', track: 4 });
  txt(ctx, 'BORROWED FROM ↗', W - 80, 90, { size: 30, font: MONO, color: g.fg, align: 'right', track: 4 });
  ctx.globalAlpha *= 0.35;
  eqBars(ctx, t, 0, H, W, 160, 48, g.fg, { bpm: 78, seed: i * 9 });
}

// ---------- 4. collage → stamp → assembled into K-POP ----------
const TAGS = [
  ['RAP', '#e9b872', '#1a120c'], ['NEW JACK SWING', '#d4482b', '#fff'], ['EDM', '#ff2f86', '#fff'], ['DISCO', '#6d4cff', '#fff'],
  ['JERSEY CLUB', '#2d74ff', '#fff'], ['R&B', '#58c9bf', '#0e1d24'], ['ELECTRO', '#ffd23f', '#111'], ['LATIN', '#f29b45', '#1a120c'],
  ['HOUSE', '#b07cff', '#fff'], ['ROCK', '#efe2c9', '#111'],
].map(([s, fill, color], i) => ({
  s, fill, color,
  x0: 260 + rand(i * 3 + 1) * 1400, y0: 170 + rand(i * 3 + 2) * 620, r0: (rand(i * 7) - 0.5) * 0.5,
  y1: i < 5 ? 330 : 750, d: i * 0.06,
}));

function layoutRows(ctx, sc) {
  for (const row of [TAGS.slice(0, 5), TAGS.slice(5)]) {
    const ws = row.map((g) => (measure(ctx, g.s, 46, BLACK) + 52) * sc);
    let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + 36 * (row.length - 1)) / 2;
    row.forEach((g, i) => { g.x1 = x + ws[i] / 2; x += ws[i] + 36; });
  }
}

function collageScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const tOwn = S('own'), tK = at('own', '只属于') - 0.1;
  const tidy = easeIO(prog(t, tOwn - 0.1, tOwn + 0.9));
  // the K-POP word assembles behind the tidy grid
  const kp = fadeIn(t, tK, 0.5);
  around(ctx, W / 2, 545, lerp(0.85, 1, kp), kp, () => {
    txt(ctx, 'K-POP', W / 2, 560, { size: 330, font: COND, color: P.acc, track: 18 });
    label(ctx, 'MADE IN SEOUL', W / 2, 760, P.ink, { align: 'center', size: 28 });
  });
  layoutRows(ctx, lerp(1, 0.8, kp));
  TAGS.forEach((g, i) => {
    const p = pop(t, tCollage + g.d, 0.35);
    const x = lerp(g.x0, g.x1, tidy), y = lerp(g.y0, g.y1 + (i < 5 ? -80 : 60) * kp, tidy);
    sticker(ctx, g.s, x, y, { fill: g.fill, color: g.color, rot: g.r0 * (1 - tidy), sc: p * lerp(1, 0.8, kp), a: p, size: 46 });
  });
  // "borrowed" rubber stamp
  const ts = at('borrow', '借来的') - 0.05;
  const sp = prog(t, ts, ts + 0.18);
  const sa = sp * (1 - prog(t, tOwn - 0.2, tOwn + 0.2));
  if (sa > 0) {
    around(ctx, W / 2, H / 2, lerp(2.2, 1, easeOut(sp)), sa, () => {
      ctx.strokeStyle = '#d4482b'; ctx.lineWidth = 14;
      ctx.strokeRect(W / 2 - 330, H / 2 - 140, 660, 280);
      txt(ctx, '借来的', W / 2, H / 2 - 18, { size: 170, font: SERIF, color: '#d4482b' });
      txt(ctx, 'B O R R O W E D', W / 2, H / 2 + 98, { size: 40, font: BLACK, color: '#d4482b' });
    }, -0.1);
  }
}

// ---------- 5. title card ----------
function titleScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = S('title') - 0.1;
  around(ctx, 1450, 560, 1.9, 0.18, () => cassette(ctx, t, 1450, 560, 1, { spin: 0.6 }), 0.12);
  [...'借来的声音'].forEach((c, i) => rise(ctx, c, 200 + i * 190, 470, t, t0 + i * 0.09, { size: 190, font: SERIF, color: P.ink, align: 'left', d: 0.6 }));
  const ra = easeOut(prog(t, t0 + 0.6, t0 + 1.2));
  ctx.fillStyle = P.acc; ctx.fillRect(210, 600, 900 * ra, 4);
  rise(ctx, 'Borrowed Sounds — thirty years of K-pop', 210, 680, t, t0 + 0.8, { size: 52, font: ITAL, color: P.acc, align: 'left' });
  label(ctx, 'A 面  ·  1992 → 今天', 210, 790, P.ink, { a: fadeIn(t, t0 + 1.2, 0.5) });
}

export const scenes = [
  { id: 'deck', from: 0, to: S('q') - 0.25, draw: deckScene, still: true },
  { id: 'tape', from: S('q') - 0.25, to: GENRES[0].t, draw: tapeScene, cutOut: true },
  { id: 'cards', from: GENRES[0].t, to: tCollage, draw: flashCards, cut: true, cutOut: true, still: true },
  { id: 'collage', from: tCollage, to: S('title') - 0.25, draw: collageScene, cut: true },
  { id: 'title', from: S('title') - 0.25, to: CH.intro.to, draw: titleScene },
];

export const events = [
  { type: 'whoosh', t: tIn, d: 0.8, from: 300, to: 1200, amp: 0.6 },
  { type: 'click', t: tSeat - 0.03 },
  { type: 'click', t: tPlay },
  { type: 'whoosh', t: S('q') - 0.5, d: 0.7, amp: 0.5 },
  { type: 'tick', t: at('q', '三十年'), f: 1800 },
  ...GENRES.map((g, i) => ({ type: i % 2 ? 'scratch' : 'stamp', t: g.t, amp: 0.6, flash: i === 0 ? true : undefined })),
  ...TAGS.map((g) => ({ type: 'pop', t: tCollage + g.d, f: 500 + g.d * 2000, amp: 0.6 })),
  { type: 'stamp', t: at('borrow', '借来的') + 0.1, amp: 1.2 },
  { type: 'whoosh', t: S('own') - 0.1, d: 0.9, amp: 0.6 },
  { type: 'boom', t: at('own', '只属于') - 0.1, amp: 0.7 },
  { type: 'riser', t: S('title') - 1.4, d: 1.3 },
  { type: 'boom', t: S('title') - 0.05, amp: 0.9 },
];
