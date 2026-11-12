"""NumPy flock of paper pages -> PC2 vertex cache driven by a Mesh Cache modifier. See plan/0b-swarm.md."""
import math
import os

import numpy as np

import common as C
import whale

N = 16000
STRAY = 0.05
PW, PL = 0.13, 0.19
V = 6.0
F0, F1 = C.SHOT2[0] - 1, C.SHOT2[1] + 1          # cached frames 72..241
CV = np.array([0.5, 15.0, 6.0])
R0 = 4.0
E1 = np.array([0.0, -math.sin(math.radians(20)), -math.cos(math.radians(20))])   # loop "down" axis
E2 = np.array([1.0, 0.0, 0.0])                                                    # loop "right" axis
J = CV + R0 * E1
BEZ = np.array([[-9.5, 11.2, 7.2], [-5.5, 11.6, 6.4], J - 5.0 * E2 + [0, 0, 0.3], J])
UP = np.array([0.0, 0.0, 1.0])


# ---------------------------------------------------------------- quaternions (w, x, y, z)
def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def q_axis(axis, ang):
    h = 0.5 * np.asarray(ang)[..., None]
    return np.concatenate([np.cos(h), unit(axis) * np.sin(h)], -1)


def q_mul(a, b):
    w1, x1, y1, z1 = np.moveaxis(a, -1, 0)
    w2, x2, y2, z2 = np.moveaxis(b, -1, 0)
    return np.stack([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2], -1)


def q_from_frame(y_axis, z_axis):
    """Rotation whose local +Y maps to y_axis and +Z to (orthogonalised) z_axis."""
    y = unit(y_axis)
    x = unit(np.cross(y, z_axis))
    z = np.cross(x, y)
    m = np.stack([x, y, z], -1)
    tr = m[:, 0, 0] + m[:, 1, 1] + m[:, 2, 2]
    q = np.stack([1 + tr, 1 + m[:, 0, 0] - m[:, 1, 1] - m[:, 2, 2],
                  1 - m[:, 0, 0] + m[:, 1, 1] - m[:, 2, 2], 1 - m[:, 0, 0] - m[:, 1, 1] + m[:, 2, 2]], -1)
    k = np.argmax(q, -1)
    s = np.sqrt(np.maximum(q[np.arange(len(k)), k], 1e-12)) * 2
    w = np.where(k == 0, s / 4, 0)
    out = np.empty((len(k), 4))
    r21, r02, r10 = m[:, 2, 1] - m[:, 1, 2], m[:, 0, 2] - m[:, 2, 0], m[:, 1, 0] - m[:, 0, 1]
    a01, a02, a12 = m[:, 0, 1] + m[:, 1, 0], m[:, 0, 2] + m[:, 2, 0], m[:, 1, 2] + m[:, 2, 1]
    out[:] = np.select([k[:, None] == 0, k[:, None] == 1, k[:, None] == 2, k[:, None] == 3], [
        np.stack([w, r21 / s, r02 / s, r10 / s], -1),
        np.stack([r21 / s, s / 4 + 0 * w, a01 / s, a02 / s], -1),
        np.stack([r02 / s, a01 / s, s / 4 + 0 * w, a12 / s], -1),
        np.stack([r10 / s, a02 / s, a12 / s, s / 4 + 0 * w], -1)])
    return unit(out)


def q_slerp(a, b, e):
    d = np.sum(a * b, -1)
    b = np.where(d[:, None] < 0, -b, b)
    d = np.abs(d)
    th = np.arccos(np.clip(d, -1, 1))
    sn = np.sin(th)
    small = sn < 1e-4
    wa = np.where(small, 1 - e, np.sin((1 - e) * th) / np.where(small, 1, sn))
    wb = np.where(small, e, np.sin(e * th) / np.where(small, 1, sn))
    return unit(a * wa[:, None] + b * wb[:, None])


