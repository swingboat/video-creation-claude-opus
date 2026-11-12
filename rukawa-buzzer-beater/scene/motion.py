"""Choreography: per-character root path, heading and pose as functions of story time tau."""
import math

from common import HOOP, clamp, event, lerp, ramp, smooth
import poses as P

SPECS = {
    "Rukawa": dict(height=1.87, jersey="#c8141e", trim="#111111", number_col="#ffffff", number=11,
                   team="SHOHOKU", hair="rukawa", hair_col="#0c0c10", shoe="#b5121b", wristband=True),
    "Sakuragi": dict(height=1.89, jersey="#c8141e", trim="#111111", number_col="#ffffff", number=10,
                     team="SHOHOKU", hair="sakuragi", hair_col="#d81e10", shoe="#1c1c1c",
                     skin="#e6ac85"),
    "Defender": dict(height=1.84, jersey="#f2f2f2", trim="#1b2a55", number_col="#1b2a55", number=9,
                     team="SANNOH", hair="short", hair_col="#15130f", shoe="#f2f2f2", skin="#d9a27c"),
}

TAKEOFF, RELEASE_T, LANDING = 4.4, 4.75, 5.1
SLAP_T = 9.0

SLUMP = P.pose(spine=(38, 0, 0), chest=(10, 0, 0), head=(-30, 0, 0),
               thigh_L=(45, 8, 0), thigh_R=(45, 8, 0), shin_L=(50, 0, 0), shin_R=(50, 0, 0),
               foot_L=(-10, 0, 0), foot_R=(-10, 0, 0),
               upperarm_L=(55, 12, 0), upperarm_R=(55, 12, 0), forearm_L=(10, 0, 0),
               forearm_R=(10, 0, 0))


def mirror(p):
    out = {}
    for j, v in p.items():
        if j.endswith("_L") or j.endswith("_R"):
            o = j[:-1] + ("R" if j.endswith("_L") else "L")
            out[o] = v
        else:
            out[j] = (v[0], -v[1], -v[2])
    return out


HIGH_FIVE_L = mirror(P.HIGH_FIVE_R)


# ---------------------------------------------------------------- path helpers
def track(pts, t):
    """Cubic Hermite (Catmull-Rom) through [(t, x, y)], clamped at the ends."""
    if t <= pts[0][0]:
        return pts[0][1], pts[0][2]
    if t >= pts[-1][0]:
        return pts[-1][1], pts[-1][2]
    i = max(j for j in range(len(pts) - 1) if pts[j][0] <= t)
    p0, p1 = pts[max(i - 1, 0)], pts[i]
    p2, p3 = pts[i + 1], pts[min(i + 2, len(pts) - 1)]
    h = p2[0] - p1[0]
    u = (t - p1[0]) / h
    out = []
    for k in (1, 2):
        m1 = (p2[k] - p0[k]) / max(p2[0] - p0[0], 1e-6) * h
        m2 = (p3[k] - p1[k]) / max(p3[0] - p1[0], 1e-6) * h
        out.append((2 * u**3 - 3 * u**2 + 1) * p1[k] + (u**3 - 2 * u**2 + u) * m1 +
                   (-2 * u**3 + 3 * u**2) * p2[k] + (u**3 - u**2) * m2)
    return tuple(out)


def vel(pts, t, d=0.04):
    a, b = track(pts, t - d), track(pts, t + d)
    return (b[0] - a[0]) / (2 * d), (b[1] - a[1]) / (2 * d)


def ang_to(a, b):
    return math.atan2(b[1] - a[1], b[0] - a[0])


def lerp_ang(a, b, t):
    d = (b - a + math.pi) % (2 * math.pi) - math.pi
    return a + d * t


def dist_along(pts, t, step=0.02, t0=-4.0):
    """Arc length travelled since t0 (for gait phase)."""
    s, prev, x = 0.0, track(pts, t0), t0
    while x < t:
        x = min(t, x + step)
        cur = track(pts, x)
        s += math.hypot(cur[0] - prev[0], cur[1] - prev[1])
        prev = cur
    return s


def jump(t, t0, t1):
    if t <= t0 or t >= t1:
        return 0.0
    T = t1 - t0
    v0 = 9.81 * T / 2
    u = t - t0
    return v0 * u - 0.5 * 9.81 * u * u


def leg_offset(p, k):
    """Root height so the lower foot touches the floor (FK legs, no IK)."""
    ext = []
    for s in ("L", "R"):
        a = math.radians(p[f"thigh_{s}"][0])
        b = math.radians(p[f"shin_{s}"][0])
        ext.append(0.45 * k * math.cos(a) + 0.44 * k * math.cos(a - b))
    rest = 0.45 * k + 0.44 * k * math.cos(math.radians(4))
    return max(ext) - rest


