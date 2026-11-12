// Scenes 1–2 (vertical): the hook — sunlight, Wi-Fi and X-rays are one family — and the E/B wave leaving an antenna.
// Stage band: y ≈ 520–1260, x ≈ 60–920 (the right edge below y 760 is covered by Douyin's buttons).
import {
  W, C, S, at, prog, lerp, clamp, easeIO, pop, fadeIn,
  txt, card, around, arrow, burst, talkLevel,
} from './lib.mjs';
import { kid, sun, photon, glow } from './chars.mjs';
import { router, xrayHand, chirp } from './props.mjs';

const CX = 500;

// ---------- scene 1: hook ----------
function hookScene(ctx, t) {
  const tSun = at('hook', '阳光'), tWifi = at('hook', 'WiFi'), tX = at('hook', 'X'), tFam = at('hook', '一家');
  const tNo = S('yes'), tEM = at('yes', '电磁波'), tF = at('yes', '频率');
  const kp = 1 - prog(t, tF - 0.4, tF - 0.1);
  around(ctx, 190, 1250, 1, kp, () => kid(ctx, t, 190, 1250, 0.72, { talk: talkLevel(t, ['hook']), wave: t < tFam ? 1 : 0, mood: t > tEM ? 'wow' : 'happy' }));
  const qp = pop(t, tFam - 0.1, 0.4) * (1 - prog(t, tEM - 0.2, tEM));
  around(ctx, 330, 960, qp, qp, () => txt(ctx, '?', 330, 960 + Math.sin(t * 7) * 8, { size: 150, color: C.gold, stroke: C.space, sw: 10 }));
  // three "strangers" pop in on their words, then get framed as one family
  const items = [
    [tSun, 230, (x, y) => sun(ctx, t, x, y, 82)],
    [tWifi, 520, (x, y) => router(ctx, t, x, y + 30, 0.62)],
    [tX, 800, (x, y) => xrayHand(ctx, x, y, 0.85)],
  ];
  const fp = fadeIn(t, tNo - 0.15, 0.35);
  around(ctx, 515, 650, lerp(1.1, 1, fp), fp, () => {
    card(ctx, 90, 530, 850, 250, { fill: 'rgba(255,255,255,0.06)', edge: C.gold, ew: 6, drop: 0, r: 30 });
    txt(ctx, '全家福', 515, 530, { size: 38, color: C.space, stroke: C.gold, sw: 24 });
  });
  for (const [t0, x, draw] of items) {
    // the opening frame already shows three mystery slots, so the scroll-by thumbnail is never empty
    const ghost = 1 - prog(t, t0 - 0.12, t0 + 0.1);
    if (ghost > 0) {
      around(ctx, x, 655, 1, ghost, () => {
        card(ctx, x - 95, 560, 190, 190, { fill: 'rgba(255,255,255,0.08)', edge: 'rgba(255,255,255,0.35)', ew: 4, drop: 0, r: 40 });
        txt(ctx, '?', x, 660 + Math.sin(t * 6 + x) * 6, { size: 120, color: 'rgba(255,255,255,0.75)' });
      });
    }
    const p = pop(t, t0 - 0.12, 0.45);
    const hop = Math.abs(Math.sin((t - t0) * 7)) * 18 * (1 - prog(t, t0, t0 + 0.9));
    around(ctx, x, 655, p * (1 + 0.08 * Math.sin(Math.PI * prog(t, tFam, tFam + 0.4))), p, () => draw(x, 655 - hop));
  }
  const ep = pop(t, tEM - 0.1, 0.5);
  around(ctx, CX, 900, ep, ep, () => txt(ctx, '电磁波', CX + 15, 900, { size: 170, color: C.gold, stroke: C.space, sw: 16, shadow: 'rgba(0,0,0,0.5)' }));
  burst(ctx, t, tEM, CX + 15, 900, { r: 380, n: 14, size: 26 });
  // "only the frequency differs": one wave, stretched long on the left and squeezed on the right
  const cp = prog(t, tF - 0.2, tF + 0.8);
  if (cp > 0) {
    chirp(ctx, t, 110, 1080, 920, 1080, 44, easeIO(cp), { w: 8, l0: 260 });
    const lp = fadeIn(t, tF + 0.3, 0.3);
    around(ctx, CX, 1160, 1, lp, () => {
      txt(ctx, '频率低', 180, 1160, { size: 36, color: '#9aa8ff' });
      txt(ctx, '频率高', 850, 1160, { size: 36, color: C.mint });
    });
  }
}

