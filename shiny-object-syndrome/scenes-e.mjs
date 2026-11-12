// Scene group E: a bounded small trial with a checkpoint, then the payoff — well A finally strikes water.
import { W, C, S, E, at, prog, lerp, clamp, easeOut, pop, txt, card, around, arrow, burst, confetti, sayBubble, talkLevel, DURATION } from './lib.mjs';
import { aliang, shiny } from './people.mjs';
import { icons } from './icons.mjs';
import { GY, field, well, clods, sign, splash } from './world.mjs';

// ---------- small trial + checkpoint ----------
const T_BOX = at('trial', '小') - 0.2, T_BUDGET = at('trial', '预算') - 0.3, T_ONE = at('trial', '验证') - 0.3;
const T_FLAG = at('trial', '检查点') - 0.3, T_GO = at('trial', '继续') - 0.3, T_TURN = at('trial', '改向') - 0.3;

function pill(ctx, x, y, w, color, a, b, p) {
  around(ctx, x, y, p, clamp(p * 2), () => {
    card(ctx, x - w / 2, y - 62, w, 124, { fill: color, edge: C.white, ew: 6, r: 62 });
    txt(ctx, a, x, y - 18, { size: 50, color: C.white });
    txt(ctx, b, x, y + 34, { size: 32, color: 'rgba(255,255,255,0.92)' });
  });
}

function trialScene(ctx, t) {
  const h = pop(t, S('trial') - 0.1, 0.45);
  around(ctx, W / 2, 180, h, h, () => txt(ctx, '真想试试？做个小试验', W / 2, 180, { size: 64, color: C.navy, stroke: C.white, sw: 10 }));
  // the trial box
  const b = pop(t, T_BOX, 0.45);
  around(ctx, 450, 560, b, clamp(b * 2), () => {
    card(ctx, 140, 290, 620, 540, { fill: C.cream });
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.roundRect(140, 290, 620, 96, [32, 32, 0, 0]); ctx.fill();
    txt(ctx, '小试验', 450, 340, { size: 52, color: C.white });
    const q1 = easeOut(prog(t, T_BUDGET, T_BUDGET + 0.4));
    ctx.save(); ctx.globalAlpha *= q1;
    icons.hourglass(ctx, 260, 490, 0.9, clamp(prog(t, T_BUDGET, T_FLAG)));
    txt(ctx, '定好时间预算', 340, 465, { size: 42, color: C.ink, align: 'left' });
    txt(ctx, '比如：只花 1 个单位', 340, 520, { size: 32, color: '#6b6f80', align: 'left' });
    ctx.restore();
    const q2 = easeOut(prog(t, T_ONE, T_ONE + 0.4));
    ctx.save(); ctx.globalAlpha *= q2;
    icons.lens(ctx, 260, 690, 0.9);
    txt(ctx, '只验证一个问题', 340, 665, { size: 42, color: C.ink, align: 'left' });
    txt(ctx, '“那块地真的更软吗？”', 340, 720, { size: 32, color: '#6b6f80', align: 'left' });
    ctx.restore();
  });
  // to the checkpoint
  arrow(ctx, 790, 560, 960, 560, { color: C.navy, w: 12, head: 34, p: easeOut(prog(t, T_FLAG - 0.3, T_FLAG + 0.1)) });
  const f = pop(t, T_FLAG, 0.45);
  around(ctx, 1060, 560, f, f, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(1060, 545, 100, 0, Math.PI * 2); ctx.fill();
    icons.flag(ctx, 1070, 540, 1.1);
    txt(ctx, '检查点', 1060, 690, { size: 44, color: C.ink, stroke: C.white, sw: 8 });
  });
  arrow(ctx, 1160, 500, 1350, 390, { color: C.mint, w: 12, head: 34, p: easeOut(prog(t, T_GO - 0.2, T_GO + 0.2)) });
  arrow(ctx, 1160, 620, 1350, 730, { color: C.sky, w: 12, head: 34, p: easeOut(prog(t, T_TURN - 0.2, T_TURN + 0.2)) });
  pill(ctx, 1590, 360, 420, '#22b07d', '继续', '方法有效，接着挖', pop(t, T_GO, 0.45));
  pill(ctx, 1590, 760, 420, '#2f8fd6', '改向', '有证据，写清理由', pop(t, T_TURN, 0.45));
}

// ---------- finale ----------
const WX = 560, HX = 430;
const T_IN = E('trial') + 0.45, T_HIT = S('water') - 0.08;
const T_L1 = at('outro', '好奇心') - 0.2, T_L2 = at('outro', '主线') - 0.2, T_L3 = at('outro', '好想法') - 0.2;
const T_END = E('outro') + 0.1;

