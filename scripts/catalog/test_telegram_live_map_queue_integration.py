"""Contract tests: append source-attested public ID to the existing studio queue."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "tonart_studio_queue", HERE / "build-telegram-studio-closure-queue.py"
)
queue = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(queue)


class MapIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = pathlib.Path(self.temp.name)
        self.key = "a" * 24
        self.sha = "b" * 64
        self.local_row = {
            "studio": "Original Studio", "group_key": self.key,
            "source_title": "Eevee", "source_universe": "Pokémon",
            "model_variant": "", "source_state": "provavel",
            "source_revision": 4, "decision": "review_exact_name_not_visual_verified",
            "character_identity_id": "11111111-1111-4111-8111-111111111111",
            "tag_preview": {"character": "Eevee", "franchise": "Pokémon"},
            "rename_proposal": None, "source_evidence_types": [],
            "visual_evidence_urls": [], "confirmed_member_proposals": 0,
        }
        self.public_row = {
            "studio": "Original Studio", "group_key": self.key,
            "source_title": "Eevee", "source_revision": 4,
            "message_ids": [777], "source_shas": [self.sha],
            "status": "verified_public_id_and_source_sha",
            "verified_source_sha": self.sha,
            "source_file_verified": True,
            "public_model_id": "tg_" + self.key,
        }

    def test_attested_public_id_does_not_count_as_character_link(self):
        entries, studios = queue.classify_rows(
            [self.local_row], {self.key: [777]},
            {self.key: self.public_row},
        )
        self.assertEqual(entries[0]["catalog_model_id_verified"], "yes")
        self.assertEqual(entries[0]["catalog_model_id"], "tg_" + self.key)
        self.assertEqual(entries[0]["verified_source_sha256"], self.sha)
        self.assertEqual(entries[0]["model_link_applied"], "no")
        self.assertEqual(entries[0]["tags_applied"], "no")
        self.assertEqual(studios[0]["catalog_model_ids_verified"], 1)
        self.assertEqual(studios[0]["closure_status"],
                         "pending_evidence_and_catalog_owner")

    def test_public_map_revision_and_title_must_match_current_sqlite(self):
        falsified = {**self.public_row, "source_revision": 1}
        with self.assertRaisesRegex(ValueError, "current Telegram group"):
            queue.classify_rows(
                [self.local_row], {self.key: [777]}, {self.key: falsified}
            )
        falsified = {**self.public_row, "source_title": "other"}
        with self.assertRaisesRegex(ValueError, "current Telegram group"):
            queue.classify_rows(
                [self.local_row], {self.key: [777]}, {self.key: falsified}
            )

    def write_map(self, override=None):
        item = {**self.public_row, **(override or {})}
        report = self.folder / "telegram-public-model-map-private.jsonl"
        report.write_text(json.dumps(item) + "\n", encoding="utf8")
        manifest = {
            "schema": "tonart.telegram-studio-public-physical-map/1",
            "telegram_sqlite_sha256": "c" * 64,
            "public_map_jsonl_sha256": queue.canonical.file_digest(report),
            "groups_processed": 1,
            "no_sqlite_writes": True, "no_d1_writes": True,
            "no_model_links_or_tags_applied": True,
        }
        (self.folder / "telegram-public-map-manifest.json").write_text(
            json.dumps(manifest), encoding="utf8"
        )
        return report

    def test_hash_checked_and_wrong_source_rejected(self):
        report = self.write_map()
        data, manifest = queue.load_public_mapping(
            self.folder, sqlite_sha256="c" * 64
        )
        self.assertEqual(data[self.key]["public_model_id"], "tg_" + self.key)
        self.assertEqual(manifest["groups_processed"], 1)
        with self.assertRaisesRegex(ValueError, "source or integrity policy"):
            queue.load_public_mapping(
                self.folder, sqlite_sha256="d" * 64
            )
        report.write_text(report.read_text("utf8") + " ", encoding="utf8")
        with self.assertRaisesRegex(ValueError, "content hash mismatch"):
            queue.load_public_mapping(
                self.folder, sqlite_sha256="c" * 64
            )

    def test_fabricated_public_id_is_rejected_even_with_valid_hash(self):
        self.write_map({"public_model_id": "tg_" + "f" * 24})
        with self.assertRaisesRegex(ValueError, "fabricated"):
            queue.load_public_mapping(
                self.folder, sqlite_sha256="c" * 64
            )


if __name__ == "__main__":
    unittest.main()
