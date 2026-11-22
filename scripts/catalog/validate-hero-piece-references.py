#!/usr/bin/env python3
"""Read-only bulk cross-check of existing TONART Marvel/DC/One Piece titles.

Uses a commit-pinned, independent superhero roster and the independent One Piece
character-search API. Emits private proposals, not model links or public tags.
"""
from __future__ import annotations
import argparse
import collections
import csv
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("tonart_species_shared", HERE / "validate-existing-pokemon-taxonomy.py")
shared = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shared)
normalize, atomic_json, jsonl = shared.normalize, shared.atomic_json, shared.jsonl
HERO_COMMIT = "9793d741120c99fdeef86268d4876a70243d8a6e"
HERO_SOURCE_URL = f"https://raw.githubusercontent.com/akabab/superhero-api/{HERO_COMMIT}/api/all.json"
ONE_PIECE_ENDPOINT = "https://onepieceapi.com/api/characters"
SOURCE_TYPE = "independent_community_reference_not_official"
UA = "TONART-curation-verifiable/1.0"
HERO_KEYS = {"marvel": "Marvel Comics", "marvel-comics": "Marvel Comics", "dc-comics": "DC Comics"}
MAX_ONE_PIECE_TITLES = 180


def read_json(url: str, maximum=1600000):
    if not (
        url == HERO_SOURCE_URL or
        url.startswith(ONE_PIECE_ENDPOINT + "?")
    ):
        raise ValueError("unrecognized reference URL")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=27) as res:
                raw = res.read(maximum + 1)
                if not raw or len(raw) > maximum:
                    raise ValueError("empty or oversized external reference")
                return json.loads(raw), hashlib.sha256(raw).hexdigest()
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(min(2 ** attempt, 3))
    raise RuntimeError("reference unavailable")


def hero_index(records):
    if not isinstance(records, list) or not 400 <= len(records) <= 1500:
        raise ValueError("superhero reference truncated")
    grouped = collections.defaultdict(list)
    seen_ids = set()
    for row in records:
        if not isinstance(row, dict) or type(row.get("id")) is not int:
            raise ValueError("invalid superhero id")
        if row["id"] in seen_ids:
            raise ValueError("duplicate superhero id")
        seen_ids.add(row["id"])
        name = row.get("name")
        bio = row.get("biography")
        publisher = bio.get("publisher") if isinstance(bio, dict) else None
        if not isinstance(name, str) or not name.strip():
            raise ValueError("missing superhero name")
        if publisher not in ("Marvel Comics", "DC Comics"):
            continue
        if not 0 < len(name) <= 160:
            raise ValueError("oversized hero name")
        grouped[(publisher, normalize(name))].append(row)
    index, held = {}, []
    for (publisher, title), candidates in grouped.items():
        if not title or len(candidates) != 1:
            held.append({"franchise":publisher, "candidate":title,
                         "reason":"ambiguous_roster_identity", "count":len(candidates)})
            continue
        row = candidates[0]
        index[(publisher, title)] = {"source_id": row["id"], "name": row["name"]}
    if sum(k[0] == "Marvel Comics" for k in index) < 100 or sum(k[0] == "DC Comics" for k in index) < 80:
        raise ValueError("insufficient superhero publishers")
    return index, held


def exact_hero_candidates(rows, index, digest):
    accepted, held = {}, []
    total = collections.Counter()
    for c in rows:
        source_world = normalize(c["franchise_candidate_key"])
        publisher = HERO_KEYS.get(source_world)
        if publisher is None:
            continue
        total["titles_"+publisher] += 1
        name = c["display_name_candidate"].strip()
        key = (publisher, normalize(name))
        match = index.get(key)
        flags = c["review_flags"].strip()
        if match is None or flags:
            held.append({
                "franchise": publisher, "candidate": name,
                "reason": "editorial_flags" if flags else "no_exact_hero_reference",
                "flags": flags,
            })
            continue
        if key in accepted:
            # Same name across Marvel and Marvel Comics source categories is one
            # editorial identity. Preserve original candidate titles as evidence.
            accepted[key]["candidate_source_worlds"].add(source_world)
            continue
        accepted[key] = {
            "franchise": publisher, "character_name": match["name"],
            "external_id": match["source_id"],
            "source_url": HERO_SOURCE_URL,
            "source_sha256": digest,
            "source_type": SOURCE_TYPE,
            "match_status": "exact_roster_name_only",
            "candidate_source_worlds": {source_world},
            "no_model_link": True,
            "approved_for_publication": False,
        }
    result = []
    for row in accepted.values():
        row["candidate_source_worlds"] = sorted(row["candidate_source_worlds"])
        result.append(row)
    result.sort(key=lambda r:(r["franchise"],normalize(r["character_name"])))
    return result, held, dict(total)


