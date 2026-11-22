#!/usr/bin/env python3
"""Inventory candidate TONART taxonomy without writing to D1, R2, Supabase or live SQLite.

The output is a review queue, not a second SSOT. D1 categories/franchises remain
canonical; private model-group and proposal titles do not prove character identity.
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse


def clean(value: object) -> str:
    return " ".join(str(value or "").strip().split())


def key(value: object) -> str:
    text = unicodedata.normalize("NFKD", clean(value).casefold())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def slug(value: object) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", key(value))).strip("-")


def preferred(counter: collections.Counter[str]) -> str:
    # More evidence first; stable ordering makes the report reproducible.
    return sorted(counter, key=lambda s: (-counter[s], len(s), s.casefold(), s))[0]


def rows_as_jsonl(path: Path, rows: list[dict]) -> None:
    text = "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows)
    path.write_text(text, encoding="utf-8", newline="\n")


def is_placeholder(name: str) -> bool:
    return bool(re.search(
        r"^(?:modelo\s+sem\s+nome(?:\s*#\d+)?|sem\s+(?:titulo|título)|"
        r"unknown|unnamed|untitled|a\s+identificar|model\s*#?\d+)$",
        clean(name), re.IGNORECASE
    ))


def title_needs_review(name: str) -> list[str]:
    text = clean(name)
    reasons = []
    if is_placeholder(text):
        reasons.append("placeholder")
    if re.search(r"\s+(?:e|and|vs\.?|versus)\s+", text, re.IGNORECASE):
        reasons.append("potential_multiple_characters")
    if re.search(
        r"\b(?:extra\s+hands?|busto|bust|mini|chibi|diorama|base|head|"
        r"variant|vers[aã]o|armadura|bikini|swimsuit|summer|statue|figure)\b", text, re.IGNORECASE
    ):
        reasons.append("possibly_model_variant_not_character")
    return reasons


def universe_review_flags(name: str) -> list[str]:
    """A crossover universe label is a review problem, not a new franchise."""
    label = clean(name)
    flags = []
    if re.search(r"\S\s*/\s*\S", label):
        flags.append("possible_multiple_franchises")
    return flags


def evidence_review_flags(title: str, urls: set[str], evidence_types: collections.Counter) -> list[str]:
    """An approved *sculpture name* does not prove a character identity.

    Weak source signals are warnings for the existing editorial review. No
    guesses from commercial URLs are written as character names or aliases.
    """
    flags = []
    if evidence_types and set(evidence_types) <= {"telegram_caption", "gallery_name_inherited", ""}:
        flags.append("name_inherited_or_caption_only")
    label_slug = slug(title)
    if urls and label_slug:
        paths = []
        for url in sorted(urls):
            try:
                parsed = urlparse(url)
                if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                    continue
                parts = [unquote(p) for p in parsed.path.strip("/").split("/") if p]
                # Some editorial references end in a numeric post ID, e.g.
                # /t/cammy-3d-print-figure/406980; inspect the meaningful title.
                while parts and parts[-1].isdigit():
                    parts.pop()
                if parts:
                    paths.append(slug(parts[-1]))
            except ValueError:
                continue
        if paths and all(label_slug not in path for path in paths):
            flags.append("source_link_does_not_contain_character_title")
        # "Frosty" -> "frosty-wampa-3d-printing..." and
        # "Cancelled" -> "cancelled-cara-dune-...": do NOT create a character
        # called Frosty/Cancelled or infer Wampa/Cara Dune automatically.
        for path in paths:
            prefix = label_slug + "-"
            if path.startswith(prefix):
                rest = path[len(prefix):].split("-")
                boilerplate = {
                    "3d", "print", "printing", "miniature", "stl", "figure",
                    "figures", "statue", "model", "art", "abe3d", "sculpture",
                    "sculpt", "mini", "resin", "collectible", "bust", "3",
                }
                if any(token and token not in boilerplate for token in rest):
                    flags.append("source_product_title_has_additional_terms")
                    break
    return flags


def inventory(db_path: Path, legacy_csv: Path | None, telegram_plan: Path | None):
    # SQLite URI mode=ro prevents any in-place mutation of the live curation db.
    db = sqlite3.connect(db_path.resolve().as_uri() + "?mode=ro", uri=True, timeout=5)
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    worlds: dict[str, dict] = {}
    characters: dict[tuple[str, str], dict] = {}
    sources = collections.Counter()
    naming_status = collections.Counter()

    def world_entry(name: object) -> dict | None:
        label = clean(name)
        if not label or is_placeholder(label):
            return None
        k = key(label)
        if not k:
            return None
        if k not in worlds:
            worlds[k] = {
                "variants": collections.Counter(), "groups": set(),
                "proposal_messages": set(), "confirmed_name_messages": set(),
                "franchise_id_hints": collections.Counter()
            }
        worlds[k]["variants"][label] += 1
        return worlds[k]

    def char_entry(universe: object, title: object) -> dict | None:
        world = clean(universe)
        text = clean(title)
        if not world or not text or is_placeholder(text):
            return None
        wk, ck = key(world), key(text)
        if not wk or not ck:
            return None
        cid = (wk, ck)
        if cid not in characters:
            characters[cid] = {
                "spellings": collections.Counter(),
                "groups": set(), "studios": set(),
                "proposal_messages": set(), "confirmed_name_messages": set(),
                "group_states": collections.Counter(),
                "confirmed_evidence_types": collections.Counter(),
                "confirmed_source_urls": set(),
            }
        characters[cid]["spellings"][text] += 1
        return characters[cid]

    try:
        for group_id, studio, title, universe, state in db.execute(
            "SELECT group_key,studio,title,universe,state FROM model_groups"
        ):
            w = world_entry(universe)
            if w is None:
                sources["groups_without_universe"] += 1
                continue
            w["groups"].add(str(group_id))
            sources["groups_with_universe"] += 1
            c = char_entry(universe, title)
            if c:
                c["groups"].add(str(group_id))
                if clean(studio):
                    c["studios"].add(clean(studio))
                c["group_states"][str(state or "unknown")] += 1
            else:
                sources["groups_without_usable_title"] += 1

        for message_id, studio, title, universe, status, evidence_type, official_url in db.execute(
            "SELECT message_id,studio,title,universe,status,evidence_type,official_url FROM name_proposals"
        ):
            naming_status[str(status or "unknown")] += 1
            w = world_entry(universe)
            if w is None:
                sources["proposal_rows_without_universe"] += 1
                continue
            mid = str(message_id)
            w["proposal_messages"].add(mid)
            sources["proposals_with_universe"] += 1
            if status == "confirmado":
                w["confirmed_name_messages"].add(mid)
            c = char_entry(universe, title)
            if c:
                c["proposal_messages"].add(mid)
                if clean(studio):
                    c["studios"].add(clean(studio))
                if status == "confirmado":
                    c["confirmed_name_messages"].add(mid)
                    if clean(evidence_type):
                        c["confirmed_evidence_types"][clean(evidence_type)] += 1
                    if clean(official_url):
                        c["confirmed_source_urls"].add(clean(official_url))

        db.execute("COMMIT")
    finally:
        db.close()

    historic_plan_records = 0
    if telegram_plan:
        with telegram_plan.open(encoding="utf-8-sig") as f:
            for line in f:
                if not line.strip():
                    continue
                item = json.loads(line)
                payload = item.get("import_manifest") or {}
                w = world_entry(payload.get("universe"))
                if not w:
                    continue
                franchise_id = payload.get("franchiseId")
                if isinstance(franchise_id, int) and franchise_id > 0:
                    w["franchise_id_hints"][franchise_id] += 1
                historic_plan_records += 1

    world_records = []
    alias_records = []
    for wk, w in worlds.items():
        label = preferred(w["variants"])
        variants = sorted(w["variants"], key=lambda x: (x.casefold(), x))
        hints = sorted(w["franchise_id_hints"])
        if len(variants) > 1:
            alias_records.append({
                "type": "franchise_spelling",
                "canonical_candidate": label,
                "alternative_spellings": [s for s in variants if s != label],
                "decision": "review_not_automatically_applied",
                "normalization": "accent_and_case_only",
            })
        world_records.append({
            "kind": "franchise_candidate", "candidate_key": wk,
            "label_candidate": label, "slug_candidate": slug(label),
            "spellings": variants, "group_count": len(w["groups"]),
            "proposal_message_count": len(w["proposal_messages"]),
            "confirmed_naming_messages": len(w["confirmed_name_messages"]),
            "historic_d1_franchise_id_hint": hints[0] if len(hints) == 1 else None,
            "hint_ambiguous": len(hints) > 1,
            "source": "local_curation_proposals_plus_historic_import_hints",
            "review_state": "requires_d1_identity_reconciliation",
            "category": None,
        })
    world_records.sort(key=lambda x: (-x["group_count"], x["candidate_key"]))
    alias_records.sort(key=lambda x: (x["canonical_candidate"].casefold(), x["canonical_candidate"]))

    # Cross-check the historical import IDs and future slug keys *across* candidates.
    # Matching a previous plan is evidence for review, not verification of live D1.
    historic_ids = collections.defaultdict(list)
    proposed_slugs = collections.defaultdict(list)
    for world in world_records:
        fid = world["historic_d1_franchise_id_hint"]
        if fid is not None:
            historic_ids[fid].append(world)
        if world["slug_candidate"]:
            proposed_slugs[world["slug_candidate"]].append(world)
    collisions = []
    for collision_kind, index in (("historic_franchise_id", historic_ids), ("candidate_slug", proposed_slugs)):
        for value, entries in sorted(index.items(), key=lambda pair: str(pair[0])):
            if len(entries) > 1:
                collisions.append({
                    "collision_kind": collision_kind, "value": value,
                    "candidate_keys": sorted(x["candidate_key"] for x in entries),
                    "names": sorted(x["label_candidate"] for x in entries),
                    "decision": "hold_for_editorial_and_live_d1_reconciliation",
                })
    for world in world_records:
        fid = world["historic_d1_franchise_id_hint"]
        flags = universe_review_flags(world["label_candidate"])
        if world["hint_ambiguous"]:
            flags.append("multiple_ids_for_one_universe")
        if fid is not None and len(historic_ids[fid]) > 1:
            flags.append("id_shared_by_multiple_spellings")
        if len(proposed_slugs[world["slug_candidate"]]) > 1:
            flags.append("slug_collision")
        world["historic_hint_observations"] = sum(
            worlds[world["candidate_key"]]["franchise_id_hints"].values()
        )
        world["review_flags"] = flags
        world["reconciliation_status"] = (
            "conflict_requires_review" if flags else
            "historic_id_candidate_validate_in_live_d1" if fid is not None else
            "missing_historic_id_lookup_in_live_d1"
        )

    character_records = []
    for (wk, ck), c in characters.items():
        label = preferred(c["spellings"])
        flags = title_needs_review(label)
        flags.extend(evidence_review_flags(
            label, c["confirmed_source_urls"], c["confirmed_evidence_types"]
        ))
        # A title may denote a sculpture, a pair, or a variant; never auto-confirm.
        character_records.append({
            "kind": "character_candidate", "franchise_candidate_key": wk,
            "candidate_key": wk + "::" + ck, "display_name_candidate": label,
            "slug_candidate": slug(label), "spellings": sorted(c["spellings"]),
            "group_count": len(c["groups"]), "studio_count": len(c["studios"]),
            "proposal_message_count": len(c["proposal_messages"]),
            "confirmed_naming_messages": len(c["confirmed_name_messages"]),
            "group_states": dict(sorted(c["group_states"].items())),
            "review_flags": sorted(set(flags)),
            "confirmed_evidence_types": dict(sorted(c["confirmed_evidence_types"].items())),
            "confirmed_source_url_examples": sorted(c["confirmed_source_urls"])[:3],
            "review_state": "candidate_character_unverified",
            "identity_id": None,
            "historical_franchise_id_hint": next(
                (w["historic_d1_franchise_id_hint"] for w in world_records
                 if w["candidate_key"] == wk and w["reconciliation_status"] ==
                 "historic_id_candidate_validate_in_live_d1"), None
            ),
            "review_priority": (
                "P1_confirmed_name_evidence" if c["confirmed_name_messages"] and not flags
                else "P2_repeated_across_studios" if len(c["studios"]) >= 2 and not flags
                else "P3_review_flags_or_low_evidence"
            ),
        })
    character_records.sort(
        key=lambda x: (-x["group_count"], -x["confirmed_naming_messages"], x["candidate_key"])
    )

    historic_models = {}
    legacy_review = []
    if legacy_csv:
        with legacy_csv.open(encoding="utf-8-sig", newline="") as f:
            for model in csv.DictReader(f):
                mid, name = clean(model.get("model_id")), clean(model.get("model"))
                if mid and mid not in historic_models:
                    historic_models[mid] = name
        name_worlds = collections.defaultdict(set)
        for (wk, ck) in characters:
            name_worlds[ck].add(wk)
        for model_id, name in sorted(historic_models.items()):
            matches = sorted(name_worlds.get(key(name), ()))
            legacy_review.append({
                "model_id": model_id, "name_at_snapshot": name,
                "matched_world_candidates": matches,
                "match_method": "exact_normalized_title_only",
                "review_state": "not_linked_requires_franchise_confirmation",
                "identity_id": None,
                "source": "historic_legacy_snapshot_not_live_d1",
            })

    summary = {
        "schema": "tonart.catalog.taxonomy-inventory/1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only_candidate_inventory",
        "source_db": str(db_path),
        "source_db_bytes": db_path.stat().st_size,
        "legacy_snapshot": str(legacy_csv) if legacy_csv else None,
        "historic_telegram_plan": str(telegram_plan) if telegram_plan else None,
        "d1_consulted": False, "supabase_modified": False, "d1_modified": False,
        "r2_modified": False, "model_links_modified": False,
        "no_canonical_entities_inserted": True,
        "universe_candidates": len(world_records),
        "universe_spelling_alias_groups": len(alias_records),
        "candidate_character_titles": len(character_records),
        "candidate_character_titles_with_review_flags": sum(bool(x["review_flags"]) for x in character_records),
        "naming_confirmed_universe_candidates": sum(x["confirmed_naming_messages"] > 0 for x in character_records),
        "historic_legacy_unique_models": len(historic_models),
        "historic_legacy_exact_name_matches": sum(bool(x["matched_world_candidates"]) for x in legacy_review),
        "historic_legacy_ambiguous_names": sum(len(x["matched_world_candidates"]) > 1 for x in legacy_review),
        "historic_plan_rows_with_universe": historic_plan_records,
        "historic_world_hints_ambiguous": sum(x["hint_ambiguous"] for x in world_records),
        "universe_candidates_with_historic_id_hint": sum(
            x["historic_d1_franchise_id_hint"] is not None for x in world_records
        ),
        "distinct_historic_d1_id_hints": len(historic_ids),
        "universe_candidates_without_historic_id_hint": sum(
            x["historic_d1_franchise_id_hint"] is None for x in world_records
        ),
        "universe_collision_groups": len(collisions),
        "universe_historic_id_shared_groups": sum(
            x["collision_kind"] == "historic_franchise_id" for x in collisions
        ),
        "universe_slug_collision_groups": sum(
            x["collision_kind"] == "candidate_slug" for x in collisions
        ),
        "universe_potential_crossovers": sum(
            "possible_multiple_franchises" in x["review_flags"] for x in world_records
        ),
        "candidate_characters_p1_confirmed_name_evidence": sum(
            x["review_priority"] == "P1_confirmed_name_evidence" for x in character_records
        ),
        "candidate_characters_p2_repeated_across_studios": sum(
            x["review_priority"] == "P2_repeated_across_studios" for x in character_records
        ),
        "source_counts": dict(sorted(sources.items())),
        "name_proposal_status_counts": dict(sorted(naming_status.items())),
        "warning": "Curation group titles and naming proposals are NOT approved character identities; existing D1 IDs and current model visibility must be rechecked before linking.",
    }
    return summary, world_records, alias_records, character_records, legacy_review



SNAPSHOT_SCHEMA = "tonart.catalog.d1-taxonomy-snapshot/1"
FRANCHISE_SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def load_current_d1_taxonomy(path: Path):
    """Fail-closed validation for a complete, recent Cloudflare D1 taxonomy export."""
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("schema") != SNAPSHOT_SCHEMA or data.get("database") != "tonecos-catalogo":
        raise ValueError("invalid D1 snapshot schema/database")
    raw_time = data.get("exported_at_utc")
    if not isinstance(raw_time, str):
        raise ValueError("D1 snapshot missing timestamp")
    try:
        dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("malformed timestamp") from exc
    if dt.tzinfo is None or dt.utcoffset().total_seconds() != 0:
        raise ValueError("D1 snapshot requires UTC timestamp")
    seconds = (datetime.now(timezone.utc) - dt).total_seconds()
    if seconds < -300 or seconds > 86400:
        raise ValueError("snapshot too old or in future")
    categories, franchises = data.get("categories"), data.get("franchises")
    if not isinstance(categories, list) or not isinstance(franchises, list):
        raise ValueError("missing complete D1 taxonomy arrays")
    if not categories or not franchises or data.get("export_completed") is not True:
        raise ValueError("incomplete D1 taxonomy export")
    if data.get("categories_total") != len(categories) or data.get("franchises_total") != len(franchises):
        raise ValueError("truncated D1 taxonomy export")
    cats, frs = {}, {}
    for row in categories:
        if not isinstance(row, dict) or type(row.get("id")) is not int or row["id"] <= 0:
            raise ValueError("invalid D1 category ID")
        if row["id"] in cats or not clean(row.get("name")):
            raise ValueError("duplicate or unnamed D1 category")
        if not isinstance(row.get("slug"), str) or not FRANCHISE_SLUG_RE.fullmatch(row["slug"]):
            raise ValueError("invalid D1 category slug")
        cats[row["id"]] = row
    for row in franchises:
        if not isinstance(row, dict) or type(row.get("id")) is not int or row["id"] <= 0:
            raise ValueError("invalid D1 franchise ID")
        if row["id"] in frs or type(row.get("category_id")) is not int or row["category_id"] not in cats:
            raise ValueError("duplicate franchise or missing category")
        if not clean(row.get("name")) or not isinstance(row.get("slug"), str):
            raise ValueError("invalid franchise name/slug")
        if not FRANCHISE_SLUG_RE.fullmatch(row["slug"]):
            raise ValueError("invalid franchise slug")
        frs[row["id"]] = row
    names, slugs = collections.defaultdict(set), collections.defaultdict(set)
    for row in frs.values():
        names[key(row["name"])].add(row["id"])
        slugs[row["slug"]].add(row["id"])
    return data, cats, frs, names, slugs


def reconcile_current_d1(worlds: list[dict], characters: list[dict], snapshot_path: Path):
    """Read-only mapping; never creates an ID, alias, tag or model association."""
    snapshot, categories, franchises, names, slugs = load_current_d1_taxonomy(snapshot_path)
    reconciled, matched_by_world = [], {}
    for world in worlds:
        old_id = world.get("historic_d1_franchise_id_hint")
        possible = names.get(key(world["label_candidate"]), set()) | slugs.get(world["slug_candidate"], set())
        existing = sorted(possible)
        flags = world.get("review_flags") or []
        proposed_id, reason = None, ""
        if "possible_multiple_franchises" in flags:
            status = "hold_crossover"
        elif world.get("hint_ambiguous"):
            status = "hold_multiple_historical_ids"
        elif old_id is not None:
            if old_id not in franchises:
                status = "hold_historical_id_missing"
            elif old_id not in possible:
                status = "hold_historical_id_name_mismatch"
            elif len(existing) != 1:
                status = "hold_multiple_live_candidates"
            else:
                proposed_id = old_id
                status = "hold_alias_collision" if "slug_collision" in flags or "id_shared_by_multiple_spellings" in flags else "candidate_existing_d1_id"
        elif len(existing) == 1:
            proposed_id = existing[0]
            status = "hold_alias_collision" if "slug_collision" in flags else "candidate_existing_d1_id"
        elif len(existing) > 1:
            status = "hold_multiple_live_candidates"
        else:
            status = "new_franchise_requires_editorial_review"
        live = franchises.get(proposed_id) if proposed_id is not None else None
        row = {
            "candidate_key": world["candidate_key"],
            "label_candidate": world["label_candidate"],
            "historic_id_hint": old_id,
            "matched_d1_franchise_id": proposed_id,
            "matched_d1_category_id": live["category_id"] if live else None,
            "matched_d1_category": categories[live["category_id"]]["name"] if live else None,
            "matched_d1_franchise": live["name"] if live else None,
            "match_status": status, "review_flags": flags,
            "approved": False, "model_links_created": 0
        }
        reconciled.append(row)
        matched_by_world[world["candidate_key"]] = row
    proposed_characters = []
    for ch in characters:
        world = matched_by_world.get(ch["franchise_candidate_key"])
        trusted = world is not None and world["match_status"] == "candidate_existing_d1_id"
        editorial = ch.get("review_priority") == "P1_confirmed_name_evidence" and not ch.get("review_flags")
        proposed_characters.append({
            "candidate_key": ch["candidate_key"],
            "label_candidate": ch["display_name_candidate"],
            "d1_franchise_id_candidate": world["matched_d1_franchise_id"] if trusted else None,
            "eligible_for_manual_editorial_review": bool(trusted and editorial),
            "canonical_character_id": None, "approved": False,
            "model_links_created": 0
        })
    return snapshot, reconciled, proposed_characters



def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curation-db", type=Path, required=True)
    parser.add_argument("--legacy-inventory", type=Path)
    parser.add_argument("--telegram-plan", type=Path)
    parser.add_argument("--d1-taxonomy-snapshot", type=Path,
                        help="complete fresh Cloudflare D1 JSON export; never mutates D1")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not args.curation_db.is_file():
        parser.error("curation DB does not exist")
    for file in (args.legacy_inventory, args.telegram_plan):
        if file and not file.is_file():
            parser.error("source file not found: " + str(file))
    args.out.mkdir(parents=True, exist_ok=True)
    summary, worlds, aliases, characters, legacy = inventory(
        args.curation_db, args.legacy_inventory, args.telegram_plan
    )
    # Check the full current snapshot BEFORE replacing any derived reports.
    # An expired or incomplete snapshot must leave earlier reports untouched.
    d1_result = (
        reconcile_current_d1(worlds, characters, args.d1_taxonomy_snapshot)
        if args.d1_taxonomy_snapshot else None
    )
    rows_as_jsonl(args.out / "universos-candidatos.jsonl", worlds)
    # Review collision rows contain only candidate keys, not automatic aliases.
    collision_by_id = collections.defaultdict(list)
    collision_by_slug = collections.defaultdict(list)
    for world in worlds:
        if world["historic_d1_franchise_id_hint"] is not None:
            collision_by_id[world["historic_d1_franchise_id_hint"]].append(world)
        collision_by_slug[world["slug_candidate"]].append(world)
    collisions = []
    for kind, index in (("historic_franchise_id", collision_by_id),
                        ("candidate_slug", collision_by_slug)):
        for value, entries in sorted(index.items(), key=lambda pair: str(pair[0])):
            if len(entries) > 1:
                collisions.append({
                    "collision_kind": kind, "value": value,
                    "candidate_keys": sorted(x["candidate_key"] for x in entries),
                    "names": sorted(x["label_candidate"] for x in entries),
                    "decision": "hold_for_editorial_and_live_d1_reconciliation",
                })
    rows_as_jsonl(args.out / "conflitos-universos.jsonl", collisions)
    with (args.out / "fila-reconciliacao-franquias.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as file:
        fields = [
            "candidate_key", "label_candidate", "slug_candidate",
            "historic_d1_franchise_id_hint", "historic_hint_observations",
            "group_count", "confirmed_naming_messages",
            "reconciliation_status", "review_flags"
        ]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for world in sorted(worlds, key=lambda x: (
            x["reconciliation_status"] != "historic_id_candidate_validate_in_live_d1",
            -x["group_count"], x["candidate_key"])):
            writer.writerow({
                f: (";".join(world[f]) if f == "review_flags" else world[f])
                for f in fields
            })
    rows_as_jsonl(args.out / "aliases-para-revisao.jsonl", aliases)
    rows_as_jsonl(args.out / "personagens-candidatos.jsonl", characters)
    rows_as_jsonl(args.out / "catalogo-antigo-sem-vinculos.jsonl", legacy)
    if d1_result:
        snapshot, d1_worlds, d1_characters = d1_result
        rows_as_jsonl(args.out / "franquias-preflight-d1.jsonl", d1_worlds)
        rows_as_jsonl(args.out / "personagens-preflight-d1.jsonl", d1_characters)
        with (args.out / "fila-validacao-d1-franquias.csv").open(
            "w", encoding="utf-8-sig", newline=""
        ) as file:
            fields = [
                "candidate_key", "label_candidate", "historic_id_hint",
                "matched_d1_franchise_id", "matched_d1_category",
                "matched_d1_franchise", "match_status", "review_flags", "approved"
            ]
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            for row in d1_worlds:
                writer.writerow({
                    f: ";".join(row[f]) if f == "review_flags" else row[f]
                    for f in fields
                })
        summary["d1_snapshot_checked"] = True
        summary["d1_snapshot_exported_at_utc"] = snapshot["exported_at_utc"]
        summary["d1_franchise_rows"] = snapshot["franchises_total"]
        summary["d1_existing_id_candidates"] = sum(
            x["match_status"] == "candidate_existing_d1_id" for x in d1_worlds
        )
        summary["d1_character_manual_review_candidates"] = sum(
            x["eligible_for_manual_editorial_review"] for x in d1_characters
        )
    else:
        summary["d1_snapshot_checked"] = False
        # Avoid accidentally presenting old preflight files as a fresh D1 match.
        for filename in ("franquias-preflight-d1.jsonl",
                         "personagens-preflight-d1.jsonl",
                         "fila-validacao-d1-franquias.csv"):
            stale = args.out / filename
            if stale.exists():
                stale.unlink()
    # Spreadsheet-friendly review queue; no IDs are approved or written back.
    with (args.out / "fila-revisao-personagens.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as file:
        fields = [
            "franchise_candidate_key", "display_name_candidate",
            "group_count", "studio_count", "confirmed_naming_messages",
            "review_flags", "review_state", "historical_franchise_id_hint",
            "review_priority", "confirmed_evidence_types", "confirmed_source_url_examples"
        ]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for item in sorted(characters, key=lambda row: (
            {"P1_confirmed_name_evidence": 0, "P2_repeated_across_studios": 1,
             "P3_review_flags_or_low_evidence": 2}[row["review_priority"]],
            -row["group_count"], -row["studio_count"], row["candidate_key"]
        )):
            writer.writerow({
                field: (
                    ";".join(item[field]) if field == "review_flags"
                    else ";".join(sorted(item[field])) if field == "confirmed_evidence_types"
                    else " | ".join(item[field]) if field == "confirmed_source_url_examples"
                    else item[field]
                )
                for field in fields
            })
    (args.out / "resumo.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
