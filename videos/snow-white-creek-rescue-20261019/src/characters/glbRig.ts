// Runtime for the MPFB/MakeHuman GLB characters: loads the skinned model and applies a CharState each frame.
// Bones are posed relative to their bind (rest) orientation, so arbitrary bone roll from the exporter is irrelevant.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharId, SPECS, Spec } from './specs';
import { CharState } from './state';
import dimsJson from './dims.json';
import { clamp, lerp } from '../engine/math';

export type Dims = {
  hipY: number; footH: number; thigh: number; shin: number; upperArm: number; foreArm: number;
  shoulderY: number; shoulderX: number; hipX: number; headY: number; height: number; chestY: number; pelvisY: number;
};
export const DIMS = dimsJson as Record<CharId, Dims>;

const BONES = [
  'Root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head',
  'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
  'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r',
] as const;
type BoneName = (typeof BONES)[number];
const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;

type BoneInfo = {
  bone: THREE.Bone;
  restQ: THREE.Quaternion; // local rest quaternion
  restWorldQ: THREE.Quaternion; // model-space rest quaternion (character facing +Z, root at origin)
  restPos: THREE.Vector3;
};

export type GlbRig = {
  id: CharId;
  spec: Spec;
  dims: Dims;
  root: THREE.Group; // world transform (position + yaw)
  model: THREE.Object3D;
  bones: Record<BoneName, BoneInfo>;
  fingers: { l: BoneInfo[][]; r: BoneInfo[][] }; // [finger][segment], thumb first
  morphMeshes: THREE.Mesh[];
  morphIndex: Map<string, { mesh: THREE.Mesh; idx: number }[]>;
  skirt?: SkirtSim;
  materials: THREE.Material[];
  /** convenience anchors kept updated each frame (world space) */
  anchors: { chest: THREE.Object3D; headTilt: THREE.Object3D; wristL: THREE.Object3D; wristR: THREE.Object3D };
  hairSwing: { value: THREE.Vector3 };
  beardSwing: { value: THREE.Vector3 };
  beard?: THREE.Mesh;
  hat?: THREE.Mesh;
  skirtWetMat?: THREE.MeshStandardMaterial;
  prev: { t: number; hips: THREE.Vector3; vel: THREE.Vector3; head: THREE.Vector3; headVel: THREE.Vector3 } | null;
};

const loader = new GLTFLoader();

/** make the performance layer's body measurements match the exported GLB skeletons */
export function syncSpecsToModels() {
  for (const id of Object.keys(DIMS) as CharId[]) {
    const d = DIMS[id];
    const b = SPECS[id].body;
    b.footH = d.footH;
    b.legLen = d.hipY - d.footH;
    b.torso = (d.shoulderY - d.hipY) / 0.74;
    b.upperArm = d.upperArm;
    b.foreArm = d.foreArm;
    b.chestW = d.shoulderX / 0.56;
    b.hipW = d.hipX;
    SPECS[id].gait.step = id === 'snow' ? 0.56 : 0.85 * (d.thigh + d.shin);
  }
}

