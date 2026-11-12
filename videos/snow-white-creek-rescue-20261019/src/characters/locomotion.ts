// Locomotion: stride-based footstep planning so planted feet never slide, plus walk-cycle body motion.
import * as THREE from 'three';
import { clamp, lerp, smoother, wobble } from '../engine/math';
import { terrainHeight } from '../world/layout';
import { CharState } from './state';
import { Rig } from './build';

export type PathKey = { t: number; p: THREE.Vector3; face?: number; pause?: boolean };

/** A scripted ground path with position over time (x,z); y comes from terrain. */
export class GroundPath {
  keys: PathKey[];
  constructor(keys: PathKey[]) {
    this.keys = keys.slice().sort((a, b) => a.t - b.t);
  }
  posAt(t: number): THREE.Vector3 {
    const k = this.keys;
    if (t <= k[0].t) return k[0].p.clone();
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i];
        const u = smoother((t - a.t) / Math.max(1e-4, b.t - a.t));
        return a.p.clone().lerp(b.p, u);
      }
    }
    return k[k.length - 1].p.clone();
  }
  velAt(t: number): THREE.Vector3 {
    const dt = 1 / 60;
    return this.posAt(t + dt).sub(this.posAt(t - dt)).multiplyScalar(1 / (2 * dt));
  }
  facingAt(t: number): number {
    // explicit face keys interpolate; otherwise face velocity direction
    const k = this.keys;
    const explicit = k.some((x) => x.face !== undefined);
    if (explicit) {
      let prev = k[0], next = k[k.length - 1];
      for (let i = 0; i < k.length; i++) {
        if (k[i].face !== undefined && k[i].t <= t) prev = k[i];
      }
      for (let i = k.length - 1; i >= 0; i--) {
        if (k[i].face !== undefined && k[i].t >= t) next = k[i];
      }
      if (prev.face !== undefined && next.face !== undefined && next.t > prev.t) {
        const u = smoother((t - prev.t) / (next.t - prev.t));
        return lerpAngle(prev.face, next.face, u);
      }
      if (prev.face !== undefined) return prev.face;
    }
    const v = this.velAt(t);
    if (v.lengthSq() < 1e-4) return k[0].face ?? 0;
    return Math.atan2(v.x, v.z);
  }
}

export function lerpAngle(a: number, b: number, u: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * u;
}

type Footstep = { t: number; pos: THREE.Vector3; yaw: number; side: 1 | -1 };

/** Plan alternating footsteps along a path by sampling distance covered. */
export function planFootsteps(path: GroundPath, spec: Rig['spec'], t0: number, t1: number): Footstep[] {
  const stride = spec.gait.step;
  const steps: Footstep[] = [];
  const dt = 1 / 30;
  let dist = 0;
  let lastPlantDist = -stride * 0.5;
  let side: 1 | -1 = 1;
  let prev = path.posAt(t0);
  // first plants (both feet near start)
  const startYaw = path.facingAt(t0);
  const halfW = spec.body.hipW + 0.02;
  const place = (center: THREE.Vector3, yaw: number, s: 1 | -1, time: number) => {
    const side3 = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(s * halfW);
    const p = center.clone().add(side3);
    p.y = terrainHeight(p.x, p.z);
    return { t: time, pos: p, yaw, side: s } as Footstep;
  };
  steps.push(place(path.posAt(t0), startYaw, -1, t0 - 0.2));
  steps.push(place(path.posAt(t0), startYaw, 1, t0 - 0.1));
  for (let t = t0; t <= t1; t += dt) {
    const p = path.posAt(t);
    dist += p.distanceTo(prev);
    prev = p;
    if (dist - lastPlantDist >= stride) {
      lastPlantDist += stride;
      const yaw = path.facingAt(t);
      // plant slightly ahead
      const ahead = path.posAt(t + 0.12);
      steps.push(place(ahead, yaw, side, t));
      side = (side === 1 ? -1 : 1) as 1 | -1;
    }
  }
  // final plants
  const endYaw = path.facingAt(t1);
  steps.push(place(path.posAt(t1), endYaw, side, t1 + 0.3));
  steps.push(place(path.posAt(t1), endYaw, (side === 1 ? -1 : 1) as 1 | -1, t1 + 0.4));
  return steps;
}

export type Locomotor = {
  path: GroundPath;
  steps: Footstep[];
};

export function makeLocomotor(path: GroundPath, spec: Rig['spec'], t0: number, t1: number): Locomotor {
  return { path, steps: planFootsteps(path, spec, t0, t1) };
}

