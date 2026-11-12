"""Sound generators (NumPy/SciPy only). Every function returns a mono float32 array at SR."""
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(3)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def band(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x, fc, order=4):
    return signal.sosfilt(signal.butter(order, fc, fs=SR, output="sos"), x)


def highpass(x, fc, order=4):
    return signal.sosfilt(signal.butter(order, fc, btype="high", fs=SR, output="sos"), x)


def noise(n):
    return RNG.standard_normal(n)


def pink(n):
    w = noise(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w) * 8


# ---------------------------------------------------------------- one-shots
def ball_bounce(strength=1.0, pitch=1.0):
    """Hollow rubber thump: body sine sweep + shell resonances + contact click."""
    dur = 0.35 / min(pitch, 1.0)
    t = t_axis(dur)
    n = len(t)
    f0 = 95 * pitch
    body = np.sin(2 * np.pi * (f0 * t + 60 * pitch * (1 - np.exp(-t / 0.02)) * 0.02)) * env_ad(n, 0.002, 0.07 / pitch)
    shell = sum(np.sin(2 * np.pi * f * pitch * t + p) * env_ad(n, 0.001, d / pitch) * g
                for f, d, g, p in ((420, 0.05, 0.35, 0.3), (640, 0.035, 0.22, 1.1), (1150, 0.02, 0.12, 2.0)))
    click = band(noise(n), 1500, 6000) * env_ad(n, 0.0005, 0.006) * 0.3
    return (body + shell + click) * strength


def squeak(pitch=1.0, dur=0.13):
    t = t_axis(dur / min(pitch, 1.0))
    n = len(t)
    f = (2100 + 900 * np.sin(np.pi * t / t[-1]) + 160 * np.sin(2 * np.pi * 38 * t)) * pitch
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    e = np.sin(np.pi * np.clip(t / t[-1], 0, 1)) ** 0.6
    return tone * e * 0.25


def swoosh(dur, lo, hi, attack=0.3):
    n = int(dur * SR)
    x = band(noise(n), lo, hi, 2)
    t = np.arange(n) / n
    e = np.where(t < attack, t / attack, (1 - t) / (1 - attack)) ** 1.5
    return x * e


def swish(pitch=1.0):
    """Net swish: bright 'shhh' plus rope rattle grains."""
    dur = 0.55 / pitch
    n = int(dur * SR)
    sh = band(noise(n), 2200 * pitch, 7500, 2) * env_ad(n, 0.015, 0.12 / pitch)
    grains = np.zeros(n)
    for _ in range(26):
        i = int(RNG.uniform(0, 0.25 / pitch) * SR)
        g = band(noise(400), 1200, 5000, 2) * env_ad(400, 0.0005, 0.002)
        grains[i:i + 400] += g[: n - i] * RNG.uniform(0.2, 0.6)
    return sh * 0.9 + grains


def buzzer(dur=1.4):
    t = t_axis(dur)
    x = signal.sawtooth(2 * np.pi * 233 * t) + 0.6 * signal.square(2 * np.pi * 351 * t)
    x = np.tanh(2.5 * lowpass(x, 3200))
    e = np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
    return x * e * 0.5


def slap(pitch=1.0):
    n = int(0.4 / pitch * SR)
    hi = highpass(noise(n), 900) * env_ad(n, 0.0004, 0.02 / pitch)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * pitch * t) * env_ad(n, 0.001, 0.04 / pitch)
    return hi * 0.9 + body * 0.5


def shutter():
    n = int(0.05 * SR)
    a = highpass(noise(n), 3000) * env_ad(n, 0.0002, 0.003)
    b = np.roll(a, int(0.018 * SR)) * 0.6
    return (a + b) * 0.25


def boom(dur=3.0):
    """Sub drop for the time-freeze: 70 -> 28 Hz with soft distortion."""
    t = t_axis(dur)
    f = 28 + 42 * np.exp(-t / 0.35)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.tanh(1.6 * x) * env_ad(len(t), 0.004, 0.9)


def riser(dur=1.6):
    """Reversed-cymbal style rise into the freeze."""
    n = int(dur * SR)
    x = band(noise(n), 3000, 12000, 2)
    e = (np.arange(n) / n) ** 3
    return x * e


def heartbeat(pitch=1.0):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    beat = lambda d: np.sin(2 * np.pi * 52 * pitch * (t - d)) * env_ad(n, 0.004, 0.07) * (t >= d)
    one = np.sin(2 * np.pi * 52 * pitch * t) * env_ad(n, 0.004, 0.08)
    two = np.roll(one, int(0.24 * SR)) * 0.7
    return np.tanh(2.0 * (one + two)) * 0.8


# ---------------------------------------------------------------- beds
def crowd_bed(n, voices=24):
    """Murmuring crowd: pink noise through formant-like bands with random syllabic AM."""
    out = np.zeros(n)
    for _ in range(voices):
        fc = RNG.uniform(350, 2600)
        x = band(pink(n), fc * 0.8, fc * 1.25, 2)
        rate = RNG.uniform(2.0, 6.0)
        am = lowpass(np.abs(noise(n)), rate) * 3
        out += x * am
    return out / voices * 4


def pad(n, freqs, detune=0.004):
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            x += signal.sawtooth(2 * np.pi * f * (1 + d) * t + RNG.uniform(0, 6))
    return lowpass(x, 900, 2) / (3 * len(freqs))


def impulse_response(rt60=2.2, dur=3.0, lo_tail=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / rt60)
    ir = np.stack([noise(n) * decay, noise(n) * decay])
    if lo_tail:
        ir = lowpass(ir, 180, 2)
    for d, g in ((0.011, 0.6), (0.023, 0.45), (0.037, 0.35), (0.051, 0.3)):
        ir[:, int(d * SR)] += g * RNG.choice([-1, 1], 2)
    ir[:, :int(0.008 * SR)] = 0
    return ir / np.abs(ir).sum(axis=1, keepdims=True).max() * 30
