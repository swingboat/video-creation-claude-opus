// Scatter Poly Haven CC0 vegetation / rocks / roots / trees across the valley (deterministic placement).
import * as THREE from 'three';
import { AssetLib } from './assets';
import { LAYOUT, creekD, pathZ, terrainHeight } from './layout';
import { mulberry32 } from '../engine/math';

const M = (x: number, z: number, s: number, yaw: number, tilt = 0, sink = 0) => {
  const y = terrainHeight(x, z) - sink;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt * 0.6, yaw, tilt * 0.4, 'YXZ')),
    new THREE.Vector3(s, s, s),
  );
};

/** areas that must stay clear (action space, path, log, cabin) */
function blocked(x: number, z: number, r: number) {
  const a = Math.abs(creekD(x, z));
  if (Math.abs(z - pathZ(x)) < 1.0 + r && x > -21) return true;
  if (Math.hypot(x - LAYOUT.cabin.x, z - LAYOUT.cabin.z) < 5.5 + r) return true;
  // pulling line and action zone on the near bank
  if (x > -5.2 && x < 5.4 && z > 3.3 && z < 7.6) return true;
  if (x > 1.5 && x < 11 && z > 4.5 && z < 9.5) return true; // cart & path apron
  // the log corridor
  if (Math.abs(x - 0.1) < 1.0 + r && Math.abs(z) < 5.2) return true;
  void a;
  return false;
}

export function buildScatter(lib: AssetLib) {
  const g = new THREE.Group();
  g.name = 'scatter';
  const rnd = mulberry32(4711);
  const put: Record<string, THREE.Matrix4[]> = {};
  const add = (id: string, m: THREE.Matrix4) => (put[id] ??= []).push(m);

  // ---- understory: ferns, nettles, shrubs, grass, flowers (dense near the camera areas, sparser far)
  const plants: [string, number, number, number][] = [
    // id, count, scale min, scale max
    ['fern_02', 520, 0.7, 1.25],
    ['nettle_plant', 260, 1.4, 2.4],
    ['grass_medium_01', 420, 1.0, 1.8],
    ['celandine_01', 220, 0.9, 1.4],
    ['periwinkle_plant', 160, 0.8, 1.3],
    ['dandelion_01', 80, 0.8, 1.2],
    ['shrub_04', 90, 1.4, 2.2],
    ['shrub_02', 45, 0.55, 0.9],
  ];
  for (const [id, n, s0, s1] of plants) {
    let placed = 0;
    for (let k = 0; k < n * 8 && placed < n; k++) {
      // bias toward the visible near-bank band and the far bank face
      const near = rnd() < 0.65;
      const x = near ? -14 + rnd() * 30 : -40 + rnd() * 80;
      const z = near ? (rnd() < 0.55 ? 3.6 + rnd() * 9 : -3.8 - rnd() * 8) : -30 + rnd() * 55;
      const a = Math.abs(creekD(x, z));
      if (a < (id === 'grass_medium_01' || id === 'fern_02' ? 3.15 : 3.6)) continue; // stay out of the water
      if (blocked(x, z, id.startsWith('shrub') ? 0.8 : 0.15)) continue;
      const s = s0 + rnd() * (s1 - s0);
      add(id, M(x, z, s, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.25, 0.02));
      placed++;
    }
  }
  // ferns & grass flanking the action zone edges (framing foreground for the bank shots)
  for (let k = 0; k < 140; k++) {
    const x = -7 + rnd() * 15;
    const z = 7.6 + rnd() * 3.5;
    if (blocked(x, z, 0.2)) continue;
    add(rnd() < 0.6 ? 'fern_02' : 'grass_medium_01', M(x, z, 0.8 + rnd() * 0.5, rnd() * 6.28, 0, 0.02));
  }
  for (let k = 0; k < 40; k++) {
    const x = 11.2 + rnd() * 4;
    const z = 3.6 + rnd() * 4;
    if (Math.abs(creekD(x, z)) < 3.4) continue;
    add('fern_02', M(x, z, 0.8 + rnd() * 0.5, rnd() * 6.28, 0, 0.02));
  }

  // ---- mossy rocks along both banks and boulders in the stream
  for (let k = 0; k < 70; k++) {
    const x = -30 + rnd() * 60;
    const side = rnd() < 0.5 ? 1 : -1;
    const d = 2.9 + rnd() * 1.4;
    const z = 0.28 * Math.sin(x * 0.09 + 0.4) - 0.1 + side * d;
    if (blocked(x, z, 0.6)) continue;
    add(rnd() < 0.5 ? 'rock_moss_set_01' : 'rock_moss_set_02', M(x, z, 0.35 + rnd() * 0.4, rnd() * 6.28, 0, 0.12));
  }
  for (const [x, z, s] of [[-6.5, 1.0, 0.45], [5.2, -1.3, 0.5], [8.4, 1.4, 0.4], [-10, -0.8, 0.55], [12.5, 0.6, 0.6], [-3.4, -1.9, 0.32]] as const) {
    add('boulder_01', M(x, z, s, rnd() * 6.28, 0, 0.25));
  }

  // ---- roots, stumps, dead wood, debris on the forest floor
  add('root_cluster_01', M(LAYOUT.anchorTree.x + 0.3, LAYOUT.anchorTree.z + 0.25, 0.55, 0.6, 0, 0.18));
  add('root_cluster_02', M(-9.2, 9.0, 0.9, 2.1, 0, 0.05));
  add('pine_roots', M(8.3, 4.6, 0.9, -0.8, 0, 0.06));
  add('tree_stump_01', M(7.2, 8.6, 0.7, 1.2, 0, 0.05));
  add('tree_stump_01', M(-11.5, 5.2, 0.8, 0.3, 0, 0.05));
  add('dead_tree_trunk', M(-8.6, 11.2, 1.4, 0.4, 0, 0.05));
  add('dead_tree_trunk_02', M(10.5, -7.5, 0.9, 2.4, 0, 0.25));
  add('dead_tree_trunk', M(4.0, -6.8, 1.6, -0.5, 0, 0.05));
  for (let k = 0; k < 60; k++) {
    const x = -15 + rnd() * 30;
    const z = -9 + rnd() * 22;
    if (Math.abs(creekD(x, z)) < 3.5 || blocked(x, z, 0.3)) continue;
    add(rnd() < 0.5 ? 'bark_debris_01' : 'dry_branches_medium_01', M(x, z, 0.8 + rnd() * 0.6, rnd() * 6.28, 0, 0.0));
  }

  // ---- background conifers (decimated Poly Haven fir) forming the far forest walls
  for (let k = 0; k < 0; k++) {
    const x = -70 + rnd() * 140;
    const z = -55 + rnd() * 100;
    const a = Math.abs(creekD(x, z));
    if (a < 9 || Math.hypot(x, z - 4) < 16) continue;
    if (blocked(x, z, 3)) continue;
    add('fir', M(x, z, 0.75 + rnd() * 0.5, rnd() * 6.28, 0, 0.1));
  }

  for (const [id, mats] of Object.entries(put)) {
    const shadow = !['grass_medium_01', 'celandine_01', 'periwinkle_plant', 'dandelion_01', 'bark_debris_01'].includes(id);
    g.add(lib.instanced(id, mats, { shadow }));
  }
  return g;
}
