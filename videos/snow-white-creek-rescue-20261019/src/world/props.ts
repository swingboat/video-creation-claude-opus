// Props: log, boulder, cart, basket, apples, cabin, tool bag, rope, light shafts, foreground leaves.
import * as THREE from 'three';
import { LAYOUT, terrainHeight } from './layout';
import { LOG_LEN, LOG_Y, logBob, logPoint, logRoll, logYaw } from '../anim/story';
import { mulberry32, vnoise2 } from '../engine/math';
import { makeHeroLeaf, makeSoftSprite } from '../engine/textures';

type Tex = ReturnType<typeof import('../engine/textures').makeTextures>;

const shadow = (o: THREE.Object3D) => {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
};

export function buildLog(tex: Tex) {
  const r = LAYOUT.logRadius;
  const g = new THREE.CylinderGeometry(r * 0.92, r, LOG_LEN + 0.3, 28, 60, false);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    const n = vnoise2(a * 3, y * 2) * 0.015 + vnoise2(a * 9, y * 7) * 0.006;
    const k = rr > 0.001 ? (rr + n) / rr : 1;
    p.setXYZ(i, x * k, y + Math.sin(y * 0.6) * 0, z * k);
    uv.setXY(i, uv.getX(i) * 3, (y / (LOG_LEN + 0.3)) * 10);
    // wet/dark underside, mossy top band
    const up = Math.cos(a - Math.PI / 2) * -1; // z>0 local? use y-axis later after rotation; local x is world up after rotateZ
    const wet = Math.max(0, -x / r);
    const moss = Math.max(0, x / r - 0.55) * (0.5 + vnoise2(y * 1.3, a) * 0.5);
    void up;
    col[i * 3] = (1 - wet * 0.45) * (1 - moss * 0.4);
    col[i * 3 + 1] = (1 - wet * 0.42) * (1 + moss * 0.25);
    col[i * 3 + 2] = (1 - wet * 0.4) * (1 - moss * 0.5);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  // lay the cylinder along +z with local +x pointing up
  g.rotateZ(Math.PI / 2); // cylinder axis now along x, local old-x -> y
  g.rotateY(-Math.PI / 2); // axis along z
  g.translate(0, 0, LOG_LEN / 2);
  const mat = new THREE.MeshStandardMaterial({
    map: tex.bark.map,
    normalMap: tex.bark.normalMap,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughnessMap: tex.bark.roughnessMap,
    vertexColors: true,
    color: '#c9b9a5',
  });
  const mesh = new THREE.Mesh(g, mat);
  const group = new THREE.Group();
  group.add(mesh);
  // broken branch stubs
  const rnd = mulberry32(8);
  for (let i = 0; i < 6; i++) {
    const s = 0.1 + rnd() * 0.8;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.3 + rnd() * 0.3, 7), mat);
    const a = rnd() * Math.PI * 2;
    if (s > 0.3 && s < 0.97 && Math.abs(Math.sin(a)) > 0.6 && Math.sin(a) > 0) continue; // keep the top walkable
    stub.position.set(Math.cos(a) * r, Math.sin(a) * r, s * LOG_LEN);
    stub.rotation.set(0, 0, a - Math.PI / 2);
    group.add(stub);
  }
  // cut end rings
  shadow(group);
  const update = (t: number) => {
    const far = logPoint(t, 0);
    group.position.set(far.x, LOG_Y + logBob(t) * 0.5, far.z);
    const yaw = Math.atan2(LAYOUT.logNear.x - LAYOUT.logFar.x, LAYOUT.logNear.z - LAYOUT.logFar.z) + logYaw(t);
    group.rotation.set(0, 0, 0);
    group.rotateY(yaw);
    mesh.rotation.z = logRoll(t);
  };
  return { group, update };
}

export function buildRock(tex: Tex) {
  const g = new THREE.IcosahedronGeometry(1, 5);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = 1 + vnoise2(v.x * 1.8 + 2, v.z * 1.8 + v.y) * 0.16 + vnoise2(v.x * 5, v.y * 5 + v.z * 3) * 0.04;
    v.multiplyScalar(n);
    if (v.y > 0.55) v.y = 0.55 + (v.y - 0.55) * 0.35; // flattish top for the fawn
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const wet = y < 0.1 ? 0.55 : y < 0.35 ? 0.75 : 1;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = wet;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({
    map: tex.rock.map,
    normalMap: tex.rock.normalMap,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 0.55,
    vertexColors: true,
    color: '#a9a69c',
  });
  const m = new THREE.Mesh(g, mat);
  const R = LAYOUT.rockRadius;
  m.scale.set(R, 0.42, R * 0.9);
  m.position.set(LAYOUT.rock.x, -0.33, LAYOUT.rock.z);
  shadow(m);
  // other creek rocks for foam variety
  const grp = new THREE.Group();
  grp.add(m);
  const rnd = mulberry32(31);
  const extra: [number, number, number][] = [[-6, 1.2, 0.35], [4.5, -1.4, 0.4], [7, 1.6, 0.3], [-3.2, -1.8, 0.28], [10, 0.4, 0.45], [-9, -0.6, 0.38], [2.8, 2.2, 0.25]];
  for (const [x, z, s] of extra) {
    const e = new THREE.Mesh(g, mat);
    e.scale.set(s * 1.2, s * 0.7, s);
    e.position.set(x, terrainHeight(x, z) + s * 0.2, z);
    e.rotation.y = rnd() * 6;
    shadow(e);
    grp.add(e);
  }
  return grp;
}

