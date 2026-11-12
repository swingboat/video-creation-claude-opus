# 白雪公主与七个小矮人：溪谷救援

一支约 90 秒、1920×1080、30fps 的童话叙事短片。雨后森林里，白雪公主和七个小矮人合力把被困溪中岩石上的小鹿救回岸边。

用 **Three.js** 构建场景，用 **Remotion** 组织确定性时间轴与导出。人物为 MPFB/MakeHuman CC0 写实人体（Blender 生成的带骨骼与表情形变的 GLB），环境使用 Poly Haven CC0 的 HDRI、扫描纹理与植被模型；水体、粒子和表演由代码驱动。固定随机种子，可逐帧复现；预览与成片使用同一套画面逻辑。

本工程**完全独立**：源码、依赖、锁文件、字体、脚本、文档、缓存、截图、样片与最终视频都在本目录内，不依赖项目根目录或其它视频。

## 成品

- 最终视频（高画质母版）：[out/snow-white-creek-rescue.mp4](out/snow-white-creek-rescue.mp4)
- 检查静帧与样片：[checks/](checks/)
- 角色设定 / 分镜 / 素材清单 / 检查记录：[docs/](docs/)

## 环境要求

- Node ≥ 20（开发用 24.13）
- macOS（对白用系统 `say` 中文语音；其它平台请改 `scripts/gen-audio.mjs` 的 TTS）
- 本机 `ffmpeg`、`ffprobe`
- 渲染用无头 Chrome（Remotion 自带）；WebGL 经 ANGLE

## 素材（已生成并随工程提供；如需重建）

```bash
npm run assets:fetch        # 下载 Poly Haven CC0 HDRI/纹理/模型到 public/assets，并写 docs/assets-polyhaven.json
npm run assets:characters   # Blender + MPFB 生成 8 个角色 → public/models/*.glb，预览图 → checks/characters/
npm run assets:fawn         # 生成小鹿 → public/models/fawn.glb
```

角色重建需要：Blender 5.x、MPFB 插件包与 MakeHuman CC0 资源包（均在 `assets-src/vendor/`）。首次需安装插件并解包资源到 `.cache/blender/`：

```bash
export BLENDER_USER_RESOURCES=$PWD/.cache/blender
blender -b --factory-startup --command extension install-file -r user_default -e assets-src/vendor/add-on-mpfb-v2.0.18.zip
mkdir -p .cache/blender/mpfb_data && for z in assets-src/vendor/*.zip; do unzip -q -o "$z" -d .cache/blender/mpfb_data; done
ln -sfn "$PWD/.cache/blender/mpfb_data" .cache/blender/extensions/.user/user_default/mpfb/data
```

修改角色重建后需同步骨骼尺寸 `src/characters/dims.json`（见 docs/04-检查记录.md）。

## 安装（以本目录为工作目录）

```bash
cd videos/snow-white-creek-rescue-20261019
npm install          # 使用本地 .npmrc：缓存 .cache/npm、精确锁定版本
```

所有命令都以本目录为工作目录。npm 缓存已指向 `.cache/npm/`；渲染脚本会把 `TMPDIR/TMP/TEMP` 指向 `.cache/tmp/`。

## 预览（交互式）

```bash
npm run preview      # 打开 Remotion Studio，可拖动时间轴实时预览
```

Studio 里有三个合成：`film`（成片，含音频）、`film-silent`（无音频，用于快速静帧）、`preview`（预览画质）。

## 检查（静帧 + 动作试片）

```bash
# 单张静帧：参数为 帧号 输出路径 [合成id]
npm run still -- 2226 checks/still-01-group.png film-silent      # 八人群像
npm run still -- 378  checks/still-02-snow-face.png film-silent  # 白雪面部
npm run still -- 1500 checks/still-03-rescue.png film-silent     # 救援全景

# 动作试片：参数为 起始秒 结束秒 输出路径 [合成id]
npm run clip  -- 46.5 52.5 checks/test-clip-pull.mp4 film-silent
```

生成 filmstrip 便于一次性复看（示例）：

```bash
ffmpeg -y -i checks/test-clip-pull.mp4 -vf "select=not(mod(n\,30)),scale=620:-1,tile=3x2" -frames:v 1 -update 1 checks/strip/pull-strip.png
```

## 生成音频 + 导出成片

```bash
npm run audio        # 用 ffmpeg + say 合成 public/audio/final-mix.wav
npm run render       # 导出 out/snow-white-creek-rescue.mp4（film 合成，含音频）
# 自定义输出： npm run render -- out/my.mp4 film
```

