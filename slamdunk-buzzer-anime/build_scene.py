"""Assemble the anime film into build/anime.blend and export build/events.json.

Usage: blender -b --factory-startup -P build_scene.py [-- --pct 100 --samples 32 --nocrowd]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402

import ball as BALL  # noqa: E402
import cameras  # noqa: E402
import character  # noqa: E402
import common as C  # noqa: E402
import crowd  # noqa: E402
import gym  # noqa: E402
import gym_props  # noqa: E402
import humanoid  # noqa: E402
import lights  # noqa: E402
import motion  # noqa: E402
import net  # noqa: E402


def argv():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    a = argv()
    return type(default)(a[a.index(name) + 1]) if name in a else default


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    lights.render_settings(sc, arg("--pct", 100), arg("--samples", 32))
    C.set_interp("LINEAR")
    gym.build()
    gym_props.build()
    rigs = {}
    for n, s in motion.SPECS.items():
        model = next((os.path.join(HERE, "characters", f"{s['surname'].lower()}{e}")
                      for e in (".vrm", ".pmx", ".fbx", ".glb", ".gltf")
                      if os.path.exists(os.path.join(HERE, "characters", f"{s['surname'].lower()}{e}"))), None)
        rigs[n] = humanoid.build(n, dict(s, model=model)) if model else character.build(n, s)
    motion.bake(rigs, C.FRAMES, C.tau_of_frame)
    ball = BALL.make_ball()
    positions = BALL.bake(ball, rigs["Ace"])
    net.bake_swish(net.build(), positions)
    lights.build(C.coll("Lights"))
    lights.world(sc, arg("--haze", 0.006))
    if "--nocrowd" not in argv():
        crowd.build()
    listener = cameras.build(positions)
    C.event("buzzer", 5.6, (18.8, 0, 7.2))
    C.event("score", gym_props.T_SCORE, (18.8, 0, 7.2))
    C.event("timefreeze", 5.6, (0, 0, 0), frames=[312, 372])
    C.event("flip", gym_props.T_SCORE + 0.6, (0.38, -8.84, 1.0))
    out = os.path.join(HERE, "build")
    os.makedirs(out, exist_ok=True)
    shots = [{"name": n, "frame": f} for n, f in cameras.SHOTS]
    with open(os.path.join(out, "events.json"), "w") as fh:
        json.dump({"fps": C.FPS, "frames": C.FRAMES, "shots": shots,
                   "tau": [round(t, 5) for t in C.TAU[:C.FRAMES + 1]], "listener": listener,
                   "events": sorted(C.EVENTS, key=lambda e: e["frame"])}, fh)
    sc.frame_set(0)
    sc.render.filepath = os.path.join(out, "frames", "f_")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "anime.blend"), compress=True)
    print(f"[build] saved; {len(C.EVENTS)} events")


main()
