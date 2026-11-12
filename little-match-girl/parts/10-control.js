// ===== 10-control.js：点击行走、避障、跟随相机、剧情镜头 =====
(() => {
  const G = M.girl, PI = Math.PI;
  let target = null, stuck = 0;
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3(), ndc = new T.Vector2();
  M.control = { enabled: false };
  M.control.walkTo = (x, z) => { target = new T.Vector3(x, 0, z); stuck = 0; };
  M.control.stop = () => { target = null; };
  let script = null;
  M.control.goto = (x, z) => new Promise(res => {
    if (Math.hypot(x - G.pos.x, z - G.pos.z) < 0.1) return res();
    script = { x, z, res, t: 0, stuck: 0 };
  });
  const endScript = () => { const s = script; script = null; s && s.res(); };
  M.input.onTap((cx, cy) => {
    if (!M.control.enabled || (M.story && M.story.locked)) return;
    ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, M.camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    let x = hit.x, z = hit.z;
    if (!M.walkable(x, z)) {
      const sx = G.pos.x, sz = G.pos.z; let ok = false;
      for (let i = 1; i <= 40; i++) { const t = 1 - i / 40; const px = sx + (x - sx) * t, pz = sz + (z - sz) * t;
        if (M.walkable(px, pz)) { x = px; z = pz; ok = true; break; } }
      if (!ok) return;
    }
    M.control.walkTo(x, z);
    M.fx && M.fx.tapRing && M.fx.tapRing(x, z);
  });
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });

  const tryMove = (nx, nz) => {
    const p = { x: nx, z: nz }; M.collide(p, 0.22);
    if (M.walkable(p.x, p.z)) { G.pos.x = p.x; G.pos.z = p.z; return true; }
    return false;
  };
  M.onFrame(dt => {
    let want = 0, dirX = 0, dirZ = 0;
    const locked = !M.control.enabled || (M.story && M.story.locked);
    const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const kz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (script) {
      script.t += dt;
      const dx = script.x - G.pos.x, dz = script.z - G.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.1 || script.t > 4 || script.stuck > 0.45) endScript();
      else { dirX = dx / d; dirZ = dz / d; want = Math.min(1.3, d * 2.2 + 0.35); }
    } else if (!locked && (kx || kz)) {
      target = null; const y = cam.yaw;
      dirX = kx * Math.cos(y) + kz * Math.sin(y); dirZ = -kx * Math.sin(y) + kz * Math.cos(y);
      const l = Math.hypot(dirX, dirZ); dirX /= l; dirZ /= l; want = 1.7;
    } else if (target && !locked) {
      const dx = target.x - G.pos.x, dz = target.z - G.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12) target = null; else { dirX = dx / d; dirZ = dz / d; want = Math.min(1.7, d * 2.5 + 0.4); }
    } else if (locked) target = null;
    if (want > 0) {
      want *= 1 - 0.35 * M.smooth(0.6, 1, G.cold);
      if (G.hold && !locked) G.setHold(null);
      const tgt = Math.atan2(dirX, dirZ); let da = tgt - G.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
      G.heading += da * Math.min(1, dt * 9);
      const facing = Math.cos(da) > 0.3 ? 1 : 0.25;
      G.speed = M.damp(G.speed, want * facing, 6, dt);
      const sx = G.pos.x, sz = G.pos.z, step = G.speed * dt, mx = Math.sin(G.heading) * step, mz = Math.cos(G.heading) * step;
      if (!tryMove(sx + mx, sz + mz) && !tryMove(sx + mx, sz) && !tryMove(sx, sz + mz)) stuck += dt;
      if (Math.hypot(G.pos.x - sx, G.pos.z - sz) < step * 0.2) stuck += dt; else stuck = 0;
      if (script) script.stuck = stuck;
      if (stuck > 0.5) { target = null; stuck = 0; }
    } else G.speed = M.damp(G.speed, 0, 10, dt);
    G.update(dt);
  }, 30);

  // ---- 跟随相机 ----
  const cam = M.cam = { yaw: 0, pitch: 0.62, dist: 9, tYaw: 0, tPitch: 0.62, tDist: 9, target: new T.Vector3(1, 0.9, 14), override: null, user: true };
  M.input.onDrag((dx, dy) => { if (!cam.user) return; cam.tYaw -= dx * 0.005; cam.tPitch = M.clamp(cam.tPitch + dy * 0.004, 0.22, 1.25); });
  M.input.onZoom(d => { if (!cam.user) return; cam.tDist = M.clamp(cam.tDist * (1 + d * 0.12), 4.5, 17); });
  cam.focus = o => { cam.override = { target: o.target.clone(), dist: o.dist ?? cam.tDist, yaw: o.yaw ?? cam.tYaw, pitch: o.pitch ?? cam.tPitch, rate: o.rate ?? 1.6 }; };
  // 用"机位点 → 看向点"描述镜头，换算成环绕参数
  cam.shot = (from, to, rate) => {
    const d = from.clone().sub(to), dist = d.length();
    cam.focus({ target: to, dist, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / dist), rate });
  };
  cam.release = () => { if (cam.override) { cam.tYaw = cam.yaw; cam.tPitch = M.clamp(cam.pitch, 0.22, 1.25); cam.tDist = M.clamp(cam.dist, 4.5, 17); } cam.override = null; };
  cam.snap = () => { cam.yaw = cam.tYaw; cam.pitch = cam.tPitch; cam.dist = cam.tDist; cam.target.set(G.pos.x, 0.9, G.pos.z); };
  const tgt = new T.Vector3();
  M.onFrame(dt => {
    const o = cam.override, rate = o ? o.rate : 4;
    if (o) tgt.copy(o.target); else tgt.set(G.pos.x, 0.9, G.pos.z);
    cam.target.x = M.damp(cam.target.x, tgt.x, rate * 1.4, dt); cam.target.y = M.damp(cam.target.y, tgt.y, rate * 1.4, dt); cam.target.z = M.damp(cam.target.z, tgt.z, rate * 1.4, dt);
    let ty = o ? o.yaw : cam.tYaw; let dy = ty - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cam.yaw += dy * (1 - Math.exp(-rate * 1.5 * dt));
    cam.pitch = M.damp(cam.pitch, o ? o.pitch : cam.tPitch, rate * 1.5, dt);
    cam.dist = M.damp(cam.dist, o ? o.dist : cam.tDist, rate * 1.2, dt);
    const c = Math.cos(cam.pitch), p = M.camera.position;
    // 竖屏时水平视野窄：沿镜头方向拉远，保证主体与目标都在画内
    const asp = M.camera.aspect, K = asp < 1 ? 1 + (1 - asp) * 1.25 : 1, dd = cam.dist * K;
    p.set(cam.target.x + Math.sin(cam.yaw) * c * dd, cam.target.y + Math.sin(cam.pitch) * dd, cam.target.z + Math.cos(cam.yaw) * c * dd);
    if (p.z > -44 && p.x < -3.6) p.x = -3.6;
    if (p.z > -44 && p.x > 16.2) p.x = 16.2;
    if (p.z < -64.4) p.z = -64.4;
    if (p.x < 6 && p.z > 19.2) p.z = 19.2;
    if (p.x < -11.6) p.x = -11.6; if (p.x > 21.6) p.x = 21.6;
    p.y = Math.max(p.y, 0.7);
    M.camera.lookAt(cam.target);
    if (M.post) M.post.uniforms.uFocus.value = p.distanceTo(cam.target);
  }, 70);
})();
