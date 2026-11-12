// ===== 03-post.js：后期管线（线性 HDR → bloom + 景深 + 调色 + 霜冻 + ACES）=====
(() => {
  const R = M.renderer;
  const hdr = { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false };
  const rtScene = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  rtScene.depthTexture = new T.DepthTexture(4, 4); rtScene.depthTexture.type = T.UnsignedIntType;
  const rtA = new T.WebGLRenderTarget(4, 4, hdr), rtB = new T.WebGLRenderTarget(4, 4, hdr);
  const rtC = new T.WebGLRenderTarget(4, 4, hdr), rtD = new T.WebGLRenderTarget(4, 4, hdr);
  const rtE = new T.WebGLRenderTarget(4, 4, hdr), rtF = new T.WebGLRenderTarget(4, 4, hdr);

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new T.Mesh(geo); quad.frustumCulled = false;
  const pScene = new T.Scene(); pScene.add(quad);
  const pCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const VS = `varying vec2 vUv; void main(){ vUv = position.xy*.5+.5; gl_Position = vec4(position.xy,0.,1.); }`;
  const mk = (fs, uniforms) => new T.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });

  const matDown = mk(`
    uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThresh; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv+uTexel*vec2(-.5,-.5)).rgb + texture2D(tSrc, vUv+uTexel*vec2(.5,-.5)).rgb
             + texture2D(tSrc, vUv+uTexel*vec2(-.5,.5)).rgb + texture2D(tSrc, vUv+uTexel*vec2(.5,.5)).rgb;
      c *= .25;
      if (uThresh > 0.) { float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uThresh-.5, uThresh+.5, l); c *= k; }
      gl_FragColor = vec4(min(c, vec3(40.)), 1.);
    }`, { tSrc: { value: null }, uTexel: { value: new T.Vector2() }, uThresh: { value: 0 } });

  const matBlur = mk(`
    uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * .227027;
      c += texture2D(tSrc, vUv + uDir*1.3846).rgb * .316216; c += texture2D(tSrc, vUv - uDir*1.3846).rgb * .316216;
      c += texture2D(tSrc, vUv + uDir*3.2308).rgb * .070270; c += texture2D(tSrc, vUv - uDir*3.2308).rgb * .070270;
      gl_FragColor = vec4(c, 1.);
    }`, { tSrc: { value: null }, uDir: { value: new T.Vector2() } });

  const U = {
    tScene: { value: rtScene.texture }, tDepth: { value: rtScene.depthTexture },
    tBloomA: { value: rtA.texture }, tBloomC: { value: rtC.texture }, tDof: { value: rtE.texture },
    tFrost: { value: M.tex.frost() },
    uCold: { value: 0.3 }, uWarm: { value: 0 }, uDawn: { value: 0 }, uFocus: { value: 9 }, uWhite: { value: 0 },
    uNear: { value: 0.1 }, uFar: { value: 400 }, uTime: { value: 0 }, uExposure: { value: 1.15 },
    uAspect: { value: 1 }, uLowQ: { value: 0 },
  };
  const matComp = mk(`
    uniform sampler2D tScene, tDepth, tBloomA, tBloomC, tDof, tFrost;
    uniform float uCold, uWarm, uDawn, uFocus, uWhite, uNear, uFar, uTime, uExposure, uAspect, uLowQ;
    varying vec2 vUv;
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
    void main(){
      vec3 col = texture2D(tScene, vUv).rgb;
      float d = texture2D(tDepth, vUv).r;
      float z = (2.*uNear*uFar) / (uFar+uNear - (d*2.-1.)*(uFar-uNear));
      if (uLowQ < .5) {
        float coc = smoothstep(uFocus+3., uFocus+28., z)*.9 + smoothstep(uFocus-2.5, .4, z)*.6;
        col = mix(col, texture2D(tDof, vUv).rgb, clamp(coc, 0., 1.));
      }
      col += texture2D(tBloomA, vUv).rgb * .5 + (uLowQ < .5 ? texture2D(tBloomC, vUv).rgb * .8 : vec3(0.));
      // 冷暖调色
      float l = dot(col, vec3(.2126,.7152,.0722));
      col = mix(col, vec3(l)*vec3(.78,.88,1.15), uCold*.35);
      col *= 1. + uWarm*vec3(.35,.18,.02);
      col *= 1. + uDawn*.25;
      col = aces(col * uExposure);
      // 霜冻边缘
      vec2 q = (vUv-.5)*vec2(uAspect, 1.);
      float r = length(q) / length(vec2(uAspect, 1.)*.5);
      float fr = texture2D(tFrost, vUv).r;
      float edge = smoothstep(1.05 - .55*uCold, 1.25 - .35*uCold, r + fr*.18 + (hash12(floor(vUv*180.))-.5)*.03);
      col = mix(col, vec3(.84,.9,.98), edge*(.55 + .45*fr) * (1.-uDawn*.8));
      // 暗角、白场；颗粒加在 gamma 之后（否则暗部被 gamma 放大成强烈闪烁），暗部更弱，24 Hz 更新
      col *= mix(1., smoothstep(1.25, .35, r), .55 * (1.-uDawn*.6));
      col = pow(max(col, 0.), vec3(1./2.2));
      float gl = dot(col, vec3(.2126,.7152,.0722));
      col += (hash12(vUv*1000. + fract(floor(uTime*24.)/24.)*137.) - .5) * .022 * mix(.25, 1., smoothstep(.04, .35, gl));
      col = mix(col, vec3(1., .97, .93), uWhite);
      gl_FragColor = vec4(col, 1.);
    }`, U);

  const pass = (mat, target) => { quad.material = mat; R.setRenderTarget(target); R.render(pScene, pCam); };
  const blur = (a, b, w, h, scale = 1) => {
    matBlur.uniforms.tSrc.value = a.texture; matBlur.uniforms.uDir.value.set(scale / w, 0); pass(matBlur, b);
    matBlur.uniforms.tSrc.value = b.texture; matBlur.uniforms.uDir.value.set(0, scale / h); pass(matBlur, a);
  };
  const size = new T.Vector2();
  M.post = { uniforms: U };
  M.post.resize = () => {
    R.getDrawingBufferSize(size);
    const w = Math.max(4, size.x | 0), h = Math.max(4, size.y | 0);
    rtScene.setSize(w, h);
    rtA.setSize(w >> 1, h >> 1); rtB.setSize(w >> 1, h >> 1); rtE.setSize(w >> 1, h >> 1); rtF.setSize(w >> 1, h >> 1);
    rtC.setSize(w >> 2, h >> 2); rtD.setSize(w >> 2, h >> 2);
    U.uAspect.value = w / h;
  };
  M.post.render = () => {
    const cam = M.camera, lowQ = M.quality < 0.35;
    U.uNear.value = cam.near; U.uFar.value = cam.far; U.uTime.value = M.time; U.uLowQ.value = lowQ ? 1 : 0;
    R.setRenderTarget(rtScene); R.render(M.scene, cam);
    const w2 = rtA.width, h2 = rtA.height;
    matDown.uniforms.tSrc.value = rtScene.texture; matDown.uniforms.uTexel.value.set(1 / rtScene.width, 1 / rtScene.height);
    matDown.uniforms.uThresh.value = 1.0; pass(matDown, rtA);
    blur(rtA, rtB, w2, h2);
    if (!lowQ) {
      matDown.uniforms.tSrc.value = rtA.texture; matDown.uniforms.uTexel.value.set(1 / w2, 1 / h2);
      matDown.uniforms.uThresh.value = 0; pass(matDown, rtC);
      blur(rtC, rtD, rtC.width, rtC.height, 1.5); blur(rtC, rtD, rtC.width, rtC.height, 2.5);
      matDown.uniforms.tSrc.value = rtScene.texture; matDown.uniforms.uTexel.value.set(1 / rtScene.width, 1 / rtScene.height);
      pass(matDown, rtE);
      blur(rtE, rtF, w2, h2, 1.5); blur(rtE, rtF, w2, h2, 2.5);
    }
    pass(matComp, null);
  };
  M.post.resize();
})();
