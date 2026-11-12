// Creek water surface, splash particles, spray mist and floating debris.
import * as THREE from 'three';
import { LAYOUT, creekCenter, flowSpeed, terrainHeight, waterLevel } from './layout';
import { B, LOG_Y, buildSplashEvents, logPoint, sprayMist, SplashEvent } from '../anim/story';
import { clamp, mulberry32, smoothstep } from '../engine/math';
import { makeMistSprite, makeSoftSprite } from '../engine/textures';

const NOISE_GLSL = `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.07; a*=0.5;} return s; }
`;

export function buildWater(shared: { uTime: { value: number }; uWater: { value: number } }) {
  // strip following the creek centre-line, dense near the action
  const xs: number[] = [];
  for (let x = -70; x <= 70; ) {
    xs.push(x);
    x += Math.abs(x) < 14 ? 0.12 : 0.6;
  }
  const nzs = 90;
  const halfW = 4.4;
  const pos: number[] = [], bed: number[] = [], idx: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = 0; j <= nzs; j++) {
      const x = xs[i];
      const d = -halfW + (2 * halfW * j) / nzs;
      const z = creekCenter(x) + d;
      pos.push(x, 0, z);
      bed.push(terrainHeight(x, z));
    }
  }
  const row = nzs + 1;
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < nzs; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
  g.setIndex(idx);

  const uniforms = {
    uTime: shared.uTime,
    uLevel: shared.uWater,
    uFlow: { value: 1.2 },
    uFlowPhase: { value: 0 },
    uRock: { value: new THREE.Vector3(LAYOUT.rock.x, LAYOUT.rock.z, LAYOUT.rockRadius) },
    uLogA: { value: new THREE.Vector2() },
    uLogB: { value: new THREE.Vector2() },
    uSurge: { value: 0 },
    uSurgeX: { value: -20 },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.6).normalize() },
    uSunCol: { value: new THREE.Color('#fff0d8') },
    uSkyTop: { value: new THREE.Color('#8fa6b8') },
    uSkyHor: { value: new THREE.Color('#cfd8d9') },
    uShallow: { value: new THREE.Color('#58704a') },
    uDeep: { value: new THREE.Color('#102a26') },
    uFogColor: { value: new THREE.Color('#9fb0b0') },
    uFogDensity: { value: 0.02 },
    uLight: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime; uniform float uLevel; uniform float uSurge; uniform float uSurgeX; uniform float uFlowPhase;
      attribute float aBed; varying float vDepth; varying vec3 vW; varying float vSurge;
      ${NOISE_GLSL}
      void main(){
        vec3 p = position;
        p.y = uLevel;
        float wave = (vn(vec2(p.x*1.3 - uFlowPhase*1.1, p.z*1.7))-0.5)*0.025;
        float sx = p.x - uSurgeX;
        float surge = uSurge * exp(-sx*sx*0.6) * 0.16;
        p.y += wave + surge;
        vSurge = surge;
        vDepth = p.y - aBed;
        vec4 w = modelMatrix * vec4(p,1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uFlow; uniform float uFlowPhase; uniform vec3 uRock; uniform vec2 uLogA; uniform vec2 uLogB;
      uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyTop; uniform vec3 uSkyHor; uniform vec3 uShallow; uniform vec3 uDeep;
      uniform vec3 uFogColor; uniform float uFogDensity; uniform float uLight; uniform float uSurge;
      varying float vDepth; varying vec3 vW; varying float vSurge;
      ${NOISE_GLSL}
      float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
      void main(){
        vec2 p = vW.xz;
        // flow field: base +x, deflected around the rock
        vec2 rel = p - uRock.xy; float rd = length(rel);
        vec2 flow = vec2(1.0,0.0);
        float infl = exp(-max(rd-uRock.z,0.0)*2.2);
        vec2 tang = normalize(vec2(rel.y,-rel.x)) * sign(rel.y+0.0001) * -1.0;
        flow = normalize(mix(flow, normalize(rel)*0.2 + vec2(1.0,0.0)*0.2 + tang, infl*0.8));
        // advect noise along flow (phase is integrated flow distance from the CPU)
        vec2 q = p - vec2(uFlowPhase,0.0);
        // swirl downstream of the rock
        float wake = smoothstep(0.0,0.4,rel.x) * exp(-abs(rel.y)*3.5) * exp(-max(rel.x,0.0)*0.9);
        float ang = wake * sin(rel.x*3.0 - uTime*1.5) * 0.35;
        mat2 R = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
        vec2 q2 = R*(q - uRock.xy) + uRock.xy;
        float n1 = fbm(vec2(q2.x*1.6, q2.y*3.2));
        float n2 = fbm(vec2(q2.x*4.0 + 3.1, q2.y*6.0) + vec2(uTime*0.15,0.0));
        float e = 0.04;
        float nx = fbm(vec2((q2.x+e)*1.6,q2.y*3.2)) - n1;
        float nz = fbm(vec2(q2.x*1.6,(q2.y+e)*3.2)) - n1;
        vec3 N = normalize(vec3(-nx*3.0 - (fbm(vec2((q2.x+e)*4.0+3.1,q2.y*6.0))-n2)*1.4, 1.0, -nz*2.4));
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.02 + 0.38*pow(1.0 - max(dot(N,V),0.0), 5.0);
        vec3 Rv = reflect(-V, N);
        vec3 sky = mix(uSkyHor, uSkyTop, clamp(Rv.y,0.0,1.0)) * 0.6;
        float dep = max(vDepth, 0.0);
        vec3 body = mix(uShallow, uDeep, smoothstep(0.05, 0.7, dep)) * uLight;
        float spec = pow(max(dot(Rv, uSunDir),0.0), 300.0) * 1.3 + pow(max(dot(Rv,uSunDir),0.0), 30.0)*0.06;
        // foam
        float rockFoam = smoothstep(uRock.z+0.18, uRock.z-0.02, rd) * smoothstep(0.45,0.8, fbm(q2*7.0 + uTime*0.3));
        float logD = segDist(p, uLogA, uLogB);
        float upstream = step(0.0, -(p.x - mix(uLogA.x,uLogB.x, clamp((p.y-uLogA.y)/(uLogB.y-uLogA.y),0.0,1.0))));
        float logFoam = smoothstep(0.28, 0.12, logD) * smoothstep(0.5,0.78, fbm(q*8.0 + uTime*0.6)) * mix(0.5,1.0,upstream);
        float wakeFoam = wake * smoothstep(0.62, 0.85, fbm(vec2(q2.x*3.0, q2.y*9.0))) * 0.7;
        float shore = smoothstep(0.05, 0.0, dep) * smoothstep(0.55,0.8, fbm(p*6.0 + uTime*0.2)) * 0.8;
        float streak = smoothstep(0.78, 0.9, fbm(vec2(q.x*0.9, q.y*7.0))) * 0.14 * smoothstep(0.2,0.5,dep);
        float foam = clamp(rockFoam + logFoam + wakeFoam + shore + streak + vSurge*5.0*fbm(q*5.0), 0.0, 1.0);
        vec3 col = mix(body, sky, fres) + uSunCol * spec * uLight;
        col = mix(col, vec3(0.9,0.93,0.92)*uLight*1.02, foam*0.9);
        float alpha = mix(0.28, 0.93, smoothstep(0.02, 0.55, dep));
        alpha = max(alpha, foam*0.9);
        alpha = max(alpha, fres*0.9);
        alpha *= smoothstep(-0.02, 0.015, vDepth);
        float fd = length(cameraPosition - vW);
        float fogF = 1.0 - exp(-uFogDensity*uFogDensity*fd*fd);
        col = mix(col, uFogColor, fogF);
        gl_FragColor = vec4(col, alpha);
#include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'water';
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;

  let phase = 0;
  let lastT = 0;
  const update = (t: number) => {
    // integrated flow distance (closed form via fine sampling for determinism)
    if (t !== lastT) {
      phase = 0;
      const dt = 0.05;
      for (let s = 0; s < t; s += dt) phase += flowSpeed(s) * Math.min(dt, t - s);
      lastT = t;
    }
    uniforms.uFlowPhase.value = phase;
    uniforms.uFlow.value = flowSpeed(t);
    const a = logPoint(t, 0), b = logPoint(t, 1);
    uniforms.uLogA.value.set(a.x, a.z);
    uniforms.uLogB.value.set(b.x, b.z);
    const st = t - B.surge;
    uniforms.uSurge.value = st > -1.2 && st < 2.5 ? Math.exp(-Math.pow((st - 0.0) / 0.9, 2)) : 0;
    uniforms.uSurgeX.value = -0.3 + st * 2.6;
  };
  return { mesh, uniforms, update };
}

/** CPU-evaluated ballistic splash particles: exact for any frame. */
export function buildSplashes() {
  const events = buildSplashEvents();
  const MAX = 9000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const size = new Float32Array(MAX);
  const alpha = new Float32Array(MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const uniforms = { uTex: { value: makeSoftSprite() }, uScale: { value: 900 }, uLight: { value: new THREE.Color(1, 1, 1) } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
      void main(){ vA=aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uScale/ -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uLight; varying float vA;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uLight*0.95, t.a*vA*0.85);
#include <colorspace_fragment>
 }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  // pre-generate per-event random velocities
  const seeds = events.map((e, i) => {
    const r = mulberry32(1000 + i);
    return Array.from({ length: e.n }, () => {
      const a = r() * Math.PI * 2;
      const sp = e.speed * (0.3 + r() * 0.7);
      return {
        v: new THREE.Vector3(Math.cos(a) * sp * 0.6 + e.dir.x * e.speed * r(), e.up * (0.4 + r() * 0.6), Math.sin(a) * sp * 0.6 + e.dir.y * e.speed * r()),
        s: e.size * (0.5 + r()),
        life: e.life * (0.5 + r() * 0.5),
        off: new THREE.Vector3((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12),
      };
    });
  });
  const update = (t: number) => {
    let k = 0;
    const lvl = waterLevel(t);
    for (let i = 0; i < events.length && k < MAX; i++) {
      const e = events[i];
      if (e.t > t) break;
      const age = t - e.t;
      if (age > e.life + 0.2) continue;
      for (const s of seeds[i]) {
        if (age > s.life || k >= MAX) continue;
        const x = e.p.x + s.off.x + s.v.x * age;
        const y = e.p.y + s.v.y * age - 4.9 * age * age;
        const z = e.p.z + s.off.z + s.v.z * age;
        if (y < lvl - 0.02 && age > 0.05) continue;
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        size[k] = s.s * (1 + age * 1.5);
        alpha[k] = (1 - age / s.life) * 0.9;
        k++;
      }
    }
    geo.setDrawRange(0, k);
    geo.attributes.position.needsUpdate = true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  };
  return { points, update, uniforms };
}

/** soft drifting mist: valley haze + creek vapour + surge spray */
export function buildMist() {
  const rnd = mulberry32(808);
  const N = 260;
  const geo = new THREE.BufferGeometry();
  const base: { p: THREE.Vector3; s: number; sp: number; kind: number }[] = [];
  for (let i = 0; i < N; i++) {
    const kind = i < 140 ? 0 : i < 200 ? 1 : 2;
    let p: THREE.Vector3;
    if (kind === 0) p = new THREE.Vector3((rnd() - 0.5) * 70, 0.5 + rnd() * 5, (rnd() - 0.4) * 50);
    else if (kind === 1) {
      const x = (rnd() - 0.5) * 40;
      p = new THREE.Vector3(x, -0.05 + rnd() * 0.5, creekCenter(x) + (rnd() - 0.5) * 6);
    } else p = new THREE.Vector3(-1 + rnd() * 2.4, 0.0 + rnd() * 0.6, -1.5 + rnd() * 2);
    base.push({ p, s: kind === 2 ? 0.6 + rnd() * 0.8 : 3 + rnd() * 5, sp: 0.1 + rnd() * 0.2, kind });
  }
  const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const uniforms = { uTex: { value: makeMistSprite() }, uScale: { value: 900 }, uColor: { value: new THREE.Color('#d8e0e0') }, uAmount: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
      void main(){ vA=aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = min(aSize*uScale/ -mv.z, 900.0); gl_Position = projectionMatrix*mv;
      vA *= smoothstep(0.6, 3.0, -mv.z); }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uColor; uniform float uAmount; varying float vA;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a*vA*uAmount);
#include <colorspace_fragment>
 }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  const update = (t: number) => {
    const spray = sprayMist(t);
    base.forEach((b, i) => {
      let x = b.p.x + t * b.sp * (b.kind === 1 ? 3 : 1), y = b.p.y, z = b.p.z;
      let a = b.kind === 0 ? 0.07 : 0.1;
      if (b.kind === 0) x = ((x + 35) % 70 + 70) % 70 - 35;
      if (b.kind === 1) {
        x = ((x + 20) % 40 + 40) % 40 - 20;
        z = creekCenter(x) + (b.p.z - creekCenter(b.p.x));
      }
      if (b.kind === 2) {
        const age = clamp(t - B.surge);
        const dt = Math.max(0, t - B.surge);
        x = b.p.x + dt * 0.5;
        y = b.p.y + dt * 0.25;
        z = b.p.z + dt * (1.6 + b.sp * 4);
        a = 0.35 * spray * age;
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      size[i] = b.s;
      alpha[i] = a;
    });
    geo.attributes.position.needsUpdate = true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  };
  return { points: pts, update, uniforms };
}

/** floating leaves and branches, advected by the flow and piling against the log */
export function buildDebris(tex: { bark: { map: THREE.Texture } }) {
  const group = new THREE.Group();
  const rnd = mulberry32(4242);
  const twigMat = new THREE.MeshStandardMaterial({ map: tex.bark.map, color: '#8a7a68', roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#7b8a35', roughness: 0.6, side: THREE.DoubleSide });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: '#a8762e', roughness: 0.6, side: THREE.DoubleSide });
  type Item = { obj: THREE.Object3D; t0: number; x0: number; z: number; len: number; spin: number; hero?: boolean };
  const items: Item[] = [];
  const makeBranch = (len: number) => {
    const g = new THREE.Group();
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, len, 6), twigMat);
    main.rotation.z = Math.PI / 2;
    g.add(main);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, len * 0.35, 5), twigMat);
      b.position.set((rnd() - 0.5) * len * 0.7, 0.01, 0);
      b.rotation.set(0, rnd() * 6, Math.PI / 2 + (rnd() - 0.5));
      b.translateY(len * 0.15);
      g.add(b);
      for (let l = 0; l < 3; l++) {
        const lf = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), rnd() > 0.5 ? leafMat : leafMat2);
        lf.scale.set(0.6, 1.3, 1);
        lf.position.set(b.position.x + (rnd() - 0.5) * 0.15, 0.02, (rnd() - 0.5) * 0.15);
        lf.rotation.x = -Math.PI / 2 + (rnd() - 0.5) * 0.4;
        g.add(lf);
      }
    }
    g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    return g;
  };
  // hero branch that hits the rock at branchHit
  const hero = makeBranch(0.9);
  group.add(hero);
  items.push({ obj: hero, t0: B.branchHit - 5.5, x0: LAYOUT.rock.x - 0.58 - 0.45 - 5.5 * 1.4, z: LAYOUT.rock.z - 0.25, len: 0.9, spin: 0.2, hero: true });
  for (let i = 0; i < 26; i++) {
    const len = 0.3 + rnd() * 0.8;
    const b = makeBranch(len);
    group.add(b);
    items.push({ obj: b, t0: 12 + rnd() * 70, x0: -14 - rnd() * 6, z: (rnd() - 0.5) * 3.6, len, spin: (rnd() - 0.5) * 0.6 });
  }
  for (let i = 0; i < 70; i++) {
    const lf = new THREE.Mesh(new THREE.CircleGeometry(0.035, 6), rnd() > 0.5 ? leafMat : leafMat2);
    lf.scale.set(0.6, 1.3, 1);
    group.add(lf);
    items.push({ obj: lf, t0: rnd() * 80, x0: -16 - rnd() * 8, z: (rnd() - 0.5) * 4.6, len: 0.05, spin: (rnd() - 0.5) * 2 });
  }
  const update = (t: number) => {
    const lvl = waterLevel(t);
    for (const it of items) {
      const age = t - it.t0;
      if (age < 0) {
        it.obj.visible = false;
        continue;
      }
      let x = it.x0 + age * (it.hero ? 1.4 : 1.25) * (0.8 + 0.2 * Math.sin(it.z * 3));
      let z = it.z + creekCenter(x);
      let yaw = it.spin * age;
      // hero branch: hits the rock, swings around and jams against the log
      if (it.hero) {
        const hit = B.branchHit;
        if (t > hit) {
          const after = t - hit;
          x = LAYOUT.rock.x - 0.58 - 0.45 + Math.min(after, 1.2) * 0.35 + Math.max(0, after - 1.2) * 0.25;
          yaw = Math.min(after * 1.4, 1.3);
          z = LAYOUT.rock.z - 0.62 - Math.min(after, 1.5) * 0.25;
        }
      }
      // pile against the log (upstream face)
      const lp = logPoint(t, clamp((z + 4.7) / 9.4));
      const stopX = lp.x - LAYOUT.logRadius - it.len * 0.5;
      const under = it.len < 0.1; // small leaves slip under the log
      if (!under && x > stopX) {
        x = stopX;
        yaw = Math.PI / 2 * 0.9 + Math.sin(it.z * 9) * 0.15;
      }
      if (under && x > stopX + 0.6) x = x; // continue downstream
      // rock deflection
      const dx = x - LAYOUT.rock.x, dz = z - LAYOUT.rock.z;
      const dd = Math.hypot(dx, dz);
      if (!it.hero && dd < LAYOUT.rockRadius + 0.15) {
        const k = (LAYOUT.rockRadius + 0.15) / Math.max(dd, 0.01);
        x = LAYOUT.rock.x + dx * k;
        z = LAYOUT.rock.z + dz * k;
      }
      const vis = x < 40 && Math.abs(z - creekCenter(x)) < 3.2;
      it.obj.visible = vis;
      const bob = Math.sin(t * 2.3 + it.z * 7) * 0.008;
      it.obj.position.set(x, lvl + 0.005 + bob, z);
      if (it.len < 0.1) it.obj.rotation.set(-Math.PI / 2, 0, yaw);
      else it.obj.rotation.set(Math.sin(t * 1.7 + it.z) * 0.08, yaw, 0);
    }
  };
  void smoothstep;
  void LOG_Y;
  return { group, update };
}

export type { SplashEvent };
