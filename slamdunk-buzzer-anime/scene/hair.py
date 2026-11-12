"""Anime hair: a scalp cap plus clumped tapered strands swept along quadratic Bezier paths."""
import math
import random

from mathutils import Vector

from common import mesh_obj
from toon import outline, tmat

HAIR_R = Vector((0.101, 0.114, 0.122))


def cap(k, front=0.45, side=0.08, back=-0.7, scale=1.0):
    """Ellipsoid scalp kept only above a hairline that drops from the brow to the nape."""
    seg, rings = 72, 44
    vs, fs = [], []
    for r in range(rings + 1):
        th = math.pi * r / rings
        for s in range(seg):
            ph = 2 * math.pi * s / seg
            u = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
            vs.append(Vector((u.x * HAIR_R.x, u.y * HAIR_R.y * (1.06 if u.y > 0 else 1.0), u.z * HAIR_R.z))
                      * scale * k + Vector((0, 0.006 * k, 0.012 * k)))
    for r in range(rings):
        for s in range(seg):
            a, b = r * seg + s, r * seg + (s + 1) % seg
            q = (a, b, b + seg, a + seg)
            cz = sum(vs[i].z for i in q) / 4 / (HAIR_R.z * k)
            cy = sum(vs[i].y for i in q) / 4 / (HAIR_R.y * k)
            line = side + (front - side) * max(0.0, -cy) + (back - side) * max(0.0, cy)
            if cz > line:
                fs.append(q)
    return [tuple(v) for v in vs], fs


def strand(verts, faces, root, ctrl, tip, width, thick, centre=Vector((0, 0, 0)), n=9, sides=6):
    """Append one tapered clump (lens cross-section) to verts/faces."""
    root, ctrl, tip = Vector(root), Vector(ctrl), Vector(tip)
    base = len(verts)
    for i in range(n + 1):
        t = i / n
        p = (1 - t) ** 2 * root + 2 * (1 - t) * t * ctrl + t * t * tip
        tan = (2 * (1 - t) * (ctrl - root) + 2 * t * (tip - ctrl)).normalized()
        nrm = (p - centre).normalized()
        side = tan.cross(nrm).normalized()
        nrm = side.cross(tan).normalized()
        w = width * (1 - t) ** 0.75 + 1e-4
        h = thick * (1 - t) ** 0.6 + 1e-4
        for j in range(sides):
            a = 2 * math.pi * j / sides
            verts.append(tuple(p + side * math.cos(a) * w / 2 + nrm * math.sin(a) * h / 2))
    for i in range(n):
        for j in range(sides):
            a = base + i * sides + j
            b = base + i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))


def _merge(parts):
    vs, fs = [], []
    for pv, pf in parts:
        o = len(vs)
        vs += list(pv)
        fs += [tuple(i + o for i in f) for f in pf]
    return vs, fs


def style_wolf(k, rng):
    """Layered wolf cut: side-swept asymmetric fringe, flared side layers, nape flicks."""
    vs, fs = [], []
    for i in range(9):
        u = i / 8
        root = (0.035 - 0.05 * u, -0.03, 0.122)
        ctrl = (0.02 - 0.11 * u, -0.13, 0.085 - 0.02 * u)
        tip = (-0.01 - 0.085 * u + rng.uniform(-0.005, 0.005), -0.116, 0.035 - 0.05 * u)
        strand(vs, fs, root, ctrl, tip, 0.046, 0.016)
    for i in range(3):
        strand(vs, fs, (0.045 + 0.012 * i, -0.04, 0.115), (0.08, -0.12, 0.08), (0.09 + 0.006 * i, -0.105, 0.04),
               0.036, 0.014)
    for sx in (1, -1):
        for j in range(5):
            yy = -0.04 + 0.035 * j
            strand(vs, fs, (sx * 0.065, yy, 0.1), (sx * 0.12, yy, 0.02),
                   (sx * (0.125 + 0.012 * (j % 2)), yy + 0.01, -0.06), 0.04, 0.015)
    for j in range(7):
        x = (j - 3) * 0.026
        strand(vs, fs, (x * 0.5, 0.06, 0.12), (x * 1.1, 0.14, 0.0),
               (x * 1.6 + 0.012 * (1 if x >= 0 else -1), 0.115, -0.115 - 0.012 * (j % 2)), 0.042, 0.015)
    for j in range(8):
        a = 2 * math.pi * j / 8 + 0.3
        strand(vs, fs, (0, 0.015, 0.132), (0.075 * math.cos(a), 0.015 + 0.075 * math.sin(a), 0.15),
               (0.115 * math.cos(a), 0.02 + 0.115 * math.sin(a), 0.085), 0.05, 0.018)
    return vs, fs


