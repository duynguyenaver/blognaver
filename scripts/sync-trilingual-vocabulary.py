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
from datetime import datetime, timezone, timedelta
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
GROQ_KEY = os.environ.get("GROQ_API_KEY", "").strip()


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
    rate_limited = state.setdefault("rate_limited", set())
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
                    rate_limited.add(name)
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



# Groq's REST interface is OpenAI-compatible. Never call it from browser JS:
# only the server-side GitHub Actions process may read GROQ_API_KEY.
GROQ_API = "https://api.groq.com/openai/v1"
GROQ_NON_TEXT = (
    "whisper", "speech", "audio", "tts", "orpheus", "image", "vision",
    "embedding", "guard", "safeguard", "moderation", "compound",
)


def groq_text_models(data: list[dict], preferred: str = "") -> list[str]:
    """Choose models from the LIVE account list; no unsupported hardcoded fallback."""
    available = set()
    for x in data:
        name = str(x.get("id", "")).strip()
        low = name.lower()
        if not name or x.get("active") is False or any(k in low for k in GROQ_NON_TEXT):
            continue
        # Avoid discontinued 2026 free/developer Llama 3.1/3.3 models even if
        # a stale account listing happens to include them.
        if low.startswith(("llama-3.1-", "llama-3.3-")):
            continue
        if not (name.startswith(("openai/", "qwen/", "meta-llama/", "mistral-", "gemma-"))
                or "llama" in low or "mixtral" in low):
            continue
        available.add(name)
    preferred_order = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
    ordered = [x for x in preferred_order if x in available]
    ordered += sorted(available - set(ordered))
    if preferred in available:
        ordered.remove(preferred)
        ordered.insert(0, preferred)
    return ordered[:max(1, min(8, int(os.environ.get("VOCAB_MAX_GROQ_MODEL_ATTEMPTS", "5"))))]


def groq_models() -> list[str]:
    if not GROQ_KEY:
        return []
    try:
        listed = get_json(GROQ_API + "/models",
                          {"Authorization": "Bearer " + GROQ_KEY})
        candidates = groq_text_models(listed.get("data", []),
                                      os.environ.get("VOCAB_GROQ_MODEL", "").strip())
        print("INFO: Groq text models available: " + (", ".join(candidates) or "none"),
              file=sys.stderr)
        return candidates
    except (SyncError, ValueError, KeyError, TypeError) as exc:
        print("WARNING: Groq model discovery unavailable: " + str(exc)[:140], file=sys.stderr)
        return []


