// The cast: 阿亮 (a young man who digs wells) and 闪闪 (the shiny gem that keeps luring him away).
import { C, clamp, lerp, star } from './lib.mjs';

const SKIN = '#ffd3b0', SKIN_EDGE = '#e8a77f', HAIR = '#2b2140', SHIRT = '#ff8a3d', SHIRT_DEEP = '#e66a1f', JEANS = '#3c5aa6';

// Two-bone IK: returns the elbow for a limb from shoulder (sx,sy) to hand (hx,hy).
function elbow(sx, sy, hx, hy, l1, l2, bend) {
  const dx = hx - sx, dy = hy - sy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [sx + Math.cos(a + bend * k) * l1, sy + Math.sin(a + bend * k) * l1];
}

function limb(ctx, pts, color, w) {
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
}

function arm(ctx, sx, sy, hx, hy, bend) {
  const [ex, ey] = elbow(sx, sy, hx, hy, 74, 74, bend);
  limb(ctx, [[sx, sy], [ex, ey]], SHIRT, 34);
  limb(ctx, [[lerp(sx, ex, 0.55), lerp(sy, ey, 0.55)], [ex, ey], [hx, hy]], SKIN, 24);
  ctx.fillStyle = SKIN;
  ctx.beginPath(); ctx.arc(hx, hy, 17, 0, Math.PI * 2); ctx.fill();
}

export function shovel(ctx, gx, gy, bx, by) {
  ctx.save();
  limb(ctx, [[gx, gy], [bx, by]], '#9b6a3c', 12);
  const a = Math.atan2(by - gy, bx - gx);
  ctx.translate(bx, by); ctx.rotate(a - Math.PI / 2);
  ctx.fillStyle = '#b8c2d6'; ctx.strokeStyle = '#5d6780'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(30, -6); ctx.lineTo(26, 40); ctx.quadraticCurveTo(0, 70, -26, 40); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#7a4f2a';
  ctx.beginPath(); ctx.roundRect(gx - 22, gy - 9, 44, 18, 9); ctx.fill();
}

// Where the hands and shovel go for each pose. u = cycle phase 0..1.
function handsFor(pose, t, u) {
  switch (pose) {
    case 'dig': {
      // grip stays at chest height; the blade bites down to the right, then flicks the dirt out
      const down = u < 0.45, p = down ? u / 0.45 : (u - 0.45) / 0.55;
      const gx = down ? lerp(70, 60, p) : lerp(60, 40, Math.sin(p * Math.PI)), gy = down ? lerp(-250, -170, p * p) : lerp(-170, -250, Math.sin(p * Math.PI * 0.5));
      const a = down ? lerp(1.0, 1.25, p) : lerp(1.25, -0.15, Math.sin(p * Math.PI * 0.5) ** 2);
      const bx = gx + Math.cos(a) * 270, by = gy + Math.sin(a) * 270;
      return { l: [gx, gy], r: [lerp(gx, bx, 0.33), lerp(gy, by, 0.33)], shovel: [gx, gy, bx, by] };
    }
    case 'carry':
      return { r: [10, -272], l: [-80, -150], shovel: [-60, -230, 240, -413] };
    case 'cheer': {
      const w = Math.sin(t * 12) * 18;
      return { r: [130 + w, -470], l: [-130 - w, -470] };
    }
    case 'point':
      return { r: [198, -330], l: [-80, -150] };
    case 'write':
      return { r: [40 + Math.sin(t * 14) * 14, -235 + Math.cos(t * 9) * 6], l: [-40, -230], pad: true };
    case 'think':
      return { r: [28, -320], l: [-80, -150] };
    case 'shrug':
      return { r: [130, -250], l: [-130, -250] };
    default:
      return { r: [80, -150], l: [-80, -150] };
  }
}

