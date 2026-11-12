// Scenes 1–3: hello from Kitty, what Sac built, "AI did most of the work", and the three parts of the post.
import {
  C, EN, S, at, prog, lerp, easeIO, easeOut, pop, fadeIn,
  txt, card, around, burst, talkLevel, measure,
} from './lib.mjs';
import { kitty, prince } from './chars.mjs';
import { asteroid, rose, volcano, lamp, codeIcon, bugIcon } from './props.mjs';

// ---------- scene 1: hook + the post + the game ----------
function postCard(ctx, t, x, y, sc, a) {
  around(ctx, x, y, sc, a, () => {
    card(ctx, x - 420, y - 210, 840, 420, { fill: '#ffffff', r: 36, ew: 0, drop: 14 });
    ctx.fillStyle = '#ffd6e4'; ctx.beginPath(); ctx.arc(x - 340, y - 130, 40, 0, Math.PI * 2); ctx.fill();
    txt(ctx, 'S', x - 340, y - 128, { size: 44, font: EN, color: C.hot });
    txt(ctx, 'Sac', x - 280, y - 145, { size: 38, font: EN, color: C.ink, align: 'left' });
    txt(ctx, '@Saccc_c · 2026-10-15', x - 280, y - 105, { size: 26, font: EN, color: '#8a84a8', align: 'left' });
    txt(ctx, '手把手教你用 Opus 5.5 / Astra', x - 360, y - 20, { size: 46, color: C.ink, align: 'left' });
    txt(ctx, '+ Tripo 制作 3D 游戏', x - 360, y + 46, { size: 46, color: C.ink, align: 'left' });
    ctx.fillStyle = '#ece8f8'; ctx.fillRect(x - 360, y + 110, 720, 4);
    txt(ctx, '1、流程和准备   2、场景构建   3、人物建模', x - 360, y + 160, { size: 30, color: '#6a6290', align: 'left' });
  });
}

function planetWorld(ctx, t, cx, cy, r, walk) {
  asteroid(ctx, t, cx, cy, r);
  const items = [[-0.95, (x, y) => volcano(ctx, t, x, y, 0.8)], [1.0, (x, y) => rose(ctx, t, x, y, 1.0, { dome: 0.8 })],
    [-1.45, (x, y) => lamp(ctx, t, x, y, 0.75)]];
  for (const [th, draw] of items) {
    ctx.save(); ctx.translate(cx + Math.sin(th) * r * 0.97, cy - Math.cos(th) * r * 0.97); ctx.rotate(th);
    draw(0, 0); ctx.restore();
  }
  const th = Math.sin(walk) * 0.45;
  ctx.save(); ctx.translate(cx + Math.sin(th) * r, cy - Math.cos(th) * r); ctx.rotate(th);
  const step = Math.sin(walk * 6) * 0.35;
  prince(ctx, t, 0, 0, 0.75, { pose: { legL: 0.06 + step, legR: 0.06 - step, armL: 0.2 - step * 0.6, armR: 0.2 + step * 0.6 } });
  ctx.restore();
}

