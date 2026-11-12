// S10 (26.3–32.2s): logo reveal. Plaque "TESSERACT 3D" on the band, red-leaf emblem behind, sun blazing through.
import * as A from '../lib/act.mjs';
import * as G from '../lib/geo.mjs';
import { M, pbr } from '../lib/mat.mjs';
import { band, thinRing, sun, branches } from '../lib/armillary.mjs';

const leaf = (len, wid) => {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, y = -t * len; pts.push([wid * Math.sin(Math.PI * t) ** 0.8, y]); }
  for (let i = 23; i > 0; i--) { const t = i / 24; pts.push([-wid * Math.sin(Math.PI * t) ** 0.8, -t * len]); }
  return [pts];
};

export default {
  no: 10, key: 's10-logo', start: 26300, dur: 5900,
  build() {
    const ids = A.idSpace(10), L = ids.layerId, D = this.dur;
    const acts = A.sceneLayer({ layerId: L, name: 'S10 Logo', start: this.start, dur: D, ids, bg: [0.05, 0.03, 0.018], ambient: 0.05 });
    const viewId = acts[0].view.id;
    const P0 = [-760, 320, -1650], P1 = [0, 30, -2250], P2 = [0, 25, -2150];
    const cam = A.camera({ layerId: L, ids, pos: P0, target: [-180, 0, -920], focal: 40, fNumber: 3.2, roll: -18 });
    acts.push(...cam.actions);
    const data = [], items = [];
    band(ids, data, items, { R: 900, W: 150, T: 16, tex: 'band_gold', name: 'Main band', clasps: 10, reps: 6 });
    thinRing(ids, data, items, { R: 980, tube: 8, rot: [90, 0, 0], mat: M.bronze });
    thinRing(ids, data, items, { R: 940, tube: 6, rot: [70, 0, 40], mat: M.brassDark });
    branches(ids, data, items, { count: 8, seed: 31, R0: 350, R1: 600 });
    const s = sun(ids, data, items, L, { r: 120, power: 5000, coronaSize: 2300, coronaStrength: 9, coreStrength: 30, coronaZ: 120, at: [0, 60, -420] });
    // Emblem disc sits just inside the band front, between camera and sun.
    const em = A.group({ ids, name: 'Emblem', pos: [0, 10, -840] });
    items.push(em);
    const add = (geo, o) => { const m = A.mesh(ids, geo, { parent: em.id, ...o }); data.push(m.data); items.push(m.item); return m.item.id; };
    add(G.ring(300, 268, 30), { name: 'Emblem rim', mat: M.bronze });
    add(G.ring(262, 250, 20), { name: 'Emblem inner rim', mat: M.brass });
    add(G.extrude([G.circlePts(250, 96)], 8), { name: 'Emblem disc', mat: pbr({ color: '#120C08', rough: 0.85 }), pos: [0, 0, 12] });
    for (let i = 0; i < 4; i++) {
      const a = 45 + i * 90;
      add(G.extrude(leaf(230, 52), 16), { name: 'Red leaf', mat: M.redLeaf, rot: [0, 0, a], pos: [0, 0, -4] });
      add(G.box(14, 250, 10), { name: 'Cross bar', mat: M.iron, rot: [0, 0, a + 45], pos: [0, 0, -2], anchor: [0, 125, 0] });
    }
    add(G.sphere(26), { name: 'Hub', mat: M.brass, pos: [0, 0, -14] });
    // Plaque on the band front.
    const pl = A.group({ ids, name: 'Plaque', pos: [0, 0, -928] });
    items.push(pl);
    const addP = (geo, o) => { const m = A.mesh(ids, geo, { parent: pl.id, ...o }); data.push(m.data); items.push(m.item); return m.item.id; };
    addP(G.box(860, 150, 24), { name: 'Plate', mat: M.bronze });
    for (const y of [-68, 68]) addP(G.box(880, 12, 30), { name: 'Rail', mat: M.brass, pos: [0, y, -4] });
    for (const x of [-440, 440]) addP(G.box(30, 168, 40), { name: 'End clasp', mat: M.brass, pos: [x, 0, -4] });
    const tId = ids.next();
    data.push({ ...A.textData({ id: tId, text: 'TESSERACT 3D', font: 'Cinzel', style: 'Bold', size: 92, depth: 10, bevel: 1.5, tracking: 60 }), justification: 'center' });
    items.push(A.textItem({ ids, dataId: tId, name: 'Logo text', parent: pl.id, mat: pbr({ color: '#F6E2B4', metal: 1, rough: 0.18 }), sideMat: M.brass, pos: [0, 32, -16] }));
    acts.push(A.fragment(L, data, items), s.light.action);
    acts.push(A.light({ layerId: L, ids, kind: 'area', pos: [0, -200, -1700], target: [0, 0, -920], power: 700, areaSize: [900, 400], color: [1, 0.86, 0.68], name: 'Front fill' }).action);
    acts.push(A.light({ layerId: L, ids, kind: 'spot', pos: [-500, -600, -1750], target: [0, 0, -920], power: 1300, cone: 20, feather: 0.5, radius: 60, name: 'Key' }).action);
    for (const x of [-1100, 1100]) acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [x, -150, -1300], power: 700, radius: 80, color: [1, 0.8, 0.6], name: 'Side' }).action);
    acts.push(
      A.anim(L, cam.camId, 'position', [[0, P0], [1900, P1, 'soft'], [D, P2, 'linear']]),
      A.anim(L, cam.tgtId, 'offset', [[0, [-180, 0, -920]], [1900, [0, 5, -920], 'soft']]),
      A.anim(L, cam.aimId, 'up', [[0, [Math.sin(-0.314), Math.cos(-0.314), 0]], [1900, [0, 1, 0], 'soft']]),
      A.anim(L, viewId, 'exposure', [[0, 0], [5300, 0, 'hold'], [D, -9, 'in']]),
      A.glow(L, ids.next(), 70, 90, 1.0),
    );
    return acts;
  },
};
