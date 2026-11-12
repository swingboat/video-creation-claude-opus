// Procedural audio: a light plucked music bed and cartoon sound effects, all synthesized in code.
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

// RBJ band-pass biquad whose centre can move; coefficients refreshed every 32 samples.
function bandNoise(buf, t0, dur, amp, fFrom, fTo, q, shape, rand) {
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    if (i % 32 === 0) {
      const p = i / n;
      const f = fFrom * Math.pow(fTo / fFrom, p);
      const w = (2 * Math.PI * f) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      b0 = al / a0; b2 = -al / a0; a1 = (-2 * Math.cos(w)) / a0; a2 = (1 - al) / a0;
    }
    const x = rand() * 2 - 1;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    if (start + i >= 0) buf[start + i] += y * amp * shape(i / n);
  }
}

function tone(buf, t0, dur, amp, freqAt, envAt, wave = Math.sin) {
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const u = i / SR;
    ph += (2 * Math.PI * freqAt(u, i / n)) / SR;
    if (start + i >= 0) buf[start + i] += wave(ph) * amp * envAt(u, i / n);
  }
}

// Karplus–Strong plucked string.
function pluck(buf, t0, freq, dur, amp, rand, damp = 0.996) {
  const N = Math.max(2, Math.round(SR / freq));
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    prev = prev * 0.6 + (rand() * 2 - 1) * 0.4;
    ring[i] = prev;
  }
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let idx = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const a = ring[idx], b = ring[(idx + 1) % N];
    ring[idx] = damp * 0.5 * (a + b);
    idx = (idx + 1) % N;
    const tail = Math.min(1, (n - i) / (0.05 * SR));
    buf[start + i] += a * amp * tail;
  }
}

const marimba = (buf, t0, f, amp = 0.3) => {
  tone(buf, t0, 0.5, amp, () => f, (u) => Math.exp(-u * 9) * Math.min(1, u * 400));
  tone(buf, t0, 0.15, amp * 0.25, () => f * 3.93, (u) => Math.exp(-u * 30) * Math.min(1, u * 400));
};

const bell = (buf, t0, f, amp = 0.25) => {
  for (const [k, a, d] of [[1, 1, 3.2], [2.76, 0.45, 6], [5.4, 0.22, 10], [8.93, 0.1, 14]])
    tone(buf, t0, 1.2, amp * a, () => f * k, (u) => Math.exp(-u * d) * Math.min(1, u * 600));
};

