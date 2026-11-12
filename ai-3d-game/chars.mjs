// Characters: Kitty (narrator), the little prince (game hero, with T-pose / white-model / wire / bone modes) and AI bots.
import { createCanvas } from '@napi-rs/canvas';
import { C, ZH, txt, card, measure, around, clamp } from './lib.mjs';

const OUT = '#2b1a55';
function ell(ctx, x, y, rx, ry, fill, stroke = OUT, lw = 5, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
const blinkAt = (t, k = 0) => ((t + k) % 3.7 < 0.12 ? 0.12 : 1);

// ---------- Kitty: white kitten with a red bow, no mouth. Origin = between the feet. ~430 px tall at s=1 ----------
export function kitty(ctx, t, x, y, s = 1, o = {}) {
  const { talk = 0, wave = 0, point = 0, hop = 0, look = 0 } = o;
  const bob = talk ? Math.abs(Math.sin(t * 9)) * 7 : Math.sin(t * 2.4) * 3;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ell(ctx, 0, 2, 105, 16, 'rgba(0,0,0,0.25)', null);
  ctx.translate(0, -hop);
  ell(ctx, -42, -16, 40, 22, C.white);
  ell(ctx, 42, -16, 40, 22, C.white);
  // dress
  ctx.beginPath();
  ctx.moveTo(-58, -150); ctx.lineTo(58, -150); ctx.quadraticCurveTo(96, -60, 92, -30);
  ctx.quadraticCurveTo(0, -18, -92, -30); ctx.quadraticCurveTo(-96, -60, -58, -150); ctx.closePath();
  ctx.fillStyle = '#ff6f9c'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.stroke();
  ell(ctx, -26, -100, 7, 7, '#ffe066', null); ell(ctx, 26, -100, 7, 7, '#ffe066', null);
  // arms: left can wave, right can point
  const aL = wave ? -2.5 + Math.sin(t * 11) * 0.35 * wave : 0.55;
  const aR = point ? -1.45 + Math.sin(t * 3) * 0.05 : -0.55;
  ell(ctx, -62 - Math.sin(aL) * 34, -130 + Math.cos(aL) * 34, 20, 40, C.white, OUT, 5, -aL);
  ell(ctx, 62 - Math.sin(aR) * 34, -130 + Math.cos(aR) * 34, 20, 40, C.white, OUT, 5, -aR);
  // head
  ctx.save();
  ctx.translate(0, -150 - bob * 0.4);
  ctx.rotate((talk ? Math.sin(t * 7) * 0.05 : 0) + look * 0.12);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 128, -128); ctx.quadraticCurveTo(sx * 128, -230, sx * 100, -228);
    ctx.quadraticCurveTo(sx * 70, -205, sx * 40, -190); ctx.closePath();
    ctx.fillStyle = C.white; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.stroke();
  }
  ell(ctx, 0, -112, 140, 104, C.white);
  // bow on her left ear
  ctx.save();
  ctx.translate(96, -196); ctx.rotate(0.35 + Math.sin(t * 12) * 0.12 * (talk ? 1 : 0.2));
  ell(ctx, -38, 0, 40, 30, C.red, OUT, 5, -0.25);
  ell(ctx, 38, 0, 40, 30, C.red, OUT, 5, 0.25);
  ell(ctx, 0, 0, 17, 17, '#ff5a6e');
  ctx.restore();
  const bl = blinkAt(t);
  ell(ctx, -58, -108, 10, 15 * bl, '#1b1236', null);
  ell(ctx, 58, -108, 10, 15 * bl, '#1b1236', null);
  ell(ctx, 0, -80, 15, 10, '#ffd23f', OUT, 4);
  ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const wig = talk ? Math.sin(t * 18) * 3 : 0;
  for (const sx of [-1, 1])
    for (const dy of [-18, 0, 18]) {
      ctx.beginPath();
      ctx.moveTo(sx * 128, -92 + dy * 0.6); ctx.lineTo(sx * 182, -96 + dy * 1.4 + wig);
      ctx.stroke();
    }
  ctx.restore();
  ctx.restore();
}

// ---------- the little prince ----------
const PAL = {
  color: { coat: '#3a9d5d', pants: '#2f6e4a', skin: '#ffd9b8', hair: '#ffcf3a', scarf: '#ffd23f', boot: '#6b3f2a', belt: '#e8344e', line: OUT },
  white: { coat: '#e9e9f2', pants: '#dcdce8', skin: '#eeeef6', hair: '#e2e2ee', scarf: '#e6e6f0', boot: '#cfd0e0', belt: '#d6d6e4', line: '#8a90bc' },
};
const DEF = { armL: 0.15, armR: 0.15, elbL: 0, elbR: 0, legL: 0.06, legR: 0.06, kneeL: 0, kneeR: 0 };

