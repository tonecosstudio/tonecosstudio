#!/usr/bin/env python3
"""Atomic batch visual-audit E2E; all media/database data are synthetic."""
from contextlib import closing
from http.server import ThreadingHTTPServer
from pathlib import Path
import http.client
import json
import sqlite3
import tempfile
import threading

import smart_curadoria as smart
import legacy_album_audit as audit
import tonart_curadoria as host


with tempfile.TemporaryDirectory(prefix="tonart-batch-audit-") as temp:
    dbpath=Path(temp)/"private.sqlite3"
    with closing(sqlite3.connect(dbpath)) as db:
        db.executescript("""
          CREATE TABLE assets (
           message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
           source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
           source_date TEXT,source_caption TEXT,source_album TEXT,
           indexed_at TEXT NOT NULL);
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
        for idx,key in enumerate(("a"*24,"b"*24,"c"*24)):
            studio="Studio A" if idx<2 else "Geral + 50k"
            db.execute("""INSERT INTO model_groups (
                group_key,studio,title,state,created_at,updated_at)
                VALUES(?,?,?,'provavel','synthetic','synthetic')
            """,(key,studio,"Sculpture "+str(idx)))
            for mid in (idx*10+1,idx*10+2,idx*10+3):
                db.execute("""INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)
                """,(mid,"sha-"+str(mid),f"msg_{mid}.jpg",studio,
                    "2026-11-22","Photo","album-"+str(idx),"synthetic"))
                db.execute("""INSERT INTO model_group_members (
                    message_id,group_key,match_reason,updated_at)
                    VALUES(?,?,'telegram_album','synthetic')
                """,(mid,key))
        db.commit()

    def evidence(key,rev=0,decision="same_sculpture"):
        offset=0 if key=="a"*24 else (10 if key=="b"*24 else 20)
        ids=[offset+1,offset+2,offset+3]
        return {
            "group_key":key,"revision":rev,
            "decision":decision,
            "note":"Inspecionados os três ângulos completos, geometria e base conferidas.",
            "member_ids":ids,"sha256s":["sha-"+str(i) for i in ids],
        }

    one=evidence("a"*24)
    two=evidence("b"*24,decision="needs_more_evidence")
    original_members=9
    # A stale review in the middle must roll back the first write as well.
    try:
        audit.record_reviews_batch(dbpath,reviews=[one,{**two,"revision":12}])
        raise AssertionError("Stale batch was committed")
    except RuntimeError:
        pass
    with closing(smart.db_open(dbpath,readonly=True)) as db:
        assert db.execute("SELECT COUNT(*) FROM curation_events").fetchone()[0]==0
        assert db.execute("SELECT SUM(revision) FROM model_groups").fetchone()[0]==0
    # Snapshot tampering has the same all-or-nothing behavior.
    try:
        audit.record_reviews_batch(dbpath,reviews=[one,{**two,"sha256s":["wrong"]*3}])
        raise AssertionError("Stale SHA accepted")
    except RuntimeError:
        pass
    for invalid in (
        [],[one]*2,[{**one,"member_ids":[1,2]}],
        [{**one,"member_ids":[2,1,3]}],
        [evidence("c"*24)],list(range(13))
    ):
        try:
            audit.record_reviews_batch(dbpath,reviews=invalid)
            raise AssertionError("Invalid batch accepted")
        except ValueError:
            pass

    # HTTP exercises the same service as the real OrdaX MCP, with the real
    # loopback-Origin and CSRF token, on a temporary ThreadingHTTPServer.
    previous=host.DB_PATH
    host.DB_PATH=dbpath
    server=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    server.daemon_threads=True
    runner=threading.Thread(target=server.serve_forever,daemon=True)
    runner.start()
    def call(reviews,*,auth=True):
        conn=http.client.HTTPConnection("127.0.0.1",server.server_port,timeout=12)
        headers={"Origin":f"http://{host.HOST}:{host.PORT}",
                 "Content-Type":"application/json"}
        if auth:
            headers["X-Tonart-Token"]=host.TOKEN
        try:
            conn.request("POST","/api/audit-legacy-galleries-batch",
                json.dumps({"reviews":reviews}).encode("utf-8"),headers)
            response=conn.getresponse()
            return response.status,json.loads(response.read())
        finally:
            conn.close()
    try:
        code,_=call([one,two],auth=False)
        assert code==403,code
        code,_=call([one,{**two,"revision":5}])
        assert code==409,code
        code,result=call([one,two])
        assert code==200 and result["ok"] and result["atomic"] and result["reviewed"]==2,result
        assert result["publication_approved"] is False
        assert result["group_relations_changed"] is False
        assert [r["decision"] for r in result["results"]]==[
            "same_sculpture","needs_more_evidence"
        ]
        code,_=call([one,two])
        assert code==409,"Concurrent duplicate batch accepted"
    finally:
        server.shutdown()
        server.server_close()
        runner.join(timeout=5)
        host.DB_PATH=previous
    with closing(smart.db_open(dbpath,readonly=True)) as db:
        events=db.execute("""SELECT group_key,event_type,detail
            FROM curation_events ORDER BY event_id""").fetchall()
        assert len(events)==2
        assert [e["event_type"] for e in events]==[
            "visual_gallery_audited","visual_gallery_audit_attention"
        ]
        assert all(json.loads(e["detail"])["publication_approved"] is False for e in events)
        assert db.execute("SELECT COUNT(*) FROM model_group_members").fetchone()[0]==original_members
        assert db.execute("SELECT SUM(revision) FROM model_groups").fetchone()[0]==2
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"

    print("ATOMIC BATCH E2E PASS: 2 galleries, HTTP 200/403/409, all-or-none, SHA/revision, no publication")
