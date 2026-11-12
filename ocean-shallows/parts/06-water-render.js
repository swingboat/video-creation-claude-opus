// ===== 06-water-render.js =====
renderer.outputEncoding = THREE.sRGBEncoding;
O.underScene = new THREE.Scene();
O.aboveScene = new THREE.Scene();
O.underRT = null; O.shadowRT = null;
O.foamSpots = Array.from({ length: 8 }, () => new THREE.Vector4(1e4, 1e4, -99, 0));
O.vortex = { x: 0, y: 0, on: false, s: 0 };
O.rain = { on: false, k: 0 };

// ---- 海床（水下层底板，带光照）----
O.bedMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ uBedA: { value: null }, uBedB: { value: null } }, O.U, O.SU),
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D uBedA, uBedB; uniform float uSeabedMix, uAmbient; uniform vec3 uSunCol, uSky, uSunDir; varying vec2 vUv;
  void main(){ vec4 a = mix(texture2D(uBedA, vUv), texture2D(uBedB, vUv), uSeabedMix);
    vec3 L = uSunCol * (.2 + .65 * uSunDir.z) + uSky * .18;
    gl_FragColor = vec4(a.rgb * L * uAmbient, 1.); }`,
  depthWrite: false, depthTest: false
});
O.bedMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), O.bedMat);
O.bedMesh.position.z = -8; O.bedMesh.renderOrder = -10; O.bedMesh.frustumCulled = false;
O.underScene.add(O.bedMesh);

// ---- 合成水面 ----
O.compMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({
    uUnder: { value: null }, uSim: { value: null }, uSimTexel: { value: O.sim.texel }, uEnc: { value: O.sim.enc },
    uBio: { value: null }, uShadow: { value: null }, uRain: { value: 0 }, uVortex: { value: new THREE.Vector4() },
    uFoam: { value: O.foamSpots }, uBedA: { value: null }, uBedB: { value: null }
  }, O.U, O.SU),
  vertexShader: O.FS_VERT,
  fragmentShader: O.glsl.common + `
  uniform sampler2D uUnder, uSim, uBio, uShadow, uBedA, uBedB;
  uniform vec2 uSimTexel; uniform float uEnc, uRain, uAbsorb, uCaustic, uAmbient, uSwellAmp, uSwellPhase, uGlint, uBioOn, uSeabedMix;
  uniform vec3 uShallow, uDeep, uCausticTint, uSunCol, uSky, uGlintCol, uSand; uniform vec4 uVortex; uniform vec4 uFoam[8];
  varying vec2 vUv;
  ${O.sim.DEC}
  float simH(vec2 uv){ return dec(texture2D(uSim, uv).r); }
  float caustic(vec2 p){
    vec2 a = voronoi(p + vec2(uTime * .23, uTime * .17)); vec2 b = voronoi(p * 1.37 - vec2(uTime * .19, -uTime * .13) + 4.);
    float c1 = 1. - smoothstep(0., .16, a.y - a.x), c2 = 1. - smoothstep(0., .2, b.y - b.x);
    return c1 * c1 * .55 + c2 * c2 * .4 + c1 * c2 * 1.6;
  }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  void main(){
    vec2 WH = vec2(uW, uH);
    vec2 p = (vUv - .5) * WH;
    float d = depthAt(p);
    float sd = shoreDist(p);
    vec2 C = vec2(-uW * .5, uH * .5); vec2 rad = normalize(p - C + 1e-4);
    float along = atan(-(p.y - C.y), p.x - C.x) * uS;

    // ---- 法线：模拟 + 长浪 + 细碎涟漪 ----
    vec2 tx = uSimTexel;
    float gx = (simH(vUv + vec2(tx.x, 0.)) - simH(vUv - vec2(tx.x, 0.))) / (2. * tx.x * uW);
    float gy = (simH(vUv + vec2(0., tx.y)) - simH(vUv - vec2(0., tx.y))) / (2. * tx.y * uH);
    float k = 6.2832 / 1.6;
    float bend = fbm(vec2(along * .25, uTime * .05)) * 2.2;
    float ph = sd * k + uSwellPhase + bend;
    float sh = smoothstep(-.05, .3, d);
    float A = uSwellAmp * (.25 + .75 * exp(-d * .6)) * sh;
    float swellH = A * (sin(ph) + .35 * sin(ph * 2. + .8));
    vec2 gSw = rad * A * k * (cos(ph) + .7 * cos(ph * 2. + .8)) * .028;
    vec2 gR = vec2(vnoise(p * 7. + uTime * vec2(.6, .3)) - vnoise(p * 7. + vec2(3.1, 0.) + uTime * vec2(.6, .3)),
                   vnoise(p * 7.3 - uTime * vec2(.2, .5) + 9.) - vnoise(p * 7.3 + vec2(0., 2.7) - uTime * vec2(.2, .5) + 9.)) * .12;
    vec2 grad = vec2(gx, gy) * .32 + gSw + gR * (.25 + .25 * uSwellAmp);
    // 漩涡扭曲
    vec2 vq = p - uVortex.xy; float vr = length(vq); float vf = uVortex.z * exp(-vr * vr / 1.2);
    grad += vec2(-vq.y, vq.x) * vf * .25;
    vec3 n = normalize(vec3(-grad, 1.));

    // ---- 折射采样水下层 ----
    float dw = max(d, 0.);
    vec2 off = n.xy * .28 * min(dw, 2.5) + vec2(-vq.y, vq.x) * vf * .05;
    vec2 ruv = clamp(vUv + off / WH, .001, .999);
    vec4 under = texture2D(uUnder, ruv);
    vec3 base = under.rgb;
    // alpha < 1：生物，alpha*4 = 它到水面的距离；alpha = 1：海床
    float dOpt = under.a > .995 ? dw : min(dw, under.a * 4.);
    float shadow = texture2D(uShadow, vUv).r;
    base *= 1. - .55 * shadow;

    // ---- 焦散 ----
    float cs = caustic(p * 1.4 + n.xy * 1.6) * uCaustic * smoothstep(0., .35, d) * exp(-d * .5) * (1. - shadow) * (1. - .6 * uRain);
    base += cs * uCausticTint * uSunCol * .45 * uAmbient;

    // ---- 冲刷带 / 湿沙 ----
    float s = max(0., sin(uSwellPhase)); float swash = s * s * min(1., uSwellAmp + .15);
    float jag = .7 + .6 * fbm(vec2(along * 1.4, 3.));
    float reach = .1 * uS * swash * jag;
    float maxReach = .1 * uS * min(1., uSwellAmp + .15) * jag;
    float film = smoothstep(-reach - .01, -reach + .02, sd) * (1. - step(0., sd));
    float receding = step(cos(uSwellPhase), 0.);
    float wet = smoothstep(-maxReach * 1.05, -maxReach * .85, sd) * (1. - step(0., sd));
    float bedMat = mix(texture2D(uBedA, vUv).a, texture2D(uBedB, vUv).a, uSeabedMix);

    vec3 col;
    float isWater = max(step(0., sd), film);
    if(sd < 0.){
      col = base * (1. - .38 * wet * bedMat);
      float gloss = wet * (1. - film) * (.4 + .6 * receding * exp(-max(-sd - reach, 0.) / (.04 * uS)));
      vec3 Rw = reflect(vec3(0., 0., -1.), normalize(vec3(-grad * .3, 1.)));
      col += gloss * (uSky * .28 + uGlintCol * pow(max(dot(Rw, uSunDir), 0.), 30.) * uGlint * .8) * uAmbient;
      col = mix(col, col * mix(vec3(1.), uShallow * 1.4, .5) + uSky * .08, film * .7);
    } else {
      float a = 1. - exp(-dOpt * uAbsorb);
      vec3 tint = mix(vec3(1.), uShallow * 1.3, clamp(dOpt * 1.3, 0., 1.) * .7);
      col = mix(base * tint, uDeep * (.6 + .4 * uAmbient), a * .95);
      col += uShallow * .05 * uAmbient * (1. - a);
    }

    // ---- 天空反射 + 阳光闪烁 ----
    float fres = .02 + .98 * pow(1. - n.z, 5.);
    col = mix(col, uSky * (.55 + .45 * uAmbient), clamp(fres * 1.2 + .015, 0., .18) * isWater);
    vec2 gp = p * 12.; vec2 cell = floor(gp); vec2 rnd = hash22(cell);
    float tw = pow(max(0., sin(uTime * (2.5 + rnd.x * 4.) + rnd.y * 6.28)), 6.);
    float dotS = smoothstep(.13, 0., length(fract(gp) - .5 - (rnd - .5) * .6));
    float sheen = pow(max(dot(reflect(vec3(0., 0., -1.), n), uSunDir), 0.), 60.);
    vec2 sp2 = normalize(uSunDir.xy + 1e-4);
    float glare = (1. - uSunDir.z) * pow(clamp(dot(p / WH * 2., sp2) * .5 + .5, 0., 1.), 2.5) * (.6 + .4 * fbm(p * 1.5 + n.xy * 4. + uTime * .1));
    float face = smoothstep(.2, .9, pow(max(dot(reflect(vec3(0., 0., -1.), normalize(vec3(-grad * 3., 1.))), uSunDir), 0.), 6.));
    float spec = dotS * tw * step(.78, rnd.x) * (.06 + 1.3 * face);
    col += uGlintCol * (spec * 2.2 + sheen * .2 + glare * .35) * uGlint * isWater * (1. - .7 * shadow) * (1. - .7 * uRain);

    // ---- 泡沫：破碎浪 + 冲刷前缘 + 蕾丝 + 水花环 + 漩涡 ----
    vec2 lv = voronoi(p * 9. + rad * uTime * .3 * (receding * 2. - 1.) + fbm(p * 2.) * 2.);
    float lace = smoothstep(.07, .0, lv.y - lv.x);
    float crest = smoothstep(.55, 1., sin(ph)) * smoothstep(.45, .1, d) * smoothstep(-.02, .05, d) * uSwellAmp;
    float front = exp(-abs(sd + reach) / .025) * step(.02, swash) * (1. - step(0., sd));
    float laceBand = (film + smoothstep(.35, .0, d) * step(0., sd) * .8) * (.5 + .5 * swash + receding * .3);
    float foam = crest * (.5 + .5 * lace) + front * .9 + lace * laceBand * .75;
    foam += smoothstep(.3, 1., vnoise(p * 5. + uTime * .2)) * crest * .4;
    for(int i = 0; i < 8; i++){
      vec4 f = uFoam[i]; float age = uTime - f.z; if(age < 0. || age > 1.8) continue;
      float rr = length(p - f.xy), R0 = f.w * (.25 + age * .9);
      foam += exp(-abs(rr - R0) / (.06 * f.w)) * (1. - age / 1.8) * (.6 + .4 * lace) + exp(-rr / (.2 * f.w)) * (1. - age / .6) * step(age, .6);
    }
    float spiral = smoothstep(.75, 1., sin(atan(vq.y, vq.x) * 3. + vr * 7. - uTime * 5.)) * exp(-vr * .9) * uVortex.w;
    foam += spiral * .45;
    col *= 1. - .35 * uVortex.w * exp(-vr * vr * 3.);
    col = mix(col, vec3(.95, .97, 1.) * (.25 + .75 * uAmbient) * mix(vec3(1.), uSunCol, .3), clamp(foam, 0., 1.) * isWater * .85);

    // ---- 生物荧光 ----
    float bio = texture2D(uBio, vUv).r * uBioOn;
    col += vec3(.1, .95, .85) * bio * (1.1 + .9 * foam) ;

    col *= 1. - .15 * uRain;
    col *= 1. - .18 * dot(vUv - .5, vUv - .5) * 2.;
    col = aces(col * 1.05);
    gl_FragColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
  }`,
  depthTest: false, depthWrite: false
});

// ---- 尺寸 / 场景切换 ----
O.on('resize', () => {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  const k = O.quality < 1 ? .75 : 1;
  if (O.underRT) O.underRT.dispose(); if (O.shadowRT) O.shadowRT.dispose();
  O.underRT = O.makeRT(v.x * k, v.y * k, { depth: true });
  O.shadowRT = O.makeRT(v.x * .5, v.y * .5);
  O.bedMesh.scale.set(O.W, O.H, 1);
});
O.on('quality', () => O.emit('resize'));
function refreshBeds() {
  const a = O.seabed.get(O.sceneFrom), b = O.seabed.get(O.sceneIndex);
  O.bedMat.uniforms.uBedA.value = a; O.bedMat.uniforms.uBedB.value = b;
  O.compMat.uniforms.uBedA.value = a; O.compMat.uniforms.uBedB.value = b;
}
O.on('scene', refreshBeds);
O.on('resize', () => setTimeout(refreshBeds, 0));

O.addFoam = (x, y, size) => {
  let best = O.foamSpots[0];
  for (const f of O.foamSpots) if (f.z < best.z) best = f;
  best.set(x, y, O.time, size);
};

// ---- 每帧渲染 ----
O.onFrame(dt => {
  if (!O.bedMat.uniforms.uBedA.value) refreshBeds();
  const V = O.vortex; V.s += ((V.on ? 1 : 0) - V.s) * Math.min(1, dt * 1.5);
  O.rain.k += ((O.rain.on ? 1 : 0) - O.rain.k) * Math.min(1, dt * 1.2);
  const u = O.compMat.uniforms;
  u.uVortex.value.set(V.x, V.y, V.s * 1.4, V.s);
  u.uRain.value = O.rain.k;
  u.uSim.value = O.sim.tex; u.uBio.value = O.bio.tex;
  u.uUnder.value = O.underRT.texture; u.uShadow.value = O.shadowRT.texture;

  renderer.setRenderTarget(O.underRT);
  renderer.setClearColor(0x000000, 1); renderer.clear();
  renderer.render(O.underScene, O.camMain);
  O.fsPass(O.compMat, null);
  renderer.setRenderTarget(null); renderer.clearDepth();
  renderer.render(O.aboveScene, O.camMain);
}, 90);
