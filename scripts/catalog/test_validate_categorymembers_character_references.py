"""Offline checks for category-verified characters and non-automatic aliases."""
import importlib.util
import pathlib
import unittest

FILE=pathlib.Path(__file__).with_name("validate-categorymembers-character-references.py")
S=importlib.util.spec_from_file_location("tonart_seiya_roster",FILE)
module=importlib.util.module_from_spec(S)
S.loader.exec_module(module)


class SaintSeiyaCategoryTests(unittest.TestCase):
    def setUp(self):
        self.index={
            "pegasus-seiya":[{"id":11,"title":"Pegasus Seiya"}],
            "cygnus-hyoga":[{"id":22,"title":"Cygnus Hyoga"}],
            "aquarius-hyoga":[{"id":23,"title":"Aquarius Hyoga"}],
            "gemini-kanon":[{"id":31,"title":"Gemini Kanon"}],
            "sea-dragon-kanon":[{"id":32,"title":"Sea Dragon Kanon"}],
            "saori-kido":[{"id":41,"title":"Saori Kido"}],
            "poseidon":[{"id":51,"title":"Poseidon"}],
        }
        self.sources={"Category:Characters":{"rows":700,"sha256":"a"*64,"pages":2}}

    def row(self,name,flags=""):
        return {"display_name_candidate":name,"review_flags":flags}

    def test_exact_full_name_deduplicates_source_and_no_links(self):
        good,held,alias=module.decide([
            self.row("Pegasus Seiya"),self.row("Saori Kido"),self.row("Poseidon")
        ],self.index,self.sources)
        self.assertEqual(len(good),3)
        self.assertFalse(held)
        self.assertFalse(alias)
        self.assertTrue(all(row["linked_models"]==[] and
                            not row["public_approved"] for row in good))

    def test_short_names_never_auto_promoted(self):
        good,held,alias=module.decide([
            self.row("Seiya"),self.row("Hyoga"),self.row("Kanon")
        ],self.index,self.sources)
        self.assertEqual(len(good),0)
        self.assertFalse(held)
        self.assertEqual(len(alias),3)
        self.assertTrue(all(a["status"]=="manual_alias_review_required" for a in alias))
        self.assertEqual(len(next(x for x in alias if x["candidate"]=="Kanon")["candidates"]),2)

    def test_variant_and_noncharacter_do_not_make_identities(self):
        good,held,alias=module.decide([
            self.row("Pegasus Seiya Gear 5","potential_variant"),
            self.row("Gemini Helmet"),
            self.row("Saori Kido","fanmade"),
        ],self.index,self.sources)
        self.assertFalse(good)
        self.assertFalse(alias)
        self.assertEqual(len(held),3)

    def test_incomplete_reference_fails(self):
        good,held,alias=module.decide([self.row("Seiya")],{"seiya":[]},self.sources)
        self.assertFalse(good)
        self.assertEqual(held[0]["reason"],"no_exact_reference")
        self.assertFalse(alias)
        with self.assertRaises(ValueError):
            module.get_complete_category("Category:Other")


if __name__=="__main__":
    unittest.main()