// ---------- sound effects ----------
const FX = {
  pop(buf, t, o, rand) {
    const f = o.f ?? 700;
    tone(buf, t, 0.09, 0.35 * (o.amp ?? 1), (u, p) => f * (1.6 - 0.9 * p), (u, p) => Math.sin(Math.PI * Math.min(1, p * 1.3)));
  },
  note(buf, t, o) { marimba(buf, t, midi(o.n), 0.24 * (o.amp ?? 1)); },
  ding(buf, t, o) { bell(buf, t, midi(o.n ?? 88), 0.16 * (o.amp ?? 1)); },
  sparkle(buf, t, o) { [88, 92, 95, 100].forEach((n, i) => bell(buf, t + i * 0.06, midi(n), 0.07 * (o.amp ?? 1))); },
  whoosh(buf, t, o, rand) {
    const d = o.d ?? 0.4;
    bandNoise(buf, t, d, 0.5 * (o.amp ?? 1), o.from ?? 500, o.to ?? 2600, 1.4, (p) => Math.sin(Math.PI * p) ** 2, rand);
  },
  boing(buf, t, o) {
    tone(buf, t, 0.45, 0.28 * (o.amp ?? 1), (u) => 180 + 260 * Math.min(1, u * 5) + 40 * Math.sin(u * 70) * Math.exp(-u * 5),
      (u) => Math.exp(-u * 5) * Math.min(1, u * 300));
  },
  slam(buf, t, o, rand) {
    tone(buf, t, 0.45, 0.9, (u) => 95 - 40 * Math.min(1, u * 4), (u) => Math.exp(-u * 9) * Math.min(1, u * 800));
    bandNoise(buf, t, 0.25, 1.4, 1800, 300, 0.7, (p) => Math.exp(-p * 6), rand);
    bandNoise(buf, t + 0.02, 0.6, 0.35, 260, 140, 1.2, (p) => Math.exp(-p * 4), rand);
  },
  stamp(buf, t, o, rand) {
    tone(buf, t, 0.3, 0.8, (u) => 130 - 60 * Math.min(1, u * 5), (u) => Math.exp(-u * 14) * Math.min(1, u * 900));
    bandNoise(buf, t, 0.12, 1.0, 3000, 900, 0.8, (p) => Math.exp(-p * 7), rand);
  },
  tick(buf, t, o) {
    tone(buf, t, 0.08, 0.3, () => 1900, (u) => Math.exp(-u * 60));
    marimba(buf, t + 0.02, midi(o.n ?? 84), 0.16);
  },
  scribble(buf, t, o, rand) {
    const d = o.d ?? 0.6;
    bandNoise(buf, t, d, 0.35, 2600, 3600, 2.5, (p) => (0.55 + 0.45 * Math.sin(p * d * 2 * Math.PI * 9)) * Math.min(1, p * 12, (1 - p) * 12), rand);
  },
  buzz(buf, t) {
    const sq = (ph) => (Math.sin(ph) > 0 ? 1 : -1);
    for (const [k, dt] of [[0, 0], [0, 0.2]]) {
      tone(buf, t + dt, 0.16, 0.08, () => 150 + k, (u, p) => Math.min(1, p * 20, (1 - p) * 20), sq);
      tone(buf, t + dt, 0.16, 0.08, () => 157 + k, (u, p) => Math.min(1, p * 20, (1 - p) * 20), sq);
    }
  },
  alarm(buf, t) {
    for (let i = 0; i < 2; i++)
      tone(buf, t + i * 0.22, 0.2, 0.12, (u, p) => 700 + 500 * Math.sin(Math.PI * p), (u, p) => Math.min(1, p * 15, (1 - p) * 15));
  },
  tada(buf, t, o) {
    const a = o.amp ?? 1;
    [72, 76, 79].forEach((n, i) => marimba(buf, t + i * 0.08, midi(n), 0.22 * a));
    [84, 88, 91].forEach((n) => bell(buf, t + 0.26, midi(n), 0.09 * a));
    [60, 64, 67, 72].forEach((n) => marimba(buf, t + 0.26, midi(n), 0.14 * a));
  },
  confetti(buf, t, o, rand) {
    bandNoise(buf, t, 0.35, 0.5, 900, 4000, 1.2, (p) => Math.sin(Math.PI * p) ** 2, rand);
    for (let i = 0; i < 40; i++) {
      const dt = 0.1 + rand() * 1.4;
      tone(buf, t + dt, 0.02, 0.05 * (1 - dt / 1.6), () => 3000 + rand() * 3000, (u) => Math.exp(-u * 300));
    }
  },
  zap(buf, t, o, rand) {
    const sq = (ph) => (Math.sin(ph) > 0 ? 1 : -1);
    tone(buf, t, 0.22, 0.07 * (o.amp ?? 1), (u, p) => 1800 - 1400 * p + 120 * Math.sin(u * 900), (u, p) => Math.min(1, p * 30) * (1 - p), sq);
    bandNoise(buf, t, 0.18, 0.4 * (o.amp ?? 1), 5000, 2000, 2, (p) => Math.exp(-p * 5), rand);
  },
  wobble(buf, t, o) {
    const d = o.d ?? 0.8, f = o.f ?? 330;
    tone(buf, t, d, 0.12 * (o.amp ?? 1), (u) => f * (1 + 0.12 * Math.sin(u * 2 * Math.PI * (o.rate ?? 5))),
      (u, p) => Math.min(1, p * 10, (1 - p) * 4));
  },
  static(buf, t, o, rand) {
    const d = o.d ?? 0.6;
    bandNoise(buf, t, d, 0.3 * (o.amp ?? 1), 2500, 2500, 0.6, (p) => Math.min(1, p * 15, (1 - p) * 8) * (0.6 + 0.4 * Math.sin(p * 90)), rand);
  },
  wind(buf, t, o, rand) {
    const d = o.d;
    bandNoise(buf, t, d, 0.22, 380, 520, 0.9,
      (p) => Math.min(1, p * d * 2, (1 - p) * d * 6) * (0.65 + 0.35 * Math.sin(p * d * 2.3)), rand);
  },
};

export function buildSfx(events, duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(7);
  for (const e of events) FX[e.type](buf, e.t, e, rand);
  return buf;
}

// ---------- music bed: I–V–vi–IV ukulele-ish plucks, soft bass, shaker ----------
export function buildMusic(duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(42);
  const bpm = 124, beat = 60 / bpm, bar = beat * 4;
  const chords = [
    { root: 48, tones: [60, 64, 67, 72] }, // C
    { root: 43, tones: [59, 62, 67, 71] }, // G
    { root: 45, tones: [60, 64, 69, 72] }, // Am
    { root: 41, tones: [60, 65, 69, 72] }, // F
  ];
  const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
  const bars = Math.ceil(duration / bar);
  for (let b = 0; b < bars; b++) {
    const c = chords[b % 4];
    const t0 = b * bar;
    for (let k = 0; k < 8; k++) {
      const t = t0 + k * (beat / 2);
      const accent = k % 2 === 0 ? 1 : 0.7;
      pluck(buf, t, midi(c.tones[pattern[k]]), 0.9, 0.11 * accent, rand, 0.9965);
    }
    for (const k of [0, 2.5]) {
      const f = midi(c.root);
      tone(buf, t0 + k * beat, 0.7, 0.16, () => f, (u) => Math.exp(-u * 4) * Math.min(1, u * 200));
      tone(buf, t0 + k * beat, 0.7, 0.05, () => f * 2, (u) => Math.exp(-u * 6) * Math.min(1, u * 200));
    }
    for (let k = 0; k < 16; k++) {
      const amp = k % 4 === 2 ? 0.05 : k % 2 ? 0.018 : 0.03;
      bandNoise(buf, t0 + k * (beat / 4), 0.06, amp, 7000, 9000, 1.5, (p) => Math.exp(-p * 6), rand);
    }
    // a sparkly glockenspiel answer on every other bar
    if (b % 2 === 1) [84, 88, 91].forEach((n, i) => bell(buf, t0 + beat * (2 + i * 0.5), midi(n + (c.tones[0] - 60)), 0.035));
  }
  const fadeIn = 0.2 * SR, fadeOut = 2.5 * SR;
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
