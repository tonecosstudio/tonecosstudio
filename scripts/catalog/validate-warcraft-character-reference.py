#!/usr/bin/env python3
"""TONART read-only World of Warcraft character-name validation against
the independent Warcraft Wiki mediawiki category metadata.
Only existing TONART candidates are checked. No public or private DB writes.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime,timezone

P=pathlib.Path(__file__).parent
SPEC=importlib.util.spec_from_file_location("tonart_normalize",P/"validate-existing-pokemon-taxonomy.py")
shared=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shared)
normalize,atomic_json,jsonl,sha256=shared.normalize,shared.atomic_json,shared.jsonl,shared.sha256
SOURCE="https://warcraft.wiki.gg/api.php"
MAX_BATCH=7
CHARTYPE=(" characters"," npcs"," npc"," characters ")


def get_pages(titles):
    if not 1<=len(titles)<=MAX_BATCH:
        raise ValueError("invalid batch size")
    if any(not title.strip() or len(title)>160 for title in titles):
        raise ValueError("invalid title")
    qs={
        "action":"query","format":"json","prop":"categories",
        "cllimit":"max","titles":"|".join(titles)
    }
    url=SOURCE+"?"+urllib.parse.urlencode(qs)
    req=urllib.request.Request(url,headers={
        "User-Agent":"TONART-taxonomy-reference/1.0",
        "Accept":"application/json"
    })
    for i in range(3):
        try:
            with urllib.request.urlopen(req,timeout=30) as f:
                raw=f.read(1000000)
                if not raw:raise ValueError("empty Warcraft source")
                doc=json.loads(raw)
                if not isinstance(doc,dict) or "query" not in doc:
                    raise ValueError("invalid Warcraft source")
                if doc.get("continue"):
                    raise ValueError("incomplete category pagination")
                return doc,sha256(raw),url
        except (OSError, TimeoutError):
            if i==2:raise
            time.sleep(min(2**i,3))
    raise RuntimeError("source unavailable")


def evaluate(titles,doc,checksum,url):
    pages=(doc.get("query") or {}).get("pages") or {}
    matched,held=[],[]
    requested={normalize(t):t for t in titles}
    for item in pages.values():
        if not isinstance(item,dict):raise ValueError("invalid mediawiki record")
        original=item.get("title","")
        key=normalize(original)
        if key not in requested:
            # Wikimedia may normalize case or underscores. Do not adopt an
            # unexpected page title as a character identity automatically.
            raise ValueError("Wiki returned an unrequested title")
        req_name=requested[key]
        if type(item.get("pageid")) is not int or item.get("missing"):
            held.append({"title":req_name,"reason":"wiki_page_missing"})
            continue
        cats=[x.get("title","") for x in item.get("categories",[])]
        if not cats or any(not isinstance(x,str) for x in cats):
            held.append({"title":req_name,"reason":"no_verified_category"})
            continue
        recognized=any(
            "character" in c.lower() or c.lower().endswith(" npcs") or
            c.lower().endswith(" npc")
            for c in cats
        )
        if not recognized:
            held.append({"title":req_name,"reason":"not_a_character_category"})
            continue
        matched.append({
            "character_name":original,
            "franchise":"World of Warcraft",
            "source_page_id":item["pageid"],
            "source_page_url":"https://warcraft.wiki.gg/wiki/"+urllib.parse.quote(original.replace(" ","_"),safe="()'"),
            "source_query_url":url,
            "source_query_sha256":checksum,
            "source_categories_evidence":sorted(
                c for c in cats if "character" in c.lower() or "npc" in c.lower())[:12],
            "source_type":"independent_warcraft_wiki_not_blizzard_official",
            "editorial_only":True,"model_links_created":0,
            "approved_for_publication":False,
        })
    if len(matched)+len(held)!=len(titles):
        raise ValueError("Wiki omitted a requested title")
    return matched,held


def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    with args.queue.open(encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    candidates=[x for x in rows if normalize(x["franchise_candidate_key"])=="world-of-warcraft"]
    if not 1<=len(candidates)<=60:raise ValueError("unexpected World of Warcraft inventory size")
    # Preserve all 36 titles, even multi-character models or sword props.
    approved_titles=[x["display_name_candidate"] for x in candidates if not x["review_flags"]]
    held=[{"title":x["display_name_candidate"],"reason":"editorial_flags",
           "review_flags":x["review_flags"]} for x in candidates if x["review_flags"]]
    state={"mission_id":"tonart-warcraft-character-verification-20261122",
           "status":"running","started_at_utc":datetime.now(timezone.utc).isoformat(),
           "canonical_writes":False}
    def stage(label,**details):
        state.update({"stage":label,"updated_at_utc":datetime.now(timezone.utc).isoformat(),**details})
        atomic_json(args.out/"warcraft-characters-supervised.json",state)
        print(json.dumps({"stage":label,**details},ensure_ascii=False),flush=True)
    try:
        matches=[]
        stage("source_batches_started",titles=len(candidates))
        for offset in range(0,len(approved_titles),MAX_BATCH):
            batch=approved_titles[offset:offset+MAX_BATCH]
            doc,digest,url=get_pages(batch)
            accepted,rejected=evaluate(batch,doc,digest,url)
            matches.extend(accepted);held.extend(rejected)
            stage("batch_completed",batch_number=offset//MAX_BATCH+1,
                  scanned=min(offset+len(batch),len(approved_titles)),
                  verified=len(matches),held=len(held))
            time.sleep(0.3)
        # Content-hashed proof per page; never a set of purely invented URLs.
        jsonl(args.out/"warcraft-characters-exact-private.jsonl",matches)
        jsonl(args.out/"warcraft-characters-held-private.jsonl",held)
        atomic_json(args.out/"warcraft-characters-manifest.json",{
            "schema":"tonart.taxonomy.warcraft-wiki/1",
            "queue_sha256":sha256(args.queue.read_bytes()),
            "total_titles":len(candidates),"verified":len(matches),"held":len(held),
            "source":SOURCE,"source_type":"independent_warcraft_wiki_not_official",
            "no_canonical_writes":True,"no_model_links":True,
            "created_at_utc":datetime.now(timezone.utc).isoformat(),
        })
        state["status"]="completed"
        stage("handoff",verified=len(matches),held=len(held),
              resume_ref="source:"+SOURCE)
        return 0
    except Exception as e:
        state.update({"status":"failed","error":f"{type(e).__name__}: {str(e)[:200]}"})
        atomic_json(args.out/"warcraft-characters-supervised.json",state)
        raise

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--queue",type=pathlib.Path,required=True)
    p.add_argument("--out",type=pathlib.Path,required=True)
    sys.exit(run(p.parse_args()))
