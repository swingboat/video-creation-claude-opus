// Loads the rigged fawn GLB and exposes the FawnRig interface used by driveFawn().
// driveFawn writes Euler rotations onto lightweight proxy groups; sync() converts those into
// model-space offsets on top of each bone's rest orientation.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FawnRig } from './fawn';

type BoneRest = { bone: THREE.Bone; restQ: THREE.Quaternion; parentRest: THREE.Quaternion; restPos: THREE.Vector3 };

export type FawnGlb = FawnRig & { sync: () => void };

export async function loadFawn(url: string): Promise<FawnGlb> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group();
  root.name = 'fawn';
  root.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);
  const bones = new Map<string, BoneRest>();
  const materials: THREE.Material[] = [];
  gltf.scene.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      const b = o as THREE.Bone;
      const world = b.getWorldQuaternion(new THREE.Quaternion());
      bones.set(b.name, { bone: b, restQ: b.quaternion.clone(), parentRest: world.multiply(b.quaternion.clone().invert()), restPos: b.position.clone() });
    }
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.name.includes('coat')) {
        // soft fur response: rough, slight sheen-like rim via emissive-free tweak
        mat.roughness = 0.9;
        const pm = mat as THREE.MeshPhysicalMaterial;
        if (pm.isMeshPhysicalMaterial) {
          pm.sheen = 0.6;
          pm.sheenRoughness = 0.5;
          pm.sheenColor = new THREE.Color('#e8b48a');
        }
      }
      if (mat.name.includes('eye')) mat.roughness = 0.04;
      materials.push(mat);
    }
  });
  const proxy = () => new THREE.Group();
  const p = {
    body: proxy(), neck: proxy(), head: proxy(), earL: proxy(), earR: proxy(), tail: proxy(),
  };
  bones.get('head')?.bone.add(p.head);
  const legNames = [['fr', true], ['fl', true], ['br', false], ['bl', false]] as const;
  const legs = legNames.map(([n, fr]) => ({ name: n, hip: proxy(), knee: proxy(), foot: proxy(), rest: new THREE.Vector3(), fr }));
  const dummyLid = new THREE.Mesh();

  const q = new THREE.Quaternion();
  const off = (name: string, e: THREE.Euler, scale = 1) => {
    const b = bones.get(name);
    if (!b) return;
    q.setFromEuler(new THREE.Euler(e.x * scale, e.y * scale, e.z * scale, e.order));
    const local = b.parentRest.clone().invert().multiply(q).multiply(b.parentRest);
    b.bone.quaternion.copy(local.multiply(b.restQ));
  };
  const sync = () => {
    for (const b of bones.values()) {
      b.bone.quaternion.copy(b.restQ);
      b.bone.position.copy(b.restPos);
    }
    // body bob/tremble/roll on the pelvis bone (procedural rest height was 0.5)
    const rb = bones.get('root')!;
    rb.bone.position.copy(rb.restPos).add(new THREE.Vector3(0, p.body.position.y - 0.5, 0).applyQuaternion(rb.parentRest.clone().invert()));
    off('root', new THREE.Euler(p.body.rotation.x, 0, p.body.rotation.z));
    off('neck1', p.neck.rotation, 0.6);
    off('neck2', p.neck.rotation, 0.6);
    off('head', p.head.rotation);
    off('ear_l', new THREE.Euler(p.earL.rotation.x, 0, p.earL.rotation.z - 0.5));
    off('ear_r', new THREE.Euler(p.earR.rotation.x, 0, p.earR.rotation.z + 0.5));
    off('tail1', p.tail.rotation);
    for (const l of legs) {
      off(`${l.name}_upper`, l.hip.rotation);
      off(`${l.name}_lower`, l.knee.rotation);
      off(`${l.name}_foot`, l.foot.rotation);
    }
    root.updateMatrixWorld(true);
  };
  return {
    root, body: p.body, neck: p.neck, head: p.head, earL: p.earL, earR: p.earR, tail: p.tail,
    legs, lidL: dummyLid, lidR: dummyLid, materials, sync,
  };
}
