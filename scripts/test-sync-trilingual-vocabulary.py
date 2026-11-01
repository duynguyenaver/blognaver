#!/usr/bin/env python3
"""Offline source and merge regression checks: python3 -m unittest scripts/test-sync-trilingual-vocabulary.py"""
import importlib.util
import pathlib
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("vocab_sync", ROOT / "sync-trilingual-vocabulary.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class TrilingualSyncTests(unittest.TestCase):
    def setUp(self):
        self.tab = {"gid": "0", "title": "Sheet1"}

    def test_content_only_header(self):
        rows = [["content"], ["환불"], ["Hoàn tiền | 환불 | refund"], ["chỉ có một từ"]]
        result = mod.parse_table(rows, "19nL6", self.tab, "viethananh")
        self.assertEqual(3, len(result))
        self.assertEqual("환불", result[0]["ko"])
        self.assertEqual("Hoàn tiền", result[1]["vi"])
        self.assertEqual("환불", result[1]["ko"])
        self.assertEqual("refund", result[1]["en"])
        self.assertEqual("chỉ có một từ", result[2]["content"])
        self.assertEqual("", result[2]["vi"])  # no invented translations

    def test_trilingual_headers_and_blank_rows(self):
        result = mod.parse_table(
            [["Việt", "Hàn", "Anh"], ["Hoàn tiền", "환불", "Refund"], ["", "", ""], ["Ngày nghỉ", "휴가", "Leave"]],
            "id", self.tab, "main"
        )
        self.assertEqual(2, len(result))
        self.assertEqual("환불", result[0]["ko"])
        self.assertEqual(2, result[0]["row"])
        self.assertEqual(4, result[1]["row"])

    def test_single_column_without_header(self):
        result = mod.parse_table([["환불"], ["기술"]], "a", self.tab, "s")
        self.assertEqual(2, len(result))
        self.assertEqual("환불", result[0]["ko"])

    def test_content_pipe_and_labels(self):
        self.assertEqual("cảm ơn", mod.parse_content("cảm ơn | 감사합니다 | thank you")["vi"])
        self.assertEqual("감사합니다", mod.parse_content("Việt: cảm ơn | Hàn: 감사합니다 | Anh: thank you")["ko"])

    def test_row_ids_stable_for_edits_but_input_hash_changes(self):
        a = mod.parse_table([["content"], ["환불"]], "s", self.tab, "title")[0]
        b = mod.parse_table([["content"], ["환불하다"]], "s", self.tab, "title")[0]
        self.assertEqual(a["id"], b["id"])
        self.assertNotEqual(a["inputHash"], b["inputHash"])

    def test_empty_source_is_not_fabricated(self):
        self.assertEqual([], mod.parse_table([["content"]], "s", self.tab, "title"))
        self.assertEqual([], mod.parse_table([], "s", self.tab, "title"))

    def test_cache_hash_changes_with_translation(self):
        a = {"vi": "đi", "ko": "가다", "en": "go", "content": ""}
        b = dict(a, en="leave")
        self.assertNotEqual(mod.text_hash(a), mod.text_hash(b))

    def test_actual_owner_sheet_a_to_e_headers(self):
        rows = [
            ["Việt ", "Hàn ", "Anh ", "Context or Expression", "Ngữ pháp ví dụ"],
            ["Công ty phát triển ERP", "ERP 개발사", "ERP Development Company", "", ""],
        ]
        result = mod.parse_table(rows, "19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk", self.tab, "viethananh")
        self.assertEqual(1, len(result))
        self.assertEqual(2, result[0]["row"])
        self.assertEqual("Công ty phát triển ERP", result[0]["vi"])
        self.assertEqual("ERP 개발사", result[0]["ko"])
        self.assertEqual("ERP Development Company", result[0]["en"])
        self.assertNotIn("context", result[0])
        self.assertNotIn("grammar", result[0])

    def test_context_and_grammar_from_sheet_are_preserved(self):
        rows = [
            ["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
            ["Công ty phát triển ERP", "ERP 개발사", "ERP Development Company",
             "Công ty chuyên phát triển hệ thống ERP", "ERP(시스템) + 개발사"],
        ]
        result = mod.parse_table(rows, "s", self.tab, "x")
        self.assertEqual(result[0]["context"], "Công ty chuyên phát triển hệ thống ERP")
        self.assertEqual(result[0]["grammar"], "ERP(시스템) + 개발사")
        self.assertEqual(result[0]["aiStatus"] if "aiStatus" in result[0] else "source", "source")

    def test_gemini_discovery_includes_pro_lite_and_excludes_tts_image_audio(self):
        options = [
            {"name": "models/gemini-3.8-flash-tts", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-flash-image", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"], "outputTokenLimit": 8192},
            {"name": "models/gemini-3.8-flash-lite", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-pro", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-embedding", "supportedGenerationMethods": ["embedContent"]},
        ]
        names = mod.discover_text_models(options)
        self.assertEqual(["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-3.8-pro"], names)
        self.assertEqual("gemini-3.8-pro", mod.discover_text_models(options, "models/gemini-3.8-pro")[0])

    def test_gemini_model_429_rotates_to_other_available_text_model(self):
        item = {"id": "t2", "vi": "công ty", "ko": "회사", "en": "company", "content": ""}
        reply = {"candidates": [{"content": {"parts": [{"text": '{"items":[{"id":"t2","vi":"công ty","ko":"회사","en":"company","context":"Dùng để chỉ doanh nghiệp","grammar":"Danh từ","examples":{"vi":"Đó là công ty.","ko":"그곳은 회사입니다.","en":"That is a company."}}]}' }]},
                "groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://example.edu/dictionary"}}]}}]}
        def mocked_request(url, body):
            if "gemini-3.8-flash:" in url:
                raise mod.SyncError("API returned HTTP 429: RESOURCE_EXHAUSTED")
            return reply
        state = {"blocked": set()}
        with patch.object(mod, "get_json_post", side_effect=mocked_request) as request:
            ready = mod.ai_enrich_batch([item], ["gemini-3.8-flash", "gemini-3.8-pro"], state)
        self.assertEqual(2, request.call_count)
        self.assertEqual({"gemini-3.8-flash"}, state["blocked"])
        self.assertEqual("ready", ready["t2"]["aiStatus"])
        self.assertEqual("gemini-3.8-pro", ready["t2"]["aiModel"])
        self.assertTrue(ready["t2"]["grounded"])

    def test_gemini_plain_text_fallback_never_invents_web_citations(self):
        item = {"id": "t3", "vi": "công ty", "ko": "회사", "en": "company", "content": ""}
        reply = {"candidates": [{"content": {"parts": [{"text": '{"items":[{"id":"t3","vi":"công ty","ko":"회사","en":"company","context":"Doanh nghiệp","grammar":"Danh từ","examples":{"vi":"Một công ty.","ko":"한 회사.","en":"A company."}}]}' }]}}]}
        def mocked_request(url, body):
            if '"googleSearch"' in body.decode("utf-8"):
                raise mod.SyncError("API returned HTTP 400: tool not supported")
            return reply
        with patch.object(mod, "get_json_post", side_effect=mocked_request) as request:
            ready = mod.ai_enrich_batch([item], ["gemini-3.8-flash"], {"blocked": set()})
        self.assertEqual(2, request.call_count)
        self.assertEqual([], ready["t3"]["references"])
        self.assertFalse(ready["t3"]["grounded"])
        self.assertEqual("ready", ready["t3"]["aiStatus"])

    def test_gemini_all_429_does_not_repeat_failed_models_each_batch(self):
        item = {"id": "t4", "vi": "công ty", "ko": "회사", "en": "company", "content": ""}
        state = {"blocked": set()}
        with patch.object(mod, "get_json_post", side_effect=mod.SyncError("API returned HTTP 429")) as request:
            self.assertEqual({}, mod.ai_enrich_batch([item], ["gemini-a", "gemini-b"], state))
            self.assertEqual({}, mod.ai_enrich_batch([item], ["gemini-a", "gemini-b"], state))
        self.assertEqual(2, request.call_count)
        self.assertEqual({"gemini-a", "gemini-b"}, state["blocked"])

    def test_safe_unicode(self):
        rows = [["Tiếng Việt", "한국어", "English"], ["Công nghệ", "기술", "Technology"]]
        result = mod.parse_table(rows, "a", self.tab, "x")
        self.assertEqual(1, len(result))
        self.assertEqual("Technology", result[0]["en"])


if __name__ == "__main__":
    unittest.main()
