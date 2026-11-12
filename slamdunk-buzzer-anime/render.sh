#!/bin/zsh
# EEVEE-render every frame of build/anime.blend into build/frames/ (resumable: finished frames are skipped).
# PCT=100 SPP=32 ./render.sh [start end]
set -e
cd "$(dirname "$0")"
mkdir -p build/frames
find build/frames -name 'f_*.png' -size 0 -delete
S=${1:-0}
E=${2:-719}
cat > build/_render_cfg.py <<EOF
import bpy
sc = bpy.context.scene
sc.render.resolution_percentage = ${PCT:-100}
sc.eevee.taa_render_samples = ${SPP:-32}
EOF
blender -b build/anime.blend -P build/_render_cfg.py -s $S -e $E -a 2>&1 | grep --line-buffered -E "Saved|Error" || true
rm -f build/_render_cfg.py
ls build/frames | wc -l
