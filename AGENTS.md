# BlogNaver Agent Guidelines

## Owner workflow preference: execute requested repository changes immediately (2026-11-01)

- When the owner requests an actionable BlogNaver change, **implement it in the connected repository in the same request**, rather than answering with a long design analysis, hypothetical patches or instructions to manually copy code. No unnecessary reconfirmation when the requirements and target are already clear.
- Default to **branch → commit → Pull Request → CI verification → report actual state**; never push directly to `main`. Keep each requested editorial article in a separate dedicated PR. Respect required review and check status; avoid saying "live" until a real deploy is verified.
- Be concise in user-facing commentary: share the working PR, what actually changed, and test/merge/deploy state. Do not present speculative implementation as completed work. Ask for input only when truly required for access, safety or missing material constraints.
- This is an execution-first preference, **not** permission to bypass security, licenses, tests, CI, review gates or source verification.


## YouTube Voiceover Storytelling & Hoai My pronunciation (owner policy, 2026-10-31)

For all future BlogNaver YouTube voiceover script generators and related editorial projects, use a source-grounded **hook → conversational narrative → insight → audience question/CTA → warm sign-off** structure.

- In the first ~5 seconds, open with an engaging *topic-specific* rhetorical question, curiosity, dilemma or paradox; **do not begin by reading a dry article title, number or source metadata**. Do not assert invented claims or sensational details as facts. In deterministic clients without research/semantic understanding, use a safe question selected from detected topic cues rather than fabricated specifics.
- Convert stiff journalistic analysis into approachable talkshow storytelling while preserving attributions, dates, figures, caveats and uncertainty. Use natural context-specific paragraph transitions, not the same filler phrase on every paragraph.
- Remove bylines, dates/read-times in frontmatter, generic website UI and source/disclaimer blocks from the spoken script. **Latest explicit owner instruction for the TTS Voiceover Preprocessor:** remove calendar date strings from the *entire spoken output*, even within body prose (DD/MM/YYYY, DD.MM.YY, ISO dates, month/year, full day-month-year), before number-to-words conversion; do not silently reintroduce dates as spoken words. Keep the untouched original source in the user's input and preserve unrelated factual quantities (e.g. `30 năm`, `7 phút thuyết trình`). This date-free TTS output rule supersedes the older instruction to preserve dates in body narration. Convert other numeric/measurement expressions to Vietnamese spoken words as applicable and guard URLs and technical IDs.
- Optimize specifically for **Microsoft Hoai My Online (Natural) vi-VN**. Write **3D → Ba Đê**, **2D → Hai Đê**, **R&D → A-ren-Đê** (never *Ba Dê*), **AI → Ei-Ai**, **IT → Ai-Ti**, **MIT → Em-Ai-Ti**, **GPU → Gi-Pi-U**, **CPU → Si-Pi-U**, **ChatGPT → Chát-Gi-Pi-Ti**, **Silicon Valley → Si-li-con Va-li**, **Semiconductor → Xe-mi-con-đắc-tơ**, **Silicon → Si-li-con**. Keep hyphens between syllables in English-name phonetics (e.g. En-vi-đi-a, San-ta Cờ-la-ra, Voi-ơ-jơ, En-đê-vơ, Ca-li-phót-ni-a). Do not replace Vietnamese words that merely contain a technology acronym as a substring.
- Finish with a broader reflection or audience-facing question, an invitation to comment, and a natural warm channel sign-off; avoid reading a literal heading “Kết luận.” Do not invent a channel name unless it is established; BlogNaver can use its own name.
- Always provide editable output, listen-through before production and regression tests for dates, numbers, names, pronunciation, duplicate hook/sign-off and preservation of real technical content. A rule-based converter is an approximation; do not claim human-equivalent intonation.

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

## Unofficial historical LoL GCD archives (Leaguepedia, 2026-11-01)

