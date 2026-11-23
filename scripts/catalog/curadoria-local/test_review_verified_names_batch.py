"""Offline contract tests for the canonical Curadoria HTTP batch client."""
import importlib.util
import json
import pathlib
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "name_review_client", HERE / "review_verified_names_batch.py",
)
cli = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cli)


class NameBatchTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = pathlib.Path(tmp.name)
        self.media = self.path / "media"
        self.media.mkdir()
        (self.media / "Studio").mkdir()
        self.photo = self.media / "Studio" / "msg_1234.jpg"
        self.photo.write_bytes(b"fake original image test bytes")
        self.sha = cli.sha256_file(self.photo)
        self.sqlite = self.path / "db.sqlite3"
        con = sqlite3.connect(self.sqlite)
        con.executescript("""
          CREATE TABLE model_groups (
             group_key TEXT PRIMARY KEY, title TEXT,studio TEXT,
             state TEXT,revision INTEGER,universe TEXT DEFAULT '',variant TEXT DEFAULT ''
          );
          CREATE TABLE model_group_members (group_key TEXT, message_id INTEGER);
          CREATE TABLE assets(
             message_id INTEGER PRIMARY KEY, sha256 TEXT,source_relative TEXT,original_topic TEXT
          );
          CREATE TABLE name_proposals(
             message_id INTEGER PRIMARY KEY,title TEXT,studio TEXT,
             universe TEXT,variant TEXT,status TEXT,revision INTEGER,
             official_url TEXT
          );
          CREATE TABLE curation_events(
             event_id INTEGER PRIMARY KEY,group_key TEXT,event_type TEXT
          );
        """)
        self.key = "a" * 24
        con.execute("INSERT INTO model_groups(group_key,title,studio,state,revision,universe,variant) VALUES(?,?,?,?,?,?,?)",
                    (self.key, "Pikachu", "Studio", "provavel", 0, "Pokémon", ""))
        con.execute("INSERT INTO model_group_members VALUES(?,?)",
                    (self.key, 1234))
        con.execute("INSERT INTO assets VALUES(?,?,?,?)",
                    (1234, self.sha, "Studio/msg_1234.jpg","Studio"))
        con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?)",
                    (1234,"Pikachu","Studio","Pokémon","","provavel",0,""))
        con.commit()
        con.close()
        self.record = {
            "message_id": 1234, "title": "Pikachu", "studio": "Studio",
            "universe": "Pokémon", "source_sha256": self.sha,
            "official_url": "https://www.pokemon.com/us/pokedex/0025",
            "visual_evidence_note": "Prancha original validada",
        }
        self.plan = self.path / "plan.jsonl"
        self.plan.write_text(json.dumps(self.record) + "\n", encoding="utf8")

    def setup_multifoto(self):
        conn=sqlite3.connect(self.sqlite)
        conn.execute("INSERT INTO curation_events(group_key,event_type) VALUES(?,?)",
                     (self.key,"visual_gallery_audited"))
        for mid in (1235,1236):
            p=self.media/"Studio"/f"msg_{mid}.jpg"
            p.write_bytes(f"physical-media-{mid}".encode("ascii"))
            conn.execute("INSERT INTO model_group_members VALUES(?,?)",(self.key,mid))
            conn.execute("INSERT INTO assets VALUES(?,?,?,?)",
                         (mid,cli.sha256_file(p),f"Studio/msg_{mid}.jpg","Studio"))
            conn.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?)",
                         (mid,"Pikachu","Studio","Pokémon","","provavel",0,""))
        conn.commit()
        conn.close()
        official=self.record["official_url"]
        self.gallery_proof={
            "group_key":self.key,"studio":"Studio","title":"Pikachu",
            "universe":"Pokémon","official_url":official,
            "visual_evidence_note":"Galeria completa verificada visualmente; escultura e variante únicas"
        }
        return self.gallery_proof

    def test_multifoto_expands_one_gallery_into_three_physical_proofs(self):
        proof=self.setup_multifoto()
        path=self.path/"gallery-proof.jsonl"
        path.write_text(json.dumps(proof)+"\n",encoding="utf8")
        with cli.connect_sqlite(self.sqlite) as db:
            with patch("name_curadoria.official_sources",
                       return_value=[{"url":"https://www.pokemon.com/creator",
                                      "studio":"Studio"}]):
                rows=cli.expand_gallery_proofs(db,cli.load_gallery_proofs(path))
            self.assertEqual([r["message_id"] for r in rows],[1234,1235,1236])
            calls=[]
            def live(url):
                calls.append(url)
                return {"title":"Pikachu","revision":0,
                        "images":[{"message_id":x} for x in (1234,1235,1236)]}
            verified=cli.preflight(db,rows,self.media,live_model=live)
            self.assertEqual(len(verified),3)
            self.assertEqual(len(calls),1,"one host GET per gallery")
            with self.assertRaisesRegex(ValueError,"full multifoto"):
                cli.preflight(db,rows[:-1],self.media,live_model=live)
            rows[1]["official_url"]="https://some.other/source"
            with self.assertRaisesRegex(ValueError,"conflicting official"):
                cli.preflight(db,rows,self.media,live_model=live)

    def test_gallery_batch_rejects_unreviewed_or_mismatched_version(self):
        proof=self.setup_multifoto()
        with cli.connect_sqlite(self.sqlite) as db:
            with patch("name_curadoria.official_sources",
                       return_value=[{"url":"https://www.pokemon.com/creator","studio":"Studio"}]):
                rows=cli.expand_gallery_proofs(db,[proof])
                self.assertEqual(len(rows),3)
        conn=sqlite3.connect(self.sqlite)
        conn.execute("DELETE FROM curation_events")
        conn.commit();conn.close()
        with cli.connect_sqlite(self.sqlite) as db:
            with patch("name_curadoria.official_sources",
                       return_value=[{"url":"https://www.pokemon.com/creator","studio":"Studio"}]):
                with self.assertRaisesRegex(ValueError,"full visual audit"):
                    cli.expand_gallery_proofs(db,[proof])
        conn=sqlite3.connect(self.sqlite)
        conn.execute("INSERT INTO curation_events(group_key,event_type) VALUES(?,?)",
                     (self.key,"visual_gallery_audited"))
        conn.execute("UPDATE name_proposals SET variant='Pre-Supported' WHERE message_id=1235")
        conn.commit();conn.close()
        with cli.connect_sqlite(self.sqlite) as db:
            with patch("name_curadoria.official_sources",
                       return_value=[{"url":"https://www.pokemon.com/creator","studio":"Studio"}]):
                with self.assertRaisesRegex(ValueError,"variant/title conflict"):
                    cli.expand_gallery_proofs(db,[proof])

    def test_multifoto_batch_write_and_safe_resume(self):
        proof=self.setup_multifoto()
        writes=[]
        with cli.connect_sqlite(self.sqlite) as db:
            with patch("name_curadoria.official_sources",
                       return_value=[{"url":"https://www.pokemon.com/creator","studio":"Studio"}]):
                rows=cli.expand_gallery_proofs(db,[proof])
            def snapshot(_):
                return {"title":"Pikachu","revision":0,
                        "images":[{"message_id":x} for x in (1234,1235,1236)]}
            verified=cli.preflight(db,rows,self.media,live_model=snapshot)
            def send(_,*,payload,token):
                assert token=="secret"
                from contextlib import closing
                with closing(sqlite3.connect(self.sqlite)) as w:
                    with w:
                        updated=w.execute("""UPDATE name_proposals SET
                           status='confirmado',revision=revision+1,official_url=?
                           WHERE message_id=? AND revision=?""",
                          (payload["official_url"],payload["message_id"],payload["revision"]))
                        assert updated.rowcount==1
                writes.append(payload["message_id"])
                return {"ok":True,"revision":payload["revision"]+1}
            done=cli.execute(db,verified,"a"*64,self.path/"multi-apply.json",
                             apply=True,send=send,token_reader=lambda:"secret")
            self.assertEqual(done["applied"],3)
            self.assertEqual(writes,[1234,1235,1236])
            verified=cli.preflight(db,rows,self.media,live_model=snapshot)
            resumed=cli.execute(db,verified,"a"*64,self.path/"multi-resume.json",
                                apply=True,send=lambda *a,**kw:self.fail("reposted"),
                                token_reader=lambda:self.fail("unneeded token"))
            self.assertEqual(resumed["already_confirmed"],3)
            self.assertEqual(resumed["applied"],0)
            self.assertFalse(resumed["publication_rights_changed"])

    def test_windows_audit_replace_lock_retries_only_the_file_write(self):
        destination=self.path/"audit-locked.json"
        real_replace=pathlib.Path.replace
        calls=[]
        def flaky_replace(path,target):
            calls.append(str(target))
            if len(calls)<=2:
                raise PermissionError("simulated antivirus file lock")
            return real_replace(path,target)
        with patch.object(pathlib.Path,"replace",flaky_replace):
            cli.atomic_json(destination,{"result":"durable"})
        self.assertEqual(len(calls),3)
        self.assertEqual(json.loads(destination.read_text("utf8")),
                         {"result":"durable"})

    def test_strict_private_plan_prevents_duplicate_invalid_or_http_links(self):
        self.assertEqual(cli.load_plan(self.plan), [self.record])
        self.plan.write_text(
            json.dumps(self.record)+"\n"+json.dumps(self.record)+"\n",
            encoding="utf8",
        )
        with self.assertRaisesRegex(ValueError,"duplicate"):
            cli.load_plan(self.plan)
        bad = {**self.record,"official_url":"http://127.0.0.1:8769/api/review-name"}
        self.plan.write_text(json.dumps(bad)+"\n",encoding="utf8")
        with self.assertRaisesRegex(ValueError,"HTTPS"):
            cli.load_plan(self.plan)
        bad = {**self.record,"visual_evidence_note":""}
        self.plan.write_text(json.dumps(bad)+"\n",encoding="utf8")
        with self.assertRaisesRegex(ValueError,"blank"):
            cli.load_plan(self.plan)

    def test_preflight_joins_exact_group_and_original_image_checksum(self):
        with cli.connect_sqlite(self.sqlite) as db:
            result = cli.preflight(
                db,[self.record],self.media,
                live_model=lambda _: {
                    "title":"Pikachu","revision":0,
                    "images":[{"message_id":1234}],
                },
            )
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["group_key"],self.key)
        self.assertFalse(result[0]["already_confirmed"])
        self.assertEqual(result[0]["name_revision"],0)
        (self.media/"Studio"/"msg_1234.jpg").write_bytes(b"tamper")
        with cli.connect_sqlite(self.sqlite) as db:
            with self.assertRaisesRegex(ValueError,"SHA-256"):
                cli.preflight(db,[self.record],self.media,
                    live_model=lambda _: {
                      "title":"Pikachu","revision":0,
                      "images":[{"message_id":1234}]})

    def test_dry_run_does_not_open_write_token_or_mutate_sqlite(self):
        with cli.connect_sqlite(self.sqlite) as db:
            result = cli.preflight(db,[self.record],self.media,
                live_model=lambda _: {
                    "title":"Pikachu","revision":0,
                    "images":[{"message_id":1234}],
                })
            report=self.path/"audit.json"
            before=cli.sha256_file(self.sqlite)
            out=cli.execute(db,result,"1"*64,report,apply=False,
                token_reader=lambda: self.fail("unexpected write token"),
                send=lambda *args,**kwargs: self.fail("unexpected write"))
            self.assertEqual(cli.sha256_file(self.sqlite),before)
            self.assertEqual(out["applied"],0)
            self.assertEqual(out["items"][0]["result"],"pending")
            self.assertTrue(report.is_file())

    def test_api_apply_and_resume_skip_do_not_duplicate_changes(self):
        writable=sqlite3.connect(self.sqlite)
        def send(_,*,payload,token):
            self.assertEqual(token,"secret")
            assert payload["revision"]==0
            writable.execute(
                "UPDATE name_proposals SET status='confirmado',"
                "revision=revision+1,official_url=? WHERE message_id=?",
                (payload["official_url"],payload["message_id"]),
            )
            writable.commit()
            return {"ok":True,"revision":1}
        def snapshot(_):
            return {"title":"Pikachu","revision":0,
                    "images":[{"message_id":1234}]}
        try:
            with cli.connect_sqlite(self.sqlite) as db:
                verified=cli.preflight(db,[self.record],self.media,
                                       live_model=snapshot)
                out=cli.execute(db,verified,"2"*64,self.path/"apply.json",
                                apply=True,send=send,token_reader=lambda:"secret")
                self.assertEqual(out["applied"],1)
                self.assertEqual(out["public_tags_applied"],0)
                self.assertFalse(out["publication_rights_changed"])
            with cli.connect_sqlite(self.sqlite) as db:
                verified=cli.preflight(db,[self.record],self.media,
                                       live_model=snapshot)
                self.assertTrue(verified[0]["already_confirmed"])
                out=cli.execute(db,verified,"2"*64,self.path/"resumed.json",
                                apply=True,
                                token_reader=lambda:self.fail("token on resume"),
                                send=lambda *args,**kwargs:self.fail("replayed"))
                self.assertEqual(out["applied"],0)
                self.assertEqual(out["already_confirmed"],1)
        finally:
            writable.close()


if __name__=="__main__":
    unittest.main()
