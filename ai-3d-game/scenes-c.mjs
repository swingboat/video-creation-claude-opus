// Scenes 6–8: building the game scene — reference art, asset breakdown, Opus builds + blind-review agent.
import {
  C, EN, TOOL, S, E, at, prog, lerp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, arrow, burst, star, pill, header, mark, rand,
} from './lib.mjs';
import { bot } from './chars.mjs';
import { rose, volcano, lamp, appTile, cameraIcon } from './props.mjs';

// ---------- the reference painting (drawn in a 760×460 frame, centred) ----------
const groundY = (x) => 900 - Math.sqrt(760 * 760 - x * x);
const PROPS = [
  ['volcano', -250, (ctx, t, x, y, m) => volcano(ctx, t, x, y, 1.0, { mode: m })],
  ['volcano2', -110, (ctx, t, x, y, m) => volcano(ctx, t, x, y, 0.7, { mode: m, smoke: 0 })],
  ['rose', 110, (ctx, t, x, y, m) => rose(ctx, t, x, y, 1.1, { mode: m, dome: 1 })],
  ['lamp', 270, (ctx, t, x, y, m) => lamp(ctx, t, x, y, 0.95, { mode: m })],
];
// painting-space boxes for the asset breakdown
const BOXES = {
  volcano: [-320, 80, 140, 110], volcano2: [-160, 120, 100, 80], rose: [55, -40, 115, 165], lamp: [235, -70, 80, 210],
};

function paintMain(ctx, t) {
  const g = ctx.createLinearGradient(0, -230, 0, 230);
  g.addColorStop(0, '#1b1650'); g.addColorStop(1, '#5a3d8f');
  ctx.fillStyle = g; ctx.fillRect(-380, -230, 760, 460);
  for (let i = 0; i < 22; i++) star(ctx, -370 + rand(i + 3) * 740, -220 + rand(i + 8) * 260, 3 + rand(i) * 5, '#fff3c4', i);
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(-260, -140, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8a25c';
  ctx.beginPath(); ctx.arc(0, 900, 760, 0, Math.PI * 2); ctx.fill();
  for (const [, x, draw] of PROPS) draw(ctx, t, x, groundY(x) + 6, 'color');
}

function paintTop(ctx, t) {
  ctx.fillStyle = '#1b1650'; ctx.fillRect(-380, -230, 760, 460);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (let x = -380; x <= 380; x += 40) { ctx.beginPath(); ctx.moveTo(x, -230); ctx.lineTo(x, 230); ctx.stroke(); }
  for (let y = -230; y <= 230; y += 40) { ctx.beginPath(); ctx.moveTo(-380, y); ctx.lineTo(380, y); ctx.stroke(); }
  ctx.fillStyle = '#e8a25c'; ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI * 2); ctx.fill();
  const dot = (x, y, r, c, ring) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r + 14, 0, Math.PI * 2); ctx.stroke(); }
  };
  dot(-120, -40, 40, '#9b6bd1', '#ff7a59'); dot(-50, 70, 28, '#9b6bd1'); dot(70, -20, 18, '#ff4d6d', 'rgba(220,245,255,0.9)'); dot(140, 80, 16, '#ffe28a', 'rgba(255,220,120,0.5)');
}