> 若未先运行 `npm run audio`，`film` 合成会因缺少 `public/audio/final-mix.wav` 而报错；可改用 `film-silent` 导出无声版：
> `npm run render -- out/silent.mp4 film-silent`

压缩分发版：

```bash
ffmpeg -y -i out/snow-white-creek-rescue.mp4 -c:v libx264 -crf 22 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k out/snow-white-creek-rescue-web.mp4
```

## 类型检查

```bash
npm run typecheck
```

## 如何修改

### 改角色（造型 / 服饰）
外观在 [assets-src/blender/build_characters.py](assets-src/blender/build_characters.py) 的 `CHARS`：体型（phen）、脸部目标形变（targets）、皮肤/眼睛/眉/发型、习惯表情（rest_expr）、胡须、帽子、服装颜色与侏儒比例。改完运行 `npm run assets:characters` 重新导出 GLB。运行时材质/骨骼驱动在 [src/characters/glbRig.ts](src/characters/glbRig.ts)；步态、姿态参数在 [src/characters/specs.ts](src/characters/specs.ts)。

### 改时间轴 / 节奏 / 对白 / 镜头切分
编辑 [src/timeline/cues.json](src/timeline/cues.json)（**单一时间轴来源**）：
- `shots`：每个镜头的起止时间（画面与字幕共用）。
- `beats`：所有动作节拍（拉绳、喷嚏、抱鹿、递苹果……），画面表演与音频共用。
- `dialogue`：对白文本、时间与说话人（驱动字幕与 TTS）。

改节拍后，表演层 [src/characters/performance.ts](src/characters/performance.ts) 与音频脚本会自动对齐。

### 改走位 / 站位
编辑 [src/characters/staging.ts](src/characters/staging.ts)：入场路径、拉绳站位 `STANCE`、结尾走位等。世界坐标统一在 [src/world/layout.ts](src/world/layout.ts)。

### 改镜头机位 / 运动 / 景深
编辑 [src/camera.ts](src/camera.ts)：每个镜头一个函数，返回机位、目标、焦距、对焦距离与光圈。

### 改声音
编辑 [scripts/gen-audio.mjs](scripts/gen-audio.mjs)：环境声、溪流、音乐弧（分段和弦）、音效节拍、每角色 TTS 声线与语速；重跑 `npm run audio`。

### 改光照 / 调色 / 雾 / 泛光 / 景深
编辑 [src/scene.ts](src/scene.ts) 的 `updateLighting` 与 `setupPost`（UnrealBloom / Bokeh / 自定义暖色分级+暗角+颗粒）。

## 目录结构

```
src/
  index.ts Root.tsx Film.tsx Overlay.tsx   Remotion 入口/合成/帧驱动/字幕片名
  scene.ts camera.ts                        主场景装配 + 后期；镜头系统
  timeline/cues.json                        单一时间轴来源
  engine/      math.ts textures.ts          确定性数学/噪声；程序化 PBR 贴图
  world/       layout.ts environment.ts water.ts props.ts   世界坐标/环境/水体/道具
  characters/  glbRig.ts fawnGlb.ts dims.json   GLB 角色/小鹿运行时（IK、表情、裙摆）
               specs.ts state.ts locomotion.ts staging.ts performance.ts fawn.ts
               build.ts parts.ts apply.ts ik.ts     v1 程序化角色（保留作参考）
  world/assets.ts scatter.ts                  CC0 素材加载与植被布置
assets-src/    blender/*.py vendor/ mocap/    角色/小鹿/树木生成脚本、素材原包、CMU 动捕
scripts/       render.mjs gen-audio.mjs     渲染与音频脚本
public/        fonts/ audio/                字体（OFL）与生成的音频
docs/          01 角色设定 / 02 分镜 / 03 素材清单 / 04 检查记录
checks/        三张检查静帧 + 动作试片 + filmstrip
out/           最终 MP4（约 82 MB）
.cache/        npm 与临时文件（不随工程分发）
```

## 技术要点

- **确定性**：一切都是时间 `t` 的纯函数，随机种子固定（`cues.seed`）；同一帧重复导出结果一致。
- **防滑步**：基于步幅的落脚规划（支撑相世界固定、摆动相走弧线），见 `locomotion.ts`。
- **双骨 IK**：手/脚用解析 IK，膝肘极向量受控，拉绳/抱鹿/平衡均为真实末端约束。
- **接触关系**：绳索为每帧过手心/绳结/锚树重建的管；水花位置/大小/时刻由动作事件驱动（`anim/story.ts`）。

详见 [docs/04-检查记录.md](docs/04-检查记录.md) 的已知限制与进一步提升方案。
