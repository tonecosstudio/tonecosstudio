#!/usr/bin/env python3
"""Read-only priority queue for TONART's existing private Curadoria SQLite.

No independent tasks/leases, extra database, background scan or write on GET.
Agents and the host use the same name revision for optimistic concurrency.
"""
from __future__ import annotations

import re
from contextlib import closing
import smart_curadoria as smart

KINDS = frozenset(("attention", "all", "unlabeled", "legacy_album",
                   "manual_review", "missing_source", "confirmed"))
VARIANTS = frozenset(("all", "with", "without"))
REASONS = {
    0: "Sem nome",
    1: "Agrupamento antigo por álbum: conferir esculturas",
    2: "Revisão manual de identidade",
    3: "Fonte oficial pendente",
    4: "Identidade registrada; direitos comerciais não verificados aqui",
}
CURSOR_RE = re.compile(r"^([0-4]):([1-9][0-9]{0,11})$")
EXCLUDED_TOPIC = "Geral + 50k"

def list_queue(db_path, *, topic="", kind="attention", variant="all",
               q="", cursor="", limit=48):
    """Stable priority/ID keyset, never OFFSET-scan deep into the catalog.

    The default queue omits Geral +50k, historically assigned to another
    agent; this topic is intentionally unsupported in this workflow.
    """
    topic = str(topic or "").strip()
    kind = str(kind or "attention").strip()
    variant = str(variant or "all").strip()
    q = str(q or "").strip()[:120]
    cursor = str(cursor or "").strip()
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        raise ValueError("Limite inválido") from None
    if not 1 <= limit <= 48:
        raise ValueError("Limite fora de 1 a 48")
    if len(topic) > 120 or topic.casefold() == EXCLUDED_TOPIC.casefold():
        raise ValueError("Estúdio indisponível nesta fila privada")
    if kind not in KINDS or variant not in VARIANTS:
        raise ValueError("Filtro de revisão inválido")
    if cursor:
        match = CURSOR_RE.fullmatch(cursor)
        if not match:
            raise ValueError("Cursor de fila inválido")
        cursor_priority, cursor_id = int(match[1]), int(match[2])
    else:
        cursor_priority, cursor_id = None, None

    clauses = ["a.original_topic!=?"]
    args = [EXCLUDED_TOPIC]
    if topic:
        clauses.append("a.original_topic=?")
        args.append(topic)
    if variant == "with":
        clauses.append("TRIM(COALESCE(p.variant,''))!=''")
    elif variant == "without":
        clauses.append("TRIM(COALESCE(p.variant,''))=''")
    if q:
        clauses.append("""(p.title LIKE ? OR p.universe LIKE ? OR
            p.variant LIKE ? OR a.source_caption LIKE ? OR
            CAST(a.message_id AS TEXT) LIKE ?)""")
        args.extend(["%" + q + "%"] * 5)
    if kind == "unlabeled":
        clauses.append("TRIM(COALESCE(p.title,''))=''")
    elif kind == "legacy_album":
        clauses.append("m.match_reason='telegram_album'")
    elif kind == "manual_review":
        clauses.append("p.status='revisar' AND TRIM(COALESCE(p.title,''))!=''")
    elif kind == "missing_source":
        clauses.append("""TRIM(COALESCE(p.title,''))!='' AND
            TRIM(COALESCE(p.official_url,''))='' AND p.status!='confirmado'""")
    elif kind == "confirmed":
        clauses.append("p.status='confirmado'")

    # Every left join is one-to-one by message_id; no count inflation.
    # The same predicates work for both the count and paged result.
    scored = """WITH ranked AS (
        SELECT a.message_id,a.original_topic,a.source_caption,a.source_album,
          p.studio,p.title,p.universe,p.variant,p.filename,p.status,
          p.confidence,p.evidence_type,p.official_url,p.notes,p.revision,
          m.group_key,m.match_reason,
          CASE
            WHEN TRIM(COALESCE(p.title,''))='' THEN 0
            WHEN m.match_reason='telegram_album' THEN 1
            WHEN p.status='revisar' THEN 2
            WHEN TRIM(COALESCE(p.official_url,''))='' AND p.status!='confirmado'
                 THEN 3
            ELSE 4 END AS priority
        FROM assets a
        LEFT JOIN name_proposals p USING(message_id)
        LEFT JOIN model_group_members m USING(message_id)
        WHERE """ + " AND ".join(clauses) + """
    )"""
    after = []
    if kind == "attention":
        after.append("priority<=3")
    after_args = []
    if cursor_priority is not None:
        after.append("(priority>? OR (priority=? AND message_id<?))")
        after_args = [cursor_priority, cursor_priority, cursor_id]
    where = " WHERE " + " AND ".join(after) if after else ""
    with closing(smart.db_open(db_path, readonly=True)) as db:
        # Both SELECTs observe one read transaction under concurrent reviewers.
        db.execute("BEGIN")
        try:
            total_where = " WHERE priority<=3" if kind == "attention" else ""
            total = db.execute(scored + " SELECT COUNT(*) FROM ranked" + total_where,
                               args).fetchone()[0]
            rows = db.execute(
                scored + """ SELECT ranked.*,
                 (SELECT COUNT(*) FROM model_group_members x
                  WHERE x.group_key=ranked.group_key) AS gallery_image_count
                 FROM ranked""" + where +
                " ORDER BY priority ASC,message_id DESC LIMIT ?",
                args + after_args + [limit + 1],
            ).fetchall()
        finally:
            db.rollback()
    has_more = len(rows) > limit
    items = []
    for row in rows[:limit]:
        item = dict(row)
        item["reason"] = REASONS[item["priority"]]
        item["gallery_key"] = item.pop("group_key")
        items.append(item)
    next_cursor = ""
    if has_more and items:
        last = items[-1]
        next_cursor = str(last["priority"]) + ":" + str(last["message_id"])
    return {
        "items": items, "total": total, "next_cursor": next_cursor,
        "has_more": has_more, "limit": limit,
        "topic": topic, "kind": kind, "variant": variant,
        "read_only": True, "source_excluded": EXCLUDED_TOPIC,
        "priority_labels": REASONS,
        "note": "Prioridade operacional; não confirma identidade nem licença",
    }
