"""WAL must be initialized once, not re-requested for every writer.

Run in the original curadoria-local environment:
  python teste_sqlite_wal_open.py
"""
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch

import smart_curadoria as smart
import tonart_curadoria as host


def exercise(label, module, open_writer):
    with tempfile.TemporaryDirectory(prefix="tonart-wal-policy-") as folder:
        path = Path(folder) / "curadoria.sqlite3"
        original = module.ManagedConnection.execute
        statements = []

        def track(self, sql, *args, **kwargs):
            statements.append(str(sql).strip().upper().replace(" ", ""))
            return original(self, sql, *args, **kwargs)

        with patch.object(module.ManagedConnection, "execute", track):
            with open_writer(path) as db:
                db.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY)")
                db.execute("INSERT INTO sample(id) VALUES(1)")
                db.commit()
            assert statements.count("PRAGMAJOURNAL_MODE=WAL") == 1, (label, statements)
            assert sqlite3.connect(path).execute("PRAGMA journal_mode").fetchone()[0] == "wal"
            statements.clear()

            # Keeping a read snapshot open must not provoke a redundant
            # journal-mode setter when another connection opens for writing.
            reader = sqlite3.connect(path, timeout=5)
            try:
                reader.execute("BEGIN")
                assert reader.execute("SELECT count(*) FROM sample").fetchone()[0] == 1
                with open_writer(path) as writer:
                    writer.execute("INSERT INTO sample(id) VALUES(2)")
                    writer.commit()
                assert not any(stmt == "PRAGMAJOURNAL_MODE=WAL" for stmt in statements), (
                    label, statements
                )
                assert reader.execute("SELECT count(*) FROM sample").fetchone()[0] == 1
                reader.rollback()
                assert reader.execute("SELECT count(*) FROM sample").fetchone()[0] == 2
            finally:
                reader.close()
            assert sqlite3.connect(path).execute("PRAGMA quick_check(1)").fetchone()[0] == "ok"

    print(label, "WAL initialized once; concurrent reader+writer and integrity OK")


exercise("smart_curadoria.db_open", smart, lambda path: smart.db_open(path))
exercise("tonart_curadoria.connect", host, lambda path: host.connect(path))
print("SQLITE WAL CONNECTION POLICY TESTS OK")
