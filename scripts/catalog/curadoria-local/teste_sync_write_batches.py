#!/usr/bin/env python3
"""Prove bounded Telegram-to-host writer transactions and crash-safe resume.

Entirely synthetic, offline, isolated paths. No user files, public Site,
Cloudflare, downloader session or original media are accessed.
"""
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile

import tonart_curadoria as host

assert 16<=host.SYNC_WRITE_BATCH<=256

with tempfile.TemporaryDirectory(prefix="tonart-sync-writer-") as folder:
    root=Path(folder)
    host.SOURCE=root/"fake-telegram"
    host.SOURCE.mkdir()
    host.SOURCE_DB=host.SOURCE/"progresso.sqlite3"
    host.APP_DIR=root/"local-curadoria"
    host.DB_PATH=host.APP_DIR/"curadoria.sqlite3"
    host.TOKEN_PATH=host.APP_DIR/"local-token.txt"
    host.initialize()
    with closing(sqlite3.connect(host.SOURCE_DB)) as source:
        source.executescript("""
          CREATE TABLE mensagens(
            origem INTEGER NOT NULL,mensagem INTEGER NOT NULL,
            hash TEXT,caminho TEXT,data_mensagem TEXT,status TEXT,
            PRIMARY KEY(origem,mensagem));
          CREATE TABLE topicos_mensagens(
            origem INTEGER,mensagem INTEGER,topico_nome TEXT,legenda TEXT,
            album_id TEXT,PRIMARY KEY(origem,mensagem));
        """)
        for mid in range(1,306):
            source.execute("""INSERT INTO mensagens
              (origem,mensagem,hash,caminho,data_mensagem,status)
              VALUES(?,?,?,?,?,'salvo')""",(
                 host.SOURCE_ID,mid,"sha-"+str(mid),
                 f"StudioA/msg_{mid}.jpg","2026-11-22",
            ))
        source.commit()

    original_connect=host.connect
    writer_connections=[]
    def injected_connect(path,readonly=False):
        if not readonly and Path(path).resolve()==host.DB_PATH.resolve():
            writer_connections.append(1)
            if len(writer_connections)==2:
                raise RuntimeError("Synthetic interruption before second writer slice")
        return original_connect(path,readonly)

    host.connect=injected_connect
    try:
        try:
            host.sync()
            raise AssertionError("Expected interrupted import")
        except RuntimeError as exc:
            assert "Synthetic interruption" in str(exc)
    finally:
        host.connect=original_connect

    with original_connect(host.DB_PATH,readonly=True) as db:
        rows=db.execute("SELECT COUNT(*),MAX(message_id) FROM assets").fetchone()
        assert tuple(rows)==(host.SYNC_WRITE_BATCH,host.SYNC_WRITE_BATCH),tuple(rows)
        assert db.execute("SELECT COUNT(*) FROM annotations").fetchone()[0]==host.SYNC_WRITE_BATCH

    successful_writer_slices=[]
    def tracking_connect(path,readonly=False):
        if not readonly and Path(path).resolve()==host.DB_PATH.resolve():
            successful_writer_slices.append(1)
        return original_connect(path,readonly)

    host.connect=tracking_connect
    try:
        imported=host.sync()
        assert imported==305-host.SYNC_WRITE_BATCH,imported
        assert len(successful_writer_slices)==2,successful_writer_slices
        assert host.sync()==0
        assert len(successful_writer_slices)==2,"No-op scan should not open writer"

        with closing(sqlite3.connect(host.SOURCE_DB)) as source:
            source.execute("""INSERT INTO topicos_mensagens(
              origem,mensagem,topico_nome,legenda,album_id)
              VALUES(?,?,?,?,?)""",(
                host.SOURCE_ID,300,"StudioA","Nova legenda de origem","album-300"
            ))
            source.commit()
        assert host.sync()==1
        assert len(successful_writer_slices)==3
    finally:
        host.connect=original_connect

    with original_connect(host.DB_PATH,readonly=True) as db:
        assert db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]==305
        assert db.execute("SELECT COUNT(*) FROM annotations").fetchone()[0]==305
        row=db.execute("""
            SELECT source_caption,source_album FROM assets
            WHERE message_id=300
        """).fetchone()
        assert row["source_caption"]=="Nova legenda de origem"
        assert row["source_album"]=="album-300"
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    print("BOUNDED SYNC E2E PASS: 128-row commits, injected crash, 177-row resume, no-op and changed caption")
