#!/usr/bin/env bash
set -euo pipefail
# Build the REAL hbstack/theme template in an isolated Hugo project.
# This intentionally does not replace BlogNaver's live DoIt layout.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_SHA="c7b8cc68fb1c58a4c34c56103460ba288e67166f"
HB_DIR="${RUNNER_TEMP:-/tmp}/blognaver-hbstack-theme"
rm -rf "$HB_DIR"
git clone --filter=blob:none https://github.com/hbstack/theme.git "$HB_DIR"
cd "$HB_DIR"
git checkout --detach "$UPSTREAM_SHA"
# Use upstream pinned Go modules, official Hugo layouts, Bootstrap assets and JS.
rm -rf content
mkdir -p content/blog
cp -R "$ROOT/content/posts/." content/blog/
cat > config/_default/languages.yaml <<'EOF'
vi:
  languageName: Tiếng Việt
  weight: 1
EOF
cat > config/_default/hugo.yaml <<'EOF'
baseURL: https://duynguyenaver.github.io/blognaver/hb/
title: BlogNaver · HB Theme
languageCode: vi-VN
defaultContentLanguage: vi
defaultContentLanguageInSubdir: false
enableRobotsTXT: true
timeout: 180s
enableEmoji: true
permalinks:
  blog: /bai-viet/:slug/
outputs:
  home: [HTML, Offline, RSS, SearchIndex, WebAppManifest]
taxonomies:
  authors: authors
  tags: tags
  categories: categories
  series: series
build:
  writeStats: true
markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    noClasses: false
    lineNos: true
    lineNumbersInTable: false
EOF
# Compatibility shim: upstream hugomods/giscus v0.1.1 uses removed Hugo getJSON.
# Override only that deprecated partial using the current resources.GetRemote API.
mkdir -p layouts/partials/giscus
cat > layouts/partials/giscus/repo-id.html <<'EOF'
{{- $repoID := "" -}}
{{- with . -}}
  {{- $url := printf "https://api.github.com/repos/%s" . -}}
  {{- with try (resources.GetRemote $url) -}}
    {{- with .Value -}}
      {{- $data := . | transform.Unmarshal -}}
      {{- $repoID = $data.node_id | default "" -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- return $repoID -}}
EOF
# Some upstream meta versions omit the Fuse.js module mount expected by HB search.
# Import the official hugomods/fuse-js module, which mounts Fuse dist under assets/mods/fuse.
cat >> config/_default/module.yaml <<'EOF'

  - path: github.com/hugomods/fuse-js
EOF
# Keep upstream module settings and remove theme demo navigation/content.
rm -f config/_default/menus.en.yaml config/_default/menus.zh-hans.yaml
mkdir -p layouts/partials/hugopress/modules/hb-custom/hooks
cat > layouts/partials/hugopress/modules/hb-custom/hooks/body-end.html <<'EOF'
<nav class="bn-real-hb-switch" aria-label="Chuyển giao diện">
  <a href="/blognaver/" title="Quay lại BlogNaver Editorial">Editorial</a>
  <span aria-current="page">HB Theme</span>
</nav>
<style>
.bn-real-hb-switch{position:fixed;right:18px;bottom:18px;z-index:1200;background:#fff;color:#152c44;border:1px solid #d4e2ee;border-radius:24px;padding:9px 13px;box-shadow:0 6px 22px #12263c22;font:600 13px system-ui}
.bn-real-hb-switch a{margin-right:12px}
</style>
EOF
npm ci --no-audit --no-fund
# HB's SCSS pipeline requires the Dart Sass executable, not only Hugo extended.
npm install --no-save --no-audit --no-fund fuse.js@7
# Install native Dart Sass. The npm "sass" executable cannot speak Hugo's
# required Embedded Protocol and crashes with "connection is shut down".
DART_SASS_VERSION="1.93.3"
curl --fail --location --silent --show-error \
 "https://github.com/sass/dart-sass/releases/download/${DART_SASS_VERSION}/dart-sass-${DART_SASS_VERSION}-linux-x64.tar.gz" \
 | tar -xz -C "$HB_DIR"
export PATH="$HB_DIR/dart-sass:$HB_DIR/node_modules/.bin:$PATH"
# Fail early if the native compiler is missing or cannot speak Embedded Protocol.
sass --embedded --version
# Hugo esbuild resolves this ES module from the local assets overlay.
mkdir -p assets/mods/fuse
cp node_modules/fuse.js/dist/fuse.mjs assets/mods/fuse/fuse.js
# HB's PurgeCSS resolves Hugo's publishDir relative to this theme workspace.
# An absolute destination would get prefixed twice and break the runtime config.
mkdir -p hb-build
NODE_OPTIONS=--max-old-space-size=4096 hugo --gc --minify --environment production --baseURL https://duynguyenaver.github.io/blognaver/hb/ --destination hb-build
test -f hb-build/index.html
mkdir -p "$ROOT/hb-build"
cp -a hb-build/. "$ROOT/hb-build/"
test -f "$ROOT/hb-build/index.html"
printf 'HB official upstream commit: %s\n' "$UPSTREAM_SHA"
