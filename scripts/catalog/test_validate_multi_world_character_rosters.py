"""Offline safeguards for reusing the canonical category roster validator."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

HERE=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location(
    "tonart_category_multi",HERE/"validate-categorymembers-character-references.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class MultiWorldRosterTests(unittest.TestCase):
    def test_only_six_pinned_independent_new_sources(self):
        approved={
            "mushoku-tensei":("Mushoku Tensei","mushokutensei"),
            "the-king-of-fighters":("The King of Fighters","snk"),
            "elden-ring":("Elden Ring","eldenring"),
            "medabots":("Medabots","medabots"),
            "mummies-alive":("Mummies Alive!","mummiesalive"),
            "overlord":("Overlord","overlordmaruyama"),
        }
        for key,(world,host) in approved.items():
            profile=mod.SOURCE_PROFILES[key]
            self.assertEqual(profile["franchise"],world)
            self.assertEqual(profile["source"],f"https://{host}.fandom.com/api.php")
            self.assertGreater(len(profile["categories"]),0)
        self.assertEqual(mod.SOURCE_PROFILES["the-king-of-fighters"]["categories"],
                         ["Category:King of Fighters Characters"])
        self.assertEqual(len(mod.SOURCE_PROFILES),7)
        self.assertEqual(mod.SOURCE_PROFILES["saint-seiya"]["franchise"],"Saint Seiya")

    def test_scoped_exact_page_does_not_create_rights_or_links(self):
        good,held,aliases=mod.decide(
            [{"display_name_candidate":"Melina","review_flags":""},
             {"display_name_candidate":"Malenia","review_flags":""}],
            {"melina":[{"id":433,"title":"Melina"}]},
            {"Category:Characters":{"rows":270,"sha256":"a"*64,"pages":1}},
            franchise="Elden Ring",source_api="https://eldenring.fandom.com/api.php")
        self.assertEqual(len(good),1)
        self.assertEqual(good[0]["franchise"],"Elden Ring")
        self.assertEqual(good[0]["source_page_id"],433)
        self.assertEqual(good[0]["source_character_url"],"https://eldenring.fandom.com/wiki/Melina")
        self.assertFalse(good[0]["public_approved"])
        self.assertEqual(good[0]["linked_models"],[])
        self.assertEqual(held[0]["candidate"],"Malenia")
        self.assertEqual(aliases,[])

    def test_aliases_are_not_registered_and_prefix_is_private(self):
        with tempfile.TemporaryDirectory() as rootdir:
            root=pathlib.Path(rootdir)
            queue=root/"inventory.csv"
            with queue.open("w",encoding="utf8",newline="") as f:
                w=csv.DictWriter(f,fieldnames=[
                    "franchise_candidate_key","display_name_candidate","review_flags"])
                w.writeheader()
                for character in ("Ja-Kal","Nefertina","Rath","Unknown Figure"):
                    w.writerow({"franchise_candidate_key":"Mummies Alive!",
                                "display_name_candidate":character,"review_flags":""})
            index={
                "ja-kal":[{"id":2054,"title":"Ja-Kal"}],
                "nefertina":[{"id":2060,"title":"Nefertina"}],
                "rath":[{"id":2056,"title":"Rath"}]
            }
            source={"Category:Characters":{"rows":158,"sha256":"b"*64,"pages":1}}
            out=root/"private"
            with patch.object(mod,"source_index",return_value=(index,source,158)) as idx:
                code=mod.run(SimpleNamespace(queue=queue,out=out,world="mummies-alive"))
            self.assertEqual(code,0)
            self.assertEqual(idx.call_args.kwargs["source"],
                             "https://mummiesalive.fandom.com/api.php")
            manifest=json.loads((out/"roster-mummies-alive-category-manifest.json").read_text("utf8"))
            self.assertEqual(manifest["franchise"],"Mummies Alive!")
            self.assertEqual(manifest["matched_exact"],3)
            self.assertEqual(manifest["held"],1)
            self.assertTrue(manifest["no_model_links"])
            self.assertTrue(manifest["no_canonical_writes"])
            self.assertFalse((out/"saintseiya-exact-private.jsonl").exists())

if __name__=="__main__":
    unittest.main()
