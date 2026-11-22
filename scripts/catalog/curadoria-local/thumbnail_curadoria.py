#!/usr/bin/env python3
"""Bounded, memory-only thumbnails for the existing private TONART Curadoria host.

Original Telegram assets are never modified, relocated or recoded in place.
Requires Pillow (pinned in requirements-curadoria.txt); this is not a service.
"""
from __future__ import annotations

from collections import OrderedDict
from io import BytesIO
from pathlib import Path
from threading import BoundedSemaphore, Lock
import hashlib
import json

ALLOWED_WIDTHS = frozenset((256, 480, 960))
MAX_SOURCE_BYTES = 25 * 1024 * 1024
MAX_IMAGE_PIXELS = 36_000_000
MAX_CACHE_BYTES = 24 * 1024 * 1024
MAX_CACHE_ITEMS = 512

_LOCK = Lock()
_DECODE_SLOTS = BoundedSemaphore(3)
_CACHE: OrderedDict[tuple, bytes] = OrderedDict()
_BYTES = 0
_HITS = 0
_MISSES = 0
_EVICTIONS = 0
_FAILURES = 0


class ThumbnailUnavailable(RuntimeError):
    """Dependency unavailable, malformed media or concurrency limit reached."""


def _key(path: Path, sha256: str, width: int) -> tuple:
    if width not in ALLOWED_WIDTHS:
        raise ValueError("Largura de miniatura inválida")
    file_info = path.stat()
    if not file_info.st_size or file_info.st_size > MAX_SOURCE_BYTES:
        raise ThumbnailUnavailable("Arquivo fora dos limites de miniatura")
    return (str(path.resolve()), str(sha256), file_info.st_mtime_ns,
            file_info.st_size, int(width))


def etag(path: Path, sha256: str, width: int) -> str:
    key = _key(path, sha256, width)
    fingerprint = hashlib.sha256(json.dumps(
        ("webp-v2", *key), ensure_ascii=False
    ).encode("utf-8")).hexdigest()[:32]
    return '"' + fingerprint + '"'


def thumbnail(path: Path, sha256: str, width: int) -> bytes:
    """Render only requested images. Limit both decoder concurrency and RAM."""
    global _BYTES, _HITS, _MISSES, _EVICTIONS, _FAILURES
    key = _key(path, sha256, width)
    with _LOCK:
        cached = _CACHE.get(key)
        if cached is not None:
            _CACHE.move_to_end(key)
            _HITS += 1
            return cached
        _MISSES += 1
    if not _DECODE_SLOTS.acquire(timeout=12):
        with _LOCK:
            _FAILURES += 1
        raise ThumbnailUnavailable("Muitas miniaturas simultâneas; repetir consulta")
    try:
        # A second lookup avoids duplicate decoding after a queued request.
        with _LOCK:
            cached = _CACHE.get(key)
            if cached is not None:
                _CACHE.move_to_end(key)
                _HITS += 1
                return cached
        try:
            from PIL import Image, ImageOps, UnidentifiedImageError
        except ImportError as exc:
            raise ThumbnailUnavailable(
                "Pillow não instalado: instale requirements-curadoria.txt"
            ) from exc
        try:
            Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
            with Image.open(path) as source:
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise ThumbnailUnavailable("Resolução da origem excede limite seguro")
                if getattr(source, "is_animated", False):
                    source.seek(0)
                source.draft("RGB", (width, width))
                image = ImageOps.exif_transpose(source)
                try:
                    image.thumbnail((width, width), Image.Resampling.LANCZOS)
                    if image.mode not in ("RGB", "RGBA"):
                        normalized = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                    else:
                        normalized = image
                    try:
                        payload = BytesIO()
                        normalized.save(payload, format="WEBP", quality=76, method=1)
                        result = payload.getvalue()
                    finally:
                        if normalized is not image:
                            normalized.close()
                finally:
                    image.close()
        except (OSError, ValueError, UnidentifiedImageError) as exc:
            raise ThumbnailUnavailable("Não foi possível interpretar a imagem original") from exc
        if not result or len(result) > 2 * 1024 * 1024:
            raise ThumbnailUnavailable("Miniatura maior que o limite permitido")
        with _LOCK:
            # Other callers may have completed the same decode in the meantime.
            previous = _CACHE.get(key)
            if previous is not None:
                _CACHE.move_to_end(key)
                return previous
            while _CACHE and (
                len(_CACHE) >= MAX_CACHE_ITEMS or _BYTES + len(result) > MAX_CACHE_BYTES
            ):
                _, removed = _CACHE.popitem(last=False)
                _BYTES -= len(removed)
                _EVICTIONS += 1
            _CACHE[key] = result
            _BYTES += len(result)
        return result
    except ThumbnailUnavailable:
        with _LOCK:
            _FAILURES += 1
        raise
    finally:
        _DECODE_SLOTS.release()


def status() -> dict[str, int]:
    """Lightweight in-memory telemetry, no SQLite queries or file writes."""
    with _LOCK:
        return {
            "items": len(_CACHE), "bytes": _BYTES,
            "hits": _HITS, "misses": _MISSES,
            "evictions": _EVICTIONS, "failures": _FAILURES,
            "max_items": MAX_CACHE_ITEMS, "max_bytes": MAX_CACHE_BYTES,
            "simultaneous_decoders": 3,
        }
