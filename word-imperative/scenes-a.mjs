// Scenes 1–2: the hidden emperor, pronunciation, imper ≈ emper, and the Latin family.
import { createCanvas } from '@napi-rs/canvas';
import {
  W, C, EN, ZH, S, SEG, at, word, prog, lerp, clamp, easeIO, easeOut, pop, fadeIn, elastic,
  txt, card, around, arrow, burst, crown, emperor, LETTER_COLORS,
} from './lib.mjs';

const WORD = 'imperative';
const SIZE = 190;
const scratch = createCanvas(8, 8).getContext('2d');
scratch.font = `${SIZE}px ${EN}`;
const LW = [...WORD].map((ch) => scratch.measureText(ch).width);
const GROUPS = [[0, 2], [2, 5], [5, 6], [6, 10]]; // im · PER · a · tive
const groupOf = (i) => GROUPS.findIndex(([a, b]) => i >= a && i < b);

function layout(stressMix) {
  const sc = LW.map((_, i) => lerp(1, groupOf(i) === 1 ? 1.32 : 0.92, stressMix));
  const gap = 56 * stressMix;
  const total = LW.reduce((s, w, i) => s + w * sc[i], 0) + gap * 3;
  let x = W / 2 - total / 2;
  return LW.map((w, i) => {
    if (i > 0 && groupOf(i) !== groupOf(i - 1)) x += gap;
    const cx = x + (w * sc[i]) / 2;
    x += w * sc[i];
    return { cx, sc: sc[i], w: w * sc[i] };
  });
}

// ---------- scene 1: the word ----------
const T_DROP = SEG.say1.words[0].start - 0.15;
const T_STRESS = S('stress');
const T_REVEAL = S('reveal');
const T_EMP = SEG.emperor.words[0].start;

