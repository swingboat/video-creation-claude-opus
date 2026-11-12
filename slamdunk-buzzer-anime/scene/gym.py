"""Kaimei High School gym shell: floor + multi-sport lines, walls, windows, galleries, roof, stage."""
import math

import bpy

from common import coll, hexcol, mesh_obj
from toon import outline, tmat, toon_group

X0, X1, Y1 = -21.0, 19.0, 13.0      # interior extents (stage end at X0)
EAVE, RIDGE = 11.0, 14.0
GAL_Z, GAL_D = 4.0, 1.6
WIN_Z0, WIN_Z1 = 5.2, 9.6


class Boxes:
    """Accumulate axis-aligned boxes into one mesh (cheap, one outline modifier)."""

    def __init__(self):
        self.v, self.f = [], []

    def add(self, cx, cy, cz, sx, sy, sz):
        o = len(self.v)
        for dz in (-0.5, 0.5):
            for dy in (-0.5, 0.5):
                for dx in (-0.5, 0.5):
                    self.v.append((cx + dx * sx, cy + dy * sy, cz + dz * sz))
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            self.f.append(tuple(o + i for i in q))

    def build(self, name, c, material, line=0.0):
        ob = mesh_obj(name, self.v, self.f, c, material)
        if line:
            outline(ob, line)
        return ob


# ---------------------------------------------------------------- floor
def floor_material():
    m = bpy.data.materials.new("GymFloor")
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        if nd.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(nd)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.41
    br.inputs["Brick Width"].default_value = 1.8
    br.inputs["Row Height"].default_value = 0.09
    br.inputs["Mortar Size"].default_value = 0.004
    br.inputs["Color1"].default_value = hexcol("#e2b77c")
    br.inputs["Color2"].default_value = hexcol("#d9ab70")
    br.inputs["Mortar"].default_value = hexcol("#c59563")
    nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
    sh = nt.nodes.new("ShaderNodeMix")
    sh.data_type = "RGBA"
    sh.blend_type = "MULTIPLY"
    sh.inputs["Factor"].default_value = 1.0
    nt.links.new(br.outputs["Color"], sh.inputs[6])
    sh.inputs[7].default_value = (0.66, 0.6, 0.72, 1)
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = toon_group()
    nt.links.new(br.outputs["Color"], g.inputs["Color"])
    nt.links.new(sh.outputs[2], g.inputs["Shadow"])
    g.inputs["Rim"].default_value = 0.0
    g.inputs["Gloss"].default_value = 0.16
    nt.links.new(g.outputs["Shader"], nt.nodes["Material Output"].inputs["Surface"])
    return m


def ribbon(name, pts, width, z, c, material, closed=False):
    verts, faces, n = [], [], len(pts)
    for i, (x, y) in enumerate(pts):
        a = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        b = pts[(i + 1) % n] if (closed or i < n - 1) else pts[i]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / d * width / 2, dx / d * width / 2
        verts += [(x + nx, y + ny, z), (x - nx, y - ny, z)]
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        faces.append((2 * i, 2 * i + 1, 2 * j + 1, 2 * j))
    ob = mesh_obj(name, verts, faces, c, material)
    ob.visible_shadow = False
    return ob


def arc(cx, cy, r, a0, a1, steps=64):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / steps), cy + r * math.sin(a0 + (a1 - a0) * i / steps))
            for i in range(steps + 1)]


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def floor(c):
    ob = mesh_obj("Floor", [(X0, -Y1, 0), (X1, -Y1, 0), (X1, Y1, 0), (X0, Y1, 0)], [(0, 1, 2, 3)], c,
                  floor_material())
    white = tmat("LineWhite", "#fbf8f0", rim=0.0)
    yellow = tmat("LineYellow", "#e9be2f", rim=0.0)
    green = tmat("LineGreen", "#3c9c62", rim=0.0)
    z, w = 0.003, 0.05
    ribbon("Boundary", rect(-14, -7.5, 14, 7.5), w, z, c, white, True)
    ribbon("Centre", [(0, -7.5), (0, 7.5)], w, z, c, white)
    ribbon("CentreCircle", arc(0, 0, 1.8, 0, 2 * math.pi, 96)[:-1], w, z, c, white, True)
    for s in (1, -1):
        b, ft, bx = s * 14, s * 8.2, s * 12.425
        ribbon(f"Lane{s:+d}", [(b, -3.0), (ft, -1.8), (ft, 1.8), (b, 3.0)], w, z, c, white)
        ribbon(f"FT{s:+d}", arc(ft, 0, 1.8, 0, 2 * math.pi, 96)[:-1], w, z, c, white, True)
        lo, hi = (3 * math.pi / 2, math.pi / 2) if s > 0 else (-math.pi / 2, math.pi / 2)
        pts = [(b, -6.25)] + [(x, y) for x, y in arc(bx, 0, 6.25, lo, hi, 96)] + [(b, 6.25)]
        ribbon(f"Three{s:+d}", pts, w, z, c, white)
    ribbon("Volley", rect(-9, -4.5, 9, 4.5), w, z * 0.8, c, yellow, True)
    for x in (-3, 0, 3):
        ribbon(f"VolleyX{x}", [(x, -4.5), (x, 4.5)], w, z * 0.8, c, yellow)
    for cy in (-9.6, 9.6):
        ribbon(f"Badm{cy}", rect(-6.7, cy - 1.5, 6.7, cy + 1.5), 0.04, z * 0.7, c, green, True)
    return ob


