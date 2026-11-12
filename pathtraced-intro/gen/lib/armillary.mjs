// Armillary sphere kit: textured relief bands, thin rings, sun core + corona, branch arcs.
import * as A from './act.mjs';
import * as G from './geo.mjs';
import { M, pbr } from './mat.mjs';

// Cylindrical belt around Y: radius R, width W (along Y), thickness T. Outer face = 'primary' (UV mapped), rest = 'side'.
export function bandGeometry(R, W, T, reps = 3, seg = 192) {
  const mb = new G.MeshBuilder();
  const ring = (r, y) => Array.from({ length: seg + 1 }, (_, i) => { const a = (i / seg) * Math.PI * 2; return mb.v([r * Math.cos(a), y, r * Math.sin(a)]); });
  const oT = ring(R, -W / 2), oB = ring(R, W / 2), iT = ring(R - T, -W / 2), iB = ring(R - T, W / 2);
  for (let i = 0; i < seg; i++) {
    const u0 = (i / seg) * reps, u1 = ((i + 1) / seg) * reps;
    mb.face([oB[i], oB[i + 1], oT[i + 1], oT[i]], [[u0, 1], [u1, 1], [u1, 0], [u0, 0]], 'primary');
    mb.face([iT[i + 1], iB[i + 1], iB[i], iT[i]], null, 'side');
    mb.face([oT[i], oT[i + 1], iT[i + 1], iT[i]], null, 'side');
    mb.face([iB[i], iB[i + 1], oB[i + 1], oB[i]], null, 'side');
  }
  return mb.geometry(30);
}

const bandMat = (tex) => pbr({ color: '#ffffff', rough: 0.42, tex: { base: `${tex}_base`, metal: `${tex}_metal`, height: `${tex}_height`, heightStrength: 1.4 } });

// Adds one band group. Returns {groupId, meshId}.
export function band(ids, data, items, { R = 620, W = 150, T = 14, tex = null, mat = M.bronze, rot = [0, 0, 0], pos = [0, 0, 0], clasps = 8, edges = true, reps = 3, parent = null, name = 'Band' }) {
  const g = A.group({ ids, name, parent, pos, rot });
  items.push(g);
  const dId = ids.next();
  data.push(A.meshData(dId, bandGeometry(R, W, T, reps)));
  const meshItem = A.meshItem({ ids, dataId: dId, name: `${name} belt`, parent: g.id, mat: tex ? bandMat(tex) : mat, sideMat: M.bronze });
  items.push(meshItem);
  if (edges) {
    const tId = ids.next();
    data.push(A.meshData(tId, G.torus(R + 2, 5)));
    for (const y of [-W / 2, W / 2]) items.push(A.meshItem({ ids, dataId: tId, name: 'Rope edge', parent: g.id, mat: M.silver, pos: [0, y, 0] }));
  }
  if (clasps) {
    const cId = ids.next(), rId = ids.next();
    data.push(A.meshData(cId, G.box(24, W + 22, 16)), A.meshData(rId, G.sphere(6)));
    for (let i = 0; i < clasps; i++) {
      const a = ((i + 0.5) / clasps) * 360, rad = (a * Math.PI) / 180;
      const p = [(R + 6) * Math.cos(rad), 0, (R + 6) * Math.sin(rad)];
      items.push(A.meshItem({ ids, dataId: cId, name: 'Clasp', parent: g.id, mat: M.brass, pos: p, rot: [0, -a + 90, 0] }));
      for (const y of [-W / 2 + 18, W / 2 - 18]) items.push(A.meshItem({ ids, dataId: rId, name: 'Rivet', parent: g.id, mat: M.gold, pos: [(R + 15) * Math.cos(rad), y, (R + 15) * Math.sin(rad)] }));
    }
  }
  return { groupId: g.id, meshId: meshItem.id };
}

export function thinRing(ids, data, items, { R = 700, tube = 6, rot = [0, 0, 0], mat = M.brassDark, parent = null, name = 'Ring' }) {
  const g = A.group({ ids, name, parent, rot });
  const dId = ids.next();
  data.push(A.meshData(dId, G.torus(R, tube)));
  items.push(g, A.meshItem({ ids, dataId: dId, name: `${name} tube`, parent: g.id, mat }));
  return g.id;
}

// Sun: emissive core sphere (no shadows so the inner point light escapes) + camera-facing corona card + point light.
export function sun(ids, data, items, layerId, { r = 110, power = 4000, coronaSize = 1100, coronaStrength = 6, coreStrength = 30, coronaZ = 60, at = [0, 0, 0] } = {}) {
  const s = A.mesh(ids, G.sphere(r), { name: 'Sun core', pos: at, mat: pbr({ color: '#000000', rough: 1, emissive: '#FFE4B0', emissiveStrength: coreStrength }), shadows: false });
  const coronaMat = (id) => ({
    id, inputs: { baseColor: { type: 'constant', value: [0, 0, 0] }, roughness: { type: 'constant', value: 1 },
      emissiveColor: { type: 'texture', factor: [1, 1, 1], sample: { texture: { source: { type: 'image', assetId: 'sun_corona' }, scale: [1, 1], offset: [0, 0], rotation: 0, minFilter: 'linear', magFilter: 'linear', mipmaps: true }, interpretation: { type: 'color' }, selection: { type: 'rgb' } } },
      emissiveStrength: { type: 'constant', value: coronaStrength } },
    transmissionMedium: { type: 'sheet' }, alphaMode: 'opaque', unlit: false, doubleSided: true,
  });
  const c = A.mesh(ids, G.plane(coronaSize, coronaSize), { name: 'Corona', mat: coronaMat, shadows: false, pos: [at[0], at[1], at[2] + coronaZ] });
  data.push(s.data, c.data);
  items.push(s.item, c.item);
  const L = A.light({ layerId, ids, kind: 'point', pos: at, power, color: [1, 0.82, 0.55], radius: r * 0.9, name: 'Sun light' });
  return { light: L, coreId: s.item.id, coronaId: c.item.id };
}

// Thin dark arcs ("branches") behind the bands.
export function branches(ids, data, items, { count = 8, seed = 4, R0 = 500, R1 = 900 } = {}) {
  const r = G.rng(seed), dId = ids.next();
  data.push(A.meshData(dId, G.torus(1, 0.004)));
  for (let i = 0; i < count; i++) {
    const R = R0 + r() * (R1 - R0);
    items.push(A.meshItem({ ids, dataId: dId, name: 'Branch', mat: M.iron, scale: [R * 100, R * 100, R * 100], rot: [r() * 180, r() * 180, r() * 180] }));
  }
}
