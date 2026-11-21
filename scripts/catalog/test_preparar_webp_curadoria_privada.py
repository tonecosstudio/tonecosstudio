#!/usr/bin/env python3
import hashlib,importlib.util,sqlite3,tempfile
from pathlib import Path
file=Path(__file__).with_name("preparar-webp-curadoria-privada.py")
spec=importlib.util.spec_from_file_location("webp_private",file)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix="tonart-private-webp-") as tmp:
    root=Path(tmp)
    source=root/"source"
    source.mkdir()
    db=root/"curadoria.sqlite3"
    conn=sqlite3.connect(db)
    conn.executescript("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,source_relative TEXT,original_topic TEXT);
      CREATE TABLE annotations(message_id INTEGER PRIMARY KEY,status TEXT);
      CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,studio TEXT,title TEXT,universe TEXT,variant TEXT,status TEXT,confidence REAL);""")
    for mid,rel,status in ((1,"SaltSculpt/msg_1.jpg","provavel"),(2,"../secret.jpg","provavel"),(3,"Studio/msg_3.jpg","revisar"),(4,"Studio/msg_4.jpg","confirmado")):
        data=f"sample-{mid}".encode()
        sha=hashlib.sha256(data).hexdigest()
        if mid != 2:
            p=source/rel
            p.parent.mkdir(parents=True,exist_ok=True)
            p.write_bytes(data)
        conn.execute("INSERT INTO assets VALUES(?,?,?,?)",(mid,sha,rel,"Sample Studio"))
        conn.execute("INSERT INTO annotations VALUES(?,?)",(mid,"pendente"))
        conn.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?)",(mid,"Sample Studio","Model A","","",status,.82))
    conn.commit();conn.close()
    rows,errors=module.read_candidates(db,source,10)
    assert [r["message_id"] for r in rows]==[1,4],rows
    assert [e[0] for e in errors]==[2]
    assert all(r["status"]=="prepared_private" and r["private_staging_only"] for r in rows)
    assert all(r["notes"]=="PRIVATE_NOT_APPROVED_FOR_PUBLICATION" for r in rows)
print("TESTE APROVADO: apenas nomeados, hash validado, traversal rejeitado, sem conversao ou upload")
