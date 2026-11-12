// Scenes 4–7: no medium needed, light speed, the stadium wave (frequency / wavelength) and c = λ × f.
import {
  W, C, S, at, prog, lerp, clamp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, talkLevel, sineLine,
} from './lib.mjs';
import { kid, sun, earth, photon, glow, tick, cross } from './chars.mjs';
import { ripples } from './props.mjs';

const TAU = Math.PI * 2;

function bubble(ctx, x, y, w, h, text, o = {}) {
  const { fill = C.cream, color = C.ink, size = 46, tail = -1 } = o;
  card(ctx, x - w / 2, y - h / 2, w, h, { fill, ew: 0, r: h / 2, drop: 8 });
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(x + tail * 40, y + h / 2 - 4); ctx.lineTo(x + tail * 90, y + h / 2 + 40); ctx.lineTo(x + tail * 5, y + h / 2 - 4); ctx.fill();
  txt(ctx, text, x, y, { size, color });
}

// ---------- scene 4: vacuum vs sound ----------
function vacuumScene(ctx, t) {
  const tQ = S('kidAir'), tV = S('vacuum'), tVac = at('vacuum', '真空'), tSun = at('vacuum', '阳光');
  const tS = S('sound'), tShout = at('sound', '喊破'), tNo = at('sound', '没人');
  // the kid asks, then steps aside
  const away = easeIO(prog(t, tV - 0.3, tV + 0.4));
  around(ctx, 960, 880, 1, 1 - away, () => kid(ctx, t, 960, lerp(880, 1100, away), 1.05, { talk: talkLevel(t, ['kidAir']), wave: 0 }));
  const bq = pop(t, at('kidAir', '空气') - 0.1, 0.45) * (1 - away);
  around(ctx, 1260, 420, bq, bq, () => bubble(ctx, 1260, 420, 330, 110, '要靠空气？', { tail: -1 }));
  const bs = pop(t, at('kidAir', '声音') - 0.1, 0.45) * (1 - away);
  around(ctx, 640, 360, bs, bs, () => {
    bubble(ctx, 640, 360, 300, 110, '像声音？', { tail: 1, fill: '#ffd6e2' });
    ripples(ctx, t, 470, 360, { dir: Math.PI, spread: 0.6, color: C.pink, gap: 22, r0: 10 });
  });
  if (t < tV - 0.4) return;
  const lift = easeIO(prog(t, tS - 0.3, tS + 0.4));
  const sy = lerp(440, 270, lift), sc = lerp(1, 0.72, lift);
  const sx = 290, ex = 1640;
  const vp = fadeIn(t, tV - 0.3, 0.5);
  ctx.save(); ctx.globalAlpha *= vp;
  sun(ctx, t, sx, sy, 140 * sc, { mood: 'happy' });
  earth(ctx, t, ex, sy, 120 * sc, { light: Math.PI, mood: t > tSun + 0.4 ? 'wow' : 'happy' });
  // photons cross the (almost) empty gap
  const go = prog(t, tSun - 1.2, tSun - 0.2);
  for (let i = 0; i < 4; i++) {
    const u = ((t - tV) * 0.45 + i / 4) % 1;
    if (go <= 0 || (t - tV) * 0.45 + i / 4 < 0.25) continue;
    const x = lerp(sx + 180 * sc, ex - 150 * sc, u);
    photon(ctx, t, x, sy + Math.sin(u * TAU * 2 + i) * 30 * sc, 30 * sc, { color: '#ffe36e', tail: 2.6 });
  }
  const gp = pop(t, tVac - 0.1, 0.45);
  around(ctx, W / 2 + 10, sy - 150 * sc, gp, gp, () => {
    ctx.save(); ctx.setLineDash([12, 14]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(520, sy - 210 * sc, 860, 420 * sc, 40); ctx.stroke(); ctx.restore();
    txt(ctx, '几乎真空：没有空气', W / 2 + 10, sy - 150 * sc, { size: 46 * Math.max(sc, 0.85), color: C.lilac });
  });
  const tp = pop(t, at('vacuum', '能到') - 0.05, 0.45);
  around(ctx, ex + 120 * sc, sy - 110 * sc, tp, tp, () => tick(ctx, ex + 120 * sc, sy - 110 * sc, 1.3));
  ctx.restore();
  // bottom: shouting astronaut, but nobody hears
  const bp = fadeIn(t, tS - 0.2, 0.5);
  if (bp <= 0) return;
  ctx.save(); ctx.globalAlpha *= bp;
  kid(ctx, t, 640, 900, 0.82, { talk: t > tShout - 0.2 && t < tNo ? 1 : 0, mood: 'wow' });
  kid(ctx, t + 1.3, 1290, 900, 0.82, { mood: t > tNo ? 'sad' : 'happy' });
  const sp = prog(t, tShout - 0.2, tShout + 2.5);
  if (sp > 0 && sp < 1) {
    for (let i = 0; i < 3; i++) {
      const u = ((t * 1.4 + i / 3) % 1);
      ctx.save(); ctx.globalAlpha *= (1 - u) * 0.9;
      ctx.strokeStyle = C.pink; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(720, 690, 30 + u * 150, -0.6, 0.6); ctx.stroke(); ctx.restore();
    }
    txt(ctx, '啊——!', 830, 560, { size: 54, color: C.pink, stroke: C.space, sw: 8 });
  }
  const np = pop(t, tNo - 0.1, 0.45);
  around(ctx, 1030, 700, np, np, () => cross(ctx, 1030, 700, 1.4));
  around(ctx, 1290, 560, np, np, () => txt(ctx, '？', 1290, 560, { size: 90, color: C.gold }));
  ctx.restore();
}

// ---------- scene 5: light speed ----------
function speedScene(ctx, t) {
  const tNum = at('speed', '30万千米'), tLap0 = at('speed', '一秒钟'), tLap1 = at('speed', '七圈半') + 0.5;
  const cx = 960, cy = 540, R = 290;
  // a photon dashes across with speed lines first
  const dash = prog(t, S('speed') - 0.2, at('speed', '飞快') + 0.4);
  if (dash > 0 && dash < 1) {
    const x = lerp(-100, W + 200, easeIO(dash));
    for (let k = 1; k < 8; k++) {
      ctx.fillStyle = `rgba(255,227,110,${0.5 - k * 0.06})`;
      ctx.fillRect(x - k * 70, 300 + Math.sin(k) * 6 - 3, 60, 6);
    }
    photon(ctx, t, x, 300, 46, { color: '#ffe36e', tail: 2 });
  }
  const ep = pop(t, at('speed', '飞快') - 0.2, 0.5);
  around(ctx, cx, cy, ep, ep, () => {
    ctx.save(); ctx.setLineDash([10, 14]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
    earth(ctx, t, cx, cy, 170, { light: -Math.PI * 0.75, mood: t > tLap1 - 0.3 ? 'wow' : 'happy' });
  });
  const np = pop(t, tNum - 0.1, 0.5);
  around(ctx, 300, 260, np, np, () => {
    card(ctx, 70, 170, 460, 190, { fill: 'rgba(255,255,255,0.08)', edge: C.gold, ew: 4, drop: 0, r: 30 });
    txt(ctx, '每秒约', 300, 220, { size: 40, color: C.white });
    txt(ctx, '30万 km', 300, 300, { size: 84, color: C.gold, font: 'RoundB, YuanB' });
  });
  // 7.5 laps in "one second", counted live
  const lp = prog(t, tLap0, tLap1);
  if (lp > 0) {
    const laps = 7.5 * easeIO(lp);
    const a = -Math.PI / 2 + laps * TAU;
    for (let k = 1; k <= 14; k++) {
      const b = a - k * 0.09;
      ctx.fillStyle = `rgba(255,227,110,${0.55 * (1 - k / 15)})`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(b) * R, cy + Math.sin(b) * R, 22 * (1 - k / 18), 0, TAU); ctx.fill();
    }
    photon(ctx, t, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 36, { color: '#ffe36e', dir: a + Math.PI / 2, tail: 2.4 });
    const cp = pop(t, tLap0, 0.4);
    around(ctx, 1600, 300, cp, cp, () => {
      card(ctx, 1400, 190, 400, 210, { fill: 'rgba(255,255,255,0.08)', edge: C.mint, ew: 4, drop: 0, r: 30 });
      txt(ctx, '1 秒绕地球', 1600, 240, { size: 40, color: C.white });
      txt(ctx, `${laps.toFixed(1)} 圈`, 1600, 330, { size: 84, color: C.mint, font: 'RoundB, YuanB' });
    });
  }
  burst(ctx, t, tLap1 - 0.1, 1600, 330, { r: 260, n: 12 });
}

// ---------- scene 6: stadium wave ----------
const LAM = 540, VW = 250, KW = TAU / LAM, OW = KW * VW, BASE = 800;
const SHIRTS = ['#ff8fab', '#ffc93c', '#4cc9f0', '#3ddc97', '#ff9f43', '#c9b6ff'];
const PEOPLE = [...Array(18)].map((_, i) => 165 + i * 94);
const raise = (t, x) => (1 + Math.sin(OW * t - KW * x)) / 2;

function person(ctx, t, x, h, i, hi) {
  const y = BASE - h * 95;
  ctx.save();
  if (hi) glow(ctx, x, y - 90, 10, 120, 'rgba(255,210,63,0.45)');
  ctx.fillStyle = '#26306a'; ctx.beginPath(); ctx.roundRect(x - 44, BASE - 10, 88, 60, 10); ctx.fill();
  ctx.strokeStyle = '#ffd7b5'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  const arm = lerp(0.6, -1.25, h);
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + k * 26, y - 40); ctx.lineTo(x + k * (26 + Math.cos(arm) * 40), y - 40 + Math.sin(arm) * 52); ctx.stroke();
  }
  ctx.fillStyle = SHIRTS[i % SHIRTS.length];
  ctx.beginPath(); ctx.roundRect(x - 30, y - 60, 60, 80, 22); ctx.fill();
  ctx.fillStyle = '#ffd7b5'; ctx.beginPath(); ctx.arc(x, y - 92, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2c5c'; ctx.beginPath(); ctx.arc(x, y - 100, 30, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = C.ink;
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x + k * 10, y - 90, 4, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 84, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

function stadiumScene(ctx, t) {
  const tWave = at('stadium', '人浪'), tSpot = at('stadium2', '原地'), tFwd = at('stadium2', '向前');
  const tF = at('freq', '频率'), tL = at('lambda', '波长');
  const run = prog(t, tWave - 0.6, tWave + 0.6);
  const tt = t * run;
  const HI = 8;
  PEOPLE.forEach((x, i) => person(ctx, t, x, raise(tt, x) * run, i, i === HI && t > tSpot - 0.2));
  const lp = fadeIn(t, at('stadium2', '波浪') - 0.2, 0.5);
  if (lp > 0) sineLine(ctx, 120, 1800, BASE - 47.5 - 92, 47.5, LAM, OW * tt - Math.PI - KW * 120, { color: C.white, w: 5, dash: [12, 12], alpha: lp * 0.7 });
  const xh = PEOPLE[HI];
  const sp = pop(t, tSpot - 0.1, 0.45);
  around(ctx, xh + 75, BASE - 140, sp, sp, () => {
    arrow(ctx, xh + 75, BASE - 140, xh + 75, BASE - 250, { color: C.gold, w: 8, head: 24 });
    arrow(ctx, xh + 75, BASE - 140, xh + 75, BASE - 30, { color: C.gold, w: 8, head: 24 });
  });
  // big arrow riding the crest
  const fp = fadeIn(t, tFwd - 0.2, 0.4) * (1 - prog(t, tL - 0.4, tL));
  if (fp > 0) {
    const n = Math.floor((OW * tt - Math.PI / 2 - KW * 1300) / TAU);
    const xc = (OW * tt - Math.PI / 2 - TAU * n) / KW;
    around(ctx, xc, 420, 1, fp, () => arrow(ctx, xc - 160, 420, xc + 120, 420, { color: C.mint, w: 14, head: 40 }));
    around(ctx, xc, 360, 1, fp, () => txt(ctx, '波浪向前跑', xc - 20, 360, { size: 44, color: C.mint }));
  }
  // frequency: count how many times the highlighted fan stands up
  const qp = pop(t, tF - 0.1, 0.45);
  if (qp > 0) {
    const ups = Math.floor((OW * (tt - tF) + 0) / TAU + 1e-6);
    around(ctx, 470, 260, qp, qp, () => {
      card(ctx, 160, 170, 620, 180, { fill: 'rgba(255,255,255,0.08)', edge: C.gold, ew: 4, drop: 0, r: 30 });
      txt(ctx, '频率 f', 300, 225, { size: 56, color: C.gold });
      txt(ctx, '原地每秒振几次', 560, 228, { size: 38, color: C.white });
      txt(ctx, `站起 × ${Math.max(0, ups)}`, 470, 300, { size: 46, color: C.cream });
    });
  }
  // wavelength: bracket between two neighbouring crests
  const bp = pop(t, tL - 0.1, 0.45);
  if (bp > 0) {
    const n = Math.floor((OW * tt - Math.PI / 2 - KW * 1500) / TAU);
    const x2 = (OW * tt - Math.PI / 2 - TAU * n) / KW, x1 = x2 - LAM, y = 520;
    around(ctx, (x1 + x2) / 2, y, bp, bp, () => {
      ctx.strokeStyle = C.bF; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y + 40); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y + 40); ctx.stroke();
      txt(ctx, '波长 λ', (x1 + x2) / 2, y - 45, { size: 52, color: C.bF, stroke: C.space, sw: 8 });
    });
  }
}

