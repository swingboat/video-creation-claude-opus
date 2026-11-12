"""Pose library in anatomical degrees and conversion to joint Euler keyframes.

Pose = {joint: (x, y, z)} in degrees:
  trunk/neck/head: x forward bend, y side bend, z twist
  upperarm/thigh:  x flex forward, y abduct outward, z twist
  forearm: x elbow flex; hand: x wrist flex; shin: x knee flex; foot: x toe down
"""
import math

from common import clamp, key, lerp

SIGN = {
    "pelvis": (1, 1, 1), "spine": (1, 1, 1), "chest": (1, 1, 1), "neck": (1, 1, 1), "head": (1, 1, 1),
    "upperarm_L": (-1, -1, 1), "upperarm_R": (-1, 1, -1),
    "forearm_L": (-1, 1, 1), "forearm_R": (-1, -1, -1),
    "hand_L": (-1, 1, 1), "hand_R": (-1, -1, -1),
    "thigh_L": (-1, -1, 1), "thigh_R": (-1, 1, -1),
    "shin_L": (1, 1, 1), "shin_R": (1, 1, 1),
    "foot_L": (1, 1, 1), "foot_R": (1, 1, 1),
}

REST = {
    "upperarm_L": (0, 0, 0), "upperarm_R": (0, 0, 0),
    "forearm_L": (15, 0, 0), "forearm_R": (15, 0, 0),
    "hand_L": (5, 0, 0), "hand_R": (5, 0, 0),
    "thigh_L": (0, 3, 0), "thigh_R": (0, 3, 0),
    "shin_L": (4, 0, 0), "shin_R": (4, 0, 0),
}


def pose(**kw):
    p = {j: (0.0, 0.0, 0.0) for j in SIGN}
    p.update(REST)
    for j, v in kw.items():
        p[j] = tuple(float(a) for a in v)
    return p


def mix(a, b, t):
    return {j: tuple(lerp(a[j][i], b[j][i], t) for i in range(3)) for j in SIGN}


def add(a, b, w=1.0):
    """a + w * (b - REST-neutral) : layer an offset pose."""
    z = pose()
    return {j: tuple(a[j][i] + w * (b[j][i] - z[j][i]) for i in range(3)) for j in SIGN}


def apply(rig, p, f):
    rad = {j: tuple(math.radians(p[j][i]) * s[i] for i in range(3)) for j, s in SIGN.items()}
    if hasattr(rig, "apply_pose"):
        rig.apply_pose(rad, f)
        return
    for j, r in rad.items():
        rig.set_joint(j, r, f)


# ---------------------------------------------------------------- library
STAND = pose(spine=(3, 0, 0), head=(-2, 0, 0))

ATHLETIC = pose(spine=(14, 0, 0), chest=(6, 0, 0), head=(-14, 0, 0),
                thigh_L=(35, 8, 0), thigh_R=(35, 8, 0), shin_L=(55, 0, 0), shin_R=(55, 0, 0),
                foot_L=(-18, 0, 0), foot_R=(-18, 0, 0),
                upperarm_L=(25, 25, 0), upperarm_R=(25, 25, 0),
                forearm_L=(70, 0, 0), forearm_R=(70, 0, 0))

DEFEND = pose(spine=(18, 0, 0), head=(-18, 0, 0),
              thigh_L=(40, 22, 0), thigh_R=(40, 22, 0), shin_L=(65, 0, 0), shin_R=(65, 0, 0),
              foot_L=(-22, 0, 0), foot_R=(-22, 0, 0),
              upperarm_L=(30, 60, 0), upperarm_R=(30, 60, 0),
              forearm_L=(40, 0, 0), forearm_R=(40, 0, 0))

# jump shot key poses: ball in both hands, right hand shoots
GATHER = pose(spine=(20, 0, 0), chest=(6, 0, 0), head=(-20, 0, 0),
              thigh_L=(55, 6, 0), thigh_R=(55, 6, 0), shin_L=(80, 0, 0), shin_R=(80, 0, 0),
              foot_L=(-25, 0, 0), foot_R=(-25, 0, 0),
              upperarm_R=(35, 12, 0), forearm_R=(105, 0, 40), hand_R=(-30, 0, 0),
              upperarm_L=(30, 25, 0), forearm_L=(100, 0, -30), hand_L=(-10, 0, 0))

