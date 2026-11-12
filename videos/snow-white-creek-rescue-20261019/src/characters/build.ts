// Build a full character (skeleton + procedural skin/clothes + face) from a Spec.
import * as THREE from 'three';
import { Spec } from './specs';
import {
  buildHand,
  eyeballGeometry,
  hairCards,
  hairMaterial,
  HandParts,
  limbGeometry,
  mouthGeometry,
  poseHand,
  sampleSurface,
  sculptHead,
  sweep,
  taperedCapsule,
} from './parts';
import { clamp, lerp, mulberry32, vnoise3 } from '../engine/math';
import { makeBlushTex, makeIrisTex, makeStrandTex } from '../engine/textures';

export type Shared = { uTime: { value: number } };

export type Rig = {
  spec: Spec;
  root: THREE.Group; // world placement (position + yaw)
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  headTilt: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  upperArmL: THREE.Group;
  upperArmR: THREE.Group;
  foreArmL: THREE.Group;
  foreArmR: THREE.Group;
  wristL: THREE.Group;
  wristR: THREE.Group;
  handL: HandParts;
  handR: HandParts;
  thighL: THREE.Group;
  thighR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  footL: THREE.Group;
  footR: THREE.Group;
  lengths: {
    upperArm: number; foreArm: number; thigh: number; shin: number;
    hipY: number; shoulderY: number; shoulderX: number; hipX: number;
  };
  face: FaceRig;
  skirt?: SkirtRig;
  eyes: { l: THREE.Mesh; r: THREE.Mesh; lPupil: THREE.Object3D; rPupil: THREE.Object3D };
  hairSwing: { value: THREE.Vector3 };
  beardSwing: { value: THREE.Vector3 };
  materials: THREE.Material[];
  hemWorldY: () => number;
};

type FaceRig = {
  lidTopL: THREE.Mesh; lidTopR: THREE.Mesh; lidBotL: THREE.Mesh; lidBotR: THREE.Mesh;
  browL: THREE.Group; browR: THREE.Group;
  mouthUpper: THREE.Mesh; mouthLower: THREE.Mesh; jaw: THREE.Group;
  blushL: THREE.Mesh; blushR: THREE.Mesh;
  noseGroup: THREE.Group;
  restLidTop: number; restLidBot: number;
};

type SkirtRig = {
  mesh: THREE.Mesh;
  rings: { y: number; rest: THREE.Vector3[] }[];
  update: (hipsWorld: THREE.Matrix4, vel: THREE.Vector3, t: number, wet: number) => void;
};

const UP = new THREE.Vector3(0, 1, 0);

