# 0b-2 海床 / 水波模拟 / 合成水面

## 04-seabed.js — 烘焙（每个场景一张，分辨率 1024×(1024/aspect)，resize 时重新烘焙）

全屏 pass 输出 RGBA：RGB 为反照率（已乘 AO），A 为「粗糙/湿度」掩码（沙 = 1，草和珊瑚 = 0.3）。
各层按顺序合成：

1. **沙地底色**：`mix(#e8d6a8, #d4bc88, fbm)`。波纹 `sin(dot(p, dir)*14 + fbm*4)`，dir 随低频噪声缓慢旋转；深处颜色更暗。
2. **海草草甸**：mask = `smoothstep(0.55,0.7,fbm(p*0.4))`，只在水深 0.6–2.8 的区域。
   草叶纹理：沿流向拉伸的高频噪声 `vnoise(rot(p)*vec2(40,4))`，颜色 #3d6b2a 到 #7a9a3a，草甸边缘做柔和的接触暗化。
3. **珊瑚头和礁石**（使用 `reefBumps` 的圆斑）：
   - 礁石：灰褐色，用 voronoi 做裂隙；
   - 珊瑚头：表面用 F1 细胞纹（脑珊瑚褶皱），颜色在 #c87a6a、#d8b070、#9a7ac0 中随机；
   - 接触阴影：圆斑外围 `1 - 0.5*exp(-(d-r)/0.15)`，向背光方向偏移。
4. **散落物**（JS 生成 60–90 个位置，作为 uniform 数组或画在 DataTexture 中；推荐用 CanvasTexture 先画好叠加层，更简单）：
   - 珊瑚碎屑：白色小枝；海星：五角星（极坐标 `r < a*(0.6+0.4cos(5θ))`），橙红色带点状纹理；
   - 贝壳：扇形条纹；海胆：深紫色圆心加放射刺。每个都带小的接触阴影。
5. **潟湖场景**（reefLagoon=1）：额外加入环礁带（距岸 0.55S 处的一条弧形浅带，depth 降到 0.3），
   以及大量鹿角珊瑚（分叉枝：多段旋转线段的 SDF，颜色粉、紫、黄、蓝绿）和桌形珊瑚（大圆盘加放射细纹、边缘亮、底下有深阴影）。
6. **沙滩部分**（depth<0）：干沙 #f0e2c0 加细颗粒噪声；靠近水线的湿沙带颜色更深，在合成 shader 里按冲刷动态计算。

CanvasTexture 叠加层：散落物和潟湖珊瑚都在 2D canvas 上画（用 path 更容易），作为 `uDecor` 纹理传入烘焙 shader 做 alpha 合成；
珊瑚头的细胞纹仍在 shader 中计算。

## 05-water-sim.js

- `simRT` 两张，尺寸为 `N × round(N*H/W)`，N = 192 / 256 / 320（对应质量档）。
- 更新 shader（每帧 2 个子步）：
  ```
  h, v = tex(uv).rg
  avg = (左 + 右 + 上 + 下)/4
  v += (avg - h) * 1.6 ; v *= damp ; h += v
  damp = 0.992 - sponge*0.12，sponge = 1 - smoothstep(0, 0.06, 到边缘距离)
  在沙滩上（depthAt<0）：h *= 0.9（吸收）
  ```
- 注入 pass：一次最多 32 个扰动 `vec4(x, y, r, amp)`（uniform 数组），每个是高斯下压：`h -= amp*exp(-d²/r²)`。
  背鳍 V 形尾迹：鲨鱼每帧在鳍尖处注入一个小扰动，移动的点源会自然形成 V 形（开尔文尾迹近似）。
- 法线：在合成 shader 里用中心差分直接求，不单独做 pass。
- **荧光** `bioRT`：单通道，每帧 `b *= 0.94`，注入 `b += amp*exp(-d²/r²)`，再做一次 1 像素模糊扩散。分辨率是 simRT 的一半。

## 06-water-render.js — 合成 shader（全屏）

输入：`uUnder`（水下层）、`uSim`、`uBio`、`uShadow`、`uSeabedA/B`、`uMix`、场景参数。

```
p      = 世界坐标；d = depthAt(p)
n_sim  = normalize(vec3(-dhdx, -dhdy, 1))，梯度乘以强度系数 6
swell  = 沿岸线法线方向推进的长浪：phase = shoreDist*k - t*ω，k = 2π/λ，λ = 1.6
         振幅随水深变浅而增大（波浪变陡），叠加两条错相的低频波，波峰沿岸线方向有 fbm 起伏
n      = normalize(n_sim + n_swell + 细碎噪声法线*0.15)
折射：  uv' = uv + n.xy * 0.018 * min(d, 2.5)
底部：  base = texture(uUnder, uv')（已包含海床、影子、生物）
焦散：  c = caustic(p*1.4 + n.xy*0.6, t)；两层 voronoi 取 pow(1 - F1/F2 边缘, 6) 后相乘
        强度 = uCaustic * smoothstep(0, 0.4, d) * exp(-d*0.35) * (1 - shadow)
        base += c * causticTint * sunCol
水色：  a = 1 - exp(-d * absorb)；col = mix(base*shallow, deep, a)；浅处加绿松石色调
天空：  fres = 0.02 + 0.98*pow(1 - n.z, 5)；col = mix(col, sky, fres*0.6)
闪烁：  spec = pow(max(dot(reflect(-V, n), sunDir), 0), 400)，乘以 glint 和阈值噪声，形成碎光点
冲刷带：swash = 水线向沙滩方向的推进量 = 0.12S * max(0, sin(相位))^2（与长浪同相）
        shoreDist ∈ (-swash, 0) 为冲刷水膜：薄而透明，前缘是泡沫线
        蕾丝泡沫：voronoi 边缘细线 × 衰减掩码，跟随回流方向移动
        湿沙：刚退水的区域 wet = 根据上一次冲刷的最大值缓慢衰减（解析算：max(0, swashMax - shoreDist距)）
        湿沙更暗、更光滑，加天空反射和太阳高光
碎浪：  在 d < 0.35 且 swell 波峰时加白色泡沫带
荧光：  col += vec3(0.1, 0.9, 0.8) * bio * uBioOn
暗角 + ACES 色调映射 + gamma
```

`swashPhase(t)` 同时暴露给 JS（`O.swash()`，返回 0–1），用来让音效的冲刷节奏同步。
