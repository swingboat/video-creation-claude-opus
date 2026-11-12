// Composites the Blender frames (build/frames) with 2D overlays, sound design and narration.
// Usage: node render.mjs                  -> out/多米诺放大器.mp4
//        node render.mjs --still 8.0 22.9 -> build/still_<t>.png previews (frame must already be rendered)
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { W, H, FPS, DURATION, EV, here } from './lib.mjs';
import { overlay } from './hud.mjs';
import { buildMusic, buildSfx, writeWav } from './audio.mjs';

const TITLE = '多米诺放大器';
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const framePath = (i) => here(`./build/frames/f_${String(i + 1).padStart(4, '0')}.jpg`);

async function renderFrame(i) {
  const p = framePath(i);
  if (existsSync(p)) ctx.drawImage(await loadImage(p), 0, 0, W, H);
  else {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, W, H);
  }
  overlay(ctx, i / FPS);
}

const args = process.argv.slice(2);
mkdirSync(here('./out/'), { recursive: true });

if (args[0] === '--still') {
  for (const s of args.slice(1)) {
    await renderFrame(Math.round(parseFloat(s) * FPS));
    writeFileSync(here(`./build/still_${s}.png`), canvas.toBuffer('image/png'));
    console.log('wrote still', s);
  }
} else {
  const frames = Math.round(DURATION * FPS);
  const missing = [...Array(frames).keys()].filter((i) => !existsSync(framePath(i)));
  if (missing.length) throw new Error(`${missing.length} Blender frames missing, first: ${framePath(missing[0])}`);
  writeWav(here('./build/music.wav'), buildMusic(DURATION, EV.t_land - 3, EV.t_land));
  writeWav(here('./build/sfx.wav'), buildSfx(EV.events, DURATION));
  const outFile = here(`./out/${TITLE}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-stats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', here('./build/narration.wav'), '-i', here('./build/music.wav'), '-i', here('./build/sfx.wav'),
    '-filter_complex',
    // music ducks under the voice; impacts sit on top; a limiter keeps peaks safe
    '[1:a]asplit=2[v1][v2];[2:a]volume=0.7[m];[m][v1]sidechaincompress=threshold=0.05:ratio=5:attack=20:release=400[md];' +
      '[3:a]volume=0.8[s];[v2][md][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.93[a]',
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await renderFrame(i);
    const buf = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) await once(ff.stdin, 'drain');
    if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log('done ->', outFile);
}
