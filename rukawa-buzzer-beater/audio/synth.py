"""Mix the soundtrack from build/events.json -> build/audio.wav (NumPy/SciPy only).

Usage: build/.venv/bin/python audio/synth.py
"""
import json
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

import voices as V

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "..", "build")
SR = V.SR
C_SOUND = 343.0

data = json.load(open(os.path.join(BUILD, "events.json")))
FPS, FRAMES = data["fps"], data["frames"]
TAU = np.array(data["tau"])
N = int(FRAMES / FPS * SR)
SPEED = np.append(np.diff(TAU) * FPS, 1.0)
LIS = data["listener"]
for i in range(len(LIS)):
    if LIS[i] is None:
        LIS[i] = LIS[i - 1] if i else [0, -8, 2]
F_BUZZ, F_THAW = 312, 372

dry = np.zeros((2, N))
send = np.zeros((2, N))
low = np.zeros((2, N))


def frame_of_tau(t):
    i = int(np.searchsorted(TAU, t))
    if i <= 0:
        return 0.0
    if i >= len(TAU):
        return float(FRAMES)
    d = TAU[i] - TAU[i - 1]
    return i - 1 + (0.0 if d <= 0 else (t - TAU[i - 1]) / d)


def place(sig, frame, gain=1.0, pan=0.0, rev=0.3, lo=0.0):
    s = int(frame / FPS * SR)
    if s >= N or s < 0:
        return
    sig = sig[: N - s] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for ch, g in ((0, l), (1, r)):
        dry[ch, s:s + len(sig)] += sig * g * (1 - rev * 0.5)
        send[ch, s:s + len(sig)] += sig * g * rev
        low[ch, s:s + len(sig)] += sig * g * lo


def heard(e):
    """Frame the sound reaches the camera (story-time acoustic delay) and distance gain."""
    f = e["frame"]
    li = LIS[min(int(f), FRAMES)]
    d = float(np.linalg.norm(np.array(e["pos"]) - np.array(li)))
    return frame_of_tau(e["tau"] + d / C_SOUND), 1.0 / (1.0 + d / 6.0)


def pitch_at(f):
    return 0.5 + 0.5 * float(np.clip(SPEED[min(int(f), FRAMES)], 0, 1))


rng = np.random.default_rng(5)
flash_n = 0
for e in data["events"]:
    kind = e["type"]
    if kind in ("buzzer", "timefreeze", "score"):
        continue
    f, g = heard(e)
    p = pitch_at(f)
    pan = float(np.clip(rng.normal(0, 0.25), -0.7, 0.7))
    if kind == "dribble":
        place(V.ball_bounce(1.0, p), f, 1.1 * g, pan, 0.25)
    elif kind == "squeak":
        place(V.squeak(p), f, 0.9 * g, pan, 0.3)
    elif kind == "release":
        place(V.swoosh(0.22 / p, 700, 3200), f, 0.5 * g, 0.0, 0.3)
    elif kind == "land":
        place(V.ball_bounce(0.6, p * 0.55), f, 1.2 * g, 0.0, 0.3, 0.3)
    elif kind == "swish":
        place(V.swish(p), f, 2.2 * max(g, 0.5), 0.0, 0.45, 0.2)
    elif kind == "bounce":
        place(V.ball_bounce(min(1.0, e.get("strength", 1) / 3.0), p), f, 1.2 * g, pan * 0.5, 0.35)
    elif kind == "slap":
        place(V.slap(p), f, 2.4 * max(g, 0.5), 0.0, 0.55, 0.5)
    elif kind == "flash" and flash_n < 160:
        flash_n += 1
        place(V.shutter(), f, rng.uniform(0.04, 0.12), rng.uniform(-0.9, 0.9), 0.5)

# time-freeze: riser into the buzzer, sub drop, buzzer with long low tail
place(V.riser(1.6), F_BUZZ - 1.6 * FPS, 0.35, 0.0, 0.4)
place(V.boom(3.2), F_BUZZ, 0.6, 0.0, 0.2, 0.6)
place(V.buzzer(1.5), F_BUZZ, 0.45, 0.0, 0.7, 0.5)