function headGroup(spec: Spec, shared: Shared, mats: THREE.Material[]): { grp: THREE.Group; face: FaceRig; eyes: Rig['eyes'] } {
  const g = new THREE.Group();
  const seed = spec.name.length * 13 + spec.id.charCodeAt(0);
  const headGeo = sculptHead(spec.head, seed);
  const skinMat = new THREE.MeshStandardMaterial({ color: spec.skin, roughness: 0.62, metalness: 0 });
  skinMat.onBeforeCompile = (s) => {
    // subtle subsurface-ish warmth on thin areas (ears/nose already colored)
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_fragment_end>',
      '#include <lights_fragment_end>\nreflectedLight.directDiffuse += diffuseColor.rgb * vec3(0.06,0.015,0.0) * pow(max(dot(geometryNormal, normalize(vViewPosition)),0.0),1.5);',
    );
  };
  mats.push(skinMat);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  g.add(headMesh);
  const R = spec.head.r;

  // ---- Nose ----
  const noseGroup = new THREE.Group();
  const nm = buildNose(spec, skinMat);
  noseGroup.add(nm);
  noseGroup.position.set(0, spec.nose.y, R * 0.92);
  g.add(noseGroup);

  // ---- Ears ----
  for (const sx of [-1, 1]) {
    const ear = buildEar(spec, skinMat);
    ear.scale.setScalar(spec.ears.scale);
    ear.position.set(sx * R * (0.86 + spec.ears.out * 0.4), spec.head.r * 0.02, -R * 0.1);
    ear.rotation.y = sx * (0.3 + spec.ears.out);
    ear.rotation.z = sx * -0.2;
    g.add(ear);
  }

  // ---- Eyes ----
  const eyeR = spec.eye.r;
  const eyeMat = new THREE.MeshStandardMaterial({ map: makeIrisTex(spec.eye.iris), roughness: 0.12, metalness: 0 });
  mats.push(eyeMat);
  const eyeGeo = eyeballGeometry(eyeR);
  const mkEye = (sx: number) => {
    const socket = new THREE.Group();
    socket.position.set(sx * spec.eye.sep, spec.eye.y, R * 0.72);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.castShadow = false;
    const pupilTarget = new THREE.Object3D();
    pupilTarget.position.z = eyeR;
    eye.add(pupilTarget);
    socket.add(eye);
    g.add(socket);
    return { socket, eye, pupilTarget };
  };
  const eL = mkEye(-1), eR = mkEye(1);
  // glossy cornea highlight via a small bright add sphere
  const corneaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  for (const e of [eL, eR]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.16, 8, 8), corneaMat);
    hl.position.set(-0.3 * eyeR, 0.3 * eyeR, eyeR * 0.92);
    e.eye.add(hl);
  }

  // ---- Eyelids (skin-colored caps that rotate to blink) ----
  const lidMat = skinMat;
  const mkLids = (sx: number, socket: THREE.Group) => {
    const lidGeo = new THREE.SphereGeometry(eyeR * 1.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const top = new THREE.Mesh(lidGeo, lidMat);
    top.castShadow = true;
    const bot = new THREE.Mesh(lidGeo.clone(), lidMat);
    bot.rotation.x = Math.PI;
    socket.add(top);
    socket.add(bot);
    const open = spec.eye.lidOpen;
    top.rotation.x = -Math.PI * 0.5 * open; // rest open
    bot.rotation.x = Math.PI + Math.PI * 0.5 * spec.eye.lowerLid;
    return { top, bot };
  };
  const lidsL = mkLids(-1, eL.socket);
  const lidsR = mkLids(1, eR.socket);

  // lashes for princess / bashful
  if (spec.eye.lash > 0) {
    const lashMat = new THREE.MeshBasicMaterial({ color: '#140d0c', side: THREE.DoubleSide });
    for (const [socket, sx] of [[eL.socket, -1], [eR.socket, 1]] as const) {
      const roots: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
      for (let i = 0; i < 7; i++) {
        const a = -0.6 + (i / 6) * 1.2;
        roots.push({ p: new THREE.Vector3(Math.sin(a) * eyeR, Math.cos(a) * eyeR * 0.8 + eyeR * 0.2, eyeR * 0.8), n: new THREE.Vector3(Math.sin(a) * 0.4, 0.5, 1).normalize() });
      }
      const lash = new THREE.Mesh(
        hairCards(roots, { len: () => 0.01 * spec.eye.lash, width: 0.0016, gravity: -0.3, segs: 3, seed: 7 }),
        lashMat,
      );
      socket.add(lash);
    }
  }

  // ---- Brows ----
  const browMat = new THREE.MeshStandardMaterial({ color: spec.brow.color, roughness: 0.8 });
  mats.push(browMat);
  const mkBrow = (sx: number) => {
    const grp = new THREE.Group();
    const roots: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    const n = spec.brow.count;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const x = lerp(-spec.brow.len, spec.brow.len, u) * sx;
      const arch = Math.sin(u * Math.PI) * spec.brow.arch * 0.01;
      roots.push({ p: new THREE.Vector3(x, arch, R * 0.01), n: new THREE.Vector3(sx * 0.2, 0.3, 1).normalize() });
    }
    const brow = new THREE.Mesh(
      hairCards(roots, { len: () => spec.brow.thick * 2.2, width: spec.brow.thick, gravity: -0.2, segs: 2, seed: 11 + sx }),
      browMat,
    );
    grp.add(brow);
    grp.position.set(sx * (spec.eye.sep + 0.004), spec.eye.y + spec.brow.y, R * 0.82);
    g.add(grp);
    return grp;
  };
  const browL = mkBrow(-1), browR = mkBrow(1);

  // ---- Mouth + jaw ----
  const jaw = new THREE.Group();
  jaw.position.set(0, spec.mouth.y + 0.02, R * 0.3);
  const { upper, lower } = mouthGeometry(spec.mouth.w, spec.mouth.thick);
  const mouthMat = new THREE.MeshStandardMaterial({ color: spec.mouth.lip, roughness: 0.4 });
  mats.push(mouthMat);
  const mouthUpper = new THREE.Mesh(upper, mouthMat);
  const mouthLower = new THREE.Mesh(lower, mouthMat);
  mouthUpper.position.set(0, -0.02, R * 0.6);
  mouthLower.position.set(0, -0.02, R * 0.6);
  mouthUpper.morphTargetInfluences = [0, 0, 0, 0];
  mouthLower.morphTargetInfluences = [0, 0, 0, 0];
  // dark inner mouth
  const innerMat = new THREE.MeshStandardMaterial({ color: '#3a1518', roughness: 0.8, side: THREE.DoubleSide });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(spec.mouth.w * 0.9, 12, 8), innerMat);
  inner.scale.set(1, 0.5, 0.4);
  inner.position.set(0, spec.mouth.y + 0.01, R * 0.74);
  g.add(inner);
  jaw.add(mouthUpper);
  jaw.add(mouthLower);
  g.add(jaw);

  // ---- Blush overlays ----
  const blushMat = new THREE.MeshBasicMaterial({ map: makeBlushTex(), color: spec.cheekColor, transparent: true, opacity: 0, depthWrite: false });
  mats.push(blushMat);
  const mkBlush = (sx: number) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.5, R * 0.4), blushMat);
    b.position.set(sx * R * 0.52, spec.mouth.y * 0.5, R * 0.74);
    b.rotation.y = sx * 0.5;
    g.add(b);
    return b;
  };

  // ---- Hair / beard ----
  buildHair(spec, g, headGeo, shared, mats);

  const face: FaceRig = {
    lidTopL: lidsL.top, lidTopR: lidsR.top, lidBotL: lidsL.bot, lidBotR: lidsR.bot,
    browL, browR, mouthUpper, mouthLower, jaw,
    blushL: mkBlush(-1), blushR: mkBlush(1),
    noseGroup,
    restLidTop: -Math.PI * 0.5 * spec.eye.lidOpen,
    restLidBot: Math.PI + Math.PI * 0.5 * spec.eye.lowerLid,
  };
  return { grp: g, face, eyes: { l: eL.eye, r: eR.eye, lPupil: eL.pupilTarget, rPupil: eR.pupilTarget } };
}

