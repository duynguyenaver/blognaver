# BlogNaver Agent Guidelines

## MANDATORY: Unified utilities storage, credentials and UX (owner policy, 2026-10-30)

Applies to every existing and new BlogNaver utility, CMS tool and integration, except documented feature-specific requirements. **Implement and test these rules, do not merely claim compliance.** A standards-only PR does not mean existing features are migrated.

### One remembered credential per provider per trusted device
- **GitHub: one shared authentication provider** across CMS, Research Studio and utilities. Gemini, Groq and Supadata each use one shared provider-scoped key; avoid page-specific token prompts. Read existing provider credentials before asking for a new key.
- On the owner's trusted MacBook, explicitly opted-in credential remembrance should survive reloads, tab closures and browser restarts. Ask again only for a new device/browser profile, explicit sign-out/revoke, removed browser storage, invalid/expired credentials or other unavoidable reauthorization. Do not promise credentials survive browser data deletion.
- Use a **single versioned device credential vault** (IndexedDB with non-extractable WebCrypto key, or a platform credential manager when available), not large localStorage/sessionStorage records. Never put provider tokens, encryption passphrases or diary/finance data in a public repo, URL, log or Git commit. Same-origin script compromise may still access browser-held secrets: show the security trade-off and allow Forget/Revoke.
- Migrate legacy per-page keys without silently overwriting valid credentials; validate provider/key pairing before accepting, show connected identity/provider and only prompt when recovery fails. Do not save a newly entered secret unless the user has opted in; persist only for trusted devices. Never expose secret values in UI.
- Cloud encryption passwords can be remembered only with explicit consent and local protection. Never treat a GitHub token as an encryption password or silently change an existing encryption key.

### GitHub-first durable data, no quota-blocking localStorage
- For user-authored, mutable or business-critical data, **GitHub is the source of truth**: write after Save, await API confirmation, show real states (connecting, encrypting, uploading, confirmed, failed). Never show 100% or “saved to GitHub” before confirmed success.
- Protect private data in a public repository using authenticated encryption (e.g., AES-256-GCM with a user-controlled passphrase); use a data branch or other approved storage location without triggering production deploy for every update. Use optimistic SHA checks, conflict handling, deduplication and deletion tombstones. Never overwrite remote changes blindly.
- Use IndexedDB only as the bounded local recovery queue/cache and migrate old localStorage records without deleting their last copy before verified cloud round-trip. On offline/error, label **pending sync**, retry safely and preserve drafts. Avoid full-size localStorage mirrors and avoid writes that can cause QuotaExceededError.
- Not every key belongs in GitHub: UI preferences and ephemeral flags can remain locally; credentials stay in the device vault; caches may be bounded or discarded. Do not automatically upload sensitive information unencrypted or bypass explicit public-disclosure consent.
- Budget, diary, vocabulary, attendance, subscriptions, queues and other personal tools must follow this contract; document exceptions and test reload, another device, offline/online, malformed data and concurrent edits.

### Unified section, form, status and navigation patterns
- **All optional/configuration/secondary sections default to collapsed**, rendered with accessible disclosure controls (visible chevron; click/keyboard to expand). Keep the primary task and essential warnings/actions discoverable on first visit; do not hide a required Save action or critical message behind a collapsed section. Allow feature-specific always-visible exceptions with justification.
- Keep a stable, outside-the-disclosure status summary; on successful connection/sync auto-collapse the connection settings while retaining a green success indicator. On failure open the affected section and show the actionable error; never conceal an incomplete task.
- Reuse shared tokens/components from BRANDING.md for spacing, typography, blue accents, field labels, 44px touch targets, focus rings, responsive cards, inline errors, progress and confirmation states. Avoid duplicate sections and inconsistent controls. Respect reduced motion and WCAG AA contrast.
- Every new feature has a cross-device UX checklist: first-run, remembered connection, success, failure, offline, refresh, keyboard/mobile, data migration, token revocation and privacy. Validate behavior, not screenshots alone.

