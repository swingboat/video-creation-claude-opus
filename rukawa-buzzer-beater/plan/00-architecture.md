# 00 总体架构 · 《流川枫 · 压哨三分》

## 目标
- 30 s，24 fps，720 帧，1920×1080（依基准测试可降到 1600×900），Blender 5.2 Cycles（Metal GPU）逐帧路径追踪。
- 不导入外部模型/贴图/音频：全部几何、材质、动画、声音由脚本生成；不补帧。
- 产出可打开、可继续修改的原生工程 `build/rukawa.blend`；动画全部是原生关键帧/形态键。

## 复刻参考帖的技术点 → 本片对应
| 《瓶中风暴》 | 本片 |
|---|---|
| 参数化波面 | 参数化球场：FIBA 尺寸，地板/线/三分弧/篮架全部由函数生成 |
| 逐帧算船底四点水位 → 烘焙升沉俯仰横摇关键帧 | 制作期逐帧解算：运球弹跳、抛物线投篮（含后旋）、篮网形变（每帧一个形态键）、落地弹跳，全部烘焙为关键帧 |
| 闪电发光曲线同步驱动瓶内+房间辅助光 | 观众席相机闪光（发光球 + 同步点光源）、压哨红色 LED 灯带、比分牌切换，统一由 `events` 时间表驱动 |
| NumPy/SciPy 合成风雨海浪，~90 ms 声画延迟，低频滚动尾音 | NumPy/SciPy 合成运球、球鞋摩擦、哨声、蜂鸣器、刷网、观众欢呼、击掌；远处事件按距离加声延迟；体育馆混响 + 低频尾音 |
| 保留资产、针对对象迭代 | 模块化 `scene/*.py`；每个对象独立函数，可单独改灯光/镜头后整体重渲 |

## 坐标与单位
- 1 BU = 1 m。球场中心在原点，长轴 X（-14..14），短轴 Y（-7.5..7.5），Z 向上。
- 目标篮筐：中心 (12.425, 0, 3.05)，篮圈半径 0.225；球半径 0.12。
- 人物局部朝向 -Y（Blender 惯例），根节点 `rotation_euler.z = 方向角 + π/2`。

## 时间系统（核心）
- `f`：视频帧 0..719。`τ`：故事时间（秒），由速度曲线 `speed(τ)` 积分得到，用于慢动作/定格。
- 所有运动函数都以 `τ` 为输入；烘焙时逐帧 `τ(f)` 求值并插关键帧（线性插值）。
- 比赛计时 `clock(τ) = max(0, 5.6 - τ)`（τ<0 时冻结在 5.6）。
- 细节见 `plan/01-timeline.md`。

## 模块划分（每个文件 ≤250 行）
```
scene/common.py   常量、时间映射、材质工厂、关键帧工具（常量/线性插值切换）
scene/court.py    地板木纹、球场线、两个篮架（玻璃板/篮圈/支架）、看台
scene/crowd.py    观众（链接复制体 + Object Info 随机色）、相机闪光
scene/figure.py   人物生成器：基本体 FK 层级（骨盆→躯干→四肢），球衣/号码/头发
scene/poses.py    姿态库 + 插值：跑动步态、运球、起跳投篮、落地、击掌
scene/motion.py   编排：τ→各角色根位置/姿态，球轨迹（运球/投篮抛物线/后旋/落地弹跳）
scene/net.py      篮网网格 + 逐帧形态键（刷网鼓包 + 衰减涟漪）
scene/board.py    悬挂计分板：队名/比分/计时文字，按 τ 切换可见性；压哨 LED
scene/lights.py   顶棚灯阵、轮廓光、闪光同步光、世界环境、雾（可选）
scene/cameras.py  每个镜头一台相机 + 时间轴标记绑定，景深/运动模糊
build_scene.py    组装 → 保存 build/rukawa.blend，导出 build/events.json
audio/synth.py    NumPy/SciPy 合成 → build/audio.wav
render.sh         blender -b build/rukawa.blend -a → build/frames/
post.sh           ffmpeg 合成帧 + 音轨 + 首尾淡入淡出 → output.mp4
```

## 共享接口
- `common.T`：`tau_of_frame(f)`、`frame_of_tau(τ)`、`FRAMES=720`、`FPS=24`。
- `common.mat(name, color, rough, metal=0, emit=None, ...)` → Principled 材质。
- `common.key(ob, path, f, value, interp='LINEAR'|'CONSTANT')`。
- `figure.build(name, spec) → Rig`：`rig.root`、`rig.joints[name]`（对象，origin 在关节处）。
- `poses.apply(rig, pose_dict)`：关节欧拉角（度，正值=前屈/外展，内部换算符号）。
- `motion.bake(rigs, ball) → events`：返回事件列表 `[{t, f, type, pos}]`。
- 事件同时供灯光（闪光、LED）与音频（声音）使用 → 声画同源。

## 渲染流程
1. `blender -b -P build_scene.py` → `build/rukawa.blend`（几秒）。
2. `blender -b build/rukawa.blend -P render_setup.py -- --still F` 出单帧检查。
3. 全片：`render.sh` 分段后台渲染（可断点续渲，已存在帧跳过：`render.use_overwrite=False`）。
4. `audio/synth.py` → `post.sh` → `output.mp4`。

## 实测与决定（迭代记录）
- M3 Pro 18 核 GPU（Metal，仅 GPU）：1080p / 40 spp / 自适应采样 / OIDN，动画模式约 8–11 s/帧。
- 第 1 轮静帧：整体过曝发粉 → 顶灯能量减半、曝光 −0.6、墙/顶棚压暗；C1 相机进了看台 → 移到场边。
- 第 2 轮：击掌两手够不着 → 改前举 138° 并让樱木停近；运动模糊里人物整圈旋转 → 朝向角逐帧解缠绕；
  防守者挡住击掌 → 改为垂头走开；观众 1686 个对象关闭运动模糊（渲染从 ~45 s/帧降到 ~8 s/帧）。
- 篮球偏粉 → 压深橙色。

## 视觉风格
- 手办/搪胶质感的风格化人物（光滑基本体 + 次表面皮肤），避免恐怖谷。
- 夜场体育馆：暗看台、暖白顶灯、抛光木地板的路径追踪反射；关键时刻红色 LED 与闪光点亮。
- 致敬原作（湘北红 #11、红发 #10 击掌），不复制任何原作画面/商标图形。
