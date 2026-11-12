// ===== 13-audio.js：WebAudio 全合成（风、脚步、划火柴、火焰、八音盒、钟声、白鹅）=====
(() => {
  let ctx = null, master, verb, noiseBuf, wind, windF, flameG, fireG, muted = false;
  let musicIn, musicLP, duckG, waterG, waterF, an, anBuf;
  const A = M.audio = {};
  const now = () => ctx.currentTime;
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  A.init = () => {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    an = ctx.createAnalyser(); an.fftSize = 2048; anBuf = new Float32Array(an.fftSize); comp.connect(an);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    // 音乐与环境风走"闪避"总线；音乐另经冷暖低通
    duckG = ctx.createGain(); duckG.connect(master);
    musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 4000; musicLP.Q.value = 0.4;
    musicIn = ctx.createGain(); musicIn.connect(musicLP); musicLP.connect(duckG);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 混响冲激
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.8, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3.2); }
    verb = ctx.createConvolver(); verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    // 风
    const ws = noiseSrc(); windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.8;
    wind = ctx.createGain(); wind.gain.value = 0.0; ws.connect(windF); windF.connect(wind); wind.connect(duckG); ws.start();
    // 运河拍岸
    const wsrc = noiseSrc(); waterF = ctx.createBiquadFilter(); waterF.type = 'bandpass'; waterF.frequency.value = 380; waterF.Q.value = 1.4;
    waterG = ctx.createGain(); waterG.gain.value = 0; wsrc.connect(waterF); waterF.connect(waterG); waterG.connect(master); wsrc.start(0, 0.7);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
    // 火柴火焰 / 炉火底噪
    const mk = () => { const s = noiseSrc(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(master); s.start(); return g; };
    flameG = mk(); fireG = mk();
    A.music('night');
  };
  A.setMuted = m => { muted = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.15); };
  A.isMuted = () => muted;
  A.duck = (k, tc = 0.6) => { if (ctx) duckG.gain.setTargetAtTime(k, now(), tc); };
  A.level = () => { if (!ctx) return null; an.getFloatTimeDomainData(anBuf); let s = 0, p = 0;
    for (const v of anBuf) { s += v * v; p = Math.max(p, Math.abs(v)); } return { rms: Math.sqrt(s / anBuf.length), peak: p, state: ctx.state }; };

  const burst = (dur, type, freq, gain, pan = 0, at = 0, q = 0.7, f2) => {
    const t = now() + at, s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); env(g, t, 0.004, gain, dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    s.connect(f); f.connect(g); g.connect(p); p.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  };
  // 雪地脚步：几粒高频"嘎吱"+ 一声闷响，走得越慢颗粒越少
  A.step = side => { if (!ctx) return;
    const n = 2 + Math.round(Math.min(1, (M.girl ? M.girl.speed : 1) / 1.6) * 3); let at = 0;
    for (let i = 0; i < n; i++) { burst(0.016 + Math.random() * 0.02, 'highpass', 1800 + Math.random() * 2400, 0.045 + Math.random() * 0.04, side * 0.25, at, 0.8);
      at += 0.006 + Math.random() * 0.009; }
    burst(0.09, 'lowpass', 380, 0.07, side * 0.2, 0.004); };
  A.strike = () => { if (!ctx) return; burst(0.13, 'bandpass', 3500, 0.5, 0.1, 0, 1.2, 1400); burst(0.3, 'lowpass', 900, 0.3, 0, 0.1, 0.7, 300); };
  A.flame = on => { if (ctx) flameG.gain.setTargetAtTime(on ? 0.05 : 0, now(), 0.3); };
  let fireOn = false; A.fire = on => { fireOn = on; };

  const tone = (freq, t, dur, gain, type = 'sine', toVerb = 0.6, dest = master) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); env(g, t, 0.005, gain, dur);
    o.connect(g); g.connect(dest); if (toVerb) { const s = ctx.createGain(); s.gain.value = toVerb; g.connect(s); s.connect(verb); }
    o.start(t); o.stop(t + dur + 0.1);
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const box = (m, t, g = 0.09, dest = master) => { tone(mtof(m), t, 1.8, g, 'sine', 0.6, dest); tone(mtof(m) * 4, t, 0.6, g * 0.18, 'sine', 0.6, dest); tone(mtof(m) * 2.01, t, 1.0, g * 0.25, 'sine', 0.6, dest); };
  // 暖色和弦垫音：每个音两只略微失谐的三角波，慢起慢落
  A.pad = (notes, dur = 7, g = 0.06, at = 0) => { if (!ctx) return; const t = now() + at, per = g / notes.length;
    notes.forEach(m => [-7, 7].forEach(cents => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = cents;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
      const gg = ctx.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(per, t + 1.6);
      gg.gain.setValueAtTime(per, t + Math.max(1.7, dur - 3.5)); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const s = ctx.createGain(); s.gain.value = 0.8;
      o.connect(f); f.connect(gg); gg.connect(master); gg.connect(s); s.connect(verb); o.start(t); o.stop(t + dur + 0.1); })); };
  A.dawn = () => [[48, 55, 60, 64], [47, 55, 59, 62], [45, 52, 57, 60], [41, 53, 57, 60]].forEach((c, i) => A.pad(c, 6.5, 0.055, i * 4));
  A.chime = n => { if (!ctx) return; const pent = [0, 2, 4, 7, 9, 12, 14, 16], base = 79 + [0, 2, -3, 5, 7][n % 5];
    for (let i = 0; i < 6; i++) box(base + pent[i], now() + i * 0.09, 0.07); };
  A.honk = () => { if (!ctx) return; for (let k = 0; k < 2; k++) { const t = now() + k * 0.22, o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t); o.frequency.linearRampToValueAtTime(430, t + 0.06); o.frequency.linearRampToValueAtTime(340, t + 0.16);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 2.5; const g = ctx.createGain(); env(g, t, 0.01, 0.16, 0.16);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25); } };
  A.boom = () => { if (!ctx) return; const t = now(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5); env(g, t, 0.005, 0.45, 0.7);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.8);
    burst(0.5, 'lowpass', 900, 0.35, (Math.random() - 0.5) * 0.6);
    for (let i = 0; i < 14; i++) burst(0.02, 'highpass', 3000 + Math.random() * 3000, 0.08, Math.random() * 1.6 - 0.8, 0.25 + Math.random() * 1.4); };
  A.whistle = () => { if (!ctx) return; const t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(2600, t + 0.9); env(g, t, 0.05, 0.025, 0.85);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1); };
  A.bells = n => { if (!ctx) return; const parts = [[1, 1], [2, 0.6], [2.4, 0.4], [3, 0.3], [4.2, 0.2], [5.4, 0.12]];
    for (let i = 0; i < n; i++) { const t = now() + 0.5 + i * 1.7; parts.forEach(([r, a]) => tone(130.8 * r, t, 5.5 * (1.2 - r * 0.12), 0.11 * a, 'sine', 0.8)); } };

  // ---- 八音盒《平安夜》（Gruber 1818，公有领域）----
  const SN = [[67, 1.5], [69, .5], [67, 1], [64, 3], [67, 1.5], [69, .5], [67, 1], [64, 3], [74, 2], [74, 1], [71, 3], [72, 2], [72, 1], [67, 3],
    [69, 2], [69, 1], [72, 1.5], [71, .5], [69, 1], [67, 1.5], [69, .5], [67, 1], [64, 3], [69, 2], [69, 1], [72, 1.5], [71, .5], [69, 1],
    [67, 1.5], [69, .5], [67, 1], [64, 3], [74, 2], [74, 1], [77, 1.5], [74, .5], [71, 1], [72, 3], [76, 3],
    [72, 1.5], [67, .5], [64, 1], [67, 1.5], [65, .5], [62, 1], [60, 6]];
  let seq = null;
  A.music = mode => { if (!ctx) return; if (!mode) { seq = null; return; }
    seq = { i: 0, t: now() + 1.5, beat: mode === 'major' ? 0.42 : 0.66, up: mode === 'major' ? 24 : 12, once: mode === 'major', g: mode === 'major' ? 0.11 : 0.08 }; };
  M.onFrame(() => {
    if (!ctx) return;
    while (seq && seq.t < now() + 0.3) {
      const [m, b] = SN[seq.i]; box(m + seq.up, seq.t, seq.g, musicIn);
      if (seq.i % 3 === 0 && b >= 1) box(m + seq.up - 12, seq.t, seq.g * 0.45, musicIn);
      seq.t += b * seq.beat; seq.i++;
      if (seq.i >= SN.length) { if (seq.once) { seq = null; break; } seq.i = 0; seq.t += 4; }
    }
    const S = M.story, cold = S ? S.cold : 0.3, dawn = S ? S.dawn : 0;
    const warmth = Math.max(dawn, Math.pow(M.clamp(1 - cold + (S && S.flame ? 0.15 : 0), 0, 1), 1.5));
    musicLP.frequency.setTargetAtTime(900 + 7000 * warmth, now(), 1.0);
    const G = M.girl, cd = G.pos.z > -44 ? (G.pos.x < 6 ? 6 - G.pos.x : G.pos.x > 14 ? G.pos.x - 14 : 0) : 99;
    const lap = 0.6 + 0.4 * Math.sin(M.time * 0.9) * Math.sin(M.time * 0.37 + 1);
    waterG.gain.setTargetAtTime(0.06 * M.smooth(9, 0.5, cd) * lap * (1 - dawn * 0.5), now(), 0.4);
    waterF.frequency.setTargetAtTime(300 + 160 * Math.sin(M.time * 0.53), now(), 0.3);
    wind.gain.setTargetAtTime((0.025 + cold * 0.07) * (1 - dawn * 0.8), now(), 0.5);
    windF.frequency.setTargetAtTime(420 + Math.sin(M.time * 0.23) * 180 + Math.sin(M.time * 0.71) * 90, now(), 0.3);
    if (fireOn) { const st = M.props.stove.pos, d = Math.hypot(M.girl.pos.x - st.x, M.girl.pos.z - st.z), k = M.smooth(12, 1.5, d);
      fireG.gain.setTargetAtTime(0.1 * k, now(), 0.3);
      if (Math.random() < 0.08 * k) burst(0.02, 'highpass', 2500 + Math.random() * 3000, 0.12 * k, -0.2 + Math.random() * 0.4); }
    if (flameG.gain.value > 0.01 && Math.random() < 0.05) burst(0.015, 'highpass', 4000, 0.05);
  }, 95);
})();
