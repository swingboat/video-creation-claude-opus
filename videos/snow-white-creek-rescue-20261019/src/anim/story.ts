// Shared story-driven physical state (log, water events). Pure functions of time.
import * as THREE from 'three';
import cues from '../timeline/cues.json';
import { LAYOUT, creekD, waterLevel } from '../world/layout';
import { clamp, mulberry32, ring, smoothstep, track } from '../engine/math';

export const B = cues.beats;
export const LOG_Y = -0.04;
const FAR = LAYOUT.logFar;
const NEAR = LAYOUT.logNear;
export const LOG_LEN = FAR.distanceTo(NEAR);
const BASE_YAW = Math.atan2(NEAR.x - FAR.x, NEAR.z - FAR.z);

/** yaw offset of the log around its far-bank pivot (positive = near end pushed downstream +x) */
export function logYaw(t: number) {
  let y = track(
    [
      [B.logShift - 0.01, 0],
      [B.logShift + 0.22, 0.034],
      [B.pull1 - 0.2, 0.034],
      [B.pull3 + 0.8, 0.012],
      [B.surge, 0.012],
      [B.surge + 0.35, 0.026],
      [B.slip, 0.026],
      [B.grab, 0.052],
      [B.grab + 0.4, 0.05],
      [B.repull + 2.2, 0.01],
      [90, 0.008],
    ],
    t,
  );
  y += ring(t, B.logShift, 3.2, 3.5) * 0.006 + ring(t, B.surge, 2.6, 3) * 0.005 + ring(t, B.grab, 3, 4) * 0.004;
  return y;
}
/** roll of the log around its own axis (rad) */
export function logRoll(t: number) {
  return ring(t, B.logShift, 1.6, 1.4) * 0.06 + ring(t, B.surge, 1.4, 1.2) * 0.05 + ring(t, B.slip + 0.3, 1.8, 1.6) * 0.04;
}
/** small vertical bob from water pressure */
export function logBob(t: number) {
  return ring(t, B.logShift, 2.4, 2.5) * 0.025 + ring(t, B.surge, 2, 2) * 0.03;
}

/** point on the log axis; s=0 far end, s=1 near end; `up` offsets to the top surface */
export function logPoint(t: number, s: number, up = 0, side = 0) {
  const yaw = BASE_YAW + logYaw(t);
  const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const sideV = new THREE.Vector3(dir.z, 0, -dir.x); // +x-ish side (downstream)
  const roll = logRoll(t);
  const p = new THREE.Vector3(FAR.x, LOG_Y + logBob(t) * Math.sin(Math.PI * s), FAR.z).addScaledVector(dir, s * LOG_LEN);
  // a point on the top surface rotates with roll
  const r = LAYOUT.logRadius;
  p.y += up * Math.cos(roll) * (r) + 0 * r;
  p.addScaledVector(sideV, side - up * Math.sin(roll) * r);
  return p;
}
export function logDir(t: number) {
  const yaw = BASE_YAW + logYaw(t);
  return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
}
/** parameter s on the log for a given world z (approx, log is nearly along z) */
export function logSAtZ(t: number, z: number) {
  const d = logDir(t);
  return clamp((z - FAR.z) / (d.z * LOG_LEN), 0, 1);
}

/** where the rope is tied on the log (s param) */
export const KNOT_S = 0.86;

/** splash event: time, position, scale, direction bias */
export type SplashEvent = { t: number; p: THREE.Vector3; n: number; speed: number; up: number; dir: THREE.Vector2; size: number; life: number };

