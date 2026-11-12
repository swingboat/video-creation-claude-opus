"""Basketball: procedural material, dribble/hold/shot/net/bounce trajectory baked to keyframes."""
import math

import bpy
from mathutils import Quaternion, Vector

from common import (BALL_R, FRAMES, G, HOOP, coll, event, frame_of_tau, hexcol, lerp3, mat,
                    ramp, tau_of_frame)
import motion as M

T_SWISH = 5.95


def _m(nt, op, a, b=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def ball_material():
    m = mat("Ball", "#d4581f", rough=0.62, spec=0.35)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    x, y, z = (_m(nt, "DIVIDE", sep.outputs[i], BALL_R) for i in range(3))
    w = 0.028
    s1 = _m(nt, "LESS_THAN", _m(nt, "ABSOLUTE", x), w)
    s2 = _m(nt, "LESS_THAN", _m(nt, "ABSOLUTE", z), w)
    rad = _m(nt, "SQRT", _m(nt, "ADD", _m(nt, "MULTIPLY", x, x), _m(nt, "MULTIPLY", z, z)))
    s3 = _m(nt, "LESS_THAN", _m(nt, "ABSOLUTE", _m(nt, "SUBTRACT", rad, 0.8)), w)
    seam = _m(nt, "MAXIMUM", _m(nt, "MAXIMUM", s1, s2), s3)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    nt.links.new(seam, mix.inputs["Factor"])
    mix.inputs[6].default_value = hexcol("#a63d0c")
    mix.inputs[7].default_value = hexcol("#141010")
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 420.0
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.001
    nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
    groove = nt.nodes.new("ShaderNodeBump")
    groove.invert = True
    groove.inputs["Strength"].default_value = 0.6
    groove.inputs["Distance"].default_value = 0.002
    nt.links.new(seam, groove.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], groove.inputs["Normal"])
    nt.links.new(groove.outputs["Normal"], b.inputs["Normal"])
    return m


def make_ball():
    bpy.ops.mesh.primitive_uv_sphere_add(radius=BALL_R, segments=64, ring_count=32)
    ob = bpy.context.active_object
    ob.name = "Ball"
    bpy.ops.object.shade_smooth()
    for u in list(ob.users_collection):
        u.objects.unlink(ob)
    coll("Props").objects.link(ob)
    ob.data.materials.append(ball_material())
    ob.rotation_mode = "QUATERNION"
    return ob


# ---------------------------------------------------------------- trajectory pieces
def local_to_world(root_xy, h, lx, ly):
    th = h + math.pi / 2
    return (root_xy[0] + lx * math.cos(th) - ly * math.sin(th),
            root_xy[1] + lx * math.sin(th) + ly * math.cos(th))


def dribble_pos(t):
    (x, y, _), h, _ = M.rukawa(t, 1.0)
    side = -1.0 if t < 1.5 else (1.0 if t > 2.0 else -1.0 + 2.0 * (t - 1.5) / 0.5)
    px, py = local_to_world((x, y), h, side * 0.3, -0.42)
    ph = M.dribble_phase(t)
    z = BALL_R + (0.92 - BALL_R) * abs(math.cos(math.pi * ph))
    return Vector((px, py, z))


def hand_mid(rig, side):
    return rig.joints[f"hand_{side}"].matrix_world @ Vector((0, 0, -0.07 * rig.k))


