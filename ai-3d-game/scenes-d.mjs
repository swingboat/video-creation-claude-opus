// Scenes 9–11: character modelling — T-pose four views, Tripo Smart Mesh P2.0, Auto-Rig Pro rigging tests.
import {
  C, EN, TOOL, S, E, at, prog, lerp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, star, pill, header, mark, talkLevel,
} from './lib.mjs';
import { prince } from './chars.mjs';
import { appTile } from './props.mjs';

const TPOSE = { armL: Math.PI / 2, armR: Math.PI / 2, legL: 0.12, legR: 0.12 };

// ---------- scene 9: overview chain + T-pose sheet ----------
const CHAIN = [['Image 2.5 四视图', TOOL.image.color], ['Tripo P2.0', TOOL.tripo.color], ['Auto-Rig Pro', TOOL.blender.color], ['Mixamo 动作', C.lilac], ['Blender 微调', C.gold]];
const VIEWS = [['front', '正面', 1], ['side', '侧面', 1], ['back', '背面', 1], ['side', '另一侧', -1]];

function viewsScene(ctx, t) {
  header(ctx, t, S('charT'), '第三部分', '人物建模', C.pink);
  const t0 = at('charT', '人物建模');
  let x = 230;
  CHAIN.forEach(([label, col], i) => {
    const p = pop(t, t0 + i * 0.18, 0.4) * (1 - prog(t, S('c1') - 0.3, S('c1')));
    const w = 290;
    around(ctx, x + w / 2, 260, p, p, () => pill(ctx, label, x + w / 2, 260, { size: 30, fill: col }));
    if (i > 0) arrow(ctx, x - 52, 260, x - 14, 260, { color: 'rgba(255,255,255,0.6)', w: 5, head: 16, p });
    x += w + 75;
  });
  // the hero says hi before the sheet appears
  const hero = 1 - prog(t, at('c1', '四视图') - 0.6, at('c1', '四视图') - 0.2);
  if (hero > 0) around(ctx, 960, 870, hero, hero, () => prince(ctx, t, 960, 880, 1.15, { pose: { armR: 2.6 + Math.sin(t * 10) * 0.3, elbR: 0.3 } }));
  const sheet = pop(t, at('c1', '四视图') - 0.4, 0.5);
  around(ctx, 960, 560, sheet, sheet, () => {
    card(ctx, 180, 230, 1560, 640, { fill: '#f6f1ff', r: 28, ew: 6, edge: C.ink, drop: 14 });
    txt(ctx, 'T-pose 四视图', 300, 290, { size: 40, color: C.ink, align: 'left' });
    VIEWS.forEach(([view, label, flip], i) => {
      const vx = 380 + i * 390, vp = pop(t, at('c1', '四视图') + i * 0.15, 0.4);
      around(ctx, vx, 800, vp, vp, () => {
        ctx.save(); ctx.translate(vx, 0); ctx.scale(flip, 1);
        prince(ctx, t, 0, 800, 0.95, { view, pose: TPOSE, scarfWind: 0.3, tail: 0.45 });
        ctx.restore();
        txt(ctx, label, vx, 840, { size: 34, color: C.ink });
      });
    });
    // consistency guides across all four views
    const gp = easeOut(prog(t, at('c1', '统一') - 0.2, at('c1', '统一') + 0.6));
    if (gp > 0) {
      ctx.save();
      ctx.strokeStyle = C.hot; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
      for (const y of [800 - 0.95 * 390, 800 - 0.95 * 252, 800 - 0.95 * 150]) {
        ctx.beginPath(); ctx.moveTo(220, y); ctx.lineTo(220 + 1480 * gp, y); ctx.stroke();
      }
      ctx.restore();
      const mp = pop(t, at('c1', '统一') + 0.5, 0.4);
      around(ctx, 1660, 290, mp, mp, () => mark(ctx, 1660, 290, true, 1.1));
    }
  });
  // "every side looks cool!"
  const tp = S('prince2');
  ['正面', '侧面', '背面'].forEach((w, i) => {
    const sp = pop(t, at('prince2', w) - 0.1, 0.35) * (1 - prog(t, E('prince2') + 0.2, E('prince2') + 0.4));
    around(ctx, 380 + i * 390 + 90, 420, sp, sp, () => star(ctx, 380 + i * 390 + 90, 420, 40, C.gold, t * 2));
  });
  burst(ctx, t, at('prince2', '帅'), 960, 500, { r: 420, n: 14 });
  void tp;
}