// ---------- scene 7: c = λ × f ----------
const RX0 = 360, RX1 = 1560, PXM = 400, RY = 560;

function formulaScene(ctx, t) {
  const tLam = at('formula', '波长'), tF = at('formula', '频率'), tC = at('formula', '光速');
  const tDemo = S('demo'), tDbl = at('demo', '翻'), tHalf = at('demo', '半米');
  const tKid = S('kidFast'), tNo = S('noFast'), tStill = at('noFast', '光速'), tOnly = at('noFast', '波长');
  const parts = [['c', 760, tC, C.gold], ['=', 850, tC, C.white], ['λ', 940, tLam, C.bF], ['×', 1030, tF, C.white], ['f', 1120, tF, C.pink]];
  for (const [s, x, t0, col] of parts) {
    const p = pop(t, t0 - 0.1, 0.45);
    around(ctx, x, 190, p, p, () => txt(ctx, s, x, 190, { size: 120, font: 'RoundB, YuanB', color: col, stroke: C.space, sw: 10 }));
  }
  const lp = fadeIn(t, tC + 0.2, 0.4);
  around(ctx, 960, 290, 1, lp, () => txt(ctx, '光速 = 波长 × 频率', 960, 290, { size: 40, color: C.lilac }));
  const glowC = 1 - prog(t, tStill + 0.8, tStill + 1.2);
  if (t > tStill - 0.1 && glowC > 0) glow(ctx, 760, 190, 20, 130, `rgba(255,210,63,${0.5 * glowC})`);
  // 3-metre ruler with the field snapshot inside
  const dp = fadeIn(t, tDemo - 0.3, 0.5);
  if (dp <= 0) return;
  ctx.save(); ctx.globalAlpha *= dp;
  card(ctx, RX0 - 30, RY - 190, RX1 - RX0 + 60, 380, { fill: 'rgba(255,255,255,0.05)', edge: 'rgba(255,255,255,0.25)', ew: 3, drop: 0, r: 26 });
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(RX0, RY + 150); ctx.lineTo(RX1, RY + 150); ctx.stroke();
  for (let m = 0; m <= 3; m++) {
    ctx.beginPath(); ctx.moveTo(RX0 + m * PXM, RY + 135); ctx.lineTo(RX0 + m * PXM, RY + 165); ctx.stroke();
    txt(ctx, `${m} 米`, RX0 + m * PXM, RY + 200, { size: 32, color: C.white });
  }
  const k = easeIO(prog(t, tDbl - 0.1, tHalf + 0.1));
  const f = lerp(300, 600, k), lam = (299.792458 / f) * PXM;
  sineLine(ctx, RX0, RX1, RY - 10, 100, lam, t * 5, { color: C.eF, w: 9 });
  // one wavelength bracket under the first crest pair
  const x1 = RX0 + lam / 4 + ((((t * 5) / TAU) * lam) % lam), x2 = x1 + lam;
  ctx.strokeStyle = C.bF; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x1, RY + 105); ctx.lineTo(x1, RY + 120); ctx.lineTo(x2, RY + 120); ctx.lineTo(x2, RY + 105); ctx.stroke();
  txt(ctx, 'λ', (x1 + x2) / 2, RY + 95, { size: 34, color: C.bF, font: 'RoundB' });
  ctx.restore();
  const rp = pop(t, tDemo, 0.45);
  around(ctx, 1730, RY, rp, rp, () => {
    card(ctx, 1600, RY - 170, 270, 340, { fill: 'rgba(255,255,255,0.08)', edge: C.pink, ew: 4, drop: 0, r: 26 });
    txt(ctx, 'f', 1735, RY - 125, { size: 40, color: C.pink, font: 'RoundB' });
    txt(ctx, `${Math.round(f)} MHz`, 1735, RY - 65, { size: 50, color: C.white, font: 'RoundB, YuanB' });
    txt(ctx, 'λ', 1735, RY + 15, { size: 40, color: C.bF, font: 'RoundB' });
    txt(ctx, `${(lam / PXM).toFixed(2)} 米`, 1735, RY + 75, { size: 50, color: C.white });
  });
  const hp = pop(t, tHalf - 0.1, 0.45) * (1 - prog(t, tKid - 0.2, tKid));
  around(ctx, 960, 850, hp, hp, () => txt(ctx, '频率 ×2 → 波长 ÷2', 960, 850, { size: 50, color: C.mint, stroke: C.space, sw: 8 }));
  // the kid's worry, and the answer stamp
  const kp = fadeIn(t, tKid - 0.3, 0.4) * (1 - prog(t, tNo + 1.5, tNo + 2));
  if (kp > 0) {
    around(ctx, 200, 1000, 1, kp, () => kid(ctx, t, 200, 1000, 0.75, { talk: talkLevel(t, ['kidFast']) }));
    const bq = pop(t, at('kidFast', '更快') - 0.1, 0.45) * kp;
    around(ctx, 420, 600, bq, bq, () => bubble(ctx, 420, 600, 260, 100, '更快？', { tail: -1 }));
  }
  const np = pop(t, tStill - 0.1, 0.5);
  around(ctx, 960, 850, np, np, () => {
    card(ctx, 760, 808, 400, 84, { fill: C.gold, ew: 0, r: 42, drop: 6 });
    txt(ctx, '速度永远是 c', 960, 850, { size: 46, color: C.space });
  });
  const op = pop(t, tOnly - 0.1, 0.45);
  around(ctx, 940, 190, op, op, () => {
    ctx.strokeStyle = C.bF; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(940, 190, 72, 0, TAU); ctx.stroke();
  });
}

