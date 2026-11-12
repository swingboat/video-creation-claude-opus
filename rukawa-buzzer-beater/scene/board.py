"""Scoreboards (centre-hung + both end walls): names, scores, game clock, buzzer red, FINAL banner."""
import math

import bpy

from common import (FRAMES, coll, empty, frame_of_tau, game_clock, key, key_visible, mat,
                    tau_of_frame)
from court import box

T_SCORE = 5.97
T_FINAL = 7.6


def text(name, c, parent, body, size, loc, material, align="CENTER"):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.align_x = align
    cu.align_y = "CENTER"
    cu.extrude = 0.004
    ob = bpy.data.objects.new(name, cu)
    c.objects.link(ob)
    cu.materials.append(material)
    ob.parent = parent
    ob.location = loc
    return ob


def frame_ranges(pred):
    """[(a, b)] frame ranges where pred(f) is True (b exclusive)."""
    out, start = [], None
    for f in range(FRAMES + 2):
        on = f <= FRAMES and pred(f)
        if on and start is None:
            start = f
        elif not on and start is not None:
            out.append((start, f))
            start = None
    return out


def clock_tenths(f):
    return math.ceil(game_clock(tau_of_frame(f)) * 10 - 1e-6)


def face(c, tag, origin, normal, scale=1.0):
    """One display face; normal is the horizontal direction it faces."""
    yaw = math.atan2(normal[0], -normal[1])
    root = empty(f"Face_{tag}", c, origin)
    root.rotation_euler = (math.pi / 2, 0, yaw)
    root.scale = (scale, scale, scale)
    white = mat("LED_White", "#dfe8ff", emit="#dfe8ff", strength=5.0, rough=0.5)
    amber = mat("LED_Amber", "#ffb020", emit="#ffb020", strength=7.0, rough=0.5)
    red = mat("LED_Red", "#ff2a1a", emit="#ff2a1a", strength=8.0, rough=0.5)
    clock_mat = mat("LED_Clock", "#ffd23a", emit="#ffd23a", strength=8.0, rough=0.5)
    panel = mat("Panel", "#050507", rough=0.3, coat=0.4)
    bg = box(f"Panel_{tag}", c, (4.2, 2.5, 0.02), (0, 0, -0.012), panel)
    bg.parent = root
    text(f"Home_{tag}", c, root, "SHOHOKU", 0.34, (-1.25, 0.85, 0), white)
    text(f"Away_{tag}", c, root, "SANNOH", 0.34, (1.25, 0.85, 0), white)
    f_score = int(round(frame_of_tau(T_SCORE)))
    old = text(f"Score78_{tag}", c, root, "78", 0.75, (-1.25, 0.05, 0), amber)
    key_visible(old, [(0, f_score)])
    new = text(f"Score81_{tag}", c, root, "81", 0.75, (-1.25, 0.05, 0), red)
    blink = [(f_score, f_score + 5), (f_score + 9, f_score + 14), (f_score + 18, FRAMES + 1)]
    key_visible(new, blink)
    text(f"Score80_{tag}", c, root, "80", 0.75, (1.25, 0.05, 0), amber)
    for n in range(0, 57):
        rng = frame_ranges(lambda f, n=n: clock_tenths(f) == n)
        if not rng:
            continue
        body = f"{n // 10}.{n % 10}"
        ob = text(f"Clock{n:02d}_{tag}", c, root, body, 0.62, (0, 0.1, 0),
                  red if n == 0 else clock_mat)
        key_visible(ob, rng)
    f_final = int(round(frame_of_tau(T_FINAL)))
    q4 = text(f"Period_{tag}", c, root, "Q4", 0.22, (0, -0.55, 0), white)
    key_visible(q4, [(0, f_final)])
    fin = text(f"Final_{tag}", c, root, "FINAL", 0.3, (0, -0.6, 0), red)
    key_visible(fin, [(f_final, FRAMES + 1)])
    for i, msg in enumerate(("BUZZER BEATER", "#11  RUKAWA")):
        ob = text(f"Banner{i}_{tag}", c, root, msg, 0.2, (0, -0.9 - 0.0 * i, 0) if i == 0
                  else (0, -1.1, 0), amber if i == 0 else white)
        key_visible(ob, [(f_final + 6 + 8 * i, FRAMES + 1)])
    return root


def build():
    c = coll("Scoreboards")
    housing = mat("Housing", "#16171b", rough=0.4, metal=0.6)
    # centre-hung box, two faces (towards each basket)
    box("HungBox", c, (4.5, 4.6, 2.8), (0, 0, 10.0), housing)
    for i, (sx, sy) in enumerate(((1, 1), (-1, 1), (1, -1), (-1, -1))):
        box(f"HungCable{i}", c, (0.02, 0.02, 5.2), (sx * 2.0, sy * 2.0, 14.0), housing)
    face(c, "HungE", (2.27, 0, 10.0), (1, 0))
    face(c, "HungW", (-2.27, 0, 10.0), (-1, 0))
    # side faces facing the long sides
    face(c, "HungN", (0, 2.32, 10.0), (0, 1))
    face(c, "HungS", (0, -2.32, 10.0), (0, -1))
    # end-wall boards behind each basket, big
    box("WallBoxE", c, (0.3, 9.4, 5.4), (26.7, 0, 9.3), housing)
    box("WallBoxW", c, (0.3, 9.4, 5.4), (-26.7, 0, 9.3), housing)
    face(c, "WallE", (26.53, 0, 9.3), (-1, 0), scale=2.1)
    face(c, "WallW", (-26.53, 0, 9.3), (1, 0), scale=2.1)
    return c


def key_buzzer(f_buzz):
    """LED strips around both backboards + red emission on scoreboards light up at the buzzer."""
    led = bpy.data.materials["LED_Buzzer"]
    inp = led.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    for f, v in ((0, 0.0), (f_buzz - 1, 0.0), (f_buzz, 40.0), (int(frame_of_tau(8.0)), 40.0),
                 (int(frame_of_tau(8.0)) + 12, 0.0)):
        inp.default_value = v
        key(inp, "default_value", f, interp="CONSTANT" if v == 40.0 and f == f_buzz else "LINEAR")
