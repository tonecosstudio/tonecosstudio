#!/usr/bin/env python3
"""Auditoria de álbuns legados por GALERIA, usando somente o SQLite canônico.

Consultas não alteram dados. Uma decisão explícita registra evento no histórico
existente, com revisão otimista e fotografia dos SHA-256, sem modificar relações.
"""
from __future__ import annotations

from contextlib import closing
import json
import re

import smart_curadoria as smart

GROUP_KEY = re.compile(r"^[0-9a-f]{24}$")
CURSOR = re.compile(r"^([0-3]):([1-9][0-9]{0,3}):([0-9a-f]{24})$")
STATES = frozenset(("pending", "audited", "all"))
RISKS = frozenset(("all", "variants", "albums", "large"))
DECISIONS = frozenset(("same_sculpture", "different_sculptures", "needs_more_evidence"))
EXCLUDED = "Geral + 50k"

AGG = """WITH older AS (
    SELECT DISTINCT group_key FROM model_group_members
    WHERE match_reason='telegram_album'
), grouped AS (
    SELECT m.group_key,g.studio,MIN(a.original_topic) AS original_topic,
           COUNT(DISTINCT a.original_topic) AS source_topics,
           g.title,g.universe,g.variant,
           g.state,g.revision,
           COUNT(*) photos,COUNT(DISTINCT a.sha256) unique_files,
           COUNT(DISTINCT a.source_album) source_albums,
           COUNT(DISTINCT COALESCE(NULLIF(TRIM(p.variant),''),'∅')) variant_count,
           COUNT(DISTINCT COALESCE(NULLIF(TRIM(p.title),''),'?')) title_count,
           MAX(a.message_id) sample_message,
           GROUP_CONCAT(DISTINCT p.variant) variants
    FROM older JOIN model_group_members m USING(group_key)
    JOIN model_groups g USING(group_key)
    JOIN assets a USING(message_id)
    LEFT JOIN name_proposals p USING(message_id)
    WHERE a.original_topic!=?
    GROUP BY m.group_key
), ranked AS (
    SELECT grouped.*,
      EXISTS(SELECT 1 FROM curation_events e
        WHERE e.group_key=grouped.group_key
          AND e.event_type='visual_gallery_audited') AS audited,
      EXISTS(SELECT 1 FROM curation_events e
        WHERE e.group_key=grouped.group_key
          AND e.event_type='visual_gallery_audit_attention') AS attention,
      CASE
        WHEN source_topics>1 OR variant_count>1 OR title_count>1 THEN 0
        WHEN source_albums>1 THEN 1
        WHEN photos>=8 THEN 2
        ELSE 3 END priority
    FROM grouped
)"""

def list_groups(db_path, *, topic="", state="pending", risk="all",
                q="", cursor="", limit=24):
    topic = str(topic or "").strip()
    state = str(state or "pending").strip()
    risk = str(risk or "all").strip()
    q = str(q or "").strip()[:120]
    cursor = str(cursor or "").strip()
    if len(topic)>120 or topic.casefold()==EXCLUDED.casefold():
        raise ValueError("Estúdio reservado ou inválido")
    if state not in STATES or risk not in RISKS:
        raise ValueError("Filtro de auditoria inválido")
    try:
        limit = int(limit)
    except (ValueError, TypeError) as exc:
        raise ValueError("Limite inválido") from exc
    if not 1<=limit<=48:
        raise ValueError("Limite fora de 1 a 48")
    offset_key = None
    if cursor:
        m = CURSOR.fullmatch(cursor)
        if m is None:
            raise ValueError("Cursor de auditoria inválido")
        offset_key = (int(m.group(1)),int(m.group(2)),m.group(3))
    filters=[]
    params=[EXCLUDED]
    if topic:
        filters.append("original_topic=?")
        params.append(topic)
    if q:
        filters.append("""(title LIKE ? OR studio LIKE ? OR variant LIKE ?
          OR variants LIKE ? OR CAST(sample_message AS TEXT) LIKE ?)""")
        params.extend(["%"+q+"%"]*5)
    if state=="pending":
        filters.append("audited=0")
    elif state=="audited":
        filters.append("audited=1")
    if risk=="variants":
        filters.append("(variant_count>1 OR title_count>1)")
    elif risk=="albums":
        filters.append("source_albums>1")
    elif risk=="large":
        filters.append("photos>=8")
    criteria = " WHERE "+" AND ".join(filters) if filters else ""
    cursor_clause = ""
    cursor_params=[]
    if offset_key is not None:
        cursor_clause=(
            "(priority>? OR (priority=? AND photos<?) OR "
            "(priority=? AND photos=? AND group_key>?))"
        )
        priority, photos, group_key=offset_key
        cursor_params=[priority,priority,photos,priority,photos,group_key]
    paged_filters = filters+([cursor_clause] if cursor_clause else [])
    paged_where = " WHERE "+" AND ".join(paged_filters) if paged_filters else ""
    with closing(smart.db_open(db_path, readonly=True)) as db:
        db.execute("BEGIN")
        try:
            total=db.execute(AGG+" SELECT COUNT(*) FROM ranked"+criteria,
                             params).fetchone()[0]
            rows=db.execute(
                AGG+" SELECT * FROM ranked"+paged_where+
                " ORDER BY priority ASC,photos DESC,group_key ASC LIMIT ?",
                params+cursor_params+[limit+1]
            ).fetchall()
        finally:
            db.rollback()
    has_more=len(rows)>limit
    items=[dict(r) for r in rows[:limit]]
    for item in items:
        item["risk_label"] = (
            "Variantes ou nomes divergentes" if item["priority"]==0 else
            "Álbuns diferentes no mesmo grupo" if item["priority"]==1 else
            "Galeria grande: conferir todas as vistas" if item["priority"]==2
            else "Verificar vistas da escultura"
        )
        item["review_state"]="audited" if item["audited"] else (
            "attention" if item["attention"] else "pending"
        )
    next_cursor = ""
    if has_more and items:
        last=items[-1]
        next_cursor=f'{last["priority"]}:{last["photos"]}:{last["group_key"]}'
    return {
        "total":total,"items":items,"next_cursor":next_cursor,
        "has_more":has_more,"limit":limit,"state":state,"risk":risk,
        "topic":topic,"q":q,"source_excluded":EXCLUDED,"read_only":True,
        "notice":"Auditoria de galeria; não implica licença nem aprovação comercial",
    }


