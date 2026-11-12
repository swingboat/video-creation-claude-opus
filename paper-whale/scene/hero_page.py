"""Shot 1 hero page: rests on the open book, is lifted by the wind, curls, tears free and flies off frame.

Shape = integrate the page angle theta(w, y) across its width from the spine; see plan/0b-shots.md.
"""
import math
import os

import numpy as np

import common as C
import props

NU, NV = 16, 10
F_END = C.SHOT1[1] + 1                       # cache frames 0..73
CELL = 1


def _rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def shape(t, spine):
    """Vertices (NU*NV, 3) of the page at shot-1 time t (s)."""
    w = np.linspace(0, 1, NU)
    yn = np.linspace(0, 1, NV)
    ww, yy = np.meshgrid(w, yn, indexing="ij")
    d = ww * props.PAGE_W
    eps = 1e-4
    rest = np.arctan((props.block_z(d + eps) - props.block_z(d - eps)) / (2 * eps))
    lift = C.smooth((t - 0.6) / 0.3)
    a = C.smooth((t - 0.6) / 1.0)
    alpha = math.radians(75) * a
    curl = 0.3 + 1.1 * a
    twist = 0.5 * a
    if t > 1.6:
        tau = t - 1.6
        curl += 0.35 * math.sin(2 * math.pi * 2.5 * tau) * min(tau / 0.3, 1.0)
        twist += 0.25 * math.sin(2 * math.pi * 1.7 * tau + 1.0)
    th = rest * (1 - lift) + lift * (alpha + curl * ww + twist * (0.5 - yy) * ww)
    dw = props.PAGE_W / (NU - 1)
    x = np.concatenate([np.zeros((1, NV)), np.cumsum(np.cos(th[1:]) * dw, 0)])
    z = np.concatenate([np.zeros((1, NV)), np.cumsum(np.sin(th[1:]) * dw, 0)])
    breathe = 0.002 * math.sin(2 * math.pi * 0.8 * t) * ww ** 2 * (1 - yy) * (1 - lift)
    sx, sy, sz = spine
    local = np.stack([x, (yy - 0.5) * props.PAGE_L, z + props.block_z(0) + 0.0012 + breathe], -1).reshape(-1, 3)
    if t > 1.6:
        tau = t - 1.6
        R = _rot_z(0.35 * tau) @ _rot_y(-(0.6 * tau + 0.3 * tau * tau))
        local = local @ R.T + np.array([-0.02, 0.10, 0.06]) * tau + 0.5 * np.array([0.0, 0.40, 0.14]) * tau * tau
    return local + np.array([sx, sy, sz])


def uvs():
    w = np.linspace(0, 1, NU)
    yn = np.linspace(0, 1, NV)
    ww, yy = np.meshgrid(w, yn, indexing="ij")
    cu, cv = CELL % 2, CELL // 2
    return np.stack([(cu + 0.04 + 0.92 * ww) / 2, (cv + 0.04 + 0.92 * yy) / 2], -1).reshape(-1, 2)


def build(book, paper):
    import bpy
    paper = props.paper_mat("paper_hero", translucent=0.12)
    spine = book["spine"]
    frames = [shape((f - C.SHOT1[0]) / C.FPS, spine) for f in range(0, F_END + 1)]
    path = os.path.join(C.CACHE, "hero_page.pc2")
    C.write_pc2(path, frames, 0)
    faces = C.grid_faces(NU, NV)
    ob = C.mesh_np("hero_page", frames[0], faces, uvs=uvs()[faces.ravel()], smooth_shade=True, material=paper)
    C.attach_pc2(ob, path, 0)
    for f, hide in ((C.SHOT1[1], False), (C.SHOT2[0], True)):
        ob.hide_render = hide
        ob.keyframe_insert("hide_render", frame=f)
    cents = {f: frames[f].mean(0).tolist() for f in range(len(frames))}
    print(f"[hero] frames={len(frames)} verts={len(frames[0])}")
    return cents
