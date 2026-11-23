"""Atomic gallery identity: full SHA/CAS and no commercial approval."""
import sqlite3,hashlib,json,tempfile,threading,http.client
from pathlib import Path
from contextlib import closing
from http.server import ThreadingHTTPServer
from PIL import Image
import name_curadoria as naming
import smart_curadoria as smart
import tonart_curadoria as host

KEY="c"*24
OFFICIAL="https://www.patreon.com/3dWicked/posts/october-term-114959090"
NOTE=("Wicked October 2024 official post names Creature from the Black Lagoon bust. "
      "Each gallery photograph shows the same Gill-man face, gills and sculpt "
      "pedestal in different views. Correct old title of to from; this "
      "evidence confirms the editorial identity only, never license or STL.")

def fixture(folder):
    media=folder/"media";media.mkdir()
    db=folder/"db.sqlite3"
    with closing(smart.db_open(db)) as c:
        c.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
          sha256 TEXT,source_relative TEXT,original_topic TEXT,
          source_caption TEXT,source_album TEXT)""")
        smart.setup(c);naming.setup(c)
        c.execute("""INSERT INTO model_groups
          (group_key,studio,title,universe,variant,state,revision,created_at,updated_at)
          VALUES(?,'Wicked','Creature of the Black Lagoon',
          'Creature from the Black Lagoon','Busto','provavel',2,'t','t')""",(KEY,))
        c.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
          VALUES(?,'visual_gallery_audited','physical audit','t')""",(KEY,))
        for mid in (101,102):
            file=media/(str(mid)+".png")
            Image.new("RGB",(71+mid%4,73),"#435c68").save(file)
            sha=hashlib.sha256(file.read_bytes()).hexdigest()
            c.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
              (mid,sha,file.name,"Wicked","","album"))
            c.execute("""INSERT INTO name_proposals
              (message_id,studio,title,universe,variant,filename,status,
               source_fingerprint,revision,notes,modified_at)
              VALUES(?,'Wicked','Creature of the Black Lagoon',
               'Creature from the Black Lagoon','Busto',?,'provavel',
               'fingerprint',0,'older label','t')""",(mid,file.name))
            c.execute("""INSERT INTO model_group_members
              (message_id,group_key,match_reason,updated_at)
              VALUES(?,?,'telegram_album','t')""",(mid,KEY))
        c.commit()
    return db,media

def req(db,**kwargs):
    info=naming.gallery_identity_proof(db,KEY)
    payload=dict(group_key=KEY,group_revision=info["group"]["revision"],
      proofs=info["proofs"],title="Creature from the Black Lagoon",
      universe="Creature from the Black Lagoon",official_url=OFFICIAL,note=NOTE)
    payload.update(kwargs)
    return payload


with tempfile.TemporaryDirectory(prefix="gallery-identity-valid-") as t:
    db,media=fixture(Path(t));data=req(db)
    assert naming.gallery_identity_proof(db,KEY)["member_count"]==2
    def denied(**change):
        try:naming.confirm_reviewed_gallery(db,media,**req(db,**change))
        except (ValueError,RuntimeError):return
        raise AssertionError("unsafe confirmation accepted")
    denied(group_revision=1)
    denied(proofs=data["proofs"][:1])
    bad=[dict(x) for x in data["proofs"]]
    bad[0]["sha256"]="0"*64
    denied(proofs=bad)
    denied(official_url="http://not-a-real-official-source.example")
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT COUNT(*) FROM name_proposals WHERE status='confirmado'").fetchone()[0]==0
    result=naming.confirm_reviewed_gallery(db,media,**data)
    assert result["confirmed"]==2 and result["group_revision"]==3
    assert not result["rights_changed"] and not result["images_moved"]
    with closing(smart.db_open(db,readonly=True)) as c:
        g=c.execute("SELECT * FROM model_groups WHERE group_key=?",(KEY,)).fetchone()
        assert (g["title"],g["variant"],g["state"],g["revision"])==(
          "Creature from the Black Lagoon","Busto","provavel",3)
        rows=c.execute("SELECT * FROM name_proposals ORDER BY message_id").fetchall()
        assert all(x["status"]=="confirmado" and x["official_url"]==OFFICIAL for x in rows)
        assert all(x["title"]=="Creature from the Black Lagoon" for x in rows)
        assert c.execute("SELECT COUNT(*) FROM name_proposal_events WHERE event_type='gallery_official_identity_review'").fetchone()[0]==2
        assert c.execute("SELECT COUNT(*) FROM curation_events WHERE event_type='gallery_identity_verified_editorial'").fetchone()[0]==1
        assert c.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    denied()
with tempfile.TemporaryDirectory(prefix="gallery-identity-tamper-") as t:
    db,media=fixture(Path(t))
    (media/"102.png").write_bytes(b"bad")
    try:naming.confirm_reviewed_gallery(db,media,**req(db))
    except ValueError:pass
    else:raise AssertionError("tampered physical SHA accepted")
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT COUNT(*) FROM name_proposals WHERE status='confirmado'").fetchone()[0]==0
print("ATOMIC_GALLERY_DB_TEST_OK: CAS, all members, sha, official source, titles, events and rollback")

with tempfile.TemporaryDirectory(prefix="gallery-identity-http-") as t:
    db,media=fixture(Path(t))
    old=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=db;host.SOURCE=media;host.TOKEN="fixture-token"
    server=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    host.PORT=server.server_address[1]
    thr=threading.Thread(target=server.serve_forever,daemon=True)
    thr.start()
    try:
        def call(method,path,data=None,token=None):
            c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=14)
            heads={"Origin":f"http://127.0.0.1:{host.PORT}","Content-Type":"application/json"}
            if token is not None:heads["X-Tonart-Token"]=token
            c.request(method,path,json.dumps(data).encode() if data is not None else None,heads)
            r=c.getresponse();code=r.status;body=json.loads(r.read());c.close()
            return code,body
        ops=call("GET","/api/capabilities")[1]["operations"]
        assert any(x["id"]=="names.confirm_gallery_identity" for x in ops)
        status,proof=call("GET","/api/gallery-identity-proof?group_key="+KEY)
        assert status==200 and proof["member_count"]==2,(status,proof)
        data=req(db)
        assert call("POST","/api/confirm-gallery-identity",data,"wrong")[0]==403
        code,result=call("POST","/api/confirm-gallery-identity",data,"fixture-token")
        assert code==200 and result["confirmed"]==2,(code,result)
        assert call("POST","/api/confirm-gallery-identity",data,"fixture-token")[0] in (400,409)
        code,after=call("GET","/api/gallery-identity-proof?group_key="+KEY)
        assert code==200 and after["group"]["title"]=="Creature from the Black Lagoon"
        assert all(r["status"]=="confirmado" for r in after["members"])
        print("ATOMIC_GALLERY_HTTP_TEST_OK: auth, proof, CAS, update, replay blocked")
    finally:
        server.shutdown();server.server_close();thr.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=old
