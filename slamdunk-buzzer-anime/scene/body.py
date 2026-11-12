"""Anime-proportioned skeleton (Armature) and one continuous skinned body mesh.

Unit skeleton is for a 1.87 m player; everything is multiplied by k = height / 1.87.
Character faces -Y, its left side is +X. Arms rest in a 10 degree A-pose.
"""
import math

import bpy
from mathutils import Vector
from mathutils.geometry import intersect_point_line

from common import mat

A = math.radians(10)
SH = Vector((0.20, 0, 1.47))
ARM_DIR = Vector((math.sin(A), 0, -math.cos(A)))


def _arm_pts(sx):
    s = Vector((SH.x * sx, 0, SH.z))
    d = Vector((ARM_DIR.x * sx, 0, ARM_DIR.z))
    return s, s + d * 0.31, s + d * 0.57, s + d * 0.73


def bones_def():
    """[(name, head, tail, parent)] in unit coordinates."""
    b = [("pelvis", (0, 0, 1.00), (0, 0, 1.06), None),
         ("spine", (0, 0, 1.06), (0, 0, 1.27), "pelvis"),
         ("chest", (0, 0, 1.27), (0, 0, 1.52), "spine"),
         ("neck", (0, 0, 1.52), (0, 0, 1.60), "chest"),
         ("head", (0, 0, 1.60), (0, 0, 1.86), "neck")]
    for side, sx in (("L", 1), ("R", -1)):
        s, e, w, t = _arm_pts(sx)
        b += [(f"upperarm_{side}", s, e, "chest"), (f"forearm_{side}", e, w, f"upperarm_{side}"),
              (f"hand_{side}", w, t, f"forearm_{side}"),
              (f"thigh_{side}", (0.10 * sx, 0, 0.98), (0.10 * sx, 0, 0.53), "pelvis"),
              (f"shin_{side}", (0.10 * sx, 0, 0.53), (0.10 * sx, 0, 0.09), f"thigh_{side}"),
              (f"foot_{side}", (0.10 * sx, 0, 0.09), (0.10 * sx, -0.16, 0.03), f"shin_{side}")]
    return b


def build_armature(name, c, k):
    data = bpy.data.armatures.new(f"{name}_arm")
    arm = bpy.data.objects.new(f"{name}_rig", data)
    c.objects.link(arm)
    vl = bpy.context.view_layer
    for o in vl.objects:
        o.select_set(False)
    vl.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for n, h, t, p in bones_def():
        e = data.edit_bones.new(n)
        e.head = Vector(h) * k
        e.tail = Vector(t) * k
        e.roll = 0.0
        if p:
            e.parent = eb[p]
            e.use_connect = False
        eb[n] = e
    bpy.ops.object.mode_set(mode="OBJECT")
    arm.select_set(False)
    data.display_type = "STICK"
    return arm