def groq_post(model: str, prompt: str, json_mode: bool) -> dict:
    data = {"model": model,
            "messages": [
                {"role": "system", "content": "Bạn là chuyên gia ngữ pháp Việt–Hàn–Anh. "
                 "Chỉ trả JSON hợp lệ, ví dụ tự viết, không bịa trích dẫn hay nguồn."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_completion_tokens": 2500,
            "stream": False}
    if json_mode:
        data["response_format"] = {"type": "json_object"}
    raw = request(GROQ_API + "/chat/completions", headers={
        "Authorization": "Bearer " + GROQ_KEY, "Content-Type": "application/json"
    }, body=json.dumps(data, ensure_ascii=False).encode("utf-8"), retries=0)
    return json.loads(raw)


def ai_enrich_groq_batch(batch: list[dict], model_names: list[str],
                         state: dict | None = None) -> dict[str, dict]:
    """Fallback after Gemini failure/cooldown. Persist no fake web citations."""
    if not batch or not model_names or not GROQ_KEY:
        return {}
    state = state if state is not None else {"blocked": set()}
    blocked = state.setdefault("blocked", set())
    valid_ids = {x["id"] for x in batch}
    payload = [{k: x.get(k, "") for k in ("id", "vi", "ko", "en", "content")} for x in batch]
    prompt = (
        "Hãy viết Ngữ cảnh sử dụng và Ghi chú ngữ pháp cho từng mục từ Việt–Hàn–Anh. "
        "Giữ NGUYÊN những bản dịch đầu vào. Giải thích nghĩa và tình huống sử dụng "
        "của cách nói tiếng Hàn, phân biệt từ loại/cấu trúc/sắc thái, tạo ba câu "
        "ví dụ tự nhiên thể hiện cùng ý. Không tuyên bố đã tra cứu trên web. "
        "Không bịa dữ kiện. Trả DUY NHẤT object JSON gồm trường items, mỗi phần tử "
        "có {id, vi, ko, en, context, grammar, examples:{vi,ko,en}}. "
        "Mỗi context/grammar viết bằng tiếng Việt, mỗi examples đúng ngôn ngữ; "
        "nếu chưa chắc nghĩa thì để trống thay vì đoán. Dữ liệu:\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    ordered = list(model_names)
    preferred = state.get("last_success_model")
    if preferred in ordered:
        ordered.remove(preferred)
        ordered.insert(0, preferred)
    for name in ordered:
        if name in blocked:
            continue
        for json_mode in (True, False):
            try:
                answer = groq_post(name, prompt, json_mode)
                text = answer["choices"][0]["message"].get("content") or ""
                parsed = extract_json(text)
                rows = parsed.get("items", [])
                if not isinstance(rows, list):
                    raise ValueError("Groq response missing items array")
                ready = {}
                for row in rows:
                    if not isinstance(row, dict) or row.get("id") not in valid_ids:
                        continue
                    examples = row.get("examples")
                    if not isinstance(examples, dict):
                        continue
                    record = {k: clean(row.get(k, ""), 750)
                              for k in ("vi", "ko", "en", "context", "grammar")}
                    record["examples"] = {k: clean(examples.get(k, ""), 600)
                                          for k in ("vi", "ko", "en")}
                    if not record["context"] or not record["grammar"] or not all(record["examples"].values()):
                        continue
                    record.update({
                        "references": [], "grounded": False,
                        "aiStatus": "ready", "aiModel": name, "aiProvider": "groq"
                    })
                    ready[row["id"]] = record
                if not ready:
                    raise ValueError("Groq generated no complete educational examples")
                state["last_success_model"] = name
                print(f"INFO: Groq fallback succeeded with {name}; "
                      f"enriched {len(ready)}/{len(batch)} rows (ungrounded)",
                      file=sys.stderr)
                return ready
            except SyncError as exc:
                msg = str(exc)
                if "HTTP 400" in msg and json_mode:
                    print(f"INFO: {name} does not accept JSON mode; retrying standard chat",
                          file=sys.stderr)
                    continue
                blocked.add(name)
                if "HTTP 429" in msg:
                    print(f"WARNING: Groq {name} quota 429; rotating once to next model",
                          file=sys.stderr)
                else:
                    print(f"WARNING: Groq {name}: {msg[:150]}", file=sys.stderr)
                # A bad key affects every model, so stop instead of retrying.
                if "HTTP 401" in msg or "HTTP 403" in msg:
                    blocked.update(ordered)
                break
            except (ValueError, KeyError, TypeError, IndexError) as exc:
                if json_mode:
                    # Some accounts/models support only regular chat completions.
                    continue
                blocked.add(name)
                print(f"WARNING: Groq {name} invalid response: {str(exc)[:150]}",
                      file=sys.stderr)
                break
    return {}


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
            for key in ("context", "grammar", "examples", "references", "aiStatus", "aiModel", "grounded", "aiProvider"):
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
    now = datetime.now(timezone.utc)
    previous_retry = old.get("aiRetryAfter")
    cool_down = False
    if isinstance(previous_retry, str) and previous_retry:
        try:
            cool_down = datetime.fromisoformat(previous_retry.replace("Z", "+00:00")) > now
        except ValueError:
            pass
    if cool_down and pending:
        print(f"INFO: Gemini quota cooldown active until {previous_retry}. "
              "Source rows still sync; skipping repeated rate-limit API calls.", file=sys.stderr)
    # Gemini cooldown does NOT block Groq. The two providers have separate
    # credentials/quotas; a Gemini 429 should not stop useful Groq enrichment.
    names = models() if pending and not cool_down else []
    groq_names = groq_models() if pending else []
    if pending and not names and not groq_names:
        print(f"INFO: {len(pending)} words pending AI. Configure GROQ_API_KEY "
              "or wait for Gemini quota/model access.", file=sys.stderr)
    gemini_state = {"blocked": set(), "rate_limited": set()}
    groq_state = {"blocked": set()}
    todo = pending[:max(0, MAX_ENRICH)]
    for start in range(0, len(todo), 3):
        group = todo[start:start+3]
        enriched = ai_enrich_batch(group, names, gemini_state) if names else {}
        remaining = [x for x in group if x["id"] not in enriched]
        # Always try Groq for missing results, including during Gemini cooldown.
        if remaining and groq_names:
            enriched.update(ai_enrich_groq_batch(remaining, groq_names, groq_state))
        for x in group:
            ai = enriched.get(x["id"])
            if ai:
                # Never override owner-authored A:C translations.
                for key in ("vi", "ko", "en"):
                    if not x.get(key):
                        x[key] = ai[key]
                for key in ("context", "grammar", "examples", "references",
                            "aiStatus", "aiModel", "grounded", "aiProvider"):
                    x[key] = ai.get(key, "gemini" if key == "aiProvider" else None)
    write_back_ready(items, headers)
    result = {"schemaVersion": 1, "folderId": FOLDER, "updatedAt": None,
              "sources": sources, "items": items}
    if cool_down:
        result["aiRetryAfter"] = previous_retry
    elif (gemini_state["rate_limited"] and names
          and len(gemini_state["blocked"]) >= len(names)
          and not any(x.get("aiStatus") == "ready" for x in todo)):
        # Daily/project-wide 429 cannot be solved by rotating models repeatedly.
        # Retry after a bounded 15-minute pause; the Sheet's A:C still imports.
        result["aiRetryAfter"] = (now + timedelta(minutes=15)).isoformat(timespec="seconds")
        print("WARNING: All available Gemini text models failed; next AI retry after "
              + result["aiRetryAfter"], file=sys.stderr)
    stable = lambda data: json.dumps({
        "sources": data.get("sources", []), "items": data.get("items", []),
        "aiRetryAfter": data.get("aiRetryAfter")
    }, sort_keys=True, ensure_ascii=False)
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
