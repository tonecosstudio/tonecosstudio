#!/usr/bin/env python3
"""Bounded, memory-only thumbnails for the existing private TONART Curadoria host.

Original Telegram assets are never modified, relocated or recoded in place.
Requires Pillow (pinned in requirements-curadoria.txt); this is not a service.
"""
from __future__ import annotations

from collections import OrderedDict
import os
from io import BytesIO
from pathlib import Path
from threading import BoundedSemaphore, Lock
import hashlib
import json
from time import perf_counter

ALLOWED_WIDTHS = frozenset((256, 480, 960))
MAX_SOURCE_BYTES = 25 * 1024 * 1024
MAX_GIF_SOURCE_BYTES = 64 * 1024 * 1024  # still decode first frame only
MAX_IMAGE_PIXELS = 36_000_000
MAX_CACHE_BYTES = 24 * 1024 * 1024
MAX_CACHE_ITEMS = 512
SLOW_PREVIEW_THRESHOLD_MS = 500.0
MAX_SLOW_PREVIEWS = 8

_LOCK = Lock()
_DECODE_SLOTS = BoundedSemaphore(3)
_CACHE: OrderedDict[tuple, bytes] = OrderedDict()
_BYTES = 0
_HITS = 0
_MISSES = 0
_EVICTIONS = 0
_FAILURES = 0
_QUEUE_WAIT_COUNT = 0
_QUEUE_WAIT_MS_TOTAL = 0.0
_QUEUE_WAIT_MS_MAX = 0.0
_PROCESS_COUNT = 0
_PROCESS_MS_TOTAL = 0.0
_PROCESS_MS_MAX = 0.0
_ACTIVE_DECODERS = 0
_SLOW_PREVIEWS: list[dict] = []
# The optional derived cache is confined to the existing host's local
# curadoria-local directory. One deterministic filename per slot; no images,
# full paths, names or commercial metadata in the files.
_DISK_SLOTS = 2048
_DISK_MAX_PAYLOAD_BYTES = 64 * 1024
_DISK_LOCK = Lock()
_DISK_HITS = 0
_DISK_MISSES = 0
_DISK_WRITES = 0
_DISK_WRITE_ERRORS = 0


class ThumbnailUnavailable(RuntimeError):
    """Dependency unavailable, malformed media or concurrency limit reached."""


def _reject_source(reason: str):
    # The host calls etag() BEFORE thumbnail(); rejected sources otherwise
    # never reached the existing failures counter, hiding broken cards.
    global _FAILURES
    with _LOCK:
        _FAILURES += 1
    raise ThumbnailUnavailable(reason)


def _key(path: Path, sha256: str, width: int) -> tuple:
    if width not in ALLOWED_WIDTHS:
        raise ValueError("Largura de miniatura inválida")
    file_info = path.stat()
    if not file_info.st_size:
        _reject_source("Arquivo vazio: miniatura indisponível")
    if file_info.st_size > MAX_SOURCE_BYTES:
        # Animated Telegram GIFs may be large on disk despite tiny first
        # frames. Keep the cap strict for all other media and reject disguised
        # extensions using the actual first six bytes.
        if (path.suffix.casefold() != ".gif" or
            file_info.st_size > MAX_GIF_SOURCE_BYTES):
            _reject_source("Arquivo fora dos limites de miniatura")
        with path.open("rb") as media:
            if media.read(6) not in (b"GIF87a",b"GIF89a"):
                _reject_source("GIF original inválido")
    # Host media paths are already validated/canonical by safe_source_path().
    # Cache keys need metadata, not another Windows realpath I/O per ETag
    # and another per thumbnail request. Keep stat for freshness.
    return (str(path.absolute()), str(sha256), file_info.st_mtime_ns,
            file_info.st_size, int(width))


def _disk_slot(cache_dir: Path, key: tuple):
    """Bounded fixed-slot WebP cache: <= 2048 * (64KiB + 32 bytes).

    A full SHA256 prefix inside each slot rejects hash-bucket collisions.
    Cache is derived-only, never an identity or original-media authority.
    """
    digest = hashlib.sha256(json.dumps(
        ("webp-v2", *key), ensure_ascii=False
    ).encode("utf-8")).digest()
    slot = int.from_bytes(digest[:8], "big") % _DISK_SLOTS
    return Path(cache_dir) / f"{slot:04x}.bin", digest


def _disk_read(cache_dir: Path, key: tuple):
    path, digest = _disk_slot(cache_dir, key)
    try:
        data = path.read_bytes()
    except (OSError, ValueError):
        return None
    # Never expose stale, partial, wrong-source or mismatched-encoding data.
    if (not 44 <= len(data) <= 32 + _DISK_MAX_PAYLOAD_BYTES
            or data[:32] != digest
            or data[32:36] != b"RIFF" or data[40:44] != b"WEBP"):
        return None
    return data[32:]


