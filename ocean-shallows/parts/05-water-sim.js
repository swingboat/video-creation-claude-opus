// ===== 05-water-sim.js =====
// 高度场：R = 高度，G = 速度。浮点 RT 不可用时退回 8 位编码（值/4 + 0.5）
O.sim = (function () {
  const ENC = O.floatType === THREE.UnsignedByteType ? 1 : 0;
  const MAXD = 32;
  let rtA, rtB, maskRT, nx = 2, ny = 2;
  const drops = [];
  const dropU = Array.from({ length: MAXD }, () => new THREE.Vector4());
  const DEC = `float dec(float v){ return uEnc > .5 ? (v - .5) * 4. : v; } float enc(float v){ return uEnc > .5 ? clamp(v * .25 + .5, 0., 1.) : v; }`;

  // 阻尼掩码：R = 阻尼系数（边缘海绵层 + 沙滩），每次 resize 重新烘焙
  const maskMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, O.U), vertexShader: O.FS_VERT,
    fragmentShader: O.glsl.common + `varying vec2 vUv; void main(){
      vec2 p = (vUv - .5) * vec2(uW, uH);
      float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
      float sponge = 1. - smoothstep(0., .07, e);
      float sd = shoreDist(p);
      float beach = 1. - smoothstep(-.05, .25, sd);
      float damp = .993 - sponge * .16 - beach * .12;
      gl_FragColor = vec4(damp, sponge, beach, 1.); }`
  });

  const stepMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uPrev: { value: null }, uMask: { value: null }, uTexel: { value: new THREE.Vector2() },
      uEnc: { value: ENC }, uDrops: { value: dropU }, uCount: { value: 0 } }, O.U),
    vertexShader: O.FS_VERT,
    fragmentShader: `uniform sampler2D uPrev, uMask; uniform vec2 uTexel; uniform float uEnc, uW, uH; uniform vec4 uDrops[${MAXD}]; uniform int uCount; varying vec2 vUv;
    ${DEC}
    void main(){
      vec4 c = texture2D(uPrev, vUv);
      float h = dec(c.r), v = dec(c.g);
      float avg = (dec(texture2D(uPrev, vUv + vec2(uTexel.x, 0.)).r) + dec(texture2D(uPrev, vUv - vec2(uTexel.x, 0.)).r)
                 + dec(texture2D(uPrev, vUv + vec2(0., uTexel.y)).r) + dec(texture2D(uPrev, vUv - vec2(0., uTexel.y)).r)) * .25;
      vec3 m = texture2D(uMask, vUv).rgb;
      v += (avg - h) * 1.8;
      v *= m.r;
      h += v;
      h *= 1. - m.g * .06 - m.b * .05;
      vec2 p = (vUv - .5) * vec2(uW, uH);
      for(int i = 0; i < ${MAXD}; i++){
        if(i >= uCount) break;
        vec4 d = uDrops[i]; vec2 q = p - d.xy;
        h -= d.w * exp(-dot(q, q) / (d.z * d.z));
      }
      gl_FragColor = vec4(enc(clamp(h, -1.8, 1.8)), enc(clamp(v, -1.8, 1.8)), 0., 1.);
    }`
  });
  const clearMat = new THREE.ShaderMaterial({ uniforms: { uEnc: { value: ENC } }, vertexShader: O.FS_VERT,
    fragmentShader: `uniform float uEnc; void main(){ float z = uEnc > .5 ? .5 : 0.; gl_FragColor = vec4(z, z, 0., 1.); }` });

  function alloc() {
    const N = O.quality < .7 ? 192 : O.quality < .9 ? 256 : 320;
    if (O.W >= O.H) { nx = N; ny = Math.round(N * O.H / O.W); } else { ny = N; nx = Math.round(N * O.W / O.H); }
    [rtA, rtB, maskRT].forEach(r => r && r.dispose());
    rtA = O.makeRT(nx, ny, { float: true }); rtB = O.makeRT(nx, ny, { float: true }); maskRT = O.makeRT(nx, ny);
    O.fsPass(maskMat, maskRT); O.fsPass(clearMat, rtA); O.fsPass(clearMat, rtB);
    stepMat.uniforms.uTexel.value.set(1 / nx, 1 / ny);
    stepMat.uniforms.uMask.value = maskRT.texture;
    api.texel.set(1 / nx, 1 / ny);
  }

  function step() {
    // 扰动太多时保留最强的
    if (drops.length > MAXD) drops.sort((a, b) => Math.abs(b[3]) - Math.abs(a[3]));
    const n = Math.min(drops.length, MAXD);
    for (let i = 0; i < n; i++) dropU[i].set(...drops[i]);
    drops.length = 0;
    for (let s = 0; s < 2; s++) {
      stepMat.uniforms.uPrev.value = rtA.texture;
      stepMat.uniforms.uCount.value = s === 0 ? n : 0;
      O.fsPass(stepMat, rtB);
      const t = rtA; rtA = rtB; rtB = t;
    }
    api.tex = rtA.texture;
  }

  const api = {
    tex: null, texel: new THREE.Vector2(), enc: ENC, DEC,
    drop(x, y, r, amp) { drops.push([x, y, Math.max(r, .03), amp]); },
    clear() { if (rtA) { O.fsPass(clearMat, rtA); O.fsPass(clearMat, rtB); } },
    step
  };
  O.on('resize', alloc);
  O.on('quality', alloc);
  O.onFrame(step, 20);
  return api;
})();

