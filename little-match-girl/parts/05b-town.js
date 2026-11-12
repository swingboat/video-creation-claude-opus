// ===== 05b-town.js：房屋布局、面包房、教堂 =====
(() => {
  const PAL = ['#c9a14a', '#a8442f', '#3f6d8a', '#5d7a4c', '#d8cbb0', '#8b5a3c', '#2f4a66', '#b8803a', '#9b3b3b'];
  const r = M.rand(2024);
  const pick = a => a[(r() * a.length) | 0];
  const roofKind = () => { const k = r(); return k < 0.5 ? 'eave' : k < 0.8 ? 'gable' : 'step'; };
  let seed = 100;
  // 沿一条线排房子：from→to 为沿立面方向的坐标，place(c, w) 返回 {x,z}
  const row = (from, to, facing, place, opt = {}) => {
    const dir = Math.sign(to - from); let c = from;
    while (dir * (to - c) > 1.5) {
      let w = 4 + r() * 2.2;
      if (opt.skip) for (const [a, b] of opt.skip) {
        if (dir * (a - c) >= 0 && dir * (c + dir * w - a) > 0) w = Math.abs(a - c);
        if (dir * (c - a) >= 0 && dir * (b - c) > 0) { c = b; w = 0; }
      }
      if (w > 0.6) {
        w = Math.min(w, Math.abs(to - c));
        const p = place(c + dir * w / 2);
        M.house({ ...p, facing, w: w - 0.02, d: opt.d || 8, h: 7 + r() * 5, color: pick(PAL), roof: roofKind(), seed: seed++, lit: opt.lit });
      }
      c += dir * w;
    }
  };
  const PI = Math.PI;
  row(18, -44, PI / 2, z => ({ x: -4, z }), { skip: [[-9, -15]] });          // 西排
  row(30, -43, -PI / 2, z => ({ x: 16.5, z }));                               // 东排
  row(-14, -1, 0, x => ({ x, z: -65 }));                                       // 北排西段
  row(9, 25, 0, x => ({ x, z: -65 }));                                         // 北排东段
  row(-44.5, -64.5, PI / 2, z => ({ x: -12, z }), { d: 7 });                   // 广场西
  row(-44.5, -64.5, -PI / 2, z => ({ x: 22, z }), { d: 7 });                   // 广场东
  M.house({ x: -8, z: -44, facing: PI, w: 7.9, d: 7, h: 9, color: '#b8803a', roof: 'eave', seed: seed++ });
  M.house({ x: 19.2, z: -44, facing: PI, w: 5.4, d: 7, h: 10, color: '#3f6d8a', roof: 'gable', seed: seed++ });
  M.house({ x: 0.8, z: 19.5, facing: PI, w: 9.6, d: 8, h: 11, color: '#a8442f', roof: 'step', seed: seed++ });
  M.house({ x: 11, z: 31, facing: PI, w: 10, d: 8, h: 10, color: '#5d7a4c', roof: 'eave', seed: seed++ });

  // ---- 教堂 ----
  M.house({ x: 4, z: -65, facing: 0, w: 10, d: 12, h: 14, color: '#d8cbb0', roof: 'gable', roofH: 5, seed: 7, door: false,
    skipGround: () => true, lit: 0.9, windows: false });
  const stoneMat = M.mat.std('#b9ad98', 0.9, { map: M.tex.stone() }), copper = M.mat.std('#3f6b5c', 0.7, { flat: true });
  const trimC = M.mat.std('#b8ab94', 0.9, { emissive: '#3a2a1a', ei: 0.35 }), gold = M.mat.std('#c9a24a', 0.35, { metal: 0.7, emissive: '#5a4010', ei: 0.6 });
  const B = (mat, x, y, z, sx, sy, sz, ry = 0) => M.batch.add(M.unitBox, mat, M.mtx(x, y, z, 0, ry, 0, sx, sy, sz));
  const plasterC = M.mat.std('#d8cbb0', 0.92, { map: M.tex.plaster() });
  B(plasterC, 4, 22, -67, 3.6, 10, 3.6);
  B(trimC, 4, 17.2, -67, 3.85, 0.3, 3.85); B(trimC, 4, 27.15, -67, 3.95, 0.35, 3.95); B(M.mat.snow, 4, 27.36, -67, 3.9, 0.08, 3.9);
  // 钟楼开口（四面）+ 表盘
  const dark = M.mat.std('#140c08', 0.9);
  for (const [dx, dz, ry] of [[0, 1.81, 0], [0, -1.81, 0], [1.81, 0, PI / 2], [-1.81, 0, PI / 2]]) {
    B(dark, 4 + dx, 24.9, -67 + dz, 1.0, 2.2, 0.05, ry);
    const a = new T.CylinderGeometry(0.5, 0.5, 0.05, 16, 1, false, 0, PI); a.rotateX(PI / 2); a.rotateZ(PI / 2);
    M.batch.add(a, dark, M.mtx(4 + dx, 26.0, -67 + dz, 0, ry, 0));
    B(M.mat.snow, 4 + dx, 23.82, -67 + dz, 1.2, 0.06, 0.2, ry);
  }
  const clockTex = M.canvasTex('clock', 256, (g, s) => {
    g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.48, 0, PI * 2); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 8; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.lineWidth = i % 3 ? 4 : 9;
      g.beginPath(); g.moveTo(s / 2 + Math.sin(a) * s * 0.36, s / 2 - Math.cos(a) * s * 0.36); g.lineTo(s / 2 + Math.sin(a) * s * 0.44, s / 2 - Math.cos(a) * s * 0.44); g.stroke(); }
    g.lineCap = 'round'; g.lineWidth = 10; g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 - s * 0.05, s / 2 - s * 0.24); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 - s * 0.03, s / 2 - s * 0.38); g.stroke();
  }, { clamp: true });
  const clock = new T.Mesh(new T.CircleGeometry(0.95, 40), new T.MeshBasicMaterial({ map: clockTex, color: M.col('#ffffff').multiplyScalar(1.15) }));
  clock.position.set(4, 21.6, -65.17); M.scene.add(clock);
  M.batch.add(new T.TorusGeometry(1.0, 0.08, 6, 40), gold, M.mtx(4, 21.6, -65.17));
  // 八棱塔尖 + 四角小尖 + 金球十字
  M.batch.add(new T.ConeGeometry(2.05, 9, 8), copper, M.mtx(4, 31.9, -67, 0, PI / 8, 0));
  for (const [dx, dz] of [[1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) {
    M.batch.add(new T.ConeGeometry(0.28, 1.7, 6), copper, M.mtx(4 + dx, 28.2, -67 + dz));
    M.batch.add(new T.SphereGeometry(0.07, 8, 6), gold, M.mtx(4 + dx, 29.1, -67 + dz));
  }
  M.batch.add(new T.SphereGeometry(0.24, 14, 10), gold, M.mtx(4, 36.55, -67));
  B(gold, 4, 37.35, -67, 0.1, 1.3, 0.1); B(gold, 4, 37.55, -67, 0.7, 0.1, 0.1);
  // 正立面：壁柱、门楣、门边小柱、台阶
  for (const x of [-0.75, 1.9, 6.1, 8.75]) { B(trimC, x, 6.9, -64.88, 0.5, 13.6, 0.26); B(trimC, x, 0.35, -64.82, 0.66, 0.7, 0.4); }
  B(trimC, 4, 13.6, -64.84, 10.3, 0.4, 0.34); B(M.mat.snow, 4, 13.84, -64.82, 10.3, 0.06, 0.36);
  for (const x of [2.85, 5.15]) { M.batch.add(new T.CylinderGeometry(0.16, 0.18, 3.6, 12), trimC, M.mtx(x, 1.8, -64.75)); B(trimC, x, 3.68, -64.75, 0.42, 0.16, 0.42); }
  { const tri = new T.Shape([new T.Vector2(-1.45, 0), new T.Vector2(1.45, 0), new T.Vector2(0, 0.85)]);
    M.batch.add(new T.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), trimC, M.mtx(4, 4.25, -64.95));
    B(M.mat.snow, 4, 4.3, -64.75, 2.9, 0.05, 0.3); }
  for (let i = 0; i < 3; i++) { const dz = 2.7 - i * 0.85;
    B(stoneMat, 4, 0.07 + i * 0.14, -65 + dz / 2, 6.4 - i * 0.8, 0.14, dz);
    B(M.mat.snow, 4 - (2.9 - i * 0.4), 0.16 + i * 0.14, -65 + dz - 0.2, 0.5, 0.06, 0.35); }
  for (const x of [0.6, 7.4]) { B(stoneMat, x, 0.45, -63.6, 0.7, 0.9, 0.9); B(M.mat.snow, x, 0.93, -63.6, 0.74, 0.08, 0.94); }
  B(M.mat.std('#2b1a12', 0.7), 4, 1.6, -64.95, 1.8, 3.2, 0.12);
  const arch = new T.CylinderGeometry(0.9, 0.9, 0.12, 20, 1, false, 0, PI); arch.rotateX(PI / 2); arch.rotateZ(PI / 2);
  M.batch.add(arch, M.mat.std('#2b1a12', 0.7), M.mtx(4, 3.2, -64.95));
  for (let i = 0; i < 5; i++) M.colliders.push({ x: 0.8 + i * 1.6, z: -63.6, r: 1.4 });
  // 彩色玻璃：高拱窗（正面 2、侧面各 3）
  const stained = M.canvasTex('stained', 256, (g, s) => {
    const w = s / 2, r2 = M.rand(9), cols = ['#ffcf70', '#ff7a4a', '#6a9cff', '#ffe9b0', '#c8503a', '#8fd0ff', '#b07ad8'];
    g.save(); g.beginPath(); g.moveTo(w * 0.08, s); g.lineTo(w * 0.08, s * 0.25); g.arc(w / 2, s * 0.25, w * 0.42, PI, 0); g.lineTo(w * 0.92, s); g.closePath(); g.clip();
    for (let y = 0; y < s; y += 18) for (let x = 0; x < w; x += 16) { g.fillStyle = cols[(r2() * cols.length) | 0]; g.fillRect(x, y, 16, 18); }
    g.strokeStyle = '#1a0e08'; g.lineWidth = 3; for (let y = 0; y < s; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); }
    g.restore(); g.strokeStyle = '#1a0e08'; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.08, s); g.lineTo(w * 0.08, s * 0.25);
    g.arc(w / 2, s * 0.25, w * 0.42, PI, 0); g.lineTo(w * 0.92, s); g.stroke();
  }, { clamp: true });
  const stMat = new T.MeshBasicMaterial({ map: stained, color: M.col('#ffffff').multiplyScalar(1.5), transparent: true, alphaTest: 0.5, side: T.DoubleSide });
  const stGeo = new T.PlaneGeometry(1.1, 3.4); { const uv = stGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5); }
  for (const x of [0.6, 7.4]) M.batch.add(stGeo, stMat, M.mtx(x, 6.4, -64.93));
  for (const sx of [-1.03, 9.03]) for (const z of [-68, -71.2, -74.4]) M.batch.add(stGeo, stMat, M.mtx(sx, 7.2, z, 0, PI / 2));
  const rose = M.canvasTex('rose2', 512, (g, s) => {
    const c = s / 2, R = s * 0.47, cols = ['#ffcf70', '#ff7a4a', '#6a9cff', '#ffe9b0', '#c8503a', '#8fd0ff', '#b07ad8', '#ffd890'];
    g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(c, c, R + 6, 0, PI * 2); g.fill();
    for (let i = 0; i < 16; i++) { const a = i * PI / 8; g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.arc(c + Math.cos(a) * R * 0.72, c + Math.sin(a) * R * 0.72, R * 0.24, 0, PI * 2); g.fill(); }
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; g.fillStyle = cols[(i + 3) % cols.length];
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, R * 0.46, a - 0.33, a + 0.33); g.fill(); }
    g.strokeStyle = '#1a0e08'; g.lineWidth = 7;
    for (let i = 0; i < 16; i++) { const a = i * PI / 8; g.beginPath(); g.arc(c + Math.cos(a) * R * 0.72, c + Math.sin(a) * R * 0.72, R * 0.24, 0, PI * 2); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R * 0.48, c + Math.sin(a) * R * 0.48); g.stroke(); }
    g.beginPath(); g.arc(c, c, R * 0.47, 0, PI * 2); g.stroke();
    g.fillStyle = '#ffe1a0'; g.beginPath(); g.arc(c, c, R * 0.13, 0, PI * 2); g.fill(); g.stroke();
  }, { clamp: true });
  const roseM = new T.Mesh(new T.CircleGeometry(1.4, 48), new T.MeshBasicMaterial({ map: rose, color: M.col('#ffffff').multiplyScalar(1.45) }));
  roseM.position.set(4, 9.5, -64.93); M.scene.add(roseM);
  M.batch.add(new T.TorusGeometry(1.48, 0.14, 8, 48), trimC, M.mtx(4, 9.5, -64.9));
  M.town.rose = roseM;

  // ---- 面包房（单独 Group，有动画）----
  M.house({ x: -4, z: -12, facing: PI / 2, w: 6, d: 8, h: 10.5, color: '#c9a14a', roof: 'step', seed: 55, door: false, skipGround: () => true });
  const bk = new T.Group(); bk.position.set(-4, 0, -12); bk.rotation.y = PI / 2; M.scene.add(bk);
  const wood = M.mat.std('#3b2216', 0.7, { map: M.tex.wood() });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; m.receiveShadow = true; bk.add(m); return m; };
  const BX = M.unitBox;
  add(BX, wood, 0.6, 0.3, 0.42, 2.6, 0.6, 0.84);
  add(BX, wood, 0.6, 2.6, 0.45, 2.75, 0.26, 0.92);
  add(BX, M.mat.snow, 0.6, 2.77, 0.47, 2.8, 0.08, 0.95);
  add(BX, wood, -0.68, 1.5, 0.42, 0.12, 2.1, 0.84); add(BX, wood, 1.88, 1.5, 0.42, 0.12, 2.1, 0.84);
  const roomMat = new T.MeshStandardMaterial({ color: M.col('#a8683a'), roughness: 0.9, side: T.BackSide,
    emissive: M.col('#ff9450'), emissiveIntensity: 0.35 });
  // 室内盒比窗框略小，避免内壁与窗框立柱/窗台共面导致 z-fighting 闪烁
  add(BX, roomMat, 0.6, 1.545, 0.42, 2.36, 1.83, 0.78);
  // 室内盒用内表面，自身接收阴影会产生斜纹（shadow acne），随阴影相机移动而闪烁；室内靠自发光照明，不需要阴影
  { const room = bk.children[bk.children.length - 1]; room.castShadow = false; room.receiveShadow = false; }
  add(BX, wood, 0.6, 1.0, 0.42, 2.0, 0.07, 0.5);
  const glass = new T.Mesh(new T.PlaneGeometry(2.44, 1.9), new T.MeshStandardMaterial({ color: M.col('#cfe0ff'), roughness: 0.05,
    metalness: 0.6, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.position.set(0.6, 1.55, 0.82); bk.add(glass);
  add(BX, wood, 0.6, 1.55, 0.83, 0.05, 1.9, 0.04); add(BX, wood, 0.6, 1.9, 0.83, 2.44, 0.05, 0.04);
  // 橱窗里的宴席（初始缩为 0）
  const items = new T.Group(); items.position.set(0.6, 1.04, 0.42); bk.add(items);
  const goldBread = M.mat.std('#c98a3a', 0.55), roast = M.mat.std('#9a4a1e', 0.35), plateM = M.mat.std('#f2efe8', 0.3);
  const it = (geo, mat, x, y, z, sx, sy, sz) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true; items.add(m); m.userData.s = m.scale.clone(); m.scale.setScalar(0.0001); return m; };
  const sph = new T.SphereGeometry(1, 18, 12), cyl = new T.CylinderGeometry(1, 1, 1, 20);
  it(cyl, plateM, 0, 0.02, 0, 0.36, 0.03, 0.26);
  it(sph, roast, 0, 0.14, 0, 0.26, 0.15, 0.18);
  it(sph, roast, 0.2, 0.12, 0.1, 0.09, 0.06, 0.06); it(sph, roast, 0.2, 0.12, -0.1, 0.09, 0.06, 0.06);
  for (let i = 0; i < 4; i++) it(sph, goldBread, -0.7 + i * 0.13, 0.07, 0.12 - (i % 2) * 0.18, 0.12, 0.07, 0.07);
  it(sph, goldBread, 0.68, 0.08, 0.05, 0.16, 0.08, 0.1); it(sph, goldBread, 0.55, 0.08, -0.12, 0.13, 0.07, 0.08);
  const flameM = new T.MeshBasicMaterial({ color: M.col('#ffc070').multiplyScalar(6) });
  [-0.45, 0.42].forEach(x => { it(cyl, plateM, x, 0.12, -0.15, 0.03, 0.24, 0.03); it(sph, flameM, x, 0.27, -0.15, 0.025, 0.05, 0.025); });
  // 门
  add(BX, wood, -2.4, 1.2, 0.06, 0.14, 2.4, 0.12); add(BX, wood, -1.2, 1.2, 0.06, 0.14, 2.4, 0.12);
  add(BX, wood, -1.8, 2.35, 0.06, 1.34, 0.14, 0.12);
  add(BX, new T.MeshBasicMaterial({ color: M.col('#ffb070').multiplyScalar(1.4) }), -1.8, 1.1, 0.03, 1.0, 2.1, 0.02);
  const hinge = new T.Group(); hinge.position.set(-2.3, 0, 0.1); bk.add(hinge);
  const door = new T.Mesh(BX, M.mat.std('#5a2f1c', 0.7, { map: M.tex.wood() })); door.position.set(0.5, 1.1, 0); door.scale.set(1, 2.1, 0.07);
  door.castShadow = true; hinge.add(door);
  // 招牌
  const signTex = M.canvasTex('sign', 256, (g, s) => {
    g.fillStyle = '#3a2214'; g.fillRect(0, 0, s, s); g.strokeStyle = '#d9a650'; g.lineWidth = 8; g.strokeRect(10, 10, s - 20, s - 20);
    g.fillStyle = '#e8b45a'; g.beginPath(); g.ellipse(s / 2, s * 0.4, s * 0.26, s * 0.14, 0, 0, PI * 2); g.fill();
    g.strokeStyle = '#8a5a26'; g.lineWidth = 5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(s / 2 + i * 34 - 10, s * 0.32); g.lineTo(s / 2 + i * 34 + 10, s * 0.48); g.stroke(); }
    g.fillStyle = '#f2d9a8'; g.font = 'bold 54px serif'; g.textAlign = 'center'; g.fillText('面包房', s / 2, s * 0.82);
  }, { clamp: true });
  add(BX, M.mat.std('#1a1a1e', 0.5, { metal: 0.6 }), 0.6, 3.75, 0.55, 0.05, 0.05, 1.1);
  const signMat = new T.MeshStandardMaterial({ map: signTex, roughness: 0.7 });
  for (const s of [1, -1]) {
    const sign = new T.Mesh(new T.PlaneGeometry(0.85, 0.85), signMat);
    sign.position.set(0.6 + s * 0.01, 3.25, 0.75); sign.rotation.y = s * PI / 2; bk.add(sign);
  }
  M.colliders.push({ x: -3.35, z: -12.6, r: 1.25 }, { x: -3.6, z: -11.5, r: 0.8 }, { x: -3.6, z: -13.8, r: 0.8 });
  bk.updateMatrixWorld(true);
  M.bakery = { group: bk, items, hinge, roomMat, doorOut: bk.localToWorld(new T.Vector3(-1.8, 0, 0.9)),
    window: bk.localToWorld(new T.Vector3(0.6, 1.3, 0.8)) };
  M.lights.pool(-2.6, -12.6, '#ffa860', 2.4, 0.9);

  // ---- 合并 + 窗户 + 窗光光斑 ----
  M.batch.flush();
  M.house.flushWindows();
  M.town.pools.slice(0, 60).forEach(p => M.lights.pool(p.x, p.z, '#ffa860', 1.7, 0.5));
  M.town.doorLamps.forEach(p => M.lights.pool(p.x, p.z, '#ffb070', 2.2, 0.7));
})();
