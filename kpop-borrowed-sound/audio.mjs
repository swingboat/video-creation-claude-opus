// Procedural audio: one beat per era (lo-fi, new jack swing, dance-pop, electropop, electro house, disco,
// hip-hop / pop / jersey club) plus sound effects. Everything is synthesized here — no samples.
import { writeFileSync } from 'node:fs';
import { at, atEnd } from './lib.mjs';

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

function tone(buf, t0, dur, amp, freqAt, envAt, wave = Math.sin) {
  const start = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const u = i / SR;
    ph += (2 * Math.PI * freqAt(u, i / n)) / SR;
    if (start + i >= 0) buf[start + i] += wave(ph) * amp * envAt(u, i / n);
  }
}

// Detuned saw/square voices through a one-pole low-pass: stabs, pads, leads.
function synth(buf, t0, dur, notes, amp, o = {}) {
  const { cut = 2400, atk = 0.005, rel = 0.12, detune = 0.006, wave = 'saw', voices = 2 } = o;
  const start = Math.floor(t0 * SR), n = Math.floor((dur + rel) * SR);
  const k = 1 - Math.exp((-2 * Math.PI * cut) / SR);
  const ph = new Float64Array(notes.length * voices);
  let lp = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    let s = 0;
    notes.forEach((m, j) => {
      for (let v = 0; v < voices; v++) {
        const f = midi(m) * (1 + (v - (voices - 1) / 2) * detune);
        const p = (ph[j * voices + v] = (ph[j * voices + v] + f / SR) % 1);
        s += wave === 'saw' ? 2 * p - 1 : wave === 'sq' ? (p < 0.5 ? 1 : -1) : Math.sin(2 * Math.PI * p);
      }
    });
    lp += k * (s - lp);
    const u = i / SR, env = Math.min(1, u / atk) * (u < dur ? 1 : Math.exp(-(u - dur) / (rel / 4)));
    if (start + i >= 0) buf[start + i] += (lp / (notes.length * voices)) * amp * env;
  }
}

// ---------- drums ----------
const D = {
  kick(b, t, a = 1) {
    tone(b, t, 0.35, 0.9 * a, (u) => 48 + 110 * Math.exp(-u * 32), (u) => Math.exp(-u * 9) * Math.min(1, u * 2000));
  },
  snare(b, t, a = 1, r) {
    tone(b, t, 0.12, 0.3 * a, () => 190, (u) => Math.exp(-u * 30));
    bandNoise(b, t, 0.2, 0.9 * a, 2400, 1800, 0.7, (p) => Math.exp(-p * 7), r);
  },
  clap(b, t, a = 1, r) {
    for (const d of [0, 0.011, 0.023]) bandNoise(b, t + d, 0.03, 0.8 * a, 1500, 1300, 1.2, (p) => 1 - p, r);
    bandNoise(b, t + 0.03, 0.22, 0.6 * a, 1400, 1100, 1.0, (p) => Math.exp(-p * 5), r);
  },
  hat(b, t, a = 1, r, open = false) {
    bandNoise(b, t, open ? 0.25 : 0.05, 0.28 * a, 8500, 9500, 1.4, (p) => Math.exp(-p * (open ? 4 : 7)), r);
  },
  rim(b, t, a = 1) { tone(b, t, 0.05, 0.25 * a, () => 1700, (u) => Math.exp(-u * 90)); },
};
const bass = (b, t, d, m, a = 0.5) => tone(b, t, d, a, () => midi(m), (u, p) => Math.min(1, u * 300) * Math.min(1, (1 - p) * 12), (ph) => Math.tanh(Math.sin(ph) * 2.2) * 0.8);
const keys = (b, t, d, ns, a = 0.12) => ns.forEach((m) => tone(b, t, d, a, () => midi(m), (u) => Math.exp(-u * 2.2) * Math.min(1, u * 200) * (0.85 + 0.15 * Math.sin(u * 30)), (ph) => Math.sin(ph) + 0.3 * Math.sin(2 * ph)));
const bell = (b, t, m, a = 0.1) => [[1, 1, 3], [2.76, 0.4, 6], [5.4, 0.2, 10]].forEach(([k, g, d]) => tone(b, t, 1.2, a * g, () => midi(m) * k, (u) => Math.exp(-u * d) * Math.min(1, u * 600)));