export async function loadCharacter(id: CharId, url: string): Promise<GlbRig> {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  const root = new THREE.Group();
  root.name = id;
  root.add(model);
  model.updateMatrixWorld(true);

  const byName = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) byName.set(o.name, o as THREE.Bone);
  });
  const info = (name: string): BoneInfo => {
    const b = byName.get(name);
    if (!b) throw new Error(`${id}: missing bone ${name}`);
    return {
      bone: b,
      restQ: b.quaternion.clone(),
      restWorldQ: b.getWorldQuaternion(new THREE.Quaternion()),
      restPos: b.position.clone(),
    };
  };
  const bones = {} as Record<BoneName, BoneInfo>;
  for (const n of BONES) bones[n] = info(n);
  const fingerSet = (s: 'l' | 'r') => [
    ['thumb_01', 'thumb_02', 'thumb_03'].map((n) => info(`${n}_${s}`)),
    ...FINGERS.map((f) => [1, 2, 3].map((k) => info(`${f}_0${k}_${s}`))),
  ];

  const rigSwing = { value: new THREE.Vector3() };
  const materials: THREE.Material[] = [];
  const morphMeshes: THREE.Mesh[] = [];
  const morphIndex = new Map<string, { mesh: THREE.Mesh; idx: number }[]>();
  let beard: THREE.Mesh | undefined;
  let hat: THREE.Mesh | undefined;
  let skirtMesh: THREE.SkinnedMesh | undefined;
  let skirtWetMat: THREE.MeshStandardMaterial | undefined;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) fixMaterial(mat as THREE.MeshStandardMaterial, m.name, id);
    materials.push(...mats);
    if (m.morphTargetDictionary && m.morphTargetInfluences) {
      morphMeshes.push(m);
      for (const [k, idx] of Object.entries(m.morphTargetDictionary)) {
        if (!morphIndex.has(k)) morphIndex.set(k, []);
        morphIndex.get(k)!.push({ mesh: m, idx });
      }
    }
    if (m.name.includes('beard')) {
      beard = m;
      addSway(mats[0] as THREE.MeshStandardMaterial, rigSwing);
    }
    if (m.name === 'hat') hat = m;
    if (m.name === 'skirt') {
      skirtMesh = m as THREE.SkinnedMesh;
      skirtWetMat = mats[0] as THREE.MeshStandardMaterial;
    }
  });

  const anchors = {
    chest: bones.spine_03.bone as THREE.Object3D,
    headTilt: bones.head.bone as THREE.Object3D,
    wristL: bones.hand_r.bone as THREE.Object3D,
    wristR: bones.hand_l.bone as THREE.Object3D,
  };
  const rig: GlbRig = {
    id,
    spec: SPECS[id],
    dims: DIMS[id],
    root,
    model,
    bones,
    fingers: { l: fingerSet('l'), r: fingerSet('r') },
    morphMeshes,
    morphIndex,
    materials,
    anchors,
    hairSwing: { value: new THREE.Vector3() },
    beardSwing: rigSwing,
    beard,
    hat,
    skirtWetMat,
    prev: null,
  };
  if (skirtMesh) rig.skirt = new SkirtSim(skirtMesh, rig);
  if (skirtWetMat) addWetness(skirtWetMat);
  return rig;
}

/** glTF material tweaks: proper alpha handling for hair cards, skin sheen, etc. */
function fixMaterial(mat: THREE.MeshStandardMaterial, meshName: string, id: CharId) {
  const n = (mat.name || '').toLowerCase();
  const isCard = /bob0|short0|eyebrow|eyelash|beard/.test(n);
  if (isCard) {
    mat.transparent = false;
    mat.alphaTest = n.includes('eyelash') ? 0.3 : 0.4;
    mat.alphaToCoverage = true;
    mat.side = THREE.DoubleSide;
    mat.depthWrite = true;
    mat.roughness = 0.62;
    mat.metalness = 0;
  } else if (mat.transparent && !n.includes('lens')) {
    // MakeHuman marks skin/eyes/teeth as BLEND; render them opaque to avoid sorting artifacts
    mat.transparent = false;
    mat.depthWrite = true;
    mat.alphaTest = 0;
    mat.opacity = 1;
  }
  if (n.includes('.body')) {
    mat.roughness = 0.52;
    mat.metalness = 0;
    (mat as THREE.MeshPhysicalMaterial).clearcoat = 0;
    if ((mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
      const pm = mat as THREE.MeshPhysicalMaterial;
      pm.sheen = 0.25;
      pm.sheenRoughness = 0.6;
      pm.sheenColor = new THREE.Color('#ffb59a');
    }
  }
  if (n.includes('high-poly')) {
    mat.roughness = 0.08;
    if ((mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) (mat as THREE.MeshPhysicalMaterial).clearcoat = 1;
  }
  if (n.includes('teeth')) mat.roughness = 0.35;
  const phys = mat as THREE.MeshPhysicalMaterial;
  if (phys.isMeshPhysicalMaterial && phys.sheen > 0 && !n.includes('.body')) {
    // exported fabric sheen is white; tint it with the cloth colour so velvet/wool stays saturated
    phys.sheen = 0.35;
    phys.sheenRoughness = 0.7;
    phys.sheenColor = mat.color.clone().multiplyScalar(1.6);
  }
  if (n.includes('lens')) {
    mat.transparent = true;
    mat.opacity = 0.12;
    mat.depthWrite = false;
    mat.roughness = 0.02;
  }
  void meshName;
  void id;
}

/** beard cards: tips lag behind head motion (uv.y = 1 at the root, 0 at the tip) */
function addSway(mat: THREE.MeshStandardMaterial, swing: { value: THREE.Vector3 }) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => {
    prev?.call(mat, s, r);
    s.uniforms.uSway = swing;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSway;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat tipK = pow(1.0 - uv.y, 1.6);\ntransformed += uSway * tipK;');
  };
  mat.needsUpdate = true;
}

function addWetness(mat: THREE.MeshStandardMaterial) {
  const u = { uWet: { value: 0 }, uHemY: { value: 0 } };
  mat.userData.wet = u;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uWet = u.uWet;
    s.uniforms.uHemY = u.uHemY;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet; uniform float uHemY; varying float vWY;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat wetK = (1.0 - smoothstep(uHemY + uWet - 0.03, uHemY + uWet + 0.01, vWY)) * step(0.001, uWet);\ndiffuseColor.rgb *= mix(1.0, 0.52, wetK);',
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, wetK);');
  };
  mat.needsUpdate = true;
}

