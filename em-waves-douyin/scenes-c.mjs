// Scenes 6–9 (vertical): the spectrum family stacked top-to-bottom, the narrow visible slice,
// photon energy vs. beam energy, and the closing "you're soaking in it" + comment call-to-action.
import {
  C, S, E, at, prog, lerp, easeIO, easeOut, pop, fadeIn, DURATION,
  txt, card, around, arrow, burst, talkLevel, confetti,
} from './lib.mjs';
import { kid, sun, photon, glow } from './chars.mjs';
import { BANDS, RAINBOW, rainbowFill, chirp, tower, router, remote, radio, xrayHand } from './props.mjs';

const TAU = Math.PI * 2, CX = 500;
const ROW = (i) => 570 + i * 100;

// ---------- scene 6: the family lines up, low → high frequency ----------
function spectrumScene(ctx, t) {
  const tL = S('lineup'), tLow = at('lineup', '低'), tHigh = at('lineup', '高');
  chirp(ctx, t, 120, 540, 120, 1230, 38, easeOut(prog(t, tL, tHigh + 0.5)), { l0: 220, w: 7 });
  const lp = fadeIn(t, tLow - 0.1, 0.3), hp = fadeIn(t, tHigh - 0.1, 0.3);
  around(ctx, 120, 520, 1, lp, () => txt(ctx, '低频', 120, 518, { size: 30, color: '#9aa8ff' }));
  around(ctx, 120, 1262, 1, hp, () => txt(ctx, '高频', 120, 1262, { size: 30, color: C.mint }));
  const uses = { 0: ['广播', (x, y) => tower(ctx, t, x, y + 58, 0.27, { pulse: 1 })], 1: ['WiFi', (x, y) => router(ctx, t, x, y + 22, 0.46)],
    2: ['遥控器', (x, y) => remote(ctx, x, y, 0.42, 0.6)], 5: ['X', (x, y) => xrayHand(ctx, x, y, 0.5)] };
  BANDS.forEach(([name, w, col], i) => {
    const y = ROW(i), p = pop(t, at('members', w) - 0.12, 0.4);
    const u = uses[i], tu = u ? at('uses', u[0]) : 1e9;
    const hop = t > tu ? Math.abs(Math.sin((t - tu) * 8)) * 14 * (1 - prog(t, tu, tu + 0.8)) : 0;
    around(ctx, 430, y, p, p, () => {
      card(ctx, 230, y - 42 - hop, 400, 84, { fill: col ?? rainbowFill(ctx, 230, 630), ew: 0, r: 28, drop: 8 });
      txt(ctx, name, 430, y - hop, { size: 44, color: C.space });
    });
    if (u) {
      const q = pop(t, tu - 0.15, 0.45);
      around(ctx, 735, y, q, q, () => {
        u[1](735, y);
        txt(ctx, u[0] === 'X' ? 'X光片' : u[0], 870, y, { size: 34, color: col, align: 'center', stroke: C.space, sw: 6 });
      });
    }
  });
  const wp = pop(t, at('uses', '干活') - 0.1, 0.4);
  around(ctx, 780, 1240, wp, wp, () => {
    card(ctx, 640, 1205, 280, 70, { fill: C.gold, ew: 0, r: 35, drop: 5 });
    txt(ctx, '全在干活！', 780, 1240, { size: 38, color: C.space });
  });
}

