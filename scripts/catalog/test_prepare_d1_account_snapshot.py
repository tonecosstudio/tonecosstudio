import sqlite3
import unittest
from prepare_d1_account_snapshot import prepare, literal

class SnapshotTests(unittest.TestCase):
    def fixture(self):
        db = sqlite3.connect(":memory:")
        db.executescript("""
        PRAGMA foreign_keys=ON;
        CREATE TABLE franchises(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,slug TEXT);
        CREATE TABLE models(id TEXT PRIMARY KEY,franchise_id INTEGER REFERENCES franchises(id),search_text TEXT,media BLOB);
        CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY,name TEXT);
        CREATE VIRTUAL TABLE models_fts USING fts5(model_id UNINDEXED,search_text,tokenize='trigram');
        CREATE VIRTUAL TABLE franchises_fts USING fts5(franchise_id UNINDEXED,search_text,tokenize='trigram');
        INSERT INTO franchises VALUES(1,'Pokémon','pokemon');
        INSERT INTO franchises VALUES(8,'deleted','deleted');
        DELETE FROM franchises WHERE id=8;
        INSERT INTO models VALUES('m1',1,'Pokémon',X'0001FF');
        INSERT INTO models_fts SELECT id, search_text FROM models;
        INSERT INTO franchises_fts SELECT id,name || ' ' || slug FROM franchises;
        INSERT INTO d1_migrations VALUES(4,'004');
        CREATE INDEX model_franchise ON models(franchise_id);
        CREATE VIEW public_models AS SELECT id FROM models;
        CREATE TRIGGER models_fts_insert AFTER INSERT ON models BEGIN INSERT INTO models_fts VALUES(NEW.id,NEW.search_text); END;
        """)
        self.addCleanup(db.close)
        return db

    def test_roundtrip_and_sequence(self):
        db = self.fixture()
        sql, proof = prepare(db)
        self.assertTrue(proof["localRoundtripVerified"])
        self.assertFalse(proof["remoteImportVerified"])
        self.assertEqual(proof["rows"]["models"], 1)
        self.assertIn("VALUES('franchises',8)",sql)
        self.assertNotIn("CREATE TABLE 'models_fts_data'",sql)
        self.assertNotIn("writable_schema",sql)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM models").fetchone(),(1,))

    def test_stale_fts_rejected(self):
        db = self.fixture()
        db.execute("DELETE FROM models_fts")
        with self.assertRaisesRegex(ValueError,"content_roundtrip_mismatch"):
            prepare(db)

    def test_new_virtual_rejected(self):
        db = self.fixture()
        db.execute("CREATE VIRTUAL TABLE extra USING fts5(x)")
        with self.assertRaisesRegex(ValueError,"unexpected_virtual_tables"):
            prepare(db)

    def test_literals(self):
        db = self.fixture()
        for value in (None, 9223372036854775807, -1.25, "d'água", "x\x00y", b"\x00\xff"):
            self.assertEqual(db.execute("SELECT "+literal(value)).fetchone()[0],value)
        with self.assertRaises(ValueError): literal(float("inf"))

if __name__ == "__main__":
    unittest.main()
