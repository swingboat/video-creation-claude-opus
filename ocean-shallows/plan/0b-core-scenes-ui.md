# 0b-1 核心 / 场景 / 棕榈 / 界面

## 02-core.js

- `renderer`：`antialias:false, alpha:false, powerPreference:'high-performance'`，`autoClear=false`。
  pixelRatio = `min(devicePixelRatio, 2) * qScale`，其中 qScale ∈ {0.6, 0.8, 1}。
- 浮点 RT：优先 `HalfFloatType`（检查 `OES_texture_half_float` / WebGL2 的 `EXT_color_buffer_float`），否则退回 `FloatType`，再不行用 `UnsignedByteType` 加编码（RG 用 0.5 偏移）。
- `O.makeRT(w,h,{float,linear})`，`O.fsPass(mat, rt)`：共用一个 `PlaneGeometry(2,2)` 和 `Camera`，target 为 null 时画到屏幕。
- `O.glsl.common`：hash12、vnoise、fbm(4 层)、voronoi(返回 F1、F2)、`shoreDist(p)`、`depthAt(p)`。uniform `uW、uH、uTime`。
- **岸线**：角点 `C=(-W/2, H/2)`，`q=p-C`，`θ=atan(-q.y,q.x)`（0 到 π/2），
  `R = S*(0.34 + 0.05 sin(3θ+0.7) + 0.03 sin(7θ))`，其中 `S = min(W,H)`；`shoreDist = length(q) - R`（>0 为水）。
- **水深**：`s = max(shoreDist,0)`，`depth = 0.08 + 3.6*(1-exp(-s/(0.22S))) + 0.35*fbm(p*0.35) - reefBumps(p)`。
  沙滩一侧 `depth = shoreDist*0.6`（负值，表示高出水面）。JS 版本用同一套公式和同一个 hash。
  reefBumps：若干个预先随机的珊瑚头圆斑（JS 生成，以 uniform 数组传给 GLSL），每个圆斑抬高 0.6–1.4。
- 指针：`O.toWorld(e)`；`O.input.down / move / up`。处理优先级：拖动中的卡片 > 漩涡手柄 > 生物（命中半径 = size）> 水面（点击 = 涟漪 `drop`）。
  移动时按速度给模拟注入小扰动（手指划水）。
- 质量管理：每 0.5 秒采样一次 FPS，用指数移动平均平滑。`O.quality` 按 0.6 / 0.8 / 1 三档切换，变化时触发 `O.emit('quality')`。
- 事件总线：`O.on(name, fn)`、`O.emit(name, ...)`；每帧回调用 `O.onFrame(fn, order)`。

## 03-scenes.js — 参数表（颜色为 sRGB 十六进制，过渡时转换到线性空间再插值）

| 参数 | 热带浅滩 | 珊瑚潟湖 | 黄昏海湾 | 月夜荧光 |
|---|---|---|---|---|
| shallow | #5fe0d0 | #7af0e0 | #e0b080 | #1a4060 |
| deep | #0a3a7a | #1a7aa8 | #2a3050 | #050a28 |
| absorb | 0.55 | 0.35 | 0.6 | 0.9 |
| caustic | 1.0 | 0.85 | 0.35 | 0.12 |
| causticTint | #ffffff | #f0fff8 | #ffc080 | #a0c0ff |
| sunDir(xyz) | (0.25,-0.35,1) | (0.2,-0.3,1) | (-0.9,-0.55,0.35) | (0.4,0.5,1) |
| sunCol | #fff8e8 | #fffaf0 | #ffa050 | #9ab0e0 |
| ambient | 1.0 | 1.05 | 0.6 | 0.18 |
| sky | #bfe8ff | #d0f0ff | #ffb070 | #10183a |
| swellAmp | 1.0 | 0.3 | 0.8 | 0.6 |
| swellPeriod(s) | 7 | 9 | 8 | 9 |
| glint | 1.0 | 0.8 | 1.6（橙金） | 0.5（月光） |
| bio | 0 | 0 | 0 | 1 |
| reefLagoon | 0 | 1 | 0 | 0 |

- `O.setScene(i)`：from = 当前混合值，to = 目标值，`t: 0→1` 用时 2.5 秒，按 smoothstep 插值。海床在 shader 里用 `mix(seabed[from], seabed[to], t)`。
- 场景缩略图：每个场景的海床烘焙完成后，缩小画到 64×40 的 canvas，再转成 dataURL。

## 07-palm.js

- 位置：`C + (0.16S, -0.13S)`，树根在沙滩上；树干是一条弯向水面的三次曲线，用 `TubeGeometry`，高 z 0→2.2。
- 树冠：9 片羽状叶。每片叶是 `PlaneGeometry(1,0.25, 12,2)`，顶点弯成拱形，用 CanvasTexture 画出带叶脉的锯齿叶形，alphaTest。
- 摇摆：顶点 shader 里按 `z` 的高度加 `wind = sin(t*0.9+φ)*0.06 + sin(t*2.3)*0.02`，叶尖再叠加高频抖动。
- 影子：同一套几何体用 shadow 材质画进 `shadowRT`（半分辨率）。顶点投影公式 `p.xy -= sunDir.xy/sunDir.z * (p.z + depthAt(p.xy)近似)`，颜色写 1。
  合成时 `light *= 1 - 0.55*shadow`，作用于沙滩和水下。黄昏时 sunDir.z 小，影子自然拉长。

## 01-head-css.html / 14-ui-main.js — 界面

- 字体：Google Fonts 引入 `Noto+Serif+SC:wght@500;700` 和 `Noto+Sans+SC:wght@400;500`。
- 布局（`position:fixed`，叠在 canvas 上）：
  - 左上：标题（衬线体，带阴影）+ 计数器「4 只鳐鱼 · 5 只水母 · 2 条鲨鱼」。
  - 右上：控制栏，按钮（图标 + 文字）：🌧 下雨、🌀 漩涡、〰 平静、✕ 清空、🔊 声音、👁 隐藏；另有场景切换器（4 张缩略图 + 名称，当前项高亮）。
  - 底部：毛玻璃卡片栏（`backdrop-filter: blur(14px) saturate(140%)`，白色半透明，圆角 18px），6 张卡片（每张 96×120：canvas 缩略图 + 中文名 + 拉丁名小字）。
- 竖屏（`max-width:640px`）：控制栏移到标题下方并换行；卡片栏横向滚动，卡片 76×100。
- 隐藏界面（H）：所有 UI 淡出，留一个小的「显示」按钮。
- 卡片交互：pointerdown 记录起点；移动超过 8px 判定为拖动（生物进入 held 状态，随指针移动，`setPointerCapture`）；否则松手时判定为点击，从卡片位置抛入一个随机水面点。
- 卡片缩略图：用一个 `PerspectiveCamera`，`setScissor` 加 `setViewport`，画到主 canvas 之外的一个离屏 renderer（128×128）上，再 `drawImage` 到卡片的 2D canvas。每帧轮流刷新 1 张（低质量档每 2 帧刷新 1 张）。
- 快捷键：R、W、C、M、H、1–4；输入框获得焦点时忽略。