# ---------------------------------------------------------------- Rukawa
RUK_PATH = [(-4.0, -6.0, 4.6), (0.0, -4.0, 4.5), (0.8, -2.0, 4.4), (1.6, 0.4, 4.2),
            (2.0, 1.2, 3.5), (2.5, 2.3, 2.9), (3.2, 3.9, 3.15), (3.9, 5.35, 3.55),
            (4.35, 5.6, 3.6), (5.1, 5.55, 3.65), (6.4, 5.55, 3.65), (7.3, 6.1, 3.1),
            (8.3, 6.45, 2.55), (9.4, 6.4, 2.5), (10.4, 5.4, 3.3), (14.5, 2.4, 4.8)]


def dribble_phase(t):
    return (t / 0.5) % 1.0


def rukawa(t, k):
    x, y = track(RUK_PATH, t)
    vx, vy = vel(RUK_PATH, t)
    vdir = math.atan2(vy, vx)
    face_hoop = ang_to((x, y), HOOP)
    if t < 3.9:
        h = vdir if t > -3.9 else 0.0
    elif t < 6.4:
        h = lerp_ang(vdir, face_hoop, ramp(t, 3.9, 4.3))
    elif t < 8.2:
        h = lerp_ang(face_hoop, vdir, ramp(t, 6.4, 6.9))
    elif t < 9.4:
        h = lerp_ang(vdir, ang_to((x, y), sakuragi_xy(t)), ramp(t, 8.2, 8.6))
    else:
        h = lerp_ang(ang_to((x, y), sakuragi_xy(t)), vdir, ramp(t, 9.4, 9.9))
    phase = dist_along(RUK_PATH, t) / 2.6
    if t < 0:
        p = P.ATHLETIC
    elif t < 4.25:
        run = P.run_cycle(phase, amt=0.85 * ramp(t, 0.0, 0.4) * (1 - ramp(t, 3.7, 4.1)) + 0.05)
        side = "R" if t < 1.85 else "L"
        p = P.dribble_arm(run, dribble_phase(t), side)
        p = P.mix(p, P.GATHER, ramp(t, 3.95, 4.25))
    elif t < TAKEOFF:
        p = P.GATHER
    elif t < RELEASE_T:
        p = P.mix(P.GATHER, P.SET, smooth((t - TAKEOFF) / 0.25)) if t < TAKEOFF + 0.25 else \
            P.mix(P.SET, P.RELEASE, smooth((t - TAKEOFF - 0.25) / (RELEASE_T - TAKEOFF - 0.25)))
    elif t < LANDING:
        p = P.RELEASE
    elif t < 6.2:
        land = P.mix(P.RELEASE, P.LAND, ramp(t, LANDING, LANDING + 0.12))
        p = P.mix(land, P.STAND, ramp(t, 5.5, 6.2))
    elif t < 8.4:
        p = P.mix(P.STAND, P.run_cycle(phase * 1.8, amt=0.3, lean=2), ramp(t, 6.4, 6.8) *
                  (1 - ramp(t, 8.0, 8.4)))
    elif t < 9.35:
        p = P.mix(P.STAND, P.HIGH_FIVE_R, ramp(t, 8.45, 8.95))
    else:
        walk = P.run_cycle(phase * 1.8, amt=0.32, lean=2)
        p = P.mix(P.HIGH_FIVE_R, walk, ramp(t, 9.35, 9.9))
    z = jump(t, TAKEOFF, LANDING) + leg_offset(p, k)
    return (x, y, z), h, p


# ---------------------------------------------------------------- Sakuragi
SAK_PATH = [(-4.0, 9.6, -3.2), (6.2, 9.6, -3.2), (6.9, 9.2, -2.2), (8.0, 7.9, 0.4),
            (8.75, 7.2, 1.95), (9.4, 7.08, 2.03), (11.0, 7.6, 1.2)]


def sakuragi_xy(t):
    return track(SAK_PATH, t)


