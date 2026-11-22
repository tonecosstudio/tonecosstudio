#!/usr/bin/env python3
"""Account for every historical TONART candidate title without creating false
characters. Uses the verified PRIVATE identity name snapshot and the original
catalog taxonomy review queue. Every record receives an explicit decision.
This is a read-only inventory, never a replacement SSOT or linkage script.
"""
from __future__ import annotations
import argparse
import collections
import csv
import importlib.util
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "tonart_taxonomy_normalize", HERE / "validate-existing-pokemon-taxonomy.py")
shared = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shared)
normalize, atomic_json, jsonl, sha256 = (
    shared.normalize, shared.atomic_json, shared.jsonl, shared.sha256
)
WORLD_ALIASES = {
    "marvel": "marvel comics",
    "marvel comics": "marvel comics",
    "dc": "dc comics",
    "dc comics": "dc comics",
    "dragon ball z": "dragon ball",
    "dragon ball super": "dragon ball",
    "kimetsu no yaiba": "demon slayer",
    "pokemon": "pokemon",
    "one piece": "one piece",
    "naruto": "naruto",
    "x men": "x men",
}
NON_CHARACTER_MARKERS = (
    "diorama", "helmet", "base", "keyblade", "pencil holder", "mask",
    "bikini", "bust", "book holder", "pack", "megakit", "model kit",
    "vs", " with ", " e ", " and ", " & ", " + ", " crossover",
    "cosplay", "sword", "shield", "logo", "fruit", "gear 5",
)
AMBIGUOUS_WORLD_MARKERS = (
    "/", " + ", " crossover", " & ", " vs ", " and ",
)
GENERIC_AMBIGUOUS_WORLDS = {"here","unknown","none","universe unknown","franchise unknown",
                            "curadoria pendente", "franquia a identificar"}


def word_alias(cand: str, actual: str) -> bool:
    """Return only a human-review hint, never an asserted alias relationship."""
    text = normalize(cand)
    full = normalize(actual)
    if not text or len(text)<3 or text == full:
        return False
    # Single-name suffixes, e.g. Ace -> Portgas D. Ace, or Luffy
    # -> Monkey D. Luffy. False positives stay in editorial review.
    return (len(text.split("-")) <= 2 and
            (full.endswith("-"+text) or full.startswith(text+"-")))


def read_identity_snapshot(path: pathlib.Path):
    document = json.loads(path.read_text(encoding="utf-8-sig"))
    if document.get("schema") != "tonart.private.identity-names-snapshot/1":
        raise ValueError("incorrect identity snapshot schema")
    if document.get("source") != (
        "supabase:icmtmaakjucmuzxnofkd.public.catalog_character_identities"
    ) or document.get("read_only") is not True:
        raise ValueError("snapshot authority missing")
    idx={}
    total=0
    for group in document.get("identities",[]):
        franchise=normalize(group["franchise"])
        names=group["names"]
        if not isinstance(names,list) or franchise in idx:
            raise ValueError("invalid or duplicate snapshot franchise")
        idx[franchise]={normalize(name):name for name in names if normalize(name)}
        if len(idx[franchise]) != len(names):
            raise ValueError("identity snapshot contains duplicate names")
        total += len(names)
    if not idx or total != document.get("reported_total"):
        raise ValueError("private identity snapshot incomplete")
    return idx,total


def classify_row(row, identities):
    world_orig=row["franchise_candidate_key"].strip()
    display=row["display_name_candidate"].strip()
    world=normalize(world_orig)
    target=normalize(WORLD_ALIASES.get(world_orig,world))
    name_key=normalize(display)
    flags=row.get("review_flags","").strip()
    lower=(display+" ").casefold()
    suspect=any(x in lower for x in NON_CHARACTER_MARKERS)
    ambiguous_world=(world in GENERIC_AMBIGUOUS_WORLDS or
                     any(mark in world_orig.lower() for mark in AMBIGUOUS_WORLD_MARKERS))
    if flags:
        return "editorial_flags_require_review",None,flags
    if suspect:
        return "possible_model_or_multi_character_title",None,"product_or_variant_text"
    if ambiguous_world:
        return "universe_unverified_or_combined",None,world_orig
    # Check for exact name only INSIDE the specific franchise. Never match
    # arbitrary title anywhere in catalog.
    within=identities.get(target,{})
    if name_key in within:
        return "registered_exact_identity",within[name_key],"identity_name_exact"
    probable=[name for raw,name in within.items() if word_alias(display,name)]
    if len(probable)==1:
        return "possible_alias_editorial_review",probable[0],"partial_name_not_automatically_linked"
    # Marvel/X-Men/Fantastic Four are a shared publisher but franchise labels
    # are different. Same name across them requires owner reconciliation.
    if target in ("marvel-comics","x-men","fantastic-four"):
        other_keys=("marvel-comics","x-men","fantastic-four")
        colliding=[label for w in other_keys if w!=target
                   for raw,label in identities.get(w,{}).items() if raw==name_key]
        if colliding:
            return "same_character_cross_editorial_franchise_review",colliding[0],"needs_canonical_publisher_franchise"
    if target not in identities:
        return "franchise_without_private_identity_vocabulary",None,"needs_franchise_approval"
    return "character_not_yet_verified",None,"requires_independent_reference"


