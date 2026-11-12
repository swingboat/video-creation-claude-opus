// ===== 11-jelly.js =====
(function () {
  const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'ZYX');
  // ---- 材质：菲涅耳半透明 ----
  const mkMat = (o) => new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(o.col).convertSRGBToLinear() }, uRust: { value: new THREE.Color(o.rust || o.col).convertSRGBToLinear() },
      uStripes: { value: o.stripes || 0 }, uBase: { value: o.base ?? .12 }, uRim: { value: o.rim ?? .65 }, uGlow: { value: 0 }, uFade: { value: 1 },
      uGammaOut: { value: 0 }, uAmbient: O.SU.uAmbient, uSunCol: O.SU.uSunCol },
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uCol, uRust, uSunCol; uniform float uStripes, uBase, uRim, uGlow, uFade, uGammaOut, uAmbient; varying vec3 vN; varying vec3 vP;
      void main(){ float f = pow(1. - abs(vN.z), 2.);
        vec3 c = uCol;
        if(uStripes > 0.){ float a = atan(vP.y, vP.x); c = mix(c, uRust, smoothstep(.55, .85, sin(a * uStripes)) * smoothstep(.05, .3, length(vP.xy))); }
        vec3 col = c * (uSunCol * .8 + .25) * (.3 + .7 * uAmbient) + vec3(.2, 1., .9) * uGlow;
        float al = (uBase + uRim * f) * uFade;
        col = mix(col, pow(col, vec3(1. / 2.2)), uGammaOut);
        gl_FragColor = vec4(col, clamp(al, 0., 1.)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  const ribbonMat = () => new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uGlow: { value: 0 }, uGammaOut: { value: 0 }, uAmbient: O.SU.uAmbient, uSunCol: O.SU.uSunCol, uTime: O.U.uTime },
    vertexShader: `attribute vec4 aRib; varying vec4 vRib; varying vec3 vCol; void main(){ vRib = aRib; vCol = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uFade, uGlow, uGammaOut, uAmbient, uTime; uniform vec3 uSunCol; varying vec4 vRib; varying vec3 vCol;
      void main(){ float t = vRib.x, side = vRib.y, frill = vRib.z;
        float edge = 1. - abs(side);
        float a = (.25 + .6 * edge) * (1. - t * .75);
        if(frill > .5){ float w = .5 + .5 * sin(t * 60. + uTime * 2.); a *= .55 + .45 * smoothstep(.0, .6, edge + w * .3); a += .25 * step(abs(side), .3); }
        vec3 col = vCol * (uSunCol * .8 + .25) * (.3 + .7 * uAmbient) + vec3(.2, 1., .9) * uGlow * (1. - t);
        col = mix(col, pow(col, vec3(1. / 2.2)), uGammaOut);
        gl_FragColor = vec4(col, a * uFade); }`,
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide
  });

  // ---- 钟体轮廓（Lathe，绕 Y 轴；之后旋转使轴线为 +Z）----
  const bellGeo = (h, flare) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * .5 + (i > 13 ? (i - 13) * flare : 0), Math.cos(a) * h - (i > 13 ? (i - 13) * .01 : 0))); }
    const g = new THREE.LatheGeometry(pts, 40); g.rotateX(Math.PI / 2); return g;
  };
  const SPEC = {
    moon: { size: .75, col: '#dbe8f2', base: .13, rim: .6, h: .26, flare: .01,
      ribbons: [{ n: 36, nodes: 4, len: .16, w: .012, col: '#f0e8f0', rim: true }] },
    nettle: { size: .85, col: '#d98a2e', rust: '#8a2e12', stripes: 16, base: .2, rim: .7, h: .34, flare: .02,
      ribbons: [{ n: 8, nodes: 16, len: 2.6, w: .014, col: '#c8642a', rim: true }, { n: 4, nodes: 12, len: 1.5, w: .085, col: '#f5e4c4', frill: true }] }
  };

  function makeVisual(type) {
    const S = SPEC[type], group = new THREE.Group(), bell = new THREE.Group(); group.add(bell);
    const mats = [];
    const bm = mkMat(S); mats.push(bm);
    bell.add(new THREE.Mesh(bellGeo(S.h, S.flare), bm));
    if (type === 'moon') {
      const gm = mkMat({ col: '#f08ab8', base: .55, rim: .3 }); mats.push(gm);
      for (let i = 0; i < 4; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(.085, .022, 6, 20, Math.PI * 1.45), gm);
        const a = i * Math.PI / 2 + Math.PI / 4; t.position.set(Math.cos(a) * .12, Math.sin(a) * .12, .14); t.rotation.z = a + Math.PI * .75; bell.add(t);
      }
      const lp = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; lp.push(Math.cos(a) * .06, Math.sin(a) * .06, .24, Math.cos(a) * .48, Math.sin(a) * .48, .05); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      const lm = mkMat({ col: '#f6d0e4', base: .35, rim: 0 }); mats.push(lm); bell.add(new THREE.LineSegments(lg, lm));
    }
    // 丝带
    const ribs = []; let vc = 0;
    S.ribbons.forEach(R => { for (let i = 0; i < R.n; i++) { const a = (i + .5) / R.n * Math.PI * 2; ribs.push({ R, a, nodes: Array.from({ length: R.nodes }, () => new THREE.Vector3()), prev: Array.from({ length: R.nodes }, () => new THREE.Vector3()), off: vc }); vc += R.nodes * 2; } });
    const pos = new Float32Array(vc * 3), rib = new Float32Array(vc * 4), col = new Float32Array(vc * 3), idx = [];
    ribs.forEach(r => { const c = new THREE.Color(r.R.col).convertSRGBToLinear();
      for (let k = 0; k < r.R.nodes; k++) { const o = r.off + k * 2; for (const j of [0, 1]) { rib.set([k / (r.R.nodes - 1), j ? 1 : -1, r.R.frill ? 1 : 0, 0], (o + j) * 4); col.set([c.r, c.g, c.b], (o + j) * 3); }
        if (k < r.R.nodes - 1) idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } });
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('aRib', new THREE.BufferAttribute(rib, 4));
    rg.setAttribute('color', new THREE.BufferAttribute(col, 3)); rg.setIndex(idx);
    const rm = ribbonMat(); mats.push(rm);
    const rmesh = new THREE.Mesh(rg, rm); rmesh.frustumCulled = false;
    return { group, bell, ribs, rg, rmesh, mats, S };
  }
  O.jellyVisual = makeVisual;
  O.jellySim = (v, c, dt, hang) => simRibbons(v, c, dt, hang);

  // 丝带物理 + 几何更新（世界坐标）
  function simRibbons(v, c, dt, hang) {
    const g = v.group; g.updateMatrixWorld(true);
    const sc = v.bell.scale.x, grav = hang ? -2.5 : -.25, floor = -Math.max(O.depth(c.x, c.y), .1) + .02;
    const pos = v.rg.attributes.position.array;
    for (const r of v.ribs) {
      const rr = r.R.rim ? .48 * sc : .07, L = r.R.len / (r.R.nodes - 1);
      V.set(Math.cos(r.a) * rr, Math.sin(r.a) * rr, r.R.rim ? .02 : .1).applyMatrix4(v.bell.matrixWorld);
      const N = r.nodes, P = r.prev;
      if (!r.init) { for (let k = 0; k < N.length; k++) { N[k].set(V.x, V.y, V.z - k * L * c.size); P[k].copy(N[k]); } r.init = true; }
      N[0].copy(V);
      for (let k = 1; k < N.length; k++) {
        const n = N[k], p = P[k], vx = (n.x - p.x) * .9, vy = (n.y - p.y) * .9, vz = (n.z - p.z) * .9;
        p.copy(n); n.x += vx; n.y += vy; n.z += vz + grav * dt * dt * 6;
        if (!hang && n.z < floor) n.z = floor;
      }
      const seg = L * c.size;
      for (let it = 0; it < 2; it++) for (let k = 1; k < N.length; k++) {
        const a = N[k - 1], b = N[k]; V2.subVectors(b, a); const d = V2.length() || 1e-5; b.copy(a).addScaledVector(V2, seg / d);
      }
      // 朝向相机（相机看向 -Z）：宽度方向 = 切线 × Z
      for (let k = 0; k < N.length; k++) {
        const a = N[Math.max(0, k - 1)], b = N[Math.min(N.length - 1, k + 1)];
        let sx = -(b.y - a.y), sy = b.x - a.x; const sl = Math.hypot(sx, sy);
        if (sl < 1e-4) { sx = -Math.sin(r.a); sy = Math.cos(r.a); } else { sx /= sl; sy /= sl; }
        const w = r.R.w * c.size * (1 - k / N.length * .7) * (r.R.frill ? (1 + .4 * Math.sin(k * 1.7 + O.time * 2)) : 1);
        const o = (r.off + k * 2) * 3, n = N[k];
        pos[o] = n.x - sx * w; pos[o + 1] = n.y - sy * w; pos[o + 2] = n.z; pos[o + 3] = n.x + sx * w; pos[o + 4] = n.y + sy * w; pos[o + 5] = n.z;
      }
    }
    v.rg.attributes.position.needsUpdate = true;
  }

  // ---- 物种 ----
  const current = (x, y) => { const e = .3, s = .12, t = O.time * .03, f = (a, b) => O.vnoise(a * s + t, b * s - t);
    return [(f(x, y + e) - f(x, y - e)) / (2 * e) * 6, -(f(x + e, y) - f(x - e, y)) / (2 * e) * 6]; };
  for (const type of ['moon', 'nettle']) {
    O.species[type] = {
      kind: 'jelly', size: SPEC[type].size, swimFrac: .35,
      shadow: c => [c.size * .8, c.size * .8],
      make(c) {
        c.v = makeVisual(type); c.vx = 0; c.vy = 0; c.T = 1.6 + Math.random() * .6; c.pt = Math.random(); c.dripT = 0; c.glowT = 0;
        O.underScene.add(c.v.group); O.underScene.add(c.v.rmesh); c.v.group.renderOrder = 8; c.v.rmesh.renderOrder = 7;
        c.inAbove = false;
      },
      remove(c) { [c.v.group, c.v.rmesh].forEach(o => o.parent && o.parent.remove(o)); c.v.rg.dispose(); },
      onScare(c) { c.pt = 0; c.vx += c.fleeX * .5; c.vy += c.fleeY * .5; c.heading = Math.atan2(c.fleeY, c.fleeX); c.fleeT = 0; },
      update(c, dt, skip) {
        // 脉动：30% 快速收缩，70% 缓慢舒张
        c.pt = (c.pt + dt / c.T) % 1;
        const p = c.pt, con = p < .3 ? Math.sin(p / .3 * Math.PI / 2) : 1 - (p - .3) / .7 * ((p - .3) / .7) * (3 - 2 * (p - .3) / .7);
        if (!skip) {
          const thrust = p < .3 ? .55 : 0, tilt = .6;
          c.vx += Math.cos(c.heading) * thrust * dt; c.vy += Math.sin(c.heading) * thrust * dt;
          const [cx, cy] = current(c.x, c.y); c.vx += cx * dt * .5; c.vy += cy * dt * .5;
          const Vx = O.vortex; if (Vx.s > .01) { const dx = c.x - Vx.x, dy = c.y - Vx.y, r = Math.hypot(dx, dy) || .01, f = Vx.s * Math.exp(-r * r / 6);
            c.vx += (-dy / r * 1.2 / (r + .3) - dx / r * .3) * f * dt * 3; c.vy += (dx / r * 1.2 / (r + .3) - dy / r * .3) * f * dt * 3; }
          // 避岸与边缘：转向 + 推开
          const ah = O.depth(c.x + Math.cos(c.heading), c.y + Math.sin(c.heading));
          if (ah < .8) { const g = O.depthGrad(c.x, c.y); c.heading += O.angDiff(c.heading, Math.atan2(g[1], g[0])) * dt * 1.5; }
          if (O.depth(c.x, c.y) < .45) { const g = O.depthGrad(c.x, c.y), gl = Math.hypot(...g) || 1; c.vx += g[0] / gl * dt; c.vy += g[1] / gl * dt; }
          const hw = O.W / 2 - .8, hh = O.H / 2 - .8;
          if (Math.abs(c.x) > hw || Math.abs(c.y) > hh) c.heading += O.angDiff(c.heading, Math.atan2(-c.y, -c.x)) * dt * 1.2;
          c.heading += Math.sin(O.time * .2 + c.seed) * dt * .15;
          const damp = Math.exp(-dt * .9); c.vx *= damp; c.vy *= damp;
          c.x += c.vx * dt; c.y += c.vy * dt; c.speed = Math.hypot(c.vx, c.vy);
          const dep = Math.max(O.depth(c.x, c.y), .1);
          c.z += (-Math.min(dep * .4, 1.1) + Math.sin(O.time * .5 + c.seed) * .08 - c.z) * dt;
          c.pitch = tilt;
        }
        // 视觉
        const v = c.v, hang = c.state === 'held' || c.state === 'thrown';
        const above = c.z > .02;
        if (above !== c.inAbove) { const sc = above ? O.aboveScene : O.underScene; sc.add(v.group); sc.add(v.rmesh); c.inAbove = above; v.mats.forEach(m => m.uniforms.uGammaOut.value = above ? 1 : 0); }
        v.group.position.set(c.x, c.y, c.z);
        const tilt = hang ? 0 : .55 + .2 * Math.min(1, c.speed * 3);
        E.set(0, tilt, c.heading); v.group.quaternion.setFromEuler(E);
        v.group.rotateY(0); v.group.scale.setScalar(c.size);
        const r = 1 - .22 * con; v.bell.scale.set(r, r, 1 + .16 * con);
        const glow = O.params.bio * (.35 + .35 * con);
        v.mats.forEach(m => { m.uniforms.uGlow.value = glow; m.uniforms.uFade.value = c.fade; });
        simRibbons(v, c, dt, hang);
        if (O.params.bio > .05 && (c.glowT -= dt) < 0) { c.glowT = .25; O.bio.add(c.x, c.y, .35 * c.size, .12 * O.params.bio); }
        if (c.state === 'held' && (c.dripT -= dt) < 0) {
          c.dripT = .12 + Math.random() * .1;
          const rb = v.ribs[(Math.random() * v.ribs.length) | 0], tip = rb.nodes[rb.nodes.length - 1];
          O.fx.drip(tip.x, tip.y, tip.z);
        }
      }
    };
  }
})();
