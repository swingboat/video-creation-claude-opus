// Apply a CharState to a Rig each frame: skeleton via FK/IK, face, secondary motion.
import * as THREE from 'three';
import { Rig } from './build';
import { CharState } from './state';
import { poseHand } from './parts';
import { solveTwoBone, aimBoneWorld } from './ik';
import { clamp, lerp } from '../engine/math';

const _t = new THREE.Vector3();
const _p = new THREE.Vector3();
const _m = new THREE.Vector3();

export function applyState(rig: Rig, st: CharState, t: number) {
  const r = rig;
  r.root.visible = st.visible;
  if (!st.visible) return;
  r.root.position.copy(st.pos);
  r.root.rotation.set(0, st.yaw, 0);

  // hips
  r.hips.position.set(st.hipsShift.x, r.lengths.hipY + st.hipsDrop + st.hipsShift.y, st.hipsShift.z);
  r.hips.rotation.set(st.hipsPitch, st.hipsYaw, st.hipsRoll, 'YXZ');
  r.spine.rotation.set(st.spinePitch, st.spineYaw, st.spineRoll, 'YXZ');
  r.chest.rotation.set(st.spinePitch * 0.6, st.spineYaw * 0.5, st.spineRoll * 0.6, 'YXZ');
  r.neck.rotation.set(st.headPitch * 0.4, st.headYaw * 0.4, st.headRoll * 0.3, 'YXZ');
  r.headTilt.rotation.set(st.headPitch * 0.6, st.headYaw * 0.6, st.headRoll * 0.7, 'YXZ');

  r.root.updateWorldMatrix(true, true);

  // feet via IK (knees point forward)
  const kneeFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), st.yaw);
  for (const side of ['L', 'R'] as const) {
    const foot = side === 'L' ? st.footL : st.footR;
    const thigh = side === 'L' ? r.thighL : r.thighR;
    const shin = side === 'L' ? r.shinL : r.shinR;
    const footGrp = side === 'L' ? r.footL : r.footR;
    thigh.updateWorldMatrix(true, false);
    const hipW = new THREE.Vector3().setFromMatrixPosition(thigh.matrixWorld);
    const ankleTarget = foot.pos.clone();
    const pole = hipW.clone().addScaledVector(kneeFwd, 1.2).setY(ankleTarget.y + 0.3);
    solveTwoBone(thigh, shin, footGrp, ankleTarget, pole, { upperLen: r.lengths.thigh, lowerLen: r.lengths.shin });
    footGrp.rotation.set(foot.pitch, foot.yaw - st.yaw, foot.roll ?? 0, 'YXZ');
  }

  // arms via IK
  r.chest.updateWorldMatrix(true, true);
  for (const side of ['L', 'R'] as const) {
    const hand = side === 'L' ? st.handL : st.handR;
    const upper = side === 'L' ? r.upperArmL : r.upperArmR;
    const fore = side === 'L' ? r.foreArmL : r.foreArmR;
    const wrist = side === 'L' ? r.wristL : r.wristR;
    const handParts = side === 'L' ? r.handL : r.handR;
    const shoulder = side === 'L' ? r.shoulderL : r.shoulderR;
    shoulder.updateWorldMatrix(true, false);
    const shoulderW = new THREE.Vector3().setFromMatrixPosition(shoulder.matrixWorld);
    const sx = side === 'L' ? -1 : 1;
    const defaultPole = shoulderW.clone().add(new THREE.Vector3(sx * 0.4, -0.5, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), st.yaw));
    const pole = hand.pole ?? defaultPole;
    solveTwoBone(upper, fore, wrist, hand.pos, pole, { upperLen: r.lengths.upperArm, lowerLen: r.lengths.foreArm });
    // wrist orientation
    wrist.updateWorldMatrix(true, false);
    if (hand.dir) {
      aimBoneWorld(wrist, wrist.getWorldPosition(_p).add(hand.dir), hand.palm);
    }
    poseHand(handParts, hand.grip, hand.spread ?? 0);
  }

  applyFace(rig, st, t);

  // secondary motion: hair / beard lag
  const sw = st.swing;
  r.hairSwing.value.copy(sw);
  r.beardSwing.value.copy(sw).multiplyScalar(0.6);

  // skirt
  if (r.skirt) {
    r.hips.updateWorldMatrix(true, false);
    r.skirt.update(r.hips.matrixWorld, sw, t, st.wetHem);
  }

  // eye look
  if (st.eyeLook) {
    for (const [eye] of [[r.eyes.l], [r.eyes.r]] as const) {
      eye.updateWorldMatrix(true, false);
      const ep = new THREE.Vector3().setFromMatrixPosition(eye.matrixWorld);
      const dir = _t.copy(st.eyeLook).sub(ep).normalize();
      const localDir = dir.clone().applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(eye.parent!.matrixWorld).invert());
      const yaw = Math.atan2(localDir.x, localDir.z);
      const pitch = Math.asin(clamp(localDir.y, -1, 1));
      eye.rotation.set(clamp(pitch, -0.4, 0.4), clamp(yaw, -0.5, 0.5), 0, 'YXZ');
    }
  }
}

function applyFace(rig: Rig, st: CharState, t: number) {
  const f = rig.face;
  const fa = st.face;
  const spec = rig.spec;
  // blink: rotate lids closed
  const topOpen = f.restLidTop;
  const topClosed = 0;
  const open = clamp(fa.lid * (1 - fa.blink) - fa.squint * 0.3, 0, 1);
  f.lidTopL.rotation.x = lerp(topClosed, topOpen, open);
  f.lidTopR.rotation.x = lerp(topClosed, topOpen, open);
  const botClosed = Math.PI + 0.02;
  f.lidBotL.rotation.x = lerp(botClosed, f.restLidBot, clamp(1 - fa.blink * 0.7, 0, 1));
  f.lidBotR.rotation.x = f.lidBotL.rotation.x;

  // brows: vertical + inner angle
  const browBase = spec.eye.y + spec.brow.y;
  const applyBrow = (g: THREE.Group, inner: number) => {
    g.position.y = browBase + fa.browUp * 0.014 - fa.browIn * 0.004;
    // inner-down for anger, inner-up for sadness
    g.rotation.z = inner * (fa.browAngry * 0.5 - fa.browSad * 0.5 + spec.brow.angle);
    g.position.x = Math.sign(g.position.x || inner) * (Math.abs(g.position.x) - fa.browIn * 0.004);
  };
  applyBrow(f.browL, 1);
  applyBrow(f.browR, -1);

  // mouth morphs: [smile, open, frown, pucker]
  const infU = f.mouthUpper.morphTargetInfluences!;
  const infL = f.mouthLower.morphTargetInfluences!;
  infU[0] = infL[0] = fa.smile;
  infU[1] = infL[1] = fa.open;
  infU[2] = infL[2] = fa.frown;
  infU[3] = infL[3] = fa.pucker;
  f.jaw.rotation.x = fa.open * 0.25;

  // blush
  const bl = clamp(fa.blush);
  (f.blushL.material as THREE.MeshBasicMaterial).opacity = bl * 0.8;
  (f.blushR.material as THREE.MeshBasicMaterial).opacity = bl * 0.8;

  // nose wrinkle (lift nose, squish)
  f.noseGroup.position.y = spec.nose.y + fa.noseWrinkle * 0.006;
  f.noseGroup.scale.y = 1 - fa.noseWrinkle * 0.15;
  f.noseGroup.scale.x = 1 + fa.noseWrinkle * 0.1;
}
