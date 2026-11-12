"""Diamond-mesh basketball nets; the target net is deformed by the ball with one shape key per frame."""
import math

import bpy

from common import BALL_R, FRAMES, HOOP, HOOP2, RIM_R, coll, key, mat, mesh_obj, tau_of_frame

N = 12          # loops around the rim
L = 7           # levels
DZ = 0.068


def radius(i):
    return RIM_R - 0.004 - 0.085 * (i / (L - 1)) ** 0.8


def rest_verts():
    out = []
    for i in range(L):
        for j in range(N):
            a = 2 * math.pi * (j + 0.5 * (i % 2)) / N
            out.append((radius(i), a, -0.012 - i * DZ))
    return out


def faces():
    fs = []
    idx = lambda i, j: i * N + (j % N)
    for i in range(L - 2):
        for j in range(N):
            o = i % 2
            fs.append((idx(i, j), idx(i + 1, j + o), idx(i + 2, j), idx(i + 1, j - 1 + o)))
    return fs


def make_net(name, centre):
    c = coll("Props")
    cord = mat("NetCord", "#f3f1ea", rough=0.75, sss=0.1)
    vs = [(r * math.cos(a), r * math.sin(a), z) for r, a, z in rest_verts()]
    ob = mesh_obj(name, vs, faces(), c, cord)
    ob.location = (centre[0], centre[1], centre[2])
    w = ob.modifiers.new("Cord", "WIREFRAME")
    w.thickness = 0.0065
    w.use_even_offset = True
    w.use_relative_offset = False
    w.use_replace = True
    s = ob.modifiers.new("Smooth", "SUBSURF")
    s.levels = 1
    s.render_levels = 1
    return ob


def deform(rest, ball_local, t, pass_tau):
    """Vertex positions for one frame given ball centre in net-local coords."""
    bx, by, bz = ball_local
    out = []
    for n, (r, a, z) in enumerate(rest):
        i = n // N
        x, y = r * math.cos(a), r * math.sin(a)
        dz = z - bz
        reach = BALL_R + 0.016
        if abs(dz) < reach * 1.6:
            need = math.sqrt(max(0.0, reach ** 2 - min(abs(dz), reach) ** 2))
            # vertex pushed outward from the ball's vertical axis until it clears the ball
            ox, oy = x - bx, y - by
            d = math.hypot(ox, oy) or 1e-6
            soft = math.exp(-max(0.0, abs(dz) - reach) * 25.0)
            grow = max(0.0, need - d) * soft
            x += ox / d * grow
            y += oy / d * grow
            if bz < z + 0.04:
                z -= 0.03 * soft * (i / (L - 1))
        tp = pass_tau.get(i)
        if tp is not None and t > tp:
            u = t - tp
            amp = math.exp(-u / 0.45) * (0.4 + 0.6 * i / (L - 1))
            z += 0.045 * amp * math.sin(2 * math.pi * 3.2 * u)
            rr = 1.0 + 0.06 * amp * math.sin(2 * math.pi * 3.2 * u + 1.3)
            x *= rr
            y *= rr
        out.append((x, y, z))
    return out


def bake_swish(net, positions):
    """positions: ball world position for every frame (from ball.bake)."""
    rest = rest_verts()
    cx, cy, cz = HOOP
    levels = [(-0.012 - i * DZ) for i in range(L)]
    pass_tau, active = {}, []
    for f, p in enumerate(positions):
        loc = (p[0] - cx, p[1] - cy, p[2] - cz)
        near = math.hypot(loc[0], loc[1]) < RIM_R + 0.2 and -0.8 < loc[2] < 0.35
        t = tau_of_frame(f)
        for i, lz in enumerate(levels):
            if i not in pass_tau and near and loc[2] < lz:
                pass_tau[i] = t
        if near or (pass_tau and t - min(pass_tau.values()) < 2.0):
            active.append((f, loc, t))
    if not active:
        print("[net] ball never reached the net")
        return
    net.shape_key_add(name="Basis", from_mix=False)
    for f, loc, t in active:
        sk = net.shape_key_add(name=f"f{f:03d}", from_mix=False)
        for v, (x, y, z) in zip(sk.data, deform(rest, loc, t, pass_tau)):
            v.co = (x, y, z)
        for ff, val in ((f - 1, 0.0), (f, 1.0), (f + 1, 0.0)):
            if 0 <= ff <= FRAMES:
                key(sk, "value", ff, val)
    print(f"[net] {len(active)} swish shape keys, frames {active[0][0]}-{active[-1][0]}")


def build():
    target = make_net("NetTarget", HOOP)
    make_net("NetOther", HOOP2)
    return target
