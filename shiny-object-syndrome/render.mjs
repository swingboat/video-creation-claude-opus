// Renders the shiny-object-syndrome explainer frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs                  -> out/闪亮物体综合征-挖井的阿亮.mp4
//        node render.mjs --still 3.2 7.6  -> build/still_<t>.png previews
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, C, ZH, TL, DURATION, prog, lerp, clamp, easeOut, txt, measure, star } from './lib.mjs';
import { scenesA, eventsA } from './scenes-a.mjs';
import { scenesB, eventsB } from './scenes-b.mjs';
import { scenesC, eventsC } from './scenes-c.mjs';
import { scenesD, eventsD } from './scenes-d.mjs';
import { scenesE, eventsE } from './scenes-e.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const TITLE = '闪亮物体综合征-挖井的阿亮';
const SCENES = [...scenesA, ...scenesB, ...scenesC, ...scenesD, ...scenesE];
const EVENTS = [...eventsA, ...eventsB, ...eventsC, ...eventsD, ...eventsE];
const XF = 0.35; // cross-fade between scenes

// ---------- background: a sunny sky with drifting clouds ----------
function cloud(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [cx, cy, r] of [[-60, 10, 40], [-15, -12, 55], [45, 0, 45], [85, 14, 32]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillRect(-90, 10, 200, 40);
  ctx.restore();
}

function background(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.sky0);
  g.addColorStop(0.75, C.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun
  ctx.save();
  ctx.translate(1700, 150);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = 'rgba(255,220,90,0.35)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, -95); ctx.lineTo(16, -150); ctx.lineTo(-16, -150); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath(); ctx.arc(1700, 150, 80, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const x = ((i * 470 + t * (14 + i * 4)) % (W + 400)) - 200;
    cloud(ctx, x, 110 + (i % 3) * 70, 0.7 + (i % 2) * 0.35);
  }
}

function badge(ctx, t) {
  const a = easeOut(prog(t, 0.3, 0.9));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(29,43,83,0.82)';
  ctx.beginPath(); ctx.roundRect(40, 34, 372, 66, 33); ctx.fill();
  star(ctx, 84, 67, 20, C.gold, t * 1.5);
  txt(ctx, '闪亮物体综合征', 250, 68, { size: 36, color: C.white });
  ctx.restore();
}

// ---------- subtitles ----------
const WHO = { liang: ['阿亮', C.orange], shiny: ['闪闪', C.sky] };

function subtitles(ctx, t) {
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.3;
      const from = i === 0 ? c.start - 0.08 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.06) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.12, c.end + 0.3));
      const tag = WHO[seg.voice];
      const tw = tag ? measure(ctx, tag[0], 40) + 44 : 0;
      const w = measure(ctx, c.text, 52, ZH) + 80 + (tag ? tw + 16 : 0), h = 86;
      const x = W / 2 - w / 2, y = 1046 - h;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(24,26,48,0.8)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 43); ctx.fill();
      if (tag) {
        ctx.fillStyle = tag[1];
        ctx.beginPath(); ctx.roundRect(x + 18, y + 16, tw, h - 32, 27); ctx.fill();
        txt(ctx, tag[0], x + 18 + tw / 2, y + h / 2 + 1, { size: 40, color: C.white });
      }
      txt(ctx, c.text, x + 40 + (tag ? tw + 16 : 0), y + h / 2 + 1, { size: 52, align: 'left', color: C.white });
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
    const leave = 1 - prog(t, s.to, s.to + XF);
    const a = clamp(enter * leave);
    if (a <= 0) continue;
    const sc = s.still ? 1 : lerp(0.96, 1, enter) * lerp(1.04, 1, leave);
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
    ctx.fillStyle = `rgba(16,20,40,${clamp(fade)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- main ----------
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const args = process.argv.slice(2);
mkdirSync(here('./build/'), { recursive: true });
mkdirSync(here('./out/'), { recursive: true });

if (args[0] === '--still') {
  for (const s of args.slice(1)) {
    renderFrame(parseFloat(s));
    writeFileSync(here(`./build/still_${s}.png`), canvas.toBuffer('image/png'));
    console.log('wrote still', s);
  }
} else {
  writeWav(here('./build/music.wav'), buildMusic(DURATION));
  writeWav(here('./build/sfx.wav'), buildSfx(EVENTS.filter((e) => e.type), DURATION));
  const outFile = here(`./out/${TITLE}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-stats',
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
    if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
