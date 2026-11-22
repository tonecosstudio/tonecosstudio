"""Offline regression tests for the long-running read-only Pokémon taxonomy stage."""
import csv
import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace

MODULE = pathlib.Path(__file__).with_name("validate-existing-pokemon-taxonomy.py")
spec = importlib.util.spec_from_file_location("tonart_pokemon_taxonomy", MODULE)
curator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(curator)


def data(rows, cols):
    handle = io.StringIO()
    writer = csv.DictWriter(handle, fieldnames=cols)
    writer.writeheader()
    writer.writerows(rows)
    return handle.getvalue().encode("utf8")


def fixture_bundle():
    species = [
        {"id": i, "identifier": ("pikachu" if i == 25 else
                                  "mr-mime" if i == 122 else f"species-{i}")}
        for i in range(1, 131)
    ]
    names = [
        {"pokemon_species_id": i, "local_language_id": 9,
         "name": ("Pikachu" if i == 25 else "Mr. Mime" if i == 122 else f"Species {i}"),
         "genus": ""}
        for i in range(1, 131)
    ]
    names.append({"pokemon_species_id": 25, "local_language_id": 1,
                  "name": "ピカチュウ", "genus": ""})
    return {
        curator.SPECIES_PATH: data(species, [
            "id", "identifier"
        ]),
        curator.NAMES_PATH: data(names, [
            "pokemon_species_id", "local_language_id", "name", "genus"
        ])
    }


class PokemonTaxonomyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)

    def test_normalize_exact_not_substring(self):
        self.assertEqual(curator.normalize("Pokémon"), "pokemon")
        self.assertEqual(curator.normalize("Mr. Mime"), "mr-mime")
        self.assertNotEqual(curator.normalize("Pikachu Mega"), "pikachu")
        self.assertNotEqual(curator.normalize("Pikachu/Goku"), "pikachu")

    def test_species_index_only_english_validated_and_pinned(self):
        idx = curator.verify_species(fixture_bundle())
        self.assertEqual(idx["pikachu"]["id"], 25)
        self.assertEqual(idx["mr-mime"]["id"], 122)
        self.assertEqual(len({x["id"] for x in idx.values()}), 130)
        broken = fixture_bundle()
        broken[curator.NAMES_PATH] = data([
            {"pokemon_species_id": 25, "local_language_id": 9,
             "name": "Pikachu", "genus": ""},
            {"pokemon_species_id": 25, "local_language_id": 9,
             "name": "Pikachu", "genus": ""},
        ], ["pokemon_species_id", "local_language_id", "name", "genus"])
        with self.assertRaises(ValueError):
            curator.verify_species(broken)

    def test_candidates_crosscheck_only_exact_pokemon_and_preserve_history(self):
        q = self.root / "fila-revisao-personagens.csv"
        with q.open("w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "franchise_candidate_key","display_name_candidate",
                "group_count","review_priority","review_flags"])
            writer.writeheader()
            writer.writerows([
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Pikachu",
                 "group_count":3,"review_priority":"P2","review_flags":""},
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Mr. Mime",
                 "group_count":1,"review_priority":"P3","review_flags":""},
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Mega Pikachu",
                 "group_count":1,"review_priority":"P3","review_flags":""},
                {"franchise_candidate_key":"Pokémon","display_name_candidate":"Species 20",
                 "group_count":1,"review_priority":"P3","review_flags":"potential_variant"},
                {"franchise_candidate_key":"Pokémon / Dragon Ball","display_name_candidate":"Pikachu",
                 "group_count":1,"review_priority":"P1","review_flags":""},
                {"franchise_candidate_key":"DC Comics","display_name_candidate":"Pikachu",
                 "group_count":1,"review_priority":"P1","review_flags":""},
            ])
        historic = self.root / "legacy.jsonl"
        historic.write_text(
            json.dumps({"name_at_snapshot":"Pikachu",
                        "matched_world_candidates":["pokemon"]})+"\n"+
            json.dumps({"name_at_snapshot":"Mr. Mime",
                        "matched_world_candidates":["one piece"]})+"\n",
            encoding="utf8"
        )
        results, rejected, stats = curator.verified_candidates(
            q, historic, curator.verify_species(fixture_bundle()),
            "a"*40, fixture_bundle())
        self.assertEqual(stats["pokemon_titles_scanned"],4)
        self.assertEqual(stats["unique_verified_species"],2)
        self.assertEqual(stats["withheld_review_rows"],2)
        self.assertEqual(stats["legacy_historic_name_candidates"],1)
        self.assertEqual({x["character_name"] for x in results},{"Pikachu","Mr. Mime"})
        self.assertTrue(all(x["linked_model_ids"] == [] for x in results))
        self.assertTrue(all(x["approved_for_publication"] is False for x in results))
        self.assertEqual({x["reason"] for x in rejected},
                         {"editorial_flags", "not_an_exact_species"})

    def test_supervised_mission_checkpoint_and_no_canonical_writes(self):
        q = self.root / "queue.csv"
        with q.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "franchise_candidate_key", "display_name_candidate",
                "group_count", "review_priority", "review_flags"])
            writer.writeheader()
            writer.writerow({"franchise_candidate_key":"pokemon",
                             "display_name_candidate":"Pikachu","group_count":1,
                             "review_priority":"P2","review_flags":""})
        historic = self.root / "historic.jsonl"
        historic.write_text("",encoding="utf8")
        output = self.root / "out"
        old_source = curator.source_bundle
        try:
            curator.source_bundle = lambda: ("a"*40, fixture_bundle())
            code = curator.run(SimpleNamespace(queue=q,historic=historic,output=output))
        finally:
            curator.source_bundle = old_source
        self.assertEqual(code,0)
        state = json.loads((output/"pokemon-verified-mission.json").read_text(encoding="utf8"))
        manifest = json.loads((output/"pokemon-verified-manifest.json").read_text(encoding="utf8"))
        self.assertEqual(state["status"],"completed")
        self.assertEqual(state["steps_done"],5)
        self.assertEqual(manifest["stats"]["unique_verified_species"],1)
        self.assertTrue(manifest["no_identity_written"])
        self.assertTrue(manifest["no_models_linked"])
        self.assertTrue((output/"pokemon-especies-exatas-privado.jsonl").is_file())


if __name__=="__main__":
    unittest.main()
