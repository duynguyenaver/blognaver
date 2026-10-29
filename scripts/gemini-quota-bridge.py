#!/usr/bin/env python3
"""Gemini read-only key status bridge. Never returns API keys or tokens."""
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", 19475
ORIGINS = {"https://duynguyenaver.github.io", "http://127.0.0.1:1313", "http://localhost:1313"}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def headers_cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin"))
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
    def send_json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.headers_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_OPTIONS(self):
        if self.headers.get("Origin") not in ORIGINS:
            self.send_error(403)
            return
        self.send_response(204)
        self.headers_cors()
        self.end_headers()
    def do_GET(self):
        if self.headers.get("Origin") not in ORIGINS:
            self.send_error(403)
            return
        if self.path != "/status":
            self.send_json(404, {"error": "Unknown path"})
            return
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key:
            self.send_json(503, {"error": "Chưa đặt GEMINI_API_KEY trong Terminal."})
            return
        request = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
            headers={"x-goog-api-key": key, "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json.load(response)
            self.send_json(200, {"connected": True, "modelCount": len(data.get("models", [])), "quotaRemaining": None, "source": "gemini-models-list"})
        except urllib.error.HTTPError as error:
            # No upstream bodies: they may contain sensitive diagnostic details.
            self.send_json(503, {"error": "Gemini không chấp nhận truy vấn models (HTTP %s). Kiểm tra API key và quyền dự án." % error.code})
        except Exception:
            self.send_json(503, {"error": "Không truy cập được Gemini API. Kiểm tra mạng và kết nối."})

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        raise SystemExit("Chưa có GEMINI_API_KEY. Hãy đặt biến môi trường trước khi khởi động.")
    print("Gemini status bridge: http://127.0.0.1:19475 (local only)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
