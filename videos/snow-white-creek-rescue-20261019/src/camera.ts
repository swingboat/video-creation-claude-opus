// Camera choreography: one virtual camera driven per shot, with DOF focus distance.
import * as THREE from 'three';
import cues from './timeline/cues.json';
import { clamp, easeInOut, lerp, smoother, track, vtrack, wobble } from './engine/math';
import { LAYOUT, terrainHeight } from './world/layout';
import { B, logPoint } from './anim/story';

export type CamFrame = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; focus: number; aperture: number };

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

type ShotFn = (t: number, local: number, ctx: CamCtx) => CamFrame;
export type CamCtx = {
  snow: THREE.Vector3;
  fawn: THREE.Vector3;
  dwarfCentroid: THREE.Vector3;
  heads: Record<string, THREE.Vector3>;
};

// helper: hand-held micro shake
function handheld(t: number, amp: number) {
  return V(wobble(t, 11, 0.8) * amp, wobble(t, 22, 0.9) * amp * 0.7, wobble(t, 33, 0.7) * amp);
}
function frame(pos: THREE.Vector3, target: THREE.Vector3, fov: number, aperture = 0.08): CamFrame {
  return { pos, target, fov, focus: pos.distanceTo(target), aperture };
}

const shots: Record<number, ShotFn> = {
  // 1 push through leaves toward valley; dolly in
  1: (t, u) => {
    const e = smoother(u);
    const pos = V(lerp(10.5, 7.2, e), lerp(3.4, 2.3, e), lerp(12.5, 10.2, e)).add(handheld(t, 0.04));
    const target = V(2.5, 1.1, 2.0);
    return frame(pos, target, lerp(42, 38, e), 0.14);
  },
  // 2 tracking side view of the group on the path
  2: (t, u, c) => {
    const e = smoother(u);
    const cx = lerp(9.5, 6.0, e);
    const pos = V(cx + 3.2, 1.75, 9.4).add(handheld(t, 0.05));
    const target = V(cx, 1.3, 6.3);
    return frame(pos, target, 40, 0.1);
  },
  // 3 Snow close-up, she turns to the cry (camera in front of her face)
  3: (t, u, c) => {
    const head = c.heads.snow;
    const pos = head.clone().add(V(0.42, 0.02, -1.05)).add(handheld(t, 0.03));
    return frame(pos, head.clone().add(V(0, -0.03, 0)), 36, 0.05);
  },
  // 4 over-the-shoulder reveal of the fawn, slow push
  4: (t, u, c) => {
    const e = smoother(u);
    const sh = c.heads.snow.clone();
    const pos = sh.clone().add(V(-0.35, 0.25, 0.9)).addScaledVector(V(0, 0, 0), 0).add(handheld(t, 0.03));
    pos.lerp(c.fawn.clone().add(V(1.6, 1.0, 3.0)), e * 0.5);
    return frame(pos, c.fawn.clone().add(V(0, 0.3, 0)), lerp(40, 34, e), 0.12);
  },
  // 5 fawn close-up on the rock
  5: (t, u, c) => {
    const f = c.fawn.clone();
    const pos = f.clone().add(V(-0.7, 0.55, 1.5)).add(handheld(t, 0.04));
    return frame(pos, f.clone().add(V(0, 0.35, 0)), 40, 0.07);
  },
  // 6 medium of Snow setting down basket, stepping onto the log (downstream side)
  6: (t, u, c) => {
    const e = smoother(u);
    const s = c.snow.clone();
    const pos = s.clone().add(V(2.4, 1.3, 2.0)).add(handheld(t, 0.04));
    return frame(pos, s.clone().add(V(-0.3, 0.6, -0.6)), lerp(40, 44, e), 0.1);
  },
  // 7 low angle at the log, tilt up as it shifts
  7: (t, u, c) => {
    const e = smoother(u);
    const s = c.snow.clone();
    const pos = V(1.9, lerp(0.35, 0.9, e), 3.2).add(handheld(t, 0.05 + e * 0.04));
    return frame(pos, s.clone().add(V(0, lerp(0.2, 0.9, e), 0)), 40, 0.11);
  },
  // 8 Doc (facing downstream) judges the log & tree, then a quick pan to Dopey finding the rope at the cart
  8: (t, u, c) => {
    const doc = c.heads.doc.clone();
    const dopey = c.heads.dopey.clone();
    const k = t >= 37.0 ? 1 : 0; // hard cut inside the shot: Doc -> Dopey at the cart
    const pDoc = doc.clone().add(V(1.35, 0.08, -0.55));
    const pDop = V(LAYOUT.cart.x - 1.1, 0.85, LAYOUT.cart.z - 2.0);
    const pos = pDoc.lerp(pDop, k).add(handheld(t, 0.03));
    const look = doc.add(V(0, -0.12, 0)).lerp(dopey.add(V(0.45, -0.3, -0.1)), k);
    return frame(pos, look, 40, 0.08);
  },
  // 9 foreground knot, background brace
  9: (t, u, c) => {
    const knot = logPoint(t, 0.86, 1);
    const pos = knot.clone().add(V(1.1, 0.7, 1.9)).add(handheld(t, 0.04));
    return frame(pos, knot.clone().add(V(-0.6, 0.0, 0.3)), 44, 0.14);
  },
  // 10 wide side of the whole pulling line + log
  10: (t, u, c) => {
    const pos = V(4.6, 2.2, 5.0).add(handheld(t, 0.05));
    const target = V(-1.5, 0.9, 2.2);
    return frame(pos, target, 40, 0.08);
  },
  // 11 low shot from downstream on the near bank: Bashful crouching left, the fawn on its rock beyond
  11: (t, u, c) => {
    const b = c.heads.bashful.clone();
    const f = c.fawn.clone().add(V(0, 0.35, 0));
    const pos = V(1.75, 0.75, 4.2).lerp(V(1.55, 0.7, 3.9), smoother(u)).add(handheld(t, 0.03));
    return frame(pos, b.clone().lerp(f, 0.45).add(V(0, -0.1, 0)), 42, 0.1);
  },
  // 12 quick medium: surge + Sneezy builds to sneeze
  12: (t, u, c) => {
    const sn = c.heads.sneezy.clone();
    const pos = sn.clone().add(V(0.8, 0.3, 1.7)).add(handheld(t, 0.06));
    return frame(pos, sn.clone().add(V(-0.2, -0.05, -0.2)), 42, 0.09);
  },
  // 13 rope slips through hands, Grumpy lunges and grabs it (from downstream on the bank)
  13: (t, u, c) => {
    const g = c.heads.grumpy.clone();
    const pos = V(1.25, 0.85, 5.15).add(handheld(t, 0.06));
    return frame(pos, g.add(V(0.25, -0.25, -0.35)), 42, 0.1);
  },
  // 14 wide: re-pull and Snow lifts the fawn
  14: (t, u, c) => {
    const pos = V(3.4, 1.9, 4.6).add(handheld(t, 0.05));
    const target = c.fawn.clone().add(V(-0.5, 0.4, 0.5));
    return frame(pos, target, 42, 0.09);
  },
  // 15 tracking Snow carrying the fawn back along the log
  15: (t, u, c) => {
    const s = c.snow.clone();
    const pos = s.clone().add(V(2.1, 1.0, 1.9)).add(handheld(t, 0.05));
    return frame(pos, s.clone().add(V(0, 0.7, 0)), 40, 0.08);
  },
  // 16 group relief, seen from the creek side looking back at the bank (faces, not backs)
  16: (t, u, c) => {
    const e = smoother(u);
    const mid = c.heads.bashful.clone().lerp(c.fawn, 0.45).lerp(c.heads.snow.clone(), 0.3);
    const pos = V(2.2, 1.35, 1.6).lerp(V(1.3, 1.2, 2.6), e).add(handheld(t, 0.04));
    const target = mid.clone().add(V(0, -0.1, 0));
    return frame(pos, target, lerp(44, 40, e), 0.1);
  },
  // 17 close: apple handed to Dopey, he offers it
  17: (t, u, c) => {
    const d = c.heads.dopey.clone();
    const pos = d.clone().add(V(0.9, 0.2, 1.6)).add(handheld(t, 0.04));
    return frame(pos, d.clone().add(V(-0.1, -0.2, 0)), 44, 0.06);
  },
  // 18 slow crane-out, group walking to the cabin
  18: (t, u, c) => {
    const e = smoother(u);
    const pos = V(lerp(2.0, 9.0, e), lerp(2.0, 4.6, e), lerp(7.0, 13.5, e)).add(handheld(t, 0.03));
    const target = c.dwarfCentroid.clone().lerp(LAYOUT.cabin.clone().setY(1.6), 0.4).add(V(-2, 0.6, 1));
    return frame(pos, target, lerp(40, 46, e), 0.06);
  },
};

export function cameraAt(t: number, ctx: CamCtx): CamFrame {
  const shot = cues.shots.find((s: {id:number;start:number;end:number}) => t >= s.start && t < s.end) ?? cues.shots[cues.shots.length - 1];
  const local = (t - shot.start) / (shot.end - shot.start);
  const fn = shots[shot.id] ?? shots[1];
  const f = fn(t, clamp(local), ctx);
  // brief cross-shot settle to avoid hard identical cuts feeling static (no blend across cuts to keep continuity crisp)
  return f;
}

/** apply a CamFrame to a THREE camera */
export function applyCamera(cam: THREE.PerspectiveCamera, f: CamFrame) {
  cam.position.copy(f.pos);
  cam.lookAt(f.target);
  cam.fov = f.fov;
  cam.updateProjectionMatrix();
}
