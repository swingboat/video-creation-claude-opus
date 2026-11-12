// Deterministic audio build: ambience + creek + music arc + SFX + Chinese dialogue, mixed to one wav.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(ROOT, '.cache/tmp/audio');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const OUT = path.join(ROOT, 'public/audio/final-mix.wav');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const cues = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/timeline/cues.json'), 'utf8'));
const B = cues.beats;
const DUR = cues.duration;
const SR = 48000;
const sh = (c) => execSync(c, { stdio: ['ignore', 'ignore', 'inherit'] });
const parts = []; // {file, gain, delay}
let idx = 0;
const tmp = (ext = 'wav') => path.join(TMP, `a${idx++}.${ext}`);

// ---- synth helper via ffmpeg ----
function ff(filter, out, dur) {
  sh(`ffmpeg -y -f lavfi -i "anullsrc=r=${SR}:cl=stereo" -t ${dur.toFixed(3)} -filter_complex "${filter}" -ar ${SR} -ac 2 "${out}"`);
}
function src(filter, out) {
  sh(`ffmpeg -y -filter_complex "${filter}" -ar ${SR} -ac 2 "${out}"`);
}
function add(file, gain = 1, delay = 0) {
  parts.push({ file, gain, delay });
}

const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi→Hz

// ---- 1. Forest ambience bed (filtered pink noise + airy shimmer) ----
{
  const f = tmp();
  src(
    `anoisesrc=color=pink:r=${SR}:d=${DUR}:a=0.12[n];` +
    `[n]lowpass=f=1600,highpass=f=120,volume=0.5[amb];` +
    `aevalsrc=0.02*sin(2*PI*8000*t)*(0.5+0.5*sin(2*PI*0.1*t)):s=${SR}:d=${DUR}[air];` +
    `[amb][air]amix=inputs=2:normalize=0[a];[a]aformat=channel_layouts=stereo`,
    f,
  );
  add(f, 0.5);
}
// birds: sparse chirps
{
  const chirps = [];
  let fi = `anullsrc=r=${SR}:cl=stereo:d=${DUR}[base]`;
  const times = [];
  let seed = 7;
  for (let t = 1; t < DUR; ) {
    times.push(t);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    t += 1.5 + (seed % 1000) / 250;
  }
  // build a short chirp sample once
  const chirp = tmp();
  src(`aevalsrc='0.25*sin(2*PI*(2500+1200*sin(2*PI*18*t))*t)*exp(-14*t)':s=${SR}:d=0.25[c];[c]aformat=channel_layouts=stereo`, chirp);
  const quiet = (t) => t < 10 || (t > 18 && t < 74); // fewer birds during tension
  for (const t of times) {
    if (t > 58 && t < 66) continue;
    const f = tmp();
    sh(`ffmpeg -y -i "${chirp}" -af "adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)},apad=whole_dur=${DUR},volume=${quiet(t) ? 0.5 : 0.22}" "${f}"`);
    add(f, 0.5);
  }
}

// ---- 2. Creek water (band-passed noise, swells with the flow) ----
{
  const f = tmp();
  // volume envelope: base, rising after 14s, surge near 58.3
  src(
    `anoisesrc=color=white:r=${SR}:d=${DUR}:a=0.5[w];` +
    `[w]bandpass=f=1100:width_type=o:w=2,highpass=f=300[b];` +
    `[b]volume='0.22+0.12*clip((t-14)/8,0,1)+0.5*exp(-((t-58.3)/0.8)^2)':eval=frame[v];` +
    `[v]aformat=channel_layouts=stereo`,
    f,
  );
  add(f, 0.8);
  // low rumble of moving water
  const r = tmp();
  src(`anoisesrc=color=brown:r=${SR}:d=${DUR}:a=0.4[w];[w]lowpass=f=220,volume=0.5[v];[v]aformat=channel_layouts=stereo`, r);
  add(r, 0.5);
}

