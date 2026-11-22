"""Validation of the additional 25 independently checked fandom source domains."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

HERE=pathlib.Path(__file__).parent
s=importlib.util.spec_from_file_location("tonart_fandom_sources",HERE/"validate-fandom-character-categories.py")
wiki=importlib.util.module_from_spec(s)
s.loader.exec_module(wiki)


class FandomSourceExpansionTests(unittest.TestCase):
    def test_known_validated_host_scopes(self):
        expected={
            "ghostbusters":"ghostbusters",
            "captain tsubasa":"captaintsubasa",
            "the king of fighters":"snk",
            "gremlins":"gremlins",
            "gargoyles":"gargoyles",
            "masters of the universe":"heman",
            "the witcher":"witcher",
            "resident evil":"residentevil",
            "darkstalkers":"darkstalkers",
            "cowboy bebop":"cowboybebop",
            "honkai: star rail":"honkai-star-rail",
            "street sharks":"streetsharks",
            "persona 5":"megamitensei",
            "fullmetal alchemist":"fullmetal-alchemist",
            "spy x family":"spy-x-family",
            "yu yu hakusho":"yuyuhakusho",
            "the boys":"the-boys",
            "the last of us":"thelastofus",
            "cyberpunk":"cyberpunk",
            "fairy tail":"fairytail",
            "kingdom hearts":"kingdomhearts",
            "one punch man":"onepunchman",
            "the seven deadly sins":"nanatsu-no-taizai",
            "alien":"alien",
            "spawn":"spawn",
        }
        for world,host in expected.items():
            self.assertEqual(wiki.WORLDS[world][0],host)
        self.assertEqual(len(expected),25)
        # Rejected domains are not enabled merely because their Wiki front page exists.
        self.assertNotIn("sailor moon",wiki.WORLDS)
        self.assertNotIn("hanna-barbera",wiki.WORLDS)
        self.assertNotIn("kaijumon",wiki.WORLDS)

    def test_only_new_workflow_preserves_old_outputs_and_scope(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp)
            queue=root/"inventory.csv"
            with queue.open("w",newline="",encoding="utf-8") as f:
                w=csv.DictWriter(f,fieldnames=["franchise_candidate_key","display_name_candidate","review_flags"])
                w.writeheader()
                w.writerow({"franchise_candidate_key":"ghostbusters","display_name_candidate":"Egon Spengler","review_flags":""})
                w.writerow({"franchise_candidate_key":"bleach","display_name_candidate":"Ichigo Kurosaki","review_flags":""})
            private=root/"out"
            private.mkdir()
            old_file=private/"fandom-characters-exact-private.jsonl"
            old_file.write_text("sentinel-old-work-preserved",encoding="utf8")
            # Leave only one approved new source during the unit test.
            scoped={"ghostbusters":("ghostbusters","Ghostbusters"),
                    "bleach":("bleach","Bleach")}
            with patch.dict(wiki.WORLDS,scoped,clear=True):
                with patch.object(wiki,"get_category_batch",return_value=(
                    [{"pageid":75,"title":"Egon Spengler",
                      "categories":[{"title":"Category:GB1 Characters"}]}],
                    "a"*64,"https://ghostbusters.fandom.com/api.php",0
                )) as fetch, patch.object(wiki.time,"sleep",return_value=None):
                    code=wiki.run(SimpleNamespace(queue=queue,out=private,only_new=True))
            self.assertEqual(code,0)
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(fetch.call_args.args[0],"ghostbusters")
            self.assertEqual(old_file.read_text(encoding="utf8"),"sentinel-old-work-preserved")
            report=json.loads((private/"fandom-new-sources-characters-manifest.json").read_text("utf8"))
            self.assertEqual(report["verified_unique"],1)
            self.assertEqual(report["held"],0)
            self.assertEqual(set(report["sources"]),{"Ghostbusters"})
            self.assertTrue(report["no_canonical_writes"])
            self.assertTrue(report["no_model_links"])
            self.assertEqual(json.loads((private/"fandom-new-sources-character-supervised.json").read_text("utf8"))["status"],"completed")

if __name__=="__main__":
    unittest.main()
