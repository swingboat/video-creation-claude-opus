// Douyin vertical cut (1080×1920) of the 电磁波 explainer, rendered frame by frame with canvas and piped into ffmpeg.
// Usage: node render.mjs                     -> out/电磁波-抖音竖屏版.mp4
//        node render.mjs --still 3.2 7.6     -> build/still_<t>.png previews
//        node render.mjs --still --safe 3.2  -> same, with the Douyin UI safe zones overlaid
//        node render.mjs --cover             -> out/封面.png
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, C, ZH, TL, DURATION, S, at, prog, lerp, clamp, easeOut, pop, txt, measure, card, around, sineLine } from './lib.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const TITLE = '电磁波-抖音竖屏版';
const PARTS = ['a', 'b', 'c'].filter((k) => existsSync(here(`./scenes-${k}.mjs`)));
const MODS = await Promise.all(PARTS.map((k) => import(`./scenes-${k}.mjs`)));
const SCENES = MODS.flatMap((m) => m.scenes);
const EVENTS = MODS.flatMap((m) => m.events);
const XF = 0.3; // cross-fade between scenes (snappier than the landscape cut)

// Layout bands. Douyin overlays the status bar on top, the like/comment column on the right
// and the account name + description at the bottom, so the story lives in the middle.
export const SUB_Y = 1330;
const CHAPTERS = [['hook', '是什么'], ['kidAir', '跑多快'], ['freq', '频率·波长'], ['lineup', '家族'], ['kidEnergy', '能量']];

// ---------- background ----------
const DOTS = [...Array(110)].map((_, i) => {
  const r = (k) => { const x = Math.sin(i * 91.7 + k * 13.3) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H, s: 1 + r(3) * 2, ph: r(4) * 6.28, sp: 0.5 + r(5) * 2 };
});

function background(ctx, t) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 60, W * 0.5, H * 0.45, 1300);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = ((-t * 12) % 72 + 72) % 72; x < W; x += 72) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 36; y < H; y += 72) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  sineLine(ctx, -40, W + 40, 1560, 50, 520, t * 1.2, { color: C.eF, w: 5, alpha: 0.1 });
  sineLine(ctx, -40, W + 40, 1640, 40, 380, t * 1.6 + 1, { color: C.bF, w: 4, alpha: 0.1, dash: [14, 12] });
  for (const d of DOTS) {
    const a = 0.25 + 0.5 * Math.abs(Math.sin(t * d.sp + d.ph));
    ctx.fillStyle = `rgba(200,220,255,${a * 0.6})`;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- pinned hook title + chapter progress ----------
function header(ctx, t, o = {}) {
  const settle = easeOut(prog(t, 0, 0.35));
  const bounce = 1 + 0.06 * Math.sin(Math.PI * prog(t, S('yes'), S('yes') + 0.35));
  around(ctx, W / 2, 290, lerp(1.15, 1, settle) * bounce, 1, () => {
    txt(ctx, '阳光 · WiFi · X光', W / 2, 225, { size: 64, color: C.white, stroke: C.space, sw: 12 });
    txt(ctx, '竟然是一家人？', W / 2, 330, { size: 104, color: C.gold, stroke: C.space, sw: 16, shadow: 'rgba(0,0,0,0.5)' });
  });
  if (o.cover) return;
  const cur = CHAPTERS.reduce((k, [id], i) => (t >= S(id) - 0.4 ? i : k), 0);
  const cw = 168, gap = 14, x0 = W / 2 - (CHAPTERS.length * cw + (CHAPTERS.length - 1) * gap) / 2;
  CHAPTERS.forEach(([id, label], i) => {
    const x = x0 + i * (cw + gap), on = i === cur, done = i < cur;
    const p = on ? pop(t, S(id) - 0.4, 0.4) : 1;
    around(ctx, x + cw / 2, 450, on ? lerp(1, 1.08, p) : 1, 1, () => {
      card(ctx, x, 426, cw, 50, { fill: on ? C.gold : done ? 'rgba(255,210,63,0.28)' : 'rgba(255,255,255,0.1)', ew: 0, r: 25, drop: 0 });
      txt(ctx, `${i + 1} ${label}`, x + cw / 2, 452, { size: 28, color: on ? C.space : 'rgba(255,255,255,0.8)' });
    });
  });
}

// ---------- subtitles: big, centred, auto-shrunk to stay clear of the right-hand buttons ----------
function subtitles(ctx, t) {
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.25;
      const from = i === 0 ? c.start - 0.08 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.05) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.1, c.end + 0.25));
      const isKid = seg.voice === 'kid';
      const tag = isKid ? '豆豆' : '';
      const tw = isKid ? measure(ctx, tag, 36, ZH) + 34 : 0;
      const size = Math.min(66, (860 - tw) / (measure(ctx, c.text, 100, ZH) / 100));
      const w = measure(ctx, c.text, size, ZH) + 72 + tw;
      const x0 = W / 2 - w / 2, y = SUB_Y;
      const kick = 1 + 0.05 * (1 - prog(t, from, from + 0.15));
      around(ctx, W / 2, y + 50, kick, a, () => {
        ctx.fillStyle = 'rgba(6,8,30,0.82)';
        ctx.beginPath(); ctx.roundRect(x0, y, w, 100, 50); ctx.fill();
        if (isKid) {
          ctx.fillStyle = C.pink;
          ctx.beginPath(); ctx.roundRect(x0 + 18, y + 24, tw - 6, 52, 26); ctx.fill();
          txt(ctx, tag, x0 + 15 + tw / 2, y + 51, { size: 36, color: C.space });
        }
        txt(ctx, c.text, x0 + 36 + tw + (w - 72 - tw) / 2, y + 51, { size, color: isKid ? '#ffd6e2' : C.white, stroke: 'rgba(6,8,30,0.9)', sw: 6 });
      });
    });
}

