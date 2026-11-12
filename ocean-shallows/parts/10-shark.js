// ===== 10-shark.js =====
(function () {
  // ---- 几何（体长 1，鼻尖在 +x）----
  function buildShark() {
    const P = [], S = [], T = [], C = [], I = [];
    const back = [.54, .5, .44], belly = [.95, .94, .9];
    const add = (x, y, z, s, tip, col) => { P.push(x, y, z); S.push(s); T.push(tip); C.push(...col); return P.length / 3 - 1; };
    const R = s => .09 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(s, .62) * 1.02)), .85) + .006;
    const NS = 28, NA = 12;
    for (let i = 0; i <= NS; i++) {
      const s = i / NS, x = .5 - s, r = R(s);
      for (let j = 0; j <= NA; j++) {
        const a = j / NA * Math.PI * 2, cy = Math.cos(a), cz = Math.sin(a);
        const k = Math.min(1, Math.max(0, cz * 2.2 + .5));
        const col = back.map((b, n) => belly[n] + (b - belly[n]) * k);
        if (s < .04 && cz > .2 && Math.abs(cy) > .5) col.fill(.2);
        add(x, cy * r * 1.05, cz * r * .85 - (1 - k) * .006, s, 0, col);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1; I.push(a, c, b, b, c, d);
    }
    // 鳍：三角面（双面材质），tip=1 的顶点为黑色尖端
    const fin = (pts) => { const b = P.length / 3; pts.forEach(p => add(p[0], p[1], p[2], p[3], p[4], back)); I.push(b, b + 1, b + 2); if (pts.length === 4) I.push(b, b + 2, b + 3); };
    fin([[.5 - .33, 0, .06, .33, 0], [.5 - .5, 0, .06, .5, 0], [.5 - .47, 0, .2, .45, 1]]);          // 第一背鳍
    fin([[.5 - .74, 0, .035, .74, 0], [.5 - .8, 0, .03, .8, 0], [.5 - .8, 0, .075, .79, 1]]);         // 第二背鳍
    for (const sg of [-1, 1]) {
      fin([[.5 - .27, sg * .08, -.03, .3, 0], [.5 - .38, sg * .075, -.035, .3, 0], [.5 - .45, sg * .25, -.07, .3, 1]]); // 胸鳍
      fin([[.5 - .62, sg * .035, -.04, .62, 0], [.5 - .68, sg * .03, -.04, .66, 0], [.5 - .7, sg * .08, -.06, .66, .6]]);  // 腹鳍
    }
    fin([[-.5 + .02, 0, .012, 1, 0], [-.5 - .03, 0, .0, 1, 0], [-.5 - .2, 0, .17, 1.15, 1]]);   // 尾鳍上叶
    fin([[-.5 + .02, 0, -.006, 1, 0], [-.5 - .03, 0, .0, 1, 0], [-.5 - .13, 0, -.1, 1.1, 1]]); // 尾鳍下叶
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aTip', new THREE.Float32BufferAttribute(T, 1));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(I);
    return g;
  }

  const VERT = `
    attribute float aS, aTip; attribute vec2 aAnim; // 相位, 幅度
    varying vec3 vW, vCol; varying float vTip;
    void main(){
      vec3 p = position; float s = aS;
      float A = aAnim.y * (.02 + .13 * s * s);
      p.y += A * sin(s * 5.2 - aAnim.x);
      vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.); vW = w.xyz; vCol = color; vTip = aTip;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = gamma => `
    uniform vec3 uSunDir, uSunCol, uSky; uniform float uAmbient; varying vec3 vW, vCol; varying float vTip;
    void main(){
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if(n.z < 0.) n = -n;
      vec3 c = mix(vCol, vec3(.03), smoothstep(.55, .7, vTip));
      float lam = .45 + .7 * max(dot(n, uSunDir), 0.);
      vec3 col = c * (uSunCol * lam + uSky * .25) * (.25 + .75 * uAmbient);
      ${gamma ? 'col = pow(col, vec3(1. / 2.2));' : ''}
      gl_FragColor = vec4(col, ${gamma ? '1.' : 'clamp(-vW.z / 4., 0., .99)'});
    }`;
  const MAXI = 12, geo0 = buildShark();
  O.sharkGeometry = () => geo0;
  const layers = [false, true].map(above => {
    const g = geo0.clone(), anim = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 2), 2); g.setAttribute('aAnim', anim);
    const m = new THREE.ShaderMaterial({ uniforms: { uSunDir: O.U.uSunDir, uSunCol: O.SU.uSunCol, uSky: O.SU.uSky, uAmbient: O.SU.uAmbient },
      vertexShader: VERT, fragmentShader: FRAG(above), vertexColors: true, side: THREE.DoubleSide, extensions: { derivatives: true } });
    const mesh = new THREE.InstancedMesh(g, m, MAXI); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = above ? 31 : 6;
    (above ? O.aboveScene : O.underScene).add(mesh);
    return { mesh, anim };
  });
  O.sharkMaterial = () => layers[1].mesh.material;

  // 出水背鳍（水上层，清晰的深色三角）
  const finGeo = new THREE.BufferGeometry();
  finGeo.setAttribute('position', new THREE.Float32BufferAttribute([.07, -.012, 0, -.09, -.012, 0, -.05, 0, .14, .07, .012, 0, -.09, .012, 0], 3));
  finGeo.setIndex([0, 1, 2, 3, 2, 4, 0, 2, 3, 1, 4, 2]);
  const finMesh = new THREE.InstancedMesh(finGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a2622'), side: THREE.DoubleSide }), MAXI);
  finMesh.count = 0; finMesh.frustumCulled = false; finMesh.renderOrder = 29; O.aboveScene.add(finMesh);

  // ---- 行为 ----
  const CFG = { speed: .8, turnRate: 1.5, minDepth: .42, wander: .7, wanderRate: .18, bankK: .3, fleeMul: 3 };
  CFG.extra = c => {
    const d = O.depth(c.x, c.y), g = O.depthGrad(c.x, c.y), gl = Math.hypot(g[0], g[1]) || 1;
    let tx = -g[1] / gl, ty = g[0] / gl;
    if (tx * Math.cos(c.heading) + ty * Math.sin(c.heading) < 0) { tx = -tx; ty = -ty; }
    const pull = Math.max(-1.2, Math.min(1.2, d - 1.0));
    let fx = tx * 1.1 - g[0] / gl * pull * .9, fy = ty * 1.1 - g[1] / gl * pull * .9;
    const L = c.leader;
    if (L && L.state !== 'dying' && O.creatures.includes(L)) {
      const side = c.id % 2 ? 1 : -1, hx = Math.cos(L.heading), hy = Math.sin(L.heading);
      const px = L.x - hx * 1.1 - hy * side * .7, py = L.y - hy * 1.1 + hx * side * .7;
      const dx = px - c.x, dy = py - c.y, dd = Math.hypot(dx, dy);
      if (dd < 4.5) { fx += dx * .9; fy += dy * .9; }
    }
    return [fx, fy];
  };
  CFG.speedMod = c => c.leader && O.creatures.includes(c.leader) ? Math.min(1.35, .9 + Math.hypot(c.leader.x - c.x, c.leader.y - c.y) * .12) : 1;
  CFG.targetZ = (c, dep) => dep < .95 ? -.13 : -dep * .45;

  O.species.shark = {
    kind: 'shark', size: 1.6, swimFrac: .45, cfg: CFG,
    shadow: c => [c.size * 1.05, c.size * .22],
    make(c) { c.ph = Math.random() * 6; c.amp = 1; c.groupT = 10 + Math.random() * 20; c.leader = null; },
    remove(c) { O.creatures.forEach(o => { if (o.leader === c) o.leader = null; }); },
    onScare(c) { c.heading += (Math.random() < .5 ? -1 : 1) * (1.6 + Math.random()); c.speed *= 2.2; c.leader = null; },
    update(c, dt, skip) {
      if (!skip && c.state === 'swim') {
        O.steer(c, dt, CFG);
        c.groupT -= dt;
        if (c.groupT < 0) {
          c.groupT = 20 + Math.random() * 25;
          if (c.leader) c.leader = null;
          else if (Math.random() < .55) {
            const others = O.creatures.filter(o => o.type === 'shark' && o !== c && !o.leader && o.leader !== c && Math.hypot(o.x - c.x, o.y - c.y) < 5);
            const followers = O.creatures.filter(o => o.leader && o.leader === others[0]).length;
            if (others.length && followers < 2) c.leader = others[0];
          }
        }
      }
      const k = c.state === 'held' ? .5 : .5 + c.speed / CFG.speed * .8;
      c.ph += dt * 6.5 * k; c.amp += ((c.state === 'held' ? 1.6 : .8 + .35 * k) - c.amp) * Math.min(1, dt * 2);
      // 背鳍破水：鳍尖每帧在模拟中注入扰动（移动点源形成 V 形尾迹）
      c.finOut = c.state === 'swim' && c.z + .2 * c.size * .9 > 0;
      if (c.finOut) {
        const fx = c.x + Math.cos(c.heading) * .05 * c.size, fy = c.y + Math.sin(c.heading) * .05 * c.size;
        O.sim.drop(fx, fy, .06, .03 * Math.min(2, c.speed));
        if (Math.random() < dt * 4) O.bio.add(fx, fy, .2, .4);
      }
    }
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'ZYX'), ps = new THREE.Vector3(), sc = new THREE.Vector3();
  O.onFrame(() => {
    const cnt = [0, 0]; let nf = 0;
    for (const c of O.creatures) {
      if (c.type !== 'shark') continue;
      const L = layers[c.above ? 1 : 0], i = cnt[c.above ? 1 : 0]++;
      if (i >= MAXI) continue;
      e.set(c.bank + c.roll, -c.pitch, c.heading); q.setFromEuler(e);
      const s = c.size * (.6 + .4 * c.fade);
      ps.set(c.x, c.y, c.z); sc.set(s, s, s); m4.compose(ps, q, sc);
      L.mesh.setMatrixAt(i, m4); L.anim.setXY(i, c.ph, c.amp);
      if (c.finOut && nf < MAXI) {
        const sway = c.amp * .025 * Math.sin(.45 * 5.2 - c.ph);
        e.set(0, 0, c.heading); q.setFromEuler(e);
        ps.set(c.x - Math.cos(c.heading) * .02 * s - Math.sin(c.heading) * sway * s, c.y - Math.sin(c.heading) * .02 * s + Math.cos(c.heading) * sway * s, 0);
        const hgt = Math.max(0, Math.min(1, (c.z + .2 * s) / (.2 * s)));
        sc.set(s, s, s * hgt); m4.compose(ps, q, sc); finMesh.setMatrixAt(nf++, m4);
      }
    }
    layers.forEach((L, j) => { L.mesh.count = Math.min(cnt[j], MAXI); L.mesh.instanceMatrix.needsUpdate = true; L.anim.needsUpdate = true; });
    finMesh.count = nf; finMesh.instanceMatrix.needsUpdate = true;
  }, 61);
})();
