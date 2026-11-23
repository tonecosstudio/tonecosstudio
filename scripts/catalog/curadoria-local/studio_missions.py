#!/usr/bin/env python3
"""Derived studio boards and two read-only mission views. SQLite remains SSOT."""
import argparse
import hashlib
import json
import os
import re
import sqlite3
import time
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
    """All non-General editor labels, including collections with zero galleries.

    A label without model_groups is *unclassified*, never proof of studio
    authorship. Existing gallery studios preserve their page IDs and SHA.
    """
    with db_open(path) as db:
        groups={x["studio"]:dict(x) for x in db.execute("""
            SELECT studio,COUNT(*) groups,SUM(state='confirmado') groups_confirmed
            FROM model_groups WHERE studio<>? GROUP BY studio""",(EXCLUDED,))}
        # Historical visual audit events are not confirmed names or rights.
        audits={x["studio"]:x["audited"] for x in db.execute("""
            SELECT g.studio,COUNT(DISTINCT g.group_key) audited
            FROM model_groups g JOIN curation_events e
              ON e.group_key=g.group_key
             AND e.event_type='visual_gallery_audited'
            WHERE g.studio<>? GROUP BY g.studio""",(EXCLUDED,))}
        sizes={x["studio"]:dict(x) for x in db.execute("""
            SELECT studio,SUM(photos=1) single_groups,
                   SUM(photos>=2) multi_groups
            FROM (SELECT g.studio,COUNT(m.message_id) photos
              FROM model_groups g LEFT JOIN model_group_members m
              ON m.group_key=g.group_key WHERE g.studio<>?
              GROUP BY g.group_key)
            GROUP BY studio""",(EXCLUDED,))}
        names={x["studio"]:dict(x) for x in db.execute("""
            SELECT n.studio,COUNT(*) images,SUM(gm.message_id IS NULL) ungrouped,
                   SUM(n.status='confirmado') names_confirmed
            FROM name_proposals n JOIN assets a ON a.message_id=n.message_id
            LEFT JOIN model_group_members gm ON gm.message_id=n.message_id
            WHERE a.original_topic<>? GROUP BY n.studio""",(EXCLUDED,))}
        unique_ungrouped={x["studio"]:x["unique_media"] for x in db.execute("""
            SELECT studio,COUNT(*) unique_media FROM (
              SELECT n.studio,a.sha256
              FROM name_proposals n JOIN assets a ON a.message_id=n.message_id
              LEFT JOIN model_group_members gm ON gm.message_id=n.message_id
              WHERE gm.message_id IS NULL AND a.original_topic<>?
              GROUP BY n.studio,a.sha256
            ) GROUP BY studio""",(EXCLUDED,))}
        album_review={x["studio"]:x["review_albums"] for x in db.execute("""
            SELECT studio,COUNT(*) review_albums FROM (
              SELECT n.studio,a.original_topic,a.source_album
              FROM name_proposals n JOIN assets a ON a.message_id=n.message_id
              LEFT JOIN model_group_members gm ON gm.message_id=n.message_id
              WHERE gm.message_id IS NULL AND a.original_topic<>?
                AND TRIM(COALESCE(a.source_album,''))!=''
              GROUP BY n.studio,a.original_topic,a.source_album
              HAVING COUNT(DISTINCT a.sha256)>=2
            ) GROUP BY studio""",(EXCLUDED,))}
    studios=[]
    for name in sorted(set(groups)|set(names),key=str.casefold):
        g=groups.get(name,{})
        n=names.get(name,{})
        count=int(n.get("images") or 0)
        loose=int(n.get("ungrouped") or 0)
        unique=int(unique_ungrouped.get(name) or 0)
        if unique>loose:raise ValueError("Inconsistência: mídia única excede mensagens livres")
        studios.append(dict(
            studio=name,collection_type=("studio_with_groups" if name in groups
                                          else "topic_without_groups"),
            groups=g.get("groups",0),groups_confirmed=g.get("groups_confirmed") or 0,
            groups_with_visual_audit_event=int(audits.get(name) or 0),
            groups_single_photo=int(sizes.get(name,{}).get("single_groups") or 0),
            groups_multiple_photos=int(sizes.get(name,{}).get("multi_groups") or 0),
            images=count,ungrouped=loose,ungrouped_unique_media=unique,
            identical_media_reposts=loose-unique,
            album_review_candidates=int(album_review.get(name) or 0),
            names_confirmed=n.get("names_confirmed") or 0,
            pages=(count+SIZE-1)//SIZE))
    return dict(schema=SCHEMA,studios=studios,studio_count=len(studios),
        registered_studio_count=sum(x["collection_type"]=="studio_with_groups" for x in studios),
        unclassified_collection_count=sum(x["collection_type"]=="topic_without_groups" for x in studios),
        images=sum(x["images"] for x in studios),
        sheets=sum(x["pages"] for x in studios),
        ungrouped=sum(x["ungrouped"] for x in studios),
        ungrouped_unique_media=sum(x["ungrouped_unique_media"] for x in studios),
        identical_media_reposts=sum(x["identical_media_reposts"] for x in studios),
        album_review_candidates=sum(x["album_review_candidates"] for x in studios),
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
        if not db.execute("""SELECT 1 FROM name_proposals n
              JOIN assets a ON a.message_id=n.message_id
              WHERE n.studio=? AND a.original_topic<>? LIMIT 1""",
              (studio,EXCLUDED)).fetchone():
            raise ValueError("Coleção não está na fila Telegram")
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




def gallery_board(path,studio,page=1,limit=12):
    """Live, read-only contact pages by sculpture, never generated JPEGs.

    One card = one existing model_group. Multiple physical views stay attached
    to that group; shared SHA bytes appear only once in the preview strip.
    """
    if not isinstance(studio,str) or not studio or studio==EXCLUDED or len(studio)>120:
        raise ValueError("Estúdio inválido")
    try:
        page=int(page);limit=int(limit)
    except (TypeError,ValueError) as exc:
        raise ValueError("Paginação inválida") from exc
    if not 1<=page<=10000 or limit not in (12,24):
        raise ValueError("Paginação fora dos limites")
    with db_open(path) as db:
        if not db.execute("""SELECT 1 FROM name_proposals WHERE studio=? LIMIT 1""",
                          (studio,)).fetchone():
            raise ValueError("Estúdio não encontrado")
        total=db.execute("""SELECT COUNT(DISTINCT g.group_key)
            FROM model_groups g JOIN model_group_members m USING(group_key)
            JOIN assets a USING(message_id)
            WHERE g.studio=? AND a.original_topic<>?""",
            (studio,EXCLUDED)).fetchone()[0]
        groups=[dict(r) for r in db.execute("""SELECT g.group_key,g.studio,g.title,
                g.universe,g.variant,g.state,g.revision,COUNT(m.message_id) photos
            FROM model_groups g JOIN model_group_members m USING(group_key)
            JOIN assets a USING(message_id)
            WHERE g.studio=? AND a.original_topic<>?
            GROUP BY g.group_key
            ORDER BY g.title COLLATE NOCASE,g.variant COLLATE NOCASE,g.group_key
            LIMIT ? OFFSET ?""",
            (studio,EXCLUDED,limit,(page-1)*limit))]
        if groups:
            group_ids=[r["group_key"] for r in groups]
            placeholders=",".join("?" for _ in group_ids)
            pictures=db.execute("""SELECT m.group_key,a.message_id,a.sha256
                FROM model_group_members m JOIN assets a USING(message_id)
                WHERE m.group_key IN ("""+placeholders+""")
                  AND a.original_topic<>?
                ORDER BY m.group_key,a.message_id""",
                group_ids+[EXCLUDED]).fetchall()
            by_key={key:[] for key in group_ids}
            unique={key:set() for key in group_ids}
            for photo in pictures:
                key=photo["group_key"]
                fingerprint=photo["sha256"] or "message:"+str(photo["message_id"])
                if fingerprint in unique[key]:
                    continue
                unique[key].add(fingerprint)
                if len(by_key[key])<4:
                    by_key[key].append(photo["message_id"])
            for group in groups:
                key=group["group_key"]
                group["preview_ids"]=by_key[key]
                group["unique_photos"]=len(unique[key])
    return dict(schema=SCHEMA,studio=studio,page=page,limit=limit,
                total=total,pages=(total+limit-1)//limit,items=groups,
                read_only=True,automatic_decisions=False)

def identity_candidates(path,studio,cursor=0,limit=24,query=""):
    """Read-only candidate names, not character identity approvals.

    Gallery IDs remain separate per sculpt and variant. Here one text label
    is counted ONCE across photo proposals, without assuming equal titles
    identify the same official character, source or commercial model.
    """
    if not isinstance(studio,str) or not studio or studio==EXCLUDED or len(studio)>120:
        raise ValueError("Estúdio inválido")
    if not isinstance(query,str) or len(query)>80:
        raise ValueError("Pesquisa inválida")
    try:cursor=int(cursor);limit=int(limit)
    except (TypeError,ValueError) as exc:raise ValueError("Paginação inválida") from exc
    if cursor<0 or cursor>10000 or limit not in (12,24,48):
        raise ValueError("Paginação fora do limite")
    with db_open(path) as db:
        params=[studio,EXCLUDED]
        clause=""
        if query.strip():
            clause=" AND (n.title LIKE ? OR n.universe LIKE ?)"
            pattern="%"+query.strip().replace("%","\\%").replace("_","\\_")+"%"
            clause=clause.replace(" LIKE ?"," LIKE ? ESCAPE '\\'")
            params.extend((pattern,pattern))
        sql="""SELECT n.title,n.universe,COUNT(*) photos,
              SUM(n.status='confirmado') confirmed,
              SUM(n.status='revisar') name_review,
              COUNT(DISTINCT gm.group_key) galleries,
              SUM(gm.group_key IS NULL) ungrouped,
              COUNT(DISTINCT CASE WHEN n.status='confirmado'
                    THEN NULLIF(n.official_url,'') END) confirmed_sources,
              MIN(n.message_id) first_id
            FROM name_proposals n JOIN assets a USING(message_id)
            LEFT JOIN model_group_members gm USING(message_id)
            WHERE n.studio=? AND a.original_topic<>?
            AND TRIM(n.title)!=''""" + clause + """
            GROUP BY LOWER(TRIM(n.title)),LOWER(TRIM(n.universe))
            ORDER BY (COUNT(*)-SUM(n.status='confirmado')) DESC,
                     galleries DESC,LOWER(n.title),LOWER(n.universe)"""
        rows=db.execute(sql+" LIMIT ? OFFSET ?",params+[limit+1,cursor]).fetchall()
        total=db.execute("SELECT COUNT(*) FROM ("+sql+")",params).fetchone()[0]
        items=[]
        for r in rows[:limit]:
            # An ordinary title is not automatically a canonical character.
            title=r["title"].casefold()
            flags=[]
            if any(w in title for w in (" pack"," gun"," handgun"," sword"," weapon"," prop"," swag"," accessory")):
                flags.append("possible_accessory_or_pack")
            if any(w in title for w in (" & "," and "," vs "," versus "," / ")):
                flags.append("possible_multiple_characters")
            if any(w in title for w in (" poster"," bust"," wall"," diorama"," sculpture")):
                flags.append("title_contains_model_type")
            rank=db.execute("""SELECT COUNT(*) FROM name_proposals n
                JOIN assets a USING(message_id)
                WHERE n.studio=? AND a.original_topic<>? AND n.message_id<?""",
                (studio,EXCLUDED,r["first_id"])).fetchone()[0]
            items.append({"title":r["title"],"universe":r["universe"],
                "photos":r["photos"],"confirmed":r["confirmed"],
                "review":r["name_review"],"unconfirmed":r["photos"]-r["confirmed"],
                "galleries":r["galleries"],"ungrouped":r["ungrouped"],
                "confirmed_sources":r["confirmed_sources"],
                "first_id":r["first_id"],"page_hint":rank//SIZE+1,
                "flags":flags,"is_canonical_character":False,
                "auto_confirmed":False})
    return {"schema":SCHEMA,"studio":studio,"query":query,"cursor":cursor,
        "limit":limit,"total":total,"next_cursor":cursor+limit if len(rows)>limit else None,
        "items":items,"read_only":True,"auto_merge":False,
        "auto_confirm":False,"note":"Título candidato não é identidade oficial ou licença."}


def review_candidates(path,kind="albums",studio="",cursor=0,limit=24):
    """One bounded, read-only evidence queue; never merge or rename by query.

    Albums require >=2 distinct SHA among ungrouped photographs.
    Reposts show *registered* same-SHA media anchored to a grouped message,
    with conflicts identified explicitly (physical SHA recheck before POST).
    """
    if kind not in ("albums","reposts"):
        raise ValueError("Tipo de fila desconhecido")
    if not isinstance(studio,str) or len(studio)>120 or studio==EXCLUDED:
        raise ValueError("Filtro de estúdio inválido")
    try:
        cursor=int(cursor);limit=int(limit)
    except (TypeError,ValueError) as exc:
        raise ValueError("Parâmetros de fila inválidos") from exc
    if cursor<0 or cursor>9007199254740991 or limit not in (12,24,48):
        raise ValueError("Cursor ou limite fora dos valores permitidos")
    with db_open(path) as db:
        if studio and not db.execute("""SELECT 1 FROM name_proposals n
                 JOIN assets a USING(message_id) WHERE n.studio=?
                 AND a.original_topic<>? LIMIT 1""",(studio,EXCLUDED)).fetchone():
            raise ValueError("Coleção ausente da curadoria")
        params=[EXCLUDED]
        clause=""
        if studio:
            clause=" AND n.studio=?"
            params.append(studio)
        items=[]
        if kind=="albums":
            rows=db.execute("""SELECT n.studio,a.original_topic,a.source_album,
                COUNT(*) messages,COUNT(DISTINCT a.sha256) unique_sha,
                MIN(a.message_id) first_id
                FROM name_proposals n JOIN assets a USING(message_id)
                LEFT JOIN model_group_members gm USING(message_id)
                WHERE gm.message_id IS NULL AND a.original_topic<>?
                AND TRIM(COALESCE(a.source_album,''))!=''"""+clause+"""
                GROUP BY n.studio,a.original_topic,a.source_album
                HAVING COUNT(DISTINCT a.sha256)>=2 AND MIN(a.message_id)>?
                ORDER BY first_id LIMIT ?""",params+[cursor,limit+1]).fetchall()
            for r in rows[:limit]:
                album=db.execute("""SELECT n.message_id,n.title,a.sha256
                    FROM name_proposals n JOIN assets a USING(message_id)
                    LEFT JOIN model_group_members gm USING(message_id)
                    WHERE gm.message_id IS NULL AND n.studio=? AND a.original_topic=?
                    AND a.source_album=? ORDER BY n.message_id LIMIT 120""",
                    (r["studio"],r["original_topic"],r["source_album"])).fetchall()
                rank=db.execute("""SELECT COUNT(*) FROM name_proposals n
                    JOIN assets a USING(message_id) WHERE n.studio=?
                    AND a.original_topic<>? AND n.message_id<?""",
                    (r["studio"],EXCLUDED,r["first_id"])).fetchone()[0]
                items.append({
                    "studio":r["studio"],"topic":r["original_topic"],
                    "album_id":r["source_album"],"first_id":r["first_id"],
                    "messages":r["messages"],"unique_sha":r["unique_sha"],
                    "sample_ids":[x["message_id"] for x in album[:6]],
                    "titles":sorted({x["title"] or "(sem nome)" for x in album})[:8],
                    "page_hint":rank//SIZE+1,
                    "review_state":"multiple_distinct_media_unreviewed",
                    "note":"Álbum e rótulo iguais não provam mesma escultura",
                })
            tail=rows[:limit]
            next_cursor=tail[-1]["first_id"] if len(rows)>limit and tail else None
        else:
            rows=db.execute("""SELECT n.message_id,n.studio,n.title,n.universe,
                n.variant,a.original_topic,a.sha256,
                COUNT(DISTINCT mg.group_key) anchored_groups,
                MIN(mg.group_key) group_key,MIN(anchor.message_id) anchor_id
                FROM name_proposals n JOIN assets a USING(message_id)
                LEFT JOIN model_group_members own USING(message_id)
                JOIN assets anchor ON anchor.sha256=a.sha256
                   AND anchor.message_id<>a.message_id
                JOIN model_group_members mg ON mg.message_id=anchor.message_id
                WHERE own.message_id IS NULL AND a.original_topic<>?
                """+clause+""" AND n.message_id>?
                GROUP BY n.message_id,n.studio,n.title,n.universe,
                   n.variant,a.original_topic,a.sha256
                ORDER BY n.message_id LIMIT ?""",
                params+[cursor,limit+1]).fetchall()
            for r in rows[:limit]:
                group=db.execute("""SELECT studio,title,universe,variant,
                    state,revision FROM model_groups WHERE group_key=?""",
                    (r["group_key"],)).fetchone()
                origins=db.execute("""SELECT DISTINCT a.original_topic
                    FROM model_group_members m JOIN assets a USING(message_id)
                    WHERE m.group_key=?""",(r["group_key"],)).fetchall()
                origin_matches=len(origins)==1 and origins[0][0]==r["original_topic"]
                metadata_matches=bool(group) and all(
                    str(r[field] or "").strip().casefold()==
                    str(group[field] or "").strip().casefold()
                    for field in ("studio","title","universe","variant"))
                if r["anchored_groups"]!=1:reason="ambiguous_multiple_gallery_anchors"
                elif not group or not origin_matches:reason="source_topic_mismatch"
                elif group["state"]=="confirmado":reason="confirmed_gallery_locked"
                elif not metadata_matches:reason="metadata_or_variant_mismatch"
                else:reason="physical_sha_recheck_required"
                rank=db.execute("""SELECT COUNT(*) FROM name_proposals n
                    JOIN assets a USING(message_id) WHERE n.studio=?
                    AND a.original_topic<>? AND n.message_id<?""",
                    (r["studio"],EXCLUDED,r["message_id"])).fetchone()[0]
                items.append({
                    "studio":r["studio"],"message_id":r["message_id"],
                    "title":r["title"],"group_key":r["group_key"],
                    "group_title":group["title"] if group else "",
                    "group_state":group["state"] if group else "",
                    "anchor_message_id":r["anchor_id"],
                    "anchored_groups":r["anchored_groups"],
                    "evidence_sha256":r["sha256"],
                    "page_hint":rank//SIZE+1,
                    "review_state":reason,
                    "automatic_merge":False,
                    "note":"Mesmo SHA registrado; revalidar bytes físicos e revisão antes de vincular",
                })
            tail=rows[:limit]
            next_cursor=tail[-1]["message_id"] if len(rows)>limit and tail else None
    return {"schema":SCHEMA,"kind":kind,"studio":studio,"cursor":cursor,
            "limit":limit,"items":items,"next_cursor":next_cursor,
            "read_only":True,"automatic_merge":False,"automatic_naming":False}

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

def _atomic_replace(src, dst):
    """Bounded Windows sharing-violation retry; never swallow write failures."""
    waits=(0.0,0.1,0.25,0.5,1.0,2.0)
    for attempt, wait in enumerate(waits):
        if wait:time.sleep(wait)
        try:
            os.replace(src,dst)
            return
        except PermissionError as exc:
            # Error 5 can mean a temporary file handle held without
            # FILE_SHARE_DELETE; 32 is ERROR_SHARING_VIOLATION. Exhaust the
            # bounded attempts and propagate the *actual* error.
            if (os.name!="nt" or getattr(exc,"winerror",None) not in (5,32)
                    or attempt==len(waits)-1):
                raise


def _write_json_atomic(path, payload):
    """Write a disposable sidecar and only then atomically publish JSON."""
    temp=path.with_name(path.name+".tmp")
    temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",
                    encoding="utf-8")
    _atomic_replace(temp,path)


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
        # Never replace the last fully committed manifest with a prefix.
        # Resume checkpoints are disposable and do not grant "complete".
        progress=folder/"manifest.progress.json"
        previous={}
        for candidate in (mf,progress):
            try:
                doc=json.loads(candidate.read_text(encoding="utf-8"))
                if (doc.get("schema")!=SCHEMA or doc.get("studio")!=studio["studio"]
                    or doc.get("images")!=studio["images"]
                    or doc.get("pages")!=studio["pages"]):
                    continue
                previous.update({x["page"]:x for x in doc.get("sheets",[])
                                 if isinstance(x,dict) and isinstance(x.get("page"),int)})
            except (OSError,ValueError,KeyError,TypeError):
                continue
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
                temp=dest.with_suffix(".jpg.tmp");temp.write_bytes(jpeg);_atomic_replace(temp,dest)
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
            _write_json_atomic(progress,manifest)
        if len(pages)!=studio["pages"]:
            raise RuntimeError("Não publicar manifesto de estúdio incompleto")
        # A transient failure here leaves the old manifest intact, and the
        # full progress sidecar permits an idempotent retry on the next run.
        _write_json_atomic(mf,manifest)
        try:
            progress.unlink(missing_ok=True)
        except PermissionError:
            # Not a source of truth, safe to discard at next successful run.
            pass
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
    _write_json_atomic(root/"index.json",result)
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