### Delivery and enforcement
- **One independent change = one feature branch = one normal (non-Draft) PR**, unless the owner explicitly requests Draft. Follow the repository's required checks/approval automation; never push directly to main or bypass branch protection. Do not mark success without actual checks or production evidence.
- Audit existing tools against this standard and create separate scoped implementation PRs. Documentation is an acceptance contract, not proof that the entire site already complies.

## PERMANENT OWNER RULE: Green CI means automatic merge and deployment (2026-10-30)

- **Standing authorization from the repository owner:** Any non-Draft PR to `main` that passes every required CI/build/security check on its current head SHA, has no pending or failing required checks, and is mergeable **MUST be merged automatically** without asking the owner to click Approve, Ready for review, or Merge.
- Reviews may be submitted by **any GitHub account or authorized bot permitted by GitHub**. The identity of an approver is not an additional application-level condition. **Do not require an APPROVE review at all unless GitHub's actual branch-protection/ruleset settings require one.** If rules require a reviewer, accept any approval that GitHub itself considers valid; do not impose a named-user or bot-only filter.
- A successful check is not enough if it covers an outdated SHA, is only partial, or another required check is pending/failed. Re-check PR state, conflict/mergeability, current SHA and all required checks immediately before merge. Never bypass GitHub branch protection or fake a green result.
- Do not create Draft PRs by default. One independent change = one normal PR. Prefer workflow-triggered merge after CI success, using the permitted GitHub API, then dispatch production deployment if the merge token does not trigger push workflows.
- If GitHub refuses the merge due to permissions, required approvals, branch rules, or a failed/pending check, report the precise blocker and fix permitted repository/workflow settings through a separate PR where possible. **Never silently fall back to manual approval as the intended workflow** or claim the deployment succeeded.
- This owner policy supersedes older AGENTS.md passages requiring manual approval, manual merge, a particular reviewer, or prohibiting safe CI-gated auto-merge. Keep independent security and data-safety gates in force.

## MANDATORY: Pull request first (project owner policy, 2026-10-30)

All changes to this repository MUST be made on a dedicated branch and submitted via a Pull Request targeting `main`. This includes UI/UX, application code, blog content, documentation, workflows, configuration, and hotfixes.

- **NEVER push or commit directly to `main`**, even for small edits, emergencies, or blog publishing.
- Create a new branch from the latest `main`, commit changes to that branch, then open a Pull Request.
- **Owner standing authorization (2026-10-30): automatically merge each non-Draft PR once the latest SHA passes the required CI gates, all known checks are completed successfully, and GitHub reports it mergeable.** No manual APPROVE is required unless GitHub branch rules explicitly require one; never bypass those protections.
- Keep PRs scoped and include a clear explanation, changed files, checks, and any deployment impact.
- If unable to create a branch or PR, report the blocker and do not substitute a direct push.
- Provide the PR URL and actual CI, merge, and deploy state. CI-green PRs should automatically merge via the approved workflow; do not claim production deployment before confirmed.
- Never infer ongoing authorization to bypass this process from earlier direct-push requests.


Before modifying UI/UX or building a new page, consult [BRANDING.md](BRANDING.md) for reference and update it when design decisions change. The project owner may redesign, replace, or remove theme UI and theme-switching controls without being blocked by legacy branding rules.

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
5. Auto-fix scope: only the above verified **obsolete Stack footer vs Blowfish footer** path mapping. For any other conflict or conflicting edits in the active footer, fail with an actionable message and require a human review. Never auto-repair a conflict by bypassing CI. Auto-merge applies only after a new successful check on the resolved head.

Prevention: one feature = one branch/PR; rebase or merge latest `main` before review; use the PR Bug Checker (up to 3 attempts) and do not promote changes from a conflicting or failing PR. Keep a native theme-specific footer adapter instead of directly editing multiple theme internals.


