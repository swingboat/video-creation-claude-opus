#!/bin/bash
# Build the editable Tesseract project intro.tsrct from the generator scripts.
set -euo pipefail
cd "$(dirname "$0")"
T="$HOME/Library/Application Support/Tesseract/bin/tsrct"
P=intro.tsrct
W=.tesseract-work; mkdir -p "$W"

node gen/lib/tex.mjs
node music/compose.mjs
rm -rf build/actions && node gen/main.mjs build/actions

rm -f "$P"
"$T" project create --project "$P" >/dev/null
"$T" project checkout --project "$P" --output "$W/doc.json" >/dev/null
node gen/setdoc.mjs "$W/doc.json" 1920 1080 38.2
"$T" project commit --project "$P" --file "$W/doc.json" >/dev/null

"$T" project import-font --project "$P" --file assets/fonts/Cinzel.ttf >/dev/null 2>&1
for f in build/tex/*.png; do
  "$T" project import-asset --project "$P" --file "$f" --asset-id "$(basename "$f" .png)" --kind image >/dev/null
done
"$T" project import-asset --project "$P" --file build/music.wav --asset-id music --kind audio >/dev/null

for a in build/actions/*.json; do
  "$T" project apply --project "$P" --actions "$a" > "$W/apply.log" 2>&1 || { echo "FAILED: $a"; tail -c 3000 "$W/apply.log"; exit 1; }
  echo "applied $(basename "$a")"
done

"$T" project checkout --project "$P" --output "$W/doc.json" >/dev/null
node gen/media.mjs "$W/doc.json" 38200
"$T" project commit --project "$P" --file "$W/doc.json" | grep -o '"warnings":\[[^]]*\]'
rm -f "$W/doc.json"
ls -la "$P"
