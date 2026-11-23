#!/usr/bin/env python3
"""Telegram studios first: prepare per-studio model identity and naming review.

Consumes ONLY the local Telegram curation SQLite (read-only) and verified
private editorial identity snapshots. Reuses the existing canonical model
classification logic. No legacy catalog, D1, Worker, R2, Supabase mutations,
renames, tag writes or automatic approvals.
"""
from __future__ import annotations

import argparse
import collections
import csv
import importlib.util
import json
import pathlib
import sqlite3
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "tonart_existing_model_review",
    HERE / "prepare-model-character-link-review.py",
)
canonical = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(canonical)

SCHEMA = "tonart.telegram-studio-closure-review/1"
DECISION_PRIORITY = {
    "review_high_evidence": "P0_visual_confirmation",
    "review_exact_name_not_visual_verified": "P1_evidence_required",
    "hold_source_group_needs_review": "P2_group_state_review",
    "hold_unverified_or_combined_universe": "P2_franchise_review",
    "hold_missing_model_metadata": "P2_model_metadata",
    "hold_no_exact_character_identity": "P3_character_curation",
}
STUDIO_COLUMNS = [
    "studio", "source_groups", "candidate_groups", "high_evidence_candidates",
    "needs_identity_review", "needs_franchise_review", "needs_group_state_review",
    "needs_metadata_review", "rename_previews", "source_confirmed_proposal_groups",
    "review_required", "catalog_model_ids_verified",
    "model_links_applied", "names_applied", "tags_applied",
    "closure_status",
]
GROUP_COLUMNS = [
    "studio", "group_key", "source_title", "source_universe", "model_variant",
    "source_state", "source_revision", "source_message_ids", "review_priority",
    "review_decision", "candidate_character", "candidate_character_identity_uuid",
    "rename_preview", "tag_category_preview", "tag_franchise_preview",
    "tag_character_preview", "evidence_types", "evidence_urls",
    "confirmed_member_proposals", "review_required",
    "catalog_model_id_verified", "catalog_model_id",
    "verified_source_sha256", "model_link_applied", "name_applied",
    "tags_applied", "studio_closure_status",
]


def member_ids(path: pathlib.Path) -> dict[str, list[int]]:
    db = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        db.execute("BEGIN")
        grouped = collections.defaultdict(list)
        for group, message in db.execute(
            "SELECT group_key,message_id FROM model_group_members "
            "ORDER BY group_key,message_id"
        ):
            if type(message) is not int or not group:
                raise ValueError("invalid Telegram provenance")
            grouped[group].append(message)
        db.execute("COMMIT")
        return dict(grouped)
    finally:
        db.close()


