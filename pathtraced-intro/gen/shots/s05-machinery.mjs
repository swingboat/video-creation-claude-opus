// S05 (13.3–16.3s): frontal view of the clockwork machinery — gear rows, riveted beams, swinging golden bells.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M } from '../lib/mat.mjs';

export default {
  no: 5, key: 's05-machinery', start: 13300, dur: 3000,
  build() {
    const ids = A.idSpace(5), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S05 Machinery', start: this.start, dur: D, ids, bg: [0.015, 0.012, 0.01], ambient: 0.04 });
    const cam = A.camera({ layerId: L, ids, pos: [300, -200, -2050], target: [260, -140, 0], focal: 30, fNumber: 4 });
    acts.push(...cam.actions);
    const data = [], items = [], anims = [];
    const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
    add(G.box(4200, 2000, 20), { name: 'Back plate', mat: M.ink, pos: [0, 0, 160] });
    const rivetId = ids.next();
    data.push(A.meshData(rivetId, G.sphere(5)));
    const beam = (y, w, h, z, mat, rivets = true) => {
      add(G.box(w, h, 40), { name: 'Beam', mat, pos: [0, y, z] });
      add(G.box(w, 8, 60), { name: 'Flange', mat, pos: [0, y - h / 2, z] });
      add(G.box(w, 8, 60), { name: 'Flange', mat, pos: [0, y + h / 2, z] });
      if (rivets) for (let x = -w / 2 + 20; x < w / 2; x += 34) for (const dy of [-h / 4, h / 4]) items.push(A.meshItem({ ids, dataId: rivetId, name: 'Rivet', mat: M.brass, pos: [x, y + dy, z - 22] }));
    };
    beam(-560, 3400, 70, 0, M.brassDark);
    beam(-150, 3400, 50, -10, M.iron);
    beam(330, 3400, 60, -10, M.iron);
    for (const x of [-1050, -350, 350, 1050]) add(G.box(44, 1600, 44), { name: 'Post', mat: M.bronze, pos: [x, 0, 20] });
    // Top gear train (vertical, facing camera).
    for (let i = 0; i < 11; i++) {
      const big = i % 2 === 0, r = big ? 120 : 82, x = -1500 + i * 205;
      const id = add(G.gear({ teeth: big ? 30 : 20, r, tooth: 11, hole: 14, spokes: big ? 6 : 5 }, 16), { name: 'Top gear', mat: big ? M.brass : M.copper, pos: [x, -700, -20] });
      anims.push(A.anim(L, id, 'rotationZ', [[0, 0, 'linear'], [D, (big ? 1 : -1.46) * 70, 'linear']]));
    }
    for (let i = 0; i < 9; i++) {
      const x = -1300 + i * 330, r = 70;
      const id = add(G.gear({ teeth: 18, r, tooth: 9, hole: 10, spokes: 4 }, 12), { name: 'Low gear', mat: M.brassDark, pos: [x, 520, -20] });
      anims.push(A.anim(L, id, 'rotationZ', [[0, 0, 'linear'], [D, (i % 2 ? 1 : -1) * 90, 'linear']]));
    }
    // Swinging golden bells on pendulum arms hung from the middle beam.
    [-950, -300, 350, 1000].forEach((x, i) => {
      const arm = A.group({ ids, name: 'Bell arm', pos: [x, -150, -60] });
      items.push(arm);
      add(G.box(16, 260, 16), { name: 'Arm rod', mat: M.brass, parent: arm.id, pos: [0, 130, 0] });
      add(G.sphere(16), { name: 'Pivot', mat: M.gold, parent: arm.id });
      const bell = A.group({ ids, name: 'Bell', parent: arm.id, pos: [0, 330, 0], scale: 160 });
      items.push(bell);
      add(G.lathe([[0, -80], [22, -76], [58, -40], [72, 0], [50, 30], [0, 80]]), { name: 'Bell body', mat: M.gold, parent: bell.id });
      add(G.torus(66, 5), { name: 'Bell band', mat: M.brassDark, parent: bell.id, pos: [0, -4, 0] });
      const ph = i % 2 ? 1 : -1;
      anims.push(A.anim(L, arm.id, 'rotationZ', [[0, -14 * ph], [D / 2, 14 * ph], [D, -14 * ph]]));
      anims.push(A.anim(L, bell.id, 'rotationY', [[0, 0, 'linear'], [D, 160 * ph, 'linear']]));
    });
    for (const [x, y] of [[-650, 120], [650, 120], [0, -380]]) add(G.ring(110, 90, 20, 72), { name: 'Port frame', mat: M.bronze, pos: [x, y, 0] });
    acts.push(A.fragment(L, data, items), ...anims);
    acts.push(A.light({ layerId: L, ids, kind: 'spot', pos: [-900, -1200, -1400], target: [200, -100, 0], power: 1100, cone: 50, feather: 0.7, radius: 120, color: [1, 0.8, 0.55], name: 'Key' }).action);
    acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [1300, 600, -900], power: 500, radius: 150, color: [0.6, 0.7, 1], name: 'Fill' }).action);
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, [300, -200, -2050]], [D, [160, -230, -1880], 'linear']]),
      A.anim(L, cam.tgtId, 'offset', [[0, [260, -140, 0]], [D, [170, -150, 0], 'linear']]),
      A.glow(L, ids.next(), 80, 40, 0.6),
    );
    return acts;
  },
};
