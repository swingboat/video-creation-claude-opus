"""Drive any imported humanoid (VRM / MMD PMX / FBX / glTF) with the pose library.

Pose angles assume world-aligned joint frames at rest with limbs along -Z (poses.py). Each mapped
bone gets a rest correction A (rest direction -> -Z for limbs). With F_j the world-aligned frame of
joint j and `ap` its nearest *mapped* ancestor in the real armature:
    local = B_j^-1 * A_ap^-1 * (F_ap^-1 F_j) * A_j * B_j
so models whose hierarchy differs from ours (MMD: legs under 下半身, torso under センター) still work.
"""
import math
import os
import re

import addon_utils
import bpy
from mathutils import Euler, Matrix, Vector

from common import coll, hexcol
from toon import SHADOW_TINT, outline, toon_group

JOINTS = ["pelvis", "spine", "chest", "neck", "head"] + [
    f"{p}_{s}" for s in "LR" for p in ("upperarm", "forearm", "hand", "thigh", "shin", "foot")]
PARENT = {"spine": "pelvis", "chest": "spine", "neck": "chest", "head": "neck"}
for _s in "LR":
    PARENT.update({f"upperarm_{_s}": "chest", f"forearm_{_s}": f"upperarm_{_s}", f"hand_{_s}": f"forearm_{_s}",
                   f"thigh_{_s}": "pelvis", f"shin_{_s}": f"thigh_{_s}", f"foot_{_s}": f"shin_{_s}"})
DOWN = ("upperarm", "forearm", "hand", "thigh", "shin")

VRM_NAMES = {"pelvis": "hips", "spine": "spine", "chest": "chest", "neck": "neck", "head": "head"}
for _s, _w in (("L", "left"), ("R", "right")):
    VRM_NAMES.update({f"upperarm_{_s}": f"{_w}_upper_arm", f"forearm_{_s}": f"{_w}_lower_arm",
                      f"hand_{_s}": f"{_w}_hand", f"thigh_{_s}": f"{_w}_upper_leg",
                      f"shin_{_s}": f"{_w}_lower_leg", f"foot_{_s}": f"{_w}_foot"})
MMD_NAMES = {"pelvis": ["下半身"], "spine": ["上半身"], "chest": ["上半身2"], "neck": ["首"], "head": ["頭"]}
for _s, _j in (("L", "左"), ("R", "右")):
    MMD_NAMES.update({f"upperarm_{_s}": [f"{_j}腕"], f"forearm_{_s}": [f"{_j}ひじ"], f"hand_{_s}": [f"{_j}手首"],
                      f"thigh_{_s}": [f"{_j}足"], f"shin_{_s}": [f"{_j}ひざ"], f"foot_{_s}": [f"{_j}足首"]})
# normalised generic names (Mixamo, Rigify-like, VRoid J_Bip, Unity humanoid)
GENERIC = {"pelvis": ["hips", "pelvis", "chips"], "spine": ["spine", "cspine"],
           "chest": ["spine2", "chest", "upperchest", "cchest"], "neck": ["neck", "cneck"],
           "head": ["head", "chead"]}
for _s, _w in (("L", "left"), ("R", "right")):
    a, b = _s.lower(), _w
    GENERIC.update({
        f"upperarm_{_s}": [f"{b}arm", f"upperarm{a}", f"{b}upperarm", f"{a}upperarm"],
        f"forearm_{_s}": [f"{b}forearm", f"forearm{a}", f"{b}lowerarm", f"{a}lowerarm"],
        f"hand_{_s}": [f"{b}hand", f"hand{a}", f"{a}hand"],
        f"thigh_{_s}": [f"{b}upleg", f"thigh{a}", f"{b}upperleg", f"{a}upperleg"],
        f"shin_{_s}": [f"{b}leg", f"shin{a}", f"{b}lowerleg", f"calf{a}", f"{a}lowerleg"],
        f"foot_{_s}": [f"{b}foot", f"foot{a}", f"{a}foot"]})


def enable_addons():
    for mod in addon_utils.modules():
        if mod.__name__.endswith((".vrm", ".mmd_tools")):
            addon_utils.enable(mod.__name__, default_set=True)


def _norm(name):
    n = re.sub(r"(\s+\d+|\.\d{3})$", "", name.lower().split(":")[-1])
    n = re.sub(r"^(j_bip_|j_|def[-_]|org[-_]|bip0?1[_ ]?)", "", n)
    return re.sub(r"[^a-z0-9]", "", n.replace(".l", "l").replace(".r", "r").replace("_l", "l").replace("_r", "r"))


def map_bones(arm, kind=".vrm"):
    names = {b.name for b in arm.data.bones}
    ext = getattr(arm.data, "vrm_addon_extension", None) if kind == ".vrm" else None
    if ext is not None and ext.spec_version == "1.0":
        hb = ext.vrm1.humanoid.human_bones
        out = {j: getattr(hb, v).node.bone_name for j, v in VRM_NAMES.items()}
        out = {j: b for j, b in out.items() if b in names}
        if len(out) >= 12:
            return out
    if ext is not None and len(ext.vrm0.humanoid.human_bones):
        raw = {"".join("_" + ch.lower() if ch.isupper() else ch for ch in h.bone): h.node.bone_name
               for h in ext.vrm0.humanoid.human_bones}
        return {j: raw[v] for j, v in VRM_NAMES.items() if raw.get(v) in names}
    out = {j: next(c for c in cands if c in names) for j, cands in MMD_NAMES.items() if any(c in names for c in cands)}
    if len(out) >= 12:
        return out
    by_norm = {_norm(n): n for n in names}
    gen = {}
    for j, cands in GENERIC.items():
        hit = next((by_norm[c] for c in cands if c in by_norm), None)
        if hit:
            gen[j] = hit
    return gen if len(gen) > len(out) else out


