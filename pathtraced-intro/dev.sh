#!/bin/bash
# Dev loop for one shot: ./dev.sh <shotKey> <projectTimeSec,...> [samples]
# Builds .tesseract-work/dev/<shot>.tsrct with only that shot, renders path-traced previews.
set -euo pipefail
cd "$(dirname "$0")"
T="$HOME/Library/Application Support/Tesseract/bin/tsrct"
SHOT=$1; TIMES=$2; SPP=${3:-16}
W=.tesseract-work/dev; mkdir -p "$W/act-$SHOT"
P="$W/$SHOT.tsrct"; rm -f "$P" "$W/act-$SHOT"/*.json
"$T" project create --project "$P" >/dev/null
"$T" project checkout --project "$P" --output "$W/doc.json" >/dev/null
node gen/setdoc.mjs "$W/doc.json" 1920 1080 38.2
"$T" project commit --project "$P" --file "$W/doc.json" >/dev/null
"$T" project import-font --project "$P" --file assets/fonts/Cinzel.ttf >/dev/null
for f in build/tex/*.png; do
  "$T" project import-asset --project "$P" --file "$f" --asset-id "$(basename "$f" .png)" --kind image >/dev/null
done
node gen/main.mjs "$W/act-$SHOT" ${SHOT//,/ } >/dev/null
for a in "$W/act-$SHOT"/*.json; do
  "$T" project apply --project "$P" --actions "$a" > "$W/apply.log" 2>&1 || { tail -c 3000 "$W/apply.log"; exit 1; }
done
IFS=',' read -ra TS <<< "$TIMES"
for t in "${TS[@]}"; do
  "$T" preview --project "$P" --time "$t" --output "$W/${SHOT}_${t}.png" --renderer path-tracer --no-denoise --samples "$SPP" 2>&1 | grep -v '^warning' | tail -1
done