// ---------- scene 2: the wave is born ----------
const AX = 150, AY = 880, X1 = 910, LAM = 300, V = 280, AE = 150, AB = 130, ZX = -0.55, ZY = 0.38;
const OM = (2 * Math.PI * V) / LAM;

function waveScene(ctx, t) {
  const tQ = at('make', '电荷'), tShake = at('make', '一晃'), tE = at('make', '电场'), tB = at('make', '磁场'), tOut = at('make', '往');
  const tUp = at('perp', '上下'), tLR = at('perp', '左右'), tSync = at('perp', '同'), tPerp = at('perp', '垂直');
  const shake = prog(t, tShake - 0.2, tShake + 0.3);
  const t0 = tE - 0.25;
  const front = AX + V * Math.max(0, t - t0);
  const fieldAt = (x) => (x > front ? 0 : clamp((front - x) / 100) * Math.sin(OM * (t - t0) - ((x - AX) / LAM) * 2 * Math.PI));
  const eOn = fadeIn(t, tE - 0.25, 0.3), bOn = fadeIn(t, tB - 0.25, 0.3);
  const hiE = 1 + 0.6 * Math.sin(Math.PI * prog(t, tUp - 0.1, tUp + 0.9)), hiB = 1 + 0.6 * Math.sin(Math.PI * prog(t, tLR - 0.1, tLR + 0.9));
  arrow(ctx, AX, AY, 935, AY, { color: 'rgba(255,255,255,0.55)', w: 5, head: 24, p: fadeIn(t, tShake, 0.5) });
  for (const [on, amp, dx, dy, col, dash, hi] of [[bOn, AB, ZX, ZY, C.bF, [16, 12], hiB], [eOn, AE, 0, -1, C.eF, null, hiE]]) {
    if (on <= 0) continue;
    ctx.save(); ctx.globalAlpha *= on;
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    for (let x = AX + 16; x < Math.min(front, X1); x += 24) {
      const v = fieldAt(x) * amp;
      ctx.beginPath(); ctx.moveTo(x, AY); ctx.lineTo(x + dx * v, AY + dy * v); ctx.stroke();
    }
    ctx.lineWidth = 7 * hi; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    if (hi > 1.01) { ctx.shadowColor = col; ctx.shadowBlur = 30 * (hi - 1); }
    ctx.beginPath();
    for (let x = AX; x <= Math.min(front, X1); x += 4) {
      const v = fieldAt(x) * amp;
      x === AX ? ctx.moveTo(x + dx * v, AY + dy * v) : ctx.lineTo(x + dx * v, AY + dy * v);
    }
    ctx.stroke(); ctx.restore();
  }
  // antenna + charge
  ctx.strokeStyle = '#d6dcf0'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(AX - 60, 680); ctx.lineTo(AX - 60, 1080); ctx.stroke();
  const qy = AY - 140 * shake * Math.sin(OM * (t - t0));
  const qp = pop(t, tQ - 0.1, 0.4);
  around(ctx, AX - 60, qy, qp, qp, () => {
    glow(ctx, AX - 60, qy, 10, 80, 'rgba(255,93,122,0.6)');
    ctx.fillStyle = '#ff5d7a'; ctx.beginPath(); ctx.arc(AX - 60, qy, 32, 0, Math.PI * 2); ctx.fill();
    txt(ctx, '+', AX - 60, qy - 2, { size: 50, font: 'RoundB', color: C.white });
  });
  around(ctx, AX - 60, 1125, 1, fadeIn(t, tQ - 0.1, 0.3), () => txt(ctx, '天线', AX - 60, 1125, { size: 36, color: C.pink }));
  // labels
  const le = pop(t, tE - 0.15), lb = pop(t, tB - 0.15);
  around(ctx, 420, 650, le, le, () => {
    card(ctx, 300, 618, 240, 66, { fill: C.eF, ew: 0, r: 33, drop: 5 });
    txt(ctx, '电场 E 实线', 420, 652, { size: 34, color: C.space });
  });
  around(ctx, 720, 650, lb, lb, () => {
    card(ctx, 600, 618, 240, 66, { fill: C.bF, ew: 0, r: 33, drop: 5 });
    txt(ctx, '磁场 B 虚线', 720, 652, { size: 34, color: C.space });
  });
  const op = fadeIn(t, tOut - 0.1, 0.3) * (1 - prog(t, tPerp - 0.3, tPerp));
  if (op > 0) photon(ctx, t, Math.min(front, X1) - 10, AY - fieldAt(Math.min(front, X1) - 30) * AE, 30, { color: '#fff1a8' });
  around(ctx, 830, AY + 40, 1, op, () => txt(ctx, '往外跑 →', 820, AY + 45, { size: 34, color: C.white }));
  // sync dot + perpendicular gizmo
  const sp = fadeIn(t, tSync - 0.2, 0.3);
  if (sp > 0) {
    const mx = 600, v = fieldAt(mx);
    ctx.save(); ctx.globalAlpha *= sp;
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(mx, AY, 13, 0, Math.PI * 2); ctx.fill();
    arrow(ctx, mx, AY, mx, AY - v * AE, { color: C.eF, w: 10, head: 26 });
    arrow(ctx, mx, AY, mx + ZX * v * AB, AY + ZY * v * AB, { color: C.bF, w: 10, head: 26 });
    ctx.restore();
    const sg = pop(t, tSync, 0.4);
    around(ctx, 300, 1170, sg, sg, () => {
      card(ctx, 160, 1130, 280, 80, { fill: C.mint, ew: 0, r: 40, drop: 6 });
      txt(ctx, '同起同落', 300, 1170, { size: 44, color: C.space });
    });
  }
  const gp = pop(t, tPerp - 0.15, 0.45);
  around(ctx, 700, 1170, gp, gp, () => {
    card(ctx, 520, 1080, 360, 175, { fill: 'rgba(255,255,255,0.08)', edge: 'rgba(255,255,255,0.3)', ew: 3, drop: 0, r: 26 });
    const ox = 680, oy = 1210;
    arrow(ctx, ox, oy, ox + 170, oy, { color: C.white, w: 7, head: 20 });
    arrow(ctx, ox, oy, ox, oy - 105, { color: C.eF, w: 7, head: 20 });
    arrow(ctx, ox, oy, ox - 100, oy + 35, { color: C.bF, w: 7, head: 20 });
    txt(ctx, 'E', ox + 26, oy - 95, { size: 36, font: 'RoundB', color: C.eF });
    txt(ctx, 'B', ox - 118, oy + 18, { size: 36, font: 'RoundB', color: C.bF });
    txt(ctx, '两两垂直', 590, 1112, { size: 30, color: C.white });
  });
}

