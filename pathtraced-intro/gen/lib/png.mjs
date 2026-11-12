// Minimal raster toolkit + PNG writer (no dependencies).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// channels: array of Float32Array planes (1 = gray, 3 = rgb, 4 = rgba), values 0..1.
export function writePNG(path, w, h, channels) {
  const nc = channels.length, ct = { 1: 0, 3: 2, 4: 6 }[nc];
  const raw = Buffer.alloc((w * nc + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * nc + 1)] = 0;
    for (let x = 0; x < w; x++) for (let c = 0; c < nc; c++) {
      const v = channels[c][y * w + x];
      raw[y * (w * nc + 1) + 1 + x * nc + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ct; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

export class Plane {
  constructor(w, h, fill = 0) { this.w = w; this.h = h; this.d = new Float32Array(w * h).fill(fill); }
  idx(x, y) { x = ((x % this.w) + this.w) % this.w; return y < 0 || y >= this.h ? -1 : y * this.w + x; } // wraps in x
  max(x, y, v) { const i = this.idx(Math.round(x), Math.round(y)); if (i >= 0 && v > this.d[i]) this.d[i] = v; }
  rect(x0, y0, x1, y1, v = 1) { for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) this.max(x, y, v); }
  disc(cx, cy, r, v = 1, soft = 1) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dd = Math.hypot(x - cx, y - cy); if (dd <= r + soft) this.max(x, y, v * Math.min(1, (r + soft - dd) / soft));
    }
  }
  // Dome bump: height falls off as a hemisphere.
  dome(cx, cy, r, v = 1) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const q = 1 - ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); if (q > 0) this.max(x, y, v * Math.sqrt(q));
    }
  }
  line(x0, y0, x1, y1, w = 1, v = 1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
    for (let i = 0; i <= n; i++) { const t = i / n; this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, v, 0.8); }
  }
  blur(r) { // separable box blur, 2 passes
    for (let pass = 0; pass < 2; pass++) {
      const t = new Float32Array(this.d.length);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        let s = 0; for (let k = -r; k <= r; k++) s += this.d[y * this.w + ((x + k + this.w) % this.w)];
        t[y * this.w + x] = s / (2 * r + 1);
      }
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        let s = 0, c = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < this.h) { s += t[yy * this.w + x]; c++; } }
        this.d[y * this.w + x] = s / c;
      }
    }
    return this;
  }
  map(f) { for (let i = 0; i < this.d.length; i++) this.d[i] = f(this.d[i], i % this.w, (i / this.w) | 0); return this; }
  clone() { const p = new Plane(this.w, this.h); p.d.set(this.d); return p; }
}

export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
