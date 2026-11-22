#!/usr/bin/env python3
"""Read-only queue regression using synthetic data and no Telegram originals."""
import sqlite3
import tempfile
from pathlib import Path
import review_queue as queue

with tempfile.TemporaryDirectory(prefix="tonart-review-queue-") as tmp:
    dbpath=Path(tmp)/"curadoria.sqlite3"
    with sqlite3.connect(dbpath) as db:
        db.executescript("""
            CREATE TABLE assets(
              message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
              source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
              source_date TEXT,source_caption TEXT,source_album TEXT,indexed_at TEXT NOT NULL);
            CREATE TABLE name_proposals(
              message_id INTEGER PRIMARY KEY,studio TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL DEFAULT '',universe TEXT NOT NULL DEFAULT '',
              variant TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'revisar',confidence REAL DEFAULT 0,
              evidence_type TEXT NOT NULL DEFAULT '',evidence_message_id INTEGER,
              source_fingerprint TEXT NOT NULL DEFAULT '',official_url TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0,
              modified_at TEXT NOT NULL DEFAULT '');
            CREATE TABLE model_group_members(
              message_id INTEGER PRIMARY KEY,group_key TEXT NOT NULL,
              match_reason TEXT NOT NULL,updated_at TEXT);
        """)
        images=[
            (101,"Studio A","","","revisar","",""),             # unlabeled
            (102,"Studio A","Charizard","","provavel","",""),    # legacy
            (103,"Studio A","Gengar","","revisar","",""),      # manual review
            (104,"Studio A","Umbreon","Alt","provavel","",""), # source pending
            (105,"Studio A","Red","","confirmado","https://example.com/1",""),
            (106,"Studio B","","","revisar","",""),             # unlabeled
            (107,"Geral + 50k","","","revisar","",""),          # excluded
            (108,"Studio A","Mew","","revisar","",""),          # manual review
        ]
        for mid,studio,title,variant,status,official,universe in images:
            db.execute("INSERT INTO assets VALUES (?,?,?,?,?,?,?,?)",
                (mid,"sha-"+str(mid),str(mid)+".jpg",studio,"2026-11-22",
                 "original caption","album-1","synthetic"))
            db.execute("""INSERT INTO name_proposals(
                message_id,studio,title,variant,status,official_url,universe,
                source_fingerprint
             ) VALUES (?,?,?,?,?,?,?,?)""",
                (mid,studio,title,variant,status,official,universe,"seed"))
        db.execute("INSERT INTO model_group_members VALUES (102,'group-102','telegram_album','synthetic')")
        db.commit()
    before=dbpath.read_bytes()
    first=queue.list_queue(dbpath,limit=2)
    assert first["total"] == 6,first
    assert [x["message_id"] for x in first["items"]]==[106,101],first
    assert first["next_cursor"] == "0:101" and first["has_more"],first
    cursors={""}
    pages=[first]
    while pages[-1]["has_more"]:
        nxt=queue.list_queue(dbpath,limit=2,cursor=pages[-1]["next_cursor"])
        assert nxt["next_cursor"] not in cursors
        cursors.add(nxt["next_cursor"])
        pages.append(nxt)
    ids=[x["message_id"] for page in pages for x in page["items"]]
    assert ids==[106,101,102,108,103,104],ids
    assert 107 not in ids and 105 not in ids,ids
    assert queue.list_queue(dbpath,kind="all")["total"]==7
    assert [x["message_id"] for x in queue.list_queue(dbpath,topic="Studio A",kind="legacy_album")["items"]]==[102]
    assert [x["message_id"] for x in queue.list_queue(dbpath,kind="manual_review")["items"]]==[108,103]
    assert [x["message_id"] for x in queue.list_queue(dbpath,kind="missing_source",variant="with")["items"]]==[104]
    assert [x["message_id"] for x in queue.list_queue(dbpath,kind="confirmed")["items"]]==[105]
    assert queue.list_queue(dbpath,topic="Studio A",q="Charizard")["total"]==1
    assert queue.list_queue(dbpath,kind="all",limit=48)["items"][-1]["priority"]==4
    assert queue.list_queue(dbpath,topic="Studio B")["total"]==1
    assert queue.list_queue(dbpath,topic="Absent")["total"]==0
    for args in (
        {"topic":"Geral + 50k"},{"kind":"unknown"},
        {"variant":"not_set"},{"cursor":"abc"},{"cursor":"0:0"},
        {"limit":999999},{"limit":"bad"},
    ):
        try:
            queue.list_queue(dbpath,**args)
            raise AssertionError("Unsafe filter accepted: "+str(args))
        except ValueError:
            pass
    with sqlite3.connect(dbpath) as db:
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
        assert db.execute("SELECT COUNT(*) FROM name_proposals").fetchone()[0]==8
        assert db.execute("SELECT COUNT(*) FROM model_group_members").fetchone()[0]==1
    print("REVIEW QUEUE E2E OK: prioridade, cursor estável, estúdios isolados, filtros, sem escrita")
