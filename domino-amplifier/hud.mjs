// 2D overlays on top of the Blender frames: badge, domino counter, fact chips, tower comparison, subtitles.
import { W, H, NUM, ZH, EV, SEG, TL, at, clamp, prog, easeOut, pop, lerp, txt, measure, panel, fmtHeight } from './lib.mjs';

const GOLD = '#ffd166';

function badge(ctx, t) {
  const a = easeOut(prog(t, 0.3, 0.9)) * (1 - prog(t, EV.t_land + 0.5, EV.t_land + 1.2));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  panel(ctx, 48, 40, 480, 66, 33);
  txt(ctx, '物理小实验', 150, 74, { size: 30, color: GOLD });
  txt(ctx, '多米诺放大器', 360, 74, { size: 30 });
  ctx.restore();
}

// "第 N 块 · height · ×ratio" — ticks up whenever the next domino gets hit
function counter(ctx, t) {
  const n = EV.touch.filter((x) => x <= t).length;
  if (n === 0) return;
  const a = easeOut(prog(t, EV.touch[0], EV.touch[0] + 0.4)) * (1 - prog(t, EV.t_land + 0.5, EV.t_land + 1.2));
  if (a <= 0) return;
  const s = pop(t, EV.touch[n - 1], 0.35);
  const h = EV.heights[n - 1], ratio = Math.pow(1.5, n - 1);
  ctx.save();
  ctx.globalAlpha = a;
  panel(ctx, 48, 124, 480, 196, 30);
  txt(ctx, '第', 92, 196, { size: 38 });
  ctx.save();
  ctx.translate(178, 192);
  ctx.scale(lerp(0.6, 1, s), lerp(0.6, 1, s));
  txt(ctx, String(n), 0, 0, { size: 92, font: NUM, color: GOLD });
  ctx.restore();
  txt(ctx, '块', 266, 196, { size: 38 });
  txt(ctx, fmtHeight(h), 312, 196, { size: 38, font: NUM, color: '#cfe8ff', align: 'left' });
  const r = ratio < 10 ? ratio.toFixed(1) : Math.round(ratio).toString();
  txt(ctx, n === 1 ? '起点：5 毫米高' : `是第 1 块的 ${r} 倍高`, 288, 278, { size: 34, color: n === 1 ? '#ddd' : '#fff' });
  ctx.restore();
}

function chip(ctx, t, t0, t1, lines) {
  const a = easeOut(prog(t, t0, t0 + 0.35)) * (1 - prog(t, t1, t1 + 0.35));
  if (a <= 0) return;
  const w = Math.max(...lines.map(([s, size, font]) => measure(ctx, s, size, font))) + 64;
  const hgt = 34 + lines.reduce((acc, [, size]) => acc + size * 1.45, 0);
  const x = W - 48 - w, y = 40 + (1 - a) * -20;
  ctx.save();
  ctx.globalAlpha = a;
  panel(ctx, x, y, w, hgt, 26);
  let cy = y + 22;
  for (const [s, size, font, color] of lines) {
    cy += size * 0.72;
    txt(ctx, s, x + 32, cy, { size, font, color, align: 'left' });
    cy += size * 0.73;
  }
  ctx.restore();
}

function facts(ctx, t) {
  chip(ctx, t, at('fact', '1983'), SEG.fact.end + 0.4, [
    ['Whitehead, Am. J. Phys. 51, 182 (1983)', 26, NUM, '#9fb3c8'],
    ['一块骨牌能推倒约 1.5 倍大的下一块', 38, ZH, '#fff'],
  ]);
  chip(ctx, t, at('why', '重力势能'), SEG.why.end + 0.5, [
    ['势能 ∝ 质量 × 重心高度 ∝ 尺寸⁴', 30, ZH, '#9fb3c8'],
    ['每块的势能 ≈ 上一块的 1.5⁴ ≈ 5 倍', 38, ZH, GOLD],
  ]);
}

function bar(ctx, x, y, label, value, frac, color, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  txt(ctx, label, x, y, { size: 34, align: 'left' });
  txt(ctx, value, x + 560, y, { size: 36, font: NUM, color, align: 'right' });
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.roundRect(x, y + 30, 560, 16, 8); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y + 30, Math.max(16, 560 * frac), 16, 8); ctx.fill();
  ctx.restore();
}

function tower(ctx, t) {
  const t0 = at('tower', '第二十九'), t1 = at('tower', '帝国大厦');
  const a = easeOut(prog(t, t0 - 0.2, t0 + 0.3)) * (1 - prog(t, TL.duration - 0.9, TL.duration - 0.4));
  if (a <= 0) return;
  const x = W - 48 - 640, y = 40;
  ctx.save();
  ctx.globalAlpha = a;
  panel(ctx, x, y, 640, 330, 30);
  txt(ctx, '5 mm × 1.5²⁸ ≈ 426 m', x + 40, y + 52, { size: 40, font: NUM, color: GOLD, align: 'left' });
  const g1 = easeOut(prog(t, t0 + 0.2, t0 + 1.4)), g2 = easeOut(prog(t, t1, t1 + 1.0));
  bar(ctx, x + 40, y + 120, '第 13 块', '65 cm', 0.0015, '#cfe8ff', 1);
  bar(ctx, x + 40, y + 190, '第 29 块', `${Math.round(426 * g1)} m`, g1, GOLD, g1 > 0 ? 1 : 0);
  bar(ctx, x + 40, y + 260, '帝国大厦楼顶', '381 m', (381 / 426) * g2, '#ff8fab', g2 > 0 ? 1 : 0);
  ctx.restore();
}

function subtitles(ctx, t) {
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.3;
      const from = i === 0 ? c.start - 0.08 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.06) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.12, c.end + 0.3));
      const w = measure(ctx, c.text, 52) + 80, hgt = 88, y = H - 64 - hgt;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,12,18,0.62)';
      ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y, w, hgt, 44); ctx.fill();
      txt(ctx, c.text, W / 2, y + hgt / 2 + 2, { size: 52, shadow: false });
      ctx.restore();
    });
}

export function overlay(ctx, t) {
  badge(ctx, t);
  counter(ctx, t);
  facts(ctx, t);
  tower(ctx, t);
  subtitles(ctx, t);
  const fade = 1 - prog(t, 0, 0.5) + prog(t, TL.duration - 0.5, TL.duration);
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
