// Track 02 · 1996: the star factory blueprint, the debut conveyor, the trainee file, and "Hallyu" across Asia.
import {
  W, H, ERA, S, at, atEnd, CH, prog, lerp, easeIO, easeOut, pop, fadeIn, rand,
  txt, around, rise, label, drawLine, measure, rgba, SERIF, SERIF_B, SANS, COND, ITAL, MONO, BLACK,
} from './lib.mjs';
import { globe, arc3d, project } from './props.mjs';
import { figure, pose, group } from './people.mjs';

const P = ERA.c96;

function blueprint(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(P.acc, 0.08); ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = rgba(P.acc, 0.16);
  for (let x = 0; x < W; x += 200) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 200) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

// ---------- 1. can success be copied? ----------
function factoryScene(ctx, t) {
  blueprint(ctx, t);
  const tq = S('factory') - 0.1, tc = at('factory', '复制');
  // the word "复制" photocopies itself
  const copies = Math.max(0, Math.floor((t - tc) / 0.12));
  for (let k = Math.min(copies, 4); k >= 1; k--) {
    txt(ctx, '复制', 1180 + k * 26, 330 + k * 22, { size: 150, font: SERIF, color: rgba(P.acc, 0.5 - k * 0.1) });
  }
  rise(ctx, '成功能不能被', 240, 330, t, tq, { size: 150, font: SERIF, color: P.ink, align: 'left' });
  rise(ctx, '复制', 1180, 330, t, tq + 0.15, { size: 150, font: SERIF, color: P.acc2, align: 'left' });
  rise(ctx, '？', 1500, 330, t, tq + 0.2, { size: 150, font: SERIF, color: P.ink, align: 'left' });
  // factory outline drawn like a blueprint
  const tf = at('factory', '娱乐公司') - 0.1;
  const p = easeIO(prog(t, tf, tf + 1.6));
  const roof = [[360, 900], [360, 700], [520, 600], [520, 700], [680, 600], [680, 700], [840, 600], [840, 700], [1000, 600], [1000, 900]];
  drawLine(ctx, roof, p, { color: P.acc, w: 5 });
  drawLine(ctx, [[1000, 900], [1000, 520], [1080, 520], [1080, 900], [360, 900]], prog(p, 0.4, 1), { color: P.acc, w: 5 });
  label(ctx, 'ENTERTAINMENT CO.  ·  FIG. 1', 360, 960, P.acc, { a: fadeIn(t, tf + 0.6), size: 22 });
  // stars puff out of the chimney once "造星" is said
  const ts = at('factory', '造星');
  for (let i = 0; i < 8; i++) {
    const d = t - ts - i * 0.25;
    if (d < 0) continue;
    const y = 500 - d * 140, x = 1040 + Math.sin(d * 2 + i) * 30 + d * 40;
    if (y < 440) continue;
    star(ctx, x, y, 22 + d * 6, P.acc2, d);
  }
  const tl = at('factory', '流程') - 0.1;
  rise(ctx, '把造星变成一套流程', 1180, 760, t, tl, { size: 64, font: SERIF, color: P.ink, align: 'left' });
  drawLine(ctx, [[1190, 820], [1760, 820]], easeOut(prog(t, tl + 0.4, tl + 1.0)), { color: P.acc2, w: 6 });
}

