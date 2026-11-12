// ===== 11-fx.js：火柴火焰、火花、光爆、烛光、升空星、流星、光柱、落点光圈、白气 =====
(() => {
  const live = [];
  const run = (fn) => live.push(fn);            // fn(dt) 返回 false 时移除
  M.onFrame(dt => { for (let i = live.length - 1; i >= 0; i--) if (live[i](dt) === false) live.splice(i, 1); }, 55);
  const add = (o, x, y, z) => { o.position.set(x, y, z); M.scene.add(o); return o; };
  const spriteMat = (color, k, opacity = 1) => new T.SpriteMaterial({ map: M.tex.soft(), color: M.col(color).multiplyScalar(k),
    transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
  const wp = new T.Vector3();
  M.fx = {};

  // ---- 火柴火焰：挂在 parent 上 ----
  M.fx.flame = (parent, opts = {}) => {
    const g = new T.Group(); parent.add(g);
    const outer = new T.Sprite(spriteMat('#ff8a2a', 6)), core = new T.Sprite(spriteMat('#fff0c0', 9));
    outer.scale.set(0.07, 0.11, 1); core.scale.set(0.03, 0.05, 1); outer.position.y = 0.035; core.position.y = 0.025;
    const halo = new T.Sprite(spriteMat('#ff9a40', 1.2, 0.5)); halo.scale.setScalar(0.6);
    g.add(halo, outer, core);
    const light = M.lights.point('#ff9a3c', 0, opts.dist || 7);
    let life = 1, dying = 0, t = 0;
    const h = { group: g, light, kill(f = 0.6) { dying = f; } };
    run(dt => {
      t += dt;
      if (dying) { life -= dt / dying; if (life <= 0) { parent.remove(g); M.lights.release(light); return false; } }
      const n = 0.8 + 0.2 * Math.sin(t * 31) * Math.sin(t * 17 + 1) + 0.1 * Math.sin(t * 53), grow = Math.min(1, t * 4) * life;
      outer.scale.set(0.07 * n * grow * (opts.size || 1), 0.12 * (2 - n) * grow * (opts.size || 1), 1); core.scale.set(0.03 * grow, 0.055 * n * grow, 1);
      halo.material.opacity = 0.5 * grow;
      if (light) { g.getWorldPosition(wp); light.position.copy(wp); light.intensity = (opts.power || 2.6) * n * grow; }
    });
    return h;
  };

  // ---- 划火花 ----
  M.fx.strike = (pos) => {
    const N = 34, geo = new T.BufferGeometry(), P = new Float32Array(N * 3), V = [];
    for (let i = 0; i < N; i++) { P.set([pos.x, pos.y, pos.z], i * 3); V.push([(Math.random() - .5) * 1.6, Math.random() * 1.8 + 0.4, (Math.random() - .5) * 1.6]); }
    geo.setAttribute('position', new T.BufferAttribute(P, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ color: M.col('#ffb050').multiplyScalar(8), size: 0.025, transparent: true,
      blending: T.AdditiveBlending, depthWrite: false }));
    M.scene.add(pts); let t = 0;
    M.audio && M.audio.strike();
    run(dt => {
      t += dt; for (let i = 0; i < N; i++) { V[i][1] -= 4 * dt; P[i * 3] += V[i][0] * dt; P[i * 3 + 1] += V[i][1] * dt; P[i * 3 + 2] += V[i][2] * dt; }
      geo.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, 1 - t / 0.6);
      if (t > 0.6) { M.scene.remove(pts); geo.dispose(); return false; }
    });
  };

  // ---- 光爆 ----
  M.fx.bloomBurst = (pos, color = '#ffb060', size = 6) => {
    const s = add(new T.Sprite(spriteMat(color, 3, 1)), pos.x, pos.y, pos.z); let t = 0;
    M.fx.warmPulse(0.8);
    run(dt => { t += dt; const k = M.smooth(0, 0.35, t); s.scale.setScalar(0.3 + k * size); s.material.opacity = 1 - M.smooth(0.3, 1.1, t);
      if (t > 1.1) { M.scene.remove(s); return false; } });
  };
  let warm = 0; M.fx.warmPulse = k => { warm = Math.max(warm, k); };
  M.onFrame(dt => { warm = M.damp(warm, 0, 1.5, dt); M.fx.warmLevel = warm; }, 56);

  // ---- 烛光（圣诞树）----
  M.fx.candles = (points) => {
    const N = points.length, geo = new T.BufferGeometry(), P = new Float32Array(N * 3), D = new Float32Array(N), S = new Float32Array(N);
    const ys = points.map(p => p.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
    points.forEach((p, i) => { P.set([p.x, p.y + 0.09, p.z], i * 3); D[i] = (p.y - y0) / (y1 - y0) + Math.random() * 0.15; S[i] = Math.random(); });
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('aD', new T.BufferAttribute(D, 1)); geo.setAttribute('aS', new T.BufferAttribute(S, 1));
    const U = { uT: { value: -1 }, uTime: { value: 0 }, uScale: { value: 400 }, uHide: { value: 0 } };
    const pts = new T.Points(geo, new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute float aD, aS; uniform float uT, uTime, uScale, uHide; varying float vA;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float on = smoothstep(aD, aD+.12, uT) * (1.-uHide);
          float fl = .75 + .25*sin(uTime*(9.+aS*7.) + aS*40.);
          gl_PointSize = .5 * fl * on * uScale / -mv.z; vA = on; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d);
        gl_FragColor = vec4(vec3(5.,2.8,1.1)*a*a, a*vA); }` }));
    pts.frustumCulled = false; M.scene.add(pts);
    const wax = new T.InstancedMesh(new T.CylinderGeometry(0.018, 0.018, 0.1, 6), M.mat.std('#f4ecd8', 0.6), N), dm = new T.Object3D();
    points.forEach((p, i) => { dm.position.set(p.x, p.y + 0.03, p.z); dm.updateMatrix(); wax.setMatrixAt(i, dm.matrix); }); M.scene.add(wax);
    let dur = 2.5, started = -1;
    run(() => { U.uTime.value = M.time; U.uScale.value = M.renderer.getPixelRatio() * innerHeight * 0.5;
      if (started >= 0) U.uT.value = (M.time - started) / dur * 1.15; });
    return { points: pts, uniforms: U, lightUp(d = 2.5) { dur = d; started = M.time; } };
  };

  // ---- 烛光升空成星 ----
  M.fx.riseToStars = (points, center, dur = 4.5) => {
    const N = points.length, geo = new T.BufferGeometry(), A = new Float32Array(N * 3), B = new Float32Array(N * 3), D = new Float32Array(N);
    points.forEach((p, i) => { A.set([p.x, p.y + 0.09, p.z], i * 3); const a = Math.random() * Math.PI * 2, r = 15 + Math.random() * 55;
      B.set([center.x + Math.cos(a) * r, 34 + Math.random() * 40, center.z + Math.sin(a) * r - 20], i * 3); D[i] = Math.random() * 0.35; });
    geo.setAttribute('position', new T.BufferAttribute(A, 3)); geo.setAttribute('aEnd', new T.BufferAttribute(B, 3)); geo.setAttribute('aD', new T.BufferAttribute(D, 1));
    const U = { uT: { value: 0 }, uTime: { value: 0 }, uScale: { value: 400 }, uFade: { value: 1 } };
    const pts = new T.Points(geo, new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      vertexShader: `attribute vec3 aEnd; attribute float aD; uniform float uT, uTime, uScale; varying float vK; varying float vTw;
        void main(){ float k = clamp((uT - aD)/(1.-aD), 0., 1.); float e = k*k*(3.-2.*k); vK = e;
          vec3 p = mix(position, aEnd, e); float sw = sin(e*9. + aD*30.)*(1.-e)*2.; p.x += sw; p.z += cos(e*9.+aD*30.)*(1.-e)*2.;
          vec4 mv = modelViewMatrix*vec4(p,1.); vTw = .7+.3*sin(uTime*3.+aD*90.);
          gl_PointSize = mix(.5*uScale/-mv.z, 3.6, e); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uFade; varying float vK; varying float vTw; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d);
        vec3 c = mix(vec3(5.,2.8,1.1), vec3(3.,3.4,4.), vK) * vTw; gl_FragColor = vec4(c*a*a, a*uFade); }` }));
    pts.frustumCulled = false; M.scene.add(pts); let t = 0;
    run(dt => { t += dt; U.uT.value = Math.min(1, t / dur); U.uTime.value = M.time; U.uScale.value = M.renderer.getPixelRatio() * innerHeight * 0.5;
      if (M.sky) U.uFade.value = 1 - M.sky.uniforms.uDawn.value; });
    return { points: pts, endOf: i => new T.Vector3(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]) };
  };

  // ---- 流星 + 光柱 ----
  M.fx.shootingStar = (from, to, dur, cb) => {
    const head = add(new T.Sprite(spriteMat('#fff2d0', 8)), from.x, from.y, from.z); head.scale.setScalar(1.2);
    const TN = 70, geo = new T.BufferGeometry(), P = new Float32Array(TN * 3), AL = new Float32Array(TN);
    for (let i = 0; i < TN; i++) { P.set([from.x, from.y, from.z], i * 3); AL[i] = 1 - i / TN; }
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('aA', new T.BufferAttribute(AL, 1));
    const trail = new T.Points(geo, new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      vertexShader: `attribute float aA; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_PointSize = max(2., 900.*aA/-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(4.,3.2,2.)*vA*vA, smoothstep(.5,0.,d)*vA); }` }));
    trail.frustumCulled = false; M.scene.add(trail);
    const mid = from.clone().lerp(to, 0.5).add(new T.Vector3(0, 6, 0)); let t = 0, done = false;
    M.audio && M.audio.chime(1);
    run(dt => {
      t += dt; const k = Math.min(1, t / dur), e = k * k * (3 - 2 * k) * 0.3 + k * 0.7;
      const a = from.clone().lerp(mid, e), b = mid.clone().lerp(to, e); head.position.copy(a.lerp(b, e));
      P.copyWithin(3, 0, (TN - 1) * 3); P.set([head.position.x, head.position.y, head.position.z], 0); geo.attributes.position.needsUpdate = true;
      if (k >= 1 && !done) { done = true; M.scene.remove(head); M.fx.bloomBurst(to, '#ffd89a', 7); M.fx.column(to); cb && cb(); }
      if (done) { trail.material.opacity = 1; AL.forEach((v, i) => AL[i] *= 0.9); geo.attributes.aA.needsUpdate = true; if (AL[0] < 0.01) { M.scene.remove(trail); return false; } }
    });
  };
  M.fx.column = (pos) => {
    const m = new T.Mesh(new T.CylinderGeometry(0.7, 0.9, 14, 24, 1, true), new T.ShaderMaterial({ transparent: true, depthWrite: false,
      blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uA: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal);
        vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(abs(dot(vN, vV)), 1.5); float a = (1.-vUv.y)*(1.-vUv.y) * f * uA;
          gl_FragColor = vec4(vec3(3.,2.3,1.3)*a, a); }` }));
    add(m, pos.x, pos.y + 7, pos.z); let t = 0, fade = 0;
    M.fx._column = { fade(d = 3) { fade = d; t = 0; } };
    run(dt => { t += dt; m.material.uniforms.uA.value = fade ? Math.max(0, 1 - t / fade) * 0.8 : Math.min(0.8, t * 1.5);
      if (fade && t > fade) { M.scene.remove(m); return false; } });
  };

  // ---- 落点光圈 / 白气 ----
  M.fx.tapRing = (x, z) => {
    const m = add(new T.Mesh(new T.RingGeometry(0.16, 0.2, 32), new T.MeshBasicMaterial({ color: M.col('#ffd9a0').multiplyScalar(1.5), transparent: true,
      blending: T.AdditiveBlending, depthWrite: false })), x, 0.04, z); m.rotation.x = -Math.PI / 2; let t = 0;
    run(dt => { t += dt; m.scale.setScalar(1 + t * 4); m.material.opacity = 1 - t / 0.6; if (t > 0.6) { M.scene.remove(m); return false; } });
  };
  M.fx.breath = (pos) => {
    const s = add(new T.Sprite(new T.SpriteMaterial({ map: M.tex.soft(), color: 0xdde6ff, transparent: true, opacity: 0.0, depthWrite: false })), pos.x, pos.y, pos.z);
    let t = 0;
    run(dt => { t += dt; s.scale.setScalar(0.15 + t * 0.4); s.position.y += dt * 0.12; s.material.opacity = 0.1 * Math.sin(Math.min(1, t / 1.6) * Math.PI);
      if (t > 1.6) { M.scene.remove(s); return false; } });
  };
})();
