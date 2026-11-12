// Scene group B (concept): the name reveal, "not a diagnosis", and four real-life shiny objects.
import { W, C, S, at, prog, lerp, clamp, easeIO, easeOut, pop, txt, card, around, burst, star } from './lib.mjs';
import { aliang, shiny } from './people.mjs';
import { icons, mark } from './icons.mjs';

const FEET = 900;

// ---------- the name ----------
const TITLE = '闪亮物体综合征';
const T_T0 = at('name', '闪亮'), T_T1 = at('name', '征') + 0.2;
const T_NEW = at('name', '新鲜'), T_HOPE = at('name', '希望');
const T_AGAIN = at('name', '一次次'), T_PUSH = at('name', '挤');

function nameScene(ctx, t) {
  // title letters drop in one by one
  for (let i = 0; i < TITLE.length; i++) {
    const t0 = lerp(T_T0, T_T1, i / (TITLE.length - 1)) - 0.15;
    const p = pop(t, t0, 0.4);
    const x = W / 2 + (i - (TITLE.length - 1) / 2) * 128;
    around(ctx, x, 210, p, clamp(p * 2), () =>
      txt(ctx, TITLE[i], x, 210 + Math.sin(t * 3 + i) * 5, { size: 120, color: C.gold, stroke: C.navy, sw: 16, shadow: 'rgba(20,30,70,0.4)' }));
  }
  burst(ctx, t, T_T1, W / 2, 210, { r: 520, n: 16, size: 30 });
  // the original goal, later shoved aside
  const push = easeIO(prog(t, T_PUSH - 0.1, T_PUSH + 0.5));
  const gx = lerp(960, 640, push), gy = lerp(600, 700, push);
  around(ctx, gx, gy, pop(t, S('name') + 0.3, 0.5) * lerp(1, 0.72, push), lerp(1, 0.55, push), () => {
    card(ctx, gx - 190, gy - 140, 380, 280, { fill: C.cream });
    icons.target(ctx, gx, gy - 40, 1);
    txt(ctx, '原本的目标', gx, gy + 88, { size: 46, color: C.ink });
  }, -0.35 * push + Math.sin(t * 20) * 0.03 * push * (1 - prog(t, T_PUSH + 0.5, T_PUSH + 1)));
  // shiny things keep arriving
  const extra = [[1350, 420, 0.42], [1700, 470, 0.38]];
  extra.forEach(([x, y, s], i) => {
    const p = pop(t, T_AGAIN + i * 0.25, 0.4);
    if (p > 0) shiny(ctx, t + i, x, y, s * p, { glow: 0.8 });
  });
  const ge = easeOut(prog(t, T_NEW - 0.4, T_NEW + 0.3));
  if (ge > 0) {
    const x = lerp(lerp(2100, 1500, ge), 990, push), y = lerp(620, 590, push);
    shiny(ctx, t, x, y, 0.95 + 0.15 * push, { wave: push > 0 ? 0 : 1, mood: push > 0.5 ? 'wink' : 'happy' });
    const tags = [['新鲜', T_NEW, -150], ['更有希望', T_HOPE - 0.3, 150]];
    for (const [label, t0, dy] of tags) {
      const p = pop(t, t0, 0.35) * (1 - push);
      around(ctx, x + 230, y + dy * 0.6, p, p, () => {
        ctx.fillStyle = C.pink;
        ctx.beginPath(); ctx.roundRect(x + 150, y + dy * 0.6 - 34, 60 + label.length * 42, 68, 34); ctx.fill();
        txt(ctx, label, x + 180 + label.length * 21, y + dy * 0.6 + 1, { size: 42, color: C.white });
      });
    }
  }
  aliang(ctx, t, 250, FEET, 0.75, { mood: t > T_NEW ? 'excited' : 'happy', look: 1, pose: t > T_PUSH ? 'point' : 'stand' });
}

// ---------- not a diagnosis ----------
const T_PLAIN = at('notdx', '通俗'), T_NOT = at('notdx', '不是'), T_TAG = at('notdx', '贴');

function notdxScene(ctx, t) {
  const pill = pop(t, S('notdx') - 0.1, 0.4);
  around(ctx, W / 2, 190, pill, pill, () => {
    ctx.fillStyle = C.navy;
    ctx.beginPath(); ctx.roundRect(W / 2 - 130, 150, 260, 80, 40); ctx.fill();
    txt(ctx, '先说明', W / 2, 191, { size: 48, color: C.gold });
  });
  const cards = [
    [500, '通俗说法', '描述一种行为', T_PLAIN - 0.4, true, (x, y) => icons.talk(ctx, x, y, 1.2)],
    [1420, '医学诊断', '不能凭它判断', T_NOT - 0.3, false, (x, y) => icons.clipboard(ctx, x, y, 1.1)],
  ];
  for (const [x, title, sub, t0, ok, icon] of cards) {
    const p = pop(t, t0, 0.45);
    around(ctx, x, 520, p, clamp(p * 2), () => {
      card(ctx, x - 230, 300, 460, 440, { fill: ok ? '#eafff4' : '#fff0f0' });
      icon(x, 420);
      txt(ctx, title, x, 560, { size: 58, color: C.ink });
      txt(ctx, sub, x, 640, { size: 36, color: '#6b6f80' });
    });
    mark(ctx, x + 170, 330, 1, ok, prog(t, t0 + 0.4, t0 + 0.8));
  }
  // a careless label flies at 阿亮, then gets rejected
  const mood = t > T_TAG + 0.8 ? 'happy' : t > T_TAG ? 'shock' : 'think';
  aliang(ctx, t, W / 2, FEET, 0.75, { mood, pose: t > T_TAG + 0.8 ? 'stand' : 'think', look: t < T_NOT ? -1 : 1 });
  const fly = easeOut(prog(t, T_TAG - 0.3, T_TAG + 0.2));
  if (fly > 0) {
    const drop = prog(t, T_TAG + 0.8, T_TAG + 1.6);
    const x = lerp(1250, W / 2, fly), y = lerp(260, 700, fly) + 600 * drop * drop;
    around(ctx, x, y, 1, 1 - drop, () => {
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(x - 110, y - 40, 220, 80, 12); ctx.fill(); ctx.stroke();
      txt(ctx, '我有病？', x, y + 1, { size: 44, color: C.ink });
      mark(ctx, x, y, 0.9, false, prog(t, T_TAG + 0.35, T_TAG + 0.75));
    }, lerp(0.5, -0.12, fly) + drop * 1.5);
  }
}

