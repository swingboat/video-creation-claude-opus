// Async asset library: CC0 Poly Haven HDRIs, PBR texture sets and glTF models (all under public/assets).
// Everything is loaded and awaited before the first frame so exports never contain half-loaded content.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { staticFile } from 'remotion';

export type PBRSet = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture };
export type ModelProto = { scene: THREE.Group; meshes: { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }[]; size: THREE.Vector3; min: THREE.Vector3 };

const url = (p: string) => staticFile(p);

export class AssetLib {
  hdr: Record<string, THREE.DataTexture> = {};
  tex: Record<string, PBRSet> = {};
  models: Record<string, ModelProto> = {};
  private texLoader = new THREE.TextureLoader();
  private gltf = new GLTFLoader();
  private hdrLoader = new HDRLoader();

  async load() {
    const hdris = ['monbachtal_riverbank', 'sunset_forest'];
    const textures = ['forest_ground_04', 'forest_leaves_02', 'mossy_rock', 'river_small_rocks', 'mud_forest', 'bark_brown_02', 'pine_bark', 'moss_wood', 'weathered_planks', 'raw_plank_wall', 'rough_linen'];
    const models = [
      'fern_02', 'shrub_01', 'shrub_02', 'shrub_04', 'nettle_plant', 'grass_medium_01', 'celandine_01', 'periwinkle_plant', 'dandelion_01',
      'dead_tree_trunk', 'dead_tree_trunk_02', 'tree_stump_01', 'root_cluster_01', 'root_cluster_02', 'pine_roots', 'rock_moss_set_01', 'rock_moss_set_02',
      'boulder_01', 'bark_debris_01', 'dry_branches_medium_01', 'food_apple_01', 'wicker_basket_01', 'Lantern_01', 'wooden_axe', 'handsaw_wood', 'wooden_bucket_01',
    ];
    await Promise.all([
      ...hdris.map(async (id) => {
        const t = await this.hdrLoader.loadAsync(url(`assets/hdri/${id}.hdr`));
        t.mapping = THREE.EquirectangularReflectionMapping;
        this.hdr[id] = t;
      }),
      ...textures.map(async (id) => {
        this.tex[id] = await this.pbr(id);
      }),
      ...models.map(async (id) => {
        this.models[id] = await this.model(id, `assets/models/${id}/${id}.gltf`);
      }),
    ]);
  }

  private async pbr(id: string): Promise<PBRSet> {
    const ld = async (f: string, srgb: boolean) => {
      try {
        const t = await this.texLoader.loadAsync(url(`assets/textures/${id}/${f}.jpg`));
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        return t;
      } catch {
        return undefined;
      }
    };
    const [map, normalMap, roughnessMap, arm] = await Promise.all([ld('diff', true), ld('nor', false), ld('rough', false), ld('arm', false)]);
    return { map: map!, normalMap: normalMap!, roughnessMap: roughnessMap ?? arm, aoMap: arm };
  }

  private async model(id: string, path: string): Promise<ModelProto> {
    const g = await this.gltf.loadAsync(url(path));
    const scene = g.scene;
    scene.updateMatrixWorld(true);
    const meshes: ModelProto['meshes'] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) tuneMaterial(mat as THREE.MeshStandardMaterial, id);
      m.castShadow = true;
      m.receiveShadow = true;
      meshes.push({ geometry: m.geometry, material: mats[0], matrix: m.matrixWorld.clone() });
    });
    const box = new THREE.Box3().setFromObject(scene);
    return { scene, meshes, size: box.getSize(new THREE.Vector3()), min: box.min.clone() };
  }

  /** a deep-ish clone (shared geometry/material) of a model */
  clone(id: string) {
    const p = this.models[id];
    const c = p.scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }

  /** build InstancedMeshes for every sub-mesh of a model, one instance per matrix */
  instanced(id: string, mats: THREE.Matrix4[], opts: { shadow?: boolean; receive?: boolean } = {}) {
    const p = this.models[id];
    const group = new THREE.Group();
    group.name = `inst:${id}`;
    if (!mats.length) return group;
    for (const sub of p.meshes) {
      const im = new THREE.InstancedMesh(sub.geometry, sub.material, mats.length);
      const tmp = new THREE.Matrix4();
      mats.forEach((m, i) => im.setMatrixAt(i, tmp.multiplyMatrices(m, sub.matrix)));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = opts.shadow ?? true;
      im.receiveShadow = opts.receive ?? true;
      im.frustumCulled = false;
      im.computeBoundingSphere();
      group.add(im);
    }
    return group;
  }
}

function tuneMaterial(mat: THREE.MeshStandardMaterial, id: string) {
  if (!mat) return;
  // foliage from Poly Haven uses alpha (BLEND/MASK): render as alpha-tested, double sided, no sorting
  if (mat.transparent || mat.alphaTest > 0) {
    mat.transparent = false;
    mat.alphaTest = Math.max(mat.alphaTest, 0.45);
    mat.alphaToCoverage = true;
    mat.depthWrite = true;
    mat.side = THREE.DoubleSide;
  }
  if (/fern|shrub|nettle|grass|celandine|periwinkle|dandelion|fir/.test(id)) {
    mat.side = THREE.DoubleSide;
    mat.envMapIntensity = 0.8;
  }
  if (mat.map) mat.map.anisotropy = 8;
}
