"""Targeted tests for read-only TONART canonical taxonomy inventory."""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("prepare-canonical-taxonomy.py")
spec = importlib.util.spec_from_file_location("tonart_taxonomy_inventory", MODULE_PATH)
assert spec and spec.loader
inventory_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory_module)


class TaxonomyInventoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.db_file = self.root / "curadoria.sqlite3"
        db = sqlite3.connect(self.db_file)
        try:
            db.executescript(
                "CREATE TABLE model_groups (group_key TEXT,studio TEXT,title TEXT,universe TEXT,state TEXT);"
                "CREATE TABLE name_proposals (message_id TEXT,studio TEXT,title TEXT,universe TEXT,status TEXT);"
                "INSERT INTO model_groups VALUES"
                "('g1','Studio 1','Pikachu','Pokémon','provavel'),"
                "('g2','Studio 2','Pikachu','Pokemon','provavel'),"
                "('g3','Studio 3','Ace','One Piece','provavel'),"
                "('g4','Studio 4','Ace','Another World','revisar'),"
                "('g5','Studio 4','Ace e Luffy','One Piece','revisar'),"
                "('g6','Studio 5','Modelo sem nome #123','One Piece','revisar'),"
                "('g7','Studio 5','Unidentified','','revisar');"
                "INSERT INTO name_proposals VALUES"
                "('1','Studio 1','Pikachu','Pokémon','confirmado'),"
                "('2','Studio 3','Ace','One Piece','provavel'),"
                "('3','Geral +50k','','','revisar');"
            )
            db.execute("ALTER TABLE name_proposals ADD COLUMN evidence_type TEXT DEFAULT ''")
            db.execute("ALTER TABLE name_proposals ADD COLUMN official_url TEXT DEFAULT ''")
            db.commit()
        finally:
            db.close()
        self.legacy = self.root / "legacy.csv"
        with self.legacy.open("w", encoding="utf8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["model_id", "model"])
            writer.writeheader()
            writer.writerows([
                {"model_id": "mdl_ace", "model": "Ace"},
                {"model_id": "mdl_pikachu", "model": "Pikachu"},
                {"model_id": "mdl_none", "model": "Unknown model"},
                {"model_id": "mdl_ace", "model": "Ace"},  # repeated image row
            ])
        self.plan = self.root / "historic-plan.jsonl"
        self.plan.write_text(
            json.dumps({"import_manifest": {"universe": "Pokémon", "franchiseId": 57}}) + "\n" +
            json.dumps({"import_manifest": {"universe": "One Piece", "franchiseId": 51}}) + "\n",
            encoding="utf8"
        )

    def test_normalizes_accent_without_merging_franchises(self):
        self.assertEqual(inventory_module.key("POKÉMON"), inventory_module.key("pokemon"))
        self.assertNotEqual(inventory_module.key("One Piece"), inventory_module.key("Another World"))
        self.assertEqual(inventory_module.slug("Pokémon"), "pokemon")
        self.assertTrue(inventory_module.is_placeholder("Modelo sem nome #123"))
        self.assertIn(
            "potential_multiple_characters",
            inventory_module.title_needs_review("Ace e Luffy")
        )

    def test_reports_candidates_without_assigning_identity_or_mutating_source(self):
        before = hashlib.sha256(self.db_file.read_bytes()).hexdigest()
        summary, worlds, aliases, characters, legacy = inventory_module.inventory(
            self.db_file, self.legacy, self.plan
        )
        after = hashlib.sha256(self.db_file.read_bytes()).hexdigest()
        self.assertEqual(before, after)
        self.assertEqual(summary["universe_candidates"], 3)
        self.assertEqual(summary["historic_legacy_unique_models"], 3)
        self.assertEqual(summary["historic_legacy_ambiguous_names"], 1)
        self.assertEqual(summary["historic_plan_rows_with_universe"], 2)
        self.assertEqual(summary["name_proposal_status_counts"]["confirmado"], 1)
        self.assertEqual(len(aliases), 1)
        self.assertEqual(aliases[0]["canonical_candidate"], "Pokémon")
        self.assertEqual([x for x in worlds if x["candidate_key"] == "pokemon"][0]["historic_d1_franchise_id_hint"], 57)
        chars = {x["candidate_key"]: x for x in characters}
        self.assertIn("one piece::ace", chars)
        self.assertIn("another world::ace", chars)
        self.assertIn("pokemon::pikachu", chars)
        self.assertNotIn("one piece::modelo sem nome #123", chars)
        self.assertIn("potential_multiple_characters", chars["one piece::ace e luffy"]["review_flags"])
        self.assertIsNone(chars["pokemon::pikachu"]["identity_id"])
        self.assertEqual(
            next(x for x in legacy if x["model_id"] == "mdl_ace")["matched_world_candidates"],
            ["another world", "one piece"]
        )
        self.assertTrue(all(x["review_state"].startswith("not_linked") for x in legacy))

    def test_conflicting_source_ids_and_slug_collisions_require_review(self):
        db = sqlite3.connect(self.db_file)
        try:
            db.executemany(
                "INSERT INTO model_groups VALUES (?,?,?,?,?)",
                [
                    ("g8", "Studio 1", "Kafka", "Honkai: Star Rail", "provavel"),
                    ("g9", "Studio 2", "Kafka", "Honkai Star Rail", "provavel"),
                    ("g10", "Studio 1", "Crossover", "Pokémon/Dragon Ball", "revisar"),
                ],
            )
            db.commit()
        finally:
            db.close()
        with self.plan.open("a", encoding="utf8") as f:
            for name in ("Honkai: Star Rail", "Honkai Star Rail"):
                f.write(json.dumps({"import_manifest": {"universe": name, "franchiseId": 176}}) + "\n")
        summary, worlds, aliases, chars, _ = inventory_module.inventory(
            self.db_file, self.legacy, self.plan
        )
        star_rail = [x for x in worlds if x["historic_d1_franchise_id_hint"] == 176]
        self.assertEqual(len(star_rail), 2)
        self.assertTrue(all(x["reconciliation_status"] == "conflict_requires_review" for x in star_rail))
        self.assertTrue(all("id_shared_by_multiple_spellings" in x["review_flags"] for x in star_rail))
        self.assertTrue(all("slug_collision" in x["review_flags"] for x in star_rail))
        crossover = next(x for x in worlds if x["label_candidate"] == "Pokémon/Dragon Ball")
        self.assertIn("possible_multiple_franchises", crossover["review_flags"])
        self.assertIsNone(crossover["historic_d1_franchise_id_hint"])
        self.assertGreaterEqual(summary["universe_slug_collision_groups"], 1)
        self.assertGreaterEqual(summary["universe_historic_id_shared_groups"], 1)
        self.assertEqual(summary["distinct_historic_d1_id_hints"], 3)
        self.assertTrue(all(x["identity_id"] is None for x in chars))

    def test_marketing_title_is_not_mistaken_for_confirmed_character(self):
        db = sqlite3.connect(self.db_file)
        try:
            db.execute(
                "INSERT INTO model_groups VALUES (?,?,?,?,?)",
                ("g8", "Studio C", "Frosty", "Star Wars", "provavel"),
            )
            db.execute(
                "INSERT INTO name_proposals "
                "(message_id,studio,title,universe,status,evidence_type,official_url) "
                "VALUES (?,?,?,?,?,?,?)",
                ("4", "Studio C", "Frosty", "Star Wars", "confirmado",
                 "telegram_caption",
                 "https://c27-studios.com/product/frosty-wampa-3d-printing-miniature-stl/"),
            )
            db.commit()
        finally:
            db.close()
        _, _, _, chars, _ = inventory_module.inventory(
            self.db_file, self.legacy, self.plan
        )
        candidate = next(c for c in chars if c["candidate_key"] == "star wars::frosty")
        self.assertIn("source_product_title_has_additional_terms", candidate["review_flags"])
        self.assertIn("name_inherited_or_caption_only", candidate["review_flags"])
        self.assertEqual(candidate["review_priority"], "P3_review_flags_or_low_evidence")
        self.assertIsNone(candidate["identity_id"])
        self.assertEqual(candidate["confirmed_naming_messages"], 1)
        self.assertIn(
            "possibly_model_variant_not_character",
            inventory_module.title_needs_review("Chun-Li Bikini"),
        )
        self.assertNotIn(
            "source_link_does_not_contain_character_title",
            inventory_module.evidence_review_flags(
                "Cammy",
                {"https://www.zbrushcentral.com/t/cammy-3d-print-figure/406980"},
                {},
            ),
        )

    def test_cli_creates_review_artifacts_without_editing_curation(self):
        out = self.root / "output"
        original = hashlib.sha256(self.db_file.read_bytes()).hexdigest()
        result = subprocess.run([
            sys.executable, str(MODULE_PATH), "--curation-db", str(self.db_file),
            "--legacy-inventory", str(self.legacy), "--telegram-plan", str(self.plan),
            "--out", str(out),
        ], capture_output=True, text=True, check=True)
        summary = json.loads(result.stdout)
        self.assertEqual(summary["mode"], "read_only_candidate_inventory")
        self.assertTrue(summary["no_canonical_entities_inserted"])
        self.assertFalse(summary["d1_consulted"])
        self.assertFalse(summary["model_links_modified"])
        self.assertEqual(hashlib.sha256(self.db_file.read_bytes()).hexdigest(), original)
        for name in [
            "universos-candidatos.jsonl", "aliases-para-revisao.jsonl",
            "personagens-candidatos.jsonl", "catalogo-antigo-sem-vinculos.jsonl",
            "resumo.json", "fila-revisao-personagens.csv",
            "fila-reconciliacao-franquias.csv", "conflitos-universos.jsonl",
        ]:
            self.assertTrue((out / name).exists(), name)
        with (out / "fila-revisao-personagens.csv").open(
            encoding="utf-8-sig", newline=""
        ) as f:
            reader = csv.DictReader(f)
            self.assertIn("confirmed_evidence_types", reader.fieldnames)
            self.assertIn("confirmed_source_url_examples", reader.fieldnames)
            first = next(reader)
            self.assertIn("review_priority", first)
        with (out / "catalogo-antigo-sem-vinculos.jsonl").open(encoding="utf8") as f:
            self.assertEqual(sum(1 for _ in f), 3)


if __name__ == "__main__":
    unittest.main()
