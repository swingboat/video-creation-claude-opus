"""
Build a white-tailed deer fawn (~0.55 m at the shoulder) as a rigged GLB.

  BLENDER_USER_RESOURCES=$PWD/.cache/blender blender -b --factory-startup --python assets-src/blender/build_fawn.py [-- --preview]

Body: skin-modifier skeleton -> subdivision -> smoothing, anatomical proportions (long legs, deep chest,
narrow muzzle, large ears).  Armature with the same joints, automatic weights.  Coat colour is painted as
vertex colours (rufous back, cream belly, white throat patch & spots, dark muzzle tip); fur is added at
runtime with shells.  Exported to public/models/fawn.glb (model faces +Z in glTF, i.e. -Y in Blender).
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'models', 'fawn.glb')
PREVIEW = '--preview' in sys.argv

bpy.ops.wm.read_factory_settings(use_empty=True)

# Blender: -Y is forward (head), +Z up. Units metres.
# joint name -> (position, skin radius x, radius y)
J = {
    'root':      ((0, 0.17, 0.51), 0.075, 0.09),   # pelvis/rump
    'spine1':    ((0, 0.06, 0.52), 0.08, 0.10),
    'spine2':    ((0, -0.06, 0.53), 0.085, 0.11),
    'chest':     ((0, -0.16, 0.52), 0.08, 0.115),  # deep chest
    'neck1':     ((0, -0.23, 0.60), 0.045, 0.055),
    'neck2':     ((0, -0.28, 0.70), 0.038, 0.045),
    'head':      ((0, -0.32, 0.77), 0.048, 0.052),
    'muzzle':    ((0, -0.41, 0.735), 0.03, 0.034),
    'nose':      ((0, -0.465, 0.715), 0.02, 0.022),
    'tail1':     ((0, 0.27, 0.53), 0.025, 0.02),
    'tail2':     ((0, 0.32, 0.49), 0.02, 0.012),
}
LEGS = {
    # name: hip, knee/elbow, hock/fetlock, hoof ; front legs bend backward at the "knee" (carpus)
    'fl': [(-0.045, -0.16, 0.45), (-0.045, -0.15, 0.29), (-0.045, -0.155, 0.10), (-0.045, -0.165, 0.012)],
    'fr': [(0.045, -0.16, 0.45), (0.045, -0.15, 0.29), (0.045, -0.155, 0.10), (0.045, -0.165, 0.012)],
    'bl': [(-0.05, 0.16, 0.46), (-0.05, 0.11, 0.31), (-0.048, 0.19, 0.14), (-0.048, 0.18, 0.012)],
    'br': [(0.05, 0.16, 0.46), (0.05, 0.11, 0.31), (0.048, 0.19, 0.14), (0.048, 0.18, 0.012)],
}
LEG_R = [(0.038, 0.05), (0.02, 0.024), (0.012, 0.013), (0.011, 0.013)]


def v(p):
    return Vector(p)


# ---------------------------------------------------------------- body mesh via skin modifier
bm = bmesh.new()
verts = {}
for name, (p, rx, ry) in J.items():
    verts[name] = bm.verts.new(v(p))
for leg, pts in LEGS.items():
    for i, p in enumerate(pts):
        verts[f'{leg}{i}'] = bm.verts.new(v(p))
chain = ['nose', 'muzzle', 'head', 'neck2', 'neck1', 'chest', 'spine2', 'spine1', 'root', 'tail1', 'tail2']
for a, b in zip(chain[:-1], chain[1:]):
    bm.edges.new((verts[a], verts[b]))
for leg in LEGS:
    attach = 'chest' if leg[0] == 'f' else 'root'
    bm.edges.new((verts[attach], verts[f'{leg}0']))
    for i in range(3):
        bm.edges.new((verts[f'{leg}{i}'], verts[f'{leg}{i + 1}']))
me = bpy.data.meshes.new('fawn_body')
bm.to_mesh(me)
bm.free()
body = bpy.data.objects.new('fawn_body', me)
bpy.context.collection.objects.link(body)
skin = body.modifiers.new('skin', 'SKIN')
skin.use_smooth_shade = True
skin.branch_smoothing = 0.6
sv = me.skin_vertices[0].data
names = list(J.keys()) + [f'{leg}{i}' for leg in LEGS for i in range(4)]
for i, n in enumerate(names):
    if n in J:
        _, rx, ry = J[n]
        sv[i].radius = (rx, ry)
    else:
        rx, ry = LEG_R[int(n[2])]
        sv[i].radius = (rx, ry)
    if n == 'root':
        sv[i].use_root = True
sub = body.modifiers.new('sub', 'SUBSURF')
sub.levels = 3
sub.render_levels = 3
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier='skin')
bpy.ops.object.modifier_apply(modifier='sub')

# sculpt-like shaping on the resulting mesh
mw = body.matrix_world
for vt in body.data.vertices:
    c = vt.co
    # belly tuck behind the chest, rounded haunches, narrow muzzle, cheek width
    if c.y > 0.08 and c.z > 0.44 and abs(c.x) > 0.04:
        c.x *= 1.08  # haunches
    if c.y < -0.37:
        c.x *= 0.8  # narrow muzzle
    if -0.12 < c.y < 0.1 and c.z < 0.47:
        c.z += 0.012  # belly tuck
    if -0.36 < c.y < -0.29 and c.z > 0.73:  # forehead dome
        c.z += 0.008
v_count = len(body.data.vertices)

# ---------------------------------------------------------------- ears, eyes (separate meshes, weighted to head)
def ear(sx):
    bm = bmesh.new()
    prof = [(0.008, 0.0), (0.03, 0.025), (0.04, 0.065), (0.034, 0.105), (0.018, 0.13), (0.0, 0.14)]
    rows = []
    for (w, h) in prof:
        row = []
        for k in range(9):
            a = math.pi * k / 8
            x = math.cos(a) * w
            y = -math.sin(a) * w * 0.45  # cupped
            row.append(bm.verts.new((x, y, h)))
        rows.append(row)
    for r0, r1 in zip(rows[:-1], rows[1:]):
        for k in range(8):
            bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    me = bpy.data.meshes.new('ear')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('fawn_ear_' + ('l' if sx > 0 else 'r'), me)
    bpy.context.collection.objects.link(o)
    s = o.modifiers.new('s', 'SOLIDIFY')
    s.thickness = 0.004
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='s')
    o.location = (sx * 0.035, -0.30, 0.805)
    o.rotation_euler = (math.radians(-10), math.radians(sx * 55), math.radians(sx * 25))
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


ears = [ear(1), ear(-1)]
eyes = []
for sx in (1, -1):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, segments=24, ring_count=16, location=(sx * 0.038, -0.355, 0.785))
    e = bpy.context.object
    e.name = 'fawn_eye_' + ('l' if sx > 0 else 'r')
    e.scale = (0.55, 1.05, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    eyes.append(e)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.013, segments=20, ring_count=12, location=(0, -0.482, 0.718))
nose = bpy.context.object
nose.name = 'fawn_nose'
nose.scale = (1.15, 0.7, 0.8)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()

# ---------------------------------------------------------------- armature
arm = bpy.data.armatures.new('fawn_arm')
rig = bpy.data.objects.new('fawn_rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.edit_bones


def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head = v(head)
    b.tail = v(tail)
    if parent:
        b.parent = eb[parent]
        b.use_connect = connect
    return b


P = {k: J[k][0] for k in J}
bone('root', P['root'], P['spine1'])
bone('spine1', P['spine1'], P['spine2'], 'root', True)
bone('spine2', P['spine2'], P['chest'], 'spine1', True)
bone('neck1', P['chest'], P['neck1'], 'spine2', True)
bone('neck2', P['neck1'], P['neck2'], 'neck1', True)
bone('head', P['neck2'], P['head'], 'neck2', True)
bone('muzzle', P['head'], P['nose'], 'head', True)
bone('tail1', P['root'], P['tail1'], 'root')
bone('tail2', P['tail1'], P['tail2'], 'tail1', True)
bone('ear_l', (0.035, -0.30, 0.805), (0.09, -0.30, 0.87), 'head')
bone('ear_r', (-0.035, -0.30, 0.805), (-0.09, -0.30, 0.87), 'head')
for leg, pts in LEGS.items():
    par = 'spine2' if leg[0] == 'f' else 'root'
    bone(f'{leg}_upper', pts[0], pts[1], par)
    bone(f'{leg}_lower', pts[1], pts[2], f'{leg}_upper', True)
    bone(f'{leg}_foot', pts[2], pts[3], f'{leg}_lower', True)
bpy.ops.object.mode_set(mode='OBJECT')

# parent with automatic weights
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')


def rigid(o, bname):
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name=bname)
    g.add([vv.index for vv in o.data.vertices], 1.0, 'REPLACE')
    m = o.modifiers.new('Armature', 'ARMATURE')
    m.object = rig
    o.parent = rig


rigid(ears[0], 'ear_l')
rigid(ears[1], 'ear_r')
for e in eyes:
    rigid(e, 'head')
rigid(nose, 'muzzle')

# ---------------------------------------------------------------- coat colours (vertex colours; spots seeded)
rnd = random.Random(2026)
spots = []
for side in (1, -1):
    for row, (x0, z0) in enumerate([(0.03, 0.605), (0.055, 0.59), (0.072, 0.56), (0.082, 0.525)]):
        y = -0.14
        while y < 0.2:
            spots.append(Vector((side * (x0 + rnd.uniform(-0.01, 0.01)), y + rnd.uniform(-0.01, 0.01), z0 + rnd.uniform(-0.01, 0.01))))
            y += rnd.uniform(0.028, 0.045)
for k in range(6):
    spots.append(Vector((rnd.uniform(-0.02, 0.02), -0.12 + k * 0.06, 0.62)))


def srgb2lin(c):
    return tuple(x ** 2.2 for x in c)


RUFOUS = srgb2lin((0.62, 0.36, 0.18))
DARK = srgb2lin((0.38, 0.22, 0.12))
CREAM = srgb2lin((0.90, 0.84, 0.72))
WHITE = srgb2lin((0.95, 0.93, 0.88))
MUZZLE = srgb2lin((0.25, 0.17, 0.12))
col = body.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for vt in body.data.vertices:
    c = vt.co
    n = vt.normal
    r = list(RUFOUS)
    # darker along the dorsal line and on the lower legs
    dorsal = max(0.0, n.z) * (1 if c.z > 0.45 else 0)
    r = [a * (1 - 0.25 * dorsal) + b * 0.25 * dorsal for a, b in zip(r, DARK)]
    belly = max(0.0, -n.z) ** 0.7 * (1 if 0.38 < c.z < 0.6 and abs(c.y) < 0.2 else 0)
    r = [a * (1 - belly) + b * belly for a, b in zip(r, CREAM)]
    if c.z < 0.03:
        r = list(srgb2lin((0.12, 0.09, 0.07)))
    elif c.z < 0.3:  # inner legs lighter
        inner = max(0.0, -n.x * (1 if c.x > 0 else -1))
        r = [a * (1 - 0.4 * inner) + b * 0.4 * inner for a, b in zip(r, CREAM)]
    if -0.33 < c.y < -0.24 and 0.6 < c.z < 0.72 and n.y < 0.2 and n.z < 0.3 and abs(c.x) < 0.03:  # white throat patch
        r = list(WHITE)
    if c.y < -0.44:  # dark muzzle tip
        r = list(MUZZLE)
    if c.y < -0.38 and c.z < 0.725 and n.z < -0.3:  # white chin
        r = list(WHITE)
    for s in spots:
        dd = (c - s).length
        if dd < 0.012:
            k = 1.0 if dd < 0.008 else (0.012 - dd) / 0.004
            r = [a * (1 - k) + b * k for a, b in zip(r, WHITE)]
    if c.y > 0.28 and n.y > 0.2:  # white under-tail
        r = list(WHITE)
    col.data[vt.index].color = (*r, 1.0)


def solid_mat(name, color, rough, metal=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*srgb2lin(color), 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m


coat = bpy.data.materials.new('fawn_coat')
coat.use_nodes = True
nt = coat.node_tree
pb = nt.nodes['Principled BSDF']
attr = nt.nodes.new('ShaderNodeVertexColor')
attr.layer_name = 'Col'
nt.links.new(attr.outputs['Color'], pb.inputs['Base Color'])
pb.inputs['Roughness'].default_value = 0.85
body.data.materials.append(coat)
for e in ears:
    em = bpy.data.materials.new('fawn_ear')
    em.use_nodes = True
    pp = em.node_tree.nodes['Principled BSDF']
    pp.inputs['Base Color'].default_value = (*srgb2lin((0.56, 0.36, 0.24)), 1)
    pp.inputs['Roughness'].default_value = 0.8
    e.data.materials.append(em)
for e in eyes:
    e.data.materials.append(solid_mat('fawn_eye', (0.03, 0.02, 0.015), 0.05))
nose.data.materials.append(solid_mat('fawn_nose', (0.04, 0.03, 0.03), 0.25))
for p in body.data.polygons:
    p.use_smooth = True

print('FAWN verts', v_count, 'bones', len(arm.bones))

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = 900
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.55, 0.6, 1)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('c'))
    sc.collection.objects.link(cam)
    cam.location = (1.1, -1.2, 0.7)
    cam.rotation_euler = (Vector((0, -0.05, 0.42)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    l = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sc.collection.objects.link(l)
    l.rotation_euler = (0.8, 0.2, 0.6)
    sc.render.filepath = os.path.join(ROOT, 'checks', 'characters', 'fawn_preview.png')
    bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for o in rig.children:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=False, export_yup=True, export_vertex_color='ACTIVE', export_all_vertex_colors=True)
print('EXPORTED', OUT, os.path.getsize(OUT) // 1024, 'KB')
