"""Render check stills from the saved project.

Usage: blender -b build/rukawa.blend -P stills.py -- [--pct 50] [--samples 32] F1 F2 ...
"""
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
sc = bpy.context.scene
frames = []
i = 0
while i < len(argv):
    if argv[i] == "--pct":
        sc.render.resolution_percentage = int(argv[i + 1])
        i += 2
    elif argv[i] == "--samples":
        sc.cycles.samples = int(argv[i + 1])
        i += 2
    else:
        frames.append(int(argv[i]))
        i += 1
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == "METAL"
out = os.path.join(os.path.dirname(bpy.data.filepath), "stills")
os.makedirs(out, exist_ok=True)
sc.render.use_overwrite = True
sc.render.use_placeholder = False
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(out, f"s_{f:04d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"[still] {f}")
