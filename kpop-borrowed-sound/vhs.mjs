// Turns a picture into degraded early-90s broadcast footage: low resolution, soft focus, colour bleed,
// interlacing, tracking noise and head-switching jitter. Optionally uses a photoreal still from assets/.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rand, clamp } from './lib.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const ASSETS = here('./assets/');

// Footage for the TV, best first: an image-to-video clip (assets/stage-1992.mp4|mov),
// several stills of the same scene (assets/stage-1992*.png|jpg), or none (drawn stage).
async function loadStage() {
  if (!existsSync(ASSETS)) return null;
  const files = readdirSync(ASSETS).filter((f) => f.startsWith('stage-1992'))
    .sort((a, b) => (parseInt(a.match(/-(\d+)\./)?.[1] ?? '1') - parseInt(b.match(/-(\d+)\./)?.[1] ?? '1')));
  const clip = files.find((f) => /\.(mp4|mov|webm)$/i.test(f));
  if (clip) {
    const dir = here('./build/stage_frames/');
    if (!existsSync(dir) || readdirSync(dir).length === 0) {
      mkdirSync(dir, { recursive: true });
      spawnSync('ffmpeg', ['-v', 'error', '-i', ASSETS + clip, '-vf', 'fps=30,scale=720:-2', '-q:v', '3', dir + '%04d.jpg'], { stdio: 'inherit' });
    }
    const frames = await Promise.all(readdirSync(dir).sort().map((f) => loadImage(dir + f)));
    return { kind: 'clip', frames };
  }
  const stills = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (!stills.length) return null;
  return { kind: 'stills', frames: await Promise.all(stills.map((f) => loadImage(ASSETS + f))) };
}
export const STAGE = await loadStage();

const LW = 360, LH = 270; // roughly VHS luma resolution
const low = createCanvas(LW, LH), lctx = low.getContext('2d');
const bleed = createCanvas(LW, LH), bctx = bleed.getContext('2d');

function crop(ctx, img, w, h, cx, cy, z) {
  const r = w / h;
  let sw = img.width, sh = img.height;
  if (sw / sh > r) sw = sh * r; else sh = sw / r;
  sw /= z; sh /= z;
  const sx = clamp(cx * img.width - sw / 2, 0, img.width - sw), sy = clamp(cy * img.height - sh / 2, 0, img.height - sh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

// A broadcast director switching cameras on the beat: wide, then close-ups on each dancer.
const CAMS = [[0.5, 0.5, 1.0], [0.3, 0.42, 1.9], [0.5, 0.5, 1.35], [0.5, 0.4, 2.0], [0.7, 0.42, 1.9], [0.5, 0.48, 1.15]];
const STILL_CAMS = [[0.5, 0.5, 1.02], [0.5, 0.45, 1.25], [0.5, 0.48, 1.1]];
export function stageShot(ctx, t, w, h, t0, bpm) {
  const d = Math.max(0, t - t0), beatLen = 60 / bpm, bt = d / beatLen;
  if (STAGE.kind === 'clip') {
    // play forward then backward so the loop never jumps
    const n = STAGE.frames.length, k = Math.floor(d * 30) % (2 * n - 2);
    const img = STAGE.frames[k < n ? k : 2 * n - 2 - k];
    return crop(ctx, img, w, h, 0.5, 0.5, 1 + 0.08 * clamp(d / 8));
  }
  const multi = STAGE.frames.length > 1;
  // several poses: change pose on every beat; 3 framings vs 5 poses so repeats never look the same
  const cut = multi ? Math.floor(bt) : Math.floor(bt / 2);
  const img = STAGE.frames[cut % STAGE.frames.length];
  const [cx, cy, z] = multi ? STILL_CAMS[cut % STILL_CAMS.length] : CAMS[cut % CAMS.length];
  // hand-held drift plus a small push on every beat
  const pulse = Math.exp(-(bt % 1) * 5) * 0.02;
  const sx = cx + Math.sin(d * 0.9) * 0.008, sy = cy + Math.sin(d * 0.7 + 1) * 0.008 + pulse * 0.2;
  crop(ctx, img, w, h, sx, sy, z * (1 + pulse + 0.03 * ((bt % 2) / 2)));
}

export function vhs(ctx, t, w, h, picture, o = {}) {
  const { strength = 1 } = o;
  const f = Math.floor(t * 30);
  // 1. render the picture small, so detail goes soft like tape
  lctx.save();
  lctx.setTransform(LW / w, 0, 0, LH / h, 0, 0);
  picture(lctx, w, h);
  lctx.restore();
  // 2. chroma bleeds sideways: a blurred, saturated copy shifted right
  bctx.clearRect(0, 0, LW, LH);
  bctx.filter = 'blur(2px) saturate(1.6)';
  bctx.drawImage(low, 0, 0);
  bctx.filter = 'none';
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.filter = 'blur(0.6px) contrast(1.08) saturate(0.9)';
  // vertical jitter of the whole picture
  const jy = rand(f) < 0.08 ? (rand(f + 1) - 0.5) * 6 : 0;
  ctx.drawImage(low, 0, jy, w, h);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.35 * strength;
  ctx.drawImage(bleed, 5, jy, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // 3. interlace lines
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = (f % 2) * 2; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
  // 4. drifting tracking band with sideways tearing
  const by = ((t * 0.18) % 1.4 - 0.2) * h;
  for (let k = 0; k < 14; k++) {
    const y = by + k * 4, dx = (rand(f * 13 + k) - 0.5) * 18 * strength;
    if (y < 0 || y > h) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + rand(f + k) * 0.08})`;
    ctx.fillRect(dx, y, w, 3);
  }
  // 5. head-switching noise along the bottom edge
  for (let k = 0; k < 6; k++) {
    const y = h - 14 + k * 2.4;
    ctx.fillStyle = `rgba(${200 + rand(f + k) * 55},${200 + rand(f + k + 3) * 55},255,${0.25 + rand(f * 3 + k) * 0.3})`;
    ctx.fillRect((rand(f * 7 + k) - 0.3) * 40, y, w, 2);
  }
  // 6. snow speckles
  for (let k = 0; k < 160 * strength; k++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(f * 31 + k) * 0.35})`;
    ctx.fillRect(rand(f * 17 + k) * w, rand(f * 19 + k) * h, 1 + rand(k) * 2, 1);
  }
  ctx.restore();
}
