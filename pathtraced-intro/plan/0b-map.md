# 0b 地图镜头：S03–S08

共用模块 `gen/lib/map.mjs`：
- `mapBase(ctx, {land:[polys], water:{w,d}, seed})`：水面 box（slate 蓝灰，顶面 y=0）+ 陆地 extrude（parchment，厚 12，绕 X 转 90° 平放，顶面 y=−12）。
- `cityBlocks(ctx, {region:poly, count, hMin, hMax, seed})`：MeshBuilder 批量小方块（stone/ivory），只放在陆地多边形内。
- `label(ctx, text, {pos, size, rotY})`：Text3D Cinzel 平放（rotX 90），ink 色 + 浅浮雕 depth 3。
- `gearCluster(ctx, specs)`：每个齿轮 = gear extrude（brass/brassDark）+ 中心轴 cyl；返回 id，统一加 rotationZ 动画（相邻反转，角速度与齿数成反比）。
- `rise(layerId, itemId, ms0, ms1, from, to)`：升起动画（position y），配合 rotationY 旋入。
- 灯光：暖色主 spot（左上后方）+ 冷色弱 fill point + 环境 0.04。背景色近黑暖棕 (0.02,0.015,0.01)。
- 相机统一 physical focal 35–50、f/4 左右，焦点跟随 aim 目标。

## S03 纽约（6.8–11.9s，5100ms）
- 地图：两块陆地（曼哈顿长条 + 右侧大陆），中间水道；密集城市方块 ~600。标签「NEW YORK」在曼哈顿上方。
- 中心机构（原点）：外齿圈 gear r=260（齿 48、辐条 8）、内 8 角星 rOut 170 叠 2 层（上层反转）、内圈 ring；周围 5 个小齿轮。
- 自由女神（group，patina）：方形基座阶梯（stone），袍身 lathe，头 sphere，冠 7 根 cone，右臂 cyl 斜举 + 火炬（gold + emissive 火焰 cone），左臂抱 tablet box。高约 360。
- 时间线：0–1800 相机从高空 (−600,−1600,−1600) 前推下降到 (0,−900,−700)；1800–3300 女神从 y=+420 升到 0 并 rotationY 160→0，星盘转动；
  3300–5100 相机下压到 (−180,−420,−520)，看向女神胸口 (0,−250,0)。
- 字幕：左中 MODELING & RIGGING / Michael Vitt；PATH TRACING / Joyce Chen（镜头内 3100–5100）。

## S04 伦敦（11.9–13.3s，1400ms）
- 罗马数字钟：竖直 ring（外 210 内 150，ivory）+ 12 个 Text3D 罗马数字 + 中心盘 ink + 两根指针（指针转动）；底座：brass 圆盘 + gear。
- 大本钟塔：box 塔身 + 四面钟盘（cyl 扁）+ 金字塔尖（cone 4 段用 lathe 近似）+ stone。
- 圣保罗：鼓座 cyl + 穹顶 lathe（stoneDark/铅灰）+ 小灯笼塔。伦敦眼：torus + 16 辐条 + 座舱小球。议会：长 box + 尖塔阵列（gold 小尖）。
- 地面 parchment，泰晤士河 water 条带，「LONDON」标签。
- 相机：低机位 (−520,−260,−760)→(−430,−250,−720)，看 (60,−140,0)。整体轻微推进。

## S05 机械装置（13.3–16.3s，3000ms）
- 正面立墙（Z=0 平面）：顶部横梁 + 一排 9 个齿轮（交替转动）；三根水平工字梁（box + 铆钉阵列 Group3D linear array）；
  4 个金色钟形球（sphere + cone 尖，gold）挂在摆臂上，绕各自枢轴 rotationZ 摆动/旋转；中央竖轴；下方第二排小齿轮；黑色窗框（box 环）。
- 相机：近似正视略俯，pos (300,−120,−1100)→(240,−140,−1000)，看 (300,−80,0)。
- 字幕：左下三组（镜头内 200–3000）。

## S06 迪拜（16.3–19.3s，3000ms）
- 地图：海岸线 + 圆形泻湖（water 圆盘）+ 等高线细条；城市方块；「DUBAI」标签（左下）。
- 棕榈徽章：ink 圆盘 + gold 圆环 + 外圈 24 个三角刺（gold）+ 中心棕榈叶符号（extrude 叶形 ×7 呈扇形）；旁边银色齿轮。
- 哈利法塔：5 段递减的 Y 形截面（三片 box 组成）+ 顶尖 cone + 塔尖点光源；高 900；0–1600 从地下升起，同时周边吊塔金色框架。
- 相机：0–1800 俯视斜角 (−200,−700,−900) 看 (0,−200,0)；1800–3000 仰拍上摇至塔尖 (0,−850,0)。
- 字幕：右侧三组（镜头内 300–2700）。

## S07 东京五重塔（19.3–20.8s，1500ms）
- 五重塔：5 层，每层 = 红色 lacquer 方体芯 + 宽屋檐板（ivory 薄 box，四角微翘用略大板叠两层）；顶部相轮（细 cyl + 9 个小 torus）。
  逐层升起（每层延迟 150ms，从 y=+200 升到位）。
- 鸟居：2 根 cyl + 上横梁 box（两层）+ 下横梁，lacquer 红。周围石阶 box、小建筑。「TOKYO」标签（左上，倾斜）。
- 相机：高俯 (−300,−800,−700) → (−260,−760,−640)，看 (0,−80,0)。

## S08 东京俯视（20.8–23.7s，2900ms）
- 正俯视相机 (0,−1500,−120)，focal 35，看 (0,0,0)，缓慢 rotationZ 漂移（roll 0→6°）+ 轻推。
- 菊花机构：brass 碗（lathe）+ 16 片白色花瓣（scaled sphere 椭球）+ 中心 gold 球 + 外圈尖刺；旁边 3–4 个齿轮；
  东京塔：四角锥桁架（4 根斜 box 腿 + 横撑）orange/white + 观景台；底座 ring + gear；从下方升起（0–1500）。
- 水面上一组河道等高线（细长 box 条带沿曲线排布，ivory 低亮）。
- 字幕：左三组（镜头内 300–2800）。
