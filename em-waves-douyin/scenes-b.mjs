// Scenes 3–5 (vertical): no air needed, light speed laps, and frequency / wavelength / c = λ × f on a 3-metre bench.
import {
  C, S, at, prog, lerp, clamp, easeIO, pop, fadeIn,
  txt, card, around, arrow, burst, talkLevel, sineLine,
} from './lib.mjs';
import { kid, sun, earth, photon, tick, glow } from './chars.mjs';

const TAU = Math.PI * 2, CX = 500;

function bubble(ctx, x, y, w, h, text, tail = -1) {
  card(ctx, x - w / 2, y - h / 2, w, h, { fill: C.cream, ew: 0, r: h / 2, drop: 8 });
  ctx.fillStyle = C.cream;
  ctx.beginPath(); ctx.moveTo(x + tail * 30, y + h / 2 - 4); ctx.lineTo(x + tail * 80, y + h / 2 + 40); ctx.lineTo(x - tail * 10, y + h / 2 - 4); ctx.fill();
  txt(ctx, text, x, y, { size: 48, color: C.ink });
}

// ---------- scene 3: no air needed — sunlight falls through the vacuum ----------
function vacuumScene(ctx, t) {
  const tAir = at('kidAir', '空气'), tV = S('vacuum'), tVac = at('vacuum', '真空'), tSun = at('vacuum', '阳光'), tOk = at('vacuum', '到');
  const away = prog(t, tV - 0.25, tV + 0.15);
  around(ctx, CX, 1100, 1, 1 - away, () => {
    kid(ctx, t, CX, 1180, 0.95, { talk: talkLevel(t, ['kidAir']), mood: 'wow' });
    const bp = pop(t, tAir - 0.15, 0.4);
    around(ctx, 640, 700, bp, bp, () => bubble(ctx, 640, 700, 380, 110, '要靠空气？'));
  });
  const vp = fadeIn(t, tV - 0.2, 0.35);
  if (vp <= 0) return;
  ctx.save(); ctx.globalAlpha *= vp;
  sun(ctx, t, CX, 640, 105);
  earth(ctx, t, CX, 1150, 95, { light: -Math.PI / 2, mood: t > tOk - 0.2 ? 'wow' : 'happy' });
  const gp = pop(t, tVac - 0.1, 0.4);
  around(ctx, CX, 900, gp, gp, () => {
    ctx.save(); ctx.setLineDash([12, 14]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(110, 790, 780, 220, 36); ctx.stroke(); ctx.restore();
    txt(ctx, '几乎真空', 270, 830, { size: 40, color: C.lilac });
    txt(ctx, '没有空气', 730, 970, { size: 40, color: C.lilac });
  });
  const go = prog(t, tSun - 0.4, tSun);
  if (go > 0) {
    for (let i = 0; i < 4; i++) {
      const raw = (t - tSun + 0.4) * 0.8 + i / 4 - 0.75;
      if (raw < 0) continue;
      const u = raw % 1;
      photon(ctx, t + i, CX + (i - 1.5) * 120 + Math.sin(u * TAU * 1.5 + i) * 20, lerp(760, 1060, u), 26, { color: '#ffe36e', dir: Math.PI / 2, tail: 2.4 });
    }
  }
  const tp = pop(t, tOk - 0.1, 0.4);
  around(ctx, CX + 140, 1080, tp, tp, () => tick(ctx, CX + 140, 1080, 1.3));
  ctx.restore();
}

// ---------- scene 4: 300 000 km/s = 7.5 laps of the Earth per second ----------
function speedScene(ctx, t) {
  const tNum = at('speed', '30万千米'), tLap0 = at('speed', '一秒'), tLap1 = at('speed', '七圈半') + 0.45;
  const cx = CX, cy = 1000, R = 205;
  const dash = prog(t, S('speed') - 0.3, tNum);
  if (dash > 0 && dash < 1) {
    const y = lerp(1300, 450, easeIO(dash));
    for (let k = 1; k < 7; k++) { ctx.fillStyle = `rgba(255,227,110,${0.5 - k * 0.07})`; ctx.fillRect(CX - 3, y + k * 60, 6, 50); }
    photon(ctx, t, CX, y, 40, { color: '#ffe36e', dir: -Math.PI / 2, tail: 2 });
  }
  const np = pop(t, tNum - 0.1, 0.45);
  around(ctx, 280, 600, np, np, () => {
    card(ctx, 90, 525, 380, 150, { fill: 'rgba(255,255,255,0.08)', edge: C.gold, ew: 4, drop: 0, r: 28 });
    txt(ctx, '每秒约', 280, 563, { size: 34, color: C.white });
    txt(ctx, '30万 km', 280, 628, { size: 70, color: C.gold, font: 'RoundB, YuanB' });
  });
  const ep = pop(t, tLap0 - 0.4, 0.45);
  around(ctx, cx, cy, ep, ep, () => {
    ctx.save(); ctx.setLineDash([10, 14]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
    earth(ctx, t, cx, cy, 120, { light: -Math.PI * 0.75, mood: t > tLap1 - 0.3 ? 'wow' : 'happy' });
  });
  const lp = prog(t, tLap0, tLap1);
  if (lp <= 0) return;
  const laps = 7.5 * easeIO(lp), a = -Math.PI / 2 + laps * TAU;
  for (let k = 1; k <= 12; k++) {
    const b = a - k * 0.11;
    ctx.fillStyle = `rgba(255,227,110,${0.55 * (1 - k / 13)})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(b) * R, cy + Math.sin(b) * R, 18 * (1 - k / 16), 0, TAU); ctx.fill();
  }
  photon(ctx, t, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 30, { color: '#ffe36e', dir: a + Math.PI / 2, tail: 2.2 });
  const cp = pop(t, tLap0, 0.4);
  around(ctx, 730, 600, cp, cp, () => {
    card(ctx, 540, 525, 380, 150, { fill: 'rgba(255,255,255,0.08)', edge: C.mint, ew: 4, drop: 0, r: 28 });
    txt(ctx, '1 秒绕地球', 730, 563, { size: 34, color: C.white });
    txt(ctx, `${laps.toFixed(1)} 圈`, 730, 628, { size: 70, color: C.mint, font: 'RoundB, YuanB' });
  });
  burst(ctx, t, tLap1 - 0.1, 730, 610, { r: 260, n: 12 });
}

// ---------- scene 5: frequency, wavelength, c = λ × f ----------
const BX0 = 80, BX1 = 920, PXM = 280, WY = 830, MX = 360;

function benchScene(ctx, t) {
  const tF = at('freq', '振'), tFq = at('freq', '频率'), tL = at('lambda', '波峰'), tLw = at('lambda', '波长');
  const tFm = S('formula'), tC = at('formula', '光速'), tD = at('double', '翻倍'), tSame = at('double', '速度'), tHalf = at('double', '减半');
  // frequency ramps 300 → 600 MHz; the phase is the integral of ω so the wave never jumps
  const r0 = tD - 0.1, r1 = tHalf - 0.05, k = prog(t, r0, r1);
  const kInt = t < r0 ? 0 : t < r1 ? ((t - r0) ** 2) / (2 * (r1 - r0)) : (r1 - r0) / 2 + (t - r1);
  const f = 300 * (1 + k), lam = (299.792458 / f) * PXM, phi = 7 * (t + kInt);
  const ph = phi - TAU * ((MX - BX0) / lam);
  card(ctx, BX0 - 20, 660, BX1 - BX0 + 40, 350, { fill: 'rgba(255,255,255,0.05)', edge: 'rgba(255,255,255,0.25)', ew: 3, drop: 0, r: 26 });
  sineLine(ctx, BX0, BX1, WY, 110, lam, phi, { color: C.eF, w: 9 });
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(BX0, 1040); ctx.lineTo(BX1, 1040); ctx.stroke();
  for (let m = 0; m <= 3; m++) {
    ctx.beginPath(); ctx.moveTo(BX0 + m * PXM, 1026); ctx.lineTo(BX0 + m * PXM, 1054); ctx.stroke();
    txt(ctx, `${m} 米`, BX0 + m * PXM + (m === 0 ? 20 : m === 3 ? -20 : 0), 1080, { size: 30, color: C.white });
  }
  // a single spot bobbing in place, with a live count of its oscillations
  const fp = fadeIn(t, tF - 0.2, 0.3);
  if (fp > 0) {
    const y = WY - 110 * Math.sin(-ph);
    ctx.save(); ctx.globalAlpha *= fp;
    ctx.strokeStyle = 'rgba(255,143,171,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(MX, WY - 130); ctx.lineTo(MX, WY + 130); ctx.stroke(); ctx.restore();
    glow(ctx, MX, y, 6, 50, `rgba(255,143,171,${0.8 * fp})`);
    ctx.save(); ctx.globalAlpha *= fp; ctx.fillStyle = C.pink; ctx.beginPath(); ctx.arc(MX, y, 18, 0, TAU); ctx.fill(); ctx.restore();
    const n = Math.max(0, Math.floor((phi - 7 * tF) / TAU));
    around(ctx, MX, 690, 1, fp * (1 - prog(t, tL - 0.3, tL)), () => txt(ctx, `振了 ${n} 次`, MX + 150, 700, { size: 38, color: C.pink }));
  }
  // wavelength bracket between two neighbouring crests
  const lpp = pop(t, tL - 0.1, 0.4);
  if (lpp > 0) {
    const c0 = (BX0 + ((phi / TAU + 0.25) % 1) * lam), x1 = c0 < BX0 + 40 ? c0 + lam : c0, x2 = x1 + lam;
    around(ctx, (x1 + x2) / 2, 950, lpp, lpp, () => {
      ctx.strokeStyle = C.bF; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, 700); ctx.lineTo(x1, 990); ctx.moveTo(x2, 700); ctx.lineTo(x2, 990);
      ctx.moveTo(x1, 980); ctx.lineTo(x2, 980); ctx.stroke();
      txt(ctx, 'λ', (x1 + x2) / 2, 950, { size: 44, color: C.bF, font: 'RoundB' });
    });
  }
  // live readouts
  const rows = [['频率 f', `${Math.round(f)} MHz`, tFq, C.pink, 280], ['波长 λ', `${(lam / PXM).toFixed(2)} 米`, tLw, C.bF, 730]];
  for (const [lab, val, t0, col, x] of rows) {
    const p = pop(t, t0 - 0.1, 0.4);
    around(ctx, x, 585, p, p, () => {
      card(ctx, x - 190, 532, 380, 108, { fill: 'rgba(255,255,255,0.08)', edge: col, ew: 4, drop: 0, r: 26 });
      txt(ctx, lab, x - 95, 586, { size: 36, color: col });
      txt(ctx, val, x + 75, 586, { size: 42, color: C.white, font: 'RoundB, YuanB' });
    });
  }
  // c = λ × f
  const parts = [['c', 330, tC, C.gold], ['=', 420, tC, C.white], ['λ', 510, at('formula', '波长'), C.bF], ['×', 600, at('formula', '乘'), C.white], ['f', 690, at('formula', '频率'), C.pink]];
  for (const [s, x, t0, col] of parts) {
    const p = pop(t, Math.max(t0, tFm) - 0.1, 0.4);
    around(ctx, x, 1160, p, p, () => txt(ctx, s, x, 1160, { size: 110, font: 'RoundB, YuanB', color: col, stroke: C.space, sw: 10 }));
  }
  const gc = 1 - prog(t, tSame + 0.8, tSame + 1.3);
  if (t > tSame - 0.1 && gc > 0) glow(ctx, 330, 1160, 20, 110, `rgba(255,210,63,${0.55 * gc})`);
  const sp = pop(t, tSame - 0.1, 0.4);
  around(ctx, 260, 1262, sp, sp, () => {
    card(ctx, 110, 1226, 300, 72, { fill: C.gold, ew: 0, r: 36, drop: 5 });
    txt(ctx, '速度 c 不变', 260, 1262, { size: 38, color: C.space });
  });
  const hp = pop(t, tHalf - 0.1, 0.4);
  around(ctx, 700, 1262, hp, hp, () => {
    card(ctx, 520, 1226, 360, 72, { fill: C.mint, ew: 0, r: 36, drop: 5 });
    txt(ctx, 'f ×2 → λ ÷2', 700, 1262, { size: 40, color: C.space, font: 'RoundB, YuanB' });
  });
  void clamp;
}

export const scenes = [
  { id: 'vacuum', from: S('kidAir') - 0.3, to: S('speed') - 0.3, draw: vacuumScene },
  { id: 'speed', from: S('speed') - 0.3, to: S('freq') - 0.3, draw: speedScene },
  { id: 'bench', from: S('freq') - 0.3, to: S('lineup') - 0.3, draw: benchScene },
];

const lap0 = at('speed', '一秒'), lap1 = at('speed', '七圈半') + 0.45;
export const events = [
  ...['kidAir', 'speed', 'freq'].map((id) => ({ type: 'whoosh', t: S(id) - 0.3, d: 0.4 })),
  { type: 'pop', t: at('kidAir', '空气') - 0.15, f: 800 },
  { type: 'buzz', t: S('vacuum') - 0.05 },
  { type: 'pop', t: at('vacuum', '真空') - 0.1, f: 500 },
  { type: 'sparkle', t: at('vacuum', '阳光') - 0.3, amp: 0.7 },
  { type: 'ding', t: at('vacuum', '到') - 0.05, n: 88 },
  { type: 'whoosh', t: S('speed') - 0.3, d: 0.6, from: 600, to: 4000, amp: 0.8 },
  { type: 'stamp', t: at('speed', '30万千米') - 0.1, shake: 8 },
  ...[...Array(8)].map((_, i) => ({ type: 'tick', t: lap0 + i * ((lap1 - lap0) / 7.6), n: 72 + i * 2 })),
  { type: 'tada', t: lap1 - 0.1, amp: 0.6 },
  ...[0, 1, 2].map((i) => ({ type: 'pop', t: at('freq', '振') + 0.5 + i * 0.9, f: 900 + i * 150, amp: 0.6 })),
  { type: 'ding', t: at('freq', '频率') - 0.1, n: 84 },
  { type: 'ding', t: at('lambda', '波长') - 0.1, n: 88 },
  { type: 'pop', t: at('formula', '波长') - 0.1, f: 600 },
  { type: 'pop', t: at('formula', '频率') - 0.1, f: 800 },
  { type: 'stamp', t: at('formula', '光速') - 0.1, shake: 6 },
  { type: 'wobble', t: at('double', '翻倍') - 0.1, d: 1.6, f: 300, rate: 4, amp: 0.5 },
  { type: 'pop', t: at('double', '速度') - 0.1, f: 700 },
  { type: 'stamp', t: at('double', '减半') - 0.1, shake: 6 },
];
