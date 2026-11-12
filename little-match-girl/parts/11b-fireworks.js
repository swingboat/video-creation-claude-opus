// ===== 11b-fireworks.js：新年烟花（上升火种 + 球形爆散）=====
(() => {
  const MAX = 1600, P = new Float32Array(MAX * 3), V = new Float32Array(MAX * 3), K = new Float32Array(MAX).fill(1), L = new Float32Array(MAX), C = new Float32Array(MAX * 3);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('aK', new T.BufferAttribute(K, 1)); g.setAttribute('aC', new T.BufferAttribute(C, 3));
  const U = { uScale: { value: 400 }, uTime: { value: 0 } };
  const pts = new T.Points(g, new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    vertexShader: `attribute float aK; attribute vec3 aC; uniform float uScale; varying float vK; varying vec3 vC;
      void main(){ vK = aK; vC = aC; vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_PointSize = max(1.5, 1.05 * (1.-aK*.55) * uScale / -mv.z) * step(aK, .999); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; varying float vK; varying vec3 vC;
      void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,0.,d); a *= a;
        vec3 c = mix(vec3(12.,9.,6.), vC*9., smoothstep(0., .25, vK)) * (1.-vK);
        float tw = vK > .6 ? step(.5, fract(sin(gl_FragCoord.x*12.9+uTime*40.)*43758.)) : 1.;
        gl_FragColor = vec4(c*a*tw, a*(1.-vK)); }` }));
  pts.frustumCulled = false; M.scene.add(pts);
  let next = 0;
  const spawn = (x, y, z, vx, vy, vz, life, c) => { const i = next; next = (next + 1) % MAX;
    P.set([x, y, z], i * 3); V.set([vx, vy, vz], i * 3); K[i] = 0; L[i] = life; C.set([c.r, c.g, c.b], i * 3); };
  const rockets = [];
  M.fx.firework = (pos, color = '#ffcc66') => {
    const c = M.col(color), from = new T.Vector3(pos.x + (Math.random() - 0.5) * 3, 1, pos.z + (Math.random() - 0.5) * 3);
    rockets.push({ p: from, to: pos.clone(), t: 0, dur: 1.0, c });
    M.audio && M.audio.whistle && M.audio.whistle();
  };
  const tmp = new T.Vector3();
  M.onFrame(dt => {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt; const k = Math.min(1, r.t / r.dur), e = 1 - (1 - k) * (1 - k);
      tmp.lerpVectors(r.p, r.to, e); spawn(tmp.x, tmp.y, tmp.z, 0, -0.5, 0, 0.5, M.col('#ffb070'));
      if (k >= 1) {
        rockets.splice(i, 1);
        for (let j = 0; j < 220; j++) {
          const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), sp = 8 + Math.random() * 3;
          spawn(r.to.x, r.to.y, r.to.z, Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp, 2.0 + Math.random() * 0.8, r.c);
        }
        M.fx.bloomBurst && M.fx.bloomBurst(r.to, '#ffe0b0', 10);
        M.audio && M.audio.boom && M.audio.boom();
      }
    }
    for (let i = 0; i < MAX; i++) {
      if (K[i] >= 1) continue; K[i] = Math.min(1, K[i] + dt / L[i]);
      const d = 1 - 1.6 * dt; V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d - 2.2 * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
    }
    g.attributes.position.needsUpdate = true; g.attributes.aK.needsUpdate = true; g.attributes.aC.needsUpdate = true;
    U.uScale.value = M.renderer.getPixelRatio() * innerHeight * 0.5; U.uTime.value = M.time;
  }, 59);
})();
