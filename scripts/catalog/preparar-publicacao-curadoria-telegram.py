#!/usr/bin/env python3
"""Preflight local para reconciliar Curadoria Telegram com o catalogo TONART.

SEM upload, SEM D1/R2/Supabase, SEM movimento das imagens. Produz plano para
os importadores canonicos existentes. Bloqueia identidade incerta, arquivos invalidos e duplicacoes.
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


def load_existing(path: Path | None):
    """Snapshot de modelos e imagens do publicador vigente, nunca um catálogo paralelo."""
    hashes, identities, titles = defaultdict(list), defaultdict(list), defaultdict(list)
    rows = read_csv(path)
    ids = set()
    seen_models = {}
    for r in rows:
        model_id = (r.get("model_id") or r.get("id") or "").strip()
        if not model_id:
            raise ValueError("Inventario sem model_id: nao e seguro conciliar")
        identity = (key(r.get("studio") or r.get("studio_name")),
                    key(r.get("model") or r.get("title") or r.get("name")),
                    key(r.get("variant")))
        if model_id in seen_models and seen_models[model_id] != identity:
            raise ValueError("Inventario contraditorio para model_id " + model_id)
        seen_models[model_id] = identity
        ids.add(model_id)
        digest = (r.get("sha256") or r.get("original_sha256") or r.get("source_sha256")
                  or r.get("image_hash") or "").lower()
        if digest and not HASH.fullmatch(digest):
            raise ValueError("Hash invalido no inventario de catalogo")
        normalized = dict(r, model_id=model_id, sha256=digest)
        if digest:
            hashes[digest].append(normalized)
        studio = key(r.get("studio") or r.get("studio_name") or "")
        title = key(r.get("model") or r.get("title") or r.get("name") or "")
        if title:
            titles[title].append(normalized)
            if studio:
                identities[f"{studio}::{title}"].append(normalized)
    return hashes, identities, titles, {
        "unique_models": len(ids),
        "image_source_rows": sum(bool((r.get("sha256") or r.get("original_sha256")
                                     or r.get("source_sha256") or r.get("image_hash"))) for r in rows),
        "rows": len(rows),
    }


def distinct_models(rows):
    return {r["model_id"]: r for r in rows}


def variant_conflict(curated, catalog):
    """Somente divergência explícita bloqueia; campo ausente nunca é prova."""
    pairs = (("variant", "variant"), ("scale", "scale"), ("pose", "pose"),
             ("base", "base"), ("edition", "edition"))
    return any(key(curated.get(a)) and key(catalog.get(b))
               and key(curated.get(a)) != key(catalog.get(b))
               for a, b in pairs)


def gallery_identity(row):
    return row["model_group_key"] or f"single:{row['message_id']}"


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
        # Galerias sao autoridade da Curadoria. O schema e opcional para
        # permitir importacoes de bancos antigos sem criar tabelas paralelas.
        has_groups = {"model_groups", "model_group_members"} <= tables
        if has_groups:
            group_columns = """gm.group_key AS model_group_key,
                mg.state AS model_group_state,
                mg.studio AS group_studio,
                mg.title AS group_title,
                (SELECT COUNT(*) FROM model_group_members member
                 WHERE member.group_key = gm.group_key) AS group_image_count"""
            group_joins = """LEFT JOIN model_group_members gm ON gm.message_id=a.message_id
                LEFT JOIN model_groups mg ON mg.group_key=gm.group_key"""
        else:
            group_columns = """NULL AS model_group_key,
                NULL AS model_group_state,NULL AS group_studio,
                NULL AS group_title,0 AS group_image_count"""
            group_joins = ""
        sql = f"""SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
                 a.source_date,n.status AS review_status,n.model AS review_model,
                 p.status AS name_status,p.studio,p.title,p.universe,p.variant,
                 p.filename,p.official_url,p.evidence_type,p.confidence, {group_columns}
                 FROM assets a
                 LEFT JOIN annotations n USING(message_id)
                 LEFT JOIN name_proposals p USING(message_id)
                 {group_joins}
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


