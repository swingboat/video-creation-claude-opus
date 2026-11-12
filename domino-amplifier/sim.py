"""Run the rigid-body simulation headless and record every frame.

Usage: blender -b --factory-startup -P sim.py
Writes build/sim.npy (frames × objects × [x y z qw qx qy qz]) and build/falls.json.
"""
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
import scene  # noqa: E402

MAX_T = 6.0  # real seconds to simulate at most


def keyframe_ball(ball, frames):
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    t_hit = scene.pendulum_hit_time()
    for f in frames:
        t = (f - 1) / scene.SIM_HZ
        # dense keys around the impact, sparse elsewhere
        if abs(t - t_hit) > 0.08 and f % 8:
            continue
        ball.location = scene.ball_pos(scene.pendulum_angle(t))
        ball.keyframe_insert("location", frame=f)


def tilt(mw):
    z = mw.to_3x3().col[2].normalized()
    return math.degrees(math.acos(max(-1.0, min(1.0, z.z))))


def main():
    # overrides like `-- GAP=0.6 BOUNCE=0.3` for tuning
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for kv in args:
        k, v = kv.split("=")
        setattr(scene, k, float(v))
    sc = scene.reset()
    dominoes, ball, _ = scene.build(sim=True)
    nf = int(MAX_T * scene.SIM_HZ)
    sc.frame_start, sc.frame_end = 1, nf
    pc = sc.rigidbody_world.point_cache
    pc.frame_start, pc.frame_end = 1, nf
    keyframe_ball(ball, range(1, nf + 1))

    objs = dominoes + [ball]
    rec, tilts = [], []
    settled = None
    for f in range(1, nf + 1):
        sc.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        row, trow = [], []
        for ob in objs:
            mw = ob.evaluated_get(dg).matrix_world
            loc, q = mw.to_translation(), mw.to_quaternion()
            row.append([loc.x, loc.y, loc.z, q.w, q.x, q.y, q.z])
            trow.append(tilt(mw))
        rec.append(row)
        tilts.append(trow[:-1])
        if settled is None and trow[scene.N - 1] > 80:
            settled = f
        if settled and f > settled + 0.6 * scene.SIM_HZ:
            break
        if f % 600 == 0:
            print(f"t={f / scene.SIM_HZ:.2f}s tilts=" + " ".join(f"{a:.0f}" for a in trow[:-1]), flush=True)

    arr = np.array(rec, dtype=np.float32)
    tl = np.array(tilts)
    hz = scene.SIM_HZ

    def first(col, thr):
        idx = np.nonzero(tl[:, col] > thr)[0]
        return round(float(idx[0]) / hz, 4) if len(idx) else None

    falls = []
    for i in range(scene.N):
        final = float(tl[-1, i])
        land = np.nonzero(tl[:, i] > final - 1.5)[0]
        falls.append({"i": i + 1, "h": scene.layout()[i][0], "touch": first(i, 0.3), "half": first(i, 45),
                      "land": round(float(land[0]) / hz, 4), "final": round(final, 1)})
    out = {"hz": hz, "frames": len(rec), "ball_hit": scene.pendulum_hit_time(), "dominoes": falls}
    (ROOT / "build").mkdir(exist_ok=True)
    np.save(ROOT / "build" / "sim.npy", arr)
    (ROOT / "build" / "falls.json").write_text(json.dumps(out, indent=2))
    for d in falls:
        print(d)
    ok = all(d["final"] > 30 for d in falls)
    print("CHAIN", "OK" if ok else "BROKEN", f"frames={len(rec)}")


main()
