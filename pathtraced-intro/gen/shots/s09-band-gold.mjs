// S09 (23.7–26.3s): golden relief band close-up, camera gliding along it, branches silhouetted against the glow.
import * as A from '../lib/act.mjs';
import { M } from '../lib/mat.mjs';
import { band, thinRing, sun, branches } from '../lib/armillary.mjs';

export default {
  no: 9, key: 's09-band-gold', start: 23700, dur: 2600,
  build() {
    const ids = A.idSpace(9), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S09 Band gold', start: this.start, dur: D, ids, bg: [0.06, 0.035, 0.02], ambient: 0.05 });
    const cam = A.camera({ layerId: L, ids, pos: [-140, 210, -1350], target: [-60, -10, -620], focal: 55, fNumber: 2.4, roll: 9 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const main = band(ids, data, items, { R: 620, W: 150, T: 16, tex: 'band_gold', name: 'Gold band', clasps: 6, reps: 4 });
    thinRing(ids, data, items, { R: 700, tube: 7, rot: [80, 0, -25], mat: M.bronze });
    band(ids, data, items, { R: 560, W: 60, T: 10, mat: M.bronze, rot: [55, 0, 30], name: 'Inner band', clasps: 0 });
    branches(ids, data, items, { count: 10, seed: 21, R0: 300, R1: 560 });
    const s = sun(ids, data, items, L, { r: 120, power: 3000, coronaSize: 1600, coronaStrength: 5, coreStrength: 28 });
    acts.push(A.fragment(L, data, items), s.light.action);
    acts.push(A.light({ layerId: L, ids, kind: 'spot', pos: [-600, -500, -1500], target: [0, 0, -620], power: 700, cone: 35, feather: 0.7, radius: 80, color: [1, 0.82, 0.6], name: 'Key' }).action);
    acts.push(
      A.anim(L, main.groupId, 'rotationY', [[0, 0], [D, 7, 'linear']]),
      A.anim(L, cam.tgtId, 'offset', [[0, [-60, -10, -620]], [D, [60, -10, -620], 'inOut']]),
      A.anim(L, cam.camId, 'position', [[0, [-140, 210, -1350]], [D, [20, 190, -1300], 'inOut']]),
      A.glow(L, ids.next(), 72, 60, 0.9),
    );
    return acts;
  },
};
