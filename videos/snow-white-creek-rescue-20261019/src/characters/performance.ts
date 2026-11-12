// Director: produces and applies per-frame poses for all characters + fawn, and exposes shared rig-derived data (rope, cradle).
import * as THREE from 'three';
import { GlbRig as Rig, applyGlb as applyState } from './glbRig';
import { CharId, SPECS } from './specs';
import { CharState, neutralFace } from './state';
import { Activity, Blocking, buildBlocking, DEER_ROCK, KNOT_POS, STANCE } from './staging';
import { GroundPath, Locomotor, driveLocomotion, idlePose, lerpAngle, makeLocomotor } from './locomotion';
import { clamp, lerp, pulse, ring, smoother, track, window01, wobble } from '../engine/math';
import { terrainHeight, LAYOUT } from '../world/layout';
import { B, KNOT_S, logPoint, logSAtZ } from '../anim/story';
import { FawnRig, driveFawn } from './fawn';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function freshState(): CharState {
  return {
    visible: true,
    pos: V(),
    yaw: 0,
    hipsDrop: 0,
    hipsPitch: 0,
    hipsRoll: 0,
    hipsYaw: 0,
    hipsShift: V(),
    spinePitch: 0,
    spineYaw: 0,
    spineRoll: 0,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    lookW: 0,
    handL: { pos: V(), grip: 0.15 },
    handR: { pos: V(), grip: 0.15 },
    footL: { pos: V(), yaw: 0, pitch: 0 },
    footR: { pos: V(), yaw: 0, pitch: 0 },
    face: neutralFace(),
    shake: 0,
    swing: V(),
    wetHem: 0,
  };
}

const DWARF_ORDER: CharId[] = ['doc', 'grumpy', 'happy', 'sleepy', 'sneezy', 'dopey'];

export class Director {
  rigs: Record<CharId, Rig>;
  fawn: FawnRig;
  blocking: Record<CharId, Blocking>;
  locos: Map<Activity, Locomotor> = new Map();
  prevPos: Map<CharId, THREE.Vector3> = new Map();
  ropePoints: THREE.Vector3[] = [];
  ropeSlide = 0;
  ropeVisible = false;
  cradle: THREE.Vector3 = V();
  bashfulHand: THREE.Vector3 = V();
  private pullLine: { a: THREE.Vector3; b: THREE.Vector3 };

  constructor(rigs: Record<CharId, Rig>, fawn: FawnRig) {
    this.rigs = rigs;
    this.fawn = fawn;
    this.blocking = buildBlocking();
    for (const id of Object.keys(this.blocking) as CharId[]) {
      for (const a of this.blocking[id].acts) {
        if (a.kind === 'walk') this.locos.set(a, makeLocomotor(a.path, SPECS[id], a.t0, a.t1));
      }
    }
    const tree = LAYOUT.anchorTree.clone();
    tree.y = 0;
    this.pullLine = { a: KNOT_POS.clone(), b: tree };
  }

  private activityAt(id: CharId, t: number): Activity {
    const b = this.blocking[id];
    let cur = b.acts[0];
    for (const a of b.acts) if (t >= a.t0) cur = a;
    return cur;
  }

  private base(id: CharId, t: number, st: CharState) {
    const act = this.activityAt(id, t);
    const spec = SPECS[id];
    if (act.kind === 'walk') {
      const loco = this.locos.get(act)!;
      driveLocomotion(loco, spec, st, clamp(t, act.t0, act.t1));
    } else {
      st.pos.set(act.pos.x, terrainHeight(act.pos.x, act.pos.z), act.pos.z);
      st.yaw = act.face;
      // relaxed arms at sides
      restArms(st, spec);
      idlePose(st, spec, t, id.charCodeAt(0));
    }
  }

  /** compute pull exertion + rhythmic tug + slip */
  private pullDynamics(t: number) {
    const engaged = window01(t, B.knotDone - 0.5, B.pull1) * (1 - window01(t, B.carryStart + 0.5, B.carryStart + 1.5));
    // rhythmic tugs at pull1..pull3 and repull
    let tug = 0;
    for (const bt of [B.pull1, B.pull2, B.pull3, B.repull, B.repull + 2, B.repull + 3.6]) tug += Math.max(0, Math.sin((t - bt) * 3.2)) * Math.exp(-Math.abs(t - bt) * 1.2) * (t > bt - 0.3 ? 1 : 0);
    tug = clamp(tug, 0, 1);
    const slip = pulse(t, B.slip, B.grab, 0.08);
    const exert = clamp(engaged + tug * 0.4 + slip * 0.5);
    return { engaged, tug, slip, exert };
  }

