#!/usr/bin/env python3
"""Curadoria por evidências: grupos no MESMO SQLite local da Curadoria Visual.

Nenhum acesso de escrita à origem Telegram ou ao catálogo comercial.
Identificações de legenda são PROVÁVEIS, nunca confirmação oficial.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

FIRST = re.compile(r"^\s*[▪•]\ufe0f?\s*(.+?)\s*$")
STUDIO = re.compile(r"^\s*[▫•]\ufe0f?\s*Est[uú]dio\s*:\s*(.+?)\s*$", re.I)
VERSION = re.compile(r"^\s*[▫•]\ufe0f?\s*Vers[aã]o\s*:\s*(.+?)\s*$", re.I)
VALID_STATE = {"provavel", "revisar", "confirmado"}
SOURCE_C = "https://t.me/c/2370335738/"
MAX_TITLE = 170

def utc():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

class ManagedConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()

def db_open(path, readonly=False):
    if readonly:
        # Read endpoints must never acquire a writer lock just to open SQLite.
        db = sqlite3.connect("file:"+Path(path).resolve().as_posix()+"?mode=ro",
                             uri=True, timeout=3, factory=ManagedConnection)
    else:
        db = sqlite3.connect(str(path), timeout=15, factory=ManagedConnection)
    db.row_factory = sqlite3.Row
    if readonly:
        db.execute("PRAGMA query_only=ON")
        db.execute("PRAGMA temp_store=MEMORY")
        db.execute("PRAGMA busy_timeout=3000")
    else:
        # Member rows reference assets and groups; enforce the schema contract
        # for every canonical writer instead of rejoining every asset on GET.
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA busy_timeout=15000")
        # WAL is a database-wide setting. Repeating a WAL mode assignment on
        # every writer open can contend with active readers on Windows.
        if db.execute("PRAGMA journal_mode").fetchone()[0].lower() != "wal":
            db.execute("PRAGMA journal_mode=WAL")
    return db

def setup(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS model_groups(
      group_key TEXT PRIMARY KEY, studio TEXT NOT NULL, title TEXT NOT NULL,
      universe TEXT NOT NULL DEFAULT '', variant TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'provavel', confidence REAL NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS model_group_members(
      message_id INTEGER PRIMARY KEY REFERENCES assets(message_id),
      group_key TEXT NOT NULL REFERENCES model_groups(group_key),
      match_reason TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_group_members_key ON model_group_members(group_key);
    CREATE TABLE IF NOT EXISTS model_group_evidence(
      group_key TEXT NOT NULL REFERENCES model_groups(group_key),
      source_url TEXT NOT NULL, source_type TEXT NOT NULL,
      description TEXT NOT NULL, recorded_at TEXT NOT NULL,
      PRIMARY KEY(group_key,source_url));
    CREATE TABLE IF NOT EXISTS curation_seen(
      message_id INTEGER PRIMARY KEY, fingerprint TEXT NOT NULL,
      outcome TEXT NOT NULL, processed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS curation_events(
      event_id INTEGER PRIMARY KEY AUTOINCREMENT, group_key TEXT, message_id INTEGER,
      event_type TEXT NOT NULL, detail TEXT NOT NULL, occurred_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_curation_events_type_id
      ON curation_events(event_type, event_id);
    CREATE INDEX IF NOT EXISTS idx_curation_events_message_id
      ON curation_events(message_id);
    CREATE INDEX IF NOT EXISTS idx_curation_events_group_key
      ON curation_events(group_key);
    """)

