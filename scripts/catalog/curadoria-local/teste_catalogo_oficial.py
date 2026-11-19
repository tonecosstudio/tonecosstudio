"""E2E isolado: fonte do estúdio, tópico, idempotência e revisão preservada."""
import hashlib
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
import name_curadoria as names

with tempfile.TemporaryDirectory(prefix="tonart-creator-catalog-") as directory:
 root=Path(directory)
 db=root/"local.sqlite3"
 files=root/"source"
 files.mkdir()
 with closing(sqlite3.connect(db)) as conn, conn:
  conn.execute("""CREATE TABLE assets (message_id INTEGER PRIMARY KEY,
   sha256 TEXT NOT NULL, original_topic TEXT NOT NULL,
   source_caption TEXT NOT NULL, source_album TEXT NOT NULL,
   source_relative TEXT NOT NULL)""")
  for mid,topic in [(101,"Abe3D"),(102,"Other Studio"),(103,"Abe3D")]:
   img=files/("msg_%d.jpg"%mid)
   img.write_bytes(("synthetic-%s"%mid).encode())
   sha=hashlib.sha256(img.read_bytes()).hexdigest()
   conn.execute("INSERT INTO assets VALUES (?,?,?,?,?,?)",
    (mid,sha,topic,"","",img.name))
 names.process_batch(db,50)
 assert names.official_sources("Abe3D") and names.official_sources("Abe3D")[0]["provider"]=="cults3d"
 url="https://cults3d.com/en/3d-model/art/rogue-abe3d-3"
 result=names.suggest_name_from_studio_catalog(db,101,"Rogue","Abe3D",
    url,"Abe3D","X-Men",evidence_note="Local test candidate")
 assert result["ok"] and result["status"]=="provavel",result
 assert not names.suggest_name_from_studio_catalog(db,101,"Rogue","Abe3D",url,"Abe3D")["ok"]
 for invalid,topic,who in [
    ("http://cults3d.com/test","Abe3D",101),
    ("https://malicious.example/test","Abe3D",101),
    (url,"Abe3D",102)]:
  try:names.suggest_name_from_studio_catalog(db,who,"Rogue","Abe3D",invalid,topic)
  except ValueError:pass
  else:raise AssertionError("Invalid source/topic accepted")
 with closing(names.smart.db_open(db)) as c, c:
  c.execute("UPDATE assets SET source_caption=? WHERE message_id=101",("captions updated by Telegram",))
 names.process_batch(db,50)
 with closing(names.smart.db_open(db)) as c, c:
  row=c.execute("SELECT title,status,evidence_type,official_url FROM name_proposals WHERE message_id=101").fetchone()
 assert (row["title"],row["status"],row["evidence_type"],row["official_url"])==(
    "Rogue","provavel","studio_catalog_visual_candidate",url),dict(row)
 with closing(names.smart.db_open(db)) as c, c:
  manual_revision=c.execute("SELECT revision FROM name_proposals WHERE message_id=103").fetchone()[0]
 names.review_name(db,103,manual_revision,"Manual Work","Abe3D","","","revisar")
 with closing(names.smart.db_open(db)) as c, c:
  c.execute("UPDATE assets SET source_caption=? WHERE message_id=103",
            ("▪️ Other Model - Marvel\\n▫️ Estúdio: Abe3D".replace("\\n","\n"),))
 names.process_batch(db,50)
 with closing(names.smart.db_open(db)) as c, c:
  row=c.execute("SELECT title,status FROM name_proposals WHERE message_id=103").fetchone()
 assert row["title"]=="Manual Work" and row["status"]=="revisar",dict(row)
 assert names.stats(db)["names_confirmed"]==0
 assert names.materialize_confirmed(db,files,root)["approved_images"]==0
 print("TESTE CATÁLOGO OFICIAL APROVADO: HTTPS, estúdio, idempotência, revisão manual e originais",flush=True)