def style_spiky_band(k, rng):
    """Short upright spikes (a headband is added separately in build)."""
    vs, fs = [], []
    for j in range(34):
        th = math.acos(rng.uniform(0.15, 1.0))
        ph = rng.uniform(0, 2 * math.pi)
        d = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
        if d.y < -0.55 and d.z < 0.6:
            continue
        p = Vector((d.x * HAIR_R.x, d.y * HAIR_R.y, d.z * HAIR_R.z)) + Vector((0, 0.006, 0.012))
        tip_dir = (d + Vector((0, 0.15, 0.8))).normalized()
        L = rng.uniform(0.045, 0.075)
        strand(vs, fs, p - d * 0.01, p + tip_dir * L * 0.5, p + tip_dir * L, 0.05, 0.02)
    return vs, fs


def style_ponytail(k, rng):
    """Swept-back hair with a low ponytail and two face-framing strands."""
    vs, fs = [], []
    tie = Vector((0, 0.115, -0.045))
    for j in range(10):
        a = 2 * math.pi * j / 10
        o = Vector((0.018 * math.cos(a), 0.012 * math.sin(a), 0.018 * math.sin(a)))
        strand(vs, fs, tie + o, tie + o * 1.6 + Vector((0, 0.06, -0.08)),
               tie + o * 0.8 + Vector((rng.uniform(-0.02, 0.02), 0.04, -0.24)), 0.04, 0.018)
    for j in range(9):
        x = (j - 4) * 0.022
        strand(vs, fs, (x * 1.1, -0.08, 0.1), (x * 1.25, -0.02, 0.15), (x * 0.4, 0.105, -0.02), 0.045, 0.012)
    for sx in (1, -1):
        strand(vs, fs, (sx * 0.06, -0.06, 0.09), (sx * 0.1, -0.1, 0.0), (sx * 0.095, -0.085, -0.08), 0.028, 0.012)
    return vs, fs


STYLES = {"wolf": (style_wolf, 0.30), "spiky_band": (style_spiky_band, 0.42), "ponytail": (style_ponytail, 0.5)}


def headband(name, c, head, k):
    seg, ring, vs, fs = 48, 8, [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(ring):
            b = 2 * math.pi * j / ring
            r = 1.0 + 0.012 * math.cos(b) / 0.1
            vs.append((HAIR_R.x * 1.04 * r * math.cos(a) * k, (HAIR_R.y * 1.02 * r * math.sin(a) + 0.006) * k,
                       (0.055 - 0.03 * math.sin(a) + 0.016 * math.sin(b)) * k))
    for i in range(seg):
        for j in range(ring):
            a, b = i * ring + j, i * ring + (j + 1) % ring
            a2, b2 = ((i + 1) % seg) * ring + j, ((i + 1) % seg) * ring + (j + 1) % ring
            fs.append((a, a2, b2, b))
    ob = mesh_obj(f"{name}_headband", vs, fs, c, tmat("Headband", "#f8f8f4", "#b7b9cf", rim=0.2), smooth_shade=True)
    ob.parent = head
    outline(ob, 0.004 * k)
    return ob


def build(name, c, head, k, style, color, shadow=None):
    rng = random.Random(sum(map(ord, name)))
    fn, front = STYLES[style]
    parts = [cap(k, front=front)]
    sv, sf = fn(k, rng)
    parts.append(([tuple(Vector(v) * k) for v in sv], sf))
    vs, fs = _merge(parts)
    ob = mesh_obj(f"{name}_hair", vs, fs, c, tmat(f"Hair_{name}", color, shadow, rim=0.45),
                  smooth_shade=True)
    ob.parent = head
    outline(ob, 0.005 * k)
    if style == "spiky_band":
        headband(name, c, head, k)
    return ob
