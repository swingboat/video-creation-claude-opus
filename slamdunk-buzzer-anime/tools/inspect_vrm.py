"""Inspect an imported VRM: blender -b -P tools/inspect_vrm.py -- path.vrm"""
import sys

import bpy

path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils  # noqa: E402

for mod in addon_utils.modules():
    if mod.__name__.endswith(".vrm"):
        addon_utils.enable(mod.__name__, default_set=True)
        print("ENABLED", mod.__name__)
bpy.ops.import_scene.vrm(filepath=path)
for ob in bpy.context.scene.objects:
    print("OBJ", ob.type, ob.name, tuple(round(v, 3) for v in ob.dimensions), ob.rotation_euler[:], ob.scale[:])
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
ext = getattr(arm.data, "vrm_addon_extension", None)
print("EXT", ext is not None)
for b in arm.data.bones:
    if b.name.startswith(("J_Bip", "Hips", "Spine", "Chest", "Neck", "Head", "Left", "Right", "J_Sec")) or "Upper" in b.name:
        d = (b.tail_local - b.head_local).normalized()
        print("BONE", b.name, "parent", b.parent.name if b.parent else None, "head", tuple(round(v, 3) for v in b.head_local),
              "dir", tuple(round(v, 2) for v in d))
try:
    hb = ext.vrm1.humanoid.human_bones if ext.spec_version == "1.0" else None
    print("SPEC", ext.spec_version)
    if hb:
        for name in ("hips", "spine", "chest", "upper_chest", "neck", "head", "left_upper_arm", "left_lower_arm",
                     "left_hand", "left_upper_leg", "left_lower_leg", "left_foot", "right_upper_arm"):
            print("MAP", name, getattr(hb, name).node.bone_name)
except Exception as e:  # noqa: BLE001
    print("MAPERR", e)
for m in bpy.data.materials:
    print("MAT", m.name, [n.type for n in m.node_tree.nodes][:6] if m.node_tree else None)
