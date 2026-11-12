// ===== 14-ui-main.js =====
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // ---- 卡片缩略图：独立的小 renderer 实时渲染真实 3D 模型 ----
  const thumbR = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  thumbR.setSize(128, 128, false); thumbR.setPixelRatio(1); thumbR.setClearColor(0x000000, 0);
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 50); cam.up.set(0, 0, 1);
  const thumbs = {};
  const fakeC = { x: 0, y: 0, size: 1 };
  function mkThumb(type) {
    const scene = new THREE.Scene(); let obj, anim, jelly = null, scale = 1, dist = 3.2;
    if (type === 'manta' || type === 'eagle' || type === 'stingray') {
      const g = O.rayGeometry(type); anim = new THREE.InstancedBufferAttribute(new Float32Array(3), 3); g.setAttribute('aAnim', anim);
      obj = new THREE.InstancedMesh(g, O.rayMaterialFor(type), 1); scale = { manta: 1.5, eagle: 1.05, stingray: 1.45 }[type];
      if (type === 'eagle') obj.position.x = .55;
    } else if (type === 'shark') {
      const g = O.sharkGeometry().clone(); anim = new THREE.InstancedBufferAttribute(new Float32Array(2), 2); g.setAttribute('aAnim', anim);
      obj = new THREE.InstancedMesh(g, O.sharkMaterial(), 1); scale = 1.9; obj.position.x = .15;
    } else {
      jelly = O.jellyVisual(type); jelly.mats.forEach(m => m.uniforms.uGammaOut.value = 1);
      obj = jelly.group; scene.add(jelly.rmesh); scale = type === 'moon' ? 1.6 : 1.05; dist = type === 'moon' ? 3.0 : 3.6;
    }
    const holder = new THREE.Group(); holder.add(obj); scene.add(holder);
    if (obj.isInstancedMesh) { obj.setMatrixAt(0, new THREE.Matrix4()); obj.frustumCulled = false; }
    obj.scale.setScalar(scale);
    return { scene, obj, anim, jelly, holder, dist, type, ph: Math.random() * 6, cv: null };
  }
  $$('.card').forEach(card => {
    const t = card.dataset.t; thumbs[t] = mkThumb(t); thumbs[t].cv = card.querySelector('canvas').getContext('2d');
  });
  const order = Object.keys(thumbs); let rr = 0, frameN = 0;
  function renderThumb(T, dt) {
    T.ph += dt * (T.type === 'shark' ? 6 : 2.4);
    T.holder.rotation.z = O.time * .35 + T.ph * 0;
    if (T.anim && T.anim.itemSize === 3) { T.anim.setXYZ(0, T.ph, T.type === 'stingray' ? .5 : .35, T.type === 'stingray' ? 1 : 0); T.anim.needsUpdate = true; }
    else if (T.anim) { T.anim.setXY(0, T.ph, 1.2); T.anim.needsUpdate = true; }
    if (T.jelly) {
      const p = (O.time / 1.8) % 1, con = p < .3 ? Math.sin(p / .3 * Math.PI / 2) : 1 - (p - .3) / .7;
      const r = 1 - .2 * con; T.jelly.bell.scale.set(r, r, 1 + .15 * con);
      T.obj.position.z = .55 + .04 * con; T.obj.rotation.set(.25, 0, 0);
      T.jelly.mats.forEach(m => { m.uniforms.uGlow.value = O.params.bio * .4; m.uniforms.uFade.value = 1; });
      fakeC.size = T.obj.scale.x; O.jellySim(T.jelly, fakeC, Math.min(dt * 2, .05), true);
    }
    const isJ = !!T.jelly;
    cam.position.set(0, -T.dist * .78, T.dist * (isJ ? .25 : .62)); cam.lookAt(0, 0, isJ ? -.1 : 0);
    thumbR.clear(); thumbR.render(T.scene, cam);
    T.cv.clearRect(0, 0, 128, 128); T.cv.drawImage(thumbR.domElement, 0, 0);
  }
  O.onFrame(dt => {
    frameN++;
    const n = O.quality < .7 ? (frameN % 2 ? 0 : 1) : 2;
    for (let i = 0; i < n; i++) { renderThumb(thumbs[order[rr % order.length]], dt * order.length / Math.max(1, n)); rr++; }
  }, 99);

  // ---- 卡片：点击抛入 / 拖动放置 ----
  $$('.card').forEach(card => {
    const type = card.dataset.t; let st = null;
    card.addEventListener('pointerdown', e => {
      e.preventDefault(); O.emit('userGesture'); try { card.setPointerCapture(e.pointerId); } catch (_) {}
      st = { x: e.clientX, y: e.clientY, drag: null };
    });
    card.addEventListener('pointermove', e => {
      if (!st) return;
      const [wx, wy] = O.toWorld(e.clientX, e.clientY);
      if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) {
        st.drag = O.holdCreature(type, wx, wy) || 'full';
        O.heldTarget = { x: wx, y: wy };
      }
      if (st.drag && O.heldTarget) { O.heldTarget.x = wx; O.heldTarget.y = wy; }
    });
    const end = e => {
      if (!st) return;
      if (st.drag) { if (st.drag !== 'full') O.releaseCreature(st.drag); O.heldTarget = null; }
      else if (e.type === 'pointerup') { const r = card.getBoundingClientRect(); O.throwCreature(type, r.left + r.width / 2, r.top + r.height * .35); }
      st = null;
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  });

  // ---- 控制栏 ----
  const hide = v => { document.body.classList.toggle('hide-ui', v ?? !document.body.classList.contains('hide-ui')); };
  $('#b-rain').onclick = () => { O.toggleRain(); O.audio.chime('ui'); };
  $('#b-vortex').onclick = () => { O.toggleVortex(); O.audio.chime('ui'); };
  $('#b-calm').onclick = () => { O.toggleCalm(); O.audio.chime('ui'); };
  $('#b-clear').onclick = () => { O.clearAll(); O.audio.chime('clear'); };
  $('#b-sound').onclick = () => { O.audio.toggle(); O.audio.chime('ui'); };
  $('#b-hide').onclick = () => hide(true);
  $('#showui').onclick = () => hide(false);
  $$('.scn').forEach(b => b.onclick = () => { O.setScene(+b.dataset.i); });
  O.on('scene', i => { $$('.scn').forEach(b => b.classList.toggle('on', +b.dataset.i === i)); O.audio.chime('scene'); O.toast(O.SCENES[i].name, 1200); });
  O.on('toggles', () => {
    $('#b-rain').classList.toggle('on', O.rain.on); $('#b-vortex').classList.toggle('on', O.vortex.on); $('#b-calm').classList.toggle('on', O.calm);
    $('#b-sound').classList.toggle('on', !O.audio.muted); $('#b-sound .ic').textContent = O.audio.muted ? '🔇' : '🔊';
    $('#vortex').classList.toggle('on', O.vortex.on);
  });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(); O.emit('userGesture');
    if (k === 'r') O.toggleRain(); else if (k === 'w') O.toggleVortex(); else if (k === 'c') O.toggleCalm();
    else if (k === 'm') O.audio.toggle(); else if (k === 'h') hide();
    else if (k >= '1' && k <= '4') O.setScene(+k - 1);
  });

  // ---- 漩涡手柄 ----
  const vh = $('#vortex'); let vDrag = false;
  vh.addEventListener('pointerdown', e => { vDrag = true; try { vh.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
  vh.addEventListener('pointermove', e => { if (!vDrag) return; const [x, y] = O.toWorld(e.clientX, e.clientY); O.vortex.x = x; O.vortex.y = y; });
  vh.addEventListener('pointerup', () => vDrag = false); vh.addEventListener('pointercancel', () => vDrag = false);
  O.onFrame(() => { if (!O.vortex.on) return; const [sx, sy] = O.toScreen(O.vortex.x, O.vortex.y); vh.style.left = sx + 'px'; vh.style.top = sy + 'px'; }, 98);

  // ---- 启动 ----
  try {
    O.resize();
    $$('.scn img').forEach(img => img.src = O.seabed.thumb(+img.parentNode.dataset.i));
    const put = (type, min, n, opts = {}) => { for (let i = 0; i < n; i++) { const [x, y] = O.randomWater(min); O.spawn(type, x, y, opts); } };
    put('manta', 1.4, 2); put('eagle', 1.2, 1); put('stingray', .8, 1);
    put('moon', 1.0, 3); put('nettle', 1.0, 2);
    const [sx, sy] = O.randomWater(.8);
    const s1 = O.spawn('shark', sx, sy); const s2 = O.spawn('shark', sx + .8, sy - .6);
    if (s1 && s2) { s2.heading = s1.heading; s2.leader = s1; }
    O.emit('toggles');
  } catch (err) { console.error(err); const el = $('#err'); el.textContent = '初始化失败：' + err.message; el.style.display = 'flex'; throw err; }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
    O.dt = dt; O.time += dt;
    O._runFrame(dt, O.time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