# heartbeat during the intro and the slow-motion / frozen stretch
for sec in np.arange(0.4, 3.4, 0.85):
    place(V.heartbeat(), sec * FPS, 0.55, 0.0, 0.1, 0.4)
for sec in np.arange(185 / FPS, 432 / FPS, 1.0):
    place(V.heartbeat(0.9), sec * FPS, 0.75 if F_BUZZ <= sec * FPS < F_THAW else 0.5, 0.0, 0.1, 0.5)

# ---------------------------------------------------------------- beds
t_out = np.arange(N) / SR
fr = t_out * FPS
spd = np.interp(fr, np.arange(len(SPEED)), SPEED)
f_swish = frame_of_tau(5.95) + 0.25 * FPS
f_slap = frame_of_tau(9.0)
muffle = np.clip(1.0 - spd, 0, 1)
murmur_lvl = np.interp(fr, [0, 84, 180, 312, 372, f_swish, f_swish + 4], [0.35, 0.45, 0.7, 0.25, 0.25, 0.4, 0])
roar_lvl = np.interp(fr, [f_swish, f_swish + 6, f_swish + 40, f_slap, f_slap + 8, 690, 720],
                     [0, 1.0, 0.85, 0.7, 1.0, 0.75, 0.3]) * (fr >= f_swish)
mur = V.crowd_bed(N, 20)
roar = V.crowd_bed(N, 36) * 1.6 + V.band(V.pink(N), 300, 4000, 2) * 0.35
bed = mur * murmur_lvl + roar * roar_lvl * 1.7
bed = bed * (1 - muffle) + V.lowpass(bed, 380) * muffle * 1.3
bed_st = np.stack([bed, np.roll(bed, int(0.013 * SR))]) * 0.55
dry += bed_st * 0.7
send += bed_st * 0.3

# ball-spin whoosh while it flies in slow motion (pulses with the backspin)
f_rel, f_sw = frame_of_tau(4.75), frame_of_tau(5.95)
s0, s1 = int(f_rel / FPS * SR), int(f_sw / FPS * SR)
w = V.band(V.noise(s1 - s0), 180, 900, 2)
spin_phase = np.cumsum(2.0 * spd[s0:s1]) / SR
w *= (0.55 + 0.45 * np.sin(2 * np.pi * spin_phase)) * np.sin(np.linspace(0, np.pi, s1 - s0)) ** 0.5
w *= np.where((fr[s0:s1] >= F_BUZZ) & (fr[s0:s1] < F_THAW), 0.35, 1.0)
for ch in (0, 1):
    dry[ch, s0:s1] += w * 0.22

# music pad: tense A minor until the swish, then a bright C major lift
tense = V.pad(N, [110.0, 164.81, 261.63, 329.63])
lift = V.pad(N, [130.81, 196.0, 329.63, 392.0, 523.25])
lift = V.highpass(lift, 120, 2)
tense_lvl = np.interp(fr, [0, 84, 300, f_swish - 6, f_swish], [0.0, 0.1, 0.2, 0.22, 0.0])
lift_lvl = np.interp(fr, [f_swish - 2, f_swish + 18, 640, 720], [0.0, 0.26, 0.26, 0.0])
music = tense * tense_lvl + lift * lift_lvl
dry += np.stack([music, np.roll(music, int(0.007 * SR))])

# ---------------------------------------------------------------- reverb + master
ir = V.impulse_response(2.3, 3.0)
ir_lo = V.impulse_response(3.6, 4.5, lo_tail=True)
wet = np.stack([signal.fftconvolve(send[c], ir[c])[:N] for c in (0, 1)])
rumble = np.stack([signal.fftconvolve(low[c], ir_lo[c])[:N] for c in (0, 1)])
mix = dry + 0.5 * wet + 1.4 * rumble
mix = V.highpass(mix, 25, 2)
mix /= np.percentile(np.abs(mix), 99.95) / 0.75
mix = np.tanh(mix)
fade = np.minimum(1.0, t_out / 0.3) * np.minimum(1.0, (t_out[-1] - t_out) / 1.0)
mix *= fade * 0.97
wavfile.write(os.path.join(BUILD, "audio.wav"), SR, (mix.T * 32767).astype(np.int16))
print(f"[audio] {N / SR:.1f}s, {len(data['events'])} events, {flash_n} shutters")
