"""The library hall: floor, walls with arched windows, shelves full of books, tables, chairs, pillars."""
import math

import bmesh
import bpy
import numpy as np

import common as C

RNG = np.random.default_rng(3)
BOOK_PALETTE = ["#4a1a16", "#5a2a1a", "#1f3326", "#1c2638", "#3b2a1c", "#2a1f2e", "#6a5236", "#233a3a", "#701f1a"]


# ---------------------------------------------------------------- materials
def wood_mat(name, c1, c2, scale=6.0, rough=0.38, coat=0.0, planks=False):
    m = C.mat(name, c1, rough, Coat_Weight=coat, Coat_Roughness=0.15)
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tc = C.node(nt, "ShaderNodeTexCoord", (-1100, 0))
    mp = C.node(nt, "ShaderNodeMapping", (-900, 0))
    mp.inputs["Scale"].default_value = (1.0, 0.12, 1.0)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    wave = C.node(nt, "ShaderNodeTexWave", (-700, 0), Scale=scale, Distortion=6.0, Detail=4.0)
    wave.bands_direction = "X"
    nt.links.new(mp.outputs[0], wave.inputs[0])
    ramp = C.node(nt, "ShaderNodeValToRGB", (-450, 0))
    ramp.color_ramp.elements[0].color = C.hexcol(c1)
    ramp.color_ramp.elements[1].color = C.hexcol(c2)
    nt.links.new(wave.outputs["Fac"], ramp.inputs[0])
    out = ramp.outputs[0]
    if planks:
        br = C.node(nt, "ShaderNodeTexBrick", (-450, -300), Scale=1.0, Mortar_Size=0.004,
                    Bias=0.3, Brick_Width=2.4, Row_Height=0.2)
        br.inputs["Color1"].default_value = (1, 1, 1, 1)
        br.inputs["Color2"].default_value = (0.75, 0.75, 0.75, 1)
        br.inputs["Mortar"].default_value = (0.1, 0.1, 0.1, 1)
        nt.links.new(tc.outputs["Object"], br.inputs[0])
        mul = C.node(nt, "ShaderNodeMix", (-200, 0), data_type="RGBA", blend_type="MULTIPLY")
        mul.inputs["Factor"].default_value = 1.0
        nt.links.new(ramp.outputs[0], mul.inputs[6])
        nt.links.new(br.outputs["Color"], mul.inputs[7])
        out = mul.outputs[2]
    nt.links.new(out, p.inputs["Base Color"])
    return m


def plaster_mat():
    m = C.mat("plaster", "#3a4150", 0.92)
    nt = m.node_tree
    nz = C.node(nt, "ShaderNodeTexNoise", (-600, -200), Scale=3.0, Detail=8.0)
    bump = C.node(nt, "ShaderNodeBump", (-300, -200), Strength=0.08)
    nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], nt.nodes["Principled BSDF"].inputs["Normal"])
    return m


def books_mat():
    m = C.mat("books", "#402020", 0.6)
    nt = m.node_tree
    at = C.node(nt, "ShaderNodeAttribute", (-400, 0), attribute_name="color")
    nt.links.new(at.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


# ---------------------------------------------------------------- pieces
def box_obj(name, center, size, material):
    v, f = C.boxes([center], [size])
    return C.mesh_np(name, v, f, material=material)


def bm_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def left_wall(mat):
    x0, x1 = C.HALL_X[0] - 0.4, C.HALL_X[0]
    wall = box_obj("wall_left", ((x0 + x1) / 2, sum(C.HALL_Y) / 2, 6.0),
                   (x1 - x0, C.HALL_Y[1] - C.HALL_Y[0], 12.0), mat)
    r = C.WIN_W / 2
    zc = C.WIN_TOP - r
    for i, y in enumerate(C.WINDOWS_Y):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0, matrix=_mtx((x0 - 0.5 + (x1 - x0 + 1) / 2, y, (C.WIN_SILL + zc) / 2),
                                                        (x1 - x0 + 1, C.WIN_W, zc - C.WIN_SILL)))
        cyl = _mtx(((x0 + x1) / 2, y, zc), (1, 1, 1)) @ _rot_y90()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r, radius2=r, depth=x1 - x0 + 1, matrix=cyl)
        cut = bm_obj(f"cut{i}", bm)
        mod = wall.modifiers.new(f"b{i}", "BOOLEAN")
        mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", cut
        mod.use_self = True
        cut.hide_render = cut.hide_viewport = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(wall.evaluated_get(dg))
    wall.modifiers.clear()
    wall.data = me
    for o in [o for o in bpy.data.objects if o.name.startswith("cut")]:
        bpy.data.objects.remove(o)
    return wall


