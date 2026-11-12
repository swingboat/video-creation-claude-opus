#!/bin/bash
# Path-traced export, one segment per shot (ProRes, no audio): ./render.sh [shotNo...]
# Denoiser weights are unavailable on this network, so renders use --no-denoise with higher sample counts.
set -euo pipefail
cd "$(dirname "$0")"
T="$HOME/Library/Application Support/Tesseract/bin/tsrct"
P=intro.tsrct
mkdir -p build/segments .tesseract-work

# no start_ms dur_ms samples
SHOTS="01 0 3300 128
02 3300 3500 128
03 6800 5100 96
04 11900 1400 96
05 13300 3000 96
06 16300 3000 96
07 19300 1500 96
08 20800 2900 96
09 23700 2600 128
10 26300 5900 128
11 32200 6000 0"

ONLY=" ${*:-} "
while read -r no start dur spp; do
  [[ "$ONLY" != "  " && "$ONLY" != *" $no "* ]] && continue
  out="build/segments/s$no.mov"
  [[ -f "$out" ]] && { echo "skip s$no (exists)"; continue; }
  if [[ "$spp" == 0 ]]; then
    flags=(--renderer raster)
  else
    flags=(--renderer path-tracer --no-denoise --samples "$spp")
  fi
  echo "$(date +%T) render s$no start=$start dur=$dur ${flags[*]}"
  "$T" export --project "$P" --output "$out.part.mov" --format prores --start-ms "$start" --duration-ms "$dur" \
    "${flags[@]}" --json 2> ".tesseract-work/export-s$no.log" >/dev/null
  mv "$out.part.mov" "$out"
  echo "$(date +%T) done s$no: $(tail -1 ".tesseract-work/export-s$no.log" | head -c 200)"
done <<< "$SHOTS"
