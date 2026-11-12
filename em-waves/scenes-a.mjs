// Scenes 1–3: the hook (sunlight / radio / Wi-Fi are one family), what a "field" is, and the E/B wave leaving an antenna.
import {
  W, C, S, at, prog, lerp, clamp, easeIO, easeOut, elastic, pop, fadeIn,
  txt, card, around, arrow, burst, talkLevel, sineLine,
} from './lib.mjs';
import { kid, sun, photon, glow } from './chars.mjs';
import { radio, router, balloon, magnet, compass } from './props.mjs';

const RAINBOW = ['#ff5d5d', '#ff9f43', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b6cff', '#c56cff'];

// ---------- scene 1: hook ----------
function introScene(ctx, t) {
  const tSun = at('hook', '阳光'), tRadio = at('hook', '收音机'), tWifi = at('hook', 'WiFi');
  const tFam = at('family', '一家人'), tEM = at('family', '电磁波'), tDraw = at('draw', '画出来');
  kid(ctx, t, 330, 900, 1.1, { talk: talkLevel(t, ['hook']), wave: t < tWifi + 1 ? 1 : 0, mood: t > tEM ? 'wow' : 'happy' });
  const qp = pop(t, at('hook', '共同点') - 0.1, 0.45) * (1 - prog(t, tEM - 0.3, tEM));
  around(ctx, 470, 470, qp, qp, () => txt(ctx, '?', 470, 470 + Math.sin(t * 6) * 8, { size: 150, color: C.gold, stroke: C.space, sw: 10 }));

  // three everyday things hop in, then line up inside a family photo
  const gather = easeIO(prog(t, tFam - 0.3, tFam + 0.5));
  const items = [
    [tSun, lerp(840, 900, gather), 330, (x, y) => sun(ctx, t, x, y, 92)],
    [tRadio, 1230, lerp(400, 360, gather), (x, y) => radio(ctx, t, x, y, 0.72, { on: 1 })],
    [tWifi, lerp(1620, 1560, gather), lerp(420, 400, gather), (x, y) => router(ctx, t, x, y, 0.72)],
  ];
  const fp = fadeIn(t, tFam - 0.2, 0.4);
  around(ctx, 1230, 360, lerp(1.1, 1, fp), fp, () => {
    card(ctx, 720, 140, 1020, 420, { fill: 'rgba(255,255,255,0.06)', edge: C.gold, ew: 6, drop: 0, r: 30 });
    txt(ctx, '全家福', 1230, 140, { size: 40, color: C.space, stroke: C.gold, sw: 26 });
  });
  for (const [t0, x, y, draw] of items) {
    const p = pop(t, t0 - 0.1, 0.5);
    const hop = Math.abs(Math.sin((t - t0) * 6)) * 18 * (1 - prog(t, t0, t0 + 1));
    around(ctx, x, y, p, p, () => draw(x, y - hop));
  }
  const ep = pop(t, tEM - 0.1, 0.55);
  around(ctx, 1230, 690, ep, ep, () => {
    txt(ctx, '电磁波', 1230, 690, { size: 170, color: C.gold, stroke: C.space, sw: 16, shadow: 'rgba(0,0,0,0.5)' });
  });
  burst(ctx, t, tEM, 1230, 690, { r: 420, n: 14, size: 26 });
  // "draw the invisible": a rainbow wave sketches itself across, a photon rides its tip
  const dp = easeOut(prog(t, tDraw - 0.2, tDraw + 1.4));
  if (dp > 0) {
    const x0 = 640, x1 = lerp(x0, 1820, dp);
    RAINBOW.forEach((col, i) => sineLine(ctx, x0, x1, 865 + (i - 3) * 9, 36, 230, t * 3, { color: col, w: 7, alpha: 0.9 }));
    const yTip = 865 - 36 * Math.sin(((x1 - x0) / 230) * Math.PI * 2 - t * 3);
    photon(ctx, t, x1, yTip, 40, { color: '#fff1a8', mood: 'happy' });
  }
}

// ---------- scene 2: fields ----------
const BITS = [...Array(9)].map((_, i) => ({ x: 380 + i * 26 + (i % 2) * 6, rot: i * 0.9, col: RAINBOW[i % 7], d: (i % 3) * 0.07 }));

function fieldScene(ctx, t) {
  const tChar = at('fieldQ', '场'), tB = S('balloon'), tSuck = at('balloon', '吸起'), tMag = at('magnet', '靠近');
  const tTurn = at('magnet', '转'), tE = at('fieldDef', '电场'), tBf = at('fieldDef', '磁场');
  // the big 场 first, then it moves up as a title
  const up = easeIO(prog(t, tB - 0.3, tB + 0.3));
  const cp = pop(t, tChar - 0.1, 0.5);
  around(ctx, W / 2, lerp(440, 170, up), cp * lerp(1, 0.45, up), cp, () => {
    glow(ctx, W / 2, lerp(440, 170, up), 40, 260, 'rgba(255,210,63,0.25)');
    txt(ctx, '场', W / 2, lerp(440, 170, up), { size: 280, color: C.gold, stroke: C.space, sw: 18 });
  });
  const lp = fadeIn(t, tB - 0.1, 0.4);
  if (lp <= 0) return;
  ctx.save(); ctx.globalAlpha *= lp;
  // left: rubbed balloon lifts paper bits across a gap
  card(ctx, 300, 800, 440, 22, { fill: '#9a7a5a', ew: 0, drop: 6, r: 8 });
  const by = lerp(330, 560, easeIO(prog(t, at('balloon', '距离') - 0.4, at('balloon', '距离') + 0.4)));
  if (t > tE - 0.2) {
    const ep = fadeIn(t, tE - 0.2, 0.5);
    ctx.save(); ctx.globalAlpha *= ep * 0.8; ctx.setLineDash([10, 12]); ctx.lineDashOffset = t * 30;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arrow(ctx, 500 + Math.cos(a) * 140, by + Math.sin(a) * 160, 500 + Math.cos(a) * 95, by + Math.sin(a) * 118, { color: C.eF, w: 5, head: 18 });
    }
    ctx.restore();
    around(ctx, 250, by - 140, ep, ep, () => card(ctx, 160, by - 180, 180, 76, { fill: C.eF, ew: 0, r: 38, drop: 6 }));
    around(ctx, 250, by - 140, ep, ep, () => txt(ctx, '电场 E', 250, by - 142, { size: 40, color: C.space }));
  }
  balloon(ctx, t, 500, by, 95, { charge: 1 });
  BITS.forEach((b, i) => {
    const p = easeOut(prog(t, tSuck - 0.15 + b.d, tSuck + 0.35 + b.d));
    const x = lerp(b.x, 470 + (i - 4) * 9, p), y = lerp(790, by + 125 + (i % 3) * 8, p);
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot + p * 3 + Math.sin(t * 8 + i) * 0.2 * p);
    ctx.fillStyle = b.col; ctx.fillRect(-10, -6, 20, 12); ctx.restore();
  });
  // right: magnet slides toward a compass and the needle swings
  const mp = easeIO(prog(t, tMag - 0.6, tMag + 0.3));
  const mx = lerp(2050, 1700, mp), my = 520;
  const cx = 1330, cy = 600;
  const target = Math.atan2(my + 90 * 0.9 - cy, mx - 104 * 0.9 - cx) + Math.PI / 2;
  const turn = elastic(prog(t, tTurn - 0.5, tTurn + 0.7));
  if (t > tBf - 0.2) {
    const bp = fadeIn(t, tBf - 0.2, 0.5);
    ctx.save(); ctx.globalAlpha *= bp * 0.85; ctx.strokeStyle = C.bF; ctx.lineWidth = 5; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 30;
    for (const k of [1, 1.7, 2.5]) {
      ctx.beginPath(); ctx.ellipse(mx - 100, my, 60 * k + 40, 90 * k, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    }
    ctx.restore();
    around(ctx, 1560, 290, bp, bp, () => {
      card(ctx, 1470, 252, 180, 76, { fill: C.bF, ew: 0, r: 38, drop: 6 });
      txt(ctx, '磁场 B', 1560, 288, { size: 40, color: C.space });
    });
  }
  compass(ctx, cx, cy, 110, lerp(0, target, turn) + Math.sin(t * 3) * 0.03);
  magnet(ctx, mx, my, 0.9, Math.PI / 2);
  const gp = pop(t, at('fieldDef', '隔空') - 0.1, 0.45) * (1 - prog(t, tE - 0.3, tE));
  around(ctx, W / 2, 560, gp, gp, () => card(ctx, W / 2 - 150, 510, 300, 100, { fill: C.pink, ew: 0, r: 50 }));
  around(ctx, W / 2, 560, gp, gp, () => txt(ctx, '隔空作用!', W / 2, 558, { size: 50, color: C.space }));
  ctx.restore();
}