function wordScene(ctx, t) {
  const mS = easeIO(prog(t, T_STRESS, T_STRESS + 0.6)) * (1 - easeIO(prog(t, T_REVEAL, T_REVEAL + 0.5)));
  const L = layout(mS);
  const lift = -110 * easeIO(prog(t, T_REVEAL + 0.1, T_REVEAL + 0.7));
  const baseY = 430 + lift;

  // --- hook: mystery card with a crown sneaking out ---
  const boxGone = prog(t, T_DROP - 0.05, T_DROP + 0.25);
  if (boxGone < 1) {
    const sc = pop(t, 0.15, 0.55) * (1 + 0.4 * boxGone);
    around(ctx, W / 2, 440, sc, 1 - boxGone, () => {
      const peek = easeOut(prog(t, at('hook', '偷偷'), at('hook', '偷偷') + 0.5));
      const big = elastic(prog(t, at('hook', '皇帝') - 0.1, at('hook', '皇帝') + 0.7));
      crown(ctx, W / 2 + Math.sin(t * 9) * 6 * (1 - big), lerp(440, 270, peek) - 40 * big, 1.1 + 0.5 * big, Math.sin(t * 5) * 0.12 * (1 - big));
      card(ctx, W / 2 - 400, 300, 800, 280, { fill: C.cream, r: 44 });
      for (let i = 0; i < 5; i++) {
        const bob = Math.sin(t * 6 + i) * 10;
        txt(ctx, '?', W / 2 - 280 + i * 140, 445 + bob, { size: 150, font: EN, color: LETTER_COLORS[i], stroke: C.ink, sw: 12 });
      }
      txt(ctx, '今天的单词', W / 2, 640, { size: 46, color: C.lilac });
    });
    burst(ctx, t, at('hook', '皇帝'), W / 2, 230, { r: 260, n: 12 });
  }

  // --- letters ---
  const dimOthers = 0.65 * easeOut(prog(t, at('reveal', '圈'), at('reveal', '圈') + 0.4));
  const pulse = say2Pulse(t);
  for (let i = 0; i < WORD.length; i++) {
    const t0 = T_DROP + i * 0.055;
    const p = prog(t, t0, t0 + 0.55);
    if (p <= 0) continue;
    const yDrop = lerp(-220, 0, easeOut(Math.min(1, p * 1.4))) - Math.abs(Math.sin(p * Math.PI * 2.2)) * 60 * (1 - p);
    const g = groupOf(i);
    const sc = L[i].sc * (1 + pulse[g]);
    const y = baseY + yDrop - (g === 1 ? 26 * mS : 0) - pulse[g] * 60;
    const color = mS > 0.5 ? (g === 1 ? C.gold : C.white) : LETTER_COLORS[i];
    const alpha = i >= 5 ? 1 - dimOthers : 1;
    around(ctx, L[i].cx, y, sc, alpha, () =>
      txt(ctx, WORD[i], L[i].cx, y, { size: SIZE, font: EN, color, stroke: C.ink, sw: 18, shadow: 'rgba(10,0,40,0.5)' }));
  }
  // separators between syllables
  if (mS > 0.05) {
    for (let g = 1; g < 4; g++) {
      const xa = L[GROUPS[g][0] - 1], xb = L[GROUPS[g][0]];
      const mx = (xa.cx + xa.w / 2 + xb.cx - xb.w / 2) / 2;
      around(ctx, mx, baseY, mS, mS, () => {
        ctx.fillStyle = C.pink;
        ctx.beginPath(); ctx.arc(mx, baseY + 10, 13, 0, Math.PI * 2); ctx.fill();
      });
    }
    const pa = fadeIn(t, T_STRESS + 0.3, 0.4) * mS;
    around(ctx, W / 2, baseY + 190, 1, pa, () =>
      txt(ctx, '/ɪmˈper.ə.tɪv/', W / 2, baseY + 190, { size: 64, font: EN, color: C.lilac }));
    // stress flag over PER
    const fl = pop(t, at('stress', '重音'), 0.5) * mS;
    const per = L[3];
    around(ctx, per.cx, baseY - 230, fl, fl, () => {
      card(ctx, per.cx - 130, baseY - 300, 260, 100, { fill: C.pink, r: 50, drop: 8 });
      txt(ctx, '重音！', per.cx, baseY - 250, { size: 54, color: C.white, stroke: C.ink, sw: 8 });
      arrow(ctx, per.cx, baseY - 196, per.cx, baseY - 140, { color: C.pink, w: 10, head: 28 });
    }, Math.sin(t * 5) * 0.05);
    // "2nd syllable" counter
    const k = fadeIn(t, at('stress', '第二个'), 0.3) * mS;
    for (let g = 0; g < 4; g++) {
      const gx = (L[GROUPS[g][0]].cx + L[GROUPS[g][1] - 1].cx) / 2;
      around(ctx, gx, baseY + 112, k, k, () => {
        ctx.fillStyle = g === 1 ? C.gold : 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(gx, baseY + 112, g === 1 ? 26 : 18, 0, Math.PI * 2); ctx.fill();
        txt(ctx, String(g + 1), gx, baseY + 114, { size: g === 1 ? 34 : 24, font: EN, color: C.ink });
      });
    }
  }
  // crown parked on the word
  const cp = pop(t, T_DROP + 0.6, 0.5);
  if (cp > 0 && boxGone >= 1) {
    const L0 = L[0];
    crown(ctx, L0.cx - 10, baseY - 170 - 14 * Math.abs(Math.sin(t * 3)), 0.75 * cp, -0.32);
  }

  // --- reveal: circle "imper", then emperor below ---
  if (t > T_REVEAL) {
    const c0 = at('reveal', '圈'), c1 = word('reveal', '圈出来').end + 0.15;
    const cpg = easeIO(prog(t, c0 - 0.35, c1));
    if (cpg > 0) {
      const xa = L[0].cx - L[0].w / 2 - 34, xb = L[4].cx + L[4].w / 2 + 34;
      scribbleEllipse(ctx, (xa + xb) / 2, baseY + 4, (xb - xa) / 2, 130, cpg, t);
    }
    const qa = pop(t, at('reveal', '像不像'), 0.5);
    const qx = L[4].cx + L[4].w / 2 + 70;
    around(ctx, qx, baseY - 150, qa, qa * (1 - prog(t, T_EMP, T_EMP + 0.2)), () =>
      txt(ctx, '?', qx, baseY - 150 + Math.sin(t * 7) * 8, { size: 120, font: EN, color: C.gold, stroke: C.ink, sw: 10 }));
    drawEmperorWord(ctx, t, (L[0].cx - L[0].w / 2 + L[4].cx + L[4].w / 2) / 2);
  }
}

