// ===== 13-audio.js =====
O.audio = (function () {
  let ctx = null, master, comp, waveGain, waveLP, hissGain, rainGain, vortexGain, vortexBP, noiseBuf, pinkBuf, delay;
  let muted = true;
  const api = { get muted() { return muted; } };

  function makeNoise(pink) {
    const len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (!pink) { d[i] = w; continue; }
      b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
      b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * .5362) * .11;
    }
    return b;
  }
  const loop = (buf, dest) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(0, Math.random() * 2); return s; };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
    delay = ctx.createDelay(); delay.delayTime.value = .18; const fb = ctx.createGain(); fb.gain.value = .25; const wet = ctx.createGain(); wet.gain.value = .3;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    noiseBuf = makeNoise(false); pinkBuf = makeNoise(true);
    // 海浪：粉噪声 → 低通 → 增益（随冲刷包络）
    waveLP = ctx.createBiquadFilter(); waveLP.type = 'lowpass'; waveLP.frequency.value = 600; waveLP.Q.value = .4;
    waveGain = ctx.createGain(); waveGain.gain.value = 0; waveLP.connect(waveGain); waveGain.connect(master);
    loop(pinkBuf, waveLP);
    // 回流嘶嘶声
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3000; hp.Q.value = .7;
    hissGain = ctx.createGain(); hissGain.gain.value = 0; hp.connect(hissGain); hissGain.connect(master); loop(noiseBuf, hp);
    // 雨
    const rh = ctx.createBiquadFilter(); rh.type = 'highpass'; rh.frequency.value = 2500;
    rainGain = ctx.createGain(); rainGain.gain.value = 0; rh.connect(rainGain); rainGain.connect(master); loop(noiseBuf, rh);
    // 漩涡
    vortexBP = ctx.createBiquadFilter(); vortexBP.type = 'bandpass'; vortexBP.frequency.value = 200; vortexBP.Q.value = 2;
    vortexGain = ctx.createGain(); vortexGain.gain.value = 0; vortexBP.connect(vortexGain); vortexGain.connect(master); loop(pinkBuf, vortexBP);
  }

  api.setMuted = m => {
    muted = m;
    if (!m) { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
    if (master) master.gain.setTargetAtTime(m ? 0 : .9, ctx.currentTime, .1);
    O.emit('toggles');
  };
  api.toggle = () => api.setMuted(!muted);
  O.on('userGesture', () => { if (ctx && ctx.state === 'suspended' && !muted) ctx.resume(); });

  api.splash = (size = 1) => {
    if (!ctx || muted) return;
    const t = ctx.currentTime, s = Math.min(2, size);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = .8 + Math.random() * .4;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400 - s * 700 + Math.random() * 300; bp.Q.value = .9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 * Math.min(1.2, .3 + s), t + .005);
    g.gain.exponentialRampToValueAtTime(.001, t + .25 + s * .25);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t, Math.random() * 2); src.stop(t + .8);
    if (s > .4) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(190 - s * 30, t); o.frequency.exponentialRampToValueAtTime(55, t + .16);
      og.gain.setValueAtTime(.3 * Math.min(1, s), t); og.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + .2);
    }
  };

  const NOTES = { spawn: [1318.5, 1975.5], deny: [987.8, 740], ui: [1568], scene: [1046.5, 1318.5, 1568], clear: [1568, 1174.7, 880] };
  api.chime = (kind = 'ui') => {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    (NOTES[kind] || NOTES.ui).forEach((f, i) => {
      const t = t0 + i * .08;
      [['sine', 1, .16], ['triangle', 2, .04]].forEach(([type, mul, vol]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f * mul;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + .45);
        o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t + .5);
      });
    });
  };

  let sparkT = 0;
  O.onFrame(dt => {
    if (!ctx || muted) return;
    const t = ctx.currentTime, sw = O.swash(), P = O.params;
    const receding = Math.cos(O.swellPhase) < 0;
    const night = P.bio, dusk = O.sceneIndex === 2 ? 1 : 0;
    const amp = Math.min(1, P.swellAmp * O.calmFactor + .1);
    waveGain.gain.setTargetAtTime((.12 + .55 * Math.pow(sw, 1.5)) * amp * (1 - .3 * night), t, .08);
    waveLP.frequency.setTargetAtTime((400 + 1000 * sw) * (1 - .35 * dusk), t, .1);
    hissGain.gain.setTargetAtTime(receding ? .05 * sw * amp : 0, t, .15);
    rainGain.gain.setTargetAtTime(.12 * O.rain.k, t, .2);
    vortexGain.gain.setTargetAtTime(.25 * O.vortex.s, t, .2);
    vortexBP.frequency.setTargetAtTime(170 + 60 * Math.sin(O.time * 1.3), t, .2);
    // 月夜：随机轻微的高频「叮」
    if (night > .5 && (sparkT -= dt) < 0) {
      sparkT = 1.5 + Math.random() * 4;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 2600 + Math.random() * 1600;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012, t + .01); g.gain.exponentialRampToValueAtTime(.0002, t + .6);
      o.connect(g); g.connect(delay); o.start(t); o.stop(t + .7);
    }
  }, 95);
  return api;
})();
