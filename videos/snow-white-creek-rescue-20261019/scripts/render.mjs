// Unified render harness: stills, clips and the full film via @remotion/bundler + renderer.
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill, renderMedia } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
process.env.TMPDIR = process.env.TMP = process.env.TEMP = path.join(ROOT, '.cache/tmp');
fs.mkdirSync(process.env.TMPDIR, { recursive: true });

const FPS = 30;
const GL = 'angle';

let _bundle = null;
async function getBundle() {
  if (_bundle) return _bundle;
  process.stdout.write('· bundling…\n');
  _bundle = await bundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: path.join(ROOT, 'public'),
    onProgress: (p) => process.stdout.write(`\r  bundle ${p}%   `),
    webpackOverride: (c) => c,
  });
  process.stdout.write('\n');
  return _bundle;
}

async function comp(id, inputProps = {}) {
  const serveUrl = await getBundle();
  const c = await selectComposition({ serveUrl, id, inputProps });
  return { serveUrl, c };
}

const chromium = { gl: GL, headless: true, disableWebSecurity: true };

async function still(frame, out, id = 'film-silent', props = {}) {
  const { serveUrl, c } = await comp(id, props);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const start = Date.now();
  await renderStill({
    serveUrl,
    composition: c,
    output: out,
    frame,
    imageFormat: 'png',
    onBrowserLog: (l) => { if (l.text.startsWith('DBG')) console.log(l.text); },
    chromiumOptions: chromium,
    timeoutInMilliseconds: 240000,
    scale: 1,
  });
  console.log(`✓ still f${frame} → ${path.relative(ROOT, out)} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
}

async function media(id, out, { startSec = 0, endSec = null, props = {}, crf = 23, codec = 'h264' } = {}) {
  const { serveUrl, c } = await comp(id, props);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const durationFrames = c.durationInFrames;
  const startFrame = Math.round(startSec * FPS);
  const endFrame = endSec == null ? durationFrames - 1 : Math.min(durationFrames - 1, Math.round(endSec * FPS));
  const start = Date.now();
  let last = 0;
  await renderMedia({
    serveUrl,
    composition: c,
    codec,
    crf,
    x264Preset: 'slow',
    pixelFormat: 'yuv420p',
    audioBitrate: '192k',
    outputLocation: out,
    frameRange: [startFrame, endFrame],
    chromiumOptions: chromium,
    concurrency: 1,
    timeoutInMilliseconds: 240000,
    onProgress: ({ renderedFrames }) => {
      const total = endFrame - startFrame + 1;
      if (renderedFrames - last >= 10 || renderedFrames === total) {
        last = renderedFrames;
        const el = (Date.now() - start) / 1000;
        const fps = renderedFrames / Math.max(el, 0.1);
        process.stdout.write(`\r  ${renderedFrames}/${total} frames  ${fps.toFixed(2)} fps  eta ${((total - renderedFrames) / Math.max(fps, 0.01)).toFixed(0)}s     `);
      }
    },
  });
  console.log(`\n✓ ${path.relative(ROOT, out)} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
}

const [, , cmd, ...rest] = process.argv;
const OUT = path.join(ROOT, 'out');

if (cmd === 'still') {
  const frame = parseInt(rest[0] ?? '0', 10);
  const out = rest[1] ? path.resolve(ROOT, rest[1]) : path.join(ROOT, 'checks', `still-${frame}.png`);
  await still(frame, out, rest[2] ?? 'film-silent');
} else if (cmd === 'clip') {
  const a = parseFloat(rest[0] ?? '22'), b = parseFloat(rest[1] ?? '30');
  const out = rest[2] ? path.resolve(ROOT, rest[2]) : path.join(OUT, 'test-clip.mp4');
  const id = rest[3] ?? 'film-silent';
  await media(id, out, { startSec: a, endSec: b });
} else if (cmd === 'full') {
  const out = rest[0] ? path.resolve(ROOT, rest[0]) : path.join(OUT, 'snow-white-creek-rescue.mp4');
  const id = rest[1] ?? 'film';
  await media(id, out, {});
} else {
  console.log('usage: render.mjs still <frame> [out] [id] | clip <a> <b> [out] [id] | full [out] [id]');
  process.exit(1);
}

