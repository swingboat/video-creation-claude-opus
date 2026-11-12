"""Gym props: stage, suspended hoops, wall timer/scoreboard, flip score board, doors, lamps, banners."""
import math
import os

import bpy

from common import (FRAMES, HOOP, RIM_R, coll, frame_of_tau, game_clock, key, key_visible, mesh_obj,
                    tau_of_frame)
from gym import X0, X1, Y1, GAL_Z, GAL_D, Boxes
from toon import flat, outline, tmat

T_SCORE = 5.97
FONT_PATHS = ["/System/Library/Fonts/Hiragino Sans GB.ttc", "/System/Library/Fonts/STHeiti Medium.ttc"]
_font = None


def cjk_font():
    global _font
    if _font is None:
        for p in FONT_PATHS:
            if os.path.exists(p):
                _font = bpy.data.fonts.load(p)
                break
    return _font


def text(name, c, body, size, loc, rot, material, cjk=False, parent=None):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.extrude = 0.004
    if cjk and cjk_font():
        cu.font = cjk_font()
    cu.materials.append(material)
    ob = bpy.data.objects.new(name, cu)
    c.objects.link(ob)
    ob.parent = parent
    ob.location, ob.rotation_euler = loc, rot
    ob.visible_shadow = False
    return ob


def frame_ranges(pred):
    out, start = [], None
    for f in range(FRAMES + 2):
        on = f <= FRAMES and pred(f)
        if on and start is None:
            start = f
        elif not on and start is not None:
            out.append((start, f))
            start = None
    return out


# ---------------------------------------------------------------- stage
def stage(c):
    wood = tmat("StageWood", "#7a4a2c", "#4a2a24", rim=0.0)
    cream = tmat("WallCream", "#efe4cc", "#b4a9a6", rim=0.0)
    b = Boxes()
    b.add((X0 - 16) / 2, 0, 0.55, -16 - X0, 16, 1.1)
    b.build("StagePlatform", c, wood, 0.02)
    p = Boxes()
    for s in (1, -1):
        p.add(-16, s * 9.75, 5.5, 0.4, 6.5, 11)
    p.add(-16, 0, 9.0, 0.4, 13.0, 4.0)
    p.build("Proscenium", c, cream, 0.02)
    red = tmat("Curtain", "#9a1f33", "#561229", rim=0.15)
    for s in (1, -1):
        vs, fs = [], []
        for i in range(25):
            y = s * (6.5 - 2.6 * i / 24)
            for z in (1.1, 7.0):
                vs.append((-16.35 + 0.09 * math.sin(i * 1.3), y, z))
        fs = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(24)]
        outline(mesh_obj(f"Curtain{s:+d}", vs, fs, c, red), 0.02)
    vs = [(-16.3 + 0.07 * math.sin(i * 1.1), -6.5 + 13 * i / 40, z) for i in range(41) for z in (6.2, 7.0)]
    outline(mesh_obj("Valance", vs, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(40)], c, red), 0.02)
    plaque = Boxes()
    plaque.add(-15.75, 0, 8.6, 0.06, 4.6, 0.9)
    plaque.build("Plaque", c, tmat("Plaque", "#2a2e3a", "#161822", rim=0.0), 0.015)
    text("SchoolName", c, "海鳴高等学校", 0.55, (-15.7, 0, 8.6), (math.pi / 2, 0, math.pi / 2),
         flat("Gold", "#f0cf6a"), cjk=True)


# ---------------------------------------------------------------- hoops
def hoop(c, s):
    white = tmat("Board", "#fbfbf7", "#b9bccf", rim=0.0)
    red = tmat("BoardRed", "#d52a22", "#7c1824", rim=0.0)
    steel = tmat("Steel", "#f1f1ee", "#a7a9bb", rim=0.0)
    orange = tmat("Rim", "#ec6a1e", "#9a3a1c", rim=0.3)
    fx, z0 = s * 12.8, 2.9
    b = Boxes()
    b.add(fx + s * 0.02, 0, z0 + 0.525, 0.04, 1.8, 1.05)
    b.build(f"Board{s:+d}", c, white, 0.015)
    r = Boxes()
    face = fx - s * 0.004
    for cy, cz, sy, sz in ((0, z0 + 1.02, 1.8, 0.06), (0, z0 + 0.03, 1.8, 0.06), (-0.87, z0 + 0.525, 0.06, 1.05),
                           (0.87, z0 + 0.525, 0.06, 1.05), (0, z0 + 0.6, 0.59, 0.05), (0, z0 + 0.175, 0.59, 0.05),
                           (-0.27, z0 + 0.39, 0.05, 0.45), (0.27, z0 + 0.39, 0.05, 0.45)):
        r.add(face, cy, cz, 0.01, sy, sz)
    r.build(f"BoardLines{s:+d}", c, red)
    bpy.ops.mesh.primitive_torus_add(major_radius=RIM_R + 0.01, minor_radius=0.011, major_segments=64,
                                     minor_segments=10, location=(s * HOOP[0], 0, HOOP[2] - 0.01))
    rim = bpy.context.active_object
    rim.name = f"Rim{s:+d}"
    for u in list(rim.users_collection):
        u.objects.unlink(rim)
    c.objects.link(rim)
    rim.data.materials.append(orange)
    outline(rim, 0.006)
    fr = Boxes()
    fr.add(fx - s * 0.08, 0, HOOP[2] - 0.03, 0.16, 0.14, 0.05)
    for y in (-0.6, 0.6):
        fr.add(s * 13.0, y, (z0 + 1.05 + 11.0) / 2, 0.1, 0.1, 11.0 - z0 - 1.05)
        tx = s * 18.8 if s > 0 else -16.2
        mx, mz = (s * 13.0 + tx) / 2, 10.0
        ln = math.hypot(tx - s * 13.0, 1.6)
        fr.add(mx, y * 1.6, mz, ln, 0.08, 0.08)
    fr.add(s * 13.0, 0, z0 + 1.2, 0.1, 1.4, 0.1)
    fr.build(f"HoopFrame{s:+d}", c, steel, 0.012)


