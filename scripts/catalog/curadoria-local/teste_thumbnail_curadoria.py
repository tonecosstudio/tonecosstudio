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
