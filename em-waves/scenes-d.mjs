// Scenes 11–12: how radio carries a song (transmit → space → receive) and the closing family photo.
import {
  W, C, S, E, at, prog, lerp, easeIO, easeOut, pop, fadeIn, DURATION,
  txt, card, around, arrow, burst, talkLevel, sineLine, confetti,
} from './lib.mjs';
import { kid, sun, photon, glow, cross } from './chars.mjs';
import { radio, router, tower, mic, speaker, ripples, note } from './props.mjs';
import { BANDS } from './scenes-c.mjs';

const TAU = Math.PI * 2;
const TX = 560, TY = 800, TS = 0.7, TIP = TY - 420 * TS; // tower base and tip
const RX = 1380, RY = 650, RS = 0.8, AX = RX + 130 * RS, AY = RY - 190 * RS; // radio + its antenna tip

function gust(ctx, t, x, y, a) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = 'rgba(220,235,255,0.85)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const yy = y + (k - 1) * 60, xo = ((t * 260 + k * 90) % 260);
    ctx.beginPath(); ctx.moveTo(x + xo - 120, yy); ctx.bezierCurveTo(x + xo - 40, yy - 30, x + xo + 40, yy + 30, x + xo + 100, yy);
    ctx.arc(x + xo + 100, yy - 22, 22, Math.PI / 2, -Math.PI * 0.8, true); ctx.stroke();
  }
  ctx.restore();
}

// ---------- scene 11: radio ----------
function radioScene(ctx, t) {
  const tAir = at('radioQ', '空气'), tNot = at('radio1', '不是'), tSt = at('radio1', '电台'), tVoice = at('radio1', '声音');
  const tSig = at('radio1', '电信号'), tCarve = at('radio1', '刻'), tChange = at('radio1', '变化');
  const tAnt = at('radio2', '天线'), tDec = at('radio2', '解'), tSpk = at('radio2', '喇叭'), tPush = at('radio2', '空气'), tSong = at('radio2', '歌声');
  const move = easeIO(prog(t, tNot + 0.2, tSt + 0.2));
  const rx = lerp(1060, RX, move), ry = lerp(560, RY, move), rs = lerp(1.15, RS, move);
  // the wrong idea: air blowing in from the station
  const ga = fadeIn(t, tAir - 0.3, 0.4) * (1 - prog(t, tNot + 0.3, tNot + 0.7));
  if (ga > 0) {
    gust(ctx, t, 420, 540, ga);
    const qp = pop(t, tAir, 0.4) * ga;
    around(ctx, 700, 360, qp, qp, () => txt(ctx, '吹过来的空气？', 700, 360, { size: 50, color: C.cream, stroke: C.space, sw: 8 }));
    const xp = pop(t, tNot - 0.1, 0.4);
    around(ctx, 520, 540, xp, xp, () => cross(ctx, 520, 540, 2.4));
  }
  // column headers
  const cols = [['发射端', 330, tSt, C.pink], ['空间传播', 960, tCarve, C.gold], ['接收端', 1560, tAnt, C.sky]];
  for (const [s, x, t0, col] of cols) {
    const p = pop(t, t0 - 0.15, 0.45);
    around(ctx, x, 200, p, p, () => {
      card(ctx, x - 130, 160, 260, 80, { fill: col, ew: 0, r: 40, drop: 6 });
      txt(ctx, s, x, 200, { size: 44, color: C.space });
    });
  }
  // transmitter: mic → electric signal → tower
  const sp = fadeIn(t, tSt - 0.2, 0.4);
  if (sp > 0) {
    ctx.save(); ctx.globalAlpha *= sp;
    mic(ctx, 170, 600, 0.9, -0.25);
    if (t > tVoice - 0.2) ripples(ctx, t, 30, 570, { dir: 0, spread: 0.6, color: C.pink, gap: 26, r0: 20 });
    const wp = prog(t, tSig - 0.2, tSig + 0.6);
    if (wp > 0) {
      const x0 = 230, x1 = lerp(x0, TX - 40, wp);
      sineLine(ctx, x0, x1, 700, 18, 34, t * 12, { color: C.eF, w: 5, env: (x) => 0.4 + 0.6 * Math.abs(Math.sin(x / 50 + t * 2)) });
      const lp = fadeIn(t, tSig, 0.3);
      around(ctx, 360, 760, 1, lp, () => txt(ctx, '电信号', 380, 770, { size: 36, color: C.eF }));
    }
    tower(ctx, t, TX, TY, TS, { pulse: t > tCarve - 0.2 ? 1 : 0 });
    ctx.restore();
  }
  // the radio wave: carrier whose amplitude follows the song (AM)
  const cp = prog(t, tCarve - 0.2, tCarve + 1.2);
  if (cp > 0) {
    const x0 = TX + 40, x1 = lerp(x0, AX - 10, cp);
    sineLine(ctx, x0, x1, TIP, 60, 26, t * 30, { color: C.gold, w: 4, env: (x) => 0.35 + 0.65 * Math.abs(Math.sin((x - t * 220) / 90)) });
    const lp = fadeIn(t, tChange - 0.2, 0.4);
    around(ctx, 960, 330, 1, lp, () => txt(ctx, '信息藏在波的变化里', 960, 330, { size: 40, color: C.white }));
  }
  // receiver: radio → decoded signal → speaker pushes air
  const ag = 0.5 + 0.5 * Math.sin(t * 10);
  if (t > tAnt - 0.1 && t < tAnt + 1.6) glow(ctx, AX, AY, 4, 70, `rgba(255,210,63,${0.7 * ag})`);
  radio(ctx, t, rx, ry, rs, { on: t > tDec ? 1 : 0 });
  if (t < tNot) {
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.6 + i / 3) % 1;
      around(ctx, rx, ry, 1, (1 - u), () => note(ctx, rx - 120 + i * 120, ry - 160 - u * 140, 1, [C.gold, C.pink, C.sky][i]));
    }
  }
  const dp = pop(t, tDec - 0.1, 0.45);
  around(ctx, RX, RY + 140, dp, dp, () => {
    card(ctx, RX - 120, RY + 108, 240, 66, { fill: C.mint, ew: 0, r: 33, drop: 4 });
    txt(ctx, '解出信号', RX, RY + 142, { size: 36, color: C.space });
  });
  const kp = fadeIn(t, tSpk - 0.3, 0.4);
  if (kp > 0) {
    around(ctx, 1700, RY, 1, kp, () => {
      arrow(ctx, RX + 150, RY, 1590, RY, { color: 'rgba(255,255,255,0.6)', w: 6, head: 22 });
      speaker(ctx, t, 1680, RY, 0.75, { level: t > tPush - 0.2 ? 1 : 0 });
    });
    if (t > tPush - 0.2) ripples(ctx, t, 1720, RY, { dir: 0, spread: 0.7, color: C.pink, gap: 40, r0: 30, w: 7 });
  }
  if (t > tSong - 0.2) {
    for (let i = 0; i < 4; i++) {
      const u = ((t - tSong) * 0.5 + i / 4) % 1;
      around(ctx, 1780, RY, 1, (1 - u) * fadeIn(t, tSong - 0.2, 0.3), () =>
        note(ctx, 1760 + Math.sin(u * 6 + i) * 40, RY - 120 - u * 260, 1, [C.gold, C.pink, C.sky, C.mint][i]));
    }
  }
}

