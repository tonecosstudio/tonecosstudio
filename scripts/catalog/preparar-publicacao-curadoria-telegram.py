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


def plan_existing_telegram_name_updates(db: Path, inventory: Path) -> tuple[list[dict], dict]:
    """Read-only reconciliation for EXISTING D1 Telegram drafts.

    Never creates models, changes review/rights, or trusts a matching title.
    Every gallery photo needs matching Telegram message_id and SHA-256.
    The live admin PATCH endpoint rechecks the revision before any later write.
    """
    rows = read_csv(inventory)
    needed = {
        "model_id", "studio", "model", "variant", "sha256", "image_id",
        "telegram_group_key", "telegram_revision", "telegram_review_status",
        "telegram_name_provisional", "telegram_rights_status", "published",
        "image_count", "gallery_version",
    }
    if not rows or not needed <= set(rows[0]):
        raise ValueError("Snapshot D1 Telegram ausente/incompleto para sincronizar nomes")
    local = {int(row["message_id"]): row for row in read_curation(db)}
    models = defaultdict(list)
    image_owners = defaultdict(set)
    hash_owners = defaultdict(set)
    for row in rows:
        model_id = row["model_id"]
        image_id = row["image_id"]
        digest = (row["sha256"] or "").lower()
        if not re.fullmatch(r"tg_[a-f0-9]{24}", model_id) or not re.fullmatch(r"tg:[1-9][0-9]*", image_id):
            raise ValueError("Identidade Telegram D1 invalida no snapshot")
        if not HASH.fullmatch(digest):
            raise ValueError("SHA-256 D1 invalido no snapshot")
        models[model_id].append(row)
        image_owners[image_id].add(model_id)
        hash_owners[digest].add(model_id)
    if not models:
        raise ValueError("Export D1 sem fichas")
    ready, held = [], Counter()
    for model_id, images in sorted(models.items()):
        one = images[0]
        mid_ids = [int(r["image_id"][3:]) for r in images]
        # Refuse partial galleries, duplicate rows or conflicting D1 model fields.
        fields = ("studio", "model", "variant", "telegram_group_key",
                  "telegram_revision", "telegram_review_status",
                  "telegram_name_provisional", "telegram_rights_status", "published",
                  "image_count", "gallery_version")
        if (len(set(mid_ids)) != len(images)
                or len({r["sha256"].lower() for r in images}) != len(images)
                or any(any(row[k] != one[k] for k in fields) for row in images)
                or any(len(image_owners[r["image_id"]]) != 1
                       or len(hash_owners[r["sha256"].lower()]) != 1 for r in images)):
            held["ambiguous_d1_gallery"] += 1
            continue
        # Do not trust a partial export: every image of the current gallery
        # must be present, not only the cover or a convenient matching photo.
        try:
            expected_images = int(one["image_count"])
            gallery_version = int(one["gallery_version"])
        except (ValueError, TypeError):
            held["invalid_gallery_metadata"] += 1
            continue
        if expected_images < 1 or expected_images != len(images) or gallery_version != 1:
            held["incomplete_or_unsupported_gallery"] += 1
            continue
        old = (one["model"] or "").strip()
        if not re.fullmatch(r"Modelo sem nome #[1-9][0-9]*", old):
            held["already_named_or_manually_edited"] += 1
            continue
        if (one["telegram_revision"] != "0" or one["telegram_review_status"] != "pending"
                or one["telegram_name_provisional"] != "1"
                or one["telegram_rights_status"] != "not_reviewed" or one["published"] != "0"):
            held["not_untouched_private_draft"] += 1
            continue
        matched = [local.get(mid) for mid in mid_ids]
        if any(r is None for r in matched):
            held["local_gallery_incomplete"] += 1
            continue
        if any((r["original_topic"] != one["studio"] or r["studio"] != one["studio"]
                or r["sha256"] != images[i]["sha256"].lower())
               for i, r in enumerate(matched)):
            held["source_identity_or_sha_mismatch"] += 1
            continue
        titles = {str(r["title"] or "").strip() for r in matched}
        groups = {r["model_group_key"] for r in matched}
        if (len(titles) != 1 or not next(iter(titles)) or
                len(next(iter(titles))) > 160 or
                any(ord(c) < 32 or ord(c) == 127 for c in next(iter(titles))) or
                next(iter(titles)).startswith("Modelo sem nome") or
                any(r["name_status"] not in {"confirmado", "provavel"} for r in matched) or
                len(groups) != 1):
            held["ambiguous_local_identity"] += 1
            continue
        group = next(iter(groups))
        if group and group != one["telegram_group_key"]:
            held["group_identity_mismatch"] += 1
            continue
        if any(key(r["variant"]) and key(one["variant"]) and
               key(r["variant"]) != key(one["variant"]) for r in matched):
            held["variant_conflict"] += 1
            continue
        name = next(iter(titles))
        proof = sorted((mid, images[i]["sha256"].lower()) for i, mid in enumerate(mid_ids))
        operation_id = hashlib.sha256(json.dumps(
            [model_id, 0, old, name, proof], ensure_ascii=False,
            separators=(",", ":")).encode("utf-8")).hexdigest()
        ready.append({
            "operation_id": operation_id, "model_id": model_id, "studio": one["studio"],
            "old_name": old, "new_name": name, "expected_revision": 0,
            "source_proof": [{"message_id": mid, "sha256": sha} for mid, sha in proof],
            "admin_patch": {"revision": 0, "name": name},
            "name_status": "confirmado" if all(r["name_status"] == "confirmado" for r in matched)
                           else "provavel",
            "approval_granted": False, "rights_verified": False,
            "publication_granted": False, "apply_executed": False,
        })
    return ready, {
        "schema": "tonart.telegram.existing-name-sync/1",
        "d1_models_seen": len(models), "ready": len(ready),
        "held": dict(sorted(held.items())), "external_writes": False,
        "note": "Plan only. Check D1 source proof/live revision and admin authorization before PATCH.",
    }



