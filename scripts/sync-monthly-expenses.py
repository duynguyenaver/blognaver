#!/usr/bin/env python3
"""Private Google Sheets -> encrypted finance snapshot. No plaintext git writes."""
import base64
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
import requests

ID=os.getenv("MONTHLY_EXPENSES_SHEET_ID","1gxikPCOe62Be2_Lp5n3m6HMfCdnh-8WT5apJZeEvM7E")
OUT=Path(__file__).resolve().parents[1]/"static/tien-ich/chi-phi-thang/data.enc.json"
HEAD=["Ngày","Loại","Danh mục","Nội dung","Số tiền (VND)","Phương thức","Ghi chú","Mã giao dịch"]
BUDGET_HEAD=["Tháng (YYYY-MM)","Ngân sách (VND)","Ghi chú"]
ITERATIONS=310000
class SyncError(Exception): pass

def amount(value,where):
    raw=str(value or "").strip()
    if not re.fullmatch(r"[0-9][0-9,. \u00a0]*",raw):raise SyncError(where+": yêu cầu số tiền VND không âm")
    number=int(re.sub(r"\D","",raw))
    if number>900719925474099:raise SyncError(where+": số tiền vượt giới hạn")
    return number

def date_value(raw,where):
    if not re.fullmatch(r"\d{4}-\d{1,2}-\d{1,2}",str(raw)):raise SyncError(where+": ngày phải YYYY-MM-DD")
    try:return date(*map(int,str(raw).split("-"))).isoformat()
    except ValueError as exc:raise SyncError(where+": ngày không tồn tại") from exc

def parse_transactions(rows):
    if not rows or [str(x).strip() for x in rows[0][:8]]!=HEAD:raise SyncError("Sai header của tab chiphithang; giữ nguyên snapshot cũ")
    result=[];seen={}
    for rownum,raw in enumerate(rows[1:10001],2):
        cols=[str(v).strip() for v in raw[:8]]+[""]*max(0,8-len(raw))
        if not any(cols):continue
        # Google Sheets may show #NUM! in formula-filled dates below the last
        # actual transaction. Skip ONLY if every other transaction cell is empty.
        # A partially entered transaction still fails validation (no silent loss).
        if (not any(cols[1:]) and
            re.fullmatch(r"#(?:NUM!|REF!|VALUE!|N/A|ERROR!|DIV/0!|NAME[?]|NULL!)", cols[0], re.IGNORECASE)):
            continue
        day,kind,category,description,value,method,note,uid=cols
        if kind not in ("Thu","Chi"):raise SyncError(f"chiphithang!B{rownum}: chỉ nhận Thu hoặc Chi")
        amt=amount(value,f"chiphithang!E{rownum}")
        if amt<=0:raise SyncError(f"chiphithang!E{rownum}: cần số tiền > 0")
        uid=uid or f"row-{rownum}"
        transaction={"id":uid,"date":date_value(day,f"chiphithang!A{rownum}"),
                     "type":kind,"category":category or "Khác","description":description,
                     "amount":amt,"method":method,"note":note}
        if uid in seen:
            # Repeated identical rows are a harmless no-op, not a failed deploy.
            # Different details under one ID must never be silently discarded.
            if seen[uid] == transaction:
                print(f"::notice::chiphithang!H{rownum}: identical duplicate row skipped")
                continue
            raise SyncError(f"chiphithang!H{rownum}: mã giao dịch trùng nhưng nội dung khác nhau; cần sửa trên Google Sheets")
        seen[uid]=transaction
        result.append(transaction)
    return result

def parse_budgets(rows):
    if not rows or [str(x).strip() for x in rows[0][:3]]!=BUDGET_HEAD:raise SyncError("Sai header của tab ngansach")
    data={}
    for rownum,raw in enumerate(rows[1:10001],2):
        cols=[str(v).strip() for v in raw[:3]]+[""]*max(0,3-len(raw))
        if not any(cols):continue
        month,value,_=cols
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])",month):raise SyncError(f"ngansach!A{rownum}: cần YYYY-MM")
        if month in data:raise SyncError(f"ngansach!A{rownum}: tháng trùng")
        data[month]=amount(value,f"ngansach!B{rownum}")
    return data