## PR quality gate (CI-gated auto-merge, owner authorization 2026-10-30)

- Each independent change gets its own PR, using a feature branch. Never push feature changes directly to main; merge only through CI-gated automation.
- `PR Bug Checker` runs one initial build/check and retries at most twice (3 attempts total). It classifies familiar Hugo config, Dart Sass, and module retrieval failures using verified historical playbooks. Diagnostic messages are advisory, **not evidence that a code fix was applied**. Unknown failures halt after the retry limit, with logs available for manual diagnosis and external documentation research.
- The `Auto-review after Bug Checker` workflow may submit an explicit GitHub APPROVE review **only** after the linked PR's Bug Checker run succeeds, the checked SHA still equals the PR head, and no known check has failed. The dedicated auto-approve.yml workflow merges the verified SHA without demanding a self-approval review and dispatches production; it never force-pushes.
- GitHub may refuse automatic reviews until Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests is enabled; authors cannot approve their own PRs. Auto-merge does not depend on a bot self-review; GitHub still enforces any independently configured required reviews.
- An automated CI approval is not the same as a human security/content review. The repository owner has explicitly authorized automated merge after checks; GitHub permissions and branch protection still apply. New commits require fresh checks.

## Safe automatic conflict repair

Workflow `.github/workflows/safe-conflict-fixer.yml` listens on same-repository pull requests. It auto-repairs **only** the verified Stack footer modify/delete conflict when the PR switches to Blowfish. It checks the module import, verifies the obsolete footer exists on main but is intentionally deleted on the PR, verifies this is the **only** merge conflict, retains the Blowfish `extend-footer.html` and Commit Status dashboard, then pushes a normal fast-forward merge commit on the PR branch. It never merges to `main`, never force-pushes, and never approves a PR.

Other conflicts are intentionally left for human resolution to avoid deleting recent work. Bug Checker must pass after any auto-fix and the owner must manually review and merge.


## Evidence-based CI knowledge base (2026-10-29)

- `data/ci/bug-knowledge.json` maintains curated, documented Hugo / Blowfish / Go Modules / GitHub Actions / GitHub Pages / static CMS failure signatures and past BlogNaver incidents. `scripts/ci-classify-failure.py` detects candidate causes from real CI output and points to remedies and documentation. It is heuristic, **not** proof of root cause or an autonomous AI engine.
- `scripts/test-ci-knowledge.py` supplies regression fixtures so changes to classification rules must pass deterministic tests. New cases require an authentic failure signature, minimal reproducer or real log, reliable documentation, and preferably a verified successful fix.
- No web access, model API, secrets or untrusted generated code is executed in the pull-request check. If a failure remains unknown, retain logs, stop after the existing retry limit, and investigate with official sources separately. Never auto-merge. Automatic merge requires verified-green checks; a bot APPROVE review is not a prerequisite.

## Bug Checker coverage and evidence rules (2026-10-29)

Project-specific CI rules are implemented in `scripts/pr-bug-checker.sh` and `scripts/ci-site-audit.py`. Validate: Hugo production build, CMS post index generation, key HTML routes, presence of published article outputs, first-party JS/CSS references from key pages, and syntax of changed JavaScript using `node --check`. These checks complement rather than replace UI, browser, integration, security, and editorial testing.

Failures must be distinguished by category: `missing-output`, `invalid-html`, `permalink`, `missing-asset`, `js-syntax`, `tooling`, Hugo template/module configuration errors, and transient infrastructure/network failures. Link diagnoses to real logs and successful fixes. Do not claim "AI/big data self-fix" without a tested deterministic fixer.

Retry transient failures at most twice (three checks total). Deterministic syntax, missing file and template failures normally require a source change; retrying alone is not a repair. Never download/execute suggested fixes from a search result. Never bypass CI, conflict checks or GitHub branch protection when auto-merging. PR mergeability and Bug Checker PASS are independent: a PR can pass CI while still having a merge conflict.

