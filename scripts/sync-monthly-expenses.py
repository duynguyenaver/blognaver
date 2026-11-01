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
from urllib.parse import quote
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
    result=[];seen=set()
    for rownum,raw in enumerate(rows[1:10001],2):
        cols=[str(v).strip() for v in raw[:8]]+[""]*max(0,8-len(raw))
        if not any(cols):continue
        day,kind,category,description,value,method,note,uid=cols
        if kind not in ("Thu","Chi"):raise SyncError(f"chiphithang!B{rownum}: chỉ nhận Thu hoặc Chi")
        amt=amount(value,f"chiphithang!E{rownum}")
        if amt<=0:raise SyncError(f"chiphithang!E{rownum}: cần số tiền > 0")
        uid=uid or f"row-{rownum}"
        if uid in seen:raise SyncError(f"chiphithang!H{rownum}: mã giao dịch trùng")
        seen.add(uid)
        result.append({"id":uid,"date":date_value(day,f"chiphithang!A{rownum}"),
                       "type":kind,"category":category or "Khác","description":description,
                       "amount":amt,"method":method,"note":note})
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

def sheets_data(service_json):
    from google.oauth2.service_account import Credentials
    from google.auth.transport.requests import Request
    creds=Credentials.from_service_account_info(json.loads(service_json),
       scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
    creds.refresh(Request())
    def read(name,end):
        rng=quote("'"+name+"'!A1:"+end+"10001",safe="")
        url="https://sheets.googleapis.com/v4/spreadsheets/"+quote(ID)+"/values/"+rng
        response=requests.get(url,headers={"Authorization":"Bearer "+creds.token},timeout=40)
        response.raise_for_status()
        return response.json().get("values",[])
    return {"transactions":parse_transactions(read("chiphithang","H")),
            "budgets":parse_budgets(read("ngansach","C"))}

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
    service=os.getenv("VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON","").strip()
    secret=os.getenv("MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE","")
    if not service:raise SyncError("Missing VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON; share private sheet with service account Viewer")
    if len(secret)<16:raise SyncError("Missing MONTHLY_EXPENSES_ENCRYPTION_PASSPHRASE (minimum 16 characters)")
    data=sheets_data(service)
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
