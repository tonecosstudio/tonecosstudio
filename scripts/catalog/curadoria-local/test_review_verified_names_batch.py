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
             state TEXT,revision INTEGER
          );
          CREATE TABLE model_group_members (group_key TEXT, message_id INTEGER);
          CREATE TABLE assets(
             message_id INTEGER PRIMARY KEY, sha256 TEXT,source_relative TEXT
          );
          CREATE TABLE name_proposals(
             message_id INTEGER PRIMARY KEY,title TEXT,studio TEXT,
             universe TEXT,variant TEXT,status TEXT,revision INTEGER,
             official_url TEXT
          );
        """)
        self.key = "a" * 24
        con.execute("INSERT INTO model_groups VALUES(?,?,?,?,?)",
                    (self.key, "Pikachu", "Studio", "provavel", 0))
        con.execute("INSERT INTO model_group_members VALUES(?,?)",
                    (self.key, 1234))
        con.execute("INSERT INTO assets VALUES(?,?,?)",
                    (1234, self.sha, "Studio/msg_1234.jpg"))
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
                    live_model=lambda _: {})

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