def _mtx(loc, scale):
    from mathutils import Matrix
    return Matrix.Translation(loc) @ Matrix.Diagonal((*scale, 1.0))


def _rot_y90():
    from mathutils import Matrix
    return Matrix.Rotation(math.pi / 2, 4, "Y")


def mullions(mat):
    cs, ss = [], []
    x = C.HALL_X[0] - 0.2
    zc = C.WIN_TOP - C.WIN_W / 2
    for y in C.WINDOWS_Y:
        for dy in (-0.4, 0.4):
            top = zc + math.sqrt((C.WIN_W / 2) ** 2 - dy * dy)
            cs.append((x, y + dy, (C.WIN_SILL + top) / 2))
            ss.append((0.07, 0.06, top - C.WIN_SILL))
        for z in (3.8, 5.1, 6.4, zc):
            cs.append((x, y, z))
            ss.append((0.07, C.WIN_W, 0.05))
        cs.append((x + 0.15, y, C.WIN_SILL - 0.05))
        ss.append((0.6, C.WIN_W + 0.3, 0.1))
    v, f = C.boxes(cs, ss)
    return C.mesh_np("mullions", v, f, material=mat)


def shelf_run(axis_pos, along, side, depth=0.42, top=8.0, levels=19):
    """Shelves + books against a wall. side: 'x' wall at x=axis_pos (books along y) or 'y'."""
    a0, a1 = along
    cs, ss, bc, bs, col = [], [], [], [], []
    lv_h = top / levels
    inward = -1 if axis_pos > 0 else 1
    mid = axis_pos + inward * depth / 2
    for k in range(levels + 1):
        cs.append((mid, (a0 + a1) / 2, k * lv_h + 0.015))
        ss.append((depth, a1 - a0, 0.03))
    for d in np.arange(a0, a1 + 0.01, 1.2):
        cs.append((mid, d, top / 2))
        ss.append((depth, 0.05, top))
    for k in range(levels):
        p = a0 + 0.03
        while p < a1 - 0.08:
            w = RNG.uniform(0.028, 0.07)
            if RNG.random() < 0.04:
                p += RNG.uniform(0.05, 0.25)
                continue
            if (p - a0) % 1.2 < 0.04:
                p += 0.05
            h = RNG.uniform(0.6, 0.92) * (lv_h - 0.03)
            dp = RNG.uniform(0.18, depth - 0.04)
            bc.append((axis_pos + inward * (dp / 2 + 0.02), p + w / 2, k * lv_h + 0.03 + h / 2))
            bs.append((dp, w * 0.96, h))
            c = np.array(C.hexcol(BOOK_PALETTE[RNG.integers(len(BOOK_PALETTE))])) * RNG.uniform(0.6, 1.25)
            col.append(np.clip(c, 0, 1))
            p += w
    cs, ss, bc, bs = map(np.array, (cs, ss, bc, bs))
    if side == "y":
        cs, ss, bc, bs = (a[:, [1, 0, 2]] for a in (cs, ss, bc, bs))
    return cs, ss, bc, bs, np.array(col)


def chair_boxes(cx, cy, ang):
    parts = [((0, 0, 0.45), (0.44, 0.44, 0.04))]
    for sx in (-0.19, 0.19):
        for sy in (-0.19, 0.19):
            parts.append(((sx, sy, 0.225), (0.04, 0.04, 0.45)))
        parts.append(((sx, 0.2, 0.72), (0.04, 0.04, 0.55)))
    parts += [((0, 0.2, 0.92), (0.42, 0.04, 0.12)), ((0, 0.2, 0.68), (0.42, 0.03, 0.05))]
    c, s = math.cos(ang), math.sin(ang)
    cs = [(cx + c * p[0] - s * p[1], cy + s * p[0] + c * p[1], p[2]) for p, _ in parts]
    return cs, [sz for _, sz in parts], [ang] * len(parts)