function drawEmperorWord(ctx, t, alignX) {
  const p = pop(t, T_EMP - 0.05, 0.5);
  if (p <= 0) return;
  const y = 700;
  ctx.save();
  ctx.font = `150px ${EN}`;
  const wEmper = ctx.measureText('emper').width, wAll = ctx.measureText('emperor').width;
  ctx.restore();
  const x0 = alignX - wEmper / 2;
  around(ctx, x0 + wAll / 2, y, p, p, () => {
    txt(ctx, 'emper', x0, y, { size: 150, font: EN, align: 'left', color: C.gold, stroke: C.ink, sw: 16, shadow: 'rgba(10,0,40,0.5)' });
    txt(ctx, 'or', x0 + wEmper, y, { size: 150, font: EN, align: 'left', color: C.white, stroke: C.ink, sw: 16, shadow: 'rgba(10,0,40,0.5)' });
  });
  const tg = pop(t, T_EMP + 0.25, 0.5);
  around(ctx, x0 + wAll + 130, y, tg, tg, () => {
    card(ctx, x0 + wAll + 40, y - 52, 180, 104, { fill: C.pink, r: 52, drop: 8 });
    txt(ctx, '皇帝', x0 + wAll + 130, y + 2, { size: 58, color: C.white, stroke: C.ink, sw: 8 });
  });
  // "≈" link between the two words
  const lk = fadeIn(t, T_EMP + 0.15, 0.4);
  around(ctx, alignX, 540, lk, lk, () => txt(ctx, '≈', alignX, 548, { size: 110, font: EN, color: C.mint, stroke: C.ink, sw: 10 }));
  const ep = pop(t, T_EMP + 0.1, 0.6);
  around(ctx, 1690, 900, ep, ep, () => emperor(ctx, t, 1690, 900, 0.72, { wave: 1 }));
  burst(ctx, t, T_EMP + 0.1, 1690, 640, { r: 240 });
}

function scribbleEllipse(ctx, cx, cy, rx, ry, p, t) {
  ctx.save();
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const turns = 1.15, steps = 90;
  for (let i = 0; i <= steps * p; i++) {
    const u = i / steps;
    const a = -Math.PI * 0.75 + u * turns * Math.PI * 2;
    const wob = 1 + 0.04 * Math.sin(u * 23) + 0.05 * u;
    const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  void t;
}

// Syllable pulse while "Imperative" is spoken the second time (and the first time, gently).
function say2Pulse(t) {
  const out = [0, 0, 0, 0];
  const w = SEG.say2.words[0];
  const p = prog(t, w.start, w.end);
  if (p <= 0 || p >= 1) return out;
  const cuts = [0, 0.18, 0.52, 0.66, 1];
  for (let g = 0; g < 4; g++) {
    const q = prog(p, cuts[g], cuts[g + 1]);
    if (q > 0 && q < 1) out[g] = Math.sin(Math.PI * q) * (g === 1 ? 0.22 : 0.08);
  }
  return out;
}

// ---------- scene 2: the family ----------
const KIDS = [
  ['imperative', '必须的', C.gold],
  ['emperor', '皇帝', C.pink],
  ['empire', '帝国', C.sky],
];

function familyScene(ctx, t) {
  const t0 = S('family');
  const tFam = at('family', '一家人'), tLat = at('family', '拉丁语'), tOrd = at('family', '下令');
  // emperor on the left
  const ep = pop(t, t0 - 0.25, 0.5);
  const point = easeOut(prog(t, tOrd - 0.25, tOrd + 0.1));
  around(ctx, 420, 900, ep, ep, () =>
    emperor(ctx, t, 420, 900, 1.05, { wave: t < tFam ? 1 : 0, point, mood: point > 0.5 ? 'stern' : 'happy' }));

  // children
  KIDS.forEach(([en, zh, col], i) => {
    const x = 1010 + i * 300, y = 680;
    const p = pop(t, tFam + i * 0.14, 0.45);
    around(ctx, x, y, p, p, () => {
      card(ctx, x - 135, y - 85, 270, 170, { fill: C.cream, r: 30 });
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(x - 135, y - 85, 270, 22, [30, 30, 0, 0]); ctx.fill();
      txt(ctx, en, x, y - 10, { size: en.length > 8 ? 42 : 50, font: EN, color: C.ink });
      txt(ctx, zh, x, y + 48, { size: 40, color: '#7a5bd6' });
    });
    const ap = easeOut(prog(t, tLat + 0.25 + i * 0.1, tLat + 0.7 + i * 0.1));
    arrow(ctx, 1310, 375, x, y - 100, { color: C.gold, w: 9, head: 28, p: ap });
  });
  // the Latin root
  const rp = pop(t, tLat - 0.1, 0.5);
  around(ctx, 1310, 290, rp, rp, () => {
    card(ctx, 1310 - 330, 200, 660, 175, { fill: C.gold, r: 40, edge: C.ink });
    card(ctx, 1310 - 310, 168, 150, 58, { fill: C.ink, r: 29, ew: 0, drop: 0 });
    txt(ctx, '拉丁语', 1310 - 235, 198, { size: 32, color: C.gold });
    const ord = easeOut(prog(t, tOrd - 0.1, tOrd + 0.3));
    txt(ctx, 'imperāre', 1310 - 140 * ord, 290, { size: 84, font: EN, color: C.ink });
    if (ord > 0) {
      around(ctx, 1450, 290, pop(t, tOrd - 0.1, 0.5), ord, () => {
        txt(ctx, '= 下令！', 1350, 292, { size: 66, color: '#d7263d', align: 'left' });
      });
    }
  });
  burst(ctx, t, tOrd, 1530, 290, { r: 200, n: 10 });
  // command shock lines from the pointing finger
  if (point > 0.6) {
    for (let k = 0; k < 3; k++) {
      const a = -0.55 + k * 0.28, r0 = 70 + ((t * 300 + k * 30) % 60);
      ctx.save();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.globalAlpha *= 0.9;
      const ox = 420 + 1.05 * 160, oy = 900 - 1.05 * 225;
      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0);
      ctx.lineTo(ox + Math.cos(a) * (r0 + 40), oy + Math.sin(a) * (r0 + 40));
      ctx.stroke();
      ctx.restore();
    }
  }
  void clamp; void ZH;
}

