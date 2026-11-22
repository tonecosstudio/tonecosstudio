#!/usr/bin/env python3
"""Read-only category roster matching for TONART Saint Seiya titles.

Builds one complete source-scoped reference index (not separate per-model
requests), compares every local candidate exactly, emits separate tentative
alias hints and rejection reasons. Never writes any identity or model link.
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
import time
import urllib.parse
import urllib.request
from datetime import datetime,timezone

HERE=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location("tonart_category_shared",HERE/"validate-existing-pokemon-taxonomy.py")
shared=importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
norm,atomic_json,jsonl,sha256=shared.normalize,shared.atomic_json,shared.jsonl,shared.sha256
SOURCE="https://saintseiya.fandom.com/api.php"
FRANCHISE="Saint Seiya"
SOURCE_TYPE="independent_fandom_category_not_official"
CATEGORIES=["Category:Characters","Category:Saint Seiya Characters"]
MAX_PAGES=5


def get_complete_category(category):
    if category not in CATEGORIES:
        raise ValueError("unknown category")
    params={
        "action":"query","format":"json","list":"categorymembers",
        "cmtitle":category,"cmlimit":"500","cmtype":"page"}
    rows={}
    digest=hashlib.sha256()
    pages=0
    while True:
        url=SOURCE+"?"+urllib.parse.urlencode(params)
        req=urllib.request.Request(url,headers={"User-Agent":"TONART-catalog-source-review/1.0",
                                                 "Accept":"application/json"})
        for i in range(3):
            try:
                with urllib.request.urlopen(req,timeout=25) as response:
                    raw=response.read(1000000)
                    if not raw:raise ValueError("empty category response")
                    doc=json.loads(raw)
                    if "query" not in doc:raise ValueError("missing query response")
                break
            except (OSError,TimeoutError):
                if i==2:raise
                time.sleep(min(2**i,3))
        digest.update(raw)
        pages+=1
        if pages>MAX_PAGES:raise ValueError("category page limit exceeded")
        members=doc["query"].get("categorymembers")
        if not isinstance(members,list):raise ValueError("no category members")
        for item in members:
            if not isinstance(item,dict) or type(item.get("pageid")) is not int or not isinstance(item.get("title"),str):
                raise ValueError("invalid member")
            pid=item["pageid"]
            old=rows.get(pid)
            if old and old["title"]!=item["title"]:
                raise ValueError("source ID changed title")
            rows[pid]={"id":pid,"title":item["title"]}
        if not doc.get("continue"):break
        params.update(doc["continue"])
        time.sleep(.1)
    if len(rows)<100:raise ValueError("character roster incomplete")
    return rows,digest.hexdigest(),pages


def source_index():
    allrows={}
    sources={}
    for cat in CATEGORIES:
        rows,digest,pages=get_complete_category(cat)
        sources[cat]={"rows":len(rows),"sha256":digest,"pages":pages}
        for identifier,entry in rows.items():
            if identifier in allrows and allrows[identifier]["title"]!=entry["title"]:
                raise ValueError("inconsistent category source")
            allrows[identifier]=entry
    index=collections.defaultdict(list)
    for entry in allrows.values():
        key=norm(entry["title"])
        if key:index[key].append(entry)
    return index,sources,len(allrows)


def decide(candidates,index,sources):
    verified,held,aliases=[],[],[]
    for row in candidates:
        original=row["display_name_candidate"].strip()
        key=norm(original)
        flags=row.get("review_flags","").strip()
        exact=index.get(key,[])
        if flags:
            held.append({"candidate":original,"reason":"original_editorial_flags",
                         "flags":flags})
            continue
        if len(exact)==1:
            ref=exact[0]
            verified.append({
                "character_name":ref["title"],"franchise":FRANCHISE,
                "source_page_id":ref["id"],
                "source_character_url":"https://saintseiya.fandom.com/wiki/"+
                                       urllib.parse.quote(ref["title"].replace(" ","_"),safe="()'"),
                "source_api":SOURCE,
                "source_categories":sources,
                "source_type":SOURCE_TYPE,
                "evidence":"exact_name_in_complete_character_category",
                "public_approved":False,"linked_models":[],
            })
            continue
        if len(exact)>1:
            held.append({"candidate":original,"reason":"duplicate_exact_source_name",
                         "source_page_ids":[e["id"] for e in exact]})
            continue
        # Abbreviations can be ambiguous (Kanon appears as Gemini Kanon and
        # Sea Dragon Kanon); hints are NEVER inserted as identities/links.
        probable=[]
        if len(key)>=3 and len(key.split("-"))<=2:
            for name,values in index.items():
                if name.endswith("-"+key):
                    for v in values:
                        probable.append({"canonical":v["title"],"page_id":v["id"]})
        if probable:
            aliases.append({"candidate":original,"franchise":FRANCHISE,
                            "candidates":sorted(probable,key=lambda x:x["canonical"]),
                            "status":"manual_alias_review_required"})
        else:
            held.append({"candidate":original,"reason":"no_exact_reference",
                         "editorial_review_required":True})
    if len(verified)+len(held)+len(aliases)!=len(candidates):
        raise ValueError("unaccounted candidates")
    return verified,held,aliases


def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    with args.queue.open(encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    candidates=[r for r in rows if norm(r["franchise_candidate_key"])=="saint-seiya"]
    if not 20<=len(candidates)<=120:
        raise ValueError("unexpected Saint Seiya title count")
    state={"mission_id":"tonart-saintseiya-roster-20261122",
           "status":"running","started_at_utc":datetime.now(timezone.utc).isoformat(),
           "no_canonical_writes":True}
    def stage(name,**extra):
        state.update({"stage":name,"updated_at_utc":datetime.now(timezone.utc).isoformat(),**extra})
        atomic_json(args.out/"saintseiya-source-supervised.json",state)
        print(json.dumps({"stage":name,**extra},ensure_ascii=False),flush=True)
    try:
        stage("inventory_loaded",titles=len(candidates))
        index,sources,n=source_index()
        stage("character_categories_loaded",characters=n,pages=sum(s["pages"] for s in sources.values()))
        verified,held,aliases=decide(candidates,index,sources)
        jsonl(args.out/"saintseiya-exact-private.jsonl",verified)
        jsonl(args.out/"saintseiya-held-private.jsonl",held)
        jsonl(args.out/"saintseiya-alias-hints-private.jsonl",aliases)
        atomic_json(args.out/"saintseiya-category-manifest.json",{
            "schema":"tonart.category-characters/1","franchise":FRANCHISE,
            "candidate_sha256":sha256(args.queue.read_bytes()),
            "sources":sources,"reference_characters":n,
            "matched_exact":len(verified),"held":len(held),"alias_hints":len(aliases),
            "source_kind":SOURCE_TYPE,
            "no_canonical_writes":True,"no_model_links":True,
            "timestamp_utc":datetime.now(timezone.utc).isoformat()})
        state["status"]="completed"
        stage("handoff",matched_exact=len(verified),held=len(held),alias_hints=len(aliases),
              resume_ref="categories:"+str(len(sources)))
        return 0
    except Exception as e:
        state.update({"status":"failed","error":f"{type(e).__name__}: {str(e)[:190]}"})
        atomic_json(args.out/"saintseiya-source-supervised.json",state)
        raise

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--queue",type=pathlib.Path,required=True)
    p.add_argument("--out",type=pathlib.Path,required=True)
    raise SystemExit(run(p.parse_args()))
