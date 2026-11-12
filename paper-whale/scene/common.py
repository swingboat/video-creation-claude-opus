"""Shared constants, args, easing, material factory, numpy mesh builders and PC2 writer."""
import math
import os
import struct
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(HERE, "build")
CACHE = os.path.join(BUILD, "cache")
TEX = os.path.join(BUILD, "tex")

FPS = 24
FRAMES = 240
SHOT1 = (1, 72)
SHOT2 = (73, 240)
RES = (1920, 816)

HALL_X = (-7.0, 7.0)
HALL_Y = (-4.0, 32.0)
HALL_Z = (0.0, 12.0)
WINDOWS_Y = (4.0, 11.0, 18.0, 25.0)
WIN_W, WIN_SILL, WIN_TOP = 2.4, 2.5, 9.0
TABLE_X, TABLE_Y, TABLE_H = 1.6, (2.0, 16.0), 0.76
BOOK_LOC = (1.6, 7.0, TABLE_H)
LAMP_LOC = (1.75, 7.9, TABLE_H)
WHALE_C = (0.0, 17.0, 5.2)


def arg(name, default):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return type(default)(argv[argv.index(name) + 1]) if name in argv else default


def clamp(x, a=0.0, b=1.0):
    return np.clip(x, a, b)


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp(x)
    return x * x * x * (x * (x * 6 - 15) + 10)


def hexcol(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c) + (a,)


# ---------------------------------------------------------------- materials
def mat(name, color="#808080", rough=0.5, metal=0.0, emit=None, emit_k=0.0, **inputs):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = hexcol(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = hexcol(emit)
        p.inputs["Emission Strength"].default_value = emit_k
    for k, v in inputs.items():
        p.inputs[k.replace("_", " ")].default_value = v
    return m


def node(nt, kind, loc=(0, 0), **vals):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in vals.items():
        key = k.replace("_", " ")
        if key in n.inputs:
            n.inputs[key].default_value = v
        else:
            setattr(n, k, v)
    return n


# ---------------------------------------------------------------- meshes
def mesh_np(name, verts, faces, uvs=None, smooth_shade=False, material=None, face_colors=None):
    """Build a mesh fast from numpy arrays. faces: (F, k) int array of uniform polygon size."""
    verts = np.asarray(verts, np.float32).reshape(-1, 3)
    faces = np.asarray(faces, np.int32)
    nf, k = faces.shape
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(nf * k)
    me.loops.foreach_set("vertex_index", faces.ravel())
    me.polygons.add(nf)
    me.polygons.foreach_set("loop_start", np.arange(0, nf * k, k, dtype=np.int32))
    me.update(calc_edges=True)
    if uvs is not None:
        uv = me.uv_layers.new(name="UVMap")
        uv.data.foreach_set("uv", np.asarray(uvs, np.float32).reshape(-1, 2).ravel())
    if face_colors is not None:
        at = me.attributes.new("color", "FLOAT_COLOR", "FACE")
        at.data.foreach_set("color", np.asarray(face_colors, np.float32).reshape(-1, 4).ravel())
    if smooth_shade:
        me.polygons.foreach_set("use_smooth", np.ones(nf, bool))
    if material:
        me.materials.append(material)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def boxes(center, size, rotz=None):
    """Vectorised axis boxes. center/size: (B,3); rotz: (B,) radians. Returns verts (B*8,3), faces (B*6,4)."""
    center = np.atleast_2d(np.asarray(center, np.float64))
    size = np.atleast_2d(np.asarray(size, np.float64))
    b = len(center)
    corners = np.array([[x, y, z] for z in (-.5, .5) for y in (-.5, .5) for x in (-.5, .5)])
    v = corners[None] * size[:, None, :]
    if rotz is not None:
        c, s = np.cos(rotz)[:, None], np.sin(rotz)[:, None]
        x, y = v[..., 0].copy(), v[..., 1].copy()
        v[..., 0], v[..., 1] = c * x - s * y, s * x + c * y
    v = v + center[:, None, :]
    quads = np.array([[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]])
    f = quads[None] + (np.arange(b) * 8)[:, None, None]
    return v.reshape(-1, 3), f.reshape(-1, 4)


def revolve(profile, seg=48, center=(0, 0, 0)):
    """Lathe a (r, z) profile around Z. Returns verts, quad faces."""
    pr = np.asarray(profile, np.float64)
    a = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    v = np.stack([pr[:, 0, None] * np.cos(a), pr[:, 0, None] * np.sin(a),
                  np.repeat(pr[:, 1, None], seg, 1)], -1) + np.asarray(center)
    i, j = np.meshgrid(np.arange(len(pr) - 1), np.arange(seg), indexing="ij")
    j2 = (j + 1) % seg
    f = np.stack([i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j], -1)
    return v.reshape(-1, 3), f.reshape(-1, 4)


def grid_faces(nu, nv, offset=0):
    """Quad faces for a (nu x nv) vertex grid laid out u-major."""
    i, j = np.meshgrid(np.arange(nu - 1), np.arange(nv - 1), indexing="ij")
    a = i * nv + j
    return np.stack([a, a + nv, a + nv + 1, a + 1], -1).reshape(-1, 4) + offset


def merge(parts):
    """Concatenate [(verts, faces), ...] into one (verts, faces)."""
    vs, fs, n = [], [], 0
    for v, f in parts:
        vs.append(v)
        fs.append(f + n)
        n += len(v)
    return np.concatenate(vs), np.concatenate(fs)


# ---------------------------------------------------------------- caches
def write_pc2(path, frames, start):
    """frames: sequence of (P,3) float arrays, one per frame starting at `start`."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    n = len(frames[0])
    with open(path, "wb") as fh:
        fh.write(b"POINTCACHE2\0" + struct.pack("<iiffi", 1, n, float(start), 1.0, len(frames)))
        for fr in frames:
            fh.write(np.asarray(fr, np.float32).tobytes())


def attach_pc2(ob, path, start):
    m = ob.modifiers.new("cache", "MESH_CACHE")
    m.cache_format = "PC2"
    m.filepath = path
    m.frame_start = start
    m.interpolation = "LINEAR"
    m.forward_axis, m.up_axis = "POS_Y", "POS_Z"
    return m
