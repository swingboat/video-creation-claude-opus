// Geometry building blocks for characters.
import * as THREE from 'three';
import { clamp, lerp, mulberry32, vnoise3 } from '../engine/math';

/** sweep circles of varying radius along a 3D polyline (smooth via catmull-rom) */
export function sweep(points: THREE.Vector3[], radius: (u: number) => number, radial = 16, segs = 32, close = true, profile?: (u: number, a: number) => number) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const c = curve.getPointAt(u);
    const N = frames.normals[i], Bn = frames.binormals[i];
    const r = radius(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const rr = r * (profile ? profile(u, a) : 1);
      pos.push(c.x + (Math.cos(a) * N.x + Math.sin(a) * Bn.x) * rr, c.y + (Math.cos(a) * N.y + Math.sin(a) * Bn.y) * rr, c.z + (Math.cos(a) * N.z + Math.sin(a) * Bn.z) * rr);
      uv.push(j / radial, u);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = a + 1, c2 = a + row, d = c2 + 1;
      idx.push(a, c2, b, b, c2, d);
    }
  if (close) {
    // cap the end
    const end = curve.getPointAt(1);
    const ci = pos.length / 3;
    pos.push(end.x, end.y, end.z);
    uv.push(0.5, 1);
    for (let j = 0; j < radial; j++) idx.push(segs * row + j, ci, segs * row + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** capsule along +y from 0 to len with radii r0 (bottom) → r1 (top) */
export function taperedCapsule(len: number, r0: number, r1: number, radial = 14) {
  const pts: THREE.Vector2[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r1, len + Math.sin(a) * r1));
  }
  return new THREE.LatheGeometry(pts, radial);
}

/** limb segment pointing along -y (from joint at origin to child joint at -len) */
export function limbGeometry(len: number, rTop: number, rBot: number, bulge = 0.08, radial = 16) {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let r = lerp(rBot, rTop, u) * (1 + Math.sin(u * Math.PI) * bulge);
    let y = -len + u * len;
    if (i === 0) { r = 0.0001; y = -len - rBot * 0.85; }
    if (i === n) { r = 0.0001; y = rTop * 0.85; }
    if (i === 1) y = -len - rBot * 0.55, r = rBot * 0.82;
    if (i === n - 1) y = rTop * 0.55, r = rTop * 0.82;
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, radial);
}

