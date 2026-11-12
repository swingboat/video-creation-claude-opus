// Stylised performer silhouettes (no real likenesses) and crowd rows.
import { lerp, rand } from './lib.mjs';

const limb = (ctx, x, y, a1, a2, l1, l2, w) => {
  const ex = x + Math.sin(a1) * l1, ey = y + Math.cos(a1) * l1;
  const hx = ex + Math.sin(a1 + a2) * l2, hy = ey + Math.cos(a1 + a2) * l2;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  return [hx, hy];
};

// Angles in radians, 0 = hanging straight down; positive swings outward on both sides.
const POSES = {
  idle: { aL: [0.15, 0.1], aR: [0.15, 0.1], lL: [0.08, 0], lR: [0.08, 0], lean: 0 },
  armsUp: { aL: [2.7, 0.2], aR: [2.7, 0.2], lL: [0.18, 0], lR: [0.18, 0], lean: 0 },
  point: { aL: [0.3, 0.2], aR: [2.0, 0], lL: [0.25, 0], lR: [0.1, 0], lean: -0.06 },
  cross: { aL: [-2.6, 0], aR: [-2.6, 0], lL: [0.3, 0], lR: [0.3, 0], lean: 0 },
  step: { aL: [1.2, 1.0], aR: [0.4, 2.2], lL: [0.5, -0.6], lR: [0.05, 0], lean: 0.08 },
  hips: { aL: [0.9, -1.9], aR: [0.9, -1.9], lL: [0.2, 0], lR: [0.05, 0], lean: 0.05 },
  mic: { aL: [0.2, 0.1], aR: [0.35, -3.0], lL: [0.12, 0], lR: [0.12, 0], lean: -0.04 },
  jump: { aL: [2.2, 0.6], aR: [2.2, 0.6], lL: [0.5, -1.2], lR: [0.5, -1.2], lean: 0 },
  ride: { aL: [-0.5, -1.1], aR: [-0.3, -1.3], lL: [0.55, -1.0], lR: [0.55, -1.0], lean: 0 },
  rideUp: { aL: [-0.5, -1.1], aR: [-0.3, -1.3], lL: [0.4, -0.6], lR: [0.4, -0.6], lean: 0 },
  wave: { aL: [0.2, 0.1], aR: [2.6, 0.5], lL: [0.1, 0], lR: [0.2, 0], lean: 0.04 },
};

const mixPose = (a, b, k) => {
  const m = (x, y) => [lerp(x[0], y[0], k), lerp(x[1], y[1], k)];
  return { aL: m(a.aL, b.aL), aR: m(a.aR, b.aR), lL: m(a.lL, b.lL), lR: m(a.lR, b.lR), lean: lerp(a.lean, b.lean, k) };
};

// Blend between two named poses on a beat: k in 0..1.
export const pose = (a, b = a, k = 0) => mixPose(POSES[a], POSES[b], k);

export function figure(ctx, x, y, s, p, o = {}) {
  const { color = '#111', rim, hair = 'short', hop = 0, cap = false } = o;
  ctx.save();
  ctx.translate(x, y - hop); ctx.scale(s, s); ctx.rotate(p.lean);
  const draw = (col, off) => {
    ctx.save(); ctx.translate(off, 0);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    limb(ctx, -16, -200, -p.lL[0], -p.lL[1], 100, 100, 30);
    limb(ctx, 16, -200, p.lR[0], p.lR[1], 100, 100, 30);
    ctx.beginPath(); ctx.moveTo(-46, -380); ctx.lineTo(46, -380); ctx.lineTo(34, -190); ctx.lineTo(-34, -190); ctx.closePath(); ctx.fill();
    limb(ctx, -44, -370, -p.aL[0], -p.aL[1], 86, 84, 22);
    limb(ctx, 44, -370, p.aR[0], p.aR[1], 86, 84, 22);
    ctx.fillRect(-11, -410, 22, 36);
    ctx.beginPath(); ctx.ellipse(0, -440, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
    if (hair === 'long') { ctx.beginPath(); ctx.roundRect(-40, -470, 80, 110, 30); ctx.fill(); }
    if (hair === 'pony') { ctx.beginPath(); ctx.ellipse(36, -430, 14, 46, -0.3, 0, Math.PI * 2); ctx.fill(); }
    if (cap) { ctx.beginPath(); ctx.ellipse(0, -468, 40, 18, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-4, -470, 62, 10); }
    ctx.restore();
  };
  if (rim) draw(rim, 5);
  draw(color, 0);
  ctx.restore();
}

// A dancing group: n figures spread over width w, grooving to bpm.
export function group(ctx, t, cx, y, w, n, s, o = {}) {
  const { bpm = 110, poses = ['idle', 'step'], color, rim, hairs = ['short'], sync = 1 } = o;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? cx : cx - w / 2 + (w * i) / (n - 1);
    const ph = (t * bpm) / 60 + (1 - sync) * rand(i + 3);
    const k = 0.5 - 0.5 * Math.cos(ph * Math.PI);
    const pa = poses[Math.floor(ph / 2 + i * (1 - sync) * 3) % poses.length];
    const pb = poses[(Math.floor(ph / 2) + 1) % poses.length];
    const bob = Math.abs(Math.sin(ph * Math.PI)) * 10;
    figure(ctx, x, y + (i % 2 ? 6 : 0), s * (i === Math.floor(n / 2) ? 1.04 : 1), pose(pa, pb, k), {
      color, rim, hair: hairs[i % hairs.length], hop: bob,
    });
  }
}

// Rows of heads and shoulders seen from behind.
export function crowd(ctx, t, y0, rows, o = {}) {
  const { color = '#050507', bounce = 0, bpm = 120, W = 1920 } = o;
  for (let r = 0; r < rows; r++) {
    const s = 0.7 + r * 0.25, y = y0 + r * 70;
    const n = Math.ceil(W / (90 * s)) + 2;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = (i - 0.5) * 90 * s + rand(i + r * 50) * 30;
      const jump = bounce * Math.max(0, Math.sin(((t * bpm) / 60 + rand(i * 7 + r)) * Math.PI)) * 14 * s;
      ctx.beginPath(); ctx.ellipse(x, y - 60 * s - jump, 26 * s, 31 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + 20 * s - jump, 52 * s, 50 * s, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - 52 * s, y + 20 * s - jump, 104 * s, 200);
    }
  }
}

export function spotlight(ctx, x, y, w, h, color = 'rgba(255,240,210,A)', a = 0.35) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, color.replace('A', String(a))); g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x - w / 2, y + h); ctx.closePath(); ctx.fill();
}