def held_pos(rig):
    r, l = hand_mid(rig, "R"), hand_mid(rig, "L")
    m = (r + l) * 0.5
    fwd = (rig.joints["chest"].matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
    return m + fwd * 0.1 + Vector((0, 0, 0.05))


def flight_solution(p0, t0):
    T = T_SWISH - t0
    tgt = Vector(HOOP)
    v0 = (tgt - p0) / T
    v0.z += 0.5 * G * T
    return v0


def after_swish(p, v, t0, t_end):
    """Net drag then free bounces on the floor; returns [(t, pos, vel)] and logs events."""
    out, t, dt = [], t0, 1 / 960
    v = Vector((v.x * 0.22, v.y * 0.22, v.z * 0.5))
    hx = Vector((HOOP[0], HOOP[1]))
    event("swish", t0 + 0.04, tuple(HOOP))
    while t < t_end:
        in_net = p.z > HOOP[2] - 0.45
        a = Vector((0, 0, -G))
        if in_net:
            c = Vector((p.x, p.y)) - hx
            a.x -= 30 * c.x + 3 * v.x
            a.y -= 30 * c.y + 3 * v.y
            a.z += 2.6 * -v.z
        v += a * dt
        p = p + v * dt
        if p.z < BALL_R and v.z < 0:
            if abs(v.z) > 0.25:
                event("bounce", t, tuple(p), strength=round(abs(v.z), 3))
            p.z = BALL_R
            v = Vector((v.x * 0.9, v.y * 0.9, -v.z * 0.74))
            if abs(v.z) < 0.25:
                v.z = 0.0
        if p.z <= BALL_R + 1e-4 and v.z == 0.0:
            sp = v.xy.length
            if sp > 0:
                v.xy *= max(0.0, sp - 0.5 * dt) / sp
        if p.x > 15.3 - BALL_R and v.x > 0:
            v.x = -v.x * 0.5
            event("bounce", t, tuple(p), strength=0.6)
        out.append((t, p.copy(), v.copy()))
        t += dt
    return out


def bake(ball, ruk):
    """Bake ball location/rotation for every frame. Returns list of world positions per frame."""
    sc = bpy.context.scene
    t_rel = M.RELEASE_T
    fr = frame_of_tau(t_rel)
    sc.frame_set(int(fr), subframe=fr - int(fr))
    p0 = held_pos(ruk)
    v0 = flight_solution(p0, t_rel)
    pf = p0 + v0 * (T_SWISH - t_rel) + Vector((0, 0, -0.5 * G * (T_SWISH - t_rel) ** 2))
    vf = v0 + Vector((0, 0, -G * (T_SWISH - t_rel)))
    tail = after_swish(pf, vf, T_SWISH, tau_of_frame(FRAMES) + 0.1)
    print(f"[ball] release {tuple(round(c, 2) for c in p0)} v0 {tuple(round(c, 2) for c in v0)} "
          f"apex {p0.z + v0.z ** 2 / (2 * G):.2f}")
    d = Vector((v0.x, v0.y, 0)).normalized()
    spin_axis = d.cross(Vector((0, 0, 1))).normalized()
    q = Quaternion()
    prev_t = tau_of_frame(0)
    positions = []
    for f in range(FRAMES + 1):
        t = tau_of_frame(f)
        sc.frame_set(f)
        if t < 0:
            pos = held_pos(ruk)
        elif t < 3.95:
            pos = dribble_pos(t)
        elif t < t_rel:
            hp = held_pos(ruk)
            pos = dribble_pos(t).lerp(hp, ramp(t, 3.95, 4.12)) if t < 4.12 else hp
        elif t < T_SWISH:
            u = t - t_rel
            pos = p0 + v0 * u + Vector((0, 0, -0.5 * G * u * u))
        else:
            i = min(int((t - T_SWISH) * 960), len(tail) - 1)
            pos, vel = tail[i][1], tail[i][2]
        dt = t - prev_t
        if t_rel <= t < T_SWISH:
            q = Quaternion(spin_axis, 2 * math.pi * 2.0 * dt) @ q
        elif t >= T_SWISH and dt > 0:
            vv = Vector((vel.x, vel.y, 0))
            if vv.length > 1e-3:
                ax = Vector((0, 0, 1)).cross(vv).normalized()
                q = Quaternion(ax, vv.length / BALL_R * dt) @ q
        elif dt > 0:
            q = Quaternion(Vector((1, 0.3, 0)).normalized(), 9.0 * dt) @ q
        prev_t = t
        ball.location = pos
        ball.rotation_quaternion = q
        ball.keyframe_insert("location", frame=f)
        ball.keyframe_insert("rotation_quaternion", frame=f)
        positions.append(tuple(pos))
    for n in range(0, 9):
        tb = 0.25 + 0.5 * n
        if tb < 3.95:
            event("dribble", tb, tuple(dribble_pos(tb)))
    return positions
