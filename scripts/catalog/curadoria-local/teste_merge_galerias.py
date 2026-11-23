"""Canonical visual cross-gallery merge — physical SHA, atomicity and locks."""
import tempfile,hashlib,sqlite3
from pathlib import Path
from contextlib import closing
import smart_curadoria as smart
import gallery_operations as gallery

NOTE="A mesma escultura: chapéu, óculos, varinha, braço, rosto e pedestal coincidem nas vistas frontal e aproximadas."
A="a"*24
B="b"*24

def prepare(folder,*,source_variant="Busto",source_audit=True):
    media=folder/"photos";media.mkdir()
    path=folder/"catalog.sqlite3"
    with closing(smart.db_open(path)) as db:
        db.executescript("""
        CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
         source_relative TEXT,original_topic TEXT,source_caption TEXT,source_album TEXT);
        CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,
         studio TEXT,title TEXT,universe TEXT,variant TEXT,status TEXT,revision INTEGER);
        """)
        smart.setup(db)
        for key in (A,B):
            db.execute("INSERT INTO model_groups(group_key,studio,title,universe,variant,state,created_at,updated_at) VALUES(?,?,?,?,?,'provavel','t','t')",
                       (key,"Wicked","Harry Potter","","Busto"))
        for mid,key in ((101,A),(102,B),(103,B)):
            binary=("original-image-"+str(mid)).encode()
            (media/f"{mid}.jpg").write_bytes(binary)
            sha=hashlib.sha256(binary).hexdigest()
            db.execute("INSERT INTO assets(message_id,sha256,source_relative,original_topic) VALUES(?,?,?,?)",(mid,sha,f"{mid}.jpg","Wicked"))
            db.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?)",
                       (mid,"Wicked","Harry Potter","",
                        source_variant if mid==103 else "Busto","provavel",0))
            db.execute("INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at) VALUES(?,?,'telegram_caption','t')",(mid,key))
        for key in (A,B):
            db.execute("INSERT INTO model_group_evidence VALUES(?,?,?,?,?)",
                (key,"https://t.me/"+key,"telegram","Evidence","t"))
        for key in (A,B) if source_audit else (A,):
            db.execute("INSERT INTO curation_events(group_key,event_type,detail,occurred_at) VALUES(?,'visual_gallery_audited','audit','t')",(key,))
        db.commit()
    with closing(smart.db_open(path,readonly=True)) as db:
        proofs=[{"message_id":x["message_id"],"sha256":x["sha256"]} for x in db.execute("SELECT message_id,sha256 FROM assets ORDER BY message_id")]
    return path,media,proofs

def attempt(path,media,sha_proofs,**kw):
    kwargs=dict(target=A,source=B,target_rev=0,source_rev=0,proofs=sha_proofs,note=NOTE,media_root=media)
    kwargs.update(kw)
    return gallery.merge_reviewed(path,**kwargs)

with tempfile.TemporaryDirectory(prefix="gallery-merge-") as temp:
    folder=Path(temp)
    path,media,proofs=prepare(folder)
    proposals=gallery.cross_gallery_candidates(path,"Wicked",limit=12)
    assert proposals["total"]==1 and proposals["read_only"] and not proposals["automatic_merge"]
    assert proposals["items"][0]["group_a"] in (A,B)
    try: attempt(path,media,proofs,source_rev=1)
    except RuntimeError:pass
    else:raise AssertionError("stale revision accepted")
    try: attempt(path,media,proofs,proofs=[{**p,"sha256":"0"*64} if p["message_id"]==103 else p for p in proofs])
    except ValueError:pass
    else:raise AssertionError("unverified sha accepted")
    with closing(smart.db_open(path,readonly=True)) as db:
        assert db.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==2
        assert db.execute("SELECT COUNT(*) FROM model_group_members WHERE group_key=?",(B,)).fetchone()[0]==2
    done=attempt(path,media,proofs)
    assert done["moved"]==2 and done["total_images"]==3 and not done["names_changed"],done
    assert gallery.merged_key(path,B)==A
    assert gallery.cross_gallery_candidates(path,"Wicked",limit=12)["total"]==0
    with closing(smart.db_open(path,readonly=True)) as db:
        assert db.execute("SELECT count(*) FROM model_groups").fetchone()[0]==1
        assert db.execute("SELECT revision FROM model_groups WHERE group_key=?",(A,)).fetchone()[0]==1
        assert [x[0] for x in db.execute("SELECT message_id FROM model_group_members WHERE group_key=? ORDER BY message_id",(A,))]==[101,102,103]
        assert db.execute("SELECT COUNT(*) FROM model_group_evidence WHERE group_key=?",(A,)).fetchone()[0]==2
        assert db.execute("SELECT COUNT(*) FROM curation_events WHERE group_key=? AND event_type='gallery_merged_into'",(B,)).fetchone()[0]==1
        assert db.execute("SELECT COUNT(*) FROM name_proposals WHERE status='provavel'").fetchone()[0]==3
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    try: attempt(path,media,proofs)
    except ValueError:pass
    else:raise AssertionError("replay wrote a second merge")
