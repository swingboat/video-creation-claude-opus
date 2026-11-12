// Map-table kit for the city shots: water, parchment land, city blocks, engraved labels, gear clusters, lighting.
import * as A from './act.mjs';
import * as G from './geo.mjs';
import { M } from './mat.mjs';

export const LAND_T = 12; // land top sits at y = -LAND_T

export function pointInPoly([x, z], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Wobbly closed coastline around a center.
export function blob(cx, cz, rx, rz, seed = 1, n = 48, wob = 0.18) {
  const r = G.rng(seed), ph = [r() * 6, r() * 6, r() * 6];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob * (Math.sin(3 * a + ph[0]) * 0.5 + Math.sin(5 * a + ph[1]) * 0.3 + Math.sin(9 * a + ph[2]) * 0.2);
    return [cx + rx * k * Math.cos(a), cz + rz * k * Math.sin(a)];
  });
}

export function mapBase(ids, data, items, { lands = [], water = [5000, 5000], waterMat = M.water, landMat = M.parchment }) {
  const w = A.mesh(ids, G.box(water[0], 40, water[1]), { name: 'Water', mat: waterMat, pos: [0, 20, 0] });
  data.push(w.data); items.push(w.item);
  for (const poly of lands) {
    const l = A.mesh(ids, G.extrude([poly], LAND_T), { name: 'Land', mat: landMat, sideMat: M.parchmentDark, rot: [90, 0, 0], pos: [0, -LAND_T / 2, 0] });
    data.push(l.data); items.push(l.item);
  }
}

// Many small buildings as one editable mesh. avoid: [[x,z,r]] circles kept clear (for mechanisms).
export function cityBlocks(ids, data, items, { poly, count = 400, hMin = 6, hMax = 40, size = [8, 22], seed = 2, avoid = [], mat = M.stone, base = -LAND_T }) {
  const r = G.rng(seed), mb = new G.MeshBuilder();
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  let placed = 0, tries = 0;
  while (placed < count && tries++ < count * 20) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (!pointInPoly([x, z], poly) || avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const w = size[0] + r() * (size[1] - size[0]), d = size[0] + r() * (size[1] - size[0]), h = hMin + r() ** 2.2 * (hMax - hMin);
    mb.box(x - w / 2, base - h, z - d / 2, w, h, d);
    placed++;
  }
  const m = A.mesh(ids, mb.geometry(), { name: 'City blocks', mat });
  data.push(m.data); items.push(m.item);
  return m.item.id;
}

// Flat engraved label lying on the map, readable from a camera on the -Z side.
export function label(ids, data, items, text, { pos, size = 70, rotY = 0, mat = M.ink, tracking = 120 }) {
  const id = ids.next();
  data.push({ ...A.textData({ id, text, font: 'Cinzel', style: 'Bold', size, depth: 3, tracking }), justification: 'center' });
  const t = A.textItem({ ids, dataId: id, name: `Label ${text}`, mat, pos, rot: [-90, rotY, 0] });
  items.push(t);
  return t.id;
}

// Flat gears. specs: {x, z, y, teeth, r, depth, mat, spokes, dir}. Returns spin animations over dur ms.
export function gears(ids, data, items, layerId, specs, dur, speed = 40) {
  const anims = [];
  for (const s of specs) {
    const g = A.mesh(ids, G.gear({ teeth: s.teeth, r: s.r, tooth: s.tooth ?? Math.max(6, s.r * 0.09), hole: s.hole ?? s.r * 0.12, spokes: s.spokes ?? 5 }, s.depth ?? 14),
      { name: 'Gear', mat: s.mat ?? M.brass, rot: [90, 0, 0], pos: [s.x, s.y ?? -(LAND_T + (s.depth ?? 14) / 2), s.z] });
    data.push(g.data); items.push(g.item);
    const deg = ((s.dir ?? 1) * speed * (dur / 1000) * 100) / s.r;
    anims.push(A.anim(layerId, g.item.id, 'rotationY', [[0, 0, 'linear'], [dur, deg, 'linear']]));
  }
  return anims;
}

// Warm key from upper-left-back, cool fill, low ambient.
export function mapLights(layerId, ids, { center = [0, 0, 0], key = 2200, fill = 300, keyPos = [-1400, -1800, 600] } = {}) {
  const c = center;
  return [
    A.light({ layerId, ids, kind: 'spot', pos: [c[0] + keyPos[0], keyPos[1], c[2] + keyPos[2]], target: c, power: key, cone: 45, feather: 0.6, radius: 120, color: [1, 0.86, 0.68], name: 'Key' }).action,
    A.light({ layerId, ids, kind: 'point', pos: [c[0] + 1200, -900, c[2] - 1200], power: fill, radius: 200, color: [0.65, 0.75, 1], name: 'Fill' }).action,
  ];
}

// Item rises from below the table and spins into place.
export function rise(layerId, itemId, { t0, t1, from = 500, spin = 0, pos = [0, 0, 0] }) {
  const acts = [A.anim(layerId, itemId, 'position', [[0, [pos[0], pos[1] + from, pos[2]]], [t0, [pos[0], pos[1] + from, pos[2]], 'hold'], [t1, pos, 'out']])];
  if (spin) acts.push(A.anim(layerId, itemId, 'rotationY', [[t0, spin, 'linear'], [t1, 0, 'out']]));
  return acts;
}
