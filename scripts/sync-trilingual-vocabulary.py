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
    "context": {"context or expression", "context", "expression", "ngu canh su dung", "cach bieu hien"},
    "grammar": {"ngu phap vi du", "ngu phap", "grammar examples", "grammar"},
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
            "https://www.googleapis.com/auth/spreadsheets",
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
        sheet_context, sheet_grammar = col("context"), col("grammar")
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
        if sheet_context:
            item["context"] = sheet_context
        if sheet_grammar:
            item["grammar"] = sheet_grammar
        result.append(item)
        if len(result) >= MAX_ROWS:
            break
    return result


# A Gemini model returned by ListModels is discoverable, not necessarily available
# to this project today. Actual 429/404/400 errors determine runtime fallbacks.
NON_TEXT_MODEL_TOKENS = (
    "tts", "speech", "audio", "image", "imagen", "veo", "video", "embedding",
    "live", "realtime", "robotics", "computer", "transcribe",
)


def is_text_model(model: dict) -> bool:
    name = str(model.get("name", "")).split("/")[-1].lower()
    if not name.startswith("gemini-") or any(token in name for token in NON_TEXT_MODEL_TOKENS):
        return False
    if "generateContent" not in model.get("supportedGenerationMethods", []):
        return False
    output_modes = model.get("supportedOutputModalities", []) or model.get("outputModalities", [])
    if output_modes and "TEXT" not in output_modes:
        return False
    return int(model.get("outputTokenLimit") or 1024) >= 512


def model_priority(name: str) -> tuple:
    # Stable text Flash / Flash-Lite first, then Pro and any other capable text
    # models. Prefer recent numeric generations, not arbitrary lexicographic order.
    low = name.lower()
    family = 0 if "flash" in low and "lite" not in low else 1 if "lite" in low else 2 if "pro" in low else 3
    preview = 1 if any(s in low for s in ("preview", "exp", "-latest")) else 0
    parts = [int(n) for n in re.findall(r"\d+", low)[:2]]
    version = tuple((parts + [0, 0])[:2])
    return (family, preview, -version[0], -version[1], name)


def discover_text_models(listed: list[dict], preferred: str = "") -> list[str]:
    names = {model["name"].split("/")[-1] for model in listed if is_text_model(model)}
    ranked = sorted(names, key=model_priority)
    override = preferred.strip().removeprefix("models/")
    if override in names:
        ranked.remove(override)
        ranked.insert(0, override)
    return ranked


def models() -> list[str]:
    if not GEMINI_KEY:
        return []
    try:
        listed: list[dict] = []
        token = ""
        # Paginate instead of silently limiting fallback to three candidates.
        for _ in range(5):
            args = {"key": GEMINI_KEY, "pageSize": "100"}
            if token:
                args["pageToken"] = token
            page = get_json("https://generativelanguage.googleapis.com/v1beta/models?" + urlencode(args))
            listed.extend(page.get("models", []))
            token = page.get("nextPageToken", "")
            if not token:
                break
        names = discover_text_models(listed, os.environ.get("VOCAB_GEMINI_MODEL", ""))
        print("INFO: Gemini text-capable models eligible for bounded auto-fallback: "
              + (", ".join(names[:12]) or "none"), file=sys.stderr)
        return names[:min(16, max(1, int(os.environ.get("VOCAB_MAX_GEMINI_MODEL_ATTEMPTS", "12"))))]
    except (SyncError, ValueError, KeyError, TypeError) as exc:
        print("WARNING: Gemini model discovery unavailable:", str(exc)[:180], file=sys.stderr)
        return []


def extract_json(text: str) -> dict:
    stripped = text.strip()
    stripped = re.sub(r"^`{3}(?:json)?\s*|\s*`{3}$", "", stripped, flags=re.I)
    obj = json.loads(stripped)
    if not isinstance(obj, dict):
        raise ValueError("Expected JSON object")
    return obj


