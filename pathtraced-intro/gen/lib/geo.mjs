// Geometry constructors (Tesseract Scene3D). Units are scene pixels (100 px = 1 m).
const R = (n) => +n.toFixed(2);

// Closed polygon(s) -> extrude path commands. polys: array of [[x,y],...]
export function pathOf(polys) {
  const commands = [];
  for (const p of polys) {
    p.forEach(([x, y], i) => commands.push({ type: i ? 'lineTo' : 'moveTo', x: R(x), y: R(y) }));
    commands.push({ type: 'close' });
  }
  return { commands };
}

export const circlePts = (r, n = 48, a0 = 0) => Array.from({ length: n }, (_, i) => {
  const a = a0 + (i / n) * Math.PI * 2;
  return [r * Math.cos(a), r * Math.sin(a)];
});

export const extrude = (polys, depth) => ({ type: 'extrude', profile: pathOf(polys), fillRule: 'evenOdd', depth });

// Gear: trapezoid teeth, optional hub hole and spoke windows (evenOdd holes).
export function gearPolys({ teeth = 24, r = 100, tooth = 12, hole = 0, spokes = 0, rim = 0.22, hub = 0.28 }) {
  const out = [];
  const rr = r - tooth;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, w = (Math.PI * 2) / teeth;
    for (const [rad, f] of [[rr, 0], [r, 0.22], [r, 0.48], [rr, 0.7]]) {
      const aa = a + w * f;
      out.push([rad * Math.cos(aa), rad * Math.sin(aa)]);
    }
  }
  const polys = [out];
  if (hole > 0) polys.push(circlePts(hole, 32).reverse());
  if (spokes > 0) {
    const ri = r * hub, ro = rr - r * rim * 0.5;
    const span = (Math.PI * 2) / spokes;
    const gap = Math.min(0.32, 18 / ri);
    for (let s = 0; s < spokes; s++) {
      const a0 = s * span + gap, a1 = (s + 1) * span - gap;
      const win = [];
      const n = 10;
      for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * (k / n); win.push([ro * Math.cos(a), ro * Math.sin(a)]); }
      const gi = Math.min(0.45, 18 / ri);
      for (let k = n; k >= 0; k--) { const a = a0 + gi * 0.5 + (a1 - a0 - gi) * (k / n); win.push([ri * Math.cos(a), ri * Math.sin(a)]); }
      polys.push(win);
    }
  }
  return polys;
}
export const gear = (o, depth = 16) => extrude(gearPolys(o), depth);

export function starPolys({ points = 8, rOut = 100, rIn = 70, hole = 0, rot = 0 }) {
  const p = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2, rad = i % 2 ? rIn : rOut;
    p.push([rad * Math.cos(a), rad * Math.sin(a)]);
  }
  const polys = [p];
  if (hole) polys.push(circlePts(hole, 32));
  return polys;
}
export const star = (o, depth = 16) => extrude(starPolys(o), depth);

export const ringPolys = (rOut, rIn, n = 96) => [circlePts(rOut, n), circlePts(rIn, n)];
export const ring = (rOut, rIn, depth = 10, n = 96) => extrude(ringPolys(rOut, rIn, n), depth);
export const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

// Lathe: half profile pts [[radius, y], ...] from top to bottom (Y down), revolved about Y.
export function lathe(pts, angle = 360) {
  const commands = pts.map(([x, y], i) => ({ type: i ? 'lineTo' : 'moveTo', x: R(Math.max(0, x)), y: R(y) }));
  commands.push({ type: 'close' });
  return { type: 'lathe', profile: { commands }, fillRule: 'nonZeroWinding', angle };
}

export const box = (w, h, d) => ({ type: 'box', size: [w, h, d] });
export const cyl = (r, h) => ({ type: 'cylinder', radius: r, height: h });
export const cone = (r, h) => ({ type: 'cone', radius: r, height: h });
export const sphere = (r) => ({ type: 'sphere', radius: r });
export const torus = (R0, r) => ({ type: 'torus', radius: R0, tubeRadius: r });
export const plane = (w, h) => ({ type: 'plane', size: [w, h] });

// Editable mesh builder: accumulate quads/tris, then emit geometry.
export class MeshBuilder {
  constructor() { this.positions = []; this.faces = []; }
  v(p) { this.positions.push(p.map(R)); return this.positions.length - 1; }
  face(idx, uv = null, region = 'primary') { const f = { vertices: idx, region }; if (uv) f.uv0 = uv; this.faces.push(f); }
  // Axis-aligned box from min corner (x,y,z) with size (w,h,d); y is down, so top face is at y.
  box(x, y, z, w, h, d, region = 'primary') {
    const P = [[x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d], [x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]].map((p) => this.v(p));
    const q = (a, b, c, e) => this.face([P[a], P[b], P[c], P[e]], null, region);
    q(0, 1, 2, 3); q(4, 7, 6, 5); q(0, 4, 5, 1); q(1, 5, 6, 2); q(2, 6, 7, 3); q(3, 7, 4, 0);
  }
  geometry(smooth = null) { const g = { type: 'editable', positions: this.positions, faces: this.faces }; if (smooth != null) g.smoothAngle = smooth; return g; }
}

// Seeded RNG for reproducible layouts.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
