// Props: radio, Wi-Fi router, broadcast tower, balloon, magnet, compass, speaker, microphone, remote and ripple arcs.
import { C, clamp, lerp, txt } from './lib.mjs';

const TAU = Math.PI * 2;

// Expanding arcs (signal / sound ripples) from (x,y) facing `dir` with half-angle `spread`.
export function ripples(ctx, t, x, y, o = {}) {
  const { dir = 0, spread = 0.7, n = 3, gap = 46, r0 = 20, speed = 1.2, color = C.sky, w = 8, alpha = 1, full = false } = o;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const p = ((t * speed + i / n) % 1);
    const r = r0 + p * gap * n;
    ctx.globalAlpha = alpha * (1 - p) * ctx.globalAlpha;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath();
    full ? ctx.arc(x, y, r, 0, TAU) : ctx.arc(x, y, r, dir - spread, dir + spread);
    ctx.stroke();
  }
  ctx.restore();
}

export function radio(ctx, t, x, y, s, o = {}) {
  const { on = 0, color = '#ff8f5a' } = o;
  const thump = 1 + on * 0.04 * Math.abs(Math.sin(t * 8));
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * thump, s / thump);
  ctx.strokeStyle = '#c5cbe0'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(60, -80); ctx.lineTo(130, -190); ctx.stroke();
  ctx.fillStyle = '#c5cbe0'; ctx.beginPath(); ctx.arc(130, -190, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-150, -90, 300, 180, 34); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.roundRect(-150, 50, 300, 40, [0, 0, 34, 34]); ctx.fill();
  ctx.fillStyle = C.cream;
  ctx.beginPath(); ctx.arc(-62, 0, 62, 0, TAU); ctx.fill();
  ctx.fillStyle = C.ink;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++)
    if (i * i + j * j <= 5) { ctx.beginPath(); ctx.arc(-62 + i * 20, j * 20, 5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#2b1a55'; ctx.beginPath(); ctx.roundRect(22, -50, 104, 44, 10); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(40 + ((t * 20) % 70) * on, -44, 5, 32);
  ctx.fillStyle = C.cream;
  for (const k of [0, 1]) { ctx.beginPath(); ctx.arc(48 + k * 52, 34, 16, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function router(ctx, t, x, y, s, o = {}) {
  const { on = 1 } = o;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#d6dcf0'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-90, -30); ctx.lineTo(-110, -150); ctx.moveTo(90, -30); ctx.lineTo(110, -150); ctx.stroke();
  ctx.fillStyle = '#f2f4fb';
  ctx.beginPath(); ctx.roundRect(-150, -40, 300, 90, 28); ctx.fill();
  ctx.fillStyle = '#c5cbe0'; ctx.fillRect(-150, 30, 300, 20);
  for (let i = 0; i < 4; i++) {
    const blink = on && Math.sin(t * 9 + i * 1.7) > 0;
    ctx.fillStyle = blink ? C.mint : '#8a93b5';
    ctx.beginPath(); ctx.arc(-70 + i * 46, 4, 9, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (on) ripples(ctx, t, x, y - 175 * s, { dir: -Math.PI / 2, spread: 0.75, gap: 34 * s, r0: 14 * s, color: C.sky, w: 9 * s, alpha: on });
}

// Lattice broadcast tower; the tip sits at (x, y - 420*s).
export function tower(ctx, t, x, y, s, o = {}) {
  const { pulse = 0 } = o;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#d6dcf0'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-110, 0); ctx.lineTo(0, -400); ctx.lineTo(110, 0); ctx.stroke();
  ctx.lineWidth = 5;
  for (let k = 0; k < 6; k++) {
    const y0 = -k * 64, y1 = -(k + 1) * 64, hw0 = 110 * (1 - k / 6.25), hw1 = 110 * (1 - (k + 1) / 6.25);
    ctx.beginPath(); ctx.moveTo(-hw0, y0); ctx.lineTo(hw1, y1); ctx.moveTo(hw0, y0); ctx.lineTo(-hw1, y1);
    ctx.moveTo(-hw1, y1); ctx.lineTo(hw1, y1); ctx.stroke();
  }
  ctx.fillStyle = Math.sin(t * 6) > 0 ? C.red : '#7a2030';
  ctx.beginPath(); ctx.arc(0, -420, 18, 0, TAU); ctx.fill();
  ctx.restore();
  if (pulse > 0) ripples(ctx, t, x, y - 420 * s, { full: true, gap: 60 * s, r0: 30 * s, n: 4, color: C.eF, w: 7 * s, alpha: pulse, speed: 0.8 });
}

export function balloon(ctx, t, x, y, r, o = {}) {
  const { charge = 1, color = '#ff5d7a' } = o;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.2);
  ctx.bezierCurveTo(x - 30, y + r * 1.7, x + 30, y + r * 2.1, x - 10, y + r * 2.8); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 14, y + r * 1.28); ctx.lineTo(x + 14, y + r * 1.28); ctx.lineTo(x, y + r * 1.15); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.5, r * 0.18, r * 0.32, -0.5, 0, TAU); ctx.fill();
  if (charge > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(charge);
    [[0.35, -0.1], [0.1, 0.4], [-0.25, 0.1], [0.45, 0.45], [-0.1, -0.55]].forEach(([u, v], i) => {
      const j = Math.sin(t * 7 + i) * 3;
      txt(ctx, '−', x + u * r + j, y + v * r, { size: r * 0.42, color: C.white });
    });
    ctx.restore();
  }
}

// Horseshoe magnet opening downward, centred at (x,y).
export function magnet(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineWidth = 70; ctx.lineCap = 'butt';
  ctx.strokeStyle = '#ff4d5e';
  ctx.beginPath(); ctx.arc(0, 0, 90, Math.PI, Math.PI * 1.5); ctx.lineTo(0, -90); ctx.stroke();
  ctx.strokeStyle = '#4c8dff';
  ctx.beginPath(); ctx.moveTo(0, -90); ctx.arc(0, 0, 90, Math.PI * 1.5, TAU); ctx.stroke();
  ctx.fillStyle = '#ff4d5e'; ctx.fillRect(-125, 0, 70, 90);
  ctx.fillStyle = '#4c8dff'; ctx.fillRect(55, 0, 70, 90);
  ctx.fillStyle = '#e8ecf8'; ctx.fillRect(-125, 70, 70, 34); ctx.fillRect(55, 70, 70, 34);
  txt(ctx, 'N', -90, 40, { size: 50, font: 'RoundB', color: C.white });
  txt(ctx, 'S', 90, 40, { size: 50, font: 'RoundB', color: C.white });
  ctx.restore();
}

export function compass(ctx, x, y, r, ang) {
  ctx.fillStyle = '#d9b26a';
  ctx.beginPath(); ctx.arc(x, y, r + 16, 0, TAU); ctx.fill();
  ctx.fillStyle = C.cream;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(43,26,85,0.35)'; ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8, l = i % 2 ? 0.86 : 0.78;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * l, y + Math.sin(a) * r * l);
    ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = '#ff4d5e';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.lineTo(r * 0.14, 0); ctx.lineTo(-r * 0.14, 0); ctx.fill();
  ctx.fillStyle = '#4c5f9a';
  ctx.beginPath(); ctx.moveTo(0, r * 0.78); ctx.lineTo(r * 0.14, 0); ctx.lineTo(-r * 0.14, 0); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, TAU); ctx.fill();
  ctx.restore();
}

// Speaker facing right; level 0..1 pumps the cone.
export function speaker(ctx, t, x, y, s, o = {}) {
  const { level = 0 } = o;
  const push = level * 10 * Math.sin(t * 40);
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#5b6b9a';
  ctx.beginPath(); ctx.roundRect(-110, -60, 70, 120, 14); ctx.fill();
  ctx.fillStyle = '#8a9ad0';
  ctx.beginPath(); ctx.moveTo(-40, -50); ctx.lineTo(40 + push, -120); ctx.lineTo(40 + push, 120); ctx.lineTo(-40, 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3b4670';
  ctx.beginPath(); ctx.ellipse(40 + push, 0, 18, 120, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export function mic(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = '#5b6b9a'; ctx.beginPath(); ctx.roundRect(-16, 20, 32, 120, 12); ctx.fill();
  ctx.fillStyle = '#c5cbe0'; ctx.beginPath(); ctx.arc(0, -20, 52, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8a93b5'; ctx.lineWidth = 4;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-48, -20 + k * 16); ctx.lineTo(48, -20 + k * 16); ctx.stroke(); }
  ctx.restore();
}

export function remote(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = '#3b4670'; ctx.beginPath(); ctx.roundRect(-40, -110, 80, 220, 26); ctx.fill();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, -70, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c5cbe0';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(-16 + j * 32, -20 + i * 36, 10, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ff6b6b'; ctx.fillRect(-12, -116, 24, 10);
  ctx.restore();
}

// Floating musical note.
export function note(ctx, x, y, s, color = C.gold) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, -4); ctx.lineTo(13, -60); ctx.lineTo(36, -48); ctx.stroke();
  ctx.restore();
}
void lerp;
