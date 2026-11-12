"""Render check stills from build/paper_whale.blend.

Usage: blender -b build/paper_whale.blend -P stills.py -- --frames 30,110,160,225 [--engine auto|EEVEE|CYCLES]
       [--pct 100] [--samples 0] [--preview 0]
engine auto = Cycles for shot 1, EEVEE for shot 2 (the final hybrid). samples 0 = engine default.
"""
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scene"))

import bpy  # noqa: E402

import common as C  # noqa: E402
import lights  # noqa: E402

DEFAULT_SPP = {"CYCLES": 128, "EEVEE": 64}


def main():
    frames = [int(f) for f in C.arg("--frames", "30,110,160,225").split(",")]
    engine = C.arg("--engine", "auto").upper()
    pct = C.arg("--pct", 100)
    spp = C.arg("--samples", 0)
    preview = bool(C.arg("--preview", 0))
    out = os.path.join(C.BUILD, "stills")
    os.makedirs(out, exist_ok=True)
    sc = bpy.context.scene
    for f in frames:
        eng = engine if engine != "AUTO" else ("CYCLES" if f <= C.SHOT1[1] else "EEVEE")
        lights.render_settings(eng, pct, spp or DEFAULT_SPP[eng], preview)
        sc.frame_set(f)
        sc.camera = bpy.data.objects["Cam1" if f <= C.SHOT1[1] else "Cam2"]
        sc.render.filepath = os.path.join(out, f"f{f:03d}_{eng.lower()}.png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"[still] f{f:03d} {eng} {pct}% {time.time() - t:.1f}s -> {sc.render.filepath}")


main()
