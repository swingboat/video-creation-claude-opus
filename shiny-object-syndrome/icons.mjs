// Small flat icons used on the concept cards. Each draws centred at (x,y) with size s (≈ 1 → 120 px box).
import { C, star, txt } from './lib.mjs';

function frame(ctx, x, y, s, fn) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  fn();
  ctx.restore();
}

const shape = (ctx, fill, path) => { ctx.fillStyle = fill; ctx.beginPath(); path(); ctx.fill(); ctx.stroke(); };

export const icons = {
  book(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      shape(ctx, C.red, () => ctx.roundRect(-56, -44, 112, 88, 10));
      shape(ctx, C.cream, () => ctx.roundRect(-46, -34, 92, 68, 6));
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 34); ctx.stroke();
      for (const k of [-16, 0, 16]) { ctx.beginPath(); ctx.moveTo(-36, k); ctx.lineTo(-12, k); ctx.moveTo(12, k); ctx.lineTo(36, k); ctx.stroke(); }
      shape(ctx, C.gold, () => ctx.roundRect(18, -66, 62, 32, 12));
      txt(ctx, 'HOT', 49, -49, { size: 22, font: 'RoundB', color: C.ink });
    });
  },
  app(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      shape(ctx, C.white, () => ctx.roundRect(-60, -46, 120, 92, 14));
      shape(ctx, C.lilac, () => ctx.roundRect(-60, -46, 120, 24, [14, 14, 0, 0]));
      ctx.fillStyle = C.mint; ctx.fillRect(-48, -10, 30, 44);
      ctx.fillStyle = C.sky; ctx.fillRect(-12, -10, 30, 28);
      ctx.fillStyle = C.pink; ctx.fillRect(24, -10, 24, 36);
    });
  },
  rocket(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      ctx.rotate(0.6);
      shape(ctx, C.orange, () => { ctx.moveTo(-14, 34); ctx.lineTo(-30, 56); ctx.lineTo(30, 56); ctx.lineTo(14, 34); });
      shape(ctx, C.white, () => { ctx.moveTo(0, -64); ctx.quadraticCurveTo(34, -30, 24, 40); ctx.lineTo(-24, 40); ctx.quadraticCurveTo(-34, -30, 0, -64); });
      shape(ctx, C.sky, () => ctx.arc(0, -10, 12, 0, Math.PI * 2));
      shape(ctx, C.gold, () => { ctx.moveTo(-12, 42); ctx.lineTo(0, 74); ctx.lineTo(12, 42); });
    });
  },
  camera(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      shape(ctx, '#556079', () => ctx.roundRect(-62, -36, 124, 80, 14));
      shape(ctx, '#556079', () => ctx.roundRect(-24, -52, 48, 20, 6));
      shape(ctx, '#cfe6ff', () => ctx.arc(0, 4, 26, 0, Math.PI * 2));
      shape(ctx, C.navy, () => ctx.arc(0, 4, 13, 0, Math.PI * 2));
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(44, -20, 6, 0, Math.PI * 2); ctx.fill();
    });
  },
  target(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      for (const [r, c] of [[56, C.red], [40, C.white], [24, C.red], [9, C.white]]) shape(ctx, c, () => ctx.arc(0, 0, r, 0, Math.PI * 2));
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(54, -54); ctx.stroke();
      shape(ctx, C.gold, () => { ctx.moveTo(48, -48); ctx.lineTo(70, -46); ctx.lineTo(56, -60); ctx.lineTo(54, -70); });
    });
  },
  wrench(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      ctx.rotate(-0.8);
      shape(ctx, '#aab4c8', () => ctx.roundRect(-11, -20, 22, 84, 10));
      shape(ctx, '#aab4c8', () => { ctx.arc(0, -36, 30, 0.35 * Math.PI, 2.65 * Math.PI); ctx.lineTo(-8, -50); ctx.lineTo(8, -50); ctx.closePath(); });
    });
  },
  lens(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      ctx.lineWidth = 16; ctx.strokeStyle = '#7a4f2a';
      ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(56, 56); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
      shape(ctx, 'rgba(180,230,255,0.9)', () => ctx.arc(-6, -6, 40, 0, Math.PI * 2));
      ctx.strokeStyle = C.white; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(-6, -6, 26, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    });
  },
  hourglass(ctx, x, y, s, p = 0) {
    frame(ctx, x, y, s, () => {
      shape(ctx, '#cfe6ff', () => { ctx.moveTo(-36, -50); ctx.lineTo(36, -50); ctx.lineTo(4, 0); ctx.lineTo(36, 50); ctx.lineTo(-36, 50); ctx.lineTo(-4, 0); ctx.closePath(); });
      ctx.fillStyle = C.gold;
      const top = 40 * (1 - p), bot = 40 * p;
      ctx.beginPath(); ctx.moveTo(-top * 0.8, -6 - top); ctx.lineTo(top * 0.8, -6 - top); ctx.lineTo(0, -4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-32, 46); ctx.lineTo(32, 46); ctx.lineTo(bot * 0.7, 46 - bot); ctx.lineTo(-bot * 0.7, 46 - bot); ctx.fill();
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(-46, -60, 92, 12); ctx.fillRect(-46, 48, 92, 12);
    });
  },
  flag(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, 60); ctx.lineTo(-30, -60); ctx.stroke();
      ctx.lineWidth = 6;
      shape(ctx, C.mint, () => { ctx.moveTo(-30, -60); ctx.lineTo(46, -40); ctx.lineTo(-30, -16); });
    });
  },
  clipboard(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      shape(ctx, '#c08a55', () => ctx.roundRect(-50, -62, 100, 124, 10));
      shape(ctx, C.white, () => ctx.roundRect(-40, -46, 80, 98, 6));
      shape(ctx, '#7d8597', () => ctx.roundRect(-22, -72, 44, 20, 6));
      ctx.fillStyle = C.red; ctx.fillRect(-8, -30, 16, 44); ctx.fillRect(-22, -16, 44, 16);
      ctx.lineWidth = 4; for (const k of [26, 40]) { ctx.beginPath(); ctx.moveTo(-28, k); ctx.lineTo(28, k); ctx.stroke(); }
    });
  },
  talk(ctx, x, y, s) {
    frame(ctx, x, y, s, () => {
      shape(ctx, C.white, () => { ctx.roundRect(-62, -48, 124, 80, 30); });
      shape(ctx, C.white, () => { ctx.moveTo(-30, 30); ctx.lineTo(-44, 58); ctx.lineTo(-6, 32); });
      ctx.fillStyle = C.white; ctx.fillRect(-28, 24, 26, 12);
      ctx.fillStyle = C.mint;
      for (const k of [-28, 0, 28]) { ctx.beginPath(); ctx.arc(k, -8, 9, 0, Math.PI * 2); ctx.fill(); }
    });
  },
  sparkle(ctx, x, y, s, t) {
    star(ctx, x, y, 22 * s * (0.7 + 0.3 * Math.sin(t * 8)), C.gold, t * 2);
  },
};

// A big red check or cross mark.
export function mark(ctx, x, y, s, ok, p = 1) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 22;
  ctx.strokeStyle = ok ? C.mint : C.red;
  ctx.beginPath();
  if (ok) {
    const q = Math.min(1, p * 2), r = Math.max(0, p * 2 - 1);
    ctx.moveTo(-50, 0); ctx.lineTo(-50 + 34 * q, 34 * q);
    if (r > 0) ctx.lineTo(-16 + 78 * r, 34 - 88 * r);
  } else {
    const q = Math.min(1, p * 2), r = Math.max(0, p * 2 - 1);
    ctx.moveTo(-46, -46); ctx.lineTo(-46 + 92 * q, -46 + 92 * q);
    if (r > 0) { ctx.moveTo(46, -46); ctx.lineTo(46 - 92 * r, -46 + 92 * r); }
  }
  ctx.stroke();
  ctx.restore();
}
