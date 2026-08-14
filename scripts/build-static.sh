#!/usr/bin/env bash
#
# Stages the deployable prototype into public/.
#
# Two things this exists to do:
#
#   1. Ship only the Praxis rebuild. "WCM Prototype 2.html" — the hand-rolled
#      prototype we were handed — stays in the repo for reference and is never
#      copied here, so it is not published.
#   2. Carry the Praxis package into the output. The HTML loads Praxis over
#      relative node_modules/ paths, and a zero-config static deploy would not
#      include node_modules; copying the package keeps every path in the markup
#      working untouched, on Vercel and offline alike.
#
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=public
PKG=node_modules/@ideagen-ax/praxis

if [ ! -d "$PKG" ]; then
  echo "error: $PKG is missing — run 'npm install' first" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/node_modules/@ideagen-ax"

# index.html so a bare / resolves; the named copy keeps any existing link to
# wcm-praxis.html working, including the ones in the README.
cp wcm-praxis.html "$OUT/index.html"
cp wcm-praxis.html "$OUT/wcm-praxis.html"
cp wcm-praxis.css wcm-praxis.js "$OUT/"
cp -R assets "$OUT/assets"
cp -R "$PKG" "$OUT/$PKG"

echo "staged $OUT ($(du -sh "$OUT" | cut -f1))"
