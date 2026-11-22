"""Offline tests for supervised Naruto/Dragon Ball reference batches."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace

PATH = pathlib.Path(__file__).with_name("validate-anime-character-references.py")
spec = importlib.util.spec_from_file_location("tonart_anime_reference", PATH)
target = importlib.util.module_from_spec(spec)
spec.loader.exec_module(target)


class AnimeBatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)

    def queue(self):
        p = self.root / "queue.csv"
        with p.open("w", encoding="utf8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=[
                "franchise_candidate_key", "display_name_candidate",
                "group_count", "review_flags", "review_priority"])
            w.writeheader()
            w.writerows([
                {"franchise_candidate_key": "Dragon Ball", "display_name_candidate":"Goku",
                 "group_count":2, "review_flags":"", "review_priority":"P2"},
                {"franchise_candidate_key": "Dragon Ball", "display_name_candidate":"Freezer",
                 "group_count":1, "review_flags":"", "review_priority":"P2"},
                {"franchise_candidate_key": "Dragon Ball", "display_name_candidate":"Frieza",
                 "group_count":1, "review_flags":"", "review_priority":"P2"},
                {"franchise_candidate_key": "Naruto", "display_name_candidate":"Naruto Uzumaki",
                 "group_count":2, "review_flags":"", "review_priority":"P2"},
                {"franchise_candidate_key": "Naruto", "display_name_candidate":"Zero-Tails",
                 "group_count":1, "review_flags":"", "review_priority":"P3"},
                {"franchise_candidate_key": "Pokémon", "display_name_candidate":"Pikachu",
                 "group_count":2, "review_flags":"", "review_priority":"P2"},
            ])
        return p

    @staticmethod
    def source(label, digest):
        return {
            "franchise":label, "source_type":"independent_community_api_not_official",
            "source_url":"https://example.test/reference",
            "fetched_at_utc":"2026-11-22T20:00:00+00:00",
            "pages_read":1, "characters_count":3,
            "source_sha256":digest,"ambiguous_names":0,
        }

    def test_exact_scope_and_alias_review_no_model_links(self):
        indexes = {
            "dragon-ball": {
                target.normalize("Goku"): {"name":"Goku","id":1},
                target.normalize("Freezer"): {"name":"Freezer","id":5},
            },
            "naruto": {
                target.normalize("Naruto Uzumaki"): {"name":"Naruto Uzumaki","id":1344},
                target.normalize("Zero-Tails"): {"name":"Zero-Tails","id":0},
            },
        }
        sources = {
            "dragon-ball":self.source("Dragon Ball","a"*64),
            "naruto":self.source("Naruto","b"*64),
        }
        result,held,stats=target.evaluate(self.queue(),indexes,sources)
        self.assertEqual(stats["total_matches"],3)
        self.assertEqual(stats["matches_dragon-ball"],1)
        self.assertEqual(stats["matches_naruto"],2)
        self.assertEqual(stats["total_held"],2)
        self.assertEqual({r["character_name"] for r in result},
                         {"Goku","Naruto Uzumaki","Zero-Tails"})
        self.assertTrue(all(r["model_links"] == [] for r in result))
        self.assertTrue(all(not r["approved_for_publication"] for r in result))
        self.assertIn(
            {"franchise":"Dragon Ball","candidate":"Freezer",
             "reason":"source_locale_alias_review","flags":"","new_identity_id":None},
            held,
        )
        self.assertTrue(any(r["candidate"]=="Frieza" and
                            r["reason"]=="not_exact_known_character" for r in held))

    def test_dragon_ball_is_not_skipped_and_source_pagination_is_verified(self):
        old=target.http_json
        try:
            def fixture(url):
                self.assertIn("page=1&limit=100",url)
                return ({
                    "items":[{"id":1,"name":"Goku"},{"id":2,"name":"Vegeta"}],
                    "meta":{"totalItems":2,"totalPages":1,"currentPage":1},
                },b'{"source":"fixed"}')
            target.http_json=fixture
            events=[]
            idx,reference=target.collect_reference("dragon-ball",lambda *a,**kw:events.append((a,kw)))
        finally:
            target.http_json=old
        self.assertEqual(idx[target.normalize("Vegeta")]["id"],2)
        self.assertEqual(reference["characters_count"],2)
        self.assertEqual(events[0][0][0],"reading_reference_page")

    def test_naruto_source_allows_id_zero_without_merging_duplicate_labels(self):
        old=target.http_json
        try:
            def fixture(url):
                return ({
                    "characters":[{"id":0,"name":"Zero-Tails"},{"id":1344,"name":"Naruto Uzumaki"}],
                    "total":2,"currentPage":1,"pageSize":100,
                },b'{"naruto":"snapshot"}')
            target.http_json=fixture
            idx,reference=target.collect_reference("naruto",lambda *_a,**_kw:None)
        finally:
            target.http_json=old
        self.assertEqual(idx["zero-tails"]["id"],0)
        self.assertEqual(reference["characters_count"],2)

    def test_naruto_and_dragon_ball_separate_private_outputs(self):
        old=target.collect_reference
        try:
            def fake(source,stage):
                if source!="dragon-ball":
                    raise AssertionError("Naruto should not be fetched on dragon-ball retry")
                return ({
                    "goku":{"name":"Goku","id":1},
                    "freezer":{"name":"Freezer","id":5},
                },self.source("Dragon Ball","d"*64))
            target.collect_reference=fake
            out=self.root/"out"
            rc=target.run(SimpleNamespace(queue=self.queue(),out=out,only="dragon-ball"))
        finally:
            target.collect_reference=old
        self.assertEqual(rc,0)
        manifest=json.loads((out/"anime-sources-manifest-dragon-ball.json").read_text("utf8"))
        self.assertEqual(manifest["stats"]["matches_dragon-ball"],1)
        self.assertEqual(manifest["stats"]["held_dragon-ball"],2)
        self.assertTrue(manifest["no_canonical_writes"])
        self.assertFalse((out/"anime-identidades-exatas-privado.jsonl").exists())
        self.assertTrue((out/"anime-identidades-exatas-dragon-ball-privado.jsonl").exists())
        state=json.loads((out/"anime-sources-supervised-dragon-ball.json").read_text("utf8"))
        self.assertEqual(state["status"],"completed")


if __name__=="__main__":
    unittest.main()