The source of truth for conflict resolution is the actual current PR merge state and the latest main head. Preserve both sides' nonconflicting edits, re-run checks, and never overwrite newer AGENTS.md policies.


### Incident: CI Git history missing on PR checkout (2026-10-29)

Verified from GitHub Actions run 40786196594 / job 123159871722: Hugo generated 89 pages and the CMS index successfully, but `scripts/ci-site-audit.py` failed with `tooling: git merge-base origin/main HEAD exited 128`. GitHub's checkout did not provide `origin/main` history. This is **not** an application or JS syntax failure. Repair by configuring `actions/checkout` with `fetch-depth: 0` and explicitly fetching `refs/heads/main:refs/remotes/origin/main` before diff-based audits. Validate `git merge-base origin/main HEAD` succeeds. Classify future occurrences under `tooling/git-history` and stop rather than retrying three times without changing the checkout. The CI test should still fail if history truly cannot be fetched; never silently skip the JS audit.


## Automated PR merge pipeline (2026-10-29)

`.github/workflows/auto-approve.yml` runs only when `PR Bug Checker` completes successfully for a PR opened against main in this repository. It checks the exact current commit SHA, the Bug Checker job result, other completed check results, and PR mergeability. It attempts a GitHub review `APPROVE`, then squash-merges via a compare-and-swap of the checked head SHA. It **never merges on a failing, pending, stale, conflicted, draft or fork PR**. If GitHub blocks approval (e.g., workflow permissions or self-review restriction), it stops without merging and reports a warning.

Merges done with GitHub Actions' `GITHUB_TOKEN` do not start regular `push` workflows. Immediately after successful merge, `auto-approve.yml` calls workflow_dispatch on `hugo.yml` for main to deploy the site; dispatch failures must be surfaced as errors (the merge itself has already occurred). Do not run third-party auto-approve actions directly on `pull_request.opened` because that approves before tests.


## GitHub Actions SHA pinning incident (2026-10-29)

The repository previously enforced full-length immutable commit SHAs for every `uses:` action. Workflow runs 40788272031 and PR #11 check runs failed at **Set up job**, before Hugo, CMS, or tests executed, because workflows referenced moving tags such as `actions/checkout@v4`. Fix: pin each referenced Action to its resolved, verified 40-character commit SHA. Do not delete `hugo.yml` because it is the production GitHub Pages deployment pipeline. Disabling the policy may unblock runs, but pinning is more reproducible. Record the failure as `ci-policy/sha-pinning`, not application or Hugo failure. After fixing CI, rerun/check PR workflows and production deployment.


## Theme migration DoIt and UI gate (2026-10-29)

The active Hugo theme is `github.com/HEIGE-PCloud/DoIt`. Do not restore Blowfish, Stack, Prism or their styling. Preserve custom Resume template, independent Resume CMS and blog CMS. `layouts/baseof.html` integrates the UI-only PIN gate and Commit Status component into DoIt. Homepage, post listing and individual posts are publicly readable; other pages display a SHA-256 PIN prompt. This is not secure server-side authorization: all files remain publicly fetchable, and the four-digit PIN is brute-forceable. Never place private data on public GitHub Pages relying on this gate.


## Live Codex quota source (2026-10-29)

- The public `/tien-ich/ai-agents-quota/` frontend may read quota snapshots from a user-initiated local bridge on `127.0.0.1:19473`. The bridge source is `scripts/codex-quota-bridge.py` (Python stdlib), which spawns the already authenticated local `codex app-server --listen stdio://` and calls `account/rateLimits/read`. **It never reads auth.json or sends credentials to the website or GitHub.** API response is allowlisted to usage percentages, window durations, and reset timestamps. The bridge only accepts requests from approved origins, binds loopback, is read-only, and does not launch automatically.
- Preserve existing <link> tags for access-gate.css/access-gate.js, DoIt, and manual quota import; the live source is an additive enhancement, not replacement. Browser requests can be blocked by local-network policies; show a failed-connection state rather than claiming live data.
- NEVER embed authenticated ChatGPT requests, browser cookies, or session tokens in public JavaScript or GitHub Actions. The Usage page at chatgpt.com is not a public cross-origin browser API.

