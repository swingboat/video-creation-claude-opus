#!/bin/zsh
# Render a frame range of build/paper_whale.blend (resumable: finished frames are skipped).
#   ENGINE=CYCLES ./render.sh 1 72            final shot 1  -> build/frames/f_####.png
#   ENGINE=EEVEE  ./render.sh 73 240          final shot 2
#   PREVIEW=1 PCT=50 SPP=16 OUT=build/preview ENGINE=EEVEE ./render.sh 1 240
set -e
cd "$(dirname "$0")"
OUT=${OUT:-build/frames}
mkdir -p $OUT
find $OUT -name 'f_*.png' -size 0 -delete
cat > build/_render_cfg.py <<EOF
import sys, bpy
sys.path.insert(0, "scene")
import lights
lights.render_settings("${ENGINE:-EEVEE}", ${PCT:-100}, ${SPP:-64}, bool(${PREVIEW:-0}))
r = bpy.context.scene.render
r.filepath = "//${OUT#build/}/f_####"
r.use_overwrite = False
r.use_placeholder = True
EOF
T0=$(date +%s)
blender -b --factory-startup build/paper_whale.blend -P build/_render_cfg.py -s ${1:-1} -e ${2:-240} -a 2>&1 \
  | grep --line-buffered -E "^Saved|Error|Traceback" || true
rm -f build/_render_cfg.py
echo "[render] ${ENGINE:-EEVEE} frames ${1:-1}-${2:-240} -> $OUT in $(( $(date +%s) - T0 ))s"
