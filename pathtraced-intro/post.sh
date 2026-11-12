#!/bin/bash
# Post: temporal denoise each path-traced segment, concatenate, mux the music -> output.mp4
set -euo pipefail
cd "$(dirname "$0")"
S=build/segments
mkdir -p "$S/dn"
: > "$S/list.txt"
for f in "$S"/s??.mov; do
  n=$(basename "$f" .mov)
  if [[ "$n" == s11 ]]; then vf="null"; else vf="hqdn3d=2.5:2:5:4"; fi
  ffmpeg -v error -y -i "$f" -vf "$vf,format=yuv422p10le" -c:v prores_ks -profile:v 3 -an "$S/dn/$n.mov"
  echo "file 'dn/$n.mov'" >> "$S/list.txt"
done
ffmpeg -v error -y -f concat -safe 0 -i "$S/list.txt" -i build/music.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 30 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart output.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact output.mp4