## Theme customization freedom (2026-10-29)

The owner explicitly authorizes changes to theme appearance, navbar typography, light-only presentation, and theme UI controls. Historical Blowfish/dark-first policies are obsolete after DoIt migration. Do not prevent or roll back requested theme redesigns on the basis of legacy design guidance. Keep security, credential safety, content preservation, and PR/CI safeguards intact. `layouts/baseof.html` is the active base template; do not assume `layouts/partials/extend-head.html` is included unless verified.


## Automated Fix Bug 2026 incident publishing (2026-10-29)

When a same-repository Pull Request to main **has merged**, and GitHub PR Bug Checker history provides a **failed run on an earlier tested SHA** plus a **later passing run on a different SHA**, `.github/workflows/publish-fixbug-2026.yml` invokes `scripts/publish-fixbug-postmortem.mjs`. Automatic merges call that workflow through `workflow_dispatch` explicitly, because `GITHUB_TOKEN` merges do not normally trigger a nested `pull_request.closed` workflow. Manually merged PRs can use the `pull_request.closed` event.

The publisher checks the real PR, CI runs, failed job logs, rule signatures in `data/ci/bug-knowledge.json`, changed files and PR commits. It skips unverifiable incidents and transient retries, writes an idempotent post at `content/posts/fixbug-2026-pr-<number>.md`, tags it `fixbug` and `series`, attaches `series: ["fix-bug-2026"]`, and dispatches `hugo.yml` after a successful write. The repository is public, so NEVER include raw job logs, secrets, private paths, extracted user data or unverified root-cause claims. Log snippets are only used for signature matching, not reproduced.

This publisher is **deterministic technical reporting, not an autonomous LLM**. It records what is verified and carefully labels what cannot be inferred. A passing CI on a different SHA does not itself prove which line fixed the root cause. Idempotency is enforced by the PR-number filename and existing-file check. Do not change the workflow to trigger on every PR failure, every generic CI success, or CI retries on unchanged code. Neither the code nor CI logs should be executed as arbitrary commands.


### Fix Bug publication labels and Actions summary (2026-10-29)

All post-merge Fix Bug publication checks must make the result visible on the originating PR:
- `fixbug:evidence-confirmed` (blue): earlier failed CI on a different SHA, later passing run, and a deterministic knowledge-base log signature were observed. This does **not** mean the article is deployed.
- `fixbug:published` (green): the Markdown article was committed to `main` at `content/posts/fixbug-2026-pr-N.md`, or that file already exists. The separate GitHub Pages deployment must still succeed for the public URL to work.
- `fixbug:github-only` (yellow): publisher skipped the article because required evidence was missing; its diagnostic result is visible in the GitHub Actions log/summary. This label **does not** assert that new knowledge was automatically written to AGENTS.md.

Keep `fixbug:evidence-confirmed` together with `fixbug:published` when both facts hold; `fixbug:github-only` must not coexist with a published label. Report `PUBLISHED`, `EVIDENCE CONFIRMED`, or `GITHUB ONLY / SKIPPED` in the GitHub Actions job summary. The Actions workflow run-name must mention the PR number. Never report a skipped or still-pending article as published.


## Editorial workflow: ColdFusion and Lex Fridman research series (2026-10-29)

When the editor requests **cold fusion** or **Lex Fridman** as a standalone content shortcut, **request the original English transcript, subtitles, or article text before drafting or publishing**. Do not infer a specific episode without a supplied source, and do not silently translate unrelated prior content. Once source content is available, create an original Vietnamese research article, not a line-by-line translation. Read the whole source; distinguish guests' assertions, independent evidence, opinion and editorial interpretation; verify any external time-sensitive claims with authoritative references. Credit the original video/podcast URL and make it clear the post is an independent analysis. Do not copy substantial copyrighted transcript text.

