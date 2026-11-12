# 0b 共享库 gen/lib

全部 ESM（.mjs），无依赖。每个 shot 模块拿到 `ctx`，返回动作数组。

## ids.mjs
- `idSpace(shotNo)` → `{ next() }`，从 `shotNo*10000+1` 递增；layerId 用 `100+shotNo`。

## act.mjs（动作构造，字段名严格按 schema）
- `sceneLayer({layerId,name,start,dur,ids,bg,exposure})` → createFxScene3DLayer + setFxScene3DWorld（纯色背景 + 弱环境光，`integration:"sampled"`）。
- `camera({layerId,id,pos,target,focal=35,fNumber=null,focusDist})`：Camera3D，Physical 镜头 36x24，aim 约束指向 target（aim id、target id 由 ids 分配）；返回 `{actions, camId, aimTargetId}`；再 `setFxScene3DActiveCamera`。
- `light({type:'point'|'spot'|'area'|'parallel', ...})`：Light3D，`castsShadows:true`。
- `fragment(layerId, data[], items[])` → addFxScene3DFragment。
- `meshItem({id,dataId,name,parent,pos,rot,scale,mat})`：单槽 whole packing；mat 是 `mat.mjs` 返回的 binding 构造器。
- `meshData(id, geometry)`：regions = primary + side。
- `group({id,name,parent,pos,rot,scale})`：Group3D。
- `text3d(...)`：Data text（front/back/side 区域）+ Text3D。
- `anim(layerId,itemId,prop,keys)`：setFxAnimator 关键帧；keys = `[[ms, value, ease]]`，value 自动判 float/vector3；ease：`linear`、`inOut`（贝塞尔，按 schema 的 easing 写法）、`hold`。
- `setVal(layerId,itemId,prop,value)`。
- `glow(layerId,effectId,…)`：addFxLayerEffect glow。

## geo.mjs（返回 geometry 对象）
- `gear({teeth,r,depthTooth,hole,spokes,spokeW,rim})` → extrude 路径（evenOdd）；齿形为梯形。
- `star({points,rOut,rIn})`、`ring({rOut,rIn})`、`polygon(pts)`。
- `lathe(profilePts)`：x≥0 半轮廓，自动闭合。
- `box(w,h,d)`、`cyl(r,h)`、`sphere(r)`、`torus(R,r)`、`plane(w,h)`。
- `editable({positions,faces})`：直接网格（城市方块地形等大批量时用）。
- 注意：extrude 沿 Z 挤出，平放到地面时绕 X 转 90°。

## mat.mjs（线性颜色，`srgb(hex)` 转换）
- `brass`（#B8862E，metal 1，rough .32）、`darkBrass`、`bronze`（#5A3A22）、`patina`（#4E8C78，rough .55）、
  `parchment`（#C9B48E，rough .9，可带 noise 纹理）、`water`（#2E3A44，rough .25）、
  `velvet`（#5A0E12，sheen）、`silver`（#D8D4CC metal 1 rough .25）、`stone`（#D9D2C3）、`lacquer`（#8A1C14）、
  `ink`（#1A1512）、`emissive(color,strength)`。
- 纹理材质：`texMat({baseAsset,heightAsset,heightStrength,...})` 用导入的 PNG（assetId）。

## png.mjs / tex.mjs
- `writePNG(path,w,h,rgbaBuffer)`：zlib deflate + CRC。
- tex：`skylineHeight()`（纽约天际线+祥云浮雕，2048x256）、`forestHeight()`（森林/云，用于 S09）、`parchmentNoise()`。
- 输出到 `build/tex/*.png`，build.sh 用 `import-asset --kind image` 导入，assetId = 文件名。

## 关键帧时间
- 每个 Scene3D 图层的关键帧用镜头内毫秒；整段长度 = 镜头时长 + 余量 0。