function buildNose(spec: Spec, skin: THREE.Material) {
  const s = spec.nose.size * spec.head.r;
  const mat = (skin as THREE.MeshStandardMaterial).clone();
  mat.color = new THREE.Color(spec.nose.color);
  let geo: THREE.BufferGeometry;
  switch (spec.nose.type) {
    case 'bulb':
      geo = new THREE.SphereGeometry(0.42 * s, 20, 16);
      geo.scale(1, 0.95, 1.15);
      break;
    case 'hook': {
      const pts = [new THREE.Vector3(0, 0.1 * s, 0), new THREE.Vector3(0, 0.02 * s, 0.22 * s), new THREE.Vector3(0, -0.12 * s, 0.34 * s), new THREE.Vector3(0, -0.24 * s, 0.26 * s)];
      geo = sweep(pts, (u) => (0.1 + Math.sin(u * Math.PI) * 0.14) * s, 14, 20, true);
      break;
    }
    case 'round':
      geo = new THREE.SphereGeometry(0.4 * s, 20, 16);
      break;
    case 'long': {
      const pts = [new THREE.Vector3(0, 0.12 * s, 0), new THREE.Vector3(0, -0.02 * s, 0.26 * s), new THREE.Vector3(0, -0.2 * s, 0.4 * s)];
      geo = sweep(pts, (u) => (0.08 + Math.sin(u * Math.PI) * 0.1) * s, 14, 18, true);
      break;
    }
    case 'wide':
      geo = new THREE.SphereGeometry(0.42 * s, 20, 16);
      geo.scale(1.35, 0.85, 1.05);
      break;
    case 'button':
      geo = new THREE.SphereGeometry(0.3 * s, 18, 14);
      geo.scale(1, 0.9, 1.05);
      break;
    case 'small':
    default:
      geo = new THREE.SphereGeometry(0.2 * s, 18, 14);
      geo.scale(0.75, 0.8, 0.95);
  }
  geo.translate(0, 0, (spec.nose.type === 'small' ? 0.03 : 0.1) * s);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  // nostrils for larger noses
  if (['bulb', 'hook', 'wide', 'round', 'long'].includes(spec.nose.type)) {
    const nos = new THREE.MeshStandardMaterial({ color: '#5a3028', roughness: 0.9 });
    for (const sx of [-1, 1]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 8), nos);
      n.position.set(sx * 0.14 * s, -0.12 * s, 0.12 * s);
      m.add(n);
    }
  }
  return m;
}

