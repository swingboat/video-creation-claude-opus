// ===== 05a-houses.js：房屋生成器 + 几何合并 + 窗户实例化 =====
(() => {
  // ---- 按材质合并几何（r128 classic 没有 BufferGeometryUtils）----
  const batches = new Map();
  M.batch = {
    add(geo, mat, matrix) {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (matrix) g.applyMatrix4(matrix);
      if (!batches.has(mat)) batches.set(mat, []);
      batches.get(mat).push(g);
    },
    flush(opts = {}) {
      for (const [mat, list] of batches) {
        let n = 0; list.forEach(g => n += g.attributes.position.count);
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2);
        let o = 0;
        for (const g of list) {
          const c = g.attributes.position.count;
          P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
          if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
          o += c; g.dispose();
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3));
        geo.setAttribute('uv', new T.BufferAttribute(UV, 2)); geo.computeBoundingSphere();
        const m = new T.Mesh(geo, mat); m.castShadow = opts.cast !== false; m.receiveShadow = true; M.scene.add(m);
      }
      batches.clear();
    }
  };
  const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3();
  const mtx = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new T.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  M.mtx = mtx;
  const unitBox = new T.BoxGeometry(1, 1, 1);
  M.unitBox = unitBox;

  // ---- 窗户贴图：2×2 图集（0 窗帘两侧 / 1 半掩窗帘+盆栽 / 2 吊灯 / 3 半放百叶）----
  const winTex = M.canvasTex('windowAtlas', 256, (g, S) => {
    const s = S / 2, PI2 = Math.PI * 2;
    const cell = (cx, cy, fn) => { g.save(); g.translate(cx * s, cy * s); g.beginPath(); g.rect(0, 0, s, s); g.clip(); fn(); g.restore(); };
    const warm = (a = '#fff0c8', b = '#ffc070', c = '#e88a3c') => { const gr = g.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, a); gr.addColorStop(0.6, b); gr.addColorStop(1, c); g.fillStyle = gr; g.fillRect(0, 0, s, s); };
    const bars = () => { g.fillStyle = '#2a1a12'; g.fillRect(s * 0.47, 0, s * 0.06, s); g.fillRect(0, s * 0.42, s, s * 0.05); };
    cell(0, 0, () => { warm(); g.fillStyle = 'rgba(120,40,20,0.55)'; g.fillRect(0, 0, s * 0.16, s); g.fillRect(s * 0.84, 0, s * 0.16, s); bars(); });
    cell(1, 0, () => { warm('#ffe9b8', '#ffb868', '#d97a34');
      g.fillStyle = 'rgba(150,60,40,0.7)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 0.48, 0); g.quadraticCurveTo(s * 0.2, s * 0.5, s * 0.14, s); g.lineTo(0, s); g.fill();
      g.fillStyle = 'rgba(40,40,20,0.85)';
      for (const [x, r] of [[0.62, 0.09], [0.8, 0.07]]) { g.fillRect(s * (x - 0.05), s * 0.86, s * 0.1, s * 0.14);
        g.beginPath(); g.arc(s * x, s * 0.8, s * r, 0, PI2); g.fill(); }
      bars(); });
    cell(0, 1, () => { warm('#fff4d6', '#ffcf86', '#f09a4a');
      const gr = g.createRadialGradient(s * 0.5, s * 0.3, 2, s * 0.5, s * 0.3, s * 0.4); gr.addColorStop(0, 'rgba(255,255,230,0.9)'); gr.addColorStop(1, 'rgba(255,255,230,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(50,25,10,0.8)'; g.fillRect(s * 0.495, 0, s * 0.01, s * 0.2);
      g.beginPath(); g.moveTo(s * 0.38, s * 0.3); g.lineTo(s * 0.62, s * 0.3); g.lineTo(s * 0.55, s * 0.2); g.lineTo(s * 0.45, s * 0.2); g.fill(); bars(); });
    cell(1, 1, () => { warm(); g.fillStyle = 'rgba(90,50,30,0.9)'; g.fillRect(0, 0, s, s * 0.34);
      g.fillStyle = 'rgba(40,20,10,0.5)'; for (let y = 4; y < s * 0.34; y += 6) g.fillRect(0, y, s, 1.5); bars(); });
  }, { clamp: true });
  const darkTex = M.canvasTex('windowDark', 64, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#5a6a90'); gr.addColorStop(0.5, '#1a2238'); gr.addColorStop(1, '#0d1220');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(170,190,230,0.18)'; g.beginPath(); g.moveTo(s * 0.1, s); g.lineTo(s * 0.35, s); g.lineTo(s * 0.75, 0); g.lineTo(s * 0.5, 0); g.fill();
    g.fillStyle = '#0a0a0e'; g.fillRect(s * 0.46, 0, s * 0.08, s); g.fillRect(0, s * 0.42, s, s * 0.07);
  }, { clamp: true });
  const litMat = new T.MeshBasicMaterial({ map: winTex, color: 0xffffff });
  litMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute float aVar;\n' + sh.vertexShader.replace('#include <uv_vertex>',
      '#include <uv_vertex>\n vUv = vUv*.5 + vec2(mod(aVar,2.), floor(aVar/2.))*.5;');
  };
  const darkMat = new T.MeshStandardMaterial({ map: darkTex, roughness: 0.15, metalness: 0.2, color: M.col('#a8b4d0'),
    emissive: M.col('#28324c'), emissiveIntensity: 1 });
  const lit = [], dark = [];
  const frameMat = M.mat.std('#2b211c', 0.7), doorMat = M.mat.std('#4a2c1c', 0.75, { map: M.tex.wood() });
  const plinthMat = M.mat.std('#3b3a40', 0.9, { map: M.tex.stone() }), chimMat = M.mat.std('#6a3a2c', 0.9, { map: M.tex.stone() });
  const roofMats = ['#5a2e26', '#3a3f4a', '#6b3524', '#2f3540'].map(c => M.mat.std(c, 0.8, { flat: true }));
  const shutterMats = ['#2f4a3a', '#6a2a26', '#2a3a55'].map(c => M.mat.std(c, 0.75, { map: M.tex.wood() }));
  const trimMat = c => M.mat.std('#' + new T.Color(c).multiplyScalar(0.72).getHexString(), 0.9);
  // 墙面近地处叠一层暖色"街灯反光"，代替大量点光源
  M.town = { facadeWarm: { value: 1 } };
  const bodyMat = c => {
    const m = M.mat.std(c, 0.92, { map: M.tex.plaster() });
    if (!m.userData.warm) {
      m.userData.warm = true;
      m.onBeforeCompile = sh => {
        sh.uniforms.uFW = M.town.facadeWarm;
        sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n vWP = (modelMatrix*vec4(transformed,1.)).xyz;');
        sh.fragmentShader = 'uniform float uFW; varying vec3 vWP;\n' + M.glslNoise + sh.fragmentShader.replace('#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float wl = exp(-max(vWP.y,0.)*.28) * (.55 + .45*noise(vWP.xz*.35 + vWP.y*.1));
          totalEmissiveRadiance += diffuseColor.rgb * vec3(1.,.55,.26) * wl * .55 * uFW;
          totalEmissiveRadiance += diffuseColor.rgb * vec3(.32,.38,.6) * .12;`);
      };
    }
    return m;
  };
  Object.assign(M.town, { litMat, lit, doorLamps: [], pools: [], chimneys: [] });

  // opts: {x,z 正立面中心, facing 角度, w,d,h, color, roof:'eave'|'gable'|'step', seed, door, lit}
  M.house = (o) => {
    const r = M.rand(o.seed || 1), W = o.w, D = o.d || 8, H = o.h, base = mtx(o.x, 0, o.z, 0, o.facing, 0);
    const put = (geo, mat, local) => M.batch.add(geo, mat, new T.Matrix4().multiplyMatrices(base, local));
    const box = (mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => put(unitBox, mat, mtx(x, y, z, rx, ry, rz, sx, sy, sz));
    box(bodyMat(o.color), 0, H / 2, -D / 2, W, H, D);
    box(plinthMat, 0, 0.3, -D / 2 + 0.05, W + 0.08, 0.6, D);
    box(trimMat(o.color), 0, H - 0.25, 0.06, W + 0.1, 0.22, 0.16);
    box(trimMat(o.color), 0, H - 0.08, 0.1, W + 0.16, 0.1, 0.22);
    const roofMat = roofMats[(r() * roofMats.length) | 0], rh = o.roofH || (2.2 + r() * 1.6), kind = o.roof || 'eave';
    if (kind === 'gable') {
      const half = W / 2 + 0.25, sh = new T.Shape([new T.Vector2(-half, 0), new T.Vector2(half, 0), new T.Vector2(0, rh)]);
      put(new T.ExtrudeGeometry(sh, { depth: D + 0.15, bevelEnabled: false }), roofMat, mtx(0, H, -D));
      const k = (W / 2) / half, tri = new T.Shape([new T.Vector2(-W / 2, 0), new T.Vector2(W / 2, 0), new T.Vector2(0, rh * k)]);
      put(new T.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false }), bodyMat(o.color), mtx(0, H, 0.15));
      const a = Math.atan2(rh, half), L = Math.hypot(half, rh);
      box(M.mat.snow, -half / 2, H + rh / 2 + 0.07, -D / 2 + 0.07, L, 0.13, D + 0.2, 0, 0, a);
      box(M.mat.snow, half / 2, H + rh / 2 + 0.07, -D / 2 + 0.07, L, 0.13, D + 0.2, 0, 0, -a);
      if (H > 6) { // 山墙小圆窗
        lit.push({ m: new T.Matrix4().multiplyMatrices(base, mtx(0, H + rh * 0.35, 0.2, 0, 0, 0, 0.5, 0.5, 1)), k: 0.8 + r() });
      }
    } else {
      const half = D / 2 + 0.3, sh = new T.Shape([new T.Vector2(-half, 0), new T.Vector2(half, 0), new T.Vector2(0, rh)]);
      const g = new T.ExtrudeGeometry(sh, { depth: W + 0.4, bevelEnabled: false }); g.rotateY(Math.PI / 2);
      put(g, roofMat, mtx(-(W + 0.4) / 2, H, -D / 2));
      const a = Math.atan2(rh, half), L = Math.hypot(half, rh);
      box(M.mat.snow, 0, H + rh / 2 + 0.07, -D / 2 + half / 2, W + 0.45, 0.13, L, a);
      box(M.mat.snow, 0, H + rh / 2 + 0.07, -D / 2 - half / 2, W + 0.45, 0.13, L, -a);
      if (kind === 'step') {
        const steps = 4, sw = W / (steps * 2 - 1);
        for (let i = 0; i < steps; i++) {
          const ww = W - i * 2 * sw, yy = H + (i + 0.5) * (rh * 1.15 / steps);
          box(bodyMat(o.color), 0, yy, -0.15, ww, rh * 1.15 / steps, 0.32);
          box(M.mat.snow, 0, H + (i + 1) * (rh * 1.15 / steps) + 0.04, -0.15, ww + 0.06, 0.08, 0.36);
        }
      }
    }
    if (r() < 0.75) { const cx = (r() - 0.5) * W * 0.6, cz = -D * (0.3 + r() * 0.4);
      box(chimMat, cx, H + rh * 0.75, cz, 0.6, rh * 1.1, 0.6); box(M.mat.snow, cx, H + rh * 1.32, cz, 0.68, 0.1, 0.68);
      M.town.chimneys.push(new T.Vector3(cx, H + rh * 1.4, cz).applyMatrix4(base)); }

    // ---- 窗户 ----
    if (o.windows === false) return;
    const floors = Math.max(1, Math.floor((H - 0.6) / 2.7)), cols = Math.max(1, Math.floor(W / 1.35));
    const doorCol = o.door === false ? -1 : (o.doorCol ?? ((r() * cols) | 0));
    const trim = trimMat(o.color), shut = r() < 0.36 ? shutterMats[(r() * shutterMats.length) | 0] : null;
    for (let f = 1; f < floors; f++) box(trim, 0, 0.4 + f * 2.7, 0.06, W + 0.04, 0.12, 0.12);
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (W / cols), y = 1.75 + f * 2.7;
      if (f === 0 && o.skipGround && o.skipGround(x)) continue;
      if (f === 0 && c === doorCol) {
        box(frameMat, x, 1.15, 0.03, 1.2, 2.3, 0.08); box(doorMat, x, 1.1, 0.07, 1.0, 2.1, 0.06);
        box(trim, x, 2.42, 0.1, 1.4, 0.14, 0.2); box(M.mat.snow, x, 2.51, 0.11, 1.38, 0.05, 0.2);
        const lp = new T.Vector3(x + 0.75, 2.45, 0.25).applyMatrix4(base); M.town.doorLamps.push(lp);
        lit.push({ m: new T.Matrix4().multiplyMatrices(base, mtx(x + 0.75, 2.45, 0.22, 0, 0, 0, 0.16, 0.22, 1)), k: 2.6, v: 2 });
        continue;
      }
      box(frameMat, x, y, 0.03, 0.86, 1.24, 0.06);
      box(M.mat.snow, x, y - 0.66, 0.1, 0.96, 0.07, 0.22);
      box(trim, x, y + 0.72, 0.09, 1.04, 0.11, 0.16); box(M.mat.snow, x, y + 0.79, 0.1, 1.0, 0.04, 0.17);
      if (shut) for (const sx of [-1, 1]) box(shut, x + sx * 0.64, y, 0.07, 0.38, 1.22, 0.05, 0, sx * 0.25, 0);
      const wm = new T.Matrix4().multiplyMatrices(base, mtx(x, y, 0.066, 0, 0, 0, 0.7, 1.06, 1));
      if (r() < (o.lit ?? 0.6)) {
        lit.push({ m: wm, k: 0.9 + r() * 1.6 });
        if (f === 0) M.town.pools.push(new T.Vector3(x, 0, 1.4).applyMatrix4(base));
      } else dark.push(wm);
    }
  };

  // 统一生成实例化窗户（布局完成后由 05b 调用）
  M.house.flushWindows = () => {
    const plane = new T.PlaneGeometry(1, 1), vr = M.rand(404);
    const lgeo = plane.clone(), aVar = new Float32Array(lit.length);
    lit.forEach((w, i) => { aVar[i] = w.v ?? ((vr() * 4) | 0); });
    lgeo.setAttribute('aVar', new T.InstancedBufferAttribute(aVar, 1));
    const li = new T.InstancedMesh(lgeo, litMat, lit.length), c = new T.Color();
    lit.forEach((w, i) => { li.setMatrixAt(i, w.m); li.setColorAt(i, c.setRGB(1.6, 1.25, 0.9).multiplyScalar(w.k)); });
    li.instanceColor.needsUpdate = true; M.scene.add(li);
    const di = new T.InstancedMesh(plane, darkMat, Math.max(1, dark.length));
    dark.forEach((m, i) => di.setMatrixAt(i, m)); di.count = dark.length; di.receiveShadow = true; M.scene.add(di);
    M.town.litMesh = li;
  };
})();
