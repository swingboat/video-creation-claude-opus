"""Shared Blender scene: units, domino layout, geometry and rigid bodies.

Units: 1 Blender unit = 1 mm (scale_length 0.001), so gravity is 9810 BU/s².
"""
import math

import bpy

N = 13            # dominoes in the chain
H0 = 5.0          # first domino height (mm)
GROWTH = 1.5      # Whitehead's factor
THICK = 0.13      # thickness / height
WIDE = 0.5        # width / height
GAP = 0.65        # gap to the next domino / own height
BALL_R = 2.5      # steel ball radius (mm)
PEND_L = 300.0    # pendulum thread length (mm)
SIM_HZ = 1200     # simulation frames per real second
DENSITY = 1e-3    # mass per mm³ (relative units)
FRICTION = 0.45   # domino surface friction
BOUNCE = 0.3      # domino restitution


def layout():
    """Return [(height, thickness, width, x_back)] for every domino."""
    out, x = [], 0.0
    for i in range(N):
        h = H0 * GROWTH ** i
        out.append((h, THICK * h, WIDE * h, x))
        x += THICK * h + GAP * h
    return out


def ball_rest():
    """Ball centre at the bottom of its swing: touching the first domino's back face near its top."""
    h = H0
    return (-BALL_R + 0.25, 0.0, 0.8 * h)


def pivot():
    bx, by, bz = ball_rest()
    return (bx, by, bz + PEND_L)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.001
    sc.unit_settings.length_unit = "MILLIMETERS"
    sc.gravity = (0.0, 0.0, -9810.0)
    sc.render.fps = 30
    return sc


def _box(name, sx, sy, sz, loc):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return ob


def _rigid(ob, kind, mass=1.0, friction=0.5, bounce=0.05, margin=0.02):
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.rigidbody.object_add(type=kind)
    rb = ob.rigid_body
    rb.collision_shape = "SPHERE" if ob.name == "Ball" else "BOX"
    rb.mass = mass
    rb.friction = friction
    rb.restitution = bounce
    rb.use_margin = True
    rb.collision_margin = margin
    rb.linear_damping = 0.0
    rb.angular_damping = 0.01
    rb.use_deactivation = False
    ob.select_set(False)
    return rb


def build(sim=True):
    """Create dominoes, ball and floor collider. Returns (dominoes, ball, floor_collider)."""
    sc = bpy.context.scene
    if sim:
        bpy.ops.rigidbody.world_add()
        w = sc.rigidbody_world
        w.time_scale = sc.render.fps / SIM_HZ
        w.substeps_per_frame = 2
        w.solver_iterations = 40
        w.use_split_impulse = True

    dominoes = []
    for i, (h, t, wd, x) in enumerate(layout()):
        ob = _box(f"Domino{i + 1:02}", t, wd, h, (x + t / 2, 0.0, h / 2))
        if sim:
            _rigid(ob, "ACTIVE", mass=DENSITY * h * t * wd, friction=FRICTION, bounce=BOUNCE,
                   margin=min(0.04, 0.02 * t))
        dominoes.append(ob)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=BALL_R, segments=48, ring_count=24, location=ball_rest())
    ball = bpy.context.active_object
    ball.name = "Ball"
    bpy.ops.object.shade_smooth()
    if sim:
        _rigid(ball, "ACTIVE", friction=0.2, margin=0.02)
        ball.rigid_body.kinematic = True

    floor = _box("FloorCollider", 6000, 6000, 50, (1000, 0, -25))
    if sim:
        _rigid(floor, "PASSIVE", friction=0.6, margin=0.04)
    floor.hide_render = True
    return dominoes, ball, floor


def pendulum_angle(t):
    """Swing angle (rad) of the ball pendulum at real time t (s); 0 = touching the first domino.

    Released from rest, it swings in, presses ~1.2 mm into the domino, then recoils with half the speed.
    """
    w = math.sqrt(9810.0 / PEND_L)
    th0 = -math.radians(5.0)
    t_hit = math.pi / (2 * w)
    if t < t_hit:
        return th0 * math.cos(w * t)
    tau = t - t_hit
    vc = -th0 * w                      # angular speed at contact
    w2 = vc * PEND_L / 1.2             # stiffness that stops the ball 1.2 mm in
    if tau < math.pi / w2:
        return (vc / w2) * math.sin(w2 * tau)
    tau -= math.pi / w2
    return -0.5 * (vc / w) * math.sin(w * tau) * math.exp(-tau * 0.8)


def pendulum_hit_time():
    return math.pi / (2 * math.sqrt(9810.0 / PEND_L))


def ball_pos(theta):
    px, py, pz = pivot()
    return (px + PEND_L * math.sin(theta), py, pz - PEND_L * math.cos(theta))
