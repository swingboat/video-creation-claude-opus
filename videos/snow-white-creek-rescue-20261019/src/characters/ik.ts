// IK solvers and skeletal helpers.
import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

/** Two-bone IK. upper/lower are bones; upper's parent provides the shoulder.
 * target & pole are world positions. The chain's root is the upper bone's world position. */
export function solveTwoBone(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  end: THREE.Object3D,
  targetW: THREE.Vector3,
  poleW: THREE.Vector3,
  opts: { upperLen: number; lowerLen: number; softness?: number },
) {
  upper.updateWorldMatrix(true, false);
  const rootW = new THREE.Vector3().setFromMatrixPosition(upper.matrixWorld);
  const l1 = opts.upperLen;
  const l2 = opts.lowerLen;
  const toTarget = _a.copy(targetW).sub(rootW);
  let dist = toTarget.length();
  const maxReach = (l1 + l2) * 0.999;
  dist = Math.min(dist, maxReach);
  dist = Math.max(dist, Math.abs(l1 - l2) + 1e-3);
  const dirToTarget = _b.copy(toTarget).normalize();

  // bend plane from pole
  const toPole = _c.copy(poleW).sub(rootW);
  // project pole off the target axis
  const proj = dirToTarget.clone().multiplyScalar(toPole.dot(dirToTarget));
  const bendAxisVec = toPole.clone().sub(proj);
  if (bendAxisVec.lengthSq() < 1e-6) bendAxisVec.set(0, 1, 0).sub(dirToTarget.clone().multiplyScalar(dirToTarget.y));
  bendAxisVec.normalize();

  // law of cosines for the elbow bend
  const cosA = THREE.MathUtils.clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const a = Math.acos(cosA);
  // upper direction: rotate dirToTarget by -a around (dir x bend)
  const perp = new THREE.Vector3().crossVectors(dirToTarget, bendAxisVec).normalize();
  const upperDir = dirToTarget.clone().applyAxisAngle(perp, -a);
  const elbowW = rootW.clone().addScaledVector(upperDir, l1);

  aimBoneWorld(upper, elbowW);
  // after aiming the upper bone, aim the lower bone toward the target
  lower.updateWorldMatrix(true, false);
  aimBoneWorld(lower, targetW);
  end.updateWorldMatrix(true, false);
}

/** Rotate a bone (whose local +? axis points to its child) so its child points to targetW.
 * We assume children are placed along the bone's local -Y (see rig). */
const BONE_AXIS = new THREE.Vector3(0, -1, 0);
export function aimBoneWorld(bone: THREE.Object3D, targetW: THREE.Vector3, twist?: THREE.Vector3) {
  bone.updateWorldMatrix(true, false);
  const originW = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const parentQ = new THREE.Quaternion();
  if (bone.parent) bone.parent.getWorldQuaternion(parentQ);
  const dirW = _a.copy(targetW).sub(originW);
  if (dirW.lengthSq() < 1e-9) return;
  dirW.normalize();
  // desired local direction (relative to parent)
  const invParent = _q.copy(parentQ).invert();
  const dirLocal = dirW.clone().applyQuaternion(invParent);
  const quat = new THREE.Quaternion().setFromUnitVectors(BONE_AXIS, dirLocal);
  bone.quaternion.copy(quat);
  if (twist) {
    // roll around the bone axis so local +Z aligns toward `twist`
    bone.updateWorldMatrix(true, false);
    const curZ = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(bone.matrixWorld));
    const boneDirW = new THREE.Vector3(0, -1, 0).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(bone.matrixWorld));
    const want = twist.clone().sub(boneDirW.clone().multiplyScalar(twist.dot(boneDirW))).normalize();
    const have = curZ.clone().sub(boneDirW.clone().multiplyScalar(curZ.dot(boneDirW))).normalize();
    if (want.lengthSq() > 1e-6 && have.lengthSq() > 1e-6) {
      let ang = Math.acos(THREE.MathUtils.clamp(have.dot(want), -1, 1));
      const sign = Math.sign(new THREE.Vector3().crossVectors(have, want).dot(boneDirW));
      _axis.copy(BONE_AXIS);
      bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(_axis, ang * sign));
    }
  }
  void _m;
}

/** orient an object's local -Y toward targetW and +Z toward upW (world) */
export function lookBoneY(bone: THREE.Object3D, targetW: THREE.Vector3) {
  aimBoneWorld(bone, targetW);
}