// Joint positions in local units (origin = feet, up = -y).
export function princeJoints(pose = {}, view = 'front') {
  const p = { ...DEF, ...pose };
  const hw = { front: 58, q: 50, side: 34, back: 58 }[view];
  const spread = { front: 1, q: 0.75, side: 0.15, back: 1 }[view];
  const limb = (base, a, b, len1, len2, sx, sp) => {
    const e = [base[0] + sx * Math.sin(a) * len1 * sp, base[1] + Math.cos(a) * len1];
    const h = [e[0] + sx * Math.sin(a + b) * len2 * sp, e[1] + Math.cos(a + b) * len2];
    return [e, h];
  };
  const shL = [-hw, -252], shR = [hw, -252], hipL = [-24, -148], hipR = [24, -148];
  const [elL, haL] = limb(shL, p.armL, p.elbL, 62, 58, -1, spread);
  const [elR, haR] = limb(shR, p.armR, p.elbR, 62, 58, 1, spread);
  const [knL, ftL] = limb(hipL, p.legL, p.kneeL, 74, 70, -1, 1);
  const [knR, ftR] = limb(hipR, p.legR, p.kneeR, 74, 70, 1, 1);
  return { hw, shL, shR, elL, elR, haL, haR, hipL, hipR, knL, knR, ftL, ftR, neck: [0, -262], head: [0, -322], pelvis: [0, -150] };
}

function seg(ctx, pts, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.stroke();
}

function princeBody(ctx, t, o) {
  const { view = 'front', mode = 'color', pose, scarfWind = 1, tail = 1 } = o;
  const P = PAL[mode === 'color' ? 'color' : 'white'];
  const J = princeJoints(pose, view);
  const L = P.line;
  // scarf tail behind
  const wv = Math.sin(t * 6) * 14 * scarfWind;
  ctx.beginPath();
  ctx.moveTo(-6, -262); ctx.bezierCurveTo(70 * tail, -280 + wv, 140 * tail, -250 - wv, 205 * tail, -268 + wv);
  ctx.lineTo(190 * tail, -238 + wv); ctx.bezierCurveTo(130 * tail, -222 - wv, 70 * tail, -240 + wv, 6, -238); ctx.closePath();
  ctx.fillStyle = P.scarf; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 4; ctx.stroke();
  // legs
  for (const [h, k, f] of [[J.hipL, J.knL, J.ftL], [J.hipR, J.knR, J.ftR]]) {
    seg(ctx, [h, k, f], 40, L); seg(ctx, [h, k, f], 30, P.pants);
    ell(ctx, f[0], f[1] - 4, 26, 16, P.boot, L, 4);
  }
  // coat
  const hw = J.hw;
  ctx.beginPath();
  ctx.moveTo(-hw, -258); ctx.lineTo(hw, -258); ctx.lineTo(hw + 22, -118); ctx.quadraticCurveTo(0, -104, -hw - 22, -118); ctx.closePath();
  ctx.fillStyle = P.coat; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = P.belt; ctx.fillRect(-hw - 6, -168, hw * 2 + 12, 16);
  if (view !== 'back' && mode === 'color') for (const yy of [-230, -200]) ell(ctx, view === 'side' ? 16 : 0, yy, 6, 6, P.hair, null);
  // arms
  for (const [sh, el, ha] of [[J.shL, J.elL, J.haL], [J.shR, J.elR, J.haR]]) {
    seg(ctx, [sh, el, ha], 34, L); seg(ctx, [sh, el, ha], 25, P.coat);
    ell(ctx, ha[0], ha[1], 15, 15, P.skin, L, 4);
  }
  // head
  ell(ctx, 0, -322, 64, 62, P.skin, L, 5);
  const fx = { front: 0, q: 20, side: 36, back: null }[view];
  // spiky hair crown
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const r = i % 2 ? 66 : 92;
    ctx.lineTo(Math.cos(a) * r, -330 + Math.sin(a) * r * 0.95);
  }
  ctx.lineTo(62, -322); ctx.quadraticCurveTo(0, -300 + (fx === null ? 60 : 0), -62, -322); ctx.closePath();
  ctx.fillStyle = P.hair; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 5; ctx.stroke();
  if (fx !== null) {
    const bl = blinkAt(t, 1.3);
    const eyes = view === 'side' ? [fx + 10] : [fx - 22, fx + 22];
    for (const ex of eyes) ell(ctx, ex, -312, 6, 9 * bl, mode === 'color' ? '#1b1236' : '#b9bdd8', null);
    if (mode === 'color') {
      for (const ex of eyes) ell(ctx, ex + (view === 'side' ? -4 : 0) + (ex < fx ? -10 : 10), -290, 11, 7, 'rgba(255,120,140,0.45)', null);
      ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(fx + (view === 'side' ? 16 : 0), -292, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    }
  }
  // scarf knot
  ell(ctx, 0, -258, 30, 14, P.scarf, L, 4);
  return J;
}