# ---------------------------------------------------------------- timer + scores
def wall_board(c):
    housing = Boxes()
    housing.add(X1 - 0.1, 0, 7.2, 0.2, 5.6, 1.9)
    housing.build("WallBoard", c, tmat("BoardBox", "#22232a", "#111218", rim=0.0), 0.02)
    red = flat("LedRed", "#ff3b2a", 1.6)
    amber = flat("LedAmber", "#ffc23a", 1.6)
    white = flat("LedWhite", "#f4f2ea", 1.2)
    rot = (math.pi / 2, 0, -math.pi / 2)
    x = X1 - 0.21
    text("BoardHome", c, "海鳴", 0.36, (x, 1.9, 7.75), rot, white, cjk=True)
    text("BoardAway", c, "白峰", 0.36, (x, -1.9, 7.75), rot, white, cjk=True)
    f_score = int(round(frame_of_tau(T_SCORE)))
    key_visible(text("Score78", c, "78", 0.8, (x, 1.9, 6.9), rot, amber), [(0, f_score)])
    key_visible(text("Score81", c, "81", 0.8, (x, 1.9, 6.9), rot, red),
                [(f_score, f_score + 5), (f_score + 9, f_score + 14), (f_score + 18, FRAMES + 1)])
    text("Score80", c, "80", 0.8, (x, -1.9, 6.9), rot, amber)
    for n in range(0, 57):
        rng = frame_ranges(lambda f, n=n: math.ceil(game_clock(tau_of_frame(f)) * 10 - 1e-6) == n)
        if rng:
            ob = text(f"Clock{n:02d}", c, f"{n // 10}.{n % 10}", 0.9, (x, 0, 7.25), rot, red if n == 0 else amber)
            key_visible(ob, rng)
    lamp = mesh_obj("BuzzerLamp", *_dome(0.22), c, flat("Lamp", "#ff2a1a", 0.35))
    lamp.location = (X1 - 0.3, 0, 8.35)
    em = lamp.data.materials[0].node_tree.nodes["Emission"].inputs["Strength"]
    f_buzz = int(round(frame_of_tau(5.6)))
    for f, v in ((0, 0.35), (f_buzz, 3.0), (int(frame_of_tau(7.5)), 3.0), (int(frame_of_tau(7.5)) + 1, 0.35)):
        em.default_value = v
        key(em, "default_value", f, interp="CONSTANT")


def _dome(r, seg=16, rings=6):
    vs, fs = [(0, 0, r)], []
    for i in range(1, rings + 1):
        th = math.pi / 2 * i / rings
        vs += [(r * math.sin(th) * math.cos(2 * math.pi * j / seg), r * math.sin(th) * math.sin(2 * math.pi * j / seg),
                r * math.cos(th)) for j in range(seg)]
    fs += [(0, 1 + j, 1 + (j + 1) % seg) for j in range(seg)]
    for i in range(rings - 1):
        a = 1 + i * seg
        fs += [(a + j, a + seg + j, a + seg + (j + 1) % seg, a + (j + 1) % seg) for j in range(seg)]
    return vs, fs


def flip_board(c):
    """Manual flip score board on the scorer's table; the home card flips 78 -> 81."""
    t = Boxes()
    t.add(0, -8.9, 0.36, 2.6, 0.7, 0.72)
    t.add(0, -8.9, 1.05, 1.5, 0.06, 0.66)
    t.build("ScoreTable", c, tmat("Table", "#6b4a33", "#3e2a26", rim=0.0), 0.012)
    card = tmat("Card", "#fbfaf4", "#b8b9c8", rim=0.0)
    ink = flat("CardInk", "#18161c")
    rot = (math.pi / 2, 0, math.pi)
    for x, label, col, num in ((0.38, "海鳴", "#b3122e", "81"), (-0.38, "白峰", "#1f2d5c", "80")):
        text(f"Label{label}", c, label, 0.13, (x, -8.86, 1.3), rot, flat(f"L{label}", col), cjk=True)
        back = mesh_obj(f"Card{num}", [(-0.3, 0, -0.25), (0.3, 0, -0.25), (0.3, 0, 0.25), (-0.3, 0, 0.25)],
                        [(0, 1, 2, 3)], c, card)
        back.location = (x, -8.86, 1.0)
        text(f"Num{num}", c, num, 0.36, (0, 0.005, 0), rot, ink, parent=back)
    hinge = bpy.data.objects.new("FlipHinge", None)
    c.objects.link(hinge)
    hinge.location = (0.38, -8.84, 1.25)
    front = mesh_obj("Card78", [(-0.3, 0, -0.5), (0.3, 0, -0.5), (0.3, 0, 0), (-0.3, 0, 0)], [(0, 1, 2, 3)], c, card)
    front.parent = hinge
    text("Num78", c, "78", 0.36, (0, 0.005, -0.25), rot, ink, parent=front)
    f0 = int(round(frame_of_tau(T_SCORE + 0.6)))
    for f, a in ((f0, 0.0), (f0 + 6, math.radians(-180))):
        hinge.rotation_euler = (a, 0, 0)
        key(hinge, "rotation_euler", f)


def build():
    c = coll("Props")
    stage(c)
    hoop(c, 1)
    hoop(c, -1)
    wall_board(c)
    flip_board(c)
    return c
