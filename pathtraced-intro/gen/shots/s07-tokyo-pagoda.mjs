// S07 (19.3–20.8s): Tokyo — a five-storey pagoda assembles tier by tier beside a torii gate.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M } from '../lib/mat.mjs';
import { mapBase, cityBlocks, label, gears, mapLights, blob, LAND_T } from '../lib/map.mjs';

export default {
  no: 7, key: 's07-tokyo-pagoda', start: 19300, dur: 1500,
  build() {
    const ids = A.idSpace(7), L = ids.layerId, D = this.dur, base = -LAND_T;
    const acts = A.sceneLayer({ layerId: L, name: 'S07 Tokyo pagoda', start: this.start, dur: D, ids, bg: [0.02, 0.016, 0.012], ambient: 0.05 });
    const cam = A.camera({ layerId: L, ids, pos: [-480, -900, -980], target: [-120, -140, -60], focal: 32, fNumber: 4.5 });
    acts.push(...cam.actions);
    const data = [], items = [], anims = [];
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    const land = blob(0, 300, 2600, 1800, 41, 64, 0.1);
    mapBase(ids, data, items, { lands: [land], water: [14000, 14000] });
    cityBlocks(ids, data, items, { poly: land, count: 2200, hMax: 30, size: [10, 22], seed: 42, avoid: [[0, 0, 240], [-380, -300, 220], [-560, 260, 280]] });
    label(ids, data, items, 'TOKYO', { pos: [-560, base - 2, 260], size: 72, rotY: -12 });
    add(G.box(320, 20, 320), { name: 'Pagoda plinth', mat: M.stoneDark, pos: [0, base - 10, 0] });
    for (let t = 0; t < 5; t++) {
      const y = base - 20 - t * 78;
      const tier = A.group({ ids, name: `Tier ${t + 1}`, pos: [0, y + 400, 0] });
      items.push(tier);
      const core = 120 - t * 14, roof = 240 - t * 26;
      add(G.box(core, 60, core), { name: 'Core', mat: M.lacquer, parent: tier.id, pos: [0, -30, 0] });
      add(G.box(roof, 9, roof), { name: 'Roof', mat: M.ivory, parent: tier.id, pos: [0, -66, 0] });
      add(G.box(roof * 0.78, 9, roof * 0.78), { name: 'Roof upper', mat: M.stone, parent: tier.id, pos: [0, -75, 0], rot: [0, 45, 0] });
      add(G.box(roof + 8, 4, roof + 8), { name: 'Eave', mat: M.ink, parent: tier.id, pos: [0, -61, 0] });
      const t0 = 60 + t * 170;
      anims.push(A.anim(L, tier.id, 'position', [[0, [0, y + 400, 0]], [t0, [0, y + 400, 0], 'hold'], [t0 + 520, [0, y, 0], 'out']]));
      anims.push(A.anim(L, tier.id, 'rotationY', [[t0, 90 - t * 15, 'linear'], [t0 + 520, 0, 'out']]));
    }
    const spire = A.group({ ids, name: 'Spire', pos: [0, base - 410 + 300, 0] });
    items.push(spire);
    add(G.cyl(5, 130), { name: 'Sorin', mat: M.gold, parent: spire.id, pos: [0, -65, 0] });
    for (let i = 0; i < 9; i++) add(G.torus(14 - i * 0.6, 2.5), { name: 'Ring', mat: M.gold, parent: spire.id, pos: [0, -20 - i * 11, 0] });
    anims.push(A.anim(L, spire.id, 'position', [[0, [0, base - 110, 0]], [920, [0, base - 110, 0], 'hold'], [1400, [0, base - 410, 0], 'out']]));
    // Torii gate.
    const tx = -380, tz = -300;
    for (const s of [-1, 1]) add(G.cyl(12, 210), { name: 'Torii pillar', mat: M.lacquer, pos: [tx + s * 95, base - 105, tz] });
    add(G.box(300, 16, 26), { name: 'Kasagi', mat: M.ink, pos: [tx, base - 222, tz] });
    add(G.box(270, 14, 20), { name: 'Shimaki', mat: M.lacquer, pos: [tx, base - 207, tz] });
    add(G.box(230, 12, 14), { name: 'Nuki', mat: M.lacquer, pos: [tx, base - 165, tz] });
    for (let i = 0; i < 5; i++) add(G.box(140, 6, 26), { name: 'Step', mat: M.stone, pos: [tx, base - 3 - i * 6, tz - 120 - i * 26] });
    const gearAnims = gears(ids, data, items, L, [
      { x: 300, z: -200, teeth: 26, r: 120, spokes: 5 },
      { x: 420, z: 60, teeth: 16, r: 70, spokes: 4, dir: -1, mat: M.copper },
    ], D, 70);
    acts.push(A.fragment(L, data, items), ...anims, ...gearAnims, ...mapLights(L, ids, { center: [0, -100, 0], key: 2600 }));
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, [-480, -900, -980]], [D, [-420, -840, -900], 'linear']]),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
