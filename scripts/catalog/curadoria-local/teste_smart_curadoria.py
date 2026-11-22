#!/usr/bin/env python3
"""E2E sintético isolado; produção e Telegram reais nunca são modificados."""
import hashlib
from contextlib import closing
import sqlite3
import tempfile
from pathlib import Path
import smart_curadoria as m

with tempfile.TemporaryDirectory(prefix="tonart-smart-") as temp:
    root=Path(temp)
    dbpath=root/"curadoria.sqlite3"
    source=root/"telegram"
    source.mkdir()
    with closing(sqlite3.connect(dbpath)) as conn, conn as db:
        db.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
          source_relative TEXT,original_topic TEXT,source_date TEXT,source_caption TEXT,
          source_album TEXT,indexed_at TEXT)""")
        for mid,version,album in [(101,"Diorama","alb1"),(102,"","alb1"),
                                   (103,"Busto",""),(104,"","")]:
            image=source/("msg_%d.jpg"%mid)
            image.write_bytes(("CONTENT_"+str(mid)).encode())
            digest=hashlib.sha256(image.read_bytes()).hexdigest()
            caption= ("▪️ Pikachu - Pokémon\n▫️ Versão: "+version+
              "\n▫️ Estúdio: Poke Studio") if version else ""
            db.execute("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)",
               (mid,digest,image.name,"Poke Studio","2026-11-19",caption,album,m.utc()))
    first=m.process_batch(dbpath,100)
    assert first["model_groups"]==2,first
    assert first["images_grouped"]==2,first
    assert first["images_needing_review"]==2,first
    assert first["model_states"]=={"provavel":2},first
    assert m.process_batch(dbpath,100)["processed"]==0
    with m.db_open(dbpath,readonly=True) as ro:
        assert ro.execute("PRAGMA query_only").fetchone()[0]==1
        assert ro.execute("PRAGMA temp_store").fetchone()[0]==2
        try:
            ro.execute("UPDATE model_groups SET state='revisar'")
            assert False,"read-only listing connection must refuse writes"
        except sqlite3.OperationalError:
            pass
    with m.db_open(dbpath) as writer:
        assert writer.execute("PRAGMA foreign_keys").fetchone()[0]==1
        existing_key=writer.execute(
            "SELECT group_key FROM model_groups LIMIT 1").fetchone()[0]
        try:
            writer.execute(
                "INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at) "
                "VALUES (999999,?,'test',?)",(existing_key,m.utc()))
            assert False,"missing asset must be refused by canonical writer"
        except sqlite3.IntegrityError:
            pass
    groups=m.list_models(dbpath)
    assert groups["total"]==2,groups
    assert len(groups["items"])==2
    model_wall=m.list_models(dbpath,page=1,limit=96,previews=4)
    assert model_wall["total"]==2 and model_wall["previews"]==4
    assert len(model_wall["items"])==2
    assert all(len(g["preview_ids"])==1 for g in model_wall["items"])
    assert all(g["preview_ids"][0]==g["sample_message"] for g in model_wall["items"])
    assert all("preview_ids" not in g for g in groups["items"])
    try:
        m.list_models(dbpath,previews=2)
        raise AssertionError("Noncanonical preview setting accepted")
    except ValueError:
        pass
    first_page=m.list_models(dbpath,page=1,limit=1)
    second_page=m.list_models(dbpath,page=2,limit=1)
    assert first_page["total"]==second_page["total"]==2
    assert len(first_page["items"])==len(second_page["items"])==1
    assert first_page["items"][0]["group_key"]!=second_page["items"][0]["group_key"]
    assert m.list_models(dbpath,page=99,limit=1)=={
        "total":2,"page":99,"limit":1,"items":[]}
    assert m.list_models(dbpath,topic="Poke Studio")["total"]==2
    assert m.list_models(dbpath,topic="Other studio")["total"]==0
    assert m.list_models(dbpath,q="Diorama")["total"]==1
    assert m.list_models(dbpath,q="Nothing")["total"]==0
    assert m.list_models(dbpath,state="provavel")["total"]==2
    assert m.list_models(dbpath,state="confirmado")["total"]==0
    assert m.list_models(dbpath,min_images=2)["total"]==0
    assert m.list_models(dbpath,unnamed_only=True)["total"]==0
    assert all("total_count" not in row for row in groups["items"])
    # A shared Telegram album is not a visual review, so 102 stays
    # independent/unnamed; even a matching name never merges distinct bytes.
    with m.db_open(dbpath,readonly=True) as db:
        assert db.execute("SELECT 1 FROM model_group_members WHERE message_id=102").fetchone() is None
    couple=next(g for g in groups["items"] if g["sample_message"]==101)
    detail=m.model_detail(dbpath,couple["group_key"])
    assert detail["identity_conflicts"]==[],detail  # banco isolado sem modulo de nomes
    assert {a["message_id"] for a in detail["images"]}=={101},detail
    assert len(detail["evidence"])==1,detail
    try:
        m.review_model(dbpath,couple["group_key"],0,"confirmado")
        assert False,"sem fonte oficial deveria rejeitar"
    except ValueError: pass
    review=m.review_model(dbpath,couple["group_key"],0,"confirmado",
                           "https://example.com/creator/pikachu","Revisão humana de teste")
    assert review["revision"]==1,review
    try:
        m.review_model(dbpath,couple["group_key"],0,"revisar")
        assert False,"revisão antiga deveria conflitar"
    except RuntimeError: pass
    with closing(sqlite3.connect(dbpath)) as conn, conn as db:
        db.execute("""UPDATE assets SET source_caption=? WHERE message_id=103""",
         ("▪️ Pikachu - Pokémon\n▫️ Versão: Diorama\n▫️ Estúdio: Poke Studio",))
    changed=m.process_batch(dbpath,100)
    assert changed["processed"]==1,changed
    assert changed["images_grouped"]==2,changed
    assert changed["model_groups"]==2,changed
    assert changed["model_states"]=={"confirmado":1,"provavel":1},changed
    for mid in [101,102,103,104]:
        p=source/("msg_%d.jpg"%mid)
        assert p.read_bytes()==("CONTENT_"+str(mid)).encode()
    # Two named media entries in the same album may be different sculptures.
    # Keep separate model groups until reviewed_angles explicitly joins them.
    with closing(sqlite3.connect(dbpath)) as conn, conn as db:
        for mid in (105, 106):
            content=("CONTENT_"+str(mid)).encode()
            (source/("msg_%d.jpg"%mid)).write_bytes(content)
            db.execute("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)", (
                mid, hashlib.sha256(content).hexdigest(), "msg_%d.jpg"%mid,
                "Poke Studio", "2026-11-19",
                "▪️ Gengar - Pokémon\n▫️ Estúdio: Poke Studio",
                "album-mixed-sculptures", m.utc()))
    new=m.process_batch(dbpath,100)
    assert new["processed"]==2,new
    with m.db_open(dbpath,readonly=True) as db:
        keys=db.execute(
            "SELECT message_id,group_key FROM model_group_members "
            "WHERE message_id IN (105,106) ORDER BY message_id"
        ).fetchall()
        assert len(keys)==2
        assert keys[0]["group_key"]!=keys[1]["group_key"]
        for mid in (102,104):
            assert db.execute("SELECT 1 FROM model_group_members WHERE message_id=?",(mid,)).fetchone() is None
    for mid in (105,106):
        assert (source/("msg_%d.jpg"%mid)).read_bytes()==("CONTENT_"+str(mid)).encode()
    print("E2E SMART APROVADO: álbum não mescla esculturas, variantes, reprocessamento, evidências, revisão, concorrência otimista, originais íntegros")