def q_rotate(q, v):
    """Rotate per-page local vectors v (N,K,3) by q (N,4)."""
    w, u = q[:, None, :1], q[:, None, 1:]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


# ---------------------------------------------------------------- path
def _bezier_table(n=400):
    u = np.linspace(0, 1, n)[:, None]
    p = ((1 - u) ** 3) * BEZ[0] + 3 * ((1 - u) ** 2) * u * BEZ[1] + 3 * (1 - u) * u * u * BEZ[2] + u ** 3 * BEZ[3]
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])
    tan = unit(np.gradient(p, axis=0))
    return p, tan, cum


P_TAB, T_TAB, CUM = _bezier_table()
LB = CUM[-1]


def ring_radius(t):
    return R0 - 1.2 * C.smooth((t - 2.2) / 1.8)


def path(s, t, rscale=1.0):
    """Centre-line position and tangent for arc-lengths s (N,) at time t."""
    pos = np.empty((len(s), 3))
    tan = np.empty((len(s), 3))
    pre, mid, post = s < 0, (s >= 0) & (s <= LB), s > LB
    pos[pre] = P_TAB[0] + T_TAB[0] * s[pre, None]
    tan[pre] = T_TAB[0]
    for k in range(3):
        pos[mid, k] = np.interp(s[mid], CUM, P_TAB[:, k])
        tan[mid, k] = np.interp(s[mid], CUM, T_TAB[:, k])
    sp = s[post] - LB
    k = C.smooth(sp / 8.0)
    R = (R0 + (ring_radius(t) - R0) * k) * (1 + ((rscale[post] if np.ndim(rscale) else rscale) - 1) * k)
    a = (sp / R)[:, None]
    pos[post] = CV + R[:, None] * (np.cos(a) * E1 + np.sin(a) * E2)
    tan[post] = -np.sin(a) * E1 + np.cos(a) * E2
    return pos, unit(tan)


