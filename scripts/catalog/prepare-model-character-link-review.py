#!/usr/bin/env python3
"""Prepare private model→character review and rename/tag PREVIEWS.

Reads live Telegram SQLite in read-only snapshot mode, a dated historic model
inventory, and verified editorial Supabase identity IDs in bounded JSON shards.
Does not link, rename, tag or publish any model.
"""
import argparse
import csv
import hashlib
import collections
import json
import pathlib
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone

SNAPSHOT_SCHEMA = "tonart.curation.verified-identities-page/1"
AUTHORITY = "supabase:icmtmaakjucmuzxnofkd.public.catalog_character_identities"
FRANCHISE_ALIASES = {
    "marvel": "marvel-comics",
    "dragon-ball-z": "dragon-ball",
    "dragon-ball-super": "dragon-ball",
    "kimetsu-no-yaiba": "demon-slayer",
}
NOT_FRANCHISE = {"kaijumon", "franquia-a-identificar", "curadoria-pendente", "unknown"}
VISUAL_EVIDENCE = {
    "official_visual_catalog_match", "studio_catalog_exact_visual_match",
    "external_catalog_exact_visual_match", "official_catalog_corroboration",
    "studio_catalog_character_variant", "licensed_reseller_visual_match",
}


def slug(value):
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def world(value):
    key = slug(value)
    return FRANCHISE_ALIASES.get(key, key)


def load_identities(files):
    if not files:
        raise ValueError("missing editorial identity snapshot")
    out, seen, pages = {}, set(), set()
    total = None
    for file in sorted(files):
        doc = json.loads(file.read_text(encoding="utf-8-sig"))
        if (doc.get("schema") != SNAPSHOT_SCHEMA or doc.get("source") != AUTHORITY
                or doc.get("read_only") is not True):
            raise ValueError("wrong editorial snapshot authority")
        if total is None: total = doc.get("total")
        if doc.get("total") != total or doc.get("count") != len(doc.get("identities", [])):
            raise ValueError("inconsistent snapshot page")
        page = doc.get("page")
        if type(page) is not int or page < 1 or page in pages:
            raise ValueError("bad snapshot page")
        pages.add(page)
        for x in doc["identities"]:
            uid, name, franchise = (x.get(k) for k in ("id", "name", "franchise"))
            if not all(isinstance(v, str) and v for v in (uid, name, franchise)):
                raise ValueError("invalid editorial identity")
            k = (world(franchise), slug(name))
            if k in out or uid in seen:
                raise ValueError("duplicate editorial identity")
            out[k] = {"id": uid, "character": name, "franchise": franchise}
            seen.add(uid)
    if len(pages) != max(pages) or len(seen) != total:
        raise ValueError("snapshot partial or mixed revisions")
    return out, {"count": total, "pages": len(pages)}


def classify(studio, title, franchise, state, revision, group_key, identities, proofs=None):
    proofs = proofs or {}
    result = {
        "group_key": group_key, "studio": studio,
        "source_title": title, "source_universe": franchise,
        "source_state": state, "source_revision": revision,
        "catalog_model_id": None,  # group_key is NOT D1 models.id
        "character_identity_id": None,
        "model_identity_verified": False, "public_allowed": False,
        "rename_applied": False, "tags_applied": False,
        "rename_proposal": None, "tag_preview": None,
    }
    if not title or not franchise or not studio:
        result["decision"] = "hold_missing_model_metadata"
        return result
    if world(franchise) in NOT_FRANCHISE or "/" in franchise or " vs " in franchise.lower():
        result["decision"] = "hold_unverified_or_combined_universe"
        return result
    if state != "provavel":
        result["decision"] = "hold_source_group_needs_review"
        return result
    identity = identities.get((world(franchise), slug(title)))
    if identity is None:
        result["decision"] = "hold_no_exact_character_identity"
        return result
    result["character_identity_id"] = identity["id"]
    result["tag_preview"] = {
        "category": "resolve_from_existing_D1_category_id",
        "franchise": identity["franchise"],
        "character": identity["character"],
        "character_identity_id": identity["id"],
        "variant": "retain_current_model_variant",
    }
    if title != identity["character"] and slug(title) == slug(identity["character"]):
        result["rename_proposal"] = identity["character"]
    source_types = set(proofs.get("types", []))
    evidence_urls = set(proofs.get("urls", []))
    result["source_evidence_types"] = sorted(source_types)
    result["visual_evidence_urls"] = sorted(evidence_urls)[:4]
    result["confirmed_member_proposals"] = int(proofs.get("confirmed", 0))
    result["member_messages"] = int(proofs.get("members", 0))
    if result["confirmed_member_proposals"] and evidence_urls and source_types & VISUAL_EVIDENCE:
        result["decision"] = "review_high_evidence"
    else:
        result["decision"] = "review_exact_name_not_visual_verified"
    return result


