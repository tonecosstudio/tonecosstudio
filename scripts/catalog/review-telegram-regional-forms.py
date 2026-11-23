#!/usr/bin/env python3
"""Evidence-only review for Pokémon regional forms and Poké Ball accessories.

Reads a Telegram-studio group queue and the existing verified character UUID
snapshots. PokeAPI is consulted ONLY for a form whose parent species is already
registered. Generates review records; NEVER edits names, links, tags or media.
"""
import argparse
import collections
import hashlib
import csv
import importlib.util
import json
import pathlib
import re
import urllib.error
import urllib.request
from datetime import datetime,timezone

HERE=pathlib.Path(__file__).parent
SPEC=importlib.util.spec_from_file_location(
    "tonart_model_review",HERE/"prepare-model-character-link-review.py")
canonical=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(canonical)

FORM_PATTERNS=(
    (re.compile(r"^(.+?)\s+Hisuian$",re.I),"hisui"),
    (re.compile(r"^(.+?)\s*\(Hisuian[oa]?\)$",re.I),"hisui"),
    (re.compile(r"^(.+?)\s*\(Alola\)$",re.I),"alola"),
    (re.compile(r"^(.+?)\s+Alolan$",re.I),"alola"),
)
ACCESSORY_PATTERN=re.compile(
    r"^(?:Pokébolas(?:\s*\(.+\))?|Pokéball|Poké Ball|Poké Balls)$",re.I)
POKE_BASE="https://pokeapi.co/api/v2/pokemon/"


def fetch_pokemon(url):
    if not url.startswith(POKE_BASE):
        raise ValueError("unapproved host or path")
    req=urllib.request.Request(url,headers={
        "User-Agent":"TONART-telegram-studio-form-curation/1.0",
        "Accept":"application/json",
    })
    with urllib.request.urlopen(req,timeout=18) as r:
        raw=r.read(700000)
        if not raw:raise ValueError("empty source")
    return json.loads(raw),hashlib.sha256(raw).hexdigest()


def resolve(row, identities, get=fetch_pokemon):
    title=row["source_title"].strip()
    if row["review_decision"]!="hold_no_exact_character_identity":
        return None
    if canonical.world(row["source_universe"])!="pokemon":
        return None
    base={
        "studio":row["studio"],"group_key":row["group_key"],
        "source_title":title, "source_universe":row["source_universe"],
        "message_ids":row["source_message_ids"],"source_revision":row["source_revision"],
        "character_identity_id":None,"name_preview":None,
        "tags_preview":None,
        "verified_model":False, "name_applied":False,
        "tags_applied":False,"catalog_model_id_verified":False,
    }
    if ACCESSORY_PATTERN.fullmatch(title):
        return {**base,
            "decision":"review_non_character_accessory",
            "reason":"Poké Ball item or collection, not an individual character",
            "source_type":"telegram_title_requires_visual_confirmation",
            "tags_preview":{"franchise":"Pokémon","object_type":"accessory",
                            "character":None},
        }
    match=next(((m.group(1),region) for pat,region in FORM_PATTERNS
                if (m:=pat.fullmatch(title))),None)
    if match is None:return None
    raw_species,region=match
    species=canonical.slug(raw_species)
    ident=identities.get(("pokemon",species))
    if not ident:
        return {**base,"decision":"hold_parent_species_not_registered",
                "reason":"regional form mentioned, base character missing"}
    pokemon_slug=f"{species}-{region}"
    url=POKE_BASE+pokemon_slug
    try:
        data,sha=get(url)
    except (OSError,ValueError,KeyError,TimeoutError,urllib.error.HTTPError) as exc:
        return {**base,"decision":"hold_pokeapi_form_reference_unavailable",
                "reason":type(exc).__name__}
    if (not isinstance(data,dict)
            or data.get("name")!=pokemon_slug
            or not isinstance(data.get("id"),int)
            or data["id"]<1
            or not isinstance(data.get("species"),dict)
            or data["species"].get("name")!=species
            or not re.fullmatch(r"[0-9a-f]{64}",sha)):
        return {**base,"decision":"hold_form_does_not_match_parent_species",
                "reason":"source does not prove variant belongs to parent"}
    return {**base,
        "decision":"review_verified_form_parent_not_model_visual",
        "character_identity_id":ident["id"],
        "name_preview":f"{ident['character']} ({'Hisui' if region=='hisui' else 'Alola'})",
        "tags_preview":{"franchise":ident["franchise"],
                        "character":ident["character"],"form":region},
        "source_type":"pokeapi_community_verified_pokemon_form",
        "source_url":url,
        "source_pokemon_id":data["id"],
        "source_sha256":sha,
        "reason":"API verified parent species of the regional form; sculpture still needs image review",
    }


def run(args):
    files=sorted(args.identity_shards.parent.glob(args.identity_shards.name))
    identities,source=canonical.load_identities(files)
    with args.queue.open(encoding="utf-8-sig",newline="") as file:
        rows=list(csv.DictReader(file))
    if not rows:raise ValueError("studio review queue missing")
    studios={r["studio"] for r in rows}
    if len(studios)!=1:
        raise ValueError("form review must be scoped to exactly one Telegram studio")
    resolved=[]
    for row in rows:
        decision=resolve(row,identities)
        if decision is not None:resolved.append(decision)
    if len({x["group_key"] for x in resolved})!=len(resolved):
        raise ValueError("duplicate Telegram group in form decision")
    args.out.mkdir(parents=True,exist_ok=True)
    canonical.write_jsonl(args.out/"studio-form-accessory-review-private.jsonl",resolved)
    c=collections.Counter(x["decision"] for x in resolved)
    summary={
        "schema":"tonart.telegram.studio-form-accessory-review/1",
        "studio":next(iter(studios)),
        "created_at_utc":datetime.now(timezone.utc).isoformat(),
        "input_total":len(rows),"reviewed_exceptions":len(resolved),
        "decisions":dict(sorted(c.items())),
        "parent_identity_snapshot":source,
        "input_review_queue_sha256":canonical.file_digest(args.queue),
        "proposals_not_visual_verification":True,
        "renamed":0,"linked_models":0,"tags_published":0,
        "no_canonical_writes":True,"no_sqlite_writes":True,
        "no_supabase_writes":True,
    }
    (args.out/"studio-form-accessory-manifest.json").write_text(
        json.dumps(summary,ensure_ascii=False,indent=2,sort_keys=True)+"\n",
        encoding="utf8")
    print(json.dumps(summary,ensure_ascii=False),flush=True)
    return 0


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue",required=True,type=pathlib.Path)
    parser.add_argument("--identity-shards",required=True,type=pathlib.Path)
    parser.add_argument("--out",required=True,type=pathlib.Path)
    raise SystemExit(run(parser.parse_args()))
