// S03 (6.8–11.9s): descend over the New York map; the Statue of Liberty rises out of a star-gear mechanism.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M, pbr, emissive } from '../lib/mat.mjs';
import { mapBase, cityBlocks, label, gears, mapLights, rise, blob, LAND_T } from '../lib/map.mjs';

const rotPts = (pts, deg, [cx, cz]) => { const a = (deg * Math.PI) / 180; return pts.map(([x, z]) => [cx + (x - cx) * Math.cos(a) - (z - cz) * Math.sin(a), cz + (x - cx) * Math.sin(a) + (z - cz) * Math.cos(a)]); };

function statue(ids, data, items, parent) {
  const add = (geo, o) => { const m = A.mesh(ids, geo, { parent, ...o }); data.push(m.data); items.push(m.item); return m.item.id; };
  add(G.box(120, 40, 120), { name: 'Plinth', mat: M.stone, pos: [0, -20, 0] });
  add(G.box(92, 100, 92), { name: 'Pedestal', mat: M.stone, pos: [0, -90, 0] });
  add(G.box(104, 14, 104), { name: 'Cornice', mat: M.stoneDark, pos: [0, -146, 0] });
  add(G.box(70, 30, 70), { name: 'Base top', mat: M.stone, pos: [0, -168, 0] });
  const pat = M.patina;
  add(G.lathe([[0, -200], [14, -200], [22, -170], [30, -100], [38, -30], [44, 0], [0, 0]]), { name: 'Robe', mat: pat, pos: [0, -183, 0] });
  add(G.lathe([[0, -26], [10, -24], [12, -12], [9, 0], [0, 0]]), { name: 'Neck', mat: pat, pos: [0, -378, 0] });
  add(G.sphere(15), { name: 'Head', mat: pat, pos: [0, -412, 0] });
  for (let i = 0; i < 7; i++) {
    const a = -90 + (i - 3) * 26;
    add(G.cone(3, 26), { name: 'Crown ray', mat: pat, pos: [16 * Math.cos((a * Math.PI) / 180), -428, 16 * Math.sin((a * Math.PI) / 180) * 0.4], rot: [0, 0, (i - 3) * 20] });
  }
  add(G.cyl(6, 95), { name: 'Raised arm', mat: pat, pos: [26, -420, 0], rot: [0, 0, 18] });
  add(G.cyl(7, 14), { name: 'Torch handle', mat: M.gold, pos: [40, -470, 0] });
  add(G.lathe([[0, -16], [12, -16], [8, 0], [0, 0]]), { name: 'Torch cup', mat: M.gold, pos: [41, -477, 0] });
  add(G.cone(8, 22), { name: 'Flame', mat: emissive('#FFB347', 14), pos: [41, -505, 0], rot: [180, 0, 0], shadows: false });
  add(G.box(26, 40, 8), { name: 'Tablet', mat: pat, pos: [-30, -300, -14], rot: [0, 0, -15] });
  add(G.cyl(6, 70), { name: 'Left arm', mat: pat, pos: [-22, -318, -6], rot: [0, 0, 30] });
}