export const scenes = [
  { id: 'vacuum', from: S('kidAir') - 0.4, to: S('speed') - 0.4, draw: vacuumScene },
  { id: 'speed', from: S('speed') - 0.4, to: S('stadium') - 0.4, draw: speedScene },
  { id: 'stadium', from: S('stadium') - 0.4, to: S('formula') - 0.4, draw: stadiumScene },
  { id: 'formula', from: S('formula') - 0.4, to: S('lineup') - 0.4, draw: formulaScene },
];

export const events = [
  ...['kidAir', 'speed', 'stadium', 'formula'].map((id) => ({ type: 'whoosh', t: S(id) - 0.4, d: 0.45 })),
  { type: 'pop', t: at('kidAir', '空气') - 0.1, f: 700 },
  { type: 'pop', t: at('kidAir', '声音') - 0.1, f: 900 },
  { type: 'whoosh', t: S('vacuum') - 0.3, d: 0.6, from: 300, to: 1200 },
  { type: 'pop', t: at('vacuum', '真空') - 0.1, f: 500 },
  { type: 'sparkle', t: at('vacuum', '阳光') - 0.2, amp: 0.7 },
  { type: 'ding', t: at('vacuum', '能到'), n: 88 },
  { type: 'whoosh', t: S('sound') - 0.3, d: 0.5 },
  { type: 'buzz', t: at('sound', '没人') - 0.1 },
  { type: 'whoosh', t: S('speed') - 0.2, d: 0.7, from: 600, to: 4000, amp: 0.8 },
  { type: 'stamp', t: at('speed', '30万千米') - 0.1, shake: 8 },
  ...[...Array(8)].map((_, i) => ({ type: 'tick', t: at('speed', '一秒钟') + i * ((at('speed', '七圈半') + 0.5 - at('speed', '一秒钟')) / 7.8), n: 72 + i * 2 })),
  { type: 'tada', t: at('speed', '七圈半') + 0.4, amp: 0.6 },
  { type: 'wobble', t: at('stadium', '人浪') - 0.4, d: 1.4, f: 260, rate: 3, amp: 0.6 },
  { type: 'pop', t: at('stadium2', '原地') - 0.1, f: 650 },
  { type: 'whoosh', t: at('stadium2', '向前') - 0.2, d: 0.7 },
  { type: 'ding', t: at('freq', '频率') - 0.1, n: 84 },
  { type: 'ding', t: at('lambda', '波长') - 0.1, n: 88 },
  { type: 'pop', t: at('formula', '波长') - 0.1, f: 600 },
  { type: 'pop', t: at('formula', '频率') - 0.1, f: 800 },
  { type: 'stamp', t: at('formula', '光速') - 0.1, shake: 6 },
  { type: 'wobble', t: at('demo', '翻') - 0.1, d: 1.6, f: 300, rate: 4, amp: 0.5 },
  { type: 'wobble', t: at('demo', '翻') + 0.6, d: 1.0, f: 600, rate: 8, amp: 0.4 },
  { type: 'boing', t: at('kidFast', '更快') - 0.1, amp: 0.6 },
  { type: 'stamp', t: at('noFast', '光速') - 0.1, shake: 8 },
  { type: 'pop', t: at('noFast', '波长') - 0.1, f: 900 },
];
void clamp; void easeOut;