def import_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".vrm":
        bpy.ops.import_scene.vrm(filepath=path)
    elif ext in (".pmx", ".pmd"):
        bpy.ops.mmd_tools.import_model(filepath=path, scale=0.08, types={"MESH", "ARMATURE", "MORPHS"})
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    elif ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        raise ValueError(f"unsupported model format: {path}")
    return ext


def toonify(mat):
    """Replace a textured material with the scene's cel shader, keeping texture colour and alpha."""
    nt = mat.node_tree
    if nt is None or any(n.type == "GROUP" and n.node_tree and n.node_tree.name.startswith("MToon") for n in nt.nodes):
        return
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None)
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if out is None:
        return
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = toon_group()
    g.inputs["Rim"].default_value = 0.25
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type, tint.blend_type = "RGBA", "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = SHADOW_TINT + (1.0,)
    if tex:
        nt.links.new(tex.outputs["Color"], g.inputs["Color"])
        nt.links.new(tex.outputs["Color"], tint.inputs[6])
    else:
        col = tuple(mat.diffuse_color)
        g.inputs["Color"].default_value = col
        tint.inputs[6].default_value = col
    nt.links.new(tint.outputs[2], g.inputs["Shadow"])
    shader = g.outputs["Shader"]
    if tex:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(tex.outputs["Alpha"], mx.inputs["Fac"])
        nt.links.new(tr.outputs[0], mx.inputs[1])
        nt.links.new(shader, mx.inputs[2])
        shader = mx.outputs[0]
    nt.links.new(shader, out.inputs["Surface"])


class Rig:
    def __init__(self, name, k, arm, root, bones, yaw):
        self.name, self.k, self.arm, self.root, self.bones, self.yaw = name, k, arm, root, bones, yaw
        self.Y = Matrix.Rotation(yaw, 3, "Z")
        self.B, self.Binv, self.A, self.Ainv, self.anc = {}, {}, {}, {}, {}
        rev = {b: j for j, b in bones.items()}
        for j, bn in bones.items():
            b = arm.data.bones[bn]
            B = b.matrix_local.to_3x3().normalized()
            A = Matrix.Identity(3)
            if j.split("_")[0] in DOWN:
                A = (b.tail_local - b.head_local).normalized().rotation_difference(self.Y @ Vector((0, 0, -1))).to_matrix()
            self.B[j], self.Binv[j], self.A[j], self.Ainv[j] = B, B.inverted(), A, A.inverted()
            p = b.parent
            while p is not None and p.name not in rev:
                p = p.parent
            self.anc[j] = rev[p.name] if p is not None else None
            arm.pose.bones[bn].rotation_mode = "QUATERNION"

    def apply_pose(self, rad, f):
        F = {}
        for j in JOINTS:
            R = self.Y @ Euler(rad[j], "XYZ").to_matrix() @ self.Y.inverted()
            F[j] = (F[PARENT[j]] @ R) if j in PARENT else R
        for j, bn in self.bones.items():
            ap = self.anc[j]
            rel = (F[ap].inverted() @ F[j]) if ap else F[j]
            Ap = self.Ainv[ap] if ap else Matrix.Identity(3)
            pb = self.arm.pose.bones[bn]
            pb.rotation_quaternion = (self.Binv[j] @ Ap @ rel @ self.A[j] @ self.B[j]).to_quaternion()
            pb.keyframe_insert("rotation_quaternion", frame=f)

    def _frame(self, j):
        pb = self.arm.pose.bones[self.bones[j]]
        F = pb.matrix.to_3x3().normalized() @ self.Binv[j] @ self.Ainv[j] @ self.Y
        return pb, self.arm.matrix_world.to_quaternion().to_matrix() @ F

    def point(self, j, v):
        pb, F = self._frame(j)
        return self.arm.matrix_world @ pb.matrix.translation + F @ Vector(v)

    def dir(self, j, v):
        return (self._frame(j)[1] @ Vector(v)).normalized()


def build(name, spec):
    """Import spec['model'], scale to spec['height'], prepare for posing; returns a Rig."""
    enable_addons()
    before = set(bpy.data.objects)
    kind = import_file(spec["model"])
    new = [o for o in bpy.data.objects if o not in before]
    c = coll(name, coll("Players"))
    for o in new:
        for u in list(o.users_collection):
            u.objects.unlink(o)
        c.objects.link(o)
        if o.type == "EMPTY" and o.parent is not None:
            o.hide_render = True
        if o.rigid_body:
            o.hide_render = True
    arm = next(o for o in new if o.type == "ARMATURE")
    root = arm
    while root.parent is not None:
        root = root.parent
    for pb in arm.pose.bones:
        for con in pb.constraints:
            if con.type == "IK":
                con.mute = True
    bones = map_bones(arm, kind)
    missing = [j for j in JOINTS if j not in bones]
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == "MESH" and not o.hide_render]
    top = max((o.matrix_world @ Vector(cn)).z for o in meshes for cn in o.bound_box)
    s = spec["height"] / top
    root.scale = tuple(v * s for v in root.scale)
    left = arm.data.bones[bones["upperarm_L"]].head_local.x
    yaw = 0.0 if left > 0 else math.pi
    if kind != ".vrm":
        for o in meshes:
            for m in o.data.materials:
                if m:
                    toonify(m)
            outline(o, 0.005 / s)
    print(f"[model] {name}: {os.path.basename(spec['model'])} scale {s:.3f} yaw {yaw:.2f} "
          f"mapped {len(bones)}/{len(JOINTS)} missing {missing}")
    return Rig(name, spec["height"] / 1.87, arm, root, bones, yaw)
