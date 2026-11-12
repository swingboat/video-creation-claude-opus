"""Student spectators (gakuran / sailor uniforms) on the galleries and stage, plus cheering banners."""
import math
import random

import bpy

from common import FRAMES, coll, key, mesh_obj, ramp, tau_of_frame
from gym import GAL_D, GAL_Z, Y1
from gym_props import text
from toon import flat, outline, tmat


def capsule(r0, r1, length, seg=12, cap=4, sx=1.0, sy=1.0):
    """Capsule from z=0 down to z=-length (verts, faces)."""
    rings = [(r0 * math.cos(math.pi / 2 * i / cap), r0 * math.sin(math.pi / 2 * i / cap)) for i in range(1, cap + 1)]
    rings += [(-length + r1 * math.cos(math.pi / 2 + math.pi / 2 * i / cap),
               r1 * math.sin(math.pi / 2 + math.pi / 2 * i / cap)) for i in range(cap)]
    vs = [(0, 0, r0)]
    for z, r in rings:
        vs += [(r * sx * math.cos(2 * math.pi * j / seg), r * sy * math.sin(2 * math.pi * j / seg), z)
               for j in range(seg)]
    vs.append((0, 0, -length - r1))
    fs = [(0, 1 + (j + 1) % seg, 1 + j) for j in range(seg)]
    for i in range(len(rings) - 1):
        a, b = 1 + i * seg, 1 + (i + 1) * seg
        fs += [(a + j, a + (j + 1) % seg, b + (j + 1) % seg, b + j) for j in range(seg)]
    last, tip = 1 + (len(rings) - 1) * seg, len(vs) - 1
    fs += [(last + j, last + (j + 1) % seg, tip) for j in range(seg)]
    return vs, fs


def _shift(vf, dx=0, dy=0, dz=0):
    return [(x + dx, y + dy, z + dz) for x, y, z in vf[0]], vf[1]


def _join(*parts):
    vs, fs = [], []
    for pv, pf in parts:
        o = len(vs)
        vs += pv
        fs += [tuple(i + o for i in f) for f in pf]
    return vs, fs


VARIANTS = {
    "boy": dict(top="#1d1f2a", bottom="#1d1f2a", hair="#1b1a20", skirt=False, long=False),
    "boy2": dict(top="#f2f2ee", bottom="#262836", hair="#2a2220", skirt=False, long=False),
    "girl": dict(top="#24305a", bottom="#24305a", hair="#2a1e1a", skirt=True, long=False),
    "girl2": dict(top="#24305a", bottom="#24305a", hair="#5a3624", skirt=True, long=True),
    "team": dict(top="#b3122e", bottom="#b3122e", hair="#1b1a20", skirt=False, long=False),
}


def prototypes(c):
    skin = tmat("CrowdSkin", "#f4c9a6", "#d38e74", rim=0.2)
    protos = {}
    for v, d in VARIANTS.items():
        top = tmat(f"Top_{v}", d["top"], rim=0.2)
        bot = tmat(f"Bot_{v}", d["bottom"], rim=0.1)
        hair = tmat(f"CHair_{v}", d["hair"], rim=0.3)
        legs = _join(_shift(capsule(0.06, 0.05, 0.75), dx=0.08, dz=0.84), _shift(capsule(0.06, 0.05, 0.75), dx=-0.08, dz=0.84))
        lower = _shift(capsule(0.12, 0.25, 0.32, sy=0.8), dz=1.0) if d["skirt"] else _shift(capsule(0.15, 0.12, 0.2, sy=0.75), dz=0.98)
        torso = _shift(capsule(0.17, 0.15, 0.48, sx=1.0, sy=0.68), dz=1.40)
        hd = _shift(capsule(0.1, 0.1, 0.03, seg=14, cap=6, sx=0.9), dz=1.58)
        hr = _shift(capsule(0.112, 0.1 if d["long"] else 0.08, 0.2 if d["long"] else 0.04, seg=14, cap=6, sx=0.95),
                    dy=0.015, dz=1.62)
        arm = capsule(0.048, 0.04, 0.58)
        parts = {"legs": (legs, bot if not d["skirt"] else skin), "lower": (lower, bot), "torso": (torso, top),
                 "head": (hd, skin), "hair": (hr, hair), "arm": (arm, top)}
        protos[v] = {}
        for p, (vf, m) in parts.items():
            ob = mesh_obj(f"P_{v}_{p}", vf[0], vf[1], c, m, smooth_shade=True)
            outline(ob, 0.012)
            protos[v][p] = ob
    eye = mesh_obj("P_eye", *capsule(0.012, 0.012, 0.0, seg=8, cap=3, sy=0.4), c, flat("CEye", "#1c1416"))
    protos["eye"] = eye
    return protos