// ===== 生物荧光缓冲（单通道衰减 + 扩散）=====
O.bio = (function () {
  const MAXB = 24;
  let rtA, rtB;
  const list = [];
  const bU = Array.from({ length: MAXB }, () => new THREE.Vector4());
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uB: { value: bU }, uCount: { value: 0 }, uDecay: { value: .94 } }, O.U),
    vertexShader: O.FS_VERT,
    fragmentShader: `uniform sampler2D uPrev; uniform vec2 uTexel; uniform vec4 uB[${MAXB}]; uniform int uCount; uniform float uDecay, uW, uH; varying vec2 vUv;
    void main(){
      float c = texture2D(uPrev, vUv).r * .6;
      c += (texture2D(uPrev, vUv + vec2(uTexel.x, 0.)).r + texture2D(uPrev, vUv - vec2(uTexel.x, 0.)).r
          + texture2D(uPrev, vUv + vec2(0., uTexel.y)).r + texture2D(uPrev, vUv - vec2(0., uTexel.y)).r) * .1;
      c *= uDecay;
      vec2 p = (vUv - .5) * vec2(uW, uH);
      for(int i = 0; i < ${MAXB}; i++){ if(i >= uCount) break; vec4 b = uB[i]; vec2 q = p - b.xy; c += b.w * exp(-dot(q, q) / (b.z * b.z)); }
      gl_FragColor = vec4(min(c, 1.5), 0., 0., 1.);
    }`
  });
  const clearMat = new THREE.MeshBasicMaterial({ color: 0 });
  function alloc() {
    const nx = Math.round(O.sim.texel.x ? .5 / O.sim.texel.x : 128), ny = Math.round(O.sim.texel.y ? .5 / O.sim.texel.y : 128);
    [rtA, rtB].forEach(r => r && r.dispose());
    rtA = O.makeRT(nx, ny); rtB = O.makeRT(nx, ny);
    O.fsPass(clearMat, rtA); O.fsPass(clearMat, rtB);
    mat.uniforms.uTexel.value.set(1 / nx, 1 / ny);
    api.tex = rtA.texture;
  }
  const api = {
    tex: null,
    add(x, y, r, amp) { if (O.params.bio > .02 && list.length < 64) list.push([x, y, r, amp * O.params.bio]); }
  };
  O.on('resize', alloc); O.on('quality', alloc);
  O.onFrame(() => {
    if (!rtA) return;
    if (O.params.bio < .01 && !list.length) return;
    list.sort((a, b) => b[3] - a[3]);
    const n = Math.min(list.length, MAXB);
    for (let i = 0; i < n; i++) bU[i].set(...list[i]);
    list.length = 0;
    mat.uniforms.uCount.value = n; mat.uniforms.uPrev.value = rtA.texture;
    O.fsPass(mat, rtB);
    const t = rtA; rtA = rtB; rtB = t; api.tex = rtA.texture;
  }, 21);
  return api;
})();
