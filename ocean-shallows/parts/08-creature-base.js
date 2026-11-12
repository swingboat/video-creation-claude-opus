// ===== 08-creature-base.js =====
O.species = {};          // type -> { kind, name, size, make(c), update(c,dt), remove(c), canJump, minDepth, swimFrac }
O.creatures = [];
O.MAX_CREATURES = 48;
let creatureId = 0;

// ---- 影子（实例化软椭圆，位于水下层海床之上）----
(function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, depthWrite: false, color: 0x000000 });
  const geo = new THREE.PlaneGeometry(1, 1);
  const op = new Float32Array(64);
  geo.setAttribute('aOp', new THREE.InstancedBufferAttribute(op, 1));
  mat.onBeforeCompile = s => {
    s.vertexShader = 'attribute float aOp; varying float vOp;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOp = aOp;');
    s.fragmentShader = 'varying float vOp;\n' + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= vOp;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, 64);
  mesh.renderOrder = -5; mesh.frustumCulled = false; mesh.position.z = -7.9;
  O.underScene.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1);
  O.onFrame(() => {
    const sun = O.params.sunDir, kx = -sun.x / Math.max(sun.z, .25), ky = -sun.y / Math.max(sun.z, .25);
    let n = 0;
    for (const c of O.creatures) {
      if (n >= 64) break;
      const sp = O.species[c.type], dep = Math.max(O.depth(c.x, c.y), 0), h = c.z + dep;
      const [sx, sy] = sp.shadow ? sp.shadow(c) : [c.size, c.size * .6];
      const grow = 1 + h * .18;
      ps.set(c.x + kx * h, c.y + ky * h, 0); q.setFromAxisAngle(zA, c.heading);
      sc.set(sx * grow * Math.max(.3, Math.abs(Math.cos(c.roll || 0))), sy * grow, 1);
      m4.compose(ps, q, sc); mesh.setMatrixAt(n, m4);
      op[n] = .5 / (1 + h * .3) * Math.min(1, O.params.ambient + .35) * (c.fade ?? 1);
      n++;
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; geo.attributes.aOp.needsUpdate = true;
  }, 70);
})();

// ---- 生成 / 移除 / 计数 ----
O.spawn = (type, x, y, opts = {}) => {
  if (O.creatures.length >= O.MAX_CREATURES) { O.toast('海里太挤啦，先清空一些吧'); O.audio && O.audio.chime('deny'); return null; }
  const sp = O.species[type];
  const c = Object.assign({
    id: ++creatureId, type, kind: sp.kind, size: sp.size * (opts.scale || (.85 + Math.random() * .3)),
    x, y, z: -1, heading: Math.random() * Math.PI * 2, bank: 0, roll: 0, pitch: 0, speed: 0,
    state: 'swim', stateT: 0, fleeT: 0, wakeT: 0, seed: Math.random() * 100, fade: 1, jumpT: 20 + Math.random() * 40, above: false
  }, opts);
  c.z = opts.z ?? -Math.max(.2, O.depth(x, y) * (sp.swimFrac || .5));
  sp.make(c);
  O.creatures.push(c);
  O.updateCounter();
  return c;
};
O.removeCreature = c => {
  const i = O.creatures.indexOf(c); if (i < 0) return;
  O.creatures.splice(i, 1); O.species[c.type].remove(c); O.updateCounter();
};
O.clearAll = () => { O.creatures.forEach(c => { if (c.state !== 'held') { c.state = 'dying'; c.stateT = 0; } }); };
O.updateCounter = () => {
  let r = 0, j = 0, s = 0;
  O.creatures.forEach(c => { if (c.state === 'dying') return; if (c.kind === 'ray') r++; else if (c.kind === 'jelly') j++; else s++; });
  const parts = [];
  if (r) parts.push(r + ' 只鳐鱼'); if (j) parts.push(j + ' 只水母'); if (s) parts.push(s + ' 条鲨鱼');
  const el = document.getElementById('counter'); if (el) el.textContent = parts.length ? parts.join(' · ') : '海面空空如也';
};

