// Procedural audio: physical-ish impact sounds scaled by domino size, plus a cinematic ambient bed.
import { writeFileSync } from 'node:fs';

export const SR = 48000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tone(buf, t0, dur, amp, freqAt, envAt) {
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const u = i / SR;
    ph += (2 * Math.PI * freqAt(u, i / n)) / SR;
    if (start + i >= 0) buf[start + i] += Math.sin(ph) * amp * envAt(u, i / n);
  }
}

// RBJ band-pass filtered noise with a moving centre frequency.
function bandNoise(buf, t0, dur, amp, fFrom, fTo, q, shape, rand) {
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    if (i % 32 === 0) {
      const f = fFrom * Math.pow(fTo / fFrom, i / n);
      const w = (2 * Math.PI * f) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      b0 = al / a0; b2 = -al / a0; a1 = (-2 * Math.cos(w)) / a0; a2 = (1 - al) / a0;
    }
    const x = rand() * 2 - 1;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    if (start + i >= 0) buf[start + i] += y * amp * shape(i / n);
  }
}

// ---------- impacts: bigger domino → lower, louder, longer ----------
const size = (h) => Math.log(h / 5) / Math.log(650 / 5); // 0 for the 5 mm domino, 1 for the 65 cm one
const FX = {
  clink(buf, t, e, rand) { // steel ball taps plastic
    for (const [k, a] of [[1, 1], [2.7, 0.5], [5.2, 0.25]])
      tone(buf, t, 0.5, 0.12 * a, () => 3400 * k, (u) => Math.exp(-u * (14 + 8 * k)) * Math.min(1, u * 3000));
    bandNoise(buf, t, 0.03, 0.35, 6000, 4000, 1.2, (p) => Math.exp(-p * 5), rand);
  },
  clack(buf, t, e, rand) { // lacquered domino strikes the next one
    const s = size(e.h), f = 2600 * Math.pow(0.22, s), amp = 0.25 + 0.55 * s;
    bandNoise(buf, t, 0.05 + 0.12 * s, amp, f * 1.6, f, 2.2, (p) => Math.exp(-p * 6), rand);
    tone(buf, t, 0.08 + 0.3 * s, amp * 0.5, () => f * 0.55, (u) => Math.exp(-u * (60 - 45 * s)) * Math.min(1, u * 2000));
  },
  land(buf, t, e, rand) { // flat slap on the wooden floor
    const s = size(e.h), f = 1500 * Math.pow(0.12, s), amp = 0.2 + 0.9 * s * s;
    bandNoise(buf, t, 0.06 + 0.3 * s, amp, f * 2, f * 0.7, 0.9, (p) => Math.exp(-p * 5), rand);
    tone(buf, t, 0.15 + 0.7 * s, amp * 0.9, (u) => (90 + 400 * (1 - s)) * (1 - 0.3 * Math.min(1, u * 4)),
      (u) => Math.exp(-u * (40 - 33 * s)) * Math.min(1, u * 1500));
  },
};

// Parallel damped comb filters: a small room so the impacts don't sound dry.
function reverb(dry, mix = 0.22) {
  const out = Float32Array.from(dry);
  for (const [d, g] of [[1557, 0.8], [1617, 0.79], [1491, 0.78], [1422, 0.77]]) {
    const c = new Float32Array(dry.length);
    let lp = 0;
    for (let i = 0; i < dry.length; i++) {
      lp = i >= d ? lp * 0.3 + c[i - d] * 0.7 : 0;
      c[i] = dry[i] + g * lp;
      out[i] += c[i] * mix * 0.25;
    }
  }
  return out;
}

export function buildSfx(events, duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(7);
  for (const e of events) FX[e.type](buf, e.t, e, rand);
  return reverb(buf);
}

// ---------- ambient bed: soft pad that swells into the last domino, then opens up ----------
export function buildMusic(duration, tSwell, tLand) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(42);
  const chords = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [43, 50, 55, 58, 62], [45, 52, 57, 61, 64]]; // Dm Bb Gm A
  const bar = 3.2;
  for (let b = 0; b * bar < duration; b++) {
    const t0 = b * bar;
    const lift = 0.6 + 0.6 * Math.min(1, Math.max(0, (t0 - 4) / (tSwell - 4)));
    const notes = t0 >= tLand - 0.5 ? [50, 57, 62, 66, 69, 74] : chords[b % 4]; // D major after the giant lands
    for (const n of notes)
      for (const det of [-0.08, 0.08])
        tone(buf, t0, bar + 1.2, 0.022 * lift, () => midi(n + det),
          (u) => Math.min(1, u / 1.0) * Math.min(1, Math.max(0, (bar + 1.2 - u) / 1.2)));
    // a high pluck ticks like a clock, getting denser as the chain accelerates
    for (let k = 0; k < 4; k++)
      tone(buf, t0 + k * (bar / 4), 0.6, 0.03, () => midi(notes[notes.length - 1] + 12),
        (u) => Math.exp(-u * 7) * Math.min(1, u * 800));
  }
  // riser into the giant's landing, then a deep boom
  bandNoise(buf, tLand - 2.4, 2.4, 0.25, 300, 4000, 1.5, (p) => p * p, rand);
  tone(buf, tLand, 2.5, 0.5, (u) => 48 - 12 * Math.min(1, u), (u) => Math.exp(-u * 1.8) * Math.min(1, u * 400));
  const fadeIn = 0.8 * SR, fadeOut = 2.0 * SR;
  for (let i = 0; i < buf.length; i++) buf[i] *= Math.min(1, i / fadeIn, (buf.length - i) / fadeOut);
  return buf;
}

export function writeWav(path, mono) {
  let peak = 0;
  for (const v of mono) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.98 ? 0.98 / peak : 1;
  const n = mono.length, data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.round(mono[i] * g * 32767)));
    data.writeInt16LE(s, i * 4);
    data.writeInt16LE(s, i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}