# Real cultural title aliases, NOT invented franchise identities. Each target
# must still exist uniquely in the live D1 franchises snapshot.
CANONICAL_UNIVERSE_ALIASES = {
    "marvel comics": "marvel",
    "saint seiya": "cavaleiros do zodiaco",
    "my hero academia": "boku no hero",
    "teenage mutant ninja turtles": "as tartarugas ninja",
    "the legend of zelda": "zelda",
    "the legend of zelda tears of the kingdom": "zelda",
    "kimetsu no yaiba": "demon slayer",
    "dragon ball z": "dragon ball",
    "dragon ball super": "dragon ball",
    "baldur s gate 3": "baldur s gate",
    "final fantasy vii": "final fantasy",
    "x men": "marvel",
    "spider man": "marvel",
}


def studio_member_of_topic(studio: str, topic: str) -> bool:
    # An original Telegram topic may legally encompass several credited studios,
    # e.g. 'MPPrints _ My Poke Prints' or 'Merge Project Figures _ Nostalgic Studios'.
    # Match only a complete explicitly named component, not a substring.
    candidate = str(studio or "").strip()
    return candidate == topic or bool(candidate and candidate in
                                      [x.strip() for x in topic.split(" _ ")])


def plan_private_telegram_drafts(db: Path, known_d1_csv: Path, expected_d1_models: int,
                                 franchises_csv: Path, expected_franchises: int):
    """Read-only plan for the EXISTING private Telegram draft importer.

    No franchise invention, no image read/reupload, no D1 or publication write.
    R2 HEAD, current D1 source ownership and admin auth remain importer gates.
    """
    if expected_d1_models < 1 or expected_franchises < 1:
        raise ValueError("Contagens D1 e franquias obrigatorias e positivas")
    known_rows = read_csv(known_d1_csv)
    required_known = {"model_id", "studio", "telegram_group_key"}
    if not known_rows or not required_known <= set(known_rows[0]):
        raise ValueError("Snapshot D1 sem identidade de estúdio/grupo")
    known = {}
    for row in known_rows:
        gid = row["telegram_group_key"]
        model_id = row["model_id"]
        if not group24(gid) or model_id != "tg_" + gid or not row["studio"]:
            raise ValueError("Snapshot D1 Telegram com identidade invalida")
        if gid in known and known[gid] != row:
            raise ValueError("Grupo D1 com duas autoridades")
        known[gid] = row
    if len(known) != expected_d1_models:
        raise ValueError("Snapshot D1 incompleto: fichas esperadas %d, encontradas %d" %
                         (expected_d1_models, len(known)))

    franchise_rows = read_csv(franchises_csv)
    if not franchise_rows or not {"id", "name"} <= set(franchise_rows[0]):
        raise ValueError("Snapshot de franquias D1 sem id/name")
    franchise_ids, franchise_map = set(), defaultdict(set)
    for row in franchise_rows:
        try:
            fid = int(row["id"])
        except (ValueError, TypeError):
            raise ValueError("Franquia D1 com ID invalido") from None
        if fid < 1 or fid in franchise_ids or not row["name"]:
            raise ValueError("Franquia D1 duplicada/invalida")
        franchise_ids.add(fid)
        franchise_map[key(row["name"])].add(fid)
    if len(franchise_ids) != expected_franchises:
        raise ValueError("Snapshot franquias D1 incompleto")

    groups, owners = defaultdict(list), defaultdict(set)
    for row in read_curation(db):
        topic = str(row["original_topic"] or "").strip()
        if (not topic or key(topic) in {"geral 50k", "informacoes"} or
                topic.isdecimal() or re.fullmatch(r"Topico_\d+", topic, re.I)):
            continue
        group_id = gallery_identity(row)
        groups[group_id].append(row)
        digest = str(row["sha256"] or "").lower()
        if HASH.fullmatch(digest):
            owners[digest].add(group_id)
    candidates, held, reasons = [], [], Counter()
    seen_ids = set()

    def reject(identity: str, members: list[dict], reason: str):
        reasons[reason] += 1
        head = members[0]
        held.append({"identity_key": identity, "studio": head["original_topic"],
                     "model": head["title"] or "", "universe": head["universe"] or "",
                     "reason": reason})

    for group_id, members in sorted(groups.items()):
        head = members[0]
        mids = [int(x["message_id"]) for x in members]
        digests = [str(x["sha256"] or "").lower() for x in members]
        label = str(head["title"] or "").strip()
        topic = str(head["original_topic"] or "").strip()
        credited_studio = str(head["studio"] or "").strip()
        group_key = group_id
        if group_id.startswith("single:"):
            if len(members) != 1 or group_id != "single:" + str(mids[0]):
                reject(group_id, members, "invalid_single_group")
                continue
            group_key = hashlib.sha256(("2370335738:" + group_id).encode()).hexdigest()[:24]
        if not group24(group_key) or len(members) > 80:
            reject(group_id, members, "invalid_group_or_size")
            continue
        if (len(set(mids)) != len(mids) or len(set(digests)) != len(members) or
                any(not HASH.fullmatch(sha) for sha in digests) or
                any(len(owners[sha]) > 1 for sha in digests)):
            reject(group_id, members, "duplicate_or_ambiguous_media")
            continue
        if any((x["original_topic"] != topic or x["studio"] != credited_studio or
                not studio_member_of_topic(x["studio"], topic)) for x in members):
            reject(group_id, members, "studio_identity_conflict")
            continue
        if (not label or len(label) > 160 or any(ord(c) < 32 or ord(c) == 127 for c in label)
                or any(x["name_status"] not in {"confirmado", "provavel"} for x in members)
                or any(x["review_status"] in {"rejeitado", "descartado"} for x in members)):
            reject(group_id, members, "name_pending_or_rejected")
            continue
        if (len({key(x["title"]) for x in members}) != 1 or
                len({key(x["variant"]) for x in members}) != 1 or
                len({key(x["universe"]) for x in members}) != 1):
            reject(group_id, members, "gallery_metadata_conflict")
            continue
        if not group_id.startswith("single:"):
            if any(x["model_group_state"] != "provavel" or
                   x["group_studio"] not in {topic, credited_studio} or
                   key(x["group_title"]) != key(label) or
                   int(x["group_image_count"] or 0) != len(members) for x in members):
                reject(group_id, members, "group_needs_review")
                continue
        old = known.get(group_key)
        if old:
            if old["studio"] != credited_studio:
                reject(group_id, members, "existing_d1_group_studio_conflict")
            else:
                reasons["already_in_d1"] += 1
            continue
        model_id = "tg_" + group_key
        if model_id in seen_ids:
            reject(group_id, members, "local_model_id_collision")
            continue
        seen_ids.add(model_id)
        variant, universe = str(head["variant"] or "").strip(), str(head["universe"] or "").strip()
        if len(variant) > 160 or len(universe) > 160:
            reject(group_id, members, "metadata_too_long")
            continue
        ids = franchise_map.get(CANONICAL_UNIVERSE_ALIASES.get(key(universe), key(universe)), set()) if universe else set()
        if len(ids) != 1:
            reject(group_id, members,
                   "franchise_missing_or_unmapped" if not ids else "franchise_ambiguous")
            continue
        media = sorted(zip(mids, digests))
        import_manifest = {
            "originId": "2370335738", "studio": credited_studio, "groupKey": group_id,
            "name": label, "universe": universe, "variant": variant,
            "franchiseId": next(iter(ids)),
            "images": [{"messageId": mid, "sha256": sha} for mid, sha in media],
        }
        # Importer validates every R2 HEAD, live identity/hash conflicts and
        # Supabase admin session before it is permitted to create a private draft.
        operation_id = hashlib.sha256(json.dumps(
            [model_id, import_manifest], sort_keys=True,
            ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        candidates.append({
            "operation_id": operation_id, "model_id": model_id, "studio": credited_studio,
            "admin_endpoint": "POST /api/admin/telegram-drafts/import",
            "import_manifest": import_manifest, "new_private_draft_only": True,
            "rights_verified": False, "showcase_visible": False,
            "r2_verified": False, "production_write_authorized": False,
            "apply_executed": False,
        })
    summary = {
        "schema": "tonart.telegram.private-draft-plan/1",
        "groups_examined": len(groups), "existing_d1_models": len(known),
        "franchises_in_d1": len(franchise_ids), "candidate_imports": len(candidates),
        "held": len(held), "reasons": dict(sorted(reasons.items())),
        "external_writes": False, "public_visibility_authorized": False,
        "r2_presence_verified": False,
        "note": "Plan only; importer checks live R2 HEAD, hash ownership, admin auth and D1 0025 before writes.",
    }
    return candidates, held, summary


def group24(value):
    return bool(re.fullmatch(r"[a-f0-9]{24}", str(value or "")))



def main():
    parser = argparse.ArgumentParser(description="Staging Telegram/TONART, sem upload ou exclusoes")
    parser.add_argument("--db", type=Path, default=DB_DEFAULT)
    parser.add_argument("--source-root", type=Path, default=SOURCE_DEFAULT)
    parser.add_argument("--existing-csv", type=Path)
    parser.add_argument("--expected-model-count", type=int, help="Quantidade total de IDs da origem canônica, incluindo não publicados")
    parser.add_argument("--out", type=Path, default=OUT_DEFAULT)
    parser.add_argument("--existing-drafts-csv", type=Path,
                        help="Snapshot somente leitura do D1 Telegram para planejar correcao de nomes existentes")
    parser.add_argument("--names-only", action="store_true",
                        help="Somente reconciliar nomes de fichas D1 existentes; sem varrer imagens ou preparar importacao")
    parser.add_argument("--expected-draft-count", type=int,
                        help="Total de fichas Telegram no escopo exportado do D1; recusa export incompleto")
    parser.add_argument("--private-drafts-only", action="store_true",
                        help="Planejar novos rascunhos privados por galeria, sem consultar fotos/alterar D1")
    parser.add_argument("--franchises-csv", type=Path, help="Franquias do D1, id/name, sem inventar classificacao")
    parser.add_argument("--expected-franchise-count", type=int, help="Contagem total das franquias no D1")
    args = parser.parse_args()
    source, out = args.source_root.resolve(), args.out.resolve()
    ensure_private_output(out, source)
    if args.names_only and args.private_drafts_only:
        parser.error("Escolha somente um modo de reconciliacao")
    if args.private_drafts_only:
        if (not args.existing_drafts_csv or not args.expected_draft_count or
                not args.franchises_csv or not args.expected_franchise_count):
            parser.error("--private-drafts-only exige snapshot/contagem D1 de fichas e franquias")
        ops, held, info = plan_private_telegram_drafts(
            args.db, args.existing_drafts_csv, args.expected_draft_count,
            args.franchises_csv, args.expected_franchise_count)
        atomic_text(out / "rascunhos_telegram_importacao_privada.jsonl",
                    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in ops))
        atomic_text(out / "rascunhos_telegram_retidos.jsonl",
                    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in held))
        atomic_text(out / "resumo_rascunhos_telegram.json",
                    json.dumps(info, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"out": str(out), "summary": info}, ensure_ascii=False))
        return
    if args.names_only:
        if not args.existing_drafts_csv or not args.expected_draft_count or args.expected_draft_count < 1:
            parser.error("--names-only exige --existing-drafts-csv e --expected-draft-count positivo")
        updates, info = plan_existing_telegram_name_updates(args.db, args.existing_drafts_csv)
        if info["d1_models_seen"] != args.expected_draft_count:
            raise ValueError("Snapshot D1 incompleto: fichas esperadas %d, exportadas %d" %
                             (args.expected_draft_count, info["d1_models_seen"]))
        atomic_text(out / "correcoes_fichas_existentes.jsonl",
                    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in updates))
        atomic_text(out / "resumo_correcoes_fichas_existentes.json",
                    json.dumps(info, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps({"out": str(out), "summary": info}, ensure_ascii=False))
        return
    rows, summary = build_plan(args.db, source, args.existing_csv, args.expected_model_count)
    write_plan(out, rows, summary)
    if args.existing_drafts_csv:
        updates, info = plan_existing_telegram_name_updates(args.db, args.existing_drafts_csv)
        atomic_text(out / "correcoes_fichas_existentes.jsonl",
                    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in updates))
        atomic_text(out / "resumo_correcoes_fichas_existentes.json",
                    json.dumps(info, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"out": str(out), "summary": summary}, ensure_ascii=False))


if __name__ == "__main__":
    main()
