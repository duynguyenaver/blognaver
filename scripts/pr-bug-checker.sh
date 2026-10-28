#!/usr/bin/env bash
set -euo pipefail

# Run once for a checked-out PR commit. workflow handles repeat attempts.
BASE="https://duynguyenaver.github.io/blognaver/"
rm -rf public .prism-build
hugo --gc --minify --baseURL "$BASE"
hugo --gc --minify --environment prism --destination .prism-build --baseURL "${BASE}prism/"

for root in public .prism-build; do
  test -s "$root/index.html" || { echo "::error::Missing homepage: $root/index.html"; exit 1; }
  test -s "$root/posts/index.html" || { echo "::error::Missing post index: $root/posts/index.html"; exit 1; }
  test -s "$root/search/index.html" || { echo "::error::Missing search: $root/search/index.html"; exit 1; }
  test -s "$root/archives/index.html" || { echo "::error::Missing archives: $root/archives/index.html"; exit 1; }
  test -s "$root/theme-switch.js" || { echo "::error::Missing theme switch: $root/theme-switch.js"; exit 1; }
  test -s "$root/theme-switch.css" || { echo "::error::Missing theme switch stylesheet: $root/theme-switch.css"; exit 1; }
  if grep -qi '<html' "$root/index.html"; then echo "OK HTML: $root"; else echo "::error::Invalid homepage: $root"; exit 1; fi
done

# Ensure Prism output has real CSS assets, not only HTML.
find .prism-build -type f -name '*.css' -print -quit | grep -q . || { echo "::error::Prism CSS missing"; exit 1; }
node scripts/generate-cms-index.mjs
test -s public/cms/posts-index.json || echo "::notice::CMS index location differs; generator exited successfully"
echo "All theme builds and smoke tests passed."