export function buildSplashEvents(): SplashEvent[] {
  const ev: SplashEvent[] = [];
  const rnd = mulberry32(cues.seed + 3);
  // constant churn upstream of the rock and against the log
  for (let t = 0; t < 90; t += 0.11) {
    const lvl = waterLevel(t);
    const a = rnd() * Math.PI - Math.PI / 2;
    const r = LAYOUT.rock;
    ev.push({
      t: t + rnd() * 0.1,
      p: new THREE.Vector3(r.x - Math.cos(a) * LAYOUT.rockRadius * 0.95, lvl, r.z + Math.sin(a) * LAYOUT.rockRadius * 0.95),
      n: 6, speed: 0.6, up: 0.9, dir: new THREE.Vector2(0.3, 0), size: 0.025, life: 0.6,
    });
    if (t > 12) {
      const s = 0.3 + rnd() * 0.42;
      const lp = logPoint(t, s, 0, -LAYOUT.logRadius * 0.9);
      if (Math.abs(creekD(lp.x, lp.z)) < 2.9) {
        ev.push({ t: t + rnd() * 0.1, p: new THREE.Vector3(lp.x, lvl, lp.z), n: 5, speed: 0.5, up: 0.7, dir: new THREE.Vector2(0.4, 0), size: 0.022, life: 0.55 });
      }
    }
  }
  const lvl = (t: number) => waterLevel(t);
  // log jolt: near end grinds into the bank water edge
  for (const s of [0.66, 0.72, 0.6]) {
    const p = logPoint(B.logShift, s);
    ev.push({ t: B.logShift + 0.05, p: new THREE.Vector3(p.x, lvl(B.logShift), p.z), n: 140, speed: 1.6, up: 2.2, dir: new THREE.Vector2(0.6, 0.2), size: 0.035, life: 1.2 });
  }
  // branch hits the rock
  ev.push({ t: B.branchHit, p: new THREE.Vector3(LAYOUT.rock.x - 0.5, lvl(B.branchHit), LAYOUT.rock.z - 0.15), n: 110, speed: 1.4, up: 2.0, dir: new THREE.Vector2(0.2, 0), size: 0.032, life: 1.1 });
  // fawn hooves stamping (small)
  for (const tt of [19.6, 20.5, 21.3, B.fawnBack, B.fawnBack + 0.5]) {
    ev.push({ t: tt, p: new THREE.Vector3(LAYOUT.rock.x + 0.35, lvl(tt), LAYOUT.rock.z + 0.3), n: 18, speed: 0.6, up: 1.0, dir: new THREE.Vector2(0, 0), size: 0.02, life: 0.6 });
  }
  // the surge slams the log along its upstream face
  for (let k = 0; k < 9; k++) {
    const s = 0.22 + k * 0.07;
    const p = logPoint(B.surge, s, 0, -0.25);
    ev.push({ t: B.surge + k * 0.025, p: new THREE.Vector3(p.x, lvl(B.surge) + 0.05, p.z), n: 120, speed: 2.4, up: 3.2, dir: new THREE.Vector2(0.9, 0.35), size: 0.04, life: 1.6 });
  }
  // slip jolt
  for (const s of [0.5, 0.62]) {
    const p = logPoint(B.slip + 0.6, s, 0, -0.2);
    ev.push({ t: B.slip + 0.6, p: new THREE.Vector3(p.x, lvl(B.slip), p.z), n: 90, speed: 1.5, up: 2.0, dir: new THREE.Vector2(0.6, 0.1), size: 0.035, life: 1.1 });
  }
  return ev.sort((a, b) => a.t - b.t);
}

/** how high the wet band on Snow White's hem has climbed (m above hem) */
export function hemWetness(t: number) {
  return track(
    [
      [25.5, 0],
      [27.5, 0.02],
      [B.logShift, 0.03],
      [B.logShift + 0.6, 0.11],
      [B.surge, 0.12],
      [B.surge + 0.5, 0.22],
      [90, 0.24],
    ],
    t,
  );
}

/** mist density in the air (surge spray drifting to the bank) */
export const sprayMist = (t: number) => smoothstep(B.surge, B.surge + 0.4, t) * (1 - smoothstep(B.surge + 1.5, B.sneeze + 1.5, t));
