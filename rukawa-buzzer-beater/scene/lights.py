"""Arena lighting, world, colour management and render settings."""
import math

import bpy

from common import FRAMES, HOOP, coll, frame_of_tau, hexcol, key, mat


def area(c, name, loc, size, energy, color=(1.0, 0.88, 0.76), spread=math.radians(70), rot=(0, 0, 0)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size, ld.size_y = size
    ld.energy = energy
    ld.color = color
    ld.spread = spread
    ob = bpy.data.objects.new(name, ld)
    c.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def build():
    c = coll("Lights")
    fixture = mat("Fixture", "#fff3e0", emit="#fff1dc", strength=30.0)
    # roof grid over the court
    for i, x in enumerate((-12, -6, 0, 6, 12)):
        for j, y in enumerate((-5.5, 0, 5.5)):
            area(c, f"Roof{i}{j}", (x, y, 13.8), (1.6, 1.6), 2400.0)
            bpy.ops.mesh.primitive_plane_add(size=1.0, location=(x, y, 13.85))
            p = bpy.context.active_object
            p.name = f"RoofPanel{i}{j}"
            p.scale = (1.6, 1.6, 1)
            p.rotation_euler = (math.pi, 0, 0)
            p.data.materials.append(fixture)
            for u in list(p.users_collection):
                u.objects.unlink(p)
            c.objects.link(p)
    # dim warm wash over the stands so the crowd reads as silhouettes with colour
    for s in (1, -1):
        area(c, f"StandWash{s:+d}", (0, s * 14.5, 11.0), (30, 6), 1400.0, (1.0, 0.8, 0.62),
             spread=math.radians(100))
        area(c, f"EndWash{s:+d}", (s * 21.5, 0, 10.0), (6, 16), 700.0, (1.0, 0.8, 0.62),
             spread=math.radians(100))
    # cool rim light from behind the target basket (separates players from the floor)
    area(c, "RimCool", (17.0, -3.0, 8.0), (4, 4), 2500.0, (0.7, 0.82, 1.0), spread=math.radians(60),
         rot=(0, math.radians(50), 0))
    # red glow from the backboard LED strip at the buzzer
    ld = bpy.data.lights.new("BuzzerGlow", "POINT")
    ld.color = (1.0, 0.12, 0.08)
    ld.shadow_soft_size = 0.6
    lo = bpy.data.objects.new("BuzzerGlow", ld)
    c.objects.link(lo)
    lo.location = (HOOP[0] + 0.35, 0, HOOP[2] + 0.5)
    f_buzz = int(round(frame_of_tau(5.6)))
    f_off = int(frame_of_tau(8.0))
    for f, v, it in ((0, 0.0, "CONSTANT"), (f_buzz, 900.0, "CONSTANT"), (f_off, 900.0, "LINEAR"),
                     (f_off + 12, 0.0, "LINEAR")):
        ld.energy = v
        key(ld, "energy", f, interp=it)
    return f_buzz


def world():
    w = bpy.data.worlds.new("Arena")
    bpy.context.scene.world = w
    if w.node_tree is None:
        w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = hexcol("#0c0f16")
    bg.inputs["Strength"].default_value = 0.3


def render_settings(sc, pct=100, samples=48):
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "METAL"
    sc.cycles.device = "GPU"
    sc.cycles.samples = samples
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.denoising_use_gpu = True
    sc.cycles.max_bounces = 6
    sc.cycles.transmission_bounces = 6
    sc.cycles.glossy_bounces = 3
    sc.cycles.diffuse_bounces = 3
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = pct
    sc.render.fps = 24
    sc.frame_start, sc.frame_end = 0, FRAMES - 1
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    sc.view_settings.exposure = -0.6
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.use_overwrite = False
    sc.render.use_placeholder = True
