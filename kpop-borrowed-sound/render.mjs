// Renders "借来的声音-Kpop三十年" frame by frame with canvas and pipes it into ffmpeg.
// Usage: node render.mjs                  -> out/借来的声音-Kpop三十年.mp4
//        node render.mjs --still 3.2 7.6  -> build/still_<t>.png previews
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import {
  W, H, FPS, TL, TITLE, DURATION, ERA, CHAPTERS, CH, chapterAt, prog, lerp, clamp, easeOut, mixHex, rgba,
  txt, measure, MONO, SANS, SERIF_B,
} from './lib.mjs';
import { grain, vignette, lightLeak, flash, glitch } from './fx.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SCENES = [], EVENTS = [];
for (const k of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
  if (!existsSync(here(`./scenes-${k}.mjs`))) continue;
  const m = await import(`./scenes-${k}.mjs`);
  SCENES.push(...m.scenes);
  EVENTS.push(...m.events);
}
const XF = 0.25;

// ---------- background: era colour, blended across chapter changes ----------
function eraBg(t) {
  const c = chapterAt(t);
  const i = CHAPTERS.indexOf(c);
  const prev = CHAPTERS[i - 1];
  const k = prev ? easeOut(prog(t, c.from, c.from + 0.5)) : 1;
  return prev ? mixHex(ERA[prev.key].bg, ERA[c.key].bg, k) : ERA[c.key].bg;
}

// ---------- HUD: track tag, tape counter ----------
function hud(ctx, t) {
  const a = clamp(prog(t, CH.c92.from + 0.6, CH.c92.from + 1.2) - prog(t, CH.outro.from - 0.6, CH.outro.from));
  if (a <= 0) return;
  const c = chapterAt(t), e = ERA[c.key];
  const ca = a * clamp(prog(t, c.from + 0.3, c.from + 0.8));
  ctx.save();
  ctx.globalAlpha = ca * 0.85;
  const tag = e.year ? `${e.tag}  ·  ${e.year}` : e.tag;
  ctx.fillStyle = e.acc; ctx.fillRect(64, 62, 12, 12);
  txt(ctx, tag, 92, 69, { size: 24, font: MONO, color: e.ink, align: 'left', track: 4 });
  ctx.globalAlpha = a * 0.6;
  txt(ctx, '借来的声音', W - 64, 69, { size: 26, font: SERIF_B, color: e.ink, align: 'right' });
  const n = String(Math.floor(t * 7.3)).padStart(4, '0');
  txt(ctx, `▶ ${n}`, W - 64, H - 58, { size: 22, font: MONO, color: e.ink, align: 'right', track: 3 });
  ctx.restore();
}

// ---------- subtitles: small, bottom-centre, documentary style ----------
function subtitles(ctx, t) {
  const e = ERA[chapterAt(t).key];
  for (const seg of TL.segments)
    seg.cues.forEach((c, i) => {
      const next = seg.cues[i + 1];
      const until = next ? next.start : c.end + 0.35;
      const from = i === 0 ? c.start - 0.08 : c.start;
      if (t < from || t >= until) return;
      const a = (i === 0 ? prog(t, from, c.start + 0.06) : 1) * (next ? 1 : 1 - prog(t, c.end + 0.15, c.end + 0.35));
      const w = measure(ctx, c.text, 40, SANS) + 56;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,8,10,0.55)';
      ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 968, w, 64, 8); ctx.fill();
      ctx.fillStyle = e.acc; ctx.fillRect(W / 2 - w / 2, 968, 5, 64);
      txt(ctx, c.text, W / 2, 1001, { size: 40, font: SANS, color: '#f7f3ea' });
      ctx.restore();
    });
}

// ---------- frame ----------
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const sceneAlpha = (s, t) => {
  if (t < s.from || t > s.to + XF) return 0;
  const enter = s.from <= 0 || s.cut ? 1 : easeOut(prog(t, s.from, s.from + XF));
  const leave = s.cutOut ? (t < s.to ? 1 : 0) : 1 - prog(t, s.to, s.to + XF);
  return clamp(enter * leave);
};

function renderFrame(t) {
  ctx.fillStyle = eraBg(t);
  ctx.fillRect(0, 0, W, H);
  for (const s of SCENES) {
    const a = sceneAlpha(s, t);
    if (a <= 0) continue;
    // slow Ken Burns push on every shot
    const sc = s.still ? 1 : lerp(1, 1.035, prog(t, s.from, s.to + XF));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    s.draw(ctx, t);
    ctx.restore();
  }
  for (const c of CHAPTERS.slice(1)) {
    const warm = c.key === 'c92' || c.key === 'outro' ? [255, 150, 60] : [255, 120, 170];
    lightLeak(ctx, t, c.from - 0.3, 1.3, warm);
  }
  for (const e of EVENTS) if (e.flash) flash(ctx, t, e.t, 0.2, e.flash === true ? '255,255,255' : e.flash, e.peak ?? 0.7);
  hud(ctx, t);
  vignette(ctx, 0.5);
  grain(ctx, t, chapterAt(t).key === 'c92' ? 0.11 : 0.07);
  for (const c of CHAPTERS.slice(1)) glitch(ctx, canvas, t, c.from, 0.4);
  subtitles(ctx, t);
  const fade = 1 - prog(t, 0, 0.5) + prog(t, DURATION - 0.8, DURATION);
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`;
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
  writeWav(here('./build/music.wav'), buildMusic(CHAPTERS, DURATION));
  writeWav(here('./build/sfx.wav'), buildSfx(EVENTS.filter((e) => e.type), DURATION));
  const outFile = here(`./out/${TITLE}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', here('./build/narration.wav'), '-i', here('./build/music.wav'), '-i', here('./build/sfx.wav'),
    '-filter_complex',
    // music ducks under the voice; effects sit on top; a limiter keeps peaks safe
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.6[m];[m][v1]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=450[md];' +
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
    if (i % 900 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
