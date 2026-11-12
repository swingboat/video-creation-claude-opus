# 0b 浑天仪镜头：S01 / S02 / S09 / S10

共用模块 `gen/lib/armillary.mjs`：`buildArmillary(ctx, opts)` 往 data/items 里添加整套浑天仪，返回关键 item id。
世界坐标：浑天仪中心在原点，Y 向下。标定结论：64spp 1080p 约 8s/帧；灯光功率要远小于 60kW（会过曝）。

## 组件
- **太阳**：emissive 球 r=110（颜色 #FFE2A8，强度 ~40）+ 中心 point 光（sourceRadius 100）；
  **日冕**：一张始终朝向相机的平面（plane 900x900，unlit 双面，emissive 纹理 `sun_corona.png`：径向光芒+柔和外晕，黑底=不发光），用 aim 约束朝向相机。
- **主环带**（band）：MeshBuilder 生成的圆柱带：半径 R=620、宽 W=150、厚 T=14、分段 160；外表面 uv：u=弧长/周长×重复次数，v=0..1。
  外表面材质：纹理浮雕（baseColor + metallic + height[bump]），内表面/侧边：bronze。
  两侧边缘：细 torus（R±, tube 6）silver「绳纹」边。每隔 45° 一个竖向卡箍（box 18x170x24，brass）+ 两颗铆钉球。
- **辅环**：3–4 个细环（torus，tube 5–8，brass/bronze），不同倾角；2 条中宽环（band 宽 60，素铜）。
- **枝条剪影**（S09/S10 背景）：若干细 torus 弧段（tube 3），暗色 iron，随机倾角。

## 纹理（gen/lib/tex.mjs → build/tex/）
- `band_nyc_{base,metal,height}.png`（2048x192）：底色暗红丝绒 #4A0C10 + 银色浮雕：底部水波纹带、天际线（帝国大厦式尖塔+大量高楼矩形+窗格）、上方祥云卷涡（螺旋线）。
- `band_gold_{base,metal,height}.png`：铜金色浮雕（树林/云团圆形凸块+竖向光束纹理），底色暗红褐。
- `sun_corona.png`（1024²）：中心白→橙，外圈放射状光芒（随机长短角度）。
- `emblem_leaf` 不用纹理，红叶用 extrude 叶形。

## S01（0–3.3s，3300ms）环带特写·纽约浮雕
- 相机：在环带外侧斜下方，pos ≈ (−120, 160, −900)，看向带面上的点 (40, 0, −620)，focal 50，f/2.8，roll −18°（带在画面中斜向右上）。
- 动画：整个 band 组 rotationY 0→−9°（纹理向左滑）；相机轻微前推 z −900→−860。
- 太阳在环后方（中心），带后方大片亮光；主光 key：spot 从相机左上方照带面（暖色）。
- 2.7–3.3s：一根暗色横梁（box 2000x60x60，iron）从画面左下扫到右上（前景遮挡转场）。

## S02（3.3–6.8s，3500ms）太阳核心
- 相机：在环内侧，pos (0, 80, −420) 看向原点；focal 28；roll 动画 0→25°。
- 前景：2 条主环带 + 3 细环，各自绕不同轴旋转（rotationZ/X 各 20–40°/3.5s），形成交错剪影。
- 太阳 emissive + 日冕，glow 强。曝光让太阳过曝成白、外圈橙。
- 字幕：右上 3D ENGINE / Yusuke Shibata（镜头内 700–3000ms）。

## S09（23.7–26.3s，2600ms）金色环带特写
- 与 S01 相同的相机构造，换金色纹理；相机沿带面平移（target x 从 −80→80），roll +8°；背景加枝条剪影；带缓慢 rotationY 0→6°。

## S10（26.3–32.2s，5900ms）Logo
- 铭牌组（在主环带最前方，正对 −Z）：底板 box 760x120x20（bronze），边框四根细 box（brass），两端装饰卡箍；
  Text3D「TESSERACT 3D」Cinzel Bold，size 84，depth 8，bevel 1.5，正面 ivory/gold（gold 材质 rough 0.25），侧面 brass。
- 铭牌后方徽章：ring 外径 300 内径 270（bronze）+ 内圆盘（ink）+ 4 片红叶（extrude 叶形，lacquer 红）呈 X 排列（45°/135°/225°/315°），叶间深色交叉杆。
- 太阳在徽章后方偏下 → 外围一圈强光，徽章与铭牌近剪影但正面有暖色补光（area 光从相机方向）。
- 相机：0–1.7s 从左下斜角近距离（pos (−420, 260, −700)，roll −20°）摆到正面（pos (0, 30, −1050)，roll 0），1.7–5.5s 极慢推近（z −1050→−980）。
- 淡出：view exposure 在 5300→5900ms 从 0 → −10（自然变黑）。