def telegram_evidence(db):
    evidence = collections.defaultdict(lambda: {
        "types": set(), "urls": set(), "members": set(), "confirmed": 0,
    })
    for group_key, kind, url in db.execute(
        "SELECT group_key,source_type,source_url FROM model_group_evidence"
    ):
        e = evidence[group_key]
        if kind: e["types"].add(kind)
        if kind in VISUAL_EVIDENCE and url: e["urls"].add(url)
    for group_key, msg, status, kind, url in db.execute(
        "SELECT gm.group_key,p.message_id,p.status,p.evidence_type,p.official_url "
        "FROM model_group_members gm JOIN name_proposals p ON p.message_id=gm.message_id"
    ):
        e = evidence[group_key]
        e["members"].add(msg)
        if kind: e["types"].add(kind)
        if status == "confirmado":
            e["confirmed"] += 1
            if kind in VISUAL_EVIDENCE and url: e["urls"].add(url)
    return {k: {"types": list(x["types"]), "urls": list(x["urls"]),
                "members": len(x["members"]), "confirmed": x["confirmed"]}
            for k,x in evidence.items()}


def review_telegram(path, identities):
    if not path.is_file(): raise FileNotFoundError(path)
    db = sqlite3.connect("file:" + path.as_posix() + "?mode=ro", uri=True)
    try:
        db.execute("BEGIN")
        evidence = telegram_evidence(db)
        rows, seen = [], set()
        for k, studio, title, franchise, variant, state, revision in db.execute(
            "SELECT group_key,studio,title,universe,variant,state,revision "
            "FROM model_groups ORDER BY group_key"
        ):
            if k in seen: raise ValueError("duplicate group key")
            seen.add(k)
            line = classify(studio,title,franchise,state,revision,k,identities,evidence.get(k))
            line["source"] = "live_telegram_sqlite_ro"
            line["model_variant"] = variant
            rows.append(line)
        total = db.execute("SELECT count(*) FROM model_groups").fetchone()[0]
        if len(rows) != total: raise ValueError("incomplete groups")
        db.execute("COMMIT")
    finally:
        db.close()
    return rows, {"rows": len(rows), "sqlite_size_bytes": path.stat().st_size,
                  "sqlite_mtime_ns": path.stat().st_mtime_ns}


def review_historic(path, identities):
    rows, seen = [], set()
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip(): continue
            x = json.loads(line)
            mid = x.get("model_id")
            if not isinstance(mid,str) or not re.fullmatch(r"(?:mdl_[a-f0-9]{20}|tg_[a-f0-9]{24})",mid):
                raise ValueError("bad historic model ID")
            if mid in seen: raise ValueError("duplicate historic model ID")
            seen.add(mid)
            name, sources = x.get("name_at_snapshot"), x.get("matched_world_candidates")
            row = {"source":"dated_historic_inventory_not_current_D1",
                   "catalog_model_id":mid,"name_at_snapshot":name,
                   "character_identity_id":None,"verified":False,
                   "renamed":False,"tags_applied":False,
                   "review_proposal":None}
            if not isinstance(sources,list) or len(sources)!=1:
                row["decision"]="hold_missing_or_ambiguous_franchise"
            else:
                match = identities.get((world(sources[0]),slug(name)))
                if match is None:
                    row["decision"]="hold_no_exact_character_identity"
                else:
                    row["decision"]="review_historic_exact_title_only"
                    row["character_identity_id"]=match["id"]
                    row["review_proposal"]={"franchise":match["franchise"],
                        "character":match["character"],"character_identity_id":match["id"]}
            rows.append(row)
    return rows


def write_jsonl(path, rows):
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w",encoding="utf-8",newline="\n") as f:
        for x in rows: f.write(json.dumps(x,ensure_ascii=False,sort_keys=True)+"\n")
    temp.replace(path)


