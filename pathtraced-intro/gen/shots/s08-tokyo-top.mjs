// S08 (20.8–23.7s): Tokyo from directly above — chrysanthemum mechanism, gears, Tokyo Tower rising, river contours.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M, pbr } from '../lib/mat.mjs';
import { mapBase, cityBlocks, gears, mapLights, blob, LAND_T } from '../lib/map.mjs';

const orange = pbr({ color: '#C8502A', rough: 0.45 });

// Tapered leg between two square cross-sections (y down; top is the smaller, higher one).
function frustum(b, t) {
  const mb = new G.MeshBuilder();
  const B = b.c.map((p) => mb.v(p)), T = t.c.map((p) => mb.v(p));
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; mb.face([B[i], B[j], T[j], T[i]]); }
  mb.face([T[0], T[1], T[2], T[3]]); mb.face([B[3], B[2], B[1], B[0]]);
  return mb.geometry();
}
const sq = (cx, y, cz, h) => ({ c: [[cx - h, y, cz - h], [cx - h, y, cz + h], [cx + h, y, cz + h], [cx + h, y, cz - h]] });

export default {
  no: 8, key: 's08-tokyo-top', start: 20800, dur: 2900,
  build() {
    const ids = A.idSpace(8), L = ids.layerId, D = this.dur, base = -LAND_T;
    const acts = A.sceneLayer({ layerId: L, name: 'S08 Tokyo top', start: this.start, dur: D, ids, bg: [0.02, 0.016, 0.012], ambient: 0.05 });
    const cam = A.camera({ layerId: L, ids, pos: [-80, -1650, -60], target: [-80, 0, 0], focal: 32, fNumber: 5, up: [0, 0, -1] });
    acts.push(...cam.actions);
    const data = [], items = [];
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    const land = blob(-500, 200, 1100, 1400, 51, 64, 0.12);
    mapBase(ids, data, items, { lands: [land], water: [14000, 14000] });
    cityBlocks(ids, data, items, { poly: land, count: 1600, hMax: 26, seed: 52, avoid: [[150, 220, 330], [300, -130, 170]] });
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < 46; i++) {
        const z = -1400 + i * 62, x = 620 + k * 34 + 90 * Math.sin(z / 260) + k * 6 * Math.sin(z / 90);
        const z2 = z + 62, x2 = 620 + k * 34 + 90 * Math.sin(z2 / 260) + k * 6 * Math.sin(z2 / 90);
        add(G.box(3, 2, Math.hypot(x2 - x, 62)), { name: 'Contour', mat: M.ivory, pos: [(x + x2) / 2, -1, (z + z2) / 2], rot: [0, (Math.atan2(x2 - x, 62) * 180) / Math.PI, 0] });
      }
    }
    // Chrysanthemum mechanism.
    const cx = 150, cz = 220;
    add(G.lathe([[0, -40], [250, -40], [300, -10], [300, 0], [0, 0]]), { name: 'Bowl', mat: M.brassDark, pos: [cx, base, cz] });
    add(G.star({ points: 32, rOut: 330, rIn: 296, hole: 290 }, 12), { name: 'Spike ring', mat: M.gold, rot: [90, 0, 0], pos: [cx, base - 8, cz] });
    const flower = A.group({ ids, name: 'Chrysanthemum', pos: [cx, base - 46, cz] });
    items.push(flower);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 16; i++) {
      const a = (i + ring * 0.5) * 22.5, r = ring ? 120 : 180;
      add(G.sphere(50), { name: 'Petal', mat: M.ivory, parent: flower.id, scale: [130, 22, 36], rot: [0, -a, 0], pos: [r * Math.cos((a * Math.PI) / 180), -ring * 18, r * Math.sin((a * Math.PI) / 180)] });
    }
    add(G.sphere(64), { name: 'Flower heart', mat: M.gold, parent: flower.id, pos: [0, -30, 0] });
    // Tokyo Tower on a gear base, rising toward the camera.
    const tx = 300, tz = -130;
    add(G.ring(150, 110, 20, 96), { name: 'Tower ring', mat: M.brass, rot: [90, 0, 0], pos: [tx, base - 10, tz] });
    const tower = A.group({ ids, name: 'Tokyo Tower', pos: [tx, 700, tz] });
    items.push(tower);
    const lv = [[0, 95], [-260, 52], [-440, 26], [-600, 12]];
    for (let s = 0; s < 3; s++) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const [y0, h0] = lv[s], [y1, h1] = lv[s + 1];
      add(frustum(sq(sx * h0, y0, sz * h0, 9 - s * 2), sq(sx * h1, y1, sz * h1, 7 - s * 2)), { name: 'Leg', mat: s % 2 ? M.white : orange, parent: tower.id });
    }
    add(G.box(130, 18, 130), { name: 'Main deck', mat: M.white, parent: tower.id, pos: [0, -260, 0] });
    add(G.box(70, 16, 70), { name: 'Top deck', mat: orange, parent: tower.id, pos: [0, -440, 0] });
    add(G.cyl(6, 200), { name: 'Antenna', mat: M.white, parent: tower.id, pos: [0, -700, 0] });
    const gearAnims = gears(ids, data, items, L, [
      { x: tx, z: tz, y: base - 24, teeth: 40, r: 108, hole: 0, spokes: 0, depth: 8, mat: M.brassDark },
      { x: -180, z: 380, teeth: 30, r: 150, spokes: 6, dir: -1 },
      { x: -320, z: -260, teeth: 22, r: 100, spokes: 5, mat: M.copper },
      { x: 560, z: 420, teeth: 18, r: 80, spokes: 4, dir: -1 },
    ], D);
    acts.push(A.fragment(L, data, items), ...gearAnims, ...mapLights(L, ids, { center: [0, 0, 0], key: 2800, keyPos: [-1300, -1900, -500] }));
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, [-80, -1650, -60]], [D, [-60, -1500, -50], 'linear']]),
      A.anim(L, cam.aimId, 'up', [[0, [0, 0, -1]], [D, [-0.1, 0, -0.995], 'linear']]),
      A.anim(L, tower.id, 'position', [[0, [tx, 700, tz]], [200, [tx, 700, tz], 'hold'], [1700, [tx, base - 20, tz], 'out']]),
      A.anim(L, flower.id, 'rotationY', [[0, 0, 'linear'], [D, 40, 'linear']]),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
