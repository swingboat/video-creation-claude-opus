# 00 总体架构：pathtraced-intro

复刻 Mirage「Tesseract 3D」宣传片（《权力的游戏》片头风格），38.2s，1920x1080，30fps。
技术与原片一致：Agent 写脚本 → Tesseract CLI（`tsrct`）构建可编辑 `.tsrct` 工程 → 原生 GPU 路径追踪渲染。
不用 Blender、不用视频模型。

## 1. 原片分析（镜头表，时间来自 `reference/t2_*.jpg`）

| # | 时间 | 内容 | 字幕 |
|---|------|------|------|
| S01 | 0.0–3.3 | 浑天仪环带特写：暗红丝绒+银色浮雕（纽约天际线、祥云），环带缓慢滑动，背后太阳强光；末尾暗色梁划过 | — |
| S02 | 3.3–6.8 | 浑天仪内部：太阳核心光芒，多层环在前景转动，镜头滚转 | 右上：3D ENGINE / Yusuke Shibata（4.0–6.3） |
| S03 | 6.8–11.9 | 地图俯冲：羊皮纸陆地+蓝灰水面，「NEW YORK」刻字，齿轮群；中心星形齿轮升起自由女神像（青铜绿），镜头下压到雕像 | 左中：MODELING & RIGGING / Michael Vitt；PATH TRACING / Joyce Chen（9.9–11.9） |
| S04 | 11.9–13.3 | 伦敦：罗马数字钟盘立在齿轮底座上、大本钟、圣保罗穹顶、伦敦眼、议会大厦，「LONDON」 | — |
| S05 | 13.3–16.3 | 机械装置正视：顶部齿轮列、金色钟形球在臂上摆动、横梁铆钉 | 左下：3D CONCURRENCY / John Roberts；3D BUILD SUPPORT / Jason Silberman；3D TESTING / Alex Du |
| S06 | 16.3–19.3 | 迪拜：棕榈徽章圆盘、齿轮、哈利法塔升起，「DUBAI」；最后仰看塔尖 | 右：RELEASE PIPELINE / Michael Yang；CRITIC REVIEW / Gaurav Misra；FONT DELIVERY / Ben Fortier |
| S07 | 19.3–20.8 | 东京：五重塔逐层升起、鸟居、「TOKYO」 | — |
| S08 | 20.8–23.7 | 东京俯视：菊花穹顶机构、齿轮、东京塔从齿轮底座升起、河道等高线 | 左：FX STORYLINE / Sicheng Chen；CAPTION EDITING / Sebastian Griego；CI EFFICIENCY / Christine Dumont |
| S09 | 23.7–26.3 | 环带特写（铜金色浮雕：森林/云），背后强光+枝条剪影 | — |
| S10 | 26.3–32.2 | Logo：镜头拉到环带中央铭牌「TESSERACT 3D」，后面圆形徽章内四片红叶呈 X，逆光极亮；31.8 起淡出 | — |
| S11 | 32.2–38.2 | 黑场，终版字卡：TESSERACT 3D / NOW AVAILABLE WORLDWIDE / MIRAGE（33.0 淡入，36.8 淡出） | — |

字体：Trajan 风格衬线大写+小型大写 → 用 **Cinzel**（OFL，Google Fonts）。
字幕样式：职务小号字距大、姓名大号首字母大写；每组第一行左侧有一个金色「方框内套方框」图标。
画面风格：暖棕/金铜色调、强逆光、景深、辉光（bloom）、暗角、轻微颗粒。

## 2. 技术栈

- **Tesseract CLI 0.5.0**：`"$HOME/Library/Application Support/Tesseract/bin/tsrct"`，skill 文档在 `~/.agents/skills/tesseract-3d`。
- **Node.js（.mjs）**：全部生成脚本。无第三方依赖（PNG 编码用 `zlib` 自写）。
- **ffmpeg**：分段渲染结果的时域降噪、拼接、混音。
- 降噪器权重下载被公司网络拦截 → 渲染统一用 `--renderer path-tracer --no-denoise --samples N`。

