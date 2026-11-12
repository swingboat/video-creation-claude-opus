"""Two cameras: Cam1 (macro, handheld, focus follows the hero page) and Cam2 (crane push, follows the flock).

Every frame is keyed (LINEAR); timeline markers switch cameras at the cut. See plan/0b-shots.md.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

import common as C
import whale

CAM1_POS, CAM1_LOOK = np.array([1.86, 6.40, 0.84]), np.array([1.66, 7.05, 0.825])
CAM2_A, CAM2_B = np.array([-2.5, -2.5, 1.7]), np.array([-1.8, 0.5, 2.3])
LOOKS2 = [(0.0, (-4.5, 12.0, 5.2)), (2.0, (-1.0, 13.5, 4.2)), (3.6, (0.3, 15.0, 5.4)), (5.2, None)]   # None -> whale centre


def handheld(t, amp_pos, amp_rot, seed):
    """Smooth pseudo-random shake from summed sines: (dpos[3], drot[3] in radians)."""
    rng = np.random.default_rng(seed)
    fr = rng.uniform(0.3, 1.2, (6, 3))
    ph = rng.uniform(0, 2 * math.pi, (6, 3))
    w = np.sin(2 * math.pi * fr * t + ph).sum(1) / 3.0
    return w[:3] * amp_pos, w[3:] * math.radians(amp_rot)


def _camera(name, lens, fstop):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36.0
    cd.clip_start = 0.01 if lens > 50 else 0.1
    cd.clip_end = 120.0
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.aperture_blades = 7
    ob = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _aim(ob, pos, look, drot):
    ob.location = Vector(pos)
    q = (Vector(look) - Vector(pos)).to_track_quat("-Z", "Y")
    e = q.to_euler()
    e.x += drot[0]
    e.y += drot[1]
    e.z += drot[2]
    ob.rotation_euler = e


def _key(ob, f):
    ob.keyframe_insert("location", frame=f)
    ob.keyframe_insert("rotation_euler", frame=f)


def cam1(hero_centroids):
    ob = _camera("Cam1", 75.0, 2.8)
    focus = bpy.data.objects.new("focus1", None)
    bpy.context.scene.collection.objects.link(focus)
    ob.data.dof.focus_object = focus
    fwd = (CAM1_LOOK - CAM1_POS) / np.linalg.norm(CAM1_LOOK - CAM1_POS)
    sx, sy, sz = C.BOOK_LOC
    edge = np.array([sx + 0.08, sy - 0.02, sz + 0.02])
    for f in range(C.SHOT1[0] - 1, C.SHOT1[1] + 2):
        t = (f - C.SHOT1[0]) / C.FPS
        dp, dr = handheld(t, 0.0015, 0.15, 1)
        pos = CAM1_POS + fwd * 0.04 * C.smooth(t / 3.0) + dp
        _aim(ob, pos, CAM1_LOOK + fwd * 0.04 * C.smooth(t / 3.0), dr)
        _key(ob, f)
        k = float(C.smooth((t - 1.1) / 0.5))
        hc = np.array(hero_centroids.get(max(f, 0), hero_centroids[max(hero_centroids)]))
        focus.location = Vector(edge * (1 - k) + hc * k)
        focus.keyframe_insert("location", frame=f)
    return ob


def _look2(t):
    pts = []
    for tk, p in LOOKS2:
        if p is None:
            wp = np.array(C.WHALE_C) + whale._rot() @ np.array([1.0, 0, 0]) * whale.DRIFT * tk
            p = wp
        pts.append((tk, np.array(p)))
    if t <= pts[0][0]:
        return pts[0][1]
    for (t0, p0), (t1, p1) in zip(pts, pts[1:]):
        if t <= t1:
            return p0 + (p1 - p0) * C.smooth((t - t0) / (t1 - t0))
    tk, p = pts[-1]
    return np.array(C.WHALE_C) + whale._rot() @ np.array([1.0, 0, 0]) * whale.DRIFT * t


def cam2():
    ob = _camera("Cam2", 24.0, 4.0)
    look = _look2(0.0)
    dt = 1.0 / C.FPS
    for f in range(C.SHOT2[0] - 1, C.SHOT2[1] + 2):
        t = (f - C.SHOT2[0]) / C.FPS
        k = C.smooth(t / 7.0)
        pos = CAM2_A + (CAM2_B - CAM2_A) * k
        look = look + (_look2(t) - look) * (1 - math.exp(-dt / 0.6))
        dp, dr = handheld(t, 0.004, 0.05, 2)
        _aim(ob, pos + dp, look, dr)
        _key(ob, f)
        ob.data.lens = 24.0 + 3.0 * C.smooth((t - 3.0) / 4.0)
        ob.data.keyframe_insert("lens", frame=f)
        ob.data.dof.focus_distance = float(np.linalg.norm(look - pos))
        ob.data.keyframe_insert("dof.focus_distance", frame=f)
    return ob


def build(hero_centroids):
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    c1 = cam1(hero_centroids)
    c2 = cam2()
    sc = bpy.context.scene
    sc.timeline_markers.new("F_01", frame=C.SHOT1[0]).camera = c1
    sc.timeline_markers.new("F_73", frame=C.SHOT2[0]).camera = c2
    sc.camera = c1
    return c1, c2
