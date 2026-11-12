"""Assemble the whole film into build/rukawa.blend and export build/events.json.

Usage: blender -b --factory-startup -P build_scene.py [-- --pct 100 --samples 48]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402

import ball as BALL  # noqa: E402
import board  # noqa: E402
import cameras  # noqa: E402
import common as C  # noqa: E402
import court  # noqa: E402
import crowd  # noqa: E402
import figure  # noqa: E402
import lights  # noqa: E402
import motion  # noqa: E402
import net  # noqa: E402


def arg(name, default):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return type(default)(argv[argv.index(name) + 1]) if name in argv else default


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    lights.render_settings(sc, arg("--pct", 100), arg("--samples", 48))
    C.set_interp("LINEAR")
    court.build()
    rigs = {n: figure.build(n, s) for n, s in motion.SPECS.items()}
    motion.bake(rigs, C.FRAMES, C.tau_of_frame)
    ball = BALL.make_ball()
    positions = BALL.bake(ball, rigs["Rukawa"])
    net.bake_swish(net.build(), positions)
    board.build()
    f_buzz = lights.build()
    board.key_buzzer(f_buzz)
    lights.world()
    seats = crowd.build()
    crowd.flashes(seats)
    listener = cameras.build(positions)
    C.event("buzzer", 5.6, (0, 0, 10))
    C.event("score", board.T_SCORE, (0, 0, 10))
    C.event("timefreeze", 5.6, (0, 0, 0), frames=[312, 372])
    for t in (0.0, 4.0, 4.75, 5.6, 5.95, 6.45, 9.0):
        print(f"[time] tau {t:5.2f} -> frame {C.frame_of_tau(t):6.1f}")
    out = os.path.join(HERE, "build")
    os.makedirs(out, exist_ok=True)
    shots = [{"name": n, "frame": f} for n, f in cameras.SHOTS]
    with open(os.path.join(out, "events.json"), "w") as fh:
        json.dump({"fps": C.FPS, "frames": C.FRAMES, "shots": shots,
                   "tau": [round(t, 5) for t in C.TAU[:C.FRAMES + 1]], "listener": listener,
                   "events": sorted(C.EVENTS, key=lambda e: e["frame"])}, fh)
    sc.frame_set(0)
    sc.render.filepath = os.path.join(out, "frames", "f_")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "rukawa.blend"), compress=True)
    print(f"[build] saved; {len(C.EVENTS)} events")


main()