// ---- 转向 ----
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
O.angDiff = angDiff;
O.steer = (c, dt, cfg) => {
  const minD = cfg.minDepth ?? .5;
  let dx = Math.cos(c.heading + Math.sin(O.time * (cfg.wanderRate || .25) + c.seed) * (cfg.wander ?? 1.1));
  let dy = Math.sin(c.heading + Math.sin(O.time * (cfg.wanderRate || .25) + c.seed) * (cfg.wander ?? 1.1));
  if (cfg.extra) { const e = cfg.extra(c); dx += e[0]; dy += e[1]; }
  // 避岸：探测前方水深
  const L = .9 + c.size;
  for (const a of [0, .5, -.5]) {
    const px = c.x + Math.cos(c.heading + a) * L, py = c.y + Math.sin(c.heading + a) * L, d = O.depth(px, py);
    if (d < minD) { const g = O.depthGrad(px, py), gl = Math.hypot(g[0], g[1]) || 1; const k = (minD - d) * 3 + .8; dx += g[0] / gl * k; dy += g[1] / gl * k; }
  }
  // 避屏幕边缘
  const m = 1.0, hw = O.W / 2 - m, hh = O.H / 2 - m;
  if (c.x > hw) dx -= (c.x - hw) * 2.5; if (c.x < -hw) dx += (-hw - c.x) * 2.5;
  if (c.y > hh) dy -= (c.y - hh) * 2.5; if (c.y < -hh) dy += (-hh - c.y) * 2.5;
  // 分离 + 鲨鱼排斥
  for (const o of O.creatures) {
    if (o === c || o.state === 'held' || o.state === 'dying') continue;
    const ox = c.x - o.x, oy = c.y - o.y, dd = Math.hypot(ox, oy) || 1e-3;
    const r = (c.size + o.size) * .7;
    if (dd < r) { dx += ox / dd * (r - dd) * 3; dy += oy / dd * (r - dd) * 3; }
    if (c.kind === 'ray' && o.kind === 'shark' && dd < 2.2) { dx += ox / dd * (2.2 - dd) * .9; dy += oy / dd * (2.2 - dd) * .9; }
  }
  // 漩涡（弱）
  const V = O.vortex; if (V.s > .01) { const vx = c.x - V.x, vy = c.y - V.y, r2 = vx * vx + vy * vy; const f = V.s * .6 * Math.exp(-r2 / 3); dx += -vy * f; dy += vx * f; }
  // 逃离
  if (c.fleeT > 0) { c.fleeT -= dt; dx += c.fleeX * 3; dy += c.fleeY * 3; }
  const want = Math.atan2(dy, dx), da = angDiff(c.heading, want);
  const maxTurn = (cfg.turnRate || 1.2) * (c.fleeT > 0 ? 2.2 : 1) * dt;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, da));
  c.heading += turn;
  c.bank += (Math.max(-.6, Math.min(.6, turn / Math.max(dt, 1e-3) * (cfg.bankK ?? .35))) - c.bank) * Math.min(1, dt * 4);
  const target = (cfg.speed || .5) * (c.fleeT > 0 ? (cfg.fleeMul || 2.5) : 1) * (cfg.speedMod ? cfg.speedMod(c) : 1);
  c.speed += (target - c.speed) * Math.min(1, dt * (c.fleeT > 0 ? 4 : 1.2));
  c.x += Math.cos(c.heading) * c.speed * dt; c.y += Math.sin(c.heading) * c.speed * dt;
  // 不允许上岸
  if (O.depth(c.x, c.y) < .12) { const g = O.depthGrad(c.x, c.y), gl = Math.hypot(g[0], g[1]) || 1; c.x += g[0] / gl * dt * .8; c.y += g[1] / gl * dt * .8; }
  // 游动深度
  const dep = Math.max(O.depth(c.x, c.y), .1), tz = cfg.targetZ ? cfg.targetZ(c, dep) : -dep * (O.species[c.type].swimFrac || .5);
  c.z += (Math.max(tz, -dep + .06) - c.z) * Math.min(1, dt * 1.5);
};
O.scare = (c, px, py, strength = 1) => {
  const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy) || 1;
  const a = Math.atan2(dy, dx) + (Math.random() - .5) * 1.2;
  c.fleeX = Math.cos(a); c.fleeY = Math.sin(a); c.fleeT = 1.5 * strength;
  if (c.state === 'rest') { c.state = 'swim'; O.fx && O.fx.silt(c.x, c.y); }
  O.sim.drop(c.x, c.y, .25 * c.size, .12); O.bio.add(c.x, c.y, .5 * c.size, .7);
  const sp = O.species[c.type]; if (sp.onScare) sp.onScare(c);
};

