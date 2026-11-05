#!/usr/bin/env python3
"""
AI Pitch Studio — Python Backend HTTP Server
Runs on port 8001, providing API endpoints for pitch generation and presets.
"""

import json
import os
import re
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


# Import engine from same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pitch_engine import generate_pitch, DURATION_CONFIGS

PORT = int(os.environ.get("PORT", os.environ.get("PYTHON_PORT", 8001)))

def sanitize_string(val: Any, max_len: int = 200) -> str:
    if not isinstance(val, str):
        return ""
    # Strip null bytes and HTML script tags
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", val)
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    return cleaned.strip()[:max_len]

class PitchApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: dict):
        response_body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        
        origin = self.headers.get("Origin", "")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", "*")

        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(response_body)

    def do_OPTIONS(self):
        self.send_response(204)
        origin = self.headers.get("Origin", "")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        
        if path in ("/api/health", "/healthz", "/api/healthz"):
            self._send_json(200, {
                "status": "healthy",
                "backend": "python",
                "timestamp": int(time.time()),
                "geminiConfigured": bool(os.environ.get("GEMINI_API_KEY", "").strip() and os.environ.get("GEMINI_API_KEY") != "MY_GEMINI_API_KEY")
            })
            return

        if path == "/api/presets":
            self._send_json(200, {
                "durations": DURATION_CONFIGS
            })
            return

        self._send_json(404, {"success": False, "error": {"code": "NOT_FOUND", "message": "Endpoint not found"}})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/generate-pitch":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 1024 * 50:  # 50KB limit
                self._send_json(413, {"success": False, "error": {"code": "PAYLOAD_TOO_LARGE", "message": "Request body exceeds 50KB limit"}})
                return

            try:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_body) if raw_body else {}
                if not isinstance(body, dict):
                    self._send_json(400, {"success": False, "error": {"code": "INVALID_JSON", "message": "Request body must be a JSON object"}})
                    return
            except Exception:
                self._send_json(400, {"success": False, "error": {"code": "INVALID_JSON", "message": "Malformed JSON payload"}})
                return

            category = sanitize_string(body.get("category", "Latest News & Current Affairs"), 80)
            try:
                duration = int(body.get("duration", 1))
                if duration not in [1, 3, 5, 15]:
                    duration = 1
            except (ValueError, TypeError):
                duration = 1

            custom_topic = sanitize_string(body.get("customTopic", ""), 200)
            instructions = sanitize_string(body.get("instructions", ""), 300)

            try:
                pitch = generate_pitch(category, duration, custom_topic, instructions)
                self._send_json(200, {
                    "success": True,
                    "pitch": pitch
                })
            except Exception as e:
                sys.stderr.write(f"[Python API Error] {str(e)}\n")
                self._send_json(500, {
                    "success": False,
                    "error": {
                        "code": "GENERATION_FAILED",
                        "message": "Failed to synthesize speaking topic from RAG knowledge base. Please try again."
                    }
                })
            return

        self._send_json(404, {"success": False, "error": {"code": "NOT_FOUND", "message": "Endpoint not found"}})

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[Python API] {args[0]} {args[1]} -> {args[2]}\n")


def run():
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadedHTTPServer(server_address, PitchApiHandler)
    print(f"[Python Backend] Pitch API server running on port {PORT}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("[Python Backend] Server stopped.")

if __name__ == "__main__":
    run()
