# 0b · 角色与操作（女孩、白鹅、奶奶、移动、相机）

## 08-girl.js — 小女孩（Q 版，总高约 1.15 m，头身比约 1:2.5）

层级（Group 即"骨骼"，动画只改各节点 rotation/position）：
```
root(pos,heading)
 └ hips (y=0.48)
    ├ torso ── chest
    │          ├ neck ─ head ─ hood / hair / face
    │          ├ shoulderL ─ upperArmL ─ elbowL ─ forearmL ─ handL
    │          ├ shoulderR ─ ...                         ─ handR ─ matchHolder
    │          └ basket（挂左臂肘部）
    ├ thighL ─ kneeL ─ shinL ─ footL
    └ thighR ─ ...
```
- **头**：球 r=0.2（肤色 #f2cdb4），略扁；脸：两颗黑亮小眼（小球 + 白色高光点）、腮红（透明粉色圆片）、小嘴（细线可省）。
- **头巾**：红色 #b8322a 毛呢质感（roughness 0.9），一个稍大的半球壳罩住头顶和后脑 + 下巴下系结（两个小椭球 + 两条短飘带）；
  头巾边露出几缕棕红色头发（#7a3a22 小胶囊，前额刘海 + 两侧）。
- **身体**：上衣 = 胶囊（棕褐 #6b4a35）；裙子 = LatheGeometry 喇叭形（外轮廓 6 个点，下摆 r=0.26，打补丁：贴图上几块深浅不同方块）；
  围裙 = 前方弯曲薄片（米灰 #c9bba3）；披肩 = 灰蓝短斗篷（Lathe，长到腰）。
- **手臂**：上臂/前臂胶囊（袖子色），手为小球（肤色）；**腿**：短胶囊（深色长袜 #3a2e2a），脚：赤脚（肤色小椭球，偏红表示冻着）。
- **篮子**：左臂挎小柳条篮（Lathe 碗 + 环形提手），里面一捆火柴（几根细长方体 + 红头）。
- 所有部件 castShadow；材质用 `M.mat.std(color, rough)`。

动画（每帧 `girl.update(dt)`，状态混合权重平滑过渡 0.25 s）：
- `idle`：呼吸（chest 缩放 1±0.015，周期 3 s）、轻微发抖（cold>0.5 时 hips 高频 ±0.6°）、偶尔搓手（双手合到胸前摩擦，8–12 s 随机触发）。
- `walk`：速度 1.6 m/s；步频 2.2 Hz；腿 thigh ±28°、knee 0–45°；手臂反向摆 ±22°（左手挎篮摆幅减半）；
  hips 上下 0.025、左右 roll ±3°；头稍反向稳定；脚步落地时调 `M.audio.step()` 和放脚印。
- `strike`（1.6 s 一次性）：右手从篮中取火柴（0–0.4 s）→ 双手到胸前（0.4–0.7）→ 右手快速划过左手（0.7–0.9，触发 `M.fx.strike`）
  → 右手举到面前（0.9–1.6），火焰挂在 `matchHolder` 上。结束回调。
- `warm`：双手伸向前方火源，身体微前倾，持续循环。
- `hug`：结局用，双臂向前上抬，身体前倾，抬头。
- `look(target)`：头朝向某点（yaw 限 ±60°），站点演出时使用。

API：`M.girl = {group, pos:Vector3, heading, speed, setTarget(x,z), stop(), play(name, onDone), state, look(v|null)}`。

## 09-npcs.js

**白鹅**（长约 0.7 m）：身体 = 拉长椭球（白 #f4f1ea），颈 = 3 节小球链（可弯），头 + 橙色喙 + 黑眼；脚橙色小片；翅膀两片扁椭球。
- 状态：`hidden` → `appear`（站点 2：从面包房门口走出，翅膀扑扇 2 次，"嘎"一声）→ `follow`：
  保持在女孩身后 1.2 m 的跟随点（女孩 heading 后方偏左），超过 2.5 m 才走，摇摆步态（身体 roll ±8°），偶尔低头啄地。
- 头顶淡淡的暖光点（证明它来自火柴光，"真的"），站点 5 结局时坐在女孩脚边。

**奶奶**（高约 1.5 m）：比例写实一点的 Q 版。白发髻（球）+ 圆脸 + 小圆眼镜（细环）+ 酒红色长裙（Lathe）+ 米色披肩 + 围巾。
- 材质带轻微自发光（暖金 #ffd9a0，emissiveIntensity 0.25）+ 外围一层 BackSide 光晕壳（加法混合，透明 0.25）。
- `show(t)`：从流星落点的光柱中淡入（opacity 0→1，自下而上的溶解：shader 中按 y 阈值裁剪 + 边缘金色）。
- 动作：站立微笑、`reach`（伸出双手）、`hug`（与女孩相拥，结局）。

## 10-control.js — 移动与相机

- `M.input.onTap(e)`：raycaster 打 y=0 平面 → (x,z)；若 `!walkable` 则沿女孩→点的线段向回取最后一个可走点；
  调 `girl.setTarget`，在落点放一个淡金色扩散光圈（`M.fx.tapRing`）。剧情锁定（`M.story.locked`）时忽略。
- 行走：每帧朝目标转向（角速度 8 rad/s），前进 speed*dt；下一步若不可走或撞碰撞体（圆推挤：沿法线推出），
  尝试仅 X 或仅 Z 分量滑动；卡住 0.5 s 则停止。距离 < 0.15 停止 → idle。
- 女孩之间与白鹅不碰撞。
- **跟随相机**：状态 `{yaw, pitch, dist}` 与目标值平滑插值；目标点 = 女孩位置（平滑 4/s）+ (0,0.9,0)。
  拖动：dx → yaw（0.005 rad/px），dy → pitch；滚轮/捏合 → dist。相机位置 = 目标 + 球坐标；
  相机不低于 y=0.6，不穿进西排房屋（x 不小于 -3.8 时约束：若 x< -3.8 把 yaw 推回）。
- **剧情镜头** `M.cam.focus({target, dist, yaw, pitch, dur})`：临时覆盖目标值，`M.cam.release()` 恢复跟随。
- 键盘（可选）：WASD 也可移动（相对相机方向）。
