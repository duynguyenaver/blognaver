#!/usr/bin/env python3
"""Static regression checks: generated vocabulary PRs require owner credentials."""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SYNC = (ROOT / ".github/workflows/trilingual-vocabulary-sync.yml").read_text(encoding="utf-8")
HUGO = (ROOT / ".github/workflows/hugo.yml").read_text(encoding="utf-8")
MERGE = (ROOT / "scripts/merge-verified-vocabulary-pr.sh").read_text(encoding="utf-8")

class OwnerOnlyVocabulary(unittest.TestCase):
    def test_sync_publishes_with_owner_identity(self):
        self.assertIn('git config user.name "duynguyenaver"', SYNC)
        self.assertIn('349135289+duynguyenaver@users.noreply.github.com', SYNC)
        self.assertNotIn('41898282+github-actions[bot]', SYNC)
        self.assertIn('if [ "$OWNER" != "duynguyenaver" ]', SYNC)
        self.assertNotIn('BLOGNAVER_VOCAB_BOT_TOKEN || github.token', SYNC)

    def test_hugo_dispatch_uses_owner_not_workflow_token(self):
        trigger = HUGO.split("  start-language-lab:", 1)[1]
        self.assertIn('secrets.BLOGNAVER_VOCAB_BOT_TOKEN', trigger)
        self.assertNotIn('GH_TOKEN: ${{ github.token }}', trigger)
        self.assertIn('if [ "$ACTOR" != "duynguyenaver" ]', trigger)
        self.assertIn('gh api -X POST', trigger)

    def test_pat_actions_dispatch_denial_does_not_fail_pages(self):
        trigger = HUGO.split("  start-language-lab:", 1)[1]
        self.assertIn('if ! gh api -X POST', trigger)
        self.assertIn('Pages deployed, Language Lab not dispatched', trigger)
        self.assertIn('Actions: Read and write', trigger)
        self.assertIn('Pull requests: Read and write', trigger)
        self.assertIn('exit 0', trigger)
        self.assertNotIn('GH_TOKEN: ${{ github.token }}', trigger)

    def test_merge_rejects_bot_authored_prs(self):
        self.assertIn('ACTOR="$(gh api user --jq .login)"', MERGE)
        self.assertIn('.user.login==$owner', MERGE)
        self.assertIn('Bug Checker — Hugo', MERGE)
        self.assertIn('conclusion=="success"', MERGE)

    def test_rest_pr_creation_never_falls_back_to_bot(self):
        self.assertIn('gh api -X POST "repos/$REPO/pulls"', SYNC)
        self.assertIn("Pull requests → Read and write", SYNC)
        self.assertNotIn('gh pr create', SYNC.split("      - name: Create data branch and Pull Request", 1)[1])
        self.assertIn('BLOGNAVER_VOCAB_BOT_TOKEN', SYNC)

    def test_gemini_groq_not_offline_in_production(self):
        self.assertIn('VOCAB_OFFLINE_ONLY: "0"', SYNC)
        self.assertIn('GEMINI_API_KEY:', SYNC)
        self.assertIn('GROQ_API_KEY:', SYNC)

if __name__ == "__main__":
    unittest.main()
