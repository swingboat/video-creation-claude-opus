#!/bin/sh
# 按文件名顺序（C 排序）合并 parts/ 下的片段，生成单文件 index.html
cd "$(dirname "$0")" || exit 1
ls parts | LC_ALL=C sort | sed 's#^#parts/#' | xargs cat > index.html && echo "built index.html ($(wc -c < index.html) bytes)"
