// Renders the imperative word explainer frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs                  -> out/imperative-藏着皇帝的单词.mp4
//        node render.mjs --still 3.2 7.6  -> build/still_<t>.png previews
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, C, EN, ZH, TL, DURATION, prog, lerp, clamp, easeOut, txt, measure } from './lib.mjs';
import { scenesA, eventsA } from './scenes-a.mjs';
import { scenesB, eventsB } from './scenes-b.mjs';
import { scenesC, eventsC } from './scenes-c.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const TITLE = 'imperative-藏着皇帝的单词';
const SCENES = [...scenesA, ...scenesB, ...scenesC];
const EVENTS = [...eventsA, ...eventsB, ...eventsC];
const XF = 0.35; // cross-fade between scenes

// ---------- background ----------
function background(ctx, t) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, 1250);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // slowly turning sunburst
  ctx.save();
  ctx.translate(W / 2, H * 0.45);
  ctx.rotate(t * 0.06);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -150); ctx.lineTo(1400, 150); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // drifting sparkles
  for (let i = 0; i < 28; i++) {
    const sx = (i * 397) % W, sy = (i * 211) % H;
    const y = ((sy - t * (12 + (i % 5) * 6)) % H + H) % H;
    const a = 0.25 + 0.25 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(255,230,160,${a})`;
    ctx.beginPath(); ctx.arc(sx + Math.sin(t + i) * 12, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

function badge(ctx, t) {
  const a = easeOut(prog(t, 0.4, 0.9));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.roundRect(48, 40, 330, 64, 32); ctx.fill();
  txt(ctx, '每日一词', 140, 73, { size: 32, color: C.gold });
  txt(ctx, 'imperative', 290, 74, { size: 30, font: EN, color: C.white });
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
      const en = seg.voice !== 'zh';
      const top = en ? c.text : c.text, bottom = en ? c.zh : '';
      const w1 = measure(ctx, top, en ? 54 : 54, en ? EN : ZH);
      const w2 = bottom ? measure(ctx, bottom, 40, ZH) : 0;
      const w = Math.max(w1, w2) + 80, h = bottom ? 132 : 88;
      const y = 1040 - h;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(16,6,48,0.78)';
      ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y, w, h, 44); ctx.fill();
      txt(ctx, top, W / 2, y + 46, { size: 54, font: en ? EN : ZH, color: en ? C.gold : C.white });
      if (bottom) txt(ctx, bottom, W / 2, y + 100, { size: 40, color: '#e4dcff' });
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
    ctx.fillStyle = `rgba(16,6,48,${clamp(fade)})`;
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
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.8[m];[m][v1]sidechaincompress=threshold=0.05:ratio=5:attack=20:release=400[md];' +
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