/** Write locomotion into a CharState for time t. Returns speed (m/s). */
export function driveLocomotion(loco: Locomotor, spec: Rig['spec'], st: CharState, t: number): number {
  const path = loco.path;
  const center = path.posAt(t);
  const vel = path.velAt(t);
  const speed = vel.length();
  const yaw = path.facingAt(t);
  st.pos.set(center.x, terrainHeight(center.x, center.z), center.z);
  st.yaw = yaw;

  // find current/next plant for each foot
  for (const side of [-1, 1] as const) {
    const sideSteps = loco.steps.filter((s) => s.side === side);
    let planted: Footstep | null = null;
    let next: Footstep | null = null;
    for (let i = 0; i < sideSteps.length; i++) {
      if (sideSteps[i].t <= t) planted = sideSteps[i];
      else {
        next = sideSteps[i];
        break;
      }
    }
    const footState = side === -1 ? st.footL : st.footR;
    if (!planted) planted = sideSteps[0];
    if (!next) {
      footState.pos.copy(planted!.pos);
      footState.yaw = planted!.yaw;
      footState.pitch = 0;
      footState.roll = 0;
      continue;
    }
    const gap = next.t - planted!.t;
    const swingStart = next.t - Math.min(gap * 0.52, 0.34); // foot is planted until swingStart
    if (t < swingStart) {
      footState.pos.copy(planted!.pos);
      footState.yaw = planted!.yaw;
      footState.pitch = 0;
      footState.roll = 0;
    } else {
      const u = clamp((t - swingStart) / (next.t - swingStart));
      const e = smoother(u);
      const p = planted!.pos.clone().lerp(next.pos, e);
      const lift = Math.sin(u * Math.PI) * (0.06 + speed * 0.03);
      p.y = lerp(planted!.pos.y, next.pos.y, e) + lift;
      footState.pos.copy(p);
      footState.yaw = lerpAngle(planted!.yaw, next.yaw, e);
      // toe-off then heel-strike
      footState.pitch = Math.sin(u * Math.PI) * 0.0 + (u < 0.5 ? -u * 0.5 : (u - 0.5) * 0.7);
      footState.roll = 0;
    }
  }

  // body: bob, sway, lean from speed, arm swing
  const g = spec.gait;
  // gait phase from average foot timing
  const phase = gaitPhase(loco, t);
  const bob = Math.abs(Math.sin(phase * Math.PI)) * g.bounce + speed * 0.01;
  st.hipsDrop = -bob - (speed > 0.1 ? 0.01 : 0);
  st.hipsShift.set(Math.sin(phase * Math.PI * 2) * g.sway, 0, 0);
  st.hipsRoll = -Math.sin(phase * Math.PI * 2) * g.sway * 1.5;
  st.hipsYaw = Math.sin(phase * Math.PI * 2) * 0.05;
  // lean into acceleration
  const acc = path.posAt(t + 0.1).add(path.posAt(t - 0.1)).addScaledVector(center, -2).multiplyScalar(100);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const lean = clamp(fwd.dot(acc) * 0.02 + speed * 0.04, -0.12, 0.18);
  st.spinePitch = lean + spec.posture.slouch * 0.5;
  st.hipsPitch = lean * 0.3;

  // arms counter-swing
  const swing = Math.sin(phase * Math.PI * 2) * g.armSwing * clamp(speed * 1.5 + 0.2);
  armSwing(st, spec, swing, yaw, speed);
  return speed;
}

function gaitPhase(loco: Locomotor, t: number): number {
  // phase in [0,1): 0 at a left plant
  const left = loco.steps.filter((s) => s.side === -1);
  let prev = left[0], next = left[left.length - 1];
  for (let i = 0; i < left.length; i++) {
    if (left[i].t <= t) prev = left[i];
    if (left[i].t > t) { next = left[i]; break; }
  }
  if (next.t <= prev.t) return 0;
  return clamp((t - prev.t) / (next.t - prev.t)) * 1;
}

function armSwing(st: CharState, spec: Rig['spec'], swing: number, yaw: number, speed: number) {
  // default relaxed arm targets hanging by the sides, swung fwd/back
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const b = spec.body;
  const armLen = (b.upperArm + b.foreArm) * 0.92;
  const shoulderH = b.legLen + b.footH + b.torso * 0.74;
  const place = (sx: number, sgn: number) => {
    const base = st.pos.clone();
    base.y = st.pos.y + shoulderH;
    base.addScaledVector(side, sx * (b.chestW * 0.56 + 0.02));
    base.addScaledVector(fwd, sgn * swing * 0.5);
    base.y -= armLen * (1 - Math.abs(swing) * 0.1);
    base.addScaledVector(fwd, sgn * swing * 0.12);
    return base;
  };
  st.handL.pos.copy(place(-1, 1));
  st.handR.pos.copy(place(1, -1));
  st.handL.grip = 0.15;
  st.handR.grip = 0.15;
  st.handL.pole = undefined;
  st.handR.pole = undefined;
}

/** idle breathing + micro sway for a standing character */
export function idlePose(st: CharState, spec: Rig['spec'], t: number, seed: number) {
  const br = Math.sin(t * 1.6 + seed) * 0.5 + 0.5;
  st.hipsDrop += Math.sin(t * 1.6 + seed) * 0.004;
  st.spinePitch += br * 0.01 + spec.posture.slouch;
  st.hipsShift.x += wobble(t, seed, 0.3) * 0.01;
  st.headYaw += wobble(t, seed + 3, 0.2) * 0.05;
  st.headPitch += wobble(t, seed + 7, 0.25) * 0.03;
}
