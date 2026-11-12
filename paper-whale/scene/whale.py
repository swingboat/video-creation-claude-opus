"""Whale target point cloud (local frame: +x head, +z up) and its swimming pose over time.

See plan/0b-swarm.md. Every page gets: local position, surface normal, tangent, body coordinate s
(0 = snout, 1 = flukes) used for both the arrival order and the tail undulation.
"""
import math

import numpy as np

import common as C

L = 9.0
R_MAX = 1.2
YAW, PITCH, ROLL = math.radians(-25), math.radians(8), math.radians(-30)
DRIFT = 0.25


def radius(s):
    s = np.clip(s, 0, 1)
    return R_MAX * (s ** 0.5) * (1 - s) ** 0.85 / 0.41 + 0.1 * s


def body_point(s, phi):
    r = radius(s)
    z = 0.85 * r * np.sin(phi)
    z = np.where(z < 0, z * 0.8, z * (0.75 + 0.25 * np.clip(s / 0.3, 0, 1)))
    return np.stack([L / 2 - s * L, r * np.cos(phi), z], -1)


def _unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def _body(n, rng):
    s = []
    while len(s) < n:
        c = rng.uniform(0.005, 0.995, n * 2)
        s.extend(c[rng.random(n * 2) < radius(c) / R_MAX])
    s = np.array(s[:n])
    phi = rng.uniform(0, 2 * math.pi, n)
    p = body_point(s, phi)
    ds = body_point(s + 1e-3, phi) - body_point(s - 1e-3, phi)
    dp = body_point(s, phi + 1e-3) - body_point(s, phi - 1e-3)
    nrm = _unit(np.cross(ds, dp))
    ref = p.copy()
    ref[:, 0] = np.where(s < 0.5, 0.3, -0.3)
    nrm *= np.where(np.sum(nrm * ref, -1) < 0, -1.0, 1.0)[:, None]
    return p, nrm, _unit(-ds), s


def _pectoral(n, rng):
    side = np.where(rng.random(n) < 0.5, -1.0, 1.0)
    a = rng.uniform(0.12, 1.0, n)   # skip the root segment that would sit inside the body
    b = rng.uniform(-1, 1, n)
    s0 = 0.3
    r0 = radius(s0)
    root = np.stack([np.full(n, L / 2 - s0 * L), side * r0 * 0.95, np.full(n, -0.4 * r0)], -1)
    d = _unit(np.stack([np.full(n, -0.5), side * 0.55, np.full(n, -0.75)], -1))
    chord = _unit(np.cross(np.array([0, 0, 1.0]), d) * side[:, None])
    width = 0.55 * (1 - a) + 0.1 * a
    p = root + d * (a * 3.0)[:, None] + chord * (b * width / 2)[:, None]
    nrm = _unit(np.cross(d, chord))
    nrm *= np.where(np.sum(nrm * [0.0, -1.0, -0.5], -1) < 0, -1.0, 1.0)[:, None]   # face the camera side
    return p, nrm, d, np.full(n, s0)


def _dorsal(n, rng):
    a = rng.random(n)
    c = rng.random(n) * (1 - a) ** 0.7
    s = 0.64 + 0.08 * a
    top = 0.85 * radius(s)
    p = np.stack([L / 2 - s * L - 0.25 * c, rng.normal(0, 0.01, n), top + 0.35 * c], -1)
    nrm = np.stack([np.zeros(n), np.where(rng.random(n) < 0.5, -1.0, 1.0), np.zeros(n)], -1)
    return p, nrm, np.tile([0, 0, 1.0], (n, 1)), s


def _flukes(n, rng):
    span = 1.7
    y = []
    while len(y) < n:
        c = rng.uniform(-span, span, n * 2)
        y.extend(c[rng.random(n * 2) < np.sqrt(np.clip(1 - (np.abs(c) / span) ** 2, 0, 1))])
    y = np.array(y[:n])
    ay = np.abs(y) / span
    x_le = -L / 2 + 0.2 - 0.6 * ay ** 1.5
    chord = 0.9 * np.sqrt(np.clip(1 - ay ** 2, 0.02, 1)) * (0.55 + 0.45 * np.clip(ay * 4, 0, 1))
    f = rng.random(n)
    p = np.stack([x_le - f * chord, y, rng.normal(0, 0.015, n)], -1)
    nrm = np.stack([np.zeros(n), np.zeros(n), np.where(rng.random(n) < 0.5, -1.0, 1.0)], -1)
    return p, nrm, np.tile([-1.0, 0, 0], (n, 1)), np.ones(n)


def targets(n, rng):
    """Return dict(pos, normal, tangent, s, part) in the whale's local frame, shuffled."""
    counts = [int(n * 0.78), int(n * 0.10), int(n * 0.02)]
    counts.append(n - sum(counts))
    parts = [_body, _pectoral, _dorsal, _flukes]
    ps, ns, ts, ss, ids = [], [], [], [], []
    for k, (fn, c) in enumerate(zip(parts, counts)):
        p, nr, tg, s = fn(c, rng)
        p = p + nr * rng.uniform(-0.06, 0.06, c)[:, None]
        ps.append(p)
        ns.append(nr)
        ts.append(tg)
        ss.append(s)
        ids.append(np.full(c, k))
    out = {k: np.concatenate(v) for k, v in zip(("pos", "normal", "tangent", "s", "part"), (ps, ns, ts, ss, ids))}
    t, nr = out["tangent"], out["normal"]
    t = _unit(t - nr * np.sum(t * nr, -1, keepdims=True))
    b = np.cross(nr, t)
    nr = _unit(nr + t * rng.uniform(-0.5, 0.5, (n, 1)) + b * rng.uniform(-0.6, 0.6, (n, 1)))
    out["normal"] = nr
    t = _unit(t - nr * np.sum(t * nr, -1, keepdims=True))
    b = np.cross(nr, t)
    tw = rng.uniform(-math.radians(25), math.radians(25), n)
    out["tangent"] = _unit(t * np.cos(tw)[:, None] + b * np.sin(tw)[:, None])
    return out


def _rot():
    cy, sy = math.cos(YAW), math.sin(YAW)
    cp, sp = math.cos(PITCH), math.sin(PITCH)
    rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    ry = np.array([[cp, 0, -sp], [0, 1, 0], [sp, 0, cp]])
    cr, sr = math.cos(ROLL), math.sin(ROLL)
    rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    return rz @ ry @ rx


def amplitude(t):
    return 0.15 + 0.2 * C.smooth((t - 4.5) / 1.5)


def pose(tg, t):
    """World-space (pos, normal, tangent) of every target at shot-2 time t (seconds)."""
    p = tg["pos"].copy()
    s = tg["s"]
    w = 2.2 * t - 3.5 * s
    p[:, 2] += amplitude(t) * s ** 2 * np.sin(w)
    dzdx = -amplitude(t) * (2 * s * np.sin(w) - 3.5 * s ** 2 * np.cos(w)) / L
    tilt = np.arctan(dzdx) * (tg["part"] == 3)
    nr = tg["normal"].copy()
    tn = tg["tangent"].copy()
    c, sn = np.cos(tilt), np.sin(tilt)
    for v in (nr, tn):
        x, z = v[:, 0].copy(), v[:, 2].copy()
        v[:, 0], v[:, 2] = c * x - sn * z, sn * x + c * z
    R = _rot()
    head = R @ np.array([1.0, 0, 0])
    center = np.array(C.WHALE_C) + head * DRIFT * t
    return p @ R.T + center, nr @ R.T, tn @ R.T