def _disk_write(cache_dir: Path, key: tuple, payload: bytes):
    if len(payload) > _DISK_MAX_PAYLOAD_BYTES:
        return False
    slot, digest = _disk_slot(cache_dir, key)
    temp = slot.with_suffix(".tmp")
    # Writers serialize only their tiny atomic file writes, never decoding.
    with _DISK_LOCK:
        try:
            slot.parent.mkdir(parents=True, exist_ok=True)
            with temp.open("wb") as stream:
                stream.write(digest)
                stream.write(payload)
            os.replace(temp, slot)
            return True
        except OSError:
            try:
                temp.unlink(missing_ok=True)
            except OSError:
                pass
            return False


def _remember(key: tuple, payload: bytes):
    global _BYTES, _EVICTIONS
    with _LOCK:
        previous = _CACHE.get(key)
        if previous is not None:
            _CACHE.move_to_end(key)
            return previous
        while _CACHE and (
            len(_CACHE) >= MAX_CACHE_ITEMS or
            _BYTES + len(payload) > MAX_CACHE_BYTES
        ):
            _, removed = _CACHE.popitem(last=False)
            _BYTES -= len(removed)
            _EVICTIONS += 1
        _CACHE[key] = payload
        _BYTES += len(payload)
        return payload


def etag(path: Path, sha256: str, width: int) -> str:
    key = _key(path, sha256, width)
    fingerprint = hashlib.sha256(json.dumps(
        ("webp-v2", *key), ensure_ascii=False
    ).encode("utf-8")).hexdigest()[:32]
    return '"' + fingerprint + '"'