def ai_enrich_batch(batch: list[dict], model_names: list[str],
                    quota_state: dict | None = None) -> dict[str, dict]:
    """Rotate only text models the project exposes; never exceed quota by retry storms.

    Prefer Google Search grounding. If the model does not support the tool, a
    plain generation may still provide original language-learning examples,
    explicitly WITHOUT reference links or a claim of external verification.
    """
    if not batch or not model_names:
        return {}
    state = quota_state if quota_state is not None else {"blocked": set()}
    blocked = state.setdefault("blocked", set())
    request_items = [{k: x[k] for k in ("id", "vi", "ko", "en", "content")} for x in batch]
    prompt = (
        "Bạn là biên tập viên từ điển Việt–Hàn–Anh. Chỉ phân tích ngữ nghĩa/ngữ pháp "
        "và sáng tác câu ví dụ tự nhiên phù hợp với cả ba ngôn ngữ. Không bịa nguồn, "
        "số liệu hay thông tin kiểm chứng bên ngoài. Nếu có Google Search, ưu tiên "
        "nguồn giáo dục đáng tin cậy; nếu không thì chỉ cung cấp kiến thức ngôn ngữ "
        "phổ thông, không tuyên bố đã kiểm chứng từ web. DỮ LIỆU NGUỒN: "
        + json.dumps(request_items, ensure_ascii=False)
        + "\nTrả về DUY NHẤT JSON hợp lệ: {\"items\":[{\"id\":\"id ban đầu\",\"vi\":\"...\",\"ko\":\"...\","
          "\"en\":\"...\",\"context\":\"Giải thích ngắn ngữ cảnh sử dụng bằng tiếng Việt\","
          "\"grammar\":\"Giải thích ngữ pháp/cấu trúc và sắc thái bằng tiếng Việt\","
          "\"examples\":{\"vi\":\"Một ví dụ tiếng Việt tự viết\",\"ko\":\"Một câu tiếng Hàn tự viết\","
          "\"en\":\"Một câu tiếng Anh tự viết\"}}]}. "
          "Giữ nguyên nghĩa đã có; chỉ điền ngôn ngữ còn thiếu khi chắc chắn, "
          "không suy diễn câu mơ hồ. Viết ví dụ cùng ngữ nghĩa trong cả ba ngôn ngữ. "
          "Không thêm giải thích ngoài JSON."
    )
    base = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 4096}}
    valid_ids = {x["id"] for x in batch}
    for name in model_names:
        if name in blocked:
            continue
        endpoint = ("https://generativelanguage.googleapis.com/v1beta/models/"
                    + quote(name) + ":generateContent?" + urlencode({"key": GEMINI_KEY}))
        for grounded in (True, False):
            body = dict(base)
            if grounded:
                body["tools"] = [{"googleSearch": {}}]
            try:
                response = get_json_post(endpoint, json.dumps(body, ensure_ascii=False).encode())
                candidates = response.get("candidates", [])
                if not candidates:
                    raise ValueError("Model returned no response candidates")
                first = candidates[0]
                output = "".join(part.get("text", "") for part in first.get("content", {}).get("parts", []))
                parsed = extract_json(output)
                urls: list[str] = []
                if grounded:
                    for chunk in first.get("groundingMetadata", {}).get("groundingChunks", []):
                        uri = chunk.get("web", {}).get("uri", "")
                        if isinstance(uri, str) and uri.startswith("https://") and uri not in urls:
                            urls.append(uri)
                results = {}
                for row in parsed.get("items", []):
                    if not isinstance(row, dict) or row.get("id") not in valid_ids:
                        continue
                    ex = row.get("examples", {})
                    if not isinstance(ex, dict):
                        continue
                    record = {k: clean(row.get(k, ""), 750) for k in ("vi", "ko", "en", "context", "grammar")}
                    record["examples"] = {k: clean(ex.get(k, ""), 600) for k in ("vi", "ko", "en")}
                    if not record["context"] or not record["grammar"] or not all(record["examples"].values()):
                        continue
                    record.update({"references": urls[:4], "aiStatus": "ready",
                                   "aiModel": name, "grounded": bool(urls)})
                    results[row["id"]] = record
                if results:
                    state["last_success_model"] = name
                    state["last_success_grounded"] = bool(urls)
                    print(f"INFO: Gemini success using {name}; grounded={bool(urls)}; "
                          f"enriched={len(results)}/{len(batch)}", file=sys.stderr)
                    return results
                raise ValueError("Model response did not contain complete, valid examples")
            except SyncError as exc:
                error = str(exc)
                if re.search(r"\bHTTP 429\b", error):
                    # A different model may still have its own available quota.
                    blocked.add(name)
                    print(f"WARNING: Gemini model {name} returned 429; rotating to the next eligible model",
                          file=sys.stderr)
                    break
                if grounded and re.search(r"\bHTTP 400\b", error):
                    print(f"INFO: {name} rejected Google Search; trying plain text generation",
                          file=sys.stderr)
                    continue
                # Invalid API key and other access errors must not be hidden as
                # "successful" fallback; rotate only with bounded candidates.
                blocked.add(name)
                print(f"WARNING: Gemini {name} HTTP failure: {error[:165]}", file=sys.stderr)
                break
            except (ValueError, KeyError, TypeError) as exc:
                if grounded:
                    # A grounded model can return valid language text but no JSON;
                    # one plain retry is permitted for this model.
                    print(f"INFO: Gemini {name} grounded output invalid; trying ungrounded once: "
                          f"{str(exc)[:100]}", file=sys.stderr)
                    continue
                blocked.add(name)
                print(f"WARNING: Gemini {name} invalid output: {str(exc)[:150]}", file=sys.stderr)
                break
    if len(blocked) >= len(model_names):
        print("WARNING: Gemini has no successful eligible text model in this run. "
              "Project-level quota may be exhausted; retain all pending words. "
              "Model switching cannot bypass project-wide quotas.", file=sys.stderr)
    return {}


