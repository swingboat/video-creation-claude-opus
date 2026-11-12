// ===== 02-core.js：命名空间、渲染器、工具、纹理、材质、碰撞、输入、光源池 =====
if (!window.THREE) {
  document.getElementById('start').textContent = '加载失败，请检查网络后刷新';
  throw new Error('three.js 加载失败');
}
const T = THREE;
const M = window.M = { T, time: 0, dt: 0, quality: 1 };

M.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
M.renderer.toneMapping = T.NoToneMapping;
M.renderer.shadowMap.enabled = true;
M.renderer.shadowMap.type = T.PCFSoftShadowMap;
M.pixelScale = 1;
M.setPixelRatio = () => M.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75) * M.pixelScale);
M.setPixelRatio();
M.renderer.setSize(innerWidth, innerHeight);
document.getElementById('app').appendChild(M.renderer.domElement);
M.scene = new T.Scene();
M.camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
M.scene.fog = new T.FogExp2(0x1b2440, 0.022);
M.scene.fog.color.convertSRGBToLinear();

// ---- 帧回调 ----
M._frames = [];
M.onFrame = (fn, order = 50) => { M._frames.push({ fn, order }); M._frames.sort((a, b) => a.order - b.order); };

// ---- 数学工具 ----
M.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
M.lerp = (a, b, t) => a + (b - a) * t;
M.smooth = (a, b, x) => { const t = M.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
M.damp = (cur, target, rate, dt) => M.lerp(cur, target, 1 - Math.exp(-rate * dt));
M.col = hex => new T.Color(hex).convertSRGBToLinear();
M.rand = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const _h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
M.noise2 = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = _h2(ix, iy), b = _h2(ix + 1, iy), c = _h2(ix, iy + 1), d = _h2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
M.fbm2 = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * M.noise2(x * f, y * f); f *= 2; a *= 0.5; } return s; };
// 周期为 p 的值噪声，用于可平铺贴图
M.noiseP = (x, y, p) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, w = v => ((v % p) + p) % p;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = _h2(w(ix), w(iy)), b = _h2(w(ix + 1), w(iy)), c = _h2(w(ix), w(iy + 1)), d = _h2(w(ix + 1), w(iy + 1));
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
M.glslNoise = `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+17.1; a*=.5; } return s; }
`;

