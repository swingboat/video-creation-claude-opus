"""Assemble the film into build/paper_whale.blend and export build/events.json (flock stats for audio).

Usage: blender -b --factory-startup -P build_scene.py
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402

import cameras  # noqa: E402
import common as C  # noqa: E402
import hero_page  # noqa: E402
import library  # noqa: E402
import lights  # noqa: E402
import props  # noqa: E402
import swarm  # noqa: E402


def main():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    library.build()
    p = props.build()
    lights.build()
    hero_c = hero_page.build(p["book"], p["paper"])
    stats = swarm.build(p["paper"])
    lights.swarm_key(bpy.data.objects["swarm"])
    cameras.build(hero_c)
    lights.render_settings("EEVEE", 100, 64)
    os.makedirs(C.BUILD, exist_ok=True)
    with open(os.path.join(C.BUILD, "events.json"), "w") as fh:
        json.dump({"fps": C.FPS, "frames": C.FRAMES, "shots": [list(C.SHOT1), list(C.SHOT2)],
                   "swarm": stats}, fh)
    out = os.path.join(C.BUILD, "paper_whale.blend")
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print(f"[build] saved {out} in {time.time() - t0:.1f}s")


main()
