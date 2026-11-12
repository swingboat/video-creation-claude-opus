// ===== 03-scenes.js =====
O.SCENES = [
  { name: '热带浅滩',   shallow: '#5fe0d0', deep: '#06358c', absorb: .7, caustic: 1.0, causticTint: '#ffffff',
    sunDir: [.25, -.35, 1], sunCol: '#fff8e8', ambient: 1.0, sky: '#bfe8ff', swellAmp: 1.0, swellPeriod: 7,
    glint: 1.0, glintCol: '#fffbe8', bio: 0, reefLagoon: 0, sand: '#ecd9aa' },
  { name: '珊瑚潟湖', shallow: '#7af0e0', deep: '#1a7aa8', absorb: .35, caustic: .85, causticTint: '#f0fff8',
    sunDir: [.2, -.3, 1], sunCol: '#fffaf0', ambient: 1.05, sky: '#d0f0ff', swellAmp: .3, swellPeriod: 9,
    glint: .8, glintCol: '#ffffff', bio: 0, reefLagoon: 1, sand: '#f3e6c4' },
  { name: '黄昏海湾', shallow: '#e0b080', deep: '#2a3050', absorb: .6, caustic: .35, causticTint: '#ffc080',
    sunDir: [-.9, -.55, .35], sunCol: '#ffa050', ambient: .6, sky: '#ffb070', swellAmp: .8, swellPeriod: 8,
    glint: 1.6, glintCol: '#ffb860', bio: 0, reefLagoon: 0, sand: '#d9a878' },
  { name: '月夜荧光', shallow: '#1a4060', deep: '#050a28', absorb: .9, caustic: .12, causticTint: '#a0c0ff',
    sunDir: [.4, .5, 1], sunCol: '#9ab0e0', ambient: .18, sky: '#10183a', swellAmp: .6, swellPeriod: 9,
    glint: .5, glintCol: '#c8d8ff', bio: 1, reefLagoon: 0, sand: '#5a6078' }
];

(function () {
  const COLOR_KEYS = ['shallow', 'deep', 'causticTint', 'sunCol', 'sky', 'glintCol', 'sand'];
  const NUM_KEYS = ['absorb', 'caustic', 'ambient', 'swellAmp', 'swellPeriod', 'glint', 'bio', 'reefLagoon'];
  const toLin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const prep = s => {
    const o = {};
    COLOR_KEYS.forEach(k => o[k] = toLin(s[k]));
    NUM_KEYS.forEach(k => o[k] = s[k]);
    o.sunDir = new THREE.Vector3(...s.sunDir).normalize();
    return o;
  };
  const prepared = O.SCENES.map(prep);
  const clone = p => {
    const o = {};
    COLOR_KEYS.forEach(k => o[k] = p[k].clone());
    NUM_KEYS.forEach(k => o[k] = p[k]);
    o.sunDir = p.sunDir.clone();
    return o;
  };

  O.params = clone(prepared[0]);
  O.sceneIndex = 0;
  O.sceneFrom = 0;
  O.sceneMix = 1;            // 0 → 1：从 sceneFrom 过渡到 sceneIndex
  O.calmFactor = 1;          // 平静模式下长浪衰减
  let from = clone(prepared[0]), to = prepared[0], t = 1;
  const DUR = 2.5;

  O.setScene = i => {
    if (i < 0 || i >= prepared.length) return;
    if (i === O.sceneIndex && t >= 1) return;
    from = clone(O.params);
    O.sceneFrom = O.sceneIndex;
    O.sceneIndex = i;
    to = prepared[i];
    t = 0; O.sceneMix = 0;
    O.emit('scene', i);
  };

  const ss = x => x * x * (3 - 2 * x);
  const apply = k => {
    const P = O.params;
    COLOR_KEYS.forEach(c => P[c].copy(from[c]).lerp(to[c], k));
    NUM_KEYS.forEach(n => P[n] = from[n] + (to[n] - from[n]) * k);
    P.sunDir.copy(from.sunDir).lerp(to.sunDir, k).normalize();
  };

  // 长浪相位按积分推进，周期变化时不会跳变
  O.swellPhase = 0;
  O.onFrame(dt => {
    if (t < 1) { t = Math.min(1, t + dt / DUR); O.sceneMix = ss(t); apply(O.sceneMix); }
    const P = O.params;
    O.U.uSunDir.value.copy(P.sunDir);
    O.U.uLagoon.value = P.reefLagoon;
    O.swellPhase += dt * 2 * Math.PI / P.swellPeriod;
    O.U.uTime.value = O.time;
  }, 5);

  // 冲刷带：0..1，与合成 shader 中的 swash 使用同一相位
  O.swash = () => { const s = Math.max(0, Math.sin(O.swellPhase)); return s * s * Math.min(1, O.params.swellAmp * O.calmFactor + .15); };

  // 场景参数对应的 shader uniform（合成和生物材质共用）
  O.SU = {
    uShallow: { value: O.params.shallow }, uDeep: { value: O.params.deep }, uAbsorb: { value: 0 },
    uCaustic: { value: 0 }, uCausticTint: { value: O.params.causticTint }, uSunCol: { value: O.params.sunCol },
    uAmbient: { value: 1 }, uSky: { value: O.params.sky }, uSwellAmp: { value: 1 }, uSwellPhase: { value: 0 },
    uGlint: { value: 1 }, uGlintCol: { value: O.params.glintCol }, uBioOn: { value: 0 }, uSand: { value: O.params.sand },
    uSeabedMix: { value: 1 }
  };
  O.onFrame(() => {
    const P = O.params, U = O.SU;
    U.uAbsorb.value = P.absorb; U.uCaustic.value = P.caustic; U.uAmbient.value = P.ambient;
    U.uSwellAmp.value = P.swellAmp * O.calmFactor; U.uSwellPhase.value = O.swellPhase;
    U.uGlint.value = P.glint; U.uBioOn.value = P.bio; U.uSeabedMix.value = O.sceneMix;
  }, 6);
})();
