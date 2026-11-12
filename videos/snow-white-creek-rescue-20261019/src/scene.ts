// Master scene: assembles the world, characters and post-processing into a deterministic update(t).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import cues from './timeline/cues.json';
import { clamp, lerp, pulse, smoother, track } from './engine/math';
import { makeTextures } from './engine/textures';
import { buildDistantLayers, buildForest, buildLights, buildSky, buildTerrain, Shared } from './world/environment';
import { buildDebris, buildMist, buildSplashes, buildWater } from './world/water';
import {
  buildCabin, buildCart, buildBasket, buildLog, buildRock, buildToolBag, buildLightShafts,
  buildForegroundLeaves, Rope, makeApple, ROCK_TOP,
} from './world/props';
import { LAYOUT, terrainHeight, waterLevel, flowSpeed } from './world/layout';
import { B } from './anim/story';
import { ALL, CharId, SPECS } from './characters/specs';
import { GlbRig as Rig, loadCharacter, syncSpecsToModels } from './characters/glbRig';
import { FawnGlb, loadFawn } from './characters/fawnGlb';
import { AssetLib } from './world/assets';
import { buildScatter } from './world/scatter';
import { staticFile } from 'remotion';
import { Director } from './characters/performance';
import { cameraAt, applyCamera, CamCtx } from './camera';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export type Quality = {
  pixelRatio: number;
  shadowMap: number;
  bloom: boolean;
  dof: boolean;
  forest: boolean;
};
export const QUALITY_HIGH: Quality = { pixelRatio: 1, shadowMap: 4096, bloom: true, dof: true, forest: true };
export const QUALITY_PREVIEW: Quality = { pixelRatio: 1, shadowMap: 2048, bloom: true, dof: false, forest: true };

