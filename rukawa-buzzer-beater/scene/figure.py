"""Stylised vinyl-toy basketball player built from primitives as an FK object hierarchy.

Every joint is a mesh object whose origin sits on the joint; limbs hang along -Z, the
character faces -Y (its left side is +X). poses.py converts anatomical angles to Euler.
"""
import math

import bpy
from mathutils import Vector

from common import coll, empty, mat, mesh_obj

BASE_H = 1.935   # height of the unscaled skeleton below


def _ring_verts(z, r, sx, sy, seg):
    return [(r * sx * math.cos(2 * math.pi * k / seg), r * sy * math.sin(2 * math.pi * k / seg), z)
            for k in range(seg)]


def capsule(name, c, material, r0, r1, length, sx=1.0, sy=1.0, up=False, seg=24, cap=6, z0=0.0):
    """Tapered capsule from z0 down to z0-length (or up when up=True); elliptic section sx, sy."""
    rings = []
    for i in range(1, cap + 1):
        p = (math.pi / 2) * i / cap
        rings.append((r0 * math.cos(p), r0 * math.sin(p)))
    for i in range(0, cap):
        p = math.pi / 2 + (math.pi / 2) * i / cap
        rings.append((-length + r1 * math.cos(p), r1 * math.sin(p)))
    verts = [(0, 0, r0)]
    for z, r in rings:
        verts += _ring_verts(z, max(r, 1e-4), sx, sy, seg)
    verts.append((0, 0, -length - r1))
    faces = []
    for k in range(seg):
        faces.append((0, 1 + (k + 1) % seg, 1 + k))
    for i in range(len(rings) - 1):
        a, b = 1 + i * seg, 1 + (i + 1) * seg
        for k in range(seg):
            k2 = (k + 1) % seg
            faces.append((a + k, a + k2, b + k2, b + k))
    last, tip = 1 + (len(rings) - 1) * seg, len(verts) - 1
    for k in range(seg):
        faces.append((last + k, last + (k + 1) % seg, tip))
    s = -1 if up else 1
    verts = [(x, y, s * z + z0) for x, y, z in verts]
    if up:
        faces = [tuple(reversed(f)) for f in faces]
    return mesh_obj(name, verts, faces, c, material, smooth_shade=True)


def ellipsoid(name, c, material, rx, ry, rz, seg=28):
    return capsule(name, c, material, rz, rz, 0.0, rx / rz, ry / rz, seg=seg, cap=8, z0=0.0)


def attach(ob, parent, loc, rot=(0, 0, 0)):
    ob.parent = parent
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def cone_strand(name, c, material, parent, base, direction, r, length):
    """Hair spike: cone from base along direction, parented to `parent` (local coords)."""
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, radius2=0.0, depth=length)
    ob = bpy.context.active_object
    ob.name = name
    for u in list(ob.users_collection):
        u.objects.unlink(ob)
    c.objects.link(ob)
    ob.data.materials.append(material)
    ob.data.shade_smooth()
    d = Vector(direction).normalized()
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("Z", "Y")
    ob.parent = parent
    ob.location = Vector(base) + d * (length / 2)
    return ob


def number_text(name, c, material, parent, body, size, loc, rot):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = 0.004
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    ob = bpy.data.objects.new(name, cu)
    c.objects.link(ob)
    cu.materials.append(material)
    return attach(ob, parent, loc, rot)


class Rig:
    def __init__(self, name, k, root, joints):
        self.name, self.k, self.root, self.joints = name, k, root, joints


