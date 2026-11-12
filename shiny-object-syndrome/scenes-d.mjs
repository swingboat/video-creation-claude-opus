// Scene group D: switching can be right (evidence, sunk cost), the three questions, the idea parking ticket.
import { W, C, S, at, prog, lerp, clamp, easeIO, pop, txt, card, around, burst, sayBubble, talkLevel } from './lib.mjs';
import { aliang, shiny } from './people.mjs';
import { icons, mark } from './icons.mjs';
import { GY, WATER, field, well } from './world.mjs';

// ---------- switching can be right ----------
const T_EVID = at('butok', '证据'), T_DRY = at('butok', '没水'), T_STUB = at('butok', '固执');
const T_SUNK = at('butok', '已经'), T_NOTR = at('butok', '不是');

function butokScene(ctx, t) {
  field(ctx, t);
  // the evidence: no water under this spot
  const dry = easeIO(prog(t, T_DRY - 0.3, T_DRY + 0.5));
  if (dry > 0) {
    const x0 = 470, w = 440 * dry;
    ctx.fillStyle = '#9b8f80'; ctx.fillRect(x0, WATER - 8, w, 86);
    ctx.strokeStyle = '#6e6458'; ctx.lineWidth = 4;
    for (let x = x0 + 30; x < x0 + w - 20; x += 70) {
      ctx.beginPath(); ctx.moveTo(x, WATER + 4); ctx.lineTo(x + 18, WATER + 34); ctx.lineTo(x + 6, WATER + 60); ctx.stroke();
    }
    txt(ctx, '这里没水', 690, WATER + 36, { size: 40, color: C.white, stroke: '#6e6458', sw: 8 });
  }
  well(ctx, t, 690, 2);
  const digging = t > T_STUB - 0.3 && t < T_SUNK;
  aliang(ctx, t, 560, GY, 0.8, {
    pose: digging ? 'dig' : t > T_NOTR + 0.5 ? 'point' : 'think', mood: digging ? 'tired' : t > T_NOTR + 0.5 ? 'happy' : 'think', look: 1,
  });
  // "keep digging = stubborn" tag
  const stub = pop(t, T_STUB, 0.35) * (1 - prog(t, T_SUNK - 0.2, T_SUNK + 0.1));
  around(ctx, 690, 240, stub, stub, () => {
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.roundRect(520, 200, 340, 80, 40); ctx.fill();
    txt(ctx, '硬挖 = 固执', 690, 241, { size: 46, color: C.white });
  });
  // right-hand cards: evidence, then sunk cost
  const ev = pop(t, T_EVID - 0.2, 0.45) * (1 - prog(t, T_SUNK - 0.3, T_SUNK));
  around(ctx, 1420, 340, ev, ev, () => {
    card(ctx, 1130, 180, 580, 320, { fill: C.cream });
    icons.clipboard(ctx, 1250, 320, 1.2);
    icons.lens(ctx, 1320, 380, 0.7);
    txt(ctx, '新证据', 1540, 280, { size: 52, color: C.ink });
    txt(ctx, '勘测：A 下面', 1540, 360, { size: 36, color: '#6b6f80' });
    txt(ctx, '根本没有水', 1540, 410, { size: 36, color: C.red });
  });
  const sk = pop(t, T_SUNK - 0.1, 0.45);
  around(ctx, 1420, 340, sk, sk, () => {
    card(ctx, 1090, 180, 660, 320, { fill: C.cream });
    icons.hourglass(ctx, 1210, 330, 1.3, clamp(prog(t, T_SUNK, T_SUNK + 3)));
    txt(ctx, '已经花掉的时间', 1500, 290, { size: 44, color: C.ink });
    const q = pop(t, T_NOTR, 0.4);
    around(ctx, 1500, 390, q, q, () => txt(ctx, '≠ 非坚持不可的理由', 1500, 390, { size: 36, color: C.red }));
  });
  mark(ctx, 1712, 200, 0.6, true, prog(t, T_NOTR + 0.6, T_NOTR + 1.0));
}