// ---- Canvas 纹理工厂 ----
M.tex = {};
const _texCache = {};
function canvasTex(name, size, draw, opts = {}) {
  if (_texCache[name]) return _texCache[name];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new T.CanvasTexture(c);
  if (opts.srgb !== false) t.encoding = T.sRGBEncoding;
  t.wrapS = t.wrapT = opts.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping;
  t.anisotropy = 4;
  return (_texCache[name] = t);
}
M.canvasTex = canvasTex;
M.tex.cobble = () => canvasTex('cobble', 1024, (g, s) => {
  const r = M.rand(7); g.fillStyle = '#1c1c22'; g.fillRect(0, 0, s, s);
  const rows = 16, rh = s / rows;
  for (let y = 0; y < rows; y++) {
    let x = (y % 2) * rh * 0.5 - rh;
    while (x < s) {
      const w = rh * (0.75 + r() * 0.55), l = 34 + r() * 18, warm = r() < 0.55, hue = warm ? 22 + r() * 18 : 215 + r() * 15;
      const x0 = x + 2.5 + r() * 1.5, y0 = y * rh + 2.5 + r() * 1.5, ww = w - 5 - r() * 2, hh = rh - 5 - r() * 2;
      const cx = x0 + ww * (0.42 + r() * 0.12), cy = y0 + hh * 0.4;
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, Math.max(ww, hh) * 0.72);
      gr.addColorStop(0, `hsl(${hue},${5 + r() * 6}%,${l + 9}%)`);
      gr.addColorStop(0.65, `hsl(${hue},${4 + r() * 6}%,${l}%)`);
      gr.addColorStop(1, `hsl(${hue},6%,${l - 14}%)`);
      g.fillStyle = gr; g.beginPath();
      g.roundRect ? g.roundRect(x0, y0, ww, hh, 9 + r() * 5) : g.rect(x0, y0, ww, hh); g.fill();
      g.fillStyle = 'rgba(255,250,240,0.07)'; g.beginPath(); g.ellipse(cx, cy - hh * 0.12, ww * 0.28, hh * 0.13, 0, 0, Math.PI * 2); g.fill();
      x += w;
    }
  }
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * 0.06})`; g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(20,18,22,${0.3 + r() * 0.4})`; g.beginPath(); g.arc(r() * s, r() * s, 1 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
});
M.tex.plaster = () => canvasTex('plaster', 512, (g, s) => {
  const r = M.rand(11), img = g.createImageData(s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const u = x / s, v = y / s;
    const n = M.noiseP(u * 4, v * 4, 4) * 0.55 + M.noiseP(u * 11, v * 11, 11) * 0.3 + M.noiseP(u * 37, v * 37, 37) * 0.15;
    const streak = Math.max(0, M.noiseP(u * 48, 0.5, 48) - 0.55) * 2.2 * (1 - v) ** 1.5;
    const damp = Math.max(0, (v - 0.8) / 0.2) ** 1.6 * (0.6 + 0.4 * M.noiseP(u * 9, v * 3, 9));
    let k = 0.86 + (n - 0.5) * 0.22 - streak * 0.12 - damp * 0.3 + (r() - 0.5) * 0.05;
    k = Math.max(0, Math.min(1, k)); const i = (y * s + x) * 4;
    d[i] = 255 * k; d[i + 1] = 252 * k; d[i + 2] = 246 * k; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
M.tex.planks = () => canvasTex('planks', 256, (g, s) => {
  const r = M.rand(31); g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
  const n = 8, ph = s / n;
  for (let i = 0; i < n; i++) {
    const k = 0.82 + r() * 0.18; g.fillStyle = `rgba(${255 * k | 0},${246 * k | 0},${232 * k | 0},1)`; g.fillRect(0, i * ph, s, ph);
    for (let y = 0; y < ph; y += 2) { g.fillStyle = `rgba(70,40,18,${0.05 + 0.12 * M.noise2(y * 0.2 + i * 7, i)})`; g.fillRect(0, i * ph + y, s, 1); }
    g.fillStyle = 'rgba(25,12,5,0.65)'; g.fillRect(0, i * ph, s, 2);
    for (let x = 12 + r() * 20; x < s; x += 40 + r() * 30) { g.fillStyle = 'rgba(30,20,15,0.6)'; g.fillRect(x, i * ph + ph / 2 - 1, 2, 2); }
  }
});
M.tex.wood = () => canvasTex('wood', 256, (g, s) => {
  const r = M.rand(3); g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(60,35,15,${0.08 + 0.18 * M.noise2(y * 0.05, 0.5) + r() * 0.05})`; g.fillRect(0, y, s, 1.5); }
  for (let y = 0; y < s; y += 32) { g.fillStyle = 'rgba(20,10,5,0.5)'; g.fillRect(0, y, s, 2); }
});
M.tex.stone = () => canvasTex('stone', 512, (g, s) => {
  const r = M.rand(5); g.fillStyle = '#222'; g.fillRect(0, 0, s, s);
  const bh = s / 8;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const ox = (y % 2) * s / 8; g.fillStyle = `hsl(25,${8 + r() * 8}%,${38 + r() * 18}%)`;
    g.fillRect(x * s / 4 + ox + 3, y * bh + 3, s / 4 - 6, bh - 6);
  }
});
M.tex.soft = () => canvasTex('soft', 128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
}, { clamp: true, srgb: false });
M.tex.frost = () => canvasTex('frost', 1024, (g, s) => {
  const r = M.rand(21); g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineCap = 'round';
  const branch = (x, y, a, len, w, d) => {
    if (d > 6 || len < 4) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    branch(x2, y2, a + (r() - .5) * .5, len * .8, w * .8, d + 1);
    if (r() < .7) branch(x2, y2, a + (r() < .5 ? 1 : -1) * (.5 + r() * .6), len * .55, w * .6, d + 1);
  };
  for (let i = 0; i < 260; i++) {
    const e = r() * 4 | 0, t = r() * s, x = e === 0 ? 0 : e === 1 ? s : t, y = e === 2 ? 0 : e === 3 ? s : (e < 2 ? t : t);
    const a = Math.atan2(s / 2 - y, s / 2 - x) + (r() - .5) * 1.2;
    branch(e < 2 ? x : t, e < 2 ? t : y, a, 18 + r() * 40, 2.2, 0);
  }
  g.filter = 'blur(2.5px)'; g.drawImage(g.canvas, 0, 0);
}, { clamp: true, srgb: false });

// ---- 材质 ----
M.mat = {};
const _matCache = {};
M.mat.std = (color, rough = 0.85, opts = {}) => {
  const key = color + '|' + rough + '|' + (opts.map ? opts.map.uuid : '') + (opts.key || '');
  if (_matCache[key] && !opts.unique) return _matCache[key];
  const m = new T.MeshStandardMaterial({ color: M.col(color), roughness: rough, metalness: opts.metal || 0, map: opts.map || null,
    flatShading: !!opts.flat, side: opts.side || T.FrontSide });
  if (opts.emissive) { m.emissive = M.col(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  return opts.unique ? m : (_matCache[key] = m);
};
M.mat.emissive = (color, intensity = 1) => new T.MeshBasicMaterial({ color: M.col(color).multiplyScalar(intensity) });
M.mat.snow = M.mat.std('#e4ebf7', 0.62);

// ---- 可行走区域与碰撞 ----
M.colliders = [];
M.walkable = (x, z) =>
  (x >= -3.5 && x <= 5.6 && z >= -44 && z <= 18) ||
  (x >= -12 && x <= 22 && z >= -64 && z <= -44) ||
  (x >= 5.6 && x <= 14.4 && z >= -21.3 && z <= -18.7) ||
  (x >= 14.4 && x <= 16 && z >= -44 && z <= 28);
M.groundY = () => 0;
M.collide = (p, r) => {
  for (const c of M.colliders) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
  }
};

// ---- 输入：点击 / 拖动 / 缩放 ----
M.input = { _tap: [], _drag: [], _zoom: [] };
M.input.onTap = f => M.input._tap.push(f);
M.input.onDrag = f => M.input._drag.push(f);
M.input.onZoom = f => M.input._zoom.push(f);
(() => {
  const el = M.renderer.domElement, pts = new Map();
  let down = null, pinch = 0;
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); down = null; }
  });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      M.input._zoom.forEach(f => f((pinch - d) * 0.02)); pinch = d; return;
    }
    if (down) { down.moved += Math.abs(dx) + Math.abs(dy); if (down.moved > 6) M.input._drag.forEach(f => f(dx, dy)); }
  });
  const up = e => {
    if (down && pts.size === 1 && down.moved <= 6 && performance.now() - down.t < 400)
      M.input._tap.forEach(f => f(e.clientX, e.clientY));
    pts.delete(e.pointerId); if (pts.size === 0) down = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); down = null; });
  el.addEventListener('wheel', e => { e.preventDefault(); M.input._zoom.forEach(f => f(e.deltaY * 0.01)); }, { passive: false });
})();

// ---- 光源：地面假光斑 + 点光池 + 暖源 ----
M.lights = { _pool: [], pools: [] };
M.lights.pool = (x, z, color = '#ffb26b', r = 4.5, intensity = 1) => {
  const m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2), new T.MeshBasicMaterial({
    map: M.tex.soft(), color: M.col(color).multiplyScalar(intensity * 0.28), transparent: true,
    blending: T.AdditiveBlending, depthWrite: false, fog: true }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.025, z); m.renderOrder = 2;
  m.userData.base = intensity; M.scene.add(m); M.lights.pools.push(m); return m;
};
for (let i = 0; i < 4; i++) { const l = new T.PointLight(0xffffff, 0, 8, 2); l.userData.free = true; M.scene.add(l); M.lights._pool.push(l); }
M.lights.point = (color, intensity, dist = 8) => {
  const l = M.lights._pool.find(l => l.userData.free); if (!l) return null;
  l.userData.free = false; l.color.copy(M.col(color)); l.intensity = intensity; l.distance = dist; return l;
};
M.lights.release = l => { if (l) { l.intensity = 0; l.userData.free = true; } };
M.warm = { list: [] };
M.warm.add = w => (M.warm.list.push(w), w);
M.warm.at = (x, z) => {
  let s = 0; for (const w of M.warm.list) { const d = Math.hypot(x - w.x, z - w.z); s += w.power * M.smooth(w.r, w.r * 0.3, d); }
  return M.clamp(s, 0, 1);
};
