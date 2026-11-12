// ===== 12b-guide.js：引路小光（指向下一站点）=====
(() => {
  const S = M.story, G = M.girl;
  const sMat = (c, k, o) => new T.SpriteMaterial({ map: M.tex.soft(), color: M.col(c).multiplyScalar(k), transparent: true, opacity: o,
    blending: T.AdditiveBlending, depthWrite: false });
  const wisp = new T.Group(); M.scene.add(wisp);
  const core = new T.Sprite(sMat('#fff0c8', 6, 1)); core.scale.setScalar(0.16);
  const halo = new T.Sprite(sMat('#ffb050', 1.6, 0.45)); halo.scale.setScalar(0.9);
  wisp.add(halo, core);
  const N = 20, P = new Float32Array(N * 3), A = new Float32Array(N);
  for (let i = 0; i < N; i++) A[i] = 1 - i / N;
  const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(P, 3)); tg.setAttribute('aA', new T.BufferAttribute(A, 1));
  const tU = { uFade: { value: 0 }, uScale: { value: 400 } };
  const trail = new T.Points(tg, new T.ShaderMaterial({ uniforms: tU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `attribute float aA; uniform float uScale; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix*vec4(position,1.);
      gl_PointSize = .07*aA*uScale/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uFade; varying float vA; void main(){ float d = length(gl_PointCoord-.5);
      gl_FragColor = vec4(vec3(4.,2.4,1.)*vA, smoothstep(.5,0.,d)*vA*uFade); }` }));
  trail.frustumCulled = false; M.scene.add(trail);
  const pool = M.lights.pool(0, 0, '#ffc070', 1.3, 0.8);
  const pos = new T.Vector3(1, 1.2, 9), tgt = new T.Vector3();
  let fade = 0, inited = false;
  M.guide = { group: wisp };
  // 去广场的站点先经过路口，避免穿墙
  const waypoint = st => (st.pos.z < -44.5 && G.pos.z > -43.5) ? new T.Vector3(1.5, 0, -45.5) : st.pos;
  M.onFrame(dt => {
    const st = S.stations && S.stations[S.step];
    const show = S.started && !S.locked && st && S.dawn === 0;
    fade = M.damp(fade, show ? 1 : 0, show ? 1.5 : 5, dt);
    if (st) {
      const dSt = Math.hypot(G.pos.x - st.pos.x, G.pos.z - st.pos.z), t = M.time;
      if (dSt < 4) {
        tgt.set(st.pos.x + Math.cos(t * 1.6) * 0.5, 1.3 + Math.sin(t * 2.2) * 0.12, st.pos.z + Math.sin(t * 1.6) * 0.5);
      } else {
        const w = waypoint(st), dx = w.x - G.pos.x, dz = w.z - G.pos.z, d = Math.hypot(dx, dz) || 1, k = Math.min(2.6, d);
        tgt.set(G.pos.x + dx / d * k + Math.sin(t * 1.3) * 0.25, 1.2 + Math.sin(t * 2.4) * 0.15, G.pos.z + dz / d * k);
      }
      if (!inited || fade < 0.02) { pos.copy(tgt); inited = true; }
      const r = 1 - Math.exp(-2.2 * dt); pos.lerp(tgt, r);
    }
    wisp.position.copy(pos);
    const nearK = M.smooth(1.4, 3.2, pos.distanceTo(M.camera.position)), vis = fade * nearK;
    const pulse = 0.85 + 0.15 * Math.sin(M.time * 4.2);
    core.material.opacity = vis; halo.material.opacity = 0.45 * vis * pulse; halo.scale.setScalar(0.8 + 0.2 * pulse);
    P.copyWithin(3, 0, (N - 1) * 3); P[0] = pos.x; P[1] = pos.y; P[2] = pos.z; tg.attributes.position.needsUpdate = true;
    tU.uFade.value = vis; tU.uScale.value = M.renderer.getPixelRatio() * innerHeight * 0.5;
    pool.position.set(pos.x, 0.03, pos.z); pool.material.opacity = fade * (1 - S.dawn);
  }, 46);
})();
