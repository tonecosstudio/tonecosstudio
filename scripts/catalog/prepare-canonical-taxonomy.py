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
        r"variant|vers[aã]o|armadura|statue|figure)\b", text, re.IGNORECASE
    ):
        reasons.append("possibly_model_variant_not_character")
    return reasons


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
                "group_states": collections.Counter()
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

        for message_id, studio, title, universe, status in db.execute(
            "SELECT message_id,studio,title,universe,status FROM name_proposals"
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

    character_records = []
    for (wk, ck), c in characters.items():
        label = preferred(c["spellings"])
        flags = title_needs_review(label)
        # A title may denote a sculpture, a pair, or a variant; never auto-confirm.
        character_records.append({
            "kind": "character_candidate", "franchise_candidate_key": wk,
            "candidate_key": wk + "::" + ck, "display_name_candidate": label,
            "slug_candidate": slug(label), "spellings": sorted(c["spellings"]),
            "group_count": len(c["groups"]), "studio_count": len(c["studios"]),
            "proposal_message_count": len(c["proposal_messages"]),
            "confirmed_naming_messages": len(c["confirmed_name_messages"]),
            "group_states": dict(sorted(c["group_states"].items())),
            "review_flags": flags,
            "review_state": "candidate_character_unverified",
            "identity_id": None,
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
        "source_counts": dict(sorted(sources.items())),
        "name_proposal_status_counts": dict(sorted(naming_status.items())),
        "warning": "Curation group titles and naming proposals are NOT approved character identities; existing D1 IDs and current model visibility must be rechecked before linking.",
    }
    return summary, world_records, alias_records, character_records, legacy_review


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curation-db", type=Path, required=True)
    parser.add_argument("--legacy-inventory", type=Path)
    parser.add_argument("--telegram-plan", type=Path)
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
    rows_as_jsonl(args.out / "universos-candidatos.jsonl", worlds)
    rows_as_jsonl(args.out / "aliases-para-revisao.jsonl", aliases)
    rows_as_jsonl(args.out / "personagens-candidatos.jsonl", characters)
    rows_as_jsonl(args.out / "catalogo-antigo-sem-vinculos.jsonl", legacy)
    # Spreadsheet-friendly review queue; no IDs are approved or written back.
    with (args.out / "fila-revisao-personagens.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as file:
        fields = [
            "franchise_candidate_key", "display_name_candidate",
            "group_count", "studio_count", "confirmed_naming_messages",
            "review_flags", "review_state"
        ]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for item in characters:
            writer.writerow({
                field: (";".join(item[field]) if field == "review_flags" else item[field])
                for field in fields
            })
    (args.out / "resumo.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8", newline="\n"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
