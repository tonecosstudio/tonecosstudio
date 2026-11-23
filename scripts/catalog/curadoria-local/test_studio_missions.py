#!/usr/bin/env python3
"""Deterministic synthetic checks for the two studio visual missions."""
import hashlib
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
import studio_missions as missions

class StudioMissionsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.media=self.root/"media";self.media.mkdir()
        self.path=self.root/"curadoria.sqlite3"
        c=sqlite3.connect(self.path)
        c.executescript("""
            CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
             source_relative TEXT,source_album TEXT,original_topic TEXT,source_caption TEXT);
            CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,studio TEXT,title TEXT,
             universe TEXT,variant TEXT,filename TEXT,status TEXT,revision INTEGER,
             notes TEXT,official_url TEXT);
            CREATE TABLE model_groups(group_key TEXT PRIMARY KEY,studio TEXT,state TEXT,
             revision INTEGER,title TEXT);
            CREATE TABLE model_group_members(message_id INTEGER PRIMARY KEY,group_key TEXT);
        """)
        c.execute("INSERT INTO model_groups VALUES(?,?,?,?,?)",("a"*24,"A Studio","revisar",1,"Foo"))
        c.execute("INSERT INTO model_groups VALUES(?,?,?,?,?)",("b"*24,"B Studio","confirmado",2,"Bar"))
        c.execute("INSERT INTO model_groups VALUES(?,?,?,?,?)",("c"*24,"Geral + 50k","revisar",0,"Trash"))
        from PIL import Image
        for i in range(1,29):
            picture=self.media/f"msg_{i}.jpg"
            Image.new("RGB",(75,100),(i*5%255,51,92)).save(picture)
            sha=hashlib.sha256(picture.read_bytes()).hexdigest()
            studio="A Studio" if i<=26 else "B Studio"
            c.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                      (i,sha,picture.name,"album","Mixed Telegram",f"caption {i}"))
            c.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (i,studio,f"Foo {i}","Franchise","Variant","file.jpg",
                       "confirmado" if i in (1,27,28) else "provavel",0,"",""))
            if i in (1,2,27):
                c.execute("INSERT INTO model_group_members VALUES(?,?)",
                          (i,"a"*24 if i<=26 else "b"*24))
        # Reserved General topic must never appear in canonical studio views.
        reserved=self.media/"reserved.jpg"
        Image.new("RGB",(50,50),"white").save(reserved)
        c.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                  (999,hashlib.sha256(reserved.read_bytes()).hexdigest(),reserved.name,
                   "","Geral + 50k","no"))
        c.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                  (999,"Geral + 50k","Unknown","","","","provavel",0,"",""))
        c.execute("INSERT INTO model_group_members VALUES(?,?)",(999,"c"*24))
        c.commit();c.close()

    def test_index_and_separation(self):
        x=missions.studio_index(self.path)
        self.assertEqual(x["studio_count"],2)
        self.assertEqual(x["images"],28)
        self.assertEqual(x["sheets"],3)
        self.assertEqual(x["studios"][0]["ungrouped"],24)
        self.assertEqual(x["studios"][0]["pages"],2)
        self.assertEqual(x["missions"],["grouping","naming"])

    def test_two_missions_same_pages(self):
        a=missions.board_page(self.path,"A Studio","grouping")
        b=missions.board_page(self.path,"A Studio","naming")
        self.assertEqual([i["message_id"] for i in a["items"]],
                         [i["message_id"] for i in b["items"]])
        self.assertEqual(len(a["items"]),24)
        self.assertEqual(a["items"][0]["mission_state"],"review")
        self.assertEqual(b["items"][0]["mission_state"],"confirmed")
        self.assertEqual(a["items"][2]["mission_state"],"ungrouped")
        self.assertNotIn("source_relative",a["items"][0])

    def test_exact_pages_and_no_general(self):
        self.assertEqual(len(missions.board_page(self.path,"A Studio",page=2)["items"]),2)
        self.assertEqual(missions.board_page(self.path,"A Studio",page=3)["items"],[])
        self.assertRaises(ValueError,missions.board_page,self.path,"Geral + 50k")
        self.assertRaises(ValueError,missions.board_page,self.path,"invented")
        self.assertRaises(ValueError,missions.board_page,self.path,"A Studio",page=0)
        self.assertRaises(ValueError,missions.board_page,self.path,"A Studio",limit=96)

    def test_generate_resume_and_stale_fingerprint(self):
        out=self.root/"derived"
        result=missions.generate_all(self.path,self.media,out)
        self.assertEqual((result["studio_count"],result["sheets"],result["preview_errors"]),(2,3,0))
        self.assertEqual(len(list(out.rglob("prancha-*.jpg"))),3)
        a=out/missions._slug("A Studio")/"prancha-001.jpg"
        before=hashlib.sha256(a.read_bytes()).hexdigest()
        again=missions.generate_all(self.path,self.media,out)
        self.assertEqual(again["sheets"],3)
        self.assertEqual(hashlib.sha256(a.read_bytes()).hexdigest(),before)
        db=sqlite3.connect(self.path)
        db.execute("UPDATE name_proposals SET title='Changed' WHERE message_id=1")
        db.commit();db.close()
        missions.generate_all(self.path,self.media,out)
        manifest=json.loads((a.parent/"manifest.json").read_text(encoding="utf8"))
        self.assertEqual(manifest["sheets"][0]["preview_errors"] if "preview_errors" in manifest["sheets"][0] else manifest["sheets"][0]["errors"],[])
        self.assertNotEqual(hashlib.sha256(a.read_bytes()).hexdigest(),before)

    def test_shard_ownership_stable(self):
        for studio in ("A Studio","B Studio","RinArtPoke","Wicked"):
            owner=missions.shard_for_studio(studio,4)
            self.assertIn(owner,range(4))
            self.assertEqual(sum(missions.shard_for_studio(studio,4)==i
                                 for i in range(4)),1)
            self.assertEqual(owner,missions.shard_for_studio(studio,4))
        self.assertRaises(ValueError,missions.shard_for_studio,"A Studio",0)
        self.assertRaises(ValueError,missions.shard_for_studio,"A Studio",9)

    def test_finalization_fails_closed_until_every_page_is_verified(self):
        output=self.root/"sharded"
        missions.generate_all(self.path,self.media,output,studios=["A Studio"],
                              write_index=False)
        self.assertFalse((output/"index.json").exists())
        partial=missions.finalize_index(self.path,output)
        self.assertEqual(partial["state"],"incomplete")
        self.assertFalse(partial["generation_complete"])
        missions.generate_all(self.path,self.media,output,studios=["B Studio"],
                              write_index=False)
        final=missions.finalize_index(self.path,output)
        self.assertEqual(final["state"],"complete")
        self.assertTrue(final["generation_complete"])
        self.assertEqual((final["studio_count"],final["sheets"]),(2,3))
        bad=output/missions._slug("A Studio")/"prancha-001.jpg"
        bad.write_bytes(b"corrupted")
        invalid=missions.finalize_index(self.path,output)
        self.assertEqual(invalid["state"],"incomplete")
        self.assertFalse(invalid["generation_complete"])

    def test_finalizer_rejects_stale_editorial_state_without_file_corruption(self):
        output=self.root/"freshness"
        result=missions.generate_all(self.path,self.media,output)
        self.assertTrue(result["generation_complete"])
        db=sqlite3.connect(self.path)
        db.execute("UPDATE name_proposals SET title='Renamed under another mission',revision=revision+1 WHERE message_id=1")
        db.commit();db.close()
        stale=missions.finalize_index(self.path,output)
        self.assertEqual(stale["state"],"incomplete")
        self.assertFalse(stale["generation_complete"])
        self.assertTrue(any("Estado editorial mudou" in x["blocker"] for x in stale["studios"]))
        corrected=missions.generate_all(self.path,self.media,output)
        self.assertTrue(corrected["generation_complete"])

    def test_path_traversal_blocked(self):
        self.assertRaises(ValueError,missions._source,self.media,"../../private.txt")
        self.assertTrue(missions._source(self.media,"msg_1.jpg").is_file())

    def test_database_pure_reads(self):
        prior=self.path.read_bytes()
        missions.studio_index(self.path)
        missions.board_page(self.path,"A Studio","grouping")
        self.assertEqual(self.path.read_bytes(),prior)

if __name__=="__main__":
    unittest.main(verbosity=2)
