// Terrain, sky, forest and lighting.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, fbm2, lerp, mulberry32, smoothstep, vnoise2 } from '../engine/math';
import { LAYOUT, creekD, pathZ, terrainHeight } from './layout';
import { makeFernTex, makeLeafAtlas } from '../engine/textures';

export type Shared = {
  uTime: { value: number };
  uWater: { value: number };
  uWind: { value: number };
};


/** non-uniform axis samples: dense inside [a,b] */
function axis(min: number, max: number, a: number, b: number, fine: number) {
  const out: number[] = [];
  let x = min;
  while (x < max) {
    out.push(x);
    const inside = x >= a && x <= b;
    const dist = inside ? 0 : Math.min(Math.abs(x - a), Math.abs(x - b));
    x += inside ? fine : Math.min(4, fine + dist * 0.12);
  }
  out.push(max);
  return out;
}

export function buildTerrain(tex: ReturnType<typeof import('../engine/textures').makeTextures>, shared: Shared) {
  const xs = axis(-90, 90, -16, 16, 0.14);
  const zs = axis(-70, 70, -6.5, 10, 0.12);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const bed = new Float32Array(nx * nz);
  const col = new Float32Array(nx * nz * 3);
  let i = 0;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = xs[ix], z = zs[iz];
      const y = terrainHeight(x, z);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      uv[i * 2] = x / 3.2; uv[i * 2 + 1] = z / 3.2;
      const a = Math.abs(creekD(x, z));
      bed[i] = 1 - smoothstep(2.9, 3.7, a);
      // path wear: lighter, less mossy
      const pw = Math.exp(-Math.pow((z - pathZ(x)) / 0.75, 2)) * (x > -19 ? 1 : 0);
      const n = fbm2(x * 0.3, z * 0.3, 3);
      const c = [1 + n * 0.12, 1 + n * 0.1, 1 + n * 0.08];
      col[i * 3] = c[0] * (1 + pw * 0.25);
      col[i * 3 + 1] = c[1] * (1 + pw * 0.1);
      col[i * 3 + 2] = c[2] * (1 + pw * 0.05);
      i++;
    }
  }
  const idx: number[] = [];
  for (let iz = 0; iz < nz - 1; iz++)
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aBed', new THREE.BufferAttribute(bed, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: tex.ground.map,
    normalMap: tex.ground.normalMap,
    roughnessMap: tex.ground.roughnessMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    vertexColors: true,
    roughness: 1,
  });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uWater = shared.uWater;
    s.uniforms.rockMap = { value: (mat.userData as any).bed ?? tex.rock.map };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBed;\nvarying float vBed;\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvBed = aBed;\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uWater;\nuniform sampler2D rockMap;\nvarying float vBed;\nvarying vec3 vWPos;',
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 pebble = texture2D(rockMap, vMapUv*1.6).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, pebble, smoothstep(0.15,0.8,vBed));
        float wet = smoothstep(uWater + 0.22, uWater + 0.01, vWPos.y);
        diffuseColor.rgb *= mix(1.0, 0.55, wet);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.25, wet);`,
      );
  };
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

export function buildSky() {
  const uniforms = {
    uTop: { value: new THREE.Color('#8fa6b8') },
    uHorizon: { value: new THREE.Color('#cfd8d9') },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.6).normalize() },
    uSunCol: { value: new THREE.Color('#fff2d8') },
    uSunAmt: { value: 0.2 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunAmt; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y,0.0,1.0); vec3 c = mix(uHorizon,uTop,pow(h,0.6));
      float s = max(dot(normalize(vDir),uSunDir),0.0);
      c += uSunCol * (pow(s,12.0)*0.5 + pow(s,400.0)*3.0) * uSunAmt;
      gl_FragColor = vec4(c,1.0);}`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  m.frustumCulled = false;
  m.name = 'sky';
  return { mesh: m, uniforms };
}

