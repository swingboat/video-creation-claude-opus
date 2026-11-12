// S04 (11.9–13.3s): London — Roman-numeral clock on a gear base, Big Ben, St Paul's dome, London Eye.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M, pbr } from '../lib/mat.mjs';
import { mapBase, cityBlocks, label, gears, mapLights, LAND_T } from '../lib/map.mjs';

const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

export default {
  no: 4, key: 's04-london', start: 11900, dur: 1400,
  build() {
    const ids = A.idSpace(4), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S04 London', start: this.start, dur: D, ids, bg: [0.02, 0.016, 0.012], ambient: 0.05 });
    const cam = A.camera({ layerId: L, ids, pos: [-640, -400, -1080], target: [60, -230, 150], focal: 32, fNumber: 4.5 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    const north = [[-3000, -120], ...Array.from({ length: 30 }, (_, i) => [-3000 + i * 207, -120 + 40 * Math.sin(i * 0.7)]), [3000, -120], [3000, 3000], [-3000, 3000]];
    const south = [[-3000, -3000], [3000, -3000], [3000, -420], ...Array.from({ length: 30 }, (_, i) => [3000 - i * 207, -420 + 40 * Math.sin(i * 0.6 + 1)]), [-3000, -420]];
    mapBase(ids, data, items, { lands: [north, south], water: [14000, 14000] });
    cityBlocks(ids, data, items, { poly: [[-1600, -60], [1800, -60], [1800, 1800], [-1600, 1800]], count: 900, hMax: 35, seed: 21, avoid: [[-150, 60, 260], [250, 250, 140], [-520, 420, 170], [150, 420, 140], [650, 600, 260], [-420, -20, 220]] });
    cityBlocks(ids, data, items, { poly: [[-1600, -1800], [1800, -1800], [1800, -480], [-1600, -480]], count: 500, hMax: 25, seed: 22 });
    label(ids, data, items, 'LONDON', { pos: [-330, -LAND_T - 2, -50], size: 62 });
    // Clock on a gear base.
    const cx = -150, cz = 60, base = -LAND_T;
    add(G.cyl(170, 30), { name: 'Clock base', mat: M.brassDark, pos: [cx, base - 15, cz] });
    const cy = base - 30 - 220;
    add(G.box(40, 60, 40), { name: 'Clock post', mat: M.brass, pos: [cx, base - 55, cz] });
    add(G.ring(215, 150, 26, 120), { name: 'Clock ring', mat: M.ivory, pos: [cx, cy, cz] });
    add(G.ring(222, 212, 34, 120), { name: 'Clock rim', mat: M.brass, pos: [cx, cy, cz] });
    add(G.extrude([G.circlePts(150, 96)], 12), { name: 'Clock face', mat: M.ink, pos: [cx, cy, cz + 6] });
    NUM.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2, id = ids.next();
      data.push({ ...A.textData({ id, text: n, font: 'Cinzel', style: 'Bold', size: 34, depth: 4 }), justification: 'center' });
      items.push(A.textItem({ ids, dataId: id, name: `Numeral ${n}`, mat: M.ink, pos: [cx + 183 * Math.sin(a), cy - 183 * Math.cos(a) + 12, cz - 15], rot: [0, 0, (i / 12) * 360] }));
    });
    const hourId = add(G.box(14, 100, 6), { name: 'Hour hand', mat: M.gold, pos: [cx, cy, cz - 8], anchor: [0, 45, 0] });
    const minId = add(G.box(9, 140, 6), { name: 'Minute hand', mat: M.gold, pos: [cx, cy, cz - 12], anchor: [0, 65, 0] });
    add(G.sphere(12), { name: 'Hub', mat: M.gold, pos: [cx, cy, cz - 16] });
    // Big Ben.
    const bx = 260, bz = 260;
    add(G.box(80, 430, 80), { name: 'Tower shaft', mat: M.stone, pos: [bx, base - 215, bz] });
    add(G.box(104, 104, 104), { name: 'Clock stage', mat: M.stoneDark, pos: [bx, base - 482, bz] });
    for (const [dx, dz, ry] of [[0, -53, 0], [-53, 0, 90], [53, 0, -90], [0, 53, 180]]) add(G.cyl(38, 6), { name: 'Tower clock', mat: M.ivory, pos: [bx + dx, base - 482, bz + dz], rot: [90, ry, 0] });
    add(G.box(80, 60, 80), { name: 'Belfry', mat: M.stone, pos: [bx, base - 564, bz] });
    add(G.cone(58, 150), { name: 'Spire', mat: M.brassDark, pos: [bx, base - 669, bz], rot: [180, 0, 0] });
    // St Paul's.
    const px = -560, pz = 460;
    add(G.box(260, 120, 160), { name: 'Nave', mat: M.stone, pos: [px, base - 60, pz] });
    add(G.cyl(90, 90), { name: 'Drum', mat: M.stone, pos: [px, base - 165, pz] });
    add(G.lathe([[0, -110], [30, -104], [62, -80], [84, -40], [92, 0], [0, 0]]), { name: 'Dome', mat: M.stoneDark, pos: [px, base - 210, pz] });
    add(G.cyl(14, 40), { name: 'Lantern', mat: M.stone, pos: [px, base - 340, pz] });
    add(G.sphere(10), { name: 'Cross ball', mat: M.gold, pos: [px, base - 368, pz] });
    // Parliament.
    add(G.box(520, 70, 60), { name: 'Parliament', mat: M.stone, pos: [140, base - 35, 470] });
    for (let i = 0; i < 12; i++) add(G.cone(7, 40), { name: 'Pinnacle', mat: M.gold, pos: [-100 + i * 44, base - 90, 470], rot: [180, 0, 0] });
    // London Eye.
    const ex = 700, ez = 650, ey = base - 260;
    const eye = A.group({ ids, name: 'London Eye', pos: [ex, ey, ez] });
    items.push(eye);
    add(G.torus(240, 5), { name: 'Eye rim', mat: M.silver, rot: [90, 0, 0], parent: eye.id });
    for (let i = 0; i < 16; i++) add(G.box(2.5, 240, 2.5), { name: 'Spoke', mat: M.steel, rot: [0, 0, (i / 16) * 360], anchor: [0, 120, 0], parent: eye.id });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; add(G.sphere(9), { name: 'Pod', mat: M.ivory, pos: [250 * Math.cos(a), 250 * Math.sin(a), 0], parent: eye.id }); }
    for (const s of [-1, 1]) add(G.box(8, 290, 8), { name: 'Eye leg', mat: M.steel, pos: [ex + s * 70, base - 130, ez - 20], rot: [0, 0, s * 15] });
    const gearAnims = gears(ids, data, items, L, [
      { x: cx, z: cz, y: base - 32, teeth: 40, r: 190, spokes: 6, depth: 10, mat: M.brass },
      { x: cx + 300, z: cz - 140, teeth: 22, r: 100, spokes: 5, dir: -1 },
    ], D, 60);
    acts.push(A.fragment(L, data, items), ...gearAnims, ...mapLights(L, ids, { center: [0, 0, 150], key: 2600 }));
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, [-640, -400, -1080]], [D, [-560, -385, -1010], 'linear']]),
      A.anim(L, hourId, 'rotationZ', [[0, 300, 'linear'], [D, 310, 'linear']]),
      A.anim(L, minId, 'rotationZ', [[0, 40, 'linear'], [D, 100, 'linear']]),
      A.anim(L, eye.id, 'rotationZ', [[0, 0, 'linear'], [D, 6, 'linear']]),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
