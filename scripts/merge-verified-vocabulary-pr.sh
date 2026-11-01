#!/usr/bin/env bash
# Automatically merge only Google Actions-generated vocabulary data PRs after CI.
# Never bypass GitHub branch protection or reviewer requirements.
set -euo pipefail
: "$REPO"
: "$GH_TOKEN"
PR_NUMBER="$1"
EXPECTED_SHA="$2"
# Only the repository owner may authorize the merge; bot-authored PRs are refused.
ACTOR="$(gh api user --jq .login)"
if [ "$ACTOR" != "${REPO%%/*}" ]; then
  echo "::error::Vocabulary merges require owner credentials (got $ACTOR)"
  exit 1
fi
EXPECTED_FILE="static/tien-ich/hoc-tieng-viet-han-anh/vocabulary.json"
case "$PR_NUMBER" in *[!0-9]*|"") echo "::error::Invalid PR number"; exit 1;; esac
case "$EXPECTED_SHA" in *[!a-f0-9]*|"") echo "::error::Invalid Git SHA"; exit 1;; esac
if [ "$(printf '%s' "$EXPECTED_SHA" | wc -c | tr -d ' ')" -ne 40 ]; then
  echo "::error::Expected 40-character SHA"; exit 1
fi
# Trust only a PR with exactly one changed vocabulary JSON file.
FILES="$(gh api "repos/$REPO/pulls/$PR_NUMBER/files?per_page=100" --jq '.[].filename')"
if [ "$FILES" != "$EXPECTED_FILE" ]; then
  echo "::error::Unexpected changed files: $FILES"; exit 1
fi
read_pr() { gh api "repos/$REPO/pulls/$PR_NUMBER"; }
assert_pr() {
  local doc
  doc="$(read_pr)"
  if [ "$(jq -r '.state' <<<"$doc")" = "closed" ] && [ "$(jq -r '.merged' <<<"$doc")" = "true" ]; then
    echo "Data PR already merged"; return 2
  fi
  if ! jq -e --arg sha "$EXPECTED_SHA" --arg repo "$REPO" --arg owner "${REPO%%/*}" \
    '.state=="open" and (.draft|not) and .base.ref=="main" and .head.sha==$sha and .head.repo.full_name==$repo and .user.login==$owner' <<<"$doc" >/dev/null; then
    echo "::error::PR is no longer an eligible same-repo PR to main at expected SHA"; return 1
  fi
}
assert_pr || { code="$?"; if [ "$code" -eq 2 ]; then exit 0; else exit "$code"; fi; }
READY=false
for attempt in $(seq 1 45); do
  CHECKS="$(gh api "repos/$REPO/commits/$EXPECTED_SHA/check-runs?per_page=100")"
  if jq -e '[.check_runs[] | select(.status=="completed" and
    (.conclusion as $outcome | ["failure","cancelled","timed_out","action_required","startup_failure"] | index($outcome) != null))] | length > 0' <<<"$CHECKS" >/dev/null; then
    echo "::error::One or more CI checks failed or were cancelled; leaving PR open"; exit 1
  fi
  if jq -e '
      any(.check_runs[]; .name=="Bug Checker — Hugo (5 attempts, smart stop)"
        and .status=="completed" and .conclusion=="success")
      and any(.check_runs[]; .name=="test" and .status=="completed" and .conclusion=="success")
      and all(.check_runs[]; .status=="completed"
        and (.conclusion as $outcome | ["success","neutral","skipped"] | index($outcome) != null))
    ' <<<"$CHECKS" >/dev/null; then
    READY=true; echo "Required checks green, and all checks completed"; break
  fi
  echo "CI pending; poll $attempt/45"; sleep 15
done
if [ "$READY" != true ]; then
  echo "::error::Checks did not finish within the allotted period; no merge"; exit 1
fi
assert_pr || { code="$?"; if [ "$code" -eq 2 ]; then exit 0; else exit "$code"; fi; }
MERGED_SHA="$(gh api -X PUT "repos/$REPO/pulls/$PR_NUMBER/merge" \
  -f merge_method=squash -f sha="$EXPECTED_SHA" \
  -f commit_title="data(vocab): verified auto merge PR #$PR_NUMBER" --jq '.sha')"
if [ -z "$MERGED_SHA" ] || [ "$MERGED_SHA" = "null" ]; then
  echo "::error::GitHub did not confirm a merge"; exit 1
fi
echo "::notice::Auto merged vocabulary PR #$PR_NUMBER at $MERGED_SHA"
# Token-authored merges don't automatically trigger push workflows.
gh api -X POST "repos/$REPO/actions/workflows/hugo.yml/dispatches" -f ref=main
echo "::notice::Hugo GitHub Pages deployment requested"