function windPatch(mat: THREE.Material, shared: Shared, amp: number, instanced: boolean) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = shared.uTime;
    s.uniforms.uWind = shared.uWind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nattribute float aCell;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
        vMapUv = vMapUv*0.5 + vec2(mod(aCell,2.0), floor(aCell/2.0))*0.5;
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 ip = ${instanced ? 'instanceMatrix[3].xyz' : 'vec3(0.0)'};
        float ph = ip.x*0.37 + ip.z*0.21 + ip.y*0.13;
        float sw = sin(uTime*1.7 + ph)*0.6 + sin(uTime*3.1 + ph*1.7)*0.4;
        transformed.x += sw * ${amp.toFixed(3)} * uWind * (0.5 + uv.y);
        transformed.z += cos(uTime*2.3 + ph)*${(amp * 0.6).toFixed(3)} * uWind * (0.5 + uv.y);`,
      );
  };
}

type TreeSpec = { x: number; z: number; h: number; r: number; hero?: boolean; lean?: number };

function trunkGeometry(spec: TreeSpec, rnd: () => number) {
  const segH = 24, segR = 18;
  const g = new THREE.CylinderGeometry(spec.r * 0.45, spec.r, spec.h, segR, segH, true);
  g.translate(0, spec.h / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uvA = g.attributes.uv as THREE.BufferAttribute;
  const lean = spec.lean ?? (rnd() - 0.5) * 0.12;
  const seed = rnd() * 100;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const v = y / spec.h;
    const ang = Math.atan2(z, x);
    // root flare: lobes at the base
    const flare = Math.pow(1 - clamp(y / 1.2), 3) * (0.55 + 0.45 * Math.abs(Math.sin(ang * 2.5 + seed))) * spec.r * 1.3;
    const bump = vnoise2(ang * 2 + seed, y * 1.5) * spec.r * 0.08;
    const k = 1 + (flare + bump) / Math.max(0.05, Math.hypot(x, z));
    x *= k; z *= k;
    x += lean * y + Math.sin(v * 3 + seed) * 0.15 * v;
    z += Math.cos(v * 2.4 + seed) * 0.12 * v;
    p.setXYZ(i, x, y - 0.25, z);
    uvA.setXY(i, uvA.getX(i) * Math.max(2, Math.round(spec.r * 8)), y / 1.8);
  }
  g.computeVertexNormals();
  g.translate(spec.x, terrainHeight(spec.x, spec.z), spec.z);
  return { g, lean };
}

function rootGeometry(spec: TreeSpec, rnd: () => number) {
  const parts: THREE.BufferGeometry[] = [];
  const base = terrainHeight(spec.x, spec.z);
  const n = spec.hero ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const len = spec.r * (2.2 + rnd() * 1.6);
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const s = k / 6;
      const rr = spec.r * 0.6 + s * len;
      const px = spec.x + Math.cos(a) * rr, pz = spec.z + Math.sin(a) * rr;
      pts.push(new THREE.Vector3(px, Math.max(terrainHeight(px, pz) - 0.02, base) + (1 - s) * spec.r * 0.5 + Math.sin(s * 3) * 0.06, pz));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 16, spec.r * 0.22, 8, false);
    const p = tube.attributes.position as THREE.BufferAttribute;
    // taper toward the tip
    const nr = 9;
    for (let s = 0; s <= 16; s++) {
      const c = curve.getPoint(s / 16);
      const taper = 1 - (s / 16) * 0.85;
      for (let r = 0; r < nr; r++) {
        const ii = s * nr + r;
        p.setXYZ(ii, c.x + (p.getX(ii) - c.x) * taper, c.y + (p.getY(ii) - c.y) * taper, c.z + (p.getZ(ii) - c.z) * taper);
      }
    }
    tube.computeVertexNormals();
    parts.push(tube);
  }
  return parts;
}

export function buildForest(tex: ReturnType<typeof import('../engine/textures').makeTextures>, shared: Shared) {
  const group = new THREE.Group();
  group.name = 'forest';
  const rnd = mulberry32(1234);
  const trees: TreeSpec[] = [];
  const blocked = (x: number, z: number, r: number) => {
    const a = Math.abs(creekD(x, z));
    if (a < 4.4 + r) return true;
    if (Math.abs(z - pathZ(x)) < 1.6 + r && x > -20) return true;
    if (Math.hypot(x - LAYOUT.cabin.x, z - LAYOUT.cabin.z) < 7.5) return true;
    // action area on the near bank between cart and anchor tree
    if (x > -6.5 && x < 7.5 && z > 2 && z < 9.5) return true;
    return trees.some((t) => Math.hypot(t.x - x, t.z - z) < (t.r + r) * 3.2 + 1.2);
  };
  // hero trees around the action area
  trees.push({ x: LAYOUT.anchorTree.x, z: LAYOUT.anchorTree.z, h: 17, r: LAYOUT.anchorTreeRadius, hero: true, lean: 0.02 });
  trees.push({ x: 8.6, z: 4.9, h: 19, r: 0.5, hero: true });
  trees.push({ x: -9.5, z: 9.6, h: 18, r: 0.55, hero: true });
  trees.push({ x: 3.5, z: -5.6, h: 18, r: 0.48, hero: true });
  trees.push({ x: -5.2, z: -5.9, h: 16, r: 0.4, hero: true });
  trees.push({ x: 11.5, z: 10.5, h: 18, r: 0.5, hero: true });
  for (let k = 0; k < 900 && trees.length < 150; k++) {
    const x = (rnd() - 0.5) * 120;
    const z = (rnd() - 0.42) * 110;
    const r = 0.22 + rnd() * 0.35;
    if (blocked(x, z, r)) continue;
    trees.push({ x, z, h: 12 + rnd() * 10, r });
  }

  const trunks: THREE.BufferGeometry[] = [];
  const roots: THREE.BufferGeometry[] = [];
  const cards: { p: THREE.Vector3; s: number; q: THREE.Quaternion; cell: number }[] = [];
  const crnd = mulberry32(99);
  for (const t of trees) {
    const { g, lean } = trunkGeometry(t, rnd);
    trunks.push(g);
    if (t.hero && Math.hypot(t.x - 9.4, t.z - 6.6) > 3) roots.push(...rootGeometry(t, rnd));
    const base = terrainHeight(t.x, t.z);
    // branches + canopy clumps
    const nClumps = t.hero ? 22 : 12;
    for (let c = 0; c < nClumps; c++) {
      const ch = t.h * (0.45 + crnd() * 0.55);
      const a = crnd() * Math.PI * 2;
      const rr = (1.2 + crnd() * 3.2) * (ch / t.h);
      const cx = t.x + lean * ch + Math.cos(a) * rr, cz = t.z + Math.sin(a) * rr, cy = base + ch;
      // branch
      const br = new THREE.CylinderGeometry(t.r * 0.05, t.r * 0.16, rr + 0.4, 6, 1, true);
      br.translate(0, (rr + 0.4) / 2, 0);
      br.rotateZ(-Math.PI / 2 + 0.35);
      br.rotateY(-a);
      br.translate(t.x + lean * (ch - 0.6), cy - 0.6, t.z);
      trunks.push(br);
      const nCards = t.hero ? 42 : 26;
      const cr = 1.1 + crnd() * 1.0;
      for (let k = 0; k < nCards; k++) {
        const u = crnd(), v = crnd(), w = crnd();
        const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
        const rad = cr * Math.cbrt(w);
        const p = new THREE.Vector3(
          cx + Math.sin(ph) * Math.cos(th) * rad * 1.3,
          cy + Math.cos(ph) * rad * 0.65,
          cz + Math.sin(ph) * Math.sin(th) * rad * 1.3,
        );
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(crnd() * 6.28, crnd() * 6.28, crnd() * 6.28));
        cards.push({ p, s: 0.9 + crnd() * 0.8, q, cell: Math.floor(crnd() * 4) });
      }
    }
  }
  // bushes / understory clumps
  for (let k = 0; k < 420; k++) {
    const x = (rnd() - 0.5) * 80;
    const z = (rnd() - 0.4) * 70;
    const a = Math.abs(creekD(x, z));
    if (a < 3.9 || (Math.abs(z - pathZ(x)) < 1.3 && x > -20)) continue;
    if (x > -4.2 && x < 6.5 && z > 3.4 && z < 8.6) continue;
    if (Math.hypot(x - LAYOUT.cabin.x, z - LAYOUT.cabin.z) < 6) continue;
    const y = terrainHeight(x, z);
    const n = 10 + Math.floor(rnd() * 14);
    const br = 0.4 + rnd() * 0.7;
    for (let c = 0; c < n; c++) {
      const p = new THREE.Vector3(x + (rnd() - 0.5) * br * 2, y + rnd() * br * 1.2 + 0.1, z + (rnd() - 0.5) * br * 2);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28));
      cards.push({ p, s: 0.45 + rnd() * 0.45, q, cell: Math.floor(rnd() * 4) });
    }
  }

  const barkMat = new THREE.MeshStandardMaterial({
    map: tex.bark.map,
    normalMap: tex.bark.normalMap,
    roughnessMap: tex.bark.roughnessMap,
    normalScale: new THREE.Vector2(2, 2),
    color: new THREE.Color('#d8d0c8'),
  });
  const trunkMesh = new THREE.Mesh(mergeGeometries(trunks.map((g) => g.index ? g.toNonIndexed() : g)), barkMat);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  group.add(trunkMesh);
  if (roots.length) {
    const rootMesh = new THREE.Mesh(mergeGeometries(roots.map((g) => g.index ? g.toNonIndexed() : g)), barkMat);
    rootMesh.castShadow = true;
    rootMesh.receiveShadow = true;
    group.add(rootMesh);
  }

  const leafTex = makeLeafAtlas();
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.7,
    color: new THREE.Color('#c9d9b0'),
    emissive: new THREE.Color('#1a2a0c'),
    emissiveIntensity: 0.35,
  });
  windPatch(leafMat, shared, 0.05, true);
  const cardGeo = new THREE.PlaneGeometry(1, 1);
  cardGeo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(cards.length), 1));
  const cellAttr = cardGeo.getAttribute('aCell') as THREE.InstancedBufferAttribute;
  const leaves = new THREE.InstancedMesh(cardGeo, leafMat, cards.length);
  const m = new THREE.Matrix4();
  cards.forEach((c, i) => {
    m.compose(c.p, c.q, new THREE.Vector3(c.s, c.s, c.s));
    leaves.setMatrixAt(i, m);
    cellAttr.setX(i, c.cell);
  });
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  leaves.frustumCulled = false;
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.45 });
  group.add(leaves);

  void buildFerns;
  group.add(buildGroundScatter(tex, rnd));
  return { group, trees };
}

function buildFerns(shared: Shared, rnd: () => number) {
  const tex = makeFernTex();
  const frond = new THREE.PlaneGeometry(0.34, 1, 1, 6);
  frond.translate(0, 0.5, 0);
  // arch the frond
  const p = frond.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setZ(i, y * y * 0.55);
    p.setY(i, y * 0.85);
  }
  frond.computeVertexNormals();
  frond.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.75,
    color: new THREE.Color('#d6e6c0'),
  });
  // ferns use the full texture: override the cell trick with a neutral atlas (cell 0 -> scale 0.5 would crop)
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = shared.uTime;
    s.uniforms.uWind = shared.uWind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 ip = instanceMatrix[3].xyz;
        float ph = ip.x*1.37 + ip.z*0.71;
        transformed.x += sin(uTime*2.1 + ph) * 0.035 * uWind * uv.y;
        transformed.z += cos(uTime*1.6 + ph) * 0.03 * uWind * uv.y;`,
      );
  };
  const items: THREE.Matrix4[] = [];
  const near = (x: number, z: number) => x > -8 && x < 9 && z > 2.8 && z < 11;
  for (let k = 0; k < 2600 && items.length < 1500; k++) {
    const x = (rnd() - 0.5) * 60;
    const z = (rnd() - 0.45) * 44;
    const a = Math.abs(creekD(x, z));
    if (a < 3.5) continue;
    if (Math.abs(z - pathZ(x)) < 1.1 && x > -20) continue;
    if (near(x, z) && !(z > 8.6 || x < -6 || x > 7.6 || (a > 3.5 && a < 3.95 && (x > 3 || x < -6)))) continue;
    if (Math.hypot(x - LAYOUT.cabin.x, z - LAYOUT.cabin.z) < 6) continue;
    const y = terrainHeight(x, z);
    const n = 6 + Math.floor(rnd() * 6);
    const s = 0.5 + rnd() * 0.6;
    for (let f = 0; f < n; f++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25 + rnd() * 0.5, (f / n) * Math.PI * 2 + rnd() * 0.4, 0, 'YXZ'));
      items.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.02, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.4), s)));
    }
  }
  const mesh = new THREE.InstancedMesh(frond, mat, items.length);
  items.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'ferns';
  return mesh;
}

