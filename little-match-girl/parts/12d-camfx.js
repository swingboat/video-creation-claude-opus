// ===== 12d-camfx.js：镜头遮挡淡出（近相机 + 视线圆柱，抖动隐藏）=====
(() => {
  const U = { uNfCam: { value: new T.Vector3() }, uNfTgt: { value: new T.Vector3() }, uNfOn: { value: 1 } };
  M.camfx = { uniforms: U };
  const skip = new Set();
  [M.girl && M.girl.group, M.granny && M.granny.group, M.goose && M.goose.group].forEach(g => g && g.traverse(o => {
    if (o.material) [].concat(o.material).forEach(m => skip.add(m));
  }));
  const VERT_HEAD = 'varying vec3 vNfW;\nvarying float vNfD;\n';
  const VERT_BODY = `#include <project_vertex>
    vec4 nfW = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      nfW = instanceMatrix * nfW;
    #endif
    nfW = modelMatrix * nfW; vNfW = nfW.xyz; vNfD = -mvPosition.z;`;
  const FRAG_HEAD = `varying vec3 vNfW;\nvarying float vNfD;\nuniform vec3 uNfCam; uniform vec3 uNfTgt; uniform float uNfOn;
    float nfIGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }\n`;
  const FRAG_BODY = `#include <clipping_planes_fragment>
    if (uNfOn > 0.5 && vNfW.y > 0.12) {
      float hideK = 1.0 - smoothstep(1.1, 2.1, vNfD);
      vec3 ab = uNfTgt - uNfCam; float L = length(ab);
      float t = clamp(dot(vNfW - uNfCam, ab) / (L * L), 0.0, 1.0);
      float dl = length(vNfW - (uNfCam + ab * t));
      float front = step(t * L, L - 0.8);
      hideK = max(hideK, front * (1.0 - smoothstep(0.35, 0.6, dl)) * 0.92);
      if (hideK > 0.0 && nfIGN(gl_FragCoord.xy) < hideK) discard;
    }`;
  const patch = m => {
    if (skip.has(m) || m.userData.nf || m.isShaderMaterial || m.isRawShaderMaterial || m.isSpriteMaterial || m.isPointsMaterial) return;
    if (m.blending === T.AdditiveBlending) return;
    m.userData.nf = true;
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey();
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <project_vertex>', VERT_BODY);
      sh.fragmentShader = FRAG_HEAD + sh.fragmentShader.replace('#include <clipping_planes_fragment>', FRAG_BODY);
    };
    m.customProgramCacheKey = () => prevKey + '|nf';
    m.needsUpdate = true;
  };
  M.scene.traverse(o => { if (o.isMesh || o.isInstancedMesh) [].concat(o.material).forEach(patch); });
  M.camfx.patch = patch;
  M.onFrame(() => {
    U.uNfCam.value.copy(M.camera.position);
    U.uNfOn.value = M.story && M.story.started ? 1 : 0;
    const s = M.camfx.subject;
    if (s) U.uNfTgt.value.copy(s); else U.uNfTgt.value.set(M.girl.pos.x, 0.85, M.girl.pos.z);
  }, 72);
})();
