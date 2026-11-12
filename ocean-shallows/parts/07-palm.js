// ===== 07-palm.js =====
(function () {
  const group = new THREE.Group(), shadowGroup = new THREE.Group();
  const shadowScene = new THREE.Scene(); shadowScene.add(shadowGroup);
  O.aboveScene.add(group);
  const U = { uTime: O.U.uTime, uSunDir: O.U.uSunDir, uSunCol: O.SU.uSunCol, uAmbient: O.SU.uAmbient, uSky: O.SU.uSky,
    uWind: { value: new THREE.Vector2() }, uTex: { value: null } };

  // 叶片纹理：羽状小叶
  const lc = document.createElement('canvas'); lc.width = 256; lc.height = 64;
  (function () {
    const c = lc.getContext('2d');
    c.strokeStyle = '#fff'; c.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = 8 + i * 5.3, t = x / 256, len = 28 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 3;
      c.lineWidth = 3.2 - t * 2;
      c.beginPath(); c.moveTo(x, 32); c.quadraticCurveTo(x + 6, 32 - len * .6, x + 10, 32 - len); c.stroke();
      c.beginPath(); c.moveTo(x, 32); c.quadraticCurveTo(x + 6, 32 + len * .6, x + 10, 32 + len); c.stroke();
    }
    c.lineWidth = 3; c.beginPath(); c.moveTo(0, 32); c.lineTo(250, 32); c.stroke();
  })();
  U.uTex.value = new THREE.CanvasTexture(lc);

  const SWAY = `
    attribute float aFlex; attribute float aLeaf;
    uniform float uTime; uniform vec2 uWind; uniform vec3 uSunDir;
    vec3 sway(vec3 p){
      float h = clamp(p.z / 2.3, 0., 1.);
      p.xy += uWind * h * h;
      float fl = sin(uTime * 5.3 + aLeaf * 1.7 + p.x * 3.) * .045 + sin(uTime * 8.1 + aLeaf * 2.9) * .02;
      p.xy += (uWind * .9 + vec2(fl)) * aFlex;
      p.z += fl * aFlex * 1.5;
      return p;
    }`;
  const mkMat = (shadow, leaf) => new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide, transparent: false, depthWrite: true,
    vertexShader: SWAY + `varying vec2 vUv; varying float vH;
      void main(){ vUv = uv; vec3 p = sway((modelMatrix * vec4(position, 1.)).xyz); vH = p.z;
        ${shadow ? 'p.xy -= uSunDir.xy / max(uSunDir.z, .2) * p.z; p.z = 0.;' : ''}
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uSunCol, uSky; uniform float uAmbient, uTime; varying vec2 vUv; varying float vH;
      void main(){
        ${leaf ? 'float a = texture2D(uTex, vUv).a; if(a < .5) discard;' : ''}
        ${shadow ? 'gl_FragColor = vec4(1.); return;' : ''}
        vec3 c = ${leaf ? 'mix(vec3(.025,.09,.02), vec3(.1,.22,.045), vUv.x * .5 + vUv.y * .3) * (.8 + .25 * vH / 2.4)' : 'vec3(.42,.32,.2) * (.75 + .25 * sin(vUv.x * 160.)) * (.8 + .2 * vUv.y)'};
        vec3 L = uSunCol * .85 + uSky * .3;
        gl_FragColor = vec4(c * L * (.35 + .65 * uAmbient) * (.75 + .35 * vH / 2.4), 1.);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1. / 2.2));
      }`
  });
  const trunkMat = mkMat(false, false), leafMat = mkMat(false, true);
  const trunkSh = mkMat(true, false), leafSh = mkMat(true, true);

  function build() {
    [group, shadowGroup].forEach(g => { while (g.children.length) { const m = g.children.pop(); m.geometry.dispose(); } });
    const bx = -O.W / 2 + .16 * O.S, by = O.H / 2 - .13 * O.S, K = Math.min(1, Math.max(.5, O.S / 10));
    const dir = new THREE.Vector2(1, -1).normalize(), lean = .9 * K;
    const top = new THREE.Vector3(bx + dir.x * lean, by + dir.y * lean, 2.3);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bx, by, 0), new THREE.Vector3(bx + dir.x * .15 * K, by + dir.y * .15 * K, .8),
      new THREE.Vector3(bx + dir.x * .45 * K, by + dir.y * .45 * K, 1.6), top]);
    const tg = new THREE.TubeGeometry(curve, 24, .085 * K, 8, false);
    const tp = tg.attributes.position, n = tp.count;
    // 树干逐渐变细：按高度收缩到中心线
    for (let i = 0; i < n; i++) {
      const z = tp.getZ(i), c = curve.getPoint(Math.min(1, Math.max(0, z / 2.3))), k = 1 - .45 * Math.max(0, z) / 2.3;
      tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * k, c.y + (tp.getY(i) - c.y) * k, z);
    }
    tg.setAttribute('aFlex', new THREE.BufferAttribute(new Float32Array(n), 1));
    tg.setAttribute('aLeaf', new THREE.BufferAttribute(new Float32Array(n), 1));
    group.add(new THREE.Mesh(tg, trunkMat)); shadowGroup.add(new THREE.Mesh(tg, trunkSh));

    const leaves = [], N = 9, rnd = O.rng(5);
    for (let i = 0; i < N; i++) {
      const len = (1.15 + rnd() * .4) * K, g = new THREE.PlaneGeometry(len, .5 * K, 18, 2);
      const p = g.attributes.position, cnt = p.count, flex = new Float32Array(cnt), lf = new Float32Array(cnt);
      const ang = i / N * Math.PI * 2 + rnd() * .3, droop = .5 + rnd() * .25, twist = (rnd() - .5) * .6;
      for (let j = 0; j < cnt; j++) {
        const x = p.getX(j) + len / 2, y = p.getY(j), t = x / len;
        const z = x * .55 - x * x * droop - Math.abs(y) * .25;
        const cx = Math.cos(ang), sy = Math.sin(ang);
        const yy = y * Math.cos(twist), zz = z + y * Math.sin(twist);
        p.setXYZ(j, top.x + cx * x - sy * yy, top.y + sy * x + cx * yy, top.z + zz);
        flex[j] = t * t; lf[j] = i;
      }
      g.setAttribute('aFlex', new THREE.BufferAttribute(flex, 1)); g.setAttribute('aLeaf', new THREE.BufferAttribute(lf, 1));
      g.computeVertexNormals(); leaves.push(g);
    }
    leaves.forEach(g => { group.add(new THREE.Mesh(g, leafMat)); shadowGroup.add(new THREE.Mesh(g, leafSh)); });
    group.children.forEach(m => { m.frustumCulled = false; m.renderOrder = 20; });
    shadowGroup.children.forEach(m => m.frustumCulled = false);
  }
  O.on('resize', build);

  O.onFrame((dt, t) => {
    const w = .07 + .04 * Math.sin(t * .23);
    U.uWind.value.set(Math.sin(t * .9) * w + Math.sin(t * 2.1) * .015 + w * .6, Math.cos(t * .7) * w * .5 - w * .3);
    if (!O.shadowRT) return;
    renderer.setRenderTarget(O.shadowRT);
    renderer.setClearColor(0x000000, 1); renderer.clear();
    renderer.render(shadowScene, O.camMain);
  }, 85);
  O.palm = { group };
})();
