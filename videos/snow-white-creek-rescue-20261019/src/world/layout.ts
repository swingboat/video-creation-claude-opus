// World layout: single source of truth for every location (meters, y up). Creek flows toward +x.
import * as THREE from 'three';
import { clamp, fbm2, lerp, smoothstep, track } from '../engine/math';

export const FLOW_DIR = new THREE.Vector2(1, 0);

export const LAYOUT = {
  logNear: new THREE.Vector3(0.72, 0, 4.7),
  logFar: new THREE.Vector3(-0.52, 0, -4.7),
  logRadius: 0.23,
  rock: new THREE.Vector3(-1.08, 0, -0.38),
  rockRadius: 0.58,
  anchorTree: new THREE.Vector3(-4.75, 0, 4.85),
  anchorTreeRadius: 0.42,
  cart: new THREE.Vector3(9.4, 0, 6.6),
  basketSpot: new THREE.Vector3(1.32, 0, 5.15),
  toolBagSpot: new THREE.Vector3(-4.35, 0, 5.45),
  cabin: new THREE.Vector3(-19.5, 0, 16.5),
  cabinDoor: new THREE.Vector3(-18.6, 0, 13.6),
};

/** creek centre line z(x) */
export const creekCenter = (x: number) => 0.28 * Math.sin(x * 0.09 + 0.4) - 0.1;

/** signed distance from creek centre */
export const creekD = (x: number, z: number) => z - creekCenter(x);

function bankProfile(a: number) {
  if (a < 1.1) return -0.82;
  if (a < 3.0) return lerp(-0.82, -0.38, smoothstep(1.1, 3.0, a));
  if (a < 3.95) return lerp(-0.38, 0.04, smoothstep(3.0, 3.95, a));
  return 0.04;
}

/** terrain height at (x,z) */
export function terrainHeight(x: number, z: number) {
  const d = creekD(x, z);
  const a = Math.abs(d);
  let h = bankProfile(a);
  // river bed undulation
  h += (1 - smoothstep(2.6, 3.6, a)) * fbm2(x * 0.7, z * 0.7, 3) * 0.08;
  // gentle ground undulation away from the banks (keep the path flat)
  const away = smoothstep(4.2, 9, a);
  const pathFlat = 1 - Math.exp(-Math.pow((z - pathZ(x)) / 1.6, 2)) * 0.85;
  h += away * fbm2(x * 0.11 + 3, z * 0.11, 4) * 0.45 * pathFlat;
  // valley rises on both sides far away
  h += smoothstep(9, 40, a) * 4.2 * (d < 0 ? 1.25 : 0.8);
  // slight terrace for the cabin
  const cd = Math.hypot(x - LAYOUT.cabin.x, z - LAYOUT.cabin.z);
  h = lerp(h, 0.28, (1 - smoothstep(4, 9, cd)) * clamp(1));
  return h;
}

/** forest path centre-line z for a given x (near bank) */
export function pathZ(x: number) {
  if (x > -8) return 6.35 + 0.15 * Math.sin(x * 0.3);
  // curve up toward the cabin door
  const k = smoothstep(-8, -18.6, x);
  return lerp(6.35 + 0.15 * Math.sin(x * 0.3), LAYOUT.cabinDoor.z, k);
}

/** water surface height over time (rises after the rain) */
export function waterLevel(t: number) {
  return track(
    [
      [0, -0.3],
      [14, -0.27],
      [22, -0.22],
      [57, -0.19],
      [74, -0.18],
      [90, -0.19],
    ],
    t,
  );
}

/** flow speed multiplier over time (m/s) */
export function flowSpeed(t: number) {
  return track(
    [
      [0, 0.9],
      [14, 1.2],
      [22, 1.5],
      [57, 1.6],
      [58.3, 2.4],
      [61, 1.9],
      [74, 1.5],
      [90, 1.3],
    ],
    t,
  );
}
