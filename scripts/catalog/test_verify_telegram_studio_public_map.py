"""Offline tests for real public-ID and local-source-SHA reconciliation."""
import importlib.util
import json
import pathlib
import sqlite3
import tempfile
import types
import unittest
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "tonart_live_ids", HERE / "verify-telegram-studio-public-map.py"
)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class RealIdTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = pathlib.Path(self.temp.name)
        self.db = self.dir / "local.sqlite3"
        self.media = self.dir / "telegram"
        self.media.mkdir()
        self.studio = "Original Studio"
        self.key = "a" * 24
        self.body = b"original-image-file-byte-content"
        original = self.media / "model.jpg"
        original.write_bytes(self.body)
        self.digest = audit.sha256(original)
        db = sqlite3.connect(self.db)
        db.executescript("""
            CREATE TABLE model_groups(
                group_key TEXT PRIMARY KEY, studio TEXT, title TEXT,
                variant TEXT, state TEXT, revision INTEGER
            );
            CREATE TABLE model_group_members(group_key TEXT, message_id INTEGER);
            CREATE TABLE assets(
                message_id INTEGER PRIMARY KEY,
                sha256 TEXT, source_relative TEXT
            );
        """)
        db.execute("INSERT INTO model_groups VALUES(?,?,?,?,?,?)",
                   (self.key, self.studio, "Eevee", "", "provavel", 0))
        db.execute("INSERT INTO model_group_members VALUES(?,?)",
                   (self.key, 37))
        db.execute("INSERT INTO assets VALUES(?,?,?)",
                   (37, self.digest, "model.jpg"))
        db.commit()
        db.close()
        self.model = {
            "id": "tg_" + self.key,
            "studio": self.studio, "name": "Eevee", "provisional": True,
            "cover": "/api/telegram-studios/tg_" + self.key +
            "/media/" + self.digest + "/thumb",
            "imageCount": 1,
            "franchise": "Pokémon", "franchiseSlug": "pokemon",
        }

    def test_exact_real_id_and_source_digest_are_required(self):
        groups = audit.local_groups(self.db)
        rows, public_only = audit.reconcile(groups, [self.model], self.media)
        self.assertEqual(len(rows), 1)
        self.assertEqual(public_only, [])
        self.assertEqual(rows[0]["status"],
                         "verified_public_id_and_source_sha")
        self.assertEqual(rows[0]["public_model_id"], "tg_" + self.key)
        self.assertFalse(rows[0]["publishing_authorized"])
        self.assertFalse(rows[0]["model_character_verified"])
        self.assertEqual(rows[0]["tag_writes"], 0)

    def test_name_match_does_not_override_wrong_media_or_missing_record(self):
        groups = audit.local_groups(self.db)
        bad = {**self.model, "cover": self.model["cover"].replace(
            self.digest, "f" * 64
        )}
        rows, _ = audit.reconcile(groups, [bad], self.media)
        self.assertEqual(rows[0]["status"], "hold_public_cover_sha_unmatched")
        self.assertIsNone(rows[0].get("verified_source_sha"))
        rows, _ = audit.reconcile(groups, [], self.media)
        self.assertEqual(rows[0]["status"], "hold_public_model_not_visible")
        self.assertIsNone(rows[0]["public_model_id"])

    def test_local_source_tamper_rejected_and_public_only_is_not_assumed(self):
        groups = audit.local_groups(self.db)
        (self.media / "model.jpg").write_bytes(b"tampered")
        rows, _ = audit.reconcile(groups, [self.model], self.media)
        self.assertEqual(rows[0]["status"],
                         "hold_local_media_missing_or_corrupt")
        (self.media / "model.jpg").write_bytes(self.body)
        extras = [{**self.model, "id": "tg_" + "b" * 24,
                   "cover": self.model["cover"].replace(
                       "tg_" + self.key, "tg_" + "b" * 24
                   )}]
        rows, public_only = audit.reconcile(groups, extras, self.media)
        self.assertEqual(rows[0]["status"], "hold_public_model_not_visible")
        self.assertEqual(len(public_only), 1)

    def test_run_is_readonly_idempotent_and_writes_only_derived_reports(self):
        calls = []
        def fake(path):
            calls.append(path)
            if path.endswith("/studios"):
                return {"studios": [{"studio": self.studio, "total": 1}]}
            return {"total": 1, "items": [self.model]}
        args = types.SimpleNamespace(
            sqlite=self.db, source_root=self.media, out=self.dir / "out",
            only_studio=[self.studio], cache_age_seconds=1800
        )
        old_digest = audit.sha256(self.db)
        result = audit.run(args, fetch=fake)
        self.assertEqual(result["verified_public_ids"], 1)
        self.assertEqual(result["no_sqlite_writes"], True)
        self.assertEqual(audit.sha256(self.db), old_digest)
        self.assertEqual(len(calls), 2)
        result2 = audit.run(args, fetch=fake)
        self.assertEqual(result2["cache_studios_reused"], 1)
        self.assertEqual(len(calls), 3)
        self.assertEqual(audit.sha256(self.db), old_digest)
        self.assertIn('"status": "verified_public_id_and_source_sha"',
                      (args.out / "telegram-public-model-map-private.jsonl")
                      .read_text("utf8"))

    def test_same_named_public_sculpture_is_only_an_unsafe_candidate(self):
        rows = [
            {"studio": "Original Studio", "source_title": "Eevee",
             "status": "verified_public_id_and_source_sha",
             "public_title": "Eevee", "public_model_id": "tg_" + self.key},
            {"studio": "Original Studio", "source_title": "Eevee",
             "status": "hold_public_model_not_visible",
             "public_title": None, "public_model_id": None},
            {"studio": "Another Studio", "source_title": "Eevee",
             "status": "hold_public_model_not_visible",
             "public_title": None, "public_model_id": None},
        ]
        audit.annotate_same_title_candidates(rows)
        self.assertEqual(rows[1]["same_title_visible_public_id_candidates"],
                         ["tg_" + self.key])
        self.assertEqual(rows[2]["same_title_visible_public_id_candidates"], [])
        self.assertIsNone(rows[1]["public_model_id"])
        self.assertTrue(rows[1]["same_title_not_identity_proof"])

    def test_invalid_public_query_and_directory_are_fail_closed(self):
        with self.assertRaises(ValueError):
            audit.public_directory(
                lambda _: {"studios": [{"studio": "X", "total": 2},
                                       {"studio": "X", "total": 2}]}
            )
        with self.assertRaises(ValueError):
            audit.public_models(
                self.studio, 2,
                lambda _: {"total": 2, "items": [self.model]}
            )


if __name__ == "__main__":
    unittest.main()
