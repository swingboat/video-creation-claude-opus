// ===== 06b-firgen.js：冷杉生成器（枝条卡片实例化 + 积雪卡片 + 针叶形阴影）=====
(() => {
  const PI = Math.PI;
  const needleTex = M.canvasTex('needles', 256, (g, s) => {
    const r = M.rand(31), H = s / 2, cy = H / 2;
    g.clearRect(0, 0, s, s);
    const greens = ['#2a5f40', '#36704b', '#204d35', '#457f57'];
    const twig = (x0, y0, x1, y1, len, n) => {
      g.strokeStyle = '#4a3624'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let i = 0; i < n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, l = len * (1 - t * 0.55) * (0.7 + r() * 0.5);
        if (t < 0.1 && r() < 0.6) continue;
        g.strokeStyle = greens[(r() * 4) | 0]; g.lineWidth = 3 + r() * 1.5;
        for (const sd of [-1, 1]) { const a = Math.atan2(y1 - y0, x1 - x0) + sd * (0.9 + r() * 0.4);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      }
    };
    twig(0, cy, s, cy, H * 0.46, 110);
    for (let k = 0; k < 5; k++) { const x = s * (0.18 + k * 0.15), sd = k % 2 ? 1 : -1;
      twig(x, cy, x + s * 0.22, cy + sd * H * 0.34, H * 0.24, 26); }
  }, { clamp: true });
  const snowTex = M.canvasTex('branchSnow', 256, (g, s) => {
    const r = M.rand(57), H = s / 2, cy = H / 2; g.clearRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const x = s * (0.1 + r() * 0.85), y = cy + (r() - 0.5) * H * 0.5 * (1 - x / s * 0.5), rr = 12 + r() * 16 * (1 - x / s * 0.6);
      const n = 6 + ((r() * 4) | 0);
      for (let j = 0; j < n; j++) {
        const a = r() * PI * 2, d = r() * rr * 0.8, cx = x + Math.cos(a) * d * 1.4, cy2 = y + Math.sin(a) * d * 0.7, r2 = rr * (0.3 + r() * 0.35);
        const gr = g.createRadialGradient(cx, cy2, 0, cx, cy2, r2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#eef3ff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy2, r2, 0, PI * 2); g.fill();
      }
    }
  }, { clamp: true });

  // 枝条几何：沿 +X，中脉折起，枝梢下垂；UV 只用贴图上半
  const branchGeo = (() => {
    const g = new T.PlaneGeometry(1, 0.62, 5, 2); g.rotateX(-PI / 2); g.translate(0.5, 0, 0);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), w = 1 - Math.abs(z) / 0.31;
      p.setY(i, w * 0.08 * (1 - x * 0.6) - 0.18 * x * x);
      p.setZ(i, z * (1 - x * 0.45));
      uv.setY(i, 0.5 + uv.getY(i) * 0.5);
    }
    g.computeVertexNormals(); return g;
  })();
  const mkMat = (map, color, rough) => {
    const m = new T.MeshStandardMaterial({ map, color: M.col(color), roughness: rough, alphaTest: 0.45, side: T.DoubleSide });
    return m;
  };
  const leafMat = mkMat(needleTex, '#ffffff', 0.9), snowMat = mkMat(snowTex, '#e8eefb', 0.6);
  const depthOf = map => new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.45 });

  const leaves = [], snows = [], cores = [];
  const q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3();
  M.firgen = {};
  M.firgen.tree = (x, z, h, opts = {}) => {
    const r = M.rand(opts.seed || (x * 131 + z * 17) | 0), Rb = opts.radius || h * 0.33, tips = [];
    const whorls = Math.round(h * 2.4), per = opts.per || (h > 7 ? 11 : 8);
    const branch = (y, yaw, len, droop, shade, snowy) => {
      e.set((r() - 0.5) * 0.4, yaw, -droop, 'YZX'); q.setFromEuler(e);
      const m = new T.Matrix4().compose(v.set(x, y, z), q, sc.set(len, len * 0.9, len * (0.8 + r() * 0.3)));
      leaves.push({ m, c: shade });
      if (snowy) { const ms = m.clone(); ms.multiply(new T.Matrix4().makeTranslation(0.04, 0.045, 0)).multiply(new T.Matrix4().makeScale(0.9, 1, 0.85)); snows.push(ms); }
      const tip = new T.Vector3(1, -0.18, 0).applyMatrix4(m); tips.push(tip);
    };
    for (let i = 0; i < whorls; i++) {
      const t = i / whorls, y = h * (0.16 + t * 0.8), R = Rb * Math.pow(1 - t, 0.85) + 0.15, rot = r() * PI * 2;
      const n = Math.max(4, Math.round(per * (1 - t * 0.5)));
      for (let k = 0; k < n; k++) {
        const yaw = rot + k / n * PI * 2 + (r() - 0.5) * 0.3, droop = 0.22 + 0.35 * (1 - t) + r() * 0.1;
        branch(y, yaw, R * (0.85 + r() * 0.25), droop, 0.55 + 0.4 * t + r() * 0.08, r() < 0.3 + 0.35 * t);
        if (r() < 0.6) branch(y - h * 0.18 / whorls, yaw + PI / n, R * 0.6, droop + 0.1, 0.45 + 0.35 * t, false);
      }
    }
    cores.push({ x, z, h, r: Math.max(0.15, h * 0.11) });
    M.colliders.push({ x, z, r: opts.collide || h * 0.11 + 0.25 });
    return { tips };
  };
  M.firgen.flush = () => {
    const li = new T.InstancedMesh(branchGeo, leafMat, leaves.length), col = new T.Color();
    leaves.forEach((b, i) => { li.setMatrixAt(i, b.m); li.setColorAt(i, col.setRGB(b.c * 0.95, b.c, b.c * 0.92)); });
    li.instanceColor.needsUpdate = true; li.castShadow = li.receiveShadow = true; li.customDepthMaterial = depthOf(needleTex);
    M.scene.add(li);
    const si = new T.InstancedMesh(branchGeo, snowMat, Math.max(1, snows.length));
    snows.forEach((m, i) => si.setMatrixAt(i, m)); si.count = snows.length; si.receiveShadow = true; M.scene.add(si);
    const coreGeo = new T.ConeGeometry(1, 1, 10), coreMat = M.mat.std('#122a1e', 0.95), trunk = M.mat.std('#3a2618', 0.9);
    const trunkGeo = new T.CylinderGeometry(0.6, 1, 1, 8);
    for (const c of cores) {
      M.batch.add(coreGeo, coreMat, M.mtx(c.x, c.h * 0.58, c.z, 0, 0, 0, c.r * 0.6, c.h * 0.8, c.r * 0.6));
      M.batch.add(trunkGeo, trunk, M.mtx(c.x, c.h * 0.1, c.z, 0, 0, 0, c.r * 0.35, c.h * 0.2, c.r * 0.35));
    }
    M.firgen.mesh = li;
  };
})();