- Riot's live public GCD Google Sheet is the **official** source for league-recognized current registrations/expiry. The Leaguepedia/Fandom `Archive:Global_Contract_Database` is a **third-party/community historical archive**, even when its underlying snapshots were derived from Riot. Never upgrade wiki copies or historical records to "official" or automatically overwrite the official GCD table.
- Historical timeline references must include source URL, archive date, region and clearly labeled uncertainty. Archived changes are possible hints for research, **not** proof of a player being released, renewed, eligible to negotiate or transferred.
- Respect Leaguepedia/Fandom access policies, robots.txt, licensing and citation. Historical discovery may index dated page links only; no bulk mirroring or anti-bot workarounds. If inaccessible, preserve verified links and warn, do not fabricate dates.
- Keep the existing private PIN/OTP, GitHub token and encrypted user-data protections intact. Both source refreshes use separate data files under the same PR-first CI-review policy. Every new update must be on a feature/data branch, never a direct main push.

## League of Legends contract and transfer intelligence (2026-11-01)

- The public **Riot Games League-Recognized Global Contract Database (GCD)** is the source for team registrations and listed contract end dates. The sheet is a tabbed public spreadsheet, not a live contract-renewal API. Never claim a date is a completed transfer, renewal, release, retirement or free agency by itself.
- Cross-check roster moves and contract renewals using dated official organization/Riot announcements (or rigorously attributed reporting) before assigning **confirmed**. Rumors must have their own distinct unconfirmed label, date and source URL.
- Keep per-region snapshot timestamps; do not imply every tab was updated at the same time or that the source is realtime. Fail closed when Google Sheets is unreachable, its headers change, or a large fraction of registrations disappears due to parsing.
- Any automatic GCD snapshot update goes through a fresh **data branch → Pull Request → CI → review → merge**, never a direct commit to main. A new GCD expiry date is evidence requiring investigation, not proof of signing an extension.
- Keep the LoL Contract Tracker public-data-only, no OAuth migration, no new GitHub token prompt, and do not change the existing utility PIN, PAT or AES-GCM data-security workflows.
- Use client-side CSV import only as **unverified temporary data**, not a publication path. Never scrape private accounts or invent salaries, transfer fees and confidential contract clauses.

## MANDATORY: One editorial blog post = one Pull Request (owner reminder, 2026-11-01)

- **Every owner-requested blog article, including esports features, research, AI-assisted writing, new series episodes, manual CMS posts, and editorial revisions, MUST be published via a dedicated feature/content branch and its own Pull Request.** Never push, commit, upload, or write an article directly to `main`, whether using a GitHub token, REST Contents API, GitHub connector, CLI, CMS, or scheduled editorial publisher.
- **One requested article = one separate content PR.** Related metadata, series catalog entry, licensed images, and links for that article may be included in the same PR; unrelated articles or application fixes require independent PRs.
- Required sequence: latest `main` → `content/<descriptive-slug>` → add/edit `content/posts/*.md` with Hugo front matter, `draft: false` only when ready → open normal PR → run required content/Hugo/CI checks on the current head SHA → review/auto-merge only after checks succeed → verify GitHub Pages deployment and the final article URL.
- Treat a commit to a feature branch as **not yet published**, and CI success/PR merge as **not evidence of live deploy**. Show the PR URL and actual state; never claim a new article is online without deployment verification.
- This explicit editorial rule applies to the Movistar KOI-style article workflow and future analogous blog posts. Existing automated CI incident postmortem generation has separate documented controls; do not silently change it or use it as a bypass for normal editorial publishing.

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

## Fix Bug 2026 · CI repair casebook / knowledge transfer (2026-11-01)

This section translates **eight published** `content/posts/fixbug-2026-pr-*.md` studies into reusable checks. The machine-readable companion is `data/ci/bug-knowledge.json > series_casebook.lessons`. **The blog articles are historical summaries, not independent proof of a single root-cause line**. Do not promote an observation, commit title, or passing workflow into a verified postmortem without the evidence gate below.

### Evidence categories — never merge them