// ---- 3. Music arc: warm pad → tension → resolve ----
function pad(freqs, t0, t1, gain, vib = 0) {
  const d = t1 - t0;
  const terms = freqs.map((fr, i) => `${(0.9 / freqs.length).toFixed(3)}*sin(2*PI*${fr.toFixed(2)}*t${vib ? `+${vib}*sin(2*PI*5*t)` : ''})`).join('+');
  const f = tmp();
  const env = `min(1,(t)/1.2)*min(1,(${d.toFixed(2)}-t)/1.5)`;
  src(`aevalsrc='(${terms})*(${env})*${gain}':s=${SR}:d=${d.toFixed(3)}[m];[m]lowpass=f=2200,aformat=channel_layouts=stereo`, f);
  add(f, 1, t0);
}
// section chords (midi): A-major warmth → tense minor cluster → resolve
pad([note(57), note(61), note(64)], 0, 24, 0.5); // A C# E
pad([note(57), note(60), note(64)], 10, 24, 0.25, 2); // add minor third tension creeping in
pad([note(55), note(58), note(62), note(65)], 22, 42, 0.5, 3); // G Bb D F — unease
pad([note(50), note(57), note(60), note(63)], 40, 62, 0.55, 4); // D A C Eb — tension
pad([note(45), note(52), note(57)], 57, 69, 0.6, 5); // low drive at climax
pad([note(53), note(57), note(60), note(64)], 66, 82, 0.5); // F A C E — resolving warm
pad([note(48), note(55), note(60), note(64)], 80, 90, 0.5); // C G C E — home, major
// gentle bell melody (pluck arpeggio) at opening and ending
function pluck(freq, t, gain = 0.3, dec = 6) {
  const f = tmp();
  src(`aevalsrc='${gain}*sin(2*PI*${freq.toFixed(2)}*t)*exp(-${dec}*t)':s=${SR}:d=1.0[p];[p]aformat=channel_layouts=stereo`, f);
  add(f, 1, t);
}
for (const [t, n] of [[1.0, 69], [1.8, 73], [2.6, 76], [3.4, 73], [4.4, 69], [6, 76], [7.4, 72]]) pluck(note(n), t, 0.22);
for (const [t, n] of [[82, 69], [83, 72], [84, 76], [85.2, 79], [86.5, 76], [87.6, 72], [88.6, 69]]) pluck(note(n), t, 0.26);

