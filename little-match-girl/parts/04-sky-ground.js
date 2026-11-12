// ===== 04-sky-ground.js：天空、远景、地面积雪、雪堆、降雪、脚印 =====
(() => {
  // ---- 天空穹顶 ----
  const skyU = { uTime: { value: 0 }, uDawn: { value: 0 } };
  const sky = new T.Mesh(new T.SphereGeometry(300, 48, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: M.glslNoise + `
      uniform float uTime, uDawn; varying vec3 vDir;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec3 d = normalize(vDir); float h = clamp(d.y, -.2, 1.);
        vec3 night = mix(lin(vec3(.17,.23,.4)), lin(vec3(.027,.043,.11)), pow(max(h,0.), .55));
        vec3 dawn = mix(lin(vec3(.95,.79,.63)), lin(vec3(.56,.7,.88)), pow(max(h,0.), .6));
        vec3 c = mix(night, dawn, uDawn);
        float az = atan(d.x, -d.z);
        float wave = .26 + .07*sin(az*5. + uTime*.15) + .04*sin(az*11. - uTime*.23);
        float curtain = exp(-pow((h - wave)/.11, 2.)) * smoothstep(-.4, .5, az) * smoothstep(1.9, .7, az);
        curtain *= .55 + .45*noise(vec2(az*18., uTime*.3));
        c += lin(vec3(.12,.62,.5)) * curtain * .35 * (1.-uDawn);
        vec2 g = vec2(az*90., asin(clamp(d.y,-1.,1.))*90.);
        vec2 cell = floor(g); float s = hash(cell);
        if (s > .975 && h > .05) {
          float tw = .6 + .4*sin(uTime*(1.5+s*3.) + s*40.);
          float r = length(fract(g)-.5);
          c += vec3(smoothstep(.22, .0, r)) * tw * (s-.975)*60. * (1.-uDawn) * smoothstep(.05,.25,h);
        }
        gl_FragColor = vec4(c, 1.);
      }`
  }));
  sky.renderOrder = -10; M.scene.add(sky);
  M.sky = { mesh: sky, uniforms: skyU };

  // ---- 远景剪影：画在一圈圆柱内壁 ----
  const sil = M.canvasTex('skyline', 2048, (g, s) => {
    const r = M.rand(99); g.clearRect(0, 0, s, s);
    let x = 0;
    while (x < s) {
      const w = 30 + r() * 70, h = s * (0.18 + r() * 0.22), base = s;
      g.fillStyle = `rgb(${18 + r() * 6},${24 + r() * 8},${48 + r() * 12})`;
      g.fillRect(x, base - h, w, h);
      g.beginPath(); g.moveTo(x - 2, base - h); g.lineTo(x + w / 2, base - h - 20 - r() * 40); g.lineTo(x + w + 2, base - h); g.fill();
      if (r() < 0.12) { g.beginPath(); g.moveTo(x + w * .4, base - h); g.lineTo(x + w * .5, base - h - 160 - r() * 140); g.lineTo(x + w * .6, base - h); g.fill(); }
      for (let i = 0; i < 6; i++) if (r() < 0.35) { g.fillStyle = `rgba(255,${170 + r() * 50},90,${0.5 + r() * 0.4})`; g.fillRect(x + 5 + r() * (w - 12), base - h + 10 + r() * (h - 30), 4, 6); }
      x += w + r() * 6;
    }
  }, { clamp: false });
  sil.wrapT = T.ClampToEdgeWrapping; sil.repeat.set(3, 1);
  const ring = new T.Mesh(new T.CylinderGeometry(150, 150, 70, 64, 1, true), new T.MeshBasicMaterial({
    map: sil, transparent: true, side: T.BackSide, fog: false, depthWrite: false, color: M.col('#8f9ab8') }));
  ring.position.y = 22; ring.renderOrder = -9; M.scene.add(ring);
  M.sky.ring = ring;

  // ---- 地面：石板 + 世界坐标积雪 ----
  const cobble = M.tex.cobble();
  const groundMat = new T.MeshStandardMaterial({ map: cobble, color: M.col('#a9a6a6'), roughness: 0.82, bumpMap: cobble, bumpScale: 0.035 });
  groundMat.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWP = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\n' + M.glslNoise + sh.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float macro = fbm(vWP.xz*.045), macro2 = fbm(vWP.xz*.21 + 7.3);
      diffuseColor.rgb *= .88 + .24*macro;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.06,.98,.9), smoothstep(.45,.7,macro2));
      float edge = max(max(smoothstep(1.6,0.,abs(vWP.x+4.)), smoothstep(1.,0.,abs(vWP.x-5.6))),
                   max(smoothstep(1.,0.,abs(vWP.x-14.4)), smoothstep(1.4,0.,abs(vWP.z+64.))));
      edge = max(edge, smoothstep(1.4,0.,abs(vWP.x-16.5)));
      float n = fbm(vWP.xz*.17) + .25*fbm(vWP.xz*1.3) + .06*noise(vWP.xz*9.);
      float path = smoothstep(2.2, 0., abs(vWP.x-1.)) * step(-44., vWP.z);
      float sv = n + edge*.55 - path*.18;
      float snowM = smoothstep(.6, .76, sv);
      float crust = smoothstep(.6,.68,sv) * (1.-smoothstep(.68,.8,sv));
      vec3 snowC = vec3(.74,.8,.93) * (.9 + .12*noise(vWP.xz*6.)) + crust*.06;
      float spark = step(.985, fract(sin(dot(floor(vWP.xz*55.), vec2(12.9898,78.233)))*43758.5)) * snowM;
      snowC += spark * .9;
      diffuseColor.rgb = mix(diffuseColor.rgb, snowC, snowM);
      float wet = max(smoothstep(.5,.6, n) * (1.-snowM), smoothstep(.5,.6,sv) * (1.-smoothstep(.6,.66,sv)) * .9);
      diffuseColor.rgb *= 1. - wet*.3;
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, .35, wet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(mix(normal, normalize(vNormal), snowM));`);
  };
  const addGround = (x0, x1, z0, z1) => {
    const g = new T.PlaneGeometry(x1 - x0, z1 - z0, 1, 1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3.0, p.getZ(i) / 3.0);
    const m = new T.Mesh(g, groundMat); m.receiveShadow = true; M.scene.add(m);
  };
  addGround(-90, 5.6, -150, 90); addGround(14.4, 110, -150, 90); addGround(5.6, 14.4, -150, -44); addGround(5.6, 14.4, 30, 90);

  // ---- 雪堆 ----
  const pileGeo = new T.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  { const p = pileGeo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x);
      const k = 1 + 0.22 * (M.noise2(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + v.y * 2) - 0.5) + 0.08 * Math.sin(a * 5);
      p.setXYZ(i, v.x * k, v.y * (0.9 + 0.25 * M.noise2(v.x * 3 + 9, v.z * 3)), v.z * k); }
    pileGeo.computeVertexNormals(); }
  const piles = new T.InstancedMesh(pileGeo, M.mat.snow, 90);
  const r = M.rand(42), dm = new T.Object3D();
  const spots = [];
  for (let i = 0; i < 40; i++) spots.push([-3.6 + r() * 0.5, 17 - r() * 60]);
  for (let i = 0; i < 20; i++) spots.push([-11 + r() * 32, -63.5 + r() * 0.8]);
  for (let i = 0; i < 12; i++) spots.push([14.6 + r() * 1.2, 26 - r() * 68]);
  spots.forEach(([x, z], i) => {
    const s = 0.22 + r() * 0.4; dm.position.set(x, -0.02, z); dm.scale.set(s * (1 + r()), s * 0.32, s); dm.rotation.y = r() * 6;
    dm.updateMatrix(); piles.setMatrixAt(i, dm.matrix);
  });
  piles.count = spots.length; piles.receiveShadow = true; M.scene.add(piles);

  // ---- 降雪（着色器内绕相机循环）----
  const N = 3200, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = r() * 44 - 22; pos[i * 3 + 1] = r() * 22; pos[i * 3 + 2] = r() * 44 - 22; seed[i] = r(); }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(pos, 3)); sg.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
  const snowU = { uTime: { value: 0 }, uCam: { value: new T.Vector3() }, uScale: { value: 300 }, uAmount: { value: 1 } };
  const snow = new T.Points(sg, new T.ShaderMaterial({
    uniforms: snowU, transparent: true, depthWrite: false,
    vertexShader: `attribute float aSeed; uniform float uTime, uScale, uAmount; uniform vec3 uCam; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - uTime*(.6 + aSeed*.6), 22.);
        p.x += sin(uTime*(.5+aSeed) + aSeed*30.)*.6; p.z += cos(uTime*(.4+aSeed*.7) + aSeed*20.)*.4;
        p.xz = mod(p.xz - uCam.xz + 22., 44.) - 22. + uCam.xz;
        p.y += max(uCam.y - 11., -1.);
        vec4 mv = modelViewMatrix*vec4(p,1.);
        float dist = -mv.z;
        gl_PointSize = (0.035 + aSeed*.04) * uScale / max(dist, .1);
        vA = smoothstep(.3, 1.5, dist) * smoothstep(24., 10., dist) * step(aSeed, uAmount);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(.95), vA*smoothstep(.5,.15,d)*.85); }`
  }));
  snow.frustumCulled = false; snow.renderOrder = 5; M.scene.add(snow);

  // ---- 脚印 ----
  const fpMax = 200;
  const fp = new T.InstancedMesh(new T.CircleGeometry(0.06, 10), new T.MeshBasicMaterial({
    color: M.col('#3b4560'), transparent: true, opacity: 0.4, depthWrite: false }), fpMax);
  fp.count = 0; fp.renderOrder = 1; M.scene.add(fp);
  let fpi = 0;
  M.footprint = (x, z, heading) => {
    dm.position.set(x, 0.015, z); dm.rotation.set(-Math.PI / 2, 0, heading); dm.scale.set(1, 1.7, 1); dm.updateMatrix();
    fp.setMatrixAt(fpi, dm.matrix); fpi = (fpi + 1) % fpMax; fp.count = Math.min(fpMax, fp.count + 1); fp.instanceMatrix.needsUpdate = true;
  };

  M.onFrame(() => {
    skyU.uTime.value = M.time; snowU.uTime.value = M.time;
    sky.position.copy(M.camera.position); ring.position.x = M.camera.position.x; ring.position.z = M.camera.position.z;
    snowU.uCam.value.copy(M.camera.position);
    snowU.uScale.value = M.renderer.getPixelRatio() * innerHeight * 0.5;
  }, 90);
})();