// ---------------------------------------------------------------- pose helpers
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);

/** set a bone so its model-space orientation equals q_model * restWorld (q_model given in model space) */
function setModelRot(rig: GlbRig, b: BoneInfo, qModel: THREE.Quaternion) {
  const parent = b.bone.parent!;
  const parentWorld = parent.getWorldQuaternion(_q2);
  const modelWorld = rig.model.getWorldQuaternion(new THREE.Quaternion());
  // desired world = modelWorld * qModel * restWorldQ
  const desired = modelWorld.multiply(qModel).multiply(b.restWorldQ);
  b.bone.quaternion.copy(parentWorld.invert().multiply(desired));
  b.bone.updateMatrixWorld(true);
}

/** local rotation offset applied on top of the rest pose, expressed in the parent's frame (Euler in character space) */
function setOffset(b: BoneInfo, e: THREE.Euler) {
  // rotate in character axes: q_local = restQ_parentspace... approximate via pre-multiplying rest with a model-axis rotation
  const off = _q.setFromEuler(e);
  // convert offset from model axes to bone-parent axes using the rest world orientation of the parent
  const parentRest = b.restWorldQ.clone().multiply(b.restQ.clone().invert());
  const offLocal = parentRest.clone().invert().multiply(off).multiply(parentRest);
  b.bone.quaternion.copy(offLocal.multiply(b.restQ));
}

/** aim bone (whose +Y points to the child) at a world target, keeping the twist closest to rest */
function aimBone(rig: GlbRig, b: BoneInfo, target: THREE.Vector3, poleHint?: THREE.Vector3) {
  b.bone.updateMatrixWorld(true);
  const origin = b.bone.getWorldPosition(_v);
  const dirW = _v2.copy(target).sub(origin);
  if (dirW.lengthSq() < 1e-10) return;
  dirW.normalize();
  const parentW = b.bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  const curW = parentW.clone().multiply(b.bone.quaternion);
  const curDir = Y.clone().applyQuaternion(curW);
  const swing = new THREE.Quaternion().setFromUnitVectors(curDir, dirW);
  let newW = swing.multiply(curW);
  if (poleHint) {
    // twist around the bone axis so the bone's local +Z (rest) faces the pole hint
    const z = new THREE.Vector3(0, 0, 1).applyQuaternion(newW);
    const want = poleHint.clone().sub(dirW.clone().multiplyScalar(poleHint.dot(dirW)));
    const have = z.sub(dirW.clone().multiplyScalar(z.dot(dirW)));
    if (want.lengthSq() > 1e-8 && have.lengthSq() > 1e-8) {
      want.normalize();
      have.normalize();
      const ang = Math.atan2(new THREE.Vector3().crossVectors(have, want).dot(dirW), have.dot(want));
      newW = new THREE.Quaternion().setFromAxisAngle(dirW, ang).multiply(newW);
    }
  }
  b.bone.quaternion.copy(parentW.invert().multiply(newW));
  b.bone.updateMatrixWorld(true);
}

