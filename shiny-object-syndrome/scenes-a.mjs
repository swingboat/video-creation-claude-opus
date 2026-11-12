// Scene group A (story): 阿亮 digs well A, 闪闪 lures him to B, then C, leaving three half-dug holes.
import { W, C, S, E, at, prog, lerp, clamp, easeIO, easeOut, pop, txt, around, burst, sayBubble, talkLevel } from './lib.mjs';
import { aliang, shiny } from './people.mjs';
import { GY, CELL, WATER, field, well, clods, sign, poof } from './world.mjs';

export const AX = 380, BX = 960, CX = 1540;
const OFF = -130, SC = 0.8, SPEED = 1.6;
const digU = (t) => (t * SPEED) % 1;

const T_DIG_A = at('meet', '开始挖');
const T_STOP_A = S('tempt1') + 0.1;
const T_WALK1 = E('swap1') + 0.05, T_ARR_B = T_WALK1 + 0.9;
const T_HARD = at('again', '硬');
const T_GEM2 = at('again', '亮闪闪');
const T_WALK2 = E('swap2') + 0.05, T_ARR_C = T_WALK2 + 0.8;
const T_STOP_C = at('result', '三个');
const T_DRY = at('result', '一滴水');

const depthA = (t) => 2 * easeIO(prog(t, T_DIG_A + 0.3, T_STOP_A - 0.2));
const depthB = (t) => 2 * easeIO(prog(t, T_ARR_B + 0.2, T_HARD));
const depthC = (t) => 1.5 * easeIO(prog(t, T_ARR_C + 0.2, T_STOP_C));

function heroX(t) {
  if (t < T_WALK1) return lerp(-160, AX + OFF, easeOut(prog(t, 0.1, 1.5)));
  if (t < T_WALK2) return lerp(AX, BX, easeIO(prog(t, T_WALK1, T_ARR_B))) + OFF;
  return lerp(BX, CX, easeIO(prog(t, T_WALK2, T_ARR_C))) + OFF;
}

function heroState(t) {
  const walking = (t > 0.1 && t < 1.5) || (t > T_WALK1 && t < T_ARR_B) || (t > T_WALK2 && t < T_ARR_C);
  const digging = (t > T_DIG_A && t < T_STOP_A) || (t > T_ARR_B + 0.1 && t < T_HARD) || (t > T_ARR_C + 0.1 && t < T_STOP_C);
  let mood = 'happy', look = 0;
  if (t > at('tempt1', '一挖') && t < T_WALK1 + 0.3) [mood, look] = ['excited', 1];
  else if (t > T_HARD && t < T_GEM2) mood = 'tired';
  else if (t > T_GEM2 && t < T_WALK2 + 0.3) [mood, look] = [t > S('tempt2') + 0.6 ? 'excited' : 'shock', 1];
  else if (t > T_DRY - 0.3) mood = 'tired';
  else if (t > S('tempt1') - 0.2 && t < T_WALK1) [mood, look] = ['shock', 1];
  let pose = 'stand';
  if (digging) pose = 'dig';
  else if (t < T_DIG_A) pose = 'carry';
  else if (t > T_DRY) pose = 'shrug';
  return { pose, mood, look, walk: walking ? t * 1.8 : null, talk: talkLevel(t, ['intro', 'swap1', 'swap2']) };
}

function gem(t, t0, tGone, x) {
  if (t < t0 - 0.1 || t > tGone + 0.6) return null;
  const sc = pop(t, t0, 0.5) * (1 - easeIO(prog(t, tGone - 0.05, tGone + 0.2)));
  return { x, sc };
}

