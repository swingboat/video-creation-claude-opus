# 浅海 · Ocean Shallows — 总体架构（0a）

单文件 `index.html`，Three.js r128（cdnjs）。开发时拆成 `parts/` 片段，最后运行 `./build.sh` 按编号 `cat` 合并。

## 1. 坐标系与相机

- 世界平面为 XY，Z 轴朝上；水面 z=0，海床 z = -depth。
- 屏幕高度固定为 `H = 10` 个世界单位，`W = H * aspect`，原点在屏幕中心。
- 主相机：`OrthographicCamera` 俯视（从 +Z 看向 -Z），横竖屏通用；resize 时只改 W。
- 海滩：左上角的弯曲岸线，`shoreDist(x,y)` 是有符号距离（<0 为沙滩）。
- 水深 `depth(x,y)` 由岸线距离 + 低频噪声 + 礁石隆起组成，CPU（生物避让、背鳍出水判断）和 GPU 共用同一套公式。

## 2. 渲染管线（每帧）

1. **水波模拟** `simRT` ping-pong（HalfFloat，RG = 高度/速度），分辨率 256–512 自适应。
   边缘做海绵层吸收（越靠边阻尼越大），避免反弹。输入有：水滴、尾迹、雨、背鳍 V 形尾迹。
2. **生物荧光缓冲** `bioRT` ping-pong（单通道衰减），由运动、冲刷、水花激发；只在月夜场景生效。
3. **水下层** `underRT`：烘焙海床四边形 → 生物影子（压暗）→ 水下生物网格。
4. **合成水面**（全屏 shader）：
   - 用模拟法线 + 解析长浪法线算折射偏移，采样 `underRT`；
   - 按水深吸收着色：浅处绿松石，深处宝石蓝；
   - 程序化焦散：两层扭曲 Voronoi，叠加模拟法线，强度随场景和水深变化；
   - 菲涅耳天空反射 + 阳光闪烁（高光阈值 + 噪声）；
   - 岸边：冲刷带（swash，相位与长浪同步）、蕾丝泡沫、退水后的湿沙反光；
   - 棕榈树影子遮罩 `shadowRT`，同时作用于沙滩和浅水；
   - 叠加生物荧光。
5. **水上层**：棕榈树、跃出或被拖起的生物、水花粒子、雨滴，直接画在合成结果上（透明混合）。

## 3. 场景系统

- 4 套参数表：`tropical` / `lagoon` / `dusk` / `night`。参数包括：水色（浅、深）、吸收率、焦散强度和色温、太阳方向和颜色、天空色、浪高、浪周期、闪烁强度、雾、荧光开关、影长。
- 切换时 `O.params = lerp(from, to, t)`，用 smoothstep 过渡 2.5 秒。
- 海床：每个场景烘焙一张 `seabedTex[i]`（第一次用到时才烘焙），过渡时在 shader 里混合 from 和 to 两张。
- 潟湖场景的海床额外画鹿角珊瑚和桌形珊瑚，环礁轮廓抬高浅水区。

## 4. 全局命名空间 `O`

```
O.renderer, O.scene*, O.cam, O.W, O.H, O.time, O.dt, O.quality(0..1)
O.params                 当前混合后的场景参数
O.depth(x,y)             CPU 水深函数
O.sim.drop(x,y,r,amp)    往水波模拟注入扰动
O.sim.tex                当前高度纹理
O.bio.add(x,y,r,amp)     荧光注入
O.seabed.tex(i)          海床纹理
O.fx.splash(x,y,size)    水花 + 水滴粒子 + 涟漪 + 声音
O.creatures[]            全部生物（上限 48）
O.spawn(type,x,y,opts)   新建生物
O.audio.*                splash/chime/setScene/setMuted
O.ui.updateCounter()
O.onFrame(fn)            注册每帧回调（按注册顺序调用）
```

## 5. 生物框架

