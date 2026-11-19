#!/usr/bin/env python3
"""Preflight local para reconciliar Curadoria Telegram com o catalogo TONART.

SEM upload, SEM D1/R2/Supabase, SEM movimento das imagens. Produz plano para
os importadores canonicos existentes. Bloqueia material sem revisao e direitos.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sqlite3
import tempfile
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

HASH = re.compile(r"^[a-f0-9]{64}$")
SOURCE_DEFAULT = Path.home() / "Downloads" / "telegram-2370335738-images"
DB_DEFAULT = Path.home() / "Documents" / "TONART-Telegram-Import" / "espelho-telegram" / "curadoria-local" / "curadoria.sqlite3"
OUT_DEFAULT = Path.home() / "Documents" / "TONART-Telegram-Import" / "publicacao-staging"


def key(text: str) -> str:
    value = unicodedata.normalize("NFKD", str(text or "").casefold())
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return " ".join(re.findall(r"[a-z0-9]+", value))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_csv(path: Path | None) -> list[dict[str, str]]:
    if path is None:
        return []
    if not path.is_file():
        raise ValueError(f"CSV nao encontrado: {path}")
    if path.stat().st_size > 75 * 1024 * 1024:
        raise ValueError("Arquivo CSV maior que 75 MiB")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        data = csv.DictReader(f)
        if not data.fieldnames:
            raise ValueError("CSV sem cabecalho")
        if len(data.fieldnames) != len(set(data.fieldnames)):
            raise ValueError("Cabecalhos duplicados no CSV")
        rows = []
        for i, row in enumerate(data):
            if i >= 200000:
                raise ValueError("Limite de 200 mil linhas")
            rows.append({str(k): str(v or "").strip() for k, v in row.items() if k is not None})
        return rows


def allowed_link(value: str) -> bool:
    try:
        url = urlparse(value)
        return url.scheme == "https" and bool(url.netloc) and not url.username and not url.password
    except ValueError:
        return False


def load_rights(path: Path | None) -> dict[int, dict[str, str]]:
    # Cada mensagem precisa de autorizacao explicitamente registrada.
    rows = read_csv(path)
    rights = {}
    for r in rows:
        if not {"message_id", "sha256", "public_use_authorized", "evidence_url"} <= r.keys():
            raise ValueError("Direitos CSV requer message_id,sha256,public_use_authorized,evidence_url")
        mid = int(r["message_id"])
        if mid in rights:
            raise ValueError(f"Direitos duplicados para mensagem {mid}")
        if not HASH.fullmatch(r["sha256"].lower()):
            raise ValueError(f"Hash invalido no manifesto de direitos: {mid}")
        rights[mid] = dict(r)
    return rights


def load_existing(path: Path | None) -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
    hashes, identities = defaultdict(list), defaultdict(list)
    for r in read_csv(path):
        digest = (r.get("sha256") or r.get("original_sha256") or r.get("image_hash") or "").lower()
        if digest and not HASH.fullmatch(digest):
            raise ValueError("Hash invalido no inventario de catalogo")
        if digest:
            hashes[digest].append(r)
        studio = key(r.get("studio") or r.get("studio_name") or "")
        title = key(r.get("model") or r.get("title") or r.get("name") or "")
        if studio and title:
            identities[f"{studio}::{title}"].append(r)
    return hashes, identities


def read_curation(path: Path) -> list[dict]:
    if not path.is_file():
        raise ValueError(f"Curadoria SQLite nao encontrada: {path}")
    uri = f"file:{path.resolve().as_posix()}?mode=ro"
    db = sqlite3.connect(uri, uri=True, timeout=20)
    db.row_factory = sqlite3.Row
    try:
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        expected = {"assets", "annotations", "name_proposals"}
        if not expected <= tables:
            raise ValueError("Schema da Curadoria sem tabelas: " + ", ".join(sorted(expected - tables)))
        sql = """SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
                 a.source_date,n.status AS review_status,n.model AS review_model,
                 p.status AS name_status,p.studio,p.title,p.universe,p.variant,
                 p.filename,p.official_url
                 FROM assets a
                 LEFT JOIN annotations n USING(message_id)
                 LEFT JOIN name_proposals p USING(message_id)
                 ORDER BY a.message_id"""
        return [dict(row) for row in db.execute(sql)]
    finally:
        db.close()


def safe_path(root: Path, relative: str) -> Path | None:
    if not relative or Path(relative).is_absolute():
        return None
    target = (root / relative).resolve()
    if target == root or root not in target.parents:
        return None
    if target.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".avif", ".heic", ".heif"}:
        return None
    return target


def ensure_private_output(out: Path, source: Path) -> None:
    if out == source or source in out.parents:
        raise ValueError("Saida nao pode ficar dentro do acervo original Telegram")
    # Evita salvar manifests privados diretamente em worktrees Git.
    for root in (out, *out.parents):
        if (root / ".git").exists():
            raise ValueError("Saida nao pode ficar dentro de um repositorio Git")


def build_plan(db: Path, source: Path, existing: Path | None, rights_file: Path | None):
    source = source.resolve()
    rights = load_rights(rights_file)
    existing_hashes, existing_identities = load_existing(existing)
    all_rows = read_curation(db)
    records = []
    for a in all_rows:
        mid = int(a["message_id"])
        digest = str(a["sha256"] or "").lower()
        studio = str(a["studio"] or "").strip()
        title = str(a["title"] or "").strip()
        rel = str(a["source_relative"] or "")
        record = {
            "message_id": mid, "original_sha256": digest,
            "source_relative": rel, "telegram_topic": a["original_topic"],
            "studio": studio, "model": title, "universe": a["universe"] or "",
            "variant": a["variant"] or "", "proposed_filename": a["filename"] or "",
            "source_priority": "telegram", "review_status": a["review_status"] or "",
            "name_status": a["name_status"] or "", "official_url": a["official_url"] or "",
            "action": "", "reason": "", "existing_model_id": "",
            "rights_evidence_url": "",
        }
        def block(reason):
            record["action"] = "hold"
            record["reason"] = reason
        if a["review_status"] != "aprovado" or a["name_status"] != "confirmado":
            block("name_or_model_not_approved")
        elif not studio or not title or not HASH.fullmatch(digest):
            block("invalid_identification_or_hash")
        elif existing is None:
            block("existing_catalog_inventory_required")
        elif not (rights_file and mid in rights):
            block("rights_not_attested")
        else:
            rights_row = rights[mid]
            if (rights_row["sha256"].lower() != digest
                    or rights_row["public_use_authorized"].lower() not in {"yes", "sim", "true"}
                    or not allowed_link(rights_row["evidence_url"])):
                block("rights_not_attested")
            else:
                record["rights_evidence_url"] = rights_row["evidence_url"]
                source_file = safe_path(source, rel)
                if not source_file or not source_file.is_file():
                    block("source_missing_or_invalid")
                elif sha256_file(source_file) != digest:
                    block("source_integrity_failed")
                else:
                    same = existing_hashes.get(digest, [])
                    model_key = f"{key(studio)}::{key(title)}"
                    related = existing_identities.get(model_key, [])
                    if same:
                        matched = same[0]
                        record["action"] = "reuse_existing_asset"
                        record["reason"] = "exact_sha256"
                        record["existing_model_id"] = (matched.get("model_id")
                            or matched.get("id") or "")
                    elif related:
                        record["action"] = "review_existing_model"
                        record["reason"] = "same_studio_and_model_different_image"
                        record["existing_model_id"] = (related[0].get("model_id")
                            or related[0].get("id") or "")
                    else:
                        record["action"] = "stage_new_asset"
                        record["reason"] = "approved_not_present_in_index"
        records.append(record)
    counts = dict(sorted(Counter(r["action"] for r in records).items()))
    reasons = dict(sorted(Counter(r["reason"] for r in records).items()))
    summary = {
        "schema": "tonart.telegram.staging-plan/1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_policy": "telegram-preferred; public catalog remains approved-only",
        "inventory_supplied": existing is not None,
        "rights_manifest_supplied": rights_file is not None,
        "total": len(records), "counts": counts, "reasons": reasons,
        "publish_performed": False, "external_writes": False,
        "notes": "Plano local, nao autorizacao para R2/D1/Supabase ou release.",
    }
    return records, summary


def atomic_text(path: Path, data: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".part")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            f.write(data)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


def write_plan(out: Path, records: list[dict], summary: dict) -> None:
    out.mkdir(parents=True, exist_ok=True)
    columns = [
        "message_id", "original_sha256", "source_relative", "telegram_topic",
        "studio", "model", "universe", "variant", "proposed_filename",
        "source_priority", "review_status", "name_status", "action", "reason",
        "existing_model_id", "rights_evidence_url", "official_url",
    ]
    from io import StringIO
    sio = StringIO(newline="")
    writer = csv.DictWriter(sio, fieldnames=columns, delimiter=";", extrasaction="ignore")
    writer.writeheader()
    writer.writerows(records)
    atomic_text(out / "decisoes.csv", sio.getvalue())
    atomic_text(out / "resumo.json", json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    ready = [r for r in records if r["action"] in {"stage_new_asset", "reuse_existing_asset"}]
    atomic_text(out / "lote_elegivel.jsonl",
                "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in ready))


def main():
    parser = argparse.ArgumentParser(description="Staging Telegram/TONART, sem upload ou exclusoes")
    parser.add_argument("--db", type=Path, default=DB_DEFAULT)
    parser.add_argument("--source-root", type=Path, default=SOURCE_DEFAULT)
    parser.add_argument("--existing-csv", type=Path)
    parser.add_argument("--rights-csv", type=Path)
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    args = parser.parse_args()
    source, out = args.source_root.resolve(), args.out.resolve()
    ensure_private_output(out, source)
    rows, summary = build_plan(args.db, source, args.existing_csv, args.rights_csv)
    write_plan(out, rows, summary)
    print(json.dumps({"out": str(out), "summary": summary}, ensure_ascii=False))


if __name__ == "__main__":
    main()