# ---------------------------------------------------------------- skin graph
def skin_graph():
    """(nodes [(pos, (rx, ry))], edges) for the body (unit coords)."""
    nodes, edges = [], []

    def add(p, r, parent=None):
        nodes.append((Vector(p), r if isinstance(r, tuple) else (r, r)))
        i = len(nodes) - 1
        if parent is not None:
            edges.append((parent, i))
        return i

    p0 = add((0, 0, 0.97), (0.150, 0.128))
    w = add((0, 0, 1.10), (0.132, 0.112), p0)
    c1 = add((0, 0.005, 1.28), (0.162, 0.125), w)
    c2 = add((0, 0.01, 1.42), (0.182, 0.13), c1)
    n1 = add((0, 0.01, 1.52), 0.058, c2)
    add((0, 0.005, 1.64), 0.052, n1)
    for sx in (1, -1):
        s, e, wr, t = _arm_pts(sx)
        sh = add(s + Vector((-0.01 * sx, 0, -0.01)), 0.078, c2)
        bi = add(s.lerp(e, 0.45), 0.064, sh)
        el = add(e, 0.046, bi)
        fm = add(e.lerp(wr, 0.35), 0.052, el)
        wi = add(wr, 0.035, fm)
        d = (t - wr).normalized()
        palm = add(wr.lerp(t, 0.42), (0.044, 0.02), wi)
        for i, (fy, ln) in enumerate(((-0.027, 0.05), (-0.009, 0.056), (0.009, 0.052), (0.026, 0.042))):
            base = wr.lerp(t, 0.6) + Vector((0, fy, 0))
            b = add(base, 0.0085, palm)
            m = add(base + d * ln * 0.55 + Vector((-sx * 0.006, 0, 0)), 0.0078, b)
            add(base + d * ln + Vector((-sx * 0.016, 0, 0)), 0.0068, m)
        tb = add(wr.lerp(t, 0.18) + Vector((-sx * 0.014, -0.022, 0)), 0.011, wi)
        tm = add(wr.lerp(t, 0.18) + d * 0.03 + Vector((-sx * 0.022, -0.038, 0)), 0.009, tb)
        add(wr.lerp(t, 0.18) + d * 0.055 + Vector((-sx * 0.026, -0.046, 0)), 0.0075, tm)
        hip = add((0.095 * sx, 0, 0.93), 0.098, p0)
        tm = add((0.10 * sx, 0.0, 0.76), 0.084, hip)
        kn = add((0.10 * sx, -0.005, 0.53), 0.056, tm)
        cf = add((0.10 * sx, 0.018, 0.40), 0.062, kn)
        an = add((0.10 * sx, 0.0, 0.13), 0.045, cf)
        add((0.10 * sx, -0.165, 0.045), (0.052, 0.04), an)
        add((0.10 * sx, 0.045, 0.055), 0.047, an)
    return nodes, edges


def body_mesh(name, c, k):
    nodes, edges = skin_graph()
    me = bpy.data.meshes.new(f"{name}_skin")
    me.from_pydata([p * k for p, _ in nodes], edges, [])
    ob = bpy.data.objects.new(f"{name}_body", me)
    c.objects.link(ob)
    sk = ob.modifiers.new("Skin", "SKIN")
    sk.use_smooth_shade = True
    sk.branch_smoothing = 0.35
    layer = me.skin_vertices[0].data
    for i, (_, r) in enumerate(nodes):
        layer[i].radius = (r[0] * k, r[1] * k)
    layer[0].use_root = True
    sub = ob.modifiers.new("Sub", "SUBSURF")
    sub.levels = 3
    dg = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    ob.data = baked
    bpy.data.meshes.remove(me)
    baked.name = f"{name}_body"
    baked.shade_smooth()
    return ob


# ---------------------------------------------------------------- weights
BONE_R = {"pelvis": 0.15, "spine": 0.13, "chest": 0.17, "neck": 0.06, "head": 0.08, "upperarm": 0.06,
          "forearm": 0.045, "hand": 0.04, "thigh": 0.09, "shin": 0.056, "foot": 0.05}


def skin_weights(ob, arm, k):
    """Weights from distance to bone segments normalised by limb thickness (top bones, power falloff)."""
    segs = [(b.name, b.head_local.copy(), b.tail_local.copy(), BONE_R[b.name.split("_")[0]] * k)
            for b in arm.data.bones]
    groups = {n: ob.vertex_groups.new(name=n) for n, _, _, _ in segs}
    dominant = []
    for v in ob.data.vertices:
        p = v.co
        ds = []
        for n, h, t, r in segs:
            q, u = intersect_point_line(p, h, t)
            q = h if u < 0 else (t if u > 1 else q)
            ds.append(((p - q).length / r + 1e-4, n, max(0.0, min(1.0, u))))
        ds.sort()
        top = [d for d in ds[:3] if d[0] < ds[0][0] * 1.45]
        ws = [1.0 / d[0] ** 8 for d in top]
        s = sum(ws)
        for (d, n, _), w in zip(top, ws):
            groups[n].add([v.index], w / s, "REPLACE")
        dominant.append((ds[0][1], ds[0][2], top[1][1] if len(top) > 1 else None,
                         ws[1] / s if len(ws) > 1 else 0.0))
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    ob.parent = arm
    return dominant


