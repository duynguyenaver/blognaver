#!/usr/bin/env python3
"""Offline source and merge regression checks: python3 -m unittest scripts/test-sync-trilingual-vocabulary.py"""
import importlib.util
import pathlib
import tempfile
import unittest

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

    def test_safe_unicode(self):
        rows = [["Tiếng Việt", "한국어", "English"], ["Công nghệ", "기술", "Technology"]]
        result = mod.parse_table(rows, "a", self.tab, "x")
        self.assertEqual(1, len(result))
        self.assertEqual("Technology", result[0]["en"])


if __name__ == "__main__":
    unittest.main()
