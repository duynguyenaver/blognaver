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

## Safe automatic conflict repair

Workflow `.github/workflows/safe-conflict-fixer.yml` listens on same-repository pull requests. It auto-repairs **only** the verified Stack footer modify/delete conflict when the PR switches to Blowfish. It checks the module import, verifies the obsolete footer exists on main but is intentionally deleted on the PR, verifies this is the **only** merge conflict, retains the Blowfish `extend-footer.html` and Commit Status dashboard, then pushes a normal fast-forward merge commit on the PR branch. It never merges to `main`, never force-pushes, and never approves a PR.

Other conflicts are intentionally left for human resolution to avoid deleting recent work. Bug Checker must pass after any auto-fix and the owner must manually review and merge.


## Evidence-based CI knowledge base (2026-10-29)

- `data/ci/bug-knowledge.json` maintains curated, documented Hugo / Blowfish / Go Modules / GitHub Actions / GitHub Pages / static CMS failure signatures and past BlogNaver incidents. `scripts/ci-classify-failure.py` detects candidate causes from real CI output and points to remedies and documentation. It is heuristic, **not** proof of root cause or an autonomous AI engine.
- `scripts/test-ci-knowledge.py` supplies regression fixtures so changes to classification rules must pass deterministic tests. New cases require an authentic failure signature, minimal reproducer or real log, reliable documentation, and preferably a verified successful fix.
- No web access, model API, secrets or untrusted generated code is executed in the pull-request check. If a failure remains unknown, retain logs, stop after the existing retry limit, and investigate with official sources separately. Never auto-merge. The auto-review workflow may approve only verified-green checks when GitHub allows it.

## Bug Checker coverage and evidence rules (2026-10-29)

Project-specific CI rules are implemented in `scripts/pr-bug-checker.sh` and `scripts/ci-site-audit.py`. Validate: Hugo production build, CMS post index generation, key HTML routes, presence of published article outputs, first-party JS/CSS references from key pages, and syntax of changed JavaScript using `node --check`. These checks complement rather than replace UI, browser, integration, security, and editorial testing.

Failures must be distinguished by category: `missing-output`, `invalid-html`, `permalink`, `missing-asset`, `js-syntax`, `tooling`, Hugo template/module configuration errors, and transient infrastructure/network failures. Link diagnoses to real logs and successful fixes. Do not claim "AI/big data self-fix" without a tested deterministic fixer.

Retry transient failures at most twice (three checks total). Deterministic syntax, missing file and template failures normally require a source change; retrying alone is not a repair. Never download/execute suggested fixes from a search result. Never auto-merge main. PR mergeability and Bug Checker PASS are independent: a PR can pass CI while still having a merge conflict.

The source of truth for conflict resolution is the actual current PR merge state and the latest main head. Preserve both sides' nonconflicting edits, re-run checks, and never overwrite newer AGENTS.md policies.


### Incident: CI Git history missing on PR checkout (2026-10-29)

Verified from GitHub Actions run 40786196594 / job 123159871722: Hugo generated 89 pages and the CMS index successfully, but `scripts/ci-site-audit.py` failed with `tooling: git merge-base origin/main HEAD exited 128`. GitHub's checkout did not provide `origin/main` history. This is **not** an application or JS syntax failure. Repair by configuring `actions/checkout` with `fetch-depth: 0` and explicitly fetching `refs/heads/main:refs/remotes/origin/main` before diff-based audits. Validate `git merge-base origin/main HEAD` succeeds. Classify future occurrences under `tooling/git-history` and stop rather than retrying three times without changing the checkout. The CI test should still fail if history truly cannot be fetched; never silently skip the JS audit.
