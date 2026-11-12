// ===== 06-canal.js：运河水面、岸墙、系船柱、木船、桥 =====
(() => {
  const PI = Math.PI;
  // 路灯布局（07 用来摆路灯，这里用来画水面倒影光柱）
  M.layout = {
    lamps: [[5.0, 15], [5.0, 6], [5.0, -3], [5.0, -12], [5.2, -23], [5.2, -17], [5.0, -30], [5.0, -39],
      [15.6, 20], [15.6, 4], [15.6, -12], [15.6, -30], [-8, -48], [18, -48], [-8, -60], [18, -60]],
  };
  // ---- 水面 ----
  const lights = M.layout.lamps.slice(0, 16).map(([x, z]) => new T.Vector3(x, 3.4, z));
  const U = T.UniformsUtils.merge([T.UniformsLib.fog, {
    uTime: { value: 0 }, uDawn: { value: 0 }, uL: { value: lights }, uCamPos: { value: new T.Vector3() },
  }]);
  const water = new T.Mesh(new T.PlaneGeometry(8.8, 76, 1, 1), new T.ShaderMaterial({
    uniforms: U, fog: true,
    vertexShader: `varying vec3 vWP; #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix*vec4(position,1.); vWP = wp.xyz; vec4 mvPosition = viewMatrix*wp;
        gl_Position = projectionMatrix*mvPosition; #include <fog_vertex> }`.replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
    fragmentShader: (M.glslNoise + `
      uniform float uTime, uDawn; uniform vec3 uL[16]; uniform vec3 uCamPos; varying vec3 vWP;
      #include <fog_pars_fragment>
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec2 p = vWP.xz;
        float w1 = fbm(p*vec2(.9,.35) + vec2(uTime*.05, uTime*.12));
        float w2 = noise(p*3.1 - uTime*.25);
        vec2 wob = vec2(w1-.5, w2-.5);
        vec3 V = normalize(uCamPos - vWP);
        float fres = .04 + .96*pow(1.-max(V.y,0.), 5.);
        vec3 col = mix(lin(vec3(.03,.05,.1)), lin(vec3(.14,.2,.34)), fres);
        col = mix(col, lin(vec3(.35,.45,.6)), uDawn*.6);
        for (int i=0;i<16;i++){
          vec3 L = uL[i];
          vec2 a = L.xz, b = uCamPos.xz; vec2 ab = b-a; float len = max(length(ab), .01); vec2 dir = ab/len;
          vec2 q = p + wob*.35 - a; float t = dot(q, dir); float perp = abs(q.x*dir.y - q.y*dir.x);
          float along = smoothstep(-.6, .3, t) * exp(-max(t,0.)*.16);
          float width = .12 + max(t,0.)*.035;
          float s = smoothstep(width, 0., perp) * along * (.55 + .9*noise(vec2(t*4.-uTime*1.5, perp*9.)));
          col += lin(vec3(1.,.66,.33)) * s * 1.6 * (1.-uDawn);
        }
        float ice = smoothstep(.62, .66, fbm(p*.6 + vec2(0., uTime*.02)));
        col = mix(col, lin(vec3(.62,.68,.8))*(.6+.4*uDawn+.3*(1.-uDawn)), ice*.75);
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`).replace(/#include <(\w+)>/g, '\n#include <$1>\n'),
  }));
  water.rotation.x = -PI / 2; water.position.set(10, -1.3, -7);
  M.scene.add(water);
  M.canal = { water, uniforms: U };
  M.onFrame(() => { U.uTime.value = M.time; U.uCamPos.value.copy(M.camera.position); }, 80);

  // ---- 岸墙、尽头墙 ----
  const stone = M.mat.std('#6e6a66', 0.9, { map: M.tex.stone() }), iron = M.mat.std('#18181c', 0.45, { metal: 0.5 });
  const B = (mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => M.batch.add(M.unitBox, mat, M.mtx(x, y, z, rx, ry, rz, sx, sy, sz));
  B(stone, 5.8, -0.8, -7, 0.4, 1.7, 74); B(stone, 14.2, -0.8, -7, 0.4, 1.7, 74);
  B(stone, 10, -0.8, -44.1, 8.8, 1.7, 0.4); B(stone, 10, -0.8, 30.1, 8.8, 1.7, 0.4);
  B(M.mat.std('#8a857c', 0.85), 5.82, 0.04, -7, 0.52, 0.1, 74); B(M.mat.std('#8a857c', 0.85), 14.18, 0.04, -7, 0.52, 0.1, 74);
  B(M.mat.snow, 5.8, 0.11, -7, 0.46, 0.06, 74); B(M.mat.snow, 14.2, 0.11, -7, 0.46, 0.06, 74);
  for (let x = 5.9; x <= 14.2; x += 0.9) B(iron, x, 0.45, -44.1, 0.05, 0.9, 0.05);
  B(iron, 10, 0.9, -44.1, 8.6, 0.05, 0.05); B(M.mat.snow, 10, 0.94, -44.1, 8.6, 0.04, 0.08);

  // ---- 系船柱 ----
  const bol = new T.CylinderGeometry(0.13, 0.16, 0.55, 12), cap = new T.SphereGeometry(0.17, 12, 6, 0, PI * 2, 0, PI / 2);
  for (let z = 16; z > -43; z -= 4) {
    if (z > -23.5 && z < -16.5) continue;
    M.batch.add(bol, iron, M.mtx(5.3, 0.27, z)); M.batch.add(cap, iron, M.mtx(5.3, 0.54, z));
    M.batch.add(cap, M.mat.snow, M.mtx(5.3, 0.6, z, 0, 0, 0, 0.9, 0.5, 0.9));
    M.colliders.push({ x: 5.3, z, r: 0.28 });
  }

  // ---- 桥 ----
  const arch = new T.Shape();
  arch.moveTo(5.6, -1.6); arch.lineTo(5.6, -0.05); arch.lineTo(14.4, -0.05); arch.lineTo(14.4, -1.6); arch.lineTo(13.4, -1.6);
  arch.absellipse(10, -1.6, 3.4, 1.15, 0, PI, false); arch.lineTo(5.6, -1.6);
  const ag = new T.ExtrudeGeometry(arch, { depth: 3, bevelEnabled: false, curveSegments: 24 });
  const auv = ag.attributes.uv; for (let i = 0; i < auv.count; i++) auv.setXY(i, auv.getX(i) * 0.25, auv.getY(i) * 0.25);
  M.batch.add(ag, stone, M.mtx(0, 0, -21.5));
  B(M.mat.std('#7a756e', 0.85, { map: M.tex.stone() }), 10, -0.02, -20, 8.9, 0.1, 3.1);
  for (const z of [-21.42, -18.58]) {
    for (let x = 5.8; x <= 14.25; x += 0.7) B(iron, x, 0.5, z, 0.05, 1.0, 0.05);
    B(iron, 10, 1.0, z, 8.7, 0.06, 0.06); B(iron, 10, 0.55, z, 8.7, 0.03, 0.03); B(M.mat.snow, 10, 1.05, z, 8.7, 0.05, 0.1);
  }

  // ---- 木船 ----
  const hullGeo = (L, W) => {
    const s = new T.Shape([new T.Vector2(-W / 2, 0.55), new T.Vector2(-W * 0.46, 0.1), new T.Vector2(-W * 0.3, -0.3),
      new T.Vector2(W * 0.3, -0.3), new T.Vector2(W * 0.46, 0.1), new T.Vector2(W / 2, 0.55)]);
    const g = new T.ExtrudeGeometry(s, { depth: L, steps: 18, bevelEnabled: false }); g.translate(0, 0, -L / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = Math.abs(p.getZ(i)) / (L / 2), k = 1 - Math.pow(t, 2.6) * 0.92;
      p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) + Math.pow(t, 2) * 0.35 * (p.getY(i) > 0.3 ? 1 : 0.4));
    }
    g.computeVertexNormals(); return g;
  };
  const boats = [];
  const specs = [[7.5, 12, '#5a3a24', 1], [12.5, 4, '#2f4a66', 0], [7.4, -6, '#7a2a22', 1], [12.6, -30, '#3d5a3a', 1],
    [7.5, -36, '#6a4a2a', 0], [12.5, 20, '#5a3a24', 1], [12.6, -12, '#7a5a3a', 0]];
  const sail = M.mat.std('#cfc8b8', 0.95), deckM = M.mat.std('#8a6a4a', 0.8, { map: M.tex.wood() });
  const planks = M.tex.planks(), trimB = M.mat.std('#e2d6bc', 0.6), brass = M.mat.std('#b08a3a', 0.35, { metal: 0.6 });
  const cabWin = new T.MeshBasicMaterial({ color: M.col('#ffc070').multiplyScalar(2.2) });
  const glowM = new T.SpriteMaterial({ map: M.tex.soft(), color: M.col('#ffb060').multiplyScalar(1.4), transparent: true, opacity: 0.55,
    blending: T.AdditiveBlending, depthWrite: false });
  specs.forEach(([x, z, col, mast], i) => {
    const L = 5 + (i % 3), W = 1.8, g = new T.Group();
    const hull = new T.Mesh(hullGeo(L, W), M.mat.std(col, 0.65, { map: planks })); hull.castShadow = hull.receiveShadow = true; g.add(hull);
    const band = new T.Mesh(hullGeo(L * 1.002, W * 1.02), trimB); band.scale.set(1, 0.06, 1); band.position.y = 0.36; g.add(band);
    const deck = new T.Mesh(M.unitBox, deckM); deck.scale.set(W * 0.82, 0.05, L * 0.62); deck.position.y = 0.5; g.add(deck);
    const sn = new T.Mesh(M.unitBox, M.mat.snow); sn.scale.set(W * 0.7, 0.06, L * 0.45); sn.position.set(0, 0.55, -L * 0.05); g.add(sn);
    const rim = new T.Mesh(M.unitBox, M.mat.std('#d8cbb0', 0.7)); rim.scale.set(W * 1.01, 0.08, L * 0.6); rim.position.y = 0.42; g.add(rim);
    if (mast) {
      const m = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 5, 8), deckM); m.position.set(0, 3, L * 0.12); m.castShadow = true; g.add(m);
      const boom = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, L * 0.5, 10), sail); boom.rotation.x = PI / 2;
      boom.position.set(0, 1.5, -L * 0.1); boom.castShadow = true; g.add(boom);
      const bs = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, L * 0.48, 10, 1, false, 0, PI), M.mat.snow);
      bs.rotation.set(PI / 2, 0, PI / 2); bs.position.copy(boom.position).y += 0.02; g.add(bs);
    } else {
      const cab = new T.Mesh(M.unitBox, M.mat.std('#d8cbb0', 0.85)); cab.scale.set(1.1, 0.7, 1.4); cab.position.set(0, 0.85, -L * 0.15);
      cab.castShadow = true; g.add(cab);
      const cs = new T.Mesh(M.unitBox, M.mat.snow); cs.scale.set(1.2, 0.08, 1.5); cs.position.set(0, 1.24, -L * 0.15); g.add(cs);
      for (const sx of [-1, 1]) for (const dz of [-0.35, 0.3]) {
        const w = new T.Mesh(M.unitBox, cabWin); w.scale.set(0.02, 0.24, 0.32); w.position.set(sx * 0.56, 0.92, -L * 0.15 + dz); g.add(w);
      }
      const lampP = new T.Vector3(0.45, 1.5, L * 0.32);
      const pole = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.9, 6), brass); pole.position.set(lampP.x, 1.0, lampP.z); g.add(pole);
      const bulb = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), cabWin); bulb.position.copy(lampP); g.add(bulb);
      const glow = new T.Sprite(glowM); glow.scale.setScalar(1.1); glow.position.copy(lampP); g.add(glow);
    }
    g.position.set(x, -1.42, z); g.rotation.y = (i % 2 ? 0.04 : -0.03);
    g.userData = { ph: i * 1.7, y: -1.42 }; M.scene.add(g); boats.push(g);
  });
  M.onFrame(() => {
    for (const b of boats) {
      const t = M.time * 0.7 + b.userData.ph;
      b.position.y = b.userData.y + Math.sin(t) * 0.035; b.rotation.z = Math.sin(t * 0.8 + 1) * 0.025; b.rotation.x = Math.sin(t * 0.6) * 0.01;
    }
  }, 60);
})();
