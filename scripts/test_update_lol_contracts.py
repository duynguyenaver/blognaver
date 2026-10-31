"""Offline regression tests for Riot GCD importer; no network or GitHub secrets."""
import datetime as dt
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("gcd_importer",pathlib.Path(__file__).with_name("update-lol-contracts.py"))
importer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

SAMPLE = """Updated at 2026-10-01
Team Name,Player Name,Real Name,Role,Contract End Date
T1,Faker,Lee Sang-hyeok,Mid,2029-11-19
T1,Peyz,Kim Su-hwan,ADC,2028-11-20
Gen.G,Chovy,Jeong Ji-hoon,Mid,2027-11-15
"""

class TestGCD(unittest.TestCase):
    def test_csv_header_after_timestamp(self):
        rows=importer.rows_from_csv(SAMPLE,"LCK",importer.PUBLIC_URL)
        self.assertEqual(len(rows),3)
        self.assertEqual(rows[0]["endDate"],"2029-11-19")
        self.assertEqual(rows[1]["handle"],"Peyz")

    def test_quoted_csv_and_missing_role(self):
        text='foo\nTeam,Player Name,End Date\n"Team, Esports",Testplayer,16/11/2026\n'
        rows=importer.rows_from_csv(text,"LEC",importer.PUBLIC_URL)
        self.assertEqual(rows[0]["team"],"Team, Esports")
        self.assertEqual(rows[0]["position"],"")
        self.assertEqual(rows[0]["endDate"],"2026-11-16")

    def test_dates_do_not_invent_unknown(self):
        self.assertEqual(importer.parse_date("Unknown"),"")
        self.assertEqual(importer.parse_date("2026-02-30"),"")
        self.assertEqual(importer.parse_date("2026-11-16"),"2026-11-16")
        self.assertEqual(importer.parse_date("16-Nov-2026"),"2026-11-16")

    def test_diff_not_equivalent_to_verified_extension(self):
        old=importer.rows_from_csv(SAMPLE,"LCK",importer.PUBLIC_URL)
        new=[dict(x) for x in old]
        new[0]["endDate"]="2030-11-18"
        delta=importer.compare(old,new,"2026-11-01")
        self.assertEqual(delta[0]["type"],"end_date")
        self.assertEqual(delta[0]["after"],"2030-11-18")
        self.assertNotIn("confirmed",str(delta))

    def test_team_move_diff_and_ambiguous_name(self):
        old=importer.rows_from_csv(SAMPLE,"LCK",importer.PUBLIC_URL)
        new=[dict(x) for x in old];new[0]["team"]="Another Team"
        delta=importer.compare(old,new,"2026-11-01")
        self.assertEqual(delta[0]["type"],"team")
        self.assertEqual(delta[0]["before"],"T1")

    def test_no_pr_if_rows_unchanged(self):
        original=importer.rows_from_csv(SAMPLE,"LCK",importer.PUBLIC_URL)
        old={"rows":sorted(original,key=lambda r:(r["league"],r["team"].casefold(),r["handle"].casefold()))}
        self.assertIsNone(importer.build_snapshot(old,original,[{"league":"LCK"}],"2026-11-01"))

    def test_mass_row_loss_fails_closed(self):
        old=importer.rows_from_csv(SAMPLE,"LCK",importer.PUBLIC_URL)
        with self.assertRaises(ValueError):
            importer.build_snapshot({"rows":old},old[:1],[{"league":"LCK"}],"2026-11-01")

    def test_region_labels_and_discovery(self):
        html='<ul><li><a href="#gid=940656680">Korea (LCK)</a></li><li><a href="#gid=594163931">China (LPL)</a></li><li><a href="#gid=123456789">EMEA</a></li></ul>'
        tabs=importer.discover_tabs(html)
        self.assertEqual(tabs["940656680"],"LCK")
        self.assertEqual(tabs["594163931"],"LPL")
        self.assertEqual(tabs["123456789"],"LEC")

if __name__=="__main__":
    unittest.main()