def normalize(s):
    s = unicodedata.normalize("NFKD",s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ",re.sub(r"[^\w ]", " ",s.casefold())).strip()

def identify(topic,caption):
    if not caption:
        return None
    lines=caption.splitlines()
    titleline=next((m.group(1).strip() for line in lines if (m:=FIRST.match(line))),"")
    studio=next((m.group(1).strip() for line in lines if (m:=STUDIO.match(line))),"")
    variant=next((m.group(1).strip() for line in lines if (m:=VERSION.match(line))),"")
    if not titleline or not studio or len(titleline)>300:
        return None
    if " - " in titleline:
        title,universe=titleline.rsplit(" - ",1)
    else:
        title,universe=titleline,""
    title=title.strip()
    universe=universe.strip()
    if not title or len(title)>MAX_TITLE or len(studio)>120 or len(universe)>120:
        return None
    # Tópico é contexto, não autoridade. Nomes compostos possuem aliases com _ ou /.
    aliases=[normalize(p) for p in re.split(r"\s+[_|/]\s+",topic)]
    studio_n=normalize(studio)
    if not studio_n or not any(studio_n==a or studio_n in a or a in studio_n for a in aliases if a):
        return None
    variant=variant[:160]
    keyparts=[normalize(studio),normalize(title),normalize(universe),normalize(variant)]
    if not all(keyparts[:2]):
        return None
    key=hashlib.sha256(json.dumps(keyparts,ensure_ascii=False).encode()).hexdigest()[:24]
    return dict(group_key=key,studio=studio,title=title,universe=universe,
                variant=variant,confidence=0.82)

def process_batch(db_path,limit=300):
    """Idempotente; varre apenas ativos ainda não vistos ou cujo metadata mudou."""
    limit=max(1,min(int(limit),3000))
    with db_open(db_path) as db:
        setup(db)
        assets=db.execute("""SELECT a.message_id,a.original_topic,a.source_caption,
             a.source_album,a.sha256,a.source_relative
             FROM assets a ORDER BY a.message_id""").fetchall()
        seen={r["message_id"]:r["fingerprint"] for r in db.execute(
            "SELECT message_id,fingerprint FROM curation_seen")}
        # A Telegram grouped_id may contain different sculpts, variants or
        # even multiple distinct pieces. Never inherit names or group models
        # solely from source_album: only identical file content may merge
        # automatically; reviewed_angles is the authority for different photos.
        changed=0
        identified=0
        ungrouped=0
        for a in assets:
            fp=hashlib.sha256(json.dumps(["group-policy-v2",a["sha256"],a["original_topic"],
                    a["source_caption"],a["source_album"],a["source_relative"]],
                    ensure_ascii=False).encode()).hexdigest()
            mid=a["message_id"]
            if seen.get(mid)==fp:
                continue
            # A manually split gallery must never be recreated by a later
            # downloader metadata/caption change. The human review event and
            # revisioned split are authoritative, not the album import.
            if db.execute("""SELECT 1 FROM curation_seen
                 WHERE message_id=? AND outcome='visual_split_review'""",
                 (mid,)).fetchone():
                continue
            # An explicit gallery-wide visual audit also owns the current
            # membership. Older audited albums may still carry the historic
            # 'telegram_album' match_reason, so checking reviewed_angles alone
            # would silently discard human work when Telegram metadata changes.
            audited=db.execute("""SELECT 1
                FROM model_group_members m
                JOIN curation_events e ON e.group_key=m.group_key
                WHERE m.message_id=? AND e.event_type='visual_gallery_audited'
                LIMIT 1""",(mid,)).fetchone()
            if audited:
                db.execute("""INSERT INTO curation_seen(
                     message_id,fingerprint,outcome,processed_at
                     ) VALUES(?,?,'visual_gallery_audited',?)
                     ON CONFLICT(message_id) DO UPDATE SET
                     fingerprint=excluded.fingerprint,outcome=excluded.outcome,
                     processed_at=excluded.processed_at""",
                     (mid,fp,utc()))
                changed+=1
                if changed>=limit:break
                continue
            # Galerias revisadas visualmente têm prioridade sobre a sugestão
            # automática baseada apenas em legenda / álbum. Uma mudança no
            # downloader não deve desmontar ou sobrescrever a revisão humana.
            reviewed=db.execute("""SELECT 1 FROM model_group_members
                 WHERE message_id=? AND match_reason IN ('reviewed_angles','reviewed_split')
                 LIMIT 1""",(mid,)).fetchone()
            if reviewed:
                db.execute("""INSERT INTO curation_seen(message_id,fingerprint,
                     outcome,processed_at) VALUES(?,?,?,?)
                     ON CONFLICT(message_id) DO UPDATE SET
                     fingerprint=excluded.fingerprint,outcome=excluded.outcome,
                     processed_at=excluded.processed_at""",
                     (mid,fp,"reviewed_angles",utc()))
                changed+=1
                if changed>=limit:break
                continue
            caption=a["source_caption"] or ""
            result=identify(a["original_topic"],caption)
            if result:
                # Album membership and identical names do not establish visual
                # identity. Distinct media bytes become distinct provisional
                # models until reviewed as angles of one sculpture.
                cluster="sha256:"+str(a["sha256"])
                key=hashlib.sha256(json.dumps([result["group_key"],cluster],ensure_ascii=False).encode()).hexdigest()[:24]
                stamp=utc()
                db.execute("""INSERT INTO model_groups(
                   group_key,studio,title,universe,variant,state,confidence,created_at,updated_at)
                   VALUES (?,?,?,?,?,'provavel',?,?,?)
                   ON CONFLICT(group_key) DO UPDATE SET
                   confidence=MAX(model_groups.confidence,excluded.confidence),
                   updated_at=excluded.updated_at""",
                   (key,result["studio"],result["title"],result["universe"],
                   result["variant"],result["confidence"],stamp,stamp))
                prev=db.execute("SELECT group_key FROM model_group_members WHERE message_id=?",(mid,)).fetchone()
                db.execute("""INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at)
                      VALUES(?,?,?,?) ON CONFLICT(message_id) DO UPDATE SET
                      group_key=excluded.group_key,match_reason=excluded.match_reason,
                      updated_at=excluded.updated_at""",
                   (mid,key,"telegram_caption",stamp))
                url=SOURCE_C+str(mid)
                db.execute("""INSERT OR IGNORE INTO model_group_evidence
                   (group_key,source_url,source_type,description,recorded_at)
                   VALUES(?,?,?,?,?)""",(key,url,"telegram_caption",
                           "Legenda Telegram exata; sem verificação externa",stamp))
                if not prev or prev["group_key"]!=key:
                    db.execute("""INSERT INTO curation_events(group_key,message_id,event_type,detail,occurred_at)
                      VALUES(?,?,'auto_candidate',?,?)""",
                      (key,mid,"legenda estruturada",stamp))
                identified+=1
                outcome="probable"
            else:
                db.execute("DELETE FROM model_group_members WHERE message_id=?",(mid,))
                ungrouped+=1
                outcome="review"
            db.execute("""INSERT INTO curation_seen(message_id,fingerprint,outcome,processed_at)
                VALUES(?,?,?,?) ON CONFLICT(message_id) DO UPDATE SET
                fingerprint=excluded.fingerprint,outcome=excluded.outcome,
                processed_at=excluded.processed_at""",(mid,fp,outcome,utc()))
            changed+=1
            if changed>=limit:
                break
        db.execute("""DELETE FROM model_group_evidence WHERE group_key IN (
              SELECT group_key FROM model_groups WHERE state='provavel'
              AND NOT EXISTS (SELECT 1 FROM model_group_members m
              WHERE m.group_key=model_groups.group_key))""")
        db.execute("""DELETE FROM model_groups
             WHERE state='provavel' AND NOT EXISTS
             (SELECT 1 FROM model_group_members m WHERE m.group_key=model_groups.group_key)""")
        db.commit()
    return {"processed":changed,"proposed_images":identified,
            "needs_review_images":ungrouped,**stats(db_path)}

def stats(db_path):
    with db_open(db_path,readonly=True) as db:
        by_state={r["state"]:r["n"] for r in db.execute(
            "SELECT state,COUNT(*) n FROM model_groups GROUP BY state")}
        total=db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
        processed=db.execute("SELECT COUNT(*) FROM curation_seen").fetchone()[0]
        mapped=db.execute("SELECT COUNT(*) FROM model_group_members").fetchone()[0]
        groups=db.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]
        return {"images_indexed":total,"images_processed":processed,
                "images_grouped":mapped,"images_needing_review":processed-mapped,
                "images_waiting":total-processed,"model_groups":groups,
                "model_states":by_state}

