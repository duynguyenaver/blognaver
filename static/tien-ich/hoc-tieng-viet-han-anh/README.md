# BlogNaver Language Lab · Học tiếng Việt | Hàn | Anh

URL after verified deployment: \`/blognaver/tien-ich/hoc-tieng-viet-han-anh/\`

Google Drive folder: https://drive.google.com/drive/folders/1coylrqzqPOLZP_lhUdWlb3nI47Qr-af7

Initial Sheet: https://docs.google.com/spreadsheets/d/19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk/edit

## Sheet1 input format

A header cell named **content** is accepted. Add entries below, one per row:

| content |
| --- |
| 환불 |
| Hoàn tiền \| 환불 \| refund |
| Việt: ngày nghỉ \| Hàn: 휴가 \| Anh: leave |

You may alternatively create three columns headed **Việt | Hàn | Anh** (or equivalent names). Never enter AI context or grammar in Sheets unless you explicitly want to change this system later.

- A single \`content\` entry is preserved as-is; Gemini can fill translations only when confidently matched.
- Pipe-separated input follows **Việt | Hàn | Anh**. Unclear phrases are never silently assigned an invented translation.
- Source IDs are based on spreadsheet, tab, and actual row number. Changes invalidate the AI cache; unchanged rows reuse it.
- On a row edit, the importer takes the new source values; Gemini adds only missing translations and educational examples. Deletions propagate on successful next import. A sudden empty result after a nonempty dataset fails closed to prevent destructive outages.
- If Gemini fails, source values remain available with \`pending\` status. We do not imply generated examples are verified quotes from web pages.

## Required GitHub Actions secrets

- \`VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON\` — Google Cloud service account **JSON**, with Drive readonly and Sheets readonly scopes. Share the Drive folder with the service account's email (Viewer). This is required to discover every new spreadsheet and every worksheet/tab in the folder. **Never commit this JSON or paste it into public issues or PRs.**
- \`GEMINI_API_KEY\` — Gemini API key (server-side only), with a model supporting Google Search grounding. The action discovers supported \`generateContent\` models dynamically, rather than hardcoding a retired model.
- \`BLOGNAVER_VOCAB_BOT_TOKEN\` — optional trusted GitHub token with \`contents:write\` / \`pull_requests:write\` for PR creation and normal push/deploy events; otherwise workflow uses \`github.token\` and existing PR automation.

The linked public Sheet is available as a **fallback without a service account** using CSV export. In this fallback mode, only the specified sheet's first tab is loaded; the importer cannot discover new Drive folder files. Full folder syncing requires the service account. If the public sheet cannot be downloaded, fail without overwriting prior vocabulary.

## Operation

- Workflow: \`.github/workflows/trilingual-vocabulary-sync.yml\`.
- Checks every 30 minutes at minute 7 and 37 (UTC); GitHub may delay scheduled runs. GitHub Actions **Run workflow** triggers a manual refresh.
- Data imports on a dedicated \`data/vocab-drive-sync-<run>\` branch and separate PR; no data commits to \`main\`. Existing reviews/checks and branch protections must pass before merge.
- Only a **merged and deployed** data PR reaches public GitHub Pages. Clicking **Tải lại** in the UI refreshes the deployed snapshot; it does not run a Google API job.
- Gemini enrichment is capped to 30 pending entries per run. New or changed words are prioritized; large sets fill in over multiple cycles.
- Data from Sheets is published to a public GitHub Pages JSON file. **Do not store private/sensitive vocabulary or personal data in the source folder**; anyone with the site URL can read its content.

## Test

\`\`\`sh
python3 -m unittest discover -s scripts -p 'test-sync-trilingual-vocabulary.py' -v
python3 -m py_compile scripts/sync-trilingual-vocabulary.py
node --check static/tien-ich/hoc-tieng-viet-han-anh/study.js
\`\`\`

The system does not need an API key in the browser. The older private vocabulary utility \`tu-vung-han-anh-viet\` is not modified.
