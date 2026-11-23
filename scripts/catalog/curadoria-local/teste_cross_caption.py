"""E2E cross-title identical render correction, same canonical SQLite."""
import tempfile,sqlite3,hashlib,json
from pathlib import Path
from contextlib import closing
from PIL import Image,ImageDraw,PngImagePlugin
import smart_curadoria as smart
import name_curadoria as names
import visual_name_suggestions as v
import gallery_operations as g

A="a"*24;B="b"*24
NOTE=("O render da ficha B é visualmente idêntico ao Professor Xavier da ficha A, "
      "com o mesmo rosto, cadeira e mãos. A legenda B dizia One Piece, mas "
      "a referência A e o próprio render indicam Marvel. Preservar variantes.")

def make(folder):
    media=folder/"media";media.mkdir()
    dbp=folder/"db.sqlite3"
    with closing(smart.db_open(dbp)) as db:
        db.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
            sha256 TEXT,source_relative TEXT,original_topic TEXT,
            source_caption TEXT,source_album TEXT)""")
        smart.setup(db);names.setup(db);v.setup(db)
        for key,title,universe,variant in ((A,"Professor Xavier","Marvel","Full Size + Unsupported"),
                                           (B,"Xavier","One Piece","Full Size")):
            db.execute("""INSERT INTO model_groups(group_key,studio,title,universe,variant,state,created_at,updated_at)
                VALUES(?,?,?,?,?,'provavel','t','t')""",(key,"Wicked",title,universe,variant))
            db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
                VALUES(?,'visual_gallery_audited','visual OK','t')""",(key,))
        for mid,key,title,universe,variant in ((101,A,"Professor Xavier","Marvel","Full Size + Unsupported"),
                                               (102,B,"Xavier","One Piece","Full Size")):
            img=Image.new("RGB",(128,96),"#181b22")
            d=ImageDraw.Draw(img);d.ellipse((30,9,102,80),fill="#ada7a0")
            d.rectangle((0,70,128,96),fill="#4b5367")
            meta=PngImagePlugin.PngInfo();meta.add_text("message",str(mid))
            path=media/(str(mid)+".png");img.save(path,pnginfo=meta)
            sha=hashlib.sha256(path.read_bytes()).hexdigest()
            db.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                (mid,sha,path.name,"Wicked",f"Telegram {title} - {universe}",""))
            db.execute("""INSERT INTO name_proposals
                (message_id,studio,title,universe,variant,filename,status,confidence,
                 evidence_type,source_fingerprint,notes,modified_at)
                VALUES(?,?,?,?,?,?,'provavel',0.7,'telegram','fingerprint','','t')""",
                (mid,"Wicked",title,universe,variant,str(mid)+".png"))
            db.execute("""INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at)
                VALUES(?,?,'telegram_caption','t')""",(mid,key))
            dh,ah,w,h=v.fingerprint(path)
            db.execute("""INSERT INTO visual_fingerprints
                (message_id,source_sha,method,dhash,ahash,width,height,error,analyzed_at)
                VALUES(?,?,?,?,?,?,?,'','t')""",(mid,sha,v.POLICY,dh,ah,w,h))
        db.commit()
    return dbp,media

def apply(db,media,**kwargs):
    params=dict(target_key=B,reference_key=A,target_rev=0,reference_rev=0,
                target_mid=102,reference_mid=101,note=NOTE)
    params.update(kwargs)
    return g.correct_cross_caption(db,media,**params)