function paintSide(ctx, t) {
  const g = ctx.createLinearGradient(0, -230, 0, 230);
  g.addColorStop(0, '#1b1650'); g.addColorStop(1, '#3d2c78');
  ctx.fillStyle = g; ctx.fillRect(-380, -230, 760, 460);
  ctx.fillStyle = '#b8743e'; ctx.beginPath(); ctx.ellipse(0, 120, 320, 120, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#e8a25c'; ctx.beginPath(); ctx.ellipse(0, 100, 320, 110, 0, 0, Math.PI * 2); ctx.fill();
  volcano(ctx, t, -170, 70, 0.9); volcano(ctx, t, -40, 140, 0.65, { smoke: 0 });
  rose(ctx, t, 90, 90, 0.9, { dome: 1 }); lamp(ctx, t, 210, 150, 0.8);
}

function painting(ctx, t, cx, cy, w, view, reveal = 1, label) {
  const k = w / 760;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(k, k);
  card(ctx, -392, -242, 784, 484, { fill: C.cream, r: 18, ew: 0, drop: 14 / k });
  ctx.save();
  ctx.beginPath(); ctx.rect(-380, -230, 760 * reveal, 460); ctx.clip();
  ({ main: paintMain, top: paintTop, side: paintSide })[view](ctx, t);
  ctx.restore();
  if (reveal > 0 && reveal < 1) { ctx.fillStyle = C.pink; ctx.fillRect(-380 + 760 * reveal - 6, -230, 12, 460); }
  ctx.restore();
  if (label) pill(ctx, label, cx, cy + 242 * k + 46, { size: 34, fill: C.white });
}

// ---------- scene 6: reference art ----------
function refScene(ctx, t) {
  header(ctx, t, S('sceneT'), '第二部分', '场景构建', C.sky);
  const tPaint = at('s1', '场景参考图');
  const reveal = easeIO(prog(t, tPaint - 0.3, tPaint + 1.2));
  const shrink = easeIO(prog(t, at('s1b', '其他角度') - 0.3, at('s1b', '其他角度') + 0.5));
  const show = pop(t, S('s1') - 0.2, 0.5);
  around(ctx, 960, 520, show, show, () => {
    painting(ctx, t, lerp(980, 400, shrink), lerp(500, 500, shrink), lerp(820, 480, shrink), 'main', reveal,
      shrink > 0.5 ? '满意的效果图' : null);
  });
  const ip = pop(t, S('s1') - 0.4, 0.5) * (1 - shrink);
  around(ctx, 320, 800, ip, ip, () => bot(ctx, t, 320, 840, 0.9, { color: TOOL.image.color, label: 'Image 2.5', tool: 'brush', talk: reveal > 0 && reveal < 1 ? 1 : 0, armUp: 0.5 }));
  [['画风', C.lilac], ['配色', C.pink], ['位置', C.gold]].forEach(([w, col], i) => {
    const p = pop(t, at('s1', w) - 0.15, 0.4) * (1 - shrink);
    around(ctx, 1600, 330 + i * 120, p, p, () => pill(ctx, `定${w}`, 1600, 330 + i * 120, { size: 44, fill: col }));
  });
  const pTop = pop(t, at('s1b', '俯视图') - 0.2, 0.5);
  around(ctx, 960, 500, pTop, pTop, () => painting(ctx, t, 960, 500, 480, 'top', 1, '俯视图 · 看布局'));
  const pSide = pop(t, at('s1b', '斜侧视图') - 0.2, 0.5);
  around(ctx, 1520, 500, pSide, pSide, () => painting(ctx, t, 1520, 500, 480, 'side', 1, '斜侧视图 · 看高度层次'));
  const sp = pop(t, at('s1b', '满意') - 0.1, 0.4) * (1 - shrink);
  around(ctx, 1340, 250, sp, sp, () => star(ctx, 1340, 250, 50, C.gold, t));
}

// ---------- scene 7: AI splits the assets ----------
const AC = 760, AY = 500, AW = 880, AK = AW / 760;
function assetScene(ctx, t) {
  painting(ctx, t, AC, AY, AW, 'main', 1);
  const tT = at('s2', 'Tripo'), tB = at('s2', 'Blender'), tMark = at('s2', '标出来');
  const flash = t > tMark && t < tMark + 0.9 ? 0.5 + 0.5 * Math.sin((t - tMark) * 25) : 1;
  Object.entries(BOXES).forEach(([, [x, y, w, h]], i) => {
    const p = easeOut(prog(t, tT + i * 0.12, tT + i * 0.12 + 0.35));
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= p * flash;
    ctx.strokeStyle = C.sky; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 40;
    ctx.strokeRect(AC + x * AK, AY + y * AK, w * AK, h * AK);
    ctx.restore();
    around(ctx, AC + (x + w / 2) * AK, AY + y * AK - 4, p, p, () => pill(ctx, 'Tripo', AC + (x + w / 2) * AK, AY + y * AK - 20, { size: 24, fill: C.sky, font: EN, pad: 14 }));
  });
  const bp = easeOut(prog(t, tB - 0.1, tB + 0.3));
  if (bp > 0) {
    ctx.save(); ctx.globalAlpha *= bp * flash;
    ctx.strokeStyle = TOOL.blender.color; ctx.lineWidth = 6; ctx.setLineDash([16, 10]);
    ctx.strokeRect(AC - 372 * AK, AY + 150 * AK, 744 * AK, 72 * AK);
    ctx.restore();
    around(ctx, AC, AY + 186 * AK, bp, bp, () => pill(ctx, 'Blender 直接搭：地面', AC, AY + 186 * AK, { size: 28, fill: TOOL.blender.color }));
  }
  const ok = pop(t, at('s2', '确认') - 0.1, 0.4);
  around(ctx, AC + 400 * AK, AY - 220 * AK, ok, ok, () => mark(ctx, AC + 400 * AK, AY - 220 * AK, true, 1.3));
  // right panel: the two lists, later the H3.1 tip
  const tH = S('s2b');
  const listA = 1 - prog(t, tH - 0.3, tH);
  const lp = pop(t, tT - 0.2, 0.45) * listA;
  around(ctx, 1560, 360, lp, lp, () => {
    card(ctx, 1330, 220, 460, 260, { fill: 'rgba(76,201,240,0.15)', edge: C.sky, ew: 4, r: 30, drop: 0 });
    txt(ctx, 'Tripo 单独生成', 1560, 275, { size: 42, color: C.sky });
    txt(ctx, '玫瑰 · 火山 · 路灯', 1560, 350, { size: 38 });
    txt(ctx, '（精细道具）', 1560, 415, { size: 30, color: 'rgba(255,255,255,0.7)' });
  });
  const lb = pop(t, tB - 0.2, 0.45) * listA;
  around(ctx, 1560, 640, lb, lb, () => {
    card(ctx, 1330, 520, 460, 240, { fill: 'rgba(245,121,42,0.15)', edge: TOOL.blender.color, ew: 4, r: 30, drop: 0 });
    txt(ctx, 'Blender 直接搭', 1560, 575, { size: 42, color: TOOL.blender.color });
    txt(ctx, '星球地面 · 简单形体', 1560, 650, { size: 38 });
    txt(ctx, '（规则几何）', 1560, 712, { size: 30, color: 'rgba(255,255,255,0.7)' });
  });
  const hp = pop(t, at('s2b', 'H3.1') - 0.2, 0.5);
  around(ctx, 1560, 480, hp, hp, () => {
    appTile(ctx, 1460, 400, 0.9, '3D', 'Tripo', C.sky, { codeSize: 52 });
    card(ctx, 1560, 350, 200, 90, { fill: C.gold, r: 45, ew: 5, drop: 6 });
    txt(ctx, 'H3.1', 1660, 397, { size: 52, font: EN, color: C.ink });
    rose(ctx, t, 1560, 760, 1.6, { mode: 'white', dome: 0 });
    const dp = pop(t, at('s2b', '细节') - 0.1, 0.4);
    around(ctx, 1560, 820, dp, dp, () => pill(ctx, '细节精度更高', 1560, 830, { size: 36, fill: C.mint }));
  });
}

// ---------- scene 8: Opus builds, a reviewer agent nitpicks ----------
const STAGE = { x: 1340, y: 620 };
const SLOTS = [['volcano', -200, -10, 1.1], ['rose', 90, 10, 1.3], ['lamp', 230, 40, 1.1]];
function stage(ctx) {
  const { x, y } = STAGE;
  ctx.fillStyle = '#b8743e'; ctx.beginPath(); ctx.ellipse(x, y + 30, 400, 150, 0, 0, Math.PI); ctx.fill();
  ctx.fillRect(x - 400, y, 800, 30);
  ctx.fillStyle = '#e8a25c'; ctx.beginPath(); ctx.ellipse(x, y, 400, 140, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(43,26,85,0.25)'; ctx.lineWidth = 2;
  for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(x, y, 400 * Math.cos(k * 0.22), 140, 0, 0, Math.PI * 2); ctx.stroke(); }
}

function buildScene(ctx, t) {
  const tPlace = at('s3', '摆放'), tScale = at('s3', '比例'), tPos = at('s3', '位置');
  const tCam = at('s3b', '多机位'), tDiff = at('s3b', '不一样'), tIter = at('s3b', '迭代');
  const rp = pop(t, S('s3') - 0.2, 0.45);
  around(ctx, 330, 330, rp, rp, () => painting(ctx, t, 330, 320, 420, 'main', 1, '参考图'));
  const gp = pop(t, at('s3', '3D道具') - 0.2, 0.45);
  const opx = 760, opy = 860;
  for (const s of SLOTS) s.pos = null;
  SLOTS.forEach(([name, dx, dy, s], i) => {
    const k = easeIO(prog(t, tPlace + i * 0.25 - 0.3, tPlace + i * 0.25 + 0.5));
    let x = lerp(190 + i * 140, STAGE.x + dx, k), y = lerp(720, STAGE.y + dy, k) - Math.sin(k * Math.PI) * 180;
    let sc = lerp(0.7, s, k) * (1 + 0.25 * Math.sin(prog(t, tScale, tScale + 0.8) * Math.PI * 3) * (1 - prog(t, tScale, tScale + 0.8)));
    if (name === 'lamp') {
      const fix = easeIO(prog(t, tIter, tIter + 0.6));
      x += lerp(90, 0, fix) * k; y += lerp(40, 0, fix) * k + Math.sin(prog(t, tPos, tPos + 0.5) * Math.PI) * -20;
    }
    if (k === 0 && gp <= 0) return;
    SLOTS[i].pos = [x, y, sc, k];
    if (k > 0.98) return;
    around(ctx, x, y, (k > 0 ? 1 : gp) * sc * 0.8, k > 0 ? 1 : gp, () => PROPS.find((p) => p[0] === name)[2](ctx, t, x, y, 'white'));
  });
  const sp = pop(t, tPlace - 0.6, 0.5);
  around(ctx, STAGE.x, STAGE.y, sp, sp, () => {
    stage(ctx);
    for (const [name, , , , ] of SLOTS) {
      const [x, y, sc, k] = SLOTS.find((q) => q[0] === name).pos ?? [0, 0, 0, 0];
      if (k > 0.98) around(ctx, x, y, sc * 0.8, 1, () => PROPS.find((p) => p[0] === name)[2](ctx, t, x, y, 'color'));
    }
  });
  const op = pop(t, at('s3', 'Opus') - 0.2, 0.45);
  around(ctx, opx, opy, op, op, () => bot(ctx, t, opx, opy, 0.9, { color: TOOL.opus.color, label: 'Opus 5.5', tool: 'wrench', talk: t < E('s3') ? 1 : 0, armUp: 0.5 }));
  const tiles = pop(t, at('s3', '操控') - 0.1, 0.4);
  around(ctx, 760, 450, tiles, tiles, () => {
    appTile(ctx, 680, 440, 0.6, 'B', '', TOOL.blender.color);
    appTile(ctx, 840, 440, 0.6, 'U', '', TOOL.unity.color);
  });
  // reviewer agent + cameras
  const rv = pop(t, at('s3b', '审查') - 0.2, 0.45);
  around(ctx, 1770, 880, rv, rv, () => bot(ctx, t, 1770, 900, 0.75, { color: C.mint, label: '审查 agent', tool: 'magnifier', mood: 'focus', talk: t > S('s3c') && t < E('s3c') ? 1 : 0, armUp: 0.7 }));
  [[1000, 380, 0.4], [1340, 300, 0], [1700, 380, -0.4]].forEach(([x, y, r], i) => {
    const p = pop(t, tCam + i * 0.12, 0.35);
    around(ctx, x, y, p, p, () => cameraIcon(ctx, x, y, 1, C.sky), r + Math.PI / 2);
  });
  const bl = pop(t, at('s3b', '盲审') - 0.1, 0.4);
  around(ctx, 1340, 200, bl, bl, () => pill(ctx, '多机位盲审', 1340, 200, { size: 42, fill: C.mint }));
  const lampPos = SLOTS[2].pos;
  if (lampPos) {
    const [lx, ly] = lampPos;
    const xp = pop(t, tDiff - 0.1, 0.35) * (1 - prog(t, tIter + 0.5, tIter + 0.7));
    around(ctx, lx + 60, ly - 180, xp, xp, () => mark(ctx, lx + 60, ly - 180, false));
    const cp = pop(t, tIter + 0.6, 0.35);
    around(ctx, lx + 60, ly - 180, cp, cp, () => mark(ctx, lx + 60, ly - 180, true));
  }
  const n = 1 + Math.floor(Math.max(0, t - tIter) * 2.5);
  const ip = pop(t, tIter - 0.1, 0.4);
  around(ctx, 1080, 820, ip, ip, () => pill(ctx, `迭代 #${Math.min(n, 9)}`, 1080, 820, { size: 38, fill: C.gold, font: EN }));
  const jp = pop(t, S('s3c') - 0.1, 0.4);
  around(ctx, 1640, 640, jp, jp, () => {
    card(ctx, 1470, 590, 340, 90, { fill: C.white, r: 45, ew: 0, drop: 0 });
    txt(ctx, '还差 1 像素！', 1640, 636, { size: 44, color: C.ink });
  });
  arrow(ctx, 500, 330, 640, 420, { color: 'rgba(255,255,255,0.6)', w: 6, head: 20, p: tiles });
}

export const scenesC = [
  { id: 'ref', from: S('sceneT') - 0.4, to: S('s2') - 0.35, draw: refScene },
  { id: 'assets', from: S('s2') - 0.35, to: S('s3') - 0.35, draw: assetScene },
  { id: 'build', from: S('s3') - 0.35, to: S('charT') - 0.4, draw: buildScene },
];

export const eventsC = [
  { type: 'whoosh', t: S('sceneT') - 0.45, d: 0.5 },
  { type: 'scribble', t: at('s1', '场景参考图') - 0.3, d: 1.4 },
  ...['画风', '配色', '位置'].map((w, i) => ({ type: 'pop', t: at('s1', w) - 0.15, f: 650 + i * 150 })),
  { type: 'sparkle', t: at('s1b', '满意') - 0.1 },
  { type: 'whoosh', t: at('s1b', '其他角度') - 0.3, d: 0.5 },
  { type: 'pop', t: at('s1b', '俯视图') - 0.2, f: 700 },
  { type: 'pop', t: at('s1b', '斜侧视图') - 0.2, f: 900 },
  { type: 'whoosh', t: S('s2') - 0.4, d: 0.4 },
  ...Object.keys(BOXES).map((_, i) => ({ type: 'tick', t: at('s2', 'Tripo') + i * 0.12, n: 84 + i * 2 })),
  { type: 'tick', t: at('s2', 'Blender') - 0.1, n: 79 },
  { type: 'ding', t: at('s2', '确认') - 0.1 },
  { type: 'stamp', t: at('s2b', 'H3.1') - 0.2 },
  { type: 'whoosh', t: S('s3') - 0.4, d: 0.4 },
  ...SLOTS.map((_, i) => ({ type: 'whoosh', t: at('s3', '摆放') + i * 0.25 - 0.3, d: 0.6, from: 600, to: 2400, amp: 0.6 })),
  ...SLOTS.map((_, i) => ({ type: 'pop', t: at('s3', '摆放') + i * 0.25 + 0.45, f: 500 + i * 150 })),
  { type: 'boing', t: at('s3', '比例'), amp: 0.6 },
  ...[0, 1, 2].map((i) => ({ type: 'tick', t: at('s3b', '多机位') + i * 0.12, n: 88 })),
  { type: 'buzz', t: at('s3b', '不一样') - 0.1 },
  { type: 'ding', t: at('s3b', '迭代') + 0.6 },
  { type: 'boing', t: S('s3c') - 0.1, amp: 0.8 },
];
