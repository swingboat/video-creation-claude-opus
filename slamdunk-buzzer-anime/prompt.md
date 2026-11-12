# 提示词

## 原始需求（v1，见 ../rukawa-buzzer-beater/prompt.md）

> 请先review https://x.com/guanmo_ai/status/2118258208045494688 …… 以《灌篮高手》为背景，在一个篮球场，流川枫以一个漂亮的压轴三分球赢得比赛。请尽情自由发挥。

## v2 需求（本目录）

> 挺好的，只是人物不够逼真，还有办法做得更逼真吗？
> 我希望最好有“灌篮高手”一样的人物造型（球员，观众），场所，你觉得哪个方案比较适合呢？
> 按建议做（湘北高中体育馆）

采用方案 C：《THE FIRST SLAM DUNK》式「三维 + 卡通渲染」。
- 人物：骨架 + 蒙皮连续网格，动漫比例；动漫脸；成束发型；描边 + 二/三阶色块明暗。
- 场所：湘北高中体育馆（木地板、二楼看台、高窗斜阳、舞台幕布、吊挂式篮架、手翻记分牌）。
- 观众：校服学生（立领 / 水手服），看台横幅。
- 保留 v1 的工程方法：逐帧解算并烘焙关键帧、事件表驱动灯光与声音、NumPy/SciPy 合成音频。
- 渲染器改 EEVEE（卡通着色 Shader to RGB 只在 EEVEE 可用）。
- 先出两个镜头的样片静帧（起跳出手、击掌）确认画风，再渲全片。

## 分步
1. `plan/00-architecture.md`、`plan/01-style.md`
2. `scene/toon.py` → `body.py` → `head.py` → `hair.py` → `character.py`
3. `scene/gym.py` → `gym_props.py` → `crowd.py` → `lights.py`
4. 改造复用模块（poses/ball/cameras），`build_scene.py`，样片静帧

## v3 需求
> 这和动漫中的流川枫差远了
> 按最推荐做

改用 VRoid Studio 捏人（用户手工）→ 导出 VRM → `scene/vrm_char.py` 接入现有骨骼姿态/动作/镜头/渲染。
- `characters/rukawa.vrm`、`sakuragi.vrm`、`sendoh.vrm`；缺哪个就回退到程序化人物。
- Blender 安装官方扩展 “VRM format”；`tools/preview_vrm.py` 做姿态预览，`tools/inspect_vrm.py` 查骨骼映射。
- 姿态换算：VRM 静止为 T 字，每根骨骼加静止校正 A（把静止方向转到 −Z），局部旋转 = B⁻¹·A_父⁻¹·R·A·B。

## v4 需求
> 好，我们先试试方案1（找现成的流川枫同人模型）→ 按你能做的做

不复刻既有版权角色的造型，改为：
- A. 原创角色与原创学校：白石 #8 / 大地 #5（海鸣高中）vs 黑泽 #10（白峰高中），同样的压哨三分剧情；程序化人物加手指、瓜子脸、更大的眼睛、原创发型（狼尾、刺发+发带、低马尾）。
- B. 通用模型导入 `scene/humanoid.py`：VRM / PMX（mmd_tools）/ FBX / glTF；自动骨骼映射（VRM 人形、MMD 日文骨名、Mixamo、Rigify、VRoid J_Bip）、静音 MMD 的 IK、非 VRM 材质转卡通 + 描边。`characters/<姓>.vrm|pmx|fbx|glb` 存在时自动替换程序化人物（仅限有权使用的原创模型）。
