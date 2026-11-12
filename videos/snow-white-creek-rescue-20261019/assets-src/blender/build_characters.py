"""
Build the eight main characters with MPFB (MakeHuman, CC0 assets) inside Blender and export rigged GLBs.

Run (from the video directory):
  BLENDER_USER_RESOURCES=$PWD/.cache/blender blender -b --factory-startup \
      --python assets-src/blender/build_characters.py -- [ids...] [--preview]

Each character gets:
  * MPFB base mesh shaped by macro phenotype + facial/body targets (distinct faces & proportions)
  * CC0 skin, eyes, brows, lashes, teeth, hair from the MakeHuman asset packs
  * fairy-tale costume modelled here and skinned to the same armature (data transfer of weights)
  * beards / hats / glasses for the dwarfs
  * the MPFB game_engine skeleton (53 bones incl. fingers)
  * ARKit-style face units as shape keys (blink, jawOpen, smile, brows, sneer ...)
Exports: public/models/<id>.glb  (+ optional preview PNG rendered with Eevee)
"""
import bpy, bmesh, os, sys, math, json, addon_utils
from mathutils import Vector, Matrix

addon_utils.enable('bl_ext.user_default.mpfb', default_set=True, persistent=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'models')
PREV = os.path.join(ROOT, 'checks', 'characters')
TEX = os.path.join(ROOT, 'public', 'assets', 'textures')
FACEUNITS = os.path.join(ROOT, '.cache', 'blender', 'mpfb_data', 'targets', 'faceunits')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = '--preview' in argv
NO_EXPORT = '--no-export' in argv
IDS = [a for a in argv if not a.startswith('--')]

# Face units exported as morph targets (names are the ARKit names, used verbatim in three.js)
FACE_UNITS = [
    'eyeBlinkLeft', 'eyeBlinkRight', 'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight',
    'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookUpLeft', 'eyeLookUpRight',
    'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
    'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
    'jawOpen', 'mouthClose', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
    'mouthPucker', 'mouthFunnel', 'mouthPressLeft', 'mouthPressRight', 'mouthStretchLeft', 'mouthStretchRight',
    'mouthRollLower', 'mouthShrugUpper', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthLowerDownLeft', 'mouthLowerDownRight',
    'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight', 'noseSneerLeft', 'noseSneerRight',
]


def T(name, v):
    return {"target": name, "value": v}


def sym(base, v):
    """left/right pair for l-/r- targets"""
    return [T('l-' + base, v), T('r-' + base, v)]


