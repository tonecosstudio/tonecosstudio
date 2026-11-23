"""Offline checks for model identity candidate join; never writes live catalogs."""
import csv
import importlib.util
import json
import pathlib
import sqlite3
import tempfile
import unittest
from types import SimpleNamespace

HERE=pathlib.Path(__file__).parent
s=importlib.util.spec_from_file_location(
    "tonart_model_character_review",HERE/"prepare-model-character-link-review.py")
mod=importlib.util.module_from_spec(s)
s.loader.exec_module(mod)


class ReviewLinkTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder=pathlib.Path(self.temp.name)
        self.files=[]
        identities=[
            {"id":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
             "name":"Pikachu","franchise":"Pokémon"},
            {"id":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
             "name":"Spider-Gwen","franchise":"Marvel Comics"},
            {"id":"cccccccc-cccc-4ccc-cccc-cccccccccccc",
             "name":"Ace McCloud","franchise":"Biker Mice from Mars"},
            {"id":"dddddddd-dddd-4ddd-dddd-dddddddddddd",
             "name":"Portgas D. Ace","franchise":"One Piece"},
        ]
        for i in range(2):
            file=self.folder/("identities-part-%02d.json"%(i+1))
            batch=identities[2*i:2*i+2]
            file.write_text(json.dumps({
                "schema":mod.SNAPSHOT_SCHEMA,"source":mod.AUTHORITY,
                "read_only":True,"total":len(identities),"page":i+1,
                "count":len(batch),"identities":batch
            }),encoding="utf8")
            self.files.append(file)

    def test_identity_shard_completeness_and_ambiguity_guard(self):
        idx,meta=mod.load_identities(self.files)
        self.assertEqual(meta["count"],4)
        self.assertEqual(idx[("pokemon","pikachu")]["character"],"Pikachu")
        with self.assertRaises(ValueError):
            mod.load_identities(self.files[:1])
        with self.assertRaises(ValueError):
            mod.load_identities(self.files+[self.files[0]])

    def test_rename_preview_and_canonical_tag_id_are_only_review(self):
        ids,_=mod.load_identities(self.files)
        r=mod.classify("Test Studio","Spider Gwen","Marvel","provavel",5,"group-1",ids,{"confirmed":0})
        self.assertEqual(r["decision"],"review_exact_name_not_visual_verified")
        self.assertEqual(r["rename_proposal"],"Spider-Gwen")
        self.assertEqual(r["character_identity_id"],"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb")
        self.assertEqual(r["tag_preview"]["franchise"],"Marvel Comics")
        self.assertFalse(r["public_allowed"])
        self.assertFalse(r["tags_applied"])
        self.assertFalse(r["rename_applied"])
        self.assertFalse(r["model_identity_verified"])
        self.assertIsNone(r["catalog_model_id"])

    def test_crossover_and_homonyms_never_autolink(self):
        ids,_=mod.load_identities(self.files)
        tests=[
            ("Ace","One Piece","provavel","hold_no_exact_character_identity"),
            ("Ace","Biker Mice from Mars","provavel","hold_no_exact_character_identity"),
            ("Pikachu","Kaijumon","provavel","hold_unverified_or_combined_universe"),
            ("Pikachu","Pokémon / Marvel","provavel","hold_unverified_or_combined_universe"),
            ("Pikachu","Pokémon","revisar","hold_source_group_needs_review"),
        ]
        for title,world,state,expected in tests:
            actual=mod.classify("Studio",title,world,state,0,"group",ids)
            self.assertEqual(actual["decision"],expected)

    def test_real_visual_evidence_needs_confirmed_member_and_url(self):
        ids,_=mod.load_identities(self.files)
        base={"types":["studio_catalog_exact_visual_match"],"urls":["https://studio.example/figure"],"confirmed":0,"members":2}
        first=mod.classify("Studio","Pikachu","Pokémon","provavel",1,"group",ids,base)
        self.assertEqual(first["decision"],"review_exact_name_not_visual_verified")
        base["confirmed"]=1
        second=mod.classify("Studio","Pikachu","Pokémon","provavel",1,"group",ids,base)
        self.assertEqual(second["decision"],"review_high_evidence")
        self.assertFalse(second["model_identity_verified"])

    def test_historic_model_ids_and_franchise_are_never_treated_live(self):
        ids,_=mod.load_identities(self.files)
        hist=self.folder/"historic.jsonl"
        hist.write_text("\n".join(json.dumps(x) for x in [
            {"model_id":"mdl_"+"1"*20,"name_at_snapshot":"Pikachu","matched_world_candidates":["pokemon"]},
            {"model_id":"tg_"+"2"*24,"name_at_snapshot":"Ace","matched_world_candidates":[]},
            {"model_id":"mdl_"+"3"*20,"name_at_snapshot":"Ace","matched_world_candidates":["one piece","biker mice from mars"]},
        ])+"\n",encoding="utf8")
        rows=mod.review_historic(hist,ids)
        self.assertEqual(len(rows),3)
        self.assertEqual(rows[0]["decision"],"review_historic_exact_title_only")
        self.assertEqual(rows[1]["decision"],"hold_missing_or_ambiguous_franchise")
        self.assertTrue(all(not x["verified"] and not x["renamed"] and not x["tags_applied"] for x in rows))

    def test_readonly_sqlite_group_provenance(self):
        ids,_=mod.load_identities(self.files)
        file=self.folder/"curadoria.sqlite3"
        db=sqlite3.connect(file)
        db.executescript("""
        CREATE TABLE model_groups(group_key text,studio text,title text,universe text,
        variant text,state text,revision integer);
        CREATE TABLE model_group_evidence(group_key text,source_type text,source_url text);
        CREATE TABLE name_proposals(message_id integer,status text,evidence_type text,official_url text);
        CREATE TABLE model_group_members(group_key text,message_id integer);
        INSERT INTO model_groups VALUES ('g1','Studio','Pikachu','Pokémon','Busto','provavel',3);
        INSERT INTO model_group_evidence VALUES ('g1','telegram_caption','https://t.me/1');
        INSERT INTO model_group_members VALUES ('g1',1);
        INSERT INTO name_proposals VALUES (1,'provavel','telegram_caption','');
        """)
        db.commit()
        db.close()
        out,source=mod.review_telegram(file,ids)
        self.assertEqual(source["rows"],1)
        self.assertEqual(out[0]["decision"],"review_exact_name_not_visual_verified")
        self.assertEqual(out[0]["model_variant"],"Busto")
        self.assertEqual(out[0]["source_revision"],3)
        self.assertIsNone(out[0]["catalog_model_id"])
        # No mutations happened to the SQLite.
        db=sqlite3.connect(file)
        self.assertEqual(db.execute("select count(*) from model_groups").fetchone()[0],1)
        db.close()


if __name__=="__main__":
    unittest.main()
