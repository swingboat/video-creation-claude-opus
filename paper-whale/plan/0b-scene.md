# 0b · 场景（library.py / props.py / lights.py）

## 材质（common.py 的 `mat(name, **kw)` 工厂 + 少量专用节点树）

- **木头（桌、椅、书架）**：Principled，基础色用 Wave（bands, 沿 Y）× Noise 扰动的木纹，
  颜色在 #2a1610 – #4a2a1a 之间；roughness 0.35，桌面加一层 coat 0.3，让油灯和月光有高光。
- **地板**：深色木地板，Brick 纹理做木条，roughness 0.5。
- **墙**：灰蓝石膏，#3a4150，roughness 0.9，加 Noise bump，强度 0.05。
- **书脊**：用对象属性 `color` 驱动（Attribute 节点，instancer/mesh 的面属性），
  从暗红、墨绿、深蓝、棕色的调色板里随机取，roughness 0.6。
- **纸**：Principled，基础色为 page 贴图 × 米白 #e8e2d4；Subsurface 0.05；
  **Translucent 混合 0.25**（背光时透光，飞舞时最出效果）；双面。
  贴图坐标用 UV；纸群里每页随机挑 4 张文字贴图之一，在 UV 上按页面 id 偏移。
- **玻璃灯罩**：Glass，IOR 1.45，roughness 0.05。**火焰**：Emission，橙色 #ffa040，强度 40，用 Noise 做明暗变化。
- **夜空板**：Emission，#7aa0d8，强度 2.0（在窗内看起来是冷蓝色的亮窗）。

## library.py

- `build()` 依次创建下面这些：
  - 地板：一个平面 14×36。
  - 墙：左墙不能用整块板，要按窗洞拆成几块：窗间墙、窗下墙，拱顶上方用一块挖了半圆洞的墙。
    做法：在 2D 里生成带孔多边形太麻烦，所以直接用 **Boolean 修改器**——在左墙板上减去 4 个「拱窗柱体」
    （盒子 + 圆柱的并集），然后 apply。右墙、尽头墙、天花板直接用平面。
  - 拱窗窗格：窗洞里放竖条 2 根、横条 4 根（截面 0.06 m 的方条），外加一圈拱形框（圆环的上半部分）。
  - 窗外夜空板：在 x = −7.6 放平面，用夜空材质。
  - 书架：右墙和尽头墙上，每层高 0.4 m，共 20 层（0–8 m）；隔板用细盒子。
    书用 NumPy 生成：每层沿长度方向连续放书，宽 0.03–0.07、高 0.24–0.36、深 0.22，
    偶尔歪一本或留空隙。所有书合成**一个 mesh**（约 1.5 万本 × 8 顶点），
    颜色写到面属性 `color` 里。
  - 二层回廊（可选，加强纵深）：z = 4 处沿右墙加一条窄走道 + 栏杆，宽 1.2。只有效果不够时再加。
  - 长桌：桌面 1.1×14×0.06，四条桌腿加一根横撑。
  - 椅子：两侧各 6 把，简单椅子（座面 + 4 条腿 + 靠背 2 根竖条和 1 块横板），随机轻微转角；合成一个 mesh。
  - 桌上远处散放 4 本合着的书 + 2 本打开的书（复用 props 的函数）。
  - 柱子：大厅两侧在窗间墙位置放方柱，0.5×0.5，加强空间节奏。

## props.py

- `open_book(loc, rot_z, pages=40)`：
  - 封面：两块薄盒，略微张开 6°，深蓝布面材质。
  - 页堆：左右两侧各一个「弯曲页块」——网格 24×8，书脊处向下凹、外沿抬起
    （z = h · (1 − exp(−d / 0.04)) 形式的弧线），侧面能看到页层（用细横条 bump 贴图）。
  - 顶页用文字贴图；返回书的 dict（书脊位置、右页顶面的角点等），给 hero_page 用。
- `oil_lamp(loc)`：
  - 黄铜底座：lathe（旋转体），用剖面点列 + Screw 修改器，或者直接用 numpy 做旋转体 mesh。
  - 玻璃罩：旋转体，鼓肚形状。
  - 火焰：小的拉长 UV 球，Emission。
  - 点光：位置在火焰处，半径 0.02，强度 25 W，颜色 #ff9a40；Cycles 里开 soft falloff。
- `closed_book(loc, rot_z, size, color)`：盒子 + 页块（米白、略内缩）。

## lights.py

- `moon()`：Sun 灯，angle 0.6°（锐利光柱），强度 4.0（EEVEE）/ 3.0（Cycles），颜色 #9fb8ff。
  方向：从 (−X, −Y, +Z) 指向室内，使光柱斜穿大厅、落在长桌和地板上。
- `volume()`：一个 14×36×12 的盒子，Principled Volume：density 0.012，anisotropy 0.55，颜色 #cfd8e8。
  镜头 1 不需要明显体积，但少量雾有助于油灯光晕，所以保留。
- `lamp_light()`：由 props.oil_lamp 创建，这里只调全局强度。
- `world()`：极暗的蓝，#05070c，强度 0.3（保证暗部不死黑）。
- `render_settings(engine, pct, samples)`：
  - 公共：1920×816、24fps、AgX + look「Medium High Contrast」（名称在运行时校验）、
    运动模糊开，shutter 0.5。
  - Cycles：Metal GPU，samples 默认 64，adaptive threshold 0.02，降噪器 OIDN，
    max bounces 6、volume bounces 1、clamp indirect 3。
  - EEVEE：taa_render_samples 64，use_raytracing 开，use_volumetric_shadows 开，
    volumetric_tile_size '4'（预览用 '8'），volumetric_samples 96，shadow_ray_count 2，
    motion_blur_steps 2（预览用 1）。