def get_json_post(url: str, body: bytes) -> dict:
    return json.loads(request(url, headers={"Content-Type": "application/json"}, body=body, retries=0))


def write_back_ready(rows: list[dict], headers: dict) -> None:
    """Best-effort Sheets D/E writeback. Only exact A:C + header matches; never overwrite edits."""
    if not headers or os.environ.get("VOCAB_WRITEBACK_SHEETS", "0") != "1":
        return
    by_sheet: dict[tuple[str, str], list[dict]] = {}
    for x in rows:
        if x.get("aiStatus") == "ready" and x.get("context") and x.get("grammar"):
            by_sheet.setdefault((x["sheetId"], x["tabTitle"]), []).append(x)
    for (sid, title), entries in by_sheet.items():
        try:
            tab = next((t for t in list_tabs(sid, headers) if t["title"] == title), None)
            if not tab:
                continue
            current = read_values(sid, tab, headers)
            if not current or len(current[0]) < 5:
                continue
            h = [norm(v) for v in current[0][:5]]
            if not (h[0] in HEADERS["vi"] and h[1] in HEADERS["ko"] and h[2] in HEADERS["en"]
                    and h[3] in HEADERS["context"] and h[4] in HEADERS["grammar"]):
                print(f"INFO: Skip writeback to {title}: exact A:E headers not matched", file=sys.stderr)
                continue
            edits = []
            for x in entries:
                index = x["row"] - 1
                if index < 1 or index >= len(current):
                    continue
                raw = (current[index] + [""] * 5)[:5]
                if [clean(v) for v in raw[:3]] != [clean(x[k]) for k in ("vi", "ko", "en")]:
                    continue
                examples = x.get("examples") or {}
                phrases = [x["grammar"]]
                for lang, key in (("VI", "vi"), ("KR", "ko"), ("EN", "en")):
                    if examples.get(key):
                        phrases.append(f"{lang}: {examples[key]}")
                grammar = "\n".join(phrases)
                if not clean(raw[3]):
                    edits.append({"range": f"'{title.replace(chr(39), chr(39)*2)}'!D{x['row']}",
                                  "values": [[x["context"]]]})
                if not clean(raw[4]):
                    edits.append({"range": f"'{title.replace(chr(39), chr(39)*2)}'!E{x['row']}",
                                  "values": [[grammar]]})
            if not edits:
                continue
            url = f"https://sheets.googleapis.com/v4/spreadsheets/{quote(sid)}/values:batchUpdate"
            payload = json.dumps({"valueInputOption": "RAW", "data": edits}, ensure_ascii=False).encode()
            response = json.loads(request(url, headers={**headers, "Content-Type": "application/json"}, body=payload))
            print(f"INFO: Sheets writeback {sid}: {response.get('totalUpdatedCells', 0)} cells")
        except (SyncError, ValueError, KeyError, HTTPError) as exc:
            print(f"WARNING: Could not write Gemini D/E to {sid}: {str(exc)[:250]}", file=sys.stderr)


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
            for key in ("context", "grammar", "examples", "references", "aiStatus", "aiModel", "grounded"):
                if not x.get(key):
                    x[key] = last.get(key)
            for lang in ("vi", "ko", "en"):
                if not x.get(lang):
                    x[lang] = last.get(lang, "")
        elif x.get("context") and x.get("grammar"):
            x["aiStatus"] = "sheet"
        else:
            x["aiStatus"] = "pending"
        if x["aiStatus"] == "pending":
            pending.append(x)
    names = models()
    if pending and not names:
        print(f"INFO: {len(pending)} terms pending Gemini; configure GEMINI_API_KEY secret.", file=sys.stderr)
    # Track models that failed once, avoiding repeated HTTP 429 storms across batches.
    quota_state = {"blocked": set()}
    todo = pending[:max(0, MAX_ENRICH)]
    for start in range(0, len(todo), 3):
        group = todo[start:start+3]
        enriched = ai_enrich_batch(group, names, quota_state) if names else {}
        for x in group:
            ai = enriched.get(x["id"])
            if ai:
                # Don't override user-provided translations.
                for key in ("vi", "ko", "en"):
                    if not x.get(key):
                        x[key] = ai[key]
                for key in ("context", "grammar", "examples", "references", "aiStatus"):
                    x[key] = ai[key]
    write_back_ready(items, headers)
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
