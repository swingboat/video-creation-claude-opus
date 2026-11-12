// Renders the 电磁波 explainer frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs                  -> out/电磁波-看不见的大家族.mp4
//        node render.mjs --still 3.2 7.6  -> build/still_<t>.png previews
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, C, ZH, TL, DURATION, prog, lerp, clamp, easeOut, txt, measure, sineLine } from './lib.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const TITLE = '电磁波-看不见的大家族';
const PARTS = ['a', 'b', 'c', 'd'].filter((k) => existsSync(here(`./scenes-${k}.mjs`)));
const MODS = await Promise.all(PARTS.map((k) => import(`./scenes-${k}.mjs`)));
const SCENES = MODS.flatMap((m) => m.scenes);
const EVENTS = MODS.flatMap((m) => m.events);
const XF = 0.35; // cross-fade between scenes

// ---------- background: night-blue lab with a faint grid and drifting wave ribbons ----------
const DOTS = [...Array(90)].map((_, i) => {
  const r = (k) => { const x = Math.sin(i * 91.7 + k * 13.3) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H, s: 1 + r(3) * 2, ph: r(4) * 6.28, sp: 0.5 + r(5) * 2 };
});

function background(ctx, t) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 60, W * 0.5, H * 0.42, 1250);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = ((-t * 12) % 80 + 80) % 80; x < W; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 40; y < H; y += 80) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  sineLine(ctx, -40, W + 40, H * 0.2, 40, 520, t * 1.1, { color: C.eF, w: 4, alpha: 0.06 });
  sineLine(ctx, -40, W + 40, H * 0.86, 55, 760, t * 0.8 + 1, { color: C.bF, w: 5, alpha: 0.07 });
  for (const d of DOTS) {
    const a = 0.25 + 0.5 * Math.abs(Math.sin(t * d.sp + d.ph));
    ctx.fillStyle = `rgba(200,220,255,${a * 0.6})`;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2); ctx.fill();
  }
}

function badge(ctx, t) {
  const a = easeOut(prog(t, 0.4, 0.9));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(48, 40, 380, 64, 32); ctx.fill();
  txt(ctx, '物理 · ELI5', 160, 73, { size: 30, color: C.gold });
  txt(ctx, '电磁波', 340, 73, { size: 32, color: C.white });
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
      const isKid = seg.voice === 'kid';
      const tag = isKid ? '豆豆' : '';
      const tw = isKid ? measure(ctx, tag, 34, ZH) + 34 : 0;
      const w = measure(ctx, c.text, 52, ZH) + 80 + tw;
      const x0 = W / 2 - w / 2, y = 960;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(6,8,30,0.8)';
      ctx.beginPath(); ctx.roundRect(x0, y, w, 88, 44); ctx.fill();
      if (isKid) {
        ctx.fillStyle = C.pink;
        ctx.beginPath(); ctx.roundRect(x0 + 18, y + 20, tw - 6, 48, 24); ctx.fill();
        txt(ctx, tag, x0 + 15 + tw / 2, y + 45, { size: 34, color: C.space });
      }
      txt(ctx, c.text, x0 + 40 + tw + (w - 80 - tw) / 2, y + 45, { size: 52, color: isKid ? '#ffd6e2' : C.white });
      ctx.restore();
    });
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

function renderFrame(t) {
  background(ctx, t);
  const [sx, sy] = shakeAt(t);
  ctx.save();
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
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    s.draw(ctx, t);
    ctx.restore();
  }
  ctx.restore();
  badge(ctx, t);
  subtitles(ctx, t);
  const fade = 1 - prog(t, 0, 0.4) + prog(t, DURATION - 0.6, DURATION);
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
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.75[m];[m][v1]sidechaincompress=threshold=0.05:ratio=5:attack=20:release=400[md];' +
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
    if (i % 600 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