function face(ctx, t, o) {
  const { mood = 'happy', talk = 0, look = 0 } = o;
  const blink = (t * 0.37 + (o.seed ?? 0)) % 1 > 0.965 && mood !== 'excited';
  for (const sx of [-1, 1]) {
    const ex = sx * 27, ey = -378;
    if (mood === 'excited') {
      star(ctx, ex, ey, 22, C.gold, t * 3);
      continue;
    }
    if (blink || mood === 'joy') {
      ctx.strokeStyle = HAIR; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(ex, ey + 4, 13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      continue;
    }
    const wide = mood === 'shock' ? 1.25 : 1;
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.ellipse(ex, ey, 15 * wide, 19 * wide, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = HAIR;
    const pr = mood === 'shock' ? 6 : 9;
    ctx.beginPath(); ctx.arc(ex + look * 6, ey + 3, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(ex + look * 6 + 3, ey - 1, 3, 0, Math.PI * 2); ctx.fill();
    if (mood === 'tired') {
      ctx.fillStyle = SKIN;
      ctx.fillRect(ex - 18, ey - 24, 36, 20);
      ctx.strokeStyle = HAIR; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(ex - 16, ey - 4); ctx.lineTo(ex + 16, ey - 4); ctx.stroke();
    }
  }
  // brows
  ctx.strokeStyle = HAIR; ctx.lineWidth = 6;
  const lift = mood === 'shock' || mood === 'excited' ? -10 : 0;
  for (const sx of [-1, 1]) {
    const tilt = mood === 'tired' || mood === 'think' ? sx * -5 : 0;
    ctx.beginPath(); ctx.moveTo(sx * 14, -405 + lift - tilt); ctx.lineTo(sx * 40, -408 + lift + tilt); ctx.stroke();
  }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 44, -352, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); }
  // mouth
  ctx.fillStyle = '#8c2f39'; ctx.strokeStyle = '#8c2f39'; ctx.lineWidth = 5;
  if (talk > 0.05 || mood === 'shock' || mood === 'joy') {
    const open = mood === 'shock' ? 16 : mood === 'joy' ? 18 : 6 + talk * 12;
    ctx.beginPath(); ctx.ellipse(0, -340, mood === 'shock' ? 11 : 17, open, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'tired' || mood === 'think') {
    ctx.beginPath(); ctx.moveTo(-12, -338); ctx.quadraticCurveTo(0, -344, 12, -336); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, -350, 16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  if (mood === 'tired') {
    const sy = -400 + ((t * 40) % 40);
    ctx.fillStyle = '#7fd0ff';
    ctx.beginPath(); ctx.moveTo(78, sy - 18); ctx.quadraticCurveTo(92, sy + 4, 78, sy + 8); ctx.quadraticCurveTo(64, sy + 4, 78, sy - 18); ctx.fill();
  }
}

// 阿亮. (x,y) = feet centre, s = scale. o: pose, mood, talk 0..1, look -1..1, walk (phase or null), flip, digSpeed.
export function aliang(ctx, t, x, y, s, o = {}) {
  const { pose = 'stand', walk = null, flip = false, digSpeed = 1.6 } = o;
  const u = (t * digSpeed) % 1;
  const hop = walk != null ? Math.abs(Math.sin(walk * Math.PI * 2)) * 10 : pose === 'cheer' ? Math.abs(Math.sin(t * 9)) * 26 : Math.sin(t * 3) * 3;
  const H = handsFor(pose, t, u);
  ctx.save();
  ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(30,20,10,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 4, 95, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -hop);
  // legs
  const sw = walk != null ? Math.sin(walk * Math.PI * 2) * 26 : 0;
  for (const [sx, k] of [[-1, 1], [1, -1]]) {
    limb(ctx, [[sx * 28, -150], [sx * 30 + sw * k, -2]], JEANS, 40);
    ctx.fillStyle = '#3a2a2a';
    ctx.beginPath(); ctx.ellipse(sx * 34 + sw * k + sx * 8, 0, 30, 15, 0, 0, Math.PI * 2); ctx.fill();
  }
  // torso
  ctx.fillStyle = SHIRT;
  ctx.beginPath(); ctx.roundRect(-64, -305, 128, 170, [44, 44, 18, 18]); ctx.fill();
  ctx.fillStyle = SHIRT_DEEP;
  ctx.beginPath(); ctx.roundRect(-64, -160, 128, 26, 10); ctx.fill();
  star(ctx, 0, -230, 26, C.cream, 0);
  if (H.shovel && pose === 'carry') shovel(ctx, ...H.shovel);
  // neck + head
  ctx.fillStyle = SKIN; ctx.fillRect(-16, -320, 32, 24);
  ctx.beginPath(); ctx.arc(-70, -372, 15, 0, Math.PI * 2); ctx.arc(70, -372, 15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -378, 72, 76, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = SKIN_EDGE; ctx.lineWidth = 3; ctx.stroke();
  // hair: a fluffy fringe with a cowlick
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-76, -372);
  ctx.quadraticCurveTo(-86, -462, 0, -466);
  ctx.quadraticCurveTo(84, -462, 76, -372);
  ctx.quadraticCurveTo(64, -420, 40, -414);
  ctx.quadraticCurveTo(20, -430, 4, -410);
  ctx.quadraticCurveTo(-20, -428, -36, -410);
  ctx.quadraticCurveTo(-62, -420, -76, -372);
  ctx.fill();
  ctx.strokeStyle = HAIR; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(6, -462); ctx.quadraticCurveTo(26, -500, 46, -486); ctx.stroke();
  face(ctx, t, o);
  // arms (+ shovel / notepad)
  if (H.shovel && pose === 'dig') shovel(ctx, ...H.shovel);
  if (H.pad) {
    ctx.save(); ctx.translate(-10, -232); ctx.rotate(-0.12);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-70, -50, 120, 96, 8); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  arm(ctx, -56, -284, H.l[0], H.l[1], 1);
  arm(ctx, 56, -284, H.r[0], H.r[1], -1);
  if (H.pad) limb(ctx, [[H.r[0], H.r[1]], [H.r[0] - 18, H.r[1] + 30]], C.ink, 7);
  ctx.restore();
}

// 闪闪, the shiny gem. (x,y) = centre. o: talk, mood ('wink'|'happy'), wave 0..1 (beckoning hand), glow 0..1.
export function shiny(ctx, t, x, y, s, o = {}) {
  const { talk = 0, mood = 'happy', wave = 0, glow = 1 } = o;
  const bob = Math.sin(t * 3.2) * 10;
  ctx.save();
  ctx.translate(x, y + bob); ctx.scale(s, s);
  // glow + orbiting sparkles
  if (glow > 0) {
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 190);
    g.addColorStop(0, `rgba(255,240,170,${0.75 * glow})`);
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 190, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + (i * Math.PI) / 3, r = 125 + Math.sin(t * 4 + i) * 12;
      const tw = 0.6 + 0.4 * Math.sin(t * 7 + i * 2);
      star(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.8, 14 * tw * glow, i % 2 ? C.white : C.gold, t * 2 + i);
    }
  }
  // beckoning hand
  if (wave > 0) {
    const a = -0.5 + Math.sin(t * 10) * 0.45 * wave;
    ctx.save(); ctx.translate(78, 4); ctx.rotate(a);
    ctx.strokeStyle = '#6fd6ff'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(44 * wave, -30 * wave); ctx.stroke();
    ctx.fillStyle = '#bff0ff';
    ctx.beginPath(); ctx.arc(48 * wave, -34 * wave, 14 * wave, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // gem body: table, crown facets, pavilion
  const top = -62, girdle = -18, bottom = 92;
  ctx.lineJoin = 'round';
  const facet = (pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
  };
  facet([[-44, top], [44, top], [96, girdle], [-96, girdle]], '#8fe3ff');
  facet([[-44, top], [0, top], [-30, girdle], [-96, girdle]], '#c9f3ff');
  facet([[44, top], [96, girdle], [40, girdle]], '#5ec8f5');
  facet([[-96, girdle], [96, girdle], [0, bottom]], '#4cc0f2');
  facet([[-96, girdle], [-30, girdle], [0, bottom]], '#86dcff');
  facet([[40, girdle], [96, girdle], [0, bottom]], '#2f9fd8');
  ctx.strokeStyle = '#1b6fa8'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-44, top); ctx.lineTo(44, top); ctx.lineTo(96, girdle); ctx.lineTo(0, bottom); ctx.lineTo(-96, girdle); ctx.closePath(); ctx.stroke();
  // face
  const shine = (t * 0.5) % 1;
  ctx.fillStyle = `rgba(255,255,255,${0.7 * Math.sin(shine * Math.PI)})`;
  ctx.beginPath(); ctx.ellipse(-50 + shine * 100, -40, 8, 18, 0.5, 0, Math.PI * 2); ctx.fill();
  for (const sx of [-1, 1]) {
    const ex = sx * 26, ey = 4;
    if (mood === 'wink' && sx > 0) {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(ex, ey + 4, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      continue;
    }
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(ex, ey, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(ex + 4, ey - 5, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,170,0.5)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 46, 20, 10, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#8c2f39'; ctx.strokeStyle = '#8c2f39'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  if (talk > 0.05) {
    ctx.beginPath(); ctx.ellipse(0, 30, 12, 5 + talk * 9, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 24, 12, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  ctx.restore();
}
