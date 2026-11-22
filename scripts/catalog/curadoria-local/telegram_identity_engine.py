"""Telegram-first model identity helpers for the existing Curadoria SQLite.

This module adds no second application or database. It extends the existing
curadoria-local/curadoria.sqlite3 with a text-only cache and checkpoints. The
downloader database is always opened read-only.

Integration contract (after PR #45 is present):

1. The adapter syncs the existing index, reads Telegram metadata from the
   downloader DB read-only, recovers text with the existing authorized session,
   then processes names, reviewed galleries, and remaining classifications.
2. Exact reply and album IDs are the only automatic relations; unlinked text
   stays unlinked. Missing messages keep the affected topic incomplete.
3. Only after a complete, bounded Telegram history scan, call
   research_official_pending with the curated official_sources and a search
   adapter. References are cached in this same SQLite and never promote a
   name to confirmed.

The Telegram source chat, session, captions, IDs, and search queries are
runtime inputs. They must not be committed to the repository.
"""
from __future__ import annotations

import asyncio
import hashlib
import inspect
import json
import re
import sqlite3
import unicodedata
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping, Sequence
from urllib.parse import quote, urlparse


TITLE_LABELS = {
    "name", "model", "title", "sculpture", "figure", "character",
    "nome", "modelo", "titulo", "escultura", "estatueta", "personagem",
    "personaje", "figura",
}
STUDIO_LABELS = {"studio", "artist", "creator", "estudio", "artista", "criador"}
UNIVERSE_LABELS = {"universe", "franchise", "series", "universo", "franquia", "serie"}
VARIANT_LABELS = {"version", "variant", "pose", "scale", "edition", "versao", "variante", "escala"}
GENERIC_TAGS = {
    "3d", "3dprint", "3dprinting", "3dmodel", "3dmodels", "stl", "wip",
    "marvel", "dc", "dccomics", "sculpture", "statue", "figure", "figures",
    "model", "models", "render", "fanart", "patreon", "cults3d", "artstation",
    "new", "release", "sale", "promo", "digital", "printable",
}
PROMOTIONAL_HEADLINES = {
    "new", "new release", "available now", "coming soon", "join my patreon",
    "check it out", "check out", "pre order", "pre-order", "limited offer",
    "discount", "download now", "new model", "new sculpture", "new project",
    "lancamento", "disponivel agora", "em breve", "nova escultura",
}
TITLE_TOKEN_RE = re.compile(r"[^\W_]+(?:['’][^\W_]+)?(?:-[^\W_]+)*", re.UNICODE)
LABEL_RE = re.compile(
    r"(?im)^\s*(?:[▫▪•◦]\ufe0f?\s*)?"
    r"(name|model|title|sculpture|figure|character|studio|artist|creator|"
    r"universe|franchise|series|version|variant|pose|scale|edition|alias|aliases|"
    r"nome|modelo|t[ií]tulo|escultura|estatueta|personagem|personaje|figura|"
    r"est[uú]dio|artista|criador|universo|franquia|s[eé]rie|vers[aã]o|"
    r"variante|escala)\s*[:=]\s*(.*?)\s*$"
)
HASHTAG_RE = re.compile(r"#([\w-]{2,80})", re.UNICODE)
URL_RE = re.compile(r"https?://\S+", re.IGNORECASE)
NARRATIVE_RE = re.compile(
    r"(?i)\b(?:meet|introducing|presenting|featuring|model|character|"
    r"apresentando|conhe[cç]a|apresentamos|personagem)\s*[:,-]?\s+"
    r"(?P<title>[A-ZÀ-Þ0-9][^,;.!?\n]{1,90})"
)
VARIANT_SUFFIXES = {
    "battle scarred", "battle-scarred", "battle damaged", "battle-damaged",
    "alt version", "alternative version",
}
ARTICLES = {"a", "an", "and", "as", "at", "by", "da", "das", "de", "del", "do", "dos", "for", "in", "of", "the", "to"}


class ManagedConnection(sqlite3.Connection):
    """Close SQLite handles on context-manager exit, including on Windows."""

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> Any:
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


@dataclass(frozen=True)
class TelegramCandidate:
    title: str
    studio: str = ""
    universe: str = ""
    variant: str = ""
    aliases: tuple[str, ...] = ()
    raw_title: str = ""
    evidence_text: str = ""
    evidence_type: str = "telegram_caption_free_text"
    confidence: float = 0.0
    status: str = "revisar"
    source_message_id: int | None = None

    def key(self) -> tuple[str, str, str, str]:
        return (
            normalize_identity(self.title),
            normalize_identity(self.universe),
            normalize_identity(self.variant),
            normalize_identity(self.studio),
        )


@dataclass(frozen=True)
class CaptionParse:
    identity_status: str
    candidates: tuple[TelegramCandidate, ...]
    evidence_text: str


@dataclass(frozen=True)
class TelegramHistoryMessage:
    source_chat_id: int
    message_id: int
    topic_id: int | None
    topic_name: str
    text: str
    reply_to_message_id: int | None = None
    reply_to_top_id: int | None = None
    grouped_id: str = ""
    has_media: bool = False
    message_date: str = ""
    edit_date: str = ""
    fetch_status: str = "fetched"


@dataclass(frozen=True)
class HistoryPage:
    """A page from an adapter using the user's existing authorized Telegram session."""

    messages: Sequence[Any]
    source_chat_id: int
    topic_id: int | None
    topic_name: str
    next_cursor: int
    history_high_water_id: int
    has_more: bool
    coverage_verified: bool
    range_start_id: int
    range_end_id: int


@dataclass(frozen=True)
class OfficialSource:
    studio: str
    provider: str
    profile_url: str
    verified: bool = False


