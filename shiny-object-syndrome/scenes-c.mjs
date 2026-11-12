// Scene group C: the four-step loop, then the well-digging arithmetic (focus vs. hopping).
import { W, C, S, at, prog, lerp, clamp, easeOut, pop, txt, card, around, burst } from './lib.mjs';
import { aliang, shiny } from './people.mjs';
import { mark } from './icons.mjs';

// ---------- the loop ----------
const STAGES = [
  { x: 960, y: 250, n: '01', title: '开始新东西', sub: '充满希望', t: at('loop', '开始'), color: C.gold },
  { x: 1480, y: 530, n: '02', title: '落地做事', sub: '遇到普通的困难', t: at('loop', '做'), color: C.orange },
  { x: 960, y: 810, n: '03', title: '另一个选择', sub: '显得更轻松', t: at('loop', '这时'), color: C.sky },
  { x: 440, y: 530, n: '04', title: '重新开始', sub: '旧事被搁下', t: at('loop', '于是'), color: C.pink },
];
const T_LOOP_END = at('loop', '搁下') + 0.3;

function loopScene(ctx, t) {
  const cx = 960, cy = 530, R = 300;
  // ring arrows between stages
  for (let i = 0; i < 4; i++) {
    const nxt = i < 3 ? STAGES[i + 1].t : T_LOOP_END;
    const p = easeOut(prog(t, nxt - 0.5, nxt));
    if (p <= 0) continue;
    const a0 = -Math.PI / 2 + i * (Math.PI / 2) + 0.42, a1 = a0 + (Math.PI / 2 - 0.84) * p;
    ctx.save();
    ctx.strokeStyle = i === 3 ? C.red : 'rgba(29,43,83,0.55)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    const hx = cx + Math.cos(a1) * R, hy = cy + Math.sin(a1) * R;
    const [tx, ty, nx, ny] = [-Math.sin(a1), Math.cos(a1), Math.cos(a1), Math.sin(a1)];
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(hx + tx * 24, hy + ty * 24);
    ctx.lineTo(hx - tx * 12 + nx * 22, hy - ty * 12 + ny * 22); ctx.lineTo(hx - tx * 12 - nx * 22, hy - ty * 12 - ny * 22);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // stage cards
  const cur = STAGES.reduce((k, s, i) => (t >= s.t - 0.2 ? i : k), -1);
  STAGES.forEach((s, i) => {
    const p = pop(t, s.t - 0.2, 0.45);
    const lit = i === cur || t > T_LOOP_END ? 1 : 0.55;
    around(ctx, s.x, s.y, p * (i === cur ? 1.06 : 1), clamp(p * 2) * lit, () => {
      card(ctx, s.x - 210, s.y - 78, 420, 156, { fill: C.cream, edge: i === cur ? s.color : C.ink, ew: i === cur ? 10 : 6 });
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x - 150, s.y, 44, 0, Math.PI * 2); ctx.fill();
      txt(ctx, s.n, s.x - 150, s.y + 2, { size: 40, font: 'RoundB', color: C.white });
      txt(ctx, s.title, s.x + 38, s.y - 26, { size: 46, color: C.ink });
      txt(ctx, s.sub, s.x + 38, s.y + 32, { size: 34, color: '#6b6f80' });
    });
  });
  // 阿亮 in the middle acts out each stage
  const moods = [['excited', 'cheer'], ['tired', 'dig'], ['shock', 'point'], ['tired', 'shrug']];
  const [mood, pose] = cur < 0 ? ['happy', 'stand'] : moods[cur];
  aliang(ctx, t, cx, cy + 150, 0.55, { mood, pose, look: cur === 2 ? 1 : 0, digSpeed: 1.1 });
  if (cur === 0 || cur === 2) shiny(ctx, t, cur === 0 ? cx + 150 : cx + 170, cy - 150, 0.35, { glow: 0.7 });
  // back to the top: the loop starts again
  const again = pop(t, T_LOOP_END, 0.45);
  around(ctx, 560, 250, again, again, () => {
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.roundRect(390, 215, 340, 70, 35); ctx.fill();
    txt(ctx, '↻ 又一个新选择', 560, 251, { size: 38, color: C.white });
  });
}

