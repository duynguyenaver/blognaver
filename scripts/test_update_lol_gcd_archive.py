"""Offline tests for Leaguepedia GCD archive pointer crawler. No network."""
import importlib.util
import pathlib
import unittest

spec=importlib.util.spec_from_file_location("gcd_archive",pathlib.Path(__file__).with_name("update-lol-gcd-archive.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class TestLeaguepediaArchive(unittest.TestCase):
    def test_index_extracts_only_actual_region_dated_links(self):
        page='''<a href="/wiki/Archive%3AGlobal_Contract_Database/KR/2026-01-19">Jan 19</a>
<a href="/wiki/Archive%3AGlobal_Contract_Database/KR/2026-01-18">Jan 18</a>
<a href="/wiki/Archive%3AGlobal_Contract_Database/CN/2026-01-19">CN page</a>
<a href="/wiki/Archive%3AGlobal_Contract_Database/KR/2026-02-31">invalid date</a>
<small>2026-02-11</small>'''
        self.assertEqual(module.parse_archive_index(page,"KR"),["2026-01-19","2026-01-18"])

    def test_unsafe_links_not_generated(self):
        with self.assertRaises(ValueError):module.history_url("KR","2026-02-31")
        with self.assertRaises(ValueError):module.history_url("../CN","2026-01-19")
        with self.assertRaises(ValueError):module.index_url("not-region")
        self.assertTrue(module.history_url("VN","2024-12-06").endswith("/VN/2024-12-06"))

    def test_reviewed_history_is_not_deleted_by_empty_or_partial_crawl(self):
        base=module.empty_archive()
        region=next(r for r in base["regions"] if r["code"]=="KR")
        region["dates"]=["2026-01-19","2025-12-08"]
        self.assertIsNone(module.update_index(base,{},"2026-11-01T00:00:00Z"))
        fresh=module.update_index(base,{"KR":["2026-01-19","2026-03-05"]},"2026-11-01T00:00:00Z")
        self.assertEqual(fresh["regions"][0]["dates"],["2026-03-05","2026-01-19","2025-12-08"])
        self.assertEqual(region["dates"],["2026-01-19","2025-12-08"])
        self.assertIsNone(module.update_index(fresh,{"KR":["2026-03-05"]},"2026-11-01T00:00:01Z"))

    def test_schema_and_attribution(self):
        doc=module.empty_archive()
        self.assertEqual(doc["sourceType"],"unofficial-community-history")
        self.assertIn("CC BY-SA",doc["license"])
        self.assertGreaterEqual(len(doc["regions"]),5)
        for region in doc["regions"]:
            self.assertTrue(region["indexUrl"].startswith("https://lol.fandom.com/wiki/Archive:Global_Contract_Database/"))
            self.assertEqual(region["dates"],[])

if __name__=="__main__":unittest.main()
