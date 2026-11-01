#!/usr/bin/env python3
"""Unit tests: no GitHub PAT, private Sheets or real finance data required."""
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import unittest

spec=importlib.util.spec_from_file_location("finresolver",Path(__file__).with_name("finance-conflict-resolver.py"))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def envelope(at, fingerprint):
    return {"sourceHash":fingerprint,"_time":at}

class FinanceResolverTest(unittest.TestCase):
    def test_same_source_random_encryption_is_not_a_change(self):
        now=datetime.now(timezone.utc)
        self.assertEqual(m.decision(envelope(now,"a"*64),envelope(now+timedelta(seconds=3),"a"*64),True),"duplicate")
    def test_stale_never_replaces_main(self):
        now=datetime.now(timezone.utc)
        self.assertEqual(m.decision(envelope(now,"a"*64),envelope(now-timedelta(seconds=1),"b"*64),True),"stale")
    def test_conflict_rebuilds_unchanged_ciphertext(self):
        now=datetime.now(timezone.utc)
        self.assertEqual(m.decision(envelope(now,"a"*64),envelope(now+timedelta(seconds=1),"b"*64),True),"replace")
        self.assertEqual(m.decision(envelope(now,"a"*64),envelope(now+timedelta(seconds=1),"b"*64),False),"publish")
    def test_no_change_closes_only_matching_owner_finance_pr(self):
        from unittest.mock import patch
        now=datetime.now(timezone.utc)
        current=envelope(now,"a"*64)
        identical=envelope(now+timedelta(seconds=1),"a"*64)
        newer=envelope(now+timedelta(seconds=1),"b"*64)
        prs=[
            {"number":100,"head":{"ref":"data/chi-phi-thang-100"}},
            {"number":101,"head":{"ref":"data/chi-phi-thang-101"}},
        ]
        with patch.object(m,"fetch_main",return_value=current), \
             patch.object(m,"open_finance_prs",return_value=prs), \
             patch.object(m,"fetch_head",side_effect=[identical,newer]), \
             patch.object(m,"close_pr") as close:
            m.close_duplicates()
            close.assert_called_once()
            self.assertEqual(close.call_args.args[0]["number"],100)
    def test_first_snapshot(self):
        self.assertEqual(m.decision(None,envelope(datetime.now(timezone.utc),"a"*64)),"publish")
    def test_rejects_unsafe_branch(self):
        self.assertFalse(m.BRANCH.fullmatch("main"))
        self.assertFalse(m.BRANCH.fullmatch("data/chi-phi-thang-123/../../main"))
        self.assertTrue(m.BRANCH.fullmatch("data/chi-phi-thang-123-1"))
    def test_schema_validation(self):
        import base64
        now=datetime.now(timezone.utc).isoformat()
        payload={"version":1,"algorithm":"AES-256-GCM","kdf":"PBKDF2-SHA256","iterations":310000,
        "salt":base64.b64encode(b"A"*16).decode(),"nonce":base64.b64encode(b"B"*12).decode(),
        "ciphertext":base64.b64encode(b"C"*32).decode(),"sourceHash":"f"*64,"updatedAt":now}
        self.assertEqual(m.validate(json.dumps(payload))["sourceHash"],"f"*64)
        payload["algorithm"]="AES-ECB"
        with self.assertRaises(m.FinanceError):m.validate(json.dumps(payload))

if __name__=="__main__":unittest.main()
