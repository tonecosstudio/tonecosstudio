#!/usr/bin/env python3
"""Galerias de diferentes vistas da MESMA estatueta, no SQLite canônico.

Não nomeia personagens por semelhança, não modifica originais e não publica.
"""
from __future__ import annotations
import hashlib
import json
import re
import smart_curadoria as smart

def register_visual_gallery(db_path,message_ids,topic,note=""):
    """Agrupa apenas imagens da mesma escultura INSPECIONADAS visualmente."""
    if not isinstance(message_ids,(list,tuple)) or not 2<=len(message_ids)<=500:
        raise ValueError("Galeria exige de 2 a 500 imagens por lote; novas fotos podem ser adicionadas à mesma ficha")
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
        rows=db.execute("""SELECT a.message_id,a.original_topic,
            p.studio,p.title,p.universe,p.variant,
            m.group_key AS previous_key,m.match_reason,g.state AS group_state,
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
           VALUES(?,?,?,?,?,'revisar',0.90,?,?)
           ON CONFLICT(group_key) DO UPDATE SET
           studio=excluded.studio,title=excluded.title,
           universe=excluded.universe,variant=excluded.variant,
           updated_at=excluded.updated_at
           WHERE model_groups.state!='confirmado'""",
           (group_key,studio,title,universe,variant,stamp,stamp))
        for mid in ids:
            db.execute("""INSERT INTO model_group_members
                (message_id,group_key,match_reason,updated_at)
                VALUES(?,?,'reviewed_angles',?)
                ON CONFLICT(message_id) DO UPDATE SET
                group_key=excluded.group_key,match_reason=excluded.match_reason,
                updated_at=excluded.updated_at""",(mid,group_key,stamp))
            db.execute("""INSERT OR IGNORE INTO model_group_evidence
                 (group_key,source_url,source_type,description,recorded_at)
                 VALUES(?,?,?,?,?)""",
                 (group_key,smart.SOURCE_C+str(mid),"visual_review",
                  (str(note or "").strip() or
                   "Mesmo produto em ângulos diferentes; identidade e licença ainda não confirmadas")[:500],
                  stamp))
        if not old:
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
            "studio":studio,"state":"revisar","created":old is None}

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
