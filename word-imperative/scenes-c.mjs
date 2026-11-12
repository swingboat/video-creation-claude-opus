// Scenes 7–10: the noun, the im- trap, the recap, and the confetti finale.
import {
  W, C, EN, ZH, S, SEG, DURATION, at, word, prog, lerp, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, star, crown, emperor, talkLevel, confetti, measure, LETTER_COLORS,
} from './lib.mjs';
import { bubble, check, exampleCard } from './scenes-b.mjs';

function heart(ctx, x, y, s, color = C.pink) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-70, -20, -40, -70, 0, -38);
  ctx.bezierCurveTo(40, -70, 70, -20, 0, 30);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- scene 7: the noun ----------
function nounScene(ctx, t) {
  const tEx = S('exNoun');
  const out = prog(t, tEx - 0.7, tEx - 0.35);
  const p1 = pop(t, S('noun') - 0.2, 0.5);
  around(ctx, W / 2, 400, p1 * (1 - 0.3 * out), p1 * (1 - out), () => {
    const wa = measure(ctx, 'an', 110, EN), wi = measure(ctx, 'imperative', 140, EN), gap = 36;
    const x0 = W / 2 - (wa + gap + wi) / 2;
    txt(ctx, 'an', x0, 368, { size: 110, font: EN, align: 'left', color: C.lilac, stroke: C.ink, sw: 12 });
    txt(ctx, 'imperative', x0 + wa + gap, 360, { size: 140, font: EN, align: 'left', color: C.white, stroke: C.ink, sw: 16, shadow: 'rgba(10,0,40,0.5)' });
    const np = pop(t, at('noun', '名词') - 0.05, 0.4);
    around(ctx, x0 + wa / 2, 230, np, np, () => {
      card(ctx, x0 + wa / 2 - 100, 190, 200, 80, { fill: C.sky, r: 40, drop: 6 });
      txt(ctx, 'n. 名词', x0 + wa / 2, 231, { size: 42, color: C.ink });
    });
    const mp = pop(t, at('noun', '一件') - 0.05, 0.45);
    around(ctx, W / 2, 530, mp, mp, () => {
      txt(ctx, '= 一件必须做的事', W / 2, 530, { size: 84, color: C.gold, stroke: C.ink, sw: 12 });
    });
    const ck = pop(t, at('noun', '事'), 0.4);
    around(ctx, W / 2 + 420, 530, ck, ck, () => check(ctx, W / 2 + 420, 530, 1.8, C.mint));
  });
  if (t > tEx - 0.6) {
    exampleCard(ctx, t, 'exNoun', [2, 3, 4], 'n. 名词 · 道义上必须做的事', C.sky);
    const hp = pop(t, word('exNoun', 'moral').start, 0.5);
    const beat = 1 + 0.08 * Math.max(0, Math.sin(t * 9));
    around(ctx, W / 2, 720, hp, hp, () => {
      heart(ctx, W / 2 - 160, 725, 1.25 * beat);
      txt(ctx, '诚实 = 必须做到', W / 2 + 80, 715, { size: 54, color: C.white, align: 'center' });
    });
  }
}

// ---------- scene 8: the im- trap ----------
function trapScene(ctx, t) {
  const t0 = S('trap');
  const tIM = at('trap', 'I M'), tNot = at('trap', '不是'), tBu = at('trap', '“不”');
  const tUn = at('trap', '不重要'), tSuper = at('trap', '超级');
  // warning sign
  const wp = pop(t, t0 - 0.2, 0.4);
  const wob = Math.sin(t * 30) * 0.12 * (1 - prog(t, t0, t0 + 0.9));
  around(ctx, W / 2, 175, wp, wp, () => {
    ctx.save();
    ctx.translate(W / 2, 175); ctx.rotate(wob);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -85); ctx.lineTo(90, 70); ctx.lineTo(-90, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    txt(ctx, '!', W / 2, 192, { size: 110, font: EN, color: C.ink });
  });
  // im + perative
  const ip = pop(t, tIM - 0.1, 0.45);
  around(ctx, 560, 440, ip, ip, () => {
    const wIm = measure(ctx, 'im', 200, EN);
    txt(ctx, 'im', 560 - wIm / 2, 440, { size: 200, font: EN, align: 'left', color: C.gold, stroke: C.ink, sw: 18, shadow: 'rgba(10,0,40,0.5)' });
    txt(ctx, 'perative', 560 + wIm / 2 + 8, 458, { size: 80, font: EN, align: 'left', color: 'rgba(255,255,255,0.35)' });
  });
  const ne = pop(t, tNot - 0.05, 0.4);
  around(ctx, 1180, 440, ne, ne, () => txt(ctx, '≠', 1180, 450, { size: 170, font: EN, color: C.pink, stroke: C.ink, sw: 12 }));
  const bu = pop(t, tBu - 0.05, 0.45);
  around(ctx, 1450, 440, bu, bu, () => {
    ctx.save();
    ctx.fillStyle = C.cream; ctx.strokeStyle = C.red; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(1450, 440, 120, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    txt(ctx, '不', 1450, 446, { size: 150, color: C.ink });
    const sl = easeOut(prog(t, tBu + 0.2, tBu + 0.45));
    ctx.save();
    ctx.strokeStyle = C.red; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1365, 355); ctx.lineTo(lerp(1365, 1535, sl), lerp(355, 525, sl)); ctx.stroke();
    ctx.restore();
  });
  // 不重要 → 超级重要！
  const up = pop(t, tUn - 0.1, 0.4);
  around(ctx, 620, 760, up, up * (1 - 0.45 * prog(t, tSuper - 0.2, tSuper)), () => {
    txt(ctx, '不重要', 620, 760, { size: 96, color: '#cfc4f2' });
    const x = easeOut(prog(t, tUn + 0.35, tUn + 0.6));
    ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(470, 700); ctx.lineTo(lerp(470, 770, x), lerp(700, 820, x)); ctx.stroke();
    if (x >= 1) { ctx.beginPath(); ctx.moveTo(770, 700); ctx.lineTo(470, 820); ctx.stroke(); }
    ctx.restore();
  });
  arrow(ctx, 850, 760, 1010, 760, { color: C.mint, w: 12, head: 34, p: easeOut(prog(t, tSuper - 0.25, tSuper + 0.05)) });
  const sp = pop(t, tSuper, 0.5);
  around(ctx, 1360, 760, sp, sp, () => {
    txt(ctx, '超级重要！', 1360, 760, { size: 120, color: C.gold, stroke: C.ink, sw: 14, shadow: 'rgba(10,0,40,0.5)' });
    for (let i = 0; i < 4; i++) star(ctx, 1360 + Math.cos(t * 2 + i * 1.57) * 330, 760 + Math.sin(t * 2 + i * 1.57) * 90, 22, [C.pink, C.sky, C.mint, C.gold][i], t * 3);
  });
  burst(ctx, t, tSuper + 0.1, 1360, 760, { r: 360, n: 14 });
}