// ---- 4. SFX ----
function noiseBurst(t, dur, gain, lo, hi, dec = 10) {
  const f = tmp();
  src(`anoisesrc=color=white:r=${SR}:d=${dur}:a=1[n];[n]bandpass=f=${(lo + hi) / 2}:width_type=h:w=${hi - lo},volume='exp(-${dec}*t)*${gain}':eval=frame,aformat=channel_layouts=stereo`, f);
  add(f, 1, t);
}
function tone(t, freq, dur, gain, dec = 6, wobble = 0) {
  const f = tmp();
  src(`aevalsrc='${gain}*sin(2*PI*${freq}*t${wobble ? `+${wobble}*sin(2*PI*7*t)` : ''})*exp(-${dec}*t)':s=${SR}:d=${dur}[p];[p]aformat=channel_layouts=stereo`, f);
  add(f, 1, t);
}
// footsteps during walking (group entrance 0-11, home walk 85-90)
let fseed = 3;
for (let t = 0.5; t < 11; t += 0.42) { fseed = (fseed * 48271) % 0x7fffffff; noiseBurst(t + (fseed % 100) / 2000, 0.12, 0.18, 120, 500, 22); }
for (let t = 85.8; t < 90; t += 0.45) { noiseBurst(t, 0.12, 0.14, 120, 500, 22); }
// basket set down
noiseBurst(B.basketDown, 0.2, 0.25, 150, 600, 14);
// log shift creak + branch hit
tone(B.logShift, 70, 1.2, 0.3, 3, 6);
noiseBurst(B.logShift + 0.05, 0.5, 0.4, 200, 1500, 8);
noiseBurst(B.branchHit, 0.3, 0.35, 300, 2000, 10);
// knot/rope creak during tie and pulls
for (const t of [B.knotStart, B.knotStart + 1, B.pull1, B.pull2, B.pull3, B.repull, B.repull + 2, B.repull + 3.6]) { tone(t, 140, 0.5, 0.18, 5, 10); noiseBurst(t, 0.25, 0.12, 800, 3000, 9); }
// surge + splashes
noiseBurst(B.surge, 1.4, 0.5, 200, 2500, 2.2);
for (const t of [B.surge, B.surge + 0.2, B.slip, B.grab]) noiseBurst(t + 0.02, 0.5, 0.35, 600, 4000, 6);
// rope slip zing
tone(B.slip, 420, 0.6, 0.22, 6, 20);
// deer bleats (synth): short nasal tone with vibrato
for (const t of [B.bleat1, B.bleat2, 19.6]) tone(t, 520, 0.5, 0.3, 4, 40);
tone(B.nuzzle, 480, 0.35, 0.2, 5, 30);
// sneeze via `say`
{
  const aiff = path.join(TMP, 'sneeze.aiff');
  try {
    sh(`say -v Reed -r 190 -o "${aiff}" "阿——嚏！"`);
    const f = tmp();
    sh(`ffmpeg -y -i "${aiff}" -af "adelay=${Math.round(B.sneeze * 1000)}|${Math.round(B.sneeze * 1000)},apad=whole_dur=${DUR},volume=0.9" -ar ${SR} -ac 2 "${f}"`);
    add(f, 1);
  } catch (e) { console.warn('sneeze say failed', e.message); }
}

// ---- 5. Dialogue (macOS say, per-character voice) ----
const VOICE = { snow: 'Tingting', doc: 'Grandpa', grumpy: 'Rocko', happy: 'Eddy', bashful: 'Reed', sneezy: 'Reed' };
const RATE = { snow: 180, doc: 160, grumpy: 170, happy: 195, bashful: 165, sneezy: 170 };
for (const d of cues.dialogue) {
  const voice = VOICE[d.who] || 'Tingting';
  const aiff = path.join(TMP, `d_${idx}.aiff`);
  try {
    sh(`say -v ${voice} -r ${RATE[d.who] || 180} -o "${aiff}" ${JSON.stringify(d.text)}`);
    const f = tmp();
    const ms = Math.round(d.t * 1000);
    sh(`ffmpeg -y -i "${aiff}" -af "adelay=${ms}|${ms},apad=whole_dur=${DUR},volume=1.5" -ar ${SR} -ac 2 "${f}"`);
    add(f, 1);
  } catch (e) { console.warn('say failed for', d.text, e.message); }
}

// ---- 6. Mix everything ----
console.log(`mixing ${parts.length} tracks…`);
// pad/trim all to full duration and apply per-track gain + optional delay
const inputs = parts.map((p) => `-i "${p.file}"`).join(' ');
const chains = parts
  .map((p, i) => {
    const delayMs = Math.round((p.delay || 0) * 1000);
    const d = delayMs > 0 ? `adelay=${delayMs}|${delayMs},` : '';
    return `[${i}:a]${d}apad=whole_dur=${DUR},atrim=0:${DUR},volume=${p.gain}[t${i}]`;
  })
  .join(';');
const mixIns = parts.map((_, i) => `[t${i}]`).join('');
const filter = `${chains};${mixIns}amix=inputs=${parts.length}:normalize=0:dropout_transition=0[mx];[mx]loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95,aformat=channel_layouts=stereo[out]`;
sh(`ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[out]" -t ${DUR} -ar ${SR} -ac 2 "${OUT}"`);
console.log('✓ wrote', path.relative(ROOT, OUT));
