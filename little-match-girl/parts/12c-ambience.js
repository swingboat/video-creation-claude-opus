// ===== 12c-ambience.js：炊烟、炉火火舌与火星、窗中人影 =====
(() => {
  const S = M.story, rnd = M.rand(404);
  const scaleU = () => M.renderer.getPixelRatio() * innerHeight * 0.5;
  // 通用粒子池：CPU 更新位置与年龄，shader 按年龄着色
  const pool = (max, frag, blending, sizeExpr) => {
    const P = new Float32Array(max * 3), AGE = new Float32Array(max).fill(1), LIFE = new Float32Array(max).fill(1), SEED = new Float32Array(max), V = new Float32Array(max * 3);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aK', new T.BufferAttribute(AGE, 1)); g.setAttribute('aS', new T.BufferAttribute(SEED, 1));
    const U = { uScale: { value: 400 }, uDawn: { value: 0 } };
    const pts = new T.Points(g, new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute float aK, aS; uniform float uScale; varying float vK; varying float vS;
        void main(){ vK = aK; vS = aS; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = (${sizeExpr}) * uScale / -mv.z * step(aK, .999);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uDawn; varying float vK; varying float vS; ${frag}` }));
    pts.frustumCulled = false; M.scene.add(pts);
    let next = 0;
    return { P, AGE, LIFE, SEED, V, U, g, max,
      spawn(x, y, z, vx, vy, vz, life, seed = rnd()) { const i = next; next = (next + 1) % max;
        P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz; AGE[i] = 0; LIFE[i] = life; SEED[i] = seed; },
      step(dt, grav = 0, drag = 0) {
        for (let i = 0; i < max; i++) { if (AGE[i] >= 1) continue; AGE[i] = Math.min(1, AGE[i] + dt / LIFE[i]);
          V[i * 3 + 1] += grav * dt; const d = 1 - drag * dt; V[i * 3] *= d; V[i * 3 + 2] *= d;
          P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt; }
        g.attributes.position.needsUpdate = true; g.attributes.aK.needsUpdate = true; g.attributes.aS.needsUpdate = true;
        U.uScale.value = scaleU(); U.uDawn.value = S ? S.dawn : 0; } };
  };

  // ---- 炊烟 ----
  const smoke = pool(520, `void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.1,d) * sin(vK*3.1416) * .2;
      vec3 c = mix(vec3(.16,.18,.24), vec3(.6,.6,.65), uDawn); gl_FragColor = vec4(c, a); }`, T.NormalBlending, '(.5 + vK*2.4) * (.8+vS*.4)');
  const emitters = [];
  const ch = M.town.chimneys.slice().sort(() => rnd() - 0.5).slice(0, 16);
  ch.forEach(p => emitters.push({ p, t: rnd() * 0.5 }));
  M.ambience = { smokeAt: p => emitters.push({ p: p.clone(), t: 0 }) };

  // ---- 炉火：火舌 + 火星 ----
  const fire = pool(160, `void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,0.,d);
      vec3 c = vS < .8 ? mix(vec3(5.,3.2,1.2), vec3(2.2,.5,.1), vK) : vec3(6.,3.,1.);
      gl_FragColor = vec4(c*a, a*(1.-vK)); }`, T.AdditiveBlending, 'aS < .8 ? .16*(1.-vK*.6) : .035');
  const fires = [];
  M.ambience.fireAt = p => { fires.push({ p: p.clone(), t: 0, s: 0 }); };

  M.onFrame(dt => {
    for (const e of emitters) { e.t -= dt; if (e.t < 0) { e.t = 0.45 + rnd() * 0.2;
      smoke.spawn(e.p.x + (rnd() - .5) * .2, e.p.y, e.p.z + (rnd() - .5) * .2, 0.25 + rnd() * 0.1, 0.45 + rnd() * 0.15, (rnd() - .5) * 0.1, 6 + rnd() * 2); } }
    smoke.step(dt);
    for (const f of fires) {
      f.t -= dt; f.s -= dt;
      while (f.t < 0) { f.t += 1 / 45; const a = rnd() * 6.28, r = rnd() * 0.08;
        fire.spawn(f.p.x + Math.cos(a) * r, f.p.y, f.p.z + Math.sin(a) * r, (rnd() - .5) * .1, 0.5 + rnd() * 0.5, (rnd() - .5) * .1, 0.45 + rnd() * 0.4, rnd() * 0.79); }
      if (f.s < 0) { f.s = 0.15 + rnd() * 0.5;
        fire.spawn(f.p.x, f.p.y + 0.1, f.p.z, (rnd() - .3) * 1.2, 1.4 + rnd() * 1.2, (rnd() - .5) * 1.2, 1.1 + rnd() * 0.4, 0.85); }
    }
    fire.step(dt, -0.6, 0.6);
  }, 57);

  // ---- 窗中人影 ----
  const cand = M.town.lit.filter(w => { const s = new T.Vector3(), p = new T.Vector3(); w.m.decompose(p, new T.Quaternion(), s);
    return s.x > 0.5 && p.y < 6 && w.k > 1.2 && Math.abs(p.z + 12) < 45; }).sort(() => rnd() - 0.5).slice(0, 10);
  const figs = cand.map((w, i) => {
    const U = { uX: { value: -1 }, uA: { value: 0.85 }, uSway: { value: 0 } };
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uX, uA, uSway; varying vec2 vUv;
        void main(){ vec2 p = (vUv - vec2(uX + uSway, 0.)) * vec2(.7, 1.06);
          float head = smoothstep(.12, .1, length(p - vec2(0., .66)));
          float body = smoothstep(1.02, .95, length((p - vec2(0., .12)) / vec2(.23, .36)));
          float a = max(head, body) * uA; if (a < .01) discard; gl_FragColor = vec4(.1,.045,.02, a); }` }));
    m.matrixAutoUpdate = false; m.matrix.copy(w.m).multiply(new T.Matrix4().makeTranslation(0, 0, 0.004)); M.scene.add(m);
    return { U, mode: i % 3 === 0 ? 'idle' : 'pause', t: rnd() * 8, x: 0.3 + rnd() * 0.4, dir: rnd() < 0.5 ? 1 : -1, sp: 0.15 + rnd() * 0.1 };
  });
  M.onFrame(dt => {
    const dawn = S ? S.dawn : 0;
    for (const f of figs) {
      f.t -= dt;
      if (f.mode === 'idle') { f.U.uX.value = f.x; f.U.uSway.value = Math.sin(M.time * 0.7 + f.x * 9) * 0.03; }
      else if (f.mode === 'pause') { f.U.uX.value = -1; if (f.t < 0) { f.mode = 'walk'; f.dir = rnd() < 0.5 ? 1 : -1; f.x = f.dir > 0 ? -0.4 : 1.4; } }
      else { f.x += f.dir * f.sp * dt; f.U.uX.value = f.x; if (f.x < -0.45 || f.x > 1.45) { f.mode = 'pause'; f.t = 5 + rnd() * 10; } }
      f.U.uA.value = 0.85 * (1 - dawn);
    }
  }, 58);
})();
