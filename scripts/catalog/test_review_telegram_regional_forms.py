"""Offline evidence checks: Pokémon forms share base character IDs; objects do not."""
import importlib.util
import pathlib
import unittest

HERE=pathlib.Path(__file__).parent
SPEC=importlib.util.spec_from_file_location(
    "tonart_pokemon_form_studio_review",HERE/"review-telegram-regional-forms.py")
worker=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)

IDS={
    ("pokemon","typhlosion"):{"id":"typhlosion-id","character":"Typhlosion","franchise":"Pokémon"},
    ("pokemon","growlithe"):{"id":"growlithe-id","character":"Growlithe","franchise":"Pokémon"},
    ("pokemon","raichu"):{"id":"raichu-id","character":"Raichu","franchise":"Pokémon"},
}


def row(title,review="hold_no_exact_character_identity"):
    return {"studio":"RinArtPoke","group_key":"abc123",
            "source_title":title,"source_universe":"Pokémon",
            "source_message_ids":"7001",
            "source_revision":"0","review_decision":review}


class RegionalFormTests(unittest.TestCase):
    def fake(self,url):
        species=url.rsplit("/",1)[-1]
        return ({
            "name":species,"species":{"name":species.rsplit("-",1)[0]},
            "id":12345,
        },"a"*64)

    def test_forms_reuse_base_identity_not_create_character(self):
        for title,expected in [
            ("Typhlosion Hisuian","typhlosion-id"),
            ("Growlithe (Hisuiano)","growlithe-id"),
            ("Raichu (Alola)","raichu-id"),
        ]:
            result=worker.resolve(row(title),IDS,get=self.fake)
            self.assertEqual(result["decision"],
                             "review_verified_form_parent_not_model_visual")
            self.assertEqual(result["character_identity_id"],expected)
            self.assertFalse(result["verified_model"])
            self.assertFalse(result["name_applied"])
            self.assertFalse(result["tags_applied"])
            self.assertFalse(result["catalog_model_id_verified"])
            self.assertTrue(result["source_url"].startswith(worker.POKE_BASE))

    def test_accessory_models_never_become_characters(self):
        for title in ["Pokéball",
                      "Pokébolas (Cherish Ball, GS Ball, Poké Ball, Hisuian Ball)",
                      "Pokébolas (Ultra Ball, Master Ball, Great Ball)"]:
            result=worker.resolve(row(title),IDS,get=lambda _:self.fail("no web for accessory"))
            self.assertEqual(result["decision"],"review_non_character_accessory")
            self.assertIsNone(result["character_identity_id"])
            self.assertIsNone(result["name_preview"])
            self.assertEqual(result["tags_preview"]["object_type"],"accessory")

    def test_source_conflict_does_not_change_parent_id(self):
        result=worker.resolve(row("Raichu (Alola)"),IDS,
            get=lambda _:({"name":"raichu-alola",
                           "id":444,"species":{"name":"pikachu"}},"b"*64))
        self.assertEqual(result["decision"],
                         "hold_form_does_not_match_parent_species")
        self.assertIsNone(result["character_identity_id"])
        self.assertFalse(result["verified_model"])

    def test_unverified_source_group_is_outside_form_review(self):
        self.assertIsNone(worker.resolve(
            row("Raichu (Alola)",review="hold_source_group_needs_review"),
            IDS,get=lambda _:self.fail("must not fetch")))
        self.assertIsNone(worker.resolve(
            row("Pikachu","hold_no_exact_character_identity"),IDS,
            get=lambda _:self.fail("must not fetch")))

    def test_unregistered_species_must_not_create_its_own_id(self):
        result=worker.resolve(row("Raichu (Alola)"),{},
            get=lambda _:self.fail("must not fetch"))
        self.assertEqual(result["decision"],
                         "hold_parent_species_not_registered")
        self.assertIsNone(result["character_identity_id"])


if __name__=="__main__":
    unittest.main()