with tempfile.TemporaryDirectory(prefix="visual-cross-caption-") as temp:
    db,media=make(Path(temp))
    candidates=g.cross_caption_visual_candidates(db,media,"Wicked",12)
    assert candidates["total"]==1 and candidates["items"][0]["pixel_mae"]==0
    try:apply(db,media,target_rev=3)
    except RuntimeError:pass
    else:raise AssertionError("CAS bypassed")
    assert g.related_sculpture_galleries(db,A)==[]
    result=apply(db,media)
    assert result["title"]=="Professor Xavier" and result["universe"]=="Marvel"
    assert not result["groups_merged"] and not result["rights_changed"]
    related=g.related_sculpture_galleries(db,A)
    assert len(related)==1 and related[0]["group_key"]==B and related[0]["variant"]=="Full Size"
    assert g.cross_caption_visual_candidates(db,media,"Wicked",12)["total"]==0
    with closing(smart.db_open(db,readonly=True)) as c:
        p=c.execute("SELECT * FROM name_proposals WHERE message_id=102").fetchone()
        a=c.execute("SELECT * FROM model_groups WHERE group_key=?",(B,)).fetchone()
        assert (p["title"],p["universe"],p["status"],p["revision"])==("Professor Xavier","Marvel","revisar",1)
        assert (a["title"],a["universe"],a["variant"],a["state"],a["revision"])==("Professor Xavier","Marvel","Full Size","revisar",1)
        assert c.execute("SELECT count(*) FROM model_groups").fetchone()[0]==2
        assert c.execute("SELECT count(*) FROM curation_events WHERE event_type='gallery_same_sculpture_variant_link'").fetchone()[0]==2
        assert c.execute("SELECT count(*) FROM name_proposal_events WHERE event_type='visual_cross_caption_correction'").fetchone()[0]==1
        assert c.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    try:apply(db,media)
    except (RuntimeError,ValueError):pass
    else:raise AssertionError("replayed correction")
with tempfile.TemporaryDirectory(prefix="visual-cross-hash-") as temp:
    db,media=make(Path(temp))
    (media/"102.png").write_bytes(b"tampered")
    try:apply(db,media)
    except ValueError:pass
    else:raise AssertionError("physical tampering accepted")
    with closing(smart.db_open(db,readonly=True)) as c:
        assert c.execute("SELECT title FROM name_proposals WHERE message_id=102").fetchone()[0]=="Xavier"
import threading,http.client
from http.server import ThreadingHTTPServer
import tonart_curadoria as host
with tempfile.TemporaryDirectory(prefix="visual-cross-http-") as temp:
    db,media=make(Path(temp))
    old=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=db;host.SOURCE=media;host.TOKEN="fixture-token"
    srv=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    host.PORT=srv.server_address[1]
    th=threading.Thread(target=srv.serve_forever,daemon=True);th.start()
    try:
        def request(method,path,data=None,token=None):
            conn=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=12)
            headers={"Origin":f"http://127.0.0.1:{host.PORT}","Content-Type":"application/json"}
            if token is not None:headers["X-Tonart-Token"]=token
            conn.request(method,path,json.dumps(data).encode() if data else None,headers)
            response=conn.getresponse()
            status=response.status
            payload=json.loads(response.read())
            conn.close()
            return status,payload
        status,cap=request("GET","/api/capabilities")
        assert status==200
        assert any(x["id"]=="gallery.cross_caption_visual_candidates" for x in cap["operations"])
        assert any(x["id"]=="gallery.correct_cross_caption" for x in cap["operations"])
        status,candidates=request("GET","/api/gallery-visual-cross-caption?studio=Wicked&limit=12")
        assert status==200 and candidates["total"]==1
        data=dict(target_key=B,reference_key=A,target_rev=0,reference_rev=0,
                  target_mid=102,reference_mid=101,note=NOTE)
        assert request("POST","/api/correct-gallery-caption",data,"wrong")[0]==403
        status,result=request("POST","/api/correct-gallery-caption",data,"fixture-token")
        assert status==200 and result["corrected_message_id"]==102,(status,result)
        status,detail=request("GET","/api/model/"+B)
        assert status==200 and detail["title"]=="Professor Xavier"
        assert detail["universe"]=="Marvel" and detail["variant"]=="Full Size"
        assert len(detail["related_galleries"])==1
        assert detail["related_galleries"][0]["group_key"]==A
        replay_status,_=request("POST","/api/correct-gallery-caption",data,"fixture-token")
        assert replay_status in (400,409),("replay accepted",replay_status)
        print("HTTP CROSS CAPTION OK: capabilities, read candidate, auth, correction, related variants, CAS")
    finally:
        srv.shutdown();srv.server_close();th.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=old

print("CROSS CAPTION TESTS OK: candidates, CAS, sha, corrected identity, variant relation, replay, no commerce")
