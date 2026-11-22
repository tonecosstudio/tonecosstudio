"""No-network tests for structured source validation and title matching."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

P=pathlib.Path(__file__).parent
S=importlib.util.spec_from_file_location("tonart_next_sources",P/"validate-next-verified-universes.py")
mod=importlib.util.module_from_spec(S)
S.loader.exec_module(mod)


class StructuredReferencesTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=pathlib.Path(self.temp.name)

    def test_index_dedupes_colliding_source_names(self):
        data=[{"id":i+1,"name":"Same" if i<2 else f"Unique {i}",
               "url":"https://example.test/item"} for i in range(140)]
        idx,amb=mod.valid_index(data,100)
        self.assertNotIn("same",idx)
        self.assertEqual(amb,1)
        self.assertIn("unique-139",idx)

    def test_starwars_reference_validates_item_count_and_url(self):
        valid=[
            {"name":f"Character {i}","url":f"https://swapi.info/api/people/{i}"}
            for i in range(1,83)
        ]
        with patch.object(mod,"fetch",return_value=(valid,"a"*64,10000)):
            idx,info=mod.swapi()
        self.assertEqual(info["reference_count"],82)
        self.assertIn("character-20",idx)
        with patch.object(mod,"fetch",return_value=(
            [dict(valid[0],url="https://example.com/people/1")]+valid[1:],"a"*64,10000)):
            with self.assertRaises(ValueError):
                mod.swapi()

    def test_digimon_requires_complete_page_and_live_count(self):
        records=[
            {"id":i,"name":f"Digimon {i}",
             "href":f"https://digi-api.com/api/v1/digimon/{i}"}
            for i in range(1,1101)
        ]
        complete={"content":records,
                  "pageable":{"totalElements":1100,"totalPages":1,"currentPage":0}}
        with patch.object(mod,"fetch",return_value=(complete,"b"*64,10000)):
            idx,info=mod.digimon()
        self.assertEqual(info["reference_count"],1100)
        self.assertEqual(idx["digimon-2"]["id"],2)
        broken={**complete,"pageable":{**complete["pageable"],"totalPages":2}}
        with patch.object(mod,"fetch",return_value=(broken,"b"*64,10000)):
            with self.assertRaises(ValueError):mod.digimon()

    def test_genshin_characters_are_not_unverified_enemies(self):
        names=["Character "+str(i) for i in range(120)]
        names[14]="Ganyu"
        with patch.object(mod,"fetch",return_value=(names,"c"*64,10000)):
            index,info=mod.genshin()
        self.assertEqual(info["reference_count"],120)
        self.assertEqual(index["ganyu"]["name"],"Ganyu")
        self.assertNotIn("azhdaha",index)

    def test_yugioh_only_exact_monsters_not_cards_or_substrings(self):
        rows=[
            {"franchise_candidate_key":"Yu-Gi-Oh!","display_name_candidate":"Dark Magician"},
            {"franchise_candidate_key":"Yu-Gi-Oh!","display_name_candidate":"Monster Reborn"},
            {"franchise_candidate_key":"Yu-Gi-Oh!","display_name_candidate":"Blue Eyes"},
        ]
        def fixture(url,maxbytes=0):
            if "Dark+Magician" in url:
                return {"data":[{"id":100,"name":"Dark Magician","type":"Normal Monster"}]},"a"*64,400
            if "Monster+Reborn" in url:
                return {"data":[{"id":200,"name":"Monster Reborn","type":"Spell Card"}]},"b"*64,400
            return {"data":[{"id":300,"name":"Blue-Eyes White Dragon","type":"Normal Monster"}]},"c"*64,400
        with patch.object(mod,"fetch",side_effect=fixture),patch.object(mod.time,"sleep",return_value=None):
            idx,summary=mod.yugioh(rows,lambda *a,**kw:None)
        self.assertEqual(summary["titles_queried"],3)
        self.assertEqual(len(idx),1)
        self.assertIn("dark-magician",idx)
        self.assertNotIn("monster-reborn",idx)

    def test_supervised_genshin_only_does_not_reprocess_existing_sources(self):
        rows=self.root/"queue.csv"
        with rows.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=[
                "franchise_candidate_key","display_name_candidate","review_flags"])
            w.writeheader()
            w.writerow({"franchise_candidate_key":"genshin impact",
                        "display_name_candidate":"Ganyu","review_flags":""})
        out=self.root/"private"
        fake={
            "ganyu":{"id":"ganyu","name":"Ganyu",
                     "url":"https://genshin-db-api.vercel.app/api/v5/characters?query=names"}
        }
        with patch.object(mod,"genshin",return_value=(fake,{
            "url":"https://genshin-db-api.vercel.app/api/v5/characters?query=names",
            "reference_count":124,
            "sha256":"d"*64})),patch.object(mod,"digimon",side_effect=AssertionError("not requested")):
            self.assertEqual(mod.run(SimpleNamespace(queue=rows,out=out,only="genshin impact")),0)
        m=json.loads((out/"next-universes-manifest-genshin-impact.json").read_text("utf8"))
        self.assertEqual(m["exact_identities"],1)
        self.assertTrue(m["no_canonical_writes"])
        self.assertTrue(m["no_model_links"])
        self.assertFalse((out/"next-universes-exact-private.jsonl").exists())


if __name__=="__main__":
    unittest.main()