def exact_onepiece_candidates(rows, checkpoint):
    candidates = [r for r in rows if normalize(r["franchise_candidate_key"])=="one-piece"]
    if len(candidates) > MAX_ONE_PIECE_TITLES:
        raise ValueError("One Piece title cap exceeded unexpectedly")
    accepted, held, source_ids = {}, [], {}
    digest = hashlib.sha256()
    for index, c in enumerate(candidates,1):
        name = c["display_name_candidate"].strip()
        url = ONE_PIECE_ENDPOINT + "?" + urllib.parse.urlencode({"q":name, "page":1, "limit":100})
        result, response_sha = read_json(url, maximum=550000)
        digest.update(bytes.fromhex(response_sha))
        if not isinstance(result, list) or len(result)>=100:
            raise ValueError("truncated or invalid One Piece search results")
        exact = []
        for row in result:
            if not isinstance(row, dict) or not isinstance(row.get("name"), dict):
                continue
            label = row["name"].get("en")
            external_id = row.get("id")
            if (isinstance(label,str) and isinstance(external_id,str)
                    and re.fullmatch(r"[0-9a-fA-F-]{36}",external_id)
                    and normalize(label)==normalize(name)):
                exact.append((external_id,label))
        flags = c["review_flags"].strip()
        if flags or len(exact)!=1:
            held.append({
                "franchise":"One Piece","candidate":name,
                "reason": "editorial_flags" if flags else
                          "source_alias_or_absent" if not exact else
                          "ambiguous_exact_source",
                "flags":flags,"search_url":url,"response_sha256":response_sha,
                "returned":len(result),
            })
            continue
        external_id, canonical_name = exact[0]
        if external_id in source_ids and normalize(source_ids[external_id]) != normalize(canonical_name):
            raise ValueError("One Piece source UUID reuses conflicting names")
        source_ids[external_id] = canonical_name
        if external_id in accepted:
            # Same source character can appear twice as a candidate, not two IDs.
            accepted[external_id]["candidate_titles"].append(name)
            continue
        accepted[external_id] = {
            "franchise":"One Piece", "character_name": canonical_name,
            "external_id": external_id,
            "source_url": ONE_PIECE_ENDPOINT + "/" + external_id,
            "source_search_url":url, "source_sha256":response_sha,
            "source_type": SOURCE_TYPE, "match_status":"exact_localized_en_name_only",
            "candidate_titles":[name],
            "no_model_link":True,"approved_for_publication":False,
        }
        if index % 10 == 0:
            checkpoint("one_piece_progress", searched=index, total=len(candidates),
                       matched=len(accepted), held=len(held))
    result = sorted(accepted.values(),key=lambda r:normalize(r["character_name"]))
    return result, held, {"onepiece_titles":len(candidates),
                          "onepiece_exact_unique":len(result),
                          "onepiece_held":len(held),
                          "onepiece_queries_digest":digest.hexdigest()}