# ------------------------------------------------------------------ character definitions
CHARS = {
    'snow': dict(
        rest_expr=dict(mouthSmileLeft=0.12, mouthSmileRight=0.12),
        phen=dict(gender=0.0, age=0.36, muscle=0.45, weight=0.52, height=0.5, proportions=0.8, cupsize=0.5, firmness=0.65,
                  race=dict(caucasian=0.92, asian=0.06, african=0.02)),
        targets=[T('head-oval', 0.6), T('nose-scale-horiz-decr', 0.35), T('nose-point-width-decr', 0.4), T('nose-volume-decr', 0.3),
                 T('nose-scale-depth-decr', 0.25), T('mouth-upperlip-volume-incr', 0.35), T('mouth-lowerlip-volume-incr', 0.4),
                 T('mouth-cupidsbow-incr', 0.5), T('chin-width-decr', 0.3), T('chin-prominent-decr', 0.2), T('mouth-scale-horiz-decr', 0.15),
                 *sym('eye-scale-incr', 0.35), *sym('eye-height2-incr', 0.25), *sym('cheek-bones-incr', 0.3), *sym('eye-corner2-up', 0.2),
                 T('eyebrows-angle-up', 0.15), T('neck-scale-horiz-decr', 0.2)],
        skin='young_caucasian_female2.mhmat', eyes='brown.mhmat', brows='eyebrow006.mhclo', lashes='eyelashes04.mhclo', hair='bob02.mhclo',
        hair_color=(0.012, 0.010, 0.011), skin_tint=(1.0, 0.97, 0.96),
        costume='princess', voice='Tingting', clothes=['female_elegantsuit01.mhclo', 'shoes01.mhclo'], mirror_hair=False, tuck_fringe=True),
    'doc': dict(
        rest_expr=dict(browInnerUp=0.25, mouthSmileLeft=0.12, mouthSmileRight=0.12),
        phen=dict(gender=1.0, age=0.92, muscle=0.45, weight=0.72, height=0.0, proportions=0.05, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-round', 0.6), T('nose-volume-incr', 1.0), T('nose-scale-horiz-incr', 0.7), T('nose-point-width-incr', 1.0), T('nose-scale-depth-incr', 0.5),
                 T('nose-scale-vert-incr', 0.3), T('nose-flaring-incr', 0.4), T('eyebrows-trans-down', 0.2), *sym('cheek-volume-incr', 0.6),
                 T('chin-width-incr', 0.2), *sym('ear-scale-incr', 0.4), T('stomach-pregnant-incr', 0.35)],
        skin='old_caucasian_male.mhmat', eyes='bluegreen.mhmat', brows='eyebrow009.mhclo', hair='short02.mhclo',
        hair_color=(0.78, 0.76, 0.72), beard=dict(color=(0.84, 0.83, 0.80), length=0.36, width=1.0, style='split', mustache=1.0, density=1.0),
        hat=dict(color=(0.55, 0.22, 0.08), height=0.30, droop=0.35), glasses=True,
        tunic=(0.45, 0.17, 0.09), sleeve=(0.38, 0.15, 0.08), pants=(0.30, 0.24, 0.16), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.62, torso=0.92, arm=0.82, head=1.22)),
    'grumpy': dict(
        rest_expr=dict(browDownLeft=0.9, browDownRight=0.9, mouthFrownLeft=0.6, mouthFrownRight=0.6, mouthPressLeft=0.4, mouthPressRight=0.4, noseSneerLeft=0.25, noseSneerRight=0.25, eyeSquintLeft=0.3, eyeSquintRight=0.3),
        phen=dict(gender=1.0, age=0.78, muscle=0.8, weight=0.62, height=0.0, proportions=0.1, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-square', 0.7), T('nose-hump-incr', 1.0), T('nose-point-down', 0.8), T('nose-scale-vert-incr', 0.6), T('nose-volume-incr', 0.4),
                 T('nose-greek-incr', 0.3), T('eyebrows-trans-down', 0.6), T('eyebrows-angle-down', 0.7), T('forehead-nubian-incr', 0.5),
                 T('chin-prominent-incr', 0.5), T('mouth-angles-down', 0.6), *sym('eye-height2-decr', 0.4), T('mouth-scale-horiz-decr', 0.2)],
        skin='middleage_caucasian_male.mhmat', eyes='brown.mhmat', brows='eyebrow009.mhclo', hair='short04.mhclo',
        hair_color=(0.20, 0.18, 0.17), brow_scale=1.25, beard=dict(color=(0.25, 0.22, 0.20), length=0.13, width=1.2, style='short', mustache=1.2, density=1.2),
        hat=dict(color=(0.42, 0.07, 0.06), height=0.24, droop=0.12),
        tunic=(0.40, 0.17, 0.09), sleeve=(0.34, 0.14, 0.08), pants=(0.20, 0.17, 0.13), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.6, torso=0.94, arm=0.86, head=1.2)),
    'happy': dict(
        rest_expr=dict(mouthSmileLeft=0.75, mouthSmileRight=0.75, cheekSquintLeft=0.6, cheekSquintRight=0.6, eyeSquintLeft=0.35, eyeSquintRight=0.35, browOuterUpLeft=0.2, browOuterUpRight=0.2),
        phen=dict(gender=1.0, age=0.85, muscle=0.35, weight=1.0, height=0.0, proportions=0.05, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-round', 1.0), T('head-fat-incr', 0.8), *sym('cheek-volume-incr', 1.0), T('nose-volume-incr', 0.7), T('nose-point-width-incr', 0.7),
                 T('mouth-angles-up', 0.6), T('eyebrows-angle-up', 0.5), T('mouth-scale-horiz-incr', 0.3), T('stomach-pregnant-incr', 0.9),
                 *sym('eye-height2-decr', 0.25), T('neck-double-incr', 0.6)],
        skin='old_caucasian_male.mhmat', eyes='green.mhmat', brows='eyebrow001.mhclo', hair='short02.mhclo',
        hair_color=(0.88, 0.86, 0.82), beard=dict(color=(0.95, 0.94, 0.91), length=0.22, width=1.5, style='fluffy', mustache=1.3, density=1.3),
        hat=dict(color=(0.72, 0.38, 0.08), height=0.26, droop=0.25),
        tunic=(0.66, 0.36, 0.10), sleeve=(0.56, 0.30, 0.08), pants=(0.32, 0.22, 0.13), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.58, torso=0.95, arm=0.82, head=1.24)),
    'sleepy': dict(
        rest_expr=dict(eyeBlinkLeft=0.55, eyeBlinkRight=0.55, browInnerUp=0.3, mouthFrownLeft=0.15, mouthFrownRight=0.15),
        phen=dict(gender=1.0, age=0.88, muscle=0.3, weight=0.45, height=0.1, proportions=0.15, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-oval', 0.5), T('head-scale-vert-incr', 0.3), T('nose-scale-vert-incr', 0.7), T('nose-point-down', 0.5), T('nose-trans-down', 0.3),
                 T('eyebrows-angle-down', 0.0), T('eyebrows-angle-up', 0.0), *sym('eye-eyefold-down', 1.0), *sym('eye-height2-decr', 0.8), *sym('eye-bag-incr', 0.9),
                 *sym('eye-corner2-down', 0.6), T('mouth-angles-down', 0.3), T('chin-height-incr', 0.3)],
        skin='old_caucasian_male.mhmat', eyes='lightblue.mhmat', brows='eyebrow011.mhclo', hair='short02.mhclo',
        hair_color=(0.60, 0.58, 0.54), beard=dict(color=(0.62, 0.60, 0.56), length=0.42, width=0.8, style='long', mustache=0.8, density=0.85, narrow=0.55),
        hat=dict(color=(0.16, 0.36, 0.18), height=0.42, droop=0.95, side=0.25),
        tunic=(0.20, 0.30, 0.19), sleeve=(0.17, 0.26, 0.16), pants=(0.26, 0.23, 0.17), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.66, torso=0.94, arm=0.86, head=1.18)),
    'bashful': dict(
        rest_expr=dict(browInnerUp=0.55, mouthSmileLeft=0.25, mouthSmileRight=0.2, mouthPressLeft=0.2, mouthPressRight=0.2, eyeLookDownLeft=0.25, eyeLookDownRight=0.25),
        phen=dict(gender=1.0, age=0.72, muscle=0.4, weight=0.6, height=0.0, proportions=0.1, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-round', 0.5), T('nose-scale-horiz-decr', 0.2), T('nose-point-up', 0.5), T('nose-volume-decr', 0.1), *sym('cheek-volume-incr', 0.5),
                 T('eyebrows-angle-up', 0.8), *sym('eye-scale-incr', 0.15), T('mouth-scale-horiz-decr', 0.25), T('chin-prominent-decr', 0.3)],
        skin='middleage_caucasian_male.mhmat', eyes='lightblue.mhmat', brows='eyebrow007.mhclo', hair='short03.mhclo',
        hair_color=(0.36, 0.25, 0.15), beard=dict(color=(0.45, 0.31, 0.18), length=0.12, width=1.0, style='curly', mustache=0.6, density=1.0),
        hat=dict(color=(0.48, 0.55, 0.20), height=0.25, droop=0.30), blush=0.35,
        tunic=(0.34, 0.37, 0.14), sleeve=(0.28, 0.32, 0.12), pants=(0.29, 0.24, 0.17), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.6, torso=0.92, arm=0.84, head=1.2)),
    'sneezy': dict(
        rest_expr=dict(noseSneerLeft=0.45, noseSneerRight=0.45, browInnerUp=0.3, eyeSquintLeft=0.2, eyeSquintRight=0.2),
        phen=dict(gender=1.0, age=0.8, muscle=0.42, weight=0.6, height=0.0, proportions=0.08, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-oval', 0.3), T('nose-scale-horiz-incr', 0.9), T('nose-flaring-incr', 1.0), T('nose-nostrils-width-incr', 0.9), T('nose-volume-incr', 0.8),
                 T('nose-point-width-incr', 0.6), T('eyebrows-angle-up', 0.3), *sym('eye-bag-incr', 0.4), T('mouth-scale-vert-decr', 0.2)],
        skin='old_caucasian_male.mhmat', eyes='brown.mhmat', brows='eyebrow004.mhclo', hair='short02.mhclo',
        hair_color=(0.70, 0.68, 0.63), beard=dict(color=(0.76, 0.74, 0.70), length=0.26, width=0.7, style='wispy', mustache=0.7, density=0.55),
        hat=dict(color=(0.48, 0.32, 0.18), height=0.27, droop=0.40, side=-0.15), red_nose=1.0,
        tunic=(0.55, 0.37, 0.12), sleeve=(0.47, 0.32, 0.10), pants=(0.25, 0.21, 0.16), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], dwarf=dict(leg=0.6, torso=0.93, arm=0.84, head=1.2)),
    'dopey': dict(
        rest_expr=dict(mouthSmileLeft=0.45, mouthSmileRight=0.45, eyeWideLeft=0.35, eyeWideRight=0.35, browOuterUpLeft=0.4, browOuterUpRight=0.4),
        phen=dict(gender=0.8, age=0.25, muscle=0.25, weight=0.45, height=0.0, proportions=0.1, race=dict(caucasian=1.0, asian=0, african=0)),
        targets=[T('head-round', 0.6), T('head-scale-vert-decr', 0.1), *sym('ear-scale-incr', 1.0), *sym('ear-flap-incr', 1.0), *sym('ear-wing-incr', 1.0),
                 *sym('ear-shape-round', 0.6), *sym('eye-scale-incr', 0.6), T('nose-point-up', 0.6), T('nose-scale-horiz-decr', 0.2),
                 T('eyebrows-trans-up', 0.6), T('eyebrows-angle-up', 0.6), T('mouth-scale-horiz-incr', 0.2), T('chin-prominent-decr', 0.4)],
        skin='young_caucasian_male.mhmat', eyes='blue.mhmat', brows='eyebrow007.mhclo', hair='short03.mhclo',
        hair_color=(0.45, 0.31, 0.18), hat=dict(color=(0.42, 0.22, 0.62), height=0.22, droop=0.2, flat=True),
        tunic=(0.25, 0.42, 0.18), sleeve=(0.25, 0.42, 0.18), pants=(0.33, 0.26, 0.18), costume='dwarf', clothes=['male_casualsuit01.mhclo', 'shoes03.mhclo'], baggy=1.25, long_sleeves=True,
        dwarf=dict(leg=0.56, torso=0.88, arm=0.86, head=1.24)),
}

# ------------------------------------------------------------------ helpers

def clear_scene():
    _DETAIL.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable('bl_ext.user_default.mpfb', default_set=True, persistent=True)


def pbr_material(name, color, rough=0.8, tex=None, scale=1.0, sheen=0.0, normal_strength=1.0, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    color = tuple(c ** 2.2 for c in color)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metallic
    if sheen and 'Sheen Weight' in p.inputs:
        p.inputs['Sheen Weight'].default_value = sheen
    if tex:
        d = os.path.join(TEX, tex)
        coord = nt.nodes.new('ShaderNodeTexCoord')
        mapn = nt.nodes.new('ShaderNodeMapping')
        mapn.inputs['Scale'].default_value = (scale, scale, scale)
        nt.links.new(coord.outputs['UV'], mapn.inputs['Vector'])
        diff = os.path.join(d, 'diff.jpg')
        if os.path.exists(diff):
            ti = nt.nodes.new('ShaderNodeTexImage')
            ti.image = detail_texture(diff)
            nt.links.new(mapn.outputs['Vector'], ti.inputs['Vector'])
            # albedo = costume colour x normalised fabric detail (exports as baseColorFactor x baseColorTexture)
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(ti.outputs['Color'], mix.inputs['A'])
            mix.inputs['B'].default_value = (*color, 1)
            nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
        nor = os.path.join(d, 'nor.jpg')
        if os.path.exists(nor):
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = bpy.data.images.load(nor)
            tn.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mapn.outputs['Vector'], tn.inputs['Vector'])
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nm.inputs['Strength'].default_value = normal_strength
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m


_DETAIL = {}


def _np():
    import numpy
    return numpy


