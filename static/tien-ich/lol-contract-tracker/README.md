# LoL Contract & Transfer Tracker — BlogNaver

URL after reviewed PR merge/deploy: https://duynguyenaver.github.io/blognaver/tien-ich/lol-contract-tracker/

## Sources, meaning, and limits

The official source is Riot Games' public League of Legends Global Contract Database:
https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pubhtml

This public Google Sheet lists registered professional players/coaches, teams and their contract end dates. It is NOT a live versioned API. Each league tab can lag the latest announcement. An elapsed end date does NOT confirm free agency. A changed end date is NOT proof of renewal. A changed team registration alone is NOT a verified transfer.

- gcd.json: Riot public GCD snapshot with retrieval date, region tabs, contract end dates and at most 100 candidate changes.
- transfers.json: separate dated, sourced announcements and explicitly labeled rumors. Historical 2025 examples are not presented as new 2026 moves.
- Manual CSV upload: browser-only temporary import, NEVER auto-published or uploaded. User-supplied data is unverified until cross-checked with Riot.
- Read access does NOT require Riot API keys, GitHub tokens or OAuth. The existing BlogNaver access PIN remains untouched.

## Automatic refresh — Pull Requests ONLY

GitHub workflow: .github/workflows/lol-gcd-refresh.yml

1. Runs daily at 02:20 UTC or manually using GitHub Actions -> LoL Contracts · Daily Riot GCD Snapshot PR -> Run workflow, after initial feature PR merge.
2. scripts/update-lol-contracts.py reads Riot's public published Google spreadsheet tabs, downloads CSV, normalizes contract rows, detects changes and checks plausibility. Refuses to replace the old dataset when no valid rows are fetched, a previously indexed league disappears or over 30% of registrations vanish unexpectedly.
3. If the normalized data did not change, no PR is created.
4. If it changed, the workflow commits ONLY gcd.json on a fresh data/riot-gcd-* feature branch and creates a Pull Request; it NEVER writes directly to main. Required CI/review/merge then publish the new static snapshot.
5. Optionally store an approved fine-grained repo bot PAT as GitHub Actions secret BLOGNAVER_GCD_BOT_TOKEN (Contents and Pull requests write), so bot-created PRs can trigger CI. Without it, the workflow uses the default GITHUB_TOKEN, but GitHub repository settings may prevent PR creation and events caused by GITHUB_TOKEN generally do not trigger downstream PR checks. Never paste a PAT into frontend code or logs.
6. If Google changes pubhtml or column formats, updater can fail closed; inspect live GCD, update parser, test, open a PR rather than filling unverified values.

Offline regression tests:
- python3 -m unittest scripts/test_update_lol_contracts.py -v
- node --test scripts/test-lol-contract-tracker.mjs
- node --check static/tien-ich/lol-contract-tracker/tracker.js

Online availability check (does not write files):
- python3 scripts/update-lol-contracts.py --check

## Evidence-based contract statuses

- Còn thời hạn / Sắp đến hạn: date calculation from the last indexed GCD snapshot, not a binding assertion of current eligibility.
- Ngày GCD đã qua: only the recorded date passed. DO NOT label "free agent" without separate evidence.
- GCD đổi ngày hết hạn: potential extension, release or administrative correction; do not label renewed until announced.
- GCD đổi đội đăng ký: indicates a registration change, not automatically a confirmed transfer.
- Chuyển nhượng xác nhận / Gia hạn xác nhận: dated public official reports with source URLs in transfers.json.
- Tin đồn có nguồn: attributed report, NOT official signing.

Never publish salaries, buyout amounts or private contractual terms from speculation.

## Initial deployment

The committed seed gcd.json is intentionally empty, rather than containing invented contract dates. Real results appear after Riot CSV is fetched and the data snapshot PR is reviewed and merged. Meanwhile the tool links to Riot GCD and supports temporary local CSV import.

The utility uses static same-origin data and relative HTML asset URLs for GitHub Pages pathprefix /blognaver/. No cross-origin browser Sheets calls or paid API required.
