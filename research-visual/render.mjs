// Renders the 30 s explainer frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs            -> out/科研视觉怎么做.mp4
//        node render.mjs --still 3.2 7.6 ...  -> build/still_<t>.png previews
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const W = 1920, H = 1080, FPS = 30;
GlobalFonts.registerFromPath('/System/Library/Fonts/Hiragino Sans GB.ttc');
const FONT = '"Hiragino Sans GB", "Heiti TC", sans-serif';

const TL = JSON.parse(readFileSync(new URL('./build/timeline.json', import.meta.url)));
const SEG = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
const DURATION = TL.duration;

// ---------- math helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const bounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const DEG = Math.PI / 180;
const norm3 = (v) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Time at which a keyword starts being spoken, from the TTS word boundaries.
function keyTime(id, word) {
  const s = SEG[id];
  const i = s.text.indexOf(word);
  const w = s.words?.find((w) => w.idx <= i && i < w.idx + w.text.length) ?? s.words?.find((w) => w.idx >= i);
  return w ? w.start : s.start + ((s.end - s.start) * i) / s.text.length;
}

// ---------- palette ----------
const COL = {
  indigo: [99, 102, 241],
  violet: [139, 92, 246],
  blue: [84, 132, 255],
  peri: [129, 140, 248],
  lav: [167, 139, 250],
  deep: [79, 70, 229],
  tileA: [200, 204, 255],
  tileB: [186, 190, 252],
  slab: [120, 112, 236],
  gold: [255, 201, 77],
  cyan: [80, 226, 255],
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shadeCol = (c, k) =>
  k <= 1 ? c.map((v) => v * k) : c.map((v) => v + (255 - v) * Math.min(1, k - 1));

// ---------- camera / iso projection ----------
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const cam = { cx: W / 2, cy: 455, u: 68 };
const P = (x, y, z = 0) => [cam.cx + (x - y) * C30 * cam.u, cam.cy + (x + y) * S30 * cam.u - z * cam.u];

// Light given as screen angle from vertical (positive = toward the left), plus a pull toward the viewer.
function lightVec(theta) {
  const up = [0, 0, 1], left = [-Math.SQRT1_2, Math.SQRT1_2, 0], view = norm3([1, 1, 1]);
  const c = Math.cos(theta), s = Math.sin(theta);
  return norm3([0, 1, 2].map((i) => c * up[i] + s * left[i] + 0.55 * view[i]));
}
const N_TOP = [0, 0, 1], N_LEFT = [0, 1, 0], N_RIGHT = [1, 0, 0];
const lambert = (n, L) => 0.5 + 0.58 * Math.max(0, dot(n, L));

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// Box with min corner (x,y,z) and size (w,d,h) — draws the three visible faces.
function drawBox(ctx, b, L) {
  const { x, y, z, w, d, h, col, alpha = 1, glow = 0 } = b;
  if (w <= 0.001 || h <= 0.001 || alpha <= 0.001) return;
  const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)];
  const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  for (const [face, n] of [[left, N_LEFT], [right, N_RIGHT], [t, N_TOP]]) {
    poly(ctx, face);
    const c = shadeCol(col, lambert(n, L) + (n === N_TOP ? 0.06 : 0));
    ctx.fillStyle = rgba(c);
    ctx.fill();
    ctx.strokeStyle = rgba(c);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // soft rim highlight on the top edges
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(...t[3]);
  ctx.lineTo(...t[0]);
  ctx.lineTo(...t[1]);
  ctx.stroke();
  if (glow > 0) {
    ctx.globalAlpha = alpha * glow;
    ctx.strokeStyle = rgba(COL.gold);
    ctx.lineWidth = 4;
    ctx.shadowColor = rgba(COL.gold, 0.9);
    ctx.shadowBlur = 18;
    poly(ctx, t);
    ctx.stroke();
  }
  ctx.restore();
}

function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (hi.length >= 2 && cross(hi.at(-2), hi.at(-1), q) <= 0) hi.pop();
    hi.push(q);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

