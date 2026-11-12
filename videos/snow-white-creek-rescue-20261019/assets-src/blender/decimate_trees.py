"""Decimate the Poly Haven fir / pine (millions of tris) into light LODs for background instancing."""
import bpy, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
for tid, ratio in (('fir_tree_01', 0.012), ('pine_tree_01', 0.005)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = os.path.join(ROOT, '.cache', 'heavy', tid, tid + '.gltf')
    bpy.ops.import_scene.gltf(filepath=src)
    tris = 0
    for o in [o for o in bpy.data.objects if o.type == 'MESH']:
        m = o.modifiers.new('dec', 'DECIMATE')
        m.ratio = ratio
        m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier='dec')
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    for img in bpy.data.images:
        if img.size[0] > 1024:
            img.scale(1024, int(img.size[1] * 1024 / img.size[0]))
    out = os.path.join(ROOT, 'public', 'assets', 'models', tid + '_lod.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85)
    print('LOD', tid, tris, os.path.getsize(out) // 1024, 'KB')