# ---------------------------------------------------------------- clothing zones
def zone_attributes(ob, k, dominant):
    """Per-vertex rest height / arm / foot / wrist masks; the shader turns them into smooth clothing edges."""
    me = ob.data
    names = {g.index: g.name.split("_")[0] for g in ob.vertex_groups}
    layers = {n: me.attributes.new(n, "FLOAT", "POINT") for n in ("rest_z", "absx", "back", "arm", "foot", "wrist")}
    for v in me.vertices:
        arm = foot = 0.0
        for g in v.groups:
            n = names[g.group]
            if n in ("upperarm", "forearm", "hand"):
                arm += g.weight
            elif n == "foot":
                foot += g.weight
        bone, u, _, _ = dominant[v.index]
        vals = {"rest_z": v.co.z / k, "absx": abs(v.co.x) / k, "back": 1.0 if v.co.y > 0 else 0.0,
                "arm": arm, "foot": foot,
                "wrist": 1.0 if bone.startswith("forearm") and u > 0.72 else 0.0}
        for n, val in vals.items():
            layers[n].data[v.index].value = val


def zone_material(name, cols, wristband):
    """cols: zone -> (lit, shadow) linear RGBA. Bands by rest height, then arm/foot/wrist overrides."""
    from toon import toon_group
    m = bpy.data.materials.new(f"Body_{name}")
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        if nd.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(nd)
    n, l = nt.nodes, nt.links

    def attr(a):
        node = n.new("ShaderNodeAttribute")
        node.attribute_name = a
        return node.outputs["Fac"]

    def below(src, thr, soft=0.003):
        mr = n.new("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = thr + soft
        mr.inputs["From Max"].default_value = thr - soft
        l.new(src, mr.inputs["Value"])
        return mr.outputs["Result"]

    def above(src, thr, soft=0.003):
        return below(src, thr, -soft)

    def math(op, a, b=None, c=None):
        node = n.new("ShaderNodeMath")
        node.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, float):
                node.inputs[i].default_value = v
            else:
                l.new(v, node.inputs[i])
        return node.outputs[0]

    z, ax = attr("rest_z"), attr("absx")
    # tank top: scoop neckline rising into shoulder straps, armholes cut below |x| > 0.155
    strap = math("MULTIPLY", math("MINIMUM", math("MAXIMUM", math("SUBTRACT", ax, 0.045), 0.0), 0.04), 2.0)
    neck_z = math("ADD", math("MULTIPLY_ADD", attr("back"), 0.04, 1.43), strap)
    d_neck = math("SUBTRACT", neck_z, z)
    d_arm = math("MAXIMUM", math("SUBTRACT", 0.155, ax), math("SUBTRACT", 1.34, z))
    d = math("MINIMUM", d_neck, d_arm)
    steps = [(above(d, 0.0), "trim"), (above(d, 0.022), "jersey"),
             (below(z, 1.07), "trim"), (below(z, 1.048), "shorts"), (below(z, 0.735), "trim"),
             (below(z, 0.705), "skin"),
             (below(z, 0.27), "sock"), (below(z, 0.15), "shoe"), (above(attr("arm"), 0.6), "skin"),
             (above(attr("foot"), 0.5), "shoe"), (below(z, 0.028), "sole")]
    if wristband:
        wr = n.new("ShaderNodeMath")
        wr.operation = "MULTIPLY"
        l.new(above(attr("wrist"), 0.5), wr.inputs[0])
        l.new(above(attr("arm"), 0.5), wr.inputs[1])
        steps.append((wr.outputs[0], "band"))
    g = n.new("ShaderNodeGroup")
    g.node_tree = toon_group()
    g.inputs["Rim"].default_value = 0.25
    for i, sock in enumerate(("Color", "Shadow")):
        cur = None
        for fac, zone in [(None, "skin")] + steps:
            col = cols[zone][i]
            if cur is None:
                rgb = n.new("ShaderNodeRGB")
                rgb.outputs[0].default_value = col
                cur = rgb.outputs[0]
                continue
            mx = n.new("ShaderNodeMix")
            mx.data_type = "RGBA"
            l.new(fac, mx.inputs["Factor"])
            l.new(cur, mx.inputs[6])
            mx.inputs[7].default_value = col
            cur = mx.outputs[2]
        l.new(cur, g.inputs[sock])
    l.new(g.outputs["Shader"], nt.nodes["Material Output"].inputs["Surface"])
    return m
