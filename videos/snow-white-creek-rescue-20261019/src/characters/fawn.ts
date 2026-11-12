// Fawn: a small deer with its own rig and behaviour.
import * as THREE from 'three';
import { sweep } from './parts';
import { clamp, lerp, mulberry32, ring, smoother, track, vnoise3, window01, wobble } from '../engine/math';
import { B } from '../anim/story';
import { ROCK_TOP } from '../world/props';
import { LAYOUT, terrainHeight } from '../world/layout';

export type FawnRig = {
  root: THREE.Group;
  body: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  earL: THREE.Group;
  earR: THREE.Group;
  tail: THREE.Group;
  legs: { hip: THREE.Group; knee: THREE.Group; foot: THREE.Group; rest: THREE.Vector3; fr: boolean }[];
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  materials: THREE.Material[];
};

export function buildFawn(coat: THREE.Texture, shared: { uTime: { value: number } }): FawnRig {
  void shared;
  const mats: THREE.Material[] = [];
  const root = new THREE.Group();
  root.name = 'fawn';
  const S = 1;
  const coatMat = new THREE.MeshStandardMaterial({ map: coat, roughness: 0.75, color: '#c98a52' });
  coatMat.map!.wrapS = coatMat.map!.wrapT = THREE.RepeatWrapping;
  mats.push(coatMat);

  // body as a sweep along the spine
  const body = new THREE.Group();
  body.position.y = 0.5 * S;
  root.add(body);
  const spinePts = [
    new THREE.Vector3(0, 0, -0.26),
    new THREE.Vector3(0, 0.03, -0.1),
    new THREE.Vector3(0, 0.05, 0.08),
    new THREE.Vector3(0, 0.02, 0.24),
  ];
  const bodyGeo = sweep(spinePts, (u) => lerp(0.1, 0.14, Math.sin(u * Math.PI)) * S, 16, 20, true);
  const bodyMesh = new THREE.Mesh(bodyGeo, coatMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  body.add(bodyMesh);
  // chest/haunch fill
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.15 * S, 16, 12), coatMat);
  haunch.scale.set(1, 1.1, 1.2);
  haunch.position.set(0, 0, -0.2 * S);
  body.add(haunch);

  // neck + head
  const neck = new THREE.Group();
  neck.position.set(0, 0.06 * S, 0.22 * S);
  body.add(neck);
  const neckMesh = new THREE.Mesh(sweep([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1 * S, 0.06 * S), new THREE.Vector3(0, 0.2 * S, 0.1 * S)], (u) => lerp(0.075, 0.05, u) * S, 12, 10, true), coatMat);
  neckMesh.castShadow = true;
  neck.add(neckMesh);
  const head = new THREE.Group();
  head.position.set(0, 0.2 * S, 0.1 * S);
  neck.add(head);
  const skullGeo = new THREE.SphereGeometry(0.075 * S, 16, 14);
  skullGeo.scale(0.85, 0.95, 1.1);
  const skull = new THREE.Mesh(skullGeo, coatMat);
  skull.castShadow = true;
  head.add(skull);
  // muzzle
  const muzzle = new THREE.Mesh(sweep([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.01 * S, 0.06 * S), new THREE.Vector3(0, -0.02 * S, 0.11 * S)], (u) => lerp(0.05, 0.028, u) * S, 10, 8, true), coatMat);
  muzzle.position.set(0, -0.01 * S, 0.05 * S);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018 * S, 10, 8), new THREE.MeshStandardMaterial({ color: '#1a1012', roughness: 0.4 }));
  nose.position.set(0, -0.02 * S, 0.16 * S);
  head.add(nose);
  // eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.15 });
  mats.push(eyeMat);
  const lids: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02 * S, 12, 10), eyeMat);
    eye.position.set(sx * 0.05 * S, 0.02 * S, 0.07 * S);
    head.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.006 * S, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(sx * 0.05 * S - 0.006, 0.028 * S, 0.085 * S);
    head.add(hl);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.022 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), coatMat);
    lid.position.copy(eye.position);
    lid.rotation.x = -Math.PI * 0.5;
    head.add(lid);
    lids.push(lid);
  }
  // ears
  const mkEar = (sx: number) => {
    const g = new THREE.Group();
    const earGeo = new THREE.SphereGeometry(0.05 * S, 10, 10);
    earGeo.scale(0.5, 1.3, 0.3);
    const e = new THREE.Mesh(earGeo, coatMat);
    e.castShadow = true;
    const inner = new THREE.Mesh(earGeo.clone().scale(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: '#e8b89a', roughness: 0.8 }));
    inner.position.z = 0.01 * S;
    e.add(inner);
    g.add(e);
    g.position.set(sx * 0.055 * S, 0.06 * S, -0.01 * S);
    g.rotation.z = sx * 0.5;
    g.rotation.y = sx * -0.3;
    head.add(g);
    return g;
  };
  const earL = mkEar(-1), earR = mkEar(1);

  // tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.02 * S, -0.28 * S);
  body.add(tail);
  const tailMesh = new THREE.Mesh(sweep([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.03 * S, -0.04 * S), new THREE.Vector3(0, -0.06 * S, -0.05 * S)], (u) => lerp(0.03, 0.015, u) * S, 8, 6, true), coatMat);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.025 * S, 8, 8), new THREE.MeshStandardMaterial({ color: '#f2ead8', roughness: 0.8 }));
  tailTip.position.set(0, -0.06 * S, -0.05 * S);
  tail.add(tailMesh);
  tail.add(tailTip);

  // legs: 4 two-segment legs
  const legs: FawnRig['legs'] = [];
  const legDefs: [number, number, boolean][] = [
    [0.09, 0.19, true], // front right
    [-0.09, 0.19, true], // front left
    [0.1, -0.2, false], // back right
    [-0.1, -0.2, false], // back left
  ];
  for (const [lx, lz, fr] of legDefs) {
    const hip = new THREE.Group();
    hip.position.set(lx * S, -0.02 * S, lz * S);
    body.add(hip);
    const upperLen = 0.2 * S;
    const upper = new THREE.Mesh(sweep([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -upperLen, fr ? 0.01 : -0.01)], (u) => lerp(0.035, 0.022, u) * S, 8, 6, true), coatMat);
    upper.castShadow = true;
    hip.add(upper);
    const knee = new THREE.Group();
    knee.position.y = -upperLen;
    hip.add(knee);
    const shinLen = 0.26 * S;
    const shin = new THREE.Mesh(sweep([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -shinLen, fr ? -0.02 : 0.02)], (u) => lerp(0.022, 0.012, u) * S, 8, 6, true), coatMat);
    shin.castShadow = true;
    knee.add(shin);
    const foot = new THREE.Group();
    foot.position.y = -shinLen;
    knee.add(foot);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.02 * S, 8, 8), new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.5 }));
    hoof.scale.set(1, 1.3, 1.2);
    foot.add(hoof);
    const worldRest = new THREE.Vector3(lx * S, 0, lz * S);
    legs.push({ hip, knee, foot, rest: worldRest, fr });
  }

  return { root, body, neck, head, earL, earR, tail, legs, lidL: lids[0], lidR: lids[1], materials: mats };
}

