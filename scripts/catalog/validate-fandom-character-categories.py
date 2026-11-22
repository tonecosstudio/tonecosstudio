#!/usr/bin/env python3
"""Read-only supervised FAN wiki character validation for remaining TONART worlds.

Checks exact title AND explicit character category on the series-specific wiki.
No direct SQL, models, rights, D1, R2 or Telegram changes. Records unresolved
titles rather than creating character identities from substring matches.
"""
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
from datetime import datetime,timezone

P=pathlib.Path(__file__).parent
SPEC=importlib.util.spec_from_file_location("tonart_taxonomy_shared",P/"validate-existing-pokemon-taxonomy.py")
shared=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shared)
normalize,atomic_json,jsonl,sha256=shared.normalize,shared.atomic_json,shared.jsonl,shared.sha256

# Explicit source per franchise. These are independent fan encyclopedias,
# NOT canonical IP owners or legal rights attestations.
WORLDS={
    "my hero academia":("myheroacademia","My Hero Academia"),
    "bleach":("bleach","Bleach"),
    "attack on titan":("attackontitan","Attack on Titan"),
    "demon slayer":("kimetsu-no-yaiba","Demon Slayer"),
    "kimetsu no yaiba":("kimetsu-no-yaiba","Demon Slayer"),
    "jujutsu kaisen":("jujutsu-kaisen","Jujutsu Kaisen"),
    "chainsaw man":("chainsaw-man","Chainsaw Man"),
    "hunter x hunter":("hunterxhunter","Hunter x Hunter"),
    "street fighter":("streetfighter","Street Fighter"),
    "mortal kombat":("mortalkombat","Mortal Kombat"),
    "super mario":("mario","Super Mario"),
    "the legend of zelda":("zelda","The Legend of Zelda"),
    "final fantasy vii":("finalfantasy","Final Fantasy VII"),
    "avatar: the last airbender":("avatar","Avatar: The Last Airbender"),
    "fire emblem: three houses":("fireemblem","Fire Emblem: Three Houses"),
    "one piece":("onepiece","One Piece"),
}
MAX_BATCH=5
CATEGORY_MATCH=re.compile(r"(?:^|[^a-z])characters?(?:[^a-z]|$)",re.I)
DISALLOWED_CATEGORIES=("disambiguation","fan character","fan-fiction","fanfiction",
                       "fan fiction","original character","non-canon","noncanon")


