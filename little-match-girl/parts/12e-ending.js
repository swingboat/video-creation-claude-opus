// ===== 12e-ending.js：结局演出（拥抱 → 钟声烟花 → 天亮的台阶 → 结局卡）=====
(() => {
  const S = M.story, G = M.girl, PI = Math.PI, V = (x, y, z) => new T.Vector3(x, y, z);
  const gran = M.granny.group.position;
  S.ending = async () => {
    M.audio.music(null); M.audio.duck(0.2, 1.5); M.audio.bells(12);
    const fog0 = M.scene.fog.color.clone(), fog1 = M.col('#c9d4e6'), litK = M.town.litMat.color.clone();
    const lampK = M.props.lampMat.color.clone(), ringC = M.sky.ring.material.color.clone();
    // 1. 拥抱特写再停一会儿
    await M.wait(2.2);
    M.ui.hideCaption();
    // 2. 后退上升：人物在画面下方，教堂与烟花在上方
    M.cam.shot(V(12.0, 1.8, -34.5), V(5.3, 7.6, -58), 0.28);
    await M.wait(3.2);
    const cols = ['#ffcc66', '#ff5a4a', '#5ae0c8', '#ffffff', '#ffb040', '#8ab4ff', '#ff7ab0', '#ffe08a', '#ff6a3a'];
    for (let i = 0; i < 9; i++) {
      M.fx.firework(V(-1 + Math.random() * 12, 10.5 + Math.random() * 4, -54 + Math.random() * 8), cols[i]);
      await M.wait(0.75 + Math.random() * 0.55);
    }
    await M.wait(1.6);
    // 3. 天亮：两人松开，并肩站在台阶前；镜头回落到 3/4 中景
    G.setHold(null); M.granny.pose('reach');
    M.cam.shot(V(6.2, 1.7, -57.4), V(4.4, 0.95, -61.6), 0.22);
    (async () => {
      await M.control.goto(gran.x + 0.75, gran.z + 0.55);
      const h0 = G.heading;
      await M.tween(1.2, k => { G.heading = h0 + Math.atan2(Math.sin(0.25 - h0), Math.cos(0.25 - h0)) * k; });
      G.look(V(gran.x, 1.45, gran.z));
      await M.wait(1.6); G.look(null);
    })();
    M.audio.dawn();
    await M.tween(10, k => {
      S.dawn = k;
      M.sky.uniforms.uDawn.value = k; M.canal.uniforms.uDawn.value = k; M.post.uniforms.uDawn.value = k;
      M.scene.fog.color.copy(fog0).lerp(fog1, k); M.scene.fog.density = M.lerp(0.022, 0.011, k);
      M.town.litMat.color.copy(litK).multiplyScalar(1 - k * 0.8); M.props.lampMat.color.copy(lampK).multiplyScalar(1 - k * 0.85);
      M.town.facadeWarm.value = 1 - k * 0.8;
      M.sky.ring.material.color.copy(ringC).lerp(M.col('#e6d9d6'), k); M.sky.ring.material.opacity = 1 - k * 0.55;
      M.lights.pools.forEach(p => { p.material.opacity = 1 - k; });
      if (M.env) { M.env.moon.intensity = M.lerp(0.75, 2.2, k); M.env.moon.color.copy(M.col('#a9b9e6')).lerp(M.col('#ffd8b0'), k);
        M.env.hemi.intensity = M.lerp(0.9, 1.4, k); }
    });
    // 4. 结局卡：镜头再缓缓拉远一点，人物留在下半屏
    M.cam.shot(V(7.0, 2.2, -55.6), V(4.4, 1.7, -61.6), 0.12);
    M.audio.duck(1, 1); M.audio.music('major');
    M.ui.ending();
  };
})();