# ---------------------------------------------------------------- flock
class Flock:
    def __init__(self, seed=7):
        rng = np.random.default_rng(seed)
        self.u = np.sort(rng.random(N))
        self.r = np.sqrt(rng.random(N))
        self.th = rng.uniform(0, 2 * math.pi, N)
        self.stray = rng.random(N) < STRAY
        self.rscale = np.where(self.stray, 1.4, 1.0)
        self.ph = rng.uniform(0, 2 * math.pi, (N, 6))
        self.om = rng.uniform(0.7, 1.6, (N, 3))
        self.roll_w = rng.uniform(2.0, 6.0, N) * np.where(rng.random(N) < 0.5, -1, 1)
        self.wob_axis = unit(rng.normal(size=(N, 3)))
        self.flap_w = rng.uniform(5.0, 9.0, N)
        self.waves = [(unit(rng.normal(size=3)) * 0.35, rng.uniform(1.2, 2.0), unit(rng.normal(size=3)))
                      for _ in range(3)]
        self.arc = unit(rng.normal(size=(N, 3)) + [0, 0, 1.2]) * rng.uniform(0.3, 1.5, (N, 1))
        tg = whale.targets(N, rng)
        order = np.argsort(tg["s"] + 0.1 * rng.random(N))
        self.tg = {k: v[order] for k, v in tg.items()}
        self.tc = 3.6 + 1.2 * self.tg["s"] + 0.2 * rng.random(N)
        self.cell = rng.integers(0, 4, N)
        self.local = self._local_template()

    @staticmethod
    def _local_template():
        y = np.array([-PL / 2, 0, PL / 2])
        x = np.array([-PW / 2, PW / 2])
        yy, xx = np.meshgrid(y, x, indexing="ij")
        return np.stack([xx, yy, np.zeros_like(xx)], -1).reshape(6, 3)

    def state(self, t):
        s = V * (t + 0.3 - 3.0 * self.u)
        c, tan = path(s, t, self.rscale)
        ring = C.smooth((s - LB + 2.0) / 6.0)
        rt = (0.6 + 0.6 * ring) * np.sqrt(np.sin(math.pi * self.u)) + 0.15
        n_ax = unit(np.cross(tan, UP))
        b_ax = np.cross(n_ax, tan)
        off = (rt * self.r)[:, None] * (np.cos(self.th)[:, None] * n_ax + np.sin(self.th)[:, None] * b_ax)
        flow = c + off
        flow += 0.2 * np.sin(self.om * t + self.ph[:, :3])
        for k, w, d in self.waves:
            flow += 0.5 * np.sin(flow @ k + w * t)[:, None] * d
        flow[:, 2] -= self.stray * 0.15 * max(t - 3.6, 0.0)
        e = np.where(self.stray, 0.0, C.smoother((t - self.tc) / 1.1))
        wp, wn, wt = whale.pose(self.tg, t)
        jitter = 0.03 * np.sin(3.0 * t + self.ph[:, 3])
        wp = wp + wn * jitter[:, None]
        pos = flow * (1 - e)[:, None] + wp * e[:, None] + (np.sin(math.pi * e))[:, None] * self.arc
        q_flow = q_from_frame(tan, b_ax)
        q_fly = q_mul(q_mul(q_flow, q_axis(np.tile([0, 1.0, 0], (N, 1)), self.ph[:, 4] + self.roll_w * t)),
                      q_axis(self.wob_axis, 0.6 * np.sin(1.7 * t + self.ph[:, 5])))
        q_tgt = q_mul(q_axis(wn, 0.14 * np.sin(3.0 * t + self.ph[:, 5])), q_from_frame(wt, wn))
        q = q_slerp(q_fly, q_tgt, e)
        bend = (0.035 * np.sin(self.flap_w * t + self.ph[:, 0]) * (1 - 0.85 * e) + 0.008)
        return pos, q, bend, e

    def verts(self, t):
        pos, q, bend, e = self.state(t)
        loc = np.repeat(self.local[None], N, 0)
        loc[:, 2:4, 2] = bend[:, None]
        return (pos[:, None, :] + q_rotate(q, loc)).reshape(-1, 3), pos, e

    def faces_uvs(self):
        f = np.array([[0, 1, 3, 2], [2, 3, 5, 4]])
        faces = (f[None] + 6 * np.arange(N)[:, None, None]).reshape(-1, 4)
        cu, cv = (self.cell % 2)[:, None], (self.cell // 2)[:, None]
        lu = (self.local[:, 0] / PW + 0.5)[None]
        lv = (self.local[:, 1] / PL + 0.5)[None]
        uv = np.stack([(cu + 0.04 + 0.92 * lu) / 2, (cv + 0.04 + 0.92 * lv) / 2], -1)
        return faces, uv.reshape(-1, 2)


def build(paper):
    fl = Flock()
    faces, uv = fl.faces_uvs()
    frames, stats = [], []
    prev = None
    for f in range(F0, F1 + 1):
        t = (f - C.SHOT2[0]) / C.FPS
        v, pos, e = fl.verts(t)
        frames.append(v.astype(np.float32))
        flock = ~fl.stray
        spd = 0.0 if prev is None else float(np.mean(np.linalg.norm(pos - prev, axis=1)) * C.FPS)
        stats.append({"frame": f, "t": round(t, 4), "speed": round(spd, 3),
                      "formed": round(float(np.mean(e[flock])), 4),
                      "centroid": [round(float(x), 3) for x in pos[flock].mean(0)]})
        prev = pos
    path_ = os.path.join(C.CACHE, "swarm.pc2")
    C.write_pc2(path_, frames, F0)
    ob = C.mesh_np("swarm", frames[0], faces, uvs=uv[faces.ravel()],
                   smooth_shade=True, material=paper)
    C.attach_pc2(ob, path_, F0)
    print(f"[swarm] pages={N} frames={len(frames)} verts={len(frames[0])} cache={os.path.getsize(path_) >> 20}MB")
    return stats
