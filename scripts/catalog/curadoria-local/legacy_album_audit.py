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


def split_reviewed_gallery(db_path, *, group_key, revision, message_ids,
                           title="", variant="", note=""):
    """Split only after a human 'different_sculptures' audit of exact members.

    One atomic SQLite transaction moves selected memberships to a fresh,
    provisional gallery and journals a before/after snapshot. No media files,
    proposed names, rights or production records are touched. Both source and
    destination become protected from automatic re-grouping on re-ingestion.
    """
    import hashlib

    key = str(group_key or "")
    if not GROUP_KEY.fullmatch(key):
        raise ValueError("Galeria inválida")
    if type(revision) is not int or revision < 0:
        raise ValueError("Revisão otimista obrigatória")
    if (not isinstance(message_ids, list) or not 1 <= len(message_ids) <= 500
            or any(type(mid) is not int or mid <= 0 or mid > 9007199254740991
                   for mid in message_ids)):
        raise ValueError("Selecione de 1 a 500 mensagens válidas da mesma escultura")
    if len(set(message_ids)) != len(message_ids):
        raise ValueError("IDs repetidos")
    selected = sorted(message_ids)
    title = str(title or "").strip()
    variant = str(variant or "").strip()
    note = str(note or "").strip()
    if len(title) > 120 or len(variant) > 120:
        raise ValueError("Título ou variante muito longo")
    if not 15 <= len(note) <= 500:
        raise ValueError("Justificativa visual deve ter entre 15 e 500 caracteres")
    stamp = smart.utc()
    with closing(smart.db_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            source = db.execute("""
                SELECT group_key,studio,title,state,revision FROM model_groups
                WHERE group_key=?
            """, (key,)).fetchone()
            if source is None:
                raise ValueError("Galeria de origem não encontrada")
            if source["revision"] != revision:
                raise RuntimeError("Revisão concorrente; recarregue a prancha")
            if source["state"] == "confirmado":
                raise ValueError("Galeria confirmada exige revisão editorial própria")
            members = db.execute("""
                SELECT m.message_id,m.match_reason,a.sha256,a.original_topic,
                       a.source_caption,a.source_album,a.source_relative
                FROM model_group_members m JOIN assets a USING(message_id)
                WHERE m.group_key=? ORDER BY m.message_id
            """, (key,)).fetchall()
            if (len(members) < 2 or
                len({r["original_topic"] for r in members}) != 1 or
                members[0]["original_topic"].casefold() == EXCLUDED.casefold()):
                raise ValueError("Galeria sem origem consistente")
            if any(r["match_reason"] in ("reviewed_angles","reviewed_split")
                   for r in members):
                raise ValueError("Galeria já revisada: requer operação editorial específica")
            current_ids = [r["message_id"] for r in members]
            current_hashes = [r["sha256"] for r in members]
            if (not set(selected) < set(current_ids)
                    or len(selected) >= len(current_ids)):
                raise ValueError("Seleção deve ser subconjunto próprio da galeria")
            sha_selected = {r["sha256"] for r in members
                            if r["message_id"] in selected}
            # Same physical bytes must never be split across distinct models.
            if any(r["sha256"] in sha_selected
                   and r["message_id"] not in selected for r in members):
                raise ValueError("Inclua todas as mensagens com mídia SHA-256 idêntica")
            if not db.execute("""
                SELECT 1 FROM model_group_members
                WHERE group_key=? AND match_reason='telegram_album'
            """, (key,)).fetchone():
                raise ValueError("Origem não é um agrupamento legado por álbum")
            last_audit = db.execute("""
                SELECT event_id,event_type,detail FROM curation_events
                WHERE group_key=? AND event_type IN (
                  'visual_gallery_audited','visual_gallery_audit_attention')
                ORDER BY event_id DESC LIMIT 1
            """, (key,)).fetchone()
            if last_audit is None or last_audit["event_type"] != "visual_gallery_audit_attention":
                raise ValueError("Separação exige auditoria visual prévia com divergência")
            try:
                evidence = json.loads(last_audit["detail"])
            except (ValueError, TypeError) as exc:
                raise ValueError("Registro de auditoria inválido") from exc
            if (evidence.get("classification") != "different_sculptures"
                    or evidence.get("member_ids") != current_ids
                    or evidence.get("sha256s") != current_hashes
                    or evidence.get("title") != source["title"]
                    or evidence.get("studio") != source["studio"]):
                raise RuntimeError("Auditoria desatualizada: revalidar membros e identidades")
            new_key = hashlib.sha256(json.dumps(
                ["tonart.visual-gallery-split/2",key,last_audit["event_id"],selected],
                ensure_ascii=False
            ).encode("utf-8")).hexdigest()[:24]
            if db.execute("SELECT 1 FROM model_groups WHERE group_key=?",
                          (new_key,)).fetchone():
                raise RuntimeError("Separação já registrada; recarregue a galeria")
            proposed_title = title or ("Modelo separado para revisão #" + str(selected[0]))
            db.execute("""
                INSERT INTO model_groups(group_key,studio,title,universe,variant,
                  state,confidence,revision,created_at,updated_at)
                VALUES(?,?,?,?,?,'revisar',0,0,?,?)
            """,(new_key,members[0]["original_topic"],proposed_title,"",variant,stamp,stamp))
            changed = db.execute("""
                UPDATE model_groups SET state='revisar',revision=revision+1,
                    updated_at=? WHERE group_key=? AND revision=?
            """,(stamp,key,revision))
            if changed.rowcount != 1:
                raise RuntimeError("Conflito de revisão")
            for mid in selected:
                change = db.execute("""
                    UPDATE model_group_members SET group_key=?,
                        match_reason='reviewed_split',updated_at=?
                    WHERE message_id=? AND group_key=?
                """,(new_key,stamp,mid,key))
                if change.rowcount != 1:
                    raise RuntimeError("Membro alterado por outra execução")
                url = smart.SOURCE_C + str(mid)
                # Move auto-origin evidence with its exact image; retain the
                # full earlier association in the immutable audit event below.
                db.execute("""
                    UPDATE model_group_evidence SET group_key=?
                    WHERE group_key=? AND source_url=?
                    AND source_type IN ('telegram_album','telegram_caption')
                """,(new_key,key,url))
                db.execute("""
                    INSERT OR IGNORE INTO model_group_evidence
                      (group_key,source_url,source_type,description,recorded_at)
                    VALUES(?,?,'visual_review',?,?)
                """,(new_key,url,"Separado após revisão visual: "+note[:400],stamp))
            # Flag all survivors and moved photos as manually reviewed, so a
            # downloader caption change cannot silently re-merge them.
            for row in members:
                fp = hashlib.sha256(json.dumps([
                    "group-policy-v2",row["sha256"],row["original_topic"],
                    row["source_caption"],row["source_album"],row["source_relative"]
                ],ensure_ascii=False).encode("utf-8")).hexdigest()
                db.execute("""
                    INSERT INTO curation_seen(message_id,fingerprint,outcome,processed_at)
                    VALUES(?,?,'visual_split_review',?)
                    ON CONFLICT(message_id) DO UPDATE SET
                      fingerprint=excluded.fingerprint,
                      outcome=excluded.outcome,processed_at=excluded.processed_at
                """,(row["message_id"],fp,stamp))
            remaining = [mid for mid in current_ids if mid not in set(selected)]
            snapshot = {
                "schema":"tonart.visual-gallery-split/2",
                "source_group":key,"new_group":new_key,
                "audit_event_id":last_audit["event_id"],
                "studio":members[0]["original_topic"],
                "source_title":source["title"],"new_title":proposed_title,
                "new_variant":variant,"before_ids":current_ids,
                "before_sha256s":current_hashes,"moved_ids":selected,
                "remaining_ids":remaining,"notes":note,
                "identity_approved":False,
                "commercial_edition_confirmed":False,
                "publication_approved":False,"originals_preserved":True,
            }
            payload = json.dumps(snapshot,ensure_ascii=False)
            for affected_key,event_type in (
                (key,"visual_gallery_split_source"),
                (new_key,"visual_gallery_split"),
            ):
                db.execute("""
                    INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
                    VALUES(?,?,?,?)
                """,(affected_key,event_type,payload,stamp))
            db.commit()
        except BaseException:
            db.rollback()
            raise
    return {
        "ok":True,"source_group":key,"new_group":new_key,
        "moved_ids":selected,"remaining_ids":remaining,
        "source_revision":revision+1,"new_revision":0,
        "state":"revisar","publication_approved":False,
        "originals_preserved":True,
    }
