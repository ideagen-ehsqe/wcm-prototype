#!/usr/bin/env bash
#
# Rebuilds wcm-praxis-prototype.zip — the offline copy for stakeholders who
# cannot reach the Vercel deployment. Unzip, open index.html, no server.
#
# The zip is a build artifact and does not refresh itself: run this after
# changing the prototype, or what you hand out will be the previous version.
#
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=wcm-praxis-prototype
ZIP="$PWD/$NAME.zip"

npm run --silent build

STAGE="$(mktemp -d)"
mkdir -p "$STAGE/$NAME"
cp -R public/. "$STAGE/$NAME/"
cp README.md "$STAGE/$NAME/README.md"

rm -f "$ZIP"
( cd "$STAGE" && zip -qr "$ZIP" "$NAME" )
rm -rf "$STAGE"

echo "wrote $NAME.zip ($(du -h "$ZIP" | cut -f1))"
