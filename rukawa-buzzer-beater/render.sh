#!/bin/zsh
# Path-trace every frame of build/rukawa.blend into build/frames/ (resumable: finished frames are skipped).
# PCT=100 SPP=48 ./render.sh [start end]
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
sc.cycles.samples = ${SPP:-48}
p = bpy.context.preferences.addons["cycles"].preferences
p.compute_device_type = "METAL"
p.get_devices()
for d in p.devices:
    d.use = d.type == "METAL"
EOF
blender -b build/rukawa.blend -P build/_render_cfg.py -s $S -e $E -a 2>&1 | grep --line-buffered -E "^Fra:[0-9]+ .*Finished|Saved|Error" || true
rm -f build/_render_cfg.py
ls build/frames | wc -l