def read_queue(path: pathlib.Path):
    with path.open(encoding="utf-8-sig",newline="") as f:
        reader=csv.DictReader(f)
        required={"franchise_candidate_key","display_name_candidate","review_flags"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("missing original candidate fields")
        return list(reader)


def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    handle=(args.out/"hero-piece-supervised.lock").open("a+b")
    if os.name == "nt":
        import msvcrt
        try:
            handle.seek(0);msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:
            handle.close()
            print(json.dumps({"status":"already_running"}),flush=True);return 3
    else:
        import fcntl
        try:
            fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:
            handle.close()
            print(json.dumps({"status":"already_running"}),flush=True);return 3
    path=args.out/"hero-piece-supervised.json"
    state={"mission_id":"tonart-hero-onepiece-characters-20261122-v1",
           "status":"running","phase":"starting",
           "started_at_utc":datetime.now(timezone.utc).isoformat(),
           "canonical_writes":False,"model_links_changed":False}
    def stage(label,**extra):
        state.update({"phase":label,
                      "updated_at_utc":datetime.now(timezone.utc).isoformat(),**extra})
        atomic_json(path,state)
        print(json.dumps({"phase":label,**extra},ensure_ascii=False),flush=True)
    try:
        rows=read_queue(args.queue)
        stage("candidate_inventory_loaded",titles=len(rows))
        superhero_raw,digest=read_json(HERO_SOURCE_URL)
        hero_catalog, hero_ambiguous=hero_index(superhero_raw)
        stage("superhero_index_loaded",indexed=len(hero_catalog),sha256=digest)
        heroes,held_heroes,totals=exact_hero_candidates(rows,hero_catalog,digest)
        stage("heroes_crosschecked",matches=len(heroes),held=len(held_heroes))
        piece,held_piece,piece_stats=exact_onepiece_candidates(rows,stage)
        stage("one_piece_crosschecked",**piece_stats)
        valid=heroes+piece
        held=held_heroes+held_piece
        names=collections.defaultdict(set)
        for char in valid:names[normalize(char["character_name"])].add(char["franchise"])
        ambiguous_global={name for name,labels in names.items() if len(labels)>1}
        if ambiguous_global:
            valid=[char for char in valid if normalize(char["character_name"]) not in ambiguous_global]
            for name in ambiguous_global:
                held.append({"candidate":name,"reason":"cross_franchise_same_name",
                             "franchises":sorted(names[name])})
        valid.sort(key=lambda r:(r["franchise"],normalize(r["character_name"])))
        jsonl(args.out/"hero-piece-exact-private.jsonl",valid)
        jsonl(args.out/"hero-piece-hold-private.jsonl",held)
        manifest={
            "schema":"tonart.taxonomy.hero-piece-reference/1",
            "mission_id":state["mission_id"],
            "created_at_utc":datetime.now(timezone.utc).isoformat(),
            "candidate_sha256":hashlib.sha256(args.queue.read_bytes()).hexdigest(),
            "hero_source_url":HERO_SOURCE_URL,
            "hero_source_sha256":digest,
            "hero_commit":HERO_COMMIT,
            "hero_index_count":len(hero_catalog),
            "hero_ambiguous_reference":hero_ambiguous,
            "hero_candidate_stats":totals,
            "one_piece_source_url":ONE_PIECE_ENDPOINT,
            "one_piece_stats":piece_stats,
            "matched":len(valid), "held":len(held),
            "no_canonical_writes":True,"no_model_links":True,
            "warning":"Independent community datasets, not official IP-holder sources. "
                      "Exact names do not prove artwork identity or rights.",
        }
        atomic_json(args.out/"hero-piece-manifest.json",manifest)
        state["status"]="completed"
        stage("handoff",matched=len(valid),held=len(held),
              resume_ref="hero-source-sha256:"+digest)
        return 0
    except Exception as exc:
        state.update({"status":"failed","error":f"{type(exc).__name__}: {str(exc)[:240]}"})
        atomic_json(path,state)
        raise
    finally:
        try:
            if os.name=="nt":
                handle.seek(0);msvcrt.locking(handle.fileno(),msvcrt.LK_UNLCK,1)
            else:
                fcntl.flock(handle.fileno(),fcntl.LOCK_UN)
        finally:handle.close()


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--queue",type=pathlib.Path,required=True)
    p.add_argument("--out",type=pathlib.Path,required=True)
    sys.exit(run(p.parse_args()))
