"""Shared constants, time mapping, material factory and keyframe helpers."""
import math

import bpy

FPS = 24
FRAMES = 720
TAU0 = -3.5                      # story time at frame 0

HOOP = (12.425, 0.0, 3.05)       # target basket centre (rim plane)
HOOP2 = (-12.425, 0.0, 3.05)
RIM_R = 0.225
BALL_R = 0.12
G = 9.81
CLOCK0 = 5.6                     # game clock when play resumes (tau = 0)

# (frame_start, frame_end, speed_start, speed_end) -- see plan/01-timeline.md
SEGMENTS = [
    (0, 185, 1.0, 1.0),
    (185, 205, 1.0, 0.2),
    (205, 312, 0.2, 0.2),
    (312, 372, 0.0, 0.0),
    (372, 432, 0.2, 0.2),
    (432, 444, 0.2, 1.0),
    (444, 488, 1.0, 1.0),
    (488, 498, 1.0, 0.3),
    (498, 548, 0.3, 0.3),
    (548, 558, 0.3, 1.0),
    (558, FRAMES + 1, 1.0, 1.0),
]


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp3(a, b, t):
    return tuple(lerp(a[i], b[i], t) for i in range(3))


def ramp(x, x0, x1):
    """Smoothstep of x between x0 and x1."""
    return smooth((x - x0) / (x1 - x0))


def speed_at(f):
    for f0, f1, s0, s1 in SEGMENTS:
        if f0 <= f < f1:
            return lerp(s0, s1, smooth((f - f0) / max(1e-6, f1 - f0))) if s0 != s1 else s0
    return 1.0


def _build_tau():
    tau = [TAU0]
    sub = 8
    for f in range(FRAMES + 1):
        acc = 0.0
        for k in range(sub):
            acc += speed_at(f + (k + 0.5) / sub)
        tau.append(tau[-1] + acc / sub / FPS)
    return tau


TAU = _build_tau()


def tau_of_frame(f):
    """Story time at (possibly fractional) frame f."""
    f = clamp(f, 0, FRAMES)
    i = int(f)
    return lerp(TAU[i], TAU[i + 1], f - i)


def frame_of_tau(t):
    """First (fractional) frame where story time reaches t."""
    for i in range(FRAMES):
        if TAU[i + 1] >= t > TAU[i] - 1e-9:
            d = TAU[i + 1] - TAU[i]
            return i + (0.0 if d <= 0 else (t - TAU[i]) / d)
    return float(FRAMES) if t > TAU[-1] else 0.0


def game_clock(t):
    return CLOCK0 if t < 0 else max(0.0, CLOCK0 - t)


# ---------------------------------------------------------------- events
EVENTS = []


def event(kind, t, pos=(0.0, 0.0, 0.0), **kw):
    """Record a story event (used by lights and the audio synth)."""
    e = {"type": kind, "tau": round(t, 4), "frame": round(frame_of_tau(t), 3),
         "pos": [round(p, 3) for p in pos]}
    e.update(kw)
    EVENTS.append(e)
    return e


# ---------------------------------------------------------------- colours / materials
def lin(c):
    """sRGB 0..1 component -> linear."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip("#")
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


def _tree(m):
    if m.node_tree is None:
        m.use_nodes = True
    return m.node_tree


def mat(name, color="#ffffff", rough=0.5, metal=0.0, emit=None, strength=0.0,
        sss=0.0, coat=0.0, transmission=0.0, ior=1.45, spec=0.5):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    nt = _tree(m)
    b = nt.nodes.get("Principled BSDF")
    col = hexcol(color) if isinstance(color, str) else color
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["IOR"].default_value = ior
    b.inputs["Specular IOR Level"].default_value = spec
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.02
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.08
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission
    if emit is not None:
        b.inputs["Emission Color"].default_value = hexcol(emit) if isinstance(emit, str) else emit
        b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = col
    return m


def bsdf(m):
    return m.node_tree.nodes.get("Principled BSDF")


# ---------------------------------------------------------------- objects
def coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c


def link(ob, c):
    for old in list(ob.users_collection):
        old.objects.unlink(ob)
    c.objects.link(ob)
    return ob


def mesh_obj(name, verts, faces, c, material=None, smooth_shade=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth_shade:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    c.objects.link(ob)
    if material:
        me.materials.append(material)
    return ob


def empty(name, c, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    ob.location = loc
    c.objects.link(ob)
    return ob


# ---------------------------------------------------------------- keyframes
def set_interp(kind):
    bpy.context.preferences.edit.keyframe_new_interpolation_type = kind


def key(target, path, f, value=None, index=-1, interp="LINEAR"):
    """Set target.path (optionally) and insert a keyframe at frame f."""
    if value is not None:
        if index >= 0:
            getattr(target, path)[index] = value
        else:
            setattr(target, path, value)
    set_interp(interp)
    target.keyframe_insert(path, index=index, frame=f)
    set_interp("LINEAR")


def key_visible(ob, frames_on):
    """Constant-interpolated render/viewport visibility: visible only for frames in [a, b) ranges."""
    def put(f, hidden):
        ob.hide_render = hidden
        ob.hide_viewport = hidden
        key(ob, "hide_render", f, interp="CONSTANT")
        key(ob, "hide_viewport", f, interp="CONSTANT")
    put(0, True)
    for a, b in frames_on:
        put(a, False)
        put(b, True)
