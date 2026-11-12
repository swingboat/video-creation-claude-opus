#!/bin/zsh
# Rebuild the project and render check stills: ./check.sh F1 F2 ...  (stills -> build/stills/)
set -e
cd "$(dirname "$0")"
mkdir -p build
blender -b -P build_scene.py -- ${=BUILD_ARGS:-} > build/build.log 2>&1 || true
grep -E "^\[(ball|net|crowd|build)|Error|line [0-9]+" build/build.log | tail -12
blender -b build/anime.blend -P stills.py -- --pct ${PCT:-50} --samples ${SPP:-16} "$@" > build/stills.log 2>&1
grep -E "^\[still\]|Error|Traceback" build/stills.log
