#!/usr/bin/env python3
"""Derived studio boards and two read-only mission views. SQLite remains SSOT."""
import argparse
import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

SIZE=24
SCHEMA="tonart.studio-missions/1"
EXCLUDED="Geral + 50k"

class _ReadConnection(sqlite3.Connection):
    """Windows must close handles, not just commit the context on exit."""
    def __exit__(self, exc_type, exc, tb):
        try:
            return super().__exit__(exc_type, exc, tb)
        finally:
            self.close()

def db_open(path):
    db=sqlite3.connect("file:"+Path(path).resolve().as_posix()+"?mode=ro",
                       uri=True,timeout=5,factory=_ReadConnection)
    db.row_factory=sqlite3.Row
    db.execute("PRAGMA query_only=ON")
    db.execute("PRAGMA busy_timeout=5000")
    return db

def studio_index(path):
    with db_open(path) as db:
        groups={x["studio"]:dict(x) for x in db.execute("""
            SELECT studio,COUNT(*) groups,SUM(state='confirmado') groups_confirmed
            FROM model_groups WHERE studio<>? GROUP BY studio""",(EXCLUDED,))}
        names={x["studio"]:dict(x) for x in db.execute("""
            SELECT n.studio,COUNT(*) images,SUM(gm.message_id IS NULL) ungrouped,
                   SUM(n.status='confirmado') names_confirmed
            FROM name_proposals n JOIN assets a ON a.message_id=n.message_id
            LEFT JOIN model_group_members gm ON gm.message_id=n.message_id
            WHERE n.studio IN (SELECT studio FROM model_groups)
              AND a.original_topic<>? GROUP BY n.studio""",(EXCLUDED,))}
    studios=[]
    for name in sorted(groups,key=str.casefold):
        g=groups[name]; n=names.get(name,{})
        count=int(n.get("images") or 0)
        studios.append(dict(studio=name,groups=g["groups"],
            groups_confirmed=g["groups_confirmed"] or 0,
            images=count,ungrouped=n.get("ungrouped") or 0,
            names_confirmed=n.get("names_confirmed") or 0,
            pages=(count+SIZE-1)//SIZE))
    return dict(schema=SCHEMA,studios=studios,studio_count=len(studios),
        images=sum(x["images"] for x in studios),
        sheets=sum(x["pages"] for x in studios),
        missions=["grouping","naming"],read_only=True)

def board_page(path,studio,mission="grouping",page=1,limit=SIZE,include_paths=False):
    if mission not in ("grouping","naming"):raise ValueError("Missão desconhecida")
    if not isinstance(studio,str) or not studio or len(studio)>120 or studio==EXCLUDED:
        raise ValueError("Estúdio inválido")
    try:page=int(page);limit=int(limit)
    except (TypeError,ValueError) as exc:raise ValueError("Paginação inválida") from exc
    if page<1 or page>10000 or limit not in (12,24,48):
        raise ValueError("Paginação fora dos limites")
    with db_open(path) as db:
        if not db.execute("SELECT 1 FROM model_groups WHERE studio=? LIMIT 1",(studio,)).fetchone():
            raise ValueError("Estúdio não está na fila canônica")
        total=db.execute("""SELECT COUNT(*) FROM name_proposals n
            JOIN assets a ON a.message_id=n.message_id
            WHERE n.studio=? AND a.original_topic<>?""",(studio,EXCLUDED)).fetchone()[0]
        rows=db.execute("""SELECT n.message_id,n.studio,n.title,n.universe,n.variant,n.filename,
                n.status,n.revision,n.notes,n.official_url,
                a.sha256,a.source_relative,a.source_caption,a.source_album,
                a.original_topic,gm.group_key,g.state group_state,g.revision group_revision
            FROM name_proposals n JOIN assets a ON a.message_id=n.message_id
            LEFT JOIN model_group_members gm ON gm.message_id=n.message_id
            LEFT JOIN model_groups g ON g.group_key=gm.group_key
            WHERE n.studio=? AND a.original_topic<>?
            ORDER BY n.message_id LIMIT ? OFFSET ?""",
            (studio,EXCLUDED,limit,(page-1)*limit)).fetchall()
    items=[]
    for row in rows:
        r=dict(row)
        r["mission_state"]=(
            ("ungrouped" if not r["group_key"] else
             "review" if r["group_state"]!="confirmado" else "existing_group")
            if mission=="grouping" else
            ("confirmed" if r["status"]=="confirmado" else
             "review" if r["status"]=="revisar" else "needs_name"))
        r["gallery_key"]=r["group_key"]
        r["gallery_image_count"]=0
        r["thumbnail_url"]=f"/thumb/{r['message_id']}?w=256"
        r["original_url"]=f"/media/{r['message_id']}"
        if not include_paths:r.pop("source_relative")
        items.append(r)
    return dict(schema=SCHEMA,studio=studio,mission=mission,page=page,
        limit=limit,pages=(total+limit-1)//limit,total=total,
        items=items,read_only=True,automatic_decisions=False)

def _slug(s):
    return (re.sub("[^a-z0-9]+","-",s.casefold()).strip("-")[:50] or "studio")+"-"+hashlib.sha256(s.encode()).hexdigest()[:8]

def _source(root,rel):
    base=Path(root).resolve();p=(base/rel).resolve()
    if not p.is_relative_to(base):raise ValueError("Mídia fora da origem")
    return p

def render_sheet(items,studio,page,source_root):
    from PIL import Image,ImageDraw,ImageFont
    import thumbnail_curadoria as thumbs
    output=Image.new("RGB",(1152,1604),"#191b20")
    draw=ImageDraw.Draw(output)
    try:
        font=ImageFont.truetype("arial.ttf",15)
        small=ImageFont.truetype("arial.ttf",12)
    except OSError:
        font=ImageFont.load_default();small=font
    draw.text((18,14),studio[:60],fill="#f2eee8",font=font)
    draw.text((18,39),f"Prancha {page} | {len(items)} fotos | missao 1: galerias; missao 2: nomes",
              fill="#c0c1c9",font=small)
    errors=[]
    for i,r in enumerate(items):
        x=14+(i%4)*286;y=65+(i//4)*255
        draw.rounded_rectangle((x,y,x+277,y+247),radius=8,
                               fill="#292b32",outline="#454752")
        try:
            path=_source(source_root,r["source_relative"])
            data=thumbs.thumbnail(path,r["sha256"],256)
            with Image.open(BytesIO(data)) as thumb:
                im=thumb.convert("RGB")
                im.thumbnail((260,193),Image.Resampling.LANCZOS)
                output.paste(im,(x+(278-im.width)//2,y+5+(194-im.height)//2))
                im.close()
        except (OSError,ValueError,thumbs.ThumbnailUnavailable) as exc:
            errors.append({"id":r["message_id"],"error":type(exc).__name__})
            draw.text((x+10,y+90),"PREVIEW INDISPONIVEL",fill="#ff9999",font=small)
        title=str(r.get("title") or "(sem nome)").replace("\n"," ")[:35]
        draw.text((x+8,y+203),f"#{r['message_id']} {title}",
                  fill="#f7f4ec",font=small)
        group=r.get("group_key")
        label="GRUPO "+group[:8] if group else "SEM GRUPO"
        draw.text((x+8,y+223),(label+" | "+r["status"])[:43],
                  fill="#bde0bd" if group else "#ffbf89",font=small)
    buf=BytesIO()
    output.save(buf,"JPEG",quality=80,optimize=True)
    output.close()
    return buf.getvalue(),errors

def generate_all(path,source_root,output_root,studios=None,max_studios=0,write_index=True):
    idx=studio_index(path)
    selected=[s for s in idx["studios"] if studios is None or s["studio"] in studios]
    if studios and len(selected)!=len(set(studios)):
        raise ValueError("Estúdio desconhecido")
    if max_studios:selected=selected[:max_studios]
    root=Path(output_root).resolve();root.mkdir(parents=True,exist_ok=True)
    summary=[]
    for studio in selected:
        folder=root/_slug(studio["studio"]);folder.mkdir(parents=True,exist_ok=True)
        mf=folder/"manifest.json"
        try:
            previous={x["page"]:x for x in json.loads(mf.read_text(encoding="utf-8"))["sheets"]}
        except (OSError,ValueError,KeyError):previous={}
        pages=[]
        for number in range(1,studio["pages"]+1):
            board=board_page(path,studio["studio"],page=number,include_paths=True)
            items=board["items"]
            fingerprint=hashlib.sha256(json.dumps([
                (r["message_id"],r["sha256"],r["group_key"],r["group_revision"],
                 r["status"],r["revision"],r["title"]) for r in items
                ],ensure_ascii=False).encode()).hexdigest()
            dest=folder/f"prancha-{number:03}.jpg"
            old=previous.get(number,{})
            if (old.get("fingerprint")==fingerprint and dest.is_file()
                and old.get("sha256")==hashlib.sha256(dest.read_bytes()).hexdigest()):
                entry=old
            else:
                jpeg,errors=render_sheet(items,studio["studio"],number,source_root)
                temp=dest.with_suffix(".jpg.tmp");temp.write_bytes(jpeg);os.replace(temp,dest)
                entry={"page":number,"file":dest.name,"images":len(items),
                       "fingerprint":fingerprint,
                       "sha256":hashlib.sha256(jpeg).hexdigest(),"errors":errors}
            pages.append(entry)
            manifest={"schema":SCHEMA,"studio":studio["studio"],
                      "role":"DERIVED PRIVATE - SQLite is SSOT",
                      "missions":["grouping","naming"],"read_only":True,
                      "images":studio["images"],"pages":studio["pages"],
                      "updated_at":datetime.now(timezone.utc).isoformat(),
                      "sheets":pages}
            tmp=mf.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            os.replace(tmp,mf)
        summary.append({"studio":studio["studio"],"images":studio["images"],
                        "pages":len(pages),"preview_errors":sum(len(p["errors"]) for p in pages)})
    result={"schema":SCHEMA,"studios":summary,"studio_count":len(summary),
            "images":sum(x["images"] for x in summary),
            "sheets":sum(x["pages"] for x in summary),
            "preview_errors":sum(x["preview_errors"] for x in summary),
            "missions":["grouping","naming"],"source_read_only":True}
    # Partial/smoke runs never overwrite the authoritative *completion* index.
    if write_index and studios is None and not max_studios:
        return finalize_index(path, root)
    return result

def shard_for_studio(studio, count):
    """Stable ownership even if another studio is later added."""
    if not 1 <= count <= 8:
        raise ValueError("Quantidade de shards fora do limite")
    return int(hashlib.sha256(studio.encode("utf-8")).hexdigest()[:12],16) % count

def finalize_index(path, output_root):
    """Fail-closed complete index, only when every JPEG and SHA is present."""
    expected=studio_index(path)
    root=Path(output_root).resolve()
    records=[]
    for spec in expected["studios"]:
        folder=root/_slug(spec["studio"])
        manifest=folder/"manifest.json"
        complete=False
        completed_pages=0
        errors=0
        reason=""
        try:
            m=json.loads(manifest.read_text(encoding="utf-8"))
            if m.get("schema")!=SCHEMA or m.get("studio")!=spec["studio"]:
                raise ValueError("Manifesto de outro estúdio/schema")
            if m.get("pages")!=spec["pages"] or m.get("images")!=spec["images"]:
                raise ValueError("Inventário mudou; regenerar recorte")
            sheets=m.get("sheets",[])
            if len(sheets)!=spec["pages"]:
                raise ValueError("Pranchas incompletas")
            for i,sheet in enumerate(sheets,1):
                if sheet.get("page")!=i or sheet.get("file")!=f"prancha-{i:03}.jpg":
                    raise ValueError("Página ou nome divergente")
                photo=folder/sheet["file"]
                if not photo.is_file() or hashlib.sha256(photo.read_bytes()).hexdigest()!=sheet.get("sha256"):
                    raise ValueError("JPEG ausente ou alterado")
                # The JPEG's own checksum is not sufficient. Another
                # Curadoria mission can revise a name/group while sharded
                # rendering is running. Reject stale snapshots against
                # the CURRENT read-only SQLite record before publishing GO.
                live=board_page(path,spec["studio"],page=i,limit=SIZE)
                current=hashlib.sha256(json.dumps([
                    (r["message_id"],r["sha256"],r["group_key"],r["group_revision"],
                     r["status"],r["revision"],r["title"]) for r in live["items"]
                ],ensure_ascii=False).encode()).hexdigest()
                if sheet.get("fingerprint")!=current:
                    raise ValueError("Estado editorial mudou; regerar prancha")
                completed_pages+=1
                errors+=len(sheet.get("errors",[]))
            complete=True
        except (OSError,ValueError,KeyError,TypeError) as exc:
            reason=str(exc)[:140]
        records.append({"studio":spec["studio"],"images":spec["images"],
                        "pages":spec["pages"],"validated_pages":completed_pages,
                        "complete":complete,"preview_errors":errors,
                        "blocker":reason})
    done=sum(x["complete"] for x in records)
    pages=sum(x["validated_pages"] for x in records)
    errors=sum(x["preview_errors"] for x in records)
    all_done=done==expected["studio_count"]
    state=("complete" if errors==0 else "complete_with_preview_errors") if all_done else "incomplete"
    result={
        "schema":SCHEMA,"state":state,"generation_complete":all_done and errors==0,
        "studio_count":done,"expected_studios":expected["studio_count"],
        "sheets":pages,"expected_sheets":expected["sheets"],
        "images":sum(x["images"] for x in records if x["complete"]),
        "expected_images":expected["images"],
        "preview_errors":errors,"missions":["grouping","naming"],
        "source_read_only":True,"curation_automatically_approved":False,
        "studios":records,
        "verified_at":datetime.now(timezone.utc).isoformat(),
    }
    root.mkdir(parents=True,exist_ok=True)
    tmp=root/"index.json.tmp"
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,root/"index.json")
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite",required=True,type=Path)
    parser.add_argument("--media-root",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    parser.add_argument("--studio",action="append")
    parser.add_argument("--max-studios",type=int,default=0)
    parser.add_argument("--shards",type=int,default=1)
    parser.add_argument("--shard-index",type=int,default=0)
    parser.add_argument("--finalize-only",action="store_true")
    a=parser.parse_args()
    if a.max_studios<0:parser.error("Limite negativo")
    if not 1<=a.shards<=8 or not 0<=a.shard_index<a.shards:
        parser.error("Shard fora dos limites")
    if a.finalize_only:
        result=finalize_index(a.sqlite,a.out)
    elif a.shards>1:
        if a.studio or a.max_studios:parser.error("Shard não aceita filtro de estúdio")
        names=[x["studio"] for x in studio_index(a.sqlite)["studios"]
               if shard_for_studio(x["studio"],a.shards)==a.shard_index]
        result=generate_all(a.sqlite,a.media_root,a.out,names,write_index=False)
        result.update(shards=a.shards,shard_index=a.shard_index)
    else:
        result=generate_all(a.sqlite,a.media_root,a.out,a.studio,a.max_studios)
    print(json.dumps(result,ensure_ascii=False))
    if a.finalize_only and not result["generation_complete"]:
        raise SystemExit(2)
if __name__=="__main__":main()
