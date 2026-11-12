"""Extract the font faces the video needs from macOS system collections into build/fonts/.

Canvas only registers the first face of a .ttc, so the bold/semibold faces are pulled out as standalone .ttf files.
Run with the project venv:  .venv/bin/python fonts.py   (render.mjs calls it automatically when needed)
"""
import glob
from pathlib import Path

from fontTools.ttLib import TTCollection

OUT = Path(__file__).parent / "build" / "fonts"
ASSETS = "/System/Library/AssetsV2/com_apple_MobileAsset_Font*/*.asset/AssetData/"
WANT = {
    "YuantiSC-Bold.ttf": ("Yuanti.ttc", "Yuanti SC Bold"),
    "PingFangSC-Semibold.ttf": ("PingFang.ttc", "PingFang SC Semibold"),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for out_name, (ttc, full_name) in WANT.items():
        if (OUT / out_name).exists():
            continue
        paths = glob.glob(ASSETS + ttc)
        if not paths:
            print(f"missing {ttc}; render.mjs falls back to Hiragino Sans GB")
            continue
        for font in TTCollection(paths[0]).fonts:
            if font["name"].getDebugName(4) == full_name:
                font.save(OUT / out_name)
                print("wrote", out_name)
                break


if __name__ == "__main__":
    main()