export default {
  no: 3, key: 's03-new-york', start: 6800, dur: 5100,
  build() {
    const ids = A.idSpace(3), L = ids.layerId, D = this.dur, C = [150, 0, -150];
    const acts = A.sceneLayer({ layerId: L, name: 'S03 New York', start: this.start, dur: D, ids, bg: [0.02, 0.016, 0.012], ambient: 0.05 });
    const K = [
      [0, [-700, -1700, -1900], [0, 0, 300]],
      [1800, [-250, -1000, -1250], [C[0], -60, C[2]]],
      [3300, [-450, -700, -1100], [C[0] - 60, -260, C[2]]],
      [D, [-420, -380, -980], [C[0] - 170, -330, C[2]]],
    ];
    const cam = A.camera({ layerId: L, ids, pos: K[0][1], target: K[0][2], focal: 35, fNumber: 4 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const manhattan = rotPts(blob(-330, 250, 170, 650, 3, 48, 0.12), 25, [-330, 250]);
    const mainland = blob(950, 400, 650, 1000, 5);
    const jersey = blob(-1350, 100, 600, 1400, 7);
    mapBase(ids, data, items, { lands: [manhattan, mainland, jersey], water: [14000, 14000] });
    cityBlocks(ids, data, items, { poly: manhattan, count: 900, hMin: 10, hMax: 90, size: [10, 24], seed: 11 });
    cityBlocks(ids, data, items, { poly: mainland, count: 700, hMax: 40, seed: 12, avoid: [[C[0], C[2], 520], [380, 330, 230], [620, 330, 230]] });
    cityBlocks(ids, data, items, { poly: jersey, count: 500, hMax: 30, seed: 13 });
    label(ids, data, items, 'NEW YORK', { pos: [500, -LAND_T - 2, 330], size: 72, rotY: 0 });
    // Mechanism: brass platform in the harbour with counter-rotating star plates.
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    add(G.lathe([[0, -24], [300, -24], [320, 0], [0, 0]]), { name: 'Platform', mat: M.brassDark, pos: C });
    const ringId = add(G.gear({ teeth: 72, r: 290, tooth: 14, hole: 215 }, 22), { name: 'Ring gear', mat: M.brass, rot: [90, 0, 0], pos: [C[0], -36, C[2]] });
    const star1 = add(G.star({ points: 8, rOut: 205, rIn: 150, hole: 78 }, 26), { name: 'Star plate', mat: M.brass, rot: [90, 0, 0], pos: [C[0], -50, C[2]] });
    const star2 = add(G.star({ points: 8, rOut: 150, rIn: 112, hole: 74, rot: Math.PI / 8 }, 26), { name: 'Star plate 2', mat: M.gold, rot: [90, 0, 0], pos: [C[0], -76, C[2]] });
    const lib = A.group({ ids, name: 'Liberty', pos: [C[0], 500, C[2]] });
    items.push(lib);
    statue(ids, data, items, lib.id);
    const gearSpecs = [
      { x: C[0] - 420, z: C[2] + 120, teeth: 28, r: 130, spokes: 5, dir: -1 },
      { x: C[0] + 380, z: C[2] - 260, teeth: 36, r: 170, spokes: 6, dir: 1, mat: M.brassDark },
      { x: C[0] + 140, z: C[2] + 420, teeth: 20, r: 90, spokes: 4, dir: -1 },
      { x: C[0] - 330, z: C[2] - 360, teeth: 24, r: 110, spokes: 5, dir: 1, mat: M.copper },
      { x: C[0] + 560, z: C[2] + 200, teeth: 18, r: 80, spokes: 4, dir: -1 },
    ];
    const gearAnims = gears(ids, data, items, L, gearSpecs, D);
    acts.push(A.fragment(L, data, items), ...gearAnims);
    acts.push(...mapLights(L, ids, { center: C, key: 2600 }));
    acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [C[0] - 300, -600, C[2] - 500], power: 500, radius: 100, color: [1, 0.85, 0.65], name: 'Statue fill' }).action);
    acts.push(
      A.anim(L, cam.camId, 'position', K.map(([t, p], i) => [t, p, i === 1 ? 'soft' : 'inOut'])),
      A.anim(L, cam.tgtId, 'offset', K.map(([t, , g]) => [t, g, 'inOut'])),
      A.anim(L, ringId, 'rotationY', [[0, 0, 'linear'], [D, 30, 'linear']]),
      A.anim(L, star1, 'rotationY', [[0, 0, 'linear'], [D, -60, 'linear']]),
      A.anim(L, star2, 'rotationY', [[0, 0, 'linear'], [D, 90, 'linear']]),
      ...rise(L, lib.id, { t0: 1700, t1: 3400, from: 520, spin: 160, pos: [C[0], -88, C[2]] }),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