function storyScene(ctx, t) {
  const glow = easeOut(prog(t, T_STOP_C, T_STOP_C + 0.6));
  field(ctx, t, { waterGlow: glow });
  // wells + signs
  const wells = [[AX, depthA(t), 'A', T_DIG_A], [BX, depthB(t), 'B', T_ARR_B], [CX, depthC(t), 'C', T_ARR_C]];
  for (const [x, d, label, t0] of wells) {
    well(ctx, t, x, d, { rock: x === BX ? pop(t, T_HARD, 0.35) : 0 });
    sign(ctx, x + 210, label, pop(t, t0, 0.4));
  }
  burst(ctx, t, T_HARD, BX + 10, GY + 2 * CELL - 20, { r: 120, n: 8, size: 18, colors: [C.white, C.gold] });
  // result: how far each hole still is from the water
  if (glow > 0) {
    for (const [x, d] of wells) {
      const top = GY + d * CELL + 8;
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.strokeStyle = C.white; ctx.lineWidth = 6; ctx.setLineDash([12, 12]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, lerp(top, WATER - 6, glow)); ctx.stroke();
      ctx.restore();
      around(ctx, x - 120, (top + WATER) / 2, pop(t, T_STOP_C + 0.2, 0.4), glow, () => {
        ctx.fillStyle = 'rgba(29,43,83,0.85)';
        ctx.beginPath(); ctx.roundRect(x - 215, (top + WATER) / 2 - 30, 160, 60, 30); ctx.fill();
        txt(ctx, `还差${4 - d}格`, x - 135, (top + WATER) / 2 + 1, { size: 32, color: C.gold });
      });
    }
    around(ctx, W / 2, WATER + 36, glow, glow, () => txt(ctx, '水层', W / 2 + 330, WATER + 36, { size: 36, color: C.white, stroke: '#1b6fa8', sw: 8 }));
  }
  // clods while digging
  const st = heroState(t), hx = heroX(t);
  if (st.pose === 'dig') clods(ctx, hx - OFF, digU(t));
  // gems
  for (const g of [gem(t, S('tempt1') - 0.25, T_ARR_B, BX), gem(t, T_GEM2, T_ARR_C, CX)]) {
    if (!g || g.sc <= 0.01) continue;
    shiny(ctx, t, g.x, 360, 0.75 * g.sc, { talk: talkLevel(t, ['tempt1', 'tempt2']), wave: 1, mood: t > S('tempt2') ? 'wink' : 'happy' });
  }
  burst(ctx, t, S('tempt1') - 0.15, BX, 360, { r: 200, n: 12 });
  burst(ctx, t, T_GEM2, CX, 360, { r: 200, n: 12 });
  poof(ctx, t, T_ARR_B - 0.05, BX, 360);
  poof(ctx, t, T_ARR_C - 0.05, CX, 360);
  aliang(ctx, t, hx, GY, SC, { ...st, digSpeed: SPEED });
  // name tag
  const tagA = pop(t, at('meet', '阿亮') - 0.1, 0.4) * (1 - prog(t, at('meet', '扛起') + 0.6, at('meet', '扛起') + 0.9));
  around(ctx, hx - 170, GY - 330, tagA, tagA, () => {
    ctx.fillStyle = C.orange;
    ctx.beginPath(); ctx.roundRect(hx - 245, GY - 362, 150, 64, 32); ctx.fill();
    txt(ctx, '阿亮', hx - 170, GY - 329, { size: 40, color: C.white });
  });
  // speech bubbles
  const head = GY - 390;
  sayBubble(ctx, t, 'intro', hx + 160, 96, hx + 30, head);
  sayBubble(ctx, t, 'swap1', hx + 200, 96, hx + 40, head, { hold: 0.2 });
  sayBubble(ctx, t, 'swap2', hx + 200, 96, hx + 40, head, { hold: 0.2 });
  sayBubble(ctx, t, 'tempt1', BX + 120, 96, BX + 10, 280, { fill: '#e6f8ff' });
  sayBubble(ctx, t, 'tempt2', CX - 60, 96, CX, 280, { fill: '#e6f8ff' });
  // "0 drops" stamp
  const sp = pop(t, T_DRY + 0.15, 0.35);
  if (sp > 0) {
    around(ctx, W / 2 - 130, 300, lerp(2.2, 1, clamp(sp)), clamp(sp * 2), () => {
      ctx.strokeStyle = C.red; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.roundRect(W / 2 - 330, 230, 400, 140, 26); ctx.stroke();
      txt(ctx, '0 滴水', W / 2 - 130, 302, { size: 84, color: C.red });
    }, -0.12);
  }
}

// dig thuds land on the downstroke of each cycle
function thuds(t0, t1) {
  const out = [];
  for (let k = Math.ceil(t0 * SPEED - 0.45); (k + 0.45) / SPEED < t1; k++) out.push({ type: 'dig', t: (k + 0.45) / SPEED, amp: 0.8 });
  return out;
}

export const scenesA = [{ id: 'story', from: 0, to: S('name') - 0.35, draw: storyScene, still: true }];

export const eventsA = [
  ...thuds(T_DIG_A + 0.05, T_STOP_A),
  { type: 'sparkle', t: S('tempt1') - 0.25 },
  { type: 'boing', t: at('tempt1', '一挖') },
  { type: 'whoosh', t: T_WALK1, d: 0.6 },
  { type: 'poof', t: T_ARR_B - 0.05 },
  ...thuds(T_ARR_B + 0.15, T_HARD - 0.1),
  { type: 'clang', t: T_HARD, shake: 6 },
  { type: 'sparkle', t: T_GEM2 },
  { type: 'whoosh', t: T_WALK2, d: 0.6 },
  { type: 'poof', t: T_ARR_C - 0.05 },
  ...thuds(T_ARR_C + 0.15, T_STOP_C),
  { type: 'ding', t: T_STOP_C + 0.2, n: 84 },
  { type: 'stamp', t: T_DRY + 0.2, shake: 10 },
];
