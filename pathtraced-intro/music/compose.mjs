// Original orchestral-style cue for the intro (D minor, 6/8). Pure synthesis -> build/music.wav (48 kHz, 16-bit stereo).
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 48000, LEN = 38.2, N = Math.ceil(SR * LEN);
const L = new Float32Array(N), R = new Float32Array(N);
const E = 60 / (85.7 * 3); // eighth note (s); bar = 6 eighths ≈ 1.4 s
const T0 = 3.3;            // ostinato downbeat
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(t, buf, pan = 0, gain = 1) {
  const i0 = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < buf.length; i++) { const k = i0 + i; if (k >= 0 && k < N) { L[k] += buf[i] * gl; R[k] += buf[i] * gr; } }
}

// One-pole lowpass over a rendered buffer.
function lp(buf, cutoff) { const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR); let y = 0; for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y); return buf; }

// Bowed string: detuned saws, vibrato, ADSR, two lowpass passes.
function strings(midi, dur, { att = 0.12, rel = 0.35, cutoff = 1800, voices = 3, vib = 0.004, bright = 1 } = {}) {
  const n = Math.round((dur + rel) * SR), out = new Float32Array(n), f = hz(midi);
  for (let v = 0; v < voices; v++) {
    const det = 1 + (v - (voices - 1) / 2) * 0.004, ph0 = Math.random();
    let ph = ph0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, fv = f * det * (1 + vib * Math.sin(2 * Math.PI * 5.3 * t + v) * Math.min(1, t / 0.4));
      ph += fv / SR; ph -= Math.floor(ph);
      out[i] += (2 * ph - 1) / voices;
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR, env = t < att ? t / att : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
    out[i] *= env * env * (0.9 + 0.1 * rnd() * bright);
  }
  return lp(lp(out, cutoff), cutoff * 1.3);
}

function drum(f0, f1, decay, noise = 0.3, len = 1.6) {
  const n = Math.round(len * SR), out = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t * 18); ph += f / SR; out[i] = (Math.sin(2 * Math.PI * ph) + noise * rnd() * Math.exp(-t * 30)) * Math.exp(-t / decay); }
  return lp(out, 2500);
}
function noiseSwell(len, cutoff = 6000, rev = false) {
  const n = Math.round(len * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / n; out[i] = rnd() * (rev ? x ** 3 : Math.exp(-x * 5)); }
  return lp(out, cutoff);
}

// Progression per bar (4-bar loop): Dm, Dm, Bb, C. Ostinato arpeggio (original): root-fifth-third ×2 per bar.
const CHORDS = [[50, 57, 53], [50, 57, 53], [46, 53, 50], [48, 55, 52]];
const bar = (b) => T0 + b * 6 * E;
const LAST = 17; // bar index where the final cadence chord lands (≈27.1 s)

// Intro drone and timpani roll swell into the first downbeat.
add(0, strings(38, T0 + 0.2, { att: 2.2, rel: 0.6, cutoff: 500, voices: 4 }), 0, 0.5);
add(0.3, strings(50, T0, { att: 2.6, rel: 0.5, cutoff: 900 }), -0.2, 0.18);
for (let t = 0.6, k = 0; t < T0 - 0.05; k++) { add(t, drum(95, 73, 0.5, 0.25, 0.8), 0.15, 0.05 + 0.25 * (t / T0) ** 2); t += Math.max(0.06, 0.32 - t * 0.08); }
add(T0 - 1.6, noiseSwell(1.6, 5000, true), 0, 0.12);

// Ostinato in cellos.
for (let b = 0; b < LAST; b++) {
  const c = CHORDS[b % 4], pat = [c[0], c[1], c[2], c[0], c[1], c[2]];
  const g = 0.16 + 0.1 * Math.min(1, b / 8) + (b >= 14 ? 0.06 : 0);
  pat.forEach((m, k) => add(bar(b) + k * E, strings(m, E * 0.85, { att: 0.015, rel: 0.12, cutoff: 1500 + b * 60 }), -0.25, g * (k % 3 === 0 ? 1.15 : 0.85)));
  add(bar(b), strings(c[0] - 12, 6 * E, { att: 0.05, rel: 0.3, cutoff: 400 }), 0, 0.22);
}

// Melody (original), entering at 6.8 s region; [bar, eighth, length in eighths, midi].
const MEL = [
  [2, 3, 3, 69], [3, 0, 6, 74], [4, 0, 3, 72], [4, 3, 3, 70], [5, 0, 6, 69], [6, 0, 4, 65], [6, 4, 2, 67],
  [7, 0, 6, 69], [8, 0, 3, 74], [8, 3, 3, 77], [9, 0, 6, 76], [10, 0, 3, 74], [10, 3, 3, 72], [11, 0, 6, 72],
  [12, 0, 3, 74], [12, 3, 3, 77], [13, 0, 6, 81], [14, 0, 3, 79], [14, 3, 3, 77], [15, 0, 6, 76], [16, 0, 6, 77],
];
for (const [b, e, len, m] of MEL) {
  const t = bar(b) + e * E, d = len * E;
  add(t, strings(m - 12, d, { att: 0.18, rel: 0.5, cutoff: 1800 }), 0.2, b < 7 ? 0.2 : 0.16);
  if (b >= 7) add(t, strings(m, d, { att: 0.2, rel: 0.6, cutoff: 3200, voices: 4 }), -0.1, b >= 12 ? 0.17 : 0.11);
}