def gallery_preview_ids(db, group_keys, previews):
    """Sample DISTINCT SHA-256 first/last views in ONE bounded SELECT.

    Uses the existing members/assets indexes; never decodes, downloads or writes images.
    Kept in the model engine as SSOT for regular and legacy-audit walls.
    """
    if previews not in (0,1,4,6):
        raise ValueError("Vistas permitidas: 0, 1, 4 ou 6")
    keys=list(dict.fromkeys(group_keys))
    if not keys or previews==0:
        return {}
    if len(keys)>120:
        raise ValueError("Lote de galerias excede 120")
    rows=db.execute("""
      WITH unique_photos AS (
        SELECT m.group_key,MIN(m.message_id) message_id
        FROM model_group_members m
        JOIN assets a ON a.message_id=m.message_id
        WHERE m.group_key IN (""" + ",".join("?" for _ in keys) + """)
        GROUP BY m.group_key,
          COALESCE(NULLIF(TRIM(a.sha256),''),CAST(a.message_id AS TEXT))
      ), ranked AS (
        SELECT group_key,message_id,
          ROW_NUMBER() OVER(PARTITION BY group_key ORDER BY message_id) first_rank,
          ROW_NUMBER() OVER(PARTITION BY group_key ORDER BY message_id DESC) last_rank
        FROM unique_photos
      )
      SELECT group_key,message_id FROM ranked
      WHERE first_rank<=? OR last_rank<=?
      ORDER BY group_key,message_id
    """,keys+[(previews+1)//2,previews//2]).fetchall()
    result={key:[] for key in keys}
    for row in rows:
        result[row["group_key"]].append(row["message_id"])
    return result


def list_models(db_path,page=1,limit=48,topic="",q="",state="",min_images=1,unnamed_only=False,previews=0):
    page=max(1,int(page)); limit=max(1,min(int(limit),96))
    try: previews=int(previews)
    except (ValueError,TypeError) as exc: raise ValueError("Vistas inválidas") from exc
    if previews not in (0,1,4,6): raise ValueError("Vistas inválidas")
    min_images=max(1,min(40,int(min_images)))
    group_clauses=[]
    group_args=[]
    if q:
        group_clauses.append("(g.studio LIKE ? OR g.title LIKE ? OR g.universe LIKE ? OR g.variant LIKE ?)")
        group_args.extend(["%"+q+"%"]*4)
    if state in VALID_STATE:
        group_clauses.append("g.state=?")
        group_args.append(state)
    if unnamed_only:
        group_clauses.append("g.title LIKE 'Modelo sem nome #%'")
    group_where=" AND ".join(group_clauses) if group_clauses else "1=1"
    member_topic=" AND a.original_topic=?" if topic else ""
    photo_topic=" AND a2.original_topic=?" if topic else ""
    member_args=[topic] if topic else []

    # message_id is the PRIMARY KEY and REFERENCES assets(message_id).
    # For an unfiltered list, aggregate only the 7k-member index instead
    # of doing thousands of random asset lookups. Topic filtering must still
    # join assets because original_topic belongs to that table.
    members_source=(
        "FROM assets a JOIN model_group_members m ON m.message_id=a.message_id "
        "WHERE a.original_topic=?" if topic else
        "FROM model_group_members m INDEXED BY idx_group_members_key"
    )
    eligible_sql="""WITH eligible AS MATERIALIZED (
        SELECT m.group_key,COUNT(*) image_count,MIN(m.message_id) sample_message,
               MAX(CASE WHEN m.match_reason='reviewed_angles' THEN 1 ELSE 0 END) reviewed
        """+members_source+"""
        GROUP BY m.group_key HAVING COUNT(*)>=?
    )"""
    listing_sql=eligible_sql+""", page AS MATERIALIZED (
        SELECT g.group_key,g.studio,g.title,g.universe,g.variant,g.state,
               g.confidence,g.revision,e.image_count,e.sample_message,e.reviewed,
               COUNT(*) OVER() total_count
        FROM eligible e JOIN model_groups g ON g.group_key=e.group_key
        WHERE """+group_where+"""
        ORDER BY e.reviewed DESC,e.image_count DESC,g.studio,g.title
        LIMIT ? OFFSET ?
    )
    SELECT p.group_key,p.studio,p.title,p.universe,p.variant,p.state,
           p.confidence,p.revision,p.image_count,
           (SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(a2.sha256),''),
                                          CAST(a2.message_id AS TEXT)))
            FROM model_group_members m2 JOIN assets a2 ON a2.message_id=m2.message_id
            WHERE m2.group_key=p.group_key""" + photo_topic + """) unique_photo_count,
           p.sample_message,p.total_count
    FROM page p
    ORDER BY p.reviewed DESC,p.image_count DESC,p.studio,p.title"""
    with db_open(db_path,readonly=True) as db:
        # The writer path owns schema setup; listing only performs SELECTs.
        rows=db.execute(listing_sql,
            member_args+[min_images]+group_args+[limit,(page-1)*limit]+
            ([topic] if topic else [])).fetchall()
        if rows:
            count=rows[0]["total_count"]
        else:
            # Keep exact total when a requested page is beyond the last page.
            count=db.execute(eligible_sql+"""
                SELECT COUNT(*) FROM eligible e JOIN model_groups g
                ON g.group_key=e.group_key WHERE """+group_where,
                member_args+[min_images]+group_args).fetchone()[0]
        items=[dict(row) for row in rows]
        for item in items:
            item.pop("total_count",None)
        if previews and items:
            sampled=gallery_preview_ids(db,[item["group_key"] for item in items],previews)
            for item in items:
                item["preview_ids"]=sampled[item["group_key"]]
        output={"total":count,"page":page,"limit":limit,"items":items}
        if previews:output["previews"]=previews
        return output

def model_detail(db_path,key):
    if not re.fullmatch("[0-9a-f]{24}",key): raise ValueError("ID de grupo inválido")
    with db_open(db_path) as db:
        setup(db)
        row=db.execute("SELECT * FROM model_groups WHERE group_key=?",(key,)).fetchone()
        if row is None: raise ValueError("Modelo não encontrado")
        members=db.execute("""SELECT a.message_id,a.sha256,a.source_relative,a.source_caption,
           a.source_album,m.match_reason FROM model_group_members m JOIN assets a
           USING(message_id) WHERE m.group_key=? ORDER BY a.message_id""",(key,)).fetchall()
        sources=db.execute("""SELECT source_type,source_url,description
          FROM model_group_evidence WHERE group_key=? ORDER BY recorded_at""",(key,)).fetchall()
        # Mensagens distintas podem apontar para os mesmos bytes. Quando um
        # arquivo presente na galeria recebeu títulos incompatíveis em qualquer
        # mensagem, mostrar a divergência, sem sobrescrever as propostas.
        # O agrupamento funciona independentemente do modulo opcional de nomes.
        # Se a tabela de propostas ainda nao existe, nao ha conflitos para listar.
        has_name_proposals=db.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='name_proposals'"
        ).fetchone() is not None
        conflicts=(db.execute("""SELECT a.sha256,
            GROUP_CONCAT(DISTINCT p.title) titles,
            COUNT(DISTINCT a.message_id) message_count
            FROM assets a JOIN name_proposals p USING(message_id)
            WHERE a.sha256 IN (
                SELECT DISTINCT a2.sha256 FROM assets a2
                JOIN model_group_members m USING(message_id)
                WHERE m.group_key=? AND TRIM(COALESCE(a2.sha256,''))!='')
              AND TRIM(COALESCE(p.title,''))!=''
            GROUP BY a.sha256
            HAVING COUNT(DISTINCT LOWER(TRIM(p.title)))>1
            ORDER BY a.sha256""",(key,)).fetchall() if has_name_proposals else [])
        return {**dict(row),"images":[dict(r) for r in members],
                "evidence":[dict(r) for r in sources],
                "identity_conflicts":[dict(r) for r in conflicts]}

def review_model(db_path,key,revision,state,official_url="",notes=""):
    if state not in {"revisar","confirmado"}:
        raise ValueError("Estado inválido")
    if not re.fullmatch("[0-9a-f]{24}",key):
        raise ValueError("Modelo inválido")
    official_url=str(official_url or "").strip()
    if state=="confirmado":
        parsed=urlparse(official_url)
        if parsed.scheme!="https" or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError("Confirmação exige URL HTTPS da publicação oficial")
    with db_open(db_path) as db:
        setup(db)
        stamp=utc()
        changed=db.execute("""UPDATE model_groups SET state=?,revision=revision+1,
                  updated_at=? WHERE group_key=? AND revision=?""",
                  (state,stamp,key,int(revision)))
        if changed.rowcount!=1:
            raise RuntimeError("Conflito de revisão ou grupo inexistente")
        if official_url:
            db.execute("""INSERT OR IGNORE INTO model_group_evidence
              VALUES(?,?,?,?,?)""",(key,official_url,"official_reviewed",
                 str(notes)[:500] or "Fonte oficial conferida pelo revisor",stamp))
        db.execute("""INSERT INTO curation_events
           (group_key,event_type,detail,occurred_at) VALUES(?,?,?,?)""",
           (key,"review_"+state,str(notes)[:500],stamp))
        db.commit()
        return {"ok":True,"state":state,"revision":int(revision)+1}