function introScene(ctx, t) {
  const tStory = S('story');
  const slide = easeIO(prog(t, tStory - 0.2, tStory + 0.6));
  kitty(ctx, t, lerp(560, 330, slide), 960, lerp(1.25, 0.95, slide), { talk: talkLevel(t, ['hook', 'story']), wave: t < S('hook') + 1.6 ? 1 : 0, point: t > tStory + 0.6 ? 1 : 0 });
  // the post itself
  const pp = pop(t, at('hook', '帖子') - 0.3, 0.5) * (1 - slide);
  postCard(ctx, t, 1250, 480, pp, pp);
  // the little prince's planet becomes a 3D game
  const tP = at('story', '小王子');
  const gp = pop(t, tP - 0.2, 0.6);
  const walk = Math.max(0, t - tP) * 0.9;
  around(ctx, 1180, 700, gp, gp, () => {
    ctx.save();
    ctx.fillStyle = 'rgba(255,240,200,0.08)';
    ctx.beginPath(); ctx.arc(1180, 700, 330, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    planetWorld(ctx, t, 1180, 720, 220, walk);
  });
  const tp = pop(t, at('story', '星际旅行') - 0.1, 0.45);
  around(ctx, 1180, 190, tp, tp, () => txt(ctx, '《小王子》星际旅行', 1180, 190, { size: 72, color: C.gold, stroke: C.ink, sw: 12 }));
  const sp = pop(t, at('story', '3D') - 0.1, 0.4);
  around(ctx, 1560, 300, sp, sp, () => {
    card(ctx, 1440, 250, 260, 100, { fill: C.hot, r: 50, ew: 5, edge: C.ink, drop: 8 });
    txt(ctx, '3D 游戏', 1570, 302, { size: 50, color: C.white });
  }, -0.12);
  // views counter
  const tV = at('story', '三百万');
  const vp = pop(t, tV - 0.4, 0.4);
  const n = Math.round(300 * easeOut(prog(t, tV - 0.4, tV + 0.6)));
  around(ctx, 820, 330, vp, vp, () => {
    card(ctx, 650, 280, 340, 100, { fill: 'rgba(255,255,255,0.95)', r: 50, ew: 0, drop: 8 });
    txt(ctx, `近 ${n} 万浏览`, 820, 332, { size: 46, color: C.ink });
  });
  burst(ctx, t, tV + 0.5, 820, 330, { r: 240 });
  // prince speaks
  const bp = pop(t, S('prince1') - 0.1, 0.35) * (1 - prog(t, S('ai') - 0.6, S('ai') - 0.3));
  around(ctx, 1460, 470, bp, bp, () => {
    card(ctx, 1380, 400, 330, 90, { fill: C.white, r: 45, ew: 0, drop: 0 });
    txt(ctx, '走来走去啦！', 1545, 447, { size: 44, color: C.ink });
  });
}

// ---------- scene 2: AI did most of the work ----------
const JOBS = [
  ['场景搭建', '场景', (ctx, t, x, y) => { asteroid(ctx, t, x, y + 10, 62); rose(ctx, t, x + 10, y - 44, 0.45); }],
  ['人物制作', '人物', (ctx, t, x, y) => prince(ctx, t, x, y + 75, 0.4)],
  ['代码开发', '代码', (ctx, t, x, y) => codeIcon(ctx, x, y, 1.1, t)],
  ['调试', '调试', (ctx, t, x, y) => bugIcon(ctx, x, y + Math.sin(t * 9) * 6, 1.4)],
];

function aiScene(ctx, t) {
  const tAI = at('ai', 'AI');
  JOBS.forEach(([label, w, draw], i) => {
    const x = 330 + i * 420, y = 470;
    const p = pop(t, at('ai', w) - 0.15, 0.45);
    around(ctx, x, y, p, p, () => {
      card(ctx, x - 175, y - 200, 350, 380, { fill: 'rgba(255,255,255,0.1)', edge: 'rgba(255,255,255,0.35)', ew: 3, r: 36, drop: 0 });
      draw(ctx, t, x, y - 40);
      txt(ctx, label, x, y + 120, { size: 52, color: C.white });
    });
    const sp = pop(t, tAI + i * 0.08, 0.35);
    around(ctx, x + 110, y - 160, sp * 1.0, sp, () => {
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(x + 110, y - 160, 54, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.stroke();
      txt(ctx, 'AI', x + 110, y - 157, { size: 54, font: EN, color: C.ink });
    }, 0.2);
  });
  const bp = pop(t, tAI + 0.3, 0.5);
  around(ctx, 960, 850, bp, bp, () => txt(ctx, '主要工作，都交给 AI！', 960, 850, { size: 64, color: C.gold, stroke: C.ink, sw: 12 }));
}

// ---------- scene 3: three parts ----------
const PARTS = [['1', '开发流程和准备', '开发流程', C.lilac], ['2', '场景构建', '场景构建', C.sky], ['3', '人物建模', '人物建模', C.pink]];
function partsScene(ctx, t) {
  PARTS.forEach(([n, label, w, col], i) => {
    const x = 400 + i * 560, y = 470;
    const p = pop(t, at('parts', w) - 0.15, 0.45);
    around(ctx, x, y, p, p, () => {
      card(ctx, x - 230, y - 190, 460, 380, { fill: C.cream, r: 40, ew: 6, edge: C.ink, drop: 14 });
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - 60, 80, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.stroke();
      txt(ctx, n, x, y - 56, { size: 96, font: EN, color: C.ink });
      txt(ctx, label, x, y + 100, { size: measure(ctx, label, 56) > 380 ? 46 : 56, color: C.ink });
    }, (i - 1) * 0.04);
  });
  const fp = fadeIn(t, at('parts', '三部分'), 0.3);
  around(ctx, 960, 170, 1, fp, () => txt(ctx, '帖子分三部分', 960, 170, { size: 64, color: C.gold }));
}

export const scenesA = [
  { id: 'intro', from: 0, to: S('ai') - 0.3, draw: introScene, ownKitty: true },
  { id: 'ai', from: S('ai') - 0.3, to: S('parts') - 0.3, draw: aiScene },
  { id: 'parts', from: S('parts') - 0.3, to: S('flow') - 0.35, draw: partsScene },
];

export const eventsA = [
  { type: 'sparkle', t: 0.6 },
  { type: 'pop', t: at('hook', '帖子') - 0.3, f: 600 },
  { type: 'whoosh', t: S('story') - 0.2, d: 0.5 },
  { type: 'boing', t: at('story', '小王子') - 0.2, amp: 0.7 },
  { type: 'stamp', t: at('story', '3D') - 0.05 },
  { type: 'tada', t: at('story', '三百万'), amp: 0.8 },
  { type: 'pop', t: S('prince1') - 0.1, f: 900 },
  { type: 'whoosh', t: S('ai') - 0.35, d: 0.4 },
  ...JOBS.map(([, w], i) => ({ type: 'pop', t: at('ai', w) - 0.15, f: 600 + i * 120 })),
  ...JOBS.map((_, i) => ({ type: 'stamp', t: at('ai', 'AI') + i * 0.08 })),
  { type: 'whoosh', t: S('parts') - 0.35, d: 0.4 },
  ...PARTS.map(([, , w], i) => ({ type: 'note', t: at('parts', w) - 0.15, n: [76, 79, 84][i] })),
];