function drawBones(ctx, J, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  const chains = [[J.head, J.neck, J.pelvis], [J.neck, J.shL, J.elL, J.haL], [J.neck, J.shR, J.elR, J.haR],
    [J.pelvis, J.hipL, J.knL, J.ftL], [J.pelvis, J.hipR, J.knR, J.ftR]];
  for (const ch of chains) { seg(ctx, ch, 14, 'rgba(20,10,50,0.6)'); seg(ctx, ch, 7, '#ffd23f'); }
  for (const ch of chains) for (const q of ch) ell(ctx, q[0], q[1], 10, 10, C.sky, '#14103a', 4);
  ctx.restore();
}

const layers = new Map();
function layer(w, h) {
  const k = `${w}x${h}`;
  if (!layers.has(k)) layers.set(k, createCanvas(w, h));
  const cv = layers.get(k);
  cv.getContext('2d').clearRect(0, 0, w, h);
  return cv;
}

// mode: 'color' | 'white' | 'wire'; o.wire (0..1) overlays the quad mesh; o.bones (0..1) overlays the rig.
// Returns joint positions in world coordinates.
export function prince(ctx, t, x, y, s = 1, o = {}) {
  const wire = o.mode === 'wire' ? 1 : (o.wire ?? 0);
  let J;
  if (wire > 0) {
    const LW = Math.ceil(600 * s), LH = Math.ceil(520 * s);
    const cv = layer(LW, LH), c2 = cv.getContext('2d');
    c2.save(); c2.translate(LW / 2, LH - 40 * s); c2.scale(s, s);
    J = princeBody(c2, t, { ...o, mode: o.mode === 'color' ? 'color' : 'white' });
    c2.globalCompositeOperation = 'source-atop';
    c2.strokeStyle = 'rgba(70,80,160,0.6)'; c2.lineWidth = 2;
    for (let gx = -300; gx <= 300; gx += 20) {
      c2.beginPath();
      for (let gy = -440; gy <= 20; gy += 20) c2.lineTo(gx + Math.sin(gy / 70) * 6 * Math.sign(gx), gy);
      c2.stroke();
    }
    for (let gy = -440; gy <= 20; gy += 20) {
      c2.beginPath();
      for (let gx = -300; gx <= 300; gx += 20) c2.lineTo(gx, gy + Math.cos(gx / 60) * 5);
      c2.stroke();
    }
    c2.restore();
    if (o.mode === 'wire') {
      ctx.drawImage(cv, x - LW / 2, y - LH + 40 * s);
      J = princeJoints(o.pose, o.view);
    }
  }
  if (o.mode !== 'wire') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ell(ctx, 0, 2, 90, 14, 'rgba(0,0,0,0.25)', null);
    J = princeBody(ctx, t, o);
    ctx.restore();
    if (wire > 0) {
      // re-draw mesh layer on top of the coloured body
      ctx.save(); ctx.globalAlpha *= wire;
      const LW = Math.ceil(600 * s), LH = Math.ceil(520 * s);
      ctx.drawImage(layers.get(`${LW}x${LH}`), x - LW / 2, y - LH + 40 * s);
      ctx.restore();
    }
  }
  if (o.bones) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    drawBones(ctx, J, o.bones);
    ctx.restore();
  }
  const w = (q) => [x + q[0] * s, y + q[1] * s];
  return Object.fromEntries(Object.entries(J).map(([k, v]) => [k, Array.isArray(v) ? w(v) : v]));
}