/** analytic two-bone IK with pole vector, then align the end bone */
function twoBone(rig: GlbRig, upper: BoneInfo, lower: BoneInfo, end: BoneInfo, target: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number) {
  upper.bone.updateMatrixWorld(true);
  const a = upper.bone.getWorldPosition(new THREE.Vector3());
  const toT = target.clone().sub(a);
  let d = toT.length();
  const maxR = (l1 + l2) * 0.999;
  d = clamp(d, Math.abs(l1 - l2) + 1e-3, maxR);
  const dir = toT.normalize();
  const toP = pole.clone().sub(a);
  const bend = toP.sub(dir.clone().multiplyScalar(toP.dot(dir)));
  if (bend.lengthSq() < 1e-8) bend.set(0, 0, 1);
  bend.normalize();
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = Math.acos(cosA);
  const elbow = a.clone().addScaledVector(dir, Math.cos(ang) * l1).addScaledVector(bend, Math.sin(ang) * l1);
  const tgt = a.clone().addScaledVector(dir, d);
  aimBone(rig, upper, elbow);
  aimBone(rig, lower, tgt);
}

// ---------------------------------------------------------------- apply a CharState
export function applyGlb(rig: GlbRig, st: CharState, t: number) {
  const B = rig.bones;
  const d = rig.dims;
  rig.root.visible = st.visible;
  if (!st.visible) return;
  rig.root.position.copy(st.pos);
  rig.root.rotation.set(0, st.yaw, 0);

  // reset all bones to rest
  for (const n of BONES) {
    B[n].bone.quaternion.copy(B[n].restQ);
    B[n].bone.position.copy(B[n].restPos);
  }

  // pelvis translation (Root bone is at the origin; pelvis rest y = pelvisY)
  const pel = B.pelvis;
  const drop = st.hipsDrop;
  // convert character-space offset into the pelvis parent's (Root) local frame
  const off = new THREE.Vector3(st.hipsShift.x, drop + st.hipsShift.y, st.hipsShift.z);
  const rootRestW = B.Root.restWorldQ.clone().invert();
  off.applyQuaternion(rootRestW);
  pel.bone.position.copy(pel.restPos).add(off);
  // body rotations in character axes (x: pitch forward +, y: yaw, z: roll)
  setOffset(pel, new THREE.Euler(st.hipsPitch, st.hipsYaw, -st.hipsRoll, 'YXZ'));
  setOffset(B.spine_01, new THREE.Euler(st.spinePitch * 0.35, st.spineYaw * 0.3, -st.spineRoll * 0.35, 'YXZ'));
  setOffset(B.spine_02, new THREE.Euler(st.spinePitch * 0.35, st.spineYaw * 0.35, -st.spineRoll * 0.35, 'YXZ'));
  setOffset(B.spine_03, new THREE.Euler(st.spinePitch * 0.3 + st.shake * 0.02 * Math.sin(t * 26), st.spineYaw * 0.35, -st.spineRoll * 0.3, 'YXZ'));
  setOffset(B.neck_01, new THREE.Euler(st.headPitch * 0.4, st.headYaw * 0.4, -st.headRoll * 0.35, 'YXZ'));
  setOffset(B.head, new THREE.Euler(st.headPitch * 0.6, st.headYaw * 0.6, -st.headRoll * 0.65, 'YXZ'));
  // shoulders shrug with the laugh / effort
  const shrug = st.shake * 0.06 * Math.abs(Math.sin(t * 13));
  setOffset(B.clavicle_l, new THREE.Euler(0, 0, -shrug, 'YXZ'));
  setOffset(B.clavicle_r, new THREE.Euler(0, 0, shrug, 'YXZ'));
  rig.root.updateMatrixWorld(true);

  const yawQ = new THREE.Quaternion().setFromAxisAngle(Y, st.yaw);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(yawQ);
  const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(yawQ); // character's left is +X in model space

  // legs
  for (const side of ['l', 'r'] as const) {
    const foot = side === 'l' ? st.footR : st.footL;
    const thigh = B[`thigh_${side}`];
    const calf = B[`calf_${side}`];
    const fb = B[`foot_${side}`];
    const hip = thigh.bone.getWorldPosition(new THREE.Vector3());
    const ankle = foot.pos.clone();
    ankle.y += d.footH;
    const pole = hip.clone().addScaledVector(fwd, 1.0).add(new THREE.Vector3(0, -0.2, 0));
    twoBone(rig, thigh, calf, fb, ankle, pole, d.thigh, d.shin);
    // foot: rest orientation in world with yaw + pitch/roll from state
    const fq = new THREE.Quaternion().setFromEuler(new THREE.Euler(foot.pitch, foot.yaw - st.yaw, foot.roll ?? 0, 'YXZ'));
    setModelRot(rig, fb, fq);
  }

  // arms
  for (const side of ['l', 'r'] as const) {
    const hand = side === 'l' ? st.handR : st.handL;
    const up = B[`upperarm_${side}`];
    const lo = B[`lowerarm_${side}`];
    const hb = B[`hand_${side}`];
    const sh = up.bone.getWorldPosition(new THREE.Vector3());
    const sx = side === 'l' ? 1 : -1;
    const defPole = sh.clone().addScaledVector(right, -sx * 0.0).addScaledVector(fwd, -0.6).add(new THREE.Vector3(0, -0.3, 0)).addScaledVector(right, sx * -0.35);
    const pole = hand.pole ?? defPole;
    twoBone(rig, up, lo, hb, hand.pos, pole, d.upperArm, d.foreArm);
    // hand: continue the forearm by default; optionally aim fingers along hand.dir
    const handTarget = hand.dir
      ? hb.bone.getWorldPosition(new THREE.Vector3()).add(hand.dir)
      : (() => {
          const e = lo.bone.getWorldPosition(new THREE.Vector3());
          const w = hb.bone.getWorldPosition(new THREE.Vector3());
          return w.clone().add(w.clone().sub(e).normalize().multiplyScalar(0.1)).add(new THREE.Vector3(0, -0.02, 0));
        })();
    aimBone(rig, hb, handTarget);
    curlFingers(rig, side, hand.grip, hand.spread ?? 0);
  }

  applyFaceMorphs(rig, st, t);
  secondary(rig, st, t);
}

