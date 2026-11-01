#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("finance",Path(__file__).with_name("sync-monthly-expenses.py"))
finance=importlib.util.module_from_spec(spec);spec.loader.exec_module(finance)
class TestFinance(unittest.TestCase):
 def test_empty_headers(self):
  self.assertEqual(finance.parse_transactions([finance.HEAD]),[])
  self.assertEqual(finance.parse_budgets([finance.BUDGET_HEAD]),{})
 def test_amounts_and_dates(self):
  rows=[finance.HEAD,["2026-11-01","Chi","Ăn uống","Bữa trưa","45,000","Thẻ","","1"],["2026-11-02","Thu","Thu nhập","Lương","25.000.000","Chuyển khoản","","2"]]
  result=finance.parse_transactions(rows)
  self.assertEqual([x["amount"] for x in result],[45000,25000000])
  self.assertEqual(result[0]["date"],"2026-11-01")
 def test_formula_errors_below_transactions_do_not_block_sync(self):
  rows=[finance.HEAD,
   ["2026-11-01","Chi","đổ xăng","Giao dịch mới","50,000","Tiền mặt","",""],
   ["#NUM!","","","","","","",""],
   ["#REF!"],
   ["#VALUE!","","","","","","",""],
   ["","","","","","","",""]]
  parsed=finance.parse_transactions(rows)
  self.assertEqual(len(parsed),1)
  self.assertEqual(parsed[0]["amount"],50000)
  self.assertEqual(parsed[0]["id"],"row-2")
 def test_formula_error_with_partial_transaction_fails_closed(self):
  rows=[finance.HEAD,["#NUM!","","","Thông tin đã nhập","","","",""]]
  with self.assertRaises(finance.SyncError):finance.parse_transactions(rows)
  rows=[finance.HEAD,["#NUM!","Chi","","","50000","","",""]]
  with self.assertRaises(finance.SyncError):finance.parse_transactions(rows)
 def test_dont_drop_real_bad_dates_or_types(self):
  for bad in ["#NOTAREALERROR!","2026-11-99","abc"]:
   with self.subTest(value=bad):
    with self.assertRaises(finance.SyncError):finance.parse_transactions([finance.HEAD,[bad]])
 def test_fail_closed(self):
  for bad in [["2026-02-30","Chi","","","100"],["2026-11-01","Chi","","","-1"],["2026-11-01","invalid","","","200"]]:
   with self.assertRaises(finance.SyncError):finance.parse_transactions([finance.HEAD,bad])
  with self.assertRaises(finance.SyncError):finance.parse_budgets([finance.BUDGET_HEAD,["11/2026","500"]])
 def test_every_existing_transaction_column_changes_snapshot_hash(self):
  import hashlib
  base=["2026-11-01","Chi","Ăn uống","Bữa trưa","45000","Tiền mặt","Ban đầu","tx-001"]
  replacements=["2026-11-02","Thu","Đi lại","Taxi","50000","Chuyển khoản","Đã sửa","tx-002"]
  def fingerprint(row):
   data={"transactions":finance.parse_transactions([finance.HEAD,row]),"budgets":{}}
   return hashlib.sha256(finance.canonical(data)).hexdigest()
  original=fingerprint(base)
  for column,replacement in enumerate(replacements):
   with self.subTest(column=finance.HEAD[column]):
    updated=list(base)
    updated[column]=replacement
    self.assertNotEqual(original,fingerprint(updated))
    parsed=finance.parse_transactions([finance.HEAD,updated])[0]
    if column==5:
     self.assertEqual(parsed["method"],"Chuyển khoản")
     self.assertEqual(parsed["id"],"tx-001")
 def test_changing_payment_method_does_not_require_a_new_row(self):
  before=[finance.HEAD,["2026-11-01","Chi","Ăn uống","Bữa trưa","45000","Tiền mặt","","expense-1"]]
  after=[finance.HEAD,["2026-11-01","Chi","Ăn uống","Bữa trưa","45000","Ví điện tử","","expense-1"]]
  a,b=finance.parse_transactions(before),finance.parse_transactions(after)
  self.assertEqual(a[0]["id"],b[0]["id"])
  self.assertEqual(b[0]["method"],"Ví điện tử")
  self.assertNotEqual(finance.canonical(a),finance.canonical(b))
 def test_apps_script_payload_validation(self):
  from unittest.mock import patch
  class Response:
   def raise_for_status(self):return None
   def json(self):return {"ok":True,"schema":1,"spreadsheetId":finance.ID,"tables":{"chiphithang":[finance.HEAD,["2026-11-01","Chi","Ăn uống","Bữa trưa","45,000","Tiền mặt","","id-1"]],"ngansach":[finance.BUDGET_HEAD,["2026-11","8000000",""]]}}
  with patch.object(finance.requests,"post",return_value=Response()) as post:
   result=finance.sheets_data("https://script.google.com/macros/s/AKfycbABCDE_123/exec","t"*40)
   self.assertEqual(result["transactions"][0]["amount"],45000)
   self.assertEqual(result["budgets"]["2026-11"],8000000)
   self.assertEqual(post.call_args.kwargs["json"],{"token":"t"*40})
 def test_apps_script_reject_unauthenticated(self):
  from unittest.mock import patch
  class Response:
   def raise_for_status(self):return None
   def json(self):return {"ok":False,"error":"unauthorized"}
  with patch.object(finance.requests,"post",return_value=Response()):
   with self.assertRaises(finance.SyncError):
    finance.sheets_data("https://script.google.com/macros/s/AKfycbABCDE_123/exec","t"*40)
  with self.assertRaises(finance.SyncError):
   finance.sheets_data("https://example.com/foo","t"*40)
 def test_ciphertext(self):
  from cryptography.hazmat.primitives.ciphers.aead import AESGCM
  from hashlib import pbkdf2_hmac
  import base64,json
  data={"transactions":[{"note":"private-value-123"}],"budgets":{}}
  env=finance.encrypt(data,"long-enough-password")
  self.assertNotIn("private-value-123",json.dumps(env))
  key=pbkdf2_hmac("sha256",b"long-enough-password",base64.b64decode(env["salt"]),env["iterations"],32)
  self.assertEqual(json.loads(AESGCM(key).decrypt(base64.b64decode(env["nonce"]),base64.b64decode(env["ciphertext"]),None)),data)
if __name__=="__main__":unittest.main()