export const scenesA = [
  { id: 'word', from: 0, to: S('family') - 0.35, draw: wordScene },
  { id: 'family', from: S('family') - 0.35, to: S('cmdLead') - 0.3, draw: familyScene },
];

// Sound effects (and screen shakes) tied to the same moments as the visuals above.
export const eventsA = [
  { type: 'whoosh', t: 0.1, d: 0.5 },
  { type: 'boing', t: at('hook', '偷偷') },
  { type: 'sparkle', t: at('hook', '皇帝') },
  { type: 'whoosh', t: T_DROP - 0.1, d: 0.35, from: 2500, to: 600 },
  ...[...WORD].map((_, i) => ({ type: 'note', t: T_DROP + i * 0.055 + 0.3, n: [72, 74, 76, 77, 79, 81, 83, 84, 86, 88][i], amp: 0.6 })),
  { type: 'ding', t: T_DROP + 0.65, n: 91 },
  { type: 'whoosh', t: T_STRESS, d: 0.5 },
  { type: 'pop', t: at('stress', '重音'), f: 900 },
  { type: 'tick', t: at('stress', '第二个'), n: 84 },
  { type: 'boing', t: SEG.say2.words[0].start + 0.12, amp: 0.7 },
  { type: 'scribble', t: at('reveal', '圈') - 0.35, d: word('reveal', '圈出来').end + 0.5 - at('reveal', '圈') },
  { type: 'pop', t: at('reveal', '像不像'), f: 1100 },
  { type: 'sparkle', t: T_EMP },
  { type: 'pop', t: T_EMP + 0.25, f: 800 },
  { type: 'whoosh', t: S('family') - 0.4, d: 0.45 },
  ...KIDS.map((_, i) => ({ type: 'pop', t: at('family', '一家人') + i * 0.14, f: 600 + i * 150 })),
  { type: 'pop', t: at('family', '拉丁语') - 0.1, f: 500 },
  { type: 'stamp', t: at('family', '下令'), shake: 10 },
  { type: 'sparkle', t: at('family', '下令') + 0.1, amp: 0.7 },
];