  /** world grip point on the rope for a pulling dwarf */
  private ropeGrip(id: CharId, t: number): { grip: THREE.Vector3; lean: number } {
    const stance = STANCE[id].clone();
    const { a, b } = this.pullLine;
    const ab = b.clone().sub(a);
    const len = ab.length();
    const dir = ab.clone().normalize();
    const u = clamp(stance.clone().sub(a).dot(dir) / len, 0.05, 0.95);
    const onLine = a.clone().addScaledVector(dir, u * len);
    const { tug, slip, engaged } = this.pullDynamics(t);
    // chest height grip, pulled slightly back toward the dwarf on tug
    const grip = onLine.clone();
    grip.y = terrainHeight(stance.x, stance.z) + SPECS[id].body.legLen + SPECS[id].body.footH + SPECS[id].body.torso * 0.5;
    // rope slides downstream during slip (toward +x / knot side)
    const slideBack = slip * 0.35 - tug * 0.08 * engaged;
    grip.addScaledVector(dir, slideBack);
    // hands held in front of the body toward the rope
    const toRope = onLine.clone().sub(stance).setY(0).normalize();
    grip.addScaledVector(toRope, 0.12);
    return { grip, lean: engaged };
  }

  private computeRope(t: number) {
    const tied = t >= B.knotDone - 0.3;
    this.ropeVisible = tied && t < B.carryStart + 1.2 || (t >= B.knotStart - 0.3 && t < B.knotDone);
    if (!this.ropeVisible) {
      this.ropePoints = [];
      return;
    }
    // knot on the log
    const knot = logPoint(t, KNOT_S, 1, 0);
    const pts: { u: number; p: THREE.Vector3 }[] = [];
    const { a, b } = this.pullLine;
    const dir = b.clone().sub(a).normalize();
    const len = b.distanceTo(a);
    for (const id of DWARF_ORDER) {
      if (id === 'dopey' && t < B.ropeArrive) continue;
      if (id === 'sleepy') continue; // sleepy braces at the tree, past the line
      const arrive = this.dwarfStanceTime(id);
      if (t < arrive) continue;
      const g = this.ropeGrip(id, t);
      const u = clamp(g.grip.clone().sub(a).dot(dir) / len, 0, 1);
      pts.push({ u, p: g.grip });
    }
    pts.sort((p, q) => q.u - p.u); // from knot (far from tree, high u? ) adjust
    const tree = this.pullLine.b.clone();
    tree.y = SPECS.sleepy.body.legLen + 0.15;
    this.ropePoints = [knot, ...pts.map((p) => p.p), tree];
    this.ropeSlide = this.pullDynamics(t).slip * 0.4;
  }

  private dwarfStanceTime(id: CharId): number {
    const b = this.blocking[id];
    for (const a of b.acts) if (a.kind === 'stand' && a.t0 > 20 && a.t0 < 75) return a.t0;
    return 99;
  }

  update(t: number) {
    // Snow first (fawn cradle depends on her arms)
    this.poseSnow(t);
    for (const id of DWARF_ORDER) this.poseDwarf(id, t);
    this.poseBashful(t);
    this.computeRope(t);
    // fawn: carried between liftFawn and fawnDown
    const carried = t >= B.liftFawn && t < B.fawnDown;
    driveFawn(this.fawn, t, carried ? this.cradle : null, this.rigs.snow.root.rotation.y, this.bashfulHand);
  }

