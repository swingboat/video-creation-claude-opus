// ===== 14-ui-main.js：环境光、界面、开场、自适应质量、主循环 =====
(() => {
  const G = M.girl, $ = id => document.getElementById(id);
  // ---- 月光 + 天光 ----
  const moon = new T.DirectionalLight(M.col('#a9b9e6'), 0.75);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 });
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
  M.scene.add(moon, moon.target);
  const hemi = new T.HemisphereLight(M.col('#6a7aac'), M.col('#3a3540'), 0.9); M.scene.add(hemi);
  M.env = { moon, hemi };
  // 阴影相机按阴影贴图像素对齐，避免跟随移动时阴影边缘"爬动"闪烁
  const lightRot = new T.Matrix4().lookAt(new T.Vector3(-14, 30, 12), new T.Vector3(0, 0, 0), new T.Vector3(0, 1, 0));
  const lightInv = lightRot.clone().invert(), texel = 36 / 2048, sp = new T.Vector3();
  M.onFrame(() => {
    sp.copy(M.cam.target).setY(0).applyMatrix4(lightInv);
    sp.x = Math.round(sp.x / texel) * texel; sp.y = Math.round(sp.y / texel) * texel;
    sp.applyMatrix4(lightRot);
    moon.position.set(sp.x - 14, sp.y + 30, sp.z + 12); moon.target.position.copy(sp); moon.target.updateMatrixWorld();
  }, 75);

  // ---- 界面 ----
  let hintTimer = 0, capTimer = null;
  M.ui = {
    hint(text, soft) {
      const h = $('hint'); if (h.textContent === text) return;
      if (soft && performance.now() < hintTimer) return;
      h.classList.add('hide'); setTimeout(() => { h.textContent = text; h.classList.remove('hide'); }, 350);
      hintTimer = performance.now() + 6000;
    },
    caption(title, lines, dur = 6.5) {
      const c = $('caption'), esc = s => s.replace(/</g, '&lt;');
      c.querySelector('.t').innerHTML = `<span class="ln">${esc(title)}</span>`;
      c.querySelector('.l').innerHTML = lines.map((l, i) => `<span class="ln" style="animation-delay:${0.35 + i * 0.75}s">${esc(l)}</span>`).join('');
      c.classList.remove('hide'); clearTimeout(capTimer); capTimer = setTimeout(() => c.classList.add('hide'), dur * 1000);
    },
    hideCaption() { clearTimeout(capTimer); $('caption').classList.add('hide'); },
    cinema(on) { document.body.classList.toggle('cine', !!on); },
    action(label) {
      const b = $('action');
      if (!label) { b.classList.add('hide'); return; }
      if (b.textContent !== label) b.textContent = label;
      b.classList.remove('hide');
    },
    setMatches(n) { [...$('matches').children].forEach((el, i) => el.classList.toggle('used', i >= n)); },
    setClock(s) { $('clock').textContent = s; },
    ending() { $('hud').classList.add('hide'); M.ui.cinema(false); $('ending').classList.remove('hide'); },
  };
  $('action').addEventListener('click', () => M.story.strike());
  $('again').addEventListener('click', () => location.reload());
  const toggleMute = () => { const m = !M.audio.isMuted(); M.audio.setMuted(m); $('mute').classList.toggle('off', m); };
  $('mute').addEventListener('click', toggleMute);
  addEventListener('keydown', e => {
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'Space' && !$('action').classList.contains('hide')) { e.preventDefault(); M.story.strike(); }
  });

  // ---- 开场 ----
  const q = new URLSearchParams(location.search);
  M.cam.override = { target: new T.Vector3(3, 2, -8), dist: 34, yaw: 0, pitch: 0.55, rate: 1 };
  M.cam.yaw = 0.3; M.cam.pitch = 0.55; M.cam.dist = 34; M.cam.target.set(3, 2, -8);
  let introSpin = true;
  M.onFrame(dt => { if (introSpin && M.cam.override) M.cam.override.yaw += dt * 0.04; }, 65);
  const start = async () => {
    M.audio.init();
    $('intro').classList.add('hide'); $('hud').classList.remove('hide');
    introSpin = false;
    M.cam.focus({ target: new T.Vector3(G.pos.x, 0.9, G.pos.z), dist: 9, yaw: 0, pitch: 0.5, rate: 0.9 });
    await M.wait(2.6);
    M.cam.release(); M.cam.tYaw = 0; M.cam.tPitch = 0.5; M.cam.tDist = 9;
    M.story.start();
    if (q.has('debug')) { window.M = M; const n = +q.get('debug'); if (n > 0) M.debug.jump(n); }
  };
  $('start').addEventListener('click', start);
  if (q.has('auto')) setTimeout(start, 300);

  // ---- 尺寸与质量 ----
  const resize = () => {
    M.camera.aspect = innerWidth / innerHeight;
    M.camera.fov = M.camera.aspect < 1 ? 50 + Math.min(1, (1 - M.camera.aspect) / 0.55) * 14 : 50;
    M.camera.updateProjectionMatrix();
    M.renderer.setSize(innerWidth, innerHeight); M.post.resize();
  };
  addEventListener('resize', resize); resize();
  let fpsAcc = 0, fpsN = 0, good = 0;
  const quality = dt => {
    fpsAcc += dt; fpsN++;
    if (fpsAcc < 1) return;
    const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (fps < 40 && M.pixelScale > 0.6) { M.pixelScale = Math.max(0.6, M.pixelScale - 0.15); good = 0; }
    else if (fps > 57 && M.pixelScale < 1) { if (++good >= 3) { M.pixelScale = Math.min(1, M.pixelScale + 0.1); good = 0; } else return; }
    else return;
    M.quality = M.pixelScale >= 0.9 ? 1 : M.pixelScale >= 0.7 ? 0.5 : 0.3;
    M.setPixelRatio(); M.post.resize();
  };

  // ---- 主循环 ----
  let last = performance.now(), first = true;
  const loop = t => {
    const dt = Math.min(0.05, (t - last) / 1000) * (M.timeScale ?? 1); last = t;
    M.dt = dt; M.time += dt;
    for (const f of M._frames) f.fn(dt);
    M.post.render();
    if (first) { first = false; const b = $('start'); b.disabled = false; b.textContent = '点亮第一根火柴'; }
    quality(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