function star(ctx, x, y, r, color, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- 2. the debut conveyor ----------
const STATIONS = [['选人', 'CASTING'], ['训练', 'TRAINING'], ['写歌', 'SONGS'], ['编舞', 'CHOREO']];
function conveyorScene(ctx, t) {
  blueprint(ctx, t);
  const t0 = S('hot') - 0.1;
  txt(ctx, '1996', 140, 190, { size: 170, font: COND, color: P.acc, align: 'left', a: fadeIn(t, t0, 0.3) });
  rise(ctx, 'H.O.T. 出道', 560, 196, t, at('hot', 'H.O.T.') - 0.1, { size: 92, font: SERIF, color: P.ink, align: 'left' });
  // belt
  const by = 830;
  ctx.fillStyle = '#1b2f38'; ctx.fillRect(80, by, 1500, 40);
  ctx.fillStyle = rgba(P.acc, 0.5);
  for (let x = 80 + ((t * 120) % 60); x < 1580; x += 60) ctx.fillRect(x, by + 6, 30, 6);
  for (let x = 120; x < 1580; x += 120) { ctx.fillStyle = '#0b1419'; ctx.beginPath(); ctx.arc(x, by + 54, 16, 0, Math.PI * 2); ctx.fill(); }
  STATIONS.forEach(([zh, en], i) => {
    const x = 230 + i * 360, tw = at('hot', zh) - 0.1, on = fadeIn(t, tw, 0.25);
    ctx.fillStyle = on > 0 ? rgba(P.acc, 0.15 + on * 0.25) : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x - 130, 380, 260, 200);
    ctx.strokeStyle = on > 0 ? P.acc : rgba(P.acc, 0.3); ctx.lineWidth = 3; ctx.strokeRect(x - 130, 380, 260, 200);
    txt(ctx, zh, x, 460, { size: 70, font: SERIF, color: on > 0 ? P.ink : rgba(P.ink, 0.4) });
    txt(ctx, en, x, 530, { size: 26, font: MONO, color: P.acc, track: 4, a: 0.4 + on * 0.6 });
    ctx.fillStyle = rgba(P.acc, 0.25 + on * 0.5); ctx.fillRect(x - 6, 580, 12, 180 * (0.3 + 0.7 * on));
  });
  // trainees ride the belt
  for (let i = 0; i < 9; i++) {
    const x = 60 + ((t - t0) * 150 + i * 170) % 1500;
    figure(ctx, x, by, 0.33, pose('idle', 'step', 0.5 + 0.5 * Math.sin(t * 6 + i)), { color: '#0a1216', rim: P.acc, hair: i % 3 ? 'short' : 'cap', cap: i % 3 === 0 });
  }
  // the debut stage at the end of the line
  const td = at('hot', '统一设计') - 0.2, dp = fadeIn(t, td, 0.4);
  ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * dp;
  ctx.fillStyle = rgba(P.acc2, 0.18 * dp); ctx.fillRect(1600, 300, 300, 570);
  txt(ctx, 'DEBUT', 1750, 360, { size: 60, font: COND, color: P.acc2, track: 8 });
  group(ctx, t, 1750, 860, 220, 5, 0.42, { bpm: 118, poses: ['armsUp', 'point'], color: '#0a1216', rim: P.acc2, sync: 1 });
  ctx.restore();
  around(ctx, 1240, 300, pop(t, td + 0.2, 0.4), fadeIn(t, td + 0.2), () => {
    ctx.strokeStyle = P.acc2; ctx.lineWidth = 6; ctx.strokeRect(1060, 255, 360, 90);
    txt(ctx, '公司统一设计', 1240, 302, { size: 52, font: SERIF_B, color: P.acc2 });
  }, -0.06);
}