def table(x, wood):
    y0, y1 = C.TABLE_Y
    h = C.TABLE_H
    cs = [(x, (y0 + y1) / 2, h - 0.03), (x, (y0 + y1) / 2, h - 0.12)]
    ss = [(1.1, y1 - y0, 0.06), (0.9, y1 - y0 - 0.3, 0.12)]
    for y in (y0 + 0.3, (y0 + y1) / 2, y1 - 0.3):
        for dx in (-0.42, 0.42):
            cs.append((x + dx, y, (h - 0.06) / 2))
            ss.append((0.09, 0.09, h - 0.06))
    v, f = C.boxes(cs, ss)
    C.mesh_np(f"table_{x:+.1f}", v, f, material=wood)
    ccs, css, crz = [], [], []
    for y in np.arange(y0 + 1.0, y1 - 0.5, 2.2):
        for side in (-1, 1):
            a = (math.pi / 2 if side < 0 else -math.pi / 2) + RNG.normal(0, 0.12)
            cc, sz, rz = chair_boxes(x + side * (0.78 + RNG.uniform(0, 0.1)), y + RNG.normal(0, 0.06), a)
            ccs += cc
            css += sz
            crz += rz
    v, f = C.boxes(ccs, css, np.array(crz))
    C.mesh_np(f"chairs_{x:+.1f}", v, f, material=wood)


def build():
    wood = wood_mat("wood", "#2a140c", "#4a2817", coat=0.35)
    dark = wood_mat("wood_dark", "#1a0d08", "#2e1a10", rough=0.5)
    floor = wood_mat("floor", "#1e110a", "#3a2214", scale=3.0, rough=0.45, coat=0.2, planks=True)
    plaster = plaster_mat()
    (y0, y1), (x0, x1) = C.HALL_Y, C.HALL_X
    box_obj("floor", (0, (y0 + y1) / 2, -0.05), (x1 - x0, y1 - y0, 0.1), floor)
    box_obj("ceiling", (0, (y0 + y1) / 2, 12.05), (x1 - x0 + 1, y1 - y0, 0.1), plaster)
    box_obj("wall_right", (x1 + 0.2, (y0 + y1) / 2, 6), (0.4, y1 - y0, 12), plaster)
    box_obj("wall_end", (0, y1 + 0.2, 6), (x1 - x0 + 1, 0.4, 12), plaster)
    box_obj("wall_front", (0, y0 - 0.2, 6), (x1 - x0 + 1, 0.4, 12), plaster)
    left_wall(plaster)
    mullions(dark)
    beams = [(0, y, 11.8) for y in np.arange(y0 + 1.5, y1, 3.0)]
    v, f = C.boxes(beams, [(x1 - x0, 0.3, 0.4)] * len(beams))
    C.mesh_np("beams", v, f, material=dark)
    pil = [(x0 + 0.25, y, 6) for y in (0.5, 7.5, 14.5, 21.5, 28.5)]
    v, f = C.boxes(pil, [(0.5, 0.6, 12)] * len(pil))
    C.mesh_np("pillars", v, f, material=dark)
    runs = [shelf_run(x1, (y0 + 0.5, y1 - 0.5), "x"), shelf_run(y1, (x0 + 0.5, x1 - 0.5), "y")]
    sc = np.concatenate([r[0] for r in runs])
    ss = np.concatenate([r[1] for r in runs])
    v, f = C.boxes(sc, ss)
    C.mesh_np("shelves", v, f, material=dark)
    bc = np.concatenate([r[2] for r in runs])
    bs = np.concatenate([r[3] for r in runs])
    col = np.concatenate([r[4] for r in runs])
    v, f = C.boxes(bc, bs)
    C.mesh_np("books", v, f, material=books_mat(), face_colors=np.repeat(col, 6, axis=0))
    table(C.TABLE_X, wood)
    table(-2.4, wood)
    print(f"[library] books={len(bc)}")