def run(args):
    identities,count=read_identity_snapshot(args.identity_snapshot)
    with args.queue.open(encoding="utf-8-sig", newline="") as file:
        rows=list(csv.DictReader(file))
    if not rows:raise ValueError("canonical candidate queue empty")
    required={"franchise_candidate_key","display_name_candidate","review_flags"}
    if not required.issubset(rows[0]):raise ValueError("invalid candidate queue")
    output=[]
    by_status=collections.Counter()
    by_world=collections.defaultdict(lambda:collections.Counter())
    seen=set()
    for i,row in enumerate(rows):
        title=row["display_name_candidate"].strip()
        universe=row["franchise_candidate_key"].strip()
        key=(normalize(universe),normalize(title))
        duplicate_normalized = key in seen
        seen.add(key)
        if duplicate_normalized:
            decision,canonical,reason=(
                "duplicate_normalized_candidate_editorial_review",None,
                "distinct source titles normalize to the same franchise+name"
            )
        else:
            decision,canonical,reason=classify_row(row,identities)
        item={
            "row_number":i+1,"franchise_candidate":universe,
            "title_candidate":title,"classification":decision,
            "canonical_existing_display":canonical,
            "reason":reason,"review_flags":row["review_flags"],
            "registration_action":"no_write",
            "identity_id_from_live_database":None,
            "model_links_created":0,
        }
        output.append(item)
        by_status[decision]+=1
        by_world[universe][decision]+=1
    if len(output)!=len(rows) or sum(by_status.values())!=len(rows):
        raise ValueError("coverage accounting incomplete")
    args.out.mkdir(parents=True, exist_ok=True)
    jsonl(args.out/"full-character-candidate-coverage-private.jsonl",output)
    manifest={
        "schema":"tonart.catalog.candidate-coverage/1",
        "all_candidates_accounted_for":True,
        "candidate_titles_total":len(rows),
        "unique_candidate_pairs":len(seen),
        "duplicate_normalized_rows":len(rows)-len(seen),
        "private_identites_in_snapshot":count,
        "private_franchise_count":len(identities),
        "source_inventory_sha256":sha256(args.queue.read_bytes()),
        "source_private_identity_snapshot_sha256":sha256(args.identity_snapshot.read_bytes()),
        "status_counts":dict(sorted(by_status.items())),
        "franchise_candidates_seen":len(by_world),
        "registered_characters_are_not_model_links":True,
        "unverified_is_not_approved":True,
        "model_links":0,
        "created_at_utc":datetime.now(timezone.utc).isoformat(),
        "no_canonical_writes":True,
    }
    atomic_json(args.out/"full-character-candidate-coverage-manifest.json",manifest)
    with (args.out/"full-character-franchise-coverage-private.csv").open(
        "w",encoding="utf-8-sig",newline="") as f:
        columns=["franchise","candidate_titles","exact_registered",
                 "alias_review","pending_references","requires_editorial_review"]
        w=csv.DictWriter(f,fieldnames=columns)
        w.writeheader()
        for world,counter in sorted(by_world.items(),key=lambda r:-sum(r[1].values())):
            w.writerow({
                "franchise":world,
                "candidate_titles":sum(counter.values()),
                "exact_registered":counter["registered_exact_identity"],
                "alias_review":counter["possible_alias_editorial_review"]+
                    counter["same_character_cross_editorial_franchise_review"],
                "pending_references":counter["character_not_yet_verified"]+
                    counter["franchise_without_private_identity_vocabulary"],
                "requires_editorial_review":sum(counter.values())-
                    counter["registered_exact_identity"],
            })
    print(json.dumps({
        "candidate_titles_total":len(output),
        "private_identities_at_snapshot":count,
        "franchise_candidates_seen":len(by_world),
        "status_counts":manifest["status_counts"],
        "all_candidates_accounted_for":True,
        "no_canonical_writes":True,
    },ensure_ascii=False),flush=True)
    return 0


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue",type=pathlib.Path,required=True)
    parser.add_argument("--identity-snapshot",type=pathlib.Path,required=True)
    parser.add_argument("--out",type=pathlib.Path,required=True)
    sys.exit(run(parser.parse_args()))