  private poseSnow(t: number) {
    const rig = this.rigs.snow;
    const spec = SPECS.snow;
    const st = freshState();
    this.currentState = st;
    this.base('snow', t, st);

    // ---- stand/walk on the log surface (26..74): lift her off the creek bed onto the trunk top ----
    if (t > 25.6 && t < 74.4) {
      const s = clamp(logSAtZ(t, st.pos.z), 0.02, 0.98);
      const top = logPoint(t, s, 1);
      const onLog = window01(t, 25.6, 26.4) * (1 - window01(t, 73.8, 74.4));
      st.pos.y = lerp(st.pos.y, top.y + 0.02, onLog);
      st.pos.x = lerp(st.pos.x, top.x, onLog * 0.9);
      // feet straddle the trunk, careful alternating steps as she advances
      const spd = this.prevPos.get('snow') ? st.pos.distanceTo(this.prevPos.get('snow')!) * 30 : 0;
      const phase = (st.pos.z * 1.6) % 1;
      const side = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
      const fwd = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
      for (const L of [true, false]) {
        const ph = L ? phase : (phase + 0.5) % 1;
        const lift = Math.max(0, Math.sin(ph * Math.PI)) * clamp(spd) * 0.05;
        const along = (L ? 0.06 : -0.06) + Math.sin(ph * Math.PI * 2) * clamp(spd) * 0.08;
        const sTop = logPoint(t, clamp(s + along / 8, 0.02, 0.98), 1);
        const fp = sTop.clone().addScaledVector(side, (L ? -1 : 1) * 0.05).add(V(0, lift, 0));
        const fs = L ? st.footL : st.footR;
        fs.pos.lerp(fp, onLog);
        fs.yaw = st.yaw;
        fs.pitch = 0.05;
        void fwd;
      }
      st.hipsRoll += Math.sin(t * 1.3) * 0.02 * onLog;
      st.spinePitch += 0.04 * onLog;
    }

    // wet hem
    st.wetHem = track([[25, 0], [30.2, 0.08], [58.3, 0.16], [60, 0.28], [90, 0.3]], t);

    // face: gentle, attentive; concern during danger; relief at the end
    const f = st.face;
    f.smile = track([[0, 0.3], [11, 0.25], [11.6, 0.05], [22, 0.05], [35, 0.0], [65, 0.0], [75, 0.4], [85, 0.5], [90, 0.5]], t);
    f.browUp = pulse(t, B.swTurn, B.swTurn + 1.5, 0.3) * 0.6 + pulse(t, B.logShift, B.logShift + 1, 0.2) * 0.8;
    f.browSad = window01(t, 14, 19) * (1 - window01(t, 68, 72)) * 0.4;
    f.open = pulse(t, 11.9, 12.6, 0.2) * 0.5 + pulse(t, B.logShift, B.logShift + 0.6, 0.15) * 0.6 + dialogueOpen(t, 'snow');
    f.blink = blink(t, 0.31);
    f.squint = pulse(t, B.logShift, B.logShift + 2, 0.5) * 0.3;
    // look target
    let look: THREE.Vector3 | null = null;
    if (t > B.swTurn && t < 22.5) look = DEER_ROCK.clone().setY(0.5);
    else if (t >= 22.5 && t < B.fawnDown) look = new THREE.Vector3(this.fawn.root.position.x, 0.55, this.fawn.root.position.z);
    else if (t >= B.fawnDown && t < 80) look = this.rigs.bashful.root.position.clone().setY(0.7);
    else if (t >= 80 && t < 85.3) look = this.rigs.dopey.root.position.clone().setY(1.0);
    if (look) {
      st.eyeLook = look.clone();
      const toLook = look.clone().sub(V(st.pos.x, 1.4, st.pos.z));
      const wantYaw = Math.atan2(toLook.x, toLook.z);
      st.headYaw += clamp(lerpAngle(st.yaw, wantYaw, 1) - st.yaw, -0.6, 0.6) * 0.7;
      st.headPitch += clamp(-Math.atan2(toLook.y - 1.4, Math.hypot(toLook.x, toLook.z)), -0.3, 0.4);
    }

    applyState(rig, st, t);

    // --- special arm actions (applied after base so IK uses final body) ---
    // balance on logShift
    const bal = pulse(t, B.logShift, B.logShift + 2.2, 0.4);
    if (bal > 0.01) {
      rig.anchors.chest.updateWorldMatrix(true, true);
      const sh = new THREE.Vector3().setFromMatrixPosition(rig.anchors.chest.matrixWorld);
      const outL = sh.clone().add(V(-0.45, 0.1 + Math.sin(t * 8) * 0.04, -0.1));
      const outR = sh.clone().add(V(0.45, 0.12 - Math.sin(t * 8) * 0.04, 0.1));
      this.setHand(rig, 'L', lerpV(st.handL.pos, outL, bal), 0.1);
      this.setHand(rig, 'R', lerpV(st.handR.pos, outR, bal), 0.1);
      st.hipsRoll += Math.sin(t * 7) * 0.06 * bal;
      applyState(rig, st, t);
    }

    // reach to fawn (58.5 .. lift)
    const reach = window01(t, 58.5, B.liftFawn) * (1 - window01(t, B.liftFawn, B.liftFawn + 0.4));
    const carrying = t >= B.liftFawn && t < B.fawnDown;
    if (reach > 0.01 && !carrying) {
      const fawnP = new THREE.Vector3(this.fawn.root.position.x, 0.55, this.fawn.root.position.z);
      this.setHand(rig, 'R', lerpV(st.handR.pos, fawnP, reach), 0.1);
      this.setHand(rig, 'L', lerpV(st.handL.pos, fawnP.clone().add(V(-0.1, -0.05, 0)), reach * 0.7), 0.1);
      applyState(rig, st, t);
    }
    // cradle the fawn
    if (carrying || (t >= B.fawnDown && t < B.fawnDown + 0.6)) {
      rig.anchors.chest.updateWorldMatrix(true, true);
      const chestW = new THREE.Vector3().setFromMatrixPosition(rig.anchors.chest.matrixWorld);
      const fwd = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
      this.cradle.copy(chestW).addScaledVector(fwd, 0.2).add(V(0, 0.06, 0));
      // both arms wrap under the fawn
      this.setHand(rig, 'L', this.cradle.clone().add(fwd.clone().multiplyScalar(0.0)).add(V(0, 0, 0)).addScaledVector(new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw)), -0.12), 0.5);
      this.setHand(rig, 'R', this.cradle.clone().addScaledVector(new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw)), 0.12), 0.5);
      st.spinePitch += 0.12;
      applyState(rig, st, t);
    } else if (t >= B.liftFawn) {
      // keep cradle updated to hand off
      this.cradle.copy(this.fawn.root.position);
    }

    // give apple to Dopey (handled by props layer reading snow right hand); add offering gesture
    const offer = pulse(t, B.appleGive, B.offer, 0.4);
    if (offer > 0.01) {
      const dopeyP = this.rigs.dopey.root.position.clone();
      const target = dopeyP.clone().add(V(0, 1.0, 0)).lerp(V(st.pos.x, 1.1, st.pos.z), 0.4);
      this.setHand(rig, 'R', lerpV(st.handR.pos, target, offer), 0.4);
      applyState(rig, st, t);
    }

    this.storeSwing('snow', st, t);
  }

  private poseDwarf(id: CharId, t: number) {
    const rig = this.rigs[id];
    const spec = SPECS[id];
    const st = freshState();
    this.currentState = st;
    this.base(id, t, st);
    const f = st.face;
    f.blink = blink(t, 0.3 + id.charCodeAt(0) * 0.0001);

    const arrive = this.dwarfStanceTime(id);
    const pulling = t >= arrive && t < B.carryStart + 0.5 && id !== 'bashful';

    // personality faces
    this.dwarfFace(id, t, st);

    // react to the cry: turn & stop (11.3..13)
    if (t > B.groupStop && t < 20) {
      const toDeer = DEER_ROCK.clone().sub(V(st.pos.x, 1, st.pos.z));
      st.headYaw += clamp(Math.atan2(toDeer.x, toDeer.z) - st.yaw, -0.7, 0.7) * window01(t, B.groupStop, B.groupStop + 0.6);
      st.eyeLook = DEER_ROCK.clone().setY(0.5);
    }

    applyState(rig, st, t);

    // pulling pose
    if (pulling) {
      const { grip } = this.ropeGrip(id, t);
      const { exert, tug, slip } = this.pullDynamics(t);
      // body lean back, brace
      st.spinePitch = -0.25 * exert - 0.1;
      st.hipsPitch = -0.12 * exert;
      const yawToRope = Math.atan2(KNOT_POS.x - st.pos.x, KNOT_POS.z - st.pos.z);
      st.yaw = lerpAngle(st.yaw, yawToRope + Math.PI, 0.0); // keep facing, handled by stance
      // feet brace: back foot planted hard, front foot forward
      this.braceFeet(rig, st, id, exert, t);
      // both hands on the rope
      const handGapV = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw)).multiplyScalar(0.07);
      const pullBack = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw)).multiplyScalar(-(tug * 0.12));
      this.setHand(rig, 'L', grip.clone().sub(handGapV).add(pullBack), 0.95);
      this.setHand(rig, 'R', grip.clone().add(handGapV).add(pullBack).add(V(0, -0.03, 0)), 0.95);
      // Grumpy lunges to grab on slip
      if (id === 'grumpy') {
        const lunge = pulse(t, B.grab, B.grab + 0.8, 0.12);
        if (lunge > 0.01) {
          const lungeP = grip.clone().add(new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw)).multiplyScalar(0.3 * lunge));
          this.setHand(rig, 'R', lungeP, 1);
          this.setHand(rig, 'L', lungeP.add(V(-0.06, 0.02, 0)), 1);
          st.spinePitch -= 0.2 * lunge;
        }
      }
      // slip jolt: everyone lurches downstream
      st.hipsShift.add(new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw)).multiplyScalar(slip * 0.08));
      applyState(rig, st, t);
    }

    // Doc directs (points at log, then tree) 36..43
    if (id === 'doc' && t > B.docSpeaks && t < B.knotDone) {
      const point = pulse(t, B.docSpeaks, B.docSpeaks + 2, 0.3);
      const targetA = logPoint(t, 0.3, 1).setY(0.5);
      const targetB = LAYOUT.anchorTree.clone().setY(1.2);
      const target = t < 38.5 ? targetA : targetB;
      rig.anchors.chest.updateWorldMatrix(true, true);
      const sh = new THREE.Vector3().setFromMatrixPosition(rig.anchors.chest.matrixWorld);
      const dir = target.clone().sub(sh).normalize();
      const handP = sh.clone().addScaledVector(dir, (spec.body.upperArm + spec.body.foreArm) * 0.95);
      this.setHand(rig, 'R', lerpV(st.handR.pos, handP, point), 0.2);
      // adjust glasses with left hand sometimes
      if (t > 35.6 && t < 36.2) this.setHand(rig, 'L', sh.clone().add(V(0.05, 0.45, 0.18)), 0.3);
      applyState(rig, st, t);
    }
    // Grumpy ties knot 43..45.6
    if (id === 'grumpy' && t > B.knotStart && t < B.knotDone) {
      const knotW = logPoint(t, KNOT_S, 1);
      const w = window01(t, B.knotStart, B.knotStart + 0.5) * (1 - window01(t, B.knotDone - 0.4, B.knotDone));
      const wiggle = Math.sin(t * 9) * 0.02;
      this.setHand(rig, 'L', lerpV(st.handL.pos, knotW.clone().add(V(-0.05 + wiggle, 0.02, 0)), w), 0.8);
      this.setHand(rig, 'R', lerpV(st.handR.pos, knotW.clone().add(V(0.05 - wiggle, -0.02, wiggle)), w), 0.8);
      st.spinePitch += 0.3 * w;
      st.hipsDrop -= 0.12 * w; // crouch
      applyState(rig, st, t);
    }
    // Dopey finds & carries rope 36..41.4
    if (id === 'dopey') {
      if (t > 36.5 && t < B.dopeyFind + 0.6) {
        // reach under the cart
        const cartUnder = LAYOUT.cart.clone().add(V(-0.45, terrainHeight(LAYOUT.cart.x, LAYOUT.cart.z) + 0.25, -0.1));
        const w = pulse(t, 37.0, B.dopeyFind + 0.4, 0.3);
        st.hipsDrop -= 0.12 * w;
        this.setHand(rig, 'R', lerpV(st.handR.pos, cartUnder, w), 0.6);
        st.spinePitch += 0.3 * w;
        applyState(rig, st, t);
      } else if (t >= B.dopeyFind + 0.6 && t < B.ropeArrive + 0.5) {
        // carry coil in both hands at belly
        rig.anchors.chest.updateWorldMatrix(true, true);
        const ch = new THREE.Vector3().setFromMatrixPosition(rig.anchors.chest.matrixWorld);
        const fwd = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
        const hold = ch.clone().addScaledVector(fwd, 0.18).add(V(0, -0.12, 0));
        this.setHand(rig, 'L', hold.clone().add(V(-0.08, 0, 0)), 0.7);
        this.setHand(rig, 'R', hold.clone().add(V(0.08, 0, 0)), 0.7);
        applyState(rig, st, t);
      }
    }
    // Sleepy braces at tree root, naps at the end
    if (id === 'sleepy') {
      if (t >= B.sleepyNap) {
        // slump asleep against the tool bag
        st.spinePitch = 0.5;
        st.headPitch = 0.5;
        st.headRoll = 0.3;
        st.hipsDrop = -0.25;
        restArms(st, spec);
        st.face.blink = 1;
        // snore: head bob
        st.headPitch += Math.sin(t * 2) * 0.05;
        applyState(rig, st, t);
      }
    }

    this.storeSwing(id, st, t);
  }

  private poseBashful(t: number) {
    const id: CharId = 'bashful';
    const rig = this.rigs[id];
    const spec = SPECS[id];
    const st = freshState();
    this.currentState = st;
    this.base(id, t, st);
    st.face.blink = blink(t, 0.33);
    this.dwarfFace(id, t, st);

    const arrive = this.dwarfStanceTime(id);
    const soothing = t >= arrive && t < B.liftFawn + 1;
    if (soothing) {
      // crouch low, hold apple out toward the fawn
      st.hipsDrop = -0.18;
      st.spinePitch = 0.2;
      const fawnP = new THREE.Vector3(this.fawn.root.position.x, 0.5, this.fawn.root.position.z);
      const toFawn = fawnP.clone().sub(V(st.pos.x, 0.8, st.pos.z));
      st.yaw = Math.atan2(toFawn.x, toFawn.z);
      st.eyeLook = fawnP.clone();
      st.headYaw = 0;
    }
    applyState(rig, st, t);

    if (soothing) {
      rig.anchors.chest.updateWorldMatrix(true, true);
      const ch = new THREE.Vector3().setFromMatrixPosition(rig.anchors.chest.matrixWorld);
      const fawnP = new THREE.Vector3(this.fawn.root.position.x, 0.6, this.fawn.root.position.z);
      const dir = fawnP.clone().sub(ch).normalize();
      const reach = window01(t, arrive, arrive + 1);
      const handP = ch.clone().addScaledVector(dir, (spec.body.upperArm + spec.body.foreArm) * 0.9 * reach);
      handP.y = lerp(ch.y, 0.5, 0.4);
      this.setHand(rig, 'R', handP, 0.4);
      this.bashfulHand.copy(handP);
      applyState(rig, st, t);
    } else {
      rig.anchors.wristR.updateWorldMatrix(true, false);
      this.bashfulHand.setFromMatrixPosition(rig.anchors.wristR.matrixWorld);
    }
    this.storeSwing(id, st, t);
  }

  private dwarfFace(id: CharId, t: number, st: CharState) {
    const f = st.face;
    const spec = SPECS[id];
    f.open += dialogueOpen(t, id);
    switch (id) {
      case 'doc':
        f.browUp = 0.2 + pulse(t, B.docSpeaks, B.docSpeaks + 2, 0.4) * 0.4;
        f.browIn = window01(t, 30, 36) * 0.4;
        break;
      case 'grumpy':
        f.browAngry = 0.7 - window01(t, B.grumpySmile, B.grumpySmile + 1) * 0.6;
        f.frown = 0.4 - window01(t, B.grumpySmile, B.grumpySmile + 1) * 0.5;
        f.smile = window01(t, B.grumpySmile, B.grumpySmile + 1) * 0.5;
        f.browIn = 0.5;
        break;
      case 'happy':
        f.smile = 0.6 + pulse(t, B.happyLaugh, B.happyLaugh + 1.5, 0.3) * 0.4 + Math.sin(t * 2) * 0.05;
        f.browUp = 0.3;
        st.shake = pulse(t, B.happyLaugh, B.happyLaugh + 1.3, 0.25) * 1 + (t > B.pull1 && t < B.pull3 + 1 ? 0.2 : 0);
        break;
      case 'sleepy':
        f.lid = 0.4 + pulse(t, B.logShift, B.logShift + 3, 0.5) * 0.5 + (t > B.sleepyBrace && t < 68 ? 0.4 : 0);
        f.open = Math.max(f.open, pulse(t, B.yawn, B.yawn + 1.2, 0.3) * 0.8);
        f.browUp = pulse(t, B.yawn, B.yawn + 1, 0.3) * 0.3;
        break;
      case 'bashful':
        f.blush = 0.3 + pulse(t, B.nuzzle, B.nuzzle + 2, 0.5) * 0.6 + pulse(t, B.bashfulLine, B.bashfulLine + 1, 0.4) * 0.3;
        f.smile = 0.2 + window01(t, 75, 78) * 0.4;
        f.browSad = 0.2;
        break;
      case 'sneezy': {
        // sniffles, then the big sneeze
        f.noseWrinkle = 0.3 + Math.abs(Math.sin(t * 0.7)) * 0.2 + window01(t, B.sneezeBuild, B.sneeze) * 0.7;
        const build = window01(t, B.sneezeBuild, B.sneeze);
        f.browUp = build * 0.5;
        f.lid = 1 - build * 0.7;
        // sneeze release: head snaps down, mouth open
        const rel = pulse(t, B.sneeze, B.sneeze + 0.4, 0.06);
        f.open = Math.max(f.open, rel);
        f.noseWrinkle = Math.max(f.noseWrinkle, rel);
        st.headPitch += build * -0.25 + rel * 0.5;
        break;
      }
    }
    void spec;
  }

  private braceFeet(rig: Rig, st: CharState, id: CharId, exert: number, t: number) {
    // widen stance, back foot anchored; sleepy digs in at the tree root
    const back = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
    const side = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
    const b = SPECS[id].body;
    const widen = b.hipW + 0.04;
    const Lp = st.pos.clone().addScaledVector(side, -widen).addScaledVector(back, 0.12);
    const Rp = st.pos.clone().addScaledVector(side, widen).addScaledVector(back, -0.2 - exert * 0.12);
    Lp.y = terrainHeight(Lp.x, Lp.z);
    Rp.y = terrainHeight(Rp.x, Rp.z);
    st.footL.pos.copy(Lp);
    st.footR.pos.copy(Rp);
    st.footL.yaw = st.yaw;
    st.footR.yaw = st.yaw;
    st.footL.pitch = 0.1;
    st.footR.pitch = -0.2 - exert * 0.1; // heel dug in
    if (id === 'sleepy') {
      st.footR.pitch = -0.4;
      st.hipsDrop -= 0.08 * exert;
    }
  }

  private setHand(_rig: Rig, side: 'L' | 'R', pos: THREE.Vector3, grip: number) {
    const hand = side === 'L' ? this.currentState.handL : this.currentState.handR;
    hand.pos.copy(pos);
    hand.grip = grip;
  }

  // store the currently-posed state so setHand mutations are picked up by re-apply
  private currentState!: CharState;

  private storeSwing(id: CharId, st: CharState, _t: number) {
    this.prevPos.set(id, st.pos.clone());
  }
}