export const scenes = [
  { id: 'hook', from: 0, to: S('make') - 0.3, draw: hookScene },
  { id: 'wave', from: S('make') - 0.3, to: S('kidAir') - 0.3, draw: waveScene },
];

export const events = [
  { type: 'whoosh', t: 0, d: 0.4, from: 900, to: 3000 },
  { type: 'boing', t: at('hook', '阳光') - 0.12, amp: 0.6 },
  { type: 'boing', t: at('hook', 'WiFi') - 0.12, amp: 0.7 },
  { type: 'boing', t: at('hook', 'X') - 0.12, amp: 0.8 },
  { type: 'pop', t: at('hook', '一家') - 0.1, f: 900 },
  { type: 'stamp', t: S('yes') - 0.1, shake: 8 },
  { type: 'tada', t: at('yes', '电磁波') - 0.1, amp: 0.7 },
  { type: 'wobble', t: at('yes', '频率') - 0.2, d: 1.0, f: 260, rate: 3, amp: 0.4 },
  { type: 'wobble', t: at('yes', '频率') + 0.3, d: 0.8, f: 700, rate: 12, amp: 0.35 },
  { type: 'whoosh', t: S('make') - 0.3, d: 0.4 },
  { type: 'pop', t: at('make', '电荷') - 0.1, f: 800 },
  { type: 'zap', t: at('make', '一晃') - 0.1, amp: 0.7 },
  { type: 'wobble', t: at('make', '电场') - 0.25, d: 2.0, f: 300, amp: 0.7 },
  { type: 'wobble', t: at('make', '磁场') - 0.25, d: 1.6, f: 450, amp: 0.5 },
  { type: 'whoosh', t: at('make', '往') - 0.1, d: 0.6, from: 600, to: 3000 },
  { type: 'note', t: at('perp', '上下'), n: 79 },
  { type: 'note', t: at('perp', '左右'), n: 84 },
  { type: 'ding', t: at('perp', '同'), n: 88 },
  { type: 'pop', t: at('perp', '垂直') - 0.15, f: 800 },
];
void W;