// ---------- the arithmetic ----------
const U = 44; // one dig cell in the mini cross-section
const FOCUS = { y0: 250, label: ['一直挖', '同一口井'], steps: 'AAAA', t0: at('focus', '一直'), dt: 0.4, wells: { A: 700 } };
const HOP = {
  y0: 590, label: ['每挖两格', '就换一口'], steps: 'AASBBSCC', t0: at('hop', '要是'), dt: 0.68, wells: { A: 520, B: 700, C: 880 },
};
const T_WATER = at('focus', '见'), T_HALF = at('focus', '一半'), T_PLUS = at('hop', '多花'), T_HALFWAY = at('hop', '三口');

function lane(ctx, t, L, show) {
  const { y0 } = L;
  around(ctx, 960, y0 + 160, show, show, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath(); ctx.roundRect(60, y0, 1800, 320, 30); ctx.fill();
    txt(ctx, L.label[0], 230, y0 + 125, { size: 48, color: C.ink });
    txt(ctx, L.label[1], 230, y0 + 190, { size: 48, color: C.ink });
    // mini cross-section
    const gy = y0 + 90, x0 = 420, x1 = 1000;
    ctx.fillStyle = C.soil; ctx.fillRect(x0, gy, x1 - x0, 4 * U + 40);
    ctx.fillStyle = C.water; ctx.fillRect(x0, gy + 4 * U, x1 - x0, 40);
    ctx.fillStyle = C.grass; ctx.fillRect(x0, gy - 10, x1 - x0, 14);
    const depth = { A: 0, B: 0, C: 0 };
    let current = null;
    [...L.steps].forEach((s, k) => {
      const p = prog(t, L.t0 + k * L.dt, L.t0 + k * L.dt + L.dt * 0.8);
      if (t >= L.t0 + k * L.dt) current = s === 'S' ? current : s;
      if (s !== 'S') depth[s] += p;
    });
    for (const [name, x] of Object.entries(L.wells)) {
      const d = depth[name] * U;
      ctx.fillStyle = C.soilDark;
      ctx.beginPath(); ctx.roundRect(x - 40, gy - 2, 80, d + 2, [0, 0, 12, 12]); ctx.fill();
      if (depth[name] >= 3.99) {
        const w = easeOut(prog(t, T_WATER - 0.2, T_WATER + 0.6));
        ctx.fillStyle = C.water; ctx.fillRect(x - 36, lerp(gy + 4 * U, gy + 12, w), 72, lerp(0, 4 * U - 12, w));
      }
      txt(ctx, name, x, gy - 40, { size: 34, font: 'RoundB', color: current === name ? C.orange : C.gray });
    }
    // time bar: one cell per unit
    txt(ctx, '时间', 1110, y0 + 55, { size: 32, color: '#6b6f80' });
    const steps = [...L.steps].concat(Array(8 - L.steps.length).fill('.'));
    steps.forEach((s, k) => {
      const x = 1060 + k * 96, y = y0 + 90;
      const cellIn = pop(t, at('math', '八个') + k * 0.06, 0.3);
      if (cellIn <= 0) return;
      const p = s === '.' ? 0 : prog(t, L.t0 + k * L.dt, L.t0 + k * L.dt + L.dt * 0.8);
      around(ctx, x + 43, y + 40, cellIn, 1, () => {
        ctx.fillStyle = '#e6e8ef';
        ctx.beginPath(); ctx.roundRect(x, y, 86, 80, 14); ctx.fill();
        if (s === '.' && L === FOCUS) {
          const g = prog(t, T_HALF - 0.3, T_HALF + 0.2);
          ctx.fillStyle = `rgba(61,220,151,${0.85 * g})`;
          ctx.beginPath(); ctx.roundRect(x, y, 86, 80, 14); ctx.fill();
        }
        if (p > 0) {
          ctx.fillStyle = s === 'S' ? C.gray : C.orange;
          ctx.beginPath(); ctx.roundRect(x, y, 86 * p, 80, 14); ctx.fill();
          txt(ctx, s === 'S' ? '换' : s, x + 43, y + 41, { size: 38, color: C.white, font: s === 'S' ? undefined : 'RoundB' });
        }
      });
    });
  });
}

