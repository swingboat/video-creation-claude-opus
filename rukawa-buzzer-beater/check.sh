#!/bin/zsh
# Rebuild the project and render check stills: ./check.sh F1 F2 ...  (stills -> build/stills/)
set -e
cd "$(dirname "$0")"
blender -b --factory-startup -P build_scene.py > build/build.log 2>&1
grep -E "^\[(ball|net|time|build)" build/build.log
blender -b build/rukawa.blend -P stills.py -- --pct ${PCT:-50} --samples ${SPP:-24} "$@" > build/stills.log 2>&1
grep -E "^\[still\]|Error|Traceback" build/stills.log