function boxShadow(ctx, b, L) {
  if (L[2] < 0.12 || b.alpha <= 0.01 || b.h <= 0.001) return;
  const { x, y, w, d } = b;
  const top = b.z + b.h;
  const k = top / L[2];
  const pts = [];
  for (const [px, py] of [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]) {
    pts.push(P(px, py, 0));
    pts.push(P(px - L[0] * k, py - L[1] * k, 0));
  }
  ctx.globalAlpha = b.alpha;
  poly(ctx, convexHull(pts));
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Cube helper: centre on the floor (cx,cy), edge size s, optional lift z.
const cube = (cx, cy, s, col, extra = {}) => ({ x: cx - s / 2, y: cy - s / 2, z: 0, w: s, d: s, h: s, col, ...extra });

// ---------- background & platform ----------
const PLAT = 4.2;
function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7cc8ff');
  g.addColorStop(0.55, '#a9ddff');
  g.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // soft sun glow behind
  const rg = ctx.createRadialGradient(W * 0.5, 420, 50, W * 0.5, 420, 900);
  rg.addColorStop(0, 'rgba(255,255,255,0.35)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  // drifting clouds
  const clouds = [[200, 170, 1.0, 9], [1500, 120, 1.3, 6], [1700, 640, 0.9, 11], [120, 700, 1.1, 7], [980, 70, 0.7, 13]];
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [x0, y0, s, sp] of clouds) {
    const x = ((x0 + t * sp * 4) % (W + 400)) - 200;
    ctx.beginPath();
    ctx.ellipse(x, y0, 80 * s, 26 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 50 * s, y0 + 8 * s, 50 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30 * s, y0 - 18 * s, 48 * s, 30 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // tiny floating cubes far away
  const floaters = [[150, 420, 0.32, 0], [1760, 330, 0.4, 1.3], [1640, 870, 0.28, 2.1], [330, 930, 0.3, 0.7], [1330, 210, 0.22, 3]];
  for (const [fx, fy, s, ph] of floaters) {
    const bob = Math.sin(t * 1.2 + ph) * 10;
    const u = 68 * s;
    const tx = fx, ty = fy + bob;
    const top = [[tx, ty - u], [tx + C30 * u, ty - u / 2], [tx, ty], [tx - C30 * u, ty - u / 2]];
    const lf = [[tx - C30 * u, ty - u / 2], [tx, ty], [tx, ty + u], [tx - C30 * u, ty + u / 2]];
    const rt = [[tx, ty], [tx + C30 * u, ty - u / 2], [tx + C30 * u, ty + u / 2], [tx, ty + u]];
    ctx.globalAlpha = 0.55;
    poly(ctx, lf); ctx.fillStyle = '#8f8cf5'; ctx.fill();
    poly(ctx, rt); ctx.fillStyle = '#6f68e6'; ctx.fill();
    poly(ctx, top); ctx.fillStyle = '#b9b8ff'; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlatform(ctx, L) {
  const th = 0.55;
  const [cx, cy] = P(0, 0, -th);
  // ground shadow under the floating island
  ctx.fillStyle = 'rgba(60,70,160,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 150, PLAT * 2 * C30 * cam.u * 0.62, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  const x0 = -PLAT, y0 = -PLAT, s = PLAT * 2;
  const right = [P(x0 + s, y0, 0), P(x0 + s, y0 + s, 0), P(x0 + s, y0 + s, -th), P(x0 + s, y0, -th)];
  const left = [P(x0, y0 + s, 0), P(x0 + s, y0 + s, 0), P(x0 + s, y0 + s, -th), P(x0, y0 + s, -th)];
  poly(ctx, left);
  ctx.fillStyle = rgba(shadeCol(COL.slab, lambert(N_LEFT, L)));
  ctx.fill();
  poly(ctx, right);
  ctx.fillStyle = rgba(shadeCol(COL.slab, lambert(N_RIGHT, L)));
  ctx.fill();
  // brick seams on the sides
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) {
    const a = x0 + (s * i) / 8;
    ctx.beginPath(); ctx.moveTo(...P(a, y0 + s, 0)); ctx.lineTo(...P(a, y0 + s, -th)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...P(x0 + s, a, 0)); ctx.lineTo(...P(x0 + s, a, -th)); ctx.stroke();
  }
  const n = 8, step = s / n;
  const kTop = lambert(N_TOP, L);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = x0 + i * step, y = y0 + j * step;
      poly(ctx, [P(x, y), P(x + step, y), P(x + step, y + step), P(x, y + step)]);
      ctx.fillStyle = rgba(shadeCol((i + j) % 2 ? COL.tileA : COL.tileB, kTop * 0.98));
      ctx.fill();
    }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  poly(ctx, [P(x0, y0), P(x0 + s, y0), P(x0 + s, y0 + s), P(x0, y0 + s)]);
  ctx.stroke();
}

// ---------- the scientist ----------
const SKIN = '#ffd7b5', HAIR = '#3a2c5c', PANTS = '#2f2f6b', COAT = '#ffffff', COAT_EDGE = '#cfd6f2';
function drawScientist(ctx, p) {
  const [sx, sy] = P(p.x, p.y, p.z || 0);
  const k = (cam.u / 68) * 1.05;
  const f = p.facing >= 0 ? 1 : -1;
  const walk = p.walk || 0;
  const swing = Math.sin(walk) * (p.stride || 0);
  const bob = Math.abs(Math.cos(walk)) * 3 * (p.stride || 0) + (p.hop || 0);
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  ctx.fillStyle = 'rgba(40,30,110,0.22)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 24 * k, 9 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(sx, sy - bob * k);
  ctx.scale(k * f, k);
  ctx.rotate((p.lean || 0) * f);
  const shoulderY = -82;
  const arm = (ang, front) => {
    // ang: 0 = hanging down, PI/2 = straight forward, PI = straight up
    const shx = front ? 13 : -9;
    const len = 36;
    const ex = shx + Math.sin(ang) * len, ey = shoulderY + 4 + Math.cos(ang) * len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = COAT_EDGE;
    ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(shx, shoulderY + 4); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = COAT;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(shx, shoulderY + 4); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(ex + Math.sin(ang) * 3, ey + Math.cos(ang) * 3, 6, 0, Math.PI * 2); ctx.fill();
    return [ex, ey];
  };
  // back arm
  arm(p.armB ?? 0.15 - swing * 0.5, false);
  // legs
  ctx.fillStyle = PANTS;
  ctx.save(); ctx.translate(-5, -40); ctx.rotate(swing * 0.5);
  ctx.beginPath(); ctx.roundRect(-5, 0, 10, 38, 4); ctx.fill();
  ctx.fillStyle = '#1e1e48'; ctx.beginPath(); ctx.roundRect(-5, 32, 16, 8, 4); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(6, -40); ctx.rotate(-swing * 0.5);
  ctx.fillStyle = PANTS; ctx.beginPath(); ctx.roundRect(-5, 0, 10, 38, 4); ctx.fill();
  ctx.fillStyle = '#1e1e48'; ctx.beginPath(); ctx.roundRect(-5, 32, 16, 8, 4); ctx.fill();
  ctx.restore();
  // lab coat
  ctx.fillStyle = COAT;
  ctx.strokeStyle = COAT_EDGE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-15, shoulderY);
  ctx.quadraticCurveTo(0, shoulderY - 5, 17, shoulderY);
  ctx.lineTo(22, -30);
  ctx.quadraticCurveTo(2, -25, -20, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = COAT_EDGE;
  ctx.beginPath(); ctx.moveTo(3, shoulderY + 10); ctx.lineTo(4, -28); ctx.stroke();
  // shirt + tie
  ctx.fillStyle = '#7c83ff';
  ctx.beginPath(); ctx.moveTo(-4, shoulderY - 1); ctx.lineTo(10, shoulderY - 1); ctx.lineTo(3, shoulderY + 13); ctx.closePath(); ctx.fill();
  // pocket with pens
  ctx.fillStyle = rgba(COL.gold);
  ctx.fillRect(10, -66, 2.5, 8);
  ctx.fillStyle = '#5a63ff';
  ctx.fillRect(13.5, -65, 2.5, 7);
  ctx.strokeStyle = COAT_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(8, -60, 11, 9);
  // head
  ctx.fillStyle = SKIN;
  ctx.beginPath(); ctx.arc(2, -102, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(1, -106, 18, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(10, -112, -14, -98);
  ctx.closePath();
  ctx.fill();
  // glasses + face (looking toward facing direction)
  ctx.strokeStyle = '#2b2350';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(7, -101, 5.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(19, -101, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12.5, -101); ctx.lineTo(14.5, -101); ctx.stroke();
  ctx.fillStyle = '#2b2350';
  const blink = p.blink ? 0.3 : 1;
  ctx.beginPath(); ctx.ellipse(8, -101, 1.8, 1.8 * blink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(19.5, -101, 1.6, 1.6 * blink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (p.mood === 'puzzled') { ctx.moveTo(9, -91); ctx.lineTo(17, -92.5); }
  else ctx.arc(13, -94, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  if (p.mood === 'happy') {
    ctx.fillStyle = 'rgba(255,120,140,0.45)';
    ctx.beginPath(); ctx.arc(4, -94, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // front arm
  const hand = arm(p.armF ?? 0.15 + swing * 0.5, true);
  ctx.restore();
  // hand position in screen space (for props held / pointed)
  return [sx + hand[0] * k * f, sy - bob * k + hand[1] * k];
}

function drawQuestion(ctx, x, y, a, t) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y + Math.sin(t * 5) * 4);
  ctx.rotate(Math.sin(t * 3) * 0.12);
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(COL.deep);
  ctx.font = `bold 36px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 2);
  ctx.restore();
}

// ---------- scene data ----------
const T_OBJ = keyTime('object', '四个') - 0.15;
const T_LINE = keyTime('line', '九十度');
const T_SPACE = keyTime('space', '四十五度');
const T_LIGHT = keyTime('light', '二十六度');
const SC = {
  hook: [0, SEG.object.start - 0.35],
  object: [SEG.object.start - 0.35, SEG.line.start - 0.35],
  line: [SEG.line.start - 0.35, SEG.space.start - 0.35],
  space: [SEG.space.start - 0.35, SEG.light.start - 0.35],
  light: [SEG.light.start - 0.35, SEG.end.start - 0.35],
  end: [SEG.end.start - 0.35, DURATION],
};

const DEFAULT_THETA = 26 * DEG;
// Clutter for the opening question; the first four are the "keepers".
const CLUTTER = [
  { x: -0.9, y: -1.2, s: 1.0, col: COL.indigo, z: 0 },
  { x: 1.3, y: -0.4, s: 0.9, col: COL.violet, z: 0 },
  { x: -0.4, y: 1.3, s: 0.85, col: COL.blue, z: 0 },
  { x: 0.6, y: 0.7, s: 0.95, col: COL.lav, z: 0 },
  { x: -2.2, y: -0.2, s: 0.6, col: COL.peri, z: 0 },
  { x: 2.3, y: 1.6, s: 0.7, col: COL.deep, z: 0 },
  { x: 0.2, y: -2.5, s: 0.75, col: COL.blue, z: 0 },
  { x: -1.9, y: 1.8, s: 0.55, col: COL.violet, z: 0 },
  { x: 2.6, y: -1.9, s: 0.65, col: COL.lav, z: 0 },
  { x: -0.9, y: -1.2, s: 0.6, col: COL.peri, z: 1.0 },
  { x: 1.3, y: -0.4, s: 0.5, col: COL.indigo, z: 0.9 },
  { x: -3.0, y: -2.4, s: 0.7, col: COL.deep, z: 0 },
  { x: 1.6, y: 2.9, s: 0.55, col: COL.indigo, z: 0 },
];
const TANGLE = [[0, 5], [1, 7], [2, 8], [3, 11], [4, 6], [5, 12], [6, 2], [7, 1], [8, 4], [11, 3]];
const KEEP_POS = [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]];
const R_LINE = 2.5;
const NODE_S = 0.62;
const lineAngle = (t) => lerp(16 * DEG, 90 * DEG, easeIO(prog(t, T_LINE - 2.0, T_LINE - 0.1)));
function nodePositions(phi) {
  return [
    [-R_LINE, 0], [R_LINE, 0],
    [-R_LINE * Math.cos(phi), -R_LINE * Math.sin(phi)], [R_LINE * Math.cos(phi), R_LINE * Math.sin(phi)],
  ];
}

// Columns for the banking-to-45° demo, laid out along world (1,-1) which is screen-horizontal.
const DATA = [0, 0.75, 1.4, 2.15, 3.0];
const STEP_END = 0.62;
const COL_K = (4 * 2 * STEP_END * C30) / 3.0; // height scale so the average slope is exactly 45° on screen
const COL_W = 0.34;
const stepAt = (t) => lerp(0.24, STEP_END, easeIO(prog(t, T_SPACE - 2.1, T_SPACE - 0.1)));
const A0 = -(4 * STEP_END) / 2;
function columns(step) {
  return DATA.map((d, i) => {
    const a = A0 + i * step;
    return { a, h: 0.35 + COL_K * d };
  });
}

const sunTheta = (t) => lerp(-150 * DEG, DEFAULT_THETA, easeIO(prog(t, T_LIGHT - 2.4, T_LIGHT - 0.1)));

function sceneLight(t) {
  if (t >= SC.light[0] && t < SC.light[1]) return sunTheta(t);
  return DEFAULT_THETA;
}

// ---------- scientist choreography ----------
function sciBase(t) {
  const [h0, h1] = SC.hook, [o0, o1] = SC.object, [l0, l1] = SC.line, [s0, s1] = SC.space, [g0, g1] = SC.light, [e0] = SC.end;
  if (t < h1) {
    const enter = easeOut(prog(t, 0.2, 1.3));
    const scratch = prog(t, 1.4, 1.7);
    return {
      x: lerp(-1.4, -0.6, enter), y: lerp(4.6, 3.0, enter), facing: 1, mood: t > 1.3 ? 'puzzled' : null,
      armF: scratch > 0 ? lerp(0.2, 2.75 + Math.sin(t * 14) * 0.12, scratch) : undefined,
      lean: scratch > 0 ? -0.06 : 0,
    };
  }
  if (t < o1) {
    // sweep clutter away, then count the four keepers
    const go = easeIO(prog(t, o0, o0 + 0.6));
    const x = lerp(-0.6, -1.8, go), y = lerp(3.0, 2.6, go);
    const sweeping = t > o0 + 0.5 && t < T_OBJ - 0.9;
    const pointing = t >= T_OBJ - 0.9;
    let armF, armB, mood = null;
    if (sweeping) {
      const ph = ((t - (o0 + 0.5)) / 0.42) % 1;
      armF = 0.6 + Math.sin(ph * Math.PI * 2) * 0.9 + 0.5;
      armB = 1.1 + Math.sin(ph * Math.PI * 2 + 0.6) * 0.5;
    }
    if (pointing) {
      const n = clamp(Math.floor((t - (T_OBJ - 0.9)) / 0.25), 0, 3);
      armF = 1.35 + [0.35, 0.15, 0.2, 0.0][n];
      mood = t > T_OBJ ? 'happy' : null;
    }
    return { x, y, facing: 1, armF, armB, mood };
  }
  if (t < l1) {
    const phi = lineAngle(t);
    const r = R_LINE + 0.75;
    const tx = r * Math.cos(phi), ty = r * Math.sin(phi);
    const walkIn = easeIO(prog(t, l0 + 0.3, T_LINE - 2.1));
    const pushing = t > T_LINE - 2.1;
    return {
      x: lerp(-1.8, tx, walkIn), y: lerp(2.6, ty, walkIn),
      facing: pushing ? (P(R_LINE * Math.cos(phi), R_LINE * Math.sin(phi))[0] < P(tx, ty)[0] ? -1 : 1) : undefined,
      armF: pushing && t < T_LINE ? 1.55 : t >= T_LINE ? 2.9 : undefined,
      armB: pushing && t < T_LINE ? 1.45 : undefined,
      lean: pushing && t < T_LINE ? 0.12 : 0,
      mood: t >= T_LINE ? 'happy' : null,
      hop: t >= T_LINE ? Math.max(0, Math.sin((t - T_LINE) * 9)) * 6 * (1 - prog(t, T_LINE, T_LINE + 0.9)) : 0,
    };
  }
  if (t < s1) {
    const cols = columns(stepAt(t));
    const last = cols[4].a + 0.85;
    const startLast = A0 + 4 * 0.24 + 0.85;
    const walkIn = easeIO(prog(t, s0 + 0.2, T_SPACE - 2.2));
    const phi = 90 * DEG;
    const fx = (R_LINE + 0.75) * Math.cos(phi), fy = (R_LINE + 0.75) * Math.sin(phi);
    const pulling = t > T_SPACE - 2.2 && t < T_SPACE;
    const a = walkIn < 1 ? null : last;
    return {
      x: a === null ? lerp(fx, startLast, walkIn) : a,
      y: a === null ? lerp(fy, -startLast, walkIn) : -a,
      facing: pulling ? -1 : undefined,
      armF: pulling ? 1.5 : t >= T_SPACE ? 2.9 : undefined,
      armB: pulling ? 1.4 : undefined,
      lean: pulling ? -0.14 : 0,
      mood: t >= T_SPACE ? 'happy' : null,
    };
  }
  if (t < g1) {
    const walkIn = easeIO(prog(t, g0 + 0.1, g0 + 1.0));
    const last = A0 + 4 * STEP_END + 0.85;
    const conducting = t > T_LIGHT - 2.6;
    const th = sunTheta(t);
    // point toward the sun: screen angle -> arm angle relative to facing
    return {
      x: lerp(last, -2.2, walkIn), y: lerp(-last, 2.3, walkIn),
      facing: conducting ? (Math.sin(th) > 0 ? -1 : 1) : undefined,
      armF: conducting ? Math.PI - Math.abs(th) * 0.9 + 0.2 : undefined,
      mood: t >= T_LIGHT ? 'happy' : null,
    };
  }
  const walkIn = easeIO(prog(t, e0, e0 + 0.9));
  const wave = t > e0 + 0.9;
  return {
    x: lerp(-2.2, 3.2, walkIn), y: lerp(2.3, 1.2, walkIn),
    facing: wave ? -1 : undefined,
    armF: wave ? 2.7 + Math.sin(t * 9) * 0.35 : undefined,
    mood: 'happy',
    hop: wave ? Math.max(0, Math.sin((t - e0) * 6)) * 4 : 0,
  };
}

function sciPose(t) {
  const p = sciBase(t);
  const q = sciBase(Math.max(0, t - 1 / FPS));
  const [ax] = P(q.x, q.y), [bx] = P(p.x, p.y);
  const speed = Math.hypot(p.x - q.x, p.y - q.y) * FPS;
  const moving = speed > 0.25;
  const facing = p.facing ?? (Math.abs(bx - ax) > 0.3 ? Math.sign(bx - ax) : sciPose.lastFacing ?? 1);
  sciPose.lastFacing = facing;
  return {
    ...p,
    facing,
    walk: t * 13,
    stride: moving && p.armF === undefined ? clamp(speed / 2.2, 0.35, 0.9) : moving ? 0.35 : 0,
    blink: t % 3.1 < 0.1,
  };
}

// ---------- props per scene ----------
function propsAt(t) {
  const boxes = [];
  const extras = []; // floor decals / overlays: {layer:'floor'|'over', draw(ctx)}
  const [h0, h1] = SC.hook, [o0, o1] = SC.object, [l0, l1] = SC.line, [s0, s1] = SC.space, [g0, g1] = SC.light, [e0] = SC.end;

  if (t < o1) {
    CLUTTER.forEach((c, i) => {
      const drop = prog(t, 0.15 + i * 0.07, 0.75 + i * 0.07);
      let z = c.z + (1 - bounce(drop)) * 5;
      let alpha = drop > 0 ? 1 : 0;
      let { x, y, s } = c;
      let glow = 0;
      if (t >= o0) {
        if (i < 4) {
          const m = easeIO(prog(t, T_OBJ - 1.3, T_OBJ - 0.7));
          x = lerp(c.x, KEEP_POS[i][0], m);
          y = lerp(c.y, KEEP_POS[i][1], m);
          s = lerp(c.s, 0.9, m);
          const lit = prog(t, T_OBJ - 0.9 + i * 0.25, T_OBJ - 0.7 + i * 0.25);
          glow = lit * (0.7 + 0.3 * Math.sin(t * 6));
        } else {
          // each extra cube is flicked off the island one after another
          const k = i - 4;
          const st = o0 + 0.55 + k * ((T_OBJ - 1.4 - (o0 + 0.55)) / 9);
          const fly = prog(t, st, st + 0.65);
          if (fly > 0) {
            const dir = norm3([c.x + 0.6, c.y - 1.5, 0]);
            const d = easeOut(fly) * 4.5;
            x = c.x + dir[0] * d;
            y = c.y + dir[1] * d;
            z = c.z + Math.sin(fly * Math.PI) * 1.6 - Math.max(0, fly - 0.55) * 8;
            alpha = 1 - prog(fly, 0.45, 1);
          }
        }
      }
      if (alpha > 0) boxes.push({ ...cube(x, y, s, c.col), z, alpha, glow });
    });
    // tangled connections in the opening chaos
    const ta = prog(t, 1.0, 1.6) * (1 - prog(t, o0, o0 + 0.5));
    if (ta > 0)
      extras.push({
        layer: 'over',
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = ta * 0.85;
          ctx.lineWidth = 3;
          TANGLE.forEach(([a, b], i) => {
            const A = CLUTTER[a], B = CLUTTER[b];
            const pa = P(A.x, A.y, A.z + A.s), pb = P(B.x, B.y, B.z + B.s);
            const n = prog(t, 1.0 + i * 0.04, 1.5 + i * 0.04);
            ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.9)' : rgba(COL.gold, 0.9);
            ctx.beginPath();
            ctx.moveTo(...pa);
            const mx = (pa[0] + pb[0]) / 2 + Math.sin(i * 2.1) * 70, my = (pa[1] + pb[1]) / 2 - 60 - (i % 3) * 25;
            ctx.quadraticCurveTo(lerp(pa[0], mx, n), lerp(pa[1], my, n), lerp(pa[0], pb[0], n), lerp(pa[1], pb[1], n));
            ctx.stroke();
          });
          ctx.restore();
        },
      });
    // focus rings under the keepers
    const ring = prog(t, T_OBJ - 0.4, T_OBJ + 0.2) * (1 - prog(t, o1 - 0.3, o1));
    if (ring > 0)
      extras.push({
        layer: 'floor',
        draw(ctx) {
          KEEP_POS.forEach(([x, y], i) => {
            const [px, py] = P(x, y);
            const pulse = 1 + 0.08 * Math.sin(t * 5 + i);
            ctx.strokeStyle = rgba(COL.gold, 0.8 * ring);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(px, py, 0.85 * C30 * cam.u * pulse, 0.85 * S30 * cam.u * pulse, 0, 0, Math.PI * 2);
            ctx.stroke();
          });
        },
      });
  }

  if (t >= l0 && t < l1) {
    const phi = lineAngle(t);
    const nodes = nodePositions(phi);
    const m = easeIO(prog(t, l0, l0 + 0.7));
    const out = 1 - easeIO(prog(t, l1 - 0.35, l1));
    const nodesNow = nodes.map((n, i) => [lerp(KEEP_POS[i][0], n[0], m), lerp(KEEP_POS[i][1], n[1], m)]);
    const sz = lerp(0.9, NODE_S, m) * out;
    const cols = [COL.indigo, COL.violet, COL.blue, COL.lav];
    nodesNow.forEach(([x, y], i) => boxes.push({ ...cube(x, y, sz, cols[i]), glow: t >= T_LINE ? 0.6 + 0.3 * Math.sin(t * 6) : 0 }));
    const la = prog(t, l0 + 0.5, l0 + 1.0) * out;
    extras.push({
      layer: 'floor',
      draw(ctx) {
        if (la <= 0) return;
        const beam = (a, b, col, phase) => {
          const pa = P(a[0], a[1], 0.02), pb = P(b[0], b[1], 0.02);
          ctx.save();
          ctx.globalAlpha = la;
          ctx.lineCap = 'round';
          ctx.strokeStyle = rgba(col, 0.35);
          ctx.lineWidth = 16;
          ctx.beginPath(); ctx.moveTo(...pa); ctx.lineTo(...pb); ctx.stroke();
          ctx.strokeStyle = rgba(col);
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(...pa); ctx.lineTo(...pb); ctx.stroke();
          // signal pulse travelling along the edge
          for (let k = 0; k < 2; k++) {
            const u = ((t * 0.55 + phase + k * 0.5) % 1);
            ctx.fillStyle = 'white';
            ctx.shadowColor = rgba(col);
            ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u), 6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        };
        beam(nodesNow[0], nodesNow[1], COL.gold, 0);
        beam(nodesNow[2], nodesNow[3], COL.cyan, 0.25);
        // angle indicator between the two edges, in the floor plane
        const ang = phi * m + (1 - m) * 0;
        const r = 0.75;
        ctx.save();
        ctx.globalAlpha = la * prog(t, l0 + 0.8, l0 + 1.2);
        if (phi < 88 * DEG) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i <= 24; i++) {
            const a = (ang * i) / 24;
            const [px, py] = P(r * Math.cos(a), r * Math.sin(a), 0.03);
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
        const sq = prog(phi, 86 * DEG, 90 * DEG);
        if (sq > 0) {
          ctx.globalAlpha = la * sq;
          const s = 0.42;
          poly(ctx, [P(0, 0, 0.03), P(s, 0, 0.03), P(s, s, 0.03), P(0, s, 0.03)]);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  }

  if (t >= s0 && t < s1) {
    const grow = easeBack(prog(t, s0 + 0.15, s0 + 0.85));
    const out = 1 - easeIO(prog(t, s1 - 0.35, s1));
    const cols = columns(stepAt(t));
    const palette = [COL.peri, COL.blue, COL.indigo, COL.violet, COL.deep];
    cols.forEach((c, i) => {
      const g = clamp(grow - i * 0.06, 0, 1.2);
      boxes.push({
        x: c.a - COL_W / 2, y: -c.a - COL_W / 2, z: 0, w: COL_W, d: COL_W, h: c.h * g * out, col: palette[i],
        glow: t >= T_SPACE ? 0.5 : 0,
      });
    });
    const la = prog(t, s0 + 0.8, s0 + 1.2) * out;
    extras.push({
      layer: 'over',
      draw(ctx) {
        if (la <= 0) return;
        const pts = cols.map((c) => P(c.a, -c.a, c.h * Math.min(1, grow) * out));
        ctx.save();
        ctx.globalAlpha = la;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(COL.gold, 0.4);
        ctx.lineWidth = 16;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke();
        ctx.strokeStyle = rgba(COL.gold);
        ctx.lineWidth = 6;
        ctx.stroke();
        for (const p of pts) {
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.fill();
        }
        // average-slope protractor at the first point
        const p0 = pts[0], p4 = pts[4];
        const slope = Math.atan2(p0[1] - p4[1], p4[0] - p0[0]);
        ctx.setLineDash([10, 9]);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(p0[0] + 210, p0[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p4); ctx.stroke();
        ctx.setLineDash([]);
        const ok = Math.abs(slope - 45 * DEG) < 1.5 * DEG;
        ctx.strokeStyle = ok ? rgba(COL.gold) : 'white';
        ctx.fillStyle = ok ? rgba(COL.gold, 0.35) : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(...p0); ctx.arc(p0[0], p0[1], 80, -slope, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(p0[0], p0[1], 80, -slope, 0); ctx.stroke();
        ctx.restore();
      },
    });
  }

  if (t >= g0 && t < g1) {
    const pop = easeBack(prog(t, g0 + 0.2, g0 + 0.8));
    const out = 1 - easeIO(prog(t, g1 - 0.3, g1));
    const s = pop * out;
    boxes.push({ ...cube(-0.6, -1.5, 1.1 * s, COL.indigo) });
    boxes.push({ ...cube(1.3, -1.1, 0.8 * s, COL.violet) });
    boxes.push({ ...cube(1.4, 0.9, 0.9 * s, COL.blue) });
    const slab = { x: -1.6, y: -0.3, z: 0, w: 2.2 * s, d: 2.2 * s, h: 0.28 * s, col: [196, 190, 255] };
    boxes.push(slab);
    extras.push({
      layer: 'slabTop',
      draw(ctx) {
        if (s < 0.05) return;
        // shading-only discs: lit side decides whether they read as bumps or dents
        const th = sunTheta(t);
        const dx = -Math.sin(th), dy = -Math.cos(th);
        for (const [ox, oy] of [[0.55, 0.55], [1.55, 0.6], [0.6, 1.6], [1.6, 1.65]]) {
          const [cx, cy] = P(slab.x + ox * s, slab.y + oy * s, slab.h);
          const rx = 0.36 * Math.SQRT2 * C30 * cam.u * s, ry = 0.36 * Math.SQRT2 * S30 * cam.u * s;
          const g = ctx.createLinearGradient(cx + dx * rx, cy + dy * ry * 1.6, cx - dx * rx, cy - dy * ry * 1.6);
          g.addColorStop(0, '#fbfaff');
          g.addColorStop(0.5, '#a7a0f5');
          g.addColorStop(1, '#3f33b8');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        }
      },
    });
    extras.push({
      layer: 'over',
      draw(ctx) {
        const th = sunTheta(t);
        const [ox, oy] = P(0, 0, 0.6);
        const R = 390;
        const sx = ox - Math.sin(th) * R, sy = oy - Math.cos(th) * R;
        const a = prog(t, g0 + 0.3, g0 + 0.7) * out;
        ctx.save();
        ctx.globalAlpha = a;
        // orbit guide
        ctx.setLineDash([4, 12]);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const done = prog(t, T_LIGHT - 0.3, T_LIGHT + 0.2);
        if (done > 0) {
          ctx.globalAlpha = a * done;
          ctx.setLineDash([12, 10]);
          ctx.strokeStyle = 'white';
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - R); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = rgba(COL.gold, 0.35);
          ctx.strokeStyle = rgba(COL.gold);
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, 150, -Math.PI / 2 - th, -Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = a;
        }
        // the sun
        const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 120);
        glow.addColorStop(0, 'rgba(255,240,170,0.95)');
        glow.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, sy, 120, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const r = (i * Math.PI) / 4 + t * 0.8;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(r) * 46, sy + Math.sin(r) * 46);
          ctx.lineTo(sx + Math.cos(r) * 60, sy + Math.sin(r) * 60);
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  }

  if (t >= e0) {
    const pop = (i) => easeBack(prog(t, e0 + 0.15 + i * 0.12, e0 + 0.65 + i * 0.12));
    const pos = [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]];
    const cols = [COL.indigo, COL.violet, COL.blue, COL.lav];
    pos.forEach(([x, y], i) => boxes.push({ ...cube(x, y, 0.85 * pop(i), cols[i]), glow: 0.35 }));
    const la = prog(t, e0 + 0.8, e0 + 1.3);
    extras.push({
      layer: 'floor',
      draw(ctx) {
        if (la <= 0) return;
        ctx.save();
        ctx.globalAlpha = la;
        ctx.lineCap = 'round';
        for (const [[a, b], col] of [[[pos[0], pos[2]], COL.gold], [[pos[1], pos[3]], COL.cyan]]) {
          const pa = P(a[0], a[1], 0.02), pb = P(b[0], b[1], 0.02);
          ctx.strokeStyle = rgba(col, 0.35); ctx.lineWidth = 16;
          ctx.beginPath(); ctx.moveTo(...pa); ctx.lineTo(...pb); ctx.stroke();
          ctx.strokeStyle = rgba(col); ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(...pa); ctx.lineTo(...pb); ctx.stroke();
        }
        const s = 0.38;
        poly(ctx, [P(0, 0, 0.03), P(s, -s, 0.03), P(2 * s, 0, 0.03), P(s, s, 0.03)]);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      },
    });
  }
  return { boxes, extras };
}

// ---------- HUD: number badge, progress dots, subtitles ----------
const BADGES = [
  { id: 'object', at: T_OBJ - 0.1, end: SC.object[1] },
  { id: 'line', at: T_LINE - 0.1, end: SC.line[1] },
  { id: 'space', at: T_SPACE - 0.1, end: SC.space[1] },
  { id: 'light', at: T_LIGHT - 0.1, end: SC.light[1] },
];

function drawBadge(ctx, t) {
  for (const b of BADGES) {
    if (t < b.at || t > b.end) continue;
    const seg = SEG[b.id];
    const a = easeOut(prog(t, b.at, b.at + 0.35)) * (1 - prog(t, b.end - 0.3, b.end));
    const sc = easeBack(prog(t, b.at, b.at + 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(96, 92);
    ctx.scale(0.6 + 0.4 * sc, 0.6 + 0.4 * sc);
    ctx.font = `bold 120px ${FONT}`;
    const nw = ctx.measureText(seg.number).width;
    ctx.font = `28px ${FONT}`;
    const cw = ctx.measureText(seg.cite).width;
    const w = Math.max(nw, cw) + 64;
    ctx.fillStyle = '#f7f8ff';
    ctx.shadowColor = 'rgba(60,50,170,0.25)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.beginPath(); ctx.roundRect(0, 0, w, 210, 28); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = rgba(COL.deep);
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 120px ${FONT}`;
    ctx.fillText(seg.number, 32, 136);
    ctx.fillStyle = '#6b6fa8';
    ctx.font = `28px ${FONT}`;
    ctx.fillText(seg.cite, 34, 182);
    ctx.restore();
  }
}

function drawProgress(ctx, t) {
  const ids = ['object', 'line', 'space', 'light'];
  const vis = prog(t, SC.object[0], SC.object[0] + 0.4) * (1 - prog(t, SC.end[0], SC.end[0] + 0.4));
  if (vis <= 0) return;
  ctx.save();
  ctx.globalAlpha = vis;
  ids.forEach((id, i) => {
    const [a, b] = SC[id];
    const active = t >= a && t < b;
    const done = t >= b;
    const x = W - 96 - (3 - i) * 46, y = 92;
    ctx.fillStyle = active ? rgba(COL.gold) : done ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.roundRect(x - (active ? 18 : 9), y - 9, active ? 36 : 18, 18, 9); ctx.fill();
  });
  ctx.restore();
}

function drawRecap(ctx, t) {
  const [e0] = SC.end;
  const ids = ['object', 'line', 'space', 'light'];
  ids.forEach((id, i) => {
    const a = easeOut(prog(t, e0 + 0.9 + i * 0.15, e0 + 1.3 + i * 0.15));
    if (a <= 0) return;
    const x = W / 2 + (i - 1.5) * 190, y = 96;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y + (1 - a) * 20);
    ctx.fillStyle = '#f7f8ff';
    ctx.beginPath(); ctx.roundRect(-78, -44, 156, 88, 22); ctx.fill();
    ctx.fillStyle = rgba(COL.deep);
    ctx.font = `bold 56px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SEG[id].number, 0, 4);
    ctx.restore();
  });
}

function drawSubtitle(ctx, t) {
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      // chunks inside one sentence swap instantly; only the sentence as a whole fades in/out
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.25;
      const from = i === 0 ? c.start - 0.05 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.08) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.1, c.end + 0.25));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `bold 50px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(c.text).width + 64;
      ctx.fillStyle = 'rgba(36,30,110,0.62)';
      ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 948, w, 84, 42); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText(c.text, W / 2, 992);
      ctx.restore();
    });
}

// ---------- frame ----------
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const shadowLayer = createCanvas(W, H);
const sctx = shadowLayer.getContext('2d');

function renderFrame(t) {
  // gentle camera drift; slight push-in during the hook, pull-back at the end
  cam.u = 68 * (1 + 0.04 * easeIO(prog(t, 0, 3.5)) - 0.04 * easeIO(prog(t, SC.end[0], DURATION)));
  cam.cy = 470 + Math.sin(t * 0.6) * 4;
  const theta = sceneLight(t);
  const L = lightVec(theta);

  drawBackground(ctx, t);
  drawPlatform(ctx, L);

  const { boxes, extras } = propsAt(t);
  const sci = sciPose(t);

  // cast shadows composited once so overlaps don't double-darken
  sctx.clearRect(0, 0, W, H);
  sctx.save();
  // shadows only land on the island top
  poly(sctx, [P(-PLAT, -PLAT), P(PLAT, -PLAT), P(PLAT, PLAT), P(-PLAT, PLAT)]);
  sctx.clip();
  sctx.fillStyle = 'rgb(48,36,140)';
  for (const b of boxes) boxShadow(sctx, b, L);
  if (L[2] > 0.12) {
    const k = 1.55 / L[2];
    const [fx, fy] = P(sci.x, sci.y), [tx, ty] = P(sci.x - L[0] * k, sci.y - L[1] * k);
    sctx.lineCap = 'round';
    sctx.strokeStyle = 'rgb(48,36,140)';
    sctx.lineWidth = 26 * (cam.u / 68);
    sctx.beginPath(); sctx.moveTo(fx, fy); sctx.lineTo(tx, ty); sctx.stroke();
  }
  sctx.restore();
  ctx.globalAlpha = 0.2 * clamp((L[2] - 0.12) / 0.3);
  ctx.drawImage(shadowLayer, 0, 0);
  ctx.globalAlpha = 1;

  for (const e of extras) if (e.layer === 'floor') e.draw(ctx);

  // painter's sort: boxes by their far-to-near centre, scientist slotted in by feet position
  const items = boxes.map((b) => ({ key: b.x + b.w / 2 + b.y + b.d / 2 + b.z * 0.01, draw: () => drawBox(ctx, b, L), b }));
  items.push({ key: sci.x + sci.y + 0.35, draw: () => drawScientist(ctx, sci) });
  items.sort((a, b) => a.key - b.key);
  for (const it of items) {
    it.draw();
    if (it.b && it.b.h < 0.4 && it.b.w > 1) for (const e of extras) if (e.layer === 'slabTop') e.draw(ctx);
  }

  for (const e of extras) if (e.layer === 'over') e.draw(ctx);

  // puzzled question mark in the hook
  const qa = prog(t, 1.6, 1.9) * (1 - prog(t, SC.hook[1] - 0.2, SC.hook[1] + 0.1));
  if (qa > 0) {
    const [sx, sy] = P(sci.x, sci.y);
    drawQuestion(ctx, sx + 30, sy - 165 * (cam.u / 68), qa, t);
  }

  drawBadge(ctx, t);
  drawProgress(ctx, t);
  drawRecap(ctx, t);
  drawSubtitle(ctx, t);

  // fade in from / out to white
  const fade = 1 - prog(t, 0, 0.35) + prog(t, DURATION - 0.3, DURATION);
  if (fade > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- main ----------
const args = process.argv.slice(2);
mkdirSync(new URL('./build/', import.meta.url), { recursive: true });
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });

if (args[0] === '--still') {
  for (const s of args.slice(1)) {
    const t = parseFloat(s);
    // warm up facing memory by stepping a few frames before the still
    for (let k = 10; k > 0; k--) sciPose(Math.max(0, t - k / FPS));
    renderFrame(t);
    writeFileSync(new URL(`./build/still_${s}.png`, import.meta.url), canvas.toBuffer('image/png'));
    console.log('wrote still', s);
  }
} else {
  const outFile = fileURLToPath(new URL('./out/科研视觉怎么做.mp4', import.meta.url));
  const audio = fileURLToPath(new URL('./build/narration.wav', import.meta.url));
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-stats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(DURATION * FPS);
  for (let i = 0; i < frames; i++) {
    renderFrame(i / FPS);
    const buf = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) await once(ff.stdin, 'drain');
    if (i % 90 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