// ---------- one function per era; each lays bars from t0 to t1 ----------
const STYLES = {
  lofi: { bpm: 78, chords: [[57, 60, 64, 67], [50, 57, 60, 65], [55, 59, 62, 65], [48, 55, 59, 64]], bar(b, t, k, B, c, r) {
    D.kick(b, t, 0.7); D.kick(b, t + B * 2.5, 0.55); D.snare(b, t + B, 0.35, r); D.snare(b, t + B * 3, 0.35, r);
    for (let i = 0; i < 8; i++) D.hat(b, t + B * (i / 2 + (i % 2 ? 0.08 : 0)), 0.35, r);
    keys(b, t, B * 3.6, c, 0.07); bass(b, t, B * 1.8, c[0] - 12, 0.3);
  } },
  njs: { bpm: 104, chords: [[52, 59, 62, 67], [57, 61, 64, 67]], bar(b, t, k, B, c, r) {
    const sw = (x) => B * (Math.floor(x) + (x % 1 === 0.25 ? 0.33 : x % 1 === 0.75 ? 0.83 : x % 1));
    for (const x of [0, 0.75, 1.5, 2.25, 2.5]) D.kick(b, t + sw(x), 0.95);
    for (const x of [1, 3]) { D.snare(b, t + B * x, 0.9, r); D.clap(b, t + B * x, 0.5, r); }
    for (let i = 0; i < 16; i++) D.hat(b, t + sw(i / 4), i % 2 ? 0.25 : 0.45, r);
    for (const x of [0.5, 1.75, 2.5, 3.5]) synth(b, t + sw(x), 0.1, c.map((m) => m + 12), 0.2, { cut: 3200, voices: 2 });
    for (const x of [0, 0.75, 2, 2.75]) bass(b, t + sw(x), B * 0.5, c[0] - 12, 0.45);
  } },
  dance: { bpm: 118, chords: [[50, 57, 62, 65], [46, 58, 62, 65], [48, 55, 60, 64], [45, 57, 60, 64]], bar(b, t, k, B, c, r) {
    for (let i = 0; i < 4; i++) { D.kick(b, t + B * i, 0.9); D.hat(b, t + B * (i + 0.5), 0.5, r, true); }
    D.snare(b, t + B, 0.7, r); D.snare(b, t + B * 3, 0.7, r);
    synth(b, t, B * 3.8, c.slice(1), 0.12, { cut: 1500, atk: 0.2, rel: 0.4, voices: 3 });
    for (let i = 0; i < 8; i++) bass(b, t + (B * i) / 2, B * 0.4, c[0] - 12 + (i % 2 ? 12 : 0), 0.35);
  } },
  electro: { bpm: 128, chords: [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]], bar(b, t, k, B, c, r) {
    for (let i = 0; i < 4; i++) D.kick(b, t + B * i, 0.85);
    D.clap(b, t + B, 0.7, r); D.clap(b, t + B * 3, 0.7, r);
    for (let i = 0; i < 16; i++) D.hat(b, t + (B * i) / 4, i % 4 === 2 ? 0.5 : 0.22, r);
    // the hook: one note hammered four times, then an answer
    const hook = [0, 0, 0, 0, 2, 4, 2, 0].map((d) => c[3] + 12 + d);
    hook.forEach((m, i) => synth(b, t + (B * i) / 2, B * 0.3, [m], 0.16, { wave: 'sq', cut: 4200, voices: 1 }));
    for (let i = 0; i < 4; i++) bass(b, t + B * i + B / 2, B * 0.4, c[0] - 12, 0.4);
  } },
  house: { bpm: 128, chords: [[53, 60, 65, 68], [49, 61, 65, 68], [56, 60, 63, 68], [51, 58, 63, 67]], bar(b, t, k, B, c, r) {
    for (let i = 0; i < 4; i++) { D.kick(b, t + B * i, 1.05); D.hat(b, t + B * (i + 0.5), 0.55, r, true); }
    D.clap(b, t + B, 0.8, r); D.clap(b, t + B * 3, 0.8, r);
    for (const x of [0.5, 1.5, 2.5, 3.25, 3.5]) synth(b, t + B * x, 0.14, c.map((m) => m + 12), 0.3, { cut: 5200, voices: 4, detune: 0.012 });
    for (let i = 0; i < 4; i++) bass(b, t + B * (i + 0.5), B * 0.45, c[0] - 24, 0.55);
  } },
  disco: { bpm: 114, chords: [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65], [46, 58, 62, 65]], bar(b, t, k, B, c, r) {
    for (let i = 0; i < 4; i++) { D.kick(b, t + B * i, 0.85); D.hat(b, t + B * (i + 0.5), 0.55, r, true); }
    D.clap(b, t + B, 0.7, r); D.clap(b, t + B * 3, 0.7, r);
    for (let i = 0; i < 8; i++) bass(b, t + (B * i) / 2, B * 0.42, c[0] - 12 + (i % 2 ? 12 : 0), 0.45);
    for (const x of [0, 1.5, 2.75]) synth(b, t + B * x, 0.18, c.map((m) => m + 12), 0.16, { cut: 3800, voices: 3 });
    for (let i = 0; i < 16; i++) if (i % 4 !== 0) D.rim(b, t + (B * i) / 4, 0.25);
  } },
  boombap: { bpm: 90, chords: [[45, 57, 60, 64], [41, 57, 60, 65]], bar(b, t, k, B, c, r) {
    for (const x of [0, 0.75, 2.5]) D.kick(b, t + B * x, 1);
    D.snare(b, t + B, 0.95, r); D.snare(b, t + B * 3, 0.95, r);
    for (let i = 0; i < 8; i++) D.hat(b, t + (B * i) / 2, 0.3, r);
    keys(b, t, B * 2, c.slice(1), 0.06); bass(b, t, B * 1.5, c[0] - 12, 0.45);
  } },
  jersey: { bpm: 140, chords: [[52, 59, 64, 68], [49, 56, 61, 64], [45, 57, 61, 64], [47, 59, 63, 66]], bar(b, t, k, B, c, r) {
    for (const x of [0, 0.75, 1.5, 2, 2.5, 3, 3.5]) D.kick(b, t + B * x, 0.8);
    D.clap(b, t + B, 0.5, r); D.clap(b, t + B * 3, 0.5, r);
    for (let i = 0; i < 8; i++) D.hat(b, t + (B * i) / 2 + B / 4, 0.3, r);
    synth(b, t, B * 3.8, c.slice(1).map((m) => m + 12), 0.08, { wave: 'sine', atk: 0.3, rel: 0.6, voices: 2 });
    [0, 1, 2, 3].forEach((i) => bell(b, t + B * (i + 0.5), c[1 + (i % 3)] + 24, 0.05));
  } },
};