function curlFingers(rig: GlbRig, side: 'l' | 'r', grip: number, spread: number) {
  const set = rig.fingers[side];
  set.forEach((segs, fi) => {
    const thumb = fi === 0;
    segs.forEach((b, si) => {
      const base = thumb ? 0.15 + grip * 0.55 : 0.12 + grip * (si === 0 ? 1.25 : si === 1 ? 1.45 : 1.0);
      const spr = thumb ? 0 : (fi - 2.5) * 0.08 * (1 + spread) * (si === 0 ? 1 : 0);
      // curl around the bone's local X axis (MakeHuman finger bones bend around local X)
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(base, 0, spr));
      b.bone.quaternion.copy(b.restQ).multiply(q);
    });
  });
}

// ARKit face units driven from the simplified FaceState used by the performance layer
function setMorph(rig: GlbRig, name: string, v: number) {
  const list = rig.morphIndex.get(name);
  if (!list) return;
  for (const { mesh, idx } of list) mesh.morphTargetInfluences![idx] = clamp(v, 0, 1);
}

function setMorphRaw(rig: GlbRig, name: string, v: number) {
  const list = rig.morphIndex.get(name);
  if (!list) return;
  for (const { mesh, idx } of list) mesh.morphTargetInfluences![idx] = v;
}

