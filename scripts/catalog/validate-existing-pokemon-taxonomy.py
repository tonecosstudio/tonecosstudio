#!/usr/bin/env python3
"""One supervised, read-only TONART taxonomy stage.

Cross-check *existing* Pokemon candidate names against pinned PokeAPI species
records. Emits auditable proposals for the existing private editorial SSOT.
Never changes local SQLite, Supabase, Cloudflare D1/R2, or model links.
"""
from __future__ import annotations
import argparse
import collections
import csv
import hashlib
import io
import json
import os
import pathlib
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone

SOURCE_REPOSITORY = "PokeAPI/pokeapi"
SPECIES_PATH = "data/v2/csv/pokemon_species.csv"
NAMES_PATH = "data/v2/csv/pokemon_species_names.csv"
GIT_COMMIT_API = "https://api.github.com/repos/PokeAPI/pokeapi/commits/master"
ENGLISH_LANGUAGE_ID = 9
# Use exact word equality. No approximate, prefix, acronym or substring matching.
FRANCHISE_KEYS = {"pokemon"}
UA = "TONART-canonical-taxonomy/1.0 (read-only provenance audit)"


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Preserve meaningful terms, normalize spacing/punctuation only.
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def atomic_json(path: pathlib.Path, document: dict) -> None:
    data = json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(data, encoding="utf-8", newline="\n")
    temp.replace(path)


def jsonl(path: pathlib.Path, rows: list[dict]) -> None:
    temp = path.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    temp.replace(path)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_source(url: str, max_bytes: int) -> bytes:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "application/json,text/csv,*/*"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as res:
                content = res.read(max_bytes + 1)
                if len(content) > max_bytes:
                    raise RuntimeError("reference exceeded bounded size")
                if not content:
                    raise RuntimeError("empty reference")
                return content
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(min(2 ** attempt, 4))
    raise RuntimeError("reference unavailable")


def source_bundle() -> tuple[str, dict[str, bytes]]:
    info = json.loads(read_source(GIT_COMMIT_API, 800000))
    commit = info.get("sha", "")
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("PokeAPI commit SHA missing or invalid")
    base = f"https://raw.githubusercontent.com/{SOURCE_REPOSITORY}/{commit}/"
    output = {}
    for relative, maximum in ((SPECIES_PATH, 200000), (NAMES_PATH, 1500000)):
        output[relative] = read_source(base + relative, maximum)
    return commit, output


def verify_species(bundle: dict[str, bytes]) -> dict[str, dict]:
    species_csv = bundle[SPECIES_PATH].decode("utf-8-sig")
    names_csv = bundle[NAMES_PATH].decode("utf-8-sig")
    species: dict[int, dict] = {}
    for row in csv.DictReader(io.StringIO(species_csv)):
        species_id = int(row["id"])
        if species_id <= 0 or species_id in species:
            raise ValueError("duplicate species number")
        ident = row["identifier"].strip()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ident):
            raise ValueError("invalid species identifier")
        species[species_id] = {"id": species_id, "identifier": ident}
    names: dict[int, str] = {}
    for row in csv.DictReader(io.StringIO(names_csv)):
        if int(row["local_language_id"]) != ENGLISH_LANGUAGE_ID:
            continue
        species_id = int(row["pokemon_species_id"])
        if species_id in names:
            raise ValueError("duplicate English species names")
        names[species_id] = row["name"].strip()
    if not species or len(names) < 100 or any(sid not in species for sid in names):
        raise ValueError("incomplete Pokémon species dataset")
    index: dict[str, dict] = {}
    collisions: set[str] = set()
    for species_id, info in species.items():
        display = names.get(species_id)
        if not display:
            continue
        keys = {normalize(display), normalize(info["identifier"])}
        for label_key in keys:
            if not label_key:
                continue
            if label_key in index and index[label_key]["id"] != species_id:
                collisions.add(label_key)
            else:
                index[label_key] = {**info, "display": display}
    for collision in collisions:
        index.pop(collision, None)
    if len(index) < 100:
        raise ValueError("too few unique species")
    return index


