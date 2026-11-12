"""Cel-shading material group, material factory and inverted-hull outlines (EEVEE)."""
import bpy

from common import hexcol

SHADOW_TINT = (0.62, 0.58, 0.74)
OUTLINE_COL = "#1a1418"
_group = None


def _sock(ng, name, kind, io="INPUT", default=None):
    s = ng.interface.new_socket(name=name, in_out=io, socket_type=kind)
    if default is not None:
        s.default_value = default
    return s


def toon_group():
    """Group: Color, Shadow, Rim, Gloss -> Shader. Hard two-tone light with thin rim."""
    global _group
    if _group:
        return _group
    ng = bpy.data.node_groups.new("Toon", "ShaderNodeTree")
    _sock(ng, "Color", "NodeSocketColor", default=(0.8, 0.8, 0.8, 1))
    _sock(ng, "Shadow", "NodeSocketColor", default=(0.5, 0.5, 0.6, 1))
    _sock(ng, "Rim", "NodeSocketFloat", default=0.25)
    _sock(ng, "Gloss", "NodeSocketFloat", default=0.0)
    _sock(ng, "Shader", "NodeSocketShader", io="OUTPUT")
    n, l = ng.nodes, ng.links
    gi, go = n.new("NodeGroupInput"), n.new("NodeGroupOutput")
    dif = n.new("ShaderNodeBsdfDiffuse")
    s2r = n.new("ShaderNodeShaderToRGB")
    l.new(dif.outputs[0], s2r.inputs[0])
    bw = n.new("ShaderNodeRGBToBW")
    l.new(s2r.outputs["Color"], bw.inputs[0])
    lit = n.new("ShaderNodeMapRange")
    lit.inputs["From Min"].default_value = 0.40
    lit.inputs["From Max"].default_value = 0.44
    l.new(bw.outputs[0], lit.inputs["Value"])
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    l.new(lit.outputs["Result"], mix.inputs["Factor"])
    l.new(gi.outputs["Shadow"], mix.inputs[6])
    l.new(gi.outputs["Color"], mix.inputs[7])
    # rim: thin bright edge only on lit side
    lw = n.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    rim = n.new("ShaderNodeMapRange")
    rim.inputs["From Min"].default_value = 0.74
    rim.inputs["From Max"].default_value = 0.78
    l.new(lw.outputs["Facing"], rim.inputs["Value"])
    r1 = n.new("ShaderNodeMath")
    r1.operation = "MULTIPLY"
    l.new(rim.outputs["Result"], r1.inputs[0])
    l.new(gi.outputs["Rim"], r1.inputs[1])
    r2 = n.new("ShaderNodeMath")
    r2.operation = "MULTIPLY"
    l.new(r1.outputs[0], r2.inputs[0])
    l.new(lit.outputs["Result"], r2.inputs[1])
    add = n.new("ShaderNodeMix")
    add.data_type = "RGBA"
    add.blend_type = "SCREEN"
    l.new(r2.outputs[0], add.inputs["Factor"])
    l.new(mix.outputs[2], add.inputs[6])
    add.inputs[7].default_value = (1, 0.97, 0.9, 1)
    # third tone: direct sun patches read as a warm highlight band
    hi = n.new("ShaderNodeMapRange")
    hi.inputs["From Min"].default_value = 1.6
    hi.inputs["From Max"].default_value = 1.7
    hi.inputs["To Max"].default_value = 0.28
    l.new(bw.outputs[0], hi.inputs["Value"])
    warm = n.new("ShaderNodeMix")
    warm.data_type = "RGBA"
    warm.blend_type = "SCREEN"
    l.new(hi.outputs["Result"], warm.inputs["Factor"])
    l.new(add.outputs[2], warm.inputs[6])
    warm.inputs[7].default_value = (1, 0.88, 0.62, 1)
    em = n.new("ShaderNodeEmission")
    l.new(warm.outputs[2], em.inputs["Color"])
    gl = n.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.18
    ms = n.new("ShaderNodeMixShader")
    l.new(gi.outputs["Gloss"], ms.inputs["Fac"])
    l.new(em.outputs[0], ms.inputs[1])
    l.new(gl.outputs[0], ms.inputs[2])
    l.new(ms.outputs[0], go.inputs["Shader"])
    _group = ng
    return ng


def _new_mat(name):
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        if nd.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(nd)
    return m, nt, nt.nodes.get("Material Output") or nt.nodes.new("ShaderNodeOutputMaterial")


def shadow_of(col):
    return tuple(col[i] * SHADOW_TINT[i] for i in range(3)) + (1.0,)


def tmat(name, color, shadow=None, rim=0.25, gloss=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m, nt, out = _new_mat(name)
    col = hexcol(color) if isinstance(color, str) else color
    sh = (hexcol(shadow) if isinstance(shadow, str) else shadow) if shadow else shadow_of(col)
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = toon_group()
    g.inputs["Color"].default_value = col
    g.inputs["Shadow"].default_value = sh
    g.inputs["Rim"].default_value = rim
    g.inputs["Gloss"].default_value = gloss
    nt.links.new(g.outputs["Shader"], out.inputs["Surface"])
    m.diffuse_color = col
    return m


def flat(name, color, strength=1.0):
    """Unlit flat colour (decals, sky, screens, outlines)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m, nt, out = _new_mat(name)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = hexcol(color) if isinstance(color, str) else color
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def outline_mat():
    m = bpy.data.materials.get("Outline")
    if m:
        return m
    m = flat("Outline", OUTLINE_COL)
    m.use_backface_culling = True
    if hasattr(m, "use_backface_culling_shadow"):
        m.use_backface_culling_shadow = True
    return m


def fix_normals(me):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()


def outline(ob, thickness=0.011):
    """Inverted hull: flipped solidify shell rendered with a back-face-culled dark material."""
    me = ob.data
    fix_normals(me)
    n = len(me.materials)
    me.materials.append(outline_mat())
    mod = ob.modifiers.new("Outline", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = n
    mod.use_even_offset = False
    mod.thickness_clamp = 0.6
    return mod
