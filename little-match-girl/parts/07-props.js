// ===== 07-props.js：路灯、木桶、木箱、长椅、冷杉、暖炉亭、圣诞树 =====
(() => {
  const PI = Math.PI, r = M.rand(77);
  const iron = M.mat.std('#18181c', 0.45, { metal: 0.5 }), wood = M.mat.std('#6a4a2e', 0.8, { map: M.tex.wood() });
  const darkWood = M.mat.std('#3e2a1c', 0.8, { map: M.tex.wood() });
  const B = (mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => M.batch.add(M.unitBox, mat, M.mtx(x, y, z, rx, ry, rz, sx, sy, sz));
  const G = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.batch.add(geo, mat, M.mtx(x, y, z, rx, ry, rz, sx, sy, sz));
  M.props = { pools: [] };

  // ---- 路灯 ----
  const lampMat = new T.MeshBasicMaterial({ color: M.col('#ffcf88').multiplyScalar(3.2) });
  M.props.lampMat = lampMat;
  const baseGeo = new T.LatheGeometry([[0.2, 0], [0.22, 0.12], [0.14, 0.24], [0.1, 0.55], [0.07, 0.62], [0.06, 0.7]].map(p => new T.Vector2(...p)), 12);
  const post = new T.CylinderGeometry(0.05, 0.06, 2.5, 8), glassG = new T.CylinderGeometry(0.2, 0.13, 0.42, 4, 1);
  const capG = new T.ConeGeometry(0.3, 0.28, 4), finial = new T.SphereGeometry(0.05, 8, 6), ring = new T.CylinderGeometry(0.15, 0.12, 0.08, 8);
  M.lamp = (x, z) => {
    G(baseGeo, iron, x, 0, z); G(post, iron, x, 1.95, z); G(ring, iron, x, 3.2, z);
    G(glassG, lampMat, x, 3.45, z, 0, PI / 4); 
    for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2; B(iron, x + Math.cos(a) * 0.17, 3.45, z + Math.sin(a) * 0.17, 0.03, 0.45, 0.03); }
    G(capG, iron, x, 3.8, z, 0, PI / 4); G(capG, M.mat.snow, x, 3.84, z, 0, PI / 4, 0, 0.85, 0.7, 0.85); G(finial, iron, x, 4.0, z);
    M.props.pools.push(M.lights.pool(x, z, '#ffb26b', 3.8, 1.0));
    M.colliders.push({ x, z, r: 0.25 });
  };
  M.layout.lamps.forEach(([x, z]) => M.lamp(x, z));

  // ---- 木桶 ----
  const barrel = new T.LatheGeometry(Array.from({ length: 9 }, (_, i) => new T.Vector2(0.3 + 0.05 * Math.sin(PI * i / 8), i * 0.1)), 14);
  const hoop = new T.TorusGeometry(0.33, 0.018, 4, 18), lid = new T.CylinderGeometry(0.31, 0.31, 0.06, 14);
  const barrels = [[-3.0, 3.6], [-2.5, 4.3], [-3.05, 4.5], [4.6, -7.2], [-3.0, -24.5], [-2.45, -25], [4.5, -35.5], [15.3, 10], [-9.5, -52]];
  barrels.forEach(([x, z]) => {
    G(barrel, wood, x, 0, z); G(hoop, iron, x, 0.18, z, PI / 2); G(hoop, iron, x, 0.62, z, PI / 2);
    G(lid, M.mat.snow, x, 0.83, z, 0, 0, 0, 0.95, 1, 0.95); M.colliders.push({ x, z, r: 0.42 });
  });

  // ---- 木箱 ----
  [[-2.9, -16.6, 0, 0.75], [-2.9, -17.45, 0, 0.7], [-2.9, -16.95, 0.72, 0.6], [4.7, -9, 0, 0.7], [4.7, -9, 0.7, 0.55], [-3.0, 11.6, 0, 0.6]]
    .forEach(([x, z, y, s]) => {
      const rot = (r() - 0.5) * 0.4;
      B(darkWood, x, y + s / 2, z, s, s, s, 0, rot); B(M.mat.snow, x, y + s + 0.03, z, s * 0.9, 0.06, s * 0.9, 0, rot);
      if (y === 0) M.colliders.push({ x, z, r: s * 0.7 });
    });

  // ---- 长椅 ----
  const bench = (x, z) => {
    for (let i = 0; i < 3; i++) B(wood, x + 0.1 * i - 0.1, 0.45, z, 0.09, 0.05, 1.8);
    B(wood, x - 0.25, 0.75, z, 0.05, 0.35, 1.8);
    for (const dz of [-0.75, 0.75]) { B(iron, x, 0.22, z + dz, 0.4, 0.45, 0.05); B(iron, x - 0.25, 0.6, z + dz, 0.05, 0.5, 0.05); }
    B(M.mat.snow, x, 0.5, z, 0.32, 0.05, 1.7);
    M.colliders.push({ x, z: z - 0.5, r: 0.45 }, { x, z: z + 0.5, r: 0.45 });
  };
  bench(-3.0, -1.5); bench(-3.0, -32);

  // ---- 冷杉 ----
  M.fir = (x, z, h) => M.firgen.tree(x, z, h);
  [[-2.8, 17.6, 4.2], [4.9, 17.6, 3.6], [-2.9, -41, 4], [-10, -46, 5], [20, -46.5, 4.5], [-10.5, -62, 5.5], [20.5, -62, 5], [15.2, -40, 3.4]]
    .forEach(([x, z, h]) => M.fir(x, z, h));

  // ---- 暖炉亭（站点 1）----
  const kx = -1, kz = 9;
  for (const [dx, dz, h] of [[-1.0, -0.95, 2.5], [-1.0, 0.95, 2.5], [1.0, -0.95, 2.2], [1.0, 0.95, 2.2]]) {
    B(darkWood, kx + dx, h / 2, kz + dz, 0.12, h, 0.12); M.colliders.push({ x: kx + dx, z: kz + dz, r: 0.15 });
  }
  const tilt = -Math.atan2(0.3, 2.0);
  B(M.mat.std('#4a3020', 0.8, { map: M.tex.wood() }), kx, 2.42, kz, 2.5, 0.1, 2.3, 0, 0, tilt);
  B(M.mat.snow, kx, 2.51, kz, 2.4, 0.08, 2.2, 0, 0, tilt);
  B(darkWood, kx - 1.0, 2.5, kz, 0.1, 0.16, 2.0); B(darkWood, kx + 1.0, 2.2, kz, 0.1, 0.16, 2.0);
  const stoveProfile = [[0, 0.15], [0.28, 0.15], [0.38, 0.3], [0.44, 0.55], [0.4, 0.82], [0.28, 0.98], [0.12, 1.04], [0.1, 1.1]];
  G(new T.LatheGeometry(stoveProfile.map(p => new T.Vector2(...p)), 16), iron, kx, 0, kz);
  for (let i = 0; i < 3; i++) { const a = i * PI * 2 / 3; B(iron, kx + Math.cos(a) * 0.25, 0.08, kz + Math.sin(a) * 0.25, 0.06, 0.16, 0.06); }
  G(new T.CylinderGeometry(0.08, 0.08, 1.8, 8), iron, kx, 1.95, kz);
  G(new T.CylinderGeometry(0.11, 0.11, 0.15, 8), iron, kx, 2.95, kz);
  const doorMat = new T.MeshBasicMaterial({ color: M.col('#2a1008') });
  const stoveDoor = new T.Mesh(new T.CircleGeometry(0.17, 16), doorMat);
  stoveDoor.position.set(kx + 0.455, 0.56, kz); stoveDoor.rotation.y = PI / 2; M.scene.add(stoveDoor);
  for (let i = 0; i < 5; i++) G(new T.CylinderGeometry(0.07, 0.07, 0.6, 7), M.mat.std('#7a5236', 0.9), kx - 0.6, 0.08 + (i % 2) * 0.12, kz + 0.75 + i * 0.07, PI / 2, 0, PI / 2);
  M.colliders.push({ x: kx, z: kz, r: 0.6 });
  M.props.stove = { pos: new T.Vector3(kx, 0.6, kz), door: stoveDoor, doorMat, focus: new T.Vector3(kx + 0.5, 0.6, kz) };

  // ---- 圣诞树（站点 3）----
  const tx = 4, tz = -54, TH = 9.5;
  const { tips } = M.firgen.tree(tx, tz, TH, { radius: 3.7, per: 13, collide: 2.6, seed: 2026 });
  const rc = M.rand(88), pool = tips.filter(p => p.y > 0.9).sort(() => rc() - 0.5);
  const candles = pool.slice(0, 140).map(p => p.clone().add(new T.Vector3(0, 0.05, 0)));
  const star = new T.Shape();
  for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? 0.22 : 0.55; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const starMat = new T.MeshStandardMaterial({ color: M.col('#c9a24a'), metalness: 0.7, roughness: 0.3, emissive: M.col('#ffcc55'), emissiveIntensity: 0 });
  const starMesh = new T.Mesh(new T.ExtrudeGeometry(star, { depth: 0.1, bevelEnabled: false }), starMat);
  starMesh.position.set(tx, TH + 0.6, tz); M.scene.add(starMesh);
  M.props.tree = { pos: new T.Vector3(tx, 0, tz), candles, star: starMesh, starMat, top: new T.Vector3(tx, TH + 0.6, tz) };
  for (let i = 0; i < 6; i++) { const a = i * PI / 3 + 0.3; B(M.mat.std('#7a2a22', 0.6), tx + Math.cos(a) * 2.9, 0.18, tz + Math.sin(a) * 2.9, 0.4, 0.36, 0.4, 0, a);
    B(M.mat.std('#d9b44a', 0.4), tx + Math.cos(a) * 2.9, 0.37, tz + Math.sin(a) * 2.9, 0.42, 0.04, 0.1, 0, a); }

  M.firgen.flush();
  M.batch.flush();
})();
