#!/usr/bin/env bash
set -euo pipefail
# One attempt: GitHub workflow retries at most twice.
BASE="https://duynguyenaver.github.io/blognaver/"
rm -rf public
hugo --gc --minify --baseURL "$BASE"
for path in index.html posts/index.html resume/index.html cms/index.html resume-cms/index.html; do
  test -s "public/$path" || { echo "::error::Missing output: public/$path"; exit 1; }
done
grep -qi '<html' public/index.html || { echo "::error::Homepage is not HTML"; exit 1; }
node scripts/generate-cms-index.mjs
echo "Blowfish build, pages and CMS index generation passed."
