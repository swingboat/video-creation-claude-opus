// Scenes 12–14: Mixamo actions, the watering-can interaction, and the recap / goodbye.
import {
  W, C, EN, TOOL, S, E, at, prog, lerp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, star, pill, mark, confetti, talkLevel, ZH_LINES,
} from './lib.mjs';
import { kitty, prince, princeJoints, bot } from './chars.mjs';
import { asteroid, rose, wateringCan, picIcon, cubeIcon } from './props.mjs';

// ---------- scene 12: Mixamo ----------
function stick(ctx, t, x, y, kind, color) {
  const ph = t * 6;
  const sw = kind === 'walk' ? Math.sin(ph) * 0.5 : 0;
  const jump = kind === 'jump' ? Math.abs(Math.sin(ph * 0.6)) * 26 : 0;
  const wave = kind === 'wave' ? -2.4 + Math.sin(ph) * 0.4 : 0.3;
  ctx.save(); ctx.translate(x, y - jump);
  ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
  const L = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  L(0, -60, 0, -10);
  L(0, -10, Math.sin(sw) * 30, 30); L(0, -10, -Math.sin(sw) * 30, 30);
  L(0, -50, -Math.sin(0.3 - sw) * 30, -50 + Math.cos(0.3 - sw) * 30);
  L(0, -50, Math.sin(-wave) * -30, -50 + Math.cos(wave) * 30);
  ctx.beginPath(); ctx.arc(0, -76, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

const ACTIONS = [['walk', '走路'], ['wave', '挥手'], ['jump', '跳跃']];
function mixamoScene(ctx, t) {
  const tKey = at('c4', '关键词'), tDl = at('c4', 'FBX'), tChk = at('c4', '检查'), tMatch = at('c4', '匹配'), tIn = at('c4', '接进去');
  const pp = pop(t, S('c4') - 0.2, 0.5);
  around(ctx, 500, 520, pp, pp, () => {
    card(ctx, 200, 210, 600, 640, { fill: '#f6f1ff', r: 30, ew: 6, edge: C.ink, drop: 12 });
    txt(ctx, 'Mixamo', 500, 270, { size: 50, font: EN, color: C.hot });
    card(ctx, 240, 310, 520, 70, { fill: C.white, r: 35, ew: 4, edge: C.ink, drop: 0 });
    const q = 'prince walk';
    const n = Math.floor(clamp01((t - tKey) * 9) * q.length);
    txt(ctx, q.slice(0, n) + (Math.floor(t * 3) % 2 ? '|' : ''), 280, 346, { size: 34, font: EN, color: C.ink, align: 'left' });
    ACTIONS.forEach(([kind, label], i) => {
      const ap = pop(t, tKey + 0.6 + i * 0.15, 0.4);
      const fly = easeIO(prog(t, tDl + i * 0.15, tDl + i * 0.15 + 0.7));
      const x = lerp(320 + i * 180, 1350, fly), y = lerp(560, 560, fly) - Math.sin(fly * Math.PI) * 160;
      around(ctx, x, y, ap * lerp(1, 0.4, fly), ap * (1 - prog(fly, 0.85, 1)), () => {
        card(ctx, x - 75, y - 110, 150, 210, { fill: fly > 0 ? C.gold : '#2a2470', r: 20, ew: 4, edge: C.ink, drop: 0 });
        if (fly > 0) txt(ctx, '.FBX', x, y, { size: 40, font: EN, color: C.ink });
        else stick(ctx, t, x, y + 10, kind, C.sky);
        txt(ctx, label, x, y + 70, { size: 30, color: fly > 0 ? C.ink : C.white });
      });
    });
  });
  // the rigged prince plays the downloaded actions
  const live = t > tIn ? Math.floor((t - tIn) / 1.4) % 3 : -1;
  const ph = t * 6;
  const pose = live === 0 ? { legL: 0.06 + Math.sin(ph) * 0.4, legR: 0.06 - Math.sin(ph) * 0.4, armL: 0.2 - Math.sin(ph) * 0.3, armR: 0.2 + Math.sin(ph) * 0.3 }
    : live === 1 ? { armR: 2.6 + Math.sin(ph * 1.5) * 0.35, elbR: 0.3 }
      : live === 2 ? { armL: 2.4, armR: 2.4, legL: 0.25, legR: 0.25 } : {};
  const hop = live === 2 ? Math.abs(Math.sin(ph * 0.7)) * 60 : 0;
  const bones = live >= 0 ? 0.35 : 0.9;
  prince(ctx, t, 1300, 900 - hop, 1.25, { pose, bones });
  // Opus compares the FBX skeleton with the prince's bones
  const op = pop(t, at('c4', 'Opus') - 0.2, 0.45);
  around(ctx, 1730, 900, op, op, () => bot(ctx, t, 1730, 900, 0.75, { color: TOOL.opus.color, label: 'Opus 5.5', tool: 'magnifier', mood: t < tMatch + 0.4 ? 'focus' : 'happy', armUp: 0.8 }));
  const ck = easeOut(prog(t, tChk, tChk + 0.6)) * (1 - prog(t, tIn - 0.2, tIn));
  if (ck > 0) {
    ctx.save(); ctx.globalAlpha *= ck;
    const J = princeJoints({}, 'front');
    ctx.strokeStyle = C.orange; ctx.lineWidth = 5; ctx.setLineDash([10, 8]);
    const off = (1 - easeOut(prog(t, tChk, tMatch))) * 40;
    for (const ch of [[J.head, J.neck, J.pelvis], [J.neck, J.shL, J.elL, J.haL], [J.neck, J.shR, J.elR, J.haR], [J.pelvis, J.hipL, J.knL, J.ftL], [J.pelvis, J.hipR, J.knR, J.ftR]]) {
      ctx.beginPath(); ch.forEach(([x, y]) => ctx.lineTo(1300 + off + x * 1.25, 900 + y * 1.25)); ctx.stroke();
    }
    ctx.restore();
  }
  const mp = pop(t, tMatch, 0.4);
  around(ctx, 1300, 240, mp, mp, () => { pill(ctx, '骨骼匹配', 1270, 240, { size: 40, fill: C.mint }); mark(ctx, 1420, 240, true, 0.8); });
  const lp = pop(t, tIn - 0.1, 0.4);
  around(ctx, 1300, 330, lp, lp, () => pill(ctx, ['走路', '挥手', '跳跃'][Math.max(0, live)], 1300, 330, { size: 36, fill: C.gold }));
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ---------- scene 13: picking up the watering can ----------
const PX = 820, PY = 880, PS = 1.25;
const REACH = { armR: 0.75, elbR: -0.5 };
const GRIP = (() => { const J = princeJoints(REACH); return [PX + J.haR[0] * PS, PY + J.haR[1] * PS]; })();

function waterScene(ctx, t) {
  const tGhost = at('c5b', '接近的动作'), tIK = at('c5b', 'IK'), tFing = at('c5b', '手指握持'), tTune = at('c5b', '反复微调');
  const tHold = at('c5c', '握住'), tP3 = S('prince3');
  asteroid(ctx, t, 960, 2050, 1200);
  const walk = easeIO(prog(t, tP3 - 0.3, tP3 + 0.9));
  const pour = fadeIn(t, tP3 + 0.9, 0.3);
  rose(ctx, t, 1430, 870, 1.8 + 0.25 * easeOut(prog(t, tP3 + 1.2, tP3 + 2)));
  const reach = easeIO(prog(t, tIK, tIK + 0.9));
  const jitter = t > tTune && t < tTune + 1.4 ? Math.sin(t * 18) * 0.06 : 0;
  const lift = easeIO(prog(t, tHold - 0.2, tHold + 0.6));
  const px = PX + walk * 330;
  const pose = {
    armR: lerp(lerp(0.15, REACH.armR, reach), 0.45, lift) + jitter - pour * 0.6,
    elbR: lerp(lerp(0, REACH.elbR, reach), -0.1, lift) - pour * 0.4,
    legL: 0.06 + Math.sin(walk * Math.PI * 4) * 0.3 * (walk < 1 ? 1 : 0), legR: 0.06 - Math.sin(walk * Math.PI * 4) * 0.3 * (walk < 1 ? 1 : 0),
  };
  // ghost: the nearest Mixamo base action
  const gp = fadeIn(t, tGhost - 0.1, 0.3) * (1 - prog(t, tIK, tIK + 0.4));
  if (gp > 0) { ctx.save(); ctx.globalAlpha *= gp * 0.4; prince(ctx, t, PX, PY, PS, { mode: 'white', pose: { armR: 0.9, elbR: -0.2 } }); ctx.restore(); }
  const J = prince(ctx, t, px, PY, PS, { pose, bones: t > tIK - 0.3 && t < tHold + 0.4 ? 0.6 : 0 });
  const hand = J.haR;
  const held = lift > 0;
  wateringCan(ctx, t, held ? hand[0] : GRIP[0], held ? hand[1] : GRIP[1], 0.9, { rot: -pour * 0.7, pour });
  ctx.fillStyle = '#ffd9b8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
  if (reach > 0.9) { ctx.beginPath(); ctx.arc(hand[0], hand[1], 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // IK controller handle
  const ik = fadeIn(t, tIK - 0.2, 0.3) * (1 - prog(t, tHold + 0.3, tHold + 0.6));
  if (ik > 0) {
    around(ctx, hand[0], hand[1], 1, ik, () => {
      ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.strokeRect(-30, -30, 60, 60); ctx.restore();
      ctx.setLineDash([10, 8]); ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(J.shR[0], J.shR[1]); ctx.lineTo(hand[0], hand[1]); ctx.stroke(); ctx.setLineDash([]);
      pill(ctx, '手臂 IK 控制器', hand[0] + 40, hand[1] + 90, { size: 30, fill: C.gold });
    });
  }
  // finger-grip close-up
  const fz = pop(t, tFing - 0.15, 0.45) * (1 - prog(t, tHold + 0.8, tHold + 1.1));
  around(ctx, 1500, 330, fz, fz, () => {
    ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(1500, 330, 170, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(1500, 330, 164, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(1500, 470, 150, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    const curl = easeOut(prog(t, tFing, tFing + 0.6));
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#ffd9b8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(1440 + i * 40, lerp(250, 320, curl), 18, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    txt(ctx, '手指握持', 1500, 530, { size: 36, color: C.gold });
  });
  const n = 1 + Math.floor(Math.max(0, t - tTune) * 3);
  const tp = pop(t, tTune - 0.1, 0.4) * (1 - prog(t, tHold, tHold + 0.3));
  around(ctx, 520, 300, tp, tp, () => pill(ctx, `微调 #${Math.min(n, 6)}`, 520, 300, { size: 38, fill: C.gold, font: EN }));
  // headline + checks
  const hp = pop(t, at('c5', '提水壶') - 0.2, 0.45) * (1 - prog(t, S('c5b') - 0.2, S('c5b')));
  around(ctx, 960, 250, hp, hp, () => pill(ctx, '复杂交互：人物 + 道具接触', 960, 250, { size: 44, fill: C.pink }));
  const np = pop(t, at('c5', '没有') - 0.1, 0.4) * (1 - prog(t, S('c5b') - 0.2, S('c5b')));
  around(ctx, 960, 360, np, np, () => { pill(ctx, 'Mixamo 没有现成动作', 930, 360, { size: 34, fill: C.white }); mark(ctx, 1150, 360, false, 0.7); });
  [['不穿模', '不穿模'], ['不脱手', '不脱手'], ['不悬空', '悬空']].forEach(([label, w], i) => {
    const p = pop(t, at('c5c', w) - 0.1, 0.4) * (1 - prog(t, tP3 - 0.3, tP3));
    around(ctx, 1640, 300 + i * 110, p, p, () => { pill(ctx, label, 1600, 300 + i * 110, { size: 40, fill: C.mint }); mark(ctx, 1730, 300 + i * 110, true, 0.7); });
  });
  for (let i = 0; i < 3; i++) {
    const k = prog(t, tP3 + 1.3 + i * 0.3, tP3 + 2.6 + i * 0.3);
    if (k > 0 && k < 1) around(ctx, 1430 + (i - 1) * 60, 640 - k * 160, 1, 1 - k, () => txt(ctx, '♥', 1430 + (i - 1) * 60, 640 - k * 160, { size: 54, color: C.hot, font: 'UniB' }));
  }
}

// ---------- scene 14: recap + goodbye ----------
const RECAP = [['画图', '先画图', (ctx, t, x, y) => picIcon(ctx, x, y, 1.2)], ['变3D', '再变 3D', (ctx, t, x, y) => cubeIcon(ctx, x, y, 1.2, C.sky, 0.6 + Math.sin(t * 1.5) * 0.25)],
  ['动手搭', 'AI 动手搭', (ctx, t, x, y) => bot(ctx, t, x, y + 90, 0.55, { color: TOOL.opus.color, tool: 'wrench' })],
  ['挑刺', 'AI 来挑刺', (ctx, t, x, y) => bot(ctx, t, x, y + 90, 0.55, { color: C.mint, tool: 'magnifier', mood: 'focus' })]];

function outroScene(ctx, t) {
  const tBye = S('bye');
  kitty(ctx, t, 330, 960, 1.05, { talk: talkLevel(t, ZH_LINES), wave: t > tBye ? 1 : 0, hop: t > at('bye', '下次见') ? Math.abs(Math.sin(t * 8)) * 30 : 0 });
  const recapA = 1 - prog(t, tBye - 0.4, tBye);
  RECAP.forEach(([w, label, draw], i) => {
    const x = 760 + i * 330, p = pop(t, at('recap', w) - 0.2, 0.45) * recapA;
    if (i > 0) arrow(ctx, x - 230, 330, x - 110, 330, { color: 'rgba(255,255,255,0.6)', w: 6, head: 20, p: easeOut(prog(t, at('recap', w) - 0.3, at('recap', w))) * recapA });
    around(ctx, x, 330, p, p, () => {
      draw(ctx, t, x, 320);
      txt(ctx, label, x, 470, { size: 42, color: C.gold });
    });
  });
  const gp = pop(t, at('github', 'GitHub') - 0.2, 0.5) * recapA;
  around(ctx, 1250, 700, gp, gp, () => {
    card(ctx, 830, 600, 840, 200, { fill: '#161b22', r: 30, ew: 5, edge: C.white, drop: 10 });
    txt(ctx, '{ }', 920, 700, { size: 70, font: EN, color: C.mint });
    txt(ctx, 'GitHub · 下周开源', 1010, 665, { size: 48, color: C.white, align: 'left' });
    txt(ctx, '全部代码 + 完整制作细节', 1010, 735, { size: 38, color: '#9fb3c8', align: 'left' });
  });
  const bp = pop(t, tBye - 0.2, 0.5);
  around(ctx, 1250, 520, bp, bp, () => {
    asteroid(ctx, t, 1250, 820, 200);
    rose(ctx, t, 1360, 650, 0.9, { dome: 0.7 });
    prince(ctx, t, 1180, 630, 0.7, { pose: { armR: 2.6 + Math.sin(t * 10) * 0.3, elbR: 0.3 } });
    txt(ctx, '你想用 AI 造一个', 1250, 150, { size: 64, color: C.white, stroke: C.ink, sw: 10 });
    txt(ctx, '什么样的世界？', 1250, 240, { size: 72, color: C.gold, stroke: C.ink, sw: 12 });
  });
  confetti(ctx, t, at('bye', '下次见'));
}

export const scenesE = [
  { id: 'mixamo', from: S('c4') - 0.35, to: S('c5') - 0.35, draw: mixamoScene },
  { id: 'water', from: S('c5') - 0.35, to: S('recap') - 0.45, draw: waterScene },
  { id: 'outro', from: S('recap') - 0.45, to: 1e9, draw: outroScene, ownKitty: true },
];

export const eventsE = [
  { type: 'whoosh', t: S('c4') - 0.4, d: 0.4 },
  { type: 'scribble', t: at('c4', '关键词'), d: 1.1 },
  ...ACTIONS.map((_, i) => ({ type: 'pop', t: at('c4', '关键词') + 0.6 + i * 0.15, f: 700 + i * 100 })),
  ...ACTIONS.map((_, i) => ({ type: 'whoosh', t: at('c4', 'FBX') + i * 0.15, d: 0.6, from: 600, to: 2600, amp: 0.5 })),
  { type: 'ding', t: at('c4', '匹配') },
  { type: 'tada', t: at('c4', '接进去'), amp: 0.6 },
  { type: 'whoosh', t: S('c5') - 0.4, d: 0.4 },
  { type: 'buzz', t: at('c5', '没有') - 0.1 },
  { type: 'whoosh', t: at('c5b', 'IK'), d: 0.9, amp: 0.5 },
  { type: 'pop', t: at('c5b', '手指握持') - 0.15, f: 800 },
  ...[0, 1, 2, 3].map((i) => ({ type: 'tick', t: at('c5b', '反复微调') + i * 0.33, n: 84 })),
  ...['不穿模', '不脱手', '悬空'].map((w, i) => ({ type: 'note', t: at('c5c', w) - 0.1, n: [79, 84, 88][i] })),
  { type: 'whoosh', t: S('prince3') + 0.9, d: 1.4, from: 3000, to: 5000, amp: 0.4 },
  { type: 'sparkle', t: S('prince3') + 1.3 },
  { type: 'whoosh', t: S('recap') - 0.45, d: 0.45 },
  ...RECAP.map(([w], i) => ({ type: 'note', t: at('recap', w) - 0.2, n: [72, 76, 79, 84][i] })),
  { type: 'stamp', t: at('github', 'GitHub') - 0.2 },
  { type: 'boing', t: S('bye') - 0.2, amp: 0.6 },
  { type: 'tada', t: at('bye', '下次见') },
  { type: 'confetti', t: at('bye', '下次见') },
];
void W; void E; void burst; void star;
