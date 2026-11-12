"""Assemble an anime player: armature + skinned body + head/face + hair + shorts + lettering."""
import math

import bpy
from mathutils import Euler, Matrix, Vector

import body
import hair
import head as H
from common import coll, hexcol, key, mesh_obj
from toon import flat, outline, tmat

TEAMS = {
    "KAIMEI": dict(jersey=("#b3122e", "#7c0e2a"), trim=("#f6f4ee", "#b4b4c8"), num="#ffffff",
                   shoe=("#f4f2ee", "#a9acc2")),
    "SHIRAMINE": dict(jersey=("#1f2d5c", "#121a3a"), trim=("#c9ced8", "#7e8498"), num="#e8ecf2",
                   shoe=("#f2f2f2", "#a8acc4")),
}


class Rig:
    def __init__(self, name, k, arm):
        self.name, self.k, self.arm, self.root = name, k, arm, arm
        self.B = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}
        self.Binv = {n: m.inverted() for n, m in self.B.items()}
        for pb in arm.pose.bones:
            pb.rotation_mode = "QUATERNION"

    def set_joint(self, j, euler, f):
        R = Euler(euler, "XYZ").to_matrix()
        pb = self.arm.pose.bones[j]
        pb.rotation_quaternion = (self.Binv[j] @ R @ self.B[j]).to_quaternion()
        pb.keyframe_insert("rotation_quaternion", frame=f)

    def point(self, j, v):
        pb = self.arm.pose.bones[j]
        return self.arm.matrix_world @ pb.matrix @ (self.Binv[j] @ Vector(v))

    def dir(self, j, v):
        pb = self.arm.pose.bones[j]
        return (self.arm.matrix_world.to_3x3() @ pb.matrix.to_3x3() @ (self.Binv[j] @ Vector(v))).normalized()


def bone_parent(ob, arm, bone_name):
    """Parent ob to a bone keeping its current (rest) world transform."""
    mw = ob.matrix_basis.copy() if ob.parent is None else ob.matrix_world.copy()
    b = arm.data.bones[bone_name]
    ob.parent = arm
    ob.parent_type = "BONE"
    ob.parent_bone = bone_name
    ob.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    ob.matrix_basis = mw


def text(name, c, body_txt, size, loc, rot, material):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body_txt
    cu.size = size
    cu.extrude = 0.003
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.materials.append(material)
    ob = bpy.data.objects.new(name, cu)
    c.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def shorts_leg(name, c, k, sx, material):
    """Flared open tube around the upper thigh (rest coordinates)."""
    seg, vs, fs = 24, [], []
    for i, (z, r) in enumerate(((0.90, 0.086), (0.81, 0.096), (0.72, 0.106))):
        for s in range(seg):
            a = 2 * math.pi * s / seg
            vs.append(((0.10 * sx + r * math.cos(a)) * k, r * 1.05 * math.sin(a) * k, z * k))
    for i in range(2):
        for s in range(seg):
            a, b = i * seg + s, i * seg + (s + 1) % seg
            fs.append((a, b, b + seg, a + seg))
    ob = mesh_obj(name, vs, fs, c, material, smooth_shade=True)
    m = ob.modifiers.new("Thick", "SOLIDIFY")
    m.thickness = 0.006 * k
    return ob


