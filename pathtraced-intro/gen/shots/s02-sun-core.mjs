// S02 (3.3–6.8s): inside the armillary, staring into the sun core while rings sweep across.
import * as A from '../lib/act.mjs';
import { M } from '../lib/mat.mjs';
import { band, thinRing, sun } from '../lib/armillary.mjs';

export default {
  no: 2, key: 's02-sun-core', start: 3300, dur: 3500,
  build() {
    const ids = A.idSpace(2), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S02 Sun core', start: this.start, dur: D, ids, bg: [0.03, 0.02, 0.012], ambient: 0.04 });
    const cam = A.camera({ layerId: L, ids, pos: [-60, 110, -820], target: [0, 0, 0], focal: 26, fNumber: 4, roll: -10 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const rings = [
      band(ids, data, items, { R: 420, W: 70, T: 10, mat: M.bronze, rot: [70, 10, 25], name: 'Band A', clasps: 6 }),
      band(ids, data, items, { R: 380, W: 46, T: 8, mat: M.brassDark, rot: [20, 0, -60], name: 'Band B', clasps: 4 }),
      band(ids, data, items, { R: 470, W: 90, T: 12, tex: 'band_nyc', rot: [95, 0, -15], name: 'Band C', clasps: 0, reps: 3 }),
      band(ids, data, items, { R: 215, W: 34, T: 12, mat: M.bronze, rot: [90, 0, 0], name: 'Sun frame', clasps: 8 }),
    ];
    const thin = [
      thinRing(ids, data, items, { R: 340, tube: 5, rot: [60, 0, 80] }),
      thinRing(ids, data, items, { R: 300, tube: 4, rot: [110, 30, 10], mat: M.brass }),
      thinRing(ids, data, items, { R: 520, tube: 6, rot: [30, 60, 0] }),
    ];
    const s = sun(ids, data, items, L, { r: 120, power: 2500, coronaSize: 950, coronaStrength: 5, coreStrength: 30, coronaZ: 80 });
    acts.push(A.fragment(L, data, items), s.light.action);
    acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [-300, -300, -700], power: 200, color: [1, 0.8, 0.6], radius: 120, name: 'Rim' }).action);
    // [id, channel, static value, delta]: keyframes replace the static channel, so start from it.
    const spin = [[rings[0].groupId, 'rotationZ', 25, 40], [rings[1].groupId, 'rotationX', 20, -35], [rings[2].groupId, 'rotationY', 0, 25], [thin[0], 'rotationX', 60, 30], [thin[1], 'rotationZ', 10, -45], [thin[2], 'rotationY', 60, 20]];
    for (const [id, prop, base, deg] of spin) acts.push(A.anim(L, id, prop, [[0, base, 'linear'], [D, base + deg, 'linear']]));
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, [-60, 110, -820]], [D, [40, 70, -700], 'inOut']]),
      A.glow(L, ids.next(), 70, 80, 1.0),
    );
    return acts;
  },
};