def classify_rows(
    rows: list[dict], messages: dict[str, list[int]],
    public_map: dict[str, dict] | None = None,
):
    group_keys = {r["group_key"] for r in rows}
    if len(group_keys) != len(rows):
        raise ValueError("duplicate Telegram group key")
    if not set(messages).issubset(group_keys):
        raise ValueError("message membership refers to a missing group")
    per_studio = collections.defaultdict(list)
    entries = []
    public_map = public_map or {}
    for row in sorted(rows,key=lambda r:(r["studio"].casefold(),r["group_key"])):
        studio = row["studio"]
        if not studio:
            raise ValueError("studio missing")
        per_studio[studio].append(row)
        identity = row.get("tag_preview") or {}
        src_msgs = sorted(set(messages.get(row["group_key"],[])))
        mapped = public_map.get(row["group_key"])
        verified = bool(mapped and mapped["status"] ==
                        "verified_public_id_and_source_sha")
        if mapped and (
            mapped["studio"] != studio or
            mapped["source_title"] != row["source_title"] or
            mapped["source_revision"] != row["source_revision"] or
            mapped["message_ids"] != src_msgs
        ):
            raise ValueError("public mapping does not match current Telegram group")
        entry = {
            "studio":studio,
            "group_key":row["group_key"],
            "source_title":row["source_title"],
            "source_universe":row["source_universe"],
            "model_variant":row.get("model_variant") or "",
            "source_state":row["source_state"],
            "source_revision":row["source_revision"],
            "source_message_ids":";".join(map(str,src_msgs)),
            "review_priority":DECISION_PRIORITY.get(row["decision"],"P3_research"),
            "review_decision":row["decision"],
            "candidate_character":identity.get("character") or "",
            "candidate_character_identity_uuid":row.get("character_identity_id") or "",
            "rename_preview":row.get("rename_proposal") or "",
            "tag_category_preview":"category ID to resolve in canonical D1" if identity else "",
            "tag_franchise_preview":identity.get("franchise") or "",
            "tag_character_preview":identity.get("character") or "",
            "evidence_types":";".join(row.get("source_evidence_types",[])),
            "evidence_urls":";".join(row.get("visual_evidence_urls",[])),
            "confirmed_member_proposals":row.get("confirmed_member_proposals",0),
            "review_required":"yes",
            "catalog_model_id_verified":"yes" if verified else "no",
            "catalog_model_id":mapped["public_model_id"] if verified else "",
            "verified_source_sha256":mapped["verified_source_sha"] if verified else "",
            "model_link_applied":"no",
            "name_applied":"no",
            "tags_applied":"no",
            "studio_closure_status":"pending_evidence_and_catalog_owner",
        }
        entries.append(entry)
    summaries = []
    for studio, items in per_studio.items():
        counts = collections.Counter(x["decision"] for x in items)
        record = {
            "studio":studio,
            "source_groups":len(items),
            "candidate_groups":sum(bool(x.get("character_identity_id")) for x in items),
            "high_evidence_candidates":counts["review_high_evidence"],
            "needs_identity_review":counts["hold_no_exact_character_identity"],
            "needs_franchise_review":counts["hold_unverified_or_combined_universe"],
            "needs_group_state_review":counts["hold_source_group_needs_review"],
            "needs_metadata_review":counts["hold_missing_model_metadata"],
            "rename_previews":sum(bool(x.get("rename_proposal")) for x in items),
            "source_confirmed_proposal_groups":sum(
                int(x.get("confirmed_member_proposals",0))>0 for x in items),
            "review_required":len(items),
            "catalog_model_ids_verified":sum(
                x["catalog_model_id_verified"] == "yes" for x in entries
                if x["studio"] == studio
            ),
            "model_links_applied":0,
            "names_applied":0,
            "tags_applied":0,
            "closure_status":"pending_evidence_and_catalog_owner",
        }
        assert sum(counts.values()) == len(items)
        summaries.append(record)
    summaries.sort(key=lambda x:(
        -x["high_evidence_candidates"],-x["candidate_groups"],
        -x["source_groups"],x["studio"].casefold()
    ))
    if sum(x["source_groups"] for x in summaries) != len(rows):
        raise ValueError("studio total does not reconcile with source groups")
    return entries,summaries


