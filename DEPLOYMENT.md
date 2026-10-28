# BlogNaver Deployment Policy

Version 1.0 — 2026-10-28

## How it works

- Hosting: GitHub Pages; source is GitHub Actions.
- A push to `main` or a manual `workflow_dispatch` triggers `.github/workflows/hugo.yml`.
- Hugo Extended and Go build the site at `https://duynguyenaver.github.io/blognaver/`.
- `concurrency.group: blognaver-pages-production` and `queue: max` keep pending runs in a deployment queue (up to 100); `cancel-in-progress: false` avoids canceling the currently running deployment.
- Every workflow run is tied to its triggering commit SHA, and a successful deploy writes the SHA/run/URL to the GitHub Actions run summary.
- **Caveat:** the order in which jobs start waiting need not match commit order, and GitHub queues are finite. Review the Actions page during large bursts. A successful intermediate deployment can be replaced later by another queued deployment.

## Deployment checklist

1. Group related code changes in one commit where reasonable; use feature branches + PRs for risky UI work. Resume CMS publishing directly to main is supported.
2. Confirm `Settings > Pages > Build and deployment > Source = GitHub Actions`.
3. Check the corresponding Actions run rather than assuming a push means a successful deploy.
4. Inspect failures and fix before claiming the production URL is updated.
5. Check both homepage and the changed URL on mobile/desktop; preserve `BRANDING.md` rules.

## Blowfish Tools

`npx blowfish-tools` is optional for theme initialization/configuration and local Hugo operations; it is **not** a deployment scheduler. Do not install it in CI solely for deployments. Hugo modules are used to load the theme.

## Production links

- Site: https://duynguyenaver.github.io/blognaver/
- Actions: https://github.com/duynguyenaver/blognaver/actions
- Workflow: .github/workflows/hugo.yml

## Notes about commit-to-deployment

With `queue: max` and no in-progress cancellation, intermediate workflows are not intentionally collapsed by our config. GitHub still has queue limits and infrastructure limitations, so this is not an unconditional guarantee of one visible deployment per commit.

## Speed optimization — 2026-10-28

- The workflow caches `~/go/pkg/mod` via `actions/cache@v4`, using a key based on `go.mod` / `go.sum` and a fallback cache key. Future builds can reuse downloaded Hugo Module dependencies.
- Removed the unconditional `hugo mod get` step. Hugo resolves needed modules during normal builds instead of refreshing the dependency graph on every deploy.
- `actions/setup-go` internal cache is disabled because dependency caching is configured explicitly.
- `actions/configure-pages@v5` runs before build; Pages upload and deploy remain separate jobs.
- The queue still publishes each commit by design; with rapid consecutive pushes, queue waiting can dominate build time. To minimize latency further, batch related changes into one commit or explicitly opt for latest-only deployment (which changes the prior per-commit requirement).
- Compare durations after multiple subsequent successful Actions runs; the first cache miss may not be faster.