def build(name, spec):
    """spec: height, jersey, trim, number_col, number, hair ('rukawa'|'sakuragi'|'short'),
    hair_col, skin, shoe, sock, wristband (bool), team (str)."""
    k = spec["height"] / BASE_H
    c = coll(name, coll("Players"))
    skin = mat(f"Skin_{name}", spec.get("skin", "#e9b48f"), rough=0.45, sss=0.25)
    jersey = mat(f"Jersey_{spec['team']}", spec["jersey"], rough=0.62, sss=0.05)
    trim = mat(f"Trim_{spec['team']}", spec["trim"], rough=0.5)
    numc = mat(f"Num_{spec['team']}", spec["number_col"], rough=0.45)
    hair = mat(f"Hair_{name}", spec["hair_col"], rough=0.5, coat=0.1)
    shoe = mat(f"Shoe_{name}", spec.get("shoe", "#1a1a1a"), rough=0.4, coat=0.4)
    sock = mat("Sock", "#f2f2ee", rough=0.8)
    sole = mat("Sole", "#f4f1e8", rough=0.6)
    eye = mat("Eye", "#0d0d10", rough=0.15, coat=0.6)

    root = empty(f"{name}_root", c)
    J = {}
    J["pelvis"] = attach(ellipsoid(f"{name}_pelvis", c, jersey, 0.175 * k, 0.12 * k, 0.12 * k),
                         root, (0, 0, 1.015 * k))
    J["pelvis"].data.materials[0] = mat(f"Shorts_{spec['team']}", spec["jersey"], rough=0.55)
    J["spine"] = attach(capsule(f"{name}_spine", c, jersey, 0.15 * k, 0.15 * k, 0.16 * k,
                                1.12, 0.78, up=True), J["pelvis"], (0, 0, 0.08 * k))
    J["chest"] = attach(capsule(f"{name}_chest", c, jersey, 0.165 * k, 0.15 * k, 0.17 * k,
                                1.25, 0.72, up=True, z0=0.06 * k), J["spine"], (0, 0, 0.22 * k))
    J["neck"] = attach(capsule(f"{name}_neck", c, skin, 0.055 * k, 0.06 * k, 0.07 * k, up=True),
                       J["chest"], (0, 0, 0.30 * k))
    J["head"] = attach(ellipsoid(f"{name}_head", c, skin, 0.105 * k, 0.12 * k, 0.13 * k),
                       J["neck"], (0, -0.01 * k, 0.11 * k))
    # torso trims and lettering
    for nm, loc, rot, R in (("NeckTrim", (0, -0.01, 0.31), (0.25, 0, 0), 0.075),
                            ("ArmTrimL", (0.18, 0, 0.25), (0, math.radians(80), 0), 0.07),
                            ("ArmTrimR", (-0.18, 0, 0.25), (0, math.radians(-80), 0), 0.07)):
        bpy.ops.mesh.primitive_torus_add(major_radius=R * k, minor_radius=0.012 * k,
                                         major_segments=32, minor_segments=8)
        t = bpy.context.active_object
        t.name = f"{name}_{nm}"
        for u in list(t.users_collection):
            u.objects.unlink(t)
        c.objects.link(t)
        t.data.materials.append(trim)
        t.data.shade_smooth()
        attach(t, J["chest"], tuple(v * k for v in loc), rot)
    num = str(spec["number"])
    number_text(f"{name}_numF", c, numc, J["chest"], num, 0.15 * k, (0, -0.122 * k, 0.12 * k),
                (math.pi / 2, 0, 0))
    number_text(f"{name}_numB", c, numc, J["chest"], num, 0.2 * k, (0, 0.118 * k, 0.15 * k),
                (math.pi / 2, 0, math.pi))
    number_text(f"{name}_teamF", c, numc, J["chest"], spec["team"], 0.05 * k,
                (0, -0.124 * k, 0.24 * k), (math.pi / 2 + 0.12, 0, 0))

    for side, sx in (("L", 1), ("R", -1)):
        ua = J[f"upperarm_{side}"] = attach(
            capsule(f"{name}_upperarm_{side}", c, skin, 0.055 * k, 0.045 * k, 0.29 * k),
            J["chest"], (sx * 0.215 * k, 0, 0.27 * k))
        fa = J[f"forearm_{side}"] = attach(
            capsule(f"{name}_forearm_{side}", c, skin, 0.045 * k, 0.035 * k, 0.25 * k),
            ua, (0, 0, -0.30 * k))
        J[f"hand_{side}"] = attach(
            capsule(f"{name}_hand_{side}", c, skin, 0.04 * k, 0.035 * k, 0.11 * k, 0.75, 1.15),
            fa, (0, 0, -0.27 * k))
        if spec.get("wristband"):
            attach(capsule(f"{name}_band_{side}", c, sock, 0.043 * k, 0.043 * k, 0.05 * k, seg=20),
                   fa, (0, 0, -0.19 * k))
        th = J[f"thigh_{side}"] = attach(
            capsule(f"{name}_thigh_{side}", c, skin, 0.085 * k, 0.06 * k, 0.43 * k),
            J["pelvis"], (sx * 0.1 * k, 0, -0.04 * k))
        attach(capsule(f"{name}_shortleg_{side}", c, J["pelvis"].data.materials[0],
                       0.105 * k, 0.098 * k, 0.2 * k), th, (0, 0, -0.02 * k))
        attach(capsule(f"{name}_shorthem_{side}", c, trim, 0.1 * k, 0.1 * k, 0.012 * k),
               th, (0, 0, -0.23 * k))
        sh = J[f"shin_{side}"] = attach(
            capsule(f"{name}_shin_{side}", c, skin, 0.058 * k, 0.042 * k, 0.42 * k),
            th, (0, 0, -0.45 * k))
        attach(capsule(f"{name}_sock_{side}", c, sock, 0.047 * k, 0.045 * k, 0.13 * k),
               sh, (0, 0, -0.30 * k))
        ft = J[f"foot_{side}"] = attach(
            capsule(f"{name}_foot_{side}", c, shoe, 0.055 * k, 0.05 * k, 0.17 * k, 0.85, 0.75),
            sh, (0, 0, -0.44 * k), (math.pi / 2, 0, 0))
        ft.rotation_euler = (0, 0, 0)
        ft.data.transform(_foot_matrix(k))
        attach(capsule(f"{name}_sole_{side}", c, sole, 0.058 * k, 0.054 * k, 0.18 * k, 0.88, 0.25,
                       seg=20), ft, (0, 0.05 * k, -0.075 * k), (math.pi / 2, 0, 0))
        attach(ellipsoid(f"{name}_ear_{side}", c, skin, 0.018 * k, 0.03 * k, 0.04 * k),
               J["head"], (sx * 0.103 * k, 0.005 * k, 0.0))
        attach(ellipsoid(f"{name}_eye_{side}", c, eye, 0.016 * k, 0.008 * k, 0.022 * k),
               J["head"], (sx * 0.042 * k, -0.112 * k, 0.012 * k))
    hair_style(name, c, hair, J["head"], k, spec["hair"])
    return Rig(name, k, root, J)


