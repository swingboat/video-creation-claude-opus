# 0b 字幕、终版字卡、配乐、构建与渲染

## 字幕（gen/credits.mjs，2D 图层，在所有 Scene3D 之上）
- 字体 Cinzel（可变字体，import-font 后用返回的 family/style；需要 Regular 与 Bold）。小写字母在 Cinzel 中就是小型大写 → 姓名直接写 "Yusuke Shibata"。
- 每组 = Group 图层（activeRange = 出现窗口），内含：
  - 职务行：text 全大写，size 22，tracking 大（~350），颜色 #D9CBB0，opacity 0.85；
  - 姓名行：size 54，tracking ~180，颜色 #EFE3C8；
  - 首组左侧图标：PNG 图标（`credit_icon.png`，金色双方框+对角线），64x64。
- 位置（1920x1080，基线坐标）：
  - S02 右上：图标 (1188,170)，职务 (1270,150)，姓名 (1300,205)。
  - S03 左中：图标 (450,535)；第一组职务 (540,520)/姓名 (580,575)；第二组 +130px。
  - S05 左下：图标 (230,640)；三组各 +135px。
  - S06 右：图标 (1180,700)；三组各 +135px。
  - S08 左：图标 (230,450)；三组各 +135px。
- 动画：组 opacity 0→100（400ms）… 100→0（400ms）；整体极慢上漂 6px。

## 终版字卡（S11，32.2–38.2s）
- 「TESSERACT 3D」size 64 tracking 250 居中 (960,512)；「NOW AVAILABLE WORLDWIDE」size 20 tracking 500 (960,556)；「MIRAGE」size 24 tracking 600 (960,620)。
- 33.0–33.8 淡入，36.6–37.4 淡出。颜色暖金渐变感用 #E6D3AE。

## 配乐（music/compose.mjs → build/music.wav，48kHz 立体声，38.2s）
- 原创：D 小调，6/8，♩.=84（每小节 ≈1.43s）。固定音型：低音大提琴 D–A–D–E–F–E 式的八分音符 ostinato（自写，不用原曲动机）。
- 层次：0–3.3 低音持续 + 定音鼓滚奏渐强；3.3 起 ostinato 进入；6.8 起中提琴/大提琴旋律（原创，长音为主）；13.3 加打击（每小节 1、4 拍）；
  16.3–23.7 弦乐齐奏加厚 + 铜管长音；23.7 渐强到 26.3 高潮；26.3–31.8 Logo 段：主和弦 D 小三 → B♭ → C → D 大三（皮卡第终止）+ 大鼓重击；31.8 起混响尾音；36.5 收尾。
- 合成：加法合成 + 锯齿波低通模拟弦乐（多声部 detune、颤音），鼓用噪声+正弦下滑；简单卷积混响（指数衰减噪声 IR）。

## 构建（build.sh）
1. `tsrct project create` → checkout → `gen/setdoc.mjs`（1920x1080，38.2s，黑底）→ commit。
2. import-font Cinzel；import-asset 纹理（--kind image，assetId=文件名去扩展名）；import-asset music.wav（音频）。
3. `node gen/main.mjs` 生成 build/actions/NN-*.json；按序 apply，失败即停。
4. `tsrct project inspect` 抽查；预览：`tsrct preview --renderer path-tracer --no-denoise --samples 16`。

## 渲染（render.sh）
- 每镜头：`tsrct export --start-ms S --duration-ms D --format prores --renderer path-tracer --no-denoise --samples N --json`，日志到 `.tesseract-work/export-sNN.log`；一次只跑一个。
- 采样：地图镜头 N=96，浑天仪/Logo 镜头 N=128（强光处噪点多）；终版字卡用 raster。
- 后期（post.sh）：每段 `hqdn3d=2:1.5:4:3` → concat → 混音（Tesseract 导出不含音频的段，最后用 ffmpeg 合并 music.wav）→ H.264 CRF 16 → `output.mp4`。