- **CI recovery documented in article** (PRs [#54](https://github.com/duynguyenaver/blognaver/pull/54), [#124](https://github.com/duynguyenaver/blognaver/pull/124), [#227](https://github.com/duynguyenaver/blognaver/pull/227)): an earlier failed Bug Checker and a later successful Bug Checker on a changed revision were reported. Matching a classifier regex is an error **symptom**, not proof of which code line failed. Compare the earliest failure, commit diff and latest SHA before asserting causality.
- **Engineering postmortem, no verified CI red→green pair** (PRs [#232](https://github.com/duynguyenaver/blognaver/pull/232), [#237](https://github.com/duynguyenaver/blognaver/pull/237), [#244](https://github.com/duynguyenaver/blognaver/pull/244), [#249](https://github.com/duynguyenaver/blognaver/pull/249), [#258](https://github.com/duynguyenaver/blognaver/pull/258)): a documented defect/fix, diff and passing CI may support an **investigation playbook**, but not a fabricated CI recovery, proven production fix or automatically verified root cause. PR #237 additionally reports browser QA; attribute its measurements to the PR description.

### Reusable investigation and regression patterns

1. **JavaScript parse / event handlers — PR #54 and #227:** capture the **first** syntax error and file/line; check generated string/prompt concatenation and CMS Integration event code; run `node --check` on modified JS/MJS and parse inline browser scripts where relevant. Correct the source on a new commit before rerunning. A repeated CI attempt on the same broken SHA is not remediation.
2. **Hugo render / Sass — PR #124:** the published classifier called the signal "Hugo template or partial missing", while the PR also includes a Sass mixed-unit `min(...)` → `calc(...)` fix. **Do not equate these**. Inspect the first nested build error and check template overrides, version, SCSS arithmetic and generated CSS; rerun the Hugo build and inspect responsive layout after changes.
3. **Workflow YAML and test script — PR #232:** literal `\n` instead of line breaks inside a GitHub Actions YAML step can prevent scheduling altogether. Lint workflow YAML (with an Actions-aware linter where available), verify job creation, then run the relevant router regression `node scripts/test-cms-v2-router.mjs`. Avoid brittle JS-source regex to identify function boundaries. The article does **not** establish a failed→passing CI pair.
4. **Browser-only layout regression — PR #237:** investigate CMS V2 hidden Markdown field `min-height`, scroll-container boundaries and toolbar sticky offset rather than tweaking global padding blindly. Scope CSS to CMS V2; smoke-test tall/short desktop and narrow mobile viewports, keyboard focus, long editor scrolling and navigation. Hugo CI alone cannot certify this UX fix.
5. **External provider discovery / diagnostics — PR #244:** if a provider integration is still in scope, discover model capabilities via API method support rather than excluding every `preview` name; explain auth (401/403), invalid requests (400), unavailable models (404), throttling (429) and network/CORS separately. **Do not reintroduce Gemini controls into the TTS utility**, where the later owner instruction removed them.
6. **Web Speech asynchronous availability — PR #249:** `speechSynthesis.getVoices()` can initially enumerate local voices. Handle `voiceschanged` and finite retry; choose Hoai My by normalized name, then Vietnamese Online/Natural, then local Vietnamese. Refresh dropdown/state when better voices arrive, but respect an explicit manual choice. Test the actual target browser.
7. **Data-cleaning ordering — PR #258:** remove copied buttons/UI labels, publication dates, metadata and source boilerplate **before** number-to-words and brand phonetics. Otherwise dates become unrecognizable spoken tokens. Purge calendar dates from the entire TTS spoken script per owner policy, but retain meaningful `30 năm`, `7 phút thuyết trình`. Test standalone and inline date formats, orphan `trong.`/`và.`, and Hoai My terms `GPU`/`3D`.
8. **Shared CI safety across all eight cases:** isolate the changed file, inspect original failed run/commit, classify deterministic vs transient, keep retries bounded, add a regression fixture for the real failure mode, check **current head SHA + all required checks + mergeability**, merge only via PR, then verify deploy and browser runtime separately. Keep logs redacted; do not expose PAT, secrets or diary content.

### Usage in Bug Checker and future incident writing

- `scripts/ci-classify-failure.py` continues to match only the established `cases[]` signatures. `series_casebook.lessons[]` provides **read-only, evidence-calibrated suggestions**; it must not become new regex auto-detection or auto-edit instructions.
- `scripts/ci-agent-playbook.py` may surface related casebook advice in the CI Job Summary. Treat it as a check list, not permission to patch untrusted PR code. CI classification and retry decisions must stay based on the existing safe failure taxonomy.
- If a new issue has independent evidence of symptom **and** mechanism, solution and verification, follow `postmortem_schema` and the verified postmortem policy below. Otherwise keep it as an advisory lesson with its exact source/evidence limit, not an entry claiming `Verification: Verified`.
- Validate the KB with `python3 scripts/test-ci-knowledge.py`; inspect that all eight linked local articles exist and that their `evidence_mode`, classifier IDs and links are correct. No direct main commits.

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
