"""Offline regression tests for private Marvel/DC/One Piece bulk references."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

PATH = pathlib.Path(__file__).with_name("validate-hero-piece-references.py")
spec = importlib.util.spec_from_file_location("tonart_hero_piece_ref", PATH)
target = importlib.util.module_from_spec(spec)
spec.loader.exec_module(target)


class HeroPieceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)

    def candidates(self):
        p=self.root/"candidates.csv"
        with p.open("w", encoding="utf-8", newline="") as f:
            w=csv.DictWriter(f, fieldnames=[
                "franchise_candidate_key","display_name_candidate","review_flags"])
            w.writeheader()
            w.writerows([
                {"franchise_candidate_key":"Marvel","display_name_candidate":"Spider-Man","review_flags":""},
                {"franchise_candidate_key":"Marvel Comics","display_name_candidate":"Spider-Man","review_flags":""},
                {"franchise_candidate_key":"Marvel","display_name_candidate":"Chun-Li","review_flags":""},
                {"franchise_candidate_key":"DC Comics","display_name_candidate":"Batman","review_flags":""},
                {"franchise_candidate_key":"DC Comics","display_name_candidate":"Batman Suit","review_flags":"variant"},
                {"franchise_candidate_key":"One Piece","display_name_candidate":"Monkey D. Luffy","review_flags":""},
                {"franchise_candidate_key":"One Piece","display_name_candidate":"Luffy","review_flags":""},
                {"franchise_candidate_key":"One Piece","display_name_candidate":"Ace","review_flags":""},
                {"franchise_candidate_key":"One Piece","display_name_candidate":"Chopper (winter)","review_flags":"variant"},
                {"franchise_candidate_key":"Dragon Ball","display_name_candidate":"Goku","review_flags":""},
            ])
        return p

    def test_superhero_index_publisher_and_duplicates_fail_closed(self):
        records=[]
        for i in range(1,271):
            records.append({"id":i,"name":f"Marvel {i}",
                            "biography":{"publisher":"Marvel Comics"}})
        for i in range(271,427):
            records.append({"id":i,"name":f"DC {i}",
                            "biography":{"publisher":"DC Comics"}})
        records[3]["name"]="Spider-Man"
        records[4]["name"]="Spider-Man"
        records[280]["name"]="Batman"
        index,held=target.hero_index(records)
        self.assertNotIn(("Marvel Comics","spider-man"),index)
        self.assertEqual(index[("DC Comics","batman")]["name"],"Batman")
        self.assertTrue(any(x["candidate"]=="spider-man" for x in held))
        self.assertNotIn(("DC Comics","marvel-1"),index)
        with self.assertRaises(ValueError):
            target.hero_index(records[:-100])

    def test_exact_hero_unifies_marvel_spellings_and_holds_variants(self):
        rows=target.read_queue(self.candidates())
        index={
            ("Marvel Comics","spider-man"):{"source_id":500,"name":"Spider-Man"},
            ("DC Comics","batman"):{"source_id":40,"name":"Batman"},
        }
        actual,held,counts=target.exact_hero_candidates(rows,index,"a"*64)
        self.assertEqual(len(actual),2)
        self.assertEqual(len(held),2)
        self.assertEqual(counts["titles_Marvel Comics"],3)
        hero=next(x for x in actual if x["franchise"]=="Marvel Comics")
        self.assertEqual(hero["candidate_source_worlds"],["marvel","marvel-comics"])
        self.assertTrue(hero["no_model_link"])
        self.assertFalse(hero["approved_for_publication"])

    def test_onepiece_search_is_exact_not_substring_or_nickname(self):
        old=target.read_json
        try:
            def fixture(url,maximum=0):
                q=parse_qs(urlparse(url).query)["q"][0]
                if q=="Monkey D. Luffy":
                    response=[{"id":"11111111-1111-1111-1111-111111111111",
                               "name":{"en":"Monkey D. Luffy"}}]
                elif q=="Luffy":
                    response=[{"id":"11111111-1111-1111-1111-111111111111",
                               "name":{"en":"Monkey D. Luffy"}}]
                elif q=="Ace":
                    response=[{"id":"22222222-2222-2222-2222-222222222222",
                               "name":{"en":"Portgas D. Ace"}}]
                else:
                    response=[]
                return response,"b"*64
            target.read_json=fixture
            result,held,stats=target.exact_onepiece_candidates(
                target.read_queue(self.candidates()),lambda *a,**kw:None)
        finally:
            target.read_json=old
        self.assertEqual(stats["onepiece_titles"],4)
        self.assertEqual(stats["onepiece_exact_unique"],1)
        self.assertEqual(len(held),3)
        self.assertEqual(result[0]["character_name"],"Monkey D. Luffy")
        self.assertEqual(result[0]["model_links"] if "model_links" in result[0] else [],[])
        self.assertTrue(all(not x["approved_for_publication"] for x in result))
        self.assertIn("source_alias_or_absent",{x["reason"] for x in held})

    def test_run_does_not_modify_catalog_and_writes_supervised_private_reports(self):
        old=target.read_json
        try:
            def fixture(url,maximum=0):
                if url==target.HERO_SOURCE_URL:
                    records=[
                        {"id":i,"name":"Spider-Man" if i==3 else "Batman"
                            if i==300 else f"Hero {i}",
                         "biography":{"publisher":"Marvel Comics" if i<=270
                                      else "DC Comics"}}
                        for i in range(1,427)]
                    return records,"a"*64
                q=parse_qs(urlparse(url).query)["q"][0]
                if q=="Monkey D. Luffy":
                    return [{"id":"11111111-1111-1111-1111-111111111111",
                             "name":{"en":"Monkey D. Luffy"}}],"b"*64
                return [],"c"*64
            target.read_json=fixture
            out=self.root/"private"
            code=target.run(SimpleNamespace(queue=self.candidates(),out=out))
        finally:
            target.read_json=old
        self.assertEqual(code,0)
        m=json.loads((out/"hero-piece-manifest.json").read_text(encoding="utf8"))
        s=json.loads((out/"hero-piece-supervised.json").read_text(encoding="utf8"))
        self.assertEqual(m["matched"],3)
        self.assertTrue(m["no_canonical_writes"])
        self.assertTrue(m["no_model_links"])
        self.assertEqual(s["status"],"completed")
        self.assertEqual(s["phase"],"handoff")
        self.assertTrue((out/"hero-piece-exact-private.jsonl").exists())
        self.assertTrue((out/"hero-piece-hold-private.jsonl").exists())


if __name__=="__main__":
    unittest.main()
