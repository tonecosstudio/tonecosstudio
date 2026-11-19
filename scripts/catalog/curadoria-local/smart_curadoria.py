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

def db_open(path):
    db = sqlite3.connect(str(path), timeout=15, factory=ManagedConnection)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=15000")
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
        albums={}
        for a in assets:
            if a["source_album"] and a["source_caption"]:
                albums.setdefault((a["original_topic"],a["source_album"]),[]).append(a["source_caption"])
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
            # Galerias revisadas visualmente têm prioridade sobre a sugestão
            # automática baseada apenas em legenda / álbum. Uma mudança no
            # downloader não deve desmontar ou sobrescrever a revisão humana.
            reviewed=db.execute("""SELECT 1 FROM model_group_members
                 WHERE message_id=? AND match_reason='reviewed_angles'
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
            derived=False
            if result is None and a["source_album"]:
                candidates=[identify(a["original_topic"],v) for v in
                    albums.get((a["original_topic"],a["source_album"]),[])]
                candidates=[c for c in candidates if c]
                # Só propagar legenda quando TODOS os candidatos no álbum concordam.
                if candidates and len({c["group_key"] for c in candidates})==1:
                    result=candidates[0].copy()
                    result["confidence"]=0.68
                    derived=True
            if result:
                # Nomes iguais não provam que se trata da MESMA estatueta.
                # Somente álbum compartilhado ou conteúdo idêntico permitem fusão automática.
                cluster=("album:"+str(a["source_album"])) if a["source_album"] else ("sha256:"+str(a["sha256"]))
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
                   (mid,key,"telegram_album" if derived else "telegram_caption",stamp))
                url=SOURCE_C+str(mid)
                db.execute("""INSERT OR IGNORE INTO model_group_evidence
                   (group_key,source_url,source_type,description,recorded_at)
                   VALUES(?,?,?,?,?)""",(key,url,"telegram_album" if derived else "telegram_caption",
                           "Legenda/álbum Telegram, sem verificação externa",stamp))
                if not prev or prev["group_key"]!=key:
                    db.execute("""INSERT INTO curation_events(group_key,message_id,event_type,detail,occurred_at)
                      VALUES(?,?,'auto_candidate',?,?)""",
                      (key,mid,"álbum consistente" if derived else "legenda estruturada",stamp))
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
    with db_open(db_path) as db:
        setup(db)
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

def list_models(db_path,page=1,limit=48,topic="",q="",state="",min_images=1):
    page=max(1,int(page)); limit=max(1,min(int(limit),120))
    clauses=["1=1"];args=[]
    if topic:
        clauses.append("a.original_topic=?");args.append(topic)
    if q:
        clauses.append("(g.studio LIKE ? OR g.title LIKE ? OR g.universe LIKE ? OR g.variant LIKE ?)")
        args += ["%"+q+"%"]*4
    if state in VALID_STATE:
        clauses.append("g.state=?");args.append(state)
    where=" AND ".join(clauses)
    min_images=max(1,min(40,int(min_images)))
    with db_open(db_path) as db:
        setup(db)
        count=db.execute("""SELECT COUNT(*) FROM (
             SELECT g.group_key FROM model_groups g
             JOIN model_group_members m USING(group_key) JOIN assets a USING(message_id)
             WHERE """+where+"""
             GROUP BY g.group_key HAVING COUNT(DISTINCT m.message_id)>=?)""",
             args+[min_images]).fetchone()[0]
        rows=db.execute("""SELECT g.group_key,g.studio,g.title,g.universe,g.variant,
            g.state,g.confidence,g.revision,COUNT(DISTINCT m.message_id) image_count,
            MIN(m.message_id) sample_message
            FROM model_groups g JOIN model_group_members m USING(group_key)
            JOIN assets a USING(message_id) WHERE """+where+"""
            GROUP BY g.group_key HAVING COUNT(DISTINCT m.message_id)>=?
            ORDER BY MAX(CASE WHEN m.match_reason='reviewed_angles' THEN 1 ELSE 0 END) DESC,
                     image_count DESC,g.studio,g.title
            LIMIT ? OFFSET ?""",args+[min_images,limit,(page-1)*limit]).fetchall()
        return {"total":count,"page":page,"limit":limit,"items":[dict(r) for r in rows]}

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
        return {**dict(row),"images":[dict(r) for r in members],
                "evidence":[dict(r) for r in sources]}

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
