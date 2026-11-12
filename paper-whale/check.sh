#!/bin/zsh
# Rebuild the scene and render check stills: ./check.sh [frames] [engine]
#   ./check.sh 30,110,160,225 auto      (Cycles for shot 1, EEVEE for shot 2)
#   PCT=50 SPP=16 ./check.sh 30 EEVEE
set -e
cd "$(dirname "$0")"
mkdir -p build
if [[ -z "$NOBUILD" ]]; then
  blender -b --factory-startup -P build_scene.py > build/build.log 2>&1 || { tail -30 build/build.log; exit 1; }
  grep -E "^\[(library|hero|swarm|build)\]" build/build.log
fi
blender -b --factory-startup build/paper_whale.blend -P stills.py -- --frames ${1:-30,110,160,225} --engine ${2:-auto} \
  --pct ${PCT:-100} --samples ${SPP:-0} --preview ${PREVIEW:-0} > build/stills.log 2>&1 || { tail -30 build/stills.log; exit 1; }
grep -E "^\[still\]|Error|Traceback" build/stills.log