# ---------------------------------------------------------------- walls / windows / galleries / roof
def walls(c):
    wood = tmat("Wainscot", "#9a6438", "#5e3628", rim=0.0)
    cream = tmat("WallCream", "#efe4cc", "#b4a9a6", rim=0.0)
    frame = tmat("WinFrame", "#6f8b7a", "#3c4c4e", rim=0.0)
    lo, up, fr = Boxes(), Boxes(), Boxes()
    L = X1 - X0
    cx = (X0 + X1) / 2
    for s in (1, -1):
        y = s * (Y1 + 0.15)
        lo.add(cx, y, 0.9, L, 0.3, 1.8)
        up.add(cx, y, (1.8 + WIN_Z0) / 2, L, 0.3, WIN_Z0 - 1.8)
        up.add(cx, y, (WIN_Z1 + EAVE) / 2, L, 0.3, EAVE - WIN_Z1)
        x = X0
        while x < X1 - 0.5:
            up.add(x + 0.5, y, (WIN_Z0 + WIN_Z1) / 2, 1.0, 0.3, WIN_Z1 - WIN_Z0)
            for wz in (WIN_Z0 + 0.06, (WIN_Z0 + WIN_Z1) / 2, WIN_Z1 - 0.06):
                fr.add(x + 2.3, y - s * 0.1, wz, 2.6, 0.12, 0.12)
            fr.add(x + 2.3, y - s * 0.1, (WIN_Z0 + WIN_Z1) / 2, 0.1, 0.12, WIN_Z1 - WIN_Z0)
            x += 3.6
    for x, s in ((X1 + 0.15, 1), (X0 - 0.15, -1)):
        lo.add(x, 0, 0.9, 0.3, 2 * Y1 + 0.6, 1.8)
        up.add(x, 0, (1.8 + EAVE) / 2, 0.3, 2 * Y1 + 0.6, EAVE - 1.8)
    lo.build("Wainscot", c, wood)
    up.build("Walls", c, cream)
    fr.build("WindowFrames", c, frame, 0.02)
    # gable ends and pitched roof
    gv = [(x, sy * Y1, EAVE) for x in (X0 - 0.3, X1 + 0.3) for sy in (-1, 1)] + \
         [(X0 - 0.3, 0, RIDGE), (X1 + 0.3, 0, RIDGE)]
    mesh_obj("Roof", gv, [(0, 2, 5, 4), (1, 3, 5, 4)], c, tmat("RoofUnder", "#e6dccb", "#9f97a0", rim=0.0))
    mesh_obj("Gables", [(X1, -Y1, EAVE), (X1, Y1, EAVE), (X1, 0, RIDGE), (X0, -Y1, EAVE), (X0, Y1, EAVE),
                        (X0, 0, RIDGE)], [(0, 1, 2), (3, 4, 5)], c, cream)
    steel = tmat("Steel", "#f1f1ee", "#a7a9bb", rim=0.0)
    tr = Boxes()
    x = X0 + 2.0
    while x < X1:
        for s in (1, -1):
            tr.add(x, s * Y1 / 2, (EAVE + RIDGE) / 2 - 0.15, 0.2, Y1 * 1.02, 0.25)
        tr.add(x, 0, EAVE - 0.4, 0.15, 2 * Y1, 0.18)
        for i in range(1, 8):
            yy = -Y1 + 2 * Y1 * i / 8
            top = EAVE + (RIDGE - EAVE) * (1 - abs(yy) / Y1)
            tr.add(x, yy, (EAVE - 0.4 + top) / 2, 0.1, 0.1, top - EAVE + 0.4)
        x += 5.0
    tr.build("Trusses", c, steel, 0.03)


def galleries(c):
    deck = tmat("Gallery", "#d8ccb4", "#8f8796", rim=0.0)
    rail = tmat("Rail", "#4f8f6f", "#2c4e48", rim=0.1)
    d, r = Boxes(), Boxes()
    L, cx = X1 - X0 - 1.0, (X0 + X1) / 2 + 0.5
    for s in (1, -1):
        yi = s * (Y1 - GAL_D)
        d.add(cx, s * (Y1 - GAL_D / 2), GAL_Z - 0.15, L, GAL_D, 0.3)
        for hz in (GAL_Z + 1.05, GAL_Z + 0.5):
            r.add(cx, yi, hz, L, 0.06, 0.06)
        x = X0 + 1.0
        while x < X1:
            r.add(x, yi, GAL_Z + 0.52, 0.04, 0.04, 1.05)
            x += 0.6
        for x in range(int(X0) + 3, int(X1), 6):
            d.add(x, s * (Y1 - 0.3), GAL_Z / 2, 0.3, 0.3, GAL_Z)
    d.build("Galleries", c, deck, 0.03)
    r.build("Railings", c, rail, 0.012)


def build():
    c = coll("Gym")
    floor(c)
    walls(c)
    galleries(c)
    return c
