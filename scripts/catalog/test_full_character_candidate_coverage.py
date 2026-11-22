"""Source-preserving regression tests for exhaustive TONART candidate triage."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace

ROOT=pathlib.Path(__file__).parent
S=importlib.util.spec_from_file_location("tonart_candidate_audit",ROOT/"audit-full-character-candidate-coverage.py")
audit=importlib.util.module_from_spec(S)
S.loader.exec_module(audit)


class AllCandidateAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=pathlib.Path(self.temp.name)
        self.db=self.root/"editorial.json"
        data={
            "schema":"tonart.private.identity-names-snapshot/1",
            "source":"supabase:icmtmaakjucmuzxnofkd.public.catalog_character_identities",
            "read_only":True,"reported_total":6,
            "identities":[
                {"franchise":"One Piece","names":["Portgas D. Ace","Monkey D. Luffy"]},
                {"franchise":"Pokémon","names":["Pikachu","Charizard"]},
                {"franchise":"X-Men","names":["Rogue"]},
                {"franchise":"Fantastic Four","names":["Sue Storm"]},
            ],
        }
        self.db.write_text(json.dumps(data),encoding="utf8")

    def test_private_snapshot_rejects_wrong_authority_and_incomplete(self):
        identities,total=audit.read_identity_snapshot(self.db)
        self.assertEqual(total,6)
        self.assertIn("one-piece",identities)
        changed=json.loads(self.db.read_text(encoding="utf8"))
        changed["reported_total"]=100
        self.db.write_text(json.dumps(changed),encoding="utf8")
        with self.assertRaises(ValueError):audit.read_identity_snapshot(self.db)

    def test_exact_names_are_franchise_scoped_and_aliases_not_assumed(self):
        identities,_=audit.read_identity_snapshot(self.db)
        def row(name,world,flags=""):
            return {"display_name_candidate":name,"franchise_candidate_key":world,
                    "review_flags":flags}
        self.assertEqual(audit.classify_row(row("Pikachu","pokemon"),identities)[0],
                         "registered_exact_identity")
        self.assertEqual(audit.classify_row(row("Pikachu","One Piece"),identities)[0],
                         "character_not_yet_verified")
        self.assertEqual(audit.classify_row(row("Ace","One Piece"),identities)[0],
                         "possible_alias_editorial_review")
        self.assertEqual(audit.classify_row(row("Rogue","marvel"),identities)[0],
                         "same_character_cross_editorial_franchise_review")
        self.assertEqual(audit.classify_row(row("Pikachu Diorama","Pokémon"),identities)[0],
                         "possible_model_or_multi_character_title")
        self.assertEqual(audit.classify_row(row("Pikachu","Pokémon","flag"),identities)[0],
                         "editorial_flags_require_review")
        self.assertEqual(audit.classify_row(row("Pikachu","Pokémon/Dragon Ball"),identities)[0],
                         "universe_unverified_or_combined")
        self.assertEqual(audit.classify_row(row("Ancient Sea Kaiju","Kaijumon"),identities)[0],
                         "creator_collection_requires_franchise_review")

    def test_full_queue_every_source_row_gets_one_status_and_duplicate_kept(self):
        q=self.root/"input.csv"
        with q.open("w",encoding="utf-8-sig",newline="") as f:
            w=csv.DictWriter(f,fieldnames=[
                "franchise_candidate_key","display_name_candidate","review_flags"])
            w.writeheader()
            w.writerows([
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Pikachu","review_flags":""},
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Pikachu!","review_flags":""},
                {"franchise_candidate_key":"One Piece","display_name_candidate":"Ace","review_flags":""},
                {"franchise_candidate_key":"Here","display_name_candidate":"Woody","review_flags":""},
                {"franchise_candidate_key":"Unknown World","display_name_candidate":"Unrelated Figure","review_flags":""},
            ])
        out=self.root/"output"
        self.assertEqual(audit.run(SimpleNamespace(queue=q,identity_snapshot=self.db,out=out)),0)
        summary=json.loads((out/"full-character-candidate-coverage-manifest.json").read_text(encoding="utf8"))
        self.assertTrue(summary["all_candidates_accounted_for"])
        self.assertEqual(summary["candidate_titles_total"],5)
        self.assertEqual(summary["unique_candidate_pairs"],4)
        self.assertEqual(summary["duplicate_normalized_rows"],1)
        self.assertEqual(sum(summary["status_counts"].values()),5)
        self.assertEqual(summary["model_links"],0)
        self.assertTrue(summary["no_canonical_writes"])
        results=[json.loads(l) for l in (
            out/"full-character-candidate-coverage-private.jsonl").read_text(encoding="utf8").splitlines()]
        self.assertEqual(len(results),5)
        self.assertIn("duplicate_normalized_candidate_editorial_review",
                      [x["classification"] for x in results])
        self.assertTrue(all(x["registration_action"]=="no_write" for x in results))


if __name__=="__main__":
    unittest.main()
