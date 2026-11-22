#!/usr/bin/env python3
"""Fail-closed visual gallery split: synthetic SQLite, transactional and replay tests."""
from contextlib import closing
import json
import sqlite3
import tempfile
from pathlib import Path

import legacy_album_audit as audit
import model_gallery as galleries
import smart_curadoria as smart

with tempfile.TemporaryDirectory(prefix="tonart-visual-split-") as tmp:
    path=Path(tmp)/"curadoria.sqlite3"
    with closing(smart.db_open(path)) as db:
        db.executescript("""
        CREATE TABLE assets (
         message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
         source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
         source_date TEXT,source_caption TEXT,source_album TEXT,indexed_at TEXT NOT NULL);
        CREATE TABLE name_proposals (
         message_id INTEGER PRIMARY KEY,studio TEXT NOT NULL DEFAULT '',
         title TEXT NOT NULL DEFAULT '',universe TEXT NOT NULL DEFAULT '',
         variant TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL DEFAULT '',
         status TEXT NOT NULL DEFAULT 'revisar',confidence REAL DEFAULT 0,
         evidence_type TEXT NOT NULL DEFAULT '',evidence_message_id INTEGER,
         source_fingerprint TEXT NOT NULL DEFAULT '',official_url TEXT NOT NULL DEFAULT '',
         notes TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0,
         modified_at TEXT NOT NULL DEFAULT '');
        """)
        smart.setup(db)
        group="a"*24
        db.execute("""INSERT INTO model_groups (
         group_key,studio,title,state,created_at,updated_at
        ) VALUES (?,?,?,'provavel','synthetic','synthetic')""",
           (group,"Studio A","Mixed Sculpture"))
        for mid,sha,caption in [
            (101,"hash-A","Scultura A"),(102,"hash-B","Scultura A detalhe"),
            (103,"hash-C","Scultura B"),(104,"hash-C","Scultura B outra msg")
        ]:
            db.execute("""INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)""",(
                mid,sha,str(mid)+".jpg","Studio A","2026-11-22",
                caption,"album-mixed","synthetic"
            ))
            db.execute("""INSERT INTO name_proposals (
                message_id,studio,title,source_fingerprint
            ) VALUES(?,?,?,?)""",(mid,"Studio A","Mixed Sculpture","seed"))
            db.execute("""INSERT INTO model_group_members(
                message_id,group_key,match_reason,updated_at
            ) VALUES(?,?,'telegram_album','synthetic')""",(mid,group))
            db.execute("""INSERT INTO model_group_evidence (
                group_key,source_url,source_type,description,recorded_at
            ) VALUES(?,?,'telegram_album','source caption','synthetic')""",
                (group,smart.SOURCE_C+str(mid)))
        db.commit()

    def attempt(**changes):
        kwargs={
            "group_key":"a"*24, "revision":0,
            "message_ids":[103,104],
            "title":"Escultura separada B", "variant":"Outra pose",
            "note":"Duas fotos representam outra escultura sobre base diferente."
        }
        kwargs.update(changes)
        return audit.split_reviewed_gallery(path,**kwargs)

    try:
        attempt()
        raise AssertionError("Split accepted without visual audit")
    except ValueError:
        pass
    first=audit.record_review(path,group_key="a"*24,revision=0,
        decision="needs_more_evidence",
        note="A coleção precisa de comparação adicional de geometrias.")
    assert first["revision"]==1
    try:
        attempt(revision=1)
        raise AssertionError("Split accepted after insufficient-evidence audit")
    except RuntimeError:
        pass
    second=audit.record_review(path,group_key="a"*24,revision=1,
        decision="different_sculptures",
        note="Vistas 103 e 104 diferem em base e escultura das 101 e 102.")
    assert second["revision"]==2
    for bad in (
        {"revision":1},{"message_ids":[103]},
        {"message_ids":[101,102,103,104]},
        {"message_ids":[103,103]},{"message_ids":[999]},
        {"message_ids":[]},{"note":"curta"}
    ):
        try:
            kw={"revision":2}
            kw.update(bad)
            attempt(**kw)
            raise AssertionError("Unsafe split accepted: "+str(bad))
        except (ValueError, RuntimeError):
            pass
    result=attempt(revision=2)
    assert result["ok"] and result["state"]=="revisar"
    assert result["moved_ids"]==[103,104] and result["remaining_ids"]==[101,102]
    assert result["publication_approved"] is False
    new_key=result["new_group"]
    assert len(new_key)==24 and new_key!="a"*24

    with closing(smart.db_open(path,readonly=True)) as db:
        members=[tuple(r) for r in db.execute("""
            SELECT message_id,group_key,match_reason FROM model_group_members
            ORDER BY message_id
        """)]
        assert members==[
            (101,"a"*24,"telegram_album"),
            (102,"a"*24,"telegram_album"),
            (103,new_key,"reviewed_split"),
            (104,new_key,"reviewed_split")
        ],members
        groups={r["group_key"]:(r["state"],r["revision"]) for r in db.execute("""
            SELECT group_key,state,revision FROM model_groups
        """)}
        assert groups=={
            "a"*24:("revisar",3),new_key:("revisar",0)
        },groups
        evidence=[tuple(r) for r in db.execute("""
            SELECT group_key,source_url,source_type
            FROM model_group_evidence ORDER BY source_url,source_type
        """)]
        assert all(e[0]==new_key for e in evidence if
                   e[1] in (smart.SOURCE_C+"103",smart.SOURCE_C+"104"))
        protection=[tuple(r) for r in db.execute("""
            SELECT message_id,outcome FROM curation_seen ORDER BY message_id
        """)]
        assert protection==[(mid,"visual_split_review") for mid in (101,102,103,104)]
        events=[tuple(r) for r in db.execute("""
            SELECT group_key,event_type,detail FROM curation_events
            WHERE event_type IN ('visual_gallery_split','visual_gallery_split_source')
        """)]
        assert len(events)==2
        assert {e[0] for e in events}=={"a"*24,new_key}
        snapshot=json.loads(events[0][2])
        assert snapshot["before_ids"]==[101,102,103,104]
        assert snapshot["moved_ids"]==[103,104]
        assert snapshot["remaining_ids"]==[101,102]
        assert snapshot["publication_approved"] is False
        assert snapshot["originals_preserved"] is True
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"

    # A later Telegram source update MUST NOT rejoin manually separated photos.
    with closing(smart.db_open(path)) as db:
        db.execute("UPDATE assets SET source_caption=? WHERE message_id IN (101,103)",
                   ("▪️ Mixed Sculpture - Studio A",))
        db.commit()
    smart.process_batch(path,limit=100)
    with closing(smart.db_open(path,readonly=True)) as db:
        after={r["message_id"]:r["group_key"] for r in db.execute("""
            SELECT message_id,group_key FROM model_group_members
        """)}
        assert after=={101:"a"*24,102:"a"*24,103:new_key,104:new_key},after
        assert db.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==2

    # A stale audit cannot authorize another split of the changed parent.
    try:
        attempt(revision=3,message_ids=[102])
        raise AssertionError("Stale evidence accepted after source mutation")
    except RuntimeError:
        pass
    # Visual manual regrouping cannot steal a reviewed_split member either.
    try:
        galleries.register_visual_gallery(
            path,[101,103],"Studio A","Inappropriate silent remerge"
        )
        raise AssertionError("Regrouping stole a manually split image")
    except ValueError:
        pass
    print("VISUAL SPLIT E2E OK: audit gate, revision, SHA duplicates, events,"
          " transaction, anti-rejoin and originals intact")