def detail_texture(path):
    """greyscale fabric detail normalised to mean 0.85 (linear), cached as a PNG next to the build cache"""
    if path in _DETAIL:
        return _DETAIL[path]
    np = _np()
    cache = os.path.join(ROOT, '.cache', 'tex', os.path.basename(os.path.dirname(path)) + '_detail.png')
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    if not os.path.exists(cache):
        src = bpy.data.images.load(path)
        w, h = src.size
        px = np.array(src.pixels[:], dtype=np.float32).reshape(-1, 4)  # linear float
        lum = px[:, 0] * 0.2126 + px[:, 1] * 0.7152 + px[:, 2] * 0.0722
        lum = np.clip(lum / max(1e-4, float(lum.mean())) * 0.85, 0, 1)
        out = bpy.data.images.new('detail', w, h, alpha=False, float_buffer=False)
        out.colorspace_settings.name = 'sRGB'
        srgb = np.where(lum <= 0.0031308, lum * 12.92, 1.055 * np.power(lum, 1 / 2.4) - 0.055)
        arr = np.stack([srgb, srgb, srgb, np.ones_like(srgb)], 1).ravel()
        out.pixels = arr.tolist()
        out.filepath_raw = cache
        out.file_format = 'PNG'
        out.save()
        bpy.data.images.remove(src)
        bpy.data.images.remove(out)
    img = bpy.data.images.load(cache)
    _DETAIL[path] = img
    return img


