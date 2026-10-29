#!/usr/bin/env python3
"""Local, read-only Codex quota bridge for BlogNaver. Python stdlib only.

Never reads ~/.codex/auth.json or exposes credentials. Bind to loopback only.
Run: python3 scripts/codex-quota-bridge.py
"""
import json
import os
import select
import shutil
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", 19473
ALLOWED_ORIGINS = {
    "https://duynguyenaver.github.io",
    "http://localhost:1313",
    "http://127.0.0.1:1313",
}
MAX_SECONDS = 18

def query_codex():
    codex = shutil.which("codex")
    if not codex:
        raise RuntimeError("Không tìm thấy codex trong PATH. Hãy cài hoặc mở terminal có Codex CLI.")
    # Codex app-server JSONL over stdio. The subprocess uses the user's existing
    # authenticated Codex session; this bridge neither reads nor returns secrets.
    proc = subprocess.Popen(
        [codex, "app-server", "--listen", "stdio://"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL, text=False, bufsize=0,
    )
    try:
        payloads = [
            {"id": 1, "method": "initialize", "params": {
                "clientInfo": {"name": "blognaver-quota-bridge", "version": "1.0.0"},
                "capabilities": {},
            }},
            {"method": "initialized", "params": {}},
            {"id": 2, "method": "account/rateLimits/read", "params": {}},
        ]
        for payload in payloads:
            proc.stdin.write((json.dumps(payload, separators=(",", ":")) + "\n").encode())
            proc.stdin.flush()
        deadline = time.monotonic() + MAX_SECONDS
        buffer = b""
        fd = proc.stdout.fileno()
        while time.monotonic() < deadline:
            ready, _, _ = select.select([fd], [], [], min(0.8, max(0, deadline-time.monotonic())))
            if not ready:
                if proc.poll() is not None:
                    raise RuntimeError("Codex App Server dừng trước khi trả quota. Kiểm tra codex login.")
                continue
            chunk = os.read(fd, 65536)
            if not chunk:
                raise RuntimeError("Codex App Server đóng kết nối trước khi trả quota.")
            buffer += chunk
            if len(buffer) > 1048576:
                raise RuntimeError("Phản hồi quá lớn; từ chối xử lý.")
            while b"\n" in buffer:
                raw, buffer = buffer.split(b"\n", 1)
                try:
                    obj = json.loads(raw)
                except (ValueError, UnicodeError):
                    continue
                if obj.get("id") == 2:
                    if "error" in obj:
                        raise RuntimeError("Codex từ chối truy vấn rate limits: " + str(obj["error"].get("message", "không rõ lỗi"))[:160])
                    root = obj.get("result") or {}
                    limit = root.get("rateLimits") or root.get("rate_limits") or {}
                    # Only whitelist quota fields; never return account or auth metadata.
                    def safe_window(w):
                        if not isinstance(w, dict):
                            return None
                        return {k: w[k] for k in ("usedPercent", "windowDurationMins", "resetsAt") if k in w}
                    mapped = {"primary": safe_window(limit.get("primary")),
                              "secondary": safe_window(limit.get("secondary"))}
                    if not any(mapped.values()):
                        raise RuntimeError("Codex không trả dữ liệu primary/secondary. Kiểm tra đăng nhập ChatGPT trong Codex.")
                    return {"rateLimits": mapped, "observedAt": int(time.time()), "source": "local-codex-app-server"}
        raise RuntimeError("Codex không phản hồi trong thời gian quy định.")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except (OSError, subprocess.TimeoutExpired):
            proc.kill()
            proc.wait()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def authorized(self):
        return self.headers.get("Origin") in ALLOWED_ORIGINS

    def headers_cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin"))
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")

    def send_json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.headers_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if not self.authorized():
            self.send_error(403)
            return
        self.send_response(204)
        self.headers_cors()
        self.end_headers()

    def do_GET(self):
        if not self.authorized():
            self.send_error(403)
            return
        if self.path != "/quota":
            self.send_json(404, {"error": "Unknown path"})
            return
        try:
            self.send_json(200, query_codex())
        except Exception as exc:
            # Do not expose raw subprocess output or auth material.
            self.send_json(503, {"error": str(exc)[:220]})

if __name__ == "__main__":
    print("BlogNaver Codex Quota Bridge listening on http://127.0.0.1:19473")
    print("Local only. Browser origins allowed:", ", ".join(sorted(ALLOWED_ORIGINS)))
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