// ---------- 3. the trainee file ----------
const SKILLS = [['唱歌', 'VOCAL', 0.86], ['跳舞', 'DANCE', 0.93], ['外语', 'LANGUAGE', 0.71]];
function traineeScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.02); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(232, 172, 1470, 760);
  ctx.fillStyle = P.paper; ctx.fillRect(220, 160, 1470, 760);
  ctx.fillStyle = P.acc; ctx.fillRect(220, 160, 1470, 16);
  txt(ctx, '练习生档案', 290, 250, { size: 64, font: SERIF, color: '#0e1d24', align: 'left' });
  txt(ctx, 'TRAINEE FILE  No. 0427', 1630, 250, { size: 28, font: MONO, color: '#4d6a6a', align: 'right', track: 3 });
  ctx.fillStyle = '#c3d3cd'; ctx.fillRect(290, 320, 360, 460);
  figure(ctx, 470, 860, 0.95, pose('idle'), { color: '#0e1d24', hair: 'pony' });
  ctx.fillStyle = P.paper; ctx.fillRect(290, 780, 360, 120);
  txt(ctx, 'PHOTO', 470, 820, { size: 22, font: MONO, color: '#4d6a6a', track: 4 });
  // years of practice
  const ty = at('trainee', '好几年') - 0.3;
  const yrs = Math.min(5, Math.floor(Math.max(0, t - ty) / 0.22) + (t > ty ? 1 : 0));
  txt(ctx, '练习时长', 760, 370, { size: 40, font: SANS, color: '#4d6a6a', align: 'left' });
  for (let k = 0; k < 5; k++) {
    const on = k < yrs;
    ctx.fillStyle = on ? '#0e1d24' : '#c3d3cd'; ctx.fillRect(960 + k * 120, 335, 100, 70);
    txt(ctx, `${k + 1}年`, 1010 + k * 120, 371, { size: 32, font: SANS, color: on ? P.acc2 : '#7f9894' });
  }
  if (yrs >= 5) txt(ctx, '+', 1590, 368, { size: 70, font: BLACK, color: '#0e1d24' });
  SKILLS.forEach(([zh, en, v], i) => {
    const y = 520 + i * 130, tw = at('trainee', zh) - 0.1, p = easeOut(prog(t, tw, tw + 0.8));
    txt(ctx, zh, 760, y, { size: 48, font: SERIF_B, color: '#0e1d24', align: 'left' });
    txt(ctx, en, 760, y + 46, { size: 20, font: MONO, color: '#4d6a6a', align: 'left', track: 3 });
    ctx.fillStyle = '#c3d3cd'; ctx.fillRect(960, y - 20, 640, 40);
    ctx.fillStyle = i === 1 ? P.acc2 : P.acc; ctx.fillRect(960, y - 20, 640 * v * p, 40);
    if (p > 0) txt(ctx, `${Math.round(v * 100 * p)}`, 1620, y, { size: 36, font: COND, color: '#0e1d24', align: 'left' });
  });
  const tn = at('trainee', '一样都不能少') - 0.1, sp = prog(t, tn, tn + 0.18);
  if (sp > 0) around(ctx, 1480, 862, lerp(2, 1, easeOut(sp)), sp, () => {
    ctx.strokeStyle = '#c4553a'; ctx.lineWidth = 7; ctx.strokeRect(1320, 817, 320, 90);
    txt(ctx, '缺一不可', 1480, 864, { size: 60, font: SERIF, color: '#c4553a' });
  }, -0.1);
  ctx.restore();
}

