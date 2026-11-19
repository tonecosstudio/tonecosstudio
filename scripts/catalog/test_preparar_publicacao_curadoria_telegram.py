#!/usr/bin/env python3
"""E2E offline do preparador canônico: sem declarações, sem upload."""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

SCRIPT = Path(__file__).with_name("preparar-publicacao-curadoria-telegram.py")
spec = importlib.util.spec_from_file_location("catalog_staging", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def run():
    with tempfile.TemporaryDirectory(prefix="tonart-staging-") as tmp:
        home = Path(tmp)
        source = home / "telegram"
        source.mkdir()
        db = home / "curadoria.sqlite3"
        inventory = home / "existing.csv"
        data = [
            (1, "Sekai", "Goku vs Tao", "pendente", "confirmado", "embedded_render_title", 1.0),
            (2, "Sekai", "Goku vs Tao", "aprovado", "confirmado", "", 0.0),
            (3, "Example", "Outside", "aprovado", "confirmado", "", 0.0),
            (4, "Example", "Unconfirmed", "pendente", "provavel", "", 0.0),
            (5, "Existing", "Existing Model", "aprovado", "confirmado", "", 0.0),
            (6, "Known", "Identical", "aprovado", "confirmado", "", 0.0),
            (7, "Example", "Rejected", "rejeitado", "confirmado", "embedded_render_title", 1.0),
        ]
        hashes = {}
        with closing(sqlite3.connect(db)) as con:
            con.executescript("""
                CREATE TABLE assets(
                    message_id INTEGER PRIMARY KEY, sha256 TEXT, source_relative TEXT,
                    original_topic TEXT, source_date TEXT
                );
                CREATE TABLE annotations(
                    message_id INTEGER PRIMARY KEY, status TEXT, model TEXT
                );
                CREATE TABLE name_proposals(
                    message_id INTEGER PRIMARY KEY, status TEXT, studio TEXT, title TEXT,
                    universe TEXT, variant TEXT, filename TEXT, official_url TEXT,
                    evidence_type TEXT, confidence REAL
                );
                CREATE TABLE model_groups(
                    group_key TEXT PRIMARY KEY, state TEXT, studio TEXT, title TEXT
                );
                CREATE TABLE model_group_members(
                    message_id INTEGER PRIMARY KEY, group_key TEXT
                );
            """)
            con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                        ("one-sculpture", "confirmado", "Sekai", "Goku vs Tao"))
            for mid, studio, title, review, name_state, evidence, confidence in data:
                body = ("original-image-" + str(mid)).encode()
                digest = hashlib.sha256(body).hexdigest()
                hashes[mid] = digest
                relative = "../outside.jpg" if mid == 3 else f"{studio}/msg_{mid}.jpg"
                if mid != 3:
                    file = source / relative
                    file.parent.mkdir(exist_ok=True)
                    file.write_bytes(body)
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid, digest, relative, studio, "2026-11-19"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)", (mid, review, title))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid, name_state, studio, title, "", "", f"msg_{mid}.jpg",
                             f"https://example.org/model/{mid}" if evidence else "",
                             evidence, confidence))
                if mid in (1, 2):
                    con.execute("INSERT INTO model_group_members VALUES(?,?)",
                                (mid, "one-sculpture"))
            con.commit()

        with inventory.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=["model_id", "studio", "model", "sha256"])
            writer.writeheader()
            writer.writerow({"model_id": "model-5", "studio": "Existing",
                             "model": "Existing Model",
                             "sha256": hashlib.sha256(b"other-photo").hexdigest()})
            writer.writerow({"model_id": "model-6", "studio": "Known",
                             "model": "Identical", "sha256": hashes[6]})

        rows, summary = m.build_plan(db, source, inventory)
        by_id = {r["message_id"]: r for r in rows}
        assert by_id[1]["action"] == "stage_new_asset", by_id[1]
        assert by_id[2]["action"] == "stage_new_asset", by_id[2]
        assert by_id[3]["reason"] == "source_missing_or_invalid", by_id[3]
        assert by_id[4]["action"] == "hold", by_id[4]
        assert by_id[5]["action"] == "review_existing_model", by_id[5]
        assert by_id[6]["action"] == "reuse_existing_asset", by_id[6]
        assert by_id[6]["existing_model_id"] == "model-6"
        assert by_id[7]["reason"] == "image_rejected"
        assert summary["distinct_model_groups"] == 1
        assert not summary["external_writes"]

        out = home / "staging"
        m.write_plan(out, rows, summary)
        batches = [json.loads(line) for line in
                   (out / "lote_modelos_elegiveis.jsonl").read_text(encoding="utf-8").splitlines()]
        group = [b for b in batches if b["group_key"] == "one-sculpture"]
        assert len(group) == 1 and group[0]["message_ids"] == [1, 2], batches
        assert len(batches) == 2, batches
        assert len((out / "galerias_para_revisao.csv").read_text(encoding="utf-8").splitlines()) == 2

        with closing(sqlite3.connect(db)) as con:
            con.execute("UPDATE model_groups SET state='provavel'")
            con.commit()
        pending, _ = m.build_plan(db, source, inventory)
        assert all(x["reason"] == "model_group_not_confirmed"
                   for x in pending if x["message_id"] in (1, 2))

        with closing(sqlite3.connect(db)) as con:
            con.execute("UPDATE model_groups SET state='confirmado', title='Different sculpture'")
            con.commit()
        mismatch, _ = m.build_plan(db, source, inventory)
        assert all(x["reason"] == "group_identity_mismatch"
                   for x in mismatch if x["message_id"] in (1, 2))
        assert (source / "Sekai" / "msg_1.jpg").read_bytes() == b"original-image-1"
        assert not any(x.suffix == ".webp" for x in out.iterdir())
    print("E2E APROVADO: nomes, galerias, integridade, duplicatas e rejeicoes sem declaracoes")


if __name__ == "__main__":
    run()
