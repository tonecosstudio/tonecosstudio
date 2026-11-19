#!/usr/bin/env python3
"""E2E offline. Nao utiliza Telegram, backend publico nem credenciais."""
from __future__ import annotations
import csv
import hashlib
import importlib.util
import sqlite3
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("preparar-publicacao-curadoria-telegram.py")
spec = importlib.util.spec_from_file_location("staging", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def save_csv(path, columns, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows(rows)

def fixture(db_path, source):
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE assets(
          message_id INTEGER PRIMARY KEY, sha256 TEXT, source_relative TEXT,
          original_topic TEXT, source_date TEXT);
        CREATE TABLE annotations(
          message_id INTEGER PRIMARY KEY, status TEXT, model TEXT);
        CREATE TABLE name_proposals(
          message_id INTEGER PRIMARY KEY, status TEXT,studio TEXT,title TEXT,
          universe TEXT,variant TEXT,filename TEXT,official_url TEXT);
    """)
    inputs = [
        (1, "SaltSculpt", "Fern", "aprovado", "confirmado", "A"),
        (2, "Maker", "Shared", "aprovado", "confirmado", "B"),
        (3, "Studio-C", "Existing Model", "aprovado", "confirmado", "C"),
        (4, "Studio-D", "Not Ready", "pendente", "provavel", "D"),
        (5, "Studio-E", "No Rights", "aprovado", "confirmado", "E"),
        (6, "Studio-F", "Bad Rights Hash", "aprovado", "confirmado", "F"),
        (7, "Studio-G", "Path Traversal", "aprovado", "confirmado", "G"),
    ]
    hashes = {}
    for mid, studio, title, approved, proposal, content in inputs:
        data = ("fixture-" + content).encode()
        digest = hashlib.sha256(data).hexdigest()
        hashes[mid] = digest
        rel = f"{studio}/msg_{mid}.jpg" if mid != 7 else "../secret.jpg"
        if mid != 7:
            path = source / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        conn.execute("INSERT INTO assets VALUES (?,?,?,?,?)",
                     (mid, digest, rel, studio, "2026-11-19"))
        conn.execute("INSERT INTO annotations VALUES (?,?,?)",
                     (mid, approved, title))
        conn.execute("INSERT INTO name_proposals VALUES (?,?,?,?,?,?,?,?)",
                     (mid, proposal, studio, title, "", "",
                      title.lower().replace(" ", "-") + ".jpg", ""))
    conn.commit()
    conn.close()
    return hashes


def test():
    with tempfile.TemporaryDirectory(prefix="tonart-staging-") as temp:
        root = Path(temp)
        source = root / "telegram"
        source.mkdir()
        db = root / "curadoria.sqlite3"
        hashes = fixture(db, source)
        original_bytes = (source / "SaltSculpt" / "msg_1.jpg").read_bytes()
        catalog = root / "existing.csv"
        save_csv(catalog, ["sha256", "studio", "model", "model_id"], [
            {"sha256": hashes[2], "studio": "Maker", "model": "Shared", "model_id": "model-2"},
            {"sha256": hashlib.sha256(b"different").hexdigest(),
             "studio": "Studio-C", "model": "Existing Model", "model_id": "model-3"},
        ])
        rights = root / "rights.csv"
        save_csv(rights, ["message_id","sha256","public_use_authorized","evidence_url"], [
            {"message_id": mid, "sha256": (hashes[mid] if mid != 6 else "0" * 64),
             "public_use_authorized": "sim",
             "evidence_url": f"https://example.org/rights/{mid}"}
            for mid in (1, 2, 3, 6, 7)
        ])
        records, summary = m.build_plan(db, source, catalog, rights)
        by_id = {r["message_id"]: r for r in records}
        assert by_id[1]["action"] == "stage_new_asset", by_id[1]
        assert by_id[2]["action"] == "reuse_existing_asset"
        assert by_id[2]["existing_model_id"] == "model-2"
        assert by_id[3]["action"] == "review_existing_model"
        assert by_id[4]["reason"] == "name_or_model_not_approved"
        assert by_id[5]["reason"] == "rights_not_attested"
        assert by_id[6]["reason"] == "rights_not_attested"
        assert by_id[7]["reason"] == "source_missing_or_invalid"
        assert summary["publish_performed"] is False
        held, summary_no_index = m.build_plan(db, source, None, rights)
        assert all(r["action"] == "hold" for r in held)
        out = root / "output"
        m.ensure_private_output(out.resolve(), source.resolve())
        m.write_plan(out, records, summary)
        assert (out / "decisoes.csv").exists()
        eligible = (out / "lote_elegivel.jsonl").read_text(encoding="utf-8").splitlines()
        assert len(eligible) == 2
        assert len((out / "resumo.json").read_text(encoding="utf-8")) > 10
        assert (source / "SaltSculpt" / "msg_1.jpg").read_bytes() == original_bytes
        bad = source / "nested"
        bad.mkdir()
        try:
            m.ensure_private_output(bad.resolve(), source.resolve())
        except ValueError:
            pass
        else:
            raise AssertionError("Staging dentro do Telegram deveria falhar")
        assert not any(x.suffix == ".webp" for x in out.iterdir())
    print("E2E APROVADO: aprovado/direitos, SHA, duplicatas, colisao de modelo, path traversal, sem escrita externa")


if __name__ == "__main__":
    test()