function lay(buf, style, t0, t1, rand, o = {}) {
  const st = STYLES[style], B = 60 / st.bpm, bar = B * 4;
  const seg = new Float32Array(buf.length);
  for (let k = 0, t = t0; t < t1; k++, t += bar) st.bar(seg, t, k, B, st.chords[k % st.chords.length], rand);
  const fi = (o.fadeIn ?? 0.05) * SR, fo = (o.fadeOut ?? 0.3) * SR, a = Math.floor(t0 * SR), z = Math.floor(t1 * SR);
  for (let i = Math.max(0, a); i < Math.min(buf.length, z); i++) buf[i] += seg[i] * (o.gain ?? 1) * Math.min(1, (i - a) / fi, (z - i) / fo);
}

export function buildMusic(chapters, duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(42);
  const ch = Object.fromEntries(chapters.map((c) => [c.key, c]));
  const end = (c) => Math.min(c.to, duration) - 0.35;
  lay(buf, 'lofi', atEnd('open', '播放键') + 0.15, end(ch.intro), rand, { fadeIn: 0.6, gain: 0.8 });
  lay(buf, 'njs', ch.c92.from, end(ch.c92), rand);
  lay(buf, 'dance', ch.c96.from, end(ch.c96), rand);
  lay(buf, 'electro', ch.c07.from, end(ch.c07), rand);
  lay(buf, 'house', ch.c12.from, end(ch.c12), rand, { gain: 0.9 });
  lay(buf, 'disco', ch.c20.from, end(ch.c20), rand);
  const tChorus = at('parts', '副歌') - 0.1, tBridge = at('parts', '桥段') - 0.1;
  lay(buf, 'boombap', ch.cnow.from, tChorus, rand, { fadeOut: 0.05 });
  lay(buf, 'electro', tChorus, tBridge, rand, { fadeIn: 0.02, fadeOut: 0.05 });
  lay(buf, 'jersey', tBridge, end(ch.cnow), rand, { fadeIn: 0.02 });
  const tBuild = at('method', '重新组装');
  lay(buf, 'lofi', ch.method.from, tBuild, rand, { gain: 0.6, fadeOut: 0.05 });
  lay(buf, 'house', tBuild, end(ch.method), rand, { fadeIn: 0.02, gain: 0.8 });
  lay(buf, 'disco', tBuild + (60 / 128) * 16, end(ch.method), rand, { fadeIn: 1, gain: 0.35 });
  lay(buf, 'lofi', ch.outro.from + 0.4, duration, rand, { fadeIn: 0.8, fadeOut: 2.5, gain: 0.8 });
  // tape hiss bed, louder on the cassette bookends
  bandNoise(buf, 0, duration, 0.012, 3000, 3000, 0.4, (p) => 1, rand);
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.42;
  return buf;
}

