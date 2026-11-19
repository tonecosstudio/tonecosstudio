#!/usr/bin/env python3
"""Prepara SOMENTE o manifesto privado dos tópicos de estúdios do Telegram.

SQLite em leitura, sem filtro de nomes/confianca e sem tocar nos originais.
O conversor Sharp valida o SHA-256 físico antes e depois da derivação.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path

HOME = Path.home()
SOURCE_DEFAULT = HOME / "Downloads" / "telegram-2370335738-images"
DB_DEFAULT = HOME / "Documents" / "TONART-Telegram-Import" / "espelho-telegram" / "curadoria-local" / "curadoria.sqlite3"
OUTPUT_DEFAULT = HOME / "Documents" / "TONART-Telegram-Import" / "otimizacao-privada" / "entrada-curadoria.jsonl"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff", ".tif", ".avif", ".heic", ".heif"}
ORIGIN_ID = "2370335738"
EXCLUDED_TOPIC = "geral + 50k"


def clean_topic(value: object) -> str:
    return " ".join(str(value or "").casefold().split())


def read_candidates(db_path: Path, source_root: Path, limit: int):
    if not db_path.is_file():
        raise ValueError("SQLite Curadoria nao encontrado")
    source_root = source_root.resolve()
    db = sqlite3.connect("file:" + db_path.resolve().as_posix() + "?mode=ro", uri=True, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        rows = db.execute("""
            SELECT a.message_id, a.sha256, a.source_relative, a.original_topic,
                   a.source_date, a.source_caption, a.source_album, a.indexed_at,
                   p.studio, p.title, p.universe, p.variant,
                   p.status AS name_status, p.confidence,
                   n.status AS review_status
            FROM assets AS a
            LEFT JOIN name_proposals AS p ON p.message_id = a.message_id
            LEFT JOIN annotations AS n ON n.message_id = a.message_id
            ORDER BY a.message_id
        """)
        candidates, rejected = [], []
        excluded = 0
        for a in rows:
            topic = str(a["original_topic"] or "").strip()
            if clean_topic(topic) == EXCLUDED_TOPIC:
                excluded += 1
                continue
            if not topic:
                rejected.append([a["message_id"], "topic_missing"])
                continue
            relative = str(a["source_relative"] or "").replace("\\", "/")
            source = (source_root / relative).resolve()
            if source_root not in source.parents or source.suffix.lower() not in EXTS or not source.is_file():
                rejected.append([a["message_id"], "missing_unsupported_or_unsafe_path"])
                continue
            digest = str(a["sha256"] or "").lower()
            if not re.fullmatch(r"[0-9a-f]{64}", digest):
                rejected.append([a["message_id"], "invalid_index_sha256"])
                continue
            mid = int(a["message_id"])
            candidates.append({
                "message_id": mid,
                "sha256": digest,
                "source_name": relative,
                "telegram_origin_id": ORIGIN_ID,
                "original_topic": topic,
                "source_date": a["source_date"],
                "source_caption": a["source_caption"],
                "source_album": a["source_album"],
                "source_indexed_at": a["indexed_at"],
                "curation_studio": a["studio"],
                "curation_universe": a["universe"],
                "curation_variant": a["variant"],
                "catalog_relpath": "curadoria-privada/telegram/" + str(mid),
                "status": "prepared_private",
                "private_staging_only": True,
                "category": "curadoria-privada",
                "folder": topic,
                "franchise": str(a["title"] or "").strip() or "sem-nome",
                "filename": source.name,
                "confidence": a["confidence"],
                "source_type": "telegram",
                "name_review_status": a["name_status"] or "sem-nome",
                "model_review_status": a["review_status"] or "pendente"
            })
            if len(candidates) >= limit:
                break
        return candidates, rejected, excluded
    finally:
        db.close()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", type=Path, default=DB_DEFAULT)
    p.add_argument("--root", type=Path, default=SOURCE_DEFAULT)
    p.add_argument("--manifest", type=Path, default=OUTPUT_DEFAULT)
    p.add_argument("--limit", type=int, default=100000)
    args = p.parse_args()
    if not 1 <= args.limit <= 1000000:
        raise ValueError("Limite fora da faixa")
    origin, out = args.root.resolve(), args.manifest.resolve()
    if out == origin or origin in out.parents:
        raise ValueError("Manifesto nao pode ficar na pasta original")
    for parent in (out, *out.parents):
        if (parent / ".git").exists():
            raise ValueError("Saida privada nao pode ficar no Git")
    rows, errors, excluded = read_candidates(args.db, origin, args.limit)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    tmp.write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in rows), encoding="utf-8")
    tmp.replace(out)
    print(json.dumps({
        "manifest": str(out), "candidate_records": len(rows),
        "unique_source_sha256": len({r["sha256"] for r in rows}),
        "excluded_general_rows": excluded,
        "rejected": len(errors), "reasons": errors[:20],
        "public_release_authorized": False
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
