#!/usr/bin/env python3
"""Conciliação somente leitura entre a Curadoria local e a vitrine Telegram.

O catálogo público é autoridade da vitrine; o SQLite permanece autoridade
da curadoria. Nunca confirma nomes, aplica patches, publica ou transfere mídia.
O fetch é limitado e compartilhado em memória para evitar polling no Worker.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
import json
import re
import sqlite3
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

CATALOG_URL = "https://catalogo.tonartstudio.com.br/catalogo-api/api/telegram-studios"
PAGE_SIZE = 48
CACHE_SECONDS = 21600  # at most four full D1 inventories/day, per host
FAILURE_COOLDOWN_SECONDS = 1800  # failures must not cause a public-API retry storm
_cache_lock = Lock()
_cached_at = 0.0
_cached_inventory = None
_cached_observed_at = ""
_unavailable_until = 0.0


class CatalogUnavailable(RuntimeError):
    """Read-only comparison is unavailable, not an empty or divergent catalog."""

    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = max(1, int(retry_after_seconds))
        super().__init__("Catalogo publico indisponivel. Nova tentativa em "
                         + str((self.retry_after_seconds + 59) // 60) + " minutos.")
KEY = re.compile(r"^tg_([0-9a-f]{24})$")


def _get_json(url: str) -> dict:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "TONART-Host-Reconciliacao/1"})
    with urlopen(request, timeout=18) as response:
        if response.status != 200:
            raise RuntimeError("Catalogo HTTP " + str(response.status))
        if "application/json" not in response.headers.get("Content-Type", ""):
            raise RuntimeError("Resposta do catalogo nao e JSON")
        return json.loads(response.read(1024 * 1024))


def _site_inventory(fetch_json):
    first = fetch_json(CATALOG_URL + "?limit=48&offset=0")
    total = first.get("total")
    if type(total) is not int or not 0 <= total <= 30000:
        raise RuntimeError("Total do catalogo invalido")
    if total == 0:
        raise RuntimeError("Catalogo publico vazio; nao comparar com snapshot ausente")
    offsets = list(range(PAGE_SIZE, total, PAGE_SIZE))
    def fetch_page(offset):
        return offset, fetch_json(CATALOG_URL + "?limit=48&offset=" + str(offset))
    with ThreadPoolExecutor(max_workers=4) as pool:
        pages = list(pool.map(fetch_page, offsets))
    pages.insert(0, (0, first))
    site = {}
    for offset, page in pages:
        if page.get("total") != total or page.get("offset") != offset:
            raise RuntimeError("Catalogo mudou durante a leitura paginada")
        items = page.get("items")
        if not isinstance(items, list) or len(items) != min(PAGE_SIZE, total - offset):
            raise RuntimeError("Pagina incompleta do catalogo")
        for item in items:
            if not isinstance(item, dict):
                raise RuntimeError("Ficha invalida no catalogo")
            matched = KEY.fullmatch(str(item.get("id", "")))
            if not matched:
                raise RuntimeError("Ficha sem identidade Telegram canonica")
            key = matched.group(1)
            if key in site:
                raise RuntimeError("Galeria duplicada durante leitura do catalogo")
            site[key] = {
                "group_key": key,
                "studio": str(item.get("studio") or "").strip(),
                "title": str(item.get("name") or "").strip(),
                "variant": str(item.get("variant") or "").strip(),
                "image_count": int(item.get("imageCount") or 0),
            }
            if not site[key]["studio"] or not site[key]["title"]:
                raise RuntimeError("Ficha sem estúdio ou nome")
    if len(site) != total:
        raise RuntimeError("Inventario remoto incompleto")
    return site


def read_site_inventory(fetch_json=None, now=None):
    """Retorna inventário íntegro; cache apenas para chamadas de rede reais."""
    global _cached_at, _cached_inventory, _cached_observed_at, _unavailable_until
    if fetch_json is not None:
        return _site_inventory(fetch_json), datetime.now(timezone.utc).isoformat(timespec="seconds")
    clock = time.monotonic() if now is None else now
    with _cache_lock:
        # Once an inventory is verified it remains internally consistent for
        # the bounded window; a concurrent browser tab never refetches all pages.
        if _cached_inventory is not None and 0 <= clock - _cached_at < CACHE_SECONDS:
            return _cached_inventory, _cached_observed_at
        if clock < _unavailable_until:
            raise CatalogUnavailable(int(_unavailable_until - clock + 0.999))
        try:
            inventory = _site_inventory(_get_json)
        except (HTTPError, URLError, OSError, RuntimeError, ValueError) as exc:
            # A D1 quota exhaustion returns HTTP 503. Never spin through the
            # paginated public API again while the remote service is unavailable.
            _unavailable_until = clock + FAILURE_COOLDOWN_SECONDS
            raise CatalogUnavailable(FAILURE_COOLDOWN_SECONDS) from exc
        observed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        _cached_inventory, _cached_at, _cached_observed_at = inventory, clock, observed_at
        _unavailable_until = 0.0
        return inventory, observed_at


def compare(db_path, fetch_json=None):
    """Compara por group_key (não por nome); nenhuma escrita no site ou SQLite."""
    site, observed_at = read_site_inventory(fetch_json)
    path = Path(db_path).resolve()
    db = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=8)
    try:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            "SELECT group_key, studio, title, variant, state FROM model_groups "
            "ORDER BY group_key"
        ).fetchall()
    finally:
        db.close()
    local = {r["group_key"]: dict(r) for r in rows}
    common = site.keys() & local.keys()
    local_only = [local[k] for k in (local.keys() - site.keys())]
    site_only = [site[k] for k in (site.keys() - local.keys())]
    changes = []
    for key in sorted(common):
        a, b = local[key], site[key]
        fields = [field for field in ("studio", "title", "variant")
                  if (a[field] or "").strip() != (b[field] or "").strip()]
        if fields:
            changes.append({
                "group_key": key, "studio": a["studio"], "title": a["title"],
                "fields": fields, "local": {f: a[f] for f in fields},
                "site": {f: b[f] for f in fields},
            })
    local_only.sort(key=lambda x: (x["studio"].casefold(), x["title"].casefold(), x["group_key"]))
    site_only.sort(key=lambda x: (x["studio"].casefold(), x["title"].casefold(), x["group_key"]))
    studios = {}
    for status, group in (("local_only", local_only), ("site_only", site_only)):
        for item in group:
            studios.setdefault(item["studio"], {"studio": item["studio"], "local_only": 0, "site_only": 0})[status] += 1
    return {
        "ok": True,
        "mode": "read_only",
        "source": "catalogo.tonartstudio.com.br (public preview)",
        "observed_at": observed_at,
        "site_models": len(site),
        "host_groups": len(local),
        "matched": len(common),
        "local_only_count": len(local_only),
        "site_only_count": len(site_only),
        "local_only_by_state": {
            state: sum(1 for item in local_only if item["state"] == state)
            for state in sorted({item["state"] for item in local_only})
        },
        "differences_count": len(changes),
        "differences": changes,
        "local_only": local_only,
        "site_only": site_only,
        "studios": sorted(studios.values(), key=lambda x: -(x["local_only"] + x["site_only"])),
        "warning": ("Nao publicar automaticamente. Identidades sem match exigem revisao "
                    "de midia, variante, direitos e concorrencia no D1 canônico."),
    }


def compare_summary(db_path, fetch_json=None):
    """Compact public-site alignment; never publishes private/uncleared media.

    Uses the existing bounded D1 inventory cache and the same canonical
    local comparison. Returns counts/health only, not 4,000 model rows.
    """
    report = compare(db_path, fetch_json=fetch_json)
    keys = (
        "ok", "mode", "source", "observed_at", "site_models",
        "host_groups", "matched", "local_only_count", "site_only_count",
        "differences_count", "local_only_by_state", "warning",
    )
    return {
        **{key: report[key] for key in keys},
        "read_only": True,
        "publication_performed": False,
        "commercial_clearance_required": True,
        "catalog_not_equal_to_private_curadoria": True,
    }