// ---------- scene 9: recap ----------
function recapScene(ctx, t) {
  const t0 = S('recap');
  const tG = at('recap', '语法里'), tL = at('recap', '生活里');
  const hp = pop(t, t0 - 0.2, 0.5);
  around(ctx, W / 2, 190, hp, hp, () => {
    txt(ctx, 'imperative', W / 2, 190, { size: 120, font: EN, color: C.white, stroke: C.ink, sw: 14, shadow: 'rgba(10,0,40,0.5)' });
    const wi = measure(ctx, 'imperative', 120, EN);
    const bounce = Math.abs(Math.sin(t * 4)) * 14 * (t < tG ? 1 : 0.4);
    crown(ctx, W / 2 - wi / 2 + 10, 90 - bounce, 0.6, -0.3);
  });
  burst(ctx, t, at('recap', '皇帝'), W / 2 - 280, 100, { r: 160, n: 8 });
  const panel = (x, p, head, headCol, label, inner) => around(ctx, x + 320, 560, p, p, () => {
    card(ctx, x, 320, 640, 520, { fill: 'rgba(255,255,255,0.1)', edge: 'rgba(255,255,255,0.35)', ew: 4, drop: 0, r: 40 });
    card(ctx, x + 200, 290, 240, 76, { fill: headCol, r: 38, drop: 6 });
    txt(ctx, head, x + 320, 329, { size: 44, color: C.ink });
    inner(x);
    txt(ctx, label, x + 320, 770, { size: 76, color: C.white, stroke: C.ink, sw: 10 });
  });
  panel(250, pop(t, tG - 0.1, 0.5), '语法里', C.sky, '请你去做', (x) => {
    bubble(ctx, x + 70, 420, 500, 140, x + 100, 640);
    txt(ctx, 'Close the door!', x + 320, 490, { size: 58, font: EN, color: C.ink });
    txt(ctx, '祈使句', x + 400, 640, { size: 46, color: C.sky });
  });
  panel(1030, pop(t, tL - 0.1, 0.5), '生活里', C.gold, '必须去做', (x) => {
    ctx.fillStyle = '#fbe7c0';
    ctx.fillRect(x + 150, 410, 340, 240);
    ctx.fillStyle = '#e7c58c';
    for (const yy of [410, 650]) { ctx.beginPath(); ctx.roundRect(x + 135, yy - 14, 370, 28, 14); ctx.fill(); }
    txt(ctx, 'MUST DO', x + 320, 470, { size: 50, font: EN, color: '#c81d4e' });
    const sp = prog(t, tL + 0.45, tL + 0.6);
    if (sp > 0) around(ctx, x + 320, 575, lerp(2.2, 1, sp), sp, () => {
      ctx.save(); ctx.translate(x + 320, 575); ctx.rotate(-0.18);
      ctx.strokeStyle = '#e0243f'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.roundRect(-110, -50, 220, 100, 18); ctx.stroke();
      ctx.restore();
      txt(ctx, '必须！', x + 320, 577, { size: 58, color: '#e0243f' });
    }, -0.18);
  });
}

// ---------- scene 10: finale ----------
const MEANINGS = [['祈使的', '语法', C.sky], ['必须的', 'adj.', C.gold], ['必须做的事', 'n.', C.pink]];

