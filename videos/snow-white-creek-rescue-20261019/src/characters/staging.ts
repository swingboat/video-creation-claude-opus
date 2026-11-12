// Staging: positions and scripted paths for all characters across the 90s.
import * as THREE from 'three';
import { CharId } from './specs';
import { LAYOUT } from '../world/layout';
import { B } from '../anim/story';
import { GroundPath, PathKey } from './locomotion';

const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);

// Pulling line stances on the near (south) bank (dry, z > 3.95)
export const STANCE: Record<string, THREE.Vector3> = {
  doc: V(-1.9, 4.5),
  grumpy: V(-0.35, 4.35),
  happy: V(-1.15, 5.05),
  sleepy: V(-4.35, 5.0),
  sneezy: V(-2.6, 5.15),
  dopey: V(-3.35, 5.2),
  bashful: V(-0.65, 3.78),
};
// facing while pulling (toward +x / downstream, i.e. leaning back away from the log which is at +z-ish). Pull direction is -x along the rope.
export const PULL_YAW = Math.atan2(1, 0.15); // face roughly downstream, lean back upstream

export const KNOT_POS = V(0.55, 3.5);
export const DEER_ROCK = new THREE.Vector3(LAYOUT.rock.x, 0, LAYOUT.rock.z);

// group entrance along the forest path (from +x toward the creek crossing area)
const pathZ = 6.35;
function groupStart(offX: number, offZ: number): PathKey[] {
  return [
    { t: 0, p: V(15 + offX, pathZ + offZ) },
    { t: 5.5, p: V(9.2 + offX, pathZ + offZ) },
    { t: 10.5, p: V(6.0 + offX, pathZ + offZ) },
    { t: 11.6, p: V(5.4 + offX, pathZ + offZ), pause: true }, // stop when the fawn cries
  ];
}

export type Activity =
  | { kind: 'walk'; path: GroundPath; t0: number; t1: number }
  | { kind: 'stand'; pos: THREE.Vector3; face: number; t0: number; t1: number };

export type Blocking = { id: CharId; acts: Activity[] };

function walk(keys: PathKey[], t0: number, t1: number): Activity {
  return { kind: 'walk', path: new GroundPath(keys), t0, t1 };
}
function stand(pos: THREE.Vector3, face: number, t0: number, t1: number): Activity {
  return { kind: 'stand', pos, face, t0, t1 };
}

const faceTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

// Snow White path: walks in front, stops, moves to basket spot, to log near end, onto the log, carries fawn back.
function snowBlocking(): Blocking {
  const acts: Activity[] = [];
  const entry: PathKey[] = [
    { t: 0, p: V(13.2, 5.7) },
    { t: 5.5, p: V(8.0, 5.6) },
    { t: 10.5, p: V(5.2, 5.5) },
    { t: 11.6, p: V(4.7, 5.4), face: faceTo(V(4.7, 5.4), DEER_ROCK) },
  ];
  acts.push(walk(entry, 0, 11.6));
  acts.push(stand(V(4.7, 5.4), faceTo(V(4.7, 5.4), DEER_ROCK), 11.6, 22.5));
  // walk to basket spot then to log near end
  acts.push(
    walk(
      [
        { t: 22.5, p: V(4.7, 5.4) },
        { t: 23.6, p: LAYOUT.basketSpot.clone(), face: faceTo(LAYOUT.basketSpot, LAYOUT.logNear) },
        { t: 25.8, p: V(LAYOUT.logNear.x + 0.1, LAYOUT.logNear.z + 0.35), face: faceTo(LAYOUT.logNear, LAYOUT.logFar) },
      ],
      22.5,
      26.0,
    ),
  );
  // onto the log, advancing toward the fawn (handled specially in performance, but give a path for the base position)
  acts.push(
    walk(
      [
        { t: 26.0, p: V(LAYOUT.logNear.x + 0.1, LAYOUT.logNear.z + 0.35) },
        { t: 30.2, p: V(0.35, 1.9), face: faceTo(V(0.35, 1.9), DEER_ROCK) },
        { t: 35.5, p: V(0.2, 1.4), face: faceTo(V(0.2, 1.4), DEER_ROCK) },
      ],
      26.0,
      35.5,
    ),
  );
  acts.push(stand(V(0.2, 1.4), faceTo(V(0.2, 1.4), DEER_ROCK), 35.5, 65.4));
  // reach to fawn & lift (special), then carry back along the log
  acts.push(
    walk(
      [
        { t: 65.4, p: V(0.2, 1.4) },
        { t: 66.5, p: V(0.05, 0.3), face: faceTo(V(0.05, 0.3), LAYOUT.logNear) },
        { t: 68.2, p: V(0.2, 1.7), face: faceTo(DEER_ROCK, LAYOUT.logNear) },
        { t: 73.8, p: V(LAYOUT.logNear.x + 0.15, LAYOUT.logNear.z + 0.5), face: faceTo(LAYOUT.logNear, V(1.2, 5.6)) },
      ],
      65.4,
      73.8,
    ),
  );
  // step onto bank, set fawn down
  acts.push(
    walk(
      [
        { t: 73.8, p: V(LAYOUT.logNear.x + 0.15, LAYOUT.logNear.z + 0.5) },
        { t: 75.4, p: V(1.4, 5.9), face: faceTo(V(1.4, 5.9), DEER_ROCK) },
      ],
      73.8,
      75.4,
    ),
  );
  acts.push(stand(V(1.4, 5.9), faceTo(V(1.4, 5.9), V(0.4, 4.3)), 75.4, 79.5));
  // walk over beside Dopey to hand him an apple
  acts.push(
    walk(
      [
        { t: 79.5, p: V(1.4, 5.9) },
        { t: 81.0, p: V(-2.25, 5.52), face: faceTo(V(-2.25, 5.52), STANCE.dopey) },
      ],
      79.5,
      81.0,
    ),
  );
  acts.push(stand(V(-2.25, 5.52), faceTo(V(-2.25, 5.52), STANCE.dopey), 81.0, 85.6));
  acts.push(
    walk(
      [
        { t: 85.6, p: V(-2.25, 5.52) },
        { t: 90, p: V(-8.5, 7.1), face: Math.atan2(-1, 0.1) },
      ],
      85.6,
      90,
    ),
  );
  return { id: 'snow', acts };
}