function finaleScene(ctx, t) {
  field(ctx, t);
  const d = lerp(3, 4, clamp(prog(t, T_IN, T_HIT)));
  const wet = easeOut(prog(t, T_HIT, T_HIT + 0.9));
  well(ctx, t, WX, d, { water: wet });
  sign(ctx, WX + 210, 'A', 1);
  splash(ctx, t, T_HIT, WX);
  burst(ctx, t, T_HIT + 0.1, WX, GY - 120, { r: 260, n: 14, colors: [C.water, C.sky, C.white, C.gold] });
  // parked gem waits politely
  ctx.save();
  ctx.strokeStyle = C.white; ctx.lineWidth = 6; ctx.setLineDash([18, 12]);
  ctx.strokeRect(840, GY - 160, 160, 150);
  ctx.restore();
  ctx.fillStyle = '#7d8597'; ctx.fillRect(1000, GY - 260, 10, 250);
  ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.roundRect(960, GY - 320, 90, 90, 16); ctx.fill();
  txt(ctx, 'P', 1005, GY - 273, { size: 66, font: 'RoundB', color: C.white });
  const hopUp = Math.abs(Math.sin(clamp(prog(t, T_L3, T_L3 + 1.2)) * Math.PI * 2)) * 50;
  shiny(ctx, t, 920, GY - 90 - hopUp, 0.45, { glow: 0.7, wave: t > T_L3 ? 1 : 0, mood: t > T_L3 ? 'wink' : 'happy' });
  // 阿亮 digs the last cell and celebrates
  const digging = t < T_HIT;
  aliang(ctx, t, HX, GY, 0.8, {
    pose: digging ? 'dig' : 'cheer', mood: digging ? 'happy' : 'joy', talk: talkLevel(t, ['water']), digSpeed: 1.8,
  });
  if (digging) clods(ctx, WX, (t * 1.8) % 1);
  sayBubble(ctx, t, 'water', HX + 140, 110, HX + 30, GY - 400, { size: 56, hold: 1.0 });
  // closing lines
  const lines = [['好奇心可以留着', T_L1, C.gold, 'sparkle'], ['主线别弄丢', T_L2, C.orange, 'target']];
  lines.forEach(([s, t0, color, icon], i) => {
    const p = pop(t, t0, 0.45), y = 230 + i * 120, x = 1430;
    around(ctx, x, y, p, clamp(p * 2), () => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x - 280, y - 46, 560, 92, 46); ctx.fill();
      if (icon === 'sparkle') shiny(ctx, t, x - 220, y - 8, 0.32, { glow: 0 });
      else icons.target(ctx, x - 220, y, 0.55);
      txt(ctx, s, x + 30, y + 2, { size: 50, color: C.white });
    });
  });
  const big = pop(t, T_L3, 0.5);
  around(ctx, 1430, 480, big, clamp(big * 2), () => {
    card(ctx, 1030, 420, 800, 120, { fill: C.navy, edge: C.gold, ew: 6, r: 60 });
    txt(ctx, '好想法，可以晚一点开始', 1430, 482, { size: 56, color: C.gold });
  });
  confetti(ctx, t, T_END);
}

export const scenesE = [
  { id: 'trial', from: S('trial') - 0.35, to: T_IN - 0.35, draw: trialScene },
  { id: 'finale', from: T_IN - 0.35, to: DURATION + 1, draw: finaleScene },
];

const finalDigs = [];
for (let k = Math.ceil(T_IN * 1.8 - 0.45); (k + 0.45) / 1.8 < T_HIT; k++) finalDigs.push({ type: 'dig', t: (k + 0.45) / 1.8, amp: 0.8 });

export const eventsE = [
  { type: 'whoosh', t: S('trial') - 0.4, d: 0.45 },
  { type: 'pop', t: T_BOX, f: 700 },
  { type: 'tick', t: T_BUDGET, n: 79 },
  { type: 'tick', t: T_ONE, n: 83 },
  { type: 'whoosh', t: T_FLAG - 0.3, d: 0.35, amp: 0.6 },
  { type: 'ding', t: T_FLAG + 0.1, n: 86 },
  { type: 'pop', t: T_GO, f: 900 },
  { type: 'pop', t: T_TURN, f: 750 },
  { type: 'whoosh', t: T_IN - 0.4, d: 0.45 },
  ...finalDigs,
  { type: 'splash', t: T_HIT, shake: 10 },
  { type: 'tada', t: T_HIT + 0.15 },
  { type: 'pop', t: T_L1, f: 800 },
  { type: 'pop', t: T_L2, f: 950 },
  { type: 'sparkle', t: T_L3 },
  { type: 'boing', t: T_L3 + 0.2, amp: 0.6 },
  { type: 'confetti', t: T_END },
  { type: 'tada', t: T_END + 0.1, amp: 0.8 },
];
