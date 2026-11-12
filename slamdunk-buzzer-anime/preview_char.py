"""Character look-dev: three players posed on a plain floor, rendered with EEVEE.

Usage: blender -b --factory-startup -P preview_char.py   -> build/preview/char_*.png
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import character  # noqa: E402
import motion  # noqa: E402
import poses as P  # noqa: E402
from common import coll, hexcol  # noqa: E402
from toon import tmat  # noqa: E402


def eevee(sc):
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            continue
    sc.view_settings.view_transform = "Standard"
    sc.eevee.taa_render_samples = 16
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    eevee(sc)
    w = bpy.data.worlds.new("W")
    sc.world = w
    if w.node_tree is None:
        w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = hexcol("#c9d4e6")
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    bpy.ops.mesh.primitive_plane_add(size=20)
    bpy.context.active_object.data.materials.append(tmat("Floor", "#d9b27c", "#b07c56"))
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sc.collection.objects.link(sun)
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
    lineup = [("Ace", -1.1, P.RELEASE), ("Mate", 0.0, P.FIST), ("Rival", 1.1, P.DEFEND)]
    for name, x, p in lineup:
        rig = character.build(name, motion.SPECS[name])
        rig.root.location = (x, 0, 0)
        P.apply(rig, p, 0)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    out = os.path.join(HERE, "build", "preview")
    os.makedirs(out, exist_ok=True)
    shots = {"front": ((0.6, -6.5, 1.5), (0, 0, 1.3), 40), "face": ((-1.0, -1.5, 1.85), (-1.1, 0, 1.75), 60),
             "three": ((3.5, -4.5, 2.0), (0, 0, 1.2), 40)}
    for nm, (pos, tgt, lens) in shots.items():
        cam.location = pos
        cam.rotation_mode = "QUATERNION"
        cam.rotation_quaternion = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y")
        cam.data.lens = lens
        sc.render.filepath = os.path.join(out, f"char_{nm}.png")
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "char.blend"))


main()
