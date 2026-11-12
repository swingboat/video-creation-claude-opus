"""Synthesize the soundtrack (paper rustle, flock, formation swell, additive piano, reverb) -> build/audio.wav.

Run with Blender's bundled Python (has numpy):  $PY audio/synth.py      See plan/0b-audio-post.md.
"""
import json
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(HERE, "build")
SR, DUR = 48000, 10.0
N = int(SR * DUR)
T = np.arange(N) / SR
RNG = np.random.default_rng(5)
CUT = 3.0


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def db(x):
    return 10 ** (x / 20)


def band_noise(fc, width_oct=0.6, n=N, lo_cut=20.0):
    """White noise shaped by a log-frequency Gaussian around fc (Hz), unit RMS."""
    spec = np.fft.rfft(RNG.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / width_oct) ** 2) * (f > lo_cut)
    x = np.fft.irfft(spec * g, n)
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-12)


def grains(rate, n=N, att=0.002, dec=0.012):
    """Random grain train (paper-flick envelope). rate: array (n,) of grains/s. Returns envelope >= 0."""
    rmax = float(np.max(rate)) + 1e-9
    hits = (RNG.random(n) < rmax / SR) & (RNG.random(n) < rate / rmax)
    imp = hits * RNG.uniform(0.3, 1.0, n)
    kl = int((att + dec * 5) * SR)
    tk = np.arange(kl) / SR
    kern = np.minimum(tk / att, 1.0) * np.exp(-np.maximum(tk - att, 0) / dec)
    m = n + kl
    env = np.fft.irfft(np.fft.rfft(imp, m) * np.fft.rfft(kern, m), m)[:n]
    return np.maximum(env, 0)


def pan(mono, p):
    p = np.clip(p, -1, 1)
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], -1)


def frames_to_samples(frames, values, fps=24):
    return np.interp(T, (np.asarray(frames) - 1) / fps, values)


# ---------------------------------------------------------------- sources
def room_tone():
    x = band_noise(90, 1.5) * (1 + 0.25 * np.sin(2 * np.pi * 0.1 * T))
    return pan(x * db(-50), 0.0)


def hero_page():
    lift = np.exp(-0.5 * ((T - 1.05) / 0.32) ** 2) + 0.55 * smooth((T - 1.5) / 0.15) * np.exp(-np.maximum(T - 1.6, 0) / 0.45)
    a = smooth((T - 0.6) / 1.0)
    x = band_noise(2500, 0.7) * (1 - a) + band_noise(4000, 0.7) * a
    x *= 0.35 + grains(np.full(N, 45.0), dec=0.006) * 1.6
    x += 0.3 * band_noise(700, 0.8) * grains(np.full(N, 6.0), dec=0.05)
    env = lift * (T < CUT) * (1 - smooth((T - 2.75) / 0.25))
    return pan(x * env * db(-20), 0.7 * smooth((T - 1.6) / 1.0))


def flock(ev):
    sw = ev["swarm"]
    fr = [s["frame"] for s in sw]
    speed = frames_to_samples(fr, [s["speed"] for s in sw])
    formed = frames_to_samples(fr, [s["formed"] for s in sw])
    cx = frames_to_samples(fr, [s["centroid"][0] for s in sw])
    loud = 0.35 + 0.65 * smooth(speed / 4.0)
    loud *= smooth((T - (CUT - 0.25)) / 0.6)
    out = np.zeros(N)
    for _ in range(28):
        fc = float(np.exp(RNG.uniform(np.log(1500), np.log(6500))))
        rate = RNG.uniform(8, 25) * (1.0 - 0.45 * formed) * (0.5 + 0.5 * smooth(speed / 3.0))
        layer = band_noise(fc, 0.5) * grains(rate, dec=RNG.uniform(0.006, 0.02))
        hi = 1 - 0.65 * formed * (fc > 3500)
        out += layer * hi
    out /= np.sqrt(np.mean(out ** 2) + 1e-12)
    mono = out * loud
    return pan(mono * db(-24), np.clip(cx / 7.0, -0.7, 0.7))


def swell():
    t2 = T - CUT
    env = smooth((t2 - 3.4) / 1.6) * (1 - smooth((t2 - 5.2) / 0.5))
    k = smooth((t2 - 3.6) / 2.0)
    x = band_noise(200, 0.9) * (1 - k) + band_noise(520, 0.9) * k
    return pan(x * env * db(-26), 0.15)


# ---------------------------------------------------------------- piano
SCORE = [(0.4, 62, .35), (0.4, 69, .28), (2.0, 66, .3), (3.0, 38, .5), (3.0, 50, .42), (4.5, 69, .34),
         (5.5, 71, .37), (6.5, 73, .4), (7.6, 50, .4), (7.6, 54, .33), (7.62, 57, .33), (7.64, 62, .38),
         (7.66, 66, .36), (7.7, 81, .28), (9.0, 74, .24)]


def piano_note(t0, midi, vel):
    f0 = 440.0 * 2 ** ((midi - 69) / 12)
    B = 0.0004
    i0 = int(t0 * SR)
    n = N - i0
    t = np.arange(n) / SR
    t1 = float(np.clip(6.0 * (261.6 / f0) ** 0.5, 1.5, 10.0))
    x = np.zeros(n)
    for k in range(1, 13):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > SR * 0.45:
            break
        ak = vel / k ** 1.1 * np.exp(-k * (1.25 - vel) * 0.35)
        tk = t1 / (1 + 0.35 * (k - 1))
        env = 0.55 * np.exp(-t / (tk * 0.22)) + 0.45 * np.exp(-t / tk)
        for det in (-0.6, 0.6):
            x += 0.5 * ak * env * np.sin(2 * np.pi * fk * 2 ** (det / 1200) * t + RNG.uniform(0, 2 * np.pi))
    x *= np.minimum(t / 0.003, 1.0)
    hn = band_noise(2600, 0.8, n) * np.exp(-t / 0.004) * vel * 0.08
    out = np.zeros(N)
    out[i0:] = x + hn
    return out


def piano():
    st = np.zeros((N, 2))
    for t0, m, v in SCORE:
        st += pan(piano_note(t0, m, v), np.clip((m - 60) / 30, -0.5, 0.5))
    return st


# ---------------------------------------------------------------- mix
def reverb(x, rt60=3.2, wet=0.35):
    ln = int(rt60 * 1.2 * SR)
    t = np.arange(ln) / SR
    out = np.zeros_like(x)
    m = N + ln
    for ch in range(2):
        ir = RNG.standard_normal(ln) * np.exp(-6.9 * t / rt60) * np.minimum(t / 0.01, 1)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], m) * np.fft.rfft(ir, m), m)[:N]
    return x * (1 - wet) + out * wet


def peak_to(x, dbfs):
    return x * db(dbfs) / (np.max(np.abs(x)) + 1e-12)


def main():
    with open(os.path.join(BUILD, "events.json")) as fh:
        ev = json.load(fh)
    paper = room_tone() + hero_page() + flock(ev) + swell()
    paper = peak_to(reverb(paper, 2.0, 0.22), -13)
    pno = peak_to(reverb(piano(), 3.2, 0.38), -14)
    mix = paper + pno
    mix *= (1 - smooth((T - 8.6) / 1.4))[:, None]
    mix = peak_to(mix, 0.0)
    mix = np.tanh(0.7 * mix) / np.tanh(0.7) * db(-3.5)
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    path = os.path.join(BUILD, "audio.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"[audio] {path} peak={20 * np.log10(np.max(np.abs(mix))):.1f} dBFS "
          f"rms={20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS")


if __name__ == "__main__":
    main()
