#!/usr/bin/env python3
"""E2E sintético da auditoria de galeria legada, sem tocar no acervo real."""
from contextlib import closing
import json
import sqlite3
import tempfile
import http.client
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

import legacy_album_audit as audit
import tonart_curadoria as host

with tempfile.TemporaryDirectory(prefix="tonart-album-audit-") as root:
    dbpath=Path(root)/"curadoria.sqlite3"
    with closing(sqlite3.connect(dbpath)) as db:
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
        CREATE TABLE model_groups (
          group_key TEXT PRIMARY KEY,studio TEXT NOT NULL,
          title TEXT NOT NULL,universe TEXT NOT NULL DEFAULT '',
          variant TEXT NOT NULL DEFAULT '',state TEXT NOT NULL DEFAULT 'provavel',
          confidence REAL NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE model_group_members (
          message_id INTEGER PRIMARY KEY,group_key TEXT NOT NULL,
          match_reason TEXT NOT NULL,updated_at TEXT);
        CREATE TABLE curation_events (
          event_id INTEGER PRIMARY KEY AUTOINCREMENT,group_key TEXT,
          message_id INTEGER,event_type TEXT NOT NULL,detail TEXT NOT NULL,
          occurred_at TEXT NOT NULL);
        """)
        sample = {
            "a"*24:("Studio A","Magneto",
                [(101,"", "album-A"),(102,"Busto","album-A"),
                 (103,"","album-A")],"telegram_album"),
            "b"*24:("Studio A","Rogue",
                [(111,"", "album-B"),(112,"","album-B")],"telegram_album"),
            "c"*24:("Studio B","Umbreon",
                [(201,"","album-C1"),(202,"","album-C2"),
                 (203,"","album-C2")],"telegram_album"),
            "d"*24:("Studio A","Already Visually Reviewed",
                [(301,"","album-D"),(302,"","album-D")],"reviewed_angles"),
            "e"*24:("Geral + 50k","Outside Scope",
                [(401,"","album-E"),(402,"","album-E")],"telegram_album"),
        }
        for key,(studio,title,entries,reason) in sample.items():
            db.execute("""INSERT INTO model_groups(group_key,studio,title,created_at,updated_at)
                VALUES(?,?,?,'synthetic','synthetic')""",(key,studio,title))
            for mid,variant,album in entries:
                db.execute("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)",
                    (mid,"hash-"+str(mid),str(mid)+".jpg",studio,
                     "2026-11-22","Legenda",album,"synthetic"))
                db.execute("""INSERT INTO name_proposals (
                    message_id,studio,title,variant,source_fingerprint
                ) VALUES (?,?,?,?,?)""",(mid,studio,title,variant,"seed"))
                db.execute("INSERT INTO model_group_members VALUES(?,?,?,'synthetic')",
                    (mid,key,reason))
        db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
            VALUES(?,'visual_gallery_audited','{"publication_approved":false}','synthetic')""",
            ("b"*24,))
        db.commit()
    original=dbpath.stat().st_size
    pending=audit.list_groups(dbpath,state="pending",limit=1)
    assert pending["total"]==2,pending
    assert pending["has_more"] and pending["next_cursor"],pending
    assert pending["items"][0]["group_key"]=="a"*24,pending
    second=audit.list_groups(
        dbpath,state="pending",limit=1,cursor=pending["next_cursor"]
    )
    assert second["items"][0]["group_key"]=="c"*24,second
    assert not second["has_more"] and not second["next_cursor"]
    assert audit.list_groups(dbpath,state="audited")["total"]==1
    assert audit.list_groups(dbpath,state="all")["total"]==3
    assert audit.list_groups(dbpath,state="pending",risk="variants")["total"]==1
    assert audit.list_groups(dbpath,state="pending",risk="albums")["total"]==1
    assert audit.list_groups(dbpath,topic="Studio B")["total"]==1
    assert audit.list_groups(dbpath,topic="Studio A")["total"]==1
    assert audit.list_groups(dbpath,topic="Absent")["total"]==0
    for kwargs in (
        {"topic":"Geral + 50k"},{"state":"not_a_state"},
        {"risk":"not_a_risk"},{"cursor":"0:0:bad"},
        {"limit":9999},{"limit":"bad"}
    ):
        try:
            audit.list_groups(dbpath,**kwargs)
            raise AssertionError("Consulta insegura não foi bloqueada: "+str(kwargs))
        except ValueError:
            pass
    result=audit.record_review(
        dbpath,group_key="c"*24,revision=0,
        decision="different_sculptures",
        note="A prancha indica esculturas diferentes; separar após inspeção editorial."
    )
    assert result["event_type"]=="visual_gallery_audit_attention" and result["revision"]==1
    assert result["group_relations_changed"] is False
    assert audit.list_groups(dbpath,state="pending")["total"]==2
    listing=audit.list_groups(dbpath,topic="Studio B")
    assert listing["items"][0]["review_state"]=="attention"
    try:
        audit.record_review(
            dbpath,group_key="c"*24,revision=0,
            decision="same_sculpture",note="Nova revisão ainda sem evidência suficiente."
        )
        raise AssertionError("Revisão antiga aceita")
    except RuntimeError:
        pass
    validated=audit.record_review(
        dbpath,group_key="a"*24,revision=0,
        decision="same_sculpture",
        note="Três vistas comparadas na prancha; geometria da mesma escultura."
    )
    assert validated["event_type"]=="visual_gallery_audited"
    assert validated["publication_approved"] is False
    assert audit.list_groups(dbpath,state="pending")["total"]==1
    assert audit.list_groups(dbpath,state="audited")["total"]==2
    try:
        audit.record_review(dbpath,group_key="a"*24,revision=1,
            decision="same_sculpture",
            note="Tentativa duplicada de conclusão por outro agente de revisão.")
        raise AssertionError("Revisão duplicada aceita")
    except RuntimeError:
        pass
    with closing(sqlite3.connect(dbpath)) as db:
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
        assert db.execute("SELECT COUNT(*) FROM model_group_members").fetchone()[0]==12
        assert db.execute("""SELECT COUNT(*) FROM curation_events
            WHERE event_type='visual_gallery_audited'""").fetchone()[0]==2
        evidence=db.execute("""SELECT detail FROM curation_events
            WHERE group_key=? AND event_type='visual_gallery_audited'""",
            ("a"*24,)).fetchone()[0]
        parsed=json.loads(evidence)
        assert parsed["member_ids"]==[101,102,103]
        assert parsed["sha256s"]==["hash-101","hash-102","hash-103"]
        assert parsed["identity_approved"] is False
        assert parsed["publication_approved"] is False
        assert db.execute("""SELECT state,revision FROM model_groups
            WHERE group_key=?""",("a"*24,)).fetchone()==("provavel",1)
    # HTTP contract shared by UI and MCP. All data stays synthetic.
    original_db=host.DB_PATH
    host.DB_PATH=dbpath
    service=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    service.daemon_threads=True
    worker=threading.Thread(target=service.serve_forever,daemon=True)
    worker.start()
    def exchange(method,path,body=None):
        with closing(http.client.HTTPConnection(
            "127.0.0.1",service.server_port,timeout=7,
        )) as conn:
            payload=json.dumps(body).encode("utf-8") if body is not None else None
            headers=({
                "Origin":f"http://{host.HOST}:{host.PORT}",
                "X-Tonart-Token":host.TOKEN,
                "Content-Type":"application/json"
            } if method=="POST" else {})
            conn.request(method,path,body=payload,headers=headers)
            response=conn.getresponse()
            return response.status,json.loads(response.read().decode("utf-8"))
    try:
        code,data=exchange("GET","/api/legacy-album-audit?state=pending&limit=2")
        assert code==200 and data["total"]==1
        assert data["items"][0]["group_key"]=="c"*24
        code,data=exchange("GET","/api/legacy-album-audit?risk=invalid")
        assert code==400 and "error" in data
        code,data=exchange("GET","/api/legacy-album-audit?topic=Geral+%2B+50k")
        assert code==400
        code,data=exchange("GET","/api/capabilities")
        assert code==200 and all(
            any(x["id"]==op for x in data["operations"])
            for op in ("gallery.legacy_audit","gallery.legacy_audit_review")
        )
        body={
            "group_key":"c"*24,"revision":1,
            "decision":"same_sculpture",
            "note":"Três vistas originais revisadas; mesma base, geometria e pose."
        }
        code,data=exchange("POST","/api/audit-legacy-gallery",body)
        assert code==200 and data["revision"]==2
        assert data["publication_approved"] is False
        code,data=exchange("POST","/api/audit-legacy-gallery",body)
        assert code==409 and "error" in data
        code,data=exchange("GET","/api/legacy-album-audit?state=pending")
        assert code==200 and data["total"]==0
    finally:
        service.shutdown()
        service.server_close()
        worker.join(timeout=6)
        host.DB_PATH=original_db

    print("AUDITORIA DE GALERIAS E2E: fila agrupada, cursores, revisão otimista, conflitos, histórico, originais intocados")
