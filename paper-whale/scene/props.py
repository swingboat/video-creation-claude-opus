"""Props on the reading table: paper material, open book (curved page blocks), oil lamp, scattered books."""
import math
import os

import bpy
import numpy as np

import common as C

RNG = np.random.default_rng(11)
PAGE_W, PAGE_L = 0.15, 0.22          # one page of the open book (across x, along y)
BLOCK_T = 0.018                      # page-block hump height


def paper_mat(name="paper", translucent=0.3):
    """Ink texture x off-white paper, mixed with a translucent lobe so back-lit pages glow."""
    m = C.mat(name, "#e9e3d5", 0.55, Subsurface_Weight=0.04)
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    img = bpy.data.images.get("pages.png") or bpy.data.images.load(os.path.join(C.TEX, "pages.png"))
    tex = C.node(nt, "ShaderNodeTexImage", (-700, 200), image=img)
    tint = C.node(nt, "ShaderNodeMix", (-400, 200), data_type="RGBA", blend_type="MULTIPLY")
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = C.hexcol("#ebe5d6")
    nt.links.new(tex.outputs["Color"], tint.inputs[6])
    nt.links.new(tint.outputs[2], p.inputs["Base Color"])
    tr = C.node(nt, "ShaderNodeBsdfTranslucent", (-100, -300), Color=C.hexcol("#f2e2c4"))
    mix = C.node(nt, "ShaderNodeMixShader", (250, 0), Fac=translucent)
    out = nt.nodes["Material Output"]
    nt.links.new(p.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def edge_mat():
    m = C.mat("page_edge", "#d8d0bd", 0.7)
    nt = m.node_tree
    tc = C.node(nt, "ShaderNodeTexCoord", (-900, 0))
    wave = C.node(nt, "ShaderNodeTexWave", (-650, 0), Scale=900.0, Distortion=1.5, Detail=1.0)
    wave.bands_direction = "Z"
    nt.links.new(tc.outputs["Object"], wave.inputs[0])
    ramp = C.node(nt, "ShaderNodeValToRGB", (-400, 0))
    ramp.color_ramp.elements[0].color = C.hexcol("#a89f8a")
    ramp.color_ramp.elements[1].color = C.hexcol("#e2dac7")
    nt.links.new(wave.outputs["Fac"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def block_z(d):
    """Height of the page-block top above the cover at distance d (m) from the spine."""
    d = np.asarray(d, np.float64)
    return BLOCK_T * (1 - np.exp(-d / 0.022)) * (1 - 0.35 * (d / PAGE_W) ** 2) + 0.002


def page_block(spine, side, cell, paper, edge, nd=28, nl=10):
    """Solid curved page block: textured top grid + striped skirt down to the cover."""
    sx, sy, sz = spine
    d = np.linspace(0, PAGE_W, nd)
    y = np.linspace(-PAGE_L / 2, PAGE_L / 2, nl)
    dd, yy = np.meshgrid(d, y, indexing="ij")
    top = np.stack([sx + side * dd, sy + yy, sz + block_z(dd)], -1).reshape(-1, 3)
    f = C.grid_faces(nd, nl)
    if side < 0:
        f = f[:, ::-1]
    cu, cv = cell % 2, cell // 2
    u = (dd / PAGE_W) if side > 0 else 1 - dd / PAGE_W
    uv = np.stack([(cu + 0.04 + 0.92 * u) / 2, (cv + 0.04 + 0.92 * (yy / PAGE_L + 0.5)) / 2], -1).reshape(-1, 2)
    C.mesh_np(f"pages_top_{side:+d}", top, f, uvs=uv[f.ravel()], smooth_shade=True, material=paper)
    rim = np.concatenate([np.stack([d, np.full(nd, -PAGE_L / 2)], -1),
                          np.stack([np.full(nl, PAGE_W), y], -1),
                          np.stack([d[::-1], np.full(nd, PAGE_L / 2)], -1)])
    up = np.stack([sx + side * rim[:, 0], sy + rim[:, 1], sz + block_z(rim[:, 0])], -1)
    lo = up.copy()
    lo[:, 2] = sz
    n = len(rim)
    verts = np.concatenate([up, lo])
    i = np.arange(n - 1)
    sf = np.stack([i, i + 1, n + i + 1, n + i], -1)
    if side < 0:
        sf = sf[:, ::-1]
    C.mesh_np(f"pages_side_{side:+d}", verts, sf, material=edge)


def open_book(loc, paper, edge, cover, cells=(0, 1)):
    x, y, z = loc
    cv, cf = C.boxes([(x - 0.085, y, z + 0.003), (x + 0.085, y, z + 0.003), (x, y, z + 0.002)],
                     [(0.17, PAGE_L + 0.016, 0.006), (0.17, PAGE_L + 0.016, 0.006), (0.02, PAGE_L + 0.016, 0.004)])
    C.mesh_np("cover", cv, cf, material=cover)
    spine = (x, y, z + 0.006)
    page_block(spine, -1, cells[0], paper, edge)
    page_block(spine, +1, cells[1], paper, edge)
    return {"spine": spine}


def lamp(loc):
    x, y, z = loc
    brass = C.mat("brass", "#b08040", 0.28, metal=1.0)
    glass = C.mat("glass", "#ffffff", 0.03, Transmission_Weight=1.0, IOR=1.45)
    flame = C.mat("flame", "#000000", 1.0, emit="#ffa040", emit_k=60.0)
    base = [(0.0, 0), (0.058, 0), (0.06, 0.008), (0.05, 0.02), (0.022, 0.035), (0.018, 0.07), (0.046, 0.09),
            (0.062, 0.112), (0.056, 0.134), (0.026, 0.146), (0.021, 0.152), (0.0, 0.152)]
    v, f = C.revolve(base, 48, (x, y, z))
    C.mesh_np("lamp_base", v, f, smooth_shade=True, material=brass)
    chim = [(0.022, 0.152), (0.036, 0.172), (0.047, 0.2), (0.046, 0.23), (0.034, 0.258), (0.022, 0.282), (0.02, 0.33)]
    v, f = C.revolve(chim, 48, (x, y, z))
    ch = C.mesh_np("lamp_glass", v, f, smooth_shade=True, material=glass)
    ch.modifiers.new("solid", "SOLIDIFY").thickness = 0.0015
    ch.visible_shadow = False
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, segments=24, ring_count=12, location=(x, y, z + 0.178))
    fl = bpy.context.object
    fl.name = "flame"
    fl.scale = (0.0055, 0.0055, 0.017)
    fl.data.materials.append(flame)
    fl.visible_shadow = False
    li = bpy.data.lights.new("lamp_light", "POINT")
    li.energy, li.color, li.shadow_soft_size = 18.0, C.hexcol("#ff9a48")[:3], 0.008
    lo = bpy.data.objects.new("lamp_light", li)
    lo.location = (x, y, z + 0.18)
    bpy.context.scene.collection.objects.link(lo)
    return lo


def scattered_books(cover_mats, paper, edge, avoid):
    cs, ss, rz, mi = [], [], [], []
    for tx in (C.TABLE_X, -2.4):
        for yy in np.arange(C.TABLE_Y[0] + 0.6, C.TABLE_Y[1] - 0.4, 0.9):
            if RNG.random() < 0.45 or (abs(tx - avoid[0]) < 0.5 and abs(yy - avoid[1]) < 1.6):
                continue
            n = RNG.integers(1, 4)
            h = C.TABLE_H
            a = RNG.normal(0, 0.35)
            px, py = tx + RNG.uniform(-0.3, 0.3), yy + RNG.uniform(-0.2, 0.2)
            for _ in range(n):
                w, l, t = RNG.uniform(0.15, 0.22), RNG.uniform(0.22, 0.3), RNG.uniform(0.025, 0.06)
                cs.append((px, py, h + t / 2))
                ss.append((w, l, t))
                rz.append(a + RNG.normal(0, 0.15))
                mi.append(RNG.integers(len(cover_mats)))
                h += t
    cs, ss, rz, mi = np.array(cs), np.array(ss), np.array(rz), np.array(mi)
    v, f = C.boxes(cs, ss, rz)
    ob = C.mesh_np("table_books", v, f)
    for m in cover_mats:
        ob.data.materials.append(m)
    ob.data.polygons.foreach_set("material_index", np.repeat(mi, 6).astype(np.int32))
    pv, pf = C.boxes(cs + [0.006, 0, 0], ss * [0.94, 0.95, 0.8], rz)
    C.mesh_np("table_books_pages", pv, pf, material=edge)
    for k, (tx, yy) in enumerate([(-2.4, 5.0), (-2.4, 12.2), (C.TABLE_X, 13.4)]):
        open_book((tx, yy, C.TABLE_H), paper, edge, cover_mats[k % len(cover_mats)], cells=(2 + k % 2, 3 - k % 2))


def build():
    paper = paper_mat()
    edge = edge_mat()
    covers = [C.mat(f"cover{i}", c, 0.65) for i, c in enumerate(["#1c2a44", "#4a1a16", "#1f3326", "#3b2a1c"])]
    book = open_book(C.BOOK_LOC, paper, edge, covers[0], cells=(0, 3))
    light = lamp(C.LAMP_LOC)
    scattered_books(covers, paper, edge, C.BOOK_LOC)
    return {"book": book, "paper": paper, "lamp_light": light}
