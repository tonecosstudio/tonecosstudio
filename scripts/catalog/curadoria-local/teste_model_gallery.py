#!/usr/bin/env python3
"""Galeria real de diferentes vistas: teste isolado, originais fictícios intocados."""
import hashlib
import csv
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
import model_gallery as gallery
import smart_curadoria as smart
import name_curadoria as naming

with tempfile.TemporaryDirectory(prefix="tonart-gallery-") as tmp:
    root=Path(tmp)
    db=root/"curadoria.sqlite3"
    source=root/"telegram"
    source.mkdir()
    with closing(sqlite3.connect(db)) as con, con:
        con.execute("""CREATE TABLE assets (
            message_id INTEGER PRIMARY KEY, sha256 TEXT,
            source_relative TEXT, original_topic TEXT, source_caption TEXT,
            source_album TEXT, source_date TEXT, indexed_at TEXT)""")
        for mid,topic in [(101,"Abe3D"),(102,"Abe3D"),(103,"Abe3D"),
                          (104,"Other"),(105,"Abe3D"),(106,"Abe3D")]:
            data=("image-"+str(mid)).encode()
            (source/f"msg_{mid}.jpg").write_bytes(data)
            con.execute("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)",
                (mid,hashlib.sha256(data).hexdigest(),f"msg_{mid}.jpg",
                 topic,"","","2026-11-19",smart.utc()))
    naming.process_batch(db,100)
    smart.process_batch(db,100)
    g=gallery.register_visual_gallery(db,[101,102],"Abe3D","same sculpture other angle")
    assert g["created"] and g["image_count"]==2 and g["state"]=="revisar",g
    assert gallery.register_visual_gallery(db,[101,102],"Abe3D")["created"] is False
    assert gallery.stats(db)=={"galleries":1,"photos_in_galleries":2,"visually_reviewed_galleries":1}
    assert smart.list_models(db,min_images=2)["total"]==1
    assert smart.list_models(db,min_images=2,unnamed_only=True)["total"]==1
    assert len(smart.model_detail(db,g["group_key"])["images"])==2
    manifest=naming.export_manifest(db,root/"nomes.csv")
    assert manifest["exported"]==6,manifest
    with (root/"nomes.csv").open(encoding="utf-8-sig",newline="") as fd:
        rows={int(row["message_id"]):row for row in csv.DictReader(fd,delimiter=";")}
    assert rows[101]["galeria_id"]==g["group_key"]
    assert rows[102]["fotos_na_galeria"]=="2"
    assert rows[101]["aprovado_para_publicacao"]=="false"
    assert rows[103]["galeria_id"]==""
    try:gallery.register_visual_gallery(db,[102,103],"Abe3D")
    except ValueError:pass
    else:raise AssertionError("Cross-group merge should reject")
    try:gallery.register_visual_gallery(db,[103,104],"Abe3D")
    except ValueError:pass
    else:raise AssertionError("Cross-topic merge should reject")
    for mid,title in [(105,"Psylocke"),(106,"Rogue")]:
        with smart.db_open(db) as con:
            revision=con.execute("SELECT revision FROM name_proposals WHERE message_id=?",(mid,)).fetchone()[0]
        naming.review_name(db,mid,revision,title,"Abe3D","X-Men","","revisar")
    try:gallery.register_visual_gallery(db,[105,106],"Abe3D")
    except ValueError:pass
    else:raise AssertionError("Different titles should reject")
    with smart.db_open(db) as con:
        con.execute("UPDATE assets SET source_caption=? WHERE message_id=101",
            ("▪️ Another Statue - Marvel\n▫️ Estúdio: Abe3D",))
    smart.process_batch(db,100)
    after=smart.model_detail(db,g["group_key"])
    assert [x["message_id"] for x in after["images"]]==[101,102],after
    # Nome posterior atualiza apenas o rótulo da galeria, não os membros.
    with smart.db_open(db) as con:
        revision=con.execute("SELECT revision FROM name_proposals WHERE message_id=101").fetchone()[0]
    naming.review_name(db,101,revision,"Same Statue","Abe3D","","","revisar")
    inherited=naming.propagate_reviewed_gallery_names(db)
    assert inherited["inherited_names"]==1,inherited
    assert naming.propagate_reviewed_gallery_names(db)["inherited_names"]==0
    with smart.db_open(db) as con:
        label=con.execute("SELECT status,title,evidence_type,evidence_message_id FROM name_proposals WHERE message_id=102").fetchone()
    assert (label["status"],label["title"],label["evidence_type"],label["evidence_message_id"])==(
        "provavel","Same Statue","gallery_name_inherited",101),dict(label)
    with smart.db_open(db) as con:
        con.execute("UPDATE assets SET source_caption=? WHERE message_id=102",
                    ("▪️ Other Character - Marvel\n▫️ Estúdio: Abe3D",))
    naming.process_batch(db,100)
    with smart.db_open(db) as con:
        assert con.execute("SELECT title FROM name_proposals WHERE message_id=102").fetchone()[0]=="Same Statue"
    assert gallery.refresh_titles(db)["updated_titles"]==1
    assert gallery.refresh_titles(db)["updated_titles"]==0
    assert smart.model_detail(db,g["group_key"])["title"]=="Same Statue"
    assert smart.list_models(db,min_images=2,unnamed_only=True)["total"]==0
    # Name still pending is valid; gallery itself does not approve a product.
    assert naming.stats(db)["names_confirmed"]==0
    assert naming.materialize_confirmed(db,source,root)["created"]==0
    assert all((source/f"msg_{mid}.jpg").read_bytes()==f"image-{mid}".encode()
               for mid in (101,102,103,104,105,106))
    print("E2E GALERIA APROVADO: múltiplos ângulos, idempotência, "
          "conflitos, metadados, nomes pendentes, integridade dos originais")