/** top-of-rock height where the fawn stands */
export const ROCK_TOP = -0.33 + 0.42 * 0.58;

function apple(rnd: () => number) {
  const g = new THREE.SphereGeometry(0.042, 20, 14);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const dimple = Math.exp(-Math.pow(v.x * v.x + v.z * v.z, 0.5) * 60) * 0.012;
    v.y *= 0.9;
    v.y -= Math.sign(v.y) * dimple;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(0.99 + rnd() * 0.02, 0.75, 0.32 + rnd() * 0.06), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  );
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.025, 5), new THREE.MeshStandardMaterial({ color: '#4a3520' }));
  stem.position.y = 0.045;
  stem.rotation.z = 0.25;
  m.add(stem);
  return shadow(m);
}

export function makeApple(seed = 1) {
  return apple(mulberry32(seed));
}

export function buildBasket(tex: Tex) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const y = i / 10;
    pts.push(new THREE.Vector2(0.11 + y * 0.06 + Math.sin(y * Math.PI) * 0.01, y * 0.14));
  }
  const lathe = new THREE.LatheGeometry(pts, 32);
  const wicker = new THREE.MeshStandardMaterial({ color: '#9a7446', map: tex.fabric.map, normalMap: tex.fabric.normalMap, normalScale: new THREE.Vector2(3, 3), roughness: 0.9, side: THREE.DoubleSide });
  wicker.map = tex.fabric.map.clone();
  wicker.map.repeat.set(6, 2);
  wicker.map.needsUpdate = true;
  const body = new THREE.Mesh(lathe, wicker);
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), wicker);
  bottom.rotation.x = -Math.PI / 2;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.009, 8, 40), wicker);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  g.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 8, 30, Math.PI), wicker);
  handle.position.y = 0.14;
  g.add(handle);
  // cloth
  const cloth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshStandardMaterial({ color: '#e9e2d0', side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.rotation.x = -Math.PI / 2 + 0.2;
  cloth.position.set(0.03, 0.135, 0.02);
  g.add(cloth);
  const rnd = mulberry32(3);
  const apples: THREE.Object3D[] = [];
  for (let i = 0; i < 7; i++) {
    const a = apple(rnd);
    const ang = (i / 7) * Math.PI * 2;
    a.position.set(Math.cos(ang) * 0.075 * (i % 2 ? 1 : 0.4), 0.15 + (i % 3) * 0.015, Math.sin(ang) * 0.075 * (i % 2 ? 1 : 0.4));
    a.rotation.set(rnd(), rnd(), rnd());
    g.add(a);
    apples.push(a);
  }
  shadow(g);
  return { group: g, apples, handleTop: new THREE.Vector3(0, 0.3, 0) };
}

export function buildCart(tex: Tex) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: tex.wood.map, normalMap: tex.wood.normalMap, roughness: 0.8, color: '#b89a78' });
  const iron = new THREE.MeshStandardMaterial({ color: '#3b3a38', roughness: 0.5, metalness: 0.7 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m = wood) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  // bed along local x (cart moves along -x, handles at +x)
  box(1.15, 0.05, 0.62, 0, 0.42, 0);
  box(1.15, 0.22, 0.04, 0, 0.53, 0.31);
  box(1.15, 0.22, 0.04, 0, 0.53, -0.31);
  box(0.04, 0.22, 0.62, -0.57, 0.53, 0);
  box(0.04, 0.22, 0.62, 0.57, 0.53, 0);
  // handles
  for (const z of [0.26, -0.26]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.75, 8), wood);
    h.rotation.z = Math.PI / 2 - 0.25;
    h.position.set(0.85, 0.5, z);
    g.add(h);
  }
  // leg
  box(0.05, 0.4, 0.05, 0.5, 0.2, 0);
  // wheels
  const wheels: THREE.Object3D[] = [];
  for (const z of [0.36, -0.36]) {
    const w = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 10, 32), wood);
    w.add(rim);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 8, 32), iron);
    w.add(tire);
    for (let s = 0; s < 8; s++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.5, 6), wood);
      sp.rotation.z = (s / 8) * Math.PI;
      w.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), wood);
    hub.rotation.x = Math.PI / 2;
    w.add(hub);
    w.position.set(-0.15, 0.27, z);
    g.add(w);
    wheels.push(w);
  }
  // tools: pickaxe, shovel, lantern
  const handleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.95, 8);
  const pick = new THREE.Group();
  pick.add(new THREE.Mesh(handleGeo, wood));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.42, 8), iron);
  head.rotation.z = Math.PI / 2;
  head.position.y = 0.45;
  pick.add(head);
  pick.rotation.set(0.2, 0, 1.2);
  pick.position.set(0.05, 0.75, 0.12);
  g.add(pick);
  const shovel = new THREE.Group();
  shovel.add(new THREE.Mesh(handleGeo, wood));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.015), iron);
  blade.position.y = -0.55;
  shovel.add(blade);
  shovel.rotation.set(-0.15, 0.2, 1.35);
  shovel.position.set(-0.05, 0.72, -0.12);
  g.add(shovel);
  const lantern = new THREE.Group();
  lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8), new THREE.MeshPhysicalMaterial({ color: '#f5e2b0', transmission: 0.5, roughness: 0.2, emissive: '#5a3a10', emissiveIntensity: 0.4 })));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.07, 8), iron);
  cap.position.y = 0.1;
  lantern.add(cap);
  lantern.position.set(-0.4, 0.55, 0.15);
  g.add(lantern);
  // coiled spare rope hanging under the bed (Dopey finds it)
  const coil = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ map: tex.rope.map, normalMap: tex.rope.normalMap, color: '#d8c49a', roughness: 0.95 });
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.16 - i * 0.004, 0.014, 8, 40), ropeMat);
    t.rotation.x = Math.PI / 2;
    t.position.y = i * 0.022;
    coil.add(t);
  }
  coil.position.set(0.15, 0.25, 0);
  g.add(coil);
  shadow(g);
  return { group: g, wheels, coil, ropeMat };
}

