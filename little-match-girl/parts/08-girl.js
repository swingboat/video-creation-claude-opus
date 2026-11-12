// ===== 08-girl.js：小女孩模型 + 分层程序动画 =====
(() => {
  const PI = Math.PI;
  const LK = M.girlLook;
  const mat = (c, r = 0.85, o = {}) => LK.rim(M.mat.std(c, r, { ...o, unique: true }));
  const skin = mat('#f4c3a2', 0.6), red = mat('#ffffff', 0.95, { side: T.DoubleSide, map: LK.knit }), hair = mat('#9a4a2a', 0.8);
  red.color.copy(M.col('#c23a2e'));
  const shawl = mat('#ffffff', 0.95, { side: T.DoubleSide, map: LK.plaid }), apron = mat('#b9a88e', 0.95, { side: T.DoubleSide });
  shawl.color.copy(M.col('#56688a'));
  const sock = mat('#3a2e2a', 0.9), foot = mat('#e7a99c', 0.6);
  const dressTex = M.canvasTex('dress', 256, (g, s) => {
    const r = M.rand(9); g.fillStyle = '#7b5640'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) { g.fillStyle = ['#6a4a38', '#8a6a4e', '#5a4a3e'][i % 3]; const x = r() * s, y = s * 0.3 + r() * s * 0.6; g.fillRect(x, y, 30 + r() * 30, 26 + r() * 26);
      g.strokeStyle = 'rgba(30,20,10,.6)'; g.setLineDash([4, 4]); g.strokeRect(x, y, 30, 26); }
    g.setLineDash([]); for (let y = 0; y < s; y += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(0, y, s, 1); }
  });
  const dress = mat('#ffffff', 0.95, { map: dressTex, side: T.DoubleSide });
  const capsule = (r, len, seg = 10) => {
    const pts = []; for (let i = 0; i <= 6; i++) { const a = -PI / 2 + i / 6 * PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); }
    for (let i = 0; i <= 6; i++) { const a = i / 6 * PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); }
    return new T.LatheGeometry(pts, seg);
  };
  const lathe = (pts, seg = 20, ps = 0, pl = PI * 2) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg, ps, pl);
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mesh = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; };
  const sph = new T.SphereGeometry(1, 20, 14);

  const root = new T.Group(); M.scene.add(root);
  const hips = grp(root, 0, 0.5, 0);
  const skirt = grp(hips);
  mesh(skirt, lathe([[0.11, 0.24], [0.14, 0.16], [0.19, 0.02], [0.245, -0.14], [0.27, -0.2], [0.262, -0.205]], 28), dress);
  mesh(skirt, lathe([[0.15, 0.16], [0.2, 0.02], [0.252, -0.13], [0.258, -0.16]], 14, -0.85, 1.7), apron);
  const leg = side => {
    const th = grp(hips, side * 0.07, 0.02, 0);
    mesh(th, capsule(0.045, 0.16), sock, 0, -0.1, 0);
    const kn = grp(th, 0, -0.21, 0);
    mesh(kn, capsule(0.04, 0.16), sock, 0, -0.1, 0);
    const ft = grp(kn, 0, -0.24, 0);
    mesh(ft, sph, foot, 0, 0.01, 0.035, 0.045, 0.035, 0.08);
    return { th, kn, ft };
  };
  const L = leg(1), R = leg(-1);
  const torso = grp(hips, 0, 0.18, 0);
  const chest = grp(torso, 0, 0.06, 0);
  mesh(chest, lathe([[0.1, -0.12], [0.125, -0.04], [0.12, 0.08], [0.07, 0.15], [0.04, 0.17]]), dress);
  mesh(chest, lathe([[0.05, 0.17], [0.14, 0.12], [0.18, 0.02], [0.2, -0.07], [0.19, -0.08]], 22), shawl);
  const neck = grp(chest, 0, 0.17, 0);
  const head = grp(neck, 0, 0.02, 0);
  mesh(head, new T.SphereGeometry(1, 28, 20), skin, 0, 0.17, 0, 0.19, 0.18, 0.18);
  const face = LK.face(head), locks = [];
  for (const s of [1, -1]) {
    const lg = grp(head, s * 0.15, 0.15, 0.06); locks.push(lg);
    mesh(lg, capsule(0.022, 0.1, 6), hair, 0, -0.05, 0).rotation.z = s * 0.25;
  }
  mesh(head, sph, mat('#f0b49c', 0.6), 0, 0.14, 0.18, 0.016, 0.013, 0.012);
  // 刘海：贴合额头的发片，下缘做成 5 个尖角的波浪
  { const ps = PI / 2 - 1.0, pl = 2.0, t0 = PI * 0.06, t1 = PI * 0.33;
    const bang = new T.SphereGeometry(1, 40, 10, ps, pl, t0, t1 - t0), p = bang.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const th = Math.acos(M.clamp(v.y, -1, 1));
      const k = (th - t0) / (t1 - t0), phi = Math.atan2(v.z, -v.x), u = (phi - ps) / pl;
      const tip = Math.pow(Math.abs(Math.sin(u * PI * 5)), 0.7), edge = Math.min(u, 1 - u) < 0.08 ? 0.4 : 1;
      const th2 = t0 + (th - t0) * (1 + k * (tip * 0.32 * edge - 0.12));
      v.set(-Math.cos(phi) * Math.sin(th2), Math.cos(th2), Math.sin(phi) * Math.sin(th2)); p.setXYZ(i, v.x, v.y, v.z); }
    bang.computeVertexNormals();
    mesh(head, bang, hair, 0, 0.17, 0, 0.197, 0.187, 0.189); }
  mesh(head, new T.SphereGeometry(0.212, 26, 16, PI / 2 + 1.1, PI * 2 - 2.2, 0, PI * 0.78), red, 0, 0.17, -0.005).rotation.x = -0.2;
  // 头巾开口的卷边
  { const pts = [], R = 0.214;
    const at = (phi, th) => new T.Vector3(-Math.cos(phi) * Math.sin(th) * R, Math.cos(th) * R, Math.sin(phi) * Math.sin(th) * R);
    for (let i = 0; i <= 8; i++) pts.push(at(PI / 2 + 1.1, PI * (0.78 - i * 0.06)));
    for (let i = 1; i < 8; i++) pts.push(at(PI / 2 + 1.1 - i * 2.2 / 8, PI * 0.3));
    for (let i = 0; i <= 8; i++) pts.push(at(PI / 2 - 1.1, PI * (0.3 + i * 0.06)));
    const brim = mesh(head, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, 0.021, 8, false), red, 0, 0.17, -0.005);
    brim.rotation.x = -0.2; }
  mesh(head, new T.SphereGeometry(0.215, 26, 10, 0, PI * 2, 0, PI * 0.3), red, 0, 0.17, 0).rotation.x = 0.02;
  mesh(head, new T.CylinderGeometry(0.13, 0.21, 0.22, 22, 1, true, 1.0, PI * 2 - 2.0), red, 0, -0.01, -0.02);
  mesh(head, sph, red, 0.035, 0.0, 0.11, 0.035, 0.03, 0.03); mesh(head, sph, red, -0.035, 0.0, 0.11, 0.035, 0.03, 0.03);
  mesh(head, capsule(0.02, 0.08, 6), red, 0.05, -0.05, 0.11).rotation.z = 0.3;
  mesh(head, capsule(0.02, 0.07, 6), red, -0.04, -0.05, 0.12).rotation.z = -0.4;
  // 头巾后面两条飘带，每条两节
  const tails = [1, -1].map(s => {
    const a = grp(head, s * 0.04, 0.06, -0.17), b = grp(a, 0, -0.1, 0);
    mesh(a, M.unitBox, red, 0, -0.05, 0, 0.055, 0.11, 0.012); mesh(b, M.unitBox, red, 0, -0.05, 0, 0.05, 0.11, 0.012);
    a.rotation.z = s * 0.18; return { a, b, s };
  });
  const arm = side => {
    const sh = grp(chest, side * 0.135, 0.09, 0);
    mesh(sh, capsule(0.042, 0.13), dress, 0, -0.09, 0);
    const el = grp(sh, 0, -0.19, 0);
    mesh(el, capsule(0.036, 0.12), dress, 0, -0.08, 0);
    const hand = grp(el, 0, -0.18, 0);
    mesh(hand, sph, skin, 0, -0.005, 0.004, 0.036, 0.05, 0.03);
    mesh(hand, sph, skin, -side * 0.028, 0.008, 0.016, 0.013, 0.022, 0.013).rotation.z = -side * 0.5;
    return { sh, el, hand };
  };
  const AL = arm(1), AR = arm(-1);
  // 篮子挂在左前臂
  const basket = grp(AL.el, 0.04, -0.1, 0.07);
  const wick = mat('#a9783e', 0.9, { side: T.DoubleSide, key: 'wick' });
  mesh(basket, lathe([[0.06, -0.06], [0.1, -0.03], [0.12, 0.05]], 14), wick, 0, -0.06, 0);
  mesh(basket, new T.TorusGeometry(0.11, 0.008, 4, 16, PI), wick, 0, -0.01, 0).rotation.y = PI / 2;
  const stickM = mat('#e2cc9c', 0.8), headM = mat('#a5281c', 0.6);
  for (let i = 0; i < 7; i++) {
    const s = mesh(basket, M.unitBox, stickM, -0.04 + i * 0.013, -0.02, (i % 3 - 1) * 0.02, 0.008, 0.11, 0.008); s.rotation.z = 0.2;
    mesh(basket, sph, headM, -0.04 + i * 0.013 - 0.01, 0.035, (i % 3 - 1) * 0.02, 0.009, 0.012, 0.009);
  }
  // 右手中的火柴
  const matchG = grp(AR.hand, 0, -0.02, 0.03); matchG.rotation.x = -1.2;
  mesh(matchG, M.unitBox, stickM, 0, 0.05, 0, 0.008, 0.11, 0.008);
  const tip = grp(matchG, 0, 0.11, 0);
  mesh(tip, sph, headM, 0, 0, 0, 0.01, 0.013, 0.01);
  matchG.visible = false;
  root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });

  // ---- 姿势 ----
  const P = () => ({ thL: 0, knL: 0, thR: 0, knR: 0, shLx: 0, shLz: 0.12, elL: -0.25, shRx: 0, shRz: -0.12, elR: -0.15, torX: 0.05, headX: 0, hipsY: 0.5, roll: 0 });
  const mix = (a, b, t) => { const o = {}; for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; };
  const armPose = o => Object.assign(P(), o);
  const POSES = {
    reach: armPose({ shRx: -0.4, shRz: 0.55, elR: -0.7, shLx: -0.3, elL: -0.9 }),
    chest: armPose({ shLx: -0.75, shLz: -0.35, elL: -1.5, shRx: -0.75, shRz: 0.35, elR: -1.5, torX: 0.12 }),
    swipe: armPose({ shLx: -0.75, shLz: -0.35, elL: -1.5, shRx: -0.6, shRz: -0.35, elR: -1.3, torX: 0.12 }),
    hold: armPose({ shLx: -0.5, shLz: -0.15, elL: -1.2, shRx: -1.05, shRz: 0.12, elR: -1.25, torX: 0.08, headX: 0.12 }),
    warm: armPose({ shLx: -1.0, shLz: -0.1, elL: -0.5, shRx: -1.0, shRz: 0.1, elR: -0.5, torX: 0.18, headX: 0.05 }),
    hug: armPose({ shLx: -1.0, shLz: 0.45, elL: -1.0, shRx: -1.0, shRz: -0.45, elR: -1.0, torX: 0.04, headX: -0.3 }),
    rub: armPose({ shLx: -0.8, shLz: -0.4, elL: -1.6, shRx: -0.8, shRz: 0.4, elR: -1.6, torX: 0.1, headX: 0.15 }),
  };
  const G = M.girl = { group: root, pos: root.position, heading: PI, speed: 0, hand: tip, matchG, hold: null, cold: 0.3 };
  let phase = 0, wWalk = 0, act = null, wAct = 0, cur = P(), rubT = 6, lookTarget = null, headYaw = 0, lastSin = 0, blinkT = 3, rimW = 0;
  let gazeX = 0, gazeY = 0, sacT = 1; const sac = new T.Vector2(), _gv = new T.Vector3();
  G.play = (name, onDone, onHit) => { act = { name, t: 0, onDone, onHit, hit: false }; };
  G.setHold = name => { G.hold = name; };
  G.look = v => { lookTarget = v; };
  const strikePose = t => {
    if (t < 0.4) return mix(P(), POSES.reach, M.smooth(0, 0.4, t));
    if (t < 0.7) return mix(POSES.reach, POSES.chest, M.smooth(0.4, 0.7, t));
    if (t < 0.9) return mix(POSES.chest, POSES.swipe, M.smooth(0.7, 0.85, t));
    return mix(POSES.swipe, POSES.hold, M.smooth(0.9, 1.5, t));
  };
  G.update = dt => {
    wWalk = M.damp(wWalk, G.speed > 0.05 ? 1 : 0, 8, dt);
    phase += dt * 2 * PI * 2.1 * Math.min(1, G.speed / 1.6 + 0.2) * (G.speed > 0.05 ? 1 : 0);
    const s = Math.sin(phase), c = Math.cos(phase);
    const walk = Object.assign(P(), { thL: -s * 0.5, thR: s * 0.5, knL: 0.1 + 0.8 * Math.max(0, c), knR: 0.1 + 0.8 * Math.max(0, -c),
      shLx: s * 0.18, shRx: -s * 0.38, elR: -0.3, hipsY: 0.5 + 0.022 * Math.cos(2 * phase), roll: s * 0.05, torX: 0.1 });
    let pose = mix(P(), walk, wWalk);
    // 一次性动作 / 持续姿势
    let target = null;
    if (act) {
      act.t += dt;
      if (act.name === 'strike') { target = strikePose(act.t); if (!act.hit && act.t > 0.8) { act.hit = true; act.onHit && act.onHit(); } if (act.t > 1.6) { const a = act; act = null; G.hold = G.hold || 'hold'; a.onDone && a.onDone(); } }
    } else if (G.hold) target = POSES[G.hold];
    else if (wWalk < 0.1 && G.warmNear > 0.5) target = POSES.warm;
    else if (wWalk < 0.1) { rubT -= dt; if (rubT < 0) { target = POSES.rub; if (rubT < -2.5) rubT = G.cold > 0.6 ? 3 + Math.random() * 2 : 8 + Math.random() * 6; } }
    wAct = M.damp(wAct, target ? 1 : 0, act ? 14 : 5, dt);
    if (target) G._lastAct = target;
    if (G._lastAct) for (const k of ['shLx', 'shLz', 'elL', 'shRx', 'shRz', 'elR', 'torX', 'headX']) pose[k] = M.lerp(pose[k], G._lastAct[k], wAct);
    if (G.hold === 'rub' || (target === POSES.rub)) { pose.elL += Math.sin(M.time * 14) * 0.15; pose.elR -= Math.sin(M.time * 14) * 0.15; }
    cur = mix(cur, pose, 1 - Math.exp(-18 * dt));
    // 应用
    L.th.rotation.x = cur.thL; L.kn.rotation.x = cur.knL; R.th.rotation.x = cur.thR; R.kn.rotation.x = cur.knR;
    L.ft.rotation.x = -cur.thL - cur.knL; R.ft.rotation.x = -cur.thR - cur.knR;
    AL.sh.rotation.set(cur.shLx, 0, cur.shLz); AL.el.rotation.x = cur.elL;
    AR.sh.rotation.set(cur.shRx, 0, cur.shRz); AR.el.rotation.x = cur.elR;
    const shiver = G.cold > 0.5 ? Math.sin(M.time * 38) * 0.022 * (G.cold - 0.45) * (1 - wWalk * 0.6) : 0;
    hips.position.y = cur.hipsY; hips.rotation.z = cur.roll + shiver; torso.rotation.x = cur.torX;
    chest.scale.setScalar(1 + Math.sin(M.time * 2.1) * 0.012);
    let yawT = 0;
    if (lookTarget) { const a = Math.atan2(lookTarget.x - root.position.x, lookTarget.z - root.position.z) - G.heading;
      yawT = M.clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1, 1);
      const dy = lookTarget.y - 1.1, dd = Math.hypot(lookTarget.x - root.position.x, lookTarget.z - root.position.z);
      cur.headX = M.lerp(cur.headX, -Math.atan2(dy, dd) * 0.6, 0.1); }
    headYaw = M.damp(headYaw, yawT, 6, dt);
    neck.rotation.set(cur.headX, headYaw, -cur.roll * 0.6);
    // 视线：看目标 / 近景看镜头 / 朝前，外加微小扫视
    sacT -= dt; if (sacT < 0) { sacT = 0.8 + Math.random() * 1.7; sac.set((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.006); }
    let gx = 0, gy = 0, src = lookTarget;
    if (!src && M.camera.position.distanceTo(root.position) < 4.5) src = M.camera.position;
    if (src) { _gv.copy(src); head.worldToLocal(_gv); _gv.y -= 0.17;
      const yaw = Math.atan2(_gv.x, _gv.z), pit = Math.atan2(_gv.y, Math.hypot(_gv.x, _gv.z));
      if (Math.abs(yaw) < 1.7) { gx = M.clamp(yaw / 0.9, -1, 1) * 0.02; gy = M.clamp(pit / 0.7, -1, 1) * 0.014; } }
    gazeX = M.damp(gazeX, gx + sac.x, 12, dt); gazeY = M.damp(gazeY, gy + sac.y, 12, dt); face.gaze(gazeX, gazeY);
    root.rotation.y = G.heading;
    // 二级动作：裙摆、飘带、发缕
    const sp = G.speed, sw = Math.sin(M.time * 2.3);
    skirt.rotation.set(sp * 0.05 + Math.sin(2 * phase) * 0.03 * wWalk, 0, -cur.roll * 0.8);
    for (const t of tails) {
      t.a.rotation.set(0.15 + sp * 0.35 + sw * 0.07 + Math.sin(phase * 2) * 0.05 * wWalk, 0, t.s * (0.18 + Math.sin(M.time * 1.7 + t.s) * 0.05));
      t.b.rotation.x = 0.1 + sp * 0.2 + Math.sin(M.time * 2.3 - 0.8) * 0.1;
    }
    locks.forEach((l, i) => { l.rotation.z = Math.sin(M.time * 1.9 + i) * 0.08 + cur.roll * 0.5; });
    // 眨眼、火光边缘光、火柴可见
    blinkT -= dt; face.blink(blinkT < 0.12); if (blinkT < 0) blinkT = (lookTarget ? 4.5 : 2.5) + Math.random() * 3;
    rimW = M.damp(rimW, M.story && M.story.flame ? 1 : 0, 3, dt); LK.rimU.uRimWarm.value = rimW;
    const sn = LK.rimU.uSnow;
    sn.value = M.clamp(sn.value + ((G.warmNear || 0) > 0.3 || (M.story && M.story.dawn > 0) ? -0.15 : G.cold > 0.45 ? 0.012 : 0) * dt, 0, 0.65);
    matchG.visible = !!(act && act.name === 'strike' && act.t > 0.35) || !!(M.story && M.story.flame);
    // 脚步
    if (wWalk > 0.5 && Math.sign(s) !== Math.sign(lastSin)) {
      const ft = (s > 0 ? R : L).ft, p = new T.Vector3(); ft.getWorldPosition(p);
      M.footprint && M.footprint(p.x, p.z, G.heading); M.audio && M.audio.step && M.audio.step(s > 0 ? 1 : -1);
    }
    lastSin = s;
  };
  root.position.set(1, 0, 11.5); root.rotation.y = PI;
})();
