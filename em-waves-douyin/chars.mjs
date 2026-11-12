// Characters: the curious kid, faces, the sun, the earth and the photon mascot.
import { C, clamp, lerp } from './lib.mjs';

const TAU = Math.PI * 2;

export function face(ctx, t, x, y, r, o = {}) {
  const { talk = 0, mood = 'happy', look = 0 } = o;
  const s = r / 100;
  const blink = (t + x * 0.001) % 3.7 < 0.12 ? 0.15 : 1;
  ctx.save();
  ctx.translate(x + look * 10 * s, y);
  ctx.fillStyle = C.ink;
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(k * 32 * s, -12 * s, 9 * s, 13 * s * blink, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(k * 32 * s + 3 * s, -17 * s, 3.5 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink;
  }
  ctx.fillStyle = 'rgba(255,110,140,0.45)';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * 52 * s, 12 * s, 13 * s, 8 * s, 0, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.fillStyle = '#7a1f2b'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  if (talk > 0.05 || mood === 'wow') {
    ctx.beginPath(); ctx.ellipse(0, 20 * s, 12 * s, (5 + 12 * Math.max(talk, mood === 'wow' ? 0.8 : 0)) * s, 0, 0, TAU); ctx.fill();
  } else if (mood === 'sad') {
    ctx.beginPath(); ctx.arc(0, 32 * s, 14 * s, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 8 * s, 18 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}

export function glow(ctx, x, y, r0, r1, color) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU); ctx.fill();
}

export function sun(ctx, t, x, y, r, o = {}) {
  glow(ctx, x, y, r * 0.8, r * 2.1, 'rgba(255,190,60,0.45)');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.4);
  ctx.fillStyle = C.sun;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    const len = r * (1.32 + 0.08 * Math.sin(t * 5 + i));
    ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.9); ctx.lineTo(0, -len); ctx.lineTo(r * 0.16, -r * 0.9); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(0.6, C.sun); g.addColorStop(1, C.sunHot);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (o.spot) {
    ctx.fillStyle = 'rgba(120,50,10,0.75)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.42, y + r * 0.35, r * 0.13, r * 0.1, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.58, y + r * 0.22, r * 0.07, r * 0.06, 0, 0, TAU); ctx.fill();
  }
  if (o.face !== false) face(ctx, t, x, y, r * 0.95, o);
}

// Side lit from `light` (angle pointing toward the light source); the far side is shaded.
function shade(ctx, x, y, r, light) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  const lx = Math.cos(light), ly = Math.sin(light);
  const g = ctx.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.45, 'rgba(0,0,30,0)');
  g.addColorStop(0.75, 'rgba(0,0,30,0.45)');
  g.addColorStop(1, 'rgba(0,0,30,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

export function earth(ctx, t, x, y, r, o = {}) {
  const { light = Math.PI, spin = t * 0.25 } = o;
  glow(ctx, x, y, r * 0.95, r * 1.25, 'rgba(110,190,255,0.35)');
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = C.earth; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.fillStyle = C.land;
  const blobs = [[-0.4, -0.35, 0.38, 0.26], [0.35, 0.1, 0.3, 0.42], [-0.2, 0.5, 0.33, 0.18], [0.9, -0.5, 0.25, 0.2]];
  for (const [bx, by, rx, ry] of blobs) {
    const px = ((bx + spin) % 2.6 + 2.6) % 2.6 - 1.3;
    ctx.beginPath(); ctx.ellipse(x + px * r, y + by * r, rx * r, ry * r, 0.3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.95, r * 0.5, r * 0.14, 0, 0, TAU); ctx.fill();
  ctx.restore();
  shade(ctx, x, y, r, light);
  if (o.face !== false) face(ctx, t, x, y + r * 0.05, r * 0.8, o);
}

export function tick(ctx, x, y, s, color = C.ok) {
  ctx.save();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 40 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 18 * s, y + 1 * s); ctx.lineTo(x - 5 * s, y + 15 * s); ctx.lineTo(x + 20 * s, y - 14 * s); ctx.stroke();
  ctx.restore();
}
export function cross(ctx, x, y, s, color = C.no) {
  ctx.save();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 40 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 15 * s, y - 15 * s); ctx.lineTo(x + 15 * s, y + 15 * s);
  ctx.moveTo(x + 15 * s, y - 15 * s); ctx.lineTo(x - 15 * s, y + 15 * s); ctx.stroke();
  ctx.restore();
}