Use `series: ["cold-fusion"]`, `tags: ["cold fusion", "series", ...]` for ColdFusion Research. Use `series: ["lex-fridman"]`, `tags: ["Lex Fridman", "series", ...]` for Lex Fridman Podcast Research. Add `seriesOrder` incrementally and keep both series registered in `data/series.yaml` with `total: 0` for ongoing coverage. Preserve original editorial and SEO standards and only claim publication after confirming CI, merge and Pages deployment.


## PR category labels and smart CI retries (2026-10-29)

GitHub Actions workflow runs cannot carry native colored labels. PRs have actual GitHub labels, populated by the trusted workflow `.github/workflows/pr-type-labels.yml` after Bug Checker finishes. Prefixes are drawn from Conventional Commits in PR titles: `feat:` purple; `fix:` red; `chore:` grey; `docs:` blue; `perf:` green; `refactor:` violet; `ci:` green; `content:` amber, etc. The Actions run title displays the PR title, and the labeling run's Job Summary lists the applied labels. For PRs with absent/malformed prefixes, the label is `other`. Labels appear under Pull Requests, not as colored pills on the Actions list.

Bug Checker runs at most **five checks per revision** with bounded backoff for transient infrastructure/network conditions. The first recognized deterministic failure (including `js-syntax`, Hugo template errors, or Git history errors) immediately stops retries and fails CI: re-running unchanged broken code is not a fix. On attempts 4+ for retryable failures, `scripts/ci-agent-playbook.py` reads `AGENTS.md` and Knowledge Base classification, presents relevant verified advice in Job Summary, and never executes untrusted instructions or changes PR source. A deterministic source patch still needs an independently tested commit and new CI run. The auto-merge job name must match this checker job; stale or failed runs cannot be merged.


CI label smoke test (2026-10-29): conventional title `chore:` must create the gray chore label on this PR while the PR Bug Checker runs; this is a metadata-only documentation change.

## MANDATORY: Verified bug lessons and evidence (2026-10-30)

For any bug, CI failure or hotfix, add structured PR body fields `Symptoms:`, `Root Cause:`, `Solution:`, `Verification: Verified ...`, optionally `Category:` and `Tags:`, **only after the cause and fix have independent evidence**. A successful commit, CI or merge is not sufficient proof of a UI bug's root cause or browser resolution. The trusted post-merge recorder automatically creates a separate normal PR updating **both** `AGENTS.md` and `data/ci/bug-knowledge.json`; CI-green auto-merge handles publication. Do not write either file directly to `main`. Unverified cases remain pending and must not be presented as successfully documented. New factual entries must not be interpreted as regex signatures: use a never-matching regex and `verified-postmortem` kind unless a separately tested detector is supplied. Avoid re-triggering from knowledge documentation PRs.

### Extended verified postmortem schema (owner rule, 2026-10-30)

Every **verified** bug, UX/UI regression or CI/CD fix that passes the evidence gate must be recorded in both `AGENTS.md` (Symptoms, Root Cause, Solution, Severity, Verification, PR URL) and `data/ci/bug-knowledge.json` through a normal CI-gated PR. JSON cases require `id: bug-YYYY-MM-DD-NNN`, `date`, `category`, `severity` (`Low`, `Medium`, `High`, `Critical`), `symptom`, `root_cause`, `fix_solution`, `pr_url`, and `tags`. Retain the existing knowledge-base classification keys (`title`, `regex`, `kind`, `advice`, `source`, `evidence`) for compatibility; factual postmortems must use a nonmatching regex. Require the merged source PR to provide `Symptoms:`, `Root Cause:`, `Solution:`, `Severity:`, and `Verification: Verified ...` evidence; do not infer root cause from a passing build alone. Skip incomplete cases and never invent success, even if this delays knowledge recording. Never push directly to `main`.
