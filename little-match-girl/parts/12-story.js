// ===== 12-story.js：站点状态机、时钟、寒冷值、各站演出 =====
(() => {
  const G = M.girl, PI = Math.PI, V = (x, y, z) => new T.Vector3(x, y, z);
  // ---- 基于游戏时间的等待 / 补间 ----
  const timers = [];
  M.wait = s => new Promise(res => timers.push({ t: M.time + s, res }));
  M.tween = (dur, fn) => new Promise(res => { const t0 = M.time; timers.push({ tick: () => { const k = Math.min(1, (M.time - t0) / dur); fn(k * k * (3 - 2 * k), k); return k >= 1; }, res }); });
  M.onFrame(() => { for (let i = timers.length - 1; i >= 0; i--) { const x = timers[i];
    if (x.tick ? x.tick() : M.time >= x.t) { timers.splice(i, 1); x.res(); } } }, 20);

  const S = M.story = { step: 0, matches: 5, minutes: 0, cold: 0.3, locked: true, dawn: 0, flame: null, started: false };
  const NUM = ['一', '二', '三', '四', '五'];
  const fmt = m => m >= 60 ? '00:00' : '23:' + String(Math.floor(m)).padStart(2, '0');
  const st = M.props.stove, bk = M.bakery, tree = M.props.tree, gran = M.granny.group.position;
  let candles = null;

  const stations = [
    { pos: V(1.0, 0, 9), r: 2.3, mark: V(0.35, 0, 10.45), face: st.focus, title: '第一根火柴',
      lines: ['铁炉里腾起了火苗，烤得手心发烫。', '她眨了眨眼——火还在。'], next: '沿着运河往北走，面包房的橱窗亮着。',
      shot: [V(1.9, 1.3, 7.3), V(-0.15, 0.75, 9.65)],
      async run() {
        M.fx.bloomBurst(st.pos.clone().add(V(0.45, 0, 0)), '#ff9a40', 4);
        const fire = new T.Group(); fire.position.set(st.pos.x + 0.47, 0.5, st.pos.z); M.scene.add(fire);
        M.fx.flame(fire, { size: 2.6, power: 4, dist: 10 });
        M.ambience.fireAt(V(st.pos.x + 0.4, 0.42, st.pos.z)); M.ambience.smokeAt(V(st.pos.x, 3.05, st.pos.z));
        const pool = M.lights.pool(st.pos.x + 0.6, st.pos.z, '#ff8a3a', 4, 1.6); pool.material.opacity = 0;
        M.warm.add({ x: st.pos.x, z: st.pos.z, r: 4.5, power: 1 });
        M.audio.chime(0); M.audio.fire(true);
        await M.tween(1.2, k => { st.doorMat.color.copy(M.col('#2a1008')).lerp(M.col('#ff7a2a').multiplyScalar(4), k); pool.material.opacity = k; });
        M.cam.shot(V(1.4, 1.12, 8.0), V(-0.2, 0.72, 9.7), 0.35);
        G.setHold('warm'); await M.wait(1.6);
      } },
    { pos: V(-1.5, 0, -12.4), r: 2.4, mark: V(-2.0, 0, -14.0), face: bk.window, title: '第二根火柴',
      lines: ['橱窗里摆好了烤鹅和热面包。', '一只白鹅推开门，摇摇摆摆地走向她。'], next: '白鹅想跟着你。去广场的大冷杉那儿看看。',
      shot: [V(-0.2, 1.45, -10.2), V(-2.6, 0.95, -13.1)],
      async run() {
        M.audio.chime(1);
        M.fx.bloomBurst(bk.window, '#ffc070', 3);
        await M.tween(0.8, k => { bk.roomMat.emissiveIntensity = 0.35 + k * 0.5; });
        const items = bk.items.children;
        await M.tween(1.4, (k, raw) => items.forEach((m, i) => { const t = M.clamp(raw * items.length * 0.6 - i * 0.5, 0, 1);
          const b = 1 + Math.sin(t * PI) * 0.25; m.scale.copy(m.userData.s).multiplyScalar(Math.max(0.0001, t * b)); }));
        M.warm.add({ x: -2.4, z: -12.4, r: 3, power: 0.6 });
        await M.wait(0.4);
        await M.tween(0.9, k => { bk.hinge.rotation.y = -1.35 * k; });
        M.goose.appear(bk.doorOut); G.look(bk.doorOut.clone().setY(0.3));
        M.cam.shot(V(0.7, 1.6, -9.1), V(-2.5, 0.6, -12.3), 0.5);
        await M.wait(2.4); G.look(null);
      } },
    { pos: V(4, 0, -49.4), r: 3.2, mark: V(5.3, 0, -48.6), face: V(4, 2, -54), title: '第三根火柴',
      lines: ['一百支蜡烛同时亮起，又升上夜空，变成了星星。', '有一颗星，落向了教堂的台阶。'], next: '流星落在教堂台阶前了。',
      shot: [V(4.6, 2.1, -39.5), V(4.4, 4.3, -53)],
      async run() {
        candles = candles || M.fx.candles(tree.candles);
        M.audio.chime(2); candles.lightUp(2.6);
        await M.wait(2.7);
        tree.starMat.emissiveIntensity = 5; M.fx.bloomBurst(tree.top, '#ffdd88', 4);
        const tl = M.lights.point('#ffb060', 0, 16); if (tl) tl.position.set(4, 5, -49.5);
        M.warm.add({ x: 4, z: -54, r: 6.5, power: 0.9 });
        await M.tween(1, k => { if (tl) tl.intensity = k * 2.6; });
        await M.wait(0.8);
        const rise = M.fx.riseToStars(tree.candles, tree.pos, 4.5); M.audio.chime(3);
        M.cam.focus({ target: V(4, 14, -56), dist: 20, yaw: 0.1, pitch: -0.15, rate: 0.9 });
        await M.tween(1.2, k => { candles.uniforms.uHide.value = k; });
        await M.wait(3.6);
        let landed = false; const to = V(gran.x, 0.3, gran.z);
        M.cam.shot(V(10.2, 2.4, -44.6), V(4.6, 1.3, -58.5), 1.0);
        M.fx.shootingStar(rise.endOf(0), to, 2.4, () => { landed = true; });
        while (!landed) await M.wait(0.1);
        await M.tween(1.5, k => { candles.uniforms.uHide.value = 1 - k * 0.7; });
      } },
    { pos: V(4, 0, -60.4), r: 2.0, mark: V(3.6, 0, -60.2), face: V(4, 1.2, -62.3), title: '第四根火柴',
      lines: ['光里走出来一个人。', '“我的小姑娘，奶奶来接你了。”'], next: '只剩最后一根火柴了。',
      shot: [V(5.0, 1.35, -57.5), V(3.9, 1.2, -62.0)],
      async run() {
        M.audio.chime(4); M.granny.show(2.6); M.audio.pad([53, 57, 60, 64], 8, 0.06, 0.6);
        M.cam.shot(V(4.8, 1.33, -58.1), V(3.9, 1.22, -62.0), 0.3);
        await M.wait(2.8); M.fx._column && M.fx._column.fade(3);
        G.look(V(gran.x, 1.45, gran.z)); M.granny.pose('reach');
        M.warm.add({ x: gran.x, z: gran.z, r: 4, power: 1 });
        M.cam.shot(V(7.4, 1.3, -60.2), V(3.85, 1.05, -61.3), 0.55);
        await M.wait(1.8);
      } },
    { pos: V(4, 0, -60.4), r: 2.0, mark: V(3.6, 0, -60.2), face: V(4, 1.2, -62.3), title: '最后一根火柴',
      lines: ['这一次，她没有被带走。', '奶奶牵着她，在新年的钟声里回了家。'], next: '',
      shot: [V(7.4, 1.3, -60.2), V(3.85, 1.05, -61.3)],
      async run() {
        const from = G.pos.clone(), to = V(gran.x, 0, gran.z + 0.55);
        M.cam.shot(V(6.8, 1.3, -60.7), V(3.95, 1.05, -61.6), 0.6);
        await M.tween(1.0, k => { G.pos.lerpVectors(from, to, k); G.speed = k < 1 ? 0.8 : 0; });
        G.speed = 0; G.heading = PI; G.setHold('hug'); M.granny.pose('hug'); M.goose.sit();
        S.flame && S.flame.kill(1.5); S.flame = null;
        M.fx.bloomBurst(V(gran.x, 1.1, gran.z), '#ffe0b0', 9); M.audio.pad([48, 55, 59, 62, 64], 9, 0.065);
        M.cam.shot(V(5.0, 1.5, -63.6), V(3.95, 1.0, -61.6), 1.2);
        await M.wait(1.4);
        M.cam.shot(V(4.7, 1.42, -63.2), V(3.95, 1.0, -61.6), 0.15);
      } },
  ];
  S.stations = stations;

  const setClock = (target, dur = 1.2) => { const a = S.minutes; return M.tween(dur, k => { S.minutes = a + (target - a) * k; M.ui.setClock(fmt(S.minutes)); }); };

  S.strike = async () => {
    const s = stations[S.step]; if (!s || S.locked || S.matches <= 0) return;
    S.locked = true; M.ui.action(null); M.control.stop(); M.ui.cinema(true); M.audio.duck(0.45);
    if (S.step === 4) M.ui.hint('');
    M.cam.shot(s.shot[0], s.shot[1], 1.1);
    if (s.mark && S.step !== 4) await M.control.goto(s.mark.x, s.mark.z);
    const h0 = G.heading, h1 = Math.atan2(s.face.x - G.pos.x, s.face.z - G.pos.z);
    let dh = Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0));
    await M.tween(0.45, k => { G.heading = h0 + dh * k; });
    if (S.flame) { S.flame.kill(0.4); S.flame = null; }
    G.setHold(null);
    await new Promise(res => G.play('strike', res, () => {
      S.flame = M.fx.flame(G.hand); const p = new T.Vector3(); G.hand.getWorldPosition(p); M.fx.strike(p);
      M.fx.warmPulse(1); M.audio.flame(true);
    }));
    S.matches--; M.ui.setMatches(S.matches);
    setClock(S.step === 4 ? 60 : S.minutes + 12);
    await s.run();
    M.ui.caption(s.title, s.lines, S.step === 4 ? 7.5 : 30);
    if (S.step === 4) { await M.wait(3.2); return S.ending(); }
    await M.wait(3.6);
    if (S.step !== 3) { S.flame && S.flame.kill(1.2); S.flame = null; M.audio.flame(false); }
    if (S.step !== 0) G.setHold(null);
    M.ui.cinema(false); M.ui.hideCaption(); M.audio.duck(1, 1.2);
    M.cam.release();
    S.step++; S.locked = false;
    M.ui.hint(s.next);
  };


  // ---- 每帧：寒冷、提示按钮、白气 ----
  let breathT = 0;
  M.onFrame(dt => {
    if (!S.started) return;
    const near0 = M.warm.at(G.pos.x, G.pos.z), warm = near0 + (S.flame ? 0.35 : 0);
    G.warmNear = near0;
    S.cold = M.clamp(S.cold + (0.006 - warm * 0.09) * dt, 0.05, 1);
    if (S.dawn > 0) S.cold = M.damp(S.cold, 0.05, 1, dt);
    G.cold = S.cold;
    M.post.uniforms.uCold.value = S.cold * (1 - S.dawn);
    M.post.uniforms.uWarm.value = (M.fx.warmLevel || 0) * 0.6 + warm * 0.15;
    if (!S.locked) {
      const s = stations[S.step];
      const near = s && Math.hypot(G.pos.x - s.pos.x, G.pos.z - s.pos.z) < s.r;
      M.ui.action(near ? `划亮第${NUM[S.step]}根火柴` : null);
      if (S.cold > 0.85 && !near) M.ui.hint('好冷……到有光的地方去。', true);
    }
    breathT -= dt;
    if (S.cold > 0.4 && breathT < 0 && S.dawn < 0.5) { breathT = 2.6 - 1.4 * S.cold;
      M.fx.breath(V(G.pos.x + Math.sin(G.heading) * 0.22, 1.08, G.pos.z + Math.cos(G.heading) * 0.22)); }
  }, 45);

  S.start = () => {
    S.started = true; S.locked = false; M.control.enabled = true;
    M.ui.hint('街角的炉亭里有只旧铁炉。去那儿，划一根火柴吧。');
  };
  M.debug = { jump(n) { const s = stations[n]; S.step = n; S.matches = 5 - n; M.ui.setMatches(S.matches);
    G.pos.set(s.pos.x + 0.3, 0, s.pos.z + 1.2); M.cam.snap(); } };
})();
