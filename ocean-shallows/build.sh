#!/bin/sh
# 按编号顺序合并 parts/ 下的片段，生成单文件 index.html
cd "$(dirname "$0")" && cat parts/[0-9][0-9]-* > index.html && echo "built index.html ($(wc -c < index.html) bytes)"