// ---------- scene 7: our eyes catch only a sliver ----------
function visibleScene(ctx, t) {
  const tEye = at('visible', '眼睛'), tOnly = at('visible', '只有'), tNar = at('visible', '窄');
  const bw = 112, x0 = CX - (bw * 7) / 2 + 15;
  const zp = easeIO(prog(t, tOnly - 0.1, tNar + 0.3));
  BANDS.forEach(([name, , col], i) => {
    const x = x0 + i * bw, dim = i === 3 ? 1 : lerp(1, 0.3, zp);
    around(ctx, x + bw / 2, 590, 1, dim, () => {
      card(ctx, x + 4, 550, bw - 8, 80, { fill: col ?? rainbowFill(ctx, x, x + bw), ew: 0, r: 16, drop: 0 });
      txt(ctx, name.replace(' ', ''), x + bw / 2, 590, { size: name.length > 3 ? 22 : 26, color: C.space });
    });
  });
  if (zp > 0) {
    const vx = x0 + 3 * bw;
    ctx.save(); ctx.globalAlpha *= zp;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(vx + 4, 630); ctx.lineTo(vx + bw - 4, 630); ctx.lineTo(910, 760); ctx.lineTo(110, 760); ctx.closePath(); ctx.fill();
    ctx.restore();
    const w = lerp(bw - 8, 800, zp), xl = CX + 10 - w / 2;
    card(ctx, xl, lerp(550, 760, zp), w, lerp(80, 170, zp), { fill: rainbowFill(ctx, xl, xl + w), ew: 0, r: 26, drop: 10 });
    const lp = fadeIn(t, tNar, 0.3);
    around(ctx, CX, 980, 1, lp, () => {
      txt(ctx, '红', 130, 975, { size: 40, color: '#ff6b6b' });
      txt(ctx, '紫', 890, 975, { size: 40, color: '#c08bff' });
      txt(ctx, '人眼可见的一小段', CX + 10, 975, { size: 46, color: C.white });
    });
  }
  // a big eye peeking up at the strip
  const ep = pop(t, tEye - 0.1, 0.45);
  around(ctx, CX, 1150, ep, ep, () => {
    const look = Math.sin(t * 2) * 10;
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(CX + 10, 1150, 130, 78, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a8dde'; ctx.beginPath(); ctx.arc(CX + 10 + look, 1130, 52, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CX + 10 + look, 1124, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(CX + 22 + look, 1112, 9, 0, TAU); ctx.fill();
  });
}

// ---------- scene 8: one photon vs. a whole beam ----------
function energyScene(ctx, t) {
  const tQ = at('kidEnergy', '能量'), tP = S('photon'), tBut = at('photon', '但'), tI = at('photon', '强度'), tT = at('photon', '时间');
  const kp = 1 - prog(t, tP - 0.3, tP);
  around(ctx, CX, 1100, 1, kp, () => {
    kid(ctx, t, CX, 1250, 0.85, { talk: talkLevel(t, ['kidEnergy']) });
    const bq = pop(t, tQ - 0.1, 0.4);
    around(ctx, CX + 120, 720, bq, bq, () => {
      card(ctx, CX - 80, 665, 400, 110, { fill: C.cream, ew: 0, r: 55, drop: 8 });
      txt(ctx, '能量更大？', CX + 120, 720, { size: 50, color: C.ink });
    });
  });
  // single photons: low-f red vs high-f violet with energy meters
  const sp = fadeIn(t, tP - 0.3, 0.35) * (1 - prog(t, tBut - 0.2, tBut + 0.1));
  if (sp > 0) {
    ctx.save(); ctx.globalAlpha *= sp;
    const lv = easeOut(prog(t, tP + 0.3, tP + 1.2));
    for (const [x, col, lvl, label, fq] of [[280, '#ff6b6b', 0.25, '低频光子', 0.5], [720, '#b06cff', lerp(0.25, 0.95, lv), '高频光子', 3]]) {
      card(ctx, x - 45, 560, 90, 300, { fill: 'rgba(255,255,255,0.1)', ew: 0, r: 22, drop: 0 });
      const h = 290 * lvl;
      card(ctx, x - 39, 855 - h, 78, h, { fill: col, ew: 0, r: 18, drop: 0 });
      photon(ctx, t, x, 990, 56, { color: col, freq: fq, tail: 3.4, mood: fq > 1 && lv > 0.5 ? 'wow' : 'happy' });
      txt(ctx, label, x, 1090, { size: 38, color: col });
    }
    card(ctx, CX - 170, 1150, 340, 90, { fill: 'rgba(255,255,255,0.1)', edge: C.gold, ew: 4, drop: 0, r: 30 });
    txt(ctx, 'E光子 = h f', CX, 1195, { size: 52, color: C.gold, font: 'RoundB, YuanB' });
    ctx.restore();
  }
  // whole beam: twelve red photons outweigh one violet photon
  const bp = fadeIn(t, tBut - 0.1, 0.35);
  if (bp <= 0) return;
  ctx.save(); ctx.globalAlpha *= bp;
  const tilt = -0.17 * easeIO(prog(t, tI - 0.1, tI + 0.6));
  const cx = CX, cy = 700, arm = 320;
  ctx.fillStyle = '#c5cbe0';
  ctx.beginPath(); ctx.moveTo(cx - 60, 1130); ctx.lineTo(cx + 60, 1130); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.fillStyle = '#e8ecf8'; ctx.fillRect(-arm, -9, arm * 2, 18); ctx.restore();
  for (const side of [-1, 1]) {
    const px = cx + side * arm * Math.cos(tilt), py = cy + side * arm * Math.sin(tilt) + 140;
    ctx.strokeStyle = '#c5cbe0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, py - 140); ctx.lineTo(px - 120, py); ctx.moveTo(px, py - 140); ctx.lineTo(px + 120, py); ctx.stroke();
    ctx.fillStyle = '#c5cbe0'; ctx.beginPath(); ctx.ellipse(px, py, 140, 24, 0, 0, Math.PI); ctx.fill();
    if (side < 0) for (let i = 0; i < 10; i++) photon(ctx, t + i, px - 92 + (i % 5) * 46, py - 22 - Math.floor(i / 5) * 42, 19, { color: '#ff6b6b', tail: 1.2, freq: 0.5 });
    else photon(ctx, t, px, py - 32, 28, { color: '#b06cff', tail: 1.5, freq: 3 });
  }
  txt(ctx, '一整束低频', cx - arm, 1010 + 20, { size: 34, color: '#ff8f8f' });
  txt(ctx, '一个高频', cx + arm, 1010 - 90, { size: 34, color: '#c9a0ff' });
  ctx.restore();
  for (const [s, t0, x, col] of [['强度', tI, 300, C.pink], ['时间', tT, 700, C.sky]]) {
    const p = pop(t, t0 - 0.1, 0.4);
    around(ctx, x, 1215, p, p, () => {
      card(ctx, x - 120, 1178, 240, 76, { fill: col, ew: 0, r: 38, drop: 6 });
      txt(ctx, `看${s}`, x, 1216, { size: 44, color: C.space });
    });
  }
}

// ---------- scene 9: you are soaking in it — and tell us in the comments ----------
function outroScene(ctx, t) {
  const tSoak = at('outro', '泡'), tCta = S('cta'), tCm = at('cta', '评论');
  // the kid floats in a bath of criss-crossing waves of every colour
  const wp = easeOut(prog(t, tSoak - 0.4, tSoak + 0.5));
  RAINBOW.forEach((col, i) => {
    const y = 620 + i * 85, lam = 360 - i * 38;
    ctx.save(); ctx.globalAlpha *= 0.55 * wp; ctx.strokeStyle = col; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = 60; x <= lerp(60, 940, wp); x += 4) {
      const yy = y + 30 * Math.sin(((x / lam) * TAU) - t * (2 + i * 0.6)) + (x - 500) * 0.12 * (i % 2 ? 1 : -1);
      x === 60 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke(); ctx.restore();
  });
  const up = easeIO(prog(t, tCta - 0.3, tCta + 0.3));
  const ky = lerp(1180, 1100, up);
  kid(ctx, t, lerp(CX, 250, up), ky, lerp(1.0, 0.8, up), { talk: talkLevel(t, ['cta']) * 0, mood: 'wow', wave: 1 });
  const fam = [[sun, 170, 620], [radio, 830, 640], [router, 830, 1020], [xrayHand, 170, 1030]];
  fam.forEach(([fn, x, y], i) => {
    const p = pop(t, S('outro') + 0.1 + i * 0.15, 0.4) * (1 - up);
    if (p <= 0) return;
    const bob = Math.sin(t * 3 + i) * 10;
    around(ctx, x, y, p, p, () => {
      if (fn === sun) sun(ctx, t, x, y + bob, 62);
      else if (fn === radio) radio(ctx, t, x, y + bob, 0.48, { on: 1 });
      else if (fn === router) router(ctx, t, x, y + bob, 0.45);
      else xrayHand(ctx, x, y + bob, 0.6);
    });
  });
  // call-to-action bubble pointing toward Douyin's comment button on the right
  const cp = pop(t, tCta - 0.1, 0.5);
  around(ctx, 610, 760, cp, cp, () => {
    card(ctx, 320, 640, 580, 240, { fill: C.cream, ew: 0, r: 48, drop: 10 });
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.moveTo(420, 870); ctx.lineTo(360, 950); ctx.lineTo(500, 870); ctx.fill();
    txt(ctx, '你还知道', 610, 710, { size: 50, color: C.ink });
    txt(ctx, '哪些电磁波？', 610, 790, { size: 64, color: '#d1495b' });
    for (let i = 0; i < 3; i++) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 5 - i * 0.6));
      ctx.fillStyle = `rgba(43,26,85,${a})`; ctx.beginPath(); ctx.arc(570 + i * 40, 850, 10, 0, TAU); ctx.fill();
    }
  });
  const ap = pop(t, tCm - 0.1, 0.45);
  around(ctx, 760, 1050, ap, ap, () => {
    card(ctx, 520, 1000, 340, 96, { fill: C.gold, ew: 0, r: 48, drop: 8 });
    txt(ctx, '评论区见！', 690, 1048, { size: 50, color: C.space });
    const nudge = Math.sin(t * 8) * 8;
    arrow(ctx, 870 + nudge, 1048, 945 + nudge, 1110, { color: C.gold, w: 10, head: 30 });
  });
  burst(ctx, t, tCm, 690, 1048, { r: 300, n: 12 });
  confetti(ctx, t, E('cta') - 0.2, 120);
  void glow; void DURATION;
}

