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
    assert first["images_grouped"]==3,first
    assert first["images_needing_review"]==1,first
    assert first["model_states"]=={"provavel":2},first
    assert m.process_batch(dbpath,100)["processed"]==0
    groups=m.list_models(dbpath)
    assert groups["total"]==2,groups
    couple=next(g for g in groups["items"] if g["image_count"]==2)
    detail=m.model_detail(dbpath,couple["group_key"])
    assert {a["message_id"] for a in detail["images"]}=={101,102},detail
    assert len(detail["evidence"])==2,detail
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
    assert changed["images_grouped"]==3,changed
    assert changed["model_groups"]==2,changed
    assert changed["model_states"]=={"confirmado":1,"provavel":1},changed
    for mid in [101,102,103,104]:
        p=source/("msg_%d.jpg"%mid)
        assert p.read_bytes()==("CONTENT_"+str(mid)).encode()
    print("E2E SMART APROVADO: album, variantes, reprocessamento, evidências, revisão, concorrência otimista, originais íntegros")