// ---- 通用状态机（每帧，在物种 update 之前）----
const easeOut = t => 1 - (1 - t) * (1 - t);
O.baseUpdate = (c, dt) => {
  c.stateT += dt;
  const sp = O.species[c.type];
  switch (c.state) {
    case 'thrown': {
      const T = c.flyT, t = Math.min(1, c.stateT / T);
      c.x = c.x0 + (c.x1 - c.x0) * t; c.y = c.y0 + (c.y1 - c.y0) * t;
      c.z = c.z0 * (1 - t) + 4 * c.arc * t * (1 - t);
      c.heading = Math.atan2(c.y1 - c.y0, c.x1 - c.x0); c.roll += dt * 5; c.pitch = (.5 - t) * 1.2;
      if (t >= 1) { c.state = 'drop'; c.stateT = 0; c.roll = 0; c.pitch = 0; c.speed = .3; O.fx.splash(c.x, c.y, c.size * 1.2); }
      return true;
    }
    case 'held': {
      const p = O.heldTarget || O.pointer;
      c.x += (p.x - c.x) * Math.min(1, dt * 10); c.y += (p.y - c.y) * Math.min(1, dt * 10);
      c.z += (1.5 - c.z) * Math.min(1, dt * 6); c.roll *= .9; c.pitch = Math.sin(O.time * 2) * .1; c.bank *= .9;
      return true;
    }
    case 'drop': {
      const dep = Math.max(O.depth(c.x, c.y), .1), tz = -dep * (sp.swimFrac || .5);
      c.z += (tz - c.z) * Math.min(1, dt * 2.5);
      if (c.z > 0) c.z -= dt * 3;
      if (c.stateT > .7) { c.state = 'swim'; c.stateT = 0; }
      return false;
    }
    case 'jump': {
      if (c.jumpPhase === 0) {
        c.z += (0.05 - c.z) * Math.min(1, dt * 3); c.speed += (sp.cfg.speed * 2.2 - c.speed) * dt * 3;
        c.x += Math.cos(c.heading) * c.speed * dt; c.y += Math.sin(c.heading) * c.speed * dt;
        if (c.z > -.08 || c.stateT > 2) { c.jumpPhase = 1; c.stateT = 0; O.fx.splash(c.x, c.y, c.size * .6); }
      } else {
        const T = 1.1, t = Math.min(1, c.stateT / T);
        c.z = 4 * 1.3 * t * (1 - t); c.roll = easeOut(t) * Math.PI * 2 * c.jumpDir;
        c.pitch = (.5 - t) * .9;
        c.x += Math.cos(c.heading) * c.speed * dt; c.y += Math.sin(c.heading) * c.speed * dt;
        if (t >= 1) { c.state = 'drop'; c.stateT = 0; c.roll = 0; c.pitch = 0; O.fx.splash(c.x, c.y, c.size * 1.4); }
      }
      return true;
    }
    case 'dying': {
      c.fade = Math.max(0, 1 - c.stateT / .8); c.z -= dt * .8;
      if (c.stateT > .8) { O.removeCreature(c); }
      return true;
    }
  }
  // 跃出水面的机会
  if (sp.canJump && c.state === 'swim') {
    c.jumpT -= dt;
    if (c.jumpT < 0) { c.jumpT = 25 + Math.random() * 35; if (O.depth(c.x, c.y) > 1.2) { c.state = 'jump'; c.stateT = 0; c.jumpPhase = 0; c.jumpDir = Math.random() < .5 ? 1 : -1; } }
  }
  return false;
};

