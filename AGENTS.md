# BlogNaver Agent Guidelines

Before modifying UI/UX or building a new page, read [BRANDING.md](BRANDING.md) and the published /branding/ style guide.

Required: follow the design tokens, typography, responsive standards, accessibility and CMS behavior constraints there. Preserve existing functionality unless specifically requested. Update design docs alongside deliberate changes to brand rules. Check Hugo build and GitHub Pages deploy after changes; report real status without guessing.

Project: Hugo + Blowfish 3, GitHub Pages via .github/workflows/hugo.yml, canonical baseURL https://duynguyenaver.github.io/blognaver/.

Brand color correction: **Blue only** (navy + royal blue + cyan links). Never restore purple/pink Neon scheme. Official palette and implementation are in BRANDING.md and assets/css/schemes/blognaver-blue.css.


## PR conflict hotfix / conflict-recognition playbook (2026-10-29)

Case: a rollback PR removes an obsolete Stack-specific file `layouts/_partials/footer/custom.html`, while a later PR on `main` modifies that same file for the Commit Status dashboard. GitHub correctly reports a modify/delete merge conflict. **Never blindly use "ours" or "theirs" for the entire PR.**

Recognize the exact pattern before applying a fix:
1. Read `main` and PR heads, changed files, and GitHub PR mergeability. The conflicting path must be the *obsolete theme-specific footer*.
2. Confirm the active target theme is Blowfish: `config/_default/module.toml` imports `github.com/nunocoracao/blowfish/v3`. Blowfish uses `layouts/partials/extend-footer.html`, not Stack's `layouts/_partials/footer/custom.html`.
3. For this specific conflict only: preserve deletion of the obsolete Stack footer, preserve/bring over the NEWER dashboard implementation from `main` in `layouts/partials/extend-footer.html`, `static/js/commit-status.js`, and `static/css/commit-dashboard.css`; keep the rollback's Blowfish configuration and content.
4. Merge the current `main` into the PR branch with BOTH parents recorded (or git merge with an explicit per-file resolution); never force-push, reset `main`, or discard unrelated later main changes. Re-fetch GitHub mergeability and rerun Bug Checker on the resulting branch.
5. Auto-fix scope: only the above verified **obsolete Stack footer vs Blowfish footer** path mapping. For any other conflict or conflicting edits in the active footer, fail with an actionable message and require a human review. Never auto-merge or auto-approve PRs. PASS checks permit *manual* approval only.

Prevention: one feature = one branch/PR; rebase or merge latest `main` before review; use the PR Bug Checker (up to 3 attempts) and do not promote changes from a conflicting or failing PR. Keep a native theme-specific footer adapter instead of directly editing multiple theme internals.


## PR quality gate (CI auto-review, no auto-merge)

- Each independent change gets its own PR, using a feature branch. Never push feature changes directly to main or merge automatically.
- `PR Bug Checker` runs one initial build/check and retries at most twice (3 attempts total). It classifies familiar Hugo config, Dart Sass, and module retrieval failures using verified historical playbooks. Diagnostic messages are advisory, **not evidence that a code fix was applied**. Unknown failures halt after the retry limit, with logs available for manual diagnosis and external documentation research.
- The `Auto-review after Bug Checker` workflow may submit an explicit GitHub APPROVE review **only** after the linked PR's Bug Checker run succeeds, the checked SHA still equals the PR head, and no known check has failed. It never merges, force-pushes or changes source.
- GitHub may refuse automatic reviews until Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests is enabled; authors cannot approve their own PRs. The workflow logs that limitation and leaves human approval as fallback.
- An automated CI approval is not the same as a human security/content review. The repository owner remains responsible for manually deciding whether to merge. New commits require fresh checks.
