#!/usr/bin/env bash
set -euo pipefail
# Single attempt; the GitHub workflow controls bounded retries and deterministic early exit.
BASE="https://duynguyenaver.github.io/blognaver/"
rm -rf public
hugo --gc --minify --baseURL "$BASE"
# The CMS index generator must run on the compiled output.
node scripts/generate-cms-index.mjs
python3 scripts/ci-site-audit.py
echo "Build and deep smoke tests passed."