function outroScene(ctx, t) {
  const w0 = SEG.outro.words[0];
  const size = 170;
  const total = measure(ctx, 'imperative', size, EN);
  let x = W / 2 - 150 - total / 2;
  for (let i = 0; i < 10; i++) {
    const ch = 'imperative'[i];
    const cw = measure(ctx, ch, size, EN);
    const p = pop(t, w0.start - 0.35 + i * 0.05, 0.45);
    const jump = Math.max(0, Math.sin((t - w0.end) * 6 - i * 0.6)) * 26 * (t > w0.end ? 1 : 0);
    around(ctx, x + cw / 2, 330, p, p, () =>
      txt(ctx, ch, x + cw / 2, 330 - jump, { size, font: EN, color: LETTER_COLORS[i], stroke: C.ink, sw: 18, shadow: 'rgba(10,0,40,0.5)' }));
    if (i === 0) crown(ctx, x + cw / 2, 330 - 150 - jump - 20 * (1 - p), 0.7 * p, -0.3);
    x += cw;
  }
  const sp = prog(t, w0.end - 0.15, w0.end + 0.05);
  if (sp > 0) around(ctx, W / 2 - 150, 545, lerp(2.4, 1, easeOut(sp)), sp, () => {
    ctx.save(); ctx.translate(W / 2 - 150, 545); ctx.rotate(-0.08);
    ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.roundRect(-230, -72, 460, 144, 24); ctx.stroke();
    ctx.restore();
    txt(ctx, '必须做！', W / 2 - 150, 548, { size: 100, color: '#ff3355', stroke: C.cream, sw: 8 });
  }, -0.08);
  MEANINGS.forEach(([zh, tag, col], i) => {
    const cx = W / 2 - 150 + (i - 1) * 330;
    const p = pop(t, w0.end + 0.5 + i * 0.15, 0.4);
    around(ctx, cx, 760, p, p, () => {
      card(ctx, cx - 150, 712, 300, 96, { fill: col, r: 48, drop: 8 });
      txt(ctx, zh, cx + 20, 761, { size: 42, color: C.ink });
      txt(ctx, tag, cx - 110, 761, { size: 28, font: EN, color: 'rgba(43,26,85,0.7)' });
    });
  });
  const ep = pop(t, S('outro') - 0.3, 0.5);
  around(ctx, 1600, 920, ep, ep, () =>
    emperor(ctx, t, 1600, 920, 1.0, { talk: talkLevel(t, ['outro']), wave: t > w0.end ? 1 : 0, point: t <= w0.end ? 1 : 0 }));
  confetti(ctx, t, w0.end);
}

export const scenesC = [
  { id: 'noun', from: S('noun') - 0.3, to: S('trap') - 0.4, draw: nounScene },
  { id: 'trap', from: S('trap') - 0.4, to: S('recap') - 0.35, draw: trapScene },
  { id: 'recap', from: S('recap') - 0.35, to: S('outro') - 0.35, draw: recapScene },
  { id: 'outro', from: S('outro') - 0.35, to: DURATION + 1, draw: outroScene },
];

export const eventsC = [
  { type: 'whoosh', t: S('noun') - 0.35, d: 0.45 },
  { type: 'pop', t: at('noun', '名词') - 0.05, f: 800 },
  { type: 'pop', t: at('noun', '一件') - 0.05, f: 600 },
  { type: 'ding', t: at('noun', '事'), n: 88 },
  { type: 'whoosh', t: S('exNoun') - 0.6, d: 0.4 },
  { type: 'pop', t: word('exNoun', 'moral').start, f: 1000 },
  { type: 'whoosh', t: S('trap') - 0.45, d: 0.4 },
  { type: 'alarm', t: S('trap') - 0.1 },
  { type: 'pop', t: at('trap', 'I M') - 0.1, f: 700 },
  { type: 'pop', t: at('trap', '不是') - 0.05, f: 900 },
  { type: 'buzz', t: at('trap', '“不”') + 0.2 },
  { type: 'buzz', t: at('trap', '不重要') + 0.35 },
  { type: 'tada', t: at('trap', '超级') },
  { type: 'whoosh', t: S('recap') - 0.4, d: 0.45 },
  { type: 'sparkle', t: at('recap', '皇帝'), amp: 0.6 },
  { type: 'pop', t: at('recap', '语法里') - 0.1, f: 700 },
  { type: 'pop', t: at('recap', '生活里') - 0.1, f: 900 },
  { type: 'stamp', t: at('recap', '生活里') + 0.55, shake: 8 },
  { type: 'whoosh', t: S('outro') - 0.4, d: 0.45 },
  ...[...Array(10)].map((_, i) => ({ type: 'note', t: SEG.outro.words[0].start - 0.2 + i * 0.05, n: [72, 74, 76, 77, 79, 81, 83, 84, 86, 88][i], amp: 0.5 })),
  { type: 'stamp', t: SEG.outro.words[0].end + 0.05, shake: 14 },
  { type: 'confetti', t: SEG.outro.words[0].end },
  { type: 'tada', t: SEG.outro.words[0].end + 0.1 },
];
void ZH; void fadeIn;
