"""Map output time to simulation time, key every object per output frame, and drive the camera.

Usage: blender -b --factory-startup -P shots.py                 -> build/frames/f_####.jpg
       blender -b --factory-startup -P shots.py -- --still 2 12  -> build/still_<t>.jpg
"""
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion, Vector

ROOT = Path(__file__).parent
BUILD = ROOT / "build"
sys.path.insert(0, str(ROOT))
import look  # noqa: E402
import scene  # noqa: E402

FPS = 30
TL = json.loads((BUILD / "timeline.json").read_text())
FALLS = json.loads((BUILD / "falls.json").read_text())
SIM = np.load(BUILD / "sim.npy")
DURATION = TL["duration"]
NF = round(DURATION * FPS)


def word_time(seg_id, text, edge="start", last=False):
    seg = next(s for s in TL["segments"] if s["id"] == seg_id)
    words = reversed(seg["words"]) if last else seg["words"]
    return next(w for w in words if text in w["text"])[edge]


def smoothstep(a, b, x):
    u = min(1.0, max(0.0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)


# ---------- time remap: slow-mo factor f(s) = output seconds per simulated second ----------
S_HIT = FALLS["ball_hit"]
S_LAND = FALLS["dominoes"][-1]["land"]
S_END = (len(SIM) - 1) / FALLS["hz"]
T_HIT = word_time("hook", "碰")                       # ball touches domino 1 on "碰"
T_LAND = word_time("grow", "倍", "end", last=True)  # the giant lands on "…一百三十倍"


def slowmo(s, f_end):
    pre = T_HIT / S_HIT
    if s < S_HIT:
        return pre
    early = pre + (12.0 - pre) * smoothstep(S_HIT, S_HIT + 0.05, s)
    return math.exp(math.log(early) + (math.log(f_end) - math.log(early)) * smoothstep(0.55, 2.4, s))


def build_map(f_end):
    ss = np.linspace(0, S_END, 20000)
    fs = np.array([slowmo(s, f_end) for s in ss])
    ts = np.concatenate([[0], np.cumsum((fs[1:] + fs[:-1]) / 2 * np.diff(ss))])
    return ss, ts


lo, hi = 1.0, 12.0
for _ in range(40):  # solve the late slow-mo so the last domino lands on cue
    mid = (lo + hi) / 2
    ss, ts = build_map(mid)
    if np.interp(S_LAND, ss, ts) > T_LAND:
        hi = mid
    else:
        lo = mid
SS, TS = build_map((lo + hi) / 2)


def sim_time(t):
    return float(np.interp(t, TS, SS, right=S_END))


def pose(s, k):
    """Interpolated (location, quaternion) of object k at simulated time s."""
    x = min(s * FALLS["hz"], len(SIM) - 1.0)
    i = int(x)
    j, u = min(i + 1, len(SIM) - 1), x - i
    a, b = SIM[i, k], SIM[j, k]
    loc = Vector(a[:3]).lerp(Vector(b[:3]), u)
    q = Quaternion(a[3:]).slerp(Quaternion(b[3:]), u)
    return loc, q


# ---------- camera ----------
LAY = scene.layout()
TOUCH = [output for output in (np.interp(d["touch"], SS, TS) for d in FALLS["dominoes"])]


def chain_index(t):
    """Continuous index of the domino that is falling right now (0 before the hit)."""
    return float(np.interp(t, TOUCH + [TOUCH[-1] + 1.2], list(range(len(TOUCH) + 1))))


def domino_at(k):
    k = min(max(k, 0.0), scene.N - 1.0)
    i = min(int(k), scene.N - 2)
    u = k - i
    h0, t0, _, x0 = LAY[i]
    h1, t1, _, x1 = LAY[i + 1]
    return x0 + t0 / 2 + (x1 + t1 / 2 - x0 - t0 / 2) * u, h0 * (h1 / h0) ** u


def raw_camera(t):
    k = chain_index(t) + 0.35
    x, h = domino_at(k)
    target = Vector((x + 0.25 * h, 0.0, 0.42 * h))
    # before the hit, frame the incoming ball as well
    pre = 1 - smoothstep(0.2, T_HIT + 0.3, t)
    target.x -= 20.0 * pre
    dist = 7.5 * h * (1 + 0.35 * pre)
    az = math.radians(-102 + 18 * smoothstep(1.0, 21.0, t))
    el = math.radians(9 + 9 * smoothstep(2.0, 21.0, t))
    fstop = 5.6
    # finale: rise and pull back to see the whole fallen chain
    w = smoothstep(T_LAND - 0.6, T_LAND + 4.8, t)
    if w > 0:
        tail_x = LAY[-1][3] + LAY[-1][0] * 0.55
        wide_t = Vector((tail_x * 0.55, 60.0, 40.0))
        target = target.lerp(wide_t, w)
        dist = math.exp(math.log(dist) + (math.log(3300.0 + 160 * (t - T_LAND)) - math.log(dist)) * w)
        az = az + (math.radians(-62) - az) * w
        el = el + (math.radians(34) - el) * w
        fstop = 5.6 + 5.4 * w
    return [target.x, target.y, target.z, math.log(dist), az, el, fstop]


def camera_track():
    raw = np.array([raw_camera(f / FPS) for f in range(NF)])
    sig = 10.0
    kern = np.exp(-0.5 * (np.arange(-30, 31) / sig) ** 2)
    kern /= kern.sum()
    pad = np.pad(raw, ((30, 30), (0, 0)), mode="edge")
    return np.stack([np.convolve(pad[:, c], kern, mode="valid") for c in range(raw.shape[1])], axis=1)


def key_scene(dominoes, ball, thread, cam, focus):
    track = camera_track()
    px, py, pz = scene.pivot()
    objs = dominoes + [ball]
    for ob in objs + [thread]:
        ob.rotation_mode = "QUATERNION"
    prev = [None] * len(objs)
    for f in range(NF):
        fr = f + 1
        s = sim_time(f / FPS)
        for k, ob in enumerate(objs):
            loc, q = pose(s, k)
            if prev[k] is not None and prev[k].dot(q) < 0:
                q.negate()
            prev[k] = q
            ob.location, ob.rotation_quaternion = loc, q
            ob.keyframe_insert("location", frame=fr)
            ob.keyframe_insert("rotation_quaternion", frame=fr)
        b = ball.location
        th = math.atan2(b.x - px, pz - b.z)
        thread.location = ((b.x + px) / 2, 0.0, (b.z + pz) / 2)
        thread.scale = (1, 1, scene.PEND_L)
        thread.rotation_quaternion = Quaternion((0, 1, 0), -th)
        thread.keyframe_insert("location", frame=fr)
        thread.keyframe_insert("rotation_quaternion", frame=fr)
        tx, ty, tz, ld, az, el, fstop = track[f]
        target, d = Vector((tx, ty, tz)), math.exp(ld)
        cam.location = target + d * Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        focus.location = target
        # Blender sizes the aperture in scene units as if they were metres; ours are mm
        cam.data.dof.aperture_fstop = fstop / 1000
        cam.data.clip_start, cam.data.clip_end = d * 0.05, d * 30
        cam.keyframe_insert("location", frame=fr)
        cam.keyframe_insert("rotation_euler", frame=fr)
        focus.keyframe_insert("location", frame=fr)
        cam.data.keyframe_insert("dof.aperture_fstop", frame=fr)
        cam.data.keyframe_insert("clip_start", frame=fr)
        cam.data.keyframe_insert("clip_end", frame=fr)


def write_events():
    """Output-time impacts for the sound design and HUD: ball tap, domino-on-domino clacks, floor landings."""
    to_t = lambda s: round(float(np.interp(s, SS, TS)), 3)  # noqa: E731
    ev = [{"type": "clink", "t": round(T_HIT, 3)}]
    for i, d in enumerate(FALLS["dominoes"]):
        if i:
            ev.append({"type": "clack", "t": to_t(d["touch"]), "i": i + 1, "h": LAY[i - 1][0]})
        ev.append({"type": "land", "t": to_t(d["land"]), "i": i + 1, "h": d["h"]})
    out = {"t_hit": T_HIT, "t_land": T_LAND, "heights": [d["h"] for d in FALLS["dominoes"]],
           "touch": [round(float(t), 3) for t in TOUCH], "events": sorted(ev, key=lambda e: e["t"])}
    (BUILD / "events.json").write_text(json.dumps(out, indent=1))


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    write_events()
    if args and args[0] == "--events":
        return
    sc = scene.reset()
    dominoes, ball, collider = scene.build(sim=False)
    bpy.data.objects.remove(collider)
    _, thread = look.dress(dominoes, ball)
    look.render_settings(sc)
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    sc.camera = cam
    cam.data.lens = 60
    cam.data.dof.use_dof = True
    focus = bpy.data.objects.new("Focus", None)
    sc.collection.objects.link(focus)
    cam.data.dof.focus_object = focus
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    key_scene(dominoes, ball, thread, cam, focus)
    sc.frame_start, sc.frame_end = 1, NF
    print(f"keyed {NF} frames; T_HIT={T_HIT:.2f} T_LAND={T_LAND:.2f}", flush=True)

    if args and args[0] == "--still":
        for t in args[1:]:
            sc.frame_set(round(float(t) * FPS) + 1)
            sc.render.filepath = str(BUILD / f"still_{t}.jpg")
            bpy.ops.render.render(write_still=True)
            print("wrote still", t, flush=True)
        return
    frames = BUILD / "frames"
    frames.mkdir(exist_ok=True)
    first = 1 + len(list(frames.glob("f_*.jpg")))  # resume after an interrupted run
    for fr in range(first, NF + 1):
        sc.frame_set(fr)
        sc.render.filepath = str(frames / f"f_{fr:04}.jpg")
        bpy.ops.render.render(write_still=True)
        if fr % 30 == 0:
            print(f"frame {fr}/{NF}", flush=True)


main()
