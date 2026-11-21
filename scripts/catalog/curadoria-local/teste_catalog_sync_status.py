#!/usr/bin/env python3
"""Testes offline para comparação do site com a curadoria (sem credenciais)."""
from __future__ import annotations
import sqlite3
import tempfile
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import catalog_sync_status as sync


def item(i, variant=""):
    key = f"{i:024x}"
    return {
        "id": "tg_" + key,
        "studio": "Estudio Exemplo",
        "name": "Modelo " + str(i),
        "variant": variant,
        "imageCount": 1,
    }


class CatalogSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "curadoria.sqlite3"
        c = sqlite3.connect(self.db)
        try:
            c.execute("CREATE TABLE model_groups (group_key TEXT PRIMARY KEY, studio TEXT, title TEXT, variant TEXT, state TEXT)")
            c.executemany(
                "INSERT INTO model_groups VALUES (?,?,?,?,?)",
                [
                    (f"{0:024x}", "Estudio Exemplo", "Modelo 0", "", "provavel"),
                    (f"{1:024x}", "Estudio Exemplo", "Modelo 1", "Especial", "provavel"),
                    (f"{99:024x}", "Outro", "Apenas host", "", "revisar"),
                ],
            )
            c.commit()
        finally:
            c.close()

    def tearDown(self):
        self.temp.cleanup()

    def fake_fetch(self, url):
        q = parse_qs(urlparse(url).query)
        offset = int(q["offset"][0])
        n = 50
        return {"total": n, "offset": offset,
                "limit": 48, "items": [item(i) for i in range(offset, min(offset + 48, n))]}

    def test_exact_identity_comparison_is_read_only(self):
        result = sync.compare(self.db, self.fake_fetch)
        self.assertEqual(result["site_models"], 50)
        self.assertEqual(result["host_groups"], 3)
        self.assertEqual(result["matched"], 2)
        self.assertEqual(result["local_only_count"], 1)
        self.assertEqual(result["site_only_count"], 48)
        self.assertEqual(result["local_only_by_state"], {"revisar": 1})
        self.assertEqual(result["differences_count"], 1)
        self.assertEqual(result["differences"][0]["fields"], ["variant"])
        c = sqlite3.connect(self.db)
        try:
            self.assertEqual(c.execute("SELECT count(*) FROM model_groups").fetchone()[0], 3)
        finally:
            c.close()

    def test_rejects_incomplete_pagination(self):
        def incomplete(url):
            r = self.fake_fetch(url)
            if r["offset"] == 48:
                r["items"].pop()
            return r
        with self.assertRaisesRegex(RuntimeError, "incompleta"):
            sync.compare(self.db, incomplete)

    def test_rejects_duplicate_remote_identifiers(self):
        def duplicated(url):
            r = self.fake_fetch(url)
            if r["offset"] == 48:
                r["items"][0]["id"] = "tg_" + f"{0:024x}"
            return r
        with self.assertRaisesRegex(RuntimeError, "duplicada"):
            sync.compare(self.db, duplicated)

    def test_rejects_remote_inventory_change(self):
        def changing(url):
            r = self.fake_fetch(url)
            if r["offset"] == 48:
                r["total"] = 51
            return r
        with self.assertRaisesRegex(RuntimeError, "mudou"):
            sync.compare(self.db, changing)


if __name__ == "__main__":
    unittest.main()
