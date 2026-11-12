// ===== 09-rays.js =====
(function () {
  // ---- 花纹纹理（u = 翼展，v = 体长，画布顶部 = 头部）----
  const tex = draw => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); draw(c, O.rng(draw.length * 97 + 3)); const t = new THREE.CanvasTexture(cv); return t; };
  const dots = (c, r, n, col, rmin, rmax, ring) => {
    for (let i = 0; i < n; i++) { const x = r() * 256, y = r() * 256, rr = rmin + r() * (rmax - rmin);
      c.beginPath(); c.arc(x, y, rr, 0, 7);
      if (ring && r() < .35) { c.strokeStyle = col; c.lineWidth = rr * .45; c.stroke(); } else { c.fillStyle = col; c.fill(); } }
  };
  const TEX = {
    manta: [tex((c, r) => {
      c.fillStyle = '#16181e'; c.fillRect(0, 0, 256, 256);
      [-1, 1].forEach(s => { c.save(); c.translate(128 + s * 62, 70); c.rotate(s * .55);
        const g = c.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, 'rgba(235,235,230,.95)'); g.addColorStop(.7, 'rgba(220,220,215,.6)'); g.addColorStop(1, 'rgba(220,220,215,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 46, 20, 0, 0, 7); c.fill(); c.restore(); });
      c.fillStyle = 'rgba(60,64,72,.5)'; c.fillRect(110, 0, 36, 256);
    }), tex((c, r) => {
      c.fillStyle = '#f2f1ec'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(30,30,40,.8)'; c.beginPath(); c.ellipse(96 + r() * 64, 110 + r() * 80, 3 + r() * 6, 2 + r() * 5, r() * 3, 0, 7); c.fill(); }
      const g = c.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(40,40,50,.85)'); g.addColorStop(.1, 'rgba(40,40,50,0)'); g.addColorStop(.9, 'rgba(40,40,50,0)'); g.addColorStop(1, 'rgba(40,40,50,.85)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    })],
    eagle: [tex((c, r) => {
      c.fillStyle = '#16233a'; c.fillRect(0, 0, 256, 256);
      dots(c, r, 150, 'rgba(240,245,250,.92)', 2, 5.5, true);
    }), tex(c => { c.fillStyle = '#f4f3ee'; c.fillRect(0, 0, 256, 256); })],
    stingray: [tex((c, r) => {
      const g = c.createRadialGradient(128, 128, 10, 128, 128, 150); g.addColorStop(0, '#c49a5c'); g.addColorStop(1, '#8a6a3c');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      dots(c, r, 70, '#22b4ff', 3, 7.5, false);
      dots(c, r, 30, 'rgba(120,220,255,.9)', 1.5, 3, false);
      c.fillStyle = '#3a2a18'; [[106, 62], [150, 62]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); });
      c.fillStyle = '#1a120a'; [[104, 84], [152, 84]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 5, 3, 0, 0, 7); c.fill(); });
    }), tex(c => { c.fillStyle = '#efe6d6'; c.fillRect(0, 0, 256, 256); })]
  };

  // ---- 几何：上下两层薄板 + 尾巴（+ 蝠鲼头鳍）----
  const SHAPES = {
    manta: { L: .56, hs: t => t < .45 ? .5 * Math.pow(t / .45, .75) : .5 * (.2 + .8 * Math.pow((1 - t) / .55, 1.2)), sweep: .18, thick: .05, tailL: .35, tailW: .02, horns: true },
    eagle: { L: .62, hs: t => t > .86 ? .09 : t < .42 ? .5 * Math.pow(t / .42, .7) : .5 * Math.pow((.86 - t) / .44, 1.15) + .09 * (t - .42) / .44, sweep: .24, thick: .05, tailL: 1.9, tailW: .018 },
    stingray: { L: .62, hs: t => .5 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2))) * (.86 + .14 * t) + .01, sweep: 0, thick: .06, tailL: .75, tailW: .045 }
  };
  function buildGeo(sh) {
    const P = [], A = [], I = [], NS = 20, NV = 18;
    const push = (x, y, z, span, v, side, tail) => { P.push(x, y, z); A.push(span, v, side, tail); return P.length / 3 - 1; };
    for (const side of [1, -1]) {
      const base = P.length / 3;
      for (let j = 0; j <= NV; j++) {
        const t = j / NV, x = (t - .5) * sh.L, h = sh.hs(t);
        for (let i = 0; i <= NS; i++) {
          const s = i / NS * 2 - 1, y = s * h, prof = (1 - s * s) * Math.sin(Math.PI * Math.min(1, t * 1.05 + .02));
          push(x - Math.abs(y) * Math.abs(y) * sh.sweep * 4, y, side * sh.thick * prof * (side > 0 ? 1 : .45), y / .5, t * 2 - 1, side, 0);
        }
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NS; i++) {
        const a = base + j * (NS + 1) + i, b = a + 1, c = a + NS + 1, d = c + 1;
        if (side > 0) I.push(a, b, d, a, d, c); else I.push(a, d, b, a, c, d);
      }
    }
    // 尾巴：两面三角带
    const tb = P.length / 3, NT = 16;
    for (let k = 0; k <= NT; k++) { const f = k / NT, x = -sh.L * .5 - f * sh.tailL, w = sh.tailW * (1 - f * .92);
      push(x, -w, .005, 0, f, 1, 1); push(x, w, .005, 0, f, 1, 1); }
    for (let k = 0; k < NT; k++) { const a = tb + k * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2, a, a + 3, a + 1, a, a + 2, a + 3); }
    if (sh.horns) for (const s of [-1, 1]) {
      const hb = P.length / 3, x0 = sh.L * .5 - .01, y0 = s * .085;
      push(x0, y0 - .02, .01, 0, 0, 1, 2); push(x0, y0 + .02, .01, 0, 0, 1, 2);
      push(x0 + .09, y0 + s * .015 - .015, .05, 0, 1, 1, 2); push(x0 + .09, y0 + s * .015 + .015, .05, 0, 1, 1, 2);
      I.push(hb, hb + 1, hb + 3, hb, hb + 3, hb + 2, hb, hb + 3, hb + 1, hb, hb + 2, hb + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(A, 4));
    g.setIndex(I);
    return g;
  }

  const MAXI = 16;
  const VERT = `
    attribute vec4 aInfo; attribute vec3 aAnim; // aAnim: 相位, 幅度, 模式(0 扇动 / 1 圆盘波动)
    uniform float uTime, uTailAmp; varying vec3 vW; varying vec2 vUv; varying float vSide, vTail;
    void main(){
      vec3 p = position; float s = aInfo.x, v = aInfo.y; vSide = aInfo.z; vTail = aInfo.w;
      vUv = vec2(clamp(s * .5 + .5, 0., 1.), clamp(v * .5 + .5, 0., 1.));
      if(vTail > .5 && vTail < 1.5){ p.y += sin(aAnim.x * .5 + uTime * 1.6 - v * 5.) * .06 * v * uTailAmp; p.z += sin(aAnim.x - v * 3.) * .03 * v; vUv = vec2(.5, v); }
      else if(vTail > 1.5){ p.z += sin(uTime * 2.) * .01 * v; }
      else if(aAnim.z < .5){ float as = abs(s); p.z += aAnim.y * sin(aAnim.x - as * 1.3) * pow(as, 1.6) * .5; p.x -= aAnim.y * .06 * as * cos(aAnim.x); }
      else { float r = length(vec2(s, v)); p.z += aAnim.y * sin(atan(v, s) * 3. + aAnim.x * 1.4) * smoothstep(.55, 1., r) * .06; }
      vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = gamma => `
    uniform sampler2D uTop, uBot; uniform vec3 uSunDir, uSunCol, uSky, uTailCol; uniform float uAmbient, uStripes;
    varying vec3 vW; varying vec2 vUv; varying float vSide, vTail;
    void main(){
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if(n.z < 0.) n = -n;
      vec3 c = vSide > 0. ? texture2D(uTop, vUv).rgb : texture2D(uBot, vUv).rgb;
      if(vTail > .5){ c = uTailCol; if(uStripes > .5) c = mix(c, vec3(.92), step(.5, fract(vUv.y * 9.)) * step(.3, vUv.y)); }
      c = pow(c, vec3(2.2));
      float lam = .45 + .75 * max(dot(n, uSunDir), 0.);
      vec3 col = c * (uSunCol * lam + uSky * .25) * (.25 + .75 * uAmbient);
      ${gamma ? 'col = pow(col, vec3(1. / 2.2));' : ''}
      gl_FragColor = vec4(col, ${gamma ? '1.' : 'clamp(-vW.z / 4., 0., .99)'});
    }`;

  const TAIL = { manta: ['#1c1d22', 0, .4], eagle: ['#1a2234', 0, 1.6], stingray: ['#3a6aa0', 1, .7] };
  const meshes = {};
  for (const type of ['manta', 'eagle', 'stingray']) {
    const g0 = buildGeo(SHAPES[type]);
    meshes[type] = [false, true].map(above => {
      const g = g0.clone(); const anim = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3); g.setAttribute('aAnim', anim);
      const m = new THREE.ShaderMaterial({
        uniforms: { uTime: O.U.uTime, uSunDir: O.U.uSunDir, uSunCol: O.SU.uSunCol, uSky: O.SU.uSky, uAmbient: O.SU.uAmbient,
          uTop: { value: TEX[type][0] }, uBot: { value: TEX[type][1] }, uTailCol: { value: new THREE.Color(TAIL[type][0]) },
          uStripes: { value: TAIL[type][1] }, uTailAmp: { value: TAIL[type][2] } },
        vertexShader: VERT, fragmentShader: FRAG(above), side: THREE.DoubleSide, extensions: { derivatives: true }
      });
      const mesh = new THREE.InstancedMesh(g, m, MAXI); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = above ? 30 : 5;
      (above ? O.aboveScene : O.underScene).add(mesh);
      return { mesh, anim };
    });
  }
  O.rayGeometry = type => buildGeo(SHAPES[type]);
  O.rayMaterialFor = type => meshes[type][1].mesh.material;

  // ---- 物种定义 ----
  const DEF = {
    manta: { size: 1.7, cfg: { speed: .42, turnRate: .65, minDepth: .9, wander: 1.0, bankK: .5 }, swimFrac: .45, canJump: true, flap: .32, omega: 2.0, mode: 0 },
    eagle: { size: 1.15, cfg: { speed: .58, turnRate: .95, minDepth: .75, wander: 1.2, bankK: .45 }, swimFrac: .5, canJump: true, flap: .38, omega: 2.7, mode: 0 },
    stingray: { size: .78, cfg: { speed: .32, turnRate: 1.4, minDepth: .35, wander: 1.4, bankK: .25 }, swimFrac: .92, canJump: false, flap: .5, omega: 3.2, mode: 1 }
  };
  for (const type in DEF) {
    const D = DEF[type];
    O.species[type] = {
      kind: 'ray', size: D.size, swimFrac: D.swimFrac, canJump: D.canJump, cfg: D.cfg,
      shadow: c => [c.size * SHAPES[type].L * 1.1, c.size * .95],
      make(c) { c.ph = Math.random() * 6; c.amp = D.flap; c.restT = 10 + Math.random() * 15; },
      remove() {},
      update(c, dt, skip) {
        let k = c.speed / D.cfg.speed;
        if (!skip) {
          if (c.state === 'rest') {
            c.speed *= .9; const dep = Math.max(O.depth(c.x, c.y), .1); c.z += (-dep + .06 - c.z) * dt * 2; c.bank *= .95;
            if (c.stateT > c.restDur) { c.state = 'swim'; c.stateT = 0; O.fx.silt(c.x, c.y, .5); }
            k = .15;
          } else if (c.state === 'swim') {
            O.steer(c, dt, D.cfg);
            if (type === 'stingray' && c.fleeT <= 0) {
              c.restT -= dt;
              if (c.restT < 0) { c.restT = 15 + Math.random() * 20; const d = O.depth(c.x, c.y); if (d < 2.6 && d > .4) { c.state = 'rest'; c.stateT = 0; c.restDur = 8 + Math.random() * 12; } }
            }
          }
        }
        if (c.state === 'held') k = .4;
        const tgtAmp = D.flap * (c.state === 'rest' ? .2 : .55 + .5 * Math.min(1.6, k));
        c.amp += (tgtAmp - c.amp) * Math.min(1, dt * 2);
        c.ph += D.omega * dt * (.6 + .5 * Math.min(2, k));
      }
    };
  }

  // ---- 每帧写入实例 ----
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'ZYX'), ps = new THREE.Vector3(), sc = new THREE.Vector3();
  O.onFrame(() => {
    for (const type in meshes) {
      const cnt = [0, 0], D = DEF[type];
      for (const c of O.creatures) {
        if (c.type !== type) continue;
        const L = meshes[type][c.above ? 1 : 0], i = cnt[c.above ? 1 : 0]++;
        if (i >= MAXI) continue;
        e.set(c.bank + c.roll, -c.pitch, c.heading); q.setFromEuler(e);
        const s = c.size * (.6 + .4 * c.fade);
        ps.set(c.x, c.y, c.z); sc.set(s, s, s); m4.compose(ps, q, sc);
        L.mesh.setMatrixAt(i, m4); L.anim.setXYZ(i, c.ph, c.amp, D.mode);
      }
      meshes[type].forEach((L, j) => { L.mesh.count = Math.min(cnt[j], MAXI); L.mesh.instanceMatrix.needsUpdate = true; L.anim.needsUpdate = true; });
    }
  }, 60);
})();
