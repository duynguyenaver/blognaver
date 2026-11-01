#!/usr/bin/env python3
"""Sync Google Sheets in one Drive folder to a public, reviewed BlogNaver vocabulary snapshot.

The public sheet works without secrets; enumerating a Drive folder requires a service
account JSON (or other authorized Google API identity). Never commit credentials.
Gemini Google Search grounding enriches only new/modified content, preserving cache.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

FOLDER = os.environ.get("VOCAB_DRIVE_FOLDER_ID", "1coylrqzqPOLZP_lhUdWlb3nI47Qr-af7")
SHEETS = [s.strip() for s in os.environ.get("VOCAB_PUBLIC_SHEET_IDS", "19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk").split(",") if s.strip()]
TARGET = Path(__file__).resolve().parents[1] / "static/tien-ich/hoc-tieng-viet-han-anh/vocabulary.json"
MAX_ROWS = int(os.environ.get("VOCAB_MAX_ROWS", "10000"))
MAX_ENRICH = int(os.environ.get("VOCAB_MAX_GEMINI_ITEMS", "30"))
MAX_FILES = 100
HEADERS = {
    "vi": {"vietnamese", "tieng viet", "viet", "vi", "nghia viet", "nghia tieng viet"},
    "ko": {"korean", "tieng han", "han", "kr", "ko", "hangul", "한국어", "베트남어 뜻"},
    "en": {"english", "tieng anh", "anh", "en", "nghia anh"},
    "content": {"content", "noi dung", "noi dung tu vung", "tu vung", "vocabulary", "vocab", "text"},
}
SERVICE_JSON = os.environ.get("VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "").strip()


class SyncError(RuntimeError):
    pass


def request(url: str, headers: dict | None = None, body: bytes | None = None, retries: int = 2) -> bytes:
    for attempt in range(retries + 1):
        try:
            req = Request(url, data=body, headers={"User-Agent": "BlogNaverVocabularySync/1.0", **(headers or {})})
            with urlopen(req, timeout=35) as response:
                return response.read(18_000_000)
        except HTTPError as exc:
            err = exc.read(800).decode("utf-8", "replace")
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise SyncError(f"API returned HTTP {exc.code}: {err[:260]}") from exc
        except (TimeoutError, URLError) as exc:
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise SyncError(f"Network failure: {exc}") from exc
    raise SyncError("Network retry budget exhausted")


def get_json(url: str, headers: dict | None = None) -> dict:
    return json.loads(request(url, headers=headers).decode("utf-8"))


def norm(value: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", str(value).strip().lower())
    return "".join(c for c in s if not unicodedata.combining(c)).replace("đ", "d").replace("_", " ").replace("-", " ").strip()


def clean(value: object, limit: int = 600) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def id_of(sid: str, gid: str, row_number: int) -> str:
    return hashlib.sha256(f"{sid}/{gid}/{row_number}".encode()).hexdigest()[:24]


def text_hash(item: dict) -> str:
    data = [item.get(k, "") for k in ("vi", "ko", "en", "content")]
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:24]


def read_old() -> dict:
    if not TARGET.exists():
        return {"updatedAt": None, "sources": [], "items": []}
    try:
        old = json.loads(TARGET.read_text(encoding="utf-8"))
        if isinstance(old, dict) and isinstance(old.get("items"), list):
            return old
    except (json.JSONDecodeError, OSError):
        pass
    return {"updatedAt": None, "sources": [], "items": []}


def service_headers() -> dict:
    if not SERVICE_JSON:
        return {}
    try:
        from google.oauth2.service_account import Credentials
        from google.auth.transport.requests import Request as GoogleRequest
        creds = Credentials.from_service_account_info(json.loads(SERVICE_JSON), scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
        ])
        creds.refresh(GoogleRequest())
        return {"Authorization": "Bearer " + creds.token}
    except Exception as exc:
        raise SyncError(f"Google service account credentials invalid: {type(exc).__name__}") from exc


def folder_sheets(headers: dict) -> list[dict]:
    """List all current Google spreadsheets in the configured folder, paginating safely."""
    found = []
    token = ""
    while True:
        params = {
            "q": f"'{FOLDER}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            "fields": "nextPageToken,files(id,name,mimeType,modifiedTime)",
            "pageSize": "100", "supportsAllDrives": "true", "includeItemsFromAllDrives": "true",
        }
        if token:
            params["pageToken"] = token
        payload = get_json("https://www.googleapis.com/drive/v3/files?" + urlencode(params), headers)
        for entry in payload.get("files", []):
            if len(found) >= MAX_FILES:
                raise SyncError("Folder has too many spreadsheets; increase safeguards deliberately")
            found.append({"id": entry["id"], "title": entry.get("name", entry["id"])})
        token = payload.get("nextPageToken", "")
        if not token:
            break
    return found


def list_tabs(sid: str, headers: dict) -> list[dict]:
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{quote(sid)}?fields=properties(title),sheets(properties(sheetId,title,hidden))"
    response = get_json(url, headers)
    return [{"gid": str(s["properties"]["sheetId"]), "title": s["properties"]["title"]}
            for s in response.get("sheets", [])
            if not s["properties"].get("hidden")]


def read_values(sid: str, tab: dict, headers: dict) -> list[list[str]]:
    cell_range = quote("'" + tab["title"].replace("'", "''") + "'!A1:AZ" + str(MAX_ROWS + 1), safe="")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{quote(sid)}/values/{cell_range}?valueRenderOption=FORMATTED_VALUE"
    payload = get_json(url, headers)
    return payload.get("values", [])


def public_csv(sid: str, gid: str = "0") -> list[list[str]]:
    """Anonymous read works for 'anyone with link' sheets; only first tab without API credentials."""
    url = f"https://docs.google.com/spreadsheets/d/{quote(sid)}/export?format=csv&gid={quote(gid)}"
    raw = request(url)
    decoded = raw.decode("utf-8-sig")
    if decoded.lstrip().lower().startswith("<!doctype html"):
        raise SyncError("Google returned an HTML login/share page instead of CSV; check Anyone with link → Viewer")
    return list(csv.reader(io.StringIO(decoded)))[:MAX_ROWS + 1]


def parse_content(value: str) -> dict:
    """Accept 'content' only, plus optional pipe/tab/labelled triads without altering the Sheet."""
    value = clean(value, 1000)
    result = {"vi": "", "ko": "", "en": "", "content": value}
    if not value:
        return result
    labelled = re.findall(r"(?i)(?:^|[|;\n])\s*(vi(?:et(?:namese)?)?|tiếng việt|han|hàn|kr|ko|korean|tiếng hàn|anh|en|english|tiếng anh)\s*[:：]\s*([^|;\n]+)", value)
    for label, phrase in labelled:
        key = norm(label)
        lang = "ko" if key in {"han", "kr", "ko", "korean", "tieng han"} else "en" if key in {"anh", "en", "english", "tieng anh"} else "vi"
        result[lang] = clean(phrase)
    if any(result[k] for k in ("vi", "ko", "en")):
        return result
    parts = [p.strip() for p in re.split(r"\s*[|\t]\s*", value) if p.strip()]
    if len(parts) == 3:
        # Explicit convention: Việt | Hàn | Anh
        result.update(zip(("vi", "ko", "en"), (clean(x) for x in parts)))
    elif re.search(r"[\uac00-\ud7af]", value):
        result["ko"] = value
    else:
        # Ambiguous free-form content: preserve verbatim; Gemini determines languages.
        result["content"] = value
    return result


def parse_table(values: list[list[str]], sid: str, tab: dict, title: str) -> list[dict]:
    nonempty = [(i + 1, [clean(v, 1000) for v in row]) for i, row in enumerate(values) if any(clean(x) for x in row)]
    if not nonempty:
        return []
    first_row, header = nonempty[0]
    indices: dict[str, int] = {}
    for col, cell in enumerate(header):
        for lang, aliases in HEADERS.items():
            if norm(cell) in aliases and lang not in indices:
                indices[lang] = col
    has_headers = bool(indices)
    if not has_headers:
        # A headerless Sheet1 is permitted: a single column is 'content'
        # and three columns follow Việt | Hàn | Anh.
        indices = {"content": 0} if len(header) <= 1 else {"vi": 0, "ko": 1, "en": 2}
    data = nonempty[1:] if has_headers else nonempty
    result = []
    for row_num, row in data:
        def col(key: str) -> str:
            at = indices.get(key, -1)
            return row[at] if 0 <= at < len(row) else ""
        item = {"vi": col("vi"), "ko": col("ko"), "en": col("en"), "content": col("content")}
        if item["content"]:
            extracted = parse_content(item["content"])
            for k in ("vi", "ko", "en"):
                if not item[k]:
                    item[k] = extracted[k]
        if not any(item[k] for k in ("vi", "ko", "en", "content")):
            continue
        item.update({
            "id": id_of(sid, tab["gid"], row_num),
            "sheetId": sid, "sheetTitle": title, "tabTitle": tab["title"],
            "row": row_num,
        })
        item["inputHash"] = text_hash(item)
        result.append(item)
        if len(result) >= MAX_ROWS:
            break
    return result


def models() -> list[str]:
    if not GEMINI_KEY:
        return []
    try:
        listed = get_json("https://generativelanguage.googleapis.com/v1beta/models?" + urlencode({"key": GEMINI_KEY}))
        eligible = [x["name"].split("/")[-1] for x in listed.get("models", [])
                    if "generateContent" in x.get("supportedGenerationMethods", []) and "gemini" in x.get("name", "")
                    and "flash" in x.get("name", "").lower() and "image" not in x.get("name", "").lower()]
        preferred = os.environ.get("VOCAB_GEMINI_MODEL", "").strip().removeprefix("models/")
        return ([preferred] if preferred in eligible else []) + sorted(
            [x for x in eligible if x != preferred and not any(p in x for p in ("preview", "exp", "lite"))],
            reverse=True)[:3]
    except Exception as exc:
        print("WARNING: Gemini model list unavailable:", str(exc)[:130], file=sys.stderr)
        return []


def extract_json(text: str) -> dict:
    stripped = text.strip()
    stripped = re.sub(r"^`{3}(?:json)?\s*|\s*`{3}$", "", stripped, flags=re.I)
    obj = json.loads(stripped)
    if not isinstance(obj, dict):
        raise ValueError("Expected JSON object")
    return obj


def ai_enrich_batch(batch: list[dict], model_names: list[str]) -> dict[str, dict]:
    """Ground Gemini's content in Google Search, not an ungrounded generated assertion."""
    if not batch or not model_names:
        return {}
    request_items = [{k: x[k] for k in ("id", "vi", "ko", "en", "content")} for x in batch]
    prompt = (
        "Bạn là biên tập viên từ điển Việt–Hàn–Anh. Dùng công cụ Google Search để tham khảo cách dùng/ngữ pháp "
        "từ nguồn đáng tin cậy (các từ điển, nguồn giáo dục). DỮ LIỆU NGUỒN: "
        + json.dumps(request_items, ensure_ascii=False)
        + "\nTrả về DUY NHẤT JSON hợp lệ: {\"items\":[{\"id\":\"id ban đầu\",\"vi\":\"...\",\"ko\":\"...\","
          "\"en\":\"...\",\"context\":\"Giải thích ngắn ngữ cảnh sử dụng bằng tiếng Việt\","
          "\"grammar\":\"Giải thích ngữ pháp/cấu trúc và sắc thái bằng tiếng Việt\","
          "\"examples\":{\"vi\":\"Một ví dụ tiếng Việt tự viết\",\"ko\":\"Một câu tiếng Hàn tự viết\","
          "\"en\":\"Một câu tiếng Anh tự viết\"}}]}. "
          "Giữ nguyên nghĩa đã có, chỉ điền ngôn ngữ còn thiếu khi chắc chắn; không suy diễn cụm từ mơ hồ, "
          "không bịa nguồn; nếu không chắc, để trống trường tương ứng. Ví dụ phải tự viết, tự nhiên, "
          "cùng ngữ nghĩa ở cả ba ngôn ngữ. Không thêm giải thích ngoài JSON."
    )
    body = json.dumps({"contents":[{"parts":[{"text":prompt}]}],
       "tools":[{"googleSearch":{}}],
       "generationConfig":{"temperature":0.25,"maxOutputTokens":4000}},ensure_ascii=False).encode()
    for name in model_names:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/models/" + quote(name) + ":generateContent?" + urlencode({"key": GEMINI_KEY})
            response = get_json_post(url, body)
            candidates = response.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini produced no candidates")
            first = candidates[0]
            chunks = first.get("groundingMetadata", {}).get("groundingChunks", [])
            urls = []
            for chunk in chunks:
                uri = chunk.get("web", {}).get("uri", "")
                if uri.startswith("https://") and uri not in urls:
                    urls.append(uri)
            # Google Search grounding must actually return grounding evidence.
            if not urls:
                raise ValueError("Gemini Google Search produced no grounding sources")
            output = "".join(x.get("text", "") for x in first.get("content", {}).get("parts", []))
            parsed = extract_json(output)
            valid = {}
            for row in parsed.get("items", []):
                if not isinstance(row, dict) or row.get("id") not in {x["id"] for x in batch}:
                    continue
                ex = row.get("examples", {})
                if not isinstance(ex, dict):
                    continue
                clean_row = {k: clean(row.get(k, ""), 750) for k in ("vi", "ko", "en", "context", "grammar")}
                clean_row["examples"] = {k: clean(ex.get(k, ""), 600) for k in ("vi", "ko", "en")}
                if not clean_row["context"] or not clean_row["grammar"] or not all(clean_row["examples"].values()):
                    continue
                clean_row["references"] = urls[:4]
                clean_row["aiStatus"] = "ready"
                valid[row["id"]] = clean_row
            return valid
        except Exception as exc:
            print(f"WARNING: Gemini {name} enrichment deferred: {str(exc)[:190]}", file=sys.stderr)
    return {}