SET = pose(spine=(-2, 0, 0), head=(-6, 0, 0),
           thigh_L=(10, 4, 0), thigh_R=(10, 4, 0), shin_L=(18, 0, 0), shin_R=(18, 0, 0),
           foot_L=(35, 0, 0), foot_R=(35, 0, 0),
           upperarm_R=(150, 8, 0), forearm_R=(110, 0, 10), hand_R=(-60, 0, 0),
           upperarm_L=(140, 28, -10), forearm_L=(95, 0, -35), hand_L=(-20, 0, 0))

RELEASE = pose(spine=(-3, 0, 0), head=(-10, 0, 0),
               thigh_L=(14, 4, 0), thigh_R=(8, 4, 0), shin_L=(25, 0, 0), shin_R=(16, 0, 0),
               foot_L=(40, 0, 0), foot_R=(40, 0, 0),
               upperarm_R=(165, 6, 0), forearm_R=(12, 0, 0), hand_R=(75, 0, 0),
               upperarm_L=(138, 40, 0), forearm_L=(22, 0, 0), hand_L=(10, 0, 0))

LAND = pose(spine=(10, 0, 0), head=(-12, 0, 0),
            thigh_L=(40, 8, 0), thigh_R=(40, 8, 0), shin_L=(60, 0, 0), shin_R=(60, 0, 0),
            foot_L=(-15, 0, 0), foot_R=(-15, 0, 0),
            upperarm_R=(120, 8, 0), forearm_R=(20, 0, 0), hand_R=(70, 0, 0),
            upperarm_L=(40, 30, 0), forearm_L=(40, 0, 0))

CLOSEOUT = pose(spine=(-4, 0, 0), head=(-12, 0, 0),
                thigh_L=(20, 5, 0), thigh_R=(5, 5, 0), shin_L=(35, 0, 0), shin_R=(15, 0, 0),
                foot_L=(35, 0, 0), foot_R=(40, 0, 0),
                upperarm_L=(172, 8, 0), forearm_L=(5, 0, 0), hand_L=(10, 0, 0),
                upperarm_R=(60, 35, 0), forearm_R=(40, 0, 0))

FIST = pose(spine=(-4, 0, 0), head=(-15, 0, 0),
            upperarm_R=(150, 25, 0), forearm_R=(120, 0, 0), hand_R=(10, 0, 0),
            upperarm_L=(10, 20, 0), forearm_L=(70, 0, 0),
            thigh_L=(15, 6, 0), thigh_R=(15, 6, 0), shin_L=(25, 0, 0), shin_R=(25, 0, 0))

HIGH_FIVE_R = pose(spine=(-2, 0, 0), head=(-8, 0, 0),
                   upperarm_R=(138, 2, 0), forearm_R=(12, 0, 0), hand_R=(-35, 0, 0),
                   upperarm_L=(8, 15, 0), forearm_L=(25, 0, 0))


# ---------------------------------------------------------------- procedural cycles
def run_cycle(phase, amt=1.0, lean=12.0):
    """Running gait. phase in cycles (1.0 = two steps). amt 0..1 scales stride."""
    a = 2 * math.pi * phase
    s, c = math.sin(a), math.cos(a)
    p = pose(spine=(lean * amt, 0, 6 * s * amt), chest=(4 * amt, 0, -10 * s * amt),
             head=(-lean * amt - 4, 0, 4 * s * amt))
    for side, sg in (("L", 1), ("R", -1)):
        ss, cc = sg * s, sg * c
        p[f"thigh_{side}"] = (amt * (20 + 42 * ss), 4, 0)
        knee = 15 + amt * (55 * clamp(0.5 - 0.9 * cc) + 30 * clamp(ss))
        p[f"shin_{side}"] = (knee, 0, 0)
        p[f"foot_{side}"] = (amt * (-10 + 25 * clamp(-ss)), 0, 0)
        p[f"upperarm_{side}"] = (amt * -40 * ss + 10, 12, 0)
        p[f"forearm_{side}"] = (70 + 25 * amt * clamp(-ss), 0, 0)
    return p


def dribble_arm(p, bounce_phase, side="R"):
    """Override the dribbling arm: phase 0 = ball leaves hand downward, 0.5 = ball at floor."""
    u = 0.5 + 0.5 * math.cos(2 * math.pi * bounce_phase)   # 1 at top, 0 at floor
    p = dict(p)
    p[f"upperarm_{side}"] = (18 + 16 * u, 22, 0)
    p[f"forearm_{side}"] = (25 + 45 * u, 0, 0)
    p[f"hand_{side}"] = (-30 + 50 * (1 - u), 0, 0)
    return p
