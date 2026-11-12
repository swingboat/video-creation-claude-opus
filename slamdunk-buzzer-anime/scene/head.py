"""Anime head: sculpted egg head with pointed chin, nose bump, ears, and projected face decals."""
import math

import bpy
from mathutils import Vector

from common import mesh_obj
from toon import fix_normals, flat, outline, tmat

EYES = {
    # lid_arch, open (sclera height), iris radius, tilt (outer corner up), brow angle, brow weight
    "cool": dict(arch=0.005, open=0.015, iris=0.012, tilt=0.007, brow=0.10, brow_w=0.0035),
    "fiery": dict(arch=0.008, open=0.019, iris=0.011, tilt=0.010, brow=0.28, brow_w=0.0065),
    "easy": dict(arch=0.006, open=0.014, iris=0.011, tilt=-0.003, brow=-0.05, brow_w=0.0035),
}


def head_mesh(name, c, k, skin_m):
    seg, rings = 40, 28
    verts, faces = [], []
    for r in range(1, rings):
        th = math.pi * r / rings
        for s in range(seg):
            ph = 2 * math.pi * s / seg
            x, y, z = math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)
            if z < 0:
                t = (-z) ** 1.3
                x *= 1 - 0.48 * t
                y *= (1 - 0.12 * t) if y < 0 else (1 - 0.45 * t)
            elif y > 0:
                y *= 1.08
            if y < -0.7 and abs(x) < 0.22 and -0.42 < z < 0.02:
                y -= 0.10 * (1 - abs(x) / 0.22) * math.sin(math.pi * (z + 0.42) / 0.44)
            verts.append((x * 0.090 * k, y * 0.106 * k, z * 0.124 * k))
    verts += [(0, 0, 0.124 * k), (0, 0, -0.124 * k * 0.98)]
    top, bot = len(verts) - 2, len(verts) - 1
    for r in range(rings - 2):
        for s in range(seg):
            a, b = r * seg + s, r * seg + (s + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    for s in range(seg):
        faces.append((top, (s + 1) % seg, s))
        o = (rings - 2) * seg
        faces.append((o + s, o + (s + 1) % seg, bot))
    ob = mesh_obj(f"{name}_head", verts, faces, c, skin_m, smooth_shade=True)
    fix_normals(ob.data)
    for sx in (1, -1):
        ear = mesh_obj(f"{name}_ear{sx:+d}", *_ellipsoid(0.014 * k, 0.026 * k, 0.034 * k), c, skin_m,
                       smooth_shade=True)
        ear.parent = ob
        ear.location = (sx * 0.088 * k, 0.006 * k, -0.012 * k)
        ear.rotation_euler = (0, 0, sx * 0.25)
        outline(ear, 0.004 * k)
    return ob


def _ellipsoid(rx, ry, rz, seg=16, rings=10):
    vs, fs = [], []
    for r in range(rings + 1):
        th = math.pi * r / rings
        for s in range(seg):
            ph = 2 * math.pi * s / seg
            vs.append((rx * math.sin(th) * math.cos(ph), ry * math.sin(th) * math.sin(ph), rz * math.cos(th)))
    for r in range(rings):
        for s in range(seg):
            a, b = r * seg + s, r * seg + (s + 1) % seg
            fs.append((a, b, b + seg, a + seg))
    return vs, fs


# ---------------------------------------------------------------- decals
def _project(head, pts2d, layer):
    """Project (x, z) points onto the head front; push out along the normal by layer."""
    out = []
    for x, z in pts2d:
        ok, loc, nrm, _ = head.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)))
        if not ok:
            loc, nrm = Vector((x, -0.1, z)), Vector((0, -1, 0))
        out.append(tuple(loc + nrm * (0.0007 + 0.0005 * layer)))
    return out


