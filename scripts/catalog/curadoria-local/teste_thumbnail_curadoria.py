#!/usr/bin/env python3
"""Synthetic thumbnail tests: no Telegram photos, private data or network."""
from __future__ import annotations
import hashlib
from io import BytesIO
import os
from pathlib import Path
import tempfile

from PIL import Image
import thumbnail_curadoria as thumbs

with tempfile.TemporaryDirectory(prefix="tonart-thumbs-") as root:
    path = Path(root) / "imagem.jpg"
    source = Image.new("RGB", (1280, 960), "#af6c51")
    source.save(path, format="JPEG", quality=92)
    source.close()
    before = path.read_bytes()
    original_sha = hashlib.sha256(before).hexdigest()
    etag0 = thumbs.etag(path, original_sha, 256)
    first = thumbs.thumbnail(path, original_sha, 256)
    again = thumbs.thumbnail(path, original_sha, 256)
    assert first == again
    assert first[:4] == b"RIFF" and first[8:12] == b"WEBP"
    with Image.open(BytesIO(first)) as img:
        assert img.format == "WEBP"
        assert max(img.size) <= 256
    cache = thumbs.status()
    assert cache["hits"] >= 1 and cache["misses"] >= 1
    assert cache["items"] >= 1 and cache["bytes"] <= cache["max_bytes"]
    assert thumbs.thumbnail(path, original_sha, 480) != first
    assert thumbs.etag(path, original_sha, 480) != etag0
    try:
        thumbs.thumbnail(path, original_sha, 99999)
        raise AssertionError("Unlimited dimensions accepted")
    except ValueError:
        pass
    assert hashlib.sha256(path.read_bytes()).hexdigest() == original_sha
    st = path.stat()
    os.utime(path, ns=(st.st_atime_ns, st.st_mtime_ns + 1_000_000_000))
    assert thumbs.etag(path, original_sha, 256) != etag0
    missing = Path(root) / "missing.jpg"
    try:
        thumbs.thumbnail(missing, original_sha, 256)
        raise AssertionError("Missing source accepted")
    except FileNotFoundError:
        pass
    print("MINIATURAS E2E APROVADAS: WebP, dimensões, cache, ETag, limites e original intacto")

# Large Telegram GIFs are allowed only as guarded first-frame previews.
# A sparse synthetic file exercises the 25 MiB boundary without user media.
with tempfile.TemporaryDirectory(prefix="tonart-gif-first-frame-") as root:
    animated=Path(root)/"large.gif"
    im=Image.new("RGB",(48,48),"purple")
    im.save(animated,format="GIF")
    im.close()
    before_header=animated.open("rb").read(6)
    with animated.open("r+b") as media:
        media.truncate(thumbs.MAX_SOURCE_BYTES+1)
    assert animated.stat().st_size==thumbs.MAX_SOURCE_BYTES+1
    frame=thumbs.thumbnail(animated,"synthetic-large-gif",256)
    assert frame[:4]==b"RIFF" and frame[8:12]==b"WEBP"
    with Image.open(BytesIO(frame)) as preview:
        assert preview.size==(48,48)
    assert animated.open("rb").read(6)==before_header
    disguised=Path(root)/"disguised.jpg"
    animated.rename(disguised)
    try:
        thumbs.thumbnail(disguised,"disguised",256)
        raise AssertionError("Oversized non-GIF accepted")
    except thumbs.ThumbnailUnavailable:
        pass
    disguised.rename(animated)
    with animated.open("r+b") as media:
        media.seek(0);media.write(b"NOTGIF")
    try:
        thumbs.etag(animated,"disguised-gif",256)
        raise AssertionError("GIF extension without actual GIF signature accepted")
    except thumbs.ThumbnailUnavailable:
        pass
    with animated.open("r+b") as media:
        media.seek(0);media.write(before_header)
        media.truncate(thumbs.MAX_GIF_SOURCE_BYTES+1)
    try:
        thumbs.thumbnail(animated,"oversized-gif",256)
        raise AssertionError("64 MiB GIF bound ignored")
    except thumbs.ThumbnailUnavailable:
        pass
    print("GIF 25-64 MiB E2E: first frame only, spoof rejected, hard cap preserved")

# The real HTTP handler uses the same local contract as the OrdaX MCP.
# Test against an isolated SQLite and private synthetic JPEG, never the host.
import http.client
import json
import sqlite3
import threading
from http.server import ThreadingHTTPServer
import tonart_curadoria as host

with tempfile.TemporaryDirectory(prefix="tonart-thumb-http-") as root:
    root = Path(root)
    host.SOURCE = root / "telegram"
    image_file = host.SOURCE / "TestStudio" / "msg_101.jpg"
    image_file.parent.mkdir(parents=True)
    Image.new("RGB", (1200, 800), "teal").save(image_file, format="JPEG")
    source_hash = hashlib.sha256(image_file.read_bytes()).hexdigest()
    host.APP_DIR = root / "curadoria"
    host.DB_PATH = host.APP_DIR / "curadoria.sqlite3"
    host.TOKEN_PATH = host.APP_DIR / "token.txt"
    host.initialize()
    with host.connect(host.DB_PATH) as db:
        db.execute(
            "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?)",
            (101, source_hash, "TestStudio/msg_101.jpg",
             "TestStudio", "2026-11-22", "", "", host.now()),
        )
        db.execute("INSERT INTO annotations(message_id) VALUES (101)")
    service = ThreadingHTTPServer(("127.0.0.1", 0), host.Handler)
    service.daemon_threads = True
    thread = threading.Thread(target=service.serve_forever, daemon=True)
    thread.start()
    def http_get(endpoint, headers=None):
        connection = http.client.HTTPConnection(
            "127.0.0.1", service.server_port, timeout=6,
        )
        try:
            connection.request("GET", endpoint, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    old_sync = host.sync
    def reject_read_sync():
        raise AssertionError("GET must never trigger downloader sync")
    host.sync = reject_read_sync
    try:
        code, headers, content = http_get("/thumb/101?w=256")
        assert code == 200 and headers["Content-Type"] == "image/webp"
        assert content[8:12] == b"WEBP"
        assert "private" in headers["Cache-Control"]
        etag_header = headers["ETag"]
        code, _, body = http_get(
            "/thumb/101?w=256", {"If-None-Match": etag_header}
        )
        assert code == 304 and body == b""
        assert http_get("/thumb/101?w=111111")[0] == 400
        assert http_get("/thumb/9999?w=256")[0] == 404
        code, _, raw = http_get("/media/101")
        assert code == 200 and hashlib.sha256(raw).hexdigest() == source_hash
        code, _, body = http_get("/api/performance")
        performance = json.loads(body)
        assert code == 200 and performance["thumbnail_cache"]["items"] >= 1
        assert performance["source_writes_performed_by_http_get"] is False
        code, _, body = http_get("/api/items?page=1&limit=10")
        listing = json.loads(body)
        assert code == 200 and listing["total"] == 1
    finally:
        host.sync = old_sync
        service.shutdown()
        service.server_close()
        thread.join(timeout=5)
    assert hashlib.sha256(image_file.read_bytes()).hexdigest() == source_hash
    print("HTTP E2E APROVADO: thumbnail, ETag/304, media original, performance e GET sem sync")
