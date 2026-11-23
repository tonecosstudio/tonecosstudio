"""Single-image canonical gallery only for verified editorial identities."""
import tempfile,sqlite3,hashlib,json,threading,http.client
from pathlib import Path
from contextlib import closing
from PIL import Image,ImageDraw
from http.server import ThreadingHTTPServer
import name_curadoria as names
import smart_curadoria as smart
import model_gallery as gallery
import tonart_curadoria as host

NOTE=("Esta fotografia KNULL/JULY TERM mostra a escultura única Wicked Knull e seu pedestal "
      "com braços e asas, sem outras vistas equivalentes no acervo comparado. "
      "O nome editorial já foi confirmado em fonte oficial, sem licença de STL.")

def prepare(folder,*,confirmed=True):
    source=folder/"media";source.mkdir()
    dbp=folder/"curadoria.sqlite3"
    img=Image.new("RGB",(74,73),"#16191e")
    ImageDraw.Draw(img).rectangle((9,11,52,68),fill="#ae3949")
    f=source/"msg_101.png";img.save(f)
    sha=hashlib.sha256(f.read_bytes()).hexdigest()
    with closing(smart.db_open(dbp)) as db:
        db.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
          sha256 TEXT,source_relative TEXT,original_topic TEXT,source_caption TEXT,source_album TEXT)""")
        smart.setup(db);names.setup(db)
        db.execute("INSERT INTO assets VALUES(101,?,?,'Wicked','','')",(sha,f.name))
        db.execute("""INSERT INTO name_proposals
          (message_id,studio,title,universe,variant,filename,status,
            official_url,revision,source_fingerprint,modified_at)
          VALUES(101,'Wicked','Knull','Marvel','',?,
           ?,?,2,'fingerprint','t')""",
           (f.name,"confirmado" if confirmed else "provavel",
            "https://www.patreon.com/3dWicked/posts/july-term-knull-54560911" if confirmed else ""))
        db.commit()
    return dbp,source,sha

def apply(db,source,sha,**overrides):
    args=dict(source_root=source,expected_sha256=sha,expected_revision=2)
    args.update(overrides)
    return gallery.register_visual_gallery(db,[101],"Wicked",NOTE,**args)

with tempfile.TemporaryDirectory(prefix="tonart-singleton-") as tmp:
    db,source,sha=prepare(Path(tmp))
    try:apply(db,source,sha,expected_revision=1)
    except RuntimeError:pass
    else:raise AssertionError("CAS missing")
    try:apply(db,source,sha,expected_sha256="0"*64)
    except ValueError:pass
    else:raise AssertionError("wrong SHA accepted")
    result=apply(db,source,sha)
    assert result["created"] and result["singleton"] and result["image_count"]==1
    assert not result["names_changed"] and not result["rights_changed"]
    assert apply(db,source,sha)["replayed"]
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT count(*) FROM model_groups").fetchone()[0]==1
        assert c.execute("SELECT count(*) FROM curation_events WHERE event_type='visual_singleton_reviewed'").fetchone()[0]==1
        assert c.execute("SELECT count(*) FROM curation_events WHERE event_type='visual_gallery_audited'").fetchone()[0]==1
        assert c.execute("SELECT state FROM model_groups").fetchone()[0]=="revisar"
        assert c.execute("SELECT status FROM name_proposals WHERE message_id=101").fetchone()[0]=="confirmado"
        assert c.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
with tempfile.TemporaryDirectory(prefix="tonart-singleton-unconfirmed-") as tmp:
    db,source,sha=prepare(Path(tmp),confirmed=False)
    try:apply(db,source,sha)
    except ValueError:pass
    else:raise AssertionError("unconfirmed singleton accepted")
with tempfile.TemporaryDirectory(prefix="tonart-singleton-tamper-") as tmp:
    db,source,sha=prepare(Path(tmp))
    (source/"msg_101.png").write_bytes(b"tampered")
    try:apply(db,source,sha)
    except ValueError:pass
    else:raise AssertionError("tamper accepted")
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==0
with tempfile.TemporaryDirectory(prefix="tonart-singleton-http-") as tmp:
    db,source,sha=prepare(Path(tmp))
    previous=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=db;host.SOURCE=source;host.TOKEN="fixture-token"
    server=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    host.PORT=server.server_address[1]
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        def call(method,path,data=None,token=None):
            c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=12)
            heads={"Origin":f"http://127.0.0.1:{host.PORT}","Content-Type":"application/json"}
            if token is not None:heads["X-Tonart-Token"]=token
            c.request(method,path,json.dumps(data).encode() if data is not None else None,heads)
            r=c.getresponse();status=r.status;body=json.loads(r.read());c.close()
            return status,body
        status,caps=call("GET","/api/capabilities")
        assert status==200 and any(x["id"]=="gallery.create" and x["min_images"]==1 for x in caps["operations"])
        req={"message_ids":[101],"topic":"Wicked","note":NOTE,"sha256":sha,"revision":2}
        assert call("POST","/api/create-gallery",req,"bad-token")[0]==403
        assert call("POST","/api/create-gallery",{**req,"sha256":"0"*64},"fixture-token")[0] in (400,422)
        status,res=call("POST","/api/create-gallery",req,"fixture-token")
        assert status==200 and res["image_count"]==1 and res["state"]=="revisar",(status,res)
        assert call("POST","/api/create-gallery",req,"fixture-token")[1]["replayed"]
        status,detail=call("GET","/api/model/"+res["group_key"])
        assert status==200 and len(detail["images"])==1
        print("SINGLETON GALLERY OK: physical SHA, confirmed editorial identity, HTTP auth, CAS, replay, no rights")
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=previous
