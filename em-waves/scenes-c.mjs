// Scenes 8–10: the spectrum family line-up, the narrow visible slice (550 nm green) and photon energy vs. beam energy.
import {
  W, C, S, at, prog, lerp, clamp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, talkLevel, sineLine,
} from './lib.mjs';
import { kid, photon, glow, cross } from './chars.mjs';
import { tower, router, remote } from './props.mjs';

const TAU = Math.PI * 2;
export const BANDS = [
  ['无线电波', '无线电波', '#7b8cff'], ['微波', '微波', '#4cc9f0'], ['红外线', '红外线', '#ff7a5c'], ['可见光', '可见光', null],
  ['紫外线', '紫外线', '#b07cff'], ['X 射线', 'X', '#9fe8ff'], ['伽马射线', '伽马射线', '#3ddc97'],
];
const RAINBOW = ['#ff4d4d', '#ff9f43', '#ffd23f', '#3ddc97', '#4cc9f0', '#5b6cff', '#b06cff'];
const bx = (i) => 180 + i * 260;

function rainbowFill(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
  return g;
}

// Wave whose wavelength shrinks from left to right (low → high frequency).
function chirp(ctx, t, x0, x1, y, amp, reveal) {
  const L = x1 - x0, k = 3.4, l0 = 340;
  ctx.save();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  BANDS.forEach(([, , c], i) => g.addColorStop(i / 6, c ?? '#ffd23f'));
  ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = x0; x <= lerp(x0, x1, reveal); x += 2) {
    const u = (x - x0) / L, ph = ((TAU * L) / (l0 * k)) * (Math.exp(k * u) - 1);
    const yy = y - amp * Math.sin(ph - t * 4);
    x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}

function xrayHand(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#1b2a5a'; ctx.beginPath(); ctx.roundRect(-70, -90, 140, 180, 16); ctx.fill();
  ctx.strokeStyle = '#d8f4ff'; ctx.lineCap = 'round';
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-10, 80); ctx.lineTo(-6, 20); ctx.moveTo(14, 80); ctx.lineTo(12, 20); ctx.stroke();
  ctx.lineWidth = 9;
  for (const [a, l] of [[-0.55, 60], [-0.2, 75], [0.05, 80], [0.3, 72], [0.75, 52]]) {
    ctx.beginPath(); ctx.moveTo(Math.sin(a) * 20, 10); ctx.lineTo(Math.sin(a) * (20 + l), 10 - Math.cos(a) * l); ctx.stroke();
  }
  ctx.restore();
}

// ---------- scene 8: the family lines up ----------
function spectrumScene(ctx, t) {
  const tL = S('lineup'), tLow = at('lineup', '低'), tHigh = at('lineup', '高');
  chirp(ctx, t, 60, 1860, 340, 70, easeOut(prog(t, tL, tHigh + 0.6)));
  const ap = fadeIn(t, tLow - 0.1, 0.5);
  around(ctx, W / 2, 190, 1, ap, () => {
    arrow(ctx, 420, 190, 1500, 190, { color: 'rgba(255,255,255,0.7)', w: 6, head: 26, p: prog(t, tLow, tHigh + 0.3) });
    txt(ctx, '频率低 · 波长长', 240, 190, { size: 38, color: C.white });
    txt(ctx, '频率高 · 波长短', 1690, 190, { size: 38, color: C.white });
  });
  const uses = [[0, '广播', (x, y) => tower(ctx, t, x, y + 60, 0.32, { pulse: 1 })], [1, 'WiFi', (x, y) => router(ctx, t, x, y + 40, 0.5)],
    [2, '遥控器', (x, y) => remote(ctx, x, y, 0.55, 0.5)], [5, '医院', (x, y) => xrayHand(ctx, x, y, 0.75)]];
  BANDS.forEach(([name, w, col], i) => {
    const p = pop(t, at('members', w) - 0.1, 0.45);
    const use = uses.find((u) => u[0] === i);
    const tu = use ? at('uses', use[1]) : 1e9;
    const hop = Math.abs(Math.sin((t - tu) * 7)) * 22 * (t > tu ? 1 - prog(t, tu, tu + 0.9) : 0);
    const x = bx(i), y = 560 - hop;
    around(ctx, x, y, p, p, () => {
      card(ctx, x - 118, y - 62, 236, 124, { fill: col ?? rainbowFill(ctx, x - 118, x + 118), ew: 0, r: 30, drop: 10 });
      txt(ctx, name, x, y, { size: name.length > 3 ? 42 : 46, color: C.space });
    });
    if (use) {
      const q = pop(t, tu - 0.15, 0.5);
      around(ctx, x, 770, q, q, () => {
        use[2](x, 760);
        txt(ctx, use[1] === '医院' ? '拍片' : use[1], x, 890, { size: 38, color: col });
      });
    }
  });
}

