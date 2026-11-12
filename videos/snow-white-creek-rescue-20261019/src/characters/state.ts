// Per-frame character pose description produced by performances.
import * as THREE from 'three';

export type HandState = {
  /** wrist target, world */
  pos: THREE.Vector3;
  /** elbow pole direction, world */
  pole?: THREE.Vector3;
  /** direction fingers point, world */
  dir?: THREE.Vector3;
  /** palm normal, world */
  palm?: THREE.Vector3;
  grip: number;
  spread?: number;
};
export type FootState = { pos: THREE.Vector3; yaw: number; pitch: number; roll?: number };
export type FaceState = {
  blink: number; // 1 = closed
  lid: number; // upper lid openness multiplier (1 = rest)
  browUp: number; // -1..1
  browIn: number; // furrow 0..1
  browAngry: number; // 0..1 inner down
  browSad: number; // 0..1 inner up
  smile: number;
  open: number;
  frown: number;
  pucker: number;
  blush: number;
  noseWrinkle: number;
  squint: number;
};
export type CharState = {
  visible: boolean;
  pos: THREE.Vector3; // root (ground under pelvis)
  yaw: number;
  hipsDrop: number;
  hipsPitch: number;
  hipsRoll: number;
  hipsYaw: number;
  hipsShift: THREE.Vector3; // local offset
  spinePitch: number;
  spineYaw: number;
  spineRoll: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  look?: THREE.Vector3;
  lookW: number;
  eyeLook?: THREE.Vector3;
  handL: HandState;
  handR: HandState;
  footL: FootState;
  footR: FootState;
  face: FaceState;
  shake: number; // laugh shake amplitude
  swing: THREE.Vector3; // secondary motion lag (world, m)
  wetHem: number;
};

export const neutralFace = (): FaceState => ({
  blink: 0,
  lid: 1,
  browUp: 0,
  browIn: 0,
  browAngry: 0,
  browSad: 0,
  smile: 0,
  open: 0,
  frown: 0,
  pucker: 0,
  blush: 0,
  noseWrinkle: 0,
  squint: 0,
});