export class Scene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer!: EffectComposer;
  bloom?: UnrealBloomPass;
  bokeh?: BokehPass;
  grade!: ShaderPass;
  shared: Shared & { uWater: { value: number }; uWind: { value: number } };
  private rigs = {} as Record<CharId, Rig>;
  private director!: Director;
  private sky!: ReturnType<typeof buildSky>;
  private water!: ReturnType<typeof buildWater>;
  private splashes!: ReturnType<typeof buildSplashes>;
  private mist!: ReturnType<typeof buildMist>;
  private debris!: ReturnType<typeof buildDebris>;
  private lights!: ReturnType<typeof buildLights>;
  private shafts!: ReturnType<typeof buildLightShafts>;
  private fgLeaves!: ReturnType<typeof buildForegroundLeaves>;
  private logP!: ReturnType<typeof buildLog>;
  private cart!: ReturnType<typeof buildCart>;
  private basket!: ReturnType<typeof buildBasket>;
  private cabin!: ReturnType<typeof buildCabin>;
  private rope!: Rope;
  private carryCoil!: THREE.Object3D;
  private spareApple!: THREE.Object3D;
  private fawnRig!: FawnGlb;
  private lib = new AssetLib();
  ready: Promise<void>;
  private tex!: ReturnType<typeof makeTextures>;
  private heads: Record<string, THREE.Object3D> = {};
  readonly W: number;
  readonly H: number;
  private q: Quality;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, quality: Quality) {
    this.W = width;
    this.H = height;
    this.q = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    this.shared = { uTime: { value: 0 }, uWater: { value: waterLevel(0) }, uWind: { value: 1 } };

    this.ready = this.build().then(() => this.setupPost());
  }

  private async build() {
    await this.lib.load();
    const scene = this.scene;
    scene.fog = new THREE.FogExp2(new THREE.Color('#9fb0b0'), 0.011);
    this.tex = makeTextures();

    this.sky = buildSky();
    scene.add(this.sky.mesh);
    scene.add(buildDistantLayers());

    scene.add(buildTerrain(this.tex, this.shared));
    if (this.q.forest) {
      const forest = buildForest(this.tex, this.shared);
      scene.add(forest.group);
    }

    this.lights = buildLights();
    this.lights.sun.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap);
    scene.add(this.lights.sun);
    scene.add(this.lights.sun.target);
    scene.add(this.lights.hemi, this.lights.fill, this.lights.rim);

    this.shafts = buildLightShafts();
    scene.add(this.shafts.group);

    // water system
    this.water = buildWater(this.shared);
    scene.add(this.water.mesh);
    this.splashes = buildSplashes();
    scene.add(this.splashes.points);
    this.mist = buildMist();
    scene.add(this.mist.points);
    this.debris = buildDebris(this.tex);
    scene.add(this.debris.group);

    // props
    this.logP = buildLog(this.tex);
    scene.add(this.logP.group);
    this.rockGroup = buildRock(this.tex);
    scene.add(this.rockGroup);
    this.cart = buildCart(this.tex);
    scene.add(this.cart.group);
    this.basket = buildBasket(this.tex);
    scene.add(this.basket.group);
    this.cabin = buildCabin(this.tex);
    scene.add(this.cabin.group);
    const toolBag = buildToolBag(this.tex);
    toolBag.position.set(LAYOUT.toolBagSpot.x, terrainHeight(LAYOUT.toolBagSpot.x, LAYOUT.toolBagSpot.z), LAYOUT.toolBagSpot.z);
    scene.add(toolBag);
    this.rope = new Rope(this.cart.ropeMat);
    this.carryCoil = this.cart.coil.clone();
    this.carryCoil.scale.setScalar(0.7);
    scene.add(this.carryCoil);
    scene.add(this.rope.mesh);
    this.spareApple = makeApple(42);
    this.spareApple.visible = false;
    scene.add(this.spareApple);

    this.fgLeaves = buildForegroundLeaves();
    this.camera.add(this.fgLeaves.group);
    scene.add(this.camera);

    // characters (MPFB/MakeHuman GLBs) and the fawn
    syncSpecsToModels();
    const rigs = await Promise.all(ALL.map((id) => loadCharacter(id, staticFile(`models/${id}.glb`))));
    rigs.forEach((rig) => {
      this.rigs[rig.id] = rig;
      scene.add(rig.root);
      this.heads[rig.id] = rig.anchors.headTilt;
    });
    this.fawnRig = await loadFawn(staticFile('models/fawn.glb'));
    scene.add(this.fawnRig.root);

    this.applyRealMaterials();
    scene.add(buildScatter(this.lib));

    this.director = new Director(this.rigs, this.fawnRig);
  }

  /** swap procedural canvas textures for CC0 photo-scanned PBR sets and light with the riverbank HDRI */
  private applyRealMaterials() {
    const lib = this.lib;
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = pm.fromEquirectangular(lib.hdr.monbachtal_riverbank).texture;
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.55;
    this.envWarm = pm.fromEquirectangular(lib.hdr.sunset_forest).texture;
    this.envCool = env;
    pm.dispose();
    const set = (mat: THREE.MeshStandardMaterial, id: string, rep: number, nScale = 1) => {
      const t = lib.tex[id];
      const clone = (x?: THREE.Texture) => {
        if (!x) return null;
        const c = x.clone();
        c.repeat.set(rep, rep);
        c.needsUpdate = true;
        return c;
      };
      mat.map = clone(t.map);
      mat.normalMap = clone(t.normalMap);
      mat.normalScale = new THREE.Vector2(nScale, nScale);
      if (t.roughnessMap) mat.roughnessMap = clone(t.roughnessMap);
      mat.color.set('#ffffff');
      mat.needsUpdate = true;
    };
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (m.name === 'terrain') {
        set(mat, 'forest_leaves_02', 1.25, 1.2);
        (mat.userData as any).bed = lib.tex.river_small_rocks.map;
      }
    });
    // log & trunks: bark scans; fawn rock: mossy rock scan
    const barkT = (mesh: THREE.Mesh, rep: [number, number]) => {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      const b = lib.tex.bark_brown_02;
      for (const k of ['map', 'normalMap', 'roughnessMap'] as const) {
        const src = k === 'map' ? b.map : k === 'normalMap' ? b.normalMap : b.roughnessMap;
        if (!src) continue;
        const c = src.clone();
        c.repeat.set(rep[0], rep[1]);
        c.needsUpdate = true;
        (mat as any)[k] = c;
      }
      mat.color.set('#ffffff');
      mat.normalScale = new THREE.Vector2(1.5, 1.5);
      mesh.material = mat;
    };
    this.logP.group.traverse((o) => (o as THREE.Mesh).isMesh && barkT(o as THREE.Mesh, [1, 1]));
    this.scene.getObjectByName('forest')?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh) barkT(m, [1, 1]);
    });
    this.rockGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      const r = lib.tex.mossy_rock;
      mat.map = r.map;
      mat.normalMap = r.normalMap;
      mat.roughnessMap = r.roughnessMap ?? null;
      mat.color.set('#ffffff');
      m.material = mat;
    });
    // procedural pebbles / moss mounds left from the prototype -> scanned mossy rock surface
    this.scene.getObjectByName('forest')?.traverse((o) => {
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh && (im.geometry as any).type === 'IcosahedronGeometry') {
        const r = lib.tex.mossy_rock;
        im.material = new THREE.MeshStandardMaterial({ map: r.map, normalMap: r.normalMap, roughnessMap: r.roughnessMap ?? null, roughness: 1 });
      }
    });
    // apples: scanned apple model
    const apple = () => {
      const a = lib.clone('food_apple_01');
      a.scale.setScalar(0.85);
      return a;
    };
    this.basket.apples.forEach((a) => {
      const r = apple();
      r.position.copy(a.position);
      r.rotation.copy(a.rotation);
      a.parent!.add(r);
      a.visible = false;
      (a as any).userData.real = r;
    });
    const sa = apple();
    sa.visible = false;
    this.scene.add(sa);
    this.scene.remove(this.spareApple);
    this.spareApple = sa;
    // tools in the cart: scanned axe, saw, lantern, bucket
    const put = (id: string, p: THREE.Vector3, r: THREE.Euler, s = 1) => {
      const o = lib.clone(id);
      o.position.copy(p);
      o.rotation.copy(r);
      o.scale.setScalar(s);
      this.cart.group.add(o);
    };
    put('wooden_axe', V(0.1, 0.62, 0.12), new THREE.Euler(0, 0, 1.25));
    put('handsaw_wood', V(-0.15, 0.58, -0.1), new THREE.Euler(Math.PI / 2, 0, 0.2));
    put('Lantern_01', V(-0.42, 0.45, 0.16), new THREE.Euler(0, 0.4, 0), 1.3);
    put('wooden_bucket_01', V(0.3, 0.45, -0.12), new THREE.Euler(0, 0, 0), 0.6);
  }

  private envWarm?: THREE.Texture;
  private envCool?: THREE.Texture;
  private rockGroup!: THREE.Object3D;

  private setupPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(this.W, this.H);
    this.composer.setPixelRatio(this.q.pixelRatio);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.q.dof) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 6, aperture: 0.0008, maxblur: 0.008 });
      this.composer.addPass(this.bokeh);
    }
    if (this.q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(this.W, this.H), 0.42, 0.7, 0.85);
      this.composer.addPass(this.bloom);
    }
    // warm cinematic grade + vignette + subtle grain (deterministic by time)
    this.grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uWarm: { value: new THREE.Color(1.05, 1.0, 0.94) },
        uLift: { value: new THREE.Color(0.01, 0.015, 0.03) },
        uVig: { value: 0.32 },
        uSat: { value: 1.08 },
        uTime: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec3 uWarm; uniform vec3 uLift; uniform float uVig; uniform float uSat; uniform float uTime; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv);
          c.rgb = c.rgb*uWarm + uLift*(1.0-c.rgb);
          float l = dot(c.rgb, vec3(0.299,0.587,0.114));
          c.rgb = mix(vec3(l), c.rgb, uSat);
          vec2 d = vUv-0.5; float v = 1.0 - dot(d,d)*uVig*2.2; c.rgb *= clamp(v,0.0,1.0);
          // static fine dither (not per-frame) to avoid banding without destroying compression
          float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453);
          c.rgb += (g-0.5)*(1.5/255.0);
          gl_FragColor = c; }`,
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  private updateLighting(t: number) {
    // sun direction: low cool morning → warmer afternoon, opening from behind the far ridge
    const az = lerp(-2.1, -1.0, smoother(clamp((t - 40) / 45)));
    const el = lerp(0.28, 0.5, smoother(clamp((t - 30) / 50)));
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    const sun = this.lights.sun;
    const focus = V(0, 0.5, 2.2);
    sun.position.copy(focus).addScaledVector(dir, 24);
    sun.target.position.copy(focus);
    // color & intensity: cool overcast → golden break at ~55s
    const warm = smoother(clamp((t - 52) / 18));
    const sunCol = new THREE.Color('#cdd8e0').lerp(new THREE.Color('#ffd79a'), warm).lerp(new THREE.Color('#ffbf73'), clamp((t - 74) / 16));
    sun.color.copy(sunCol);
    sun.intensity = lerp(1.5, 3.1, warm);
    this.lights.hemi.color.set('#aebecb');
    this.lights.hemi.groundColor.set('#4a4330');
    this.lights.hemi.intensity = lerp(0.45, 0.3, warm);
    if (this.envCool && this.envWarm) {
      this.scene.environment = t >= 64.2 ? this.envWarm : this.envCool;
      this.scene.environmentIntensity = t >= 64.2 ? lerp(0.45, 0.6, clamp((t - 64.2) / 10)) : 0.55;
    }
    this.lights.fill.position.copy(focus).add(V(6, 4, 8));
    this.lights.fill.color.set('#cfe0ee');
    this.lights.fill.intensity = lerp(0.5, 0.3, warm);
    // rim/back light grows with the golden break
    this.lights.rim.position.copy(focus).addScaledVector(dir.clone().setComponent(0, -dir.x), -1).add(V(-8, 5, -8));
    this.lights.rim.color.set('#ffcf8a');
    this.lights.rim.intensity = warm * 0.9 + clamp((t - 74) / 16) * 0.6;

    // sky
    this.sky.uniforms.uTop.value.set('#8ea8bc').lerp(new THREE.Color('#9fb6cf'), warm);
    this.sky.uniforms.uHorizon.value.set('#cdd6d6').lerp(new THREE.Color('#ffe0b0'), warm);
    this.sky.uniforms.uSunDir.value.copy(dir);
    this.sky.uniforms.uSunCol.value.copy(sunCol);
    this.sky.uniforms.uSunAmt.value = lerp(0.2, 0.9, warm);

    // fog thins as it clears; a touch denser during the surge spray
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = lerp(0.013, 0.006, warm) + pulse(t, B.surge, B.sneeze + 1, 0.6) * 0.004;
    fog.color.set('#9fb0b0').lerp(new THREE.Color('#e8d4b0'), warm);

    // water lighting uniforms
    const wu = this.water.uniforms;
    wu.uSunDir.value.copy(dir);
    wu.uSunCol.value.copy(sunCol);
    wu.uSkyTop.value.copy(this.sky.uniforms.uTop.value);
    wu.uSkyHor.value.copy(this.sky.uniforms.uHorizon.value);
    wu.uFogColor.value.copy(fog.color);
    wu.uFogDensity.value = fog.density;
    wu.uLight.value = lerp(0.85, 1.15, warm);

    // light shafts: strongest during the golden break
    const shaftInt = lerp(0.05, 0.16, warm) * (1 - pulse(t, 0, 2, 1) * 0);
    this.shafts.update(t, dir, shaftInt, sunCol);

    // cabin glow comes up toward the end
    const glow = clamp((t - 80) / 8) * 1.4;
    (this.cabin.glow as THREE.MeshStandardMaterial).emissiveIntensity = glow;
    this.cabin.lamp.intensity = glow * 6;

    // splash/mist tint
    this.splashes.uniforms.uLight.value.copy(sunCol).multiplyScalar(0.6).addScalar(0.4);
    this.mist.uniforms.uColor.value.set('#d8e0e0').lerp(new THREE.Color('#f0dcb8'), warm);

    // wind: gusts
    this.shared.uWind.value = 0.7 + 0.3 * Math.sin(t * 0.5) + pulse(t, B.surge, B.surge + 2, 1) * 0.6;
  }

  private updateProps(t: number) {
    this.logP.update(t);
    this.water.update(t);
    this.splashes.update(t);
    this.mist.update(t);
    this.debris.update(t);

    // cart: rolls in with the group, parked after ~11s; wheels spin with motion
    const cartX = track([[0, 16.6], [10.5, LAYOUT.cart.x + 0.4], [11.8, LAYOUT.cart.x]], t);
    this.cart.group.position.set(cartX, terrainHeight(cartX, LAYOUT.cart.z), LAYOUT.cart.z);
    this.cart.group.rotation.y = -Math.PI / 2 + 0.1;
    const roll = -(cartX) / 0.26;
    this.cart.wheels.forEach((w) => (w.rotation.z = roll));
    // spare rope in the cart until Dopey takes it (~38.4), then hidden (he carries a coil via hand – represented by rope tube appearing)
    this.cart.coil.visible = t < B.dopeyFind + 0.5;
    // the spare coil travels in Dopey's arms from the cart to the knot
    const carry = t >= B.dopeyFind + 0.5 && t < B.ropeArrive + 0.4;
    this.carryCoil.visible = carry;
    if (carry) {
      const d = this.rigs.dopey;
      const a = new THREE.Vector3().setFromMatrixPosition(d.anchors.wristL.matrixWorld);
      const b = new THREE.Vector3().setFromMatrixPosition(d.anchors.wristR.matrixWorld);
      this.carryCoil.position.copy(a).lerp(b, 0.5).add(V(0, -0.02, 0));
      this.carryCoil.rotation.set(0.3, d.root.rotation.y, 0);
    }

    // basket: carried by Snow until basketDown, then on the ground
    if (t < B.basketDown) {
      const snow = this.rigs.snow;
      snow.anchors.wristL.updateWorldMatrix(true, false);
      const w = new THREE.Vector3().setFromMatrixPosition(snow.anchors.wristL.matrixWorld);
      this.basket.group.position.copy(w).add(V(0, -0.18, 0));
      this.basket.group.rotation.set(0, snow.root.rotation.y, 0);
    } else {
      const p = LAYOUT.basketSpot;
      this.basket.group.position.set(p.x, terrainHeight(p.x, p.z), p.z);
      this.basket.group.rotation.set(0, 0.3, 0);
    }
    // one apple removed from basket and handed to Dopey near the end
    const giving = t >= B.appleGive;
    (this.basket.apples[0].userData.real as THREE.Object3D).visible = !giving;
    this.spareApple.visible = giving && t < 89;
    if (giving) {
      const snow = this.rigs.snow;
      snow.anchors.wristR.updateWorldMatrix(true, false);
      const sw = new THREE.Vector3().setFromMatrixPosition(snow.anchors.wristR.matrixWorld);
      if (t < B.offer) {
        this.spareApple.position.copy(sw).add(V(0, -0.03, 0.03));
      } else {
        // in Dopey's hand, then offered to the fawn
        const dopey = this.rigs.dopey;
        dopey.anchors.wristR.updateWorldMatrix(true, false);
        const dw = new THREE.Vector3().setFromMatrixPosition(dopey.anchors.wristR.matrixWorld);
        this.spareApple.position.copy(sw).lerp(dw, clamp((t - B.offer) / 1.0));
      }
    }

    // rope
    this.rope.update(this.director.ropePoints, this.director.ropeSlide, this.director.ropeVisible);

    // foreground leaves: only present in the opening push-through; drift aside
    const fg = clamp(1 - (t - 0) / 5.0);
    this.fgLeaves.group.visible = fg > 0.01;
    this.fgLeaves.leaves.forEach((m, i) => {
      const b = m.userData.base;
      const sway = Math.sin(t * 1.5 + i) * 0.1;
      m.position.set(b.x * (1 + (1 - fg) * 1.5) + sway, b.y - (1 - fg) * 0.5, -0.9 + b.z);
      m.rotation.set(b.rx + sway * 0.3, 0, b.rz + sway);
      const s = b.s * (0.8 + fg * 0.5);
      m.scale.setScalar(s);
      (m.material as THREE.Material).opacity = 1;
    });
  }

  private camCtx(): CamCtx {
    const head = (id: string) => new THREE.Vector3().setFromMatrixPosition(this.heads[id].matrixWorld);
    const dwarfIds = ['doc', 'grumpy', 'happy', 'sleepy', 'bashful', 'sneezy', 'dopey'];
    const centroid = new THREE.Vector3();
    dwarfIds.forEach((d) => centroid.add(this.rigs[d as CharId].root.position));
    centroid.multiplyScalar(1 / dwarfIds.length);
    const heads: Record<string, THREE.Vector3> = {};
    for (const id of ALL) heads[id] = head(id);
    return {
      snow: this.rigs.snow.root.position.clone(),
      fawn: this.fawnRig.root.position.clone(),
      dwarfCentroid: centroid,
      heads,
    };
  }

  /** deterministic update of everything to absolute time t (seconds) */
  update(t: number) {
    this.shared.uTime.value = t;
    this.shared.uWater.value = waterLevel(t);
    this.updateLighting(t);
    this.director.update(t);
    this.fawnRig.sync();
    // characters moved → update world matrices before reading heads/props
    this.scene.updateMatrixWorld(true);
    this.updateProps(t);
    this.scene.updateMatrixWorld(true);

    const ctx = this.camCtx();
    const cf = cameraAt(t, ctx);
    applyCamera(this.camera, cf);
    if (this.bokeh) {
      const u = (this.bokeh as any).uniforms ?? (this.bokeh.materialBokeh as THREE.ShaderMaterial).uniforms;
      const mu = (this.bokeh.materialBokeh as THREE.ShaderMaterial).uniforms;
      mu.focus.value = cf.focus;
      mu.aperture.value = cf.aperture * 0.01;
      mu.maxblur.value = 0.006;
    }
    this.grade.uniforms.uTime.value = Math.floor(t * cues.fps);
    // golden-hour saturation/warmth drift
    const warm = smoother(clamp((t - 52) / 20));
    this.grade.uniforms.uWarm.value.set(1.05, 1.0, 0.94).lerp(new THREE.Color(1.1, 1.0, 0.86), warm);
    this.grade.uniforms.uSat.value = lerp(1.05, 1.14, warm);
  }

  render() {
    this.composer.render();
  }

  renderAt(t: number) {
    this.update(t);
    this.render();
  }
}