function buildGroundScatter(tex: ReturnType<typeof import('../engine/textures').makeTextures>, rnd: () => number) {
  const g = new THREE.Group();
  // stones along the banks and in the creek bed
  const stoneGeo = new THREE.IcosahedronGeometry(1, 3);
  const sp = stoneGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(sp, i);
    const n = 1 + vnoise2(v.x * 2.1 + 3, v.y * 2.3 + v.z * 1.7) * 0.18;
    v.multiplyScalar(n);
    sp.setXYZ(i, v.x, v.y, v.z);
  }
  stoneGeo.computeVertexNormals();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.rock.map,
    normalMap: tex.rock.normalMap,
    roughness: 0.6,
    color: new THREE.Color('#b8b4aa'),
  });
  const stones: THREE.Matrix4[] = [];
  for (let k = 0; k < 900 && stones.length < 340; k++) {
    const x = (rnd() - 0.5) * 50;
    const z = creekDummyZ(x, rnd);
    const a = Math.abs(creekD(x, z));
    if (a > 4.6) continue;
    if (Math.abs(x - 0.2) < 1.1 && Math.abs(z) < 5) continue; // keep log path clean
    if (Math.hypot(x - LAYOUT.rock.x, z - LAYOUT.rock.z) < 1.4) continue;
    const s = 0.05 + rnd() * (a < 3.2 ? 0.22 : 0.16);
    const y = terrainHeight(x, z) + s * 0.25;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
    stones.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s * 1.4, s * 0.7, s)));
  }
  const sm = new THREE.InstancedMesh(stoneGeo, stoneMat, stones.length);
  stones.forEach((m, i) => sm.setMatrixAt(i, m));
  sm.castShadow = true;
  sm.receiveShadow = true;
  sm.frustumCulled = false;
  g.add(sm);

  // moss mounds near tree roots / banks
  const mossMat = new THREE.MeshStandardMaterial({ color: '#4d6a2a', roughness: 1, map: tex.ground.map });
  const mosses: THREE.Matrix4[] = [];
  for (let k = 0; k < 500 && mosses.length < 160; k++) {
    const x = (rnd() - 0.5) * 40, z = (rnd() - 0.3) * 30;
    const a = Math.abs(creekD(x, z));
    if (a < 3.7) continue;
    if (x > -4.3 && x < 6 && z > 3.6 && z < 8) continue;
    const s = 0.2 + rnd() * 0.5;
    mosses.push(new THREE.Matrix4().compose(new THREE.Vector3(x, terrainHeight(x, z) - s * 0.25, z), new THREE.Quaternion(), new THREE.Vector3(s * 1.5, s * 0.5, s * 1.3)));
  }
  const mm = new THREE.InstancedMesh(stoneGeo, mossMat, mosses.length);
  mosses.forEach((m, i) => mm.setMatrixAt(i, m));
  mm.receiveShadow = true;
  mm.frustumCulled = false;
  g.add(mm);
  return g;
}