def get_category_batch(host,titles):
    if host not in {v[0] for v in WORLDS.values()}:
        raise ValueError("source host not approved")
    if not 1<=len(titles)<=MAX_BATCH:
        raise ValueError("invalid batch size")
    if any(not title or len(title)>160 for title in titles):
        raise ValueError("invalid title length")
    api=f"https://{host}.fandom.com/api.php"
    params={
        "action":"query","format":"json","prop":"categories",
        "cllimit":"max","titles":"|".join(titles),
    }
    aggregated={}
    digest=hashlib.sha256()
    continuations=0
    while True:
        u=api+"?"+urllib.parse.urlencode(params)
        req=urllib.request.Request(u,headers={
            "User-Agent":"TONART-taxonomy-independent-research/1.0",
            "Accept":"application/json"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req,timeout=25) as response:
                    raw=response.read(1500000)
                    if not raw:raise ValueError("empty fanwiki response")
                    document=json.loads(raw)
                    if not isinstance(document,dict) or "query" not in document:
                        raise ValueError("invalid source response")
                    break
            except (OSError,TimeoutError):
                if attempt==2:raise
                time.sleep(min(2**attempt,4))
        digest.update(raw)
        pages=document.get("query",{}).get("pages",{})
        if not isinstance(pages,dict):raise ValueError("source pages malformed")
        for row in pages.values():
            if not isinstance(row,dict) or not isinstance(row.get("title"),str):
                raise ValueError("source page malformed")
            pid=str(row.get("pageid",row.get("title")))
            if pid in aggregated:
                old=aggregated[pid]
                if old["title"]!=row["title"]:
                    raise ValueError("page id reused for a different title")
                old["categories"].extend(row.get("categories",[]))
            else:
                aggregated[pid]={**row,"categories":list(row.get("categories",[]))}
        if not document.get("continue"):
            break
        continuations+=1
        if continuations>15:
            raise ValueError("category pagination cap reached")
        params.update(document["continue"])
        time.sleep(0.12)
    if len(aggregated)!=len(titles):
        raise ValueError("requested titles not accounted for")
    return list(aggregated.values()),digest.hexdigest(),api,continuations


def decide_pages(titles,pages,checksum,api,world):
    requested={normalize(t):t for t in titles}
    if len(requested)!=len(titles):
        raise ValueError("duplicate normalized titles")
    accepted,held=[],[]
    for row in pages:
        title=row["title"]
        key=normalize(title)
        if key not in requested:
            # A redirect or wiki-specific form is an alias candidate, not an
            # independent canonical character. Never create an identity here.
            held.append({"candidate":title,"franchise":world,"reason":"wiki_title_mismatch"})
            continue
        original=requested[key]
        pid=row.get("pageid")
        if type(pid) is not int or pid<=0 or row.get("missing") is not None:
            held.append({"candidate":original,"franchise":world,"reason":"wiki_page_missing"})
            continue
        cats=[c.get("title","") for c in row.get("categories",[])]
        cats=[str(c) for c in cats if isinstance(c,str)]
        banned=any(any(term in c.lower() for term in DISALLOWED_CATEGORIES) for c in cats)
        character_cats=[c for c in cats if CATEGORY_MATCH.search(c)]
        if banned or not character_cats:
            held.append({"candidate":original,"franchise":world,
                         "reason":"disallowed_fan_page" if banned else "no_character_category",
                         "category_count":len(cats)})
            continue
        accepted.append({
            "franchise":world,
            "character_name":title,
            "source_wiki_page_id":pid,
            "source_character_url":"https://"+urllib.parse.urlsplit(api).hostname.replace(".fandom.com","")+".fandom.com/wiki/"+urllib.parse.quote(title.replace(" ","_"),safe="()'"),
            "source_query_base":api,
            "source_response_sha256":checksum,
            "source_character_category":sorted(set(character_cats))[:10],
            "source_type":"independent_fandom_wiki_not_ip_owner",
            "editorial_status":"exact_page_with_character_category",
            "approved_for_publication":False,
            "model_links":[],
        })
    if len(accepted)+len(held)!=len(titles):
        raise ValueError("not every title classified in fandom batch")
    return accepted,held


def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    lock=(args.out/"fandom-character-supervised.lock").open("a+b")
    if os.name=="nt":
        import msvcrt
        try:lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:lock.close();return 3
    else:
        import fcntl
        try:fcntl.flock(lock.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:lock.close();return 3
    with args.queue.open(encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    if not rows:raise ValueError("candidate queue missing")
    state={
        "mission_id":"tonart-fandom-verified-characters-20261122",
        "status":"running","started_at_utc":datetime.now(timezone.utc).isoformat(),
        "no_canonical_writes":True
    }
    statefile=args.out/"fandom-character-supervised.json"
    def stage(label,**info):
        state.update({"stage":label,"updated_at_utc":datetime.now(timezone.utc).isoformat(),**info})
        atomic_json(statefile,state)
        print(json.dumps({"stage":label,**info},ensure_ascii=False),flush=True)
    results,holds,domains=[],[],{}
    try:
        for (host,franchise) in sorted(set(WORLDS.values()),key=lambda x:x[1]):
            relevant=[r for r in rows if WORLDS.get(r["franchise_candidate_key"])==(host,franchise)]
            if not relevant:continue
            clean=[r["display_name_candidate"] for r in relevant if not r["review_flags"]]
            for r in relevant:
                if r["review_flags"]:
                    holds.append({
                        "candidate":r["display_name_candidate"],"franchise":franchise,
                        "reason":"original_editorial_flags","flags":r["review_flags"]
                    })
            source_stat={"source":f"https://{host}.fandom.com/api.php",
                         "titles":len(relevant),"verified":0,"held":0}
            stage("franchise_started",franchise=franchise,titles=len(relevant))
            for at in range(0,len(clean),MAX_BATCH):
                batch=clean[at:at+MAX_BATCH]
                try:
                    pages,sha,api,cnt=get_category_batch(host,batch)
                    accepted,rejected=decide_pages(batch,pages,sha,api,franchise)
                    results.extend(accepted)
                    holds.extend(rejected)
                    source_stat["verified"]+=len(accepted)
                    source_stat["held"]+=len(rejected)
                except Exception as exc:
                    holds.extend({
                        "candidate":name,"franchise":franchise,
                        "reason":"source_batch_unavailable",
                        "error":f"{type(exc).__name__}: {str(exc)[:130]}"
                    } for name in batch)
                    source_stat["held"]+=len(batch)
                stage("batch_done",franchise=franchise,batch=at//MAX_BATCH+1,
                      verified=source_stat["verified"],held=source_stat["held"])
                time.sleep(0.18)
            domains[franchise]=source_stat
            stage("franchise_complete",franchise=franchise,
                  verified=source_stat["verified"],held=source_stat["held"])
        # Same character appears across multiple studio candidate worlds of
        # the SAME franchise; identity must be unique.
        unique={}
        cross_duplicates=[]
        for x in results:
            k=(x["franchise"],normalize(x["character_name"]))
            if k in unique:
                if unique[k]["source_wiki_page_id"]!=x["source_wiki_page_id"]:
                    cross_duplicates.append(k)
                continue
            unique[k]=x
        for k in cross_duplicates:unique.pop(k,None)
        results=sorted(unique.values(),key=lambda x:(x["franchise"],normalize(x["character_name"])))
        jsonl(args.out/"fandom-characters-exact-private.jsonl",results)
        jsonl(args.out/"fandom-characters-held-private.jsonl",holds)
        atomic_json(args.out/"fandom-characters-manifest.json",{
            "schema":"tonart.taxonomy.fandom-character-categories/1",
            "queue_sha256":sha256(args.queue.read_bytes()),
            "sources":domains,"verified_unique":len(results),
            "held":len(holds),"conflicting_ids":cross_duplicates,
            "source_kind":"community_wiki_character_categories_not_official",
            "no_canonical_writes":True,"no_model_links":True,
            "created_at_utc":datetime.now(timezone.utc).isoformat(),
        })
        state["status"]="completed"
        stage("handoff",verified_unique=len(results),held=len(holds),
              worlds=len(domains),resume_ref="fandom-category-sources")
        return 0
    except Exception as e:
        state.update({"status":"failed","error":f"{type(e).__name__}: {str(e)[:250]}"})
        atomic_json(statefile,state)
        raise
    finally:
        if os.name=="nt":
            lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)
        else:fcntl.flock(lock.fileno(),fcntl.LOCK_UN)
        lock.close()

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--queue",type=pathlib.Path,required=True)
    p.add_argument("--out",type=pathlib.Path,required=True)
    sys.exit(run(p.parse_args()))