def person(c, protos, v, loc, face, rng):
    root = bpy.data.objects.new("Fan", None)
    c.objects.link(root)
    root.location = loc
    root.rotation_euler = (0, 0, face)
    s = rng.uniform(0.93, 1.06)
    root.scale = (s, s, s)
    for p in ("legs", "lower", "torso", "head", "hair"):
        ob = bpy.data.objects.new("FanPart", protos[v][p].data)
        ob.modifiers.new("Outline", "SOLIDIFY")
        m = ob.modifiers["Outline"]
        src = protos[v][p].modifiers["Outline"]
        m.thickness, m.offset, m.use_flip_normals, m.use_rim, m.material_offset = \
            src.thickness, src.offset, True, False, src.material_offset
        c.objects.link(ob)
        ob.parent = root
    for sx in (1, -1):
        ob = bpy.data.objects.new("FanEye", protos["eye"].data)
        c.objects.link(ob)
        ob.parent = root
        ob.location = (sx * 0.035, -0.092, 1.565)
    arms = []
    for sx in (1, -1):
        ob = bpy.data.objects.new("FanArm", protos[v]["arm"].data)
        src = protos[v]["arm"].modifiers["Outline"]
        m = ob.modifiers.new("Outline", "SOLIDIFY")
        m.thickness, m.offset, m.use_flip_normals, m.use_rim, m.material_offset = \
            src.thickness, src.offset, True, False, src.material_offset
        c.objects.link(ob)
        ob.parent = root
        ob.location = (sx * 0.2, 0, 1.36)
        arms.append((ob, sx))
    return root, arms


def animate(root, arms, rng, base_z, cheer):
    """Idle sway -> excited cheering after the swish (keys on twos)."""
    ph, rate, delay = rng.uniform(0, 1), rng.uniform(2.3, 3.4), rng.uniform(0.05, 0.4)
    for f in range(0, FRAMES + 1, 2):
        t = tau_of_frame(f)
        joy = ramp(t, 5.97 + delay, 6.2 + delay)
        hop = joy * abs(math.sin(math.pi * (rate * (t - 6.0) + ph))) * 0.16
        root.location.z = base_z + hop
        key(root, "location", f, index=2)
        for ob, sx in arms:
            up = max(cheer * 0.5 * (0.5 + 0.5 * math.sin(2 * math.pi * (0.7 * t + ph))) * ramp(t, 3.0, 4.0), joy)
            wave = joy * 0.35 * math.sin(2 * math.pi * (rate * t + ph + 0.25 * sx))
            ob.rotation_euler = (0, -sx * (0.12 + up * 2.6 + wave), 0)
            key(ob, "rotation_euler", f)


def banner(c, label, x, side, bg, fg, w=3.0, h=0.85):
    y = side * (Y1 - GAL_D - 0.06)
    vs = [(x - w / 2 + w * i / 12, y + side * 0.015 * math.sin(i * 1.7), z) for i in range(13)
          for z in (GAL_Z + 1.05, GAL_Z + 1.05 - h)]
    ob = mesh_obj(f"Banner_{label}", vs, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(12)], c,
                  tmat(f"BannerBg_{label}", bg, rim=0.0))
    outline(ob, 0.02)
    rot = (math.pi / 2, 0, 0 if side > 0 else math.pi)
    text(f"BannerTx_{label}", c, label, h * 0.62, (x, y - side * 0.03, GAL_Z + 1.05 - h / 2), rot,
         flat(f"BannerFg_{label}", fg), cjk=True)


def build(seed=5):
    rng = random.Random(seed)
    c = coll("Crowd")
    pc = coll("_CrowdProto")
    protos = prototypes(pc)
    pc.hide_render = pc.hide_viewport = True
    spots = []
    for side in (1, -1):
        for row, dy in enumerate((0.45, 1.05)):
            x = -14.0
            while x < 16.5:
                if rng.random() > 0.12:
                    spots.append(((x + rng.uniform(-0.1, 0.1), side * (Y1 - GAL_D + dy), GAL_Z),
                                  0.0 if side > 0 else math.pi, 0.8))
                x += rng.uniform(0.55, 0.75)
    for i in range(14):
        spots.append(((-16.4 - rng.uniform(0, 1.2), rng.uniform(-6, 6), 1.1), math.pi / 2, 0.6))
    n = 0
    for loc, face, cheer in spots:
        v = rng.choice(["boy", "boy", "boy2", "girl", "girl2"])
        root, arms = person(c, protos, v, loc, face + rng.uniform(-0.2, 0.2), rng)
        animate(root, arms, rng, loc[2], cheer)
        n += 1
    for i, x in enumerate((-3.5, -2.6, -1.7, -0.8, 0.1)):
        root, arms = person(c, protos, "team", (x - 3, -9.7, 0.0), math.pi, rng)
        animate(root, arms, rng, 0.0, 0.3)
    banner(c, "海鳴", -6.0, 1, "#b3122e", "#ffffff")
    banner(c, "一球入魂", 1.5, 1, "#fbf8ef", "#b3122e", w=4.2)
    banner(c, "白石 ファイト！", 8.5, 1, "#bfe3f2", "#1f2d5c", w=4.6)
    banner(c, "必勝", -6.0, -1, "#fbf8ef", "#1c1a20")
    banner(c, "白峰", 5.0, -1, "#1f2d5c", "#ffffff")
    banner(c, "大地 魂", 11.0, -1, "#f08a24", "#ffffff", w=2.8)
    print(f"[crowd] {n} students")
