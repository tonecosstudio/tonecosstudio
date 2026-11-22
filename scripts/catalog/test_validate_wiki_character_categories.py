"""No-network tests for Warcraft and fandom exact-title, category-based curation."""
import csv
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

P=pathlib.Path(__file__).parent
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,P/file)
 m=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(m)
 return m
wow=module("tonart_warcraft","validate-warcraft-character-reference.py")
fans=module("tonart_fandom","validate-fandom-character-categories.py")


class WikiCategoryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.addCleanup(self.tmp.cleanup)
  self.root=pathlib.Path(self.tmp.name)

 def test_warcraft_character_vs_weapon_and_page_missing(self):
  names=["Alexstrasza","Frostmourne","No Character"]
  doc={"query":{"pages":{
   "123":{"title":"Alexstrasza","pageid":123,
          "categories":[{"title":"Category:Dragon characters"},{"title":"Category:NPCs"}]},
   "124":{"title":"Frostmourne","pageid":124,
          "categories":[{"title":"Category:Artifact weapons"}]},
   "-1":{"title":"No Character","missing":True}
  }}}
  a,h=wow.evaluate(names,doc,"a"*64,"https://warcraft.wiki.gg/api.php")
  self.assertEqual(len(a),1)
  self.assertEqual(len(h),2)
  self.assertEqual(a[0]["character_name"],"Alexstrasza")
  self.assertTrue(a[0]["approved_for_publication"] is False)
  self.assertEqual(a[0]["model_links_created"],0)
  self.assertEqual({x["reason"] for x in h},{"not_a_character_category","wiki_page_missing"})

 def test_fandom_character_requires_page_and_character_category(self):
  titles=["Izuku Midoriya","U.A. High School","Izuku Hero Costume"]
  pages=[
   {"pageid":1,"title":"Izuku Midoriya",
    "categories":[{"title":"Category:Characters"},{"title":"Category:Students"}]},
   {"pageid":2,"title":"U.A. High School",
    "categories":[{"title":"Category:Locations"}]},
   {"pageid":3,"title":"Izuku Hero Costume",
    "categories":[{"title":"Category:Equipment"}]},
  ]
  a,h=fans.decide_pages(titles,pages,"b"*64,
      "https://myheroacademia.fandom.com/api.php","My Hero Academia")
  self.assertEqual(len(a),1)
  self.assertEqual(a[0]["character_name"],"Izuku Midoriya")
  self.assertEqual(len(h),2)
  self.assertTrue(all(x["reason"]=="no_character_category" for x in h))

 def test_fanmade_character_is_held_despite_character_tag(self):
  a,h=fans.decide_pages(["Fan OC"],[
   {"pageid":5,"title":"Fan OC",
    "categories":[{"title":"Category:Fan characters"},{"title":"Category:Characters"}]}
  ],"c"*64,"https://bleach.fandom.com/api.php","Bleach")
  self.assertFalse(a)
  self.assertEqual(h[0]["reason"],"disallowed_fan_page")

 def test_fandom_script_does_not_write_external_databases(self):
  q=self.root/"queue.csv"
  with q.open("w",encoding="utf8",newline="") as f:
   w=csv.DictWriter(f,fieldnames=[
    "franchise_candidate_key","display_name_candidate","review_flags"])
   w.writeheader()
   w.writerow({"franchise_candidate_key":"bleach",
               "display_name_candidate":"Ichigo Kurosaki","review_flags":""})
  out=self.root/"out"
  old=dict(fans.WORLDS)
  try:
   fans.WORLDS.clear()
   fans.WORLDS["bleach"]=("bleach","Bleach")
   with patch.object(fans,"get_category_batch",return_value=(
    [{"pageid":123,"title":"Ichigo Kurosaki",
      "categories":[{"title":"Category:Characters"}]}],
    "a"*64,"https://bleach.fandom.com/api.php",0
   )),patch.object(fans.time,"sleep",return_value=None):
    rc=fans.run(SimpleNamespace(queue=q,out=out))
  finally:
   fans.WORLDS.clear()
   fans.WORLDS.update(old)
  self.assertEqual(rc,0)
  m=json.loads((out/"fandom-characters-manifest.json").read_text("utf8"))
  self.assertEqual(m["verified_unique"],1)
  self.assertTrue(m["no_canonical_writes"])
  self.assertTrue(m["no_model_links"])
  s=json.loads((out/"fandom-character-supervised.json").read_text("utf8"))
  self.assertEqual(s["status"],"completed")
  self.assertTrue((out/"fandom-characters-exact-private.jsonl").exists())


if __name__=="__main__":
 unittest.main()