// The curious kid astronaut. (x,y) = feet; o.talk opens the mouth, o.wave raises an arm, o.think tilts the head.
export function kid(ctx, t, x, y, s, o = {}) {
  const { talk = 0, wave = 0, mood = 'happy', float = 1 } = o;
  const bob = Math.sin(t * 2.2) * 10 * float;
  ctx.save();
  ctx.translate(x, y + bob * s); ctx.scale(s, s);
  ctx.rotate(Math.sin(t * 1.3) * 0.05 * float);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // backpack
  ctx.fillStyle = '#c5cbe0';
  ctx.beginPath(); ctx.roundRect(-72, -190, 144, 120, 26); ctx.fill();
  // legs
  ctx.strokeStyle = '#eef1fa'; ctx.lineWidth = 34;
  ctx.beginPath(); ctx.moveTo(-26, -70); ctx.lineTo(-30, -14); ctx.moveTo(26, -70); ctx.lineTo(32, -14); ctx.stroke();
  ctx.fillStyle = '#5b6b9a';
  ctx.beginPath(); ctx.roundRect(-52, -22, 46, 24, 10); ctx.roundRect(8, -22, 46, 24, 10); ctx.fill();
  // body
  ctx.fillStyle = '#f6f8ff';
  ctx.beginPath(); ctx.roundRect(-58, -175, 116, 115, 40); ctx.fill();
  ctx.fillStyle = C.sunHot; ctx.fillRect(-58, -112, 116, 12);
  ctx.fillStyle = C.sky; ctx.beginPath(); ctx.roundRect(-22, -150, 44, 28, 6); ctx.fill();
  // arms
  ctx.strokeStyle = '#eef1fa'; ctx.lineWidth = 28;
  ctx.beginPath(); ctx.moveTo(-50, -150); ctx.lineTo(-84, -96); ctx.stroke();
  const wa = lerp(0.9, -0.9 + Math.sin(t * 10) * 0.35, clamp(wave));
  ctx.beginPath(); ctx.moveTo(50, -150); ctx.lineTo(50 + Math.cos(wa) * 62, -150 + Math.sin(wa) * 62); ctx.stroke();
  // helmet
  ctx.fillStyle = '#f6f8ff';
  ctx.beginPath(); ctx.arc(0, -250, 92, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd7b5';
  ctx.beginPath(); ctx.arc(0, -246, 70, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2c5c';
  ctx.beginPath(); ctx.arc(0, -262, 70, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.restore();
  face(ctx, t, x, y + bob * s - 236 * s, 64 * s, { talk, mood });
  ctx.save();
  ctx.translate(x, y + bob * s); ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, -250, 80, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  ctx.strokeStyle = '#c5cbe0'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, -250, 92, 0, TAU); ctx.stroke();
  ctx.restore();
}

// Photon mascot: a glowing orb with a face and a wiggly tail trailing behind (dir = travel angle).
export function photon(ctx, t, x, y, r, o = {}) {
  const { color = C.eF, dir = 0, tail = 3.2, freq = 1, talk = 0, mood = 'happy' } = o;
  glow(ctx, x, y, r * 0.6, r * 2.4, color + '88');
  ctx.save();
  ctx.translate(x, y); ctx.rotate(dir);
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
  ctx.globalAlpha *= 0.85;
  ctx.beginPath();
  const L = r * tail;
  for (let k = 0; k <= 40; k++) {
    const u = k / 40, px = -r * 0.8 - u * L;
    const py = Math.sin(u * Math.PI * 2 * 1.5 * freq - t * 14) * r * 0.45 * (1 - u * 0.6);
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  face(ctx, t, x, y + r * 0.08, r * 0.85, { talk, mood });
}
