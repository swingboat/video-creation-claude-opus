# 0b · 渲染核心、后期、特效

## 02-core.js

- `const T = THREE; const M = window.M = {T}`。
- renderer：`antialias:false, powerPreference:'high-performance'`；`toneMapping = NoToneMapping`（场景渲进线性 HDR RT，
  ACES + sRGB 在 03 合成 shader 里做）；`shadowMap.enabled, PCFSoftShadowMap`；颜色常量用 `new T.Color(hex).convertSRGBToLinear()`；
  pixelRatio = min(devicePixelRatio, 1.75) * qualityScale；canvas 插入 `#app`。
- `M.scene`（background 由天空穹顶负责）、`M.camera = PerspectiveCamera(50, aspect, 0.1, 400)`。
- 帧循环由 14 驱动；`M.onFrame(fn, order=50)` 注册，存数组按 order 排序。
- 工具：`M.clamp, M.lerp, M.smooth(a,b,x), M.damp(cur, target, rate, dt)`，`M.rand(seed)` = mulberry32，
  `M.noise2(x,y)` 值噪声 + `M.fbm2(x,y,oct)`。GLSL 噪声片段 `M.glslNoise`（hash、noise、fbm）供 shader 拼接。
- 纹理工厂 `M.tex`（全部 CanvasTexture，懒加载缓存，sRGB，各向异性 4）：
  `cobble()`、`plaster()`、`wood()`、`stone()`、`soft()`（径向渐变圆点）、`frost()`（屏幕边缘冰花：随机分叉线段 + 模糊）、
  `glow()`（暖色光晕）、`sign()`（面包房招牌）。
- 材质 `M.mat.std(color, rough=0.85, opts)` 缓存同色材质；`M.mat.emissive(color, intensity)`；`M.mat.snow`。
- 碰撞：`M.colliders=[]`；`M.walkable(x,z)` 按 00 架构矩形并集；`M.collide(p, r)` 推出圆形碰撞体。
- 输入 `M.input`：pointerdown/move/up 统一处理鼠标与单指；双指捏合；wheel；判断点击（位移<6px 且时长<400ms）。
  回调注册 `onTap(fn)`, `onDrag(fn(dx,dy))`, `onZoom(fn(delta))`。按钮、UI 元素上的事件不传入（target 检查 canvas）。
- `M.lights.pool(x,z,color,r,intensity=1)`：在 y=0.02 放加法混合平面（`M.tex.soft()`），depthWrite=false，返回 mesh；
  `M.lights.point(color, intensity, dist)`：从 4 盏 PointLight 池中取（预先创建并加入场景、默认 intensity 0，避免 shader 重编译）。
- `M.warm.add({x,z,r,power})`，`M.warm.at(x,z)` → 0..1 求和截断。

## 03-post.js

- RT：`rtScene`（全分辨率，DepthTexture，HalfFloatType 线性 HDR），
  `rtA/rtB` 半分辨率、`rtC/rtD` 四分之一分辨率。
- 全屏三角形 + 正交相机；pass：
  1. `bright`：rtScene → rtA，阈值 1.0（线性 HDR），软膝 0.5；
  2. `blur`：rtA ↔ rtB 两次可分离 9-tap 高斯；降采样到 rtC ↔ rtD 再两次；
  3. `composite` → 屏幕：
     - `col = scene + bloomA*0.55 + bloomC*0.75`；
     - 景深：线性化深度，`coc = smoothstep(focus+4, focus+30, z)`（只做远景虚化）+ 近景 `smoothstep(focus-3, 0.5, z)*0.6`，
       `col = mix(col, blurA(低频版本), coc*0.85)`（blurA 用 rtB 未加亮度阈值的版本：额外 pass `down` 把 scene 拷入 rtB 再模糊）；
     - 调色：`uCold` 降饱和、偏蓝；`uWarm` 提亮暖色；`uDawn` 整体提亮；
     - 霜冻：屏幕边缘 `frost` 贴图，mask = smoothstep(1-0.55*uCold-0.25, 1.2, length(uv-0.5)*1.6) ，白蓝色；
     - 曝光 `uExposure`(1.1) → ACES 拟合 → 线性转 sRGB；
     - 暗角、细颗粒（hash(uv+time)*0.035）。
- `M.post.render()`：渲染场景到 rtScene → 各 pass → 屏幕。`M.post.resize()`。`M.post.uniforms` 暴露 uCold/uWarm/uDawn/uFocus。
- 低质量（quality<0.35）：跳过四分之一分辨率级与景深。

## 11-fx.js

- **火柴火焰** `M.fx.flame(parent)` → handle：两个加法混合的 Sprite（内芯黄白、外焰橙），尺寸随噪声抖动 0.06–0.1 m；
  一盏 PointLight（池中取）#ff9a3c，intensity 2.5±噪声闪烁，distance 7；`handle.kill(fadeTime)`。
- **划火花** `M.fx.strike(pos)`：30 颗火花粒子（Points，加法，向上抛物 + 重力，0.5 s 消失）+ `M.audio.strike()`。
- **暖光爆发** `M.fx.bloomBurst(pos, color)`：一个扩张的光球 Sprite（0.3 s 到 6 m 再淡出），配合 `M.post.uniforms.uWarm` 脉冲。
- **烛光** `M.fx.candles(points[])`：InstancedMesh 小烛（白圆柱）+ 共享 Points 火苗（每颗闪烁相位不同），`lightUp(dur)` 自下而上依次点亮。
- **烛光升空** `M.fx.riseToStars(points, cb)`：复制火苗为粒子，沿螺旋上升到 y=40 并变为白蓝星点，散开留在夜空（加入天空的永久星层）。
- **流星** `M.fx.shootingStar(from, to, dur, cb)`：亮头 Sprite + 80 段拖尾（Line 或 Points 渐隐），落地时 `bloomBurst` + 光柱（竖直加法圆柱，3 s 淡出）。
- **落点光圈** `M.fx.tapRing(x,z)`：地面环形贴花扩张 0.6 s 淡出。
- **呼出白气**：女孩寒冷时每 2.5 s 头前方一小团白雾粒子（Sprite），可选。
- 所有特效对象在 `M.onFrame` 中更新，用完移除。
