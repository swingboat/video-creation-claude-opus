"""Gym: wooden floor, painted court lines, two baskets, stands, walls and roof structure."""
import math

import bpy

from common import HOOP, RIM_R, coll, empty, hexcol, link, mat, mesh_obj

LINE_W = 0.05
Z_PAINT = 0.002
Z_LINE = 0.003


# ---------------------------------------------------------------- floor material
def wood_material():
    m = mat("Wood", "#c98d55", rough=0.22, coat=0.55)
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    brick = n.new("ShaderNodeTexBrick")
    brick.offset = 0.37
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Brick Width"].default_value = 2.1
    brick.inputs["Row Height"].default_value = 0.072
    brick.inputs["Mortar Size"].default_value = 0.0015
    brick.inputs["Color1"].default_value = hexcol("#c68a52")
    brick.inputs["Color2"].default_value = hexcol("#d9a066")
    brick.inputs["Mortar"].default_value = hexcol("#6b4426")
    l.new(tc.outputs["Object"], brick.inputs["Vector"])
    # long grain: noise stretched along X
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.6, 40.0, 1.0)
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Distortion"].default_value = 0.6
    l.new(mp.outputs["Vector"], noise.inputs["Vector"])
    grain = n.new("ShaderNodeValToRGB")
    grain.color_ramp.elements[0].color = (0.72, 0.62, 0.55, 1)
    grain.color_ramp.elements[1].color = (1.05, 1.0, 0.95, 1)
    l.new(noise.outputs["Fac"], grain.inputs["Fac"])
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    l.new(brick.outputs["Color"], mix.inputs[6])
    l.new(grain.outputs["Color"], mix.inputs[7])
    l.new(mix.outputs[2], b.inputs["Base Color"])
    # slight roughness variation keeps reflections alive
    rr = n.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value = 0.16
    rr.inputs["To Max"].default_value = 0.3
    l.new(noise.outputs["Fac"], rr.inputs["Value"])
    l.new(rr.outputs["Result"], b.inputs["Roughness"])
    return m


# ---------------------------------------------------------------- line helpers
def ribbon(name, pts, width, z, c, material, closed=False):
    """Flat strip of given width following a 2D polyline."""
    verts, faces = [], []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        a = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        b = pts[(i + 1) % n] if (closed or i < n - 1) else pts[i]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / d * width / 2, dx / d * width / 2
        verts += [(x + nx, y + ny, z), (x - nx, y - ny, z)]
    segs = n if closed else n - 1
    for i in range(segs):
        j = (i + 1) % n
        faces.append((2 * i, 2 * i + 1, 2 * j + 1, 2 * j))
    return mesh_obj(name, verts, faces, c, material)


