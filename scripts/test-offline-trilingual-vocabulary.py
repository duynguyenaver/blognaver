#!/usr/bin/env python3
"""Run keyless vocabulary generation tests locally without network or API keys."""
import importlib.util
import json
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "offline_trilingual_vocabulary", ROOT / "offline_trilingual_vocabulary.py")
offline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(offline)
spec2 = importlib.util.spec_from_file_location("vocab_sync_offline", ROOT / "sync-trilingual-vocabulary.py")
sync = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(sync)


class OfflineLanguageTests(unittest.TestCase):
    def test_every_curated_phrase_produces_complete_original_learning_notes(self):
        lexicon = json.loads((ROOT / "trilingual-offline-notes.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(lexicon["items"]), 21)
        for vi, record in lexicon["items"].items():
            with self.subTest(vi=vi):
                before = {"vi": vi, "ko": record["sourceKo"], "en": record["sourceEn"]}
                saved = dict(before)
                result = offline.offline_enrich(before)
                self.assertEqual(before, saved)
                self.assertEqual("ready", result["aiStatus"])
                self.assertEqual("offline", result["aiProvider"])
                self.assertEqual("curated-offline-v1", result["aiModel"])
                self.assertTrue(result["context"])
                self.assertTrue(result["grammar"])
                self.assertTrue(all(result["examples"][language] for language in ("vi", "ko", "en")))
                self.assertFalse(result["grounded"])
                self.assertEqual([], result["references"])

    def test_translation_edit_invalidates_curated_grammar_without_guessing(self):
        result = offline.offline_enrich({
            "vi": "phong thái", "ko": "자신감 있는 태도", "en": "demeanor"})
        self.assertEqual("template-offline-v1", result["aiModel"])
        self.assertTrue(result["reviewRecommended"])
        self.assertIn("자신감 있는 태도", result["grammar"])

    def test_unseen_expression_has_safe_disclosed_template_not_hallucinated_usage(self):
        source = {"vi": "thuật ngữ mới", "ko": "새로운 표현", "en": "a new expression"}
        content = offline.offline_enrich(source)
        self.assertEqual("template-offline-v1", content["aiModel"])
        self.assertTrue(content["reviewRecommended"])
        self.assertIn("Tham khảo offline", content["context"])
        self.assertIn("이번 수업", content["examples"]["ko"])
        self.assertNotIn("https://", content["context"])
        self.assertEqual(source, {"vi": "thuật ngữ mới", "ko": "새로운 표현", "en": "a new expression"})

    def test_grammar_rules_for_questions_and_formal_ending(self):
        self.assertIn("câu hỏi", offline.korean_structure("준비되었습니까?"))
        self.assertIn("trang trọng", offline.korean_structure("회사입니다."))

    def test_full_google_sheet_to_json_pipeline_never_calls_gemini_or_groq(self):
        values = [
            ["Việt ", "Hàn ", "Anh ", "Context or Expression", "Ngữ pháp ví dụ"],
            ["Công ty phát triển ERP", "ERP 개발사", "ERP Development Company", "", ""],
            ["phong thái", "행실", "behavior", "", ""],
            ["mục từ mới", "새 단어", "new word", "", ""],
        ]
        previous = {"items": [], "sources": [], "updatedAt": None}
        with patch.dict(os.environ, {"VOCAB_OFFLINE_ONLY": "1"}), \
             patch.object(sync, "service_headers", return_value={}), \
             patch.object(sync, "public_csv", return_value=values), \
             patch.object(sync, "models") as gemini, \
             patch.object(sync, "groq_models") as groq, \
             patch.object(sync, "write_back_ready"):
            result = sync.collect(previous)
        gemini.assert_not_called()
        groq.assert_not_called()
        self.assertEqual(3, len(result["items"]))
        self.assertTrue(all(item["aiStatus"] == "ready" for item in result["items"]))
        self.assertEqual("ERP 개발사", result["items"][0]["ko"])
        self.assertEqual("curated-offline-v1", result["items"][0]["aiModel"])
        self.assertEqual("template-offline-v1", result["items"][2]["aiModel"])
        self.assertNotIn("aiRetryAfter", result)

    def test_partially_filled_owner_context_is_not_replaced(self):
        values = [
            ["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
            ["xịt khoáng", "페이셜 미스트", "Facial mist", "Ghi chú của tôi", ""],
        ]
        with patch.dict(os.environ, {"VOCAB_OFFLINE_ONLY": "1"}), \
             patch.object(sync, "service_headers", return_value={}), \
             patch.object(sync, "public_csv", return_value=values), \
             patch.object(sync, "write_back_ready"):
            result = sync.collect({"items": [], "sources": [], "updatedAt": None})
        word = result["items"][0]
        self.assertEqual("ready", word["aiStatus"])
        self.assertEqual("Ghi chú của tôi", word["context"])
        self.assertTrue(word["grammar"])

    def test_existing_manual_sheet_notes_not_overwritten(self):
        values = [
            ["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
            ["Tự nhập", "직접 입력", "Manual", "Tự soạn ngữ cảnh", "Tự soạn ngữ pháp"],
        ]
        with patch.dict(os.environ, {"VOCAB_OFFLINE_ONLY": "1"}), \
             patch.object(sync, "service_headers", return_value={}), \
             patch.object(sync, "public_csv", return_value=values), \
             patch.object(sync, "write_back_ready"):
            result = sync.collect({"items": [], "sources": [], "updatedAt": None})
        word = result["items"][0]
        self.assertEqual("sheet", word["aiStatus"])
        self.assertEqual("Tự soạn ngữ cảnh", word["context"])
        self.assertEqual("Tự soạn ngữ pháp", word["grammar"])


if __name__ == "__main__":
    unittest.main()