## 3. 目录结构

```
pathtraced-intro/
  prompt.md  plan/  reference/
  gen/lib/        共享库：ids, act（动作构造）, geo（齿轮/星形/车削轮廓/可编辑网格）, mat（材质预设）, png, tex（程序纹理）
  gen/shots/      每个镜头一个模块 sNN-*.mjs，导出 { key, start, dur, build(ctx) }
  gen/credits.mjs 2D 字幕与终版字卡
  gen/main.mjs    汇总 → build/actions/NN-*.json（每批一个文件，原子应用）
  music/compose.mjs  程序合成配乐 → build/music.wav
  build.sh        创建 intro.tsrct、改画布、导入字体/纹理/音乐、按序 apply
  render.sh       按镜头分段导出（ProRes）→ build/segments/
  post.sh         ffmpeg 降噪+拼接+混入音频 → output.mp4
  intro.tsrct     最终可编辑工程（交付物）
  output.mp4      最终视频（交付物）
  .tesseract-work/ 检查图、日志等临时文件（完工后清理）
```

## 4. 工程文档结构（单一 composition `main`，1920x1080，38.2s）

- 图层顺序（layers[0] 在最上）：终版字卡组 → 各镜头字幕组 → 各镜头 Scene3D 图层（S01…S10，activeRange = 镜头窗口）。
- 每个镜头一个独立 Scene3D 图层：场景小、渲染快、互不干扰；关键帧 `layerTime` 用镜头内时间（ms）。
- `pixelsPerMeter = 100`；坐标 X 右、Y 下、Z 向屏幕内；颜色：材质用线性 BT.709，灯光/2D 用 sRGB。
- ID 分配：图层 ID：Scene3D = 100+镜头号，字幕 = 500+；场景内 item/data/material ID = 镜头号×10000 + 序号（全 composition 唯一）。
- 每个 Scene3D 图层加 glow 效果做 bloom；暗角用最上层的 2D 径向渐变形状（或效果，以 schema 为准）。

## 5. 共享资产（gen/lib）

- **齿轮**：`gearProfile(teeth, rOuter, rRoot, rHole, spokes)` → extrude 路径（evenOdd 挖孔/辐条）。
- **星形齿盘**：多角星 extrude，叠层。
- **车削**：穹顶、塔身、钟形球、环 → lathe 轮廓。
- **环带**：torus/lathe 薄带 + 浮雕：程序生成高度图 PNG（天际线、祥云、森林）作 `height` 纹理 + baseColor 纹理。
- **城市方块**：Group3D 阵列或批量 box；标签文字用 Text3D（Cinzel）刻在地面。
- **材质**：brass（金属 1、粗糙 0.35）、darkBronze、patina（青铜绿）、parchment、waterSlate、velvetRed、silverRelief、stoneWhite、redLacquer。

## 6. 渲染与后期

- 预览：`--samples 16` 检查构图；终渲：采样数在标定后确定（目标单帧 ≤ 40s）。
- 导出：每个镜头 `tsrct export --start-ms --duration-ms --format prores --renderer path-tracer --no-denoise`，后台运行，日志写 `.tesseract-work/export-sNN.log`。
- 后期：`hqdn3d` 时域降噪 → concat → 混入 `music.wav` → H.264 output.mp4。

## 7. 执行顺序（每步只做一件事，写完立即落盘）

1. 0b 模块细化：`plan/0b-lib.md`、`0b-armillary.md`（S01/S02/S09/S10）、`0b-map.md`（S03–S08）、`0b-credits-music.md`。
2. 写 gen/lib（每文件 ≤250 行）→ 标定测试（真实复杂度场景的单帧耗时）。
3. 逐镜头写 shots → 每写一个就 apply + 16spp 预览检查。
4. 字幕、配乐。
5. 终渲（后台）→ 后期 → 抽帧对比原片。