// ---------- three questions ----------
const QS = [
  ['target', '它服务我的', '哪个目标？', at('ask', '服务') - 0.3, C.red],
  ['wrench', '能解决我现在的', '什么卡点？', at('ask', '解决') - 0.3, C.orange],
  ['lens', '我手里', '有什么证据？', at('ask', '我有') - 0.2, C.sky],
];

function askScene(ctx, t) {
  const h = pop(t, S('ask') + 0.6, 0.45);
  around(ctx, W / 2, 190, h, h, () => {
    shiny(ctx, t, W / 2 - 470, 190, 0.38, { glow: 0.6 });
    txt(ctx, '新东西出现时，先问三个问题', W / 2 + 40, 190, { size: 64, color: C.navy, stroke: C.white, sw: 10 });
  });
  QS.forEach(([icon, l1, l2, t0, color], i) => {
    const x = 380 + i * 580, p = pop(t, t0, 0.45);
    around(ctx, x, 560, p, clamp(p * 2), () => {
      card(ctx, x - 250, 300, 500, 520, { fill: C.cream });
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x - 190, 340, 46, 0, Math.PI * 2); ctx.fill();
      txt(ctx, String(i + 1), x - 190, 342, { size: 52, font: 'RoundB', color: C.white });
      icons[icon](ctx, x, 470 + Math.sin(t * 3 + i) * 6, 1.5);
      txt(ctx, l1, x, 640, { size: 44, color: '#55596b' });
      txt(ctx, l2, x, 715, { size: 58, color: C.ink });
    });
  });
}

// ---------- the parking ticket ----------
const FIELDS = [
  ['它是什么', '那块“更软”的地', at('ticket', '是什么') - 0.2],
  ['为什么有用', '也许更快出水', at('ticket', '有用') - 0.3],
  ['什么时候再看', 'A 井出水以后', at('ticket', '再看') - 0.4],
];
const T_TICKET = at('ticket', '停车票') - 0.2, T_PARK = at('ticket', '接着') - 0.2;
const LOT = [1600, 760];