def thumbnail(path: Path, sha256: str, width: int, *, disk_cache=None) -> bytes:
    """Render only requested images. Limit both decoder concurrency and RAM."""
    global _BYTES, _HITS, _MISSES, _EVICTIONS, _FAILURES
    global _QUEUE_WAIT_COUNT, _QUEUE_WAIT_MS_TOTAL, _QUEUE_WAIT_MS_MAX
    global _PROCESS_COUNT, _PROCESS_MS_TOTAL, _PROCESS_MS_MAX, _ACTIVE_DECODERS
    global _DISK_HITS, _DISK_MISSES, _DISK_WRITES, _DISK_WRITE_ERRORS
    key = _key(path, sha256, width)
    with _LOCK:
        cached = _CACHE.get(key)
        if cached is not None:
            _CACHE.move_to_end(key)
            _HITS += 1
            return cached
        _MISSES += 1
    began_waiting = perf_counter()
    if not _DECODE_SLOTS.acquire(timeout=12):
        wait_ms = (perf_counter()-began_waiting)*1000
        with _LOCK:
            _FAILURES += 1
            _QUEUE_WAIT_COUNT += 1
            _QUEUE_WAIT_MS_TOTAL += wait_ms
            _QUEUE_WAIT_MS_MAX = max(_QUEUE_WAIT_MS_MAX, wait_ms)
        raise ThumbnailUnavailable("Muitas miniaturas simultâneas; repetir consulta")
    wait_ms = (perf_counter()-began_waiting)*1000
    began_processing = perf_counter()
    trace = {"open_ms": 0.0, "decode_ms": 0.0, "encode_ms": 0.0}
    rendered = False
    with _LOCK:
        _QUEUE_WAIT_COUNT += 1
        _QUEUE_WAIT_MS_TOTAL += wait_ms
        _QUEUE_WAIT_MS_MAX = max(_QUEUE_WAIT_MS_MAX, wait_ms)
        _ACTIVE_DECODERS += 1
    try:
        # A second lookup avoids duplicate decoding after a queued request.
        with _LOCK:
            cached = _CACHE.get(key)
            if cached is not None:
                _CACHE.move_to_end(key)
                _HITS += 1
                return cached
        if disk_cache is not None:
            persisted = _disk_read(Path(disk_cache), key)
            if persisted is not None:
                with _LOCK:
                    _DISK_HITS += 1
                return _remember(key, persisted)
            with _LOCK:
                _DISK_MISSES += 1
        try:
            from PIL import Image, ImageOps, UnidentifiedImageError
        except ImportError as exc:
            raise ThumbnailUnavailable(
                "Pillow não instalado: instale requirements-curadoria.txt"
            ) from exc
        try:
            Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
            opening = perf_counter()
            with Image.open(path) as source:
                trace["open_ms"] = (perf_counter() - opening) * 1000
                if source.format != "GIF" and key[3] > MAX_SOURCE_BYTES:
                    raise ThumbnailUnavailable("Somente GIF pode exceder 25 MiB")
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise ThumbnailUnavailable("Resolução da origem excede limite seguro")
                if getattr(source, "is_animated", False):
                    source.seek(0)
                source.draft("RGB", (width, width))
                decoding = perf_counter()
                image = ImageOps.exif_transpose(source)
                try:
                    image.thumbnail((width, width), Image.Resampling.LANCZOS)
                    trace["decode_ms"] = (perf_counter() - decoding) * 1000
                    if image.mode not in ("RGB", "RGBA"):
                        normalized = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                    else:
                        normalized = image
                    try:
                        payload = BytesIO()
                        encoding = perf_counter()
                        normalized.save(payload, format="WEBP", quality=76, method=1)
                        trace["encode_ms"] = (perf_counter() - encoding) * 1000
                        result = payload.getvalue()
                        rendered = True
                    finally:
                        if normalized is not image:
                            normalized.close()
                finally:
                    image.close()
        except (OSError, ValueError, UnidentifiedImageError) as exc:
            raise ThumbnailUnavailable("Não foi possível interpretar a imagem original") from exc
        if not result or len(result) > 2 * 1024 * 1024:
            raise ThumbnailUnavailable("Miniatura maior que o limite permitido")
        if disk_cache is not None:
            written = _disk_write(Path(disk_cache), key, result)
            with _LOCK:
                if written:
                    _DISK_WRITES += 1
                elif len(result) <= _DISK_MAX_PAYLOAD_BYTES:
                    _DISK_WRITE_ERRORS += 1
        return _remember(key, result)
    except ThumbnailUnavailable:
        with _LOCK:
            _FAILURES += 1
        raise
    finally:
        work_ms = (perf_counter()-began_processing)*1000
        with _LOCK:
            _PROCESS_COUNT += 1
            _PROCESS_MS_TOTAL += work_ms
            _PROCESS_MS_MAX = max(_PROCESS_MS_MAX,work_ms)
            _ACTIVE_DECODERS -= 1
            if rendered and work_ms >= SLOW_PREVIEW_THRESHOLD_MS:
                # Only bounded diagnostic metadata on private loopback:
                # never retain or expose the absolute file path or SHA.
                name = path.stem
                message_id = int(name[4:]) if (
                    name.startswith("msg_") and name[4:].isdigit()
                ) else None
                sample = {
                    "message_id": message_id,
                    "type": path.suffix.lower().lstrip("."),
                    "source_kib": round(key[3] / 1024, 1),
                    "width": width,
                    "total_ms": round(work_ms, 1),
                    "open_ms": round(trace["open_ms"], 1),
                    "decode_ms": round(trace["decode_ms"], 1),
                    "encode_ms": round(trace["encode_ms"], 1),
                }
                _SLOW_PREVIEWS.append(sample)
                _SLOW_PREVIEWS.sort(
                    key=lambda item: item["total_ms"], reverse=True
                )
                del _SLOW_PREVIEWS[MAX_SLOW_PREVIEWS:]
        _DECODE_SLOTS.release()


def status() -> dict[str, int]:
    """Lightweight in-memory telemetry, no SQLite queries or file writes."""
    with _LOCK:
        return {
            "items": len(_CACHE), "bytes": _BYTES,
            "disk_hits": _DISK_HITS, "disk_misses": _DISK_MISSES,
            "disk_writes": _DISK_WRITES,
            "disk_write_errors": _DISK_WRITE_ERRORS,
            "disk_cache_slots": _DISK_SLOTS,
            "disk_max_entry_bytes": _DISK_MAX_PAYLOAD_BYTES,
            "hits": _HITS, "misses": _MISSES,
            "evictions": _EVICTIONS, "failures": _FAILURES,
            "max_items": MAX_CACHE_ITEMS, "max_bytes": MAX_CACHE_BYTES,
            "simultaneous_decoders": 3,
            "active_decoders": _ACTIVE_DECODERS,
            "queue_wait_samples": _QUEUE_WAIT_COUNT,
            "queue_wait_ms_total": round(_QUEUE_WAIT_MS_TOTAL,1),
            "queue_wait_ms_max": round(_QUEUE_WAIT_MS_MAX,1),
            "process_samples": _PROCESS_COUNT,
            "process_ms_total": round(_PROCESS_MS_TOTAL,1),
            "process_ms_max": round(_PROCESS_MS_MAX,1),
            "process_ms_mean": round(_PROCESS_MS_TOTAL / max(1,_PROCESS_COUNT),1),
            "slow_preview_threshold_ms": SLOW_PREVIEW_THRESHOLD_MS,
            "slow_previews": [dict(row) for row in _SLOW_PREVIEWS],
        }
