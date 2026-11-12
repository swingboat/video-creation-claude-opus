"""Crowd of linked-duplicate spectators (grouped bounce rigs) and camera flashes with synced lights."""
import math
import random

import bpy

from common import FRAMES, coll, empty, event, frame_of_tau, hexcol, key, mat, mesh_obj, ramp, tau_of_frame
from court import seat_rows
from figure import capsule

GROUPS = 14
SPACING = 0.56
PALETTE_HOME = ["#c8141e", "#c8141e", "#e8e4dc", "#1a1a1a", "#b0101a"]
PALETTE_AWAY = ["#f2f2f2", "#1b2a55", "#1b2a55", "#d8d8d8"]
PALETTE_MIX = ["#3a4a6a", "#6a3a2a", "#d0c090", "#2a5a4a", "#8a8a8a", "#c8141e", "#f2f2f2"]


def crowd_material():
    m = mat("CrowdShirt", "#888888", rough=0.75)
    nt = m.node_tree
    info = nt.nodes.new("ShaderNodeObjectInfo")
    nt.links.new(info.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def crowd_mesh():
    c = coll("_Proto")
    body = capsule("CrowdBody", c, crowd_material(), 0.2, 0.17, 0.42, 1.0, 0.7, up=True, seg=12, cap=3)
    head = capsule("CrowdHead", c, mat("CrowdSkin", "#c99a7a", rough=0.5), 0.1, 0.1, 0.02,
                   up=True, seg=12, cap=4, z0=0.72)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    c.hide_render = True
    c.hide_viewport = True
    return body.data


def bounce_rigs(c, rng):
    """GROUPS empties: seated -> stand up at the swish -> jumping celebration."""
    rigs = []
    f_swish = frame_of_tau(5.97)
    for g in range(GROUPS):
        e = empty(f"CrowdGroup{g:02d}", c)
        ph, rate, amp = rng.uniform(0, 1), rng.uniform(2.4, 3.4), rng.uniform(0.08, 0.2)
        delay = rng.uniform(0.0, 0.35)
        for f in range(0, FRAMES + 1, 2):
            t = tau_of_frame(f)
            stand = 0.12 * ramp(t, 4.6, 5.2) + 0.25 * ramp(t, 5.97 + delay, 6.25 + delay)
            hop = 0.0
            if f > f_swish:
                hop = amp * abs(math.sin(math.pi * (rate * (t - 5.97 - delay) + ph)))
                hop *= ramp(t, 6.0 + delay, 6.4 + delay)
            sway = 0.03 * math.sin(2 * math.pi * (0.4 * t + ph))
            e.location = (sway, 0, stand + hop)
            key(e, "location", f)
        rigs.append(e)
    return rigs


def build(seed=7):
    rng = random.Random(seed)
    c = coll("Crowd")
    me = crowd_mesh()
    rigs = bounce_rigs(c, rng)
    seats = []
    for (x0, y0), (x1, y1), z, face in seat_rows():
        n = int(math.hypot(x1 - x0, y1 - y0) / SPACING)
        home = y0 > 0 if abs(y0 - y1) < 1e-6 else x0 < 0
        for i in range(n):
            if rng.random() < 0.08:
                continue
            u = (i + 0.5 + rng.uniform(-0.15, 0.15)) / n
            x, y = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
            ob = bpy.data.objects.new("Fan", me)
            c.objects.link(ob)
            ob.parent = rigs[rng.randrange(GROUPS)]
            s = rng.uniform(0.9, 1.1)
            ob.scale = (s, s, s * rng.uniform(0.92, 1.08))
            ob.location = (x, y, z - 0.25)
            ob.rotation_euler = (0, 0, face + rng.uniform(-0.25, 0.25))
            pal = PALETTE_HOME if home else (PALETTE_AWAY if rng.random() < 0.6 else PALETTE_MIX)
            ob.color = hexcol(rng.choice(pal))
            ob.cycles.use_motion_blur = False
            seats.append((x, y, z + 0.55))
    print(f"[crowd] {len(seats)} fans")
    return seats


# ---------------------------------------------------------------- camera flashes
def flash_rate(t):
    if t < 4.0:
        return 1.2
    if t < 5.95:
        return 7.0
    if t < 8.0:
        return 30.0
    if t < 9.3:
        return 12.0 + (40.0 if abs(t - 9.0) < 0.12 else 0.0)
    return max(4.0, 14.0 - 2.0 * (t - 9.3))


def flashes(seats, n_emit=48, seed=11):
    rng = random.Random(seed)
    c = coll("Flashes")
    fm = mat("Flash", "#ffffff", rough=0.5)
    nt = fm.node_tree
    info = nt.nodes.new("ShaderNodeObjectInfo")
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 2500.0
    nt.links.new(info.outputs["Color"], mul.inputs[0])
    b = nt.nodes["Principled BSDF"]
    b.inputs["Emission Color"].default_value = hexcol("#eaf2ff")
    nt.links.new(mul.outputs[0], b.inputs["Emission Strength"])
    pts = rng.sample(seats, n_emit)
    emitters = []
    for i, p in enumerate(pts):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, segments=12, ring_count=6, location=p)
        ob = bpy.context.active_object
        ob.name = f"Flash{i:02d}"
        for u in list(ob.users_collection):
            u.objects.unlink(ob)
        c.objects.link(ob)
        ob.data.materials.append(fm)
        ob.color = (0, 0, 0, 1)
        ld = bpy.data.lights.new(f"FlashLight{i:02d}", "POINT")
        ld.shadow_soft_size = 0.05
        ld.color = (0.9, 0.95, 1.0)
        lo = bpy.data.objects.new(f"FlashLight{i:02d}", ld)
        c.objects.link(lo)
        lo.location = (p[0], p[1], p[2] + 0.1)
        emitters.append((ob, ld, [0.0]))
    t, t_end, count = tau_of_frame(0), tau_of_frame(FRAMES), 0
    while t < t_end:
        t += rng.expovariate(flash_rate(t))
        free = [e for e in emitters if e[2][0] < t]
        if not free:
            continue
        ob, ld, busy = rng.choice(free)
        dur = 0.035
        busy[0] = t + 0.4
        f0 = frame_of_tau(t)
        f1 = max(frame_of_tau(t + dur), f0 + 1.0)
        a, b = int(math.floor(f0)), int(math.ceil(f1))
        for f, on in ((a - 1, 0), (a, 1), (b, 0)):
            if 0 <= f <= FRAMES:
                ob.color = (on, on, on, 1)
                key(ob, "color", f, interp="CONSTANT")
                ld.energy = 1500.0 * on
                key(ld, "energy", f, interp="CONSTANT")
        event("flash", t, ob.location[:])
        count += 1
    # flashes caught mid-pop while time is frozen (segment E)
    fa, fb = 312, 372
    for ob, ld, busy in rng.sample(emitters, 9):
        for f, on in ((fa - 1, 0), (fa, 0.6), (fb, 0)):
            ob.color = (on, on, on, 1)
            key(ob, "color", f, interp="CONSTANT")
            ld.energy = 1500.0 * on
            key(ld, "energy", f, interp="CONSTANT")
    print(f"[flash] {count} flashes")
