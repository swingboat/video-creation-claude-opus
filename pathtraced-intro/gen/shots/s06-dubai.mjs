// S06 (16.3–19.3s): Dubai — palm medallion, gears, the Burj Khalifa rising, camera tilts up to the spire.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M, emissive } from '../lib/mat.mjs';
import { mapBase, cityBlocks, label, gears, mapLights, rise, LAND_T } from '../lib/map.mjs';

const leaf = (len, wid) => {
  const p = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; p.push([t * len, wid * Math.sin(Math.PI * t)]); }
  for (let i = 15; i > 0; i--) { const t = i / 16; p.push([t * len, -wid * 0.35 * Math.sin(Math.PI * t)]); }
  return [p];
};

export default {
  no: 6, key: 's06-dubai', start: 16300, dur: 3000,
  build() {
    const ids = A.idSpace(6), L = ids.layerId, D = this.dur, base = -LAND_T;
    const acts = A.sceneLayer({ layerId: L, name: 'S06 Dubai', start: this.start, dur: D, ids, bg: [0.09, 0.055, 0.03], ambient: 0.05 });
    const K = [[0, [-420, -820, -1250], [-40, -160, 120]], [1700, [-300, -640, -1050], [60, -260, 160]], [D, [-60, -260, -720], [160, -880, 220]]];
    const cam = A.camera({ layerId: L, ids, pos: K[0][1], target: K[0][2], focal: 30, fNumber: 4.5 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    const coast = [[-4000, 4000], [4000, 4000], [4000, -260], ...Array.from({ length: 40 }, (_, i) => [4000 - i * 205, -260 + 60 * Math.sin(i * 0.5) + 30 * Math.sin(i * 1.7)]), [-4000, -260]];
    mapBase(ids, data, items, { lands: [coast], water: [14000, 14000] });
    cityBlocks(ids, data, items, { poly: [[-1600, -200], [1800, -200], [1800, 1800], [-1600, 1800]], count: 700, hMin: 10, hMax: 120, size: [12, 28], seed: 31, avoid: [[-420, 80, 340], [150, 200, 200], [-650, -120, 260], [500, -60, 180]] });
    label(ids, data, items, 'DUBAI', { pos: [-560, base - 2, -170], size: 70 });
    for (const [r, w] of [[260, 4], [330, 4], [410, 3]]) add(G.ring(r, r - w, 3, 120), { name: 'Contour', mat: M.ivory, rot: [90, 0, 0], pos: [380, -2, -620] });
    // Palm medallion.
    const mx = -420, mz = 80;
    add(G.cyl(235, 16), { name: 'Medallion disc', mat: M.ink, pos: [mx, base - 8, mz] });
    add(G.star({ points: 28, rOut: 300, rIn: 248, hole: 236 }, 10), { name: 'Medallion spikes', mat: M.gold, rot: [90, 0, 0], pos: [mx, base - 6, mz] });
    add(G.ring(248, 226, 22, 120), { name: 'Medallion ring', mat: M.brass, rot: [90, 0, 0], pos: [mx, base - 14, mz] });
    add(G.box(16, 8, 170), { name: 'Palm trunk', mat: M.gold, pos: [mx, base - 20, mz - 60] });
    for (let i = 0; i < 7; i++) add(G.extrude(leaf(170, 34), 6), { name: 'Palm frond', mat: M.gold, rot: [90, -150 + i * 20 - 90, 0], pos: [mx, base - 22, mz + 25] });
    // Burj Khalifa: Y-plan tiers stepping inward, then the spire.
    const bx = 150, bz = 200;
    const burj = A.group({ ids, name: 'Burj', pos: [bx, 1000, bz] });
    items.push(burj);
    let y = 0;
    for (let t = 0; t < 8; t++) {
      const h = 105, len = 92 * (1 - t / 9), w = 34 - t * 2.4;
      for (const ry of [0, 120, 240]) add(G.box(w, h, len), { name: 'Wing', mat: M.glassBlue, parent: burj.id, pos: [0, y - h / 2, 0], rot: [0, ry, 0], anchor: [0, 0, -len / 2] });
      add(G.cyl(w * 0.75, h), { name: 'Core', mat: M.silver, parent: burj.id, pos: [0, y - h / 2, 0] });
      y -= h;
    }
    add(G.cone(12, 200), { name: 'Spire', mat: M.silver, parent: burj.id, pos: [0, y - 100, 0], rot: [180, 0, 0] });
    add(G.sphere(5), { name: 'Beacon', mat: emissive('#FFE6B8', 40), parent: burj.id, pos: [0, y - 205, 0], shadows: false });
    // Construction cranes.
    for (const [x, z, h] of [[460, 380, 380], [-120, 520, 300], [620, 60, 260]]) {
      add(G.box(14, h, 14), { name: 'Crane mast', mat: M.gold, pos: [x, base - h / 2, z] });
      add(G.box(220, 10, 10), { name: 'Crane jib', mat: M.gold, pos: [x + 60, base - h, z] });
    }
    const gearAnims = gears(ids, data, items, L, [
      { x: -60, z: -40, teeth: 32, r: 150, spokes: 6, mat: M.silver },
      { x: 500, z: -60, teeth: 22, r: 100, spokes: 5, dir: -1 },
      { x: -820, z: 360, teeth: 26, r: 120, spokes: 5, dir: -1, mat: M.brassDark },
    ], D);
    acts.push(A.fragment(L, data, items), ...gearAnims, ...mapLights(L, ids, { center: [0, -200, 150], key: 2800 }));
    acts.push(
      A.anim(L, cam.camId, 'position', K.map(([t, p]) => [t, p, 'inOut'])),
      A.anim(L, cam.tgtId, 'offset', K.map(([t, , g]) => [t, g, 'inOut'])),
      ...rise(L, burj.id, { t0: 150, t1: 1800, from: 1000, spin: 90, pos: [bx, base, bz] }),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