// ---------- 4. Hallyu across Asia ----------
const SEOUL = [126.98, 37.57];
const CITIES = [['北京', 116.4, 39.9], ['上海', 121.47, 31.23], ['台北', 121.56, 25.03], ['香港', 114.17, 22.32], ['东京', 139.69, 35.69], ['曼谷', 100.5, 13.75], ['河内', 105.85, 21.03]];
function hallyuScene(ctx, t) {
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  const t0 = S('hallyu') - 0.2, lon0 = lerp(106, 116, easeIO(prog(t, t0, CH.c96.to)));
  const cx = 640, cy = 640, r = 950, tilt = 0.55;
  globe(ctx, cx, cy, r, lon0, { dot: P.acc, sea: '#132a33', tilt });
  const ta = at('hallyu', '走红') - 0.3;
  CITIES.forEach(([name, lon, lat], i) => {
    const p = easeOut(prog(t, ta + i * 0.12, ta + 0.8 + i * 0.12));
    const end = arc3d(ctx, cx, cy, r, lon0, SEOUL, [lon, lat], p, P.acc2, { w: 4, lift: 0.12, tilt });
    if (p >= 1 && end) {
      ctx.fillStyle = P.acc2; ctx.beginPath(); ctx.arc(end[0], end[1], 8, 0, Math.PI * 2); ctx.fill();
      txt(ctx, name, end[0] + 14, end[1] - 16, { size: 26, font: SANS, color: P.ink, align: 'left' });
    }
  });
  const [sx, sy, sz] = project(...SEOUL, lon0, tilt);
  if (sz > 0) {
    const pulse = (t * 1.2) % 1;
    ctx.strokeStyle = rgba(P.acc2, 1 - pulse); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx + sx * r, cy + sy * r, 10 + pulse * 40, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + sx * r, cy + sy * r, 9, 0, Math.PI * 2); ctx.fill();
    txt(ctx, '首尔', cx + sx * r - 16, cy + sy * r + 34, { size: 30, font: SANS, color: '#fff', align: 'right' });
  }
  const pg = ctx.createLinearGradient(1050, 0, 1350, 0);
  pg.addColorStop(0, rgba(P.bg, 0)); pg.addColorStop(1, rgba(P.bg, 0.92));
  ctx.fillStyle = pg; ctx.fillRect(1050, 0, W - 1050, H);
  label(ctx, 'LATE 1990s  ·  ASIA', 1220, 300, P.acc, { a: fadeIn(t, t0 + 0.2) });
  const th = at('hallyu', '韩流', 0) - 0.1;
  rise(ctx, '中文媒体给它起名', 1220, 400, t, at('hallyu', '中文媒体') - 0.1, { size: 54, font: SERIF_B, color: P.ink, align: 'left' });
  const hp = pop(t, th, 0.5);
  around(ctx, 1500, 600, hp, hp, () => {
    txt(ctx, '韩流', 1500, 600, { size: 240, font: SERIF, color: P.acc2 });
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = rgba(P.acc, 0.7 - k * 0.2); ctx.lineWidth = 6; ctx.beginPath();
      for (let x = 1240; x <= 1760; x += 10) ctx.lineTo(x, 760 + k * 26 + Math.sin(x / 40 - t * 4 + k) * 10);
      ctx.stroke();
    }
  });
  label(ctx, 'HALLYU  ·  KOREAN WAVE', 1500, 880, P.acc, { align: 'center', a: fadeIn(t, th + 0.4) });
}

export const scenes = [
  { id: 'factory', from: CH.c96.from, to: S('hot') - 0.2, draw: factoryScene, cut: true },
  { id: 'conveyor', from: S('hot') - 0.2, to: S('trainee') - 0.2, draw: conveyorScene },
  { id: 'trainee', from: S('trainee') - 0.2, to: S('hallyu') - 0.2, draw: traineeScene },
  { id: 'hallyu', from: S('hallyu') - 0.2, to: CH.c96.to, draw: hallyuScene, still: true },
];

export const events = [
  { type: 'rewind', t: CH.c96.from - 0.35 },
  ...[1, 2, 3, 4].map((k) => ({ type: 'tick', t: at('factory', '复制') + k * 0.12, f: 1200 + k * 200, amp: 0.5 })),
  { type: 'whoosh', t: at('factory', '娱乐公司') - 0.1, d: 1.4, from: 200, to: 1200, amp: 0.4 },
  { type: 'ding', t: at('factory', '造星'), n: 91, amp: 0.7 },
  ...STATIONS.map(([zh]) => ({ type: 'click', t: at('hot', zh) - 0.08 })),
  { type: 'stamp', t: at('hot', '统一设计') + 0.05, amp: 0.8 },
  ...[0, 1, 2, 3, 4].map((k) => ({ type: 'tick', t: at('trainee', '好几年') - 0.3 + k * 0.22, f: 1600, amp: 0.5 })),
  ...SKILLS.map(([zh]) => ({ type: 'whoosh', t: at('trainee', zh) - 0.1, d: 0.6, from: 800, to: 3000, amp: 0.3 })),
  { type: 'stamp', t: at('trainee', '一样都不能少') + 0.05, amp: 0.8 },
  ...CITIES.map((_, i) => ({ type: 'pop', t: at('hallyu', '走红') + 0.5 + i * 0.12, f: 700 + i * 60, amp: 0.5 })),
  { type: 'boom', t: at('hallyu', '韩流') - 0.1, amp: 0.8 },
];