export function buildToolBag(tex: Tex) {
  const g = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.75, normalMap: tex.fabric.normalMap });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), leather);
  body.scale.set(1.3, 0.75, 0.8);
  body.position.y = 0.15;
  g.add(body);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 24, Math.PI), leather);
  strap.position.y = 0.25;
  g.add(strap);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), new THREE.MeshStandardMaterial({ color: '#a08060' }));
  handle.rotation.z = 1.1;
  handle.position.set(0.12, 0.33, 0.05);
  g.add(handle);
  shadow(g);
  return g;
}

export function buildCabin(tex: Tex) {
  const g = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ map: tex.bark.map, normalMap: tex.bark.normalMap, color: '#a88a6a', roughness: 0.9 });
  const W = 6, D = 4.6, H = 2.6;
  for (let i = 0; i < 11; i++) {
    const y = 0.12 + i * 0.24;
    for (const [len, x, z, ry] of [[W + 0.4, 0, D / 2, 0], [W + 0.4, 0, -D / 2, 0], [D + 0.4, W / 2, 0, Math.PI / 2], [D + 0.4, -W / 2, 0, Math.PI / 2]] as const) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, len, 10), logMat);
      c.rotation.set(0, ry, Math.PI / 2);
      c.position.set(x, y, z);
      g.add(c);
    }
  }
  // roof
  const roofMat = new THREE.MeshStandardMaterial({ map: tex.wood.map, color: '#6e5a48', roughness: 0.9 });
  for (const s of [1, -1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.12, D / 2 + 0.9), roofMat);
    r.position.set(0, H + 0.85, s * (D / 4 + 0.2));
    r.rotation.x = s * -0.62;
    g.add(r);
  }
  const gable = new THREE.Shape();
  gable.moveTo(-D / 2, 0);
  gable.lineTo(D / 2, 0);
  gable.lineTo(0, 1.55);
  gable.closePath();
  for (const x of [W / 2, -W / 2]) {
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), new THREE.MeshStandardMaterial({ map: tex.wood.map, color: '#8a6e52', side: THREE.DoubleSide }));
    gm.rotation.y = Math.PI / 2;
    gm.position.set(x, H, 0);
    g.add(gm);
  }
  // chimney
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), new THREE.MeshStandardMaterial({ map: tex.rock.map, color: '#8a857c' }));
  ch.position.set(-W / 2 + 0.9, H + 1.2, -0.6);
  g.add(ch);
  // windows & door with warm glow (front faces +z toward the path)
  const glow = new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffab4a', emissiveIntensity: 0.0 });
  const windows: THREE.Mesh[] = [];
  for (const x of [-1.6, 1.7]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), glow);
    w.position.set(x, 1.45, D / 2 + 0.14);
    g.add(w);
    windows.push(w);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.06), roofMat);
    frame.position.set(x, 1.45, D / 2 + 0.16);
    g.add(frame);
    const frame2 = frame.clone();
    frame2.rotation.z = Math.PI / 2;
    frame2.scale.x = 0.85;
    g.add(frame2);
    frame2.position.set(x, 1.45, D / 2 + 0.16);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.8, 0.08), roofMat);
  door.position.set(0.1, 0.95, D / 2 + 0.12);
  g.add(door);
  const lamp = new THREE.PointLight('#ffb35c', 0, 14, 1.6);
  lamp.position.set(0, 1.5, D / 2 + 1.0);
  g.add(lamp);
  g.position.set(LAYOUT.cabin.x, terrainHeight(LAYOUT.cabin.x, LAYOUT.cabin.z), LAYOUT.cabin.z);
  g.rotation.y = 0.25;
  shadow(g);
  return { group: g, glow, lamp, windows };
}