// ---------- scene 9: our eyes see only a sliver ----------
function visibleScene(ctx, t) {
  const tV = S('visible'), tSl = at('visible', '一小段'), tG = at('green', '550纳米'), tN = at('green', '五百');
  // the full family shrunk into a strip
  const y0 = 230;
  BANDS.forEach(([name, , col], i) => {
    const x = 330 + i * 210;
    const dim = i === 3 ? 1 : lerp(1, 0.35, prog(t, tSl - 0.3, tSl + 0.3));
    around(ctx, x, y0, 1, dim, () => {
      card(ctx, x - 100, y0 - 40, 200, 80, { fill: col ?? rainbowFill(ctx, x - 100, x + 100), ew: 0, r: 20, drop: 0 });
      txt(ctx, name, x, y0, { size: 32, color: C.space });
    });
  });
  const vx = 330 + 3 * 210;
  const zp = easeIO(prog(t, tSl - 0.2, tSl + 0.6));
  if (zp > 0) {
    ctx.save(); ctx.globalAlpha *= zp;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(vx - 100, y0 + 40); ctx.lineTo(vx + 100, y0 + 40); ctx.lineTo(1560, 470); ctx.lineTo(360, 470); ctx.closePath(); ctx.fill();
    ctx.restore();
    const bw = lerp(200, 1200, zp), bxl = W / 2 - bw / 2;
    card(ctx, bxl, lerp(y0 - 40, 470, zp), bw, lerp(80, 170, zp), { fill: rainbowFill(ctx, bxl, bxl + bw), ew: 0, r: 26, drop: 10 });
    const lp = fadeIn(t, tSl + 0.4, 0.4);
    around(ctx, W / 2, 700, 1, lp, () => {
      txt(ctx, '红', 360, 700, { size: 44, color: '#ff6b6b' });
      txt(ctx, '紫', 1560, 700, { size: 44, color: '#c08bff' });
      txt(ctx, '人眼可见的一小段', W / 2, 700, { size: 44, color: C.white });
    });
  }
  // eye watching the strip
  const ep = pop(t, tV, 0.5);
  around(ctx, 160, 560, ep, ep, () => {
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(160, 560, 90, 54, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a8dde'; ctx.beginPath(); ctx.arc(175, 560, 36, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(180, 560, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(188, 551, 6, 0, TAU); ctx.fill();
  });
  // 550 nm: a green photon and its huge frequency
  const gx = W / 2 - 600 + 1200 * ((750 - 550) / 370); // bar runs ~750 nm (red) → ~380 nm (violet)
  const gp = pop(t, tG - 0.1, 0.5);
  around(ctx, gx, 555, gp, gp, () => {
    ctx.strokeStyle = C.white; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(gx, 450); ctx.lineTo(gx, 660); ctx.stroke();
    card(ctx, gx - 95, 380, 190, 64, { fill: C.white, ew: 0, r: 32, drop: 0 });
    txt(ctx, '550 nm', gx, 412, { size: 38, color: '#1a9e5c', font: 'RoundB, YuanB' });
  });
  const np = pop(t, tN - 0.1, 0.5);
  if (np > 0) {
    around(ctx, W / 2, 830, np, np, () => {
      card(ctx, 420, 770, 1080, 120, { fill: 'rgba(61,220,151,0.15)', edge: C.mint, ew: 4, drop: 0, r: 30 });
      sineLine(ctx, 450, 760, 830, 34, 22, t * 60, { color: C.mint, w: 4 });
      txt(ctx, '每秒振动 ≈ 545 万亿次', 1130, 830, { size: 52, color: C.mint });
    });
    burst(ctx, t, tN, 1130, 830, { r: 340, n: 12 });
  }
}

// ---------- scene 10: photon energy vs total energy ----------
function energyScene(ctx, t) {
  const tQ = S('kidEnergy'), tP = S('photon'), tHi = at('photon', '频率越高'), tMore = at('photon', '越多');
  const tT = S('total'), tI = at('total', '强度'), tTime = at('total', '时间'), tNo = at('total', '不能');
  const kp = 1 - prog(t, tT - 0.4, tT);
  around(ctx, 230, 960, 1, kp, () => kid(ctx, t, 230, 960, 0.85, { talk: talkLevel(t, ['kidEnergy']), mood: t > tMore ? 'wow' : 'happy' }));
  const bq = pop(t, at('kidEnergy', '能量') - 0.1, 0.45) * kp;
  around(ctx, 480, 520, bq, bq, () => {
    card(ctx, 330, 470, 300, 100, { fill: C.cream, ew: 0, r: 50, drop: 8 });
    txt(ctx, '能量更大？', 480, 520, { size: 44, color: C.ink });
  });
  // single photons: low-f red vs high-f violet, each with an energy meter
  const sp = fadeIn(t, tP - 0.3, 0.4) * kp;
  if (sp > 0) {
    ctx.save(); ctx.globalAlpha *= sp;
    const meter = (x, col, lvl, label) => {
      card(ctx, x - 40, 260, 80, 300, { fill: 'rgba(255,255,255,0.1)', ew: 0, r: 20, drop: 0 });
      const h = 290 * lvl;
      card(ctx, x - 34, 555 - h, 68, h, { fill: col, ew: 0, r: 16, drop: 0 });
      txt(ctx, label, x, 220, { size: 38, color: col });
    };
    const lv = easeOut(prog(t, tHi, tMore + 0.3));
    photon(ctx, t, 900, 720, 60, { color: '#ff6b6b', freq: 0.5, tail: 4 });
    photon(ctx, t, 1500, 720, 60, { color: '#b06cff', freq: 3, tail: 4, mood: lv > 0.5 ? 'wow' : 'happy' });
    meter(1080, '#ff6b6b', lerp(0.3, 0.25, lv), '低频光子');
    meter(1680, '#b06cff', lerp(0.3, 0.92, lv), '高频光子');
    ctx.restore();
  }
  const fp = pop(t, at('photon', '能量') - 0.1, 0.5) * (1 - prog(t, tI - 0.5, tI - 0.1));
  around(ctx, W / 2 + 280, 120, fp, fp, () => {
    card(ctx, W / 2 + 80, 72, 400, 96, { fill: 'rgba(255,255,255,0.1)', edge: C.gold, ew: 4, drop: 0, r: 30 });
    txt(ctx, 'E光子 = h f', W / 2 + 280, 120, { size: 54, color: C.gold, font: 'RoundB, YuanB' });
  });
  // whole beam: a crowd of red photons outweighs one violet photon
  const tp = fadeIn(t, tT - 0.3, 0.5);
  if (tp <= 0) return;
  ctx.save(); ctx.globalAlpha *= tp;
  const tilt = -0.16 * easeIO(prog(t, tI, tI + 0.8));
  const cx = 960, cy = 470, arm = 520;
  ctx.fillStyle = '#c5cbe0';
  ctx.beginPath(); ctx.moveTo(cx - 70, 860); ctx.lineTo(cx + 70, 860); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  ctx.fillStyle = '#e8ecf8'; ctx.fillRect(-arm, -10, arm * 2, 20);
  ctx.restore();
  const pans = [[-1, '#ff6b6b'], [1, '#b06cff']];
  for (const [side, col] of pans) {
    const px = cx + side * arm * Math.cos(tilt), py = cy + side * arm * Math.sin(tilt) + 150;
    ctx.strokeStyle = '#c5cbe0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, py - 150); ctx.lineTo(px - 140, py); ctx.moveTo(px, py - 150); ctx.lineTo(px + 140, py); ctx.stroke();
    ctx.fillStyle = '#c5cbe0'; ctx.beginPath(); ctx.ellipse(px, py, 160, 26, 0, 0, Math.PI); ctx.fill();
    if (side < 0) {
      for (let i = 0; i < 12; i++) photon(ctx, t + i, px - 110 + (i % 6) * 44, py - 22 - Math.floor(i / 6) * 44, 20, { color: col, tail: 1.4, freq: 0.5 });
    } else photon(ctx, t, px, py - 34, 30, { color: col, tail: 1.6, freq: 3 });
  }
  ctx.restore();
  const chips = [['强度：光子多不多', tI, 470, C.pink], ['时间：照了多久', tTime, 1450, C.sky]];
  for (const [s, t0, x, col] of chips) {
    const p = pop(t, t0 - 0.1, 0.45);
    around(ctx, x, 200, p, p, () => {
      card(ctx, x - 230, 160, 460, 80, { fill: col, ew: 0, r: 40, drop: 6 });
      txt(ctx, s, x, 200, { size: 42, color: C.space });
    });
  }
  const np = pop(t, tNo - 0.1, 0.5);
  around(ctx, W / 2, 330, np, np, () => {
    card(ctx, W / 2 - 230, 290, 460, 84, { fill: C.gold, ew: 0, r: 42, drop: 8 });
    txt(ctx, '不能只比频率！', W / 2, 332, { size: 46, color: C.space });
  });
}

export const scenes = [
  { id: 'spectrum', from: S('lineup') - 0.4, to: S('visible') - 0.4, draw: spectrumScene },
  { id: 'visible', from: S('visible') - 0.4, to: S('kidEnergy') - 0.4, draw: visibleScene },
  { id: 'energy', from: S('kidEnergy') - 0.4, to: S('radioQ') - 0.4, draw: energyScene },
];

export const events = [
  ...['lineup', 'visible', 'kidEnergy'].map((id) => ({ type: 'whoosh', t: S(id) - 0.4, d: 0.45 })),
  { type: 'wobble', t: S('lineup'), d: 2.2, f: 200, rate: 3, amp: 0.5 },
  { type: 'wobble', t: S('lineup') + 1.2, d: 1.4, f: 700, rate: 12, amp: 0.35 },
  ...BANDS.map(([, w], i) => ({ type: 'note', t: at('members', w) - 0.1, n: 72 + [0, 2, 4, 5, 7, 9, 11][i], amp: 0.8 })),
  ...['广播', 'WiFi', '遥控器', '医院'].map((w, i) => ({ type: 'boing', t: at('uses', w) - 0.15, amp: 0.45 + i * 0.05 })),
  { type: 'whoosh', t: at('visible', '一小段') - 0.2, d: 0.7, from: 400, to: 2000 },
  { type: 'sparkle', t: at('visible', '一小段') + 0.3 },
  { type: 'pop', t: at('green', '550纳米') - 0.1, f: 800 },
  { type: 'zap', t: at('green', '五百') - 0.1, amp: 0.6 },
  { type: 'tada', t: at('green', '亿次'), amp: 0.5 },
  { type: 'pop', t: at('kidEnergy', '能量') - 0.1, f: 900 },
  { type: 'ding', t: at('photon', '能量') - 0.1, n: 86 },
  { type: 'wobble', t: at('photon', '频率越高'), d: 1.2, f: 260, rate: 4, amp: 0.4 },
  { type: 'wobble', t: at('photon', '频率越高') + 0.3, d: 1.2, f: 880, rate: 14, amp: 0.4 },
  { type: 'whoosh', t: S('total') - 0.3, d: 0.5 },
  { type: 'slam', t: at('total', '强度') + 0.6, shake: 10 },
  { type: 'pop', t: at('total', '时间') - 0.1, f: 800 },
  { type: 'stamp', t: at('total', '不能') - 0.1, shake: 8 },
];
void clamp; void cross; void glow;