// ---- 尾迹 / 荧光 ----
O.wake = (c, dt) => {
  c.wakeT -= dt;
  if (c.wakeT > 0) return;
  c.wakeT = .07;
  const sp = Math.min(1.5, c.speed);
  if (c.z > -.35 && c.z < .1) O.sim.drop(c.x, c.y, .14 * c.size + .05, .018 * sp * c.size + .004);
  if (O.params.bio > .02 && sp > .05) O.bio.add(c.x, c.y, .22 * c.size, .05 + .12 * sp * Math.max(0, 1 + c.z * .5));
};

// ---- 抛入 / 拖动 ----
O.throwCreature = (type, sx, sy) => {
  const [x0, y0] = O.toWorld(sx, sy), [x1, y1] = O.randomWater(1.0);
  const c = O.spawn(type, x0, y0, { z: 2.4 });
  if (!c) return null;
  Object.assign(c, { state: 'thrown', stateT: 0, x0, y0, z0: 2.4, x1, y1, arc: 2.2, flyT: .9 + Math.hypot(x1 - x0, y1 - y0) * .04 });
  O.audio && O.audio.chime('spawn');
  return c;
};
O.holdCreature = (type, x, y) => {
  const c = O.spawn(type, x, y, { z: 1.5 });
  if (c) { c.state = 'held'; c.stateT = 0; O.audio && O.audio.chime('spawn'); }
  return c;
};
O.releaseCreature = c => {
  if (!c || c.state !== 'held') return;
  if (O.depth(c.x, c.y) < .5) { for (let i = 0; i < 60; i++) { const a = i * 2.4, r = .2 + i * .08, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (O.depth(x, y) > .7 && Math.abs(x) < O.W / 2 - .5 && Math.abs(y) < O.H / 2 - .5) { c.x = x; c.y = y; break; } } }
  Object.assign(c, { state: 'thrown', stateT: 0, x0: c.x, y0: c.y, z0: c.z, x1: c.x, y1: c.y, arc: .25, flyT: .35 });
};

// ---- 指针：生物触碰（优先级 30）/ 水面涟漪（优先级 10）----
O.addInput({ prio: 30, down(p) {
  let best = null, bd = 1e9;
  for (const c of O.creatures) { if (c.state === 'dying' || c.state === 'held') continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < c.size * .8 && d < bd) { bd = d; best = c; } }
  if (!best) return false;
  O.scare(best, p.x, p.y, 1.2); O.audio && O.audio.splash(.25);
  return true;
} });
O.addInput({ prio: 10,
  down(p) { O.sim.drop(p.x, p.y, .18, .35); O.bio.add(p.x, p.y, .4, .8); O.audio && O.audio.splash(.2); this.lx = p.x; this.ly = p.y; return true; },
  move(p) {
    const d = Math.hypot(p.x - this.lx, p.y - this.ly); if (d < .12) return;
    this.lx = p.x; this.ly = p.y; O.sim.drop(p.x, p.y, .12, .08); O.bio.add(p.x, p.y, .3, .35);
    for (const c of O.creatures) if (c.state !== 'held' && Math.hypot(c.x - p.x, c.y - p.y) < c.size * .9 + .3) O.scare(c, p.x, p.y, .8);
  }
});

// ---- 主更新 ----
O.onFrame(dt => {
  for (const c of O.creatures.slice()) {
    const sp = O.species[c.type];
    const skip = O.baseUpdate(c, dt);
    sp.update(c, dt, skip);
    c.above = c.z > .02;
    if (!skip || c.state === 'jump') O.wake(c, dt);
  }
}, 40);
