// Deterministic math, random and noise helpers shared by every module.
import * as THREE from 'three';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smoother = (t: number) => {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeInOut = (t: number) => smoother(t);
/** 0→1→0 bump between a and b with soft edges */
export const pulse = (t: number, a: number, b: number, edge = 0.25) =>
  smoothstep(a - edge, a + edge, t) * (1 - smoothstep(b - edge, b + edge, t));
export const window01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

/** damped oscillation started at t0 (returns 0 before t0) */
export const ring = (t: number, t0: number, freq: number, decay: number) => {
  if (t < t0) return 0;
  const x = t - t0;
  return Math.sin(x * freq * Math.PI * 2) * Math.exp(-x * decay);
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}
const fade = (t: number) => t * t * (3 - 2 * t);

export function vnoise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf) * 2 - 1;
}
export function vnoise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const n = (i: number, j: number, k: number) => hash3(xi + i, yi + j, zi + k);
  const x00 = lerp(n(0, 0, 0), n(1, 0, 0), xf), x10 = lerp(n(0, 1, 0), n(1, 1, 0), xf);
  const x01 = lerp(n(0, 0, 1), n(1, 0, 1), xf), x11 = lerp(n(0, 1, 1), n(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf) * 2 - 1;
}
export function fbm2(x: number, y: number, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise2(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
/** smooth time noise, deterministic: wobble(t, seed) in [-1,1] */
export const wobble = (t: number, seed: number, speed = 1) =>
  vnoise2(t * speed, seed * 17.13) * 0.7 + vnoise2(t * speed * 2.3, seed * 5.7 + 9) * 0.3;

export type Key = [number, number];
/** piecewise smooth interpolation through keys [[t,v],...] */
export function track(keys: Key[], t: number, ease: (x: number) => number = smoother) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}
export type VKey = [number, number[]];
export function vtrack(keys: VKey[], t: number, ease: (x: number) => number = smoother) {
  const n = keys[0][1].length;
  const out = new Array(n).fill(0);
  if (t <= keys[0][0]) return keys[0][1].slice();
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      const e = ease((t - t0) / (t1 - t0));
      for (let k = 0; k < n; k++) out[k] = lerp(v0[k], v1[k], e);
      return out;
    }
  }
  return keys[keys.length - 1][1].slice();
}

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const deg = (d: number) => (d * Math.PI) / 180;
