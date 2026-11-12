# 00 架构 · 卡通版《流川枫 · 压哨三分》

## 不变的部分（从 v1 复制）
- `common.py` 时间系统（720 帧 / 24 fps / 慢动作 / 定格段）、事件表、关键帧工具。
- `motion.py` 编排（路径、朝向、姿态选择）；`poses.py` 解剖学角度姿态库。
- `ball.py` 运球/投篮抛物线/后旋/落地弹跳；`net.py` 每帧形态键刷网。
- `cameras.py` 9 个镜头；`audio/` 声音合成。

## 改动
| 模块 | v1 | v2 |
|---|---|---|
| 渲染 | Cycles 路径追踪 | EEVEE；Standard 视图变换（颜色不被压）；无运动模糊 |
| 着色 | Principled | `toon.py`：Diffuse→Shader to RGB→硬阈值→亮/暗两色 + 边缘光；描边=反向外壳（Solidify 翻转法线 + 背面剔除黑材质） |
| 人物 | 胶囊 FK 对象层级 | 骨架 Armature + 一张连续蒙皮网格（Skin 修改器生成后烘成网格，按骨段距离算权重） |
| 头部 | 椭球 + 点眼 | 动漫头型（尖下巴）+ 射线投影贴合的眼/眉/鼻/嘴面片 |
| 头发 | 圆锥 | 成束锥形发片（二次贝塞尔扫掠），三种发型 |
| 场馆 | 夜场体育馆 | 湘北高中体育馆 |
| 观众 | 胶囊 | 校服学生（立领黑/水手服藏青），挥手跳跃，横幅 |
| 计分 | LED 记分牌 | 墙上数字计时器 + 场边手翻记分牌（翻牌动画） |
| 节奏 | 连续 | 人物“一拍二”（偶数帧取样、常量插值），镜头连续 |

## 姿态到骨骼的换算（关键接口）
- v1 每个关节的旋转是在“与世界轴对齐的父空间”里的欧拉角 R。
- 骨骼静止朝向 B（armature 空间 3×3）。骨骼局部旋转 = B⁻¹·R·B（共轭），所以 `poses.py` 的符号表可以原样复用。
- `Rig.set_joint(name, euler, f)`、`Rig.point(name, v)`、`Rig.dir(name, v)`：v 用 v1 的“对象约定”（肢体沿 −Z，角色面向 −Y）。

## 文件（每个 ≤250 行）
```
scene/toon.py       卡通材质组、材质工厂、描边
scene/body.py       骨架数据、Armature、Skin 身体网格、权重、分区材质、短裤
scene/head.py       头型、耳、脸部面片（射线投影）
scene/hair.py       发束生成 + rukawa / sakuragi / sendoh / 学生发型
scene/character.py  组装角色 Rig（含号码/队名文字骨骼父子）
scene/gym.py        地板/多色场地线/墙/二楼看台/高窗/屋架/舞台
scene/gym_props.py  吊挂篮架、计时器、手翻记分牌、长椅、横幅
scene/crowd.py      学生观众
scene/lights.py     太阳斜光、窗光、顶灯、体积光、EEVEE 设置、合成辉光
build_scene.py      组装 → build/anime.blend + events.json
```