function applyFaceMorphs(rig: GlbRig, st: CharState, t: number) {
  const f = st.face;
  const lidBase = rig.spec.eye.lidOpen; // per-character habitual lid opening is baked; here f.lid modulates
  void lidBase;
  const blink = clamp(f.blink + (1 - clamp(f.lid, 0, 1.8)) * 0.6, -0.6, 1);
  setMorphRaw(rig, 'eyeBlinkLeft', blink);
  setMorphRaw(rig, 'eyeBlinkRight', blink);
  setMorph(rig, 'eyeWideLeft', clamp(f.browUp, 0, 1) * 0.35);
  setMorph(rig, 'eyeWideRight', clamp(f.browUp, 0, 1) * 0.35);
  setMorph(rig, 'eyeSquintLeft', f.squint + f.smile * 0.25);
  setMorph(rig, 'eyeSquintRight', f.squint + f.smile * 0.25);
  setMorph(rig, 'browInnerUp', clamp(f.browUp, 0, 1) * 0.7 + f.browSad);
  setMorph(rig, 'browOuterUpLeft', clamp(f.browUp, 0, 1));
  setMorph(rig, 'browOuterUpRight', clamp(f.browUp, 0, 1));
  setMorph(rig, 'browDownLeft', f.browAngry + f.browIn * 0.6 + clamp(-f.browUp, 0, 1));
  setMorph(rig, 'browDownRight', f.browAngry + f.browIn * 0.6 + clamp(-f.browUp, 0, 1));
  setMorph(rig, 'jawOpen', f.open * 0.75);
  setMorph(rig, 'mouthLowerDownLeft', f.open * 0.3);
  setMorph(rig, 'mouthLowerDownRight', f.open * 0.3);
  setMorph(rig, 'mouthSmileLeft', f.smile);
  setMorph(rig, 'mouthSmileRight', f.smile * 0.95);
  setMorph(rig, 'cheekSquintLeft', f.smile * 0.6);
  setMorph(rig, 'cheekSquintRight', f.smile * 0.6);
  setMorph(rig, 'mouthFrownLeft', f.frown);
  setMorph(rig, 'mouthFrownRight', f.frown);
  setMorph(rig, 'mouthPucker', f.pucker);
  setMorph(rig, 'noseSneerLeft', f.noseWrinkle);
  setMorph(rig, 'noseSneerRight', f.noseWrinkle);
  setMorph(rig, 'mouthUpperUpLeft', f.noseWrinkle * 0.4);
  setMorph(rig, 'mouthUpperUpRight', f.noseWrinkle * 0.4);
  // eye look direction via morphs
  if (st.eyeLook) {
    const head = rig.bones.head.bone;
    head.updateMatrixWorld(true);
    const hp = head.getWorldPosition(new THREE.Vector3());
    const local = st.eyeLook.clone().sub(hp).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()).multiply(rig.bones.head.restWorldQ.clone().invert()).invert());
    // in character space: +x is character left, +z forward
    const yaw = Math.atan2(local.x, Math.max(0.05, local.z));
    const pitch = Math.atan2(local.y, Math.hypot(local.x, local.z));
    const h = clamp(yaw / 0.6, -1, 1);
    const v = clamp(pitch / 0.45, -1, 1);
    setMorph(rig, 'eyeLookOutLeft', clamp(h, 0, 1));
    setMorph(rig, 'eyeLookInRight', clamp(h, 0, 1));
    setMorph(rig, 'eyeLookInLeft', clamp(-h, 0, 1));
    setMorph(rig, 'eyeLookOutRight', clamp(-h, 0, 1));
    setMorph(rig, 'eyeLookUpLeft', clamp(v, 0, 1));
    setMorph(rig, 'eyeLookUpRight', clamp(v, 0, 1));
    setMorph(rig, 'eyeLookDownLeft', clamp(-v, 0, 1));
    setMorph(rig, 'eyeLookDownRight', clamp(-v, 0, 1));
  }
  // blush / red-nose intensity through the emissive-free skin tint: modulate via vertex colour multiplier
  void t;
}

function secondary(rig: GlbRig, st: CharState, t: number) {
  // hat tip and beard lag behind head motion (simple damped spring evaluated from velocity)
  const head = rig.bones.head.bone;
  const hp = head.getWorldPosition(new THREE.Vector3());
  const hips = rig.bones.pelvis.bone.getWorldPosition(new THREE.Vector3());
  let vel = new THREE.Vector3();
  let headVel = new THREE.Vector3();
  if (rig.prev && t > rig.prev.t && t - rig.prev.t < 0.2) {
    const dt = t - rig.prev.t;
    vel = hips.clone().sub(rig.prev.hips).divideScalar(dt);
    headVel = hp.clone().sub(rig.prev.head).divideScalar(dt);
    vel.lerp(rig.prev.vel, 0.5);
    headVel.lerp(rig.prev.headVel, 0.5);
  }
  rig.prev = { t, hips, vel, head: hp, headVel };
  rig.hairSwing.value.copy(headVel).multiplyScalar(-0.02);
  // beard sway in bind space (character faces +Z there): lag behind the head velocity, plus breeze
  const inv = new THREE.Quaternion().setFromAxisAngle(Y, -st.yaw);
  const hv = headVel.clone().applyQuaternion(inv);
  rig.beardSwing.value.set(
    clamp(-hv.x * 0.012, -0.03, 0.03) + Math.sin(t * 1.7 + rig.id.length) * 0.002,
    0,
    clamp(-hv.z * 0.012, -0.03, 0.03) + Math.sin(t * 2.3) * 0.0015,
  );
  if (rig.skirt) rig.skirt.update(vel, st, t);
  if (rig.skirtWetMat?.userData.wet) {
    rig.skirtWetMat.userData.wet.uWet.value = st.wetHem;
    rig.skirtWetMat.userData.wet.uHemY.value = rig.root.position.y;
  }
}