def file_digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024*1024), b""):
            h.update(block)
    return h.hexdigest()


def main(args):
    identity_files = sorted(args.identity_shards.parent.glob(args.identity_shards.name))
    identities, snap = load_identities(identity_files)
    tg, src = review_telegram(args.sqlite,identities)
    historic = review_historic(args.historic,identities)
    args.out.mkdir(parents=True,exist_ok=True)
    write_jsonl(args.out/"telegram-model-character-review-private.jsonl",tg)
    write_jsonl(args.out/"historic-model-character-review-private.jsonl",historic)
    # Reviewer-friendly table; this is a preview, not an import payload for D1.
    csv_path=args.out/"model-character-review-priority-private.csv"
    with csv_path.open("w",encoding="utf-8-sig",newline="") as file:
        columns=[
            "origin", "source_key", "source_title", "studio", "franchise",
            "source_revision", "decision", "candidate_character",
            "candidate_identity_id", "proposed_rename", "source_evidence_types",
            "review_required", "published", "notes",
        ]
        writer=csv.DictWriter(file,fieldnames=columns)
        writer.writeheader()
        for row in tg:
            if not row.get("character_identity_id"):
                continue
            proposed=row.get("tag_preview") or {}
            writer.writerow({
                "origin":"telegram_live_group_not_d1_id",
                "source_key":row["group_key"],
                "source_title":row["source_title"],
                "studio":row["studio"],
                "franchise":proposed.get("franchise",""),
                "source_revision":row["source_revision"],
                "decision":row["decision"],
                "candidate_character":proposed.get("character",""),
                "candidate_identity_id":row["character_identity_id"],
                "proposed_rename":row["rename_proposal"] or "",
                "source_evidence_types":"; ".join(row.get("source_evidence_types",[])),
                "review_required":"yes","published":"no",
                "notes":"D1 model ID and image evidence must be verified before a link",
            })
        for row in historic:
            if not row.get("character_identity_id"):
                continue
            proposed=row.get("review_proposal") or {}
            writer.writerow({
                "origin":"historic_inventory_not_live_d1",
                "source_key":row["catalog_model_id"],
                "source_title":row["name_at_snapshot"],
                "studio":"",
                "franchise":proposed.get("franchise",""),
                "source_revision":"",
                "decision":row["decision"],
                "candidate_character":proposed.get("character",""),
                "candidate_identity_id":row["character_identity_id"],
                "proposed_rename":"",
                "source_evidence_types":"historic_title_only",
                "review_required":"yes","published":"no",
                "notes":"Historical model ID may be stale; recheck D1 before approval",
            })
    result={
        "schema":"tonart.curation.model-character-review/1",
        "created_at_utc":datetime.now(timezone.utc).isoformat(),
        "identity_snapshot":snap,"telegram_source":src,
        "identity_shard_sha256":{f.name:file_digest(f) for f in identity_files},
        "live_sqlite_sha256":file_digest(args.sqlite),
        "historic_snapshot_sha256":file_digest(args.historic),
        "historical_id_namespaces":{
            "mdl":sum(x["catalog_model_id"].startswith("mdl_") for x in historic),
            "tg":sum(x["catalog_model_id"].startswith("tg_") for x in historic),
        },
        "telegram_total":len(tg),"historical_total":len(historic),
        "private_review_rows":sum(bool(x.get("character_identity_id")) for x in tg+historic),
        "rename_proposals":sum(bool(x.get("rename_proposal")) for x in tg),
        "telegram_decisions":dict(sorted(collections.Counter(x["decision"] for x in tg).items())),
        "historical_decisions":dict(sorted(collections.Counter(x["decision"] for x in historic).items())),
        "no_canonical_writes":True,"model_links_written":0,
        "name_changes_written":0,"tags_written":0,
        "historic_model_ids_not_current_D1_proof":True,
        "telegram_group_keys_not_catalog_model_ids":True,
        "proof_rule":"Only exact identity and human-reviewed model evidence may become a canonical D1 link",
    }
    (args.out/"model-character-review-manifest.json").write_text(
        json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf8")
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return 0


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite",type=pathlib.Path,required=True)
    parser.add_argument("--historic",type=pathlib.Path,required=True)
    parser.add_argument("--identity-shards",type=pathlib.Path,required=True)
    parser.add_argument("--out",type=pathlib.Path,required=True)
    raise SystemExit(main(parser.parse_args()))
