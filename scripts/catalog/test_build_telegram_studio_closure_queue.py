"""Offline regression tests for Telegram-only studio closure planning."""
import importlib.util
import json
import pathlib
import sqlite3
import tempfile
import unittest
from types import SimpleNamespace

HERE=pathlib.Path(__file__).parent
SPEC=importlib.util.spec_from_file_location(
    "tonart_studio_closure",HERE/"build-telegram-studio-closure-queue.py")
worker=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)


class StudioReviewTests(unittest.TestCase):
    def setUp(self):
        self.temporary=tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root=pathlib.Path(self.temporary.name)
        self.identity_file=self.root/"identities-01.json"
        self.identity_file.write_text(json.dumps({
            "schema":worker.canonical.SNAPSHOT_SCHEMA,
            "source":worker.canonical.AUTHORITY,"read_only":True,
            "total":1,"count":1,"page":1,
            "identities":[{"id":"11111111-1111-4111-8111-111111111111",
                           "name":"Pikachu","franchise":"Pokémon"}]
        }),encoding="utf8")
        self.sqlite=self.root/"curadoria.sqlite3"
        db=sqlite3.connect(self.sqlite)
        db.executescript("""
            CREATE TABLE model_groups(
              group_key text, studio text, title text, universe text,
              variant text, state text, revision integer
            );
            CREATE TABLE model_group_evidence(
              group_key text,source_type text,source_url text
            );
            CREATE TABLE model_group_members(group_key text,message_id integer);
            CREATE TABLE name_proposals(
              message_id integer,status text,evidence_type text,official_url text
            );
            INSERT INTO model_groups VALUES
              ('a','Studio A','Pikachu','Pokémon','Busto','provavel',2),
              ('b','Studio A','Ace','One Piece','Statue','provavel',1),
              ('c','Studio B','Pikachu','Kaijumon','Figure','provavel',3),
              ('d','Studio B','Pikachu','Pokémon','Figure','revisar',0);
            INSERT INTO model_group_members VALUES('a',20),('a',21),('b',40);
            INSERT INTO name_proposals VALUES
              (20,'confirmado','telegram_caption','https://t.me/20'),
              (21,'provavel','telegram_caption','https://t.me/21'),
              (40,'provavel','telegram_caption','https://t.me/40');
            INSERT INTO model_group_evidence VALUES
              ('a','telegram_caption','https://t.me/20');
        """)
        db.commit()
        db.close()

    def test_rejects_legacy_and_never_promotes_exact_title_to_verified(self):
        out=self.root/"out"
        rc=worker.run(SimpleNamespace(sqlite=self.sqlite,
             identity_shards=self.root/"identities-*.json",
             out=out,studio=None))
        self.assertEqual(rc,0)
        summary=json.loads((out/"telegram-studios-closure-manifest.json").read_text("utf8"))
        self.assertEqual(summary["all_source_groups"],4)
        self.assertEqual(summary["studio_count"],2)
        self.assertEqual(summary["identity_candidate_groups"],1)
        self.assertEqual(summary["group_decisions"][
            "review_exact_name_not_visual_verified"],1)
        self.assertEqual(summary["studios_closed"],0)
        self.assertTrue(summary["no_historic_inventory_read"])
        self.assertTrue(summary["no_sqlite_writes"])
        self.assertTrue(summary["no_supabase_writes"])
        import csv
        with (out/"telegram-studio-group-review-private.csv").open(
             encoding="utf-8-sig",newline="") as file:
            records=list(csv.DictReader(file))
        self.assertEqual(len(records),4)
        a=next(x for x in records if x["group_key"]=="a")
        self.assertEqual(a["source_message_ids"],"20;21")
        self.assertEqual(a["candidate_character"],"Pikachu")
        self.assertEqual(a["candidate_character_identity_uuid"],
                         "11111111-1111-4111-8111-111111111111")
        self.assertEqual(a["model_link_applied"],"no")
        self.assertEqual(a["catalog_model_id_verified"],"no")
        self.assertEqual(a["studio_closure_status"],
                         "pending_evidence_and_catalog_owner")

    def test_exact_studio_filter_excludes_other_studios_and_unknown_fails(self):
        output=self.root/"filtered"
        args=SimpleNamespace(
            sqlite=self.sqlite,identity_shards=self.root/"identities-*.json",
            out=output,studio="Studio A")
        self.assertEqual(worker.run(args),0)
        manifest=json.loads((output/"telegram-studios-closure-manifest.json").read_text("utf8"))
        self.assertEqual(manifest["all_source_groups"],4)
        self.assertEqual(manifest["groups_in_scope"],2)
        self.assertEqual(manifest["studio_count"],1)
        self.assertEqual(manifest["studio_filter"],"Studio A")
        args.studio="Studio Unknown"
        with self.assertRaises(ValueError):
            worker.run(args)

    def test_studio_summary_counts_every_source_group_even_without_identity(self):
        rows=[
            {"studio":"X","group_key":"a","decision":"review_exact_name_not_visual_verified",
             "character_identity_id":"id","rename_proposal":"Pikachu",
             "confirmed_member_proposals":0,"source_title":"Pikachu",
             "source_universe":"Pokémon","model_variant":"","source_revision":1,
             "source_state":"provavel","tag_preview":{"character":"Pikachu","franchise":"Pokémon"},
             "source_evidence_types":[],"visual_evidence_urls":[]},
            {"studio":"X","group_key":"b","decision":"hold_no_exact_character_identity",
             "character_identity_id":None,"rename_proposal":None,
             "confirmed_member_proposals":0,"source_title":"Ace",
             "source_universe":"One Piece","model_variant":"","source_revision":1,
             "source_state":"provavel","tag_preview":None,
             "source_evidence_types":[],"visual_evidence_urls":[]},
        ]
        entries,summaries=worker.classify_rows(rows,{"a":[1],"b":[2]})
        self.assertEqual(len(entries),2)
        self.assertEqual(summaries[0]["source_groups"],2)
        self.assertEqual(summaries[0]["candidate_groups"],1)
        self.assertEqual(summaries[0]["needs_identity_review"],1)
        self.assertEqual(summaries[0]["rename_previews"],1)
        self.assertEqual(summaries[0]["review_required"],2)
        self.assertEqual(summaries[0]["model_links_applied"],0)

    def test_unmatched_message_group_is_fail_closed(self):
        row={"studio":"X","group_key":"a","decision":"hold_no_exact_character_identity",
             "character_identity_id":None,"rename_proposal":None,
             "confirmed_member_proposals":0,"source_title":"No Name",
             "source_universe":"Unknown","model_variant":"",
             "source_revision":1,"source_state":"revisar","tag_preview":None,
             "source_evidence_types":[],"visual_evidence_urls":[]}
        with self.assertRaises(ValueError):
            worker.classify_rows([row],{"missing_group":[99]})


if __name__=="__main__":
    unittest.main()