def build(name, spec):
    k = spec["height"] / 1.87
    c = coll(name, coll("Players"))
    team = TEAMS[spec["team"]]
    mats = {
        "skin": tmat(f"Skin_{name}", spec.get("skin", "#f6cdaa"), spec.get("skin_shadow", "#dc957b"), rim=0.3),
        "jersey": tmat(f"Jersey_{spec['team']}", *team["jersey"], rim=0.2),
        "trim": tmat(f"Trim_{spec['team']}", *team["trim"], rim=0.2),
        "shorts": tmat(f"Jersey_{spec['team']}", *team["jersey"]),
        "sock": tmat("Sock", "#f6f6f2", "#b6b6cc"),
        "shoe": tmat(f"Shoe_{spec['team']}", *team["shoe"], rim=0.35),
        "sole": tmat("Sole", "#f4f1e8", "#b8b2ac"),
        "band": tmat("Band", "#f6f6f2", "#b6b6cc"),
    }
    arm = body.build_armature(name, c, k)
    bod = body.body_mesh(name, c, k)
    dominant = body.skin_weights(bod, arm, k)
    body.zone_attributes(bod, k, dominant)
    sk = (spec.get("skin", "#f6cdaa"), spec.get("skin_shadow", "#dc957b"))
    white = ("#f6f6f2", "#b6b6cc")
    cols = {z: (hexcol(a), hexcol(b)) for z, (a, b) in {
        "skin": sk, "jersey": team["jersey"], "shorts": team["jersey"], "trim": team["trim"], "sock": white,
        "band": white, "shoe": team["shoe"], "sole": ("#f4f1e8", "#b8b2ac")}.items()}
    bod.data.materials.append(body.zone_material(name, cols, spec.get("wristband", False)))
    # hidden twin (armature only) so lettering can shrink-wrap to the skin, not the outline shell
    wrap = bpy.data.objects.new(f"{name}_wrap", bod.data)
    c.objects.link(wrap)
    wrap.parent = arm
    wm = wrap.modifiers.new("Armature", "ARMATURE")
    wm.object = arm
    wrap.hide_render = True
    wrap.visible_camera = False
    outline(bod, 0.010 * k)
    hd = H.head_mesh(name, c, k, mats["skin"])
    hd.location = Vector((0, -0.006, 1.712)) * k
    bpy.context.view_layer.update()
    H.face(name, c, hd, k, spec["eyes"], spec.get("iris", "#2a2438"))
    outline(hd, 0.006 * k)
    hair.build(name, c, hd, k, spec["hair"], *spec["hair_col"])
    bone_parent(hd, arm, "head")
    for sx, side in ((1, "L"), (-1, "R")):
        leg = shorts_leg(f"{name}_shorts_{side}", c, k, sx, mats["shorts"])
        outline(leg, 0.008 * k)
        bone_parent(leg, arm, f"thigh_{side}")
    numm = tmat(f"Num_{spec['team']}", team["num"], "#c2c4d8", rim=0.0)
    num = str(spec["number"])
    near = [v.co for v in bod.data.vertices if abs(v.co.x) < 0.03 * k and abs(v.co.z - 1.33 * k) < 0.06 * k]
    fy = min(v.y for v in near) / k - 0.006
    by = max(v.y for v in near) / k + 0.006
    for nm, s, loc, rot in ((f"{name}_numF", 0.13, (0, fy, 1.31), (math.pi / 2, 0, 0)),
                            (f"{name}_numB", 0.21, (0, by, 1.30), (math.pi / 2, 0, math.pi)),
                            (f"{name}_teamF", 0.048, (0, fy + 0.004, 1.415), (math.pi / 2 + 0.08, 0, 0)),
                            (f"{name}_nameB", 0.05, (0, by - 0.002, 1.43), (math.pi / 2 - 0.05, 0, math.pi))):
        txt = spec["team"] if "team" in nm else (spec["surname"] if "name" in nm else num)
        cu = text(nm + "_cu", c, txt, s * k, Vector(loc) * k, rot, numm)
        bpy.context.view_layer.update()
        me = bpy.data.meshes.new_from_object(cu.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        ob = bpy.data.objects.new(nm, me)
        c.objects.link(ob)
        ob.matrix_world = cu.matrix_world.copy()
        bpy.data.objects.remove(cu)
        ob.visible_shadow = False
        bone_parent(ob, arm, "chest")
        sw = ob.modifiers.new("Wrap", "SHRINKWRAP")
        sw.target = wrap
        sw.wrap_method = "NEAREST_SURFACEPOINT"
        sw.wrap_mode = "OUTSIDE_SURFACE"
        sw.offset = 0.0025 * k
    return Rig(name, k, arm)