def tinted_image(img, color, name):
    """bake a tint into a copy of a (hair/brow) texture: rgb = luminance * colour, alpha kept"""
    np = _np()
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    lum = px[:, 0] * 0.2126 + px[:, 1] * 0.7152 + px[:, 2] * 0.0722
    m = float(lum[px[:, 3] > 0.5].mean()) if (px[:, 3] > 0.5).any() else float(lum.mean())
    k = np.clip(lum / max(1e-4, m), 0, 2.5)
    col = np.array([c ** 2.2 for c in color], dtype=np.float32)
    rgb = np.clip(k[:, None] * col[None, :], 0, 1)
    srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
    out = bpy.data.images.new(name, w, h, alpha=True)
    out.pixels = np.concatenate([srgb, px[:, 3:4]], 1).ravel().tolist()
    path = os.path.join(ROOT, '.cache', 'tex', name + '.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.filepath_raw = path
    out.file_format = 'PNG'
    out.save()
    return out


def apply_shape(obj):
    """bake all shape keys into the mesh (keep result)"""
    if obj.data.shape_keys is None:
        return
    obj.shape_key_add(name='__mix__', from_mix=True)
    kb = obj.data.shape_keys.key_blocks
    mix = [k.co.copy() for k in kb['__mix__'].data]
    obj.shape_key_clear()
    for v, c in zip(obj.data.vertices, mix):
        v.co = c


def bone_head(rig, name):
    return rig.matrix_world @ rig.data.bones[name].head_local


def bone_tail(rig, name):
    return rig.matrix_world @ rig.data.bones[name].tail_local


def world_uv(o):
    """cylindrical-ish world-scale UVs (1 UV unit = 1 metre) so tiling textures have a consistent scale"""
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    cx = sum(v.co.x for v in me.vertices) / max(1, len(me.vertices))
    cy = sum(v.co.y for v in me.vertices) / max(1, len(me.vertices))
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            a = math.atan2(co.y - cy, co.x - cx)
            r = math.hypot(co.x - cx, co.y - cy)
            uv[li].uv = (a * max(r, 0.05), co.z)
    # fix seam: keep each face's u continuous
    for poly in me.polygons:
        us = [uv[li].uv[0] for li in poly.loop_indices]
        if max(us) - min(us) > 0.1:
            for li in poly.loop_indices:
                if uv[li].uv[0] < 0:
                    co = me.vertices[me.loops[li].vertex_index].co
                    r = math.hypot(co.x - cx, co.y - cy)
                    uv[li].uv = (uv[li].uv[0] + 2 * math.pi * max(r, 0.05), uv[li].uv[1])


def add_obj(name, mesh, mat=None):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    return o


def shrinkwrap_offset(obj, target, offset, wrap='NEAREST_SURFACEPOINT'):
    m = obj.modifiers.new('sw', 'SHRINKWRAP')
    m.target = target
    m.wrap_method = wrap
    m.wrap_mode = 'OUTSIDE_SURFACE'
    m.offset = offset
    return m


def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        if m.type == 'ARMATURE':
            continue
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e:
            print('modifier apply failed', obj.name, m.name, e)


def body_region_copy(body, name, pred, offset, mat, solidify=0.0, smooth=6):
    """Duplicate the faces of the body whose centre satisfies pred(co_world) and push them outward -> garment shell."""
    me = body.data.copy()
    o = add_obj(name, me, None)
    o.matrix_world = body.matrix_world
    o.data.materials.clear()
    o.data.materials.append(mat)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    mw = body.matrix_world
    kill = [f for f in bm.faces if not pred(mw @ f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    for v in bm.verts:
        v.co += v.normal * offset
    bm.to_mesh(o.data)
    bm.free()
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    if o.data.shape_keys:
        o.shape_key_clear()
    if solidify:
        s = o.modifiers.new('solid', 'SOLIDIFY')
        s.thickness = solidify
        s.offset = 1
    sm = o.modifiers.new('smooth', 'CORRECTIVE_SMOOTH')
    sm.iterations = smooth
    sm.scale = 1.0
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def lathe(name, profile, segs, mat, center=Vector((0, 0, 0)), squash=(1.0, 1.0)):
    """profile: list of (r, z). Builds a surface of revolution around world Z through center."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((center.x + math.cos(a) * r * squash[0], center.y + math.sin(a) * r * squash[1], center.z + z)))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = add_obj(name, me, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    world_uv(o)
    return o


def tube(name, pts, radii, segs, mat, cap=True):
    bm = bmesh.new()
    rings = []
    for i, (p, r) in enumerate(zip(pts, radii)):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(up).normalized()
        v = d.cross(u).normalized()
        ring = [bm.verts.new(p + (u * math.cos(2 * math.pi * k / segs) + v * math.sin(2 * math.pi * k / segs)) * r) for k in range(segs)]
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(segs):
            bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = add_obj(name, me, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    world_uv(o)
    return o


def strand_texture():
    """alpha strand texture for beard cards (generated in Blender, saved alongside the model)"""
    name = 'beard_strands'
    if name in bpy.data.images:
        return bpy.data.images[name]
    W, H = 128, 512
    img = bpy.data.images.new(name, W, H, alpha=True)
    import random
    rnd = random.Random(7)
    px = [0.0] * (W * H * 4)
    for s in range(90):
        x0 = rnd.random() * W
        wv = (rnd.random() - 0.5) * 14
        ln = 0.55 + rnd.random() * 0.45
        g = 0.75 + rnd.random() * 0.25
        w = 0.8 + rnd.random() * 1.6
        for y in range(int(H * ln)):
            t = y / H
            x = x0 + math.sin(t * 6 + s) * wv * t
            for dx in range(-2, 3):
                xi = int(x + dx) % W
                a = max(0.0, 1 - abs(dx) / w) * (1 - t / ln * 0.6)
                i = ((H - 1 - y) * W + xi) * 4
                if a > px[i + 3]:
                    px[i] = px[i + 1] = px[i + 2] = g
                    px[i + 3] = a
    img.pixels = px
    img.file_format = 'PNG'
    img.pack()
    return img


def hair_card_material(name, color, rough=0.55):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    ti = nt.nodes.new('ShaderNodeTexImage')
    ti.image = strand_texture()
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1
    mix.inputs['B'].default_value = (*[c ** 2.2 for c in color], 1)
    nt.links.new(ti.outputs['Color'], mix.inputs['A'])
    nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    nt.links.new(ti.outputs['Alpha'], p.inputs['Alpha'])
    p.inputs['Roughness'].default_value = rough
    m.blend_method = 'HASHED' if hasattr(m, 'blend_method') else None
    m.use_backface_culling = False
    return m


def beard_cards(name, body, spec, rig):
    """Dense curved hair cards rooted on the lower face of the MPFB head, flowing down over the chest."""
    import random
    rnd = random.Random(hash(name) & 0xffff)
    mat = hair_card_material(name + '_mat', spec['color'])
    mw = body.matrix_world
    head = bone_head(rig, 'head')
    neck = bone_head(rig, 'neck_01')
    face_fwd = Vector((0, -1, 0))
    # sample roots: body verts of the jaw/chin/cheeks, in front of the face, below the nose line
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    eye_z = sum((eyes_obj.matrix_world @ v.co).z for v in eyes_obj.data.vertices) / len(eyes_obj.data.vertices)
    mouth_z = eye_z - 0.064
    chin_z = eye_z - 0.11
    roots = []
    deps = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(deps)
    me = ev.to_mesh()
    for v in me.vertices:
        co = mw @ v.co
        rel = co - head
        dx = abs(rel.x)
        dz = co.z - eye_z
        n = (mw.to_3x3() @ v.normal).normalized()
        if n.y > 0.15 or rel.y > -0.01:
            continue
        # beard area: jaw line from the ears down, cheeks below the cheekbones, chin and under-chin
        if dz > -0.035 or dz < -0.17:
            continue
        if dx < 0.034 and dz > -0.052:   # nose / philtrum stays bare
            continue
        if dx < 0.024 and -0.078 < dz <= -0.052:  # lips
            continue
        if dx > 0.075:
            continue
        roots.append((co.copy(), n))
    ev.to_mesh_clear()
    rnd.shuffle(roots)
    roots = roots[: int(900 * spec.get('density', 1.0))]
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    style = spec['style']
    anchors = []
    L0 = spec['length']
    for co, n in roots:
        rel = co - head
        centre = max(0.0, 1 - abs(rel.x) / 0.07)
        L = L0 * (0.35 + 0.65 * centre) * (0.8 + 0.4 * rnd.random())
        if style == 'split' and abs(rel.x) < 0.012:
            L *= 0.6
        if style == 'short':
            L *= 0.75
        if style == 'wispy':
            L *= 0.5 + rnd.random() * 0.7
        width = 0.007 * spec['width'] * (0.8 + 0.4 * rnd.random())
        segs = 7
        d = (n * 0.8 + Vector((0, 0, -1.0)) + face_fwd * 0.15).normalized()
        side = d.cross(face_fwd).normalized()
        if side.length < 0.1:
            side = Vector((1, 0, 0))
        p = co - n * 0.002
        prev = None
        curl = (rnd.random() - 0.5) * (1.6 if style in ('curly', 'fluffy') else 0.5)
        for s in range(segs + 1):
            t = s / segs
            w = width * (1 - t * 0.55) * (1.25 if style == 'fluffy' else 1)
            a = bm.verts.new(p + side * w)
            b = bm.verts.new(p - side * w)
            anchors += [co.copy(), co.copy()]
            if prev:
                f = bm.faces.new((prev[0], prev[1], b, a))
                for loop, uv in zip(f.loops, [(0, 1 - (s - 1) / segs), (1, 1 - (s - 1) / segs), (1, 1 - t), (0, 1 - t)]):
                    loop[uvl].uv = uv
            prev = (a, b)
            # bend: drape over the chest (push forward as it goes down past the chin)
            fwd_push = face_fwd * 0.12 * (1 - t)
            d = (d + Vector((0, 0, -0.45)) + fwd_push).normalized()
            if style == 'split':
                d.x += math.copysign(0.05, rel.x) * t
            if spec.get('narrow'):
                d.x -= (p.x - head.x) * spec['narrow'] * 2.0 * t
            d = (Matrix.Rotation(curl / segs, 3, side) @ d).normalized()
            p = p + d * (L / segs)
    # mustache
    if spec.get('mustache', 0) > 0:
        ys = [c.y for c, _ in roots] or [head.y - 0.1]
        front = min(ys)
        for i in range(int(140 * spec['mustache'])):
            sx = -1 if i % 2 else 1
            u = rnd.random()
            co = Vector((head.x + sx * (0.003 + u * 0.024), front + 0.012 + u * u * 0.018, mouth_z + 0.014 + rnd.random() * 0.006))
            d = Vector((sx * (0.55 + u * 0.4), -0.15, -0.8)).normalized()
            side = Vector((0, 0, 1)).cross(d).normalized()
            L = 0.03 + 0.03 * u * spec['mustache']
            w = 0.004
            p0 = co
            prev = None
            for s2 in range(5):
                t = s2 / 4
                a = bm.verts.new(p0 + side * w * (1 - t * 0.6))
                b = bm.verts.new(p0 - side * w * (1 - t * 0.6))
                anchors += [co + Vector((0, 0.008, -0.004)), co + Vector((0, 0.008, -0.004))]
                if prev:
                    f = bm.faces.new((prev[0], prev[1], b, a))
                    for loop, uv in zip(f.loops, [(0, 1 - (s2 - 1) / 4), (1, 1 - (s2 - 1) / 4), (1, 1 - t), (0, 1 - t)]):
                        loop[uvl].uv = uv
                prev = (a, b)
                d = (d + Vector((0, 0, -0.25))).normalized()
                p0 = p0 + d * (L / 4)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = add_obj(name, me, mat)
    for poly in o.data.polygons:
        poly.use_smooth = True
    # bmesh keeps creation order -> anchors align with vertex indices
    if len(anchors) == len(o.data.vertices):
        transfer_face_units(o, body, anchors=anchors, k=3, max_dist=0.04)
    return o


def bind(obj, rig, body):
    """skin a garment/prop to the rig by transferring vertex weights from the body"""
    for m in list(obj.modifiers):
        if m.type == 'ARMATURE':
            obj.modifiers.remove(m)
    obj.vertex_groups.clear()
    dt = obj.modifiers.new('dt', 'DATA_TRANSFER')
    dt.object = body
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.datalayout_transfer(modifier='dt')
    bpy.ops.object.modifier_apply(modifier='dt')
    # drop non-bone groups
    bones = set(b.name for b in rig.data.bones)
    for g in list(obj.vertex_groups):
        if g.name not in bones:
            obj.vertex_groups.remove(g)
    am = obj.modifiers.new('Armature', 'ARMATURE')
    am.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


def bind_rigid(obj, rig, bone):
    obj.vertex_groups.clear()
    g = obj.vertex_groups.new(name=bone)
    g.add([v.index for v in obj.data.vertices], 1.0, 'REPLACE')
    am = obj.modifiers.new('Armature', 'ARMATURE')
    am.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


# ------------------------------------------------------------------ costumes

def garment_normal(obj):
    """return the normal-map image of an imported MakeHuman garment, if any"""
    for m in obj.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and 'normal' in n.image.name:
                    return n.image
    return None


def restyle(obj, regions, default):
    """Replace a MakeHuman garment's look: each face gets the material of the first region whose predicate matches
    its world-space centre. The garment's own wrinkle normal map is kept on every new material."""
    nimg = garment_normal(obj)
    mats = [default] + [m for _, m in regions]
    for m in mats:
        if nimg is not None and m.use_nodes:
            nt = m.node_tree
            p = nt.nodes['Principled BSDF']
            if not p.inputs['Normal'].links:
                tn = nt.nodes.new('ShaderNodeTexImage')
                tn.image = nimg
                tn.image.colorspace_settings.name = 'Non-Color'
                nm = nt.nodes.new('ShaderNodeNormalMap')
                nm.inputs['Strength'].default_value = 1.2
                nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
                nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    obj.data.materials.clear()
    for m in mats:
        obj.data.materials.append(m)
    mw = obj.matrix_world
    for poly in obj.data.polygons:
        c = mw @ poly.center
        poly.material_index = 0
        for i, (pred, _) in enumerate(regions):
            if pred(c):
                poly.material_index = i + 1
                break
        poly.use_smooth = True


def delete_faces(obj, pred):
    mw = obj.matrix_world
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    kill = [f for f in bm.faces if pred(mw @ f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def tube_folds(name, pts, radii, segs, mats, fold=0.0, nfold=10, stripe=None, cap=False):
    """tube along pts with angular folds; stripe=(period, width) assigns material slot 1 to angular bands"""
    bm = bmesh.new()
    rings = []
    for i, (p, r) in enumerate(zip(pts, radii)):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(up).normalized()
        v = d.cross(u).normalized()
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            rr = r * (1 + fold * math.sin(a * nfold))
            ring.append(bm.verts.new(p + (u * math.cos(a) + v * math.sin(a)) * rr))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(segs):
            f = bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
            if stripe and (k % stripe[0]) < stripe[1]:
                f.material_index = 1
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = add_obj(name, me)
    for m in mats:
        o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    world_uv(o)
    return o


def lathe_range(name, profile, segs, mat, center, a0, a1, squash=(1.0, 1.0)):
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = []
        for i in range(segs + 1):
            a = a0 + (a1 - a0) * i / segs
            ring.append(bm.verts.new((center.x + math.cos(a) * r * squash[0], center.y + math.sin(a) * r * squash[1], center.z + z)))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = add_obj(name, me, mat)
    for p in o.data.polygons:
        p.use_smooth = True
    world_uv(o)
    return o


def solidify(o, t):
    m = o.modifiers.new('s', 'SOLIDIFY')
    m.thickness = t
    m.offset = 0
    apply_modifiers(o)


def body_radius_at(body, z, center, band=0.012, ysq=1.0, maxx=0.2):
    mw = body.matrix_world
    rs = []
    for v in body.data.vertices:
        c = mw @ v.co
        if abs(c.z - z) < band and abs(c.x - center.x) < maxx:
            rs.append(math.hypot(c.x - center.x, (c.y - center.y) / ysq))
    return max(rs) if rs else 0.15


def princess_costume(body, rig, spec, garments):
    mats = {
        'bodice': pbr_material('bodice', (0.03, 0.06, 0.28), 0.5, 'velour_velvet', 7, sheen=0.7, normal_strength=0.4),
        'sleeve': pbr_material('sleeve', (0.06, 0.14, 0.52), 0.5, 'velour_velvet', 7, sheen=0.6, normal_strength=0.4),
        'slash': pbr_material('slash', (0.55, 0.03, 0.05), 0.45, 'velour_velvet', 9, sheen=0.5, normal_strength=0.4),
        'skirt': pbr_material('skirt', (0.80, 0.52, 0.05), 0.62, 'rough_linen', 5, sheen=0.4, normal_strength=0.6),
        'collar': pbr_material('collar', (0.90, 0.88, 0.82), 0.6, 'cotton_jersey', 10, normal_strength=0.5),
        'shoe': pbr_material('shoe', (0.12, 0.05, 0.03), 0.4, 'brown_leather', 6),
    }
    hips = bone_head(rig, 'pelvis')
    waist_z = bone_head(rig, 'spine_02').z + 0.035
    neck = bone_head(rig, 'neck_01')
    sh_l, sh_r = bone_head(rig, 'upperarm_l'), bone_head(rig, 'upperarm_r')
    el_l, el_r = bone_head(rig, 'lowerarm_l'), bone_head(rig, 'lowerarm_r')
    arm_x = abs(sh_l.x)
    # blouse -> blue velvet bodice; cut its sleeves just above the elbow (hidden inside the puff)
    blouse = garments['female_elegantsuit01']
    restyle(blouse, [(lambda c: c.z < waist_z - 0.06, mats['skirt'])], mats['bodice'])
    cut_z = lambda c: (el_l.z + (sh_l.z - el_l.z) * 0.45)
    delete_faces(blouse, lambda c: abs(c.x) > arm_x + 0.02 and c.z < cut_z(c))
    if 'shoes01' in garments:
        restyle(garments['shoes01'], [], mats['shoe'])
    # puffed sleeves with red slashes, along the upper arm bone
    for sh, el, side in ((sh_l, el_l, 'l'), (sh_r, el_r, 'r')):
        d = (el - sh)
        L = d.length
        pts, rad = [], []
        for i in range(12):
            t = i / 11
            pts.append(sh + d * (-0.08 + t * 0.62) + Vector((0, 0, 0.012 * math.sin(t * math.pi))))
            rad.append(0.034 + 0.034 * math.sin(min(1.0, t * 1.05) * math.pi) ** 0.8 + (0.006 if t > 0.92 else 0))
        puff = tube_folds('puff_' + side, pts, rad, 48, [mats['sleeve'], mats['slash']], fold=0.06, nfold=8, stripe=(6, 2))
        solidify(puff, 0.004)
        bind(puff, rig, body)
    # high stand-up lace collar (back half), flaring outward
    ncen = Vector((neck.x, neck.y + 0.006, neck.z + 0.01))
    nr = body_radius_at(body, neck.z, neck, band=0.01, ysq=1.0) + 0.006
    col = lathe_range('collar', [(nr, -0.03), (nr + 0.004, 0.0), (nr + 0.016, 0.04), (nr + 0.032, 0.075)], 40, mats['collar'], ncen, math.radians(5), math.radians(175), squash=(1.0, 0.9))
    solidify(col, 0.003)
    bind(col, rig, body)
    # long full skirt from the waist to the floor
    wr = body_radius_at(body, waist_z, hips, band=0.012, ysq=0.85, maxx=0.16) + 0.01
    hip_z = bone_head(rig, 'thigh_l').z
    hr = body_radius_at(body, hip_z, hips, band=0.015, ysq=0.85, maxx=0.22) + 0.02
    prof = []
    for i in range(22):
        t = i / 21
        z = waist_z - t * (waist_z - 0.012)
        th = (waist_z - z) / max(1e-3, waist_z - hip_z)
        if th <= 1.0:
            r = wr + (hr - wr) * math.sin(th * math.pi / 2)
        else:
            u = (z - 0.012) / max(1e-3, hip_z - 0.012)
            r = hr + (0.36 - hr) * (1 - u) ** 1.1
        prof.append((r, z - waist_z))
    sk = lathe_range('skirt', prof, 96, mats['skirt'], Vector((hips.x, hips.y + 0.01, waist_z)), 0, 2 * math.pi, squash=(1.0, 0.9))
    for v in sk.data.vertices:
        a = math.atan2(v.co.y - hips.y, v.co.x - hips.x)
        t = max(0.0, (waist_z - v.co.z) / waist_z)
        k = 1 + t ** 1.3 * (0.05 * math.sin(a * 13) + 0.025 * math.sin(a * 6 + 1.3))
        v.co.x = hips.x + (v.co.x - hips.x) * k
        v.co.y = hips.y + 0.01 + (v.co.y - hips.y - 0.01) * k
    solidify(sk, 0.004)
    sash = lathe_range('sash', [(wr + 0.002, -0.02), (wr + 0.004, 0.0), (wr - 0.002, 0.035)], 64, mats['slash'], Vector((hips.x, hips.y + 0.01, waist_z)), 0, 2 * math.pi, squash=(1.0, 0.9))
    bind(sash, rig, body)
    # skirt weights: smooth blend pelvis -> thighs (no tearing when walking)
    bind(sk, rig, body)
    sk.vertex_groups.clear()
    gp, gl, gr = (sk.vertex_groups.new(name=n) for n in ('pelvis', 'thigh_l', 'thigh_r'))
    for v in sk.data.vertices:
        t = max(0.0, min(1.0, (waist_z - v.co.z) / (waist_z * 0.9)))
        leg = 0.45 * t ** 1.2
        side = max(0.0, min(1.0, 0.5 + (v.co.x - hips.x) / 0.35))
        gp.add([v.index], 1 - leg, 'REPLACE')
        gl.add([v.index], leg * side, 'REPLACE')
        gr.add([v.index], leg * (1 - side), 'REPLACE')
    # red hair bow
    head = bone_head(rig, 'head')
    top_z = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    bow_c = Vector((head.x, head.y + 0.03, top_z + 0.004))
    for sx in (-1, 1):
        lp = bow_c + Vector((sx * 0.04, 0, 0.0))
        pts = [bow_c, lp + Vector((-sx * 0.01, 0, 0.028)), lp + Vector((sx * 0.035, 0, 0.012)), lp + Vector((sx * 0.03, 0, -0.022)), lp + Vector((-sx * 0.01, 0, -0.02)), bow_c]
        loop = tube('bowloop%d' % sx, pts, [0.006, 0.011, 0.013, 0.012, 0.01, 0.006], 12, mats['slash'], cap=False)
        bind_rigid(loop, rig, 'head')
    knot = tube('bowknot', [bow_c + Vector((-0.012, 0, 0)), bow_c + Vector((0.012, 0, 0))], [0.012, 0.012], 12, mats['slash'])
    bind_rigid(knot, rig, 'head')


def dwarf_costume(body, rig, spec, name, garments):
    tun = pbr_material('tunic', spec['tunic'], 0.85, 'rough_linen', 18, sheen=0.45, normal_strength=0.5)
    pan = pbr_material('pants', spec['pants'], 0.9, 'rough_linen', 14, normal_strength=0.6)
    belt = pbr_material('belt', (0.08, 0.05, 0.03), 0.45, 'brown_leather', 6)
    boot = pbr_material('boots', (0.20, 0.12, 0.06), 0.5, 'fabric_leather_02', 6)
    buckle = pbr_material('buckle', (0.78, 0.62, 0.28), 0.3, metallic=1.0)
    baggy = spec.get('baggy', 1.0)
    waist_z = bone_head(rig, 'spine_01').z + 0.01
    hips = bone_head(rig, 'pelvis')
    shirt = [g for k, g in garments.items() if 'casualsuit' in k or 'worksuit' in k][0]
    restyle(shirt, [(lambda c: c.z < waist_z - 0.02, pan)], tun)
    for k, g in garments.items():
        if k.startswith('shoes'):
            restyle(g, [], boot)
    wr = body_radius_at(shirt, waist_z, hips, band=0.015, ysq=0.95) + 0.008
    flare_len = 0.27 if spec.get('long_sleeves') else 0.21
    prof = [(wr, 0.0), (wr + 0.012, -flare_len * 0.35), ((wr + 0.05) * baggy, -flare_len)]
    flare = lathe_range('tunic_skirt', prof, 64, tun, Vector((hips.x, hips.y, waist_z)), 0, 2 * math.pi, squash=(1.0, 0.95))
    for v in flare.data.vertices:
        a = math.atan2(v.co.y - hips.y, v.co.x - hips.x)
        t = max(0.0, (waist_z - v.co.z) / flare_len)
        k = 1 + t * 0.04 * math.sin(a * 9)
        v.co.x = hips.x + (v.co.x - hips.x) * k
        v.co.y = hips.y + (v.co.y - hips.y) * k
    solidify(flare, 0.006)
    bl = lathe_range('belt', [(wr + 0.006, -0.012), (wr + 0.008, 0.012), (wr + 0.004, 0.03)], 64, belt, Vector((hips.x, hips.y, waist_z)), 0, 2 * math.pi, squash=(1.0, 0.95))
    solidify(bl, 0.004)
    front = hips.y - (wr + 0.012) * 0.95
    bk = tube('buckle', [Vector((hips.x, front, waist_z - 0.005)), Vector((hips.x, front - 0.004, waist_z + 0.03))], [0.022, 0.022], 4, buckle)
    flare.vertex_groups.clear()
    for o in (flare, bl, bk):
        bind(o, rig, body)
    gp, gl, gr = (flare.vertex_groups.new(name=n) if flare.vertex_groups.get(n) is None else flare.vertex_groups[n] for n in ('pelvis', 'thigh_l', 'thigh_r'))
    for v in flare.data.vertices:
        t = max(0.0, min(1.0, (waist_z - v.co.z) / flare_len))
        leg = 0.55 * t
        side = max(0.0, min(1.0, 0.5 + (v.co.x - hips.x) / 0.3))
        for g in flare.vertex_groups:
            g.remove([v.index])
        gp.add([v.index], 1 - leg, 'REPLACE')
        gl.add([v.index], leg * side, 'REPLACE')
        gr.add([v.index], leg * (1 - side), 'REPLACE')
    # hat
    h = spec['hat']
    head = bone_head(rig, 'head')
    mwb = body.matrix_world
    top_z = max((mwb @ v.co).z for v in body.data.vertices)
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    eye_z = sum((eyes_obj.matrix_world @ v.co).z for v in eyes_obj.data.vertices) / len(eyes_obj.data.vertices)
    cz = eye_z + 0.07
    R = body_radius_at(body, cz, head, band=0.008, maxx=0.11) + 0.006
    hat_mat = pbr_material('hat', h['color'], 0.95, 'velour_velvet', 40, sheen=0.6, normal_strength=0.25)
    pts, radii = [], []
    n = 16
    for i in range(n + 1):
        t = i / n
        bend = t ** 1.6
        if h.get('flat'):
            pts.append(Vector((head.x, head.y + 0.015 + t * t * R * 1.2, cz + t * R * 0.6)))
            radii.append(R * 1.02 * (1 - 0.7 * t ** 1.5))
        else:
            H = h['height']
            pts.append(Vector((head.x + h.get('side', 0) * bend * 0.2, head.y + 0.015 + h['droop'] * bend * 0.24, cz + t * H - h['droop'] * bend * bend * H * 0.55)))
            radii.append(R * (1 - t) ** 0.7 + 0.004)
    cap = tube_folds('hat', pts, radii, 36, [hat_mat], fold=0.012, nfold=7, cap=True)
    solidify(cap, 0.003)
    cuff = lathe_range('hatcuff', [(R + 0.002, -0.014), (R + 0.009, 0.0), (R + 0.004, 0.016)], 48, hat_mat, Vector((head.x, head.y + 0.015, cz)), 0, 2 * math.pi)
    tilt = Matrix.Translation(Vector((head.x, head.y + 0.015, cz))) @ Matrix.Rotation(math.radians(-14), 4, 'X') @ Matrix.Translation(-Vector((head.x, head.y + 0.015, cz)))
    for o in (cap, cuff):
        o.data.transform(tilt)
        o.data.transform(Matrix.Translation(Vector((0, 0.012, 0))))
        bind_rigid(o, rig, 'head')
    if spec.get('beard'):
        b = beard_cards(name + '_beard', body, spec['beard'], rig)
        bind(b, rig, body)
    if spec.get('glasses'):
        add_glasses(rig, head)


def add_glasses(rig, head):
    gm = pbr_material('glasses_metal', (0.78, 0.64, 0.36), 0.25, metallic=1.0)
    lens = bpy.data.materials.new('lens')
    lens.use_nodes = True
    lp = lens.node_tree.nodes['Principled BSDF']
    lp.inputs['Base Color'].default_value = (0.9, 0.95, 1.0, 1)
    lp.inputs['Roughness'].default_value = 0.02
    lp.inputs['Alpha'].default_value = 0.1
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    ev = [eyes_obj.matrix_world @ v.co for v in eyes_obj.data.vertices]
    front_y = min(p.y for p in ev)
    ring0 = None
    for sx in (-1, 1):
        side = [p for p in ev if (p.x - head.x) * sx > 0]
        c = sum(side, Vector()) / len(side)
        c.y = front_y - 0.018
        ring = [c + Vector((math.cos(2 * math.pi * k / 24) * 0.02, 0, math.sin(2 * math.pi * k / 24) * 0.018)) for k in range(25)]
        ring0 = ring0 or ring
        rim = tube('glass_rim%d' % sx, ring, [0.0016] * len(ring), 6, gm, cap=False)
        bind_rigid(rim, rig, 'head')
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in ring[:-1]]
        bm.faces.new(vs)
        me = bpy.data.meshes.new('lens%d' % sx)
        bm.to_mesh(me)
        bm.free()
        lo = add_obj('lens%d' % sx, me, lens)
        bind_rigid(lo, rig, 'head')
        arm = tube('temple%d' % sx, [c + Vector((sx * 0.02, 0, 0.002)), c + Vector((sx * 0.055, 0.04, 0.006)), c + Vector((sx * 0.068, 0.095, -0.012))], [0.0014] * 3, 6, gm)
        bind_rigid(arm, rig, 'head')
    bridge = tube('bridge', [Vector((head.x - 0.013, ring0[0].y, ring0[0].z + 0.006)), Vector((head.x, ring0[0].y - 0.004, ring0[0].z + 0.01)), Vector((head.x + 0.013, ring0[0].y, ring0[0].z + 0.006))], [0.0015] * 3, 6, gm)
    bind_rigid(bridge, rig, 'head')


# ------------------------------------------------------------------ face units

def add_face_units(body):
    """load ARKit face units as shape keys on the basemesh (after phenotype has been baked)"""
    if body.data.shape_keys is None:
        body.shape_key_add(name='Basis', from_mix=False)
    for fu in FACE_UNITS:
        p = os.path.join(FACEUNITS, fu + '.target')
        if not os.path.exists(p):
            print('missing face unit', fu)
            continue
        TargetService.load_target(body, p, weight=0.0, name=fu)


def transfer_face_units(obj, body, anchors=None, k=4, max_dist=0.03):
    """give an accessory mesh the body's face-unit shape keys (nearest-vertex delta transfer).
    anchors: optional per-vertex world positions to look up instead of the vertex itself (beard cards follow their root)."""
    from mathutils import kdtree
    keys = body.data.shape_keys
    if keys is None:
        return
    kb = keys.key_blocks
    units = [b for b in kb if b.name in FACE_UNITS]
    if not units:
        return
    mwb = body.matrix_world
    basis = kb[0]
    tree = kdtree.KDTree(len(basis.data))
    for i, d in enumerate(basis.data):
        tree.insert(mwb @ d.co, i)
    tree.balance()
    mwo = obj.matrix_world
    pts = anchors if anchors is not None else [mwo @ v.co for v in obj.data.vertices]
    near = []
    for p in pts:
        hits = tree.find_n(p, k)
        ws = [(i, 1.0 / max(d, 1e-4)) for (_, i, d) in hits if d < max_dist]
        tot = sum(w for _, w in ws)
        near.append([(i, w / tot) for i, w in ws] if tot > 0 else [])
    if not any(near):
        return
    if obj.data.shape_keys is None:
        obj.shape_key_add(name='Basis', from_mix=False)
    inv = mwo.inverted().to_3x3()
    m3 = mwb.to_3x3()
    for u in units:
        deltas = []
        nonzero = False
        for lst in near:
            d = Vector()
            for i, w in lst:
                d += (u.data[i].co - basis.data[i].co) * w
            d = inv @ (m3 @ d)
            if d.length > 1e-6:
                nonzero = True
            deltas.append(d)
        if not nonzero:
            continue
        sk = obj.shape_key_add(name=u.name, from_mix=False)
        for v, d in zip(sk.data, deltas):
            v.co = v.co + d


def bake_rest_expression(body, expr):
    """bake a habitual expression (e.g. Grumpy's scowl, Sleepy's droopy lids) into the base shape"""
    if not expr or body.data.shape_keys is None:
        return
    kb = body.data.shape_keys.key_blocks
    basis = kb[0]
    deltas = [Vector() for _ in basis.data]
    for name, w in expr.items():
        if name not in kb:
            continue
        k = kb[name]
        for i, (a, b) in enumerate(zip(k.data, basis.data)):
            deltas[i] += (a.co - b.co) * w
    for k in kb:
        for i, d in enumerate(deltas):
            k.data[i].co += d
    for i, d in enumerate(deltas):
        body.data.vertices[i].co += d


def dwarf_proportions(rig, body, d):
    """Shorten legs/arms, enlarge head in pose space, then apply as the new rest pose (true dwarf proportions)."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    pb = rig.pose.bones
    for b in ('thigh_l', 'thigh_r', 'calf_l', 'calf_r'):
        pb[b].scale = (1.0 + (1 - d['leg']) * 0.35, d['leg'], 1.0 + (1 - d['leg']) * 0.35)
    for b in ('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'):
        pb[b].scale = (1.0 + (1 - d['arm']) * 0.4, d['arm'], 1.0 + (1 - d['arm']) * 0.4)
    for b in ('hand_l', 'hand_r'):
        pb[b].scale = (1.22, 1.08, 1.22)
    for b in ('foot_l', 'foot_r'):
        pb[b].scale = (1.18, 1.1, 1.18)
    pb['spine_02'].scale = (1.06, d['torso'], 1.06)
    pb['neck_01'].scale = (1.1, 0.7, 1.1)
    pb['head'].scale = (d['head'], d['head'], d['head'])
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT')
    # bake the posed (scaled) mesh for every skinned child, then apply pose as rest
    for o in [c for c in rig.children if c.type == 'MESH']:
        bake_armature_into_mesh(o, rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    # restore armature modifiers
    for o in [c for c in rig.children if c.type == 'MESH']:
        if not any(m.type == 'ARMATURE' for m in o.modifiers):
            m = o.modifiers.new('Armature', 'ARMATURE')
            m.object = rig
    # put feet back on the ground
    lowest = min((o.matrix_world @ v.co).z for o in rig.children if o.type == 'MESH' for v in o.data.vertices)
    rig.location.z -= lowest
    bpy.context.view_layer.update()


def bake_armature_into_mesh(o, rig):
    """apply the armature deformation into the mesh, including all shape keys (keeps morph targets)."""
    deps = bpy.context.evaluated_depsgraph_get()
    has_keys = o.data.shape_keys is not None and len(o.data.shape_keys.key_blocks) > 1
    arm = [m for m in o.modifiers if m.type == 'ARMATURE']
    if not arm:
        return
    if not has_keys:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=arm[0].name)
        return
    # per shape key: evaluate deformed positions with only that key at 1
    kb = o.data.shape_keys.key_blocks
    saved = {k.name: k.value for k in kb}
    results = {}
    for k in kb:
        for kk in kb:
            kk.value = 0.0
        if k.name != kb[0].name:
            k.value = 1.0
        bpy.context.view_layer.update()
        deps = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        results[k.name] = [v.co.copy() for v in me.vertices]
        ev.to_mesh_clear()
    o.modifiers.remove(arm[0])
    for k in kb:
        for v, c in zip(k.data, results[k.name]):
            v.co = c
        k.value = saved[k.name]
    base = results[kb[0].name]
    for v, c in zip(o.data.vertices, base):
        v.co = c


# ------------------------------------------------------------------ build

def build(cid):
    spec = CHARS[cid]
    clear_scene()
    hi = HumanService._create_default_human_info_dict()
    phen = hi['phenotype']
    for k, v in spec['phen'].items():
        phen[k] = v
    hi.update(dict(name=cid, rig='game_engine', eyes='high-poly.mhclo', eyebrows=spec['brows'], eyelashes=spec.get('lashes', 'eyelashes02.mhclo'),
                   teeth='teeth_base.mhclo', hair=spec['hair'], skin_mhmat=spec['skin'], skin_material_type='MAKESKIN', targets=spec['targets'],
                   clothes=spec.get('clothes', [])))
    s = HumanService.get_default_deserialization_settings()
    s['subdiv_levels'] = 0
    body = HumanService.deserialize_from_dict(hi, s)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name in ('Cube',):
            bpy.data.objects.remove(o)
    rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    rig.name = cid + '_rig'
    garments = {}
    for o in rig.children:
        for c in spec.get('clothes', []):
            if o.name.endswith(c.replace('.mhclo', '')):
                garments[c.replace('.mhclo', '')] = o
    # bake phenotype, then remove helpers and body parts hidden by garments
    apply_shape(body)
    for m in list(body.modifiers):
        if m.type == 'MASK':
            body.modifiers.remove(m)
    keep_arms = spec['costume'] == 'princess'
    el_z = bone_head(rig, 'lowerarm_l').z
    sh_z = bone_head(rig, 'upperarm_l').z
    arm_x = abs(bone_head(rig, 'upperarm_l').x)
    bm = bmesh.new()
    bm.from_mesh(body.data)
    deform = bm.verts.layers.deform.active
    gidx = {g.name: g.index for g in body.vertex_groups}
    dels = [gidx[g] for g in gidx if g.startswith('Delete.')]
    mw = body.matrix_world
    kill = []
    for v in bm.verts:
        dv = v[deform]
        if gidx['body'] not in dv:
            kill.append(v)
            continue
        if any(d in dv for d in dels):
            co = mw @ v.co
            if keep_arms and abs(co.x) > arm_x + 0.02 and co.z < el_z + (sh_z - el_z) * 0.5:
                continue
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(body.data)
    bm.free()
    add_face_units(body)
    for o in list(rig.children):
        if o.type == 'MESH' and any(x in o.name for x in ('eyebrow', 'eyelashes', 'teeth', 'tongue')):
            transfer_face_units(o, body, max_dist=0.03 if 'teeth' not in o.name else 0.05)
    bake_rest_expression(body, spec.get('rest_expr'))
    for o in list(rig.children):
        if o.type == 'MESH' and any(x in o.name for x in ('eyebrow', 'eyelashes', 'teeth', 'tongue')):
            bake_rest_expression(o, spec.get('rest_expr'))
    # hair & brow colour
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        if any(x in o.name for x in (spec['hair'].replace('.mhclo', ''), spec['brows'].replace('.mhclo', ''))):
            for mat in o.data.materials:
                tint_material(mat, spec['hair_color'])
    if spec['costume'] != 'princess':
        for o in list(rig.children):
            if o.type == 'MESH' and spec['hair'].replace('.mhclo', '') in o.name:
                trim_dwarf_hair(o, rig)
    if spec.get('mirror_hair'):
        hair = [o for o in rig.children if spec['hair'].replace('.mhclo', '') in o.name][0]
        mirror_hair(hair, rig)
    if spec.get('tuck_fringe'):
        hair = [o for o in rig.children if spec['hair'].replace('.mhclo', '') in o.name][0]
        tuck_fringe(hair, rig)
    if spec['costume'] == 'princess':
        princess_costume(body, rig, spec, garments)
    else:
        dwarf_costume(body, rig, spec, cid, garments)
        dwarf_proportions(rig, body, spec['dwarf'])
    tweak_skin(body, spec)
    paint_face_tint(body, spec)
    name_parts(rig, cid)
    if PREVIEW:
        render_preview(cid, rig)
    if not NO_EXPORT:
        export(cid, rig)


def trim_dwarf_hair(hair, rig):
    """dwarf hair only shows below the hat brim at the sides/back (no fringe over the face)"""
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    ev = [eyes_obj.matrix_world @ v.co for v in eyes_obj.data.vertices]
    eye_z = sum(p.z for p in ev) / len(ev)
    front = min(p.y for p in ev)
    head = bone_head(rig, 'head')
    delete_faces(hair, lambda c: c.y < front + 0.035 or c.z > eye_z + 0.07)
    # flare the remaining side/back hair slightly so it shows under the brim
    for v in hair.data.vertices:
        c = v.co
        r = math.hypot(c.x - head.x, c.y - head.y)
        if r > 1e-4:
            k = 1.08
            c.x = head.x + (c.x - head.x) * k
            c.y = head.y + (c.y - head.y) * k


def tuck_fringe(hair, rig):
    """Shorten the side-swept fringe so it sweeps above the brow instead of covering an eye."""
    head = bone_head(rig, 'head')
    top = bone_tail(rig, 'head').z
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    ez = sum((eyes_obj.matrix_world @ v.co).z for v in eyes_obj.data.vertices) / len(eyes_obj.data.vertices)
    brow_z = ez + 0.022
    front_y = min((eyes_obj.matrix_world @ v.co).y for v in eyes_obj.data.vertices)
    for v in hair.data.vertices:
        c = v.co
        dx = c.x - head.x
        if c.y < front_y + 0.03 and abs(dx) < 0.07 and c.z < brow_z + 0.012:
            # fold strand up to the brow line and sweep it toward the side
            lift = brow_z + 0.012 - c.z
            c.z = brow_z + 0.012 + lift * 0.18
            c.x += math.copysign(lift * 0.9, dx if abs(dx) > 1e-3 else 1.0) * (1 - abs(dx) / 0.07)
            c.y -= 0.004


def mirror_hair(hair, rig):
    """make the side-swept bob symmetric: keep the +X half and mirror it (curtain fringe, both eyes visible)"""
    head = bone_head(rig, 'head')
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(head.x, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
    bm.to_mesh(hair.data)
    bm.free()
    m = hair.modifiers.new('mirror', 'MIRROR')
    m.use_axis[0] = True
    m.use_bisect_axis[0] = False
    m.use_mirror_vertex_groups = True
    m.use_clip = False
    m.mirror_object = None
    bpy.context.view_layer.objects.active = hair
    hair.modifiers.move(len(hair.modifiers) - 1, 0)
    bpy.ops.object.modifier_apply(modifier='mirror')
    # widen the parting slightly so the fringe frames the face
    top = bone_tail(rig, 'head').z
    for v in hair.data.vertices:
        rel_y = v.co.y - head.y
        dx = v.co.x - head.x
        # lift the fringe above the brows and sweep it to the sides (a curtain parting)
        if rel_y < -0.045 and v.co.z < top - 0.035:
            k = max(0.0, 1 - abs(dx) / 0.075)
            v.co.z += 0.03 * k
            v.co.x += math.copysign(0.03 * k, dx + 1e-6)
            v.co.y += 0.006 * k


def tint_material(mat, color):
    if not mat or not mat.use_nodes:
        return
    nt = mat.node_tree
    p = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    imgs = [n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image and 'normal' not in n.image.name.lower()]
    if not imgs:
        p.inputs['Base Color'].default_value = (*[c ** 2.2 for c in color], 1)
        return
    src = imgs[0]
    src.image = tinted_image(src.image, color, mat.name.replace(':', '_').replace('.', '_') + '_tint')
    for l in list(p.inputs['Base Color'].links):
        nt.links.remove(l)
    nt.links.new(src.outputs['Color'], p.inputs['Base Color'])
    if not p.inputs['Alpha'].links:
        nt.links.new(src.outputs['Alpha'], p.inputs['Alpha'])
    p.inputs['Roughness'].default_value = 0.6

def paint_face_tint(body, spec):
    """vertex-colour face tints (red nose for Sneezy, blush for Bashful) multiplied into the skin shader"""
    want = []
    if spec.get('red_nose'):
        want.append(('nose', spec['red_nose']))
    if spec.get('blush'):
        want.append(('cheeks', spec['blush']))
    if not want:
        return
    rig = body.parent
    head = bone_head(rig, 'head')
    eyes_obj = [o for o in bpy.data.objects if o.type == 'MESH' and 'high-poly' in o.name][0]
    eye_z = sum((eyes_obj.matrix_world @ v.co).z for v in eyes_obj.data.vertices) / len(eyes_obj.data.vertices)
    front = min((eyes_obj.matrix_world @ v.co).y for v in eyes_obj.data.vertices)
    col = body.data.color_attributes.new('tint', 'FLOAT_COLOR', 'POINT')
    mw = body.matrix_world
    for i, v in enumerate(body.data.vertices):
        c = mw @ v.co
        r = g = b = 1.0
        for kind, amt in want:
            if kind == 'nose':
                d = math.hypot((c.x - head.x) / 0.03, (c.z - (eye_z - 0.045)) / 0.032)
                if c.y < front - 0.01:
                    k = max(0.0, 1 - d) * amt
                    g *= 1 - 0.6 * k
                    b *= 1 - 0.6 * k
            else:
                for sx in (-1, 1):
                    d = math.hypot((c.x - head.x - sx * 0.042) / 0.025, (c.z - (eye_z - 0.04)) / 0.02)
                    k = max(0.0, 1 - d) ** 1.5 * amt
                    g *= 1 - 0.35 * k
                    b *= 1 - 0.3 * k
        col.data[i].color = (r, g, b, 1)
    for mat in body.data.materials:
        nt = mat.node_tree
        p = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'tint'
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        if p.inputs['Base Color'].links:
            nt.links.new(p.inputs['Base Color'].links[0].from_socket, mix.inputs['A'])
        nt.links.new(attr.outputs['Color'], mix.inputs['B'])
        nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])


def tweak_skin(body, spec):
    """warm up skin, add cheek blush / red nose (vertex-colour free: tweak material)"""
    for mat in body.data.materials:
        if not mat.use_nodes:
            continue
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Roughness'].default_value = 0.48
                if 'Subsurface Weight' in n.inputs:
                    n.inputs['Subsurface Weight'].default_value = 0.12
                    n.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.2)
                    n.inputs['Subsurface Scale'].default_value = 0.01


def name_parts(rig, cid):
    for o in rig.children:
        if o.type == 'MESH':
            for m in o.data.materials:
                if m and not m.name.startswith(cid + ':'):
                    m.name = cid + ':' + m.name


def export(cid, rig):
    # downscale large textures (4K skin maps) to 1K/2K: plenty for 1080p and keeps each GLB small
    for img in bpy.data.images:
        if img.size[0] > 1024 and img.source == 'FILE':
            lim = 2048 if img.size[0] >= 4096 else 1024
            if img.size[0] > lim:
                f = lim / img.size[0]
                img.scale(int(img.size[0] * f), int(img.size[1] * f))
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in rig.children_recursive:
        o.select_set(True)
    path = os.path.join(OUT, cid + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=False,
        export_skins=True, export_morph=True, export_morph_normal=False, export_animations=False,
        export_image_format='JPEG', export_jpeg_quality=85, export_yup=True,
        export_texcoords=True, export_normals=True, export_tangents=False,
    )
    print('EXPORTED', path, os.path.getsize(path) // 1024, 'KB')


def render_preview(cid, rig):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = 1280, 1280
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    hdr = os.path.join(ROOT, 'public', 'assets', 'hdri', 'monbachtal_riverbank.hdr')
    if os.path.exists(hdr):
        env = w.node_tree.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(hdr)
        w.node_tree.links.new(env.outputs['Color'], bg.inputs['Color'])
        bg.inputs['Strength'].default_value = 1.0
    lowest = 0
    top = max((o.matrix_world @ v.co).z for o in rig.children if o.type == 'MESH' for v in o.data.vertices)
    head = rig.matrix_world @ rig.data.bones['head'].head_local
    for name, target, dist, lens in (('full', Vector((0, 0, top * 0.52)), top * 2.2 + 0.6, 50), ('face', head + Vector((0, 0, 0.03)), 1.15, 85)):
        cam_d = bpy.data.cameras.new('c')
        cam_d.lens = lens
        cam = bpy.data.objects.new('cam', cam_d)
        sc.collection.objects.link(cam)
        cam.location = target + Vector((0.18 * dist / 2, -dist, 0.04))
        d = target - cam.location
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        key = bpy.data.lights.new('key', 'AREA')
        key.energy = 120
        key.size = 1.5
        ko = bpy.data.objects.new('key', key)
        sc.collection.objects.link(ko)
        ko.location = target + Vector((-1.2, -1.4, 1.2))
        ko.rotation_euler = (target - ko.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(PREV, f'{cid}_{name}.png')
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam)
        bpy.data.objects.remove(ko)


for cid in (IDS or list(CHARS.keys())):
    print('=== building', cid)
    build(cid)
