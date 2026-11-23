"""Studio-scoped visual fingerprint scan; physical SHA fail closed and HTTP authorization."""
import tempfile,sqlite3,hashlib,json,http.client,threading
from pathlib import Path
from contextlib import closing
from http.server import ThreadingHTTPServer
from PIL import Image,ImageDraw
import smart_curadoria as smart
import visual_name_suggestions as visual
import name_curadoria as names
import tonart_curadoria as host

with tempfile.TemporaryDirectory(prefix="tonart-studio-fingerprints-") as tmp:
    root=Path(tmp);media=root/"media";media.mkdir()
    db=root/"db.sqlite3"
    with closing(smart.db_open(db)) as c:
        c.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
         sha256 TEXT,source_relative TEXT, original_topic TEXT,
         source_caption TEXT, source_album TEXT)""")
        names.setup(c);visual.setup(c)
        for mid,studio in ((101,"Wicked"),(102,"Wicked"),(103,"Another")):
            img=Image.new("RGB",(64,64),"white")
            ImageDraw.Draw(img).rectangle((3+mid%10,8,50,60),fill="black")
            f=media/(str(mid)+".png");img.save(f)
            sha=hashlib.sha256(f.read_bytes()).hexdigest()
            c.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                      (mid,sha,f.name,studio,studio,""))
            c.execute("""INSERT INTO name_proposals(
                 message_id,studio,title,universe,variant,filename,status,
                 source_fingerprint,modified_at) VALUES(?,?,?,?,?,?,'provavel','fingerprint','t')""",
                 (mid,studio,"Sculpture","Test","Full Size",f.name))
        c.commit()
    before=visual.studio_coverage(db,"Wicked")
    assert before["total"]==2 and before["valid"]==0 and before["missing"]==2
    report=visual.scan(db,media,limit=12,studio="Wicked",verify_sha=True)
    assert report["completed"]==2 and report["physical_sha_verified"]
    now=visual.studio_coverage(db,"Wicked")
    assert now["complete"] and now["valid"]==2 and now["missing"]==0
    assert visual.studio_coverage(db,"Another")["valid"]==0
    assert visual.scan(db,media,limit=12,studio="Wicked",verify_sha=True)["pending"]==0
    assert visual.studio_coverage(db,"Wicked")["complete"]
    with closing(smart.db_open(db)) as c:
        c.execute("DELETE FROM visual_fingerprints WHERE message_id=102");c.commit()
    (media/"102.png").write_bytes(b"tampered!")
    try:visual.scan(db,media,limit=12,studio="Wicked",verify_sha=True)
    except ValueError:pass
    else:raise AssertionError("tampered source accepted")
    assert visual.studio_coverage(db,"Wicked")["valid"]==1
    with closing(smart.db_open(db)) as c:
        assert c.execute("SELECT count(*) FROM visual_fingerprints WHERE message_id=102").fetchone()[0]==0
    # Fresh fixture for HTTP route; physical bytes restored via identical source.
    img=Image.new("RGB",(64,64),"white")
    ImageDraw.Draw(img).rectangle((5,8,50,60),fill="black")
    img.save(media/"102.png")
    with closing(smart.db_open(db)) as c:
        sha=hashlib.sha256((media/"102.png").read_bytes()).hexdigest()
        c.execute("UPDATE assets SET sha256=? WHERE message_id=102",(sha,));c.commit()
    current=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=db;host.SOURCE=media;host.TOKEN="test-token"
    server=ThreadingHTTPServer(("127.0.0.1",0),host.Handler);host.PORT=server.server_address[1]
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        def call(method,path,data=None,token=None):
            c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=15)
            headers={"Content-Type":"application/json","Origin":f"http://127.0.0.1:{host.PORT}"}
            if token is not None:headers["X-Tonart-Token"]=token
            c.request(method,path,json.dumps(data).encode() if data is not None else None,headers)
            response=c.getresponse();status=response.status;obj=json.loads(response.read());c.close()
            return status,obj
        status,caps=call("GET","/api/capabilities")
        assert status==200 and any(x["id"]=="visual.fingerprints.scan_studio" for x in caps["operations"])
        assert call("GET","/api/visual-fingerprint-coverage?studio=Wicked")[1]["valid"]==1
        assert call("POST","/api/scan-studio-fingerprints",dict(studio="Wicked",limit=12),"bad")[0]==403
        assert call("POST","/api/scan-studio-fingerprints",dict(studio="Wicked",limit=129),"test-token")[0] in (400,422)
        status,result=call("POST","/api/scan-studio-fingerprints",dict(studio="Wicked",limit=12),"test-token")
        assert status==200 and result["scan"]["completed"]==1,(status,result)
        assert result["after"]["valid"]==2 and not result["identities_approved"]
        assert call("GET","/api/visual-fingerprint-coverage?studio=Another")[1]["valid"]==0
        with closing(smart.db_open(db,readonly=True)) as c:
            assert c.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
        print("TESTES FINGERPRINT STUDIO OK: SHA físico, alvo, idempotência, invalidação, HTTP token, limites")
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=current
