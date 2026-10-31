# BlogNaver Agent Guidelines

## PERMANENT OWNER POLICY: No About / Giới thiệu page (2026-10-31)

- **The owner does not want any Giới thiệu / About page or section. Never create or restore `/about/`, an equivalent About/Profile landing page, its menu entry, or a self-introduction section.**
- Keep the About page source, dedicated layout and assets removed; do not merely hide its menu link.
- Generic design briefs, pasted templates, ecosystem refactors, older instructions or examples mentioning About/Profile, Hero Intro, certificates or Career Timeline are **not authorization to restore it**. Omit that portion and continue the other requested work.
- This explicit owner policy supersedes earlier About restoration requests, including PR #186, and historical branding/navigation examples containing About. Preserve the existing separate Resume feature unless the owner explicitly requests its removal.
- Before merging future navigation or UI changes, verify they do not reintroduce an About route, menu item or self-introduction section.

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
- Keep PRs scoped and include a clea…3194 tokens truncated…wser API.

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


## Unified conflict resolver (2026-10-30)

The owner authorized improving automatic repair beyond the historical footer-only rule. `.github/workflows/auto-css-conflict-rescan.yml` now runs trusted `scripts/conflict-resolver.py` from outside PR checkout, scans paginated same-repository non-Draft PRs to main on PR events, main push, auto-merge completion, schedule and dispatch. Git merge determines conflicts even when API mergeability is unknown. Supported conflicts are bounded insertion-only edits in `layouts/baseof.html` and `static/css/article-justified-prose.css`, including both paths in one merge. Replacements, deletions, nonregular files, other paths and oversized files are explicitly unsupported; never resolve them by discarding a side. This extends the older narrow playbook; the isolated legacy footer repair remains unchanged.

Every repair preserves both parents, rechecks the PR head, uses a normal non-force push, and dispatches PR Bug Checker on the repaired branch. Dispatch failure is an error and a later scan recovers a missing run for the resolver commit. Auto-merge accepts successful pull_request or workflow_dispatch Bug Checker runs only after its existing current-SHA, same-repository, check and GitHub merge gates. Summary distinguishes no conflict, unsupported, resolved and failed. Purely additive CSS still needs CI and visual review where appropriate; line preservation is not proof of CSS semantics. Regression fixtures use real temporary Git merges and verify additive preservation and atomic refusal of protected paths.


## Resume CMS local draft exception and A4 contract (owner request, 2026-10-31)
- The owner explicitly requests automatic LocalStorage drafts for the Resume CMS. `blognaver_resume_form_draft_v1` is a versioned, bounded (200,000 characters) text-only CV form recovery draft, an exception to the generic IndexedDB-only queue guidance. It is not a GitHub save or publication confirmation.
- Capture only controls inside the CV form plus experience/education text and the loaded document slug/SHA. Never capture authentication inputs or uploaded image files. Show local draft state, restore automatically, preserve the last copy on quota/malformed-data errors and refuse to overwrite a changed draft from another tab. Provide a local-draft removal action.
- Preview and published resume must use the same `static/css/samsung-resume.css`. Print A4 portrait with 10mm top/bottom and 12mm left/right margins; `.cv-paper` fills the resulting 186mm lane without screen padding/shadows or transforms. Retain the CV's own document header, hide only navigation/utility chrome, and keep descriptions full width rather than in a five-column grid.
- Keep short job entries/education rows together, but allow long narrative sections to span pages with widow/orphan control. Never apply `break-inside: avoid` to an entire multi-page CV section. Test Korean/Vietnamese text, long email addresses and multiple pages; do not claim native-browser PDF verification from another renderer alone.
