// ===== 04-seabed.js =====
// 两种海床变体：0 = 常规（热带 / 黄昏 / 月夜共用，光照在合成时施加），1 = 潟湖（环礁 + 鹿角珊瑚 + 桌形珊瑚）
O.seabed = (function () {
  const VARIANT = [0, 1, 0, 0];
  const rts = [null, null];
  const decorCanvas = document.createElement('canvas');
  const decorTex = new THREE.CanvasTexture(decorCanvas);

  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uDecor: { value: decorTex }, uVariant: { value: 0 } }, O.U),
    vertexShader: O.FS_VERT,
    fragmentShader: O.glsl.common + `
    uniform sampler2D uDecor; uniform float uVariant; varying vec2 vUv;
    vec3 coralCol(float h){
      if(h < .2) return vec3(.55,.5,.44);
      if(h < .4) return vec3(.78,.48,.40);
      if(h < .6) return vec3(.85,.70,.44);
      if(h < .8) return vec3(.60,.48,.75);
      return vec3(.50,.66,.52);
    }
    void main(){
      vec2 p = (vUv - .5) * vec2(uW, uH);
      float d = depthAt(p);
      float n = fbm(p * .8);
      vec3 col = mix(vec3(.91,.84,.66), vec3(.82,.72,.52), n);
      float ang = fbm(p * .12 + 5.) * 3.;
      vec2 dir = vec2(cos(ang), sin(ang));
      float rip = sin(dot(p, dir) * 14. + fbm(p * 1.3) * 5.);
      col *= .9 + .1 * rip * smoothstep(-.05, .3, d);
      col *= .95 + .08 * hash12(floor(p * 160.));
      float mat = 1.;
      // 海草草甸
      float gf = fbm(p * .4 + 11.);
      float gm = smoothstep(.5, .9, d) * smoothstep(3.2, 2.4, d) * (1. - uVariant * .7);
      float g = smoothstep(.55, .66, gf) * gm;
      float ga = fbm(p * .2) * 2.;
      vec2 rp = mat2(cos(ga), -sin(ga), sin(ga), cos(ga)) * p;
      float blade = vnoise(rp * vec2(46., 4.)) * .7 + vnoise(rp * vec2(90., 7.)) * .3;
      vec3 gc = mix(vec3(.16,.34,.12), vec3(.46,.6,.22), blade) * (.75 + .35 * vnoise(p * 6.));
      col *= 1. - .22 * smoothstep(.47, .55, gf) * gm * (1. - g);
      col = mix(col, gc, g * (.55 + .45 * blade));
      mat = mix(mat, .3, g);
      // 珊瑚头与礁石
      for(int i = 0; i < 24; i++){
        vec4 r = uReef[i]; if(r.w <= 0.) continue;
        float dc = length(p - r.xy);
        float ds = length(p - r.xy + uSunDir.xy / max(uSunDir.z, .3) * .12 * r.w);
        if(dc > r.z){ col *= 1. - .5 * exp(-max(ds - r.z, 0.) / .12) * smoothstep(r.z * 2.2, r.z, dc); continue; }
        float h = hash12(r.xy * 13.1);
        float k = dc / r.z; vec3 nrm = normalize(vec3((p - r.xy) / r.z, sqrt(max(1. - k * k, .02))));
        vec2 v = voronoi(p * (h < .2 ? 5. : 9.) + h * 40.);
        float cell = h < .2 ? smoothstep(.02, .12, v.y - v.x) : .55 + .45 * sin((v.x) * 22.);
        vec3 cc = coralCol(h) * (.7 + .3 * cell) * (.8 + .3 * vnoise(p * 12.));
        float lit = .55 + .6 * max(dot(nrm, uSunDir), 0.);
        float rim = smoothstep(1., .85, k);
        col = mix(col * .6, cc * lit, rim); mat = mix(mat, .25, rim);
      }
      // 散落物 / 潟湖珊瑚（2D canvas 叠加层）
      vec4 dc = texture2D(uDecor, vUv);
      col = mix(col, dc.rgb, dc.a); mat = mix(mat, .3, dc.a);
      // 沙滩干沙
      float dry = smoothstep(-.02, -.25, d);
      col = mix(col, vec3(.9,.82,.64) * (.94 + .1 * hash12(floor(p * 220.))) * (.96 + .06 * vnoise(p * 3.)), dry);
      gl_FragColor = vec4(col, mat);
    }`
  });

  function star(c, x, y, R, rot, col) {
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = rot + i / 60 * Math.PI * 2, r = R * (.45 + .55 * Math.pow(Math.abs(Math.cos(a * 2.5 - rot * 2.5)), 1.6));
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.fillStyle = col; c.fill();
    c.fillStyle = 'rgba(255,240,200,.5)';
    for (let i = 0; i < 12; i++) { const a = rot + (i % 5) / 5 * Math.PI * 2, r = R * (.2 + (i / 12) * .6); c.fillRect(x + Math.cos(a) * r - .7, y + Math.sin(a) * r - .7, 1.4, 1.4); }
  }
  function shell(c, x, y, R, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(0, R * .5); c.arc(0, R * .5, R, -Math.PI * .85, -Math.PI * .15); c.closePath();
    c.fillStyle = '#f1dcc6'; c.fill(); c.strokeStyle = 'rgba(150,100,80,.6)'; c.lineWidth = .8;
    for (let i = 1; i < 7; i++) { const a = -Math.PI * .85 + i / 7 * Math.PI * .7; c.beginPath(); c.moveTo(0, R * .5); c.lineTo(Math.cos(a) * R, R * .5 + Math.sin(a) * R); c.stroke(); }
    c.restore();
  }
  function urchin(c, x, y, R) {
    c.strokeStyle = 'rgba(40,10,50,.85)'; c.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + Math.random() * .2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke(); }
    c.beginPath(); c.arc(x, y, R * .38, 0, Math.PI * 2); c.fillStyle = '#2a0f35'; c.fill();
  }
  function rubble(c, x, y, R, rot) {
    c.strokeStyle = 'rgba(248,244,232,.9)'; c.lineCap = 'round'; c.lineWidth = Math.max(1, R * .25);
    c.beginPath(); c.moveTo(x, y); const ex = x + Math.cos(rot) * R, ey = y + Math.sin(rot) * R; c.lineTo(ex, ey);
    c.moveTo(x + (ex - x) * .5, y + (ey - y) * .5); c.lineTo(x + (ex - x) * .5 + Math.cos(rot + .8) * R * .4, y + (ey - y) * .5 + Math.sin(rot + .8) * R * .4); c.stroke();
  }
  function staghorn(c, x, y, R, rnd, col) {
    c.strokeStyle = col; c.lineCap = 'round';
    const br = (bx, by, a, len, w, dep) => {
      if (dep > 4 || len < 1.5) return;
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      c.lineWidth = w; c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
      br(ex, ey, a + .45 + rnd() * .3, len * .72, w * .8, dep + 1); br(ex, ey, a - .45 - rnd() * .3, len * .72, w * .8, dep + 1);
    };
    for (let i = 0; i < 6; i++) br(x, y, i / 6 * Math.PI * 2 + rnd(), R * .4, R * .12, 0);
  }
  function tableCoral(c, x, y, R, col) {
    const sh = c.createRadialGradient(x + R * .25, y + R * .2, R * .5, x + R * .25, y + R * .2, R * 1.35);
    sh.addColorStop(0, 'rgba(0,10,20,.55)'); sh.addColorStop(1, 'rgba(0,10,20,0)'); c.fillStyle = sh; c.beginPath(); c.arc(x + R * .25, y + R * .2, R * 1.35, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .7;
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke(); }
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,240,.55)'; c.beginPath(); c.arc(x, y, R - 1, 0, Math.PI * 2); c.stroke();
  }

  function drawDecor(variant, w, h) {
    decorCanvas.width = w; decorCanvas.height = h;
    const c = decorCanvas.getContext('2d'), rnd = O.rng(31 + variant * 17), px = w / O.W;
    const toC = (x, y) => [(x / O.W + .5) * w, (.5 - y / O.H) * h];
    c.clearRect(0, 0, w, h);
    const place = (min, max) => { for (let i = 0; i < 40; i++) { const x = (rnd() - .5) * O.W * .96, y = (rnd() - .5) * O.H * .96, d = O.depth(x, y); if (d > min && d < max) return toC(x, y); } return null; };
    const shadow = (x, y, R) => { const g = c.createRadialGradient(x + R * .3, y + R * .3, 0, x + R * .3, y + R * .3, R * 1.3); g.addColorStop(0, 'rgba(40,30,10,.35)'); g.addColorStop(1, 'rgba(40,30,10,0)'); c.fillStyle = g; c.fillRect(x - R, y - R, R * 3, R * 3); };
    for (let i = 0; i < 45; i++) { const q = place(.1, 3.5); if (q) rubble(c, q[0], q[1], (.05 + rnd() * .08) * px, rnd() * 7); }
    for (let i = 0; i < 9; i++) { const q = place(.15, 2.5); if (!q) continue; const R = (.09 + rnd() * .07) * px; shadow(q[0], q[1], R); star(c, q[0], q[1], R, rnd() * 7, ['#e0572e', '#d8402a', '#f08a3a', '#c23a5a'][i % 4]); }
    for (let i = 0; i < 14; i++) { const q = place(-.4, 2.5); if (!q) continue; const R = (.035 + rnd() * .03) * px; shadow(q[0], q[1], R); shell(c, q[0], q[1], R, rnd() * 7); }
    for (let i = 0; i < 10; i++) { const q = place(.6, 3.2); if (!q) continue; const R = (.06 + rnd() * .04) * px; shadow(q[0], q[1], R * 1.2); urchin(c, q[0], q[1], R); }
    if (variant === 1) {
      const cols = ['#e889b5', '#b07ad8', '#f0d860', '#58d0c0', '#f2a0a0', '#8ab8f0'];
      for (let i = 0; i < 70; i++) { const q = place(.25, 2.6); if (!q) continue; const R = (.12 + rnd() * .16) * px; shadow(q[0], q[1], R * .8); staghorn(c, q[0], q[1], R, rnd, cols[i % cols.length]); }
      for (let i = 0; i < 16; i++) { const q = place(.4, 2.8); if (!q) continue; tableCoral(c, q[0], q[1], (.18 + rnd() * .2) * px, ['#c9a070', '#9ac08a', '#d2a0c8', '#a0b8d8'][i % 4]); }
    }
    decorTex.needsUpdate = true;
  }

  function bake(variant) {
    const q = O.quality, maxD = q < .7 ? 768 : 1024;
    const w = O.W >= O.H ? maxD : Math.round(maxD * O.W / O.H), h = O.W >= O.H ? Math.round(maxD * O.H / O.W) : maxD;
    if (!rts[variant]) rts[variant] = O.makeRT(w, h); else rts[variant].setSize(w, h);
    const keep = O.U.uLagoon.value;
    O.U.uLagoon.value = variant;
    drawDecor(variant, w, h);
    mat.uniforms.uVariant.value = variant;
    O.fsPass(mat, rts[variant]);
    O.U.uLagoon.value = keep;
    rts[variant].baked = true;
  }
  const get = sceneIdx => { const v = VARIANT[sceneIdx]; if (!rts[v] || !rts[v].baked) bake(v); return rts[v].texture; };

  // 场景缩略图：用对应场景的水色给烘焙海床着色
  const thumbMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uBed: { value: null }, uSh: { value: new THREE.Color() }, uDp: { value: new THREE.Color() },
      uSk: { value: new THREE.Color() }, uSc: { value: new THREE.Color() }, uAb: { value: .5 }, uAm: { value: 1 } }, O.U),
    vertexShader: O.FS_VERT,
    fragmentShader: O.glsl.common + `uniform sampler2D uBed; uniform vec3 uSh, uDp, uSk, uSc; uniform float uAb, uAm; varying vec2 vUv;
    void main(){ vec2 p = (vUv - .5) * vec2(uW, uH); float d = depthAt(p); vec3 b = texture2D(uBed, vUv).rgb * uSc * uAm;
      vec3 c = d < 0. ? b : mix(b * uSh * 1.4, uDp, 1. - exp(-d * uAb)); c = mix(c, uSk, .12);
      gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), 1.); }`
  });
  const thumbRT = O.makeRT(160, 96);
  function thumb(i) {
    const s = O.SCENES[i], m = thumbMat.uniforms, L = hex => new THREE.Color(hex).convertSRGBToLinear();
    const keep = O.U.uLagoon.value; O.U.uLagoon.value = s.reefLagoon;
    m.uBed.value = get(i); m.uSh.value = L(s.shallow); m.uDp.value = L(s.deep); m.uSk.value = L(s.sky); m.uSc.value = L(s.sunCol);
    m.uAb.value = s.absorb; m.uAm.value = s.ambient;
    O.fsPass(thumbMat, thumbRT); O.U.uLagoon.value = keep;
    const px = new Uint8Array(160 * 96 * 4); renderer.readRenderTargetPixels(thumbRT, 0, 0, 160, 96, px);
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 96; const c = cv.getContext('2d'), id = c.createImageData(160, 96);
    for (let y = 0; y < 96; y++) id.data.set(px.subarray((95 - y) * 640, (96 - y) * 640), y * 640);
    c.putImageData(id, 0, 0); return cv.toDataURL();
  }

  O.on('resize', () => { rts.forEach(r => r && (r.baked = false)); });
  return { get, bake, thumb, variantOf: i => VARIANT[i] };
})();
