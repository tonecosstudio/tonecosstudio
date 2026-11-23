#!/usr/bin/env python3
"""Reconcile live *public* Telegram catalog IDs with local images, read-only.

Use the existing public Worker-backed site; no direct D1, R2, Supabase, or
private admin operations. The mapping is evidence, NEVER permission to publish,
rename, split a gallery or confirm a character. No title-only identity joins.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import pathlib
import re
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SCHEMA = "tonart.telegram-studio-public-physical-map/1"
ORIGIN = "https://catalogo.tonartstudio.com.br"
ENDPOINT = "/catalogo-api/api/telegram-studios"
MODEL_ID = re.compile(r"^tg_([0-9a-f]{24})$")
COVER = re.compile(
    r"^/api/telegram-studios/(tg_[0-9a-f]{24})/media/([0-9a-f]{64})/(?:thumb|display)$"
)
STUDIO_COLS = [
    "studio", "local_groups", "public_models", "verified_public_id_and_sha",
    "hold_public_model_not_visible", "hold_public_cover_missing",
    "hold_public_cover_sha_unmatched", "hold_local_media_missing_or_corrupt",
    "title_differences", "held_same_title_visible_candidate",
    "provisional_visible", "closure_status",
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_text(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(text, encoding="utf8", newline="\n")
    temp.replace(path)


def http_json(path: str) -> dict:
    if not path.startswith(ENDPOINT):
        raise ValueError("unapproved public catalog route")
    req = urllib.request.Request(
        ORIGIN + path,
        headers={
            "Accept": "application/json",
            "User-Agent": "TONART-studio-map-readonly/1.0",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=18) as response:
        if response.status != 200 or "json" not in response.headers.get(
            "Content-Type", ""
        ).lower():
            raise ValueError("public catalog returned unexpected response")
        raw = response.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            raise ValueError("unbounded catalog response")
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("invalid catalog response")
    return parsed


def local_groups(sqlite: pathlib.Path) -> dict[str, dict]:
    if not sqlite.is_file():
        raise FileNotFoundError("Telegram source SQLite is unavailable")
    uri = f"file:{sqlite.resolve().as_posix()}?mode=ro"
    db = sqlite3.connect(uri, uri=True, timeout=5)
    db.row_factory = sqlite3.Row
    groups = {}
    try:
        db.execute("BEGIN")
        for row in db.execute(
            "SELECT g.group_key,g.studio,g.title,g.variant,g.state,g.revision,"
            "m.message_id,a.sha256,a.source_relative "
            "FROM model_groups g LEFT JOIN model_group_members m "
            "ON m.group_key=g.group_key "
            "LEFT JOIN assets a ON a.message_id=m.message_id "
            "ORDER BY g.studio,g.group_key,m.message_id"
        ):
            key = row["group_key"]
            if not MODEL_ID.fullmatch("tg_" + key):
                raise ValueError("invalid local gallery group key")
            group = groups.setdefault(key, {
                "group_key": key,
                "studio": row["studio"],
                "title": row["title"],
                "variant": row["variant"],
                "source_state": row["state"],
                "source_revision": row["revision"],
                "members": [],
            })
            if row["message_id"] is not None:
                if not re.fullmatch(r"[0-9a-f]{64}", row["sha256"] or ""):
                    raise ValueError("source image SHA is missing")
                group["members"].append({
                    "message_id": row["message_id"],
                    "sha256": row["sha256"],
                    "source_relative": row["source_relative"],
                })
        db.execute("COMMIT")
    finally:
        db.close()
    if not groups:
        raise ValueError("Telegram source has no groups")
    return groups


def logical_groups_digest(groups: dict[str, dict]) -> str:
    """Stable source-content checksum, independent of SQLite WAL checkpoint bytes."""
    payload = json.dumps(
        {key: groups[key] for key in sorted(groups)},
        ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf8")).hexdigest()


def public_directory(fetch=http_json) -> dict[str, int]:
    reply = fetch(ENDPOINT + "/studios")
    rows = reply.get("studios")
    if not isinstance(rows, list) or len(rows) > 500:
        raise ValueError("invalid public studio directory")
    out = {}
    for row in rows:
        studio, total = row.get("studio"), row.get("total")
        if (not isinstance(studio, str) or not studio or len(studio) > 120
                or not isinstance(total, int) or total < 0
                or studio in out):
            raise ValueError("invalid or duplicated public studio")
        out[studio] = total
    return out


def public_models(studio: str, total: int, fetch=http_json) -> list[dict]:
    if total > 4800:
        raise ValueError("unexpectedly large public studio; require scoped review")
    if total == 0:
        return []
    models = []
    for offset in range(0, total, 48):
        params = urllib.parse.urlencode({
            "studio": studio, "limit": 48, "offset": offset,
        })
        payload = fetch(ENDPOINT + "?" + params)
        batch = payload.get("items")
        if (payload.get("total") != total or not isinstance(batch, list)
                or not (0 < len(batch) <= 48)
                or len(batch) != min(48, total - offset)):
            raise ValueError("public pagination/total changed during mapping")
        for item in batch:
            if not isinstance(item, dict) or item.get("studio") != studio:
                raise ValueError("catalog studio mismatch")
            models.append(item)
    if len(models) != total or len({
        row.get("id") for row in models
    }) != total:
        raise ValueError("duplicate public model ID or pagination gap")
    return models


def cache_models(
    studio: str, total: int, directory: pathlib.Path, *, fetch=http_json,
    cache_age: int = 1800,
) -> tuple[list[dict], bool]:
    key = hashlib.sha256(studio.encode("utf8")).hexdigest()[:24]
    path = directory / (key + ".json")
    if path.is_file() and cache_age > 0:
        try:
            old = json.loads(path.read_text(encoding="utf8"))
            if (old.get("studio") == studio and old.get("total") == total
                    and isinstance(old.get("models"), list)
                    and utc_now().timestamp() - old["timestamp"] <= cache_age
                    and utc_now().timestamp() >= old["timestamp"]):
                return old["models"], True
        except (OSError, ValueError, KeyError, TypeError):
            pass
    rows = public_models(studio, total, fetch)
    atomic_text(path, json.dumps({
        "studio": studio, "total": total, "models": rows,
        "timestamp": utc_now().timestamp(),
    }, ensure_ascii=False, sort_keys=True))
    return rows, False


def reconcile(
    local: dict, public: list[dict], root: pathlib.Path,
) -> tuple[list[dict], list[dict]]:
    # The public ID is trusted ONLY if the Worker actually returned it,
    # the stable group_key matches, and its cover SHA matches a source photo.
    pub_by_key = {}
    unpaired = []
    for model in public:
        identifier = model.get("id")
        if not isinstance(identifier, str) or not MODEL_ID.fullmatch(identifier):
            raise ValueError("unsupported public ID")
        key = MODEL_ID.fullmatch(identifier).group(1)
        if key in pub_by_key:
            raise ValueError("duplicate public gallery ID")
        pub_by_key[key] = model
        if key not in local:
            unpaired.append({
                "public_model_id": identifier,
                "studio": model.get("studio"), "name": model.get("name"),
                "status": "public_only_requires_source_reconciliation",
            })
    results = []
    root = root.resolve()
    digests = {}
    for key, group in sorted(local.items()):
        model = pub_by_key.get(key)
        rec = {
            "studio": group["studio"], "group_key": key,
            "source_title": group["title"], "source_state": group["source_state"],
            "source_revision": group["source_revision"],
            "message_ids": [m["message_id"] for m in group["members"]],
            "source_shas": [m["sha256"] for m in group["members"]],
            "public_model_id": model["id"] if model else None,
            "public_title": model.get("name") if model else None,
            "public_provisional": model.get("provisional") if model else None,
            "title_differs": bool(model and model.get("name") != group["title"]),
            "model_character_verified": False,
            "tag_writes": 0, "name_writes": 0,
            "publishing_authorized": False,
        }
        if not model:
            rec["status"] = "hold_public_model_not_visible"
            results.append(rec)
            continue
        match = COVER.fullmatch(model.get("cover") or "")
        if not match or match.group(1) != model["id"]:
            rec["status"] = "hold_public_cover_missing"
            results.append(rec)
            continue
        public_sha = match.group(2)
        matches = [member for member in group["members"]
                   if member["sha256"] == public_sha]
        if not matches:
            rec["status"] = "hold_public_cover_sha_unmatched"
            results.append(rec)
            continue
        member = matches[0]
        relative = pathlib.Path(member["source_relative"])
        target = (root / relative).resolve()
        if (not target.is_relative_to(root)
                or not target.is_file()):
            rec["status"] = "hold_local_media_missing_or_corrupt"
            results.append(rec)
            continue
        if target not in digests:
            digests[target] = sha256(target)
        if digests[target] != public_sha:
            rec["status"] = "hold_local_media_missing_or_corrupt"
            results.append(rec)
            continue
        rec.update({
            "status": "verified_public_id_and_source_sha",
            "verified_source_sha": public_sha,
            "verified_source_message_id": member["message_id"],
            "source_file_verified": True,
            "public_image_count": model.get("imageCount"),
            "public_franchise_label": model.get("franchise"),
            "public_franchise_slug": model.get("franchiseSlug"),
        })
        results.append(rec)
    return results, unpaired


def annotate_same_title_candidates(rows: list[dict]) -> None:
    """Diagnostic only: same text is NEVER a real ID or merge instruction."""
    found = collections.defaultdict(set)
    for row in rows:
        if (row["status"] == "verified_public_id_and_source_sha" and
                isinstance(row["public_title"], str)):
            found[(row["studio"], row["public_title"].strip().casefold())].add(
                row["public_model_id"]
            )
    for row in rows:
        candidate = sorted(found.get(
            (row["studio"], row["source_title"].strip().casefold()), set()
        )) if row["status"] == "hold_public_model_not_visible" else []
        row["same_title_visible_public_id_candidates"] = candidate
        row["same_title_not_identity_proof"] = True


def run(args, *, fetch=http_json) -> dict:
    before = sha256(args.sqlite)
    groups = local_groups(args.sqlite)
    group_logical_sha256 = logical_groups_digest(groups)
    local_studios = {g["studio"] for g in groups.values()}
    if args.only_studio:
        unknown = set(args.only_studio) - local_studios
        if unknown:
            raise ValueError("unknown exact studio: " + ", ".join(sorted(unknown)))
        chosen = set(args.only_studio)
    else:
        chosen = local_studios
    listing = public_directory(fetch)
    args.out.mkdir(parents=True, exist_ok=True)
    per_studio, all_results, public_only = [], [], []
    count_cache = count_pages = 0
    for studio in sorted(chosen, key=str.casefold):
        subset = {k: g for k, g in groups.items() if g["studio"] == studio}
        total = listing.get(studio, 0)
        if studio in listing:
            public, reused = cache_models(
                studio, total, args.out / "public-api-cache", fetch=fetch,
                cache_age=args.cache_age_seconds,
            )
            if reused:
                count_cache += 1
            else:
                count_pages += (total + 47) // 48
        else:
            public = []
        rows, extras = reconcile(subset, public, args.source_root)
        annotate_same_title_candidates(rows)
        all_results.extend(rows)
        public_only.extend(extras)
        tally = collections.Counter(r["status"] for r in rows)
        per_studio.append({
            "studio": studio, "local_groups": len(subset),
            "public_models": total,
            "verified_public_id_and_sha": tally["verified_public_id_and_source_sha"],
            "hold_public_model_not_visible": tally["hold_public_model_not_visible"],
            "hold_public_cover_missing": tally["hold_public_cover_missing"],
            "hold_public_cover_sha_unmatched": tally["hold_public_cover_sha_unmatched"],
            "hold_local_media_missing_or_corrupt": tally["hold_local_media_missing_or_corrupt"],
            "title_differences": sum(r["title_differs"] for r in rows),
            "held_same_title_visible_candidate": sum(bool(
                r["same_title_visible_public_id_candidates"]
            ) for r in rows),
            "provisional_visible": sum(r["public_provisional"] is True for r in rows),
            "closure_status": "pending_editorial_visual_and_rights_review",
        })
        print(json.dumps({
            "studio": studio, "verified": tally["verified_public_id_and_source_sha"],
            "local": len(subset), "public": total,
            "held": len(rows) - tally["verified_public_id_and_source_sha"],
        }, ensure_ascii=False), flush=True)
    after = sha256(args.sqlite)
    if before != after:
        # WAL checkpointing can modify the physical .sqlite3 file despite a
        # fully consistent read transaction and unchanged gallery records.
        # Recheck the actual group+asset mapping instead of discarding every
        # previously validated studio and causing another 92-site scan.
        if logical_groups_digest(local_groups(args.sqlite)) != group_logical_sha256:
            raise ValueError(
                "Telegram gallery or member source changed during mapping; "
                "do not trust batch"
            )
    if len(all_results) != sum(s["local_groups"] for s in per_studio):
        raise ValueError("source reconciliation lost groups")
    statuses = dict(sorted(collections.Counter(
        r["status"] for r in all_results
    ).items()))
    now = utc_now().isoformat()
    manifest = {
        "schema": SCHEMA, "created_at_utc": now,
        "source": ORIGIN, "source_route": ENDPOINT,
        "public_studios_in_directory": len(listing),
        "local_studios_total": len(local_studios),
        "studios_processed": len(per_studio),
        "local_groups_total": len(groups),
        "groups_processed": len(all_results),
        "statuses": statuses,
        "verified_public_ids": statuses.get("verified_public_id_and_source_sha", 0),
        "public_only_models": len(public_only),
        "public_only_studios": sorted(set(listing) - local_studios),
        "missing_with_same_title_visible_candidate": sum(
            bool(x["same_title_visible_public_id_candidates"])
            for x in all_results
        ),
        "same_title_collision_is_not_verified_identity": True,
        "cache_studios_reused": count_cache,
        "public_list_pages_fetched": count_pages,
        "telegram_sqlite_sha256": after,
        "telegram_groups_logical_sha256": group_logical_sha256,
        "sqlite_physical_bytes_changed_without_group_drift": before != after,
        "public_provisional_models_are_not_approved": True,
        "all_tags_and_characters_require_separate_editorial_proof": True,
        "no_legacy_catalog": True, "no_sqlite_writes": True,
        "no_supabase_writes": True, "no_d1_writes": True,
        "no_worker_changes": True, "no_model_links_or_tags_applied": True,
    }
    atomic_text(args.out / "telegram-public-model-map-private.jsonl",
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n"
                for row in all_results))
    atomic_text(args.out / "telegram-public-only-private.jsonl",
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n"
                for row in public_only))
    csvpath = args.out / "telegram-public-map-per-studio-private.csv"
    temp = csvpath.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=STUDIO_COLS)
        writer.writeheader()
        writer.writerows(per_studio)
    temp.replace(csvpath)
    manifest["public_map_jsonl_sha256"] = sha256(
        args.out / "telegram-public-model-map-private.jsonl"
    )
    atomic_text(args.out / "telegram-public-map-manifest.json",
                json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print("MANIFEST " + json.dumps(manifest, ensure_ascii=False), flush=True)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite", required=True, type=pathlib.Path)
    parser.add_argument("--source-root", required=True, type=pathlib.Path)
    parser.add_argument("--out", required=True, type=pathlib.Path)
    parser.add_argument("--only-studio", action="append",
                        help="Exact Telegram studio, repeatable; defaults to ALL")
    parser.add_argument("--cache-age-seconds", type=int, default=1800)
    args = parser.parse_args()
    if args.cache_age_seconds < 0 or args.cache_age_seconds > 86400:
        parser.error("cache-age-seconds must be between 0 and 86400")
    run(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