def sakuragi(t, k):
    x, y = sakuragi_xy(t)
    vx, vy = vel(SAK_PATH, t)
    ruk = track(RUK_PATH, t)
    look = ang_to((x, y), ruk) if t < 6.0 else ang_to((x, y), (track(RUK_PATH, t)))
    moving = ramp(t, 6.2, 6.5) * (1 - ramp(t, 8.5, 8.8))
    h = lerp_ang(look, math.atan2(vy, vx), moving)
    phase = dist_along(SAK_PATH, t) / 2.8
    if t < 5.9:
        p = P.mix(P.DEFEND, P.ATHLETIC, 0.6)
        z = 0.0
    elif t < 6.3:
        p = P.FIST
        z = jump(t, 5.98, 6.3)
    elif t < 8.6:
        p = P.mix(P.FIST, P.run_cycle(phase, amt=1.0), ramp(t, 6.3, 6.5))
        z = 0.0
    elif t < 9.35:
        p = P.mix(P.STAND, HIGH_FIVE_L, ramp(t, 8.5, 8.95))
        z = 0.0
    else:
        pump = 0.5 + 0.5 * math.sin((t - 9.35) * 7.0)
        p = P.mix(HIGH_FIVE_L, P.mix(P.STAND, P.FIST, 0.6 + 0.4 * pump), ramp(t, 9.35, 9.7))
        z = jump(t, 9.75, 10.2) + jump(t, 10.6, 11.0)
    return (x, y, z + leg_offset(p, k)), h, p


# ---------------------------------------------------------------- Defender (#9)
DEF_PATH = [(-4.0, -1.5, 3.8), (0.0, -1.5, 3.8), (1.0, -0.2, 3.9), (1.7, 0.7, 4.0),
            (2.2, 1.4, 3.6), (3.0, 3.6, 2.6), (3.9, 6.0, 2.6), (4.45, 6.55, 2.9),
            (4.95, 6.7, 3.0), (6.0, 6.75, 3.1), (7.2, 7.5, 4.2), (12.0, 7.5, 4.2)]


def defender(t, k):
    x, y = track(DEF_PATH, t)
    vx, vy = vel(DEF_PATH, t)
    ruk = track(RUK_PATH, t)
    watch = ang_to((x, y), ruk)
    if t < 2.0:
        h = watch
    elif t < 4.2:
        h = lerp_ang(watch, math.atan2(vy, vx), ramp(t, 2.0, 2.3) * (1 - ramp(t, 3.7, 4.2)))
    elif t < 5.2:
        h = watch
    elif t < 6.0:
        h = lerp_ang(watch, ang_to((x, y), HOOP), ramp(t, 5.2, 5.8))
    else:
        h = lerp_ang(ang_to((x, y), HOOP), math.atan2(vy, vx), ramp(t, 6.0, 6.4))
    phase = dist_along(DEF_PATH, t) / 2.4
    if t < 2.0:
        slide = P.run_cycle(phase * 1.5, amt=0.25, lean=0)
        p = P.add(P.DEFEND, slide, 0.6)
    elif t < 4.2:
        p = P.mix(P.DEFEND, P.run_cycle(phase, amt=1.0), ramp(t, 2.0, 2.4))
    elif t < 5.0:
        p = P.mix(P.ATHLETIC, P.CLOSEOUT, ramp(t, 4.3, 4.5))
    elif t < 6.0:
        p = P.mix(P.LAND, P.STAND, ramp(t, 5.1, 5.6))
    elif t < 7.2:
        p = P.mix(P.STAND, P.run_cycle(phase * 2.0, amt=0.3, lean=8), ramp(t, 6.0, 6.3))
    else:
        p = P.mix(P.run_cycle(phase * 2.0, amt=0.3, lean=8), SLUMP, ramp(t, 7.2, 7.8))
    z = jump(t, 4.45, 4.95) + leg_offset(p, k)
    return (x, y, z), h, p


CHOREO = {"Rukawa": rukawa, "Sakuragi": sakuragi, "Defender": defender}


def bake(rigs, frames, tau_of_frame):
    prev = {}
    for f in range(frames + 1):
        t = tau_of_frame(f)
        for name, rig in rigs.items():
            (x, y, z), h, p = CHOREO[name](t, rig.k)
            if name in prev:
                h = prev[name] + (h - prev[name] + math.pi) % (2 * math.pi) - math.pi
            prev[name] = h
            rig.root.location = (x, y, z)
            rig.root.rotation_euler = (0, 0, h + math.pi / 2)
            rig.root.keyframe_insert("location", frame=f)
            rig.root.keyframe_insert("rotation_euler", frame=f)
            P.apply(rig, p, f)
    event("release", RELEASE_T, (5.6, 3.6, 2.9))
    event("slap", SLAP_T, (6.9, 2.1, 2.2))
    for t in (1.65, 1.95, 3.95, 4.3):
        event("squeak", t, track(RUK_PATH, t) + (0.0,))
    for t in (2.05, 4.42, 4.95):
        event("squeak", t, track(DEF_PATH, t) + (0.0,))
    event("land", LANDING, track(RUK_PATH, LANDING) + (0.0,))