export const scenes = [
  { id: 'spectrum', from: S('lineup') - 0.3, to: S('visible') - 0.3, draw: spectrumScene },
  { id: 'visible', from: S('visible') - 0.3, to: S('kidEnergy') - 0.3, draw: visibleScene },
  { id: 'energy', from: S('kidEnergy') - 0.3, to: S('outro') - 0.3, draw: energyScene },
  { id: 'outro', from: S('outro') - 0.3, to: DURATION, draw: outroScene },
];

export const events = [
  ...['lineup', 'visible', 'kidEnergy', 'outro'].map((id) => ({ type: 'whoosh', t: S(id) - 0.3, d: 0.4 })),
  { type: 'wobble', t: S('lineup'), d: 1.8, f: 200, rate: 3, amp: 0.45 },
  { type: 'wobble', t: S('lineup') + 1.0, d: 1.0, f: 700, rate: 12, amp: 0.35 },
  ...BANDS.map(([, w], i) => ({ type: 'note', t: at('members', w) - 0.12, n: 72 + [0, 2, 4, 5, 7, 9, 11][i], amp: 0.8 })),
  ...['广播', 'WiFi', '遥控器', 'X'].map((w, i) => ({ type: 'boing', t: at('uses', w) - 0.15, amp: 0.45 + i * 0.05 })),
  { type: 'tada', t: at('uses', '干活') - 0.1, amp: 0.5 },
  { type: 'pop', t: at('visible', '眼睛') - 0.1, f: 700 },
  { type: 'whoosh', t: at('visible', '只有') - 0.1, d: 0.6, from: 400, to: 2000 },
  { type: 'sparkle', t: at('visible', '窄') + 0.1 },
  { type: 'pop', t: at('kidEnergy', '能量') - 0.1, f: 900 },
  { type: 'wobble', t: S('photon') + 0.2, d: 1.0, f: 260, rate: 4, amp: 0.4 },
  { type: 'wobble', t: S('photon') + 0.5, d: 1.0, f: 880, rate: 14, amp: 0.4 },
  { type: 'ding', t: S('photon') + 1.0, n: 88 },
  { type: 'whoosh', t: at('photon', '但') - 0.15, d: 0.4 },
  { type: 'slam', t: at('photon', '强度') + 0.4, shake: 10 },
  { type: 'pop', t: at('photon', '时间') - 0.1, f: 800 },
  { type: 'wobble', t: at('outro', '泡') - 0.4, d: 1.4, f: 330, rate: 6, amp: 0.5 },
  ...[0, 1, 2, 3].map((i) => ({ type: 'pop', t: S('outro') + 0.1 + i * 0.15, f: 600 + i * 150, amp: 0.6 })),
  { type: 'boing', t: S('cta') - 0.1, amp: 0.7 },
  { type: 'tada', t: at('cta', '评论') - 0.1, amp: 0.7 },
  { type: 'confetti', t: E('cta') - 0.2 },
];