// Pads (violas / horns) from bar 7, swelling toward the cadence.
for (let b = 3; b < LAST; b++) {
  const c = CHORDS[b % 4], g = b < 7 ? 0.05 : b < 12 ? 0.08 : 0.11;
  for (const m of [c[0] + 12, c[2] + 12, c[1] + 12]) add(bar(b), strings(m, 6 * E, { att: 0.5, rel: 0.6, cutoff: 1200, voices: 2 }), (m % 3) / 3 - 0.3, g);
}

// Percussion from 13.3 s: big drum on beats 1 and 4, timpani accents; snare-like roll before the cadence.
for (let b = 7; b < LAST; b++) {
  add(bar(b), drum(120, 48, 0.45, 0.5), 0, 0.42);
  add(bar(b) + 3 * E, drum(110, 52, 0.35, 0.4), 0, 0.3);
  if (b % 2 === 1) add(bar(b) + 5 * E, drum(95, 73, 0.4, 0.3), 0.2, 0.18);
}
for (let t = bar(LAST - 2); t < bar(LAST); t += 0.07) add(t, noiseSwell(0.12, 4000), 0.1, 0.03 + 0.12 * ((t - bar(LAST - 2)) / (12 * E)));
add(bar(LAST) - 2.4, noiseSwell(2.4, 7000, true), 0, 0.2);

// Cadence: D major tutti (Picardy third) at ≈27.1 s, held through the logo, then decaying.
const tc = bar(LAST), hold = 4.4;
add(tc, drum(130, 42, 1.2, 0.8, 3), 0, 0.7);
add(tc, drum(95, 73, 1.4, 0.4, 3), 0.2, 0.35);
add(tc, noiseSwell(3.5, 9000), 0, 0.22);
for (const [m, g, cut] of [[38, 0.35, 500], [50, 0.25, 900], [57, 0.18, 1600], [62, 0.18, 2200], [66, 0.15, 2800], [69, 0.14, 3200], [74, 0.12, 3600], [78, 0.08, 4000]])
  add(tc, strings(m, hold, { att: 0.08, rel: 1.6, cutoff: cut, voices: 4 }), (m % 5) / 5 - 0.4, g);

// End card: quiet low boom and a soft high D that fades out.
add(32.8, drum(70, 38, 1.5, 0.2, 3), 0, 0.25);
add(32.9, strings(74, 3.4, { att: 1.2, rel: 1.4, cutoff: 2600, voices: 4 }), 0, 0.07);
add(32.9, strings(50, 3.4, { att: 1.2, rel: 1.4, cutoff: 700 }), 0, 0.1);

// Freeverb-style stereo reverb.
function reverb(x, offset) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => ({ b: new Float32Array(d + offset), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ b: new Float32Array(d + offset), i: 0 }));
  const y = new Float32Array(x.length), fb = 0.86, damp = 0.25;
  for (let n = 0; n < x.length; n++) {
    let o = 0;
    for (const c of combs) { const v = c.b[c.i]; c.s = v * (1 - damp) + c.s * damp; c.b[c.i] = x[n] * 0.015 + c.s * fb; c.i = (c.i + 1) % c.b.length; o += v; }
    for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; o = v - o; a.i = (a.i + 1) % a.b.length; }
    y[n] = o;
  }
  return y;
}
const wl = reverb(L, 0), wr = reverb(R, 23);
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = L[i] * 0.8 + wl[i] * 0.9; R[i] = R[i] * 0.8 + wr[i] * 0.9; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const fadeOut = (t0, t1) => { for (let i = Math.round(t0 * SR); i < N; i++) { const g = Math.max(0, 1 - (i / SR - t0) / (t1 - t0)); L[i] *= g; R[i] *= g; } };
fadeOut(36.6, 38.1);

const norm = 0.89 / peak, data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(Math.tanh(L[i] * norm) * 32000), 44 + i * 4); data.writeInt16LE(Math.round(Math.tanh(R[i] * norm) * 32000), 46 + i * 4); }
const out = new URL('../build/music.wav', import.meta.url).pathname;
mkdirSync(new URL('../build/', import.meta.url).pathname, { recursive: true });
writeFileSync(out, data);
console.log('music.wav', LEN, 's, cadence at', tc.toFixed(2), 's, peak', peak.toFixed(2));
