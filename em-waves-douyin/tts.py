"""Generate narration (Douyin vertical cut) with Edge neural TTS, lay it on a timeline, and export timeline.json + subtitles.srt.

Each segment may pick its own voice (narrator / curious kid) and its own pause.
Run with the project venv:  .venv/bin/python tts.py
"""
import asyncio
import hashlib
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

import aiohttp
import edge_tts
import edge_tts.communicate

# Since Oct 2026 the legacy speech.platform.bing.com host answers synthesis with 403;
# Edge itself now synthesizes via api.msedgeservices.com (see rany2/edge-tts#490, #491).
# Remove this override once an edge-tts release ships the fix.
edge_tts.communicate.WSS_URL = (
    "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
    f"?Ocp-Apim-Subscription-Key={edge_tts.constants.TRUSTED_CLIENT_TOKEN}"
)

ROOT = Path(__file__).parent
BUILD = ROOT / "build"
OUT = ROOT / "out"
CACHE = BUILD / "tts_cache"
TITLE = "电磁波-抖音竖屏版"
TARGET = 80.0  # Douyin: keep it around a minute
LEAD_IN = 0.35  # the hook must start almost immediately on Douyin
GAP = 0.3
TAIL = 2.2  # room for the closing call-to-action
TICKS = 1e7  # edge-tts offsets are in 100 ns units


def voice_of(script, seg):
    v = {"rate": 0, "pitch": 0, **script["voices"][seg.get("voice", "zh")]}
    return v["name"], v["rate"], v["pitch"]


async def synth_one(text: str, voice: str, rate: int, pitch: int, path: Path):
    """Synthesize one line (cached by text/voice/rate/pitch) and return its word timings."""
    key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{text}".encode()).hexdigest()[:16]
    cache_mp3, cache_json = CACHE / f"{key}.mp3", CACHE / f"{key}.json"
    if cache_mp3.exists() and cache_json.exists():
        shutil.copyfile(cache_mp3, path)
        return json.loads(cache_json.read_text())

    for attempt in range(5):
        try:
            words, audio = await _stream(text, voice, rate, pitch)
            break
        except aiohttp.WSServerHandshakeError as e:
            # 429 = throttled by the free endpoint; back off and retry
            if e.status != 429 or attempt == 4:
                raise
            wait = 8 * (attempt + 1)
            print(f"  throttled (429), retrying in {wait}s…")
            await asyncio.sleep(wait)
    path.write_bytes(audio)
    cache_mp3.write_bytes(audio)
    cache_json.write_text(json.dumps(words, ensure_ascii=False))
    return words


