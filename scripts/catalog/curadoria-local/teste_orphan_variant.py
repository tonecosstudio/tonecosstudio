"""Canonical single-photo variant: exact original SHA, no package/license merge."""
import tempfile,hashlib,sqlite3,json,threading,http.client
from pathlib import Path
from contextlib import closing
from http.server import ThreadingHTTPServer
from PIL import Image,ImageDraw
import name_curadoria as naming
import smart_curadoria as smart
import gallery_operations as gallery
import tonart_curadoria as host

REFERENCE="a"*24
NOTE=("A imagem promocional de Optimus Prime da versão Pre-Supported é byte por byte "
      "igual ao render da versão Unsupported, confirmado pelo SHA-256 físico de ambos "
      "os registros, mas os pacotes de preparação para impressão são variantes distintas.")

def prepare(folder,orphan_variant="Pre-Supported"):
    source=folder/"media";source.mkdir()
    dbp=folder/"curadoria.sqlite3"
    with closing(smart.db_open(dbp)) as db:
        db.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
            source_relative TEXT,original_topic TEXT,source_caption TEXT,source_album TEXT)""")
        smart.setup(db);naming.setup(db)
        pic=Image.new("RGB",(78,78),"#273444")
        ImageDraw.Draw(pic).rectangle((9,12,65,68),fill="#aa493e")
        for mid,variant in ((101,orphan_variant),(102,"Unsupported")):
            file=source/(str(mid)+".png");pic.save(file)
            sha=hashlib.sha256(file.read_bytes()).hexdigest()
            db.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                (mid,sha,file.name,"Wicked","Optimus Prime - Transformers",""))
            db.execute("""INSERT INTO name_proposals
                (message_id,studio,title,universe,variant,filename,status,
                 source_fingerprint,modified_at)
                 VALUES(?,'Wicked','Optimus Prime','Transformers',?,?,'provavel','fingerprint','t')""",
                 (mid,variant,file.name))
        db.execute("""INSERT INTO model_groups
            (group_key,studio,title,universe,variant,state,created_at,updated_at)
            VALUES(?,'Wicked','Optimus Prime','Transformers','Unsupported','provavel','t','t')""",
            (REFERENCE,))
        db.execute("""INSERT INTO model_group_members
            (message_id,group_key,match_reason,updated_at)
            VALUES(102,?,'telegram_caption','t')""",(REFERENCE,))
        db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
            VALUES(?,'visual_gallery_audited','visual audit','t')""",(REFERENCE,))
        db.commit()
    return dbp,source

def apply(db,source,**kw):
    args=dict(orphan_mid=101,orphan_revision=0,reference_key=REFERENCE,
         reference_revision=0,reference_mid=102,note=NOTE)
    args.update(kw)
    return gallery.relate_orphan_variant(db,source,**args)

with tempfile.TemporaryDirectory(prefix="tonart-variant-") as t:
    db,source=prepare(Path(t))
    try:apply(db,source,reference_revision=3)
    except RuntimeError:pass
    else:raise AssertionError("CAS bypassed")
    result=apply(db,source)
    assert result["images_added"]==1 and not result["names_approved"]
    assert not result["packages_merged"] and not result["rights_changed"]
    new_key=result["group_key"]
    assert apply(db,source)["already_linked"]
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==2
        assert c.execute("SELECT state FROM model_groups WHERE group_key=?",(new_key,)).fetchone()[0]=="revisar"
        assert c.execute("SELECT group_key FROM model_group_members WHERE message_id=101").fetchone()[0]==new_key
        assert c.execute("SELECT status FROM name_proposals WHERE message_id=101").fetchone()[0]=="provavel"
        assert c.execute("SELECT COUNT(*) FROM curation_events WHERE event_type='gallery_same_sculpture_variant_link'").fetchone()[0]==2
        assert c.execute("SELECT COUNT(*) FROM curation_events WHERE event_type='gallery_variant_singleton_linked'").fetchone()[0]==1
        assert c.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    assert gallery.related_sculpture_galleries(db,REFERENCE)[0]["group_key"]==new_key
with tempfile.TemporaryDirectory(prefix="tonart-variant-mismatch-") as t:
    db,source=prepare(Path(t),orphan_variant="Unsupported")
    try:apply(db,source)
    except ValueError:pass
    else:raise AssertionError("same variant duplicated")
with tempfile.TemporaryDirectory(prefix="tonart-variant-tamper-") as t:
    db,source=prepare(Path(t))
    (source/"101.png").write_bytes(b"tampered")
    try:apply(db,source)
    except ValueError:pass
    else:raise AssertionError("physical SHA mismatch accepted")
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==1
with tempfile.TemporaryDirectory(prefix="tonart-variant-http-") as t:
    db,source=prepare(Path(t))
    previous=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=db;host.SOURCE=source;host.TOKEN="fixture-token"
    server=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    host.PORT=server.server_address[1]
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        def call(method,path,data=None,token=None):
            c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=15)
            headers={"Origin":f"http://127.0.0.1:{host.PORT}","Content-Type":"application/json"}
            if token is not None:headers["X-Tonart-Token"]=token
            c.request(method,path,json.dumps(data).encode() if data else None,headers)
            r=c.getresponse();status=r.status;body=json.loads(r.read());c.close()
            return status,body
        cap=call("GET","/api/capabilities")[1]
        assert any(o["id"]=="gallery.relate_orphan_variant" for o in cap["operations"])
        req=dict(orphan_mid=101,orphan_revision=0,reference_key=REFERENCE,
          reference_revision=0,reference_mid=102,note=NOTE)
        assert call("POST","/api/relate-orphan-variant",req,"wrong")[0]==403
        status,body=call("POST","/api/relate-orphan-variant",req,"fixture-token")
        assert status==200 and body["images_added"]==1,(status,body)
        status,replay=call("POST","/api/relate-orphan-variant",req,"fixture-token")
        assert status==200 and replay["already_linked"]
        assert call("GET","/api/model/"+body["group_key"])[1]["related_galleries"][0]["group_key"]==REFERENCE
        print("E2E VARIANT LINK OK: atomic, physical SHA, CAS, no commerce, links, HTTP auth, replay")
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=previous
