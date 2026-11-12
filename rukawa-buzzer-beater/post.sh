#!/bin/zsh
# Synthesize the soundtrack and mux frames + audio into output.mp4
set -e
cd "$(dirname "$0")"
build/.venv/bin/python audio/synth.py
ffmpeg -loglevel error -y -framerate 24 -i build/frames/f_%04d.png -i build/audio.wav \
  -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=29:d=1" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 256k -shortest output.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact output.mp4
