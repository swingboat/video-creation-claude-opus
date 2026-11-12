"""Moonlight, night-sky window glow, hall volume, world, and render settings for both engines."""
import math

import bpy
from mathutils import Vector

import common as C


def moon(strength=30.0):
    li = bpy.data.lights.new("moon", "SUN")
    li.energy = strength
    li.color = C.hexcol("#9fb8ff")[:3]
    li.angle = math.radians(0.6)
    ob = bpy.data.objects.new("moon", li)
    el, az = math.radians(28), math.radians(-30)
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), -math.sin(el)))
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(ob)
    return ob


def sky_plane():
    m = C.mat("night_sky", "#000000", 1.0, emit="#7aa0d8", emit_k=2.0)
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(C.HALL_X[0] - 5.0, 14.0, 7.0),
                                     rotation=(0, math.radians(90), 0))
    ob = bpy.context.object
    ob.name = "sky"
    ob.scale = (30, 60, 1)
    ob.data.materials.append(m)
    ob.visible_shadow = False
    return ob


def volume(density=0.02):
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    v = C.node(nt, "ShaderNodeVolumePrincipled", (0, 0), Anisotropy=0.55, Color=C.hexcol("#cfd8e8"))
    tc = C.node(nt, "ShaderNodeTexCoord", (-900, 0))
    nz = C.node(nt, "ShaderNodeTexNoise", (-700, 0), Scale=0.12, Detail=3.0, Roughness=0.55)
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    mr = C.node(nt, "ShaderNodeMapRange", (-450, 0), From_Min=0.3, From_Max=0.7, To_Min=0.35 * density,
                To_Max=1.6 * density)
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], v.inputs["Density"])
    nt.links.new(v.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    (x0, x1), (y0, y1), (z0, z1) = C.HALL_X, C.HALL_Y, C.HALL_Z
    v, f = C.boxes([((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)], [(x1 - x0 - 0.02, y1 - y0 - 0.02, z1 - z0 - 0.02)])
    ob = C.mesh_np("haze", v, f, material=m)
    ob.visible_shadow = False
    for fr, hide in ((C.SHOT1[0], True), (C.SHOT2[0], False)):      # shot 1 (Cycles macro) renders without haze
        ob.hide_render = hide
        ob.keyframe_insert("hide_render", frame=fr)
    return ob


def window_fill(power=80.0):
    """Soft cool area lights just inside each window: the sky glow that spills onto floor and tables."""
    for i, y in enumerate(C.WINDOWS_Y):
        li = bpy.data.lights.new(f"win_fill{i}", "AREA")
        li.shape, li.size, li.size_y = "RECTANGLE", 6.0, 2.2
        li.energy = power
        li.color = C.hexcol("#8fa8e0")[:3]
        ob = bpy.data.objects.new(li.name, li)
        ob.location = (C.HALL_X[0] - 0.05, y, (C.WIN_SILL + C.WIN_TOP) / 2)
        ob.rotation_euler = (0, math.radians(-90), 0)
        bpy.context.scene.collection.objects.link(ob)


def ceiling_fill(power=1200.0):
    """Very dim cool bounce from above so the shelves never go pure black."""
    li = bpy.data.lights.new("ceiling_fill", "AREA")
    li.shape, li.size, li.size_y = "RECTANGLE", 12.0, 32.0
    li.energy = power
    li.color = C.hexcol("#6f86b8")[:3]
    ob = bpy.data.objects.new(li.name, li)
    ob.location = (0.0, sum(C.HALL_Y) / 2, C.HALL_Z[1] - 0.5)
    bpy.context.scene.collection.objects.link(ob)


def swarm_key(target, power=2500.0):
    """Soft key light that only lights the flock (light linking), from camera-left and above."""
    li = bpy.data.lights.new("swarm_key", "AREA")
    li.shape, li.size, li.size_y = "RECTANGLE", 4.0, 4.0
    li.energy = power
    li.use_shadow = False
    li.color = C.hexcol("#c8d6ff")[:3]
    ob = bpy.data.objects.new(li.name, li)
    ob.location = (-4.5, 5.0, 8.0)
    ob.rotation_euler = (Vector(C.WHALE_C) - ob.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(ob)
    coll = bpy.data.collections.new("swarm_key_receivers")
    coll.objects.link(target)
    ob.light_linking.receiver_collection = coll
    return ob


def world():
    w = bpy.data.worlds.new("night")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = C.hexcol("#05070c")
    bg.inputs[1].default_value = 0.3
    bpy.context.scene.world = w


def _set_look(sc):
    sc.view_settings.view_transform = "AgX"
    for name in ("AgX - Medium High Contrast", "Medium High Contrast"):
        try:
            sc.view_settings.look = name
            return
        except TypeError:
            pass


def render_settings(engine="EEVEE", pct=100, samples=64, preview=False):
    sc = bpy.context.scene
    r = sc.render
    r.engine = "CYCLES" if engine.upper() == "CYCLES" else "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = C.RES
    r.resolution_percentage = pct
    r.fps = C.FPS
    sc.frame_start, sc.frame_end = 1, C.FRAMES
    r.use_motion_blur = True
    r.motion_blur_shutter = 0.5
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8" if preview else "16"
    _set_look(sc)
    if r.engine == "CYCLES":
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "METAL"
        p.get_devices()
        for d in p.devices:
            d.use = d.type == "METAL"
        cy = sc.cycles
        cy.device = "GPU"
        cy.samples = samples
        cy.use_adaptive_sampling = True
        cy.adaptive_threshold = 0.01
        cy.use_denoising = True
        cy.denoiser = "OPENIMAGEDENOISE"
        cy.max_bounces, cy.diffuse_bounces, cy.glossy_bounces = 6, 3, 3
        cy.transmission_bounces, cy.volume_bounces = 6, 1
        cy.sample_clamp_direct = 8.0
        cy.sample_clamp_indirect = 3.0
        cy.volume_step_rate = 2.0
    else:
        ee = sc.eevee
        ee.taa_render_samples = samples
        ee.use_raytracing = True
        ee.use_fast_gi = True
        ee.use_shadows = True
        ee.shadow_ray_count = 2
        ee.use_volumetric_shadows = True
        ee.volumetric_tile_size = "8" if preview else "4"
        ee.volumetric_samples = 64 if preview else 128
        ee.volumetric_shadow_samples = 32
        ee.volumetric_end = 60.0
        ee.motion_blur_steps = 1 if preview else 2


def build():
    moon()
    sky_plane()
    volume()
    window_fill()
    ceiling_fill()
    world()
