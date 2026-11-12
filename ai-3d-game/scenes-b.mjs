// Scenes 4–5: the five-tool relay (Fable → Image → Tripo → Opus → Astra) and the Blender / Unity toolbox.
import {
  C, EN, TOOL, S, at, prog, lerp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, star, pill, header,
} from './lib.mjs';
import { bot, prince } from './chars.mjs';
import { docIcon, picIcon, cubeIcon, codeIcon, bugIcon, appTile, termChip, asteroid } from './props.mjs';

// ---------- scene 4: relay ----------
const RELAY = [
  ['f1', 'fable', 'pen', (ctx, t, x, y) => docIcon(ctx, x, y, 1.1, TOOL.fable.color), ['写 PRD', '场景·人物·故事线']],
  ['f2', 'image', 'brush', (ctx, t, x, y) => picIcon(ctx, x, y, 1.1), ['画图', '场景 + 人物']],
  ['f3', 'tripo', null, (ctx, t, x, y) => cubeIcon(ctx, x, y, 1.15, TOOL.tripo.color, 0.6 + Math.sin(t * 1.5) * 0.25), ['变 3D', '3D 资产']],
  ['f4', 'opus', 'pen', (ctx, t, x, y) => codeIcon(ctx, x, y, 1.1, t - S('f4')), ['写代码', '核心代码']],
  ['f5', 'astra', 'wrench', (ctx, t, x, y) => bugIcon(ctx, x, y, 1.1), ['修 bug', '迭代优化']],
];
const SX = (i) => 420 + i * 320;

function relayScene(ctx, t) {
  header(ctx, t, S('flow'), '第一部分', '开发流程 · 五棒接力');
  RELAY.forEach(([id, key, tool, icon, [job, detail]], i) => {
    const x = SX(i), t0 = S(id);
    const p = pop(t, t0 - 0.2, 0.5);
    const active = t >= t0 - 0.2 && (i === 4 || t < S(RELAY[i + 1][0]) - 0.2);
    if (i > 0) arrow(ctx, SX(i - 1) + 95, 360, x - 95, 360, { color: 'rgba(255,255,255,0.5)', w: 6, head: 22, p: easeOut(prog(t, t0 - 0.3, t0 + 0.1)) });
    around(ctx, x, 560, p, p, () => {
      if (active) {
        const g = ctx.createRadialGradient(x, 560, 10, x, 560, 210);
        g.addColorStop(0, `${TOOL[key].color}55`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 220, 340, 440, 440);
      }
      icon(ctx, t, x, 360 + (active ? Math.sin(t * 6) * 6 : 0));
      bot(ctx, t, x, 750, 0.92, { color: TOOL[key].color, label: TOOL[key].name, tool, talk: active ? 1 : 0, armUp: active ? 0.4 : 0 });
      txt(ctx, job, x, 860, { size: 42, color: TOOL[key].color });
      txt(ctx, detail, x, 910, { size: 30, color: 'rgba(255,255,255,0.85)' });
    });
  });
  // baton star hops from station to station
  let bx = SX(0), by = 222;
  RELAY.forEach(([id], i) => {
    if (i === 0) return;
    const k = easeIO(prog(t, S(id) - 0.4, S(id) + 0.1));
    if (k > 0) { bx = lerp(SX(i - 1), SX(i), k); by = 222 - Math.sin(k * Math.PI) * 40; }
  });
  const sp = fadeIn(t, S('f1') - 0.2, 0.3);
  if (sp > 0) around(ctx, bx, by, sp, sp, () => star(ctx, bx, by, 34, C.gold, t * 2));
}