/** cloth-like skirt: lagged hem driven by pelvis velocity + leg proximity push (deterministic, history-free) */
class SkirtSim {
  mesh: THREE.SkinnedMesh;
  rig: GlbRig;
  base: Float32Array;
  waistY: number;
  floorY: number;
  center: THREE.Vector3;
  constructor(mesh: THREE.SkinnedMesh, rig: GlbRig) {
    this.mesh = mesh;
    this.rig = rig;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    this.base = new Float32Array(pos.array as Float32Array);
    let maxY = -1e9;
    let minY = 1e9;
    const c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      maxY = Math.max(maxY, pos.getY(i));
      minY = Math.min(minY, pos.getY(i));
      c.x += pos.getX(i);
      c.z += pos.getZ(i);
    }
    c.multiplyScalar(1 / pos.count);
    this.waistY = maxY;
    this.floorY = minY;
    this.center = c;
    (mesh.geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
  }
  update(velW: THREE.Vector3, st: CharState, t: number) {
    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    // velocity in character space (model axes): z forward, x character-left
    const inv = new THREE.Quaternion().setFromAxisAngle(Y, -st.yaw);
    const v = velW.clone().applyQuaternion(inv);
    // knees in model space
    const kneeL = this.legPoint('l');
    const kneeR = this.legPoint('r');
    const H = this.waistY - this.floorY;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.base[i * 3], by = this.base[i * 3 + 1], bz = this.base[i * 3 + 2];
      const k = clamp((this.waistY - by) / H, 0, 1);
      const lag = k * k;
      let x = bx - v.x * 0.09 * lag;
      let z = bz - v.z * 0.11 * lag;
      // swish
      const ang = Math.atan2(bz - this.center.z, bx - this.center.x);
      const sw = Math.sin(t * 2.6 + ang * 2) * 0.006 * lag + Math.sin(t * 1.3 + ang * 3 + 1) * 0.004 * lag;
      x += Math.cos(ang) * sw;
      z += Math.sin(ang) * sw;
      // legs push the fabric outward where they come close (keeps knees inside the skirt)
      for (const kn of [kneeL, kneeR]) {
        const dx = x - kn.x, dz = z - kn.z;
        const dy = by - kn.y;
        const dist = Math.hypot(dx, dz);
        const reach = 0.13 + Math.max(0, -dy) * 0.25;
        if (Math.abs(dy) < 0.45 && dist < reach) {
          const push = (reach - dist) * (1 - Math.abs(dy) / 0.45);
          x += (dx / (dist + 1e-4)) * push;
          z += (dz / (dist + 1e-4)) * push;
        }
      }
      arr[i * 3] = x;
      arr[i * 3 + 1] = by;
      arr[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
  /** knee/shin position in the skirt mesh's bind space (model space, since the skinned mesh is at the rig origin) */
  legPoint(side: 'l' | 'r') {
    const calf = this.rig.bones[`calf_${side}`].bone;
    const foot = this.rig.bones[`foot_${side}`].bone;
    const a = calf.getWorldPosition(new THREE.Vector3());
    const b = foot.getWorldPosition(new THREE.Vector3());
    const p = a.lerp(b, 0.35);
    // world -> model space of the character
    this.rig.model.updateMatrixWorld(true);
    return p.applyMatrix4(new THREE.Matrix4().copy(this.rig.model.matrixWorld).invert());
  }
}

export { lerp };
