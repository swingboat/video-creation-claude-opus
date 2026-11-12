import bpy, os, addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True, persistent=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
hi = HumanService._create_default_human_info_dict()
hi.update({"name":"probe","rig":"cmu_mb","eyes":"high-poly.mhclo","eyebrows":"eyebrow006.mhclo","eyelashes":"eyelashes02.mhclo","teeth":"teeth_base.mhclo","hair":"bob02.mhclo","skin_mhmat":"young_caucasian_female.mhmat","skin_material_type":"MAKESKIN"})
hi["phenotype"]["gender"]=0.0
s = HumanService.get_default_deserialization_settings(); s["subdiv_levels"]=0
bm = HumanService.deserialize_from_dict(hi, s)
for o in bpy.data.objects: print("OBJ", o.name, o.type, len(o.data.vertices) if o.type=='MESH' else '', [m.type for m in o.modifiers])
rig=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
print("BONES", len(rig.data.bones), [b.name for b in rig.data.bones])
print("VGROUPS", [g.name for g in bm.vertex_groups if g.name not in rig.data.bones][:80])
print("SHAPEKEYS", len(bm.data.shape_keys.key_blocks) if bm.data.shape_keys else 0)
print("MATS", [(o.name,[m.name for m in o.data.materials]) for o in bpy.data.objects if o.type=='MESH'])
import mathutils
for b in ["Hips","Head","LeftUpLeg","LeftLeg","LeftFoot","LeftArm","LeftForeArm","LeftHand"]:
    bb=rig.data.bones.get(b)
    if bb: print(b, tuple(round(x,3) for x in (rig.matrix_world@bb.head_local)), tuple(round(x,3) for x in (rig.matrix_world@bb.tail_local)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(".cache/tmp/probe.blend"))
