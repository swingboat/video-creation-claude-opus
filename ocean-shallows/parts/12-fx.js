// ===== 12-fx.js =====
O.fx = (function () {
  const CAP = 1600;
  const P = []; // {x,y,z,vx,vy,vz,life,max,size,kind}
  const KIND_COL = [[.92, .97, 1, .9], [.45, .36, .24, .5], [.85, .9, 1, .55], [.25, 1, .85, .95]];
  function mkLayer(above) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(CAP * 3), col = new Float32Array(CAP * 4), sz = new Float32Array(CAP);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: 100 }, uGammaOut: { value: above ? 1 : 0 } },
      vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uPx; varying vec4 vCol;
        void main(){ vCol = aCol; gl_PointSize = max(1.5, aSize * uPx); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float uGammaOut; varying vec4 vCol; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q);
        float a = smoothstep(.5, .15, d) * vCol.a; vec3 c = vCol.rgb + smoothstep(.25, 0., length(q + .15)) * .4;
        c = mix(c, pow(c, vec3(1. / 2.2)), uGammaOut * 0.); gl_FragColor = vec4(c, a); }`,
      transparent: true, depthWrite: false, depthTest: false
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = above ? 40 : 9;
    (above ? O.aboveScene : O.underScene).add(pts);
    return { g, pos, col, sz, m };
  }
  const layers = [mkLayer(false), mkLayer(true)];

  const add = (x, y, z, vx, vy, vz, life, size, kind) => {
    const cap = O.quality < .7 ? 600 : CAP;
    if (P.length >= cap) P.shift();
    P.push({ x, y, z, vx, vy, vz, life, max: life, size, kind });
  };

  const api = {
    splash(x, y, size = 1) {
      const s = Math.max(.3, size);
      O.sim.drop(x, y, .3 * s, .55 * s);
      for (let i = 0; i < 3; i++) O.sim.drop(x + (Math.random() - .5) * s * .6, y + (Math.random() - .5) * s * .6, .12 * s, .15 * s);
      const n = Math.round((15 + 25 * Math.min(1.5, s)) * (O.quality < .7 ? .5 : 1));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = (.6 + Math.random() * 1.6) * Math.sqrt(s), up = 2 + Math.random() * 3.2 * Math.sqrt(s);
        add(x + Math.cos(a) * .1 * s, y + Math.sin(a) * .1 * s, .02, Math.cos(a) * sp, Math.sin(a) * sp, up, 2, .03 + Math.random() * .045, 0);
      }
      O.addFoam(x, y, s * 1.2);
      O.bio.add(x, y, .7 * s, 1.2);
      if (O.params.bio > .05) for (let i = 0; i < 14; i++) { const a = Math.random() * 7, r = Math.random() * .6 * s; add(x + Math.cos(a) * r, y + Math.sin(a) * r, -.05, Math.cos(a) * .3, Math.sin(a) * .3, 0, .9, .06, 3); }
      O.audio && O.audio.splash(s);
    },
    drip(x, y, z) { add(x, y, z, 0, 0, -.3, 3, .028, 0); },
    silt(x, y, k = 1) {
      const bed = -Math.max(O.depth(x, y), .1) + .04;
      for (let i = 0; i < 40 * k; i++) {
        const a = Math.random() * Math.PI * 2, sp = .2 + Math.random() * .6;
        add(x + Math.cos(a) * .1, y + Math.sin(a) * .1, bed, Math.cos(a) * sp, Math.sin(a) * sp, .15 + Math.random() * .35, 2.5 + Math.random() * 1.5, .1 + Math.random() * .12, 1);
      }
      O.bio.add(x, y, .6, .6);
    }
  };

  // ---- 开关：下雨 / 漩涡 / 平静 ----
  O.vortex.x = O.W * .18; O.vortex.y = -O.H * .12;
  O.toggleRain = (v = !O.rain.on) => { O.rain.on = v; if (v && O.calm) O.toggleCalm(false); O.emit('toggles'); };
  O.toggleVortex = (v = !O.vortex.on) => {
    O.vortex.on = v;
    if (v) { if (O.calm) O.toggleCalm(false); if (O.depth(O.vortex.x, O.vortex.y) < .8) { const [x, y] = O.randomWater(1.5); O.vortex.x = x; O.vortex.y = y; } }
    O.emit('toggles');
  };
  O.calm = false; let calmTarget = 1;
  O.toggleCalm = (v = !O.calm) => {
    O.calm = v; calmTarget = v ? .2 : 1;
    if (v) { O.sim.clear(); O.rain.on = false; O.vortex.on = false; }
    O.emit('toggles');
  };

  let vAng = 0;
  O.onFrame(dt => {
    O.calmFactor += (calmTarget - O.calmFactor) * Math.min(1, dt / 1.2);
    // 雨
    if (O.rain.k > .02) {
      const n = Math.round((6 + Math.random() * 6) * O.rain.k);
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - .5) * O.W, y = (Math.random() - .5) * O.H;
        if (O.depth(x, y) > 0) O.sim.drop(x, y, .045, .02 + Math.random() * .025);
        if (Math.random() < .5) O.bio.add(x, y, .12, .25);
      }
      for (let i = 0; i < 10 * O.rain.k; i++) add((Math.random() - .5) * O.W, (Math.random() - .5) * O.H, 3 + Math.random(), -.6, -.3, -12, .5, .022, 2);
    }
    // 漩涡：沿环注入旋转扰动 → 螺旋波纹
    const V = O.vortex;
    if (V.s > .02) {
      vAng += dt * 3.2;
      for (let i = 0; i < 6; i++) { const a = vAng + i / 6 * Math.PI * 2, r = .35 + (i % 3) * .3; O.sim.drop(V.x + Math.cos(a) * r, V.y + Math.sin(a) * r, .1, .012 * V.s); }
      O.sim.drop(V.x, V.y, .3, .006 * V.s);
    }
    // 粒子
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt;
      if (p.kind === 1) { const d = Math.exp(-dt * 1.4); p.vx *= d; p.vy *= d; p.vz = p.vz * d - .05 * dt; }
      else if (p.kind === 3) { p.vx *= .96; p.vy *= .96; }
      else p.vz -= 9.8 * dt;
      if (V.s > .02 && p.z < .2) { const dx = p.x - V.x, dy = p.y - V.y, r2 = dx * dx + dy * dy + .1, f = V.s * Math.exp(-r2 / 3) * 2; p.vx += -dy * f * dt; p.vy += dx * f * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.kind === 1) p.z = Math.max(p.z, -Math.max(O.depth(p.x, p.y), .1) + .02);
      if ((p.kind === 0 || p.kind === 2) && p.z <= 0 && p.vz < 0) {
        if (O.depth(p.x, p.y) > 0) { O.sim.drop(p.x, p.y, .05, p.kind === 0 ? .04 : .015); if (p.kind === 0) O.bio.add(p.x, p.y, .12, .35); }
        p.life = 0;
      }
      if (p.life <= 0) P.splice(i, 1);
    }
    const pxPerUnit = renderer.getPixelRatio() * innerHeight / O.H;
    const cnt = [0, 0];
    for (const p of P) {
      const L = layers[p.z > 0 ? 1 : 0], i = cnt[p.z > 0 ? 1 : 0]++;
      const k = KIND_COL[p.kind], fade = Math.min(1, p.life / Math.min(.4, p.max));
      L.pos[i * 3] = p.x; L.pos[i * 3 + 1] = p.y; L.pos[i * 3 + 2] = p.z;
      const lit = p.kind === 3 ? 1 : .35 + .65 * O.params.ambient;
      L.col[i * 4] = k[0] * lit; L.col[i * 4 + 1] = k[1] * lit; L.col[i * 4 + 2] = k[2] * lit; L.col[i * 4 + 3] = k[3] * fade;
      L.sz[i] = p.size * (p.z > 0 ? 1 + p.z * .12 : 1);
    }
    layers.forEach((L, j) => { L.m.uniforms.uPx.value = pxPerUnit; L.g.setDrawRange(0, cnt[j]);
      ['position', 'aCol', 'aSize'].forEach(a => L.g.attributes[a].needsUpdate = true); });
  }, 50);
  return api;
})();
