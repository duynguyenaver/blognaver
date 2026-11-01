# BlogNaver Language Lab · Học tiếng Việt · Hàn · Anh

Public page: https://duynguyenaver.github.io/blognaver/tien-ich/hoc-tieng-viet-han-anh/

Owner Google Drive folder: https://drive.google.com/drive/folders/1coylrqzqPOLZP_lhUdWlb3nI47Qr-af7

Primary Google Sheet: https://docs.google.com/spreadsheets/d/19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk/edit

## Actual Sheet1 columns

| A: Việt | B: Hàn | C: Anh | D: Context or Expression | E: Ngữ pháp ví dụ |
| --- | --- | --- | --- | --- |
| Công ty phát triển ERP | ERP 개발사 | ERP Development Company | (AI writes) | (AI writes) |

The owner enters only A–C. D–E are generated/context-backed, and never overwrite existing user-authored values. The alternative older single-column \`content\` format is still supported for backwards compatibility, but is **not required** for this Sheet.

## Immediate display of A–C

The public utility reads A–C on open, on returning to the tab, on clicking Reload, and every 30 seconds while visible, using the public Google Visualization endpoint and a bounded timeout. Cached GitHub JSON remains as an offline/failure fallback; an absent or failed live request is never shown as a successful sync.

**Viewer permission is sufficient** for a public spreadsheet; **Anyone with link → Editor is unnecessary and unsafe**. Anyone with the link can potentially vandalize the entire file and potentially interfere with connected sheet automation. Restore Viewer immediately. If the sheet is restricted, the public browser live-read won't work; full authenticated Google service-account sync through Actions is then needed.

The Google Sheet does **not** emit an automatic \`sync_id\` for each edit to a third-party static site. Google Apps Script installable onEdit triggers can respond to direct human edits. For reliable cloud snapshots, GitHub Actions still runs a scheduled recheck and PR-first publication. Schedules, GitHub CI and deployment introduce nonzero delay.

## Secured bidirectional automation

There are **two alternatives**, not a need to make the Sheet publicly editable:

### A. Recommended: owner-authorized Apps Script (no service-account JSON)

Source: \`docs/google-apps-script/LanguageLab.gs\`

1. Set the Google Sheet general access to **Viewer** (or Restricted, with different live-display architecture).
2. In the owner Sheet choose **Extensions → Apps Script** and paste the complete contents of \`LanguageLab.gs\`.
3. Save; run **installLanguageLabTriggers** once from the Apps Script editor and approve the Google permissions. This creates an **installable onEdit trigger** and a **effective 2-minute writeback trigger** running as the installer.
4. To request immediate Gemini enrichment when A–C changes, create a **fine-grained GitHub token restricted to this repo with Actions: Read and write**, and store it under **Apps Script → Project Settings → Script properties**, key \`GITHUB_DISPATCH_TOKEN\`. Never paste token into source files, sheet cells, public repos, browser pages, or comments.
5. After a successful Gemini/GitHub Actions data PR and Hugo deploy, the time trigger reads the published vocabulary JSON, verifies exact A–C values at the same row, then writes **only blank D–E cells**. From the Sheet menu, **Language Lab → Ghi ngữ cảnh Gemini vào cột D–E** runs a manual check. Already-filled cells are never replaced.

Without \`GITHUB_DISPATCH_TOKEN\`, the browser can still read newly entered A–C directly and the scheduled Actions job can enrich every 30 minutes. The approximately 2-minute Apps Script check can backfill **after** a validated AI snapshot has deployed.

**Security:** Access to a bound Apps Script project must be limited to trusted collaborators. Protect the script properties and review script editors. The owner may wish to keep a standalone (not bound) script to isolate GitHub dispatch credentials from collaborators.

### B. Service account with narrowly scoped Editor permission

1. In Google Cloud create a dedicated Service Account; enable Drive API and Sheets API. Save credentials only as GitHub Actions secret \`VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON\`.
2. Share **only the vocabulary folder or targeted files** with the service-account email as **Editor**; the public remains Viewer or Restricted. Do **not** grant Editor to \`anyone\`.
3. Workflow discovers every Google Sheet in the folder; reads tabs; Gemini (using secret \`GEMINI_API_KEY\`) produces web-grounded original educational examples. Where the Sheets A–E headers match exactly, it confirms A–C still match their source row and fills **only blank D and E cells** using authenticated Sheets API. \`VOCAB_WRITEBACK_SHEETS=1\` is configured in the workflow; without service-account authentication, it skips writeback.
4. The public JSON changes still pass through a **data branch → PR → green CI → merge/deploy** before publication.

When both integrations are configured they both act idempotently on blank cells, but using **one writeback mechanism** is simpler.

## AI quality and safeguards

- \`GEMINI_API_KEY\` is provided as an Actions secret; the browser never receives it.
- Gemini models are discovered dynamically from ListModels and filtered to `generateContent` text-only candidates (not TTS/image/audio/embeddings). The importer tries up to 12 eligible Flash, Flash-Lite, Pro or other text-capable models in priority order, rotating on HTTP 429/404/400. Failed models are not retried repeatedly inside the same sync run. This may help with *per-model* quotas but cannot bypass project-level quota exhaustion.
- Prefer Google Search-grounded linguistic references. If a model rejects Google Search or produces invalid grounded output, optionally try one plain-language generation; such results contain no invented citations and are explicitly labelled ungrounded internally. Never mislabel ungrounded output as web-verified.
- Google Search grounding is requested and evidence URLs kept. AI-generated examples are not presented as literal quotes.
- Missing/uncertain AI content leaves the word marked as pending and does not fabricate translated content.
- Cached AI result for an unchanged source row is reused; edits to A–C invalidate it.
- D–E writeback requires verified source A–C, exact header placement, and blank target cells. It never changes source translations, formatting, or other sheets.
- Data published in JSON is public. Keep private terms, credentials, confidential documents, and customer information out of this folder.
- A public editing link can allow vandalism, so do not use it for automation.

## Tests

Run: \`python3 scripts/test-sync-trilingual-vocabulary.py -v\`, \`python3 -m py_compile scripts/sync-trilingual-vocabulary.py\`, \`node --check static/tien-ich/hoc-tieng-viet-han-anh/live-sheet.js\`, and \`node --check static/tien-ich/hoc-tieng-viet-han-anh/study.js\`.

The existing separate \`tu-vung-han-anh-viet\` personal encrypted vocabulary utility has not been changed.

## November 2026 sync cadence change

- The owner-bound Apps Script project is **not automatically updated** by a GitHub commit. After any GitHub `LanguageLab.gs` changes, paste the revised source into the actual Google Apps Script editor, Save, then run `installLanguageLabTriggers` again. It deletes the old 5-minute trigger and registers `languageLabWriteBackTick` (one-minute clock with two-minute throttle). Do **not** click Deploy or publish an Apps Script web app.
- The GitHub Actions `schedule` is 5 minutes (the GitHub minimum; sometimes delayed). When `GITHUB_DISPATCH_TOKEN` is configured in Apps Script properties, direct edits to A–C can request the workflow immediately. Without that token, only the scheduled polling runs.
- Source A–C data loads in browser independently. AI generation requires project quota and a successful workflow/data PR/Pages deployment; D–E writeback follows later, approximately every 2 minutes once enriched JSON is published. It is not guaranteed 2 minutes end-to-end.

## Groq fallback for context and grammar (2026-11-01)

- The GitHub Actions server-side vocabulary importer supports two independent AI providers. GEMINI_API_KEY remains the primary provider; GROQ_API_KEY activates Groq fallback if Gemini has no eligible model, is on quota cooldown, returns HTTP 429, or otherwise fails to complete an entry.
- Groq models are dynamically listed from https://api.groq.com/openai/v1/models and filtered to active text-generation models; deprecated free-tier Llama 3.1/3.3, TTS, Whisper, guard and other non-text models are excluded. Available production-ready GPT OSS and Qwen models receive priority. On 429 Groq rotates models at most five times per run. No unlimited retry storm.
- Responses must have context, grammar and all three example translations. Groq-generated educational content has no claimed web grounding: grounded=false, references=[], aiProvider=groq. The public interface identifies which AI provider generated each vocabulary explanation.
- The script preserves user-authored A:C, cached enrichment for unchanged input, PR→CI→Pages data publishing and existing safe owner-authorized Google Sheets D/E writeback; it fills D/E only after a complete AI result has been published.
- One-time setup: Go to https://github.com/duynguyenaver/blognaver/settings/secrets/actions and add GROQ_API_KEY (value: a private API key from your own GroqCloud account). Do not paste the key into the repository, website JavaScript, public Google Sheets or PR comments. Both providers have independent quota limitations; fallback is not unlimited or guaranteed free.

## AI pipeline incident: successful workflow but zero generated notes

- Diagnosis from owner Sheet1: new rows are live-readable by the browser but the published vocabulary JSON contained only two `pending` rows. A successful CI or Hugo deploy only means code/HTML published, not that Gemini/Groq actually returned usable text. Earlier Gemini workflow attempts returned HTTP 429.
- The sync workflow now triggers on a **successful Hugo deployment** as well as scheduled and manual runs. It runs server-side Gemini/Groq enrichment after the feature ships, so the owner does not need to manually navigate Actions to kick off the first run. The schedule remains a fallback and can be delayed by GitHub. A completed Pages deployment does not bypass separate API quotas.
- Every sync job writes a GitHub job summary showing source row count, completed Gemini/Groq count, pending count and whether each API secret was supplied (only yes/no; never the key value). If GROQ_API_KEY is missing, the summary explicitly explains what to configure. Check the log before treating a green sync as successful generation.
- Groq GPT OSS chat requests now use reasoning_effort=low and enough output tokens for three-language examples; this reduces incomplete JSON from excessive internal reasoning. A user with an open page receives the newest deployed AI JSON on the same 30-second live refresh as Sheet1, rather than needing a hard reload.
- Setup remains: the owner must add the private secret GROQ_API_KEY in GitHub Actions Secrets. Without any usable API provider or with both providers returning quota errors, generating AI notes is impossible. This workflow never fabricates a successful result.