@dataclass(frozen=True)
class OfficialSearchResult:
    title: str
    url: str
    variant: str = ""
    scale: str = ""
    pose: str = ""
    release_date: str = ""
    excerpt: str = ""
    universe: str = ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_identity(value: Any) -> str:
    """Normalize for comparison while leaving the original title untouched."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).casefold()
    text = text.replace("×", "x").replace("&", " and ")
    return " ".join(re.findall(r"[a-z0-9]+(?:/[a-z0-9]+)?", text))


def _label_key(value: str) -> str:
    return normalize_identity(value).replace(" ", "")


def _clean_value(value: str) -> str:
    value = URL_RE.sub("", value or "")
    value = re.sub(r"\s+#\w+", "", value)
    return value.strip(" \t\r\n-–—:;,.|")


def _title_parts(text: str) -> list[str]:
    return TITLE_TOKEN_RE.findall(text or "")


def _looks_like_title(text: str) -> bool:
    value = _clean_value(text)
    if not value or len(value) > 120 or len(value.split()) > 9:
        return False
    if normalize_identity(value) in {normalize_identity(x) for x in PROMOTIONAL_HEADLINES}:
        return False
    if any(word in normalize_identity(value).split() for word in {
        "discount", "subscribe", "download", "available", "patreon", "cults3d",
        "commission", "release", "sale", "free", "join",
    }):
        return False
    if "http" in value.lower() or "@" in value:
        return False
    tokens = _title_parts(value)
    if not tokens or not any(any(ch.isalpha() for ch in token) for token in tokens):
        return False
    normalized_tokens = set(normalize_identity(value).split())
    if normalized_tokens and normalized_tokens.issubset({
        "3d", "model", "models", "figure", "figures", "statue", "sculpture",
        "render", "stl", "print", "printable", "release", "new",
    }):
        return False
    if len(tokens) == 1:
        return len(tokens[0]) >= 4 and tokens[0][:1].isupper()
    # Keep normal title case and acronyms; do not turn sentence copy into names.
    return all(
        token[:1].isupper() or token.isupper() or token.isdigit() or token.casefold() in ARTICLES
        for token in tokens
    )


def _split_hashtag(tag: str) -> list[str]:
    tag = tag.replace("-", "_")
    parts: list[str] = []
    for segment in tag.split("_"):
        parts.extend(re.findall(r"[A-Z]+(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+|\d+", segment))
    return [part for part in parts if part]


def _candidate(
    title: str,
    *,
    studio: str = "",
    universe: str = "",
    variant: str = "",
    aliases: Sequence[str] = (),
    raw_title: str = "",
    evidence_text: str = "",
    evidence_type: str,
    confidence: float,
    source_message_id: int | None = None,
) -> TelegramCandidate:
    confidence = max(0.0, min(1.0, float(confidence)))
    return TelegramCandidate(
        title=_clean_value(title),
        studio=_clean_value(studio),
        universe=_clean_value(universe),
        variant=_clean_value(variant),
        aliases=tuple(_clean_value(a) for a in aliases if _clean_value(a)),
        raw_title=_clean_value(raw_title or title),
        evidence_text=(evidence_text or "")[:600],
        evidence_type=evidence_type,
        confidence=confidence,
        status="provavel" if confidence >= 0.65 else "revisar",
        source_message_id=source_message_id,
    )


def parse_telegram_caption(
    topic: str,
    text: str,
    *,
    message_id: int | None = None,
    structured_identify: Callable[[str, str], Mapping[str, Any] | None] | None = None,
) -> CaptionParse:
    """Extract conservative Telegram title candidates without treating a topic as a studio.

    Explicit structured or labeled captions yield reviewable proposals. A
    plain one-word title or hashtag remains for review. Generic hashtags,
    promotional headlines, and unrelated prose never become names.
    """
    caption = str(text or "")
    if not caption.strip():
        return CaptionParse("unidentified", (), "")

    if structured_identify is not None:
        try:
            parsed = structured_identify(topic or "", caption)
        except Exception:
            parsed = None
        if parsed:
            candidate = _candidate(
                str(parsed.get("title", "")),
                studio=str(parsed.get("studio", "")),
                universe=str(parsed.get("universe", "")),
                variant=str(parsed.get("variant", "")),
                raw_title=str(parsed.get("title", "")),
                evidence_text=caption,
                evidence_type="telegram_structured_caption",
                confidence=float(parsed.get("confidence", 0.82)),
                source_message_id=message_id,
            )
            if candidate.title:
                return CaptionParse("telegram_found", (candidate,), caption)

    values: dict[str, list[str]] = {}
    for match in LABEL_RE.finditer(caption):
        key = _label_key(match.group(1))
        value = _clean_value(match.group(2))
        if value:
            values.setdefault(key, []).append(value)
    title_value = next(
        (items[0] for key, items in values.items() if key in {_label_key(x) for x in TITLE_LABELS}),
        "",
    )
    studio = next(
        (items[0] for key, items in values.items() if key in {_label_key(x) for x in STUDIO_LABELS}),
        "",
    )
    universe = next(
        (items[0] for key, items in values.items() if key in {_label_key(x) for x in UNIVERSE_LABELS}),
        "",
    )
    variants = [
        value
        for key, items in values.items()
        if key in {_label_key(x) for x in VARIANT_LABELS}
        for value in items
    ]
    aliases = [
        _clean_value(value)
        for value in re.findall(
            r"(?i)\b(?:aka|also known as|alias|tamb[eé]m conhecido como)\s+([^,;.!?\n]+)",
            caption,
        )
    ]
    aliases.extend(
        value
        for key, items in values.items()
        if key in {"alias", "aliases"}
        for value in items
    )

    candidates: list[TelegramCandidate] = []
    unresolved_structured_bullet = ""
    if title_value:
        candidates.append(_candidate(
            title_value, studio=studio, universe=universe,
            variant="; ".join(variants), aliases=aliases, raw_title=title_value,
            evidence_text=caption, evidence_type="telegram_caption_label",
            confidence=0.84, source_message_id=message_id,
        ))
    else:
        bullet = re.search(r"(?m)^\s*[▪▫•◦]\ufe0f?\s*(.{2,180})$", caption)
        if bullet and studio:
            raw = _clean_value(bullet.group(1))
            pieces = re.split(r"\s+[–—-]\s+", raw, maxsplit=1)
            title = pieces[0].strip()
            suffix = pieces[1].strip() if len(pieces) > 1 else ""
            is_variant = normalize_identity(suffix) in VARIANT_SUFFIXES
            structured_universe = universe if is_variant else (suffix or universe)
            structured_variant = "; ".join([
                *variants, *([suffix] if is_variant else []),
            ])
            # A short proper name (e.g. "Mew" or "Red") requires an
            # explicitly credited studio, a series, and a matching name tag.
            # Otherwise keep the conservative single-word review policy.
            short_named_subject = (
                2 <= len(title) <= 3 and title.isalpha() and title[:1].isupper()
                and bool(structured_universe)
                and normalize_identity(title) not in GENERIC_TAGS
                and normalize_identity(title) not in {
                    normalize_identity(word) for word in PROMOTIONAL_HEADLINES
                }
                and any(
                    normalize_identity(tag.replace("_", " ")).replace(" ", "")
                    == normalize_identity(title).replace(" ", "")
                    for tag in HASHTAG_RE.findall(caption)
                )
            )
            if _looks_like_title(title) or short_named_subject:
                candidates.append(_candidate(
                    title, studio=studio, universe=structured_universe,
                    variant=structured_variant, aliases=aliases, raw_title=raw,
                    evidence_text=bullet.group(0), evidence_type="telegram_structured_caption",
                    confidence=0.82, source_message_id=message_id,
                ))
            else:
                unresolved_structured_bullet = bullet.group(0)

    if not candidates:
        narrative = NARRATIVE_RE.search(caption)
        if narrative:
            raw = _clean_value(narrative.group("title"))
            if _looks_like_title(raw):
                candidates.append(_candidate(
                    raw, studio=studio, universe=universe, variant="; ".join(variants),
                    aliases=aliases, raw_title=raw, evidence_text=narrative.group(0),
                    evidence_type="telegram_caption_description", confidence=0.68,
                    source_message_id=message_id,
                ))

    if not candidates:
        for line in caption.splitlines():
            # A rejected structured title must not re-enter as a confident
            # headline; labels are context, not independent model names.
            if line.strip() == unresolved_structured_bullet.strip() or LABEL_RE.match(line):
                continue
            line = URL_RE.sub("", line).strip()
            line = re.sub(r"^[^\w#]+", "", line, flags=re.UNICODE).strip()
            if not line or line.startswith("#") or not _looks_like_title(line):
                continue
            title = line
            variant = "; ".join(variants)
            split = re.split(r"\s+[–—]\s+", line, maxsplit=1)
            if len(split) == 2 and normalize_identity(split[1]) in VARIANT_SUFFIXES:
                title, inferred = split
                variant = "; ".join([item for item in (variant, inferred) if item])
                confidence = 0.60  # Keep the raw caption; subtitle split needs review.
                evidence_type = "telegram_caption_subtitle"
            else:
                token_count = len(_title_parts(title))
                confidence = 0.70 if token_count >= 2 else 0.52
                evidence_type = "telegram_caption_headline"
            candidates.append(_candidate(
                title, studio=studio, universe=universe, variant=variant,
                aliases=aliases, raw_title=line, evidence_text=line,
                evidence_type=evidence_type, confidence=confidence,
                source_message_id=message_id,
            ))
            break

    existing_keys = {candidate.key() for candidate in candidates}
    for match in HASHTAG_RE.finditer(caption):
        tag = match.group(1)
        parts = _split_hashtag(tag)
        rendered = " ".join(parts) if parts else tag
        norm_tag = normalize_identity("".join(parts) or tag).replace(" ", "")
        if not rendered or norm_tag in GENERIC_TAGS:
            continue
        tag_candidate = _candidate(
            rendered, raw_title="#" + tag, evidence_text=match.group(0),
            evidence_type="telegram_hashtag_candidate", confidence=0.48,
            source_message_id=message_id,
        )
        tag_norm = normalize_identity(tag_candidate.title)
        same_named_caption = any(
            candidate.key() == tag_candidate.key()
            or normalize_identity(candidate.title).startswith(tag_norm + " ")
            or tag_norm.startswith(normalize_identity(candidate.title) + " ")
            for candidate in candidates
        )
        if candidates and not same_named_caption:
            # Other hashtags are context once the caption already has a title.
            continue
        if tag_candidate.key() not in existing_keys and not same_named_caption:
            candidates.append(tag_candidate)
            existing_keys.add(tag_candidate.key())

    # Multiple different model-name candidates in one caption are not
    # collapsed into one identity. The caller can show them for manual review.
    deduped: dict[tuple[str, str, str, str], TelegramCandidate] = {}
    for candidate in candidates:
        if not candidate.title:
            continue
        prior = deduped.get(candidate.key())
        if prior is None or candidate.confidence > prior.confidence:
            deduped[candidate.key()] = candidate
    ordered = tuple(sorted(deduped.values(), key=lambda item: (-item.confidence, item.title.casefold())))
    if len(ordered) > 1:
        state = "ambiguous"
    elif ordered and ordered[0].confidence >= 0.65:
        state = "telegram_found"
    elif ordered:
        state = "ambiguous"
    else:
        state = "unidentified"
    return CaptionParse(state, ordered, caption)


def ensure_schema(db: sqlite3.Connection) -> None:
    """Create metadata tables inside the existing Curadoria database only."""
    db.executescript("""
    CREATE TABLE IF NOT EXISTS telegram_history_messages(
        source_chat_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        topic_id INTEGER,
        topic_name TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL DEFAULT '',
        reply_to_message_id INTEGER,
        reply_to_top_id INTEGER,
        grouped_id TEXT NOT NULL DEFAULT '',
        has_media INTEGER NOT NULL DEFAULT 0,
        message_date TEXT NOT NULL DEFAULT '',
        edit_date TEXT NOT NULL DEFAULT '',
        text_sha256 TEXT NOT NULL DEFAULT '',
        fetch_status TEXT NOT NULL DEFAULT 'fetched',
        fetched_at TEXT NOT NULL,
        PRIMARY KEY(source_chat_id,message_id)
    );
    CREATE TABLE IF NOT EXISTS telegram_history_links(
        source_chat_id INTEGER NOT NULL,
        asset_message_id INTEGER NOT NULL,
        evidence_message_id INTEGER NOT NULL,
        relation_type TEXT NOT NULL CHECK(relation_type IN ('reply_to_asset','same_album')),
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(source_chat_id,asset_message_id,evidence_message_id,relation_type)
    );
    CREATE TABLE IF NOT EXISTS telegram_identity_coverage(
        message_id INTEGER PRIMARY KEY,
        source_chat_id INTEGER,
        topic_id INTEGER,
        topic_name TEXT NOT NULL DEFAULT '',
        coverage_status TEXT NOT NULL DEFAULT 'needs_telegram_audit'
            CHECK(coverage_status IN ('needs_telegram_audit','partial','exhausted')),
        identity_status TEXT NOT NULL DEFAULT 'not_evaluated'
            CHECK(identity_status IN ('not_evaluated','telegram_found','ambiguous','unidentified','identified_elsewhere')),
        last_scanned_message_id INTEGER,
        history_high_water_id INTEGER,
        evidence_fingerprint TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS telegram_history_checkpoints(
        source_chat_id INTEGER NOT NULL,
        scope TEXT NOT NULL,
        topic_id INTEGER,
        cursor_id INTEGER NOT NULL DEFAULT 0,
        history_high_water_id INTEGER NOT NULL DEFAULT 0,
        covered_from_id INTEGER NOT NULL DEFAULT 0,
        complete INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(source_chat_id,scope)
    );
    CREATE TABLE IF NOT EXISTS telegram_official_search_cache(
        query_fingerprint TEXT NOT NULL,
        source_key TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        query_text TEXT NOT NULL,
        source_url TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('candidate','empty','conflict','unavailable')),
        results_json TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        PRIMARY KEY(query_fingerprint,source_key)
    );
    CREATE TABLE IF NOT EXISTS telegram_identity_runs(
        run_id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        status TEXT NOT NULL,
        aggregate_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_telegram_history_links_asset
        ON telegram_history_links(source_chat_id,asset_message_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_history_album_scope
        ON telegram_history_messages(source_chat_id,topic_id,grouped_id);
    CREATE INDEX IF NOT EXISTS idx_telegram_coverage_status
        ON telegram_identity_coverage(coverage_status,identity_status);
    """)
    coverage_columns = {
        row[1] for row in db.execute("PRAGMA table_info(telegram_identity_coverage)")
    }
    if "topic_name" not in coverage_columns:
        db.execute("""
            ALTER TABLE telegram_identity_coverage
            ADD COLUMN topic_name TEXT NOT NULL DEFAULT ''
        """)
    db.execute("""
        INSERT OR IGNORE INTO telegram_identity_coverage(message_id,updated_at)
        SELECT message_id,? FROM assets
    """, (_now(),))


def _open_curadoria(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
    if not path.is_file():
        raise FileNotFoundError(f"Curadoria SQLite não encontrado: {path}")
    db = sqlite3.connect(str(path), timeout=15, factory=ManagedConnection)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=5000")
    ensure_schema(db)
    # Schema initialization can insert coverage rows; finish that transaction
    # before callers start their own explicit write transaction.
    db.commit()
    return db


def _readonly_db(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Banco de origem não encontrado: {path}")
    uri = "file:" + quote(path.as_posix(), safe="/:") + "?mode=ro"
    db = sqlite3.connect(uri, uri=True, timeout=10, factory=ManagedConnection)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA query_only=ON")
    return db


def read_ignored_message_ids(
    source_db_path: str | Path,
    source_chat_id: int,
    *,
    after_id: int = 0,
    limit: int = 250,
) -> list[int]:
    """Read ignored message IDs only; never writes to the downloader database."""
    limit = max(1, min(int(limit), 2000))
    with _readonly_db(source_db_path) as source:
        rows = source.execute("""
            SELECT mensagem FROM mensagens
            WHERE origem=? AND status='ignorado' AND mensagem>?
            ORDER BY mensagem LIMIT ?
        """, (int(source_chat_id), int(after_id), limit)).fetchall()
    return [int(row[0]) for row in rows]


def read_recent_ignored_message_ids(
    source_db_path: str | Path,
    source_chat_id: int,
    *,
    through_id: int,
    limit: int = 20,
) -> list[int]:
    """Return a bounded tail for edit/status refresh without moving the cursor back."""
    limit = max(0, min(int(limit), 500))
    if limit == 0:
        return []
    with _readonly_db(source_db_path) as source:
        rows = source.execute("""
            SELECT mensagem FROM mensagens
            WHERE origem=? AND status='ignorado' AND mensagem<=?
            ORDER BY mensagem DESC LIMIT ?
        """, (int(source_chat_id), int(through_id), limit)).fetchall()
    return sorted(int(row[0]) for row in rows)


def read_ignored_message_metadata(
    source_db_path: str | Path,
    source_chat_id: int,
    message_ids: Sequence[int],
) -> dict[int, tuple[int | None, str]]:
    """Read topic metadata for a bounded set of ignored messages, read-only."""
    mapping: dict[int, tuple[int | None, str]] = {}
    values = sorted({int(value) for value in message_ids if int(value) > 0})
    with _readonly_db(source_db_path) as source:
        for start in range(0, len(values), 400):
            batch = values[start:start + 400]
            placeholders = ",".join("?" for _ in batch)
            rows = source.execute(
                "SELECT mensagem,topico_id,topico_nome FROM topicos_mensagens "
                f"WHERE origem=? AND mensagem IN ({placeholders})",
                [int(source_chat_id), *batch],
            ).fetchall()
            for row in rows:
                mapping[int(row["mensagem"])] = (
                    int(row["topico_id"]) if row["topico_id"] is not None else None,
                    str(row["topico_nome"] or ""),
                )
    return mapping


def register_asset_topics(
    source_db_path: str | Path,
    curadoria_db_path: str | Path,
    source_chat_id: int,
) -> dict[str, int]:
    """Copy only topic IDs/names for indexed assets from the read-only source."""
    with _open_curadoria(curadoria_db_path) as db:
        message_ids = [
            int(row[0]) for row in db.execute("""
                SELECT a.message_id FROM assets a
                JOIN telegram_identity_coverage c USING(message_id)
                WHERE c.source_chat_id IS NULL ORDER BY a.message_id
            """)
        ]
    mapping: dict[int, tuple[int | None, str]] = {
        message_id: (None, "") for message_id in message_ids
    }
    with _readonly_db(source_db_path) as source:
        for start in range(0, len(message_ids), 400):
            batch = message_ids[start:start + 400]
            if not batch:
                continue
            placeholders = ",".join("?" for _ in batch)
            rows = source.execute(
                "SELECT mensagem,topico_id,topico_nome FROM topicos_mensagens "
                f"WHERE origem=? AND mensagem IN ({placeholders})",
                [int(source_chat_id), *batch],
            ).fetchall()
            for row in rows:
                mapping[int(row["mensagem"])] = (
                    int(row["topico_id"]) if row["topico_id"] is not None else None,
                    str(row["topico_nome"] or ""),
                )
    with _open_curadoria(curadoria_db_path) as db:
        db.execute("BEGIN IMMEDIATE")
        for message_id, (topic_id, topic_name) in mapping.items():
            db.execute("""
                UPDATE telegram_identity_coverage
                SET source_chat_id=?,topic_id=?,topic_name=?,updated_at=?
                WHERE message_id=?
            """, (int(source_chat_id), topic_id, topic_name, _now(), message_id))
        db.commit()
    return {
        "assets_indexed": len(message_ids),
        "topics_recovered": sum(topic_id is not None for topic_id, _ in mapping.values()),
    }


def _attr(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, Mapping):
        return value.get(name, default)
    return getattr(value, name, default)


def _to_history_message(raw: Any, source_chat_id: int, topic_name: str = "") -> TelegramHistoryMessage:
    reply = _attr(raw, "reply_to")
    message_id = _attr(raw, "id", _attr(raw, "message_id"))
    if message_id is None:
        raise ValueError("Mensagem Telegram sem ID")
    text = _attr(raw, "message", _attr(raw, "text", "")) or ""
    topic_id = _attr(raw, "topic_id")
    if topic_id is None:
        topic_id = _attr(reply, "reply_to_top_id")
    reply_to = _attr(raw, "reply_to_message_id")
    if reply_to is None:
        reply_to = _attr(reply, "reply_to_msg_id")
    group_id = _attr(raw, "grouped_id", "")
    reply_top = _attr(reply, "reply_to_top_id")
    return TelegramHistoryMessage(
        source_chat_id=int(source_chat_id),
        message_id=int(message_id),
        topic_id=int(topic_id) if topic_id is not None else None,
        topic_name=str(_attr(raw, "topic_name", topic_name) or topic_name or ""),
        text=str(text),
        reply_to_message_id=int(reply_to) if reply_to is not None else None,
        reply_to_top_id=int(reply_top) if reply_top is not None else None,
        grouped_id=str(group_id or ""),
        has_media=bool(_attr(raw, "media")),
        message_date=str(_attr(raw, "date", "") or ""),
        edit_date=str(_attr(raw, "edit_date", "") or ""),
        fetch_status=("not_returned" if raw.__class__.__name__ == "MessageEmpty" else "fetched"),
    )


def _source_fingerprint(asset: Mapping[str, Any]) -> str:
    # Byte-for-byte compatible with name_curadoria.source_fingerprint.
    payload = [
        "name-policy-v1", asset["sha256"], asset["original_topic"],
        asset["source_caption"], asset["source_album"], asset["source_relative"],
    ]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode()).hexdigest()


def _slug(text: str, limit: int = 76) -> str:
    value = unicodedata.normalize("NFKD", text or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value[:limit].rstrip("-") or "sem-nome"


def _proposal_filename(candidate: TelegramCandidate, message_id: int, source_relative: str) -> str:
    suffix = Path(str(source_relative).replace("\\", "/")).suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif", ".heic", ".heif"}:
        suffix = ".jpg"
    name = _slug(candidate.title, 76)
    if candidate.variant:
        variant = _slug(candidate.variant, 25)
        if variant and variant != name:
            name = f"{name}-{variant}"
    return f"{name[:103].rstrip('-')}-msg{int(message_id)}{suffix}"


def _table_exists(db: sqlite3.Connection, name: str) -> bool:
    return db.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def _history_hash(message: TelegramHistoryMessage) -> str:
    return hashlib.sha256(json.dumps(
        [message.text, message.reply_to_message_id, message.reply_to_top_id,
         message.grouped_id, message.topic_id, message.edit_date],
        ensure_ascii=False,
    ).encode()).hexdigest()


def _link_history_message(db: sqlite3.Connection, message: TelegramHistoryMessage) -> int:
    if not message.text.strip():
        return 0
    links = 0
    matches: list[tuple[sqlite3.Row, str, dict[str, Any]]] = []
    if message.reply_to_message_id is not None:
        asset = db.execute("""
            SELECT message_id,source_album,original_topic FROM assets WHERE message_id=?
        """, (message.reply_to_message_id,)).fetchone()
        if asset:
            matches.append((
                asset, "reply_to_asset",
                {"reply_to_message_id": message.reply_to_message_id},
            ))
    if message.grouped_id:
        for asset in db.execute("""
            SELECT message_id,source_album,original_topic FROM assets WHERE source_album=?
        """, (message.grouped_id,)).fetchall():
            if message.topic_name and asset["original_topic"] and message.topic_name != asset["original_topic"]:
                continue
            matches.append((asset, "same_album", {"grouped_id": message.grouped_id}))
    for asset, relation, evidence in matches:
            result = db.execute("""
                INSERT OR IGNORE INTO telegram_history_links(
                    source_chat_id,asset_message_id,evidence_message_id,relation_type,evidence_json,created_at
                ) VALUES(?,?,?,?,?,?)
            """, (
                message.source_chat_id, int(asset["message_id"]), message.message_id,
                relation, json.dumps(evidence, ensure_ascii=False, sort_keys=True), _now(),
            ))
            db.execute("""
                UPDATE telegram_identity_coverage SET
                    source_chat_id=?,coverage_status=CASE
                      WHEN coverage_status='exhausted'
                           AND history_high_water_id>=? THEN coverage_status ELSE 'partial' END,
                    reason='Há texto Telegram relacionado; histórico completo ainda não comprovado.',
                    updated_at=?
                WHERE message_id=?
            """, (
                message.source_chat_id, message.message_id, _now(), int(asset["message_id"])
            ))
            links += result.rowcount
    return links


def ingest_history_messages(
    db_path: str | Path,
    source_chat_id: int,
    messages: Iterable[Any],
    *,
    topic_name: str = "",
) -> dict[str, int]:
    """Store text and exact message relationships in the canonical local SQLite."""
    fetched = linked = changed = 0
    with _open_curadoria(db_path) as db:
        db.execute("BEGIN IMMEDIATE")
        for raw in messages:
            message = raw if isinstance(raw, TelegramHistoryMessage) else _to_history_message(
                raw, source_chat_id, topic_name
            )
            digest = _history_hash(message)
            old = db.execute("""
                SELECT text_sha256 FROM telegram_history_messages
                WHERE source_chat_id=? AND message_id=?
            """, (message.source_chat_id, message.message_id)).fetchone()
            db.execute("""
                INSERT INTO telegram_history_messages(
                    source_chat_id,message_id,topic_id,topic_name,text,reply_to_message_id,
                    reply_to_top_id,grouped_id,has_media,message_date,edit_date,text_sha256,
                    fetch_status,fetched_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(source_chat_id,message_id) DO UPDATE SET
                    topic_id=excluded.topic_id,topic_name=excluded.topic_name,text=excluded.text,
                    reply_to_message_id=excluded.reply_to_message_id,
                    reply_to_top_id=excluded.reply_to_top_id,grouped_id=excluded.grouped_id,
                    has_media=excluded.has_media,message_date=excluded.message_date,
                    edit_date=excluded.edit_date,text_sha256=excluded.text_sha256,
                    fetch_status=excluded.fetch_status,fetched_at=excluded.fetched_at
            """, (
                message.source_chat_id, message.message_id, message.topic_id, message.topic_name,
                message.text, message.reply_to_message_id, message.reply_to_top_id,
                message.grouped_id, int(message.has_media), message.message_date,
                message.edit_date, digest, message.fetch_status, _now(),
            ))
            fetched += 1
            changed += int(old is None or old["text_sha256"] != digest)
            linked += _link_history_message(db, message)
        db.commit()
    return {"messages_fetched": fetched, "messages_changed": changed, "verified_links": linked}


async def recover_ignored_message_batch(
    source_db_path: str | Path,
    curadoria_db_path: str | Path,
    authorized_client: Any,
    source_chat_id: int,
    *,
    batch_size: int = 100,
    overlap: int = 20,
) -> dict[str, int]:
    """Re-fetch ignored message IDs through an already-authorized client.

    This is metadata-only: the original downloader SQLite is read-only, and
    get_messages(ids=...) is never asked to download media. An ignored-row
    backfill alone does not count as complete Telegram history coverage.
    """
    scope = "ignored-message-id-backfill"
    with _open_curadoria(curadoria_db_path) as db:
        row = db.execute("""
            SELECT cursor_id FROM telegram_history_checkpoints
            WHERE source_chat_id=? AND scope=?
        """, (int(source_chat_id), scope)).fetchone()
        cursor = int(row[0]) if row else 0
    batch_size = max(1, min(int(batch_size), 2000))
    pending_limit = max(1, batch_size // 4)
    with _open_curadoria(curadoria_db_path) as db:
        pending_ids = [int(row[0]) for row in db.execute("""
            SELECT message_id FROM telegram_history_messages
            WHERE source_chat_id=? AND fetch_status='not_returned'
              AND topic_id IS NOT NULL
              AND lower(replace(replace(trim(topic_name),' ',''),'+',''))!='geral50k'
            ORDER BY fetched_at,message_id LIMIT ?
        """, (int(source_chat_id), pending_limit))]
        known_topic_names = {
            int(row["topic_id"]): str(row["topic_name"] or "")
            for row in db.execute("""
                SELECT topic_id,MIN(topic_name) AS topic_name
                FROM telegram_identity_coverage
                WHERE topic_id IS NOT NULL AND TRIM(topic_name)!=''
                GROUP BY topic_id
            """)
        }
    tail_ids = read_recent_ignored_message_ids(
        source_db_path, source_chat_id, through_id=cursor, limit=max(0, int(overlap)),
    )
    capacity = max(0, batch_size - len(pending_ids))
    new_ids = read_ignored_message_ids(
        source_db_path, source_chat_id, after_id=cursor, limit=capacity,
    ) if capacity else []
    tail_ids = [message_id for message_id in tail_ids
                if message_id not in pending_ids and message_id not in new_ids]
    tail_ids = tail_ids[:max(0, min(int(overlap), 500))]
    ids = sorted(set(pending_ids + tail_ids + new_ids))
    if not ids:
        return {
            "message_ids_requested": 0, "new_message_ids": 0,
            "text_messages_recovered": 0, "verified_links": 0,
            "not_returned": 0, "has_more": 0,
        }

    response = authorized_client.get_messages(int(source_chat_id), ids=ids)
    if inspect.isawaitable(response):
        response = await response
    if response is not None and not isinstance(response, (list, tuple)):
        response = [response]
    by_id = {
        int(_attr(item, "id", _attr(item, "message_id"))): item
        for item in (response or [])
        if _attr(item, "id", _attr(item, "message_id")) is not None
    }
    metadata = read_ignored_message_metadata(source_db_path, source_chat_id, ids)
    recovered: list[TelegramHistoryMessage] = []
    not_returned_ids: list[int] = []
    text_count = 0
    not_returned = 0
    for message_id in ids:
        raw = by_id.get(message_id)
        if raw is None or raw.__class__.__name__ == "MessageEmpty":
            topic_id, topic_name = metadata.get(message_id, (None, ""))
            if topic_id is None or not topic_name or _label_key(topic_name) == "geral50k":
                continue
            not_returned += 1
            not_returned_ids.append(message_id)
            recovered.append(TelegramHistoryMessage(
                source_chat_id=int(source_chat_id), message_id=message_id,
                topic_id=topic_id, topic_name=topic_name, text="",
                fetch_status="not_returned",
            ))
            continue
        message = _to_history_message(raw, source_chat_id)
        metadata_topic_id, metadata_topic_name = metadata.get(message_id, (None, ""))
        topic_id = message.topic_id or metadata_topic_id
        topic_name = (
            message.topic_name or metadata_topic_name
            or known_topic_names.get(int(topic_id), "") if topic_id is not None else ""
        )
        if topic_id is None or not topic_name or _label_key(topic_name) == "geral50k":
            continue
        message = TelegramHistoryMessage(
            **{**asdict(message), "topic_id": int(topic_id), "topic_name": topic_name}
        )
        text_count += bool(message.text.strip())
        recovered.append(message)
    result = ingest_history_messages(curadoria_db_path, source_chat_id, recovered)
    max_id = max(new_ids or [cursor])
    with _open_curadoria(curadoria_db_path) as db:
        db.execute("""
            INSERT INTO telegram_history_checkpoints(
                source_chat_id,scope,cursor_id,history_high_water_id,covered_from_id,complete,updated_at
            ) VALUES(?,?,?,?,?,0,?)
            ON CONFLICT(source_chat_id,scope) DO UPDATE SET
                cursor_id=MAX(telegram_history_checkpoints.cursor_id,excluded.cursor_id),
                history_high_water_id=MAX(telegram_history_checkpoints.history_high_water_id,excluded.history_high_water_id),
                complete=0,updated_at=excluded.updated_at
        """, (int(source_chat_id), scope, max_id, max_id, max(0, cursor - overlap), _now()))
        if not_returned:
            failed_topics = {metadata.get(mid, (None, ""))[0] for mid in not_returned_ids}
            if None in failed_topics:
                db.execute("""
                    UPDATE telegram_identity_coverage SET coverage_status='partial',
                        source_chat_id=?,reason='Mensagem ignorada não recuperada; cobertura incompleta.',
                        updated_at=? WHERE source_chat_id=? OR source_chat_id IS NULL
                """, (int(source_chat_id), _now(), int(source_chat_id)))
            else:
                failed_topics = sorted(int(topic_id) for topic_id in failed_topics)
                placeholders = ",".join("?" for _ in failed_topics)
                db.execute(f"""
                    UPDATE telegram_identity_coverage SET coverage_status='partial',
                        source_chat_id=?,reason='Mensagem ignorada não recuperada; cobertura incompleta.',
                        updated_at=? WHERE topic_id IN ({placeholders})
                """, [int(source_chat_id), _now(), *failed_topics])
        db.commit()
    return {
        "message_ids_requested": len(ids),
        "new_message_ids": len(new_ids),
        "text_messages_recovered": int(text_count),
        "verified_links": result["verified_links"],
        "not_returned": int(not_returned),
        "has_more": int(bool(pending_ids) or len(new_ids) == capacity),
    }


async def scan_history_batch(
    curadoria_db_path: str | Path,
    history_source: Any,
    source_chat_id: int,
    topic_id: int | None,
    *,
    topic_name: str = "",
    limit: int = 500,
) -> dict[str, Any]:
    """Incrementally scan a topic via an injected existing-session adapter.

    history_source.fetch_history_page(...) must return HistoryPage and must set
    coverage_verified only after it has covered the requested ID interval.
    Until that proof reaches the source high-water mark, coverage remains
    partial and external research stays blocked.
    """
    scope = f"topic:{topic_id if topic_id is not None else 'general'}"
    with _open_curadoria(curadoria_db_path) as db:
        prior = db.execute("""
            SELECT cursor_id,covered_from_id,complete FROM telegram_history_checkpoints
            WHERE source_chat_id=? AND scope=?
        """, (int(source_chat_id), scope)).fetchone()
        cursor = int(prior["cursor_id"]) if prior else 0
        covered_from = int(prior["covered_from_id"]) if prior else 0
        was_complete = bool(prior["complete"]) if prior else False
    page = history_source.fetch_history_page(
        topic_id=topic_id, after_message_id=cursor, limit=max(1, min(int(limit), 2000))
    )
    if inspect.isawaitable(page):
        page = await page
    if isinstance(page, Mapping):
        page = HistoryPage(**page)
    if not isinstance(page, HistoryPage):
        raise TypeError("fetch_history_page deve retornar HistoryPage")
    if int(page.source_chat_id) != int(source_chat_id) or page.topic_id != topic_id:
        raise ValueError("Página Telegram fora do chat/tópico solicitado")
    if page.next_cursor < cursor:
        raise ValueError("Cursor Telegram regressivo")
    messages = []
    for raw in page.messages:
        message = _to_history_message(raw, source_chat_id, topic_name)
        if message.topic_id is None and topic_id is not None:
            message = TelegramHistoryMessage(
                **{**asdict(message), "topic_id": topic_id,
                   "topic_name": message.topic_name or topic_name}
            )
        messages.append(message)
    ingestion = ingest_history_messages(curadoria_db_path, source_chat_id, messages, topic_name=topic_name)
    reached_high_water = (
        topic_id is not None
        and not page.has_more
        and page.coverage_verified
        and page.range_start_id <= (cursor + 1 if cursor else 1)
        and (was_complete or covered_from <= 0)
        and page.range_end_id >= int(page.history_high_water_id)
        and page.next_cursor >= cursor
    )
    if reached_high_water:
        with _open_curadoria(curadoria_db_path) as db:
            unresolved = db.execute("""
                SELECT 1 FROM telegram_history_messages
                WHERE source_chat_id=? AND fetch_status='not_returned'
                  AND (topic_id=? OR topic_id IS NULL)
                LIMIT 1
            """, (int(source_chat_id), topic_id)).fetchone()
        reached_high_water = unresolved is None
    next_covered_from = covered_from if cursor else 0
    with _open_curadoria(curadoria_db_path) as db:
        db.execute("""
            INSERT INTO telegram_history_checkpoints(
                source_chat_id,scope,topic_id,cursor_id,history_high_water_id,covered_from_id,complete,updated_at
            ) VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(source_chat_id,scope) DO UPDATE SET
                topic_id=excluded.topic_id,
                cursor_id=MAX(telegram_history_checkpoints.cursor_id,excluded.cursor_id),
                history_high_water_id=MAX(telegram_history_checkpoints.history_high_water_id,excluded.history_high_water_id),
                covered_from_id=MIN(telegram_history_checkpoints.covered_from_id,excluded.covered_from_id),
                complete=excluded.complete,updated_at=excluded.updated_at
        """, (
            int(source_chat_id), scope, topic_id, int(page.next_cursor),
            int(page.history_high_water_id), next_covered_from, int(reached_high_water), _now(),
        ))
        if reached_high_water:
            db.execute("""
                UPDATE telegram_identity_coverage SET
                    coverage_status='exhausted',source_chat_id=?,topic_id=?,topic_name=?,
                    last_scanned_message_id=?,history_high_water_id=?,
                    reason='Histórico completo do tópico conferido até o high-water registrado.',
                    updated_at=?
                WHERE topic_id=?
            """, (
                int(source_chat_id), topic_id, topic_name, int(page.next_cursor),
                int(page.history_high_water_id), _now(), topic_id,
            ))
        else:
            db.execute("""
                UPDATE telegram_identity_coverage SET
                    coverage_status=CASE WHEN coverage_status='exhausted' THEN 'partial' ELSE coverage_status END,
                    source_chat_id=?,topic_id=?,topic_name=?,last_scanned_message_id=?,history_high_water_id=?,
                    reason='Histórico Telegram ainda está sendo percorrido.',
                    updated_at=?
                WHERE topic_id=?
            """, (
                int(source_chat_id), topic_id, topic_name, int(page.next_cursor),
                int(page.history_high_water_id), _now(), topic_id,
            ))
        db.commit()
    return {
        "messages_fetched": ingestion["messages_fetched"],
        "verified_links": ingestion["verified_links"],
        "cursor": int(page.next_cursor),
        "history_high_water_id": int(page.history_high_water_id),
        "coverage_status": "exhausted" if reached_high_water else "partial",
    }


def _existing_manual_revision(db: sqlite3.Connection, message_id: int, proposal: sqlite3.Row | None) -> bool:
    if proposal is not None:
        if proposal["status"] == "confirmado":
            return True
        if (proposal["notes"] or "").strip():
            return True
        if proposal["evidence_type"] in {
            "embedded_render_title", "studio_catalog_visual_candidate",
            "manual_review", "manual_confirmed",
        }:
            return True
    if _table_exists(db, "name_proposal_events"):
        return db.execute("""
            SELECT 1 FROM name_proposal_events
            WHERE message_id=? AND event_type LIKE 'manual_%' LIMIT 1
        """, (int(message_id),)).fetchone() is not None
    return False


def _album_history_evidence(db: sqlite3.Connection, asset: sqlite3.Row) -> list[sqlite3.Row]:
    """Exact Telegram album context for manual review, never automatic naming.

    The downloader may omit source_album even when the fetched Telegram media
    messages contain grouped_id. Resolve only same-chat, same-topic media IDs
    with verified coverage; a shared character name is never enough.
    """
    return db.execute("""
        SELECT sibling.message_id, sibling.text, sibling.topic_id, sibling.topic_name
        FROM telegram_history_messages original
        JOIN telegram_identity_coverage scope
          ON scope.message_id=original.message_id
         AND scope.source_chat_id=original.source_chat_id
         AND scope.topic_id=original.topic_id
         AND scope.topic_name=original.topic_name
        JOIN telegram_history_messages sibling
          ON sibling.source_chat_id=original.source_chat_id
         AND sibling.topic_id=original.topic_id
         AND sibling.topic_name=original.topic_name
         AND sibling.grouped_id=original.grouped_id
        WHERE original.message_id=? AND original.topic_name=?
          AND original.has_media=1 AND original.grouped_id!=''
          AND sibling.message_id!=original.message_id
          AND sibling.has_media=1 AND TRIM(sibling.text)!=''
        ORDER BY sibling.message_id LIMIT 20
    """, (int(asset["message_id"]), asset["original_topic"])).fetchall()


def _related_candidates(
    db: sqlite3.Connection,
    asset: sqlite3.Row,
    *,
    include_album_context: bool = False,
) -> list[TelegramCandidate]:
    candidates = list(parse_telegram_caption(
        asset["original_topic"], asset["source_caption"] or "",
        message_id=int(asset["message_id"]),
    ).candidates)
    # An exact-ID media message in the saved Telegram history may contain a
    # caption missing from the downloader index. Reject mismatched chat/topic
    # provenance rather than attaching text from a neighboring message.
    original = db.execute("""
        SELECT h.text, h.topic_name
        FROM telegram_history_messages h
        JOIN telegram_identity_coverage c
          ON c.message_id=h.message_id
         AND c.source_chat_id=h.source_chat_id
         AND c.topic_id=h.topic_id
         AND c.topic_name=h.topic_name
        WHERE h.message_id=? AND h.has_media=1
          AND h.topic_name=? LIMIT 1
    """, (int(asset["message_id"]), asset["original_topic"])).fetchone()
    if original:
        parsed = parse_telegram_caption(
            original["topic_name"], original["text"] or "",
            message_id=int(asset["message_id"]),
        )
        for candidate in parsed.candidates:
            candidates.append(TelegramCandidate(
                **{**asdict(candidate), "evidence_type": "telegram_original_message"},
            ))
    rows = db.execute("""
        SELECT h.message_id,h.text,h.topic_name
        FROM telegram_history_links l JOIN telegram_history_messages h
          ON h.source_chat_id=l.source_chat_id AND h.message_id=l.evidence_message_id
        WHERE l.asset_message_id=? ORDER BY h.message_id
    """, (int(asset["message_id"]),)).fetchall()
    for row in rows:
        parsed = parse_telegram_caption(
            row["topic_name"] or asset["original_topic"], row["text"],
            message_id=int(row["message_id"]),
        )
        for candidate in parsed.candidates:
            has_reply_link = db.execute("""
                SELECT 1 FROM telegram_history_links
                WHERE asset_message_id=? AND evidence_message_id=? AND relation_type='reply_to_asset'
                LIMIT 1
            """, (int(asset["message_id"]), int(row["message_id"]))).fetchone()
            if not has_reply_link and not include_album_context:
                continue
            evidence_type = "telegram_reply_text" if has_reply_link else "telegram_album_context"
            candidates.append(TelegramCandidate(
                **{
                    **asdict(candidate),
                    "evidence_type": evidence_type,
                    "confidence": min(candidate.confidence, 0.72 if has_reply_link else 0.52),
                    "status": "provavel" if has_reply_link and candidate.confidence >= 0.65 else "revisar",
                }
            ))
    if include_album_context:
        linked_sources = {int(row["message_id"]) for row in rows}
        for album in _album_history_evidence(db, asset):
            if int(album["message_id"]) in linked_sources:
                continue
            parsed = parse_telegram_caption(
                album["topic_name"], album["text"],
                message_id=int(album["message_id"]),
            )
            for candidate in parsed.candidates:
                candidates.append(TelegramCandidate(
                    **{
                        **asdict(candidate),
                        "evidence_type": "telegram_album_context",
                        "confidence": min(candidate.confidence, 0.52),
                        "status": "revisar",
                    }
                ))
    return candidates


def _record_candidate_event(
    db: sqlite3.Connection,
    message_id: int,
    event_type: str,
    payload: Mapping[str, Any],
) -> None:
    if not _table_exists(db, "name_proposal_events"):
        return
    evidence = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    exists = db.execute("""
        SELECT 1 FROM name_proposal_events
        WHERE message_id=? AND event_type=? AND evidence=? LIMIT 1
    """, (int(message_id), event_type, evidence)).fetchone()
    if not exists:
        db.execute("""
            INSERT INTO name_proposal_events(message_id,event_type,evidence,occurred_at)
            VALUES(?,?,?,?)
        """, (int(message_id), event_type, evidence, _now()))


def apply_telegram_evidence(
    db_path: str | Path, *, limit: int = 1000, original_topic: str | None = None,
) -> dict[str, int]:
    """Write provisional Telegram candidates with bounded SQLite write transactions."""
    processed = proposed = ambiguous = protected = 0
    with _open_curadoria(db_path) as db:
        if not _table_exists(db, "name_proposals"):
            return {"processed": 0, "proposed": 0, "ambiguous": 0, "preserved_manual": 0}
        write_chunk = 0
        scanned_in_transaction = 0

        def finish_processed() -> None:
            nonlocal processed, write_chunk, scanned_in_transaction
            processed += 1
            write_chunk += 1
            if write_chunk >= 32:
                db.commit()
                write_chunk = 0
                scanned_in_transaction = 0

        asset_sql = """
            SELECT message_id,sha256,original_topic,source_caption,source_album,source_relative
            FROM assets
            WHERE lower(replace(replace(trim(COALESCE(original_topic,'')),' ',''),'+',''))!='geral50k'
        """
        asset_params: tuple[str, ...] = ()
        if original_topic is not None:
            asset_sql += " AND original_topic=?"
            asset_params = (original_topic,)
        assets = db.execute(asset_sql + " ORDER BY message_id", asset_params).fetchall()
        for asset in assets:
            # Bound lock duration by scans as well as writes: an unchanged
            # stretch of history must not prolong another reviewer's wait.
            if write_chunk:
                scanned_in_transaction += 1
                if scanned_in_transaction >= 32:
                    db.commit()
                    write_chunk = 0
                    scanned_in_transaction = 0
            mid = int(asset["message_id"])
            candidates = _related_candidates(db, asset)
            unique: dict[tuple[str, str, str, str], TelegramCandidate] = {}
            for candidate in candidates:
                prior = unique.get(candidate.key())
                if prior is None or candidate.confidence > prior.confidence:
                    unique[candidate.key()] = candidate
            ordered = sorted(unique.values(), key=lambda item: (-item.confidence, item.title.casefold()))
            evidence_fingerprint = hashlib.sha256(json.dumps(
                [dict(asset), [asdict(candidate) for candidate in ordered]],
                ensure_ascii=False, sort_keys=True,
            ).encode()).hexdigest()
            coverage = db.execute("""
                SELECT evidence_fingerprint FROM telegram_identity_coverage WHERE message_id=?
            """, (mid,)).fetchone()
            if coverage and coverage["evidence_fingerprint"] == evidence_fingerprint:
                continue
            if processed >= max(1, min(int(limit), 10000)):
                break
            # Compute candidates before taking the writer lock. Each batch
            # commits after 32 changed assets so the UI and other reviewers
            # are not blocked by a full-history transaction.
            if write_chunk == 0:
                db.execute("BEGIN IMMEDIATE")
                scanned_in_transaction = 0
            proposal = db.execute("SELECT * FROM name_proposals WHERE message_id=?", (mid,)).fetchone()
            if _existing_manual_revision(db, mid, proposal):
                db.execute("""
                    UPDATE telegram_identity_coverage SET identity_status='identified_elsewhere',
                        evidence_fingerprint=?,reason='Revisão manual ou confirmação preservada.',updated_at=?
                    WHERE message_id=?
                """, (evidence_fingerprint, _now(), mid))
                protected += 1
                finish_processed()
                continue
            candidate_keys = {candidate.key() for candidate in ordered}
            existing_key = None
            if proposal and (proposal["title"] or "").strip():
                existing_key = (
                    normalize_identity(proposal["title"]),
                    normalize_identity(proposal["universe"]),
                    normalize_identity(proposal["variant"]),
                    normalize_identity(proposal["studio"]),
                )
            conflict = len(candidate_keys) > 1 or (
                existing_key is not None and candidate_keys and existing_key not in candidate_keys
            )
            if conflict:
                ambiguous += 1
                identity_status = "ambiguous"
                selected = None
                event_type = "telegram_identity_conflict"
            elif ordered:
                selected = ordered[0]
                identity_status = (
                    "telegram_found" if selected.confidence >= 0.65 else "ambiguous"
                )
                event_type = selected.evidence_type
            else:
                selected = None
                if proposal and (proposal["title"] or "").strip():
                    evidence_type = str(proposal["evidence_type"] or "")
                    if "hashtag" in evidence_type or "ambiguous" in evidence_type:
                        identity_status = "ambiguous"
                    elif evidence_type.startswith("telegram"):
                        identity_status = "telegram_found"
                    else:
                        identity_status = "identified_elsewhere"
                else:
                    identity_status = "unidentified"
                event_type = ""

            if selected and proposal is not None and not (proposal["title"] or "").strip():
                status = "provavel" if selected.confidence >= 0.65 else "revisar"
                filename = _proposal_filename(selected, mid, asset["source_relative"])
                db.execute("""
                    UPDATE name_proposals SET studio=?,title=?,universe=?,variant=?,filename=?,
                        status=?,confidence=?,evidence_type=?,evidence_message_id=?,
                        source_fingerprint=?,revision=revision+1,modified_at=?
                    WHERE message_id=? AND status!='confirmado'
                """, (
                    selected.studio or proposal["studio"], selected.title,
                    selected.universe or proposal["universe"], selected.variant or proposal["variant"],
                    filename, status, selected.confidence, selected.evidence_type,
                    selected.source_message_id or mid, _source_fingerprint(asset), _now(), mid,
                ))
                proposed += 1
            elif selected and proposal is None:
                status = "provavel" if selected.confidence >= 0.65 else "revisar"
                db.execute("""
                    INSERT INTO name_proposals(
                        message_id,studio,title,universe,variant,filename,status,confidence,
                        evidence_type,evidence_message_id,source_fingerprint,official_url,notes,
                        revision,modified_at
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,'','',0,?)
                """, (
                    mid, selected.studio, selected.title, selected.universe, selected.variant,
                    _proposal_filename(selected, mid, asset["source_relative"]), status,
                    selected.confidence, selected.evidence_type,
                    selected.source_message_id or mid, _source_fingerprint(asset), _now(),
                ))
                proposed += 1
            elif conflict and proposal is None:
                db.execute("""
                    INSERT INTO name_proposals(
                        message_id,studio,title,universe,variant,filename,status,confidence,
                        evidence_type,evidence_message_id,source_fingerprint,official_url,notes,
                        revision,modified_at
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,'','',0,?)
                """, (
                    mid, "", "", "", "", "", "revisar", 0.0,
                    "telegram_identity_ambiguous", None, _source_fingerprint(asset), _now(),
                ))
            if ordered:
                for candidate in ordered:
                    _record_candidate_event(
                        db, mid, candidate.evidence_type,
                        {"candidate": asdict(candidate), "asset_message_id": mid},
                    )
            if conflict:
                _record_candidate_event(
                    db, mid, event_type,
                    {"asset_message_id": mid, "candidates": [asdict(item) for item in ordered],
                     "existing_title": proposal["title"] if proposal else ""},
                )
            db.execute("""
                UPDATE telegram_identity_coverage SET identity_status=?,evidence_fingerprint=?,
                    reason=?,updated_at=? WHERE message_id=?
            """, (
                identity_status, evidence_fingerprint,
                "Evidência Telegram parseada; proposta nunca confirma identidade."
                    if ordered else "Nenhum nome recuperado; cobertura completa depende de varredura Telegram.",
                _now(), mid,
            ))
            finish_processed()
        if write_chunk:
            db.commit()
    return {
        "processed": processed, "proposed": proposed, "ambiguous": ambiguous,
        "preserved_manual": protected,
    }


def _source_from_mapping(raw: OfficialSource | Mapping[str, Any]) -> OfficialSource:
    if isinstance(raw, OfficialSource):
        source = raw
    else:
        source = OfficialSource(
            studio=str(raw.get("studio", "")),
            provider=str(raw.get("provider", "")),
            profile_url=str(raw.get("profile_url", raw.get("url", ""))),
            verified=bool(raw.get("verified", raw.get("official_verified", False))),
        )
    parsed = urlparse(source.profile_url)
    if not source.verified or parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Fonte oficial precisa ser HTTPS e vir do registro curado como verified")
    return source


def _result_from_mapping(raw: OfficialSearchResult | Mapping[str, Any]) -> OfficialSearchResult:
    if isinstance(raw, OfficialSearchResult):
        result = raw
    else:
        result = OfficialSearchResult(
            title=str(raw.get("title", "")), url=str(raw.get("url", "")),
            universe=str(raw.get("universe", "")),
            variant=str(raw.get("variant", "")), scale=str(raw.get("scale", "")),
            pose=str(raw.get("pose", "")), release_date=str(raw.get("release_date", "")),
            excerpt=str(raw.get("excerpt", ""))[:500],
        )
    parsed = urlparse(result.url)
    if not result.title or parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Resultado oficial precisa de título e link HTTPS específico")
    return result


def _same_official_host(result_url: str, profile_url: str) -> bool:
    result_host = (urlparse(result_url).hostname or "").casefold().rstrip(".")
    profile_host = (urlparse(profile_url).hostname or "").casefold().rstrip(".")
    result_root = result_host[4:] if result_host.startswith("www.") else result_host
    profile_root = profile_host[4:] if profile_host.startswith("www.") else profile_host
    return bool(result_root and profile_root and (
        result_root == profile_root or result_root.endswith("." + profile_root)
    ))


def _query_text(proposal: sqlite3.Row | None, extra_terms: Sequence[str] = ()) -> str:
    parts = []
    if proposal:
        for key in ("title", "variant", "universe"):
            value = str(proposal[key] or "").strip()
            if value and value not in parts:
                parts.append(value)
    for item in extra_terms:
        value = str(item or "").strip()
        if value and value not in parts:
            parts.append(value)
    return " ".join(parts)[:300]


def _research_entity_key(db: sqlite3.Connection, message_id: int) -> tuple[str, int, list[int]]:
    member = db.execute("""
        SELECT m.group_key FROM model_group_members m
        WHERE m.message_id=? AND m.match_reason='reviewed_angles' LIMIT 1
    """, (int(message_id),)).fetchone() if _table_exists(db, "model_group_members") else None
    if not member:
        return f"asset:{int(message_id)}", int(message_id), [int(message_id)]
    group_key = str(member["group_key"])
    members = [
        int(row[0]) for row in db.execute("""
            SELECT message_id FROM model_group_members
            WHERE group_key=? AND match_reason='reviewed_angles' ORDER BY message_id
        """, (group_key,))
    ]
    return f"gallery:{group_key}", min(members or [int(message_id)]), members or [int(message_id)]


def research_official_pending(
    db_path: str | Path,
    sources_for_topic: Callable[[str], Sequence[OfficialSource | Mapping[str, Any]]],
    search_client: Any,
    *,
    extra_terms_for_message: Callable[[int], Sequence[str]] | None = None,
    limit: int = 100,
) -> dict[str, int]:
    """Search only fully-audited, still unidentified/ambiguous entities.

    The client implements search_official(query, source) and returns a title
    plus a product URL. Cached references live in the same local SQLite. No
    result changes a proposal status or confirms visual identity.
    """
    searched = avoided = incomplete = unavailable = conflicts = candidates = no_terms = 0
    with _open_curadoria(db_path) as db:
        if not _table_exists(db, "name_proposals"):
            return {
                "searches": 0, "avoided_by_telegram": 0, "telegram_not_exhausted": 0,
                "unavailable_sources": 0, "conflicts": 0, "official_candidates": 0,
                "no_search_terms": 0,
            }
        rows = db.execute("""
            SELECT a.message_id,a.original_topic,p.title,p.studio,p.universe,p.variant,p.status,
                   p.evidence_type,c.coverage_status,c.identity_status
            FROM assets a JOIN telegram_identity_coverage c USING(message_id)
            LEFT JOIN name_proposals p USING(message_id)
            WHERE lower(replace(replace(trim(COALESCE(a.original_topic,'')),' ',''),'+',''))!='geral50k'
            ORDER BY a.message_id
        """).fetchall()
        entities: dict[str, dict[str, Any]] = {}
        for row in rows:
            entity_key, representative, member_ids = _research_entity_key(db, int(row["message_id"]))
            entity = entities.setdefault(entity_key, {
                "representative": representative, "members": member_ids, "rows": [],
            })
            entity["rows"].append(row)

        eligible = []
        for entity_key, entity in entities.items():
            entity_rows = entity["rows"]
            if any(row["identity_status"] == "telegram_found" for row in entity_rows):
                avoided += len(entity_rows)
                continue
            if any(row["coverage_status"] != "exhausted" for row in entity_rows):
                incomplete += len(entity_rows)
                continue
            if not all(row["identity_status"] in {"unidentified", "ambiguous"} for row in entity_rows):
                continue
            identities = {
                (
                    normalize_identity(row["title"]),
                    normalize_identity(row["universe"]),
                    normalize_identity(row["variant"]),
                )
                for row in entity_rows if row["title"]
            }
            if len(identities) > 1:
                conflicts += 1
                continue
            if any(row["status"] == "confirmado" for row in entity_rows):
                continue
            representative_row = next(
                (row for row in entity_rows if row["title"]),
                next(
                    (row for row in entity_rows if int(row["message_id"]) == entity["representative"]),
                    entity_rows[0],
                ),
            )
            if len(entity_rows) > 1:
                extra = ()
            else:
                extra = tuple(
                    extra_terms_for_message(int(representative_row["message_id"])) or ()
                ) if extra_terms_for_message else ()
            query = _query_text(representative_row, extra)
            if not query or (
                not (representative_row["title"] or "").strip()
                and len(normalize_identity(query).split()) < 2
            ):
                no_terms += 1
                continue
            topic = str(representative_row["original_topic"] or "")
            try:
                sources = [_source_from_mapping(item) for item in sources_for_topic(topic)]
            except Exception:
                unavailable += 1
                continue
            missing_source = False
            for source in sources:
                parsed_profile = urlparse(source.profile_url)
                source_key = "|".join((
                    normalize_identity(source.studio), normalize_identity(source.provider),
                    (parsed_profile.hostname or "").casefold(), source.profile_url.rstrip("/"),
                ))
                query_fingerprint = hashlib.sha256(json.dumps(
                    [entity_key, source_key, normalize_identity(query)], ensure_ascii=False,
                ).encode()).hexdigest()
                if not db.execute("""
                    SELECT 1 FROM telegram_official_search_cache
                    WHERE query_fingerprint=? AND source_key=?
                """, (query_fingerprint, source_key)).fetchone():
                    missing_source = True
            if not sources:
                unavailable += 1
                continue
            if missing_source:
                eligible.append((entity_key, representative_row, query, sources))

        topic_priority: dict[str, int] = {}
        for _, row, _, _ in eligible:
            topic = str(row["original_topic"] or "")
            topic_priority[topic] = topic_priority.get(topic, 0) + 1
        eligible.sort(key=lambda item: (
            -topic_priority.get(str(item[1]["original_topic"] or ""), 0),
            str(item[1]["original_topic"] or "").casefold(),
            int(item[1]["message_id"]),
        ))

        for entity_key, row, query, sources in eligible[:max(1, min(int(limit), 1000))]:
            for source in sources:
                parsed_profile = urlparse(source.profile_url)
                source_key = "|".join((
                    normalize_identity(source.studio), normalize_identity(source.provider),
                    (parsed_profile.hostname or "").casefold(), source.profile_url.rstrip("/"),
                ))
                query_fingerprint = hashlib.sha256(
                    json.dumps([entity_key, source_key, normalize_identity(query)], ensure_ascii=False).encode()
                ).hexdigest()
                cache = db.execute("""
                    SELECT status,results_json FROM telegram_official_search_cache
                    WHERE query_fingerprint=? AND source_key=?
                """, (query_fingerprint, source_key)).fetchone()
                if cache:
                    result_rows = json.loads(cache["results_json"])
                    state = cache["status"]
                else:
                    searched += 1
                    try:
                        raw_results = search_client.search_official(query, source)
                        if inspect.isawaitable(raw_results):
                            raw_results = asyncio.run(raw_results)
                        result_rows = []
                        for raw_result in raw_results or ():
                            result = _result_from_mapping(raw_result)
                            if not result.universe and row["universe"]:
                                result = OfficialSearchResult(
                                    title=result.title, url=result.url,
                                    variant=result.variant, scale=result.scale,
                                    pose=result.pose, release_date=result.release_date,
                                    excerpt=result.excerpt, universe=str(row["universe"]),
                                )
                            if _same_official_host(result.url, source.profile_url):
                                result_rows.append(asdict(result))
                        identity_versions = {
                            (
                                normalize_identity(item["title"]),
                                normalize_identity(item["universe"]),
                                normalize_identity(item["variant"]),
                                normalize_identity(item["scale"]),
                                normalize_identity(item["pose"]),
                            )
                            for item in result_rows
                        }
                        state = "conflict" if len(identity_versions) > 1 else (
                            "candidate" if result_rows else "empty"
                        )
                    except Exception:
                        result_rows = []
                        state = "unavailable"
                        unavailable += 1
                    db.execute("""
                        INSERT OR REPLACE INTO telegram_official_search_cache(
                            query_fingerprint,source_key,entity_key,query_text,source_url,status,
                            results_json,checked_at
                        ) VALUES(?,?,?,?,?,?,?,?)
                    """, (
                        query_fingerprint, source_key, entity_key, query, source.profile_url,
                        state, json.dumps(result_rows, ensure_ascii=False, sort_keys=True), _now(),
                    ))
                if state == "conflict":
                    conflicts += 1
                elif state == "candidate":
                    candidates += len(result_rows)
                if result_rows:
                    event = "official_search_conflict" if state == "conflict" else "official_search_candidate"
                    _record_candidate_event(db, int(row["message_id"]), event, {
                        "entity_key": entity_key, "query": query,
                        "profile_url": source.profile_url, "provider": source.provider,
                        "studio": source.studio,
                        "results": result_rows, "status": state,
                    })
        db.commit()
    return {
        "searches": searched, "avoided_by_telegram": avoided,
        "telegram_not_exhausted": incomplete, "unavailable_sources": unavailable,
        "conflicts": conflicts, "official_candidates": candidates, "no_search_terms": no_terms,
    }


def status_counts(db_path: str | Path) -> dict[str, int]:
    """Measured counters from the existing Curadoria database and its local cache."""
    with _open_curadoria(db_path) as db:
        counts = {
            "telegram_identifications": db.execute("""
                SELECT COUNT(*) FROM telegram_identity_coverage WHERE identity_status='telegram_found'
            """).fetchone()[0],
            "telegram_not_verified": db.execute("""
                SELECT COUNT(*) FROM telegram_identity_coverage WHERE coverage_status!='exhausted'
            """).fetchone()[0],
            "unidentified_after_telegram": db.execute("""
                SELECT COUNT(*) FROM telegram_identity_coverage
                WHERE coverage_status='exhausted' AND identity_status='unidentified'
            """).fetchone()[0],
            "ambiguous_after_telegram": db.execute("""
                SELECT COUNT(*) FROM telegram_identity_coverage
                WHERE coverage_status='exhausted' AND identity_status='ambiguous'
            """).fetchone()[0],
            "official_candidates": 0,
            "gallery_inherited_identifications": 0,
            "manual_confirmations": 0,
            "free_form_captions_interpreted": 0,
            "verified_message_links": 0,
            "galleries_with_name_proposals": 0,
            "truly_unidentified_models": 0,
            "history_incomplete_assets": 0,
            "external_searches_avoided_by_telegram": db.execute("""
                SELECT COUNT(*) FROM telegram_identity_coverage WHERE identity_status='telegram_found'
            """).fetchone()[0],
        }
        counts["history_incomplete_assets"] = counts["telegram_not_verified"]
        counts["verified_message_links"] = db.execute(
            "SELECT COUNT(*) FROM telegram_history_links"
        ).fetchone()[0]
        if _table_exists(db, "name_proposal_events"):
            counts["free_form_captions_interpreted"] = db.execute("""
                SELECT COUNT(DISTINCT message_id) FROM name_proposal_events
                WHERE event_type LIKE 'telegram_caption%'
                   OR event_type IN ('telegram_reply_text','telegram_album_context')
            """).fetchone()[0]
        if _table_exists(db, "telegram_official_search_cache"):
            for row in db.execute("""
                SELECT results_json FROM telegram_official_search_cache WHERE status='candidate'
            """):
                counts["official_candidates"] += len(json.loads(row[0]))
        if _table_exists(db, "name_proposals"):
            counts["gallery_inherited_identifications"] = db.execute("""
                SELECT COUNT(*) FROM name_proposals WHERE evidence_type='gallery_name_inherited'
            """).fetchone()[0]
            counts["manual_confirmations"] = db.execute("""
                SELECT COUNT(*) FROM name_proposals WHERE status='confirmado'
            """).fetchone()[0]
            if _table_exists(db, "model_group_members"):
                counts["galleries_with_name_proposals"] = db.execute("""
                    SELECT COUNT(DISTINCT m.group_key)
                    FROM model_group_members m JOIN name_proposals p USING(message_id)
                    WHERE m.match_reason='reviewed_angles' AND TRIM(COALESCE(p.title,''))!=''
                """).fetchone()[0]
            unidentified = db.execute("""
                SELECT c.message_id,m.group_key,m.match_reason
                FROM telegram_identity_coverage c
                LEFT JOIN name_proposals p USING(message_id)
                LEFT JOIN model_group_members m USING(message_id)
                WHERE c.coverage_status='exhausted'
                  AND TRIM(COALESCE(p.title,''))=''
                  AND c.identity_status IN ('unidentified','ambiguous')
            """).fetchall()
            entities = set()
            for row in unidentified:
                if row[1] and row[2] == "reviewed_angles":
                    entities.add("gallery:" + str(row[1]))
                else:
                    entities.add("asset:" + str(row[0]))
            counts["truly_unidentified_models"] = len(entities)
        return {key: int(value) for key, value in counts.items()}


def record_cycle(
    db_path: str | Path,
    *,
    started_at: str,
    status: str,
    aggregates: Mapping[str, Any],
) -> None:
    """Persist only aggregate run counters in the existing Curadoria SQLite."""
    safe = {
        str(key): int(value)
        for key, value in aggregates.items()
        if isinstance(value, (bool, int))
    }
    with _open_curadoria(db_path) as db:
        db.execute("""
            INSERT INTO telegram_identity_runs(started_at,finished_at,status,aggregate_json)
            VALUES(?,?,?,?)
        """, (started_at, _now(), str(status)[:40], json.dumps(safe, sort_keys=True)))
        db.execute("""
            DELETE FROM telegram_identity_runs
            WHERE run_id NOT IN (SELECT run_id FROM telegram_identity_runs ORDER BY run_id DESC LIMIT 100)
        """)
        db.commit()


def last_cycle_status(db_path: str | Path) -> dict[str, Any]:
    with _open_curadoria(db_path) as db:
        row = db.execute("""
            SELECT started_at,finished_at,status,aggregate_json
            FROM telegram_identity_runs ORDER BY run_id DESC LIMIT 1
        """).fetchone()
        if not row:
            return {"status": "not_started", "aggregates": {}}
        return {
            "started_at": row["started_at"], "finished_at": row["finished_at"],
            "status": row["status"], "aggregates": json.loads(row["aggregate_json"]),
        }


def list_telegram_findings(db_path: str | Path, message_id: int) -> dict[str, Any]:
    """Return candidate evidence for the existing local review UI/API to consume."""
    with _open_curadoria(db_path) as db:
        asset = db.execute("""
            SELECT message_id,original_topic,source_caption FROM assets WHERE message_id=?
        """, (int(message_id),)).fetchone()
        if not asset:
            raise ValueError("Imagem não encontrada na Curadoria")
        candidates = _related_candidates(db, asset, include_album_context=True)
        coverage = db.execute("""
            SELECT coverage_status,identity_status,last_scanned_message_id,
                   history_high_water_id,reason
            FROM telegram_identity_coverage WHERE message_id=?
        """, (int(message_id),)).fetchone()
        links = db.execute("""
            SELECT l.evidence_message_id,l.relation_type,h.topic_id,h.topic_name,h.text
            FROM telegram_history_links l JOIN telegram_history_messages h
              ON h.source_chat_id=l.source_chat_id AND h.message_id=l.evidence_message_id
            WHERE l.asset_message_id=? ORDER BY h.message_id
        """, (int(message_id),)).fetchall()
        related_messages = [dict(row) for row in links]
        existing_sources = {int(row["evidence_message_id"]) for row in links}
        for album in _album_history_evidence(db, asset):
            if int(album["message_id"]) not in existing_sources:
                related_messages.append({
                    "evidence_message_id": int(album["message_id"]),
                    "relation_type": "same_album",
                    "topic_id": album["topic_id"],
                    "topic_name": album["topic_name"],
                    "text": album["text"],
                })
                existing_sources.add(int(album["message_id"]))
        return {
            "message_id": int(message_id),
            "candidates": [asdict(candidate) for candidate in candidates],
            "coverage": dict(coverage) if coverage else {},
            "related_messages": related_messages,
        }


def propagate_reviewed_gallery_names(
    db_path: str | Path,
    naming_module: Any = None,
    *,
    limit: int = 300,
) -> dict[str, int]:
    """Delegate gallery inheritance to the existing canonical naming module."""
    if naming_module is None:
        import name_curadoria as naming_module  # supplied by the existing PR #45 application
    return naming_module.propagate_reviewed_gallery_names(db_path, limit=limit)
