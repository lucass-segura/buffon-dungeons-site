#!/usr/bin/env bash
# One-off: subset the OFL fonts to Latin (+ Spanish punctuation, arrows) and write woff2 into public/fonts/.
# Needs fonttools + brotli (pip install fonttools brotli); pass the pyftsubset binary as $1 if it is not on PATH.
set -euo pipefail
PYFT="${1:-pyftsubset}"
SRC="${SRC:-../game/assets/fonts}"
OUT="public/fonts"
UNI="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2192"
for f in Jersey10-Regular ChakraPetch-Regular ChakraPetch-SemiBold; do
  "$PYFT" "$SRC/$f.ttf" --unicodes="$UNI" --flavor=woff2 --layout-features='kern,liga,calt' --output-file="$OUT/$f.woff2"
done
