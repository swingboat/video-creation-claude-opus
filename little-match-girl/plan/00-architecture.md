# 新年夜的火柴 · 总体架构（0a）

单文件 `index.html`，Three.js r128（cdnjs，经典 `<script>`），可 file:// 直接打开。开发拆成 `parts/`，`./build.sh` 按编号合并。

## 1. 坐标与地图（单位：米，Y 朝上，北 = -Z）

- 街道地面 y=0；运河水面 y=-1.3；运河底不可见。
- **西岸街道**（主行走区）：x ∈ [-3.5, 5.6]，z ∈ [-44, 18]。
- **西排房屋**：正立面在 x=-4，朝 +X，z 从 -44 到 18 连续排布（每栋宽 4–6 m）。
- **运河**：x ∈ [6, 14]，z ∈ [-44, 30]；两侧石砌岸墙顶 y=0，带系船柱和积雪边。
- **东岸窄堤** x ∈ [14, 16]，**东排房屋**正立面在 x=16.5，朝 -X（只看不走，堤可走）。
- **桥**：z ∈ [-21.5, -18.5]，横跨 x 6→14，平桥面 y=0（下方画拱）。
- **北广场**：x ∈ [-12, 22]，z ∈ [-64, -44]；北侧是教堂台阶和一排房屋（正立面 z=-65 朝 +Z），西侧房屋延续。
- 南端 z>18 用雾和房屋封住；视觉边界外放远景剪影（屋顶、尖塔）。
- `M.walkable(x,z)`：以上矩形并集；道具用圆形碰撞体 `M.colliders.push({x,z,r})`。

## 2. 剧情站点（顺序固定）

| # | 站点 | 位置 (x,z) | 划火柴后发生 |
|---|---|---|---|
| 1 | 街角暖炉亭 | (1, 9)，炉在 (-1, 9) | 亭下铁炉燃起真火，持续供暖 |
| 2 | 面包房橱窗 | (-1.5, -12.4) | 窗内出现烤鹅宴桌，一只白鹅走出门，从此跟随女孩 |
| 3 | 广场圣诞树 | (4, -50.2)，树在 (4, -54) | 大冷杉点亮上百支烛光，烛光升空成星星，一颗流星落向北侧台阶 |
| 4 | 教堂台阶 | (4, -60.4)，奶奶在 (4, -62.3) | 流星落地化为奶奶（发光、温柔），伸手 |
| 5 | 最后一根火柴 | 同 4 | 奶奶抱住她 → 钟声 → 天亮（新年清晨），窗户打开，结局卡 |

开场：女孩站在 (1, 11.5)，面向北；时钟 23:00；火柴 5 根。每划一根时钟 +12 分钟，第 5 根后到 00:00 敲钟。

## 3. 全局命名空间 `M`

```
M.THREE 别名 T；M.renderer, M.scene, M.camera, M.time, M.dt, M.quality(0..1)
M.onFrame(fn, order)          每帧回调，order 小的先跑
M.colliders[] / M.walkable(x,z) / M.groundY(x,z)=0
M.mat.*                       共享材质工厂（toon 感 MeshStandardMaterial，roughness 高）
M.tex.*                       CanvasTexture 工厂（石板、雪、灰泥、木纹、霜、光晕）
M.noise2(x,y) / M.rand(seed)  值噪声 / 可复现随机
M.input: {onTap(fn), onDrag(fn), onWheel(fn)}   区分点击与拖动（位移 < 6px 视为点击）
M.girl  {group, pos, heading, setTarget(x,z), anim(name), busy}
M.goose {group, active, follow}
M.granny{group, show(t)}
M.fx.*  strike(pos), flame(pos)→handle, sparkles, shootingStar(from,to,cb), candleStars(tree)
M.lights.pool(x,z,color,r)    地面假光斑（加法混合贴花）
M.warm.add({x,z,r,power})     暖源（影响寒冷值）
M.story { step, matches, clock, cold }
M.audio.* init/strike/flame/bells/step/setMuted/music/duck/pad/dawn/level
M.ui.*  hint(text), caption(title,lines), action(label|null), setMatches(n), setClock(str), ending()
M.post  后期管线 render()
```

## 4. 渲染与光照