function creekDummyZ(x: number, rnd: () => number) {
  return (rnd() - 0.5) * 9.6 + 0.28 * Math.sin(x * 0.09 + 0.4) - 0.1;
}

export function buildDistantLayers() {
  // painted silhouette layers of far forest to give atmospheric depth
  const g = new THREE.Group();
  const rnd = mulberry32(55);
  for (let layer = 0; layer < 3; layer++) {
    const dist = 60 + layer * 30;
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = ['#3f5243', '#56695b', '#728375'][layer];
    ctx.beginPath();
    ctx.moveTo(0, 256);
    for (let x = 0; x <= 2048; x += 8) {
      const h = 120 + fbm2(x * 0.004 + layer * 10, layer, 4) * 80 + Math.abs(Math.sin(x * 0.05 + rnd())) * 18;
      ctx.lineTo(x, 256 - h);
    }
    ctx.lineTo(2048, 256);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.CylinderGeometry(dist, dist, 26 + layer * 8, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: true });
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 6 + layer * 3;
    m.renderOrder = -10 + layer;
    g.add(m);
  }
  return g;
}

export function buildLights() {
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -11; cam.right = 11; cam.top = 11; cam.bottom = -11;
  cam.near = 1; cam.far = 80;
  const hemi = new THREE.HemisphereLight('#b9c9d6', '#4a4430', 1.1);
  const fill = new THREE.DirectionalLight('#c9d6e6', 0.45);
  const rim = new THREE.DirectionalLight('#ffd7a0', 0.0);
  return { sun, hemi, fill, rim };
}

export { lerp, clamp };