// ---------- scene 5: toolbox ----------
function toolsScene(ctx, t) {
  header(ctx, t, S('blender'), '准备', '工具配置', C.mint);
  // Blender column
  const L = 470;
  const bp = pop(t, at('blender', 'Blender') - 0.15, 0.45);
  around(ctx, L, 330, bp, bp, () => appTile(ctx, L, 300, 1, 'B', 'Blender', TOOL.blender.color));
  const items = [
    ['命令行版', (p) => termChip(ctx, L, 500, '$ blender --background', p)],
    ['优化', (p) => around(ctx, L, 580, p, p, () => pill(ctx, '优化 Tripo 模型', L, 580, { size: 36, fill: C.sky }))],
    ['整体建模', (p) => around(ctx, L, 660, p, p, () => pill(ctx, '完成整体建模', L, 660, { size: 36, fill: C.lilac }))],
    ['Auto-Rig', (p) => around(ctx, L, 750, p, p, () => {
      pill(ctx, 'Auto-Rig Pro', L - 40, 750, { size: 38, fill: TOOL.blender.color, font: EN });
      card(ctx, L + 125, 712, 130, 52, { fill: C.gold, r: 14, ew: 3, drop: 0 });
      txt(ctx, '付费插件', L + 190, 739, { size: 28, color: C.ink });
    }, -0.03)],
  ];
  for (const [w, draw] of items) draw(pop(t, at('blender', w) - 0.15, 0.4));
  const rp = pop(t, at('blender', '绑骨蒙皮') - 0.3, 0.45);
  around(ctx, 830, 880, rp, rp, () => {
    const wave = Math.sin(t * 4) * 0.4;
    prince(ctx, t, 830, 880, 0.48, { mode: 'white', bones: fadeIn(t, at('blender', '绑骨'), 0.4), pose: { armL: 1.2 + wave, armR: 0.4 - wave * 0.5 } });
  });
  // Unity column
  const R = 1400;
  const tU = S('unity'), tM = S('mcp');
  const up = pop(t, tU - 0.1, 0.45);
  const shake = t > at('mcp', '直接操作') ? Math.sin(t * 30) * 4 * (1 - prog(t, at('mcp', '直接操作'), at('mcp', '直接操作') + 0.6)) : 0;
  around(ctx, R, 330, up, up, () => appTile(ctx, R + shake, 300, 1, 'U', 'Unity', TOOL.unity.color));
  const packA = 1 - prog(t, tM - 0.3, tM + 0.1);
  const ep = pop(t, at('unity', '游戏引擎') - 0.15, 0.4) * packA;
  around(ctx, R, 500, ep, ep, () => pill(ctx, '游戏引擎', R, 500, { size: 38, fill: C.white }));
  const tPack = at('unity', '打包');
  const box = pop(t, tPack - 0.1, 0.4) * packA;
  ['场景', '人物', '交互动效'].forEach((w, i) => {
    const ip = pop(t, at('unity', w) - 0.1, 0.35) * packA;
    const k = easeIO(prog(t, tPack, tPack + 0.6));
    const x = lerp(R - 250 + i * 250, R, k), y = lerp(620, 760, k), s = lerp(1, 0.3, k);
    around(ctx, x, y, ip * s, ip * (1 - k * 0.9), () => {
      if (i === 0) asteroid(ctx, t, x, y, 48);
      else if (i === 1) prince(ctx, t, x, y + 60, 0.28);
      else for (let j = 0; j < 3; j++) star(ctx, x - 30 + j * 30, y + Math.sin(t * 6 + j) * 12, 20, [C.gold, C.pink, C.sky][j], t);
      txt(ctx, w, x, y + 80, { size: 30, color: C.white });
    });
  });
  around(ctx, R, 780, box, box, () => {
    card(ctx, R - 150, 730, 300, 100, { fill: C.hot, r: 24, ew: 5, edge: C.ink, drop: 8 });
    txt(ctx, '完整的游戏', R, 782, { size: 44, color: C.white });
  });
  burst(ctx, t, tPack + 0.55, R, 780, { r: 200 });
  // MCP bridge: Claude drives Unity directly
  const cp = pop(t, at('mcp', 'Unity命令行') - 0.15, 0.4);
  termChip(ctx, R + 230, 520, '$ unity (CLI)', cp);
  const pp = pop(t, at('mcp', 'Pipeline') - 0.15, 0.4);
  around(ctx, R + 230, 610, pp, pp, () => pill(ctx, 'Pipeline 包', R + 230, 610, { size: 36, fill: C.mint }));
  const cl = pop(t, at('mcp', 'Claude') - 0.2, 0.45);
  around(ctx, 1150, 880, cl, cl, () => bot(ctx, t, 1150, 880, 0.75, { color: TOOL.opus.color, label: 'Claude', talk: t > at('mcp', 'Claude') ? 1 : 0, armUp: 0.6 }));
  const tMcp = at('mcp', 'MCP');
  arrow(ctx, 1200, 640, R - 70, 420, { color: C.gold, w: 10, head: 32, p: easeOut(prog(t, tMcp - 0.2, tMcp + 0.4)), dash: [18, 14] });
  const mp = pop(t, tMcp, 0.4);
  around(ctx, 1260, 540, mp, mp, () => pill(ctx, 'Unity MCP', 1260, 540, { size: 34, fill: C.gold, font: EN }), -0.75);
  burst(ctx, t, at('mcp', '直接操作'), R, 300, { r: 200 });
}

export const scenesB = [
  { id: 'relay', from: S('flow') - 0.35, to: S('blender') - 0.3, draw: relayScene },
  { id: 'tools', from: S('blender') - 0.3, to: S('sceneT') - 0.4, draw: toolsScene },
];

export const eventsB = [
  { type: 'whoosh', t: S('flow') - 0.4, d: 0.45 },
  { type: 'pop', t: at('flow', '五棒接力') - 0.1, f: 700 },
  ...RELAY.map(([id], i) => ({ type: 'note', t: S(id) - 0.2, n: [72, 74, 76, 79, 84][i], amp: 0.9 })),
  ...RELAY.slice(1).map(([id]) => ({ type: 'whoosh', t: S(id) - 0.4, d: 0.5, from: 900, to: 3000, amp: 0.5 })),
  { type: 'whoosh', t: S('blender') - 0.35, d: 0.4 },
  { type: 'pop', t: at('blender', 'Blender') - 0.15, f: 600 },
  { type: 'tick', t: at('blender', '命令行版') - 0.15, n: 84 },
  { type: 'pop', t: at('blender', '优化') - 0.15, f: 750 },
  { type: 'pop', t: at('blender', '整体建模') - 0.15, f: 850 },
  { type: 'ding', t: at('blender', 'Auto-Rig') - 0.15 },
  { type: 'boing', t: at('blender', '绑骨蒙皮') - 0.3, amp: 0.6 },
  { type: 'pop', t: S('unity') - 0.1, f: 600 },
  { type: 'whoosh', t: at('unity', '打包'), d: 0.6 },
  { type: 'tada', t: at('unity', '打包') + 0.55, amp: 0.6 },
  { type: 'tick', t: at('mcp', 'Unity命令行') - 0.15, n: 84 },
  { type: 'pop', t: at('mcp', 'Pipeline') - 0.15, f: 800 },
  { type: 'boing', t: at('mcp', 'Claude') - 0.2, amp: 0.6 },
  { type: 'sparkle', t: at('mcp', '直接操作') },
];