function buildEar(spec: Spec, skin: THREE.Material) {
  const s = spec.head.r;
  const geo = new THREE.SphereGeometry(0.22 * s, 14, 12);
  geo.scale(0.45, 1, 0.8);
  // concha dent
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    if (p.getX(i) > 0) p.setX(i, p.getX(i) * 0.6);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, skin);
  m.castShadow = true;
  return m;
}

function buildHair(spec: Spec, head: THREE.Group, headGeo: THREE.BufferGeometry, shared: Shared, mats: THREE.Material[]) {
  const R = spec.head.r;
  const seed = spec.name.length * 13 + spec.id.charCodeAt(0);
  const swing = { value: new THREE.Vector3() };
  (head.userData as any).hairSwing = swing;

  if (spec.princess) {
    // short black bob: a solid cap for the mass + a tidy fringe/rim of cards for silhouette
    const scalp = sampleSurface(
      headGeo,
      (p, n) => n.y < 0.45 && p.y > -R * 0.12 && p.y < R * 0.55 && p.z < R * 0.55,
      60,
      42,
    );
    for (const s of scalp) {
      s.n.y = Math.min(s.n.y, 0.1) - 0.55;
      s.n.normalize();
    }
    // short front fringe cards (above the brows), kept short so the eyes show
    const fringe = sampleSurface(headGeo, (p, n) => p.z > R * 0.55 && p.y > R * 0.28 && p.y < R * 0.62, 26, 44);
    for (const s of fringe) {
      s.n.set(s.n.x * 0.3, -0.7, 0.6).normalize();
    }
    const mat = hairMaterial(spec.hair.color, makeStrandTex(), swing, shared, 0.4);
    mats.push(mat);
    // solid hair cap over the crown so the scalp reads as hair, not skin
    const capMat = new THREE.MeshStandardMaterial({ color: spec.hair.color, roughness: 0.42 });
    mats.push(capMat);
    const capGeo = sculptHead({ ...spec.head, r: spec.head.r * 1.05 }, seed + 1);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.scale.set(1.03, 1.02, 1.06);
    cap.position.y = R * 0.07;
    // open the front so the face shows: discard the lower-front of the cap (fringe line above the brows)
    capMat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vLp;\nconst float HR = ${R.toFixed(4)};`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (vLp.z > HR*0.52 && vLp.y < HR*0.36) discard;');
    };
    cap.castShadow = true;
    head.add(cap);
    const hair = new THREE.Mesh(
      hairCards(scalp, {
        len: (i) => R * (0.55 + 0.45 * clamp((R * 0.4 - scalp[i].p.y) / R)),
        width: R * 0.2,
        gravity: 1.7,
        curl: 0.25,
        segs: 5,
        seed: 3,
      }),
      mat,
    );
    hair.castShadow = true;
    head.add(hair);
    void fringe;
    // red bow hair accessory on top
    const bowMat = new THREE.MeshStandardMaterial({ color: '#c92230', roughness: 0.5 });
    mats.push(bowMat);
    const bow = new THREE.Group();
    for (const sx of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(R * 0.26, R * 0.09, 10, 20), bowMat);
      loop.scale.set(1, 0.6, 0.4);
      loop.position.set(sx * R * 0.28, 0, 0);
      loop.rotation.z = sx * 0.5;
      bow.add(loop);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.1, 10, 8), bowMat);
    bow.add(knot);
    bow.position.set(0, R * 0.95, -R * 0.1);
    head.add(bow);
    return;
  }

  // Dwarf scalp hair (ring around a bald/hat crown) + beard
  const sideHair = sampleSurface(headGeo, (p, n) => p.y > -R * 0.1 && p.y < R * 0.5 && n.y < 0.5 && p.z < R * 0.4, 90, 44);
  const hairMat = hairMaterial(spec.hair.color, makeStrandTex(), swing, shared, 0.6);
  mats.push(hairMat);
  const sh = new THREE.Mesh(hairCards(sideHair, { len: () => R * 0.5, width: R * 0.1, gravity: 1.0, curl: 0.4, segs: 5, seed: 9 }), hairMat);
  sh.castShadow = true;
  head.add(sh);

  // Beard
  if (spec.beard.style !== 'none') {
    const beardSwing = { value: new THREE.Vector3() };
    (head.userData as any).beardSwing = beardSwing;
    const bmat = hairMaterial(spec.beard.color, makeStrandTex(), beardSwing, shared, 0.65);
    mats.push(bmat);
    const chin = sampleSurface(
      headGeo,
      (p, n) => p.y < spec.mouth.y + R * 0.6 && p.z > 0 && n.z > -0.1 && p.y < R * 0.1,
      spec.beard.count / 3,
      55,
    );
    const style = spec.beard.style;
    const beard = new THREE.Mesh(
      hairCards(chin, {
        len: (i) => {
          const p = chin[i].p;
          const centre = 1 - Math.abs(p.x) / (R * 0.6);
          let l = spec.beard.len * (0.4 + 0.6 * clamp(centre));
          if (style === 'split' && Math.abs(p.x) < R * 0.08) l *= 0.55;
          if (style === 'wispy') l *= 0.7 + 0.3 * Math.sin(i);
          if (style === 'short') l *= 0.7;
          return l;
        },
        width: R * 0.1 * spec.beard.width,
        gravity: style === 'fluffy' || style === 'curly' ? 0.5 : 1.2,
        curl: style === 'curly' ? 1.4 : style === 'fluffy' ? 0.8 : 0.3,
        segs: 7,
        seed: 21,
      }),
      bmat,
    );
    beard.castShadow = true;
    head.add(beard);
    // mustache
    if (spec.beard.mustache > 0) {
      const mRoots: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
      for (let i = 0; i < 20; i++) {
        const sx = i < 10 ? -1 : 1;
        const u = (i % 10) / 9;
        mRoots.push({ p: new THREE.Vector3(sx * u * R * 0.3, spec.mouth.y + R * 0.18, R * 0.7), n: new THREE.Vector3(sx * 0.5, -0.2, 1).normalize() });
      }
      const mus = new THREE.Mesh(
        hairCards(mRoots, { len: () => spec.beard.len * 0.5 * spec.beard.mustache, width: R * 0.09 * spec.beard.width, gravity: 0.8, curl: 0.8, segs: 4, seed: 33 }),
        bmat,
      );
      head.add(mus);
    }
  }

  // Hat
  if (spec.hat) buildHat(spec, head, mats);
}

function buildHat(spec: Spec, head: THREE.Group, mats: THREE.Material[]) {
  const R = spec.head.r;
  const h = spec.hat!;
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: h.color, roughness: 0.85 });
  mats.push(mat);
  // soft cap: a drooping cone made from a sweep
  const H = h.height + R;
  const pts: THREE.Vector3[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const droop = h.droop;
    const bend = Math.pow(u, 1.5);
    pts.push(new THREE.Vector3(h.side * bend * R * 3 + Math.sin(u * 3) * droop * R * bend, R * 0.5 + u * H, -droop * bend * R * 2.2 - Math.sin(u * 2) * droop * R * 0.5 * bend));
  }
  if (h.flat) {
    // Dopey's floppy flat cap: wider, shorter
    pts.length = 0;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push(new THREE.Vector3(h.side * R, R * 0.55 + u * (R * 0.5), -u * u * R * 1.4));
    }
  }
  const geo = sweep(pts, (u) => lerp(R * 1.02, R * 0.04, u) * (h.flat ? 1.1 : 1), 20, 24, true);
  const cap = new THREE.Mesh(geo, mat);
  cap.castShadow = true;
  grp.add(cap);
  // cuff
  const cuffMat = new THREE.MeshStandardMaterial({ color: h.cuff, roughness: 0.8 });
  mats.push(cuffMat);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * 0.14, 10, 28), cuffMat);
  cuff.rotation.x = Math.PI / 2;
  cuff.scale.set(1, 1.15, 1);
  cuff.position.y = R * 0.5;
  grp.add(cuff);
  grp.position.y = R * 0.1;
  head.add(grp);
}

export function buildCharacter(spec: Spec, shared: Shared): Rig {
  const mats: THREE.Material[] = [];
  const b = spec.body;
  const root = new THREE.Group();
  root.name = spec.id;

  const hipY = b.legLen + b.footH;
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: spec.skin, roughness: 0.6 });
  mats.push(skinMat);
  const tunicMat = new THREE.MeshStandardMaterial({ color: spec.clothes.tunic, roughness: 0.82 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: spec.clothes.sleeve, roughness: 0.82 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: spec.clothes.pants, roughness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: spec.clothes.boots, roughness: 0.7 });
  const beltMat = new THREE.MeshStandardMaterial({ color: spec.clothes.belt, roughness: 0.5, metalness: 0.1 });
  mats.push(tunicMat, sleeveMat, pantsMat, bootMat, beltMat);

  // ---- Torso ----
  const spine = new THREE.Group();
  spine.position.y = 0.02;
  hips.add(spine);
  const chest = new THREE.Group();
  chest.position.y = b.torso * 0.62;
  spine.add(chest);

  // pelvis mesh
  const pelvisGeo = taperedCapsule(b.torso * 0.4, b.hipW * 1.4, b.chestW * 0.6, 18);
  const pelvis = new THREE.Mesh(pelvisGeo, spec.princess ? tunicMat : pantsMat);
  pelvis.scale.z = (b.chestD / b.chestW) * 1.1;
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  hips.add(pelvis);
  // torso mesh on chest
  const torsoGeo = taperedCapsule(b.torso * 0.66, b.chestW * 0.62, b.chestW * 0.52, 20);
  const torso = new THREE.Mesh(torsoGeo, tunicMat);
  torso.scale.set(1.08, 1, b.chestD / b.chestW);
  // belly bulge
  if (b.belly > 0) {
    const belly = new THREE.Mesh(new THREE.SphereGeometry(b.belly + b.chestW * 0.5, 20, 16), tunicMat);
    belly.scale.set(1.15, 0.9, 0.9 * (b.chestD / b.chestW) + 0.3);
    belly.position.set(0, -b.torso * 0.28, b.chestD * 0.5);
    hips.add(belly);
    belly.castShadow = true;
  }
  torso.position.y = -b.torso * 0.1;
  torso.castShadow = true;
  torso.receiveShadow = true;
  chest.add(torso);

  // collar / tunic trim
  if (spec.clothes.collar) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(b.chestW * 0.42, b.chestW * 0.1, 10, 24), new THREE.MeshStandardMaterial({ color: spec.clothes.collar, roughness: 0.6 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = b.torso * 0.34;
    collar.scale.z = 0.8;
    chest.add(collar);
  }
  // belt
  const belt = new THREE.Mesh(new THREE.TorusGeometry(b.chestW * 0.5, 0.022, 8, 28), beltMat);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.05, 1, b.chestD / b.chestW);
  belt.position.y = -b.torso * 0.02;
  spine.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.7, roughness: 0.3 }));
  buckle.position.set(0, -b.torso * 0.02, b.chestD * 0.56);
  spine.add(buckle);

  // ---- Neck + head ----
  const neck = new THREE.Group();
  neck.position.y = b.torso * 0.38;
  chest.add(neck);
  const neckMesh = new THREE.Mesh(limbGeometry(b.neck + 0.03, b.chestW * 0.3, b.chestW * 0.26, 0.02, 12), skinMat);
  neckMesh.position.y = b.neck;
  neckMesh.rotation.x = Math.PI;
  neck.add(neckMesh);
  const headTilt = new THREE.Group();
  headTilt.position.y = b.neck + 0.02;
  neck.add(headTilt);
  const { grp: headMesh, face, eyes } = headGroup(spec, shared, mats);
  headTilt.add(headMesh);
  const hairSwing = (headMesh.userData as any).hairSwing || { value: new THREE.Vector3() };
  const beardSwing = (headMesh.userData as any).beardSwing || { value: new THREE.Vector3() };

  // ---- Arms ----
  const shoulderY = b.torso * 0.3;
  const shoulderX = b.chestW * 0.56;
  const mkArm = (sx: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * shoulderX, shoulderY, 0);
    chest.add(shoulder);
    // shoulder pad
    const pad = new THREE.Mesh(new THREE.SphereGeometry(b.limbR * 1.5, 12, 10), sleeveMat);
    shoulder.add(pad);
    const upper = new THREE.Group();
    shoulder.add(upper);
    const uMesh = new THREE.Mesh(limbGeometry(b.upperArm, b.limbR * 1.1, b.limbR * 0.9, 0.12, 14), sleeveMat);
    uMesh.position.y = -b.upperArm / 2;
    uMesh.castShadow = true;
    upper.add(uMesh);
    const fore = new THREE.Group();
    fore.position.y = -b.upperArm;
    upper.add(fore);
    const isBareForearm = spec.princess; // puffy sleeve ends above elbow
    const fMesh = new THREE.Mesh(limbGeometry(b.foreArm, b.limbR * 0.9, b.limbR * 0.78, 0.1, 14), isBareForearm ? skinMat : sleeveMat);
    fMesh.position.y = -b.foreArm / 2;
    fMesh.castShadow = true;
    fore.add(fMesh);
    if (spec.princess) {
      // puff sleeve cap at shoulder
      const puff = new THREE.Mesh(new THREE.SphereGeometry(b.limbR * 2.1, 16, 12), tunicMat);
      puff.scale.set(1, 1.1, 1);
      puff.position.y = -b.upperArm * 0.25;
      upper.add(puff);
    }
    const wrist = new THREE.Group();
    wrist.position.y = -b.foreArm;
    fore.add(wrist);
    const hand = buildHand(b.hand, skinMat, spec.id === 'dopey' ? sleeveMat : undefined, b.belly > 0.06 || !spec.princess ? 1.25 : 1);
    hand.root.position.y = 0;
    wrist.add(hand.root);
    return { shoulder, upper, fore, wrist, hand };
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // ---- Legs ----
  const hipX = b.hipW;
  const mkLeg = (sx: number) => {
    const thigh = new THREE.Group();
    thigh.position.set(sx * hipX, -b.torso * 0.16, 0);
    hips.add(thigh);
    const legMat = spec.princess ? tunicMat : pantsMat; // princess skirt hides legs anyway
    const tMesh = new THREE.Mesh(limbGeometry(b.legLen * 0.52, b.limbR * 1.3, b.limbR * 1.0, 0.14, 14), legMat);
    tMesh.position.y = -b.legLen * 0.26;
    tMesh.castShadow = true;
    thigh.add(tMesh);
    const shin = new THREE.Group();
    shin.position.y = -b.legLen * 0.52;
    thigh.add(shin);
    const sMesh = new THREE.Mesh(limbGeometry(b.legLen * 0.48, b.limbR * 1.0, b.limbR * 0.7, 0.12, 14), spec.princess ? tunicMat : bootMat);
    sMesh.position.y = -b.legLen * 0.24;
    sMesh.castShadow = true;
    shin.add(sMesh);
    const foot = new THREE.Group();
    foot.position.y = -b.legLen * 0.48;
    shin.add(foot);
    // boot
    const bootGeo = new THREE.SphereGeometry(1, 16, 12);
    const bp = bootGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bp.count; i++) {
      let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      z = z * 0.5 + 0.5; // forward bias
      bp.setXYZ(i, x * b.limbR * 1.1, (y * 0.5 - 0.5) * b.footH * 2 + b.footH, (z) * b.footLen + (z > 0.6 ? 0.02 : 0));
    }
    bootGeo.computeVertexNormals();
    const bootMesh = new THREE.Mesh(bootGeo, bootMat);
    bootMesh.position.set(0, -b.footH, -b.footLen * 0.15);
    bootMesh.castShadow = true;
    bootMesh.receiveShadow = true;
    foot.add(bootMesh);
    return { thigh, shin, foot };
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // ---- Skirt (princess) ----
  let skirt: SkirtRig | undefined;
  if (spec.princess) {
    skirt = buildSkirt(spec, hips, mats);
  } else {
    // dwarf tunic skirt flare
    const flareGeo = taperedCapsule(spec.clothes.tunicLen + 0.02, b.chestW * 0.56, b.chestW * 0.7 * (spec.clothes.baggy ?? 1), 20);
    const flare = new THREE.Mesh(flareGeo, tunicMat);
    flare.scale.set(1.05 * (spec.clothes.baggy ?? 1), -1, (b.chestD / b.chestW) * 1.05 * (spec.clothes.baggy ?? 1));
    flare.position.y = -b.torso * 0.02;
    flare.castShadow = true;
    spine.add(flare);
  }

  poseHand(armL.hand, 0);
  poseHand(armR.hand, 0);

  const rig: Rig = {
    spec, root, hips, spine, chest, neck, head: headMesh, headTilt,
    shoulderL: armL.shoulder, shoulderR: armR.shoulder,
    upperArmL: armL.upper, upperArmR: armR.upper,
    foreArmL: armL.fore, foreArmR: armR.fore,
    wristL: armL.wrist, wristR: armR.wrist,
    handL: armL.hand, handR: armR.hand,
    thighL: legL.thigh, thighR: legR.thigh,
    shinL: legL.shin, shinR: legR.shin,
    footL: legL.foot, footR: legR.foot,
    lengths: { upperArm: b.upperArm, foreArm: b.foreArm, thigh: b.legLen * 0.52, shin: b.legLen * 0.48, hipY, shoulderY, shoulderX, hipX },
    face, skirt, eyes, hairSwing, beardSwing, materials: mats,
    hemWorldY: () => root.position.y,
  };
  return rig;
}

function buildSkirt(spec: Spec, hips: THREE.Group, mats: THREE.Material[]): SkirtRig {
  const b = spec.body;
  const topR = b.hipW * 1.5;
  const botR = b.hipW * 4.6;
  const H = b.legLen + 0.03;
  const RINGS = 14, SEG = 28;
  const rings: { y: number; rest: THREE.Vector3[] }[] = [];
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < RINGS; i++) {
    const v = i / (RINGS - 1);
    const y = -v * H;
    const r = lerp(topR, botR, Math.pow(v, 1.3));
    const rest: THREE.Vector3[] = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const rr = r * (1 + Math.sin(a * 6) * 0.015 * v);
      const p = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr * 1.05);
      rest.push(p);
      pos.push(p.x, p.y, p.z);
      uv.push(j / SEG, v);
    }
    rings.push({ y, rest });
  }
  for (let i = 0; i < RINGS - 1; i++)
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j, b2 = i * SEG + ((j + 1) % SEG), c = (i + 1) * SEG + j, d = (i + 1) * SEG + ((j + 1) % SEG);
      idx.push(a, c, b2, b2, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: spec.clothes.pants, roughness: 0.78, side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uWet = (mat.userData.uWet = { value: 0 });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vV;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvV = uv.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet;\nvarying float vV;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat wet = smoothstep(1.0-uWet, 1.0-uWet+0.02, vV);\ndiffuseColor.rgb *= mix(1.0, 0.5, wet);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.2, wet);');
  };
  mats.push(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = -b.torso * 0.14;
  hips.add(mesh);

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  // velocity-lagged cloth: each ring lags the hip motion and swings
  const prevHip = new THREE.Vector3();
  let inited = false;
  const update = (hipsWorld: THREE.Matrix4, vel: THREE.Vector3, t: number, wet: number) => {
    if (mat.userData.uWet) mat.userData.uWet.value = wet;
    const localVel = vel.clone();
    for (let i = 0; i < RINGS; i++) {
      const v = i / (RINGS - 1);
      const lag = Math.pow(v, 1.4);
      const ring = rings[i];
      for (let j = 0; j < SEG; j++) {
        const rp = ring.rest[j];
        // swing opposite to horizontal velocity, more at the hem
        const swingX = -localVel.x * lag * 2.2;
        const swingZ = -localVel.z * lag * 2.2;
        const flutter = Math.sin(t * 3 + j * 0.7 + i) * 0.004 * lag + vnoise3(j * 0.3, i * 0.4, t) * 0.01 * lag;
        const k = i * SEG + j;
        // legs push the front of the skirt
        posAttr.setXYZ(k, rp.x + swingX + flutter, rp.y + Math.abs(localVel.length()) * lag * 0.02, rp.z + swingZ + flutter * 0.6);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    void prevHip; void inited; void hipsWorld;
  };
  return { mesh, rings, update };
}
