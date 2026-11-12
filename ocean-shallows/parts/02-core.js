// ===== 02-core.js =====
const O = window.O = {};
O.H = 10; O.W = 10; O.S = 10; O.time = 0; O.dt = 0.016; O.quality = 1;
O.params = {};
(function () {
  const ev = {};
  O.on = (n, f) => (ev[n] = ev[n] || []).push(f);
  O.emit = (n, ...a) => (ev[n] || []).forEach(f => f(...a));
  const frames = [];
  O.onFrame = (fn, order = 50) => { frames.push({ fn, order }); frames.sort((a, b) => a.order - b.order); };
  O._runFrame = (dt, t) => { for (const f of frames) f.fn(dt, t); };
})();

// ---- 渲染器 ----
const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch (e) { document.getElementById('err').style.display = 'flex'; throw e; }
renderer.autoClear = false;
O.renderer = renderer;
const gl = renderer.getContext();
O.isGL2 = renderer.capabilities.isWebGL2;
O.floatType = (() => {
  const ext = n => !!gl.getExtension(n);
  if (O.isGL2 && ext('EXT_color_buffer_float')) return THREE.HalfFloatType;
  if (!O.isGL2 && ext('OES_texture_half_float') && ext('EXT_color_buffer_half_float')) return THREE.HalfFloatType;
  if (ext('OES_texture_float') && (O.isGL2 || ext('WEBGL_color_buffer_float'))) return THREE.FloatType;
  return THREE.UnsignedByteType;
})();
O.floatLinear = O.floatType === THREE.HalfFloatType ? (O.isGL2 || !!gl.getExtension('OES_texture_half_float_linear')) : !!gl.getExtension('OES_texture_float_linear');

O.makeRT = (w, h, o = {}) => {
  const filt = o.linear !== false && (!o.float || O.floatLinear) ? THREE.LinearFilter : THREE.NearestFilter;
  return new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    type: o.float ? O.floatType : THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: filt, magFilter: filt, depthBuffer: !!o.depth, stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping
  });
};
const fsCam = new THREE.Camera();
const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
fsMesh.frustumCulled = false;
const fsScene = new THREE.Scene(); fsScene.add(fsMesh);
O.fsPass = (mat, rt, clear = true) => {
  fsMesh.material = mat;
  renderer.setRenderTarget(rt || null);
  if (clear) renderer.clear();
  renderer.render(fsScene, fsCam);
};
O.FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

// ---- 共享 uniform（所有材质引用同一对象） ----
O.U = {
  uTime: { value: 0 }, uW: { value: 10 }, uH: { value: 10 }, uS: { value: 10 },
  uReef: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0.01, 0)) },
  uLagoon: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.25, -0.35, 1).normalize() }
};

// ---- 噪声 + 岸线 + 水深（GLSL 与 JS 同一公式） ----
O.glsl = {};
O.glsl.common = `
uniform float uTime, uW, uH, uS, uLagoon; uniform vec4 uReef[24]; uniform vec3 uSunDir;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = mat2(1.6,1.2,-1.2,1.6)*p + 3.1; a *= .5; } return s; }
vec2 voronoi(vec2 p){ vec2 n = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o = hash22(n+g);
    float d = length(g + o - f); if(d < d1){ d2 = d1; d1 = d; } else if(d < d2) d2 = d; }
  return vec2(d1, d2); }
float shoreDist(vec2 p){ vec2 q = p - vec2(-uW*.5, uH*.5); float th = atan(-q.y, q.x);
  float R = uS*(.34 + .05*sin(3.*th + .7) + .03*sin(7.*th)); return length(q) - R; }
float reefBumps(vec2 p){ float h = 0.; for(int i=0;i<24;i++){ vec4 r = uReef[i]; float d = length(p - r.xy);
  h = max(h, r.w * smoothstep(r.z, r.z*.3, d)); } return h; }
float depthAt(vec2 p){ float sd = shoreDist(p); if(sd < 0.) return sd*.6;
  float s = sd; float d = .08 + 3.6*(1. - exp(-s/(.22*uS))) + .35*fbm(p*.35) - .175;
  float rq = (s - .55*uS)/(.06*uS); float ring = exp(-rq*rq);
  d = mix(d, d*.6, uLagoon); d = mix(d, min(d, .55), uLagoon*ring);
  return max(d - reefBumps(p), .05); }
`;
const fract = x => x - Math.floor(x);
O.hash12 = (x, y) => { let a = fract(x * .1031), b = fract(y * .1031), c = fract(x * .1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; return fract((a + b) * c); };
O.vnoise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const h = O.hash12;
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy; };
O.fbm = (x, y) => { let s = 0, a = .5; for (let i = 0; i < 4; i++) { s += a * O.vnoise(x, y);
  const nx = 1.6 * x - 1.2 * y + 3.1, ny = 1.2 * x + 1.6 * y + 3.1; x = nx; y = ny; a *= .5; } return s; };
O.shoreDist = (x, y) => { const qx = x + O.W * .5, qy = y - O.H * .5, th = Math.atan2(-qy, qx);
  return Math.hypot(qx, qy) - O.S * (.34 + .05 * Math.sin(3 * th + .7) + .03 * Math.sin(7 * th)); };
O.reefBumps = (x, y) => { let h = 0; for (const r of O.U.uReef.value) { const d = Math.hypot(x - r.x, y - r.y);
  const t = Math.min(1, Math.max(0, (d - r.z) / (r.z * .3 - r.z))); h = Math.max(h, r.w * t * t * (3 - 2 * t)); } return h; };