// ---------- scene 3: the electromagnetic wave ----------
const AX = 330, AY = 520, X1 = 1800, LAM = 380, V = 300, AE = 170, AB = 150, ZX = -0.55, ZY = 0.38;
const OM = (2 * Math.PI * V) / LAM;

function waveScene(ctx, t) {
  const tShake = at('shake', '晃动'), tE = at('shake', '电场'), tB = at('shake', '磁场'), tOut = at('shake', '传播');
  const tDef = S('waveDef'), tUp = at('perp', '上下'), tLR = at('perp', '左右'), tPerp = at('perp', '垂直'), tSync = at('perp', '同');
  const shake = prog(t, tShake - 0.2, tShake + 0.4);
  const t0 = tE - 0.3;
  const front = AX + V * Math.max(0, t - t0);
  const fieldAt = (x) => (x > front ? 0 : clamp((front - x) / 120) * Math.sin(OM * (t - t0) - ((x - AX) / LAM) * 2 * Math.PI));
  const eOn = fadeIn(t, tE - 0.3, 0.4), bOn = fadeIn(t, tB - 0.3, 0.4);
  const hiE = 1 + 0.5 * Math.sin(Math.PI * prog(t, tUp - 0.1, tUp + 1.0)), hiB = 1 + 0.5 * Math.sin(Math.PI * prog(t, tLR - 0.1, tLR + 1.0));
  // propagation axis
  arrow(ctx, AX, AY, 1860, AY, { color: 'rgba(255,255,255,0.55)', w: 5, head: 26, p: fadeIn(t, tShake, 0.6) });
  const pp = fadeIn(t, tOut - 0.1, 0.4);
  around(ctx, 1760, AY + 50, 1, pp, () => txt(ctx, '前进方向 →', 1760, AY + 50, { size: 34, color: C.white }));
  // B (dashed, projected toward the viewer) behind, E (solid, up-down) in front
  for (const [on, amp, dx, dy, col, dash, hi] of [[bOn, AB, ZX, ZY, C.bF, [16, 12], hiB], [eOn, AE, 0, -1, C.eF, null, hiE]]) {
    if (on <= 0) continue;
    ctx.save(); ctx.globalAlpha *= on;
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    for (let x = AX + 20; x < Math.min(front, X1); x += 28) {
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
  // antenna with a charge sliding up and down
  ctx.strokeStyle = '#d6dcf0'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(AX - 60, 300); ctx.lineTo(AX - 60, 760); ctx.stroke();
  const qy = AY - 150 * shake * Math.sin(OM * (t - t0));
  glow(ctx, AX - 60, qy, 10, 80, 'rgba(255,93,122,0.6)');
  ctx.fillStyle = '#ff5d7a'; ctx.beginPath(); ctx.arc(AX - 60, qy, 34, 0, Math.PI * 2); ctx.fill();
  txt(ctx, '+', AX - 60, qy - 2, { size: 52, font: 'RoundB', color: C.white });
  const lq = fadeIn(t, tShake - 0.3, 0.4);
  around(ctx, AX - 60, 820, 1, lq, () => txt(ctx, '天线里的电荷', AX - 60, 815, { size: 36, color: C.pink }));
  // labels
  around(ctx, 700, 280, pop(t, tE - 0.2), pop(t, tE - 0.2), () => txt(ctx, '电场 E（实线）', 700, 280, { size: 42, color: C.eF }));
  around(ctx, 700, 780, pop(t, tB - 0.2), pop(t, tB - 0.2), () => txt(ctx, '磁场 B（虚线）', 700, 780, { size: 42, color: C.bF }));
  const dp = pop(t, tDef - 0.1, 0.5) * (1 - prog(t, tUp - 0.3, tUp));
  around(ctx, 1150, 190, dp, dp, () => txt(ctx, '电磁波！', 1150, 190, { size: 130, color: C.gold, stroke: C.space, sw: 14 }));
  burst(ctx, t, tDef, 1150, 190, { r: 360, n: 12 });
  // 3-axis gizmo: E, B and the travel direction are mutually perpendicular
  const gp = pop(t, tPerp - 0.15, 0.5);
  around(ctx, 1500, 200, gp, gp, () => {
    card(ctx, 1290, 90, 420, 250, { fill: 'rgba(255,255,255,0.08)', edge: 'rgba(255,255,255,0.3)', ew: 3, drop: 0, r: 30 });
    const ox = 1470, oy = 250;
    arrow(ctx, ox, oy, ox + 190, oy, { color: C.white, w: 7, head: 22 });
    arrow(ctx, ox, oy, ox, oy - 130, { color: C.eF, w: 7, head: 22 });
    arrow(ctx, ox, oy, ox - 120, oy + 70, { color: C.bF, w: 7, head: 22 });
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.strokeRect(ox, oy - 22, 22, 22);
    txt(ctx, 'E', ox + 26, oy - 120, { size: 40, font: 'RoundB', color: C.eF });
    txt(ctx, 'B', ox - 140, oy + 50, { size: 40, font: 'RoundB', color: C.bF });
    txt(ctx, '两两垂直', 1390, 130, { size: 36, color: C.white });
  });
  // sync marker: one spot where E and B rise and fall together
  const sp = fadeIn(t, tSync - 0.2, 0.3);
  if (sp > 0) {
    const mx = 1100, v = fieldAt(mx);
    ctx.save(); ctx.globalAlpha *= sp;
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(mx, AY, 14, 0, Math.PI * 2); ctx.fill();
    arrow(ctx, mx, AY, mx, AY - v * AE, { color: C.eF, w: 10, head: 28 });
    arrow(ctx, mx, AY, mx + ZX * v * AB, AY + ZY * v * AB, { color: C.bF, w: 10, head: 28 });
    ctx.restore();
    const sg = pop(t, tSync, 0.45);
    around(ctx, 1100, 830, sg, sg, () => {
      card(ctx, 960, 790, 280, 84, { fill: C.mint, ew: 0, r: 42, drop: 6 });
      txt(ctx, '同起同落', 1100, 830, { size: 44, color: C.space });
    });
  }
}

export const scenes = [
  { id: 'intro', from: 0, to: S('fieldQ') - 0.4, draw: introScene },
  { id: 'field', from: S('fieldQ') - 0.4, to: S('shake') - 0.4, draw: fieldScene },
  { id: 'wave', from: S('shake') - 0.4, to: S('kidAir') - 0.4, draw: waveScene },
];

export const events = [
  { type: 'whoosh', t: 0.1, d: 0.6 },
  ...['阳光', '收音机', 'WiFi'].map((w, i) => ({ type: 'boing', t: at('hook', w) - 0.1, amp: 0.6 + i * 0.1 })),
  { type: 'pop', t: at('hook', '共同点') - 0.1, f: 900 },
  { type: 'whoosh', t: at('family', '一家人') - 0.3, d: 0.5 },
  { type: 'tada', t: at('family', '电磁波') - 0.1, amp: 0.7 },
  { type: 'scribble', t: at('draw', '画出来') - 0.2, d: 1.4 },
  { type: 'sparkle', t: at('draw', '画出来') + 1.1, amp: 0.6 },
  { type: 'whoosh', t: S('fieldQ') - 0.4, d: 0.45 },
  { type: 'stamp', t: at('fieldQ', '场') - 0.1, shake: 10 },
  { type: 'whoosh', t: at('balloon', '距离') - 0.4, d: 0.8, from: 300, to: 900, amp: 0.5 },
  ...[0, 1, 2].map((i) => ({ type: 'pop', t: at('balloon', '吸起') - 0.1 + i * 0.07, f: 900 + i * 200, amp: 0.6 })),
  { type: 'whoosh', t: at('magnet', '靠近') - 0.6, d: 0.8, from: 400, to: 1500, amp: 0.5 },
  { type: 'boing', t: at('magnet', '转') - 0.4 },
  { type: 'pop', t: at('fieldDef', '隔空') - 0.1, f: 700 },
  { type: 'zap', t: at('fieldDef', '电场') - 0.1 },
  { type: 'ding', t: at('fieldDef', '磁场') - 0.1, n: 84 },
  { type: 'whoosh', t: S('shake') - 0.4, d: 0.45 },
  { type: 'zap', t: at('shake', '晃动') - 0.1, amp: 0.7 },
  { type: 'wobble', t: at('shake', '电场') - 0.3, d: 2.5, f: 300, amp: 0.8 },
  { type: 'wobble', t: at('shake', '磁场') - 0.3, d: 2.0, f: 450, amp: 0.6 },
  { type: 'tada', t: S('waveDef') - 0.1, amp: 0.6 },
  { type: 'note', t: at('perp', '上下'), n: 79 },
  { type: 'note', t: at('perp', '左右'), n: 84 },
  { type: 'pop', t: at('perp', '垂直') - 0.15, f: 800 },
  { type: 'ding', t: at('perp', '同'), n: 88 },
];
void easeOut;
