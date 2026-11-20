"""Adapters for the existing TONART Curadoria process and Telegram session.

This module is imported by PR #45's current local app. It reuses that app's
SQLite, downloader lock, DPAPI credential loader, and authorized Telethon
session. It never downloads media or writes to the downloader database.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import os
import re
import sys
import threading
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import HTTPRedirectHandler, Request, build_opener

import telegram_identity_engine as identity


_CYCLE_LOCK = threading.Lock()
_GENERIC_QUERY_WORDS = {
    "3d", "model", "models", "figure", "statue", "sculpture", "studio",
    "print", "printable", "stl", "version", "variant", "scale", "pose",
}
_MAX_PROFILE_BYTES = 1_000_000
_MAX_PROFILE_RESULTS = 8


class DownloaderBusy(RuntimeError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextlib.contextmanager
def _downloader_lock(source_db_path: str | Path):
    """Use the exact Windows file lock shared with baixar_imagens.py."""
    if os.name != "nt":
        raise RuntimeError("A sessão Telegram só pode usar a trava do downloader no Windows")
    import msvcrt

    lock_path = Path(source_db_path).resolve().parent / "execucao.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    handle = lock_path.open("a+b")
    handle.seek(0, os.SEEK_END)
    if handle.tell() == 0:
        handle.write(b"0")
        handle.flush()
    handle.seek(0)
    try:
        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError as exc:
        handle.close()
        raise DownloaderBusy("downloader_busy") from exc
    try:
        yield lock_path
    finally:
        try:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        finally:
            handle.close()


def _items(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    try:
        return list(value)
    except TypeError:
        return [value]


def _field(value: Any, key: str, default: Any = None) -> Any:
    return value.get(key, default) if isinstance(value, Mapping) else getattr(value, key, default)


def _message_id(value: Any) -> int | None:
    raw = _field(value, "id", _field(value, "message_id"))
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _is_general_50k(topic_name: str) -> bool:
    return identity._label_key(topic_name) == "geral50k"


def _topic_to_scan(curadoria_db_path: str | Path, source_chat_id: int):
    with identity._open_curadoria(curadoria_db_path) as db:
        row = db.execute("""
            SELECT c.topic_id,MIN(c.topic_name) AS topic_name,
                   SUM(CASE WHEN c.coverage_status!='exhausted' THEN 1 ELSE 0 END) AS incomplete,
                   COALESCE(MAX(p.updated_at),'') AS checkpoint_at
            FROM telegram_identity_coverage c
            LEFT JOIN telegram_history_checkpoints p
              ON p.source_chat_id=c.source_chat_id
             AND p.scope='topic:' || CAST(c.topic_id AS TEXT)
            WHERE c.source_chat_id=? AND c.topic_id IS NOT NULL
              AND lower(replace(replace(trim(c.topic_name),' ',''),'+',''))!='geral50k'
              AND COALESCE(c.reason,'') NOT LIKE 'Telegram retornou TOPIC_ID_INVALID%'
            GROUP BY c.topic_id
            HAVING SUM(CASE WHEN c.coverage_status!='exhausted' THEN 1 ELSE 0 END)>0
            ORDER BY incomplete DESC,checkpoint_at ASC,c.topic_id ASC
            LIMIT 1
        """, (int(source_chat_id),)).fetchone()
        return (int(row["topic_id"]), str(row["topic_name"] or "")) if row else None


def _mark_topic_id_invalid(
    curadoria_db_path: str | Path, source_chat_id: int, topic_id: int,
) -> int:
    """Keep invalid Telegram topic IDs partial and out of future scans."""
    reason = (
        f"Telegram retornou TOPIC_ID_INVALID para topic_id={int(topic_id)}; "
        "ID ausente do índice canônico do fórum. Tópico sem cobertura verificável."
    )
    with identity._open_curadoria(curadoria_db_path) as db:
        db.execute("BEGIN IMMEDIATE")
        result = db.execute("""
            UPDATE telegram_identity_coverage SET coverage_status='partial',
                reason=?,updated_at=?
            WHERE source_chat_id=? AND topic_id=?
        """, (reason, _now(), int(source_chat_id), int(topic_id)))
        db.commit()
    return int(result.rowcount)


class TelethonHistorySource:
    """A bounded, forward-only Telegram forum-topic reader."""

    def __init__(self, client: Any, entity: Any, source_chat_id: int, topic_id: int, topic_name: str):
        self.client = client
        self.entity = entity
        self.source_chat_id = int(source_chat_id)
        self.topic_id = int(topic_id)
        self.topic_name = str(topic_name or "")

    async def fetch_history_page(
        self, *, topic_id: int | None, after_message_id: int, limit: int,
    ) -> identity.HistoryPage:
        if topic_id is None or int(topic_id) != self.topic_id:
            raise ValueError("Tópico fora do leitor configurado")
        limit = max(1, min(int(limit), 2000))
        after_message_id = max(0, int(after_message_id))
        raw = _items(await self.client.get_messages(
            self.entity, limit=limit + 1, min_id=after_message_id,
            reverse=True, reply_to=self.topic_id,
        ))
        raw.sort(key=lambda item: _message_id(item) or 0)
        has_more = len(raw) > limit
        high_water = max(
            [self.topic_id, *[value for value in (_message_id(item) for item in raw)
                              if value is not None]]
        )
        messages = raw[:limit]
        root_seen = after_message_id >= self.topic_id
        if not root_seen and after_message_id < self.topic_id:
            root = _items(await self.client.get_messages(self.entity, ids=self.topic_id))
            if root and _message_id(root[0]) == self.topic_id:
                messages.append(root[0])
                root_seen = True
        messages.sort(key=lambda item: _message_id(item) or 0)
        page_ids = [_message_id(message) for message in messages]
        page_ids = [value for value in page_ids if value is not None]
        observed_end = max(page_ids or [after_message_id])
        if not has_more and high_water > observed_end:
            if root_seen:
                # The extra item proves that the bounded history query returned
                # all topic messages through its observed high-water mark.
                observed_end = max(observed_end, high_water)
            else:
                # Keep retrying the root instead of skipping an inaccessible
                # root and later treating the remaining topic as complete.
                observed_end = after_message_id
                high_water = self.topic_id
        next_cursor = max(after_message_id, observed_end)
        if not has_more and not page_ids and root_seen:
            next_cursor = max(next_cursor, high_water)
        return identity.HistoryPage(
            messages=messages,
            source_chat_id=self.source_chat_id,
            topic_id=self.topic_id,
            topic_name=self.topic_name,
            next_cursor=next_cursor,
            history_high_water_id=high_water,
            has_more=has_more,
            coverage_verified=root_seen or after_message_id >= self.topic_id,
            range_start_id=after_message_id + 1,
            range_end_id=max(next_cursor, high_water if not has_more else next_cursor),
        )


async def _telegram_pass(
    root: str | Path,
    source_db_path: str | Path,
    curadoria_db_path: str | Path,
    source_chat_id: int,
    *,
    ignored_batch: int,
    history_page_size: int,
) -> dict[str, Any]:
    root = Path(root).resolve()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    from segredo_local import carregar
    from telethon import TelegramClient

    credentials = carregar()
    if not credentials or len(credentials) != 2:
        return {"status": "credentials_unavailable"}
    api_id, api_hash = credentials
    async with TelegramClient(str(root / "sessao-telegram"), api_id, api_hash,
                              timeout=12, connection_retries=2, retry_delay=2) as client:
        if not await client.is_user_authorized():
            return {"status": "session_unauthorized"}
        entity = await client.get_entity(int(source_chat_id))
        recovered = await identity.recover_ignored_message_batch(
            source_db_path, curadoria_db_path, client, source_chat_id,
            batch_size=ignored_batch, overlap=20,
        )
        topic = _topic_to_scan(curadoria_db_path, source_chat_id)
        scan = {"coverage_status": "no_topic_available", "messages_fetched": 0,
                "verified_links": 0}
        if topic:
            topic_id, topic_name = topic
            try:
                scan = await identity.scan_history_batch(
                    curadoria_db_path,
                    TelethonHistorySource(client, entity, source_chat_id, topic_id, topic_name),
                    source_chat_id, topic_id, topic_name=topic_name,
                    limit=history_page_size,
                )
            except Exception as exc:
                if "TOPIC_ID_INVALID" not in str(exc).upper():
                    raise
                _mark_topic_id_invalid(curadoria_db_path, source_chat_id, topic_id)
                scan = {
                    "coverage_status": "invalid_topic", "messages_fetched": 0,
                    "verified_links": 0, "invalid_topic_ids": 1,
                }
        return {"status": "session_ok", "recovery": recovered, "history": scan}


class _OfficialAnchorParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() == "a":
            self._href = next((value for key, value in attrs if key.casefold() == "href"), None)
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() == "a" and self._href is not None:
            self.links.append((self._href, " ".join(" ".join(self._text).split())))
            self._href = None
            self._text = []


class _SameOfficialHostRedirect(HTTPRedirectHandler):
    def __init__(self, profile_url: str):
        super().__init__()
        self.profile_url = profile_url

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        destination = urljoin(req.full_url, newurl)
        parsed = urlparse(destination)
        if parsed.scheme != "https" or not identity._same_official_host(destination, self.profile_url):
            return None
        return super().redirect_request(req, fp, code, msg, headers, destination)


class OfficialProfileSearch:
    """Search only links already published on the curated studio profile."""

    def search_official(self, query: str, source: identity.OfficialSource):
        profile = urlparse(source.profile_url)
        if profile.scheme != "https" or not profile.hostname:
            raise ValueError("Perfil oficial inválido")
        request = Request(source.profile_url, headers={
            "User-Agent": "TONART-Curadoria/1.0 (+local metadata review)",
            "Accept": "text/html,application/xhtml+xml;q=0.9",
        })
        opener = build_opener(_SameOfficialHostRedirect(source.profile_url))
        with opener.open(request, timeout=8) as response:
            final_url = response.geturl()
            if (urlparse(final_url).scheme != "https"
                    or not identity._same_official_host(final_url, source.profile_url)):
                raise ValueError("Redirecionamento fora do perfil oficial")
            content_type = response.headers.get_content_type()
            if content_type not in {"text/html", "application/xhtml+xml"}:
                return []
            payload = response.read(_MAX_PROFILE_BYTES + 1)
            if len(payload) > _MAX_PROFILE_BYTES:
                raise ValueError("Página oficial excedeu o limite local")
            charset = response.headers.get_content_charset() or "utf-8"
        parser = _OfficialAnchorParser()
        parser.feed(payload.decode(charset, errors="replace"))
        terms = [token for token in identity.normalize_identity(query).split()
                 if len(token) >= 3 and token not in _GENERIC_QUERY_WORDS]
        if not terms:
            return []
        results = []
        seen = set()
        for href, label in parser.links:
            url = urldefrag(urljoin(final_url, href))[0]
            parsed = urlparse(url)
            if (parsed.scheme != "https" or not parsed.hostname
                    or parsed.username or parsed.password
                    or not identity._same_official_host(url, source.profile_url)):
                continue
            if url.rstrip("/") == source.profile_url.rstrip("/") or url in seen:
                continue
            path = parsed.path.rstrip("/").casefold()
            if path.endswith(("/3d-models", "/models", "/posts", "/shop", "/products", "/collections")):
                continue
            candidate_text = identity.normalize_identity(label + " " + parsed.path)
            matches = [term for term in terms if term in candidate_text.split()]
            if not matches:
                continue
            title = label.strip() or parsed.path.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").title()
            if not title or len(title) > 180:
                continue
            seen.add(url)
            scale = re.search(r"\b1\s*[:/]\s*\d+\b", title)
            results.append({
                "title": title,
                "url": url,
                "variant": "",
                "scale": scale.group(0).replace(" ", "") if scale else "",
                "universe": "",
                "excerpt": label[:500],
            })
            if len(results) >= _MAX_PROFILE_RESULTS:
                break
        return results


def _official_sources(naming_module: Any, topic: str):
    # Only the existing, curated PR #45 registry can designate verified sources.
    if _is_general_50k(topic):
        return
    for source in naming_module.official_sources(topic) or ():
        yield {**source, "verified": True}


def _aggregates(result: Mapping[str, Any]) -> dict[str, int]:
    values: dict[str, int] = {}
    for stage, data in result.items():
        if not isinstance(data, Mapping):
            continue
        for key, value in data.items():
            if isinstance(value, (bool, int)):
                values[f"{stage}_{key}"] = int(value)
            elif stage == "telegram" and isinstance(value, Mapping):
                for nested_key, nested_value in value.items():
                    if isinstance(nested_value, (bool, int)):
                        values[f"telegram_{key}_{nested_key}"] = int(nested_value)
    return values


def run_cycle(
    root: str | Path,
    source_db_path: str | Path,
    curadoria_db_path: str | Path,
    source_chat_id: int,
    *,
    naming: Any,
    smart: Any,
    gallery: Any,
    ignored_batch: int = 100,
    history_page_size: int = 300,
    official_entities_per_cycle: int = 1,
) -> dict[str, Any]:
    """Run one bounded cycle in the existing app process and SQLite."""
    started_at = _now()
    if not _CYCLE_LOCK.acquire(blocking=False):
        return {"status": "identity_cycle_busy", "counts": identity.status_counts(curadoria_db_path)}
    outcome: dict[str, Any] = {"status": "not_started"}
    search_allowed = False
    try:
        identity.register_asset_topics(source_db_path, curadoria_db_path, source_chat_id)
        try:
            with _downloader_lock(source_db_path):
                outcome["telegram"] = asyncio.run(_telegram_pass(
                    root, source_db_path, curadoria_db_path, source_chat_id,
                    ignored_batch=max(1, min(int(ignored_batch), 500)),
                    history_page_size=max(1, min(int(history_page_size), 500)),
                ))
                search_allowed = outcome["telegram"].get("status") == "session_ok"
        except DownloaderBusy:
            outcome["telegram"] = {"status": "downloader_busy"}
        except Exception as exc:
            outcome["telegram"] = {"status": "session_unavailable",
                                    "error_type": type(exc).__name__}

        outcome["naming"] = naming.process_batch(curadoria_db_path, 600)
        outcome["evidence"] = identity.apply_telegram_evidence(curadoria_db_path, limit=2000)
        if outcome["naming"].get("images_waiting", 0) == 0:
            outcome["classification"] = smart.process_batch(curadoria_db_path, 400)
        else:
            outcome["classification"] = {"deferred_until_names_complete": 1}
        outcome["gallery_propagation"] = identity.propagate_reviewed_gallery_names(
            curadoria_db_path, naming, limit=300,
        )
        outcome["gallery_refresh"] = gallery.refresh_titles(curadoria_db_path)

        if search_allowed:
            outcome["official"] = identity.research_official_pending(
                curadoria_db_path,
                lambda topic: _official_sources(naming, topic),
                OfficialProfileSearch(),
                limit=max(1, min(int(official_entities_per_cycle), 10)),
            )
        else:
            outcome["official"] = {"searches": 0, "skipped_session_unavailable": 1}
        outcome["status"] = str(outcome["telegram"].get("status", "session_unavailable"))
        identity.record_cycle(
            curadoria_db_path, started_at=started_at, status=outcome["status"],
            aggregates=_aggregates(outcome),
        )
        outcome["counts"] = identity.status_counts(curadoria_db_path)
        return outcome
    finally:
        _CYCLE_LOCK.release()


def status(curadoria_db_path: str | Path) -> dict[str, Any]:
    """Aggregate-only status for the existing local app's /api/stats response."""
    return {
        "counts": identity.status_counts(curadoria_db_path),
        "last_cycle": identity.last_cycle_status(curadoria_db_path),
    }