- 公共状态：`pos(x,y,z)`、`vel`、`heading`、`bank`、`state`（swim / rest / flee / jump / air / thrown / held）、`type`、`size`。
- 转向：漫游噪声 + 避开沙滩（`depth < 最小深度`）+ 避开屏幕边缘 + 同类间分离；鲨鱼附近的鳐鱼会加一个排斥力。
- 指针点到生物 → flee：加速并转向远离指针；魟鱼起身时扬起泥沙粒子。
- 影子：每个生物在 `underRT` 里先画一个模糊椭圆（按太阳方向偏移，偏移量随离海床高度增大）。
- 尾迹：z 接近 0 时每帧往 `sim` 注入扰动。
- 抛入：沿抛物线（x,y 线性，z 抛物线）飞行，z 降到 0 时调用 `splash`。拖动：held 状态，z=+1.5，跟随指针。

| 类别 | 渲染方式 | 动画 |
|---|---|---|
| 鳐鱼（3 种） | 每种一个 `InstancedMesh`，背腹两层薄板 + 尾巴；花纹用程序化 CanvasTexture（背面、腹面两张） | 顶点 shader：翼展方向弯曲（扇动 / 圆盘边缘波动），每个实例带相位和侧倾 |
| 鲨鱼 | 普通 Mesh，从剖面曲线挤出纺锤体，加背鳍、胸鳍、尾鳍 | 顶点 shader：沿身体做 S 形侧摆，幅度从头到尾递增 |
| 水母（2 种） | 钟体（Lathe + 菲涅耳半透明）、生殖腺、触手边缘 | 钟体脉动（快缩慢舒）；触手和口腕是朝向相机的丝带，节点链按速度向后飘、静止时下垂，悬空时滴水 |

上限：总数 48；超过时拒绝新建并播放提示音。

## 6. 自适应质量

统计 1 秒滑动平均 FPS：低于 45 时降档，高于 58 并持续 3 秒时升档。
可调的项目：`simRT` 分辨率、pixelRatio、焦散层数、粒子上限、卡片缩略图刷新频率。

## 7. 界面

- 顶部：标题「浅海 · Ocean Shallows」（Noto Serif SC），生物计数器。
- 控制栏：下雨、漩涡、平静、清空、场景切换（4 个小缩略图，取自海床烘焙结果）、声音、隐藏界面。
- 底部毛玻璃卡片栏：6 张卡片。缩略图用同一个 renderer 加 scissor 实时渲染生物模型，每帧轮流刷新 1–2 张。
- 漩涡：在屏幕上显示可拖动的手柄；作用于水母漂移、粒子和模拟扰动。
- 手机竖屏：卡片栏横向滚动，控制栏换行，图标缩小。
- 快捷键：R / W / C / M / H / 1–4。

## 8. 片段清单（合并顺序）

| 文件 | 内容 | 设计细化 |
|---|---|---|
| 01-head-css.html | `<head>`、字体、CSS、界面 DOM | 0b-ui |
| 02-core.js | `O` 命名空间、renderer、相机、RT 工具、噪声、depth()、指针、质量管理 | 0b-core |
| 03-scenes.js | 场景参数表与过渡 | 0b-scenes |
| 04-seabed.js | 海床烘焙 shader | 0b-seabed |
| 05-water-sim.js | 水波模拟 + 荧光缓冲 | 0b-water |
| 06-water-render.js | 合成 shader | 0b-water |
| 07-palm.js | 棕榈树 + 影子遮罩 | 0b-scenes |
| 08-creature-base.js | 生物框架、转向、抛入、拖动、影子 | 0b-creatures |
| 09-rays.js | 3 种鳐鱼 | 0b-creatures |
| 10-shark.js | 黑鳍礁鲨 | 0b-creatures |
| 11-jelly.js | 2 种水母 + 丝带 | 0b-creatures |
| 12-fx.js | 水花、水滴、雨、漩涡、泥沙 | 0b-fx |
| 13-audio.js | WebAudio 合成音效 | 0b-fx |
| 14-ui-main.js | 卡片、控制、快捷键、主循环 | 0b-ui |
| 15-tail.html | `</script></body></html>` | — |