with tempfile.TemporaryDirectory(prefix="gallery-merge-mismatch-") as temp:
    path,media,proofs=prepare(Path(temp),source_variant="Unsupported")
    try:attempt(path,media,proofs)
    except ValueError:pass
    else:raise AssertionError("mixed variant accepted")
with tempfile.TemporaryDirectory(prefix="gallery-merge-noaudit-") as temp:
    path,media,proofs=prepare(Path(temp),source_audit=False)
    try:attempt(path,media,proofs)
    except ValueError:pass
    else:raise AssertionError("unreviewed gallery accepted")
with tempfile.TemporaryDirectory(prefix="gallery-reject-") as temp:
    path,media,proofs=prepare(Path(temp))
    assert gallery.cross_gallery_candidates(path,"Wicked",limit=12)["total"]==1
    decision=gallery.reject_pair(path,group_a=A,group_b=B,
        revision_a=0,revision_b=0,note="São duas esculturas diferentes: uma tem os pés e espada na base enquanto outra está sentada, com fundo e braços distintos.")
    assert decision["recorded"]
    assert gallery.cross_gallery_candidates(path,"Wicked",limit=12)["total"]==0
    assert gallery.reject_pair(path,group_a=B,group_b=A,
        revision_a=0,revision_b=0,note="São duas esculturas diferentes, uma tem base triangular, outra base redonda, poses e armas diferentes.")["already_reviewed"]
    with closing(smart.db_open(path,readonly=True)) as db:
        assert db.execute("SELECT count(*) FROM model_groups").fetchone()[0]==2
        assert db.execute("SELECT count(*) FROM curation_events WHERE event_type='gallery_pair_distinct_sculptures'").fetchone()[0]==1
    try:gallery.reject_pair(path,group_a=A,group_b=B,revision_a=1,revision_b=0,
        note="São duas esculturas diferentes, há mudança na base, na pose e nos acessórios usados.")
    except RuntimeError:pass
    else:raise AssertionError("stale reject accepted")
import threading,http.client,json
from http.server import ThreadingHTTPServer
import tonart_curadoria as host
with tempfile.TemporaryDirectory(prefix="gallery-merge-http-") as temp:
    path,media,proofs=prepare(Path(temp))
    original=(host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN)
    host.DB_PATH=path;host.SOURCE=media;host.TOKEN="fixture-token"
    srv=ThreadingHTTPServer(("127.0.0.1",0),host.Handler)
    host.PORT=srv.server_address[1]
    thread=threading.Thread(target=srv.serve_forever,daemon=True);thread.start()
    try:
        c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=8)
        c.request("GET","/api/capabilities")
        z=c.getresponse()
        caps=json.loads(z.read())
        assert z.status==200 and any(v["id"]=="gallery.merge_reviewed" for v in caps["operations"])
        assert any(v["id"]=="gallery.cross_gallery_candidates" for v in caps["operations"])
        c.close()
        c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=8)
        c.request("GET","/api/gallery-merge-candidates?studio=Wicked&limit=12")
        z=c.getresponse();candidates=json.loads(z.read());c.close()
        assert z.status==200 and candidates["total"]==1
        body=json.dumps(dict(target=A,source=B,target_rev=0,source_rev=0,
                             proofs=proofs,note=NOTE)).encode()
        def send(token):
            conn=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=8)
            conn.request("POST","/api/merge-reviewed-galleries",body,
                {"Origin":f"http://127.0.0.1:{host.PORT}","X-Tonart-Token":token,
                 "Content-Type":"application/json"})
            reply=conn.getresponse()
            result=(reply.status,json.loads(reply.read()))
            conn.close()
            return result
        assert send("wrong")[0]==403
        status,result=send("fixture-token")
        assert status==200 and result["moved"]==2 and result["total_images"]==3,(status,result)
        c=http.client.HTTPConnection("127.0.0.1",host.PORT,timeout=8)
        c.request("GET","/api/model/"+B)
        answer=c.getresponse();detail=json.loads(answer.read());c.close()
        assert answer.status==200 and detail["group_key"]==A
        assert len(detail["images"])==3
        assert send("fixture-token")[0]==400
        print("HTTP MERGE GALLERY PASSED: capabilities, auth, atomic POST, old URL, replay denied")
    finally:
        srv.shutdown();srv.server_close();thread.join(timeout=3)
        host.DB_PATH,host.SOURCE,host.PORT,host.TOKEN=original

print("TESTES MERGE GALERIAS APROVADOS: valid, stale, SHA, variant, audit, replay, audit links")