O.depth = (x, y) => { const sd = O.shoreDist(x, y); if (sd < 0) return sd * .6; const S = O.S, L = O.U.uLagoon.value;
  let d = .08 + 3.6 * (1 - Math.exp(-sd / (.22 * S))) + .35 * O.fbm(x * .35, y * .35) - .175;
  const ring = Math.exp(-Math.pow((sd - .55 * S) / (.06 * S), 2));
  d = d + (d * .6 - d) * L; d = d + (Math.min(d, .55) - d) * L * ring;
  return Math.max(d - O.reefBumps(x, y), .05); };
O.depthGrad = (x, y) => { const e = .08; return [(O.depth(x + e, y) - O.depth(x - e, y)) / (2 * e), (O.depth(x, y + e) - O.depth(x, y - e)) / (2 * e)]; };
O.isWater = (x, y, min = .3) => O.depth(x, y) > min;

// ---- 随机数（可复现） ----
O.rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
O.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
O.randomWater = (min = .8, tries = 80) => {
  for (let i = 0; i < tries; i++) { const x = O.rand(-O.W * .45, O.W * .45), y = O.rand(-O.H * .42, O.H * .42); if (O.depth(x, y) > min) return [x, y]; }
  return [O.W * .25, -O.H * .2];
};
function genReefs() {
  const r = O.rng(7), arr = O.U.uReef.value; let k = 0;
  const maxN = Math.max(8, Math.min(arr.length, Math.round(arr.length * O.W * O.H / 144)));
  for (let i = 0; i < 400 && k < maxN; i++) {
    const x = (r() - .5) * O.W * .96, y = (r() - .5) * O.H * .96, sd = O.shoreDist(x, y);
    if (sd < .12 * O.S || sd > .9 * O.S) continue;
    if (arr.slice(0, k).some(v => Math.hypot(v.x - x, v.y - y) < v.z + .5)) continue;
    const rad = .22 + r() * .38; arr[k++].set(x, y, rad, (.6 + r() * .8) * Math.min(1, sd / (.35 * O.S)));
  }
  for (; k < arr.length; k++) arr[k].set(1e4, 1e4, .01, 0);
}

// ---- 尺寸 ----
O.camMain = new THREE.OrthographicCamera(-5, 5, 5, -5, -50, 50);
O.camMain.position.set(0, 0, 10); O.camMain.lookAt(0, 0, 0);
O.qScale = 1;
O.resize = () => {
  const w = innerWidth, h = innerHeight;
  O.W = O.H * w / h; O.S = Math.min(O.W, O.H);
  O.U.uW.value = O.W; O.U.uH.value = O.H; O.U.uS.value = O.S;
  genReefs();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * O.qScale);
  renderer.setSize(w, h, false);
  const c = O.camMain; c.left = -O.W / 2; c.right = O.W / 2; c.top = O.H / 2; c.bottom = -O.H / 2; c.updateProjectionMatrix();
  O.emit('resize', w, h);
};
let rsT = 0; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(O.resize, 120); });

// ---- 指针 ----
O.toWorld = (cx, cy) => [(cx / innerWidth - .5) * O.W, (.5 - cy / innerHeight) * O.H];
O.toScreen = (x, y) => [(x / O.W + .5) * innerWidth, (.5 - y / O.H) * innerHeight];
O.pointer = { x: 0, y: 0, down: false, vx: 0, vy: 0, id: null };
const handlers = []; // {prio, down(p)->bool, move(p), up(p)}
O.addInput = h => { handlers.push(h); handlers.sort((a, b) => b.prio - a.prio); };
let active = null, lastMove = 0;
canvas.addEventListener('pointerdown', e => {
  const [x, y] = O.toWorld(e.clientX, e.clientY); Object.assign(O.pointer, { x, y, down: true, id: e.pointerId, vx: 0, vy: 0 });
  O.emit('userGesture');
  active = handlers.find(h => h.down && h.down(O.pointer)) || null;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', e => {
  const [x, y] = O.toWorld(e.clientX, e.clientY), now = performance.now(), dt = Math.max(1, now - lastMove) / 1000;
  const p = O.pointer; p.vx = (x - p.x) / dt; p.vy = (y - p.y) / dt; p.x = x; p.y = y; lastMove = now;
  if (active && active.move) active.move(p); else O.emit('hover', p);
});
const endPtr = () => { O.pointer.down = false; if (active && active.up) active.up(O.pointer); active = null; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);

// ---- 自适应质量 ----
(function () {
  let acc = 0, n = 0, ema = 60, good = 0, cool = 0; const levels = [.6, .8, 1];
  O.onFrame(dt => {
    acc += dt; n++; cool -= dt; if (acc < .5) return;
    ema = ema * .6 + (n / acc) * .4; acc = 0; n = 0;
    if (document.hidden || cool > 0) return;
    let i = levels.indexOf(O.quality);
    if (ema < 45 && i > 0) { i--; good = 0; }
    else if (ema > 58) { good += .5; if (good >= 3 && i < 2) { i++; good = 0; } else return; }
    else { good = 0; return; }
    O.quality = levels[i]; O.qScale = O.quality === 1 ? 1 : O.quality === .8 ? .85 : .7; cool = 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * O.qScale); renderer.setSize(innerWidth, innerHeight, false);
    O.emit('quality', O.quality);
  }, 0);
})();

// ---- 提示 ----
O.toast = (msg, ms = 1600) => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(O._tt); O._tt = setTimeout(() => t.classList.remove('show'), ms); };