def build_plan(db: Path, source: Path, existing: Path | None, expected_model_count: int | None = None):
    """Somente leitura: identifica evidências, não decide por igualdade de nomes."""
    source = source.resolve()
    existing_hashes, existing_identities, existing_titles, inventory = load_existing(existing)
    if expected_model_count is not None and inventory["unique_models"] != expected_model_count:
        raise ValueError("Inventario comercial incompleto ou contagem divergente")
    all_rows = read_curation(db)
    records = []
    for a in all_rows:
        mid = int(a["message_id"])
        digest = str(a["sha256"] or "").lower()
        studio = str(a["studio"] or "").strip()
        title = str(a["title"] or "").strip()
        rel = str(a["source_relative"] or "")
        record = {
            "message_id": mid, "original_sha256": digest, "source_relative": rel,
            "telegram_topic": a["original_topic"], "studio": studio, "model": title,
            "universe": a["universe"] or "", "variant": a["variant"] or "",
            "proposed_filename": a["filename"] or "", "source_priority": "telegram",
            "review_status": a["review_status"] or "", "name_status": a["name_status"] or "",
            "official_url": a["official_url"] or "", "name_evidence": a["evidence_type"] or "",
            "confidence": a["confidence"] or 0, "action": "", "reason": "",
            "existing_model_id": "", "candidate_model_ids": [], "candidate_evidence": "",
            "duplicate_of_message_id": None,
            "model_group_key": a["model_group_key"] or "",
            "model_group_state": a["model_group_state"] or "",
            "group_image_count": int(a["group_image_count"] or 0),
            "group_studio": a["group_studio"] or "",
            "group_title": a["group_title"] or "",
        }
        def hold(reason):
            record["action"], record["reason"] = "hold", reason

        confirmed_from_render = (
            a["name_status"] == "confirmado"
            and a["evidence_type"] == "embedded_render_title"
            and float(a["confidence"] or 0) >= 0.99
            and str(a["official_url"] or "").startswith("https://")
        )
        if a["review_status"] in {"rejeitado", "descartado"}:
            hold("image_rejected")
        elif a["name_status"] != "confirmado" or not (
            a["review_status"] == "aprovado" or confirmed_from_render
        ):
            hold("name_or_model_not_confirmed")
        elif a["model_group_key"] and a["model_group_state"] != "confirmado":
            hold("model_group_not_confirmed")
        elif a["model_group_key"] and (
            key(studio) != key(a["group_studio"]) or key(title) != key(a["group_title"])
        ):
            hold("group_identity_mismatch")
        elif not studio or not title or not HASH.fullmatch(digest):
            hold("invalid_identification_or_hash")
        elif existing is None or not inventory["unique_models"]:
            hold("existing_catalog_inventory_required")
        else:
            source_file = safe_path(source, rel)
            if not source_file or not source_file.is_file():
                hold("source_missing_or_invalid")
            elif sha256_file(source_file) != digest:
                hold("source_integrity_failed")
            else:
                exact = distinct_models(existing_hashes.get(digest, []))
                same_name = (existing_identities.get(f"{key(studio)}::{key(title)}", [])
                             or existing_titles.get(key(title), []))
                plausible = distinct_models(
                    [x for x in same_name if
                     not (key(x.get("studio")) and key(x.get("studio")) != key(studio))]
                )
                if len(exact) > 1:
                    hold("sha_owned_by_multiple_commercial_models")
                    record["candidate_model_ids"] = sorted(exact)
                elif exact:
                    item = next(iter(exact.values()))
                    if (key(item.get("model")) and key(item["model"]) != key(title)) or (
                        key(item.get("studio")) and key(item["studio"]) != key(studio)
                    ):
                        hold("exact_sha_catalog_identity_conflict")
                    elif variant_conflict(record, item):
                        hold("variant_conflict")
                    else:
                        record["action"], record["reason"] = "reuse_existing_asset", "exact_sha256"
                        record["existing_model_id"] = item["model_id"]
                        record["candidate_evidence"] = "verified_sha256"
                elif plausible:
                    if all(variant_conflict(record, item) for item in plausible.values()):
                        hold("variant_conflict")
                    else:
                        record["action"] = "review_existing_model"
                        record["reason"] = "name_candidate_not_product_proof"
                        record["candidate_model_ids"] = sorted(
                            mid for mid, item in plausible.items()
                            if not variant_conflict(record, item))
                        record["candidate_evidence"] = "name_only_review_required"
                else:
                    record["action"] = "stage_new_asset"
                    record["reason"] = "confirmed_not_present_in_index"
        # Todas as imagens (inclusive não aprovadas) podem receber CANDIDATOS
        # para revisão. Isso não valida integridade, não promove status e nunca
        # libera publicação ou ação de galeria automaticamente.
        if record["action"] == "hold" and existing is not None and inventory["unique_models"]:
            exact = distinct_models(existing_hashes.get(digest, [])) if HASH.fullmatch(digest) else {}
            if exact:
                record["candidate_model_ids"] = sorted(exact)
                record["candidate_evidence"] = "unverified_sha256"
            elif studio and title:
                same_name = (existing_identities.get(f"{key(studio)}::{key(title)}", [])
                             or existing_titles.get(key(title), []))
                plausible = distinct_models([
                    x for x in same_name
                    if not (key(x.get("studio")) and key(x.get("studio")) != key(studio))
                    and not variant_conflict(record, x)
                ])
                if plausible:
                    record["candidate_model_ids"] = sorted(plausible)
                    record["candidate_evidence"] = "name_only_review_required"
        records.append(record)

    # Um mesmo SHA não pode inventar dois produtos. Repetição na mesma galeria
    # mantém uma só mídia; entre galerias independentes exige revisão.
    by_sha = defaultdict(list)
    groups = defaultdict(list)
    for r in records:
        groups[gallery_identity(r)].append(r)
        if HASH.fullmatch(r["original_sha256"]):
            by_sha[r["original_sha256"]].append(r)
    for members in by_sha.values():
        if len(members) <= 1:
            continue
        group_ids = {gallery_identity(r) for r in members}
        if len(group_ids) > 1:
            for r in members:
                r["action"], r["reason"] = "hold", "same_sha_across_distinct_galleries"
            continue
        primary = next((r for r in members if r["action"] != "hold"), None)
        if primary:
            for r in members:
                if r is not primary and r["action"] != "hold":
                    r["action"], r["reason"] = "skip_duplicate_source", "same_sha_same_gallery"
                    r["duplicate_of_message_id"] = primary["message_id"]

    # Grupo visual confirmado é o único local onde hash comercial exato pode
    # ancorar fotografias adicionais. Nunca inferir pela igualdade de personagem.
    for identity, members in groups.items():
        if identity.startswith("single:"):
            continue
        variants = {key(r["variant"]) for r in members if key(r["variant"])}
        studios = {key(r["studio"]) for r in members if key(r["studio"])}
        titles = {key(r["model"]) for r in members if key(r["model"])}
        universes = {key(r["universe"]) for r in members if key(r["universe"])}
        known_ids = {r["existing_model_id"] for r in members if r["existing_model_id"]}
        if (len(variants) > 1 or len(studios) > 1 or len(titles) > 1
                or len(universes) > 1):
            for r in members:
                r["action"], r["reason"] = "hold", "group_variant_or_identity_conflict"
        elif any(r["group_image_count"] != len(members) for r in members):
            for r in members:
                r["action"], r["reason"] = "hold", "group_membership_incomplete"
        elif len(known_ids) > 1:
            for r in members:
                r["action"], r["reason"] = "hold", "group_matches_multiple_commercial_models"
        elif known_ids:
            model_id = next(iter(known_ids))
            compatible = {"reuse_existing_asset", "stage_new_asset",
                          "review_existing_model", "skip_duplicate_source"}
            if (all(r["action"] in compatible for r in members)
                    and all(not r["candidate_model_ids"] or
                            model_id in r["candidate_model_ids"]
                            for r in members)):
                for r in members:
                    if r["action"] in {"stage_new_asset", "review_existing_model"}:
                        r["action"], r["reason"] = ("append_existing_gallery",
                                                      "confirmed_group_sha_anchor")
                        r["existing_model_id"] = model_id
                        r["candidate_model_ids"] = []
            elif any(r["action"] == "review_existing_model" and
                     model_id not in r["candidate_model_ids"] for r in members):
                for r in members:
                    r["action"], r["reason"] = "hold", "group_catalog_candidate_conflict"

    # Qualquer membro pendente, variante conflitante ou candidato textual
    # impede publicar a galeria parcialmente.
    counts = dict(sorted(Counter(r["action"] for r in records).items()))
    reasons = dict(sorted(Counter(r["reason"] for r in records).items()))
    eligible = {"stage_new_asset", "reuse_existing_asset", "append_existing_gallery",
                "skip_duplicate_source"}
    complete_groups = {
        identity for identity, members in groups.items()
        if all(r["action"] in eligible for r in members)
        and any(r["action"] != "skip_duplicate_source" for r in members)
    }
    summary = {
        "schema": "tonart.telegram.staging-plan/2",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_policy": "telegram-preferred; public catalog remains approved-only",
        "inventory_supplied": existing is not None,
        "inventory_completeness_verified": expected_model_count is not None,
        "inventory": inventory,
        "total": len(records), "counts": counts, "reasons": reasons,
        "duplicate_sha_groups_in_curadoria": sum(len(x) > 1 for x in by_sha.values()),
        "exact_commercial_sha_matches": sum(r["reason"] == "exact_sha256" for r in records),
        "candidate_existing_images": counts.get("review_existing_model", 0),
        "unverified_exact_sha_candidate_images": sum(r["candidate_evidence"] == "unverified_sha256" for r in records),
        "unverified_name_only_candidate_images": sum(r["candidate_evidence"] == "name_only_review_required" for r in records),
        "candidate_new_images": counts.get("stage_new_asset", 0),
        "candidate_additional_photos": counts.get("append_existing_gallery", 0),
        "review_required_images": len(records) - sum(r["action"] in eligible for r in records),
        "ready_gallery_groups": len(complete_groups),
        "ready_gallery_images": sum(len(groups[k]) for k in complete_groups),
        "grouped_images": sum(bool(r["model_group_key"]) for r in records),
        "distinct_model_groups": len({r["model_group_key"] for r in records if r["model_group_key"]}),
        "publish_performed": False, "external_writes": False,
        "notes": "Candidatos nao sao correspondencias aprovadas; plano local sem upload.",
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
        "existing_model_id", "candidate_model_ids", "candidate_evidence", "duplicate_of_message_id",
        "official_url", "name_evidence", "confidence", "model_group_key",
        "model_group_state", "group_image_count", "group_studio", "group_title",
    ]
    from io import StringIO
    sio = StringIO(newline="")
    writer = csv.DictWriter(sio, fieldnames=columns, delimiter=";", extrasaction="ignore")
    writer.writeheader()
    for record in records:
        row = dict(record, candidate_model_ids="|".join(record["candidate_model_ids"]))
        writer.writerow(row)
    atomic_text(out / "decisoes.csv", sio.getvalue())
    atomic_text(out / "resumo.json", json.dumps(summary, indent=2, ensure_ascii=False) + "\n")

    groups = defaultdict(list)
    for r in records:
        groups[gallery_identity(r)].append(r)
    review = StringIO(newline="")
    group_columns = [
        "group_key", "studio", "model", "universe", "variant", "group_state",
        "declared_image_count", "indexed_image_count", "confirmed_name_count",
        "approved_image_count", "eligible_image_count",
    ]
    group_writer = csv.DictWriter(review, fieldnames=group_columns)
    group_writer.writeheader()
    eligible = {"stage_new_asset", "reuse_existing_asset", "append_existing_gallery",
                "skip_duplicate_source"}
    ready, batches, operations = [], [], []
    for identity, members in sorted(groups.items()):
        head = members[0]
        if head["model_group_key"]:
            group_writer.writerow({
                "group_key": head["model_group_key"], "studio": head["studio"],
                "model": head["model"], "universe": head["universe"],
                "variant": head["variant"], "group_state": head["model_group_state"],
                "declared_image_count": head["group_image_count"],
                "indexed_image_count": len(members),
                "confirmed_name_count": sum(r["name_status"] == "confirmado" for r in members),
                "approved_image_count": sum(r["review_status"] == "aprovado" for r in members),
                "eligible_image_count": sum(r["action"] in eligible for r in members),
            })
        if not all(r["action"] in eligible for r in members):
            continue
        media = [r for r in members if r["action"] != "skip_duplicate_source"]
        if not media:
            continue
        model_ids = {r["existing_model_id"] for r in members if r["existing_model_id"]}
        if len(model_ids) > 1:
            continue
        model_id = next(iter(model_ids), None)
        kinds = {r["action"] for r in media}
        if "stage_new_asset" in kinds and model_id:
            continue
        if "append_existing_gallery" in kinds:
            action = "append_to_existing_gallery"
        elif model_id:
            action = "reuse_existing_model"
        else:
            action = "stage_new_model"
        ready.extend(media)
        op = {
            "operation_id": hashlib.sha256(json.dumps(
                [identity, action, model_id, sorted(r["original_sha256"] for r in media)],
                ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest(),
            "action": action, "existing_model_id": model_id,
            "identity_key": identity, "group_key": head["model_group_key"] or None,
            "studio": head["studio"], "model": head["model"], "universe": head["universe"],
            "variant": head["variant"],
            "message_ids": [r["message_id"] for r in members],
            "media_message_ids": [r["message_id"] for r in media],
            "original_sha256": [r["original_sha256"] for r in media],
            "rights_verified": False, "production_write_authorized": False,
            "requires_commercial_integration": True,
            "inventory_completeness_verified": summary["inventory_completeness_verified"],
        }
        batches.append(op)
        operations.append(op)
    atomic_text(out / "galerias_para_revisao.csv", review.getvalue())
    atomic_text(out / "lote_elegivel.jsonl",
                "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in ready))
    for name in ("lote_modelos_elegiveis.jsonl", "operacoes_conciliadas.jsonl"):
        atomic_text(out / name,
                    "".join(json.dumps(op, ensure_ascii=False) + "\n" for op in operations))


def main():
    parser = argparse.ArgumentParser(description="Staging Telegram/TONART, sem upload ou exclusoes")
    parser.add_argument("--db", type=Path, default=DB_DEFAULT)
    parser.add_argument("--source-root", type=Path, default=SOURCE_DEFAULT)
    parser.add_argument("--existing-csv", type=Path)
    parser.add_argument("--expected-model-count", type=int, help="Quantidade total de IDs da origem canônica, incluindo não publicados")
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    args = parser.parse_args()
    source, out = args.source_root.resolve(), args.out.resolve()
    ensure_private_output(out, source)
    rows, summary = build_plan(args.db, source, args.existing_csv, args.expected_model_count)
    write_plan(out, rows, summary)
    print(json.dumps({"out": str(out), "summary": summary}, ensure_ascii=False))


if __name__ == "__main__":
    main()