// ---------- real-life shiny objects ----------
const REAL = [
  ['book', '更火的新课', ['收藏了很多课', '练习总往后放'], at('real', '火') - 0.3],
  ['app', '更酷的笔记软件', ['系统越搭越漂亮', '报告还没写'], at('real', '酷') - 0.3],
  ['rocket', '更热门的项目', ['启动了三次', '验证了零次'], at('real', '热门') - 0.3],
  ['camera', '更好的相机', ['研究装备很久', '很少真去拍'], at('real', '好的相机') - 0.3],
];

function realScene(ctx, t) {
  const h = pop(t, S('real') - 0.1, 0.45);
  around(ctx, W / 2, 180, h, h, () => {
    star(ctx, W / 2 - 375, 180, 30, C.gold, t * 2);
    txt(ctx, '闪亮的东西，可能是……', W / 2 + 20, 180, { size: 64, color: C.navy, stroke: C.white, sw: 10 });
  });
  REAL.forEach(([icon, title, lines, t0], i) => {
    const x = 300 + i * 440;
    const p = pop(t, t0, 0.45);
    around(ctx, x, 540, p, clamp(p * 2), () => {
      card(ctx, x - 200, 280, 400, 520, { fill: C.cream });
      const g = ctx.createRadialGradient(x, 410, 10, x, 410, 120);
      g.addColorStop(0, 'rgba(255,225,120,0.75)'); g.addColorStop(1, 'rgba(255,225,120,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 160, 290, 320, 240);
      icons[icon](ctx, x, 410 + Math.sin(t * 3 + i) * 6, 1.25);
      icons.sparkle(ctx, x + 95, 340, 1, t + i);
      txt(ctx, title, x, 560, { size: title.length > 6 ? 42 : 48, color: C.ink });
      ctx.fillStyle = 'rgba(43,33,64,0.15)'; ctx.fillRect(x - 160, 605, 320, 4);
      const q = easeOut(prog(t, t0 + 0.5, t0 + 0.9));
      ctx.globalAlpha *= q;
      txt(ctx, '结果', x, 645, { size: 30, color: C.red });
      lines.forEach((l, k) => txt(ctx, l, x, 700 + k * 50, { size: 36, color: '#55596b' }));
    });
  });
}

export const scenesB = [
  { id: 'name', from: S('name') - 0.35, to: S('notdx') - 0.35, draw: nameScene },
  { id: 'notdx', from: S('notdx') - 0.35, to: S('real') - 0.35, draw: notdxScene },
  { id: 'real', from: S('real') - 0.35, to: at('loop', '循环') - 0.2, draw: realScene },
];

export const eventsB = [
  { type: 'whoosh', t: S('name') - 0.4, d: 0.45 },
  ...[...Array(7)].map((_, i) => ({ type: 'note', t: lerp(T_T0, T_T1, i / 6) - 0.15, n: [72, 74, 76, 79, 81, 84, 88][i], amp: 0.5 })),
  { type: 'sparkle', t: T_T1 },
  { type: 'whoosh', t: T_NEW - 0.4, d: 0.5 },
  { type: 'pop', t: T_NEW, f: 800 },
  { type: 'pop', t: T_HOPE - 0.3, f: 1000 },
  { type: 'sparkle', t: T_AGAIN, amp: 0.6 },
  { type: 'boing', t: T_PUSH, shake: 8 },
  { type: 'whoosh', t: S('notdx') - 0.4, d: 0.45 },
  { type: 'pop', t: T_PLAIN - 0.4, f: 700 },
  { type: 'ding', t: T_PLAIN + 0.1, n: 84 },
  { type: 'pop', t: T_NOT - 0.3, f: 600 },
  { type: 'buzz', t: T_NOT + 0.2 },
  { type: 'whoosh', t: T_TAG - 0.3, d: 0.35 },
  { type: 'stamp', t: T_TAG + 0.4, shake: 6 },
  { type: 'whoosh', t: S('real') - 0.4, d: 0.45 },
  ...REAL.map(([, , , t0], i) => ({ type: 'pop', t: t0, f: 600 + i * 150 })),
  ...REAL.map(([, , , t0], i) => ({ type: 'note', t: t0 + 0.5, n: 79 + i * 2, amp: 0.4 })),
];
