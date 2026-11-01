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

    def test_groq_model_discovery_excludes_nontext_and_retired(self):
        listing = [
            {"id": "openai/gpt-oss-120b", "active": True},
            {"id": "openai/gpt-oss-20b", "active": True},
            {"id": "qwen/qwen3.8-27b", "active": True},
            {"id": "whisper-large-v3", "active": True},
            {"id": "meta-llama/llama-prompt-guard-2-22m", "active": True},
            {"id": "llama-3.3-70b-versatile", "active": True},
            {"id": "openai/disabled-text", "active": False},
        ]
        names = mod.groq_text_models(listing)
        self.assertEqual(["openai/gpt-oss-120b", "qwen/qwen3.8-27b",
                          "openai/gpt-oss-20b"], names)
        self.assertEqual("openai/gpt-oss-20b",
                         mod.groq_text_models(listing, "openai/gpt-oss-20b")[0])

    def test_groq_fallback_after_first_model_429(self):
        example = {"id": "row-7", "vi": "Công ty", "ko": "회사", "en": "Company",
                   "content": ""}
        output = {"choices": [{"message": {"content":
            '{"items":[{"id":"row-7","vi":"Công ty","ko":"회사","en":"Company",'
            '"context":"Trong môi trường công sở","grammar":"Danh từ chỉ doanh nghiệp",'
            '"examples":{"vi":"Đây là công ty.","ko":"이것은 회사입니다.",'
            '"en":"This is a company."}}]}'}}]}
        state = {"blocked": set()}
        def service(model, prompt, json_mode):
            if model == "openai/gpt-oss-120b":
                raise mod.SyncError("API returned HTTP 429: rate limited")
            return output
        with patch.object(mod, "GROQ_KEY", "test-key"), \
             patch.object(mod, "groq_post", side_effect=service) as mock:
            ready = mod.ai_enrich_groq_batch(
                [example], ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], state)
        self.assertEqual(2, mock.call_count)
        self.assertEqual({"openai/gpt-oss-120b"}, state["blocked"])
        self.assertEqual("groq", ready["row-7"]["aiProvider"])
        self.assertEqual("openai/gpt-oss-20b", ready["row-7"]["aiModel"])
        self.assertEqual("ready", ready["row-7"]["aiStatus"])
        self.assertEqual([], ready["row-7"]["references"])
        self.assertFalse(ready["row-7"]["grounded"])

    def test_groq_fallback_json_mode_unsupported(self):
        item = {"id": "row-8", "vi": "Nhà", "ko": "집", "en": "House", "content": ""}
        output = {"choices": [{"message": {"content":
            '{"items":[{"id":"row-8","vi":"Nhà","ko":"집","en":"House",'
            '"context":"Nhà ở","grammar":"Danh từ",'
            '"examples":{"vi":"Đây là nhà tôi.","ko":"여기가 제 집입니다.",'
            '"en":"This is my house."}}]}'}}]}
        def service(model, prompt, json_mode):
            if json_mode:
                raise mod.SyncError("API returned HTTP 400: unsupported response_format")
            return output
        with patch.object(mod, "GROQ_KEY", "test-key"), \
             patch.object(mod, "groq_post", side_effect=service) as mocked:
            ready = mod.ai_enrich_groq_batch([item], ["openai/gpt-oss-20b"])
        self.assertEqual(2, mocked.call_count)
        self.assertEqual("ready", ready["row-8"]["aiStatus"])

    def test_groq_all_rate_limited_stops_retry_storm(self):
        item = {"id": "row-9", "vi": "Nhà", "ko": "집", "en": "House", "content": ""}
        state = {"blocked": set()}
        with patch.object(mod, "GROQ_KEY", "test-key"), \
             patch.object(mod, "groq_post", side_effect=mod.SyncError("HTTP 429")) as mocked:
            mod.ai_enrich_groq_batch([item], ["model-a", "model-b"], state)
            mod.ai_enrich_groq_batch([item], ["model-a", "model-b"], state)
        self.assertEqual(2, mocked.call_count)
        self.assertEqual({"model-a", "model-b"}, state["blocked"])

    def test_groq_still_runs_during_gemini_cooldown(self):
        old = {"items": [], "sources": [], "updatedAt": None,
               "aiRetryAfter": "2099-01-01T00:00:00+00:00"}
        rows = [["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
                ["Công ty", "회사", "Company", "", ""]]
        ai = {"vi": "Công ty", "ko": "회사", "en": "Company",
              "context": "Môi trường doanh nghiệp", "grammar": "Danh từ",
              "examples": {"vi": "Một công ty.", "ko": "한 회사.", "en": "A company."},
              "references": [], "grounded": False, "aiStatus": "ready",
              "aiModel": "openai/gpt-oss-20b", "aiProvider": "groq"}
        with patch.object(mod, "service_headers", return_value={}), \
             patch.object(mod, "public_csv", return_value=rows), \
             patch.object(mod, "models") as gemini, \
             patch.object(mod, "groq_models", return_value=["openai/gpt-oss-20b"]), \
             patch.object(mod, "ai_enrich_groq_batch", side_effect=lambda group, names, state: {group[0]["id"]: ai}) as groq, \
             patch.object(mod, "write_back_ready"):
            result = mod.collect(old)
        gemini.assert_not_called()
        groq.assert_called_once()
        self.assertEqual("ready", result["items"][0]["aiStatus"])
        self.assertEqual("groq", result["items"][0]["aiProvider"])

    def test_retired_offline_sheet_notes_requeue_for_groq(self):
        rows = [
            ["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
            ["mệt mỏi", "피곤한", "tired",
             "Tham khảo offline: mệt mỏi", "Gợi ý kiểm tra: 피곤한"],
        ]
        prior = mod.parse_table(rows, mod.SHEETS[0], {"gid": "0", "title": "Sheet1"}, "old")
        cached = dict(prior[0])
        cached.update({"context": rows[1][3], "grammar": rows[1][4],
                       "aiProvider": "offline", "aiStatus": "ready",
                       "aiModel": "template-offline-v1"})
        groq_answer = {"context": "Diễn tả trạng thái thiếu sức lực.",
                       "grammar": "피곤한 là dạng định ngữ của 피곤하다.",
                       "examples": {"vi": "Tôi thấy mệt mỏi.",
                                    "ko": "오늘 피곤해요.",
                                    "en": "I am tired today."},
                       "aiProvider": "groq", "aiStatus": "ready",
                       "aiModel": "openai/gpt-oss-120b"}
        with patch.dict(os.environ, {"VOCAB_OFFLINE_ONLY": "0"}), \
             patch.object(mod, "service_headers", return_value={}), \
             patch.object(mod, "public_csv", return_value=rows), \
             patch.object(mod, "models", return_value=[]), \
             patch.object(mod, "groq_models", return_value=["openai/gpt-oss-120b"]), \
             patch.object(mod, "ai_enrich_groq_batch",
                          side_effect=lambda group, names, state: {
                              group[0]["id"]: groq_answer}) as generate, \
             patch.object(mod, "write_back_ready"):
            result = mod.collect({"items": [cached], "sources": []})
        generate.assert_called_once()
        item = result["items"][0]
        self.assertEqual("groq", item["aiProvider"])
        self.assertEqual("ready", item["aiStatus"])
        self.assertEqual(groq_answer["context"], item["context"])
        self.assertEqual(groq_answer["grammar"], item["grammar"])

    def test_retired_offline_notes_do_not_count_as_complete_when_api_unavailable(self):
        rows = [
            ["Việt", "Hàn", "Anh", "Context or Expression", "Ngữ pháp ví dụ"],
            ["mệt mỏi", "피곤한", "tired",
             "Tham khảo offline: mệt mỏi", "Gợi ý kiểm tra: 피곤한"],
        ]
        with patch.dict(os.environ, {"VOCAB_OFFLINE_ONLY": "0"}), \
             patch.object(mod, "service_headers", return_value={}), \
             patch.object(mod, "public_csv", return_value=rows), \
             patch.object(mod, "models", return_value=[]), \
             patch.object(mod, "groq_models", return_value=[]), \
             patch.object(mod, "write_back_ready"):
            result = mod.collect({"items": [], "sources": []})
        item = result["items"][0]
        self.assertEqual("pending", item["aiStatus"])
        self.assertFalse(item.get("context"))
        self.assertFalse(item.get("grammar"))
        self.assertNotEqual("offline", item.get("aiProvider"))

    def test_groq_reasoning_effort_limited_for_json_output(self):
        import json
        calls = []
        def fake_request(url, headers=None, body=None, retries=0):
            calls.append(json.loads(body))
            return b'{"choices":[{"message":{"content":"{}"}}]}'
        with patch.object(mod, "GROQ_KEY", "placeholder-test-key"), \
             patch.object(mod, "request", side_effect=fake_request):
            mod.groq_post("openai/gpt-oss-120b", "test", True)
            mod.groq_post("qwen/qwen3.8-27b", "test", True)
        self.assertEqual(4800, calls[0]["max_completion_tokens"])
        self.assertEqual("low", calls[0]["reasoning_effort"])
        self.assertEqual("none", calls[1]["reasoning_effort"])
        self.assertEqual("json_object", calls[0]["response_format"]["type"])

    def test_workflow_summary_is_explicit_when_no_ai_content(self):
        import os
        with tempfile.TemporaryDirectory() as temp:
            summary = pathlib.Path(temp) / "summary.md"
            rows = [{"id":"1", "aiStatus":"pending"}]
            with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY":str(summary)}), \
                 patch.object(mod, "GEMINI_KEY", "dummy"), \
                 patch.object(mod, "GROQ_KEY", ""):
                mod.write_run_summary({"items":rows}, {"items":[]})
            result = summary.read_text(encoding="utf-8")
        self.assertIn("Pending notes: **1**", result)
        self.assertIn("Groq API key configured: **NO**", result)
        self.assertIn("ACTION: Add GROQ_API_KEY", result)

    def test_safe_unicode(self):
        rows = [["Tiếng Việt", "한국어", "English"], ["Công nghệ", "기술", "Technology"]]
        result = mod.parse_table(rows, "a", self.tab, "x")
        self.assertEqual(1, len(result))
        self.assertEqual("Technology", result[0]["en"])


if __name__ == "__main__":
    unittest.main()
