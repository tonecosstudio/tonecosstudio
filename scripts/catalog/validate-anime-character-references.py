#!/usr/bin/env python3
"""Batch-read Naruto and Dragon Ball independent character references.

Consumes TONART's EXISTING taxonomy candidates. Writes private evidence
proposals only, never Supabase, D1, models, R2 or the live curation SQLite.
Run with OrdaX MCP computer_process_start for checkpointed supervision.
"""
from __future__ import annotations
import argparse
import collections
import csv
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import sys
import time
import urllib.request
from datetime import datetime, timezone
from urllib.parse import quote

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "tonart_existing_pokemon_batch", HERE / "validate-existing-pokemon-taxonomy.py"
)
shared = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shared)
normalize, atomic_json, jsonl = shared.normalize, shared.atomic_json, shared.jsonl
UA = "TONART-read-only-catalog-references/1.0"
# Regional/transliteration names which must converge to one identity/alias.
# Do not create new primary character IDs until franchise-wide alias review.
ALIAS_REVIEW = {"dragon-ball": {"freezer", "vegetto"}}
SOURCES = {
    "dragon-ball": {
        "label": "Dragon Ball",
        "url": "https://dragonball-api.com/api/characters",
        "list_key": "items",
        "page_size": 100,
        "max_pages": 2,
        "source_type": "independent_community_api_not_official",
        "detail_base": "https://dragonball-api.com/api/characters",
    },
    "naruto": {
        "label": "Naruto",
        "url": "https://dattebayo-api.onrender.com/characters",
        "list_key": "characters",
        "page_size": 100,
        "max_pages": 30,
        "source_type": "independent_community_api_not_official",
        "detail_base": "https://dattebayo-api.onrender.com/characters",
    },
}


def http_json(url: str, max_bytes: int = 2_000_000) -> tuple[dict, bytes]:
    if not url.startswith(("https://dragonball-api.com/", "https://dattebayo-api.onrender.com/")):
        raise ValueError("unexpected character-reference origin")
    request = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=28) as response:
                raw = response.read(max_bytes + 1)
                if len(raw) > max_bytes or not raw:
                    raise ValueError("character API bounded-size violation")
                document = json.loads(raw)
                if not isinstance(document, dict):
                    raise ValueError("invalid character API JSON root")
                return document, raw
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(min(2 ** attempt, 4))
    raise RuntimeError("unreachable reference")


def collect_reference(source_key: str, stage) -> tuple[dict, dict]:
    config = SOURCES[source_key]
    records = {}
    name_keys: dict[str, set[int]] = collections.defaultdict(set)
    digest = hashlib.sha256()
    total = None
    page_size = config["page_size"]
    pages_read = 0
    for page in range(1, config["max_pages"] + 1):
        url = config["url"] + f"?page={page}&limit={page_size}"
        payload, raw = http_json(url)
        digest.update(raw)
        pages_read += 1
        items = payload.get(config["list_key"])
        if not isinstance(items, list) or not items:
            raise ValueError("missing character rows before complete pagination")
        if source_key == "dragon-ball":
            metadata = payload.get("meta") or {}
            if not isinstance(metadata, dict):
                raise ValueError("missing Dragon Ball pagination metadata")
            expected_total = metadata.get("totalItems")
            page_count = metadata.get("totalPages")
            returned = metadata.get("currentPage")
            if not isinstance(expected_total, int) or not isinstance(page_count, int):
                raise ValueError("incomplete Dragon Ball pagination")
        else:
            expected_total = payload.get("total")
            returned = payload.get("currentPage")
            if not isinstance(expected_total, int) or expected_total <= 0:
                raise ValueError("missing Naruto total")
            page_count = (expected_total + page_size - 1) // page_size
        if returned != page or page_count > config["max_pages"]:
            raise ValueError("pagination inconsistencies or unsupported total size")
        if total is None:
            total = expected_total
        elif total != expected_total:
            raise ValueError("character database changed during batch")
        for row in items:
            if not isinstance(row, dict):
                raise ValueError("malformed character record")
            char_id, name = row.get("id"), row.get("name")
            if type(char_id) is not int or char_id < (0 if source_key == "naruto" else 1) or not isinstance(name, str):
                raise ValueError("invalid character identity")
            name = name.strip()
            if not name or len(name) > 160 or char_id in records:
                raise ValueError("empty, duplicate or overly long character")
            records[char_id] = {"id": char_id, "name": name}
            name_keys[normalize(name)].add(char_id)
        stage("reading_reference_page", franchise=config["label"],
              page=page, pages=page_count, observed=len(records))
        if page >= page_count:
            break
        time.sleep(0.2)
    if len(records) != total:
        raise ValueError("incomplete or inconsistent character index")
    idx = {
        name_key: records[next(iter(ids))]
        for name_key, ids in name_keys.items()
        if name_key and len(ids) == 1
    }
    reference = {
        "franchise": config["label"],
        "source_type": config["source_type"],
        "source_url": config["url"],
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "pages_read": pages_read, "characters_count": len(records),
        "source_sha256": digest.hexdigest(),
        "ambiguous_names": sum(len(x) > 1 for x in name_keys.values()),
    }
    return idx, reference


