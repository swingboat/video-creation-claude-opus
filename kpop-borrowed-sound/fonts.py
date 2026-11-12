"""Extract the font faces the video needs from macOS system collections into build/fonts/.

Canvas only registers the first face of a .ttc, so the faces we need are pulled out as standalone .ttf files.
Run with the project venv:  .venv/bin/python fonts.py   (lib.mjs calls it automatically when needed)
"""
import glob
from pathlib import Path

from fontTools.ttLib import TTCollection

OUT = Path(__file__).parent / "build" / "fonts"
ASSETS = "/System/Library/AssetsV2/com_apple_MobileAsset_Font*/*.asset/AssetData/"
SUPP = "/System/Library/Fonts/Supplemental/"
WANT = {
    "SongtiSC-Black.ttf": ("Songti.ttc", "Songti SC Black"),
    "SongtiSC-Bold.ttf": ("Songti.ttc", "Songti SC Bold"),
    "PingFangSC-Semibold.ttf": ("PingFang.ttc", "PingFang SC Semibold"),
    "PingFangSC-Regular.ttf": ("PingFang.ttc", "PingFang SC Regular"),
    "Futura-CondExtraBold.ttf": ("Futura.ttc", "Futura Condensed ExtraBold"),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for out_name, (ttc, full_name) in WANT.items():
        if (OUT / out_name).exists():
            continue
        paths = glob.glob(SUPP + ttc) + glob.glob(ASSETS + ttc)
        if not paths:
            print(f"missing {ttc}; lib.mjs falls back to Hiragino Sans GB")
            continue
        for font in TTCollection(paths[0]).fonts:
            if font["name"].getDebugName(4) == full_name:
                font.save(OUT / out_name)
                print("wrote", out_name)
                break
        else:
            print(f"face {full_name} not found in {paths[0]}")


if __name__ == "__main__":
    main()
