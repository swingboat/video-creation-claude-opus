"""Look-dev for an imported humanoid (VRM/PMX/FBX/GLB) driven by the pose library.

Usage: blender -b -P tools/preview_model.py -- path.(vrm|pmx|fbx|glb) [out_prefix]  -> build/preview/<prefix>_*.png
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import humanoid  # noqa: E402
import lights  # noqa: E402
import poses as P  # noqa: E402
from common import hexcol  # noqa: E402
from toon import tmat  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
path, prefix = args[0], (args[1] if len(args) > 1 else "model")
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
lights.render_settings(sc, 67, 16)
w = bpy.data.worlds.new("W")
sc.world = w
if w.node_tree is None:
    w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = hexcol("#c9d4e6")
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
bpy.ops.mesh.primitive_plane_add(size=20)
bpy.context.active_object.data.materials.append(tmat("Floor", "#d9b27c", "#b07c56"))
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
sc.collection.objects.link(sun)
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
lineup = [("A", -1.0, P.STAND), ("B", 0.0, P.RELEASE), ("C", 1.0, P.HIGH_FIVE_R)]
for name, x, p in lineup:
    rig = humanoid.build(name, {"model": path, "height": 1.87})
    rig.root.location = (x, 0, 0)
    rig.root.rotation_euler = (0, 0, rig.yaw)
    P.apply(rig, p, 0)
    sc.frame_set(0)
    hp = rig.point("hand_R", (0, 0, -0.07))
    print(f"[hand] {name} right hand at {tuple(round(c, 2) for c in hp)}")
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
sc.camera = cam
out = os.path.join(HERE, "build", "preview")
os.makedirs(out, exist_ok=True)
for nm, (pos, tgt, lens) in {"front": ((0.3, -6.5, 1.4), (0, 0, 1.1), 35),
                              "face": ((-1.0, -1.4, 1.75), (-1.0, 0, 1.68), 70),
                              "three": ((3.5, -4.0, 1.9), (0, 0, 1.1), 35)}.items():
    cam.location = pos
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y")
    cam.data.lens = lens
    sc.render.filepath = os.path.join(out, f"{prefix}_{nm}.png")
    bpy.ops.render.render(write_still=True)
