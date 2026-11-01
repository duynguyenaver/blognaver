#!/usr/bin/env python3
"""Deterministic smoke tests for the restored Language Lab provider pipeline."""
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/trilingual-vocabulary-sync.yml"
JS = ROOT / "static/tien-ich/hoc-tieng-viet-han-anh/study.js"
CSS = ROOT / "static/tien-ich/hoc-tieng-viet-han-anh/study.css"
DATA = ROOT / "static/tien-ich/hoc-tieng-viet-han-anh/vocabulary.json"

class RestoreProviders(unittest.TestCase):
    def test_gemini_groq_enabled(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn('VOCAB_OFFLINE_ONLY: "0"', workflow)
        self.assertIn('GEMINI_API_KEY:', workflow)
        self.assertIn('GROQ_API_KEY:', workflow)
        self.assertNotIn('VOCAB_OFFLINE_ONLY: "1"', workflow)

    def test_owner_pat_mandatory(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertEqual(sum(line.lstrip().startswith('GH_TOKEN:') for line in workflow.splitlines()), 3)
        self.assertEqual(workflow.count('secrets.BLOGNAVER_VOCAB_BOT_TOKEN'), 3)
        self.assertNotIn('BLOGNAVER_VOCAB_BOT_TOKEN || github.token', workflow)
        self.assertIn('gh api user --jq .login', workflow)

    def test_groq_green_status_badge(self):
        js = JS.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        self.assertIn('GROQ AI · TẠO THÀNH CÔNG', js)
        self.assertIn('GEMINI AI · TẠO THÀNH CÔNG', js)
        self.assertIn('.ai-status.groq-success', css)
        self.assertIn('limit=3', js)

    def test_cached_groq_notes_are_kept(self):
        entries = json.loads(DATA.read_text(encoding="utf-8"))["items"]
        self.assertGreaterEqual(len(entries), 22)
        groq = [x for x in entries if x.get("aiProvider") == "groq"]
        self.assertGreaterEqual(len(groq), 22)
        self.assertTrue(all(x.get("context") and x.get("grammar") for x in groq))
        self.assertTrue(all(x.get("aiModel") == "openai/gpt-oss-120b" for x in groq))

if __name__ == "__main__":
    unittest.main()
