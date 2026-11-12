// Calibration scene: realistic complexity sample of the "map" shots, used to measure path-tracer cost.
import { writeFileSync } from 'node:fs';
import * as A from './lib/act.mjs';
import * as G from './lib/geo.mjs';
import { M } from './lib/mat.mjs';

const ids = A.idSpace(99), L = ids.layerId;
const acts = [...A.sceneLayer({ layerId: L, name: 'Calib', start: 0, dur: 3000, ids, bg: [0.02, 0.015, 0.01], ambient: 0.05 })];
const cam = A.camera({ layerId: L, ids, pos: [0, -700, -900], target: [0, 0, 0], focal: 35, fNumber: 2.8 });
acts.push(...cam.actions);
acts.push(A.light({ layerId: L, ids, kind: 'spot', pos: [-500, -1200, -400], target: [0, 0, 0], power: 60000, cone: 50, feather: 0.6, radius: 60 }).action);
acts.push(A.light({ layerId: L, ids, kind: 'point', pos: [600, -500, 600], power: 6000, color: [0.6, 0.7, 1], radius: 80 }).action);

const data = [], items = [];
const add = (geo, o) => { const m = A.mesh(ids, geo, o); data.push(m.data); items.push(m.item); return m.item.id; };
add(G.box(2400, 20, 2400), { name: 'Water', mat: M.water, pos: [0, 10, 0] });
add(G.box(1200, 30, 900), { name: 'Land', mat: M.parchment, pos: [-500, -5, -300] });
const gid = add(G.gear({ teeth: 32, r: 160, tooth: 14, hole: 20, spokes: 6 }, 18), { name: 'Gear A', mat: M.brass, pos: [0, -30, 0], rot: [90, 0, 0] });
add(G.gear({ teeth: 20, r: 100, tooth: 12, hole: 14, spokes: 5 }, 14), { name: 'Gear B', mat: M.brassDark, pos: [250, -30, 60], rot: [90, 0, 0] });
add(G.star({ points: 8, rOut: 110, rIn: 80 }, 30), { name: 'Star', mat: M.brass, pos: [0, -60, 0], rot: [90, 0, 0] });
add(G.lathe([[0, -140], [40, -130], [70, -90], [80, -40], [80, 0], [0, 0]]), { name: 'Dome', mat: M.patina, pos: [-300, -15, 150] });
const mb = new G.MeshBuilder(); const r = G.rng(7);
for (let i = 0; i < 300; i++) { const w = 10 + r() * 20, h = 10 + r() * 60; mb.box(-1000 + r() * 1000, -15 - h, -700 + r() * 700, w, h, w); }
add(mb.geometry(), { name: 'City', mat: M.stone });
acts.push(A.fragment(L, data, items));
acts.push(A.anim(L, gid, 'rotationZ', [[0, 0], [3000, 90, 'linear']]));
acts.push(A.glow(L, ids.next(), 70, 30, 0.6));
writeFileSync(process.argv[2] || 'calib.json', JSON.stringify(acts));
console.log('actions', acts.length, 'items', items.length);
