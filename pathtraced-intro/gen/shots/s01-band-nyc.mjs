// S01 (0.0–3.3s): close-up of the relief band (New York skyline) with the sun blazing behind it.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M } from '../lib/mat.mjs';
import { band, thinRing, sun } from '../lib/armillary.mjs';

export default {
  no: 1, key: 's01-band-nyc', start: 0, dur: 3300,
  build() {
    const ids = A.idSpace(1), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S01 Band NYC', start: this.start, dur: D, ids, bg: [0.05, 0.03, 0.015], ambient: 0.05 });
    const cam = A.camera({ layerId: L, ids, pos: [-60, 150, -1500], target: [0, -10, -620], focal: 50, fNumber: 2.8, roll: -16 });
    acts.push(...cam.actions);
    const data = [], items = [];
    const main = band(ids, data, items, { R: 620, W: 150, T: 16, tex: 'band_nyc', name: 'Main band', clasps: 0, reps: 4 });
    const b2 = band(ids, data, items, { R: 560, W: 70, T: 10, mat: M.bronze, rot: [62, 0, 18], name: 'Inner band', clasps: 0 });
    thinRing(ids, data, items, { R: 700, tube: 7, rot: [90, 0, 30] });
    thinRing(ids, data, items, { R: 660, tube: 5, rot: [40, 20, -50] });
    const s = sun(ids, data, items, L, { r: 120, power: 2500, coronaSize: 1500, coronaStrength: 4, coreStrength: 25 });
    const beam = A.mesh(ids, G.box(3200, 70, 70), { name: 'Foreground beam', mat: M.iron, pos: [-1400, 700, -1150], rot: [0, 0, -32] });
    data.push(beam.data); items.push(beam.item);
    acts.push(A.fragment(L, data, items), s.light.action);
    acts.push(A.light({ layerId: L, ids, kind: 'spot', pos: [-700, -600, -1500], target: [0, 0, -620], power: 900, cone: 35, feather: 0.7, radius: 80, color: [1, 0.85, 0.65], name: 'Key' }).action);
    acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [500, 400, -1300], power: 250, color: [0.7, 0.75, 1], radius: 100, name: 'Fill' }).action);
    acts.push(
      A.anim(L, main.groupId, 'rotationY', [[0, 0], [D, -9, 'linear']]),
      A.anim(L, b2.groupId, 'rotationY', [[0, 0], [D, 14, 'linear']]),
      A.anim(L, cam.camId, 'position', [[0, [-60, 150, -1500]], [D, [-40, 140, -1440], 'linear']]),
      A.anim(L, beam.item.id, 'position', [[0, [-1400, 700, -1150]], [2600, [-1400, 700, -1150], 'hold'], [D, [-200, -80, -1150], 'in']]),
      A.glow(L, ids.next(), 75, 60, 0.9),
    );
    return acts;
  },
};
