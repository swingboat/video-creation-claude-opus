// ===== 09-npcs.js：白鹅、奶奶 =====
(() => {
  const PI = Math.PI, sph = new T.SphereGeometry(1, 18, 12);
  const capsule = (r, len, seg = 12) => {
    const pts = []; for (let i = 0; i <= 6; i++) { const a = -PI / 2 + i / 6 * PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); }
    for (let i = 0; i <= 6; i++) { const a = i / 6 * PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); }
    return new T.LatheGeometry(pts, seg);
  };
  const mesh = (p, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; p.add(o); return o; };
  const grp = (p, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const glowSprite = (color, size, opacity = 0.6) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: M.tex.soft(), color: M.col(color), transparent: true, opacity,
      blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; };

  // ---------------- 白鹅 ----------------
  const white = M.mat.std('#f3efe6', 0.8), grey = M.mat.std('#cdc8be', 0.85), orange = M.mat.std('#f08a24', 0.5), black = M.mat.std('#111', 0.3);
  const webM = M.mat.std('#e87e1e', 0.6, { side: T.DoubleSide, key: 'web' }), shine = new T.MeshBasicMaterial({ color: 0xffffff });
  const goose = new T.Group(); goose.visible = false; M.scene.add(goose);
  const gBody = grp(goose, 0, 0.3, 0);
  // 泪滴形身体：胸在 +Z，尾部上翘收尖
  const bodyGeo = new T.LatheGeometry([[0.001, -0.38], [0.05, -0.32], [0.12, -0.2], [0.175, -0.05], [0.195, 0.08], [0.18, 0.18], [0.12, 0.26], [0.001, 0.3]]
    .map(p => new T.Vector2(p[0], p[1])), 24);
  bodyGeo.rotateX(PI / 2);
  { const p = bodyGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i);
      if (z < -0.12) p.setY(i, p.getY(i) + (-z - 0.12) * 0.75); } bodyGeo.computeVertexNormals(); }
  mesh(gBody, bodyGeo, white, 0, 0, 0, 0.95, 0.85, 1);
  for (const s of [-1, 0, 1]) mesh(gBody, sph, s ? white : grey, s * 0.035, 0.2, -0.38, 0.03, 0.018, 0.07).rotation.set(-0.7, s * 0.35, 0);
  const wings = [1, -1].map(s => { const w = grp(gBody, s * 0.16, 0.04, -0.02);
    mesh(w, sph, white, s * 0.02, 0, -0.04, 0.05, 0.11, 0.24).rotation.x = -0.12;
    for (let i = 0; i < 3; i++) mesh(w, sph, i === 2 ? grey : white, s * (0.025 - i * 0.004), 0.05 - i * 0.022, -0.2 - i * 0.035, 0.03, 0.045, 0.15).rotation.x = -0.35;
    return w; });
  const neck = []; let parent = grp(gBody, 0, 0.08, 0.2);
  for (let i = 0; i < 3; i++) { const n = grp(parent, 0, i ? 0.09 : 0, i ? 0.01 : 0);
    mesh(n, capsule(0.05 - i * 0.004, 0.12), white, 0, 0.05, 0); neck.push(n); parent = n; }
  const gHead = grp(parent, 0, 0.11, 0.02);
  mesh(gHead, sph, white, 0, 0, 0, 0.058, 0.056, 0.076);
  mesh(gHead, sph, white, 0, 0.018, 0.015, 0.05, 0.048, 0.05);
  mesh(gHead, new T.ConeGeometry(0.028, 0.1, 10), orange, 0, -0.004, 0.115).rotation.x = PI / 2;
  mesh(gHead, new T.ConeGeometry(0.022, 0.08, 10), orange, 0, -0.02, 0.1, 1, 1, 0.55).rotation.x = PI / 2 - 0.15;
  mesh(gHead, sph, orange, 0, 0.014, 0.068, 0.022, 0.022, 0.018);
  for (const s of [1, -1]) { mesh(gHead, sph, black, s * 0.05, 0.016, 0.03, 0.012, 0.014, 0.012);
    mesh(gHead, sph, shine, s * 0.058, 0.021, 0.035, 0.004, 0.004, 0.004).castShadow = false; }
  const web = new T.ShapeGeometry(new T.Shape([new T.Vector2(-0.045, 0), new T.Vector2(0.045, 0), new T.Vector2(0.03, 0.1), new T.Vector2(0, 0.085), new T.Vector2(-0.03, 0.1)]));
  web.rotateX(PI / 2);
  const gLegs = [1, -1].map(s => { const l = grp(goose, s * 0.08, 0.2, 0.02);
    mesh(l, new T.CylinderGeometry(0.014, 0.016, 0.2, 8), orange, 0, -0.1, 0); mesh(l, web, webM, 0, -0.195, -0.02); return l; });
  const gGlow = glowSprite('#ffc070', 0.9, 0.35); gGlow.position.set(0, 0.55, 0); goose.add(gGlow);
  let gState = 'hidden', gT = 0, gPhase = 0, gHeading = 0, gSit = 0;
  M.goose = { group: goose, get state() { return gState; } };
  M.goose.appear = (from) => { goose.position.copy(from); goose.visible = true; gState = 'appear'; gT = 0; goose.scale.setScalar(0.01); M.audio && M.audio.honk(); };
  M.goose.sit = () => { gState = 'sit'; };
  M.onFrame(dt => {
    if (gState === 'hidden') return;
    gT += dt;
    goose.scale.setScalar(M.damp(goose.scale.x, 1, 6, dt));
    const g = M.girl, back = new T.Vector3(g.pos.x - Math.sin(g.heading) * 1.1 + Math.cos(g.heading) * 0.55, 0, g.pos.z - Math.cos(g.heading) * 1.1 - Math.sin(g.heading) * 0.55);
    if (gState === 'sit') back.set(g.pos.x + Math.cos(g.heading) * 0.7, 0, g.pos.z - Math.sin(g.heading) * 0.7 + 0.2);
    const dx = back.x - goose.position.x, dz = back.z - goose.position.z, d = Math.hypot(dx, dz);
    const flap = gState === 'appear' && gT < 1.4 ? Math.max(0, Math.sin(gT * 18)) * 1.1 : 0;
    wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * flap);
    let speed = 0;
    if (d > (gState === 'sit' ? 0.1 : 0.9) && !(gState === 'appear' && gT < 1.2)) speed = M.clamp(d * 1.3, 0.5, 2.2);
    if (gState === 'appear' && gT > 1.2) gState = 'follow';
    if (speed > 0) { const tgt = Math.atan2(dx, dz); let da = tgt - gHeading; da = Math.atan2(Math.sin(da), Math.cos(da)); gHeading += da * Math.min(1, dt * 7);
      goose.position.x += Math.sin(gHeading) * speed * dt; goose.position.z += Math.cos(gHeading) * speed * dt; gPhase += dt * speed * 9; }
    else if (gState === 'sit') { let da = g.heading - gHeading; gHeading += Math.atan2(Math.sin(da), Math.cos(da)) * dt * 3; }
    goose.rotation.y = gHeading;
    const walking = speed > 0;
    gBody.rotation.z = walking ? Math.sin(gPhase) * 0.14 : 0;
    gLegs[0].rotation.x = walking ? Math.sin(gPhase) * 0.5 : 0; gLegs[1].rotation.x = walking ? -Math.sin(gPhase) * 0.5 : 0;
    gSit = M.damp(gSit, gState === 'sit' && !walking ? 1 : 0, 3, dt);
    gBody.position.y = 0.3 - gSit * 0.14; gLegs.forEach(l => l.visible = gSit < 0.6);
    const peck = !walking && gState !== 'sit' ? Math.max(0, Math.sin(M.time * 0.9) - 0.75) * 4 : 0;
    neck[0].rotation.x = 0.1 + peck * 0.9; neck[1].rotation.x = -0.15 + peck * 0.3; gHead.rotation.y = Math.sin(M.time * 0.7) * 0.4;
  }, 40);

  // ---------------- 奶奶 ----------------
  const reveal = { value: -1 };
  const gMat = (c, r = 0.85, side = T.FrontSide, o = {}) => {
    const m = new T.MeshStandardMaterial({ color: M.col(c), roughness: r, side, emissive: M.col('#ffd9a0'), emissiveIntensity: 0.04,
      map: o.map || null, transparent: !!o.transparent, depthWrite: !o.transparent, polygonOffset: !!o.transparent, polygonOffsetFactor: -2 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uReveal = reveal;
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = 'uniform float uReveal; varying vec3 vWP;\n' + sh.fragmentShader
        .replace('void main() {', 'void main() {\n if (vWP.y > uReveal) discard;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(4.,2.6,1.2) * smoothstep(.12, 0., uReveal - vWP.y);
          totalEmissiveRadiance += vec3(1.,.72,.38) * pow(1. - max(dot(normal, normalize(vViewPosition)), 0.), 3.) * .18;`);
    };
    return m;
  };
  const LK = M.girlLook;
  const gskin = gMat('#f6cdb2', 0.6), gdress = gMat('#7a2533', 0.9, T.DoubleSide, { map: LK.floral }),
    gshawl = gMat('#dccaa4', 0.95, T.DoubleSide, { map: LK.knit }), ghair = gMat('#f2f0ec', 0.8, T.FrontSide, { map: LK.hairTex }),
    gapron = gMat('#efe6d6', 0.9, T.DoubleSide), ggold = gMat('#c9a24a', 0.3);
  const gr = new T.Group(); gr.visible = false; M.scene.add(gr);
  const lathe = (pts, seg = 22, ps = 0, pl = PI * 2) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg, ps, pl);
  mesh(gr, lathe([[0.33, 0.0], [0.345, 0.03], [0.31, 0.2], [0.25, 0.45], [0.19, 0.64], [0.16, 0.73], [0.175, 0.82], [0.19, 0.92],
    [0.175, 1.04], [0.15, 1.12], [0.1, 1.2], [0.06, 1.24]], 32), gdress);
  mesh(gr, lathe([[0.3, 0.1], [0.33, 0.12], [0.3, 0.3], [0.24, 0.52], [0.19, 0.68], [0.172, 0.74]], 18, -0.95, 1.9), gapron);
  mesh(gr, new T.TorusGeometry(0.168, 0.012, 6, 32), gapron, 0, 0.735, 0).rotation.x = PI / 2;
  mesh(gr, lathe([[0.07, 1.24], [0.19, 1.17], [0.24, 1.05], [0.25, 0.93], [0.235, 0.86], [0.225, 0.85]], 28), gshawl);
  { const tri = new T.Shape([new T.Vector2(-0.09, 0), new T.Vector2(0.09, 0), new T.Vector2(0, -0.13)]);
    mesh(gr, new T.ShapeGeometry(tri), gshawl, 0, 0.88, 0.205).rotation.x = -0.12; }
  mesh(gr, sph, ggold, 0, 1.12, 0.165, 0.018, 0.018, 0.012);
  gskin.emissiveIntensity = 0.12;
  const gHeadG = grp(gr, 0, 1.24, 0);
  mesh(gHeadG, new T.SphereGeometry(1, 28, 20), gskin, 0, 0.14, 0, 0.13, 0.14, 0.13);
  mesh(gHeadG, LK.patchGeo, gMat('#ffffff', 0.6, T.FrontSide, { map: LK.grannyFace, transparent: true }), 0, 0.14, 0, 0.1308, 0.1408, 0.1308).castShadow = false;
  mesh(gHeadG, sph, gskin, 0, 0.125, 0.128, 0.018, 0.016, 0.014);
  mesh(gHeadG, new T.SphereGeometry(1, 24, 14, 0, PI * 2, 0, PI * 0.55), ghair, 0, 0.15, -0.012, 0.142, 0.15, 0.142).rotation.x = -0.45;
  for (const s of [1, -1]) mesh(gHeadG, sph, ghair, s * 0.115, 0.13, -0.01, 0.035, 0.06, 0.05);
  mesh(gHeadG, sph, ghair, 0, 0.275, -0.075, 0.085, 0.072, 0.085);
  mesh(gHeadG, new T.TorusGeometry(0.066, 0.013, 8, 20), gMat('#7a2533', 0.7), 0, 0.275, -0.075).rotation.x = PI / 2 - 0.5;
  for (const s of [1, -1]) {
    mesh(gHeadG, new T.TorusGeometry(0.03, 0.004, 6, 18), gMat('#c9a24a', 0.3), s * 0.045, 0.145, 0.13);
    mesh(gHeadG, M.unitBox, gMat('#c9a24a', 0.3), s * 0.095, 0.15, 0.08, 0.004, 0.004, 0.09);
  }
  mesh(gHeadG, M.unitBox, gMat('#c9a24a', 0.3), 0, 0.148, 0.135, 0.03, 0.004, 0.004);
  const gArms = [1, -1].map(s => {
    const sh = grp(gr, s * 0.185, 1.12, 0);
    mesh(sh, sph, gdress, 0, -0.08, 0, 0.065, 0.11, 0.065);
    mesh(sh, new T.CylinderGeometry(0.048, 0.042, 0.3, 10), gdress, 0, -0.15, 0);
    const el = grp(sh, 0, -0.3, 0); mesh(el, new T.CylinderGeometry(0.04, 0.034, 0.26, 10), gdress, 0, -0.13, 0);
    mesh(el, new T.CylinderGeometry(0.042, 0.042, 0.035, 10), gapron, 0, -0.26, 0);
    mesh(el, sph, gskin, 0, -0.31, 0.006, 0.036, 0.05, 0.026); return { sh, el, s };
  });
  const halo = glowSprite('#ffd59a', 3.2, 0.0); halo.position.y = 0.9; gr.add(halo);
  gr.position.set(4, 0, -62.3);
  let gPose = 'stand', gw = 0;
  M.granny = { group: gr, reveal, halo };
  M.granny.show = (dur = 2.5) => { gr.visible = true; reveal.value = -0.2; M.granny._dur = dur; M.granny._t = 0; };
  M.granny.pose = p => { gPose = p; };
  M.onFrame(dt => {
    if (!gr.visible) return;
    if (M.granny._t !== undefined && M.granny._t < M.granny._dur) { M.granny._t += dt; reveal.value = -0.2 + (M.granny._t / M.granny._dur) * 1.9; }
    else reveal.value = 9;
    halo.material.opacity = M.damp(halo.material.opacity, 0.32, 2, dt);
    gw = M.damp(gw, gPose === 'stand' ? 0 : 1, 3, dt);
    for (const a of gArms) {
      const tx = gPose === 'hug' ? -1.25 : -0.9, tz = gPose === 'hug' ? -a.s * 0.45 : -a.s * 0.1;
      a.sh.rotation.x = M.lerp(0.05, tx, gw); a.sh.rotation.z = M.lerp(a.s * 0.12, tz, gw); a.el.rotation.x = M.lerp(-0.2, gPose === 'hug' ? -0.9 : -0.4, gw);
    }
    gHeadG.rotation.x = 0.15 + Math.sin(M.time * 0.8) * 0.03;
    gr.position.y = Math.sin(M.time * 1.2) * 0.015;
  }, 41);
})();