def record_review(db_path, *, group_key, revision, decision, note):
    """Manual review only. Record provenance, never silently split/merge."""
    key=str(group_key or "")
    decision=str(decision or "")
    note=str(note or "").strip()
    if not GROUP_KEY.fullmatch(key):
        raise ValueError("Galeria inválida")
    if decision not in DECISIONS or len(note)<15 or len(note)>500:
        raise ValueError("Classificação ou justificativa inválida")
    if type(revision) is not int or revision<0:
        raise ValueError("Revisão otimista obrigatória")
    stamp=smart.utc()
    with closing(smart.db_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            group=db.execute(
                "SELECT studio,title,state,revision FROM model_groups WHERE group_key=?",
                (key,)
            ).fetchone()
            if not group or group["studio"].casefold()==EXCLUDED.casefold():
                raise ValueError("Galeria indisponível")
            if group["revision"]!=revision:
                raise RuntimeError("Conflito de revisão; recarregue a prancha")
            if group["state"]=="confirmado":
                raise ValueError("Galeria confirmada exige auditoria editorial própria")
            rows=db.execute("""SELECT m.message_id,a.sha256,a.original_topic,
                     p.title,p.variant
                FROM model_group_members m JOIN assets a USING(message_id)
                LEFT JOIN name_proposals p USING(message_id)
                WHERE m.group_key=? ORDER BY m.message_id""",(key,)).fetchall()
            if len(rows)<2 or len({r["original_topic"] for r in rows})!=1:
                raise ValueError("Galeria sem origem única")
            if rows[0]["original_topic"].casefold()==EXCLUDED.casefold():
                raise ValueError("Galeria sem origem e membros consistentes")
            if not db.execute("""SELECT 1 FROM model_group_members
                WHERE group_key=? AND match_reason='telegram_album'""",
                (key,)).fetchone():
                raise ValueError("Não é um agrupamento legado por álbum")
            if db.execute("""SELECT 1 FROM curation_events
                WHERE group_key=? AND event_type='visual_gallery_audited'""",
                (key,)).fetchone():
                raise RuntimeError("Galeria já auditada por outra execução")
            updated=db.execute("""UPDATE model_groups
                SET revision=revision+1,updated_at=?
                WHERE group_key=? AND revision=?""",(stamp,key,revision))
            if updated.rowcount!=1:
                raise RuntimeError("Conflito de revisão")
            event_type=(
                "visual_gallery_audited" if decision=="same_sculpture"
                else "visual_gallery_audit_attention"
            )
            audit={
                "schema":"tonart.visual-gallery-audit/1",
                "classification":decision,"group_key":key,
                "studio":group["studio"],"title":group["title"],
                "member_ids":[r["message_id"] for r in rows],
                "sha256s":[r["sha256"] for r in rows],
                "notes":note,
                "identity_approved":False,
                "publication_approved":False,
            }
            db.execute("""INSERT INTO curation_events(
                group_key,event_type,detail,occurred_at)
                VALUES(?,?,?,?)""",(
                    key,event_type,json.dumps(audit,ensure_ascii=False),stamp
                ))
            db.commit()
        except BaseException:
            db.rollback()
            raise
    return {
        "ok":True,"group_key":key,"decision":decision,
        "event_type":event_type,"revision":revision+1,
        "members":len(rows),"publication_approved":False,
        "group_relations_changed":False,
    }
