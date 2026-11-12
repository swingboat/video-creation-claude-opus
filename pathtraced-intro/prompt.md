# 原始需求

> 请先review下： https://x.com/cfenghub/status/2118212495991361715 这个帖子和里面的视频，然后分析下它使用到的技术，最后制作一个一摸一样的视频出来。

## 追问后的决定

- 渲染引擎：和帖子中的视频保持一样的技术（Mirage Tesseract CLI + 原生 GPU 路径追踪，不用 Blender、不用视频模型）。
- 文字与品牌：原样照抄（TESSERACT 3D / MIRAGE + 原演职员名单）。
- 音乐：程序合成原创弦乐，暗色大提琴 6/8 固定音型、节奏点和情绪一致，旋律原创（不复制《权力的游戏》主题）。
- 规格：1920x1080 30fps，和原片一致。
- 降噪器：公司网络拦截了 captions-cdn.xyz，无法下载 OIDN 权重 → 用 `--no-denoise` + 更高采样，再用 ffmpeg 做时域降噪。

## 参考素材

- 原帖：CF长风 转发 Mirage 官方帖 https://x.com/trymirage/status/2118054387209925032
- 原视频：`reference/ref.mp4`（38.2s，1920x1080，30fps，AAC 立体声）
