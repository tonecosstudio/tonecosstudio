#!/usr/bin/env python3
"""Galerias de diferentes vistas da MESMA estatueta, no SQLite canônico.

Não nomeia personagens por semelhança, não modifica originais e não publica.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path
import smart_curadoria as smart

def register_visual_gallery(db_path,message_ids,topic,note="",*,
                            source_root=None,expected_sha256=None,
                            expected_revision=None,editorial_only=False):
    """Group reviewed angles, or photo-only galleries WITHOUT naming approval.

    editorial_only requires a photographed render's existing provisional
    identity and physical SHA, but does not require a confirmed character.
    Both paths create a gallery in REVIEW, never commercial publication.
    """
    if type(editorial_only) is not bool:
        raise ValueError("Modo editorial inválido")
    if not isinstance(message_ids,(list,tuple)) or not 1<=len(message_ids)<=500:
        raise ValueError("Selecione de 1 a 500 imagens")
    singleton=len(message_ids)==1
    if editorial_only and not singleton:
        raise ValueError("Modo editorial apenas para fotografia única")
    note=str(note or "").strip()
    if singleton:
        if (source_root is None or not isinstance(expected_sha256,str)
            or not re.fullmatch("[0-9a-f]{64}",expected_sha256)
            or type(expected_revision) is not int or expected_revision<0
            or not 65<=len(note)<=600):
            raise ValueError("Foto única exige fonte, SHA, revisão e justificativa de 65 a 600 caracteres")
    ids=[int(x) for x in message_ids]
    if len(set(ids))!=len(ids) or min(ids)<=0:raise ValueError("IDs repetidos ou inválidos")
    ids.sort()
    topic=str(topic or "").strip()
    if not topic or len(topic)>120:raise ValueError("Tópico inválido")
    group_key=hashlib.sha256(json.dumps(["visual-angles-v1",topic,ids[0]],
        ensure_ascii=False).encode()).hexdigest()[:24]
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        rows=db.execute("""SELECT a.message_id,a.original_topic,a.source_relative,a.sha256,
            p.studio,p.title,p.universe,p.variant,p.status AS name_status,
            p.official_url,p.evidence_type,p.revision AS name_revision,
            a.source_caption,m.group_key AS previous_key,m.match_reason,g.state AS group_state,
            EXISTS(SELECT 1 FROM curation_events ev
              WHERE ev.group_key=m.group_key
                AND ev.event_type='visual_gallery_audited') AS gallery_visual_audited
            FROM assets a LEFT JOIN name_proposals p USING(message_id)
            LEFT JOIN model_group_members m USING(message_id)
            LEFT JOIN model_groups g ON g.group_key=m.group_key
            WHERE a.message_id IN ("""+",".join("?" for _ in ids)+")",ids).fetchall()
        if len(rows)!=len(ids) or any(r["original_topic"]!=topic for r in rows):
            raise ValueError("Mensagem não encontrada ou mistura de tópicos")
        names={(smart.normalize(r["studio"]),smart.normalize(r["title"]),
                smart.normalize(r["universe"]),smart.normalize(r["variant"]))
               for r in rows if (r["title"] or "").strip()}
        if len(names)>1:
            raise ValueError("Identidades ou variantes discordantes: não unir")
        if singleton:
            item=rows[0]
            existing=db.execute("SELECT state FROM model_groups WHERE group_key=?",(group_key,)).fetchone()
            if item["previous_key"]==group_key and existing:
                previous=db.execute("""SELECT detail FROM curation_events WHERE group_key=?
                    AND event_type='visual_singleton_reviewed' LIMIT 1""",(group_key,)).fetchone()
                if previous:
                    prior=json.loads(previous["detail"])
                    return {"group_key":group_key,"image_count":1,
                        "title":item["title"],"studio":item["studio"],
                        "state":existing["state"],"created":False,"replayed":True,
                        "singleton":True,"editorial_only":bool(prior.get("editorial_only")),
                        "names_changed":False,"rights_changed":False,
                        "originals_modified":False}
            if item["previous_key"] is not None or existing:
                raise ValueError("A foto já pertence a uma galeria")
            if item["name_revision"]!=expected_revision:
                raise RuntimeError("Nome alterado: recarregue a revisão")
            if editorial_only:
                if (item["name_status"] not in ("provavel","revisar")
                    or not item["title"] or not item["studio"] or item["studio"]!=topic
                    or item["evidence_type"]!="embedded_render_title"
                    or (item["source_caption"] or "").strip()):
                    raise ValueError("Revisão de foto única exige título legível no render, sem legenda estruturada e status editorial provisório")
            elif (item["name_status"]!="confirmado" or not item["title"] or
                  not item["studio"] or item["studio"]!=topic or not item["official_url"]
                  or not item["official_url"].startswith("https://")):
                raise ValueError("Foto única exige nome confirmado com fonte oficial HTTPS")
            if item["sha256"]!=expected_sha256:
                raise ValueError("Prova SHA da foto divergiu do catálogo")
            source_root=Path(source_root).resolve()
            photo=(source_root/item["source_relative"]).resolve()
            if (not photo.is_relative_to(source_root) or not photo.is_file()
                or photo.stat().st_size>30*1024*1024):
                raise ValueError("Original físico ausente ou externo")
            with photo.open("rb") as handle:
                digest=hashlib.file_digest(handle,"sha256").hexdigest()
            if digest!=item["sha256"]:
                raise ValueError("Original divergiu do SHA-256 físico")
            duplicate=db.execute("""SELECT m.message_id FROM model_group_members m
                JOIN assets a USING(message_id)
                WHERE a.sha256=? AND a.message_id!=? LIMIT 1""",
                (item["sha256"],item["message_id"])).fetchone()
            if duplicate:
                raise ValueError("Mesmo render já agrupado; revisar variantes em vez de duplicar a escultura")
        for r in rows:
            if r["previous_key"]!=group_key and (
                r["match_reason"] in ("reviewed_angles","reviewed_split")
                or r["gallery_visual_audited"] or r["group_state"]=="confirmado"):
                raise ValueError("Imagem já pertence a outra galeria revisada ou confirmada")
        named=next((r for r in rows if (r["title"] or "").strip()),None)
        studio=named["studio"] if named else topic
        title=named["title"] if named else "Modelo sem nome #"+str(ids[0])
        universe=named["universe"] if named else ""
        variant=named["variant"] if named else ""
        old=db.execute("SELECT state FROM model_groups WHERE group_key=?",
                       (group_key,)).fetchone()
        if old and old["state"]=="confirmado":
            raise ValueError("Galeria confirmada exige revisão explícita")
        db.execute("""INSERT INTO model_groups(
           group_key,studio,title,universe,variant,state,confidence,created_at,updated_at)
           VALUES(?,?,?,?,?,'revisar',?,?,?)
           ON CONFLICT(group_key) DO UPDATE SET
           studio=excluded.studio,title=excluded.title,
           universe=excluded.universe,variant=excluded.variant,
           updated_at=excluded.updated_at
           WHERE model_groups.state!='confirmado'""",
           (group_key,studio,title,universe,variant,0.0 if singleton else 0.90,stamp,stamp))
        for mid in ids:
            db.execute("""INSERT INTO model_group_members
                (message_id,group_key,match_reason,updated_at)
                VALUES(?,?,?,?)
                ON CONFLICT(message_id) DO UPDATE SET
                group_key=excluded.group_key,match_reason=excluded.match_reason,
                updated_at=excluded.updated_at""",
                (mid,group_key,"reviewed_single_original" if singleton else "reviewed_angles",stamp))
            db.execute("""INSERT OR IGNORE INTO model_group_evidence
                 (group_key,source_url,source_type,description,recorded_at)
                 VALUES(?,?,?,?,?)""",
                 (group_key,smart.SOURCE_C+str(mid),"visual_review",
                  (str(note or "").strip() or
                   "Mesmo produto em ângulos diferentes; identidade e licença ainda não confirmadas")[:500],
                  stamp))
        if not old:
            if singleton:
                detail=json.dumps({"message_id":ids[0],"sha256":item["sha256"],
                    "name_status":item["name_status"],
                    "identity_url":item["official_url"] if not editorial_only else "",
                    "identity_evidence_type":item["evidence_type"],
                    "editorial_only":editorial_only,
                    "visual_review":note,"original_preserved":True,
                    "gallery_state":"revisar","rights_approved":False,
                    "publication_approved":False},ensure_ascii=False,sort_keys=True)
                for event_type in ("visual_singleton_reviewed","visual_gallery_audited"):
                    db.execute("""INSERT INTO curation_events
                        (group_key,event_type,detail,occurred_at) VALUES(?,?,?,?)""",
                        (group_key,event_type,detail,stamp))
                if not editorial_only:
                    db.execute("""INSERT OR IGNORE INTO model_group_evidence
                        (group_key,source_url,source_type,description,recorded_at)
                        VALUES(?,?,'official_identity_only',?,?)""",
                        (group_key,item["official_url"],
                         "Confirma somente identidade editorial; não licença ou direito de publicação",
                         stamp))
            else:
                db.execute("""INSERT INTO curation_events
                    (group_key,event_type,detail,occurred_at)
                    VALUES(?,'reviewed_angles',?,?)""",
                    (group_key,"IDs "+",".join(map(str,ids)),stamp))
        db.execute("""DELETE FROM model_group_evidence WHERE group_key IN (
            SELECT g.group_key FROM model_groups g WHERE g.state='provavel'
              AND NOT EXISTS(SELECT 1 FROM model_group_members m WHERE m.group_key=g.group_key))""")
        db.execute("""DELETE FROM model_groups WHERE state='provavel'
              AND NOT EXISTS(SELECT 1 FROM model_group_members m
              WHERE m.group_key=model_groups.group_key)""")
        db.commit()
    return {"group_key":group_key,"image_count":len(ids),"title":title,
            "studio":studio,"state":"revisar","created":old is None,
            "singleton":singleton,"editorial_only":bool(singleton and editorial_only),
            "identity_confirmed_by_action":False,"names_changed":False,
            "rights_changed":False,"originals_modified":False}

def singleton_candidates(db_path,studio="",page=1,limit=24):
    """Read-only: photos without galleries that have on-image provisional labels."""
    studio=str(studio or "").strip()
    if not studio or len(studio)>120 or studio.casefold()=="geral + 50k":
        raise ValueError("Estúdio específico obrigatório")
    try:
        page=int(page);limit=int(limit)
    except (TypeError,ValueError) as exc:
        raise ValueError("Paginação inválida") from exc
    if page<1 or limit<1 or limit>36:raise ValueError("Limite inválido")
    with smart.db_open(db_path,readonly=True) as db:
        sql="""FROM assets a JOIN name_proposals p USING(message_id)
            LEFT JOIN model_group_members m USING(message_id)
            WHERE a.original_topic=? AND p.studio=?
              AND m.message_id IS NULL AND p.status IN ('provavel','revisar')
              AND p.evidence_type='embedded_render_title'
              AND TRIM(COALESCE(a.source_caption,''))=''
              AND TRIM(COALESCE(p.title,''))!=''"""
        total=db.execute("SELECT COUNT(*) "+sql,(studio,studio)).fetchone()[0]
        rows=db.execute("""SELECT a.message_id,a.sha256,p.title,p.universe,
            p.variant,p.status,p.revision,p.evidence_type """+sql+
            """ ORDER BY a.message_id LIMIT ? OFFSET ?""",
            (studio,studio,limit,(page-1)*limit)).fetchall()
    return {"studio":studio,"page":page,"limit":limit,"total":total,
            "has_more":page*limit<total,
            "items":[dict(row) for row in rows],
            "read_only":True,"automatic_approval":False}


def list_album_candidates(db_path,topic="",limit=60,page=1):
    """Álbuns com ao menos duas fotos livres, inclusive álbuns parciais.

    As fotos já agrupadas aparecem somente como contexto de revisão; os IDs
    oferecidos para criar uma galeria são exclusivamente os ainda livres.
    """
    topic=str(topic or "").strip()
    limit=max(1,min(int(limit),100))
    page=max(1,int(page))
    clauses=["TRIM(COALESCE(a.source_album,''))!=''"]
    params=[]
    if topic:
        clauses.append("a.original_topic=?")
        params.append(topic)
    with smart.db_open(db_path,readonly=True) as db:
        rows=db.execute("""SELECT a.original_topic,a.source_album,
            SUM(CASE WHEN m.message_id IS NULL THEN 1 ELSE 0 END) image_count,
            COUNT(*) album_image_count,COUNT(m.message_id) grouped_images,
            MIN(a.message_id) sample_message
            FROM assets a LEFT JOIN model_group_members m USING(message_id)
            WHERE """+" AND ".join(clauses)+"""
            GROUP BY a.original_topic,a.source_album
            HAVING COUNT(*)>=2
              AND SUM(CASE WHEN m.message_id IS NULL THEN 1 ELSE 0 END)>=2
            ORDER BY image_count DESC,sample_message LIMIT ? OFFSET ?""",
            params+[limit+1,(page-1)*limit]).fetchall()
        items=[]
        for row in rows[:limit]:
            photos=db.execute("""SELECT a.message_id,a.source_caption,
                m.group_key,p.title,p.variant
                FROM assets a LEFT JOIN model_group_members m USING(message_id)
                LEFT JOIN name_proposals p USING(message_id)
                WHERE a.original_topic=? AND a.source_album=?
                ORDER BY a.message_id""",
                (row["original_topic"],row["source_album"])).fetchall()
            captions=[str(x["source_caption"]).strip() for x in photos
                      if (x["source_caption"] or "").strip()]
            items.append({"topic":row["original_topic"],
                          "album_id":row["source_album"],
                          "image_count":row["image_count"],
                          "album_image_count":row["album_image_count"],
                          "grouped_images":row["grouped_images"],
                          "message_ids":[x["message_id"] for x in photos
                                         if not x["group_key"]],
                          "all_message_ids":[x["message_id"] for x in photos],
                          "already_grouped":[{"message_id":x["message_id"],
                               "title":x["title"] or "",
                               "variant":x["variant"] or ""} for x in photos
                               if x["group_key"]],
                          "caption":captions[0][:500] if captions else ""})
        return {"items":items,"limit":limit,"page":page,"has_more":len(rows)>limit}


def refresh_titles(db_path,group_keys=None):
    """Quando nomes chegam depois da reunião das fotos, atualiza só rótulos
    provisórios sem alterar grupos revisados, membros ou fontes."""
    updated=0
    with smart.db_open(db_path) as db:
        smart.setup(db)
        query="""SELECT g.group_key,g.title FROM model_groups g
            WHERE g.state='revisar' AND g.title LIKE 'Modelo sem nome #%'
              AND EXISTS(SELECT 1 FROM model_group_members m
              WHERE m.group_key=g.group_key AND m.match_reason='reviewed_angles')"""
        keys=tuple(str(key) for key in (group_keys or ()))
        if group_keys is not None:
            if not keys:
                return {"updated_titles":0}
            query+=" AND g.group_key IN ("+",".join("?" for _ in keys)+")"
        groups=db.execute(query,keys).fetchall()
        for group in groups:
            proposals=db.execute("""SELECT p.studio,p.title,p.universe,p.variant
                FROM name_proposals p JOIN model_group_members m USING(message_id)
                WHERE m.group_key=? AND TRIM(COALESCE(p.title,''))!=''""",
                (group["group_key"],)).fetchall()
            names={(smart.normalize(p["studio"]),smart.normalize(p["title"]),
                    smart.normalize(p["universe"]),smart.normalize(p["variant"]))
                   for p in proposals}
            if len(names)!=1:continue
            row=proposals[0]
            result=db.execute("""UPDATE model_groups SET
                studio=?,title=?,universe=?,variant=?,revision=revision+1,
                updated_at=? WHERE group_key=? AND state='revisar'
                AND title LIKE 'Modelo sem nome #%'""",
                (row["studio"],row["title"],row["universe"],row["variant"],
                 smart.utc(),group["group_key"]))
            updated+=result.rowcount
        db.commit()
    return {"updated_titles":updated}

def stats(db_path):
    with smart.db_open(db_path,readonly=True) as db:
        row=db.execute("""SELECT COUNT(*) n,COALESCE(SUM(count),0) photos
            FROM (SELECT COUNT(*) count FROM model_group_members
                 GROUP BY group_key HAVING COUNT(*)>=2)""").fetchone()
        reviewed=db.execute("""SELECT COUNT(DISTINCT group_key)
                 FROM model_group_members WHERE match_reason='reviewed_angles'""").fetchone()[0]
        return {"galleries":row["n"],"photos_in_galleries":row["photos"],
                "visually_reviewed_galleries":reviewed}