function mathScene(ctx, t) {
  const chips = [['每口井：4格出水', at('math', '四格') - 0.3, C.water], ['一共：8个单位时间', at('math', '八个') - 0.3, C.orange], ['换一次井：+1单位', at('hop', '换', 1) - 0.2, C.gray]];
  chips.forEach(([label, t0, color], i) => {
    const p = pop(t, t0, 0.4), x = 400 + i * 560;
    around(ctx, x, 180, p, p, () => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x - 250, 145, 500, 70, 35); ctx.fill();
      txt(ctx, label, x, 181, { size: 40, color: C.white });
    });
  });
  lane(ctx, t, FOCUS, pop(t, at('math', '八个') - 0.4, 0.5));
  lane(ctx, t, HOP, pop(t, at('math', '八个') - 0.2, 0.5));
  // focus result
  burst(ctx, t, T_WATER, 700, FOCUS.y0 + 90, { r: 160, n: 10, colors: [C.water, C.sky, C.white] });
  const ok = pop(t, T_WATER + 0.1, 0.4);
  around(ctx, 1450, FOCUS.y0 + 240, ok, ok, () => {
    txt(ctx, '第4格出水 · 还剩4单位', 1450, FOCUS.y0 + 250, { size: 40, color: '#1f9d63' });
  });
  mark(ctx, 1185, FOCUS.y0 + 250, 0.45, true, prog(t, T_WATER + 0.2, T_WATER + 0.6));
  // hop result
  const plus = pop(t, T_PLUS, 0.35) * (1 - prog(t, T_PLUS + 1.6, T_PLUS + 1.9));
  around(ctx, 1060 + 2 * 96 + 43, HOP.y0 + 60, plus, plus, () =>
    txt(ctx, '+1', 1060 + 2 * 96 + 43, HOP.y0 + 60, { size: 54, font: 'RoundB', color: C.red, stroke: C.white, sw: 10 }));
  const bad = pop(t, T_HALFWAY, 0.4);
  around(ctx, 1450, HOP.y0 + 240, bad, bad, () =>
    txt(ctx, '三口都只到2格 · 0口出水', 1450, HOP.y0 + 250, { size: 40, color: C.red }));
  mark(ctx, 1165, HOP.y0 + 250, 0.45, false, prog(t, T_HALFWAY + 0.2, T_HALFWAY + 0.6));
  const note = easeOut(prog(t, at('math', '假设') - 0.2, at('math', '假设') + 0.3));
  ctx.globalAlpha *= note * 0.8;
  txt(ctx, '教学模型：规则是人为设定的', 1840, 950 - 20, { size: 26, color: '#4d5570', align: 'right' });
}

export const scenesC = [
  { id: 'loop', from: at('loop', '循环') - 0.2, to: S('math') - 0.35, draw: loopScene },
  { id: 'math', from: S('math') - 0.35, to: S('butok') - 0.35, draw: mathScene },
];

const digTicks = (L) => [...L.steps].map((s, k) => (s === 'S'
  ? { type: 'whoosh', t: L.t0 + k * L.dt, d: 0.35, amp: 0.6 }
  : { type: 'dig', t: L.t0 + k * L.dt + 0.1, amp: 0.7 }));

export const eventsC = [
  { type: 'whoosh', t: at('loop', '循环') - 0.25, d: 0.45 },
  ...STAGES.map((s, i) => ({ type: 'pop', t: s.t - 0.2, f: 600 + i * 120 })),
  { type: 'sparkle', t: STAGES[0].t, amp: 0.6 },
  { type: 'sparkle', t: STAGES[2].t, amp: 0.6 },
  { type: 'boing', t: T_LOOP_END },
  { type: 'whoosh', t: S('math') - 0.4, d: 0.45 },
  { type: 'pop', t: at('math', '四格') - 0.3, f: 700 },
  { type: 'pop', t: at('math', '八个') - 0.3, f: 850 },
  ...[...Array(8)].map((_, k) => ({ type: 'tick', t: at('math', '八个') + k * 0.06, n: 72 + k * 2 })),
  ...digTicks(FOCUS),
  { type: 'splash', t: T_WATER - 0.1 },
  { type: 'ding', t: T_WATER + 0.1, n: 88 },
  { type: 'note', t: T_HALF - 0.2, n: 84, amp: 0.6 },
  ...digTicks(HOP),
  { type: 'pop', t: at('hop', '换', 1) - 0.2, f: 600 },
  { type: 'boing', t: T_PLUS },
  { type: 'buzz', t: T_HALFWAY + 0.2 },
];