def verified_candidates(
    queue: pathlib.Path, historic_path: pathlib.Path, source_index: dict[str, dict],
    commit: str, bundle: dict[str, bytes],
) -> tuple[list[dict], list[dict], dict]:
    if not queue.is_file() or not historic_path.is_file():
        raise FileNotFoundError("canonical inventory missing")
    matched_by_species: dict[int, dict] = {}
    unmatched = []
    stats = collections.Counter()
    with queue.open(encoding="utf-8-sig", newline="") as f:
        rows = csv.DictReader(f)
        required = {"franchise_candidate_key", "display_name_candidate",
                    "group_count", "review_priority", "review_flags"}
        if not required.issubset(rows.fieldnames or []):
            raise ValueError("invalid taxonomy candidate schema")
        for candidate in rows:
            world = normalize(candidate["franchise_candidate_key"])
            if world not in FRANCHISE_KEYS:
                stats["other_universe"] += 1
                continue
            stats["pokemon_titles_scanned"] += 1
            original = candidate["display_name_candidate"].strip()
            species = source_index.get(normalize(original))
            flags = candidate["review_flags"].strip()
            # An exact species name can coexist with an editorial warning;
            # retain that title for manual review and do not auto-register.
            if not species or flags:
                reason = "editorial_flags" if flags else "not_an_exact_species"
                unmatched.append({
                    "candidate": original, "universe": candidate["franchise_candidate_key"],
                    "reason": reason, "flags": flags,
                    "proposed_character_id": None,
                })
                stats[reason] += 1
                continue
            record = matched_by_species.get(species["id"])
            if record is None:
                record = {
                    "pokemon_species_id": species["id"],
                    "character_name": species["display"],
                    "franchise": "Pokémon",
                    "source": "PokeAPI species registry (independent structured reference)",
                    "source_commit": commit,
                    "source_species_identifier": species["identifier"],
                    "source_species_url": (
                        f"https://github.com/{SOURCE_REPOSITORY}/blob/{commit}/{SPECIES_PATH}"
                    ),
                    "source_names_url": (
                        f"https://github.com/{SOURCE_REPOSITORY}/blob/{commit}/{NAMES_PATH}"
                    ),
                    "candidate_titles": [],
                    "candidate_groups": 0,
                    "editorial_status": "independent_reference_exact_match",
                    "approved_for_publication": False,
                    "linked_model_ids": [],
                }
                matched_by_species[species["id"]] = record
            record["candidate_titles"].append(original)
            record["candidate_groups"] += int(candidate["group_count"] or 0)
            stats["exact_rows"] += 1
    # Second source: historical (not current) model file, only for reporting
    # overlap; no association or publication is authorized.
    historic = collections.Counter()
    with historic_path.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            if "pokemon" not in {normalize(x) for x in row.get("matched_world_candidates", [])}:
                continue
            matched = source_index.get(normalize(row.get("name_at_snapshot", "")))
            if matched and matched["id"] in matched_by_species:
                historic[matched["id"]] += 1
    results = []
    for species_id, row in sorted(matched_by_species.items()):
        row["historic_legacy_exact_name_candidates"] = historic[species_id]
        results.append(row)
    stats["unique_verified_species"] = len(results)
    stats["legacy_historic_name_candidates"] = sum(historic.values())
    stats["withheld_review_rows"] = len(unmatched)
    stats["species_reference_count"] = len({x["id"] for x in source_index.values()})
    stats["reference_sha256_species"] = sha256(bundle[SPECIES_PATH])
    stats["reference_sha256_names"] = sha256(bundle[NAMES_PATH])
    return results, unmatched, dict(stats)


def run(args) -> int:
    args.output.mkdir(parents=True, exist_ok=True)
    lock = args.output / "pokemon-verified-mission.lock"
    handle = lock.open("a+b")
    # Windows OS file locking protects concurrent chats/processes, including
    # crashes. No stale pid file heuristic or new daemon is needed.
    if os.name == "nt":
        import msvcrt
        handle.seek(0)
        try:
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            print(json.dumps({"stage": "lock", "status": "already_running"}), flush=True)
            handle.close()
            return 3
    else:
        import fcntl
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            print(json.dumps({"stage": "lock", "status": "already_running"}), flush=True)
            handle.close()
            return 3
    checkpoint = args.output / "pokemon-verified-mission.json"
    state = {
        "mission_id": "tonart-pokemon-taxonomy-20261122-bulk-v1",
        "project": "tonecosstudio/tonecosstudio",
        "status": "running", "steps_done": 0, "steps_total": 5,
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "writes_to_canonical_services": False,
    }

    def stage(step: int, name: str, **extra):
        state.update({"steps_done": step, "stage": name,
                      "updated_at_utc": datetime.now(timezone.utc).isoformat(),
                      **extra})
        atomic_json(checkpoint, state)
        print(json.dumps({"step": step, "total": 5, "stage": name, **extra},
                         ensure_ascii=False), flush=True)

    try:
        stage(0, "reference_pin")
        commit, bundle = source_bundle()
        stage(1, "reference_verified", commit=commit, reference_bytes=sum(map(len, bundle.values())))
        index = verify_species(bundle)
        stage(2, "catalog_identifiers_loaded", unique_species=len({x["id"] for x in index.values()}))
        results, withheld, stats = verified_candidates(
            args.queue, args.historic, index, commit, bundle)
        stage(3, "source_scanned", **{k: v for k, v in stats.items() if k in (
            "pokemon_titles_scanned", "exact_rows", "unique_verified_species",
            "withheld_review_rows", "legacy_historic_name_candidates")})
        jsonl(args.output / "pokemon-especies-exatas-privado.jsonl", results)
        jsonl(args.output / "pokemon-ambiguos-revisao-privado.jsonl", withheld)
        manifest = {
            "schema": "tonart.taxonomy.exact-species/1",
            "mission_id": state["mission_id"], "source_repository": SOURCE_REPOSITORY,
            "source_commit": commit, "source_documentation": "https://pokeapi.co/docs/v2",
            "source_type": "independent_reference_not_official_pokemon_company",
            "candidate_sha256": sha256(args.queue.read_bytes()),
            "source_archive_sha256": {
                x: sha256(data) for x, data in bundle.items()
            },
            "stats": stats, "completed_at_utc": datetime.now(timezone.utc).isoformat(),
            "no_identity_written": True, "no_models_linked": True,
            "source_notes": (
                "A verified name/species match is independent taxonomy evidence; "
                "it is not evidence that any specific sculpture depicts that species."
            ),
        }
        atomic_json(args.output / "pokemon-verified-manifest.json", manifest)
        stage(4, "private_proposals_saved", output=str(args.output), exact=stats["unique_verified_species"])
        state["status"] = "completed"
        stage(5, "handoff", resume_ref=f"source-commit:{commit}", exact=stats["unique_verified_species"])
        return 0
    except Exception as err:
        state.update({"status": "failed", "error": f"{type(err).__name__}: {str(err)[:250]}"})
        atomic_json(checkpoint, state)
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=pathlib.Path, required=True)
    parser.add_argument("--historic", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    sys.exit(run(args))


if __name__ == "__main__":
    main()
