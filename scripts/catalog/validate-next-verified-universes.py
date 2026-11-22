#!/usr/bin/env python3
"""Supervised batch: cross-check remaining TONART candidate names against
read-only structured source rosters for Star Wars, Digimon, League of Legends
and Yu-Gi-Oh! monsters. No model linking or canonical DB mutations.
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
from datetime import datetime, timezone

P = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location(
    "tonart_existing_taxonomy_shared", P / "validate-existing-pokemon-taxonomy.py")
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)
normalize, atomic_json, jsonl, sha256 = s.normalize, s.atomic_json, s.jsonl, s.sha256
UA="TONART-structured-reference-validation/1.0"
SOURCES={
    "star wars": {"franchise":"Star Wars","url":"https://swapi.info/api/people",
                  "kind":"swapi_people"},
    "digimon": {"franchise":"Digimon","url":"https://digi-api.com/api/v1/digimon?page=0&pageSize=2500",
                "kind":"digimon_species"},
    "league of legends": {"franchise":"League of Legends",
                          "url":"https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json",
                          "kind":"league_champions"},
    "yu-gi-oh!": {"franchise":"Yu-Gi-Oh!",
                  "url":"https://db.ygoprodeck.com/api/v7/cardinfo.php",
                  "kind":"yugioh_monster_cards"},
    "genshin impact": {"franchise":"Genshin Impact",
                  "url":"https://genshin-db-api.vercel.app/api/v5/characters?query=names&matchCategories=true",
                  "kind":"genshin_db_character_names"},
}
source_note="Independent third-party reference, NOT official authorization, visual proof or rights grant."


def fetch(url, maxbytes=20000000):
    hosts = ("swapi.info","digi-api.com","cdn.merakianalytics.com","db.ygoprodeck.com","genshin-db-api.vercel.app")
    if urllib.parse.urlsplit(url).hostname not in hosts or not url.startswith("https://"):
        raise ValueError("unapproved source URL")
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    for trial in range(3):
        try:
            with urllib.request.urlopen(req,timeout=28) as f:
                raw=f.read(maxbytes+1)
                if not raw or len(raw)>maxbytes:
                    raise ValueError("incomplete or unbounded source")
                return json.loads(raw),sha256(raw),len(raw)
        except (OSError,TimeoutError):
            if trial==2: raise
            time.sleep(2**trial)
    raise RuntimeError("reference failed")


def valid_index(records,minimum):
    if len(records)<minimum: raise ValueError("source appears incomplete")
    index={}
    duplicate={}
    for x in records:
        ident=x["id"]
        name=x["name"]
        if not isinstance(name,str) or not name.strip() or len(name)>160:
            raise ValueError("invalid source name")
        key=normalize(name)
        if key in index and index[key]["id"]!=ident:
            duplicate.setdefault(key,set()).update({index[key]["id"],ident})
        else:index[key]=x
    for x in duplicate:index.pop(x,None)
    if len(index)<minimum//2:raise ValueError("too many collisions in reference")
    return index,len(duplicate)


def swapi():
    url=SOURCES["star wars"]["url"]
    rows,digest,size=fetch(url,4000000)
    if not isinstance(rows,list):raise ValueError("Star Wars roster invalid")
    seen=set()
    out=[]
    for row in rows:
        link=row.get("url")
        name=row.get("name")
        if not isinstance(link,str) or not link.startswith("https://swapi.info/api/people/"):
            raise ValueError("Star Wars identity URL invalid")
        if link in seen:raise ValueError("duplicate Star Wars URL")
        seen.add(link)
        out.append({"id":link.rsplit("/",1)[-1],"name":name,"url":link})
    idx,amb=valid_index(out,70)
    return idx,{"url":url,"sha256":digest,"reference_count":len(out),"ambiguous_keys":amb,
                "bytes":size,"source_type":SOURCES["star wars"]["kind"]}


def digimon():
    url=SOURCES["digimon"]["url"]
    data,digest,size=fetch(url,3000000)
    pg=data.get("pageable",{}) if isinstance(data,dict) else {}
    rows=data.get("content",[]) if isinstance(data,dict) else []
    if pg.get("totalPages")!=1 or pg.get("totalElements")!=len(rows) or pg.get("currentPage")!=0:
        raise ValueError("Digimon source pagination incomplete")
    out=[]
    for row in rows:
        ident=row.get("id")
        name=row.get("name")
        href=row.get("href")
        if type(ident) is not int or ident<1 or not isinstance(href,str) or not href.startswith("https://digi-api.com/api/v1/digimon/"):
            raise ValueError("Digimon record not verifiable")
        out.append({"id":ident,"name":name,"url":href})
    idx,amb=valid_index(out,1000)
    return idx,{"url":url,"sha256":digest,"reference_count":len(out),"ambiguous_keys":amb,
                "bytes":size,"source_type":SOURCES["digimon"]["kind"]}


def league():
    url=SOURCES["league of legends"]["url"]
    data,digest,size=fetch(url,28000000)
    if not isinstance(data,dict):raise ValueError("League source invalid root")
    out=[]
    for label,row in data.items():
        if not isinstance(row,dict):raise ValueError("invalid League champion")
        ident=row.get("id")
        name=row.get("name") or label
        if type(ident) is not int or ident<1:
            raise ValueError("invalid League champion id")
        out.append({"id":ident,"name":name,"url":url})
    idx,amb=valid_index(out,130)
    return idx,{"url":url,"sha256":digest,"reference_count":len(out),"ambiguous_keys":amb,
                "bytes":size,"source_type":SOURCES["league of legends"]["kind"]}


def genshin():
    url=SOURCES["genshin impact"]["url"]
    data,digest,size=fetch(url,200000)
    if not isinstance(data,list) or not 100<=len(data)<=250:
        raise ValueError("Genshin roster incomplete")
    out=[]
    for name in data:
        if not isinstance(name,str) or not name.strip() or len(name)>160:
            raise ValueError("invalid Genshin name")
        out.append({"id":normalize(name),"name":name,"url":url})
    idx,amb=valid_index(out,100)
    return idx,{"url":url,"sha256":digest,"reference_count":len(out),
                "ambiguous_keys":amb,"bytes":size,"source_type":SOURCES["genshin impact"]["kind"]}


def yugioh(queue_rows,checkpoint):
    source=SOURCES["yu-gi-oh!"]
    entries=[x for x in queue_rows if normalize(x["franchise_candidate_key"])=="yu-gi-oh"]
    if len(entries)>60:raise ValueError("Unexpected Yu-Gi-Oh candidate count")
    idx,ambiguities={},set()
    count=0
    for i,c in enumerate(entries):
        name=c["display_name_candidate"]
        if not name.strip() or len(name)>160:continue
        # Exact card-name only, not fname substring.
        url=source["url"]+"?"+urllib.parse.urlencode({"name":name})
        try:
            rows,digest,size=fetch(url,1000000)
            cards=rows.get("data",[]) if isinstance(rows,dict) else []
        except urllib.error.HTTPError as e:
            if e.code==400:
                count+=1
                continue
            raise
        if len(cards)!=1:
            ambiguities.add(normalize(name));count+=1;continue
        card=cards[0]
        kind=card.get("type","")
        # Spell/Trap/Skill titles are not "characters".
        if "Monster" not in kind or normalize(card.get("name",""))!=normalize(name):
            ambiguities.add(normalize(name));count+=1;continue
        ident=card.get("id")
        if type(ident) is not int or ident<1:raise ValueError("invalid Yu-Gi-Oh card id")
        key=normalize(name)
        if key in idx and idx[key]["id"]!=ident:raise ValueError("ambiguous Yu-Gi-Oh card")
        idx[key]={"id":ident,"name":card["name"],"url":source["url"]+"?id="+str(ident),
                  "source_sha256":digest}
        count+=1
        if i%5==4:checkpoint("yugioh_progress",lookups=count,total=len(entries),verified=len(idx))
        time.sleep(.2)
    return idx,{"url":source["url"],"reference_count":len(idx),"titles_queried":count,
                "ambiguous_keys":len(ambiguities),"source_type":source["kind"]}


def run(args):
    args.out.mkdir(parents=True,exist_ok=True)
    scope="" if args.only=="all" else "-"+normalize(args.only)
    handle=(args.out/("next-universes-supervised"+scope+".lock")).open("a+b")
    if os.name=="nt":
        import msvcrt
        try:
            handle.seek(0);msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:
            handle.close();print('already_running',flush=True);return 3
    else:
        import fcntl
        try:fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:
            handle.close();print('already_running',flush=True);return 3
    checkpoint=args.out/("next-universes-supervised"+scope+".json")
    state={"mission_id":"tonart-next-sources-20261122",
           "started_at_utc":datetime.now(timezone.utc).isoformat(),
           "status":"running","writes_to_catalog":False,"model_links":False}
    def log(stage,**details):
        state.update({"stage":stage,"updated_at_utc":datetime.now(timezone.utc).isoformat(),**details})
        atomic_json(checkpoint,state)
        print(json.dumps({"stage":stage,**details},ensure_ascii=False),flush=True)
    try:
        with args.queue.open(encoding="utf-8-sig",newline="") as f:
            reader=csv.DictReader(f)
            required={"franchise_candidate_key","display_name_candidate","review_flags"}
            if not required.issubset(reader.fieldnames or []):
                raise ValueError("invalid canonical inventory")
            queue=list(reader)
        log("inventory_loaded",titles=len(queue))
        matches,held,rosters={},[],{}
        requested=list(SOURCES) if args.only=="all" else [args.only]
        for key in requested:
            log("reference_start",franchise=SOURCES[key]["franchise"])
            try:
                if key=="star wars":index,ref=swapi()
                elif key=="digimon":index,ref=digimon()
                elif key=="league of legends":index,ref=league()
                elif key=="genshin impact":index,ref=genshin()
                else:index,ref=yugioh(queue,log)
                rosters[key]=ref
            except Exception as e:
                rosters[key]={"status":"source_unavailable","error":f"{type(e).__name__}: {str(e)[:180]}"}
                log("reference_blocked",franchise=key,detail=rosters[key]["error"])
                continue
            count=0
            for r in queue:
                if normalize(r["franchise_candidate_key"])!=normalize(key):continue
                count+=1
                name=r["display_name_candidate"].strip()
                found=index.get(normalize(name))
                flags=r["review_flags"].strip()
                if found is None or flags:
                    held.append({
                        "franchise":SOURCES[key]["franchise"],"candidate":name,
                        "reason":"editorial_flags" if flags else "no_exact_reference",
                        "flags":flags
                    })
                    continue
                k=(key,found["id"])
                if k not in matches:
                    matches[k]={
                        "franchise":SOURCES[key]["franchise"],
                        "character_name":found["name"],"source_id":found["id"],
                        "source_url":found["url"],
                        "source_sha256":found.get("source_sha256",ref.get("sha256","")),
                        "source_type":"independent_reference_not_official",
                        "exact_candidate_titles":[name],
                        "approved_for_publication":False,
                        "model_links":[],
                    }
                else:
                    matches[k]["exact_candidate_titles"].append(name)
            log("franchise_completed",franchise=key,source_entries=ref["reference_count"],
                titles_scanned=count,
                verified=sum(i[0]==key for i in matches))
        approved=[matches[k] for k in sorted(matches)]
        approved.sort(key=lambda x:(x["franchise"],normalize(x["character_name"])))
        jsonl(args.out/("next-universes-exact"+scope+"-private.jsonl"),approved)
        jsonl(args.out/("next-universes-held"+scope+"-private.jsonl"),held)
        manifest={
            "schema":"tonart.taxonomy.structured-rosters/1",
            "queue_sha256":sha256(args.queue.read_bytes()),
            "references":rosters,"exact_identities":len(approved),"held":len(held),
            "at_utc":datetime.now(timezone.utc).isoformat(),
            "no_canonical_writes":True,"no_model_links":True,
            "warning":source_note
        }
        atomic_json(args.out/("next-universes-manifest"+scope+".json"),manifest)
        state["status"]="completed"
        log("handoff",exact=len(approved),held=len(held),
            resume_ref="sources-hash:"+sha256(json.dumps(rosters,sort_keys=True).encode()))
        return 0
    except Exception as e:
        state.update({"status":"failed","error":f"{type(e).__name__}: {str(e)[:240]}"})
        atomic_json(checkpoint,state)
        raise
    finally:
        try:
            if os.name=="nt":
                handle.seek(0);msvcrt.locking(handle.fileno(),msvcrt.LK_UNLCK,1)
            else: fcntl.flock(handle.fileno(),fcntl.LOCK_UN)
        finally:handle.close()

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue",type=pathlib.Path,required=True)
    parser.add_argument("--out",type=pathlib.Path,required=True)
    parser.add_argument("--only",choices=["all",*SOURCES.keys()],default="all")
    sys.exit(run(parser.parse_args()))