const FAWN_SCALE = 0.84;

/** Fawn behaviour over time. Writes transforms directly. carryAnchor is Snow's arm cradle (world) when carried. */
export function driveFawn(
  f: FawnRig,
  t: number,
  carryAnchor: THREE.Vector3 | null,
  carryYaw: number,
  bashfulHand: THREE.Vector3 | null,
) {
  const rockTop = new THREE.Vector3(LAYOUT.rock.x, ROCK_TOP, LAYOUT.rock.z);
  const lifted = window01(t, B.liftFawn, B.liftFawn + 1.0);
  const down = window01(t, B.fawnDown, B.fawnDown + 0.8);

  // base position
  let pos: THREE.Vector3;
  let yaw: number;
  let legsPlanted = true;
  if (t < B.liftFawn) {
    pos = rockTop.clone();
    yaw = Math.atan2(0.3, 0.6); // facing roughly toward Snow / downstream
    // nervous back-step at fawnBack
    const back = ring(t, B.fawnBack, 1.2, 1.5) * 0.04;
    pos.x += back;
    pos.z += back * 0.5;
  } else if (carryAnchor && t < B.fawnDown) {
    // carried in Snow's arms: cradled body centred in her arms
    pos = carryAnchor.clone();
    pos.y -= 0.5 * FAWN_SCALE;
    yaw = carryYaw + 0.55;
    legsPlanted = false;
  } else {
    // on the bank near Bashful
    const bank = new THREE.Vector3(0.35, terrainHeight(0.35, 4.4), 4.4);
    pos = rockTop.clone().lerp(bank, down);
    yaw = lerp(Math.atan2(0.3, 0.6), Math.atan2(0.4, -0.2), down);
    if (t > B.fawnDown + 0.5) legsPlanted = true;
  }
  f.root.scale.setScalar(FAWN_SCALE);
  f.root.position.copy(pos);
  const carriedNow = !!carryAnchor && t >= B.liftFawn && t < B.fawnDown;
  if (carriedNow) f.root.rotation.set(0.3, yaw, 0.55, 'YXZ');
  else f.root.rotation.set(0, yaw, 0);

  // trembling before rescue
  const fear = (1 - window01(t, B.carryStart, B.bankStep)) * (t > 10 ? 1 : 0) * (t < B.fawnDown ? 1 : 0.2);
  const tremble = fear * 0.004;
  f.body.position.y = 0.5 + Math.sin(t * 30) * tremble + (carryAnchor && t > B.liftFawn && t < B.fawnDown ? 0 : 0);
  f.body.rotation.z = Math.sin(t * 27) * tremble * 2 + (lifted - down) * 0.2;

  // breathing fast when scared
  const breath = Math.sin(t * (fear > 0.3 ? 9 : 3)) * 0.01;
  f.body.scale.setScalar(1 + breath * (0.5 + fear));

  // head: look toward Snow, then toward Bashful's apple, bleat moments
  const head = f.head;
  let lookPitch = 0.1 + Math.sin(t * 2) * 0.03;
  let lookYaw = wobble(t, 2, 0.5) * 0.2;
  // bleats: head up
  const bleat = ring(t, B.bleat1, 2, 4) + ring(t, B.bleat2, 2, 4) + ring(t, 19.6, 2, 5);
  lookPitch -= bleat * 0.3;
  // look toward Bashful when he soothes
  if (t > B.bashfulLine && t < B.liftFawn && bashfulHand) {
    const toB = bashfulHand.clone().sub(head.getWorldPosition(new THREE.Vector3()));
    lookYaw = lerp(lookYaw, Math.atan2(toB.x, toB.z) - yaw, window01(t, B.bashfulLine, B.fawnLooks));
    lookPitch = lerp(lookPitch, 0.3, window01(t, B.fawnLooks, B.fawnLooks + 1));
  }
  // nuzzle Bashful's hand at the end
  if (t > B.nuzzle && bashfulHand) {
    const n = window01(t, B.nuzzle, B.nuzzle + 1.2) * (1 - window01(t, B.nuzzle + 2, B.nuzzle + 3));
    lookPitch = lerp(lookPitch, 0.5, n);
    lookYaw = lerp(lookYaw, 0, n);
  }
  head.rotation.set(lookPitch, lookYaw, Math.sin(t * 2.3) * 0.02, 'YXZ');
  f.neck.rotation.set(lookPitch * 0.4, lookYaw * 0.4, 0, 'YXZ');

  // ears flick
  f.earL.rotation.z = 0.5 + Math.sin(t * 4 + 1) * 0.15 + bleat * 0.2;
  f.earR.rotation.z = -0.5 - Math.sin(t * 4) * 0.15 - bleat * 0.2;
  f.earL.rotation.x = wobble(t, 5, 1) * 0.3;
  f.earR.rotation.x = wobble(t, 6, 1) * 0.3;

  // tail flick
  f.tail.rotation.x = Math.sin(t * 3) * 0.2 + fear * 0.3;
  f.tail.rotation.z = Math.sin(t * 5) * 0.15;

  // blink
  const blinkPhase = (t * 0.7) % 3.1;
  const blink = blinkPhase < 0.12 ? Math.sin((blinkPhase / 0.12) * Math.PI) : 0;
  f.lidL.rotation.x = -Math.PI * 0.5 + blink * Math.PI * 0.5;
  f.lidR.rotation.x = -Math.PI * 0.5 + blink * Math.PI * 0.5;

  // legs
  for (const leg of f.legs) {
    if (!legsPlanted) {
      // tucked while carried
      leg.hip.rotation.x = leg.fr ? 0.9 : -0.9;
      leg.knee.rotation.x = leg.fr ? -1.6 : 1.6;
      continue;
    }
    // stand with slight tremble; plant feet on the ground/rock
    const standBend = leg.fr ? 0.08 : -0.06;
    leg.hip.rotation.x = standBend + Math.sin(t * 30 + leg.rest.x) * tremble * 3;
    leg.knee.rotation.x = leg.fr ? -0.18 : 0.2;
    leg.foot.rotation.x = leg.fr ? 0.1 : -0.14;
  }
  void smoother; void track; void vnoise3; void clamp;
}
