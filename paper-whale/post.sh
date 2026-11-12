#!/bin/zsh
# Synthesize the soundtrack, grade the frames and mux into output.mp4. See plan/0b-audio-post.md.
#   ./post.sh                 (frames from build/frames)
#   FRAMES=build/preview ./post.sh   (quick check on the preview frames)
set -e
cd "$(dirname "$0")"
FRAMES=${FRAMES:-build/frames}
PY=$(ls /Applications/Blender.app/Contents/Resources/*/python/bin/python3.* | grep -v config | head -1)
$PY audio/synth.py
GRADE="eq=contrast=1.05:saturation=0.92:gamma=0.98,\
colorbalance=rs=-0.02:bs=0.04:rh=0.03:bh=-0.02,\
vignette=angle=PI/5,\
noise=alls=5:allf=t,\
scale=1920:816:flags=lanczos,\
pad=1920:1080:0:132:black,\
fade=t=in:st=0:d=0.4,fade=t=out:st=9.2:d=0.8,format=yuv420p"
ffmpeg -loglevel error -y -framerate 24 -start_number 1 -i $FRAMES/f_%04d.png -i build/audio.wav \
  -vf "$GRADE" -c:v libx264 -preset slow -crf 16 -movflags +faststart \
  -c:a aac -b:a 256k -shortest output.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact output.mp4
