// ===== 07c-girl-look.js：小女孩脸部贴图、边缘光、针织/格纹布料 =====
(() => {
  const PI = Math.PI;
  const L = M.girlLook = { rimU: { uRimCold: { value: M.col('#8fb0ff') }, uRimWarm: { value: 0 }, uSnow: { value: 0 } } };

  // ---- 脸：贴在头部椭球前方的一片球面上；拆成 底层 / 眼珠 / 眼睑 三层，眼珠可平移看向 ----
  const SX = 0.7; // 贴片横向角度比纵向大，横向尺寸需压缩才显得圆
  const EYE = sd => ({ ex: 256 + sd * 102, ey: 236 });
  const drawBase = (g, s) => {
    g.clearRect(0, 0, s, s);
    const blush = (x, y) => { const gr = g.createRadialGradient(x, y, 0, x, y, 46);
      gr.addColorStop(0, 'rgba(255,120,120,0.55)'); gr.addColorStop(1, 'rgba(255,120,120,0)'); g.fillStyle = gr;
      g.save(); g.translate(x, y); g.scale(SX, 0.7); g.translate(-x, -y); g.beginPath(); g.arc(x, y, 46, 0, PI * 2); g.fill(); g.restore(); };
    blush(256 - 165, 338); blush(256 + 165, 338);
    for (const sd of [-1, 1]) {
      const { ex } = EYE(sd);
      g.strokeStyle = '#5a3020'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.ellipse(ex + sd * 4, 140, 34 * SX, 12, sd * 0.12, PI * 1.12, PI * 1.88); g.stroke();
      // 眼白的淡阴影，让眼珠移动时有"眼眶"
      const { ey } = EYE(sd); g.fillStyle = 'rgba(255,250,245,0.55)';
      g.save(); g.translate(ex, ey); g.scale(SX * 1.3, 1.3); g.beginPath(); g.ellipse(0, 2, 47, 52, 0, 0, PI * 2); g.fill(); g.restore();
    }
    const nose = g.createRadialGradient(256, 300, 0, 256, 300, 16); nose.addColorStop(0, 'rgba(190,110,90,0.5)'); nose.addColorStop(1, 'rgba(190,110,90,0)');
    g.fillStyle = nose; g.fillRect(230, 278, 52, 44);
    g.strokeStyle = '#8a3426'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.ellipse(256, 392, 22 * SX, 12, 0, PI * 0.15, PI * 0.85); g.stroke();
  };
  const drawEyes = (g, s) => {
    g.clearRect(0, 0, s, s);
    for (const sd of [-1, 1]) {
      const { ex, ey } = EYE(sd);
      g.save(); g.translate(ex, ey); g.scale(SX * 1.3, 1.3);
      const ir = g.createLinearGradient(0, -40, 0, 40); ir.addColorStop(0, '#20120b'); ir.addColorStop(0.55, '#4a2c1a'); ir.addColorStop(1, '#8a5a32');
      g.fillStyle = ir; g.beginPath(); g.ellipse(0, 4, 36, 42, 0, 0, PI * 2); g.fill();
      g.fillStyle = '#120a06'; g.beginPath(); g.ellipse(0, 6, 18, 23, 0, 0, PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-sd * 11 - 2, -12, 12, 14, 0, 0, PI * 2); g.fill();
      g.beginPath(); g.ellipse(sd * 13, 22, 5.5, 5.5, 0, 0, PI * 2); g.fill();
      g.restore();
    }
  };
  const drawLids = closed => (g, s) => {
    g.clearRect(0, 0, s, s); g.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const { ex, ey } = EYE(sd);
      if (closed) { g.strokeStyle = '#2a160e'; g.lineWidth = 8; g.beginPath(); g.ellipse(ex, ey + 8, 46 * SX, 16, 0, PI * 0.1, PI * 0.9); g.stroke(); continue; }
      g.save(); g.translate(ex, ey); g.scale(SX * 1.3, 1.3);
      g.strokeStyle = '#1a0d08'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 4, 44, 50, 0, PI * 1.08, PI * 1.92); g.stroke();
      g.lineWidth = 5;
      for (let k = 0; k < 3; k++) { const a = PI * (sd > 0 ? 1.82 + k * 0.07 : 1.18 - k * 0.07);
        const x0 = Math.cos(a) * 44, y0 = 4 + Math.sin(a) * 50;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + sd * 14, y0 - 10); g.stroke(); }
      g.restore();
    }
  };
  const mkTex = (name, draw) => { const t = M.canvasTex(name, 512, draw, { clamp: false });
    t.wrapS = T.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; return t; };
  const baseT = mkTex('faceBase', drawBase), eyesT = mkTex('faceEyes', drawEyes);
  const lidOpen = mkTex('faceLidOpen', drawLids(false)), lidShut = mkTex('faceLidShut', drawLids(true));
  L.face = (head) => {
    const geo = new T.SphereGeometry(1, 32, 20, PI / 2 - 0.95, 1.9, PI * 0.3, PI * 0.42);
    const layer = (map, k, ei, order) => {
      const m = new T.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.55,
        emissive: M.col('#ffffff'), emissiveMap: map, emissiveIntensity: ei, polygonOffset: true, polygonOffsetFactor: -2 - order });
      const mesh = new T.Mesh(geo, m); mesh.position.set(0, 0.17, 0); mesh.scale.set(0.19 * k, 0.18 * k, 0.18 * k);
      mesh.renderOrder = 3 + order; head.add(mesh); return mesh;
    };
    const base = layer(baseT, 1.006, 0.18, 0), eyes = layer(eyesT, 1.009, 0.3, 1), lids = layer(lidOpen, 1.012, 0.18, 2);
    return { mesh: base,
      blink(c) { const t = c ? lidShut : lidOpen; if (lids.material.map !== t) { lids.material.map = t; lids.material.emissiveMap = t; } eyes.visible = !c; },
      // gx > 0：眼珠移向角色左侧（局部 +X）；gy > 0：向上
      gaze(gx, gy) { eyesT.offset.set(1 + gx, -gy); } };
  };

  // ---- 边缘光：月光冷边 + 火光暖边 ----
  L.rim = (mat, k = 1) => {
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, L.rimU);
      sh.fragmentShader = 'uniform vec3 uRimCold; uniform float uRimWarm, uSnow;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float upF = dot(normal, normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86,.9,1.), uSnow * smoothstep(.5, .85, upF));`).replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = pow(1. - max(dot(normal, normalize(vViewPosition)), 0.), 3.);
        totalEmissiveRadiance += mix(uRimCold * .22, vec3(1., .55, .2) * .55, uRimWarm) * rimF * ${k.toFixed(2)};`);
    };
    return mat;
  };

  // ---- 布料贴图 ----
  L.knit = M.canvasTex('knit', 128, (g, s) => {
    const r = M.rand(4); g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 8) for (let y = 0; y < s; y += 8) {
      g.strokeStyle = `rgba(80,20,10,${0.22 + r() * 0.12})`; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(x + 4, y + 7); g.lineTo(x + 7, y + 1); g.stroke();
    }
    for (let x = 0; x < s; x += 16) { g.fillStyle = 'rgba(60,10,5,0.12)'; g.fillRect(x, 0, 2, s); }
  });
  L.knit.repeat.set(5, 5);
  L.plaid = M.canvasTex('plaid', 128, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const band = (x, w, c) => { g.fillStyle = c; g.fillRect(x, 0, w, s); g.fillRect(0, x, s, w); };
    band(0, 18, 'rgba(20,30,50,0.32)'); band(40, 6, 'rgba(200,180,120,0.45)'); band(70, 22, 'rgba(20,30,50,0.32)'); band(104, 4, 'rgba(160,50,40,0.5)');
    for (let i = 0; i < s; i += 2) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, i, s, 1); }
  });
  L.plaid.repeat.set(3, 3);

  // ---- 奶奶：脸、白发、碎花裙 ----
  L.patchGeo = new T.SphereGeometry(1, 32, 20, PI / 2 - 0.95, 1.9, PI * 0.3, PI * 0.42);
  L.grannyFace = M.canvasTex('grannyFace', 512, (g, s) => {
    g.clearRect(0, 0, s, s); g.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const x = 256 + sd * 96;
      const gr = g.createRadialGradient(x + sd * 50, 330, 0, x + sd * 50, 330, 50); gr.addColorStop(0, 'rgba(240,120,110,0.5)'); gr.addColorStop(1, 'rgba(240,120,110,0)');
      g.fillStyle = gr; g.fillRect(x + sd * 50 - 50, 280, 100, 100);
      g.strokeStyle = '#2e1c12'; g.lineWidth = 11; g.beginPath(); g.ellipse(x, 252, 30 * SX, 16, 0, PI * 1.1, PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(120,70,50,0.6)'; g.lineWidth = 3.5;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + sd * 30, 250 + (k - 1) * 9); g.lineTo(x + sd * 44, 246 + (k - 1) * 14); g.stroke(); }
      g.strokeStyle = '#a8a29a'; g.lineWidth = 10; g.beginPath(); g.ellipse(x, 198, 32 * SX, 11, sd * 0.15, PI * 1.15, PI * 1.85); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - sd * 8, 236, 8, 12, -0.4, 0, PI * 2); g.fill();
      g.strokeStyle = 'rgba(140,80,60,0.5)'; g.lineWidth = 3; g.beginPath(); g.ellipse(256 + sd * 44, 372, 14, 40, sd * 0.25, sd > 0 ? -0.6 : PI - 0.6, sd > 0 ? 0.9 : PI + 0.9); g.stroke();
    }
    g.strokeStyle = 'rgba(140,80,60,0.35)'; g.lineWidth = 3;
    for (let k = 0; k < 2; k++) { g.beginPath(); g.ellipse(256, 150 + k * 14, 60 * SX, 8, 0, PI * 1.15, PI * 1.85); g.stroke(); }
    const n = g.createRadialGradient(256, 312, 0, 256, 312, 18); n.addColorStop(0, 'rgba(200,110,90,0.55)'); n.addColorStop(1, 'rgba(200,110,90,0)');
    g.fillStyle = n; g.fillRect(230, 290, 52, 46);
    g.strokeStyle = '#7a3026'; g.lineWidth = 9; g.beginPath(); g.ellipse(256, 392, 34 * SX, 18, 0, PI * 0.12, PI * 0.88); g.stroke();
  }, { clamp: false });
  L.grannyFace.wrapS = T.RepeatWrapping; L.grannyFace.repeat.x = -1; L.grannyFace.offset.x = 1;
  L.hairTex = M.canvasTex('whiteHair', 128, (g, s) => {
    const r = M.rand(12); g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(120,115,110,${0.08 + r() * 0.18})`; g.lineWidth = 1;
      const x = r() * s; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, s * 0.3, x - 6, s * 0.7, x + 3, s); g.stroke(); }
  });
  L.floral = M.canvasTex('floral', 128, (g, s) => {
    const r = M.rand(19); g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { const x = r() * s, y = r() * s;
      g.fillStyle = 'rgba(255,220,190,0.55)'; for (let p = 0; p < 5; p++) { const a = p / 5 * PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,200,90,0.8)'; g.beginPath(); g.arc(x, y, 1.6, 0, PI * 2); g.fill(); }
  });
  L.floral.repeat.set(4, 4);
})();