// ---------- AI bot: a screen-headed robot carrying its tool name ----------
export function bot(ctx, t, x, y, s = 1, o = {}) {
  const { color = C.orange, label = '', tool = null, talk = 0, mood = 'happy', armUp = 0 } = o;
  const hop = Math.abs(Math.sin(t * 5)) * 6 * (talk ? 1 : 0.3);
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ell(ctx, 0, 2, 70, 12, 'rgba(0,0,0,0.25)', null);
  ctx.translate(0, -hop);
  ell(ctx, -30, -10, 22, 12, '#3a3466'); ell(ctx, 30, -10, 22, 12, '#3a3466');
  card(ctx, -58, -128, 116, 112, { fill: color, r: 30, ew: 5, edge: OUT, drop: 0 });
  // arms
  ctx.strokeStyle = OUT; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-58, -95); ctx.lineTo(-88, -50); ctx.stroke();
  const ra = -0.5 - armUp * 1.6 + Math.sin(t * 8) * 0.12 * (tool ? 1 : 0);
  const hx = 58 + Math.cos(ra) * 52, hy = -95 + Math.sin(ra) * 52;
  ctx.beginPath(); ctx.moveTo(58, -95); ctx.lineTo(hx, hy); ctx.stroke();
  if (tool === 'magnifier') {
    ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 26, hy - 26); ctx.stroke();
    ell(ctx, hx + 50, hy - 50, 32, 32, 'rgba(180,230,255,0.45)', OUT, 8);
  } else if (tool === 'wrench') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.8 + Math.sin(t * 10) * 0.3);
    ctx.fillStyle = '#c7cbe0'; ctx.fillRect(-7, -60, 14, 60);
    ell(ctx, 0, -66, 18, 18, '#c7cbe0', OUT, 4); ctx.restore();
  } else if (tool === 'pen') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.6);
    ctx.fillStyle = C.gold; ctx.fillRect(-8, -62, 16, 62); ctx.fillStyle = OUT; ctx.fillRect(-8, -4, 16, 10); ctx.restore();
  } else if (tool === 'brush') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.6);
    ctx.fillStyle = '#b07a4a'; ctx.fillRect(-6, -60, 12, 60); ell(ctx, 0, -70, 12, 20, C.pink, OUT, 3); ctx.restore();
  }
  // head with screen face
  card(ctx, -74, -250, 148, 118, { fill: '#f4f2ff', r: 34, ew: 5, edge: OUT, drop: 0 });
  card(ctx, -58, -236, 116, 88, { fill: '#1d1846', r: 24, ew: 0, drop: 0 });
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineCap = 'round';
  const bl = blinkAt(t, x * 0.01);
  for (const ex of [-24, 24]) {
    ctx.beginPath();
    if (mood === 'focus') { ctx.moveTo(ex - 12, -196); ctx.lineTo(ex + 12, -196); }
    else ctx.ellipse(ex, -194, 11, 11 * bl, 0, Math.PI, 0);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, -172, 10 + (talk ? Math.abs(Math.sin(t * 20)) * 5 : 0), 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, -250); ctx.lineTo(0, -282); ctx.stroke();
  ell(ctx, 0, -290, 12, 12, 0.5 + 0.5 * Math.sin(t * 6) > 0.5 ? color : '#fff3b0', OUT, 4);
  ctx.restore();
  if (label) {
    const lw = measure(ctx, label, 30 * s) + 30 * s;
    around(ctx, x, y + 34 * s, 1, 1, () => {
      card(ctx, x - lw / 2, y + 12 * s, lw, 46 * s, { fill: color, r: 23 * s, ew: 3, edge: OUT, drop: 0 });
      txt(ctx, label, x, y + 36 * s, { size: 30 * s, color: OUT });
    });
  }
}

// Speech bubble anchored by its tail tip at (x,y); p = pop progress.
export function bubble(ctx, x, y, text, p, o = {}) {
  const { size = 42, fill = C.white, color = OUT, side = 1 } = o;
  if (p <= 0) return;
  const w = measure(ctx, text, size, ZH) + 60, h = size + 44;
  const bx = x + side * 30 - (side < 0 ? w : 0), by = y - h - 40;
  around(ctx, x, y, p, p, () => {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * 40, by + h - 4); ctx.lineTo(x + side * 90, by + h - 4); ctx.closePath(); ctx.fill();
    card(ctx, bx, by, w, h, { fill, r: h / 2, ew: 0, drop: 0 });
    txt(ctx, text, bx + w / 2, by + h / 2 + 2, { size, color });
  });
}
