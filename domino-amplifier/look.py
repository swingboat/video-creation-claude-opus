"""Materials, lighting and render settings (Eevee) for the domino scene."""
import colorsys
from pathlib import Path

import bpy

ROOT = Path(__file__).parent


def _mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    return m, nt, bsdf


def _link(nt, a, b):
    nt.links.new(a, b)


def _math(nt, op, a=None, b=None, v0=0.0, v1=0.0):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.inputs[0].default_value, n.inputs[1].default_value = v0, v1
    if a is not None:
        _link(nt, a, n.inputs[0])
    if b is not None:
        _link(nt, b, n.inputs[1])
    return n.outputs[0]


# pip centres on a domino face, in (width, height) units of the domino height: 3 on top, 5 below
PIPS = [(0.13, 0.62), (0.25, 0.75), (0.37, 0.88),
        (0.12, 0.12), (0.38, 0.12), (0.25, 0.25), (0.12, 0.38), (0.38, 0.38)]


def domino_material(i, n):
    hue = (0.0 + 0.72 * i / max(1, n - 1)) % 1.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.88, 0.72)
    m, nt, bsdf = _mat(f"Domino{i + 1:02}")
    bsdf.inputs["Roughness"].default_value = 0.28
    bsdf.inputs["Coat Weight"].default_value = 0.7
    bsdf.inputs["Coat Roughness"].default_value = 0.06
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    _link(nt, tc.outputs["Generated"], sep.inputs[0])
    gy = _math(nt, "MULTIPLY", sep.outputs["Y"], v1=0.5)  # width is half the height
    gz = sep.outputs["Z"]
    # distance to the nearest pip
    dmin = None
    for cy, cz in PIPS:
        dy = _math(nt, "SUBTRACT", gy, v1=cy)
        dz = _math(nt, "SUBTRACT", gz, v1=cz)
        d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "POWER", dy, v1=2), _math(nt, "POWER", dz, v1=2)))
        dmin = d if dmin is None else _math(nt, "MINIMUM", dmin, d)
    pip = _math(nt, "LESS_THAN", dmin, v1=0.043)
    line = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", gz, v1=0.5)), v1=0.007)
    line = _math(nt, "MULTIPLY", line, _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE",
                                                                   _math(nt, "SUBTRACT", gy, v1=0.25)), v1=0.2))
    # only on the two big faces (object-space normal along X)
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    _link(nt, tc.outputs["Normal"], nsep.inputs[0])
    face = _math(nt, "GREATER_THAN", _math(nt, "ABSOLUTE", nsep.outputs["X"]), v1=0.7)
    mark = _math(nt, "MULTIPLY", _math(nt, "MAXIMUM", pip, line), face)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs[6].default_value = (r, g, b, 1)
    mix.inputs[7].default_value = (0.93, 0.92, 0.88, 1)
    _link(nt, mark, mix.inputs[0])
    _link(nt, mix.outputs[2], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.4
    bump.invert = True
    _link(nt, mark, bump.inputs["Height"])
    _link(nt, bump.outputs[0], bsdf.inputs["Normal"])
    return m


def floor_material():
    m, nt, bsdf = _mat("WoodFloor")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    # planks: 1.2 m × 14 cm boards with 1 mm seams, randomly shaded
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.37
    brick.inputs["Scale"].default_value = 0.001
    brick.inputs["Brick Width"].default_value = 1.2
    brick.inputs["Row Height"].default_value = 0.14
    brick.inputs["Mortar Size"].default_value = 0.0012
    brick.inputs["Mortar Smooth"].default_value = 0.3
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Color1"].default_value = (0.42, 0.22, 0.10, 1)
    brick.inputs["Color2"].default_value = (0.58, 0.34, 0.17, 1)
    brick.inputs["Mortar"].default_value = (0.08, 0.04, 0.02, 1)
    _link(nt, tc.outputs["Object"], brick.inputs["Vector"])
    # grain: stretched, noise-distorted bands along the boards
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.004, 0.08, 0.08)
    _link(nt, tc.outputs["Object"], mp.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.bands_direction = "Y"
    wave.inputs["Distortion"].default_value = 7.0
    wave.inputs["Detail"].default_value = 4.0
    wave.inputs["Detail Scale"].default_value = 1.5
    _link(nt, mp.outputs[0], wave.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.64, 0.64, 0.64, 1)
    ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1)
    _link(nt, wave.outputs["Fac"], ramp.inputs[0])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1.0
    _link(nt, brick.outputs["Color"], mul.inputs[6])
    _link(nt, ramp.outputs[0], mul.inputs[7])
    _link(nt, mul.outputs[2], bsdf.inputs["Base Color"])
    # fine scratches / pores for roughness and bump
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 0.6
    noise.inputs["Detail"].default_value = 8.0
    _link(nt, tc.outputs["Object"], noise.inputs["Vector"])
    rr = nt.nodes.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.4, 0.62
    _link(nt, noise.outputs["Fac"], rr.inputs[0])
    _link(nt, rr.outputs[0], bsdf.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.3
    _link(nt, wave.outputs["Fac"], bump.inputs["Height"])
    _link(nt, bump.outputs[0], bsdf.inputs["Normal"])
    seam = nt.nodes.new("ShaderNodeBump")
    seam.inputs["Strength"].default_value = 1.0
    seam.inputs["Distance"].default_value = 0.8
    _link(nt, brick.outputs["Fac"], seam.inputs["Height"])
    _link(nt, bump.outputs[0], seam.inputs["Normal"])
    _link(nt, seam.outputs[0], bsdf.inputs["Normal"])
    return m


def simple_material(name, color, metallic=0.0, rough=0.5):
    m, nt, bsdf = _mat(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    return m


def dress(dominoes, ball):
    """Bevel and paint the dominoes, add floor, thread, world and sun."""
    for i, ob in enumerate(dominoes):
        bev = ob.modifiers.new("Bevel", "BEVEL")
        bev.width = 0.1 * min(ob.dimensions)
        bev.segments = 3
        ob.data.materials.append(domino_material(i, len(dominoes)))
    ball.data.materials.append(simple_material("Steel", (0.82, 0.82, 0.84), metallic=1.0, rough=0.07))

    bpy.ops.mesh.primitive_plane_add(size=40000, location=(1000, 0, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    floor.data.materials.append(floor_material())

    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=1.0, vertices=12)
    thread = bpy.context.active_object
    thread.name = "Thread"
    thread.data.materials.append(simple_material("Thread", (0.85, 0.83, 0.78), rough=0.8))

    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    hdri = ROOT / "build" / "hdri.hdr"
    if hdri.exists():
        env.image = bpy.data.images.load(str(hdri))
        _link(nt, env.outputs["Color"], nt.nodes["Background"].inputs["Color"])
    nt.nodes["Background"].inputs["Strength"].default_value = 0.8

    bpy.ops.object.light_add(type="SUN", rotation=(0.95, 0.0, -0.55))
    sun = bpy.context.active_object
    sun.data.energy = 3.2
    sun.data.angle = 0.12
    sun.data.color = (1.0, 0.9, 0.78)
    return floor, thread


def render_settings(sc, samples=64):
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            continue
    ee = sc.eevee
    ee.taa_render_samples = samples
    for k, v in (("use_raytracing", True), ("use_shadows", True), ("shadow_ray_count", 2),
                 ("shadow_step_count", 8), ("use_fast_gi", True)):
        if hasattr(ee, k):
            setattr(ee, k, v)
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 94
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Punchy"