function coverStrap(ctx) {
  card(ctx, W / 2 - 330, 1390, 660, 120, { fill: C.gold, ew: 0, r: 60, drop: 10 });
  txt(ctx, '1 分钟看懂电磁波', W / 2, 1452, { size: 62, color: C.space });
}

function safeZones(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,0,80,0.22)';
  ctx.fillRect(0, 0, W, 150);
  ctx.fillRect(W - 150, 760, 150, 760);
  ctx.fillRect(0, 1500, W, H - 1500);
  ctx.restore();
}

// ---------- frame ----------
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

function shakeAt(t) {
  let dx = 0, dy = 0;
  for (const e of EVENTS) {
    if (!e.shake) continue;
    const p = prog(t, e.t, e.t + 0.4);
    if (p <= 0 || p >= 1) continue;
    const k = e.shake * (1 - p) * (1 - p);
    dx += Math.sin(t * 95) * k;
    dy += Math.cos(t * 81) * k;
  }
  return [dx, dy];
}

function renderFrame(t, o = {}) {
  background(ctx, t);
  const [sx, sy] = shakeAt(t);
  ctx.save();
  // the cover is shown 3:4 centre-cropped on profile pages, so its content is pulled toward the middle
  if (o.cover) ctx.translate(0, 230);
  ctx.translate(sx, sy);
  for (const s of SCENES) {
    if (t < s.from || t > s.to + XF) continue;
    const enter = s.from <= 0 ? 1 : easeOut(prog(t, s.from, s.from + XF));
    const leave = s.to >= DURATION ? 1 : 1 - prog(t, s.to, s.to + XF);
    const a = clamp(enter * leave);
    if (a <= 0) continue;
    const sc = lerp(0.94, 1, enter) * lerp(1.05, 1, leave);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 880); ctx.scale(sc, sc); ctx.translate(-W / 2, -880);
    s.draw(ctx, t);
    ctx.restore();
  }
  if (o.cover) header(ctx, t, o);
  ctx.restore();
  if (o.cover) coverStrap(ctx);
  else header(ctx, t);
  if (!o.cover) subtitles(ctx, t);
  if (o.safe) safeZones(ctx);
  // no fade-in: the very first frame is what viewers see while scrolling
  const fade = prog(t, DURATION - 0.5, DURATION);
  if (fade > 0) {
    ctx.fillStyle = `rgba(4,6,22,${clamp(fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- main ----------
const args = process.argv.slice(2);
mkdirSync(here('./build/'), { recursive: true });
mkdirSync(here('./out/'), { recursive: true });

if (args[0] === '--still') {
  const safe = args.includes('--safe');
  const times = args.slice(1).filter((a) => a !== '--safe');
  for (const s of times) {
    renderFrame(parseFloat(s), { safe });
    writeFileSync(here(`./build/still_${s}.png`), canvas.toBuffer('image/png'));
  }
  console.log('wrote', times.length, 'stills');
} else if (args[0] === '--cover') {
  renderFrame(at('yes', '电磁波') + 0.7, { cover: true });
  writeFileSync(here('./out/封面.png'), canvas.toBuffer('image/png'));
  console.log('wrote out/封面.png');
} else {
  writeWav(here('./build/music.wav'), buildMusic(DURATION));
  writeWav(here('./build/sfx.wav'), buildSfx(EVENTS.filter((e) => e.type), DURATION));
  const outFile = here(`./out/${TITLE}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', here('./build/narration.wav'), '-i', here('./build/music.wav'), '-i', here('./build/sfx.wav'),
    '-filter_complex',
    // music ducks under the voice; effects sit on top; a limiter keeps peaks safe
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.8[m];[m][v1]sidechaincompress=threshold=0.05:ratio=5:attack=20:release=400[md];' +
      '[3:a]volume=0.55[s];[v2][md][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.93[a]',
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(DURATION * FPS);
  for (let i = 0; i < frames; i++) {
    renderFrame(i / FPS);
    const buf = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) await once(ff.stdin, 'drain');
    if (i % 600 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