/** dynamic rope: tube regenerated each frame through control points */
export class Rope {
  mesh: THREE.Mesh;
  private radius: number;
  private mat: THREE.MeshStandardMaterial;
  constructor(mat: THREE.MeshStandardMaterial, radius = 0.014) {
    this.radius = radius;
    this.mat = mat.clone();
    this.mat.map = mat.map!.clone();
    this.mat.map.needsUpdate = true;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
  }
  update(points: THREE.Vector3[], slide = 0, visible = true) {
    this.mesh.visible = visible && points.length >= 2;
    if (!this.mesh.visible) return;
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const len = curve.getLength();
    const segs = Math.max(8, Math.min(200, Math.round(len * 24)));
    const tube = new THREE.TubeGeometry(curve, segs, this.radius, 7, false);
    this.mesh.geometry.dispose();
    this.mesh.geometry = tube;
    this.mat.map!.repeat.set(len * 14, 1);
    this.mat.map!.offset.set(slide * 14, 0);
  }
}

/** additive light shafts through the canopy */
export function buildLightShafts() {
  const g = new THREE.Group();
  const rnd = mulberry32(17);
  const tex = makeSoftSprite();
  const mats: THREE.ShaderMaterial[] = [];
  const shaftDefs: [number, number, number, number][] = [];
  for (let i = 0; i < 16; i++) shaftDefs.push([(rnd() - 0.5) * 36, -4 + rnd() * 18, 0.6 + rnd() * 1.6, rnd()]);
  for (const [x, z, w, ph] of shaftDefs) {
    const geo = new THREE.CylinderGeometry(w * 0.6, w, 22, 16, 1, true);
    geo.translate(0, 11, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uInt: { value: 0.1 }, uCol: { value: new THREE.Color('#fff4dc') }, uTime: { value: 0 }, uPh: { value: ph }, uTex: { value: tex } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uInt; uniform vec3 uCol; uniform float uTime; uniform float uPh; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float edge = pow(abs(dot(vN,vV)), 1.6); float fadeY = smoothstep(0.0,0.25,vUv.y)*smoothstep(1.0,0.6,vUv.y);
        float flick = 0.75 + 0.25*sin(uTime*0.6 + uPh*20.0 + vUv.x*12.0);
        gl_FragColor = vec4(uCol * uInt * edge * fadeY * flick, 1.0); }`,
    });
    mats.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, terrainHeight(x, z) - 0.5, z);
    g.add(m);
  }
  const update = (t: number, sunDir: THREE.Vector3, intensity: number, col: THREE.Color) => {
    g.children.forEach((c, i) => {
      // align shaft axis with the sun direction
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir);
      mats[i].uniforms.uInt.value = intensity;
      mats[i].uniforms.uTime.value = t;
      mats[i].uniforms.uCol.value.copy(col);
    });
  };
  return { group: g, update };
}

/** big wet foreground leaves for the opening push-through */
export function buildForegroundLeaves() {
  const tex = makeHeroLeaf();
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, color: '#d0e0c0' });
  const rnd = mulberry32(12);
  const leaves: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.PlaneGeometry(0.5, 1, 4, 8);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k);
      p.setZ(k, x * x * 0.8 - y * y * 0.15);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.userData.base = { x: (rnd() - 0.5) * 2.2, y: (rnd() - 0.5) * 1.2, z: -rnd() * 1.6, rz: (rnd() - 0.5) * 2, rx: (rnd() - 0.5), s: 0.5 + rnd() * 0.5 };
    g.add(m);
    leaves.push(m);
  }
  return { group: g, leaves };
}