def get_json_post(url: str, body: bytes) -> dict:
    return json.loads(request(url, headers={"Content-Type": "application/json"}, body=body, retries=1))


def collect(old: dict) -> dict:
    headers = service_headers()
    if headers:
        source_defs = folder_sheets(headers)
        if not source_defs:
            raise SyncError("Drive folder has no visible Google Sheets; refusing to clear existing snapshot")
    else:
        if not SHEETS:
            raise SyncError("No Google service account or public sheet configured")
        source_defs = [{"id": sid, "title": "Google Sheets " + sid[:8]} for sid in SHEETS]
        print("INFO: Public-Sheet fallback; set VOCAB_GOOGLE_SERVICE_ACCOUNT_JSON to scan all sheets in folder.", file=sys.stderr)
    sources, items = [], []
    for entry in source_defs:
        sid = entry["id"]
        if headers:
            tabs = list_tabs(sid, headers)
            if not tabs:
                raise SyncError(f"No visible tabs in sheet {sid}")
        else:
            tabs = [{"gid": "0", "title": "Sheet1"}]
        collected = []
        for tab in tabs:
            values = read_values(sid, tab, headers) if headers else public_csv(sid)
            collected.extend(parse_table(values, sid, tab, entry["title"]))
        sources.append({"id": sid, "title": entry["title"],
            "url": f"https://docs.google.com/spreadsheets/d/{sid}/edit", "count": len(collected)})
        items.extend(collected)
    if len(items) > MAX_ROWS:
        raise SyncError(f"Too many rows ({len(items)}): refusing to truncate a full sync")
    if old.get("items") and not items:
        raise SyncError("Previously non-empty snapshot would become empty; refusing silent data loss")
    cache = {x.get("id"): x for x in old.get("items", [])}
    pending = []
    for x in items:
        last = cache.get(x["id"], {})
        if last.get("inputHash") == x["inputHash"] and last.get("aiStatus") == "ready":
            for key in ("context", "grammar", "examples", "references", "aiStatus"):
                x[key] = last.get(key)
            for lang in ("vi", "ko", "en"):
                if not x.get(lang):
                    x[lang] = last.get(lang, "")
        else:
            x["aiStatus"] = "pending"
        if x["aiStatus"] != "ready":
            pending.append(x)
    names = models()
    if pending and not names:
        print(f"INFO: {len(pending)} terms pending Gemini; configure GEMINI_API_KEY secret.", file=sys.stderr)
    todo = pending[:max(0, MAX_ENRICH)]
    for start in range(0, len(todo), 3):
        group = todo[start:start+3]
        enriched = ai_enrich_batch(group, names) if names else {}
        for x in group:
            ai = enriched.get(x["id"])
            if ai:
                # Don't override user-provided translations.
                for key in ("vi", "ko", "en"):
                    if not x.get(key):
                        x[key] = ai[key]
                for key in ("context", "grammar", "examples", "references", "aiStatus"):
                    x[key] = ai[key]
    result = {"schemaVersion": 1, "folderId": FOLDER, "updatedAt": None,
              "sources": sources, "items": items}
    stable = lambda data: json.dumps({"sources": data.get("sources", []), "items": data.get("items", [])}, sort_keys=True, ensure_ascii=False)
    if stable(result) == stable(old):
        result["updatedAt"] = old.get("updatedAt")
    else:
        result["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return result


def main():
    old = read_old()
    if os.environ.get("VOCAB_TEST_MODE"):
        print("Test mode: import functions only")
        return
    result = collect(old)
    if result == old:
        print("No vocabulary changes.")
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(result['items'])} words across {len(result['sources'])} Sheets; "
          f"AI completed {sum(x.get('aiStatus')=='ready' for x in result['items'])}")


if __name__ == "__main__":
    try:
        main()
    except (SyncError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print("ERROR:", str(exc)[:500], file=sys.stderr)
        sys.exit(1)
