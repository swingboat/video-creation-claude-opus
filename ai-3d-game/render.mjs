// Renders "Kitty带你看-AI做3D游戏" frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs                  -> out/Kitty带你看-AI做3D游戏.mp4
//        node render.mjs --still 3.2 7.6  -> build/still_<t>.png previews
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, C, ZH, TL, DURATION, prog, lerp, clamp, easeOut, txt, measure, rand, talkLevel, ZH_LINES } from './lib.mjs';
import { kitty } from './chars.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const TITLE = 'Kitty带你看-AI做3D游戏';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SCENES = [], EVENTS = [];
for (const k of ['a', 'b', 'c', 'd', 'e']) {
  if (!existsSync(here(`./scenes-${k}.mjs`))) continue;
  const m = await import(`./scenes-${k}.mjs`);
  SCENES.push(...m[`scenes${k.toUpperCase()}`]);
  EVENTS.push(...m[`events${k.toUpperCase()}`]);
}
const XF = 0.35;

// ---------- background: pastel night sky of the little prince ----------
const STARS = [...Array(150)].map((_, i) => ({
  x: rand(i * 3 + 1) * W, y: rand(i * 3 + 2) * H, s: 0.8 + rand(i * 5 + 3) * 2.4, ph: rand(i + 77) * 6.28, sp: 0.6 + rand(i + 99) * 2.5, depth: 0.3 + rand(i + 55),
}));

function background(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [[W * 0.12, H * 0.18, 560, 'rgba(255,120,180,0.12)'], [W * 0.9, H * 0.85, 640, 'rgba(76,201,240,0.12)']]) {
    const n = ctx.createRadialGradient(x, y, 0, x, y, r);
    n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);
  }
  for (const s of STARS) {
    const x = ((s.x - t * 5 * s.depth) % W + W) % W;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.sp + s.ph));
    ctx.fillStyle = `rgba(255,250,230,${a * s.depth})`;
    ctx.beginPath(); ctx.arc(x, s.y, s.s * s.depth, 0, Math.PI * 2); ctx.fill();
  }
}

function badge(ctx, t) {
  const a = easeOut(prog(t, 0.4, 0.9));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(40, 36, 470, 60, 30); ctx.fill();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(76, 66, 14, 0, Math.PI * 2); ctx.fill();
  txt(ctx, 'Kitty 带你看帖', 100, 67, { size: 30, color: C.pink, align: 'left' });
  txt(ctx, 'AI 做 3D 游戏', 486, 67, { size: 28, color: C.white, align: 'right' });
  ctx.restore();
}

// ---------- subtitles ----------
function subtitles(ctx, t) {
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.3;
      const from = i === 0 ? c.start - 0.08 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.06) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.12, c.end + 0.3));
      const isP = seg.voice === 'prince';
      const tag = isP ? '小王子' : '';
      const tw = isP ? measure(ctx, tag, 34, ZH) + 34 : 0;
      const w = measure(ctx, c.text, 50, ZH) + 80 + tw;
      const x0 = W / 2 - w / 2, y = 958;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(12,8,40,0.8)';
      ctx.beginPath(); ctx.roundRect(x0, y, w, 86, 43); ctx.fill();
      if (isP) {
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.roundRect(x0 + 18, y + 19, tw - 6, 48, 24); ctx.fill();
        txt(ctx, tag, x0 + 15 + tw / 2, y + 44, { size: 34, color: C.ink });
      }
      txt(ctx, c.text, x0 + 40 + tw + (w - 80 - tw) / 2, y + 44, { size: 50, color: isP ? '#ffe9a8' : C.white });
      ctx.restore();
    });
}

// ---------- frame ----------
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const sceneAlpha = (s, t) => {
  if (t < s.from || t > s.to + XF) return 0;
  const enter = s.from <= 0 ? 1 : easeOut(prog(t, s.from, s.from + XF));
  return clamp(enter * (1 - prog(t, s.to, s.to + XF)));
};

function shakeAt(t) {
  let dx = 0, dy = 0;
  for (const e of EVENTS) {
    if (!e.shake) continue;
    const p = prog(t, e.t, e.t + 0.4);
    if (p <= 0 || p >= 1) continue;
    const k = e.shake * (1 - p) * (1 - p);
    dx += Math.sin(t * 95) * k; dy += Math.cos(t * 81) * k;
  }
  return [dx, dy];
}

function renderFrame(t) {
  background(ctx, t);
  const [sx, sy] = shakeAt(t);
  ctx.save();
  ctx.translate(sx, sy);
  let own = 0;
  for (const s of SCENES) {
    const a = sceneAlpha(s, t);
    if (s.ownKitty) own = Math.max(own, a);
    if (a <= 0) continue;
    const enter = s.from <= 0 ? 1 : easeOut(prog(t, s.from, s.from + XF));
    const sc = lerp(0.94, 1, enter) * lerp(1.05, 1, 1 - prog(t, s.to, s.to + XF));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    s.draw(ctx, t);
    ctx.restore();
  }
  ctx.restore();
  // Kitty narrates from the corner whenever a scene doesn't stage her itself
  if (own < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - own;
    kitty(ctx, t, 150, 1050 + own * 200, 0.5, { talk: talkLevel(t, ZH_LINES) });
    ctx.restore();
  }
  badge(ctx, t);
  subtitles(ctx, t);
  const fade = 1 - prog(t, 0, 0.4) + prog(t, DURATION - 0.6, DURATION);
  if (fade > 0) {
    ctx.fillStyle = `rgba(8,6,30,${clamp(fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- main ----------
const args = process.argv.slice(2);
mkdirSync(here('./build/'), { recursive: true });
mkdirSync(here('./out/'), { recursive: true });

if (args[0] === '--still') {
  for (const s of args.slice(1)) {
    renderFrame(parseFloat(s));
    writeFileSync(here(`./build/still_${s}.png`), canvas.toBuffer('image/png'));
  }
  console.log('wrote', args.length - 1, 'stills');
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
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.7[m];[m][v1]sidechaincompress=threshold=0.05:ratio=5:attack=20:release=400[md];' +
      '[3:a]volume=0.5[s];[v2][md][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.93[a]',
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(DURATION * FPS);
  for (let i = 0; i < frames; i++) {
    renderFrame(i / FPS);
    const buf = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) await once(ff.stdin, 'drain');
    if (i % 900 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