def _foot_matrix(k):
    from mathutils import Matrix
    # foot capsule lies along -Y (toes forward), ankle at origin, sole near z = -0.08
    return Matrix.Translation((0, -0.05 * k, -0.045 * k)) @ Matrix.Rotation(-math.pi / 2, 4, "X")


def hair_style(name, c, hair, head, k, style):
    cap = ellipsoid(f"{name}_haircap", c, hair, 0.113 * k, 0.127 * k, 0.12 * k)
    attach(cap, head, (0, 0.012 * k, 0.03 * k))
    if style == "rukawa":
        # long fringe falling over the brow, layered side locks, tapered nape
        for i in range(13):
            x = (-0.09 + 0.015 * i) * k
            d = (x * 4.0, -0.12, -1.0)
            cone_strand(f"{name}_fringe{i}", c, hair, head, (x, -0.098 * k, 0.11 * k), d,
                        0.02 * k, (0.085 + 0.02 * math.sin(i * 1.7)) * k)
        for s in (1, -1):
            for j in range(4):
                cone_strand(f"{name}_lock{s}{j}", c, hair, head,
                            (s * 0.1 * k, (-0.05 + 0.04 * j) * k, 0.06 * k),
                            (s * 0.35, 0.1 * j, -1.0), 0.032 * k, 0.12 * k)
        for j in range(5):
            cone_strand(f"{name}_nape{j}", c, hair, head, ((-0.06 + 0.03 * j) * k, 0.1 * k, 0.0),
                        (0, 0.4, -1.0), 0.035 * k, 0.1 * k)
    elif style == "sakuragi":
        for i in range(26):
            a = i * 2.399
            u = 0.25 + 0.75 * (i / 26)
            d = (math.cos(a) * u, math.sin(a) * u - 0.15, 1.0 - 0.45 * u)
            cone_strand(f"{name}_spike{i}", c, hair, head,
                        (0.07 * k * math.cos(a) * u, 0.07 * k * math.sin(a) * u, 0.13 * k), d,
                        0.026 * k, 0.07 * k)
    for s in (1, -1):
        brow = capsule(f"{name}_brow{s}", c, hair, 0.008 * k, 0.008 * k, 0.04 * k, seg=10, cap=3)
        attach(brow, head, (s * 0.06 * k, -0.115 * k, 0.045 * k),
               (0, math.radians(90 - s * 8), 0))