// ---------- scene 12: finale ----------
function outroScene(ctx, t) {
  const tCh = S('outro'), tEn = at('outro', '能量'), tInfo = at('outro', '信息'), tFar = at('outro', '远方');
  const tFam = S('outro2'), tOne = at('outro2', '一家人'), tKid = S('kidEnd'), tEnd = at('kidEnd', '电磁波');
  // E/B pair racing to the right, carrying energy and information
  const wa = 1 - prog(t, tFam - 0.4, tFam);
  if (wa > 0) {
    ctx.save(); ctx.globalAlpha *= wa;
    sineLine(ctx, 120, 1800, 520, 150, 360, (t - tCh) * 6, { color: C.eF, w: 8 });
    sineLine(ctx, 120, 1800, 520, 100, 360, (t - tCh) * 6, { color: C.bF, w: 7, dash: [16, 12] });
    arrow(ctx, 120, 520, 1860, 520, { color: 'rgba(255,255,255,0.5)', w: 4, head: 24 });
    const chip = (label, t0, col, y) => {
      const p = pop(t, t0 - 0.1, 0.45);
      const x = lerp(400, 1500, easeIO(prog(t, t0, tFar + 0.6)));
      around(ctx, x, y, p, p, () => {
        card(ctx, x - 110, y - 40, 220, 80, { fill: col, ew: 0, r: 40, drop: 6 });
        txt(ctx, label, x, y, { size: 42, color: C.space });
      });
    };
    chip('能量', tEn, C.gold, 290);
    chip('信息', tInfo, C.sky, 770);
    ctx.restore();
  }
  // family photo: sun, radio, router and the whole spectrum
  const fp = fadeIn(t, tFam - 0.3, 0.5);
  if (fp <= 0) return;
  ctx.save(); ctx.globalAlpha *= fp;
  const lift = easeIO(prog(t, tKid - 0.3, tKid + 0.4));
  const cy = lerp(400, 300, lift);
  const items = [[at('outro2', '阳光'), 560, (x, y) => sun(ctx, t, x, y, 90)], [at('outro2', '广播'), 960, (x, y) => radio(ctx, t, x, y + 20, 0.7, { on: 1 })],
    [at('outro2', 'WiFi'), 1360, (x, y) => router(ctx, t, x, y + 40, 0.7)]];
  for (const [t0, x, draw] of items) {
    const p = pop(t, t0 - 0.1, 0.5);
    around(ctx, x, cy, p, p, () => draw(x, cy - Math.abs(Math.sin(t * 3 + x)) * 10));
  }
  BANDS.forEach(([name, , col], i) => {
    const p = pop(t, tOne - 0.2 + i * 0.07, 0.4);
    const x = 960 + (i - 3) * 240, y = cy + 340 + Math.sin(t * 3 + i) * 6;
    around(ctx, x, y, p, p, () => {
      card(ctx, x - 95, y - 34, 190, 68, { fill: col ?? '#ffd23f', ew: 0, r: 34, drop: 6 });
      txt(ctx, name, x, y, { size: 32, color: C.space });
    });
  });
  const hp = pop(t, tOne - 0.1, 0.5);
  around(ctx, 960, cy + 210, hp, hp, () => txt(ctx, '电磁波大家族', 960, cy + 210, { size: 96, color: C.gold, stroke: C.space, sw: 14 }));
  burst(ctx, t, tOne, 960, cy + 210, { r: 460, n: 16, size: 28 });
  ctx.restore();
  // the kid's conclusion and confetti
  const kp = pop(t, tKid - 0.2, 0.5);
  around(ctx, 260, 1000, kp, kp, () => kid(ctx, t, 260, 1000, 0.75, { talk: talkLevel(t, ['kidEnd']), wave: 1, mood: 'wow' }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 1.2, r = 190;
    const p = fadeIn(t, tEnd - 0.2 + i * 0.05, 0.3);
    if (p > 0) around(ctx, 260, 830, 1, p, () => photon(ctx, t + i, 260 + Math.cos(a) * r, 830 + Math.sin(a) * r * 0.4, 22,
      { color: ['#ff6b6b', '#ffd23f', '#3ddc97', '#4cc9f0', '#b06cff', '#ff8fab'][i], dir: a + Math.PI / 2, tail: 2 }));
  }
  confetti(ctx, t, E('kidEnd') - 0.3);
}

export const scenes = [
  { id: 'radio', from: S('radioQ') - 0.4, to: S('outro') - 0.4, draw: radioScene },
  { id: 'outro', from: S('outro') - 0.4, to: DURATION, draw: outroScene },
];

export const events = [
  ...['radioQ', 'outro'].map((id) => ({ type: 'whoosh', t: S(id) - 0.4, d: 0.45 })),
  ...[0, 1, 2].map((i) => ({ type: 'note', t: S('radioQ') + i * 0.3, n: [79, 83, 86][i], amp: 0.5 })),
  { type: 'wind', t: at('radioQ', '空气') - 0.3, d: 1.6 },
  { type: 'buzz', t: at('radio1', '不是') - 0.1 },
  { type: 'whoosh', t: at('radio1', '不是') + 0.2, d: 0.6 },
  { type: 'pop', t: at('radio1', '电台') - 0.15, f: 700 },
  { type: 'zap', t: at('radio1', '电信号') - 0.1, amp: 0.7 },
  { type: 'static', t: at('radio1', '刻') - 0.2, d: 1.2, amp: 0.6 },
  { type: 'pop', t: at('radio2', '天线') - 0.15, f: 900 },
  { type: 'ding', t: at('radio2', '解') - 0.1, n: 84 },
  { type: 'boing', t: at('radio2', '喇叭') - 0.2, amp: 0.5 },
  ...[0, 1, 2, 3].map((i) => ({ type: 'note', t: at('radio2', '歌声') + i * 0.2, n: [84, 88, 91, 96][i], amp: 0.7 })),
  { type: 'wobble', t: S('outro'), d: 2.0, f: 330, rate: 5, amp: 0.5 },
  { type: 'pop', t: at('outro', '能量') - 0.1, f: 700 },
  { type: 'pop', t: at('outro', '信息') - 0.1, f: 900 },
  { type: 'whoosh', t: S('outro2') - 0.3, d: 0.5 },
  ...['阳光', '广播', 'WiFi'].map((w, i) => ({ type: 'boing', t: at('outro2', w) - 0.1, amp: 0.5 + i * 0.1 })),
  { type: 'tada', t: at('outro2', '一家人') - 0.1, amp: 0.7 },
  { type: 'sparkle', t: at('kidEnd', '电磁波') - 0.2 },
  { type: 'confetti', t: E('kidEnd') - 0.3 },
  { type: 'tada', t: E('kidEnd') - 0.2, amp: 0.8 },
];
