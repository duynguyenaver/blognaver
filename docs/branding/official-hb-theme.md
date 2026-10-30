# Official HB Starter Theme integration

This branch installs and builds the **actual** upstream hbstack/theme starter template, not an imitation.

- Upstream https://github.com/hbstack/theme pinned at c7b8cc68fb1c58a4c34c56103460ba288e67166f
- The build uses the upstream Hugo templates, HB Go modules, Bootstrap 5.3 styling, scripts and npm dependencies.
- Build entry point: bash scripts/build-hbstack-theme.sh
- CI: .github/workflows/hbstack-theme.yml
- Output: hb-build/ (isolated GitHub Actions artifact), URL prefix reserved: /blognaver/hb/
- Original site remains on DoIt while verifying compatibility; CMS and all static tools stay unaffected.
- Content/posts maps to HB content/blog, with /bai-viet/:slug/ permalinks.

## Why an isolated build?
Hugo renders templates at build time. Two unrelated Hugo template engines cannot be switched in one generated HTML document by swapping CSS. HB must be built as a separate Hugo site and then mounted under /hb/. A genuine runtime switch is therefore a navigation between the two built sites.

## Rollout requirements
1. Verify the full HB build workflow passes with upstream dependencies.
2. Inspect produced HTML for all articles, routes, TOC, taxonomies, content and media.
3. Add the isolated output under production public/hb/ only once it is validated; update the Editorial switcher to navigate between equivalent routes.
4. Avoid copying upstream demo content or overriding the existing CMS.
5. Keep native HB UX, customize branding using official HB configuration/hooks rather than editing upstream module internals.

The upstream source is MIT licensed; preserve upstream notices. Refer to https://hbstack.dev/docs/getting-started/installation/ and https://hbstack.dev/docs/getting-started/install-on-existing-sites/.