- `WebGLRenderer`（antialias=false，后期里做轻度 FXAA 近似可省），sRGB 输出，ACES 色调映射，曝光 1.0。
- 月光：`DirectionalLight` 冷蓝 #8fa8ff，强度 0.55，带 2048 阴影贴图，阴影相机跟随女孩（±22 m）。
- 半球光：天 #2a3b6b / 地 #1a1820，强度 0.5。
- 暖光：窗户用自发光材质；路灯与站点用**地面光斑贴花**（便宜）；真实 `PointLight` 最多 4 盏：
  火柴光（跟随女孩手）、暖炉、圣诞树、奶奶光。按需开关。
- 雾：`FogExp2` #1b2440，密度 0.022（结局天亮渐变到 #c9d4e6、0.012）。
- 后期（自写，3 个 RT）：场景 RT（带深度纹理）→ 亮部提取 + 两级降采样模糊 → 合成：
  bloom、按深度的景深（远处混合模糊图）、冷暖调色（随寒冷值偏蓝）、暗角、霜冻边缘（寒冷值控制）、颗粒。

## 5. 摄像机与操作

- 第三人称环绕跟随：目标 = 女孩位置 + (0,0.8,0)；默认 yaw=0（从南看向北），pitch=38°，距离 9。
- 拖动：yaw/pitch（pitch 限 15°–70°）；滚轮/双指：距离 5–16；镜头平滑插值（阻尼 6/s）。
- 点击：射线打 y=0 平面 → 若 walkable 则设目标，显示一个短暂的雪地落点光圈。
- 站点剧情时镜头可被剧情接管（`M.cam.focus(...)` 或 `M.cam.shot(机位点, 看向点, rate)`），结束后归还；
  `M.control.goto(x,z)` 在剧情锁定时驱动女孩走位。竖屏时视野与镜头距离按宽高比自动放大。

## 6. 片段清单（合并顺序）

| 文件 | 内容 | 设计细化 |
|---|---|---|
| 01-head-css.html | head、字体、CSS、界面 DOM、three.js 引入、`<script>` 开头 | 0b-story-ui-audio |
| 02-core.js | M 命名空间、renderer、场景、噪声、随机、纹理工厂、材质、输入、碰撞 | 0b-render-fx |
| 03-post.js | 后期管线 | 0b-render-fx |
| 04-sky-ground.js | 天空穹顶、远景剪影、地面石板、积雪块、降雪、脚印 | 0b-world |
| 05a-houses.js | 房屋生成器 + 按材质合并几何 + 窗户实例化 | 0b-world |
| 05b-town.js | 三排房屋布局 + 面包房 + 教堂 | 0b-world |
| 06-canal.js | 运河水面 shader、岸墙、系船柱、木船、桥 | 0b-world |
| 06b-firgen.js | 冷杉生成器：枝条卡片实例化 + 积雪 + 针叶阴影 | 0c-polish |
| 07-props.js | 路灯+光斑、木桶、木箱、长椅、冷杉、暖炉亭、圣诞树 | 0b-world |
| 07c-girl-look.js | 女孩脸部贴图（含眨眼）、边缘光、针织/格纹布料 | 0c-polish |
| 08-girl.js | 小女孩模型 + 骨架式分层动画 | 0b-characters |
| 09-npcs.js | 白鹅、奶奶 | 0b-characters |
| 10-control.js | 点击行走、避障、跟随相机、剧情镜头 | 0b-characters |
| 11-fx.js | 火柴火焰、火花、烛光星、流星、暖光、落点光圈 | 0b-render-fx |
| 11b-fireworks.js | 新年烟花 | 0e-atmosphere |
| 12-story.js | 站点状态机、时钟、寒冷值、各站演出、结局 | 0b-story-ui-audio |
| 12b-guide.js | 引路小光（指向下一站点） | 0d-experience |
| 12c-ambience.js | 炊烟、炉火火舌与火星、窗中人影 | 0e-atmosphere |
| 12d-camfx.js | 镜头遮挡淡出（近相机 + 视线圆柱抖动隐藏） | 0f-cinematics |
| 12e-ending.js | 结局演出（拥抱 → 钟声烟花 → 天亮台阶 → 结局卡） | 0f-cinematics |
| 13-audio.js | WebAudio 合成：风、脚步、划火柴、火焰、八音盒、钟声 | 0b-story-ui-audio |
| 14-ui-main.js | 界面绑定、开场、自适应质量、主循环、resize | 0b-story-ui-audio |
| 99-tail.html | `</script></body></html>` | — |

每个片段 ≤ 250 行；片段间只通过 `M` 通信，按文件名 `LC_ALL=C sort` 顺序合并执行（后面的片段可调用前面的）。
超长模块拆成 `NNa-`、`NNb-` 子片段。