function ticketScene(ctx, t) {
  // parking lot on the right
  const lot = pop(t, T_TICKET + 0.4, 0.4);
  around(ctx, LOT[0], LOT[1], lot, lot, () => {
    ctx.strokeStyle = C.white; ctx.lineWidth = 8; ctx.setLineDash([24, 16]);
    ctx.strokeRect(LOT[0] - 170, LOT[1] - 150, 340, 230);
    ctx.setLineDash([]);
    ctx.fillStyle = '#7d8597'; ctx.fillRect(LOT[0] + 200, LOT[1] - 330, 14, 410);
    ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.roundRect(LOT[0] + 140, LOT[1] - 400, 134, 134, 22); ctx.fill();
    txt(ctx, 'P', LOT[0] + 207, LOT[1] - 331, { size: 100, font: 'RoundB', color: C.white });
    txt(ctx, '新想法停车场', LOT[0], LOT[1] + 40, { size: 36, color: C.white, stroke: '#2f6fd6', sw: 8 });
  });
  // the gem drifts in from the top and parks
  const park = easeIO(prog(t, T_PARK, T_PARK + 0.9));
  const gx = lerp(1250, LOT[0], park), gy = lerp(260, LOT[1] - 50, park) - Math.sin(park * Math.PI) * 120;
  shiny(ctx, t, gx, gy, 0.7, { talk: talkLevel(t, ['shinyOk']), wave: t > S('shinyOk') ? 1 : 0, mood: t > S('shinyOk') ? 'wink' : 'happy', glow: 0.8 });
  // the ticket itself
  const tk = pop(t, T_TICKET, 0.5);
  around(ctx, 900, 520, tk, clamp(tk * 2), () => {
    ctx.save(); ctx.translate(900, 520); ctx.rotate(-0.04); ctx.translate(-900, -520);
    card(ctx, 620, 200, 560, 620, { fill: '#fffdf4', r: 26 });
    ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.roundRect(620, 200, 560, 130, [26, 26, 0, 0]); ctx.fill();
    txt(ctx, '新想法停车票', 860, 265, { size: 50, color: C.white });
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(1100, 265, 40, 0, Math.PI * 2); ctx.fill();
    txt(ctx, 'P', 1100, 268, { size: 54, font: 'RoundB', color: '#2f6fd6' });
    FIELDS.forEach(([k, v, t0], i) => {
      const y = 380 + i * 135;
      txt(ctx, k, 660, y, { size: 32, color: '#7d8597', align: 'left' });
      ctx.strokeStyle = '#d5d9e3'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(660, y + 80); ctx.lineTo(1140, y + 80); ctx.stroke();
      const n = Math.floor(v.length * prog(t, t0, t0 + 0.6));
      txt(ctx, v.slice(0, n), 660, y + 50, { size: 42, color: C.ink, align: 'left' });
    });
    const st = pop(t, T_PARK - 0.1, 0.35);
    around(ctx, 1040, 760, lerp(2, 1, clamp(st)), clamp(st * 2), () => {
      ctx.strokeStyle = C.mint; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.roundRect(930, 725, 220, 70, 16); ctx.stroke();
      txt(ctx, '晚点再看', 1040, 761, { size: 40, color: C.mint });
    }, -0.15);
    ctx.restore();
  });
  const writing = t > FIELDS[0][2] - 0.3 && t < FIELDS[2][2] + 0.8;
  aliang(ctx, t, 300, 900, 0.75, { pose: writing ? 'write' : t > T_PARK ? 'point' : 'stand', mood: writing ? 'think' : 'happy', look: 1 });
  sayBubble(ctx, t, 'shinyOk', LOT[0] - 150, 340, LOT[0] - 40, LOT[1] - 150, { fill: '#e6f8ff' });
  burst(ctx, t, T_PARK + 0.9, LOT[0], LOT[1] - 50, { r: 180, n: 10 });
}

export const scenesD = [
  { id: 'butok', from: S('butok') - 0.35, to: S('ask') - 0.35, draw: butokScene },
  { id: 'ask', from: S('ask') - 0.35, to: S('ticket') - 0.35, draw: askScene },
  { id: 'ticket', from: S('ticket') - 0.35, to: S('trial') - 0.35, draw: ticketScene },
];

export const eventsD = [
  { type: 'whoosh', t: S('butok') - 0.4, d: 0.45 },
  { type: 'pop', t: T_EVID - 0.2, f: 700 },
  { type: 'whoosh', t: T_DRY - 0.3, d: 0.6, from: 300, to: 900 },
  { type: 'buzz', t: T_STUB + 0.1 },
  { type: 'pop', t: T_SUNK - 0.1, f: 600 },
  { type: 'pop', t: T_NOTR, f: 900 },
  { type: 'ding', t: T_NOTR + 0.6, n: 84 },
  { type: 'whoosh', t: S('ask') - 0.4, d: 0.45 },
  ...QS.map(([, , , t0], i) => ({ type: 'pop', t: t0, f: 650 + i * 150 })),
  ...QS.map(([, , , t0], i) => ({ type: 'note', t: t0 + 0.15, n: 76 + i * 3, amp: 0.5 })),
  { type: 'whoosh', t: S('ticket') - 0.4, d: 0.45 },
  { type: 'pop', t: T_TICKET, f: 700 },
  ...FIELDS.map(([, , t0]) => ({ type: 'scribble', t: t0, d: 0.6 })),
  { type: 'stamp', t: T_PARK + 0.1, shake: 6 },
  { type: 'whoosh', t: T_PARK + 0.1, d: 0.8, amp: 0.7 },
  { type: 'sparkle', t: T_PARK + 0.9, amp: 0.7 },
];
