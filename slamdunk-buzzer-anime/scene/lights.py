"""Afternoon light for the Kaimei gym: low sun through the high windows, ceiling lamps, haze; EEVEE settings."""
import math

import bpy

from common import FRAMES, hexcol, mesh_obj
from gym import X0, X1, Y1, Boxes
from toon import flat, tmat


def light(c, name, kind, energy, loc=(0, 0, 0), rot=(0, 0, 0), color=(1, 1, 1), **kw):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    for k, v in kw.items():
        setattr(ld, k, v)
    ob = bpy.data.objects.new(name, ld)
    c.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    return ob


def build(c, sun_strength=5.5, lamp_power=150.0):
    sun = light(c, "Sun", "SUN", sun_strength, rot=(math.radians(-52), 0, math.radians(14)),
                color=hexcol("#ffe3bd")[:3], angle=math.radians(0.6))
    if hasattr(sun.data, "volume_factor"):
        sun.data.volume_factor = 1.0
    housing = Boxes()
    for i, x in enumerate((-12, -6, 0, 6, 12)):
        for j, y in enumerate((-6, 0, 6)):
            light(c, f"Lamp{i}{j}", "AREA", lamp_power, (x, y, 10.15), color=hexcol("#fff4de")[:3],
                  size=0.9, shape="DISK")
            housing.add(x, y, 10.4, 0.8, 0.8, 0.3)
            d = mesh_obj(f"LampGlow{i}{j}", [(x - 0.35, y - 0.35, 10.24), (x + 0.35, y - 0.35, 10.24),
                                              (x + 0.35, y + 0.35, 10.24), (x - 0.35, y + 0.35, 10.24)],
                         [(0, 3, 2, 1)], c, flat("LampGlow", "#fffbea", 1.4))
            d.visible_shadow = False
    housing.build("LampHousings", c, tmat("LampBody", "#3c3f48", "#22242c", rim=0.0), 0.02)
    # bright outdoor light through the open sliding doors on the shady side
    for x in (-8.0, 7.0):
        g = mesh_obj(f"Door{x}", [(x - 1.3, -Y1 + 0.02, 0), (x + 1.3, -Y1 + 0.02, 0), (x + 1.3, -Y1 + 0.02, 2.5),
                                  (x - 1.3, -Y1 + 0.02, 2.5)], [(0, 1, 2, 3)], c, flat("Outdoor", "#fff3d6", 1.25))
        g.visible_shadow = False
        light(c, f"DoorFill{x}", "AREA", 120.0, (x, -Y1 + 0.3, 1.25), rot=(math.radians(-90), 0, 0),
              color=hexcol("#fff1d8")[:3], size=2.6, size_y=2.5, shape="RECTANGLE")
    return sun


def world(sc, haze):
    w = bpy.data.worlds.new("Sky")
    sc.world = w
    if w.node_tree is None:
        w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    bg.inputs["Color"].default_value = hexcol("#bfdcf4")
    # bright sky through the windows, but only a soft ambient contribution indoors
    lp = nt.nodes.new("ShaderNodeLightPath")
    mx = nt.nodes.new("ShaderNodeMapRange")
    mx.inputs["To Min"].default_value = 0.3
    mx.inputs["To Max"].default_value = 1.0
    nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs["Value"])
    nt.links.new(mx.outputs["Result"], bg.inputs["Strength"])
    if haze > 0:
        m = bpy.data.materials.new("Haze")
        if m.node_tree is None:
            m.use_nodes = True
        mt = m.node_tree
        for nd in list(mt.nodes):
            if nd.type != "OUTPUT_MATERIAL":
                mt.nodes.remove(nd)
        vol = mt.nodes.new("ShaderNodeVolumeScatter")
        vol.inputs["Density"].default_value = haze
        vol.inputs["Anisotropy"].default_value = 0.35
        vol.inputs["Color"].default_value = hexcol("#fff1dc")
        mt.links.new(vol.outputs[0], mt.nodes["Material Output"].inputs["Volume"])
        b = Boxes()
        b.add((X0 + X1) / 2, 0, 7.0, X1 - X0 - 0.2, 2 * Y1 - 0.2, 13.8)
        hz = b.build("HazeVolume", bpy.context.scene.collection, m)
        hz.visible_shadow = False


def _set(obj, name, value):
    if hasattr(obj, name):
        try:
            setattr(obj, name, value)
        except (TypeError, AttributeError):
            pass


def render_settings(sc, pct=100, samples=32):
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            continue
    ee = sc.eevee
    _set(ee, "taa_render_samples", samples)
    _set(ee, "use_raytracing", True)
    _set(ee, "ray_tracing_method", "SCREEN")
    _set(ee, "use_shadows", True)
    _set(ee, "shadow_ray_count", 2)
    _set(ee, "shadow_step_count", 8)
    _set(ee, "volumetric_start", 0.5)
    _set(ee, "volumetric_end", 60.0)
    _set(ee, "volumetric_tile_size", "4")
    _set(ee, "volumetric_samples", 64)
    _set(ee, "use_volumetric_shadows", True)
    _set(ee, "volumetric_shadow_samples", 32)
    _set(ee, "use_gtao", True)
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = pct
    sc.render.fps = 24
    sc.frame_start, sc.frame_end = 0, FRAMES - 1
    sc.render.use_motion_blur = False
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.use_overwrite = False
    sc.render.use_placeholder = True