def stroke(pts, w0, w1):
    """Quad strip around a 2D polyline with width tapering w0 -> w1."""
    left, right = [], []
    n = len(pts)
    for i, (x, z) in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        dx, dz = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dz) or 1.0
        w = (w0 + (w1 - w0) * i / (n - 1)) / 2
        left.append((x - dz / d * w, z + dx / d * w))
        right.append((x + dz / d * w, z - dx / d * w))
    vs = left + right
    fs = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    return vs, fs


def ellipse(cx, cz, rx, rz, seg=20):
    vs = [(cx, cz)] + [(cx + rx * math.cos(2 * math.pi * i / seg), cz + rz * math.sin(2 * math.pi * i / seg))
                       for i in range(seg)]
    return vs, [(0, i + 1, (i + 1) % seg + 1) for i in range(seg)]


def arc_pts(x0, x1, z0, z1, arch, n=10):
    return [(x0 + (x1 - x0) * i / (n - 1), z0 + (z1 - z0) * i / (n - 1) + arch * math.sin(math.pi * i / (n - 1)))
            for i in range(n)]


def decal(name, c, head, shape, material, layer, k):
    vs, fs = shape
    vs = [(x * k, z * k) for x, z in vs]
    ob = mesh_obj(name, _project(head, vs, layer), fs, c, material)
    ob.parent = head
    return ob


def face(name, c, head, k, style, iris_col):
    bpy.context.view_layer.update()
    e = EYES[style]
    ink = flat("Ink", "#1c1416")
    white = flat("EyeWhite", "#fbf8f2")
    iris = flat(f"Iris_{name}", iris_col)
    hi = flat("EyeHi", "#ffffff")
    for sx in (1, -1):
        x0, x1 = 0.016, 0.062
        lid = arc_pts(x0, x1, -0.004, -0.004 + e["tilt"], e["arch"])
        low = arc_pts(x0 + 0.004, x1 - 0.004, -0.004 - e["open"] * 0.8, -0.004 - e["open"] + e["tilt"],
                      -e["open"] * 0.35)
        m = lambda pts: [(sx * x, z) for x, z in pts]
        scl = m(lid) + list(reversed(m(low)))
        fan = [(sum(p[0] for p in scl) / len(scl), sum(p[1] for p in scl) / len(scl))] + scl
        decal(f"{name}_sclera{sx:+d}", c, head,
              (fan, [(0, i + 1, i + 2) for i in range(len(scl) - 1)] + [(0, len(scl), 1)]), white, 1, k)
        icx = sx * 0.040
        icz = -0.004 - e["open"] * 0.45 + e["tilt"] * 0.5
        decal(f"{name}_iris{sx:+d}", c, head, ellipse(icx, icz, e["iris"] * 0.8, min(e["iris"], e["open"] * 0.62)),
              iris, 2, k)
        decal(f"{name}_hi{sx:+d}", c, head, ellipse(icx + sx * 0.003, icz + 0.003, 0.0022, 0.0022, 8), hi, 3, k)
        decal(f"{name}_lid{sx:+d}", c, head, stroke(m(lid + [(x1 + 0.006, lid[-1][1] - 0.004)]), 0.0035, 0.006),
              ink, 4, k)
        decal(f"{name}_low{sx:+d}", c, head, stroke(m(low[4:]), 0.0012, 0.0022), ink, 4, k)
        bz = 0.026 + e["arch"]
        brow = [(x0 - 0.002 + 0.048 * t, bz + e["brow"] * 0.03 * (0.5 - t) * 2 + 0.006 * math.sin(math.pi * t))
                for t in (i / 7 for i in range(8))]
        decal(f"{name}_brow{sx:+d}", c, head, stroke(m(brow), e["brow_w"] * 1.3, e["brow_w"] * 0.6), ink, 4, k)
    decal(f"{name}_nose", c, head, stroke([(0.007, -0.022), (0.006, -0.040), (0.0, -0.046)], 0.0012, 0.0024),
          ink, 4, k)
    decal(f"{name}_mouth", c, head, stroke(arc_pts(-0.014, 0.014, -0.076, -0.076, 0.0015, 6), 0.0016, 0.0016),
          ink, 4, k)
