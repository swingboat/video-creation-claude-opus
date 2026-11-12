"""Nine shot cameras bound by timeline markers; every camera move is baked per frame."""
import math

import bpy
from mathutils import Vector

from common import FRAMES, HOOP, coll, lerp, lerp3, smooth, tau_of_frame
import motion as M

SHOTS = [("C1", 0), ("C2", 84), ("C3", 185), ("C4", 262), ("C5", 312), ("C6", 372),
         ("C7", 444), ("C8", 520), ("C9", 580)]
SHOT_SPOT = Vector((5.6, 3.6, 0))


def _ruk(f):
    t = tau_of_frame(f)
    return Vector(M.rukawa(t, 1.0)[0])


def _sak(f):
    t = tau_of_frame(f)
    return Vector(M.sakuragi(t, 1.0)[0])


def smoothed(fn, f0, f1, alpha=0.18):
    out, cur = {}, None
    for f in range(f0 - 30, f1 + 3):
        v = fn(max(0, min(FRAMES, f)))
        cur = v if cur is None else cur.lerp(v, alpha)
        out[f] = cur.copy()
    return out


def u_of(f, f0, f1):
    return smooth((f - f0) / (f1 - f0))


def shot_fns(ball):
    B = [Vector(p) for p in ball]
    hoop = Vector(HOOP)
    d = (hoop - SHOT_SPOT).xy.normalized()
    d3, n3 = Vector((d.x, d.y, 0)), Vector((-d.y, d.x, 0))
    R2 = smoothed(_ruk, 84, 185, 0.12)
    BC = smoothed(lambda f: B[f], 262, 312, 0.35)
    bstar = B[312]

    def c1(f):
        u = u_of(f, 0, 84)
        tgt = lerp3((-5, -3, 15.0), (0, -2.32, 10.0), smooth((f - 8) / 70))
        return lerp3((-6, -8.8, 1.2), (-2.0, -8.4, 2.2), u), tgt, lerp(24, 40, u), 11.0

    def c2(f):
        r = R2[f]
        return (r.x - 0.9, r.y - 4.4, 1.05), (r.x + 0.7, r.y, 1.15), 40, 4.0

    def c3(f):
        u = u_of(f, 185, 262)
        a = math.radians(lerp(42, 112, u))
        off = (d3 * math.cos(a) + n3 * math.sin(a)) * 2.7
        pos = SHOT_SPOT + off + Vector((0, 0, lerp(0.5, 1.3, u)))
        chest = _ruk(f) + Vector((0, 0, 1.55))
        tgt = chest.lerp(B[f], 0.35 * smooth((f - 200) / 50))
        return pos, tgt, 35, 2.8

    def c4(f):
        b = BC[f]
        pos = b - d3 * 2.6 + n3 * 1.1 + Vector((0, 0, 0.35))
        tgt = B[f].lerp(hoop, 0.18 + 0.25 * u_of(f, 262, 312))
        return pos, tgt, 35, 2.8

    def c5(f):
        u = u_of(f, 312, 372)
        phi = math.radians(lerp(160, 235, u))
        pos = bstar + (d3 * math.cos(phi) + n3 * math.sin(phi)) * 1.5 + Vector((0, 0, lerp(0.3, -0.1, u)))
        return pos, bstar.lerp(hoop, 0.08), 40, 2.0

    def c6(f):
        u = u_of(f, 372, 444)
        pos = Vector((hoop.x - lerp(1.0, 0.8, u), lerp(0.85, 0.7, u), 0.7))
        tgt = Vector((hoop.x, 0, 2.75)).lerp(B[f], 0.45 * smooth((f - 395) / 40))
        return pos, tgt, 22, 5.6

    def c7(f):
        u = u_of(f, 444, 520)
        pos = lerp3((6.9, -0.2, 1.5), (6.7, 0.1, 1.45), u)
        chest = _ruk(f) + Vector((0, 0, 1.45))
        tgt = chest.lerp((_ruk(f) + _sak(f)) / 2 + Vector((0, 0, 1.5)), 0.35 * smooth((f - 485) / 35))
        return pos, tgt, 45, 2.8

    def c8(f):
        r, s = _ruk(f), _sak(f)
        p = (r + s) / 2 + Vector((0, 0, 1.75))
        line = (s - r).xy.normalized()
        v = Vector((-line.y, line.x, 0))
        if v.y > 0:
            v = -v
        u = u_of(f, 520, 580)
        pos = p + v * lerp(3.1, 2.7, u) + Vector((0, 0, -0.35))
        return pos, p, 45, 2.4

    def c9(f):
        u = u_of(f, 580, 720)
        mid = (_ruk(f) + _sak(f)) / 2 + Vector((0, 0, 1.3))
        tgt = mid.lerp(Vector((0, -2.32, 10.0)), smooth((f - 600) / 120) ** 1.3)
        return lerp3((3.0, -6.5, 1.7), (-4.5, -15.5, 8.5), u), tgt, lerp(35, 28, u), 8.0

    return [c1, c2, c3, c4, c5, c6, c7, c8, c9]


def build(ball):
    sc = bpy.context.scene
    c = coll("Cameras")
    fns = shot_fns(ball)
    bounds = [s[1] for s in SHOTS] + [FRAMES]
    sc.timeline_markers.clear()
    listener = [None] * (FRAMES + 1)
    for i, ((name, f0), fn) in enumerate(zip(SHOTS, fns)):
        f1 = bounds[i + 1]
        cd = bpy.data.cameras.new(name)
        cd.sensor_width = 36.0
        cd.clip_start, cd.clip_end = 0.05, 200.0
        cd.dof.use_dof = True
        cam = bpy.data.objects.new(name, cd)
        c.objects.link(cam)
        cam.rotation_mode = "QUATERNION"
        prev = None
        for f in range(max(0, f0 - 1), min(FRAMES, f1 + 1) + 1):
            pos, tgt, lens, fstop = fn(f)
            pos, tgt = Vector(pos), Vector(tgt)
            q = (tgt - pos).to_track_quat("-Z", "Y")
            if prev is not None and prev.dot(q) < 0:
                q.negate()
            prev = q
            cam.location = pos
            if f0 <= f < f1 or f == FRAMES:
                listener[f] = [round(c, 3) for c in pos]
            cam.rotation_quaternion = q
            cd.lens = lens
            cd.dof.aperture_fstop = fstop
            cd.dof.focus_distance = (tgt - pos).length
            cam.keyframe_insert("location", frame=f)
            cam.keyframe_insert("rotation_quaternion", frame=f)
            cd.keyframe_insert("lens", frame=f)
            cd.keyframe_insert("dof.aperture_fstop", frame=f)
            cd.keyframe_insert("dof.focus_distance", frame=f)
        m = sc.timeline_markers.new(name, frame=f0)
        m.camera = cam
        if i == 0:
            sc.camera = cam
    return listener