// ---------- scene 10: Tripo Smart Mesh P2.0 ----------
function settingRow(ctx, y, label, p, draw) {
  around(ctx, 240, y, p, p, () => {
    txt(ctx, label, 250, y, { size: 36, color: C.ink, align: 'left' });
    draw();
  });
}

function tripoScene(ctx, t) {
  appTile(ctx, 300, 250, 0.7, '3D', '', C.sky, { codeSize: 52 });
  const bp = pop(t, at('c2', 'Smart') - 0.2, 0.45);
  around(ctx, 560, 250, bp, bp, () => {
    card(ctx, 380, 205, 400, 90, { fill: C.gold, r: 45, ew: 5, drop: 6 });
    txt(ctx, 'Smart Mesh P2.0', 580, 252, { size: 40, font: EN, color: C.ink });
  });
  // feature pills
  [['面数可控', '面数可控', C.mint], ['结构好编辑', '好编辑', C.lilac], ['方便绑骨动画', '绑骨', C.pink]].forEach(([label, w, col], i) => {
    const p = pop(t, at('c2', w) - 0.15, 0.4);
    around(ctx, 1080 + i * 290, 250, p, p, () => pill(ctx, label, 1080 + i * 290, 250, { size: 32, fill: col }));
  });
  // settings panel
  const pp = pop(t, S('c2b') - 0.3, 0.5);
  around(ctx, 500, 590, pp, pp, () => {
    card(ctx, 210, 340, 600, 510, { fill: '#f6f1ff', r: 30, ew: 6, edge: C.ink, drop: 12 });
    txt(ctx, '多视图生成 3D', 510, 395, { size: 42, color: C.hot });
    const tUp = at('c2b', '依次上传');
    settingRow(ctx, 490, '上传', pop(t, tUp - 0.2, 0.4), () => {
      for (let i = 0; i < 4; i++) {
        const f = fadeIn(t, tUp + i * 0.25, 0.2);
        card(ctx, 360 + i * 100, 450, 84, 84, { fill: f > 0.5 ? '#ffe9a8' : '#ffffff', r: 12, ew: 3, edge: C.ink, drop: 0 });
        if (f > 0) around(ctx, 402 + i * 100, 492, f, f, () => txt(ctx, ['正', '侧', '背', '侧'][i], 402 + i * 100, 494, { size: 34, color: C.ink }));
      }
    });
    settingRow(ctx, 600, '拓扑', pop(t, at('c2b', '四边形') - 0.2, 0.4), () => {
      pill(ctx, '四边形 Quad', 500, 600, { size: 32, fill: C.mint });
      mark(ctx, 700, 600, true, 0.6);
    });
    const tMax = at('c2b', '最高');
    settingRow(ctx, 700, '精度', pop(t, at('c2b', '精度') - 0.2, 0.4), () => {
      const k = easeOut(prog(t, tMax - 0.3, tMax + 0.4));
      card(ctx, 360, 690, 360, 20, { fill: '#d9d3ee', r: 10, ew: 0, drop: 0 });
      card(ctx, 360, 690, 360 * lerp(0.35, 1, k), 20, { fill: C.hot, r: 10, ew: 0, drop: 0 });
      ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(360 + 360 * lerp(0.35, 1, k), 700, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (k > 0.9) txt(ctx, 'MAX', 740, 650, { size: 28, font: EN, color: C.hot });
    });
    settingRow(ctx, 790, '模型', pop(t, tMax + 0.3, 0.4), () => pill(ctx, 'P2.0', 420, 790, { size: 32, fill: C.gold, font: EN }));
  });
  // the generated model
  const tGen = at('c2', '3D人物');
  const mp = pop(t, tGen - 0.2, 0.5);
  const tTex = at('c2c', 'Texture');
  const tex = easeIO(prog(t, tTex - 0.1, tTex + 0.9));
  around(ctx, 1300, 880, mp, mp, () => {
    if (tex < 1) prince(ctx, t, 1300, 900, 1.25, { mode: 'wire', view: 'front', pose: TPOSE, scarfWind: 0.3 });
    if (tex > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(900, 900 - 560 * tex - 40, 800, 560 * tex + 80); ctx.clip();
      prince(ctx, t, 1300, 900, 1.25, { view: 'front', pose: TPOSE, scarfWind: 0.3 });
      ctx.restore();
      if (tex < 1) { ctx.fillStyle = C.pink; ctx.fillRect(950, 900 - 560 * tex - 40, 700, 8); }
    }
  });
  const wp = pop(t, at('c2c', '网格整齐') - 0.1, 0.4) * (1 - prog(t, tTex, tTex + 0.3));
  around(ctx, 1640, 420, wp, wp, () => { pill(ctx, '白模网格整齐', 1640, 420, { size: 34, fill: C.white }); mark(ctx, 1790, 420, true, 0.6); });
  const tp = pop(t, tTex - 0.15, 0.4);
  around(ctx, 1640, 420, tp, tp, () => pill(ctx, 'Texture 贴图', 1640, 420, { size: 34, fill: C.pink, font: EN }));
  // bad mesh → edit mesh
  const tBad = at('c2c', '形状不对'), tFix = at('c2c', '局部重新生成');
  const bad = pop(t, tBad - 0.2, 0.45);
  around(ctx, 1700, 860, bad, bad, () => {
    card(ctx, 1560, 560, 290, 340, { fill: 'rgba(255,255,255,0.1)', edge: 'rgba(255,255,255,0.4)', ew: 3, r: 24, drop: 0 });
    prince(ctx, t, 1705, 860, 0.62, { mode: 'white', pose: TPOSE, scarfWind: 0 });
    const fix = easeOut(prog(t, tFix, tFix + 0.7));
    const lump = 1 - fix;
    if (lump > 0) {
      ctx.fillStyle = 'rgba(255,77,109,0.85)';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, r = (24 + (i % 2) * 14) * lump;
        ctx.lineTo(1760 + Math.cos(a) * r, 682 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }
    const ep = pop(t, at('c2c', 'edit') - 0.1, 0.4);
    around(ctx, 1760, 682, ep, ep, () => {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(1760, 682, 56, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    });
    pill(ctx, 'edit mesh', 1705, 600, { size: 28, fill: C.gold, font: EN });
    if (fix > 0.9) mark(ctx, 1810, 880, true, 0.7);
  });
  burst(ctx, t, tFix + 0.4, 1760, 682, { r: 120, n: 8, size: 16 });
}

// ---------- scene 11: Auto-Rig Pro ----------
function rigScene(ctx, t) {
  appTile(ctx, 290, 250, 0.7, 'B', '', TOOL.blender.color);
  const ap = pop(t, at('c3', 'Auto-Rig') - 0.2, 0.4);
  around(ctx, 520, 250, ap, ap, () => pill(ctx, 'Auto-Rig Pro', 520, 250, { size: 40, fill: TOOL.blender.color, font: EN }));
  const tB = at('c3', '绑骨'), tJ = at('c3', '关节');
  const tUp = at('c3b', '抬手'), tLeg = at('c3b', '弯腿'), tTurn = at('c3b', '转身');
  const raise = easeIO(prog(t, tUp - 0.1, tUp + 0.4)) * (1 - easeIO(prog(t, tLeg - 0.2, tLeg + 0.2)));
  const bend = easeIO(prog(t, tLeg - 0.1, tLeg + 0.35)) * (1 - easeIO(prog(t, tTurn - 0.2, tTurn + 0.2)));
  const turnK = prog(t, tTurn, tTurn + 1.6);
  const views = ['front', 'q', 'side', 'back', 'front'];
  const view = turnK > 0 && turnK < 1 ? views[Math.floor(turnK * 5)] : 'front';
  const pose = { armL: 0.15 + raise * 2.7, armR: 0.15 + raise * 2.7, legL: 0.06 + bend * 0.55, legR: 0.06 + bend * 0.55, kneeL: -bend * 1.1, kneeR: -bend * 1.1 };
  const bones = fadeIn(t, tB - 0.1, 0.6);
  const pulse = t > tJ && t < tJ + 1 ? 0.75 + 0.25 * Math.sin((t - tJ) * 20) : 1;
  around(ctx, 960, 900, 1, 1, () => prince(ctx, t, 960, 900 + bend * 50, 1.3, { view, pose, bones: bones * pulse }));
  burst(ctx, t, tJ, 960, 560, { r: 300, n: 12, size: 18, colors: [C.sky] });
  // checklist: tests (right) and problems fixed (left)
  [['抬手', tUp], ['弯腿', tLeg], ['转身', tTurn]].forEach(([label, tt], i) => {
    const p = pop(t, tt - 0.15, 0.4);
    around(ctx, 1560, 400 + i * 120, p, p, () => {
      pill(ctx, `测试 ${label}`, 1560, 400 + i * 120, { size: 40, fill: C.sky });
      if (t > tt + 0.6) mark(ctx, 1720, 400 + i * 120, true, 0.7);
    });
  });
  const fixed = t > E('c3b') - 0.2;
  [['变形', '变形'], ['拉扯', '拉扯'], ['穿模', '穿模']].forEach(([label, w], i) => {
    const p = pop(t, at('c3b', w) - 0.15, 0.4);
    around(ctx, 380, 420 + i * 120, p, p, () => {
      pill(ctx, label, 380, 420 + i * 120, { size: 40, fill: fixed ? C.ok : C.no, color: C.white });
      if (fixed) mark(ctx, 500, 420 + i * 120, true, 0.6);
    });
  });
  const fp = pop(t, E('c3b') - 0.2, 0.4);
  around(ctx, 380, 300, fp, fp, () => txt(ctx, '全部修正！', 380, 310, { size: 44, color: C.mint }));
  void talkLevel; void easeOut;
}

export const scenesD = [
  { id: 'views', from: S('charT') - 0.4, to: S('c2') - 0.35, draw: viewsScene },
  { id: 'tripo', from: S('c2') - 0.35, to: S('c3') - 0.35, draw: tripoScene },
  { id: 'rig', from: S('c3') - 0.35, to: S('c4') - 0.35, draw: rigScene },
];

export const eventsD = [
  { type: 'whoosh', t: S('charT') - 0.45, d: 0.5 },
  ...CHAIN.map((_, i) => ({ type: 'note', t: at('charT', '人物建模') + i * 0.18, n: [72, 76, 79, 84, 88][i], amp: 0.7 })),
  { type: 'whoosh', t: at('c1', '四视图') - 0.4, d: 0.4 },
  ...VIEWS.map((_, i) => ({ type: 'pop', t: at('c1', '四视图') + i * 0.15, f: 600 + i * 120 })),
  { type: 'scribble', t: at('c1', '统一') - 0.2, d: 0.7 },
  { type: 'ding', t: at('c1', '统一') + 0.5 },
  ...['正面', '侧面', '背面'].map((w, i) => ({ type: 'note', t: at('prince2', w) - 0.1, n: [84, 88, 91][i] })),
  { type: 'sparkle', t: at('prince2', '帅') },
  { type: 'whoosh', t: S('c2') - 0.4, d: 0.4 },
  { type: 'stamp', t: at('c2', 'Smart') - 0.2 },
  { type: 'boing', t: at('c2', '3D人物') - 0.2, amp: 0.6 },
  ...[0, 1, 2, 3].map((i) => ({ type: 'tick', t: at('c2b', '依次上传') + i * 0.25, n: 84 + i * 2 })),
  { type: 'whoosh', t: at('c2b', '最高') - 0.3, d: 0.6, from: 400, to: 3000, amp: 0.6 },
  { type: 'whoosh', t: at('c2c', 'Texture') - 0.1, d: 0.9, from: 2400, to: 600 },
  { type: 'buzz', t: at('c2c', '形状不对') - 0.1 },
  { type: 'sparkle', t: at('c2c', '局部重新生成') + 0.4 },
  { type: 'whoosh', t: S('c3') - 0.4, d: 0.4 },
  { type: 'boing', t: at('c3', '绑骨') - 0.1, amp: 0.6 },
  { type: 'ding', t: at('c3', '关节') },
  { type: 'boing', t: at('c3b', '抬手'), amp: 0.5 },
  { type: 'boing', t: at('c3b', '弯腿'), amp: 0.5 },
  { type: 'whoosh', t: at('c3b', '转身'), d: 1.4, amp: 0.6 },
  { type: 'tada', t: E('c3b') - 0.2, amp: 0.6 },
];
