#!/usr/bin/env python3
"""Read the owner's Samsung-style CV from Google Sheets with a service account.

Only encrypted output is persisted. Secrets and plaintext never enter git.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

SHEET_ID = "17PL7m0_NTkZdWzptHkVewuqPcnTHul5KFIeT0MCHd0A"
OUTPUT = Path(__file__).resolve().parents[1] / "static/tien-ich/don-xin-viec/data.enc.json"
ITERATIONS = 310_000
MAX_ROWS = 600

PROFILE_KEYS = [
    ("Họ tên", "fullName"), ("Tên tiếng Anh", "englishName"),
    ("Vị trí ứng tuyển", "targetRole"), ("Ngày sinh (YYYY-MM-DD)", "birthDate"),
    ("Giới tính", "gender"), ("Điện thoại", "phone"),
    ("Email", "email"), ("Địa chỉ", "address"),
    ("Quốc tịch", "nationality"), ("Nghĩa vụ quân sự", "militaryStatus"),
    ("Lý do miễn nghĩa vụ", "exemptionReason"), ("Quân chủng", "serviceBranch"),
    ("Đối tượng ưu tiên (Y/N)", "veteranStatus"), ("Giới thiệu ngắn", "summary"),
    ("Mục tiêu nghề nghiệp", "careerObjective"),
    ("Portfolio / LinkedIn", "portfolio"), ("Ghi chú bổ sung", "additional"),
]
TABLES = {
    "HocVan": (
        ["Bậc học", "Nhập học (YYYY.MM)", "Tốt nghiệp (YYYY.MM)", "Trường", "Chuyên ngành", "Tình trạng tốt nghiệp", "Địa điểm", "Luận văn", "Phòng LAB"],
        ["level", "start", "end", "school", "major", "graduation", "location", "thesis", "lab"],
    ),
    "KinhNghiem": (
        ["Từ tháng (YYYY.MM)", "Đến tháng (YYYY.MM hoặc Nay)", "Công ty", "Vị trí", "Chức vụ", "Nhiệm vụ tóm tắt", "Mô tả công việc chi tiết", "Thành tựu", "Địa điểm"],
        ["start", "end", "company", "role", "title", "summary", "details", "achievements", "location"],
    ),
    "ChungChi": (
        ["Tên chứng chỉ / giấy phép", "Hạng / cấp độ", "Đơn vị cấp", "Ngày cấp", "Hạn sử dụng", "Ghi chú"],
        ["name", "grade", "issuer", "date", "expiry", "notes"],
    ),
    "NgoaiNgu": (
        ["Ngôn ngữ", "Kỳ thi", "Điểm", "Trình độ", "Ngày thi", "Ghi chú"],
        ["language", "exam", "score", "level", "date", "notes"],
    ),
    "NghienCuu": (
        ["Cơ quan / đơn vị", "Từ tháng (YYYY.MM)", "Đến tháng (YYYY.MM)", "Tên đề tài", "Nội dung / đóng góp"],
        ["institution", "start", "end", "topic", "details"],
    ),
    "ThanhTuu": (
        ["Loại (Luận văn/Sáng chế/Giải thưởng)", "Tên công trình / thành tựu", "Năm", "Đơn vị", "Mô tả", "Liên kết"],
        ["type", "name", "year", "issuer", "description", "url"],
    ),
    "BoSung": (
        ["Tiêu đề", "Nội dung bổ sung"],
        ["title", "body"],
    ),
}


class SyncError(Exception):
    pass


def normal(value):
    return str(value if value is not None else "").strip()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def parse_profile(rows):
    if not rows or [normal(v) for v in rows[0][:2]] != ["TRƯỜNG THÔNG TIN", "NỘI DUNG · NHẬP TẠI CỘT B"]:
        raise SyncError("CV: header không đúng; không ghi đè bản mã hóa cũ.")
    allowed = dict(PROFILE_KEYS)
    result = {key: "" for _, key in PROFILE_KEYS}
    seen = set()
    for idx, row in enumerate(rows[1:], 2):
        values = [normal(x) for x in row[:2]]
        if not values or not any(values):
            continue
        key = values[0]
        if key not in allowed:
            raise SyncError("CV!A%d: nhãn trường không đúng." % idx)
        if key in seen:
            raise SyncError("CV!A%d: nhãn trường bị trùng." % idx)
        seen.add(key)
        result[allowed[key]] = values[1] if len(values) > 1 else ""
    if seen != set(allowed):
        raise SyncError("CV: thiếu nhãn trường; giữ nguyên bản đồng bộ cũ.")
    return result


def parse_table(name, rows):
    headers, fields = TABLES[name]
    if not rows or [normal(x) for x in rows[0]] != headers:
        raise SyncError(name + ": header bị thay đổi; giữ nguyên bản đồng bộ cũ.")
    if len(rows) > MAX_ROWS:
        raise SyncError(name + ": bảng quá dài.")
    output = []
    for row in rows[1:]:
        cells = [normal(row[i]) if i < len(row) else "" for i in range(len(fields))]
        if any(cells):
            output.append(dict(zip(fields, cells)))
    return output


def parse_response(value_ranges):
    if not isinstance(value_ranges, list) or len(value_ranges) != 1 + len(TABLES):
        raise SyncError("Google Sheets: trả về thiếu tab.")
    obj = {"version": 1, "profile": parse_profile(value_ranges[0].get("values") or [])}
    for index, name in enumerate(TABLES, 1):
        obj[name] = parse_table(name, value_ranges[index].get("values") or [])
    return obj


def read_sheet():
    raw = os.environ.get("DONXINVIEC_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise SyncError("Thiếu GitHub Secret DONXINVIEC_SERVICE_ACCOUNT_JSON.")
    if os.environ.get("DONXINVIEC_SHEET_ID", SHEET_ID) != SHEET_ID:
        raise SyncError("DONXINVIEC_SHEET_ID không trùng nguồn đã kiểm chứng.")
    try:
        from google.oauth2.service_account import Credentials
        from google.auth.transport.requests import AuthorizedSession
        info = json.loads(raw)
        creds = Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
        )
    except (ImportError, ValueError, TypeError, KeyError) as exc:
        raise SyncError("Service Account JSON không hợp lệ hoặc thiếu thư viện.") from None
    session = AuthorizedSession(creds)
    ranges = ["'CV'!A1:B80"]
    for name, (headers, _) in TABLES.items():
        end = chr(ord("A") + len(headers) - 1)
        ranges.append("'%s'!A1:%s%d" % (name, end, MAX_ROWS))
    try:
        response = session.get(
            "https://sheets.googleapis.com/v4/spreadsheets/%s/values:batchGet" % SHEET_ID,
            params=[("ranges", s) for s in ranges] + [("valueRenderOption", "FORMATTED_VALUE")],
            timeout=45,
        )
        response.raise_for_status()
        body = response.json()
    except Exception:
        # Never disclose the response body: it can contain account-identifying information.
        raise SyncError("Không đọc được Google Sheets bằng Service Account. Kiểm tra quyền Viewer.") from None
    return parse_response(body.get("valueRanges"))


def encrypt(payload, password):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from hashlib import pbkdf2_hmac
    import secrets

    salt, nonce = secrets.token_bytes(16), secrets.token_bytes(12)
    key = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS, 32)
    encrypted = AESGCM(key).encrypt(nonce, canonical(payload), None)
    b64 = lambda value: base64.b64encode(value).decode("ascii")
    return {
        "version": 1, "algorithm": "AES-256-GCM",
        "kdf": "PBKDF2-SHA256", "iterations": ITERATIONS,
        "salt": b64(salt), "nonce": b64(nonce), "ciphertext": b64(encrypted),
        "sourceHash": hashlib.sha256(canonical(payload)).hexdigest(),
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def main():
    passphrase = os.environ.get("DONXINVIEC_ENCRYPTION_PASSPHRASE", "")
    if len(passphrase) < 16:
        raise SyncError("Thiếu DONXINVIEC_ENCRYPTION_PASSPHRASE (ít nhất 16 ký tự).")
    payload = read_sheet()
    fingerprint = hashlib.sha256(canonical(payload)).hexdigest()
    if OUTPUT.is_file():
        try:
            if json.loads(OUTPUT.read_text("utf-8")).get("sourceHash") == fingerprint:
                print("Không có thay đổi trong các tab CV. Không tạo PR.")
                return
        except (ValueError, OSError):
            pass
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(encrypt(payload, passphrase), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Đã cập nhật snapshot CV mã hóa; không lưu bản rõ trong repository.")


if __name__ == "__main__":
    try:
        main()
    except SyncError as error:
        print("::error::Đồng bộ Đơn xin việc: " + str(error), file=sys.stderr)
        sys.exit(1)