def arc(cx, cy, r, a0, a1, steps=64):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / steps),
             cy + r * math.sin(a0 + (a1 - a0) * i / steps)) for i in range(steps + 1)]


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def box(name, c, size, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    return link(ob, c)


# ---------------------------------------------------------------- court
def court_lines(c):
    white = mat("LineWhite", "#f4f1ea", rough=0.3, coat=0.5)
    paint = mat("PaintRed", "#9b1c22", rough=0.25, coat=0.55)
    ribbon("Boundary", rect(-14, -7.5, 14, 7.5), LINE_W, Z_LINE, c, white, closed=True)
    ribbon("CentreLine", [(0, -7.5), (0, 7.5)], LINE_W, Z_LINE, c, white)
    ribbon("CentreCircle", arc(0, 0, 1.8, 0, 2 * math.pi, 96)[:-1], LINE_W, Z_LINE, c, white, closed=True)
    disc = [(0, 0, Z_PAINT)] + [(1.8 * math.cos(a), 1.8 * math.sin(a), Z_PAINT)
                                for a in (2 * math.pi * i / 96 for i in range(96))]
    mesh_obj("CentrePaint", disc, [(0, i + 1, (i + 1) % 96 + 1) for i in range(96)], c, paint)
    for s in (1, -1):
        bx = s * 12.425
        base = s * 14
        ft = s * (14 - 5.8)
        # key (lane) painted area + outline
        x0, x1 = sorted((base, ft))
        mesh_obj(f"Key{s:+d}", [(x0, -2.45, Z_PAINT), (x1, -2.45, Z_PAINT), (x1, 2.45, Z_PAINT),
                               (x0, 2.45, Z_PAINT)], [(0, 1, 2, 3)], c, paint)
        ribbon(f"Lane{s:+d}", rect(x0, -2.45, x1, 2.45), LINE_W, Z_LINE, c, white, closed=True)
        ribbon(f"FTCircle{s:+d}", arc(ft, 0, 1.8, 0, 2 * math.pi, 96)[:-1], LINE_W, Z_LINE, c, white,
               closed=True)
        # three-point line: straight parts at |y| = 6.6, arc radius 6.75 around basket
        a = math.asin(6.6 / 6.75)
        corner_x = bx - s * 6.75 * math.cos(a)
        if s > 0:
            pts = [(base, -6.6)] + arc(bx, 0, 6.75, math.pi + a, math.pi - a, 96) + [(base, 6.6)]
            pts[1] = (corner_x, -6.6)
        else:
            pts = [(base, -6.6)] + arc(bx, 0, 6.75, -a, a, 96) + [(base, 6.6)]
        ribbon(f"Three{s:+d}", pts, LINE_W, Z_LINE, c, white)


def floor(c):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = "Floor"
    ob.scale = (36, 22, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(wood_material())
    link(ob, c)


# ---------------------------------------------------------------- baskets
def basket(c, s):
    """Backboard, rim and stanchion for the basket at x = s*12.425."""
    glass = mat("Glass", "#e8f2f4", rough=0.03, transmission=1.0, ior=1.5)
    white = mat("BoardWhite", "#f6f6f2", rough=0.4)
    orange = mat("Rim", "#e2531c", rough=0.32, metal=0.6)
    pad = mat("Pad", "#7d1218", rough=0.7)
    steel = mat("Steel", "#2b2d31", rough=0.35, metal=0.9)
    led = mat("LED_Buzzer", "#ff1a14", rough=0.4, emit="#ff1a14", strength=0.0)
    fx = s * 12.8
    z0 = 2.9
    box(f"Board{s:+d}", c, (0.03, 1.8, 1.05), (fx + s * 0.015, 0, z0 + 0.525), glass)
    face = fx - s * 0.002
    for nm, sz, loc in (("Top", (0.01, 1.8, 0.05), (face, 0, z0 + 1.025)),
                        ("Bot", (0.01, 1.8, 0.05), (face, 0, z0 + 0.025)),
                        ("L", (0.01, 0.05, 1.05), (face, -0.875, z0 + 0.525)),
                        ("R", (0.01, 0.05, 1.05), (face, 0.875, z0 + 0.525)),
                        ("ITop", (0.01, 0.59, 0.05), (face, 0, z0 + 0.15 + 0.45 - 0.025)),
                        ("IL", (0.01, 0.05, 0.45), (face, -0.27, z0 + 0.15 + 0.225)),
                        ("IR", (0.01, 0.05, 0.45), (face, 0.27, z0 + 0.15 + 0.225)),
                        ("IBot", (0.01, 0.59, 0.05), (face, 0, z0 + 0.175))):
        box(f"Frame{nm}{s:+d}", c, sz, loc, white)
    # LED strip hugging the board edge (lit at the buzzer)
    back = fx + s * 0.035
    for nm, sz, loc in (("T", (0.012, 1.82, 0.025), (back, 0, z0 + 1.06)),
                        ("B", (0.012, 1.82, 0.025), (back, 0, z0 - 0.01)),
                        ("L", (0.012, 0.025, 1.07), (back, -0.91, z0 + 0.525)),
                        ("R", (0.012, 0.025, 1.07), (back, 0.91, z0 + 0.525))):
        box(f"LED{nm}{s:+d}", c, sz, loc, led)
    bpy.ops.mesh.primitive_torus_add(major_radius=RIM_R + 0.009, minor_radius=0.009,
                                     major_segments=96, minor_segments=16,
                                     location=(s * HOOP[0], 0, HOOP[2] - 0.009))
    rim = bpy.context.active_object
    rim.name = f"Rim{s:+d}"
    rim.data.materials.append(orange)
    bpy.ops.object.shade_smooth()
    link(rim, c)
    box(f"RimBracket{s:+d}", c, (0.16, 0.12, 0.05), (fx - s * 0.08, 0, HOOP[2] - 0.03), orange)
    # stanchion: padded base behind the baseline, steel boom to the board
    box(f"StanchionBase{s:+d}", c, (1.6, 1.1, 1.0), (s * 16.2, 0, 0.5), pad)
    box(f"StanchionPost{s:+d}", c, (0.35, 0.35, 2.6), (s * 16.2, 0, 2.3), pad)
    dx, dz = (fx + s * 0.03) - s * 16.2, (z0 + 0.6) - 3.6
    ln = math.hypot(dx, dz)
    box(f"Boom{s:+d}", c, (ln, 0.14, 0.14), (s * 16.2 + dx / 2, 0, 3.6 + dz / 2), steel,
        rot=(0, -math.atan2(dz, dx), 0))


# ---------------------------------------------------------------- stands, walls, roof
ROWS_SIDE = 12
ROWS_END = 9


def seat_rows():
    """[(p0, p1, z, facing_angle)] seat lines where the crowd sits (z = seat top)."""
    rows = []
    for s in (1, -1):
        for i in range(ROWS_SIDE):
            y = s * (10.0 + i * 0.85)
            rows.append(((-15.5, y), (15.5, y), 0.6 + i * 0.42, -s * math.pi / 2))
        for i in range(ROWS_END):
            x = s * (18.6 + i * 0.85)
            rows.append(((x, -8.0), (x, 8.0), 0.6 + i * 0.42, math.pi if s > 0 else 0.0))
    return rows


def stands(c):
    concrete = mat("Stand", "#2a2a30", rough=0.8)
    for s in (1, -1):
        for i in range(ROWS_SIDE):
            box(f"StepS{s:+d}_{i}", c, (33.0, 0.85, 0.42 * (i + 1) + 0.18),
                (0, s * (10.0 + i * 0.85), (0.42 * (i + 1) + 0.18) / 2), concrete)
        for i in range(ROWS_END):
            box(f"StepE{s:+d}_{i}", c, (0.85, 18.0, 0.42 * (i + 1) + 0.18),
                (s * (18.6 + i * 0.85), 0, (0.42 * (i + 1) + 0.18) / 2), concrete)
    wall = mat("Wall", "#0b0c10", rough=0.9)
    box("WallN", c, (60, 0.3, 18), (0, 21.0, 9), wall)
    box("WallS", c, (60, 0.3, 18), (0, -21.0, 9), wall)
    box("WallE", c, (0.3, 44, 18), (27.0, 0, 9), wall)
    box("WallW", c, (0.3, 44, 18), (-27.0, 0, 9), wall)
    box("Ceiling", c, (60, 44, 0.3), (0, 0, 16.5), wall)
    truss = mat("Truss", "#3a3c42", rough=0.5, metal=0.8)
    for i in range(-3, 4):
        box(f"Truss{i}", c, (0.25, 40, 0.5), (i * 7.0, 0, 14.6), truss)
    rail = mat("Rail", "#111114", rough=0.4)
    box("BoardRailN", c, (30, 0.12, 0.9), (0, 9.4, 0.45), rail)
    box("BoardRailS", c, (30, 0.12, 0.9), (0, -9.4, 0.45), rail)


def build():
    c = coll("Gym")
    floor(c)
    court_lines(c)
    basket(c, 1)
    basket(c, -1)
    stands(c)
    return c