// Each dwarf: entrance walk → stop → walk to stance → stand (perform pull) → walk home
function dwarfBlocking(id: CharId, entryOffX: number, entryOffZ: number, stanceArrive: number): Blocking {
  const acts: Activity[] = [];
  const start = groupStart(entryOffX, entryOffZ);
  const stopPos = start[start.length - 1].p.clone();
  acts.push(walk(start, 0, 11.6));
  // react/stand in place until they move to stance
  acts.push(stand(stopPos, faceTo(stopPos, DEER_ROCK), 11.6, stanceArrive - 1.4));
  const stance = STANCE[id].clone();
  acts.push(
    walk(
      [
        { t: stanceArrive - 1.4, p: stopPos },
        { t: stanceArrive, p: stance, face: PULL_YAW },
      ],
      stanceArrive - 1.4,
      stanceArrive,
    ),
  );
  acts.push(stand(stance, PULL_YAW, stanceArrive, 79.0));
  // walk home with everyone
  acts.push(
    walk(
      [
        { t: 85.6 + entryOffX * 0.02, p: stance },
        { t: 90, p: V(-6.0 + entryOffX * 0.5, 7.4 + entryOffZ) , face: Math.atan2(-1, 0.1)},
      ],
      85.6,
      90,
    ),
  );
  return { id, acts };
}

// Dopey: wanders to the cart, crouches and pulls the spare rope out (36.6-39), runs it to the knot (41.4), then takes his place
function dopeyBlocking(): Blocking {
  const b = dwarfBlocking('dopey', 2.8, -0.9, 43.2);
  const start = groupStart(2.8, -0.9);
  const stopPos = start[start.length - 1].p.clone();
  const atCart = V(LAYOUT.cart.x - 0.95, LAYOUT.cart.z - 0.25);
  const toKnot = V(KNOT_POS.x + 0.35, KNOT_POS.z + 0.75);
  const acts: Activity[] = [b.acts[0]];
  acts.push(stand(stopPos, faceTo(stopPos, DEER_ROCK), 11.6, 35.8));
  acts.push(walk([{ t: 35.8, p: stopPos }, { t: 36.9, p: atCart, face: faceTo(atCart, LAYOUT.cart) }], 35.8, 36.9));
  acts.push(stand(atCart, faceTo(atCart, LAYOUT.cart), 36.9, 39.0));
  acts.push(walk([{ t: 39.0, p: atCart }, { t: 41.2, p: toKnot, face: faceTo(toKnot, KNOT_POS) }], 39.0, 41.2));
  acts.push(stand(toKnot, faceTo(toKnot, KNOT_POS), 41.2, 41.8));
  acts.push(walk([{ t: 41.8, p: toKnot }, { t: 43.2, p: STANCE.dopey.clone(), face: PULL_YAW }], 41.8, 43.2));
  acts.push(...b.acts.filter((a) => a.t0 >= 43.2));
  return { id: 'dopey', acts };
}

export function buildBlocking(): Record<CharId, Blocking> {
  return {
    snow: snowBlocking(),
    doc: dwarfBlocking('doc', 0.0, -0.6, 36.0),
    grumpy: dwarfBlocking('grumpy', -1.2, 0.5, 43.0),
    happy: dwarfBlocking('happy', 1.0, -0.2, 47.0),
    sleepy: dwarfBlocking('sleepy', 2.2, 0.6, 45.4),
    sneezy: dwarfBlocking('sneezy', -0.4, 1.1, 46.5),
    dopey: dopeyBlocking(),
    bashful: dwarfBlocking('bashful', 0.3, 1.6, 53.5),
  };
}

export function activityAt(b: Blocking, t: number): Activity {
  let cur = b.acts[0];
  for (const a of b.acts) {
    if (t >= a.t0) cur = a;
  }
  return cur;
}