// ---------- sound effects ----------
const FX = {
  click(b, t, o, r) { bandNoise(b, t, 0.03, 1.2, 3000, 2000, 1, (p) => 1 - p, r); tone(b, t, 0.06, 0.5, () => 900, (u) => Math.exp(-u * 80)); bandNoise(b, t + 0.09, 0.04, 0.8, 1800, 1500, 1, (p) => 1 - p, r); },
  whoosh(b, t, o, r) { const d = o.d ?? 0.45; bandNoise(b, t, d, 0.55 * (o.amp ?? 1), o.from ?? 400, o.to ?? 3000, 1.2, (p) => Math.sin(Math.PI * p) ** 2, r); },
  pop(b, t, o) { const f = o.f ?? 600; tone(b, t, 0.09, 0.35 * (o.amp ?? 1), (u, p) => f * (1.6 - 0.9 * p), (u, p) => Math.sin(Math.PI * Math.min(1, p * 1.3))); },
  stamp(b, t, o, r) { tone(b, t, 0.3, 0.9 * (o.amp ?? 1), (u) => 120 - 60 * Math.min(1, u * 5), (u) => Math.exp(-u * 14)); bandNoise(b, t, 0.12, 1.0, 3000, 900, 0.8, (p) => Math.exp(-p * 7), r); },
  tick(b, t, o) { tone(b, t, 0.05, 0.25 * (o.amp ?? 1), () => o.f ?? 2200, (u) => Math.exp(-u * 90)); },
  ding(b, t, o) { bell(b, t, o.n ?? 84, 0.18 * (o.amp ?? 1)); },
  boom(b, t, o, r) { tone(b, t, 1.4, 1.0 * (o.amp ?? 1), (u) => 30 + 60 * Math.exp(-u * 5), (u) => Math.exp(-u * 2.5) * Math.min(1, u * 800)); bandNoise(b, t, 0.6, 0.5, 900, 120, 0.6, (p) => Math.exp(-p * 5), r); },
  riser(b, t, o, r) { const d = o.d ?? 1.5; bandNoise(b, t, d, 0.35, 300, 6000, 1.5, (p) => p * p, r); tone(b, t, d, 0.06, (u, p) => 200 * Math.pow(8, p), (u, p) => p * p, (ph) => (ph % (2 * Math.PI)) / Math.PI - 1); },
  rewind(b, t, o, r) { tone(b, t, 0.4, 0.12, (u, p) => 1800 + 1400 * Math.sin(p * 40), (u, p) => Math.sin(Math.PI * p)); bandNoise(b, t, 0.4, 0.3, 2000, 6000, 2, (p) => Math.sin(Math.PI * p), r); },
  scratch(b, t, o, r) { bandNoise(b, t, 0.35, 0.7, 600, 2500, 3, (p) => Math.abs(Math.sin(p * Math.PI * 3)), r); },
  cheer(b, t, o, r) {
    const d = o.d ?? 2.5;
    bandNoise(b, t, d, 0.5 * (o.amp ?? 1), 900, 1400, 0.5, (p) => Math.min(1, p * 6) * Math.min(1, (1 - p) * 2), r);
    for (let i = 0; i < 30; i++) tone(b, t + r() * d * 0.7, 0.3, 0.025, (u) => 900 + r() * 900 + u * 400, (u) => Math.sin(Math.PI * Math.min(1, u / 0.3)));
  },
  buzz(b, t) { tone(b, t, 0.45, 0.12, () => 110, (u, p) => Math.min(1, p * 20, (1 - p) * 20), (ph) => (Math.sin(ph) > 0 ? 1 : -1)); },
  type(b, t, o, r) { for (let i = 0; i < (o.n ?? 6); i++) bandNoise(b, t + i * 0.07 + r() * 0.02, 0.025, 0.5, 2500, 2000, 1, (p) => 1 - p, r); },
};

export function buildSfx(events, duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const rand = rng(7);
  for (const e of events) FX[e.type](buf, e.t, e, rand);
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