async def _stream(text: str, voice: str, rate: int, pitch: int):
    comm = edge_tts.Communicate(text, voice, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz", boundary="WordBoundary")
    words, audio, cursor = [], bytearray(), 0
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            idx = text.find(chunk["text"], cursor)
            if idx < 0:
                idx = cursor
            cursor = idx + len(chunk["text"])
            start = chunk["offset"] / TICKS
            words.append({"text": chunk["text"], "idx": idx,
                          "start": start, "end": start + chunk["duration"] / TICKS})
    if not audio or not words:
        raise RuntimeError(f"edge-tts returned no audio/word timings for: {text}")
    return words, bytes(audio)


def synth(script, extra_rate):
    async def run():
        out = []
        for i, s in enumerate(script["segments"]):
            name, rate, pitch = voice_of(script, s)
            out.append(await synth_one(s["text"], name, rate + extra_rate, pitch, BUILD / f"seg{i}.mp3"))
        return out
    return asyncio.run(run())


def srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def split_caption(text: str):
    """Split a Chinese sentence into subtitle chunks at punctuation, keeping it short on screen."""
    parts = [p for p in re.split(r"(?<=[，。？！：；])", text) if p]
    chunks, cur = [], ""
    for p in parts:
        if len(cur) + len(p) <= 12 and not cur.endswith(("。", "？", "！")):
            cur += p
        else:
            if cur:
                chunks.append(cur)
            cur = p
    if cur:
        chunks.append(cur)
    return [c.rstrip("，。：；、") for c in chunks]


def caption_cues(seg):
    """Time each subtitle chunk from the spoken word boundaries it covers."""
    if seg.get("lang") == "en":
        # English lines stay whole on screen, with the Chinese meaning underneath
        return [{"text": seg["text"], "zh": seg.get("zh", ""), "start": seg["words"][0]["start"],
                 "end": seg["words"][-1]["end"]}]
    cues, cursor = [], 0
    for chunk in seg.get("captions") or split_caption(seg["text"]):
        chunk = chunk.rstrip("，。：；、")
        a = seg["text"].find(chunk, cursor)
        b = a + len(chunk)
        cursor = b
        inside = [w for w in seg["words"] if a <= w["idx"] < b]
        cues.append({"text": chunk, "start": inside[0]["start"], "end": inside[-1]["end"]})
    return cues


def main():
    BUILD.mkdir(exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    script = json.loads((ROOT / "script.json").read_text())
    segs = script["segments"]
    gaps = [s.get("gap", GAP) for s in segs[:-1]]
    available = TARGET - LEAD_IN - sum(gaps) - TAIL

    rate = script.get("rate", 0)
    while True:
        words = synth(script, rate)
        # space lines by the last spoken word: the mp3 tail is ~0.6 s of silence that can overlap the next gap
        speech = [w[-1]["end"] + 0.12 for w in words]
        total = LEAD_IN + sum(speech) + sum(gaps) + TAIL
        print(f"rate={rate:+d}% speech={sum(speech):.2f}s total={total:.2f}s")
        if total <= TARGET or rate >= 30:
            break
        # jump straight to the speed-up the overshoot implies, instead of probing step by step
        rate = min(30, max(rate + 2, math.ceil(rate + (sum(speech) / available - 1) * 100) + 1))

    t = LEAD_IN
    timeline = []
    for i, (seg, ws, d) in enumerate(zip(segs, words, speech)):
        last_word = ws[-1]["end"]
        timeline.append({
            **seg, "voice": seg.get("voice", "zh"), "lang": "en" if voice_of(script, seg)[0].startswith("en-") else "zh", "start": round(t, 3), "end": round(t + last_word, 3),
            "words": [{**w, "start": round(t + w["start"], 3), "end": round(t + w["end"], 3)} for w in ws],
        })
        t += d + (gaps[i] if i < len(gaps) else 0)
    total = round(t + TAIL, 3)

    cues = []
    for seg in timeline:
        seg["cues"] = caption_cues(seg)
        cues += seg["cues"]

    filters, inputs = [], []
    for i, seg in enumerate(timeline):
        inputs += ["-i", str(BUILD / f"seg{i}.mp3")]
        ms = int(seg["start"] * 1000)
        filters.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(timeline)))
    filters.append(
        f"{mix}amix=inputs={len(timeline)}:normalize=0,"
        f"highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:{total}[out]"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filters),
         "-map", "[out]", "-ac", "2", "-ar", "48000", str(BUILD / "narration.wav")],
        check=True,
    )

    (BUILD / "timeline.json").write_text(
        json.dumps({"duration": total, "rate": rate, "voices": script["voices"], "segments": timeline},
                   ensure_ascii=False, indent=2)
    )
    srt = []
    for i, c in enumerate(cues, 1):
        body = c["text"] + (f"\n{c['zh']}" if c.get("zh") else "")
        srt.append(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{body}\n")
    (OUT / f"{TITLE}.srt").write_text("\n".join(srt), encoding="utf-8")
    for seg in timeline:
        print(f"{seg['id']:>10} {seg['start']:6.2f} → {seg['end']:6.2f}  {seg['text']}")
    print(f"total {total:.2f}s")


if __name__ == "__main__":
    main()