// ---- helpers ----
function restArms(st: CharState, spec: Rig['spec']) {
  const fwd = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
  const side = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
  const b = spec.body;
  const shoulderH = b.legLen + b.footH + b.torso * 0.74;
  const armLen = (b.upperArm + b.foreArm) * 0.9;
  const mk = (sx: number) => {
    const p = st.pos.clone();
    p.y = st.pos.y + shoulderH - armLen;
    p.addScaledVector(side, sx * (b.chestW * 0.52 + 0.03));
    p.addScaledVector(fwd, 0.02);
    return p;
  };
  st.handL.pos.copy(mk(-1));
  st.handR.pos.copy(mk(1));
  st.handL.grip = 0.2;
  st.handR.grip = 0.2;
  // grumpy crosses arms when idle
  if (spec.id === 'grumpy') {
    const chest = st.pos.clone();
    chest.y = st.pos.y + shoulderH - 0.08;
    st.handL.pos.copy(chest).addScaledVector(side, 0.12).addScaledVector(fwd, 0.14);
    st.handR.pos.copy(chest).addScaledVector(side, -0.12).addScaledVector(fwd, 0.14);
    st.handL.grip = 0.3;
    st.handR.grip = 0.3;
  }
}

function lerpV(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return a.clone().lerp(b, clamp(t));
}

function blink(t: number, seed: number) {
  // deterministic blinks every ~3-4.5s
  const period = 3.5 + (seed % 1) * 1.3;
  const phase = (t + seed * 7) % period;
  if (phase < 0.13) return Math.sin((phase / 0.13) * Math.PI);
  return 0;
}

import cues from '../timeline/cues.json';
function dialogueOpen(t: number, who: string): number {
  let v = 0;
  for (const d of cues.dialogue) {
    if (d.who !== who) continue;
    const dur = 0.12 * d.text.length;
    if (t > d.t && t < d.t + dur) {
      v = Math.max(v, (0.4 + 0.3 * Math.sin((t - d.t) * 26)) * (1 - window01(t, d.t + dur - 0.2, d.t + dur)));
    }
  }
  return v;
}