def evaluate(queue: pathlib.Path, indexes: dict, sources: dict):
    exact = {}
    held = []
    stats = collections.Counter()
    with queue.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"franchise_candidate_key", "display_name_candidate",
                    "review_flags", "group_count"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("missing TONART canonical candidate columns")
        for row in reader:
            world_key = normalize(row["franchise_candidate_key"])
            if world_key not in indexes:
                continue
            stats["candidates_" + world_key] += 1
            name = row["display_name_candidate"].strip()
            flags = row["review_flags"].strip()
            name_key = normalize(name)
            matched = indexes[world_key].get(name_key)
            alias_sensitive = name_key in ALIAS_REVIEW.get(world_key, set())
            if matched is None or flags or alias_sensitive:
                reason = ("source_locale_alias_review" if alias_sensitive else
                          "editorial_review_flags" if flags else
                          "not_exact_known_character")
                held.append({
                    "franchise": SOURCES[world_key]["label"], "candidate": name,
                    "reason": reason, "flags": flags, "new_identity_id": None,
                })
                continue
            key = (world_key, matched["id"])
            if key in exact:
                raise ValueError("multiple candidate titles map to one source ID; review alias")
            reference = sources[world_key]
            exact[key] = {
                "franchise": SOURCES[world_key]["label"],
                "character_name": matched["name"],
                "source_character_id": matched["id"],
                "source_character_url": SOURCES[world_key]["detail_base"] +
                                         "/" + str(matched["id"]),
                "source_index_sha256": reference["source_sha256"],
                "source_fetched_at_utc": reference["fetched_at_utc"],
                "source_type": reference["source_type"],
                "candidate_title": name, "group_count": int(row["group_count"] or 0),
                "editorial_state": "independent_exact_name_reference",
                "private_only": True, "model_links": [],
                "approved_for_publication": False,
            }
    verified = [exact[k] for k in sorted(exact)]
    for world in indexes:
        stats["matches_" + world] = sum(normalize(r["franchise"]) == world
                                       for r in verified)
        stats["held_" + world] = sum(normalize(r["franchise"]) == world
                                    for r in held)
    stats["total_matches"] = len(verified)
    stats["total_held"] = len(held)
    return verified, held, dict(stats)


def run(args):
    args.out.mkdir(parents=True, exist_ok=True)
    scope = "" if args.only == "all" else "-" + args.only
    lock = args.out / ("anime-sources-supervised" + scope + ".lock")
    handle = lock.open("a+b")
    if os.name == "nt":
        import msvcrt
        handle.seek(0)
        try:
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            handle.close()
            print(json.dumps({"status": "already_running"}), flush=True)
            return 3
    else:
        import fcntl
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            handle.close()
            print(json.dumps({"status": "already_running"}), flush=True)
            return 3
    state_path = args.out / ("anime-sources-supervised" + scope + ".json")
    state = {
        "mission_id": "tonart-anime-character-index-batch-20261122",
        "process": "supervised_read_only",
        "stage": "starting",
        "status": "running",
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "model_links_modified": False, "public_catalog_modified": False,
        "editorial_db_modified": False,
    }
    def stage(label, **details):
        state.update({"stage": label, "last_updated_utc": datetime.now(timezone.utc).isoformat(),
                      **details})
        atomic_json(state_path, state)
        print(json.dumps({"stage": label, **details}, ensure_ascii=False), flush=True)
    try:
        stage("source_collection_started")
        indexes, sources = {}, {}
        selected = list(SOURCES) if args.only == "all" else [args.only]
        for key in selected:
            idx, source = collect_reference(key, stage)
            indexes[key] = idx
            sources[key] = source
            stage("source_complete", franchise=source["franchise"],
                  indexed=source["characters_count"])
        verified, held, counts = evaluate(args.queue, indexes, sources)
        stage("candidate_crosscheck_complete", **counts)
        jsonl(args.out / ("anime-identidades-exatas" + scope + "-privado.jsonl"), verified)
        jsonl(args.out / ("anime-identidades-para-revisao" + scope + "-privado.jsonl"), held)
        atomic_json(args.out / ("anime-sources-manifest" + scope + ".json"), {
            "schema": "tonart.taxonomy.anime-reference/1",
            "sources": sources, "candidate_sha256": shared.sha256(args.queue.read_bytes()),
            "stats": counts, "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "no_canonical_writes": True,
            "warning": "Independent community sources are NOT official IP-holder sources. "
                       "Exact roster matches do NOT prove artwork identity or rights.",
        })
        state["status"] = "completed"
        stage("handoff", total_verified=len(verified), total_retained=len(held))
        return 0
    except Exception as e:
        state.update({"status": "failed", "error": f"{type(e).__name__}: {str(e)[:250]}"})
        atomic_json(state_path, state)
        raise
    finally:
        try:
            if os.name == "nt":
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        finally:
            handle.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--queue", type=pathlib.Path, required=True)
    ap.add_argument("--out", type=pathlib.Path, required=True)
    ap.add_argument("--only", choices=["all", *SOURCES.keys()], default="all")
    sys.exit(run(ap.parse_args()))
