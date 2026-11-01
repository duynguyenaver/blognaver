"""No-key, no-cloud-inference Vietnamese/Korean/English vocabulary explanations.

A vetted, original local phrase lexicon covers frequent terms, while bounded
linguistic templates give every other row an honest learning note. This is a
deterministic reference writer, NOT a locally running language model.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

REFERENCE = Path(__file__).with_name("trilingual-offline-notes.json")


def normal(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


@lru_cache(maxsize=1)
def load_notes() -> dict[str, dict]:
    try:
        content = json.loads(REFERENCE.read_text(encoding="utf-8"))
        return {normal(k): v for k, v in content.get("items", {}).items()
                if isinstance(v, dict)}
    except (OSError, json.JSONDecodeError, TypeError):
        return {}


def korean_structure(text: str) -> str:
    word = normal(text)
    if re.search(r"(습니까|ㅂ니까|나요|니)\?$", word):
        return "câu hỏi; đuôi câu thể hiện sắc thái nghi vấn, mức độ lịch sự tùy cấu trúc"
    if re.search(r"(습니다|입니다|합니다)\.?$", word):
        return "mệnh đề hoàn chỉnh ở văn phong trang trọng (đuôi -습니다 / -ㅂ니다)"
    if re.search(r"(어요|아요|해요)\.?$", word):
        return "mệnh đề ở lối nói lịch sự thân mật (đuôi -아/어요)"
    if re.search(r"(고|거나|는데|면서|지만|아서|어서|여)$", word):
        return "cụm động từ có đuôi nối; có thể cần một vế tiếp theo để thành câu hoàn chỉnh"
    if re.search(r"(한|하는|했던|된|되는|있는|없는|ㄴ|은)$", word):
        return "có thể là dạng định ngữ bổ nghĩa danh từ; cần kiểm tra danh từ theo sau"
    if " " not in word:
        return "một từ độc lập; cần kiểm tra từ loại và tiểu từ phù hợp theo câu"
    return "cụm từ gồm nhiều thành tố; tiểu từ tiếng Hàn (nếu có) phụ thuộc vai trò trong câu"


def offline_enrich(entry: dict) -> dict:
    """Generate the content fields for one owner-provided source row.

    Never rewrite A/B/C or invent web citations. For unseen entries the
    examples deliberately illustrate *mentioning* a phrase, not an asserted
    idiomatic usage. Both pathways disclose the need for human review.
    """
    vi = str(entry.get("vi", "")).strip()
    ko = str(entry.get("ko", "")).strip()
    en = str(entry.get("en", "")).strip()
    record = load_notes().get(normal(vi))
    if record and vi and ko and en and normal(record.get("sourceKo")) == normal(ko) and normal(record.get("sourceEn")) == normal(en):
        context = str(record.get("context") or "").strip()
        grammar = str(record.get("grammar") or "").strip()
        examples = record.get("examples", {})
        examples = {k: str(examples.get(k, "")).strip() for k in ("vi", "ko", "en")}
        if context and grammar and all(examples.values()):
            return {
                "context": context, "grammar": grammar, "examples": examples,
                "references": [], "grounded": False, "aiStatus": "ready",
                "aiProvider": "offline", "aiModel": "curated-offline-v1",
                "reviewRecommended": bool(record.get("reviewRecommended", False)),
            }

    # Unknown entries: transparent reference notes rather than false expertise.
    # Quotes in Korean/English are lesson *mentions*, not an improper attempt
    # to use a conjugated verb as a noun or to guess Korean case particles.
    label = vi or en or ko
    k = ko or "해당 표현"
    e = en or "this expression"
    context = (
        f"Tham khảo offline: “{label}” được ghi trong bảng với tiếng Hàn “{k}” "
        f"và tiếng Anh “{e}”. Hãy đối chiếu văn cảnh để xác định sắc thái và "
        "chọn cách dịch tự nhiên. Đây là lời dẫn nhập thuật ngữ, không phải xác minh nghĩa từ điển."
    )
    grammar = (
        f"Gợi ý kiểm tra: “{k}” {korean_structure(ko)}. "
        "Để dùng trong câu, cần chọn trợ từ, đuôi câu và mức độ kính ngữ "
        "theo mục đích giao tiếp. Chưa có phân tích ngữ pháp riêng đã được thẩm định cho mục từ này."
    )
    return {
        "context": context, "grammar": grammar,
        "examples": {
            "vi": f"Trong bài học này, chúng tôi tìm hiểu cách dùng “{label}”.",
            "ko": f"이번 수업에서는 '{k}'라는 표현을 배웁니다.",
            "en": f"In this lesson, we learn the expression “{e}”.",
        },
        "references": [], "grounded": False, "aiStatus": "ready",
        "aiProvider": "offline", "aiModel": "template-offline-v1",
        "reviewRecommended": True,
    }
