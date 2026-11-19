#!/usr/bin/env python3
"""Teste isolado da nomeação; nenhum acesso à pasta real do Telegram."""
import hashlib
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
import name_curadoria as m

with tempfile.TemporaryDirectory(prefix="tonart-nomeacao-test-") as directory:
    root=Path(directory)
    source=root/"originais"
    source.mkdir()
    db=root/"curadoria.sqlite3"
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        cn.execute("""CREATE TABLE assets(
            message_id INTEGER PRIMARY KEY,sha256 TEXT,source_relative TEXT,
            original_topic TEXT,source_caption TEXT,source_album TEXT)""")
        for mid,model,variant,album in [
            (101,"Pikachu","Diorama","grupo-a"),(102,"","","grupo-a"),
            (103,"Pikachu","Diorama",""),(104,"","","")]:
            p=source/f"msg_{mid}.jpg"
            p.write_bytes(f"imagem-ficticia-{mid}".encode())
            sha=hashlib.sha256(p.read_bytes()).hexdigest()
            caption=f"▪️ {model} - Pokémon\\n▫️ Versão: {variant}\\n▫️ Estúdio: Poke Studio" if model else ""
            caption=caption.replace("\\n","\n")
            cn.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                (mid,sha,p.name,"Poke Studio",caption,album))
    first=m.process_batch(db,50)
    assert first["images_processed"]==4,first
    assert first["names_proposed"]==3,first
    assert first["awaiting_name_review"]==1,first
    assert m.process_batch(db,50)["processed"]==0
    names=m.list_names(db,limit=10)["items"]
    by_id={row["message_id"]:row for row in names}
    assert by_id[101]["filename"]=="pikachu-diorama-msg101.jpg"
    assert by_id[102]["evidence_message_id"]==101
    assert by_id[102]["evidence_type"]=="telegram_album"
    assert by_id[103]["filename"]=="pikachu-diorama-msg103.jpg"
    assert by_id[104]["status"]=="revisar"
    try:
        m.review_name(db,101,0,"Pikachu Especial","Poke Studio","Pokémon","Diorama","confirmado")
        assert False,"Falta de fonte oficial deveria bloquear a confirmação"
    except ValueError: pass
    confirmed=m.review_name(db,101,0,"Pikachu Especial","Poke Studio","Pokémon",
        "Diorama","confirmado","https://example.org/modelo","Fonte revisada em teste")
    assert confirmed["filename"]=="pikachu-especial-diorama-msg101.jpg",confirmed
    try:
        m.review_name(db,101,0,"Pikachu","Poke Studio","","","revisar")
        assert False,"Revisão desatualizada deveria falhar"
    except RuntimeError: pass
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        cn.execute("UPDATE assets SET source_caption=? WHERE message_id=101",
            ("▪️ Eevee - Pokémon\n▫️ Estúdio: Poke Studio",))
        cn.execute("UPDATE assets SET source_caption=? WHERE message_id=103",
            ("▪️ Gengar - Pokémon\n▫️ Estúdio: Poke Studio",))
    changed=m.process_batch(db,50)
    assert changed["processed"]>=1,changed
    by_id={a["message_id"]:a for a in m.list_names(db,limit=10)["items"]}
    assert by_id[101]["status"]=="confirmado"
    assert by_id[101]["title"]=="Pikachu Especial"
    assert by_id[103]["filename"]=="gengar-msg103.jpg"
    material=m.materialize_confirmed(db,source,root/"revisada")
    assert material["created"]==1,material
    target=root/"revisada"/"modelos-revisados"/"Poke Studio"/"Pikachu Especial"/"pikachu-especial-diorama-msg101.jpg"
    assert target.is_file() and target.read_bytes()==(source/"msg_101.jpg").read_bytes()
    assert m.materialize_confirmed(db,source,root/"revisada")["existing"]==1
    assert m.safe_component("Nome: especial?")=="Nome_ especial_"
    out=m.export_manifest(db,root/"manifesto-nomes.csv")
    assert out["exported"]==4,out
    assert (root/"manifesto-nomes.csv").exists()
    for mid in (101,102,103,104):
        assert (source/f"msg_{mid}.jpg").read_bytes()==f"imagem-ficticia-{mid}".encode()
    print("NOMEAÇÃO E2E APROVADA: propostas, álbum, nomes únicos, aprovação com fonte, conflito, retomada, CSV e originais intactos")