def load_public_mapping(
    path: pathlib.Path, *, sqlite_sha256: str,
    sqlite_path: pathlib.Path | None = None,
) -> tuple[dict[str, dict], dict]:
    """Consume the prior read-only public-ID report, never D1 model guesses."""
    manifest = json.loads(
        (path / "telegram-public-map-manifest.json").read_text(encoding="utf8")
    )
    if (manifest.get("schema") !=
            "tonart.telegram-studio-public-physical-map/1" or
            manifest.get("no_sqlite_writes") is not True or
            manifest.get("no_d1_writes") is not True or
            manifest.get("no_model_links_or_tags_applied") is not True):
        raise ValueError("public mapping source or integrity policy mismatch")
    if manifest.get("telegram_groups_logical_sha256") is not None:
        if sqlite_path is None:
            raise ValueError("logical group attestation requires source SQLite")
        spec = importlib.util.spec_from_file_location(
            "tonart_public_map_source",
            HERE / "verify-telegram-studio-public-map.py",
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        current = module.logical_groups_digest(module.local_groups(sqlite_path))
        if current != manifest["telegram_groups_logical_sha256"]:
            raise ValueError("public mapping source logical groups have changed")
    elif manifest.get("telegram_sqlite_sha256") != sqlite_sha256:
        # Legacy reports can only be accepted if their physical bytes match.
        raise ValueError("public mapping source or integrity policy mismatch")
    report = path / "telegram-public-model-map-private.jsonl"
    if (not report.is_file() or
            canonical.file_digest(report) !=
            manifest.get("public_map_jsonl_sha256")):
        raise ValueError("public mapping content hash mismatch")
    mapped = {}
    with report.open(encoding="utf8") as file:
        for line in file:
            if not line.strip():
                continue
            item = json.loads(line)
            key = item.get("group_key")
            if not isinstance(key, str) or key in mapped:
                raise ValueError("duplicate or invalid public model group mapping")
            if item.get("status") == "verified_public_id_and_source_sha":
                if (item.get("public_model_id") != "tg_" + key or
                        item.get("verified_source_sha") not in
                        item.get("source_shas", []) or
                        item.get("source_file_verified") is not True):
                    raise ValueError("unverified or fabricated public catalog mapping")
            mapped[key] = item
    if len(mapped) != manifest.get("groups_processed"):
        raise ValueError("public mapping row count mismatch")
    return mapped, manifest


def atomic_csv(path: pathlib.Path, columns: list[str], rows: list[dict]):
    temp = path.with_suffix(path.suffix+".tmp")
    with temp.open("w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=columns,extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)
    temp.replace(path)


def run(args):
    identity_files=sorted(
        args.identity_shards.parent.glob(args.identity_shards.name)
    )
    identities, identity_meta=canonical.load_identities(identity_files)
    before=canonical.file_digest(args.sqlite)
    all_rows, source=canonical.review_telegram(args.sqlite,identities)
    messages=member_ids(args.sqlite)
    after=canonical.file_digest(args.sqlite)
    if before!=after:
        raise ValueError("Telegram SQLite changed during review; rerun against latest snapshot")
    if args.studio is not None:
        if args.studio not in {r["studio"] for r in all_rows}:
            raise ValueError("unknown exact studio name")
        rows=[r for r in all_rows if r["studio"]==args.studio]
        messages={k:v for k,v in messages.items()
                  if k in {row["group_key"] for row in rows}}
    else:
        rows=all_rows
    public_mapping = {}
    public_meta = None
    if getattr(args,"public_map_dir",None) is not None:
        public_mapping,public_meta=load_public_mapping(
            args.public_map_dir,sqlite_sha256=after,sqlite_path=args.sqlite
        )
        if not set(public_mapping).issubset({r["group_key"] for r in all_rows}):
            raise ValueError("public map has groups not present in Telegram source")
    entries,studios=classify_rows(rows,messages,public_mapping)
    args.out.mkdir(parents=True,exist_ok=True)
    atomic_csv(args.out/"telegram-studio-group-review-private.csv",
               GROUP_COLUMNS,entries)
    atomic_csv(args.out/"telegram-studio-closure-priority-private.csv",
               STUDIO_COLUMNS,studios)
    reasons=dict(sorted(collections.Counter(
        x["review_decision"] for x in entries
    ).items()))
    manifest={
        "schema":SCHEMA,
        "created_at_utc":datetime.now(timezone.utc).isoformat(),
        "scope":"telegram_studios_only",
        "studio_filter":args.studio,
        "all_source_groups":len(all_rows),
        "groups_in_scope":len(entries),
        "studio_count":len(studios),
        "studios_closed":0,
        "studio_closure_pending":len(studios),
        "groups_review_pending":len(entries),
        "identity_candidate_groups":sum(
            bool(x["candidate_character_identity_uuid"]) for x in entries),
        "rename_previews":sum(bool(x["rename_preview"]) for x in entries),
        "group_decisions":reasons,
        "catalog_model_ids_verified":sum(
            x["catalog_model_id_verified"] == "yes" for x in entries
        ),
        "public_map_groups_examined":len(public_mapping),
        "public_map_manifest_schema":public_meta.get("schema") if public_meta else None,
        "links_applied":0,"names_applied":0,"tags_applied":0,
        "identity_snapshot":identity_meta,
        "identity_snapshot_sha256":{
            f.name:canonical.file_digest(f) for f in identity_files
        },
        "telegram_sqlite_sha256":after,
        "telegram_source":source,
        "no_historic_inventory_read":True,
        "no_sqlite_writes":True,"no_supabase_writes":True,
        "no_catalog_mutation":True,
        "closure_requires":"verified model identity, correct name/tags, "
        "owner-approved model evidence and current D1 model mapping; "
        "review exceptions may be explicitly documented",
    }
    target=args.out/"telegram-studios-closure-manifest.json"
    temp=target.with_suffix(".json.tmp")
    temp.write_text(json.dumps(manifest,indent=2,ensure_ascii=False,sort_keys=True)
                    +"\n",encoding="utf8")
    temp.replace(target)
    print(json.dumps({
        "scope":manifest["scope"],
        "all_source_groups":manifest["all_source_groups"],
        "groups_in_scope":manifest["groups_in_scope"],
        "studio_count":manifest["studio_count"],
        "identity_candidate_groups":manifest["identity_candidate_groups"],
        "group_decisions":manifest["group_decisions"],
        "studios_closed":0,
        "no_catalog_mutation":True,
    },ensure_ascii=False),flush=True)
    return 0


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--sqlite",required=True,type=pathlib.Path)
    p.add_argument("--identity-shards",required=True,type=pathlib.Path)
    p.add_argument("--out",required=True,type=pathlib.Path)
    p.add_argument("--public-map-dir",type=pathlib.Path,
                   help="Private, SHA-validated read-only live model mapping")
    p.add_argument("--studio",type=str,
                   help="Exact studio name; default process ALL Telegram studios")
    raise SystemExit(run(p.parse_args()))