def sheets_data(web_app_url, sync_token):
    """Authenticated owner-run Apps Script bridge. Plaintext is transient memory only."""
    if not re.fullmatch(r"https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec", web_app_url):
        raise SyncError("Invalid Apps Script /exec URL; copy URL from the Web App deployment")
    if len(sync_token) < 32:
        raise SyncError("Missing MONTHLY_EXPENSES_APPS_SCRIPT_TOKEN (minimum 32 characters)")
    try:
        response = requests.post(
            web_app_url, json={"token": sync_token}, timeout=65,
            allow_redirects=True,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        # Avoid logging raw response bodies or credentials.
        raise SyncError("Apps Script bridge connection/JSON response failed") from None
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        error = payload.get("error", "invalid_response") if isinstance(payload, dict) else "invalid_response"
        if error not in {"not_configured", "invalid_request", "invalid_json",
                         "unauthorized", "sheet_read_failed"}:
            error = "invalid_response"
        raise SyncError("Apps Script bridge refused request: " + error)
    if payload.get("schema") != 1 or payload.get("spreadsheetId") != ID:
        raise SyncError("Unexpected spreadsheet identity/schema: refusing sync")
    tables = payload.get("tables")
    if not isinstance(tables, dict):
        raise SyncError("Apps Script response missing tables")
    for name in ("chiphithang", "ngansach"):
        if not isinstance(tables.get(name), list) or len(tables[name]) > 10001:
            raise SyncError("Missing, invalid or oversized Apps Script tab: " + name)
    return {"transactions": parse_transactions(tables["chiphithang"]),
            "budgets": parse_budgets(tables["ngansach"])}

def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()

def encrypt(data,password):
    import secrets
    from hashlib import pbkdf2_hmac
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    salt,nonce=secrets.token_bytes(16),secrets.token_bytes(12)
    key=pbkdf2_hmac("sha256",password.encode(),salt,ITERATIONS,32)
    ciphertext=AESGCM(key).encrypt(nonce,canonical(data),None)
    b64=lambda x:base64.b64encode(x).decode()
    return {"version":1,"algorithm":"AES-256-GCM","kdf":"PBKDF2-SHA256",
      "iterations":ITERATIONS,"salt":b64(salt),"nonce":b64(nonce),
      "ciphertext":b64(ciphertext),"sourceHash":hashlib.sha256(canonical(data)).hexdigest(),
      "updatedAt":datetime.now(timezone.utc).isoformat(timespec="seconds")}

def main():
    webapp=os.getenv("MONTHLY_EXPENSES_APPS_SCRIPT_URL","").strip()
    sync_token=os.getenv("MONTHLY_EXPENSES_APPS_SCRIPT_TOKEN","").strip()
    secret=os.getenv("MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE","")
    if not webapp:raise SyncError("Missing MONTHLY_EXPENSES_APPS_SCRIPT_URL (Actions variable)")
    if len(secret)<16:raise SyncError("Missing MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE (minimum 16 characters)")
    data=sheets_data(webapp,sync_token)
    fingerprint=hashlib.sha256(canonical(data)).hexdigest()
    if OUT.is_file():
        try:
            if json.loads(OUT.read_text("utf-8")).get("sourceHash")==fingerprint:
                print("Source unchanged; no encrypted data PR required");return
        except (ValueError,OSError):pass
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(encrypt(data,secret),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Encrypted snapshot generated; no plaintext transactions written to git.")

if __name__=="__main__":
    try:main()
    except (SyncError,requests.RequestException,ValueError) as exc:
        print("::error::Monthly expenses sync: "+str(exc),file=sys.stderr);sys.exit(1)