/** hair cards rooted at given points; each card bends from `dir` toward gravity */
export function hairCards(
  roots: { p: THREE.Vector3; n: THREE.Vector3 }[],
  opts: { len: (i: number) => number; width: number; gravity: number; curl?: number; segs?: number; seed?: number; fwd?: THREE.Vector3 },
) {
  const rnd = mulberry32(opts.seed ?? 3);
  const segs = opts.segs ?? 6;
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [], idx: number[] = [];
  let base = 0;
  roots.forEach((r, i) => {
    const len = opts.len(i);
    const dir = r.n.clone().normalize();
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize().applyAxisAngle(dir, (rnd() - 0.5) * 0.8);
    const w = opts.width * (0.7 + rnd() * 0.6);
    let p = r.p.clone();
    let d = dir.clone();
    const curl = (opts.curl ?? 0) * (rnd() - 0.5) * 2;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ww = w * (1 - u * 0.65);
      pos.push(p.x + side.x * ww, p.y + side.y * ww, p.z + side.z * ww, p.x - side.x * ww, p.y - side.y * ww, p.z - side.z * ww);
      const nn = new THREE.Vector3().crossVectors(side, d).normalize();
      nrm.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z);
      uv.push(0, 1 - u, 1, 1 - u);
      // advance: bend toward gravity and curl
      d.y -= opts.gravity * (1 / segs);
      if (opts.fwd) d.addScaledVector(opts.fwd, 0.15 / segs);
      d.applyAxisAngle(side, curl / segs);
      d.normalize();
      p = p.clone().addScaledVector(d, len / segs);
    }
    for (let s = 0; s < segs; s++) {
      const a = base + s * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    base += (segs + 1) * 2;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** hair material with root-to-tip sway driven by a per-object uniform */
export function hairMaterial(color: THREE.ColorRepresentation, strandTex: THREE.Texture, swing: { value: THREE.Vector3 }, shared: { uTime: { value: number } }, rough = 0.55) {
  const m = new THREE.MeshStandardMaterial({ color, map: strandTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: rough });
  m.onBeforeCompile = (s) => {
    s.uniforms.uSwing = swing;
    s.uniforms.uTime = shared.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSwing;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float tip = 1.0 - uv.y;
        float ph = position.x*40.0 + position.z*31.0;
        transformed += uSwing * tip * tip;
        transformed.x += sin(uTime*2.2 + ph)*0.0025*tip;
        transformed.z += cos(uTime*1.9 + ph)*0.0025*tip;`,
      );
  };
  return m;
}

export type HandParts = {
  root: THREE.Group;
  fingers: { segs: THREE.Object3D[]; base: number }[];
  thumb: THREE.Object3D[];
};

/** hand: palm pointing along -y from wrist; palm faces +z (front) in rest */
export function buildHand(scale: number, skin: THREE.Material, glove?: THREE.Material, stubby = 1): HandParts {
  const root = new THREE.Group();
  const palmL = 0.085 * scale, palmW = 0.08 * scale * stubby, palmT = 0.028 * scale * stubby;
  const palmGeo = new THREE.SphereGeometry(1, 16, 12);
  const pg = palmGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pg.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pg, i);
    // boxy ellipsoid
    const k = Math.pow(Math.abs(v.x) ** 3 + Math.abs(v.y) ** 3 + Math.abs(v.z) ** 3, 1 / 3);
    v.divideScalar(Math.max(k, 0.0001)).lerp(v, 0.4);
    pg.setXYZ(i, v.x * palmW * 0.5, -palmL * 0.5 + v.y * palmL * 0.5, v.z * palmT * 0.5);
  }
  palmGeo.computeVertexNormals();
  const mat = glove ?? skin;
  const palm = new THREE.Mesh(palmGeo, mat);
  root.add(palm);
  const fingers: HandParts['fingers'] = [];
  const fl = [0.9, 1.0, 0.95, 0.75];
  for (let f = 0; f < 4; f++) {
    const x = (-1.5 + f) * palmW * 0.24;
    const len = 0.05 * scale * fl[f] * (stubby > 1 ? 0.85 : 1);
    const r = 0.0085 * scale * stubby;
    let parent: THREE.Object3D = root;
    const segs: THREE.Object3D[] = [];
    for (let s = 0; s < 3; s++) {
      const j = new THREE.Group();
      j.position.set(s === 0 ? x : 0, s === 0 ? -palmL * 0.95 : -len * [0.45, 0.32, 0.25][s - 1], 0);
      const L = len * [0.45, 0.32, 0.25][s];
      const m = new THREE.Mesh(limbGeometry(L, r * (1 - s * 0.08), r * (0.92 - s * 0.08), 0.02, 8), skin);
      j.add(m);
      parent.add(j);
      segs.push(j);
      parent = j;
    }
    fingers.push({ segs, base: x });
  }
  // thumb
  const thumb: THREE.Object3D[] = [];
  let parent: THREE.Object3D = root;
  for (let s = 0; s < 2; s++) {
    const j = new THREE.Group();
    if (s === 0) {
      j.position.set(palmW * 0.45, -palmL * 0.25, palmT * 0.3);
      j.rotation.set(0.5, 0, 0.7);
    } else j.position.set(0, -0.026 * scale, 0);
    const m = new THREE.Mesh(limbGeometry(0.026 * scale, 0.0095 * scale * stubby, 0.0085 * scale * stubby, 0.02, 8), skin);
    j.add(m);
    parent.add(j);
    thumb.push(j);
    parent = j;
  }
  root.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return { root, fingers, thumb };
}

/** curl fingers: grip 0 = relaxed open, 1 = closed fist around a rope */
export function poseHand(h: HandParts, grip: number, spread = 0) {
  const base = 0.25 + grip * 1.25;
  h.fingers.forEach((f, i) => {
    f.segs[0].rotation.set(base, 0, (i - 1.5) * (0.06 + spread * 0.12));
    f.segs[1].rotation.set(0.2 + grip * 1.35, 0, 0);
    f.segs[2].rotation.set(0.15 + grip * 0.9, 0, 0);
  });
  h.thumb[0].rotation.set(0.5 + grip * 0.5, 0, 0.7 - grip * 0.45);
  h.thumb[1].rotation.set(0.15 + grip * 0.7, 0, 0);
}

/** head mesh sculpted from a sphere; returns geometry and a sampler for surface points */
export type HeadShape = { r: number; vScale: number; jaw: number; chinFwd: number; cheek: number; brow: number; round: number; chinDrop?: number };

export function sculptHead(h: HeadShape, seed: number) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    let { x, y, z } = v;
    y *= h.vScale;
    // jaw narrowing below the eyes
    if (y < 0) {
      const k = clamp(-y / h.vScale);
      x *= 1 - h.jaw * k * k;
      z *= 1 - h.jaw * 0.35 * k * k;
      if (z > 0) z += h.chinFwd * k * k * Math.max(0, z);
      y -= (h.chinDrop ?? 0) * k * k * Math.max(0, z);
    }
    // cheek fullness on the front lower half
    const front = Math.max(0, z);
    x *= 1 + h.cheek * front * Math.exp(-Math.pow((y + 0.25) * 2.2, 2)) * 0.5;
    // brow ridge
    if (z > 0.6) z += h.brow * Math.exp(-Math.pow((y - 0.22) * 7, 2)) * (1 - Math.abs(x) * 1.1);
    // eye sockets
    for (const sx of [-0.36, 0.36]) {
      const d2 = (x - sx) ** 2 + ((y - 0.08) * 1.4) ** 2;
      if (z > 0.5) z -= 0.06 * Math.exp(-d2 * 22);
    }
    // flatter face, rounder cranium
    if (z > 0.3) z *= 1 - (1 - h.round) * 0.12;
    // fullness at back of skull
    if (z < -0.2 && y > -0.3) z *= 1.06;
    const n = 1 + vnoise3(x * 2 + seed, y * 2, z * 2) * 0.01;
    p.setXYZ(i, x * h.r * n, y * h.r * n, z * h.r * n);
  }
  g.computeVertexNormals();
  return g;
}

/** sample surface points of a geometry matching a predicate (deterministic order) */
export function sampleSurface(g: THREE.BufferGeometry, pred: (p: THREE.Vector3, n: THREE.Vector3) => boolean, max: number, seed: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const nn = new THREE.Vector3().fromBufferAttribute(n, i);
    if (pred(v, nn)) out.push({ p: v, n: nn });
  }
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, max);
}

/** eyeball with planar front UV so the iris sits on +z */
export function eyeballGeometry(r: number) {
  const g = new THREE.SphereGeometry(r, 32, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
    // flatten mapping: iris on the front cap
    const k = z > 0 ? 1 : 1.0;
    uv.setXY(i, 0.5 + x * 0.5 * k, 0.5 + y * 0.5 * k);
    if (z < 0) uv.setXY(i, 0.02, 0.02);
    // cornea bulge
    if (z > 0.8) p.setZ(i, p.getZ(i) + (z - 0.8) * r * 0.35);
  }
  g.computeVertexNormals();
  return g;
}

/** mouth: upper/lower lip tubes with morph targets [smile, open, frown, pucker] */
export function mouthGeometry(w: number, thick: number) {
  const build = (smile: number, open: number, frown: number, pucker: number, upper: boolean) => {
    const ww = w * (1 + smile * 0.18 - pucker * 0.35);
    const cy = smile * w * 0.32 - frown * w * 0.25 - open * w * 0.08;
    const cz = -smile * w * 0.18;
    const mid = upper ? w * 0.06 + open * w * 0.06 : -w * 0.06 - open * w * 0.62;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = lerp(-ww, ww, u);
      const bell = Math.sin(u * Math.PI);
      const y = lerp(cy, mid, Math.pow(bell, 0.8)) + (upper ? Math.sin(u * Math.PI * 2) ** 2 * w * 0.03 * (1 - open) : 0);
      const z = -Math.pow(x / w, 2) * w * 0.45 + cz * (1 - bell) + pucker * w * 0.18 * bell;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return sweep(pts, (u) => thick * (0.35 + Math.sin(u * Math.PI) * 0.75) * (upper ? 0.85 : 1), 10, 24, false, (_u, a) => (Math.sin(a) > 0 === upper ? 1 : 0.7));
  };
  const mk = (upper: boolean) => {
    const base = build(0, 0, 0, 0, upper);
    const targets = [build(1, 0, 0, 0, upper), build(0, 1, 0, 0, upper), build(0, 0, 1, 0, upper), build(0, 0.3, 0, 1, upper)];
    base.morphAttributes.position = targets.map((t) => t.attributes.position as THREE.BufferAttribute);
    return base;
  };
  return { upper: mk(true), lower: mk(false) };
}
