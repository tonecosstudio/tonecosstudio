#!/usr/bin/env python3
"""E2E offline. Nao utiliza Telegram, backend publico nem credenciais."""
from __future__ import annotations
import csv
from contextlib import closing
import hashlib
import json
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

        # A galeria revisada manda na identidade: duas vistas da mesma
        # escultura precisam produzir um unico lote de modelo, nao duas fichas.
        source_extra = source / "SaltSculpt" / "msg_8.jpg"
        source_extra.write_bytes(b"fixture-angle-two")
        hash_extra = hashlib.sha256(source_extra.read_bytes()).hexdigest()
        with closing(sqlite3.connect(db)) as conn:
            conn.executescript("""
                CREATE TABLE model_groups(
                    group_key TEXT PRIMARY KEY, state TEXT, studio TEXT, title TEXT);
                CREATE TABLE model_group_members(
                    message_id INTEGER PRIMARY KEY, group_key TEXT);
            """)
            conn.execute("INSERT INTO model_groups VALUES (?,?,?,?)",
                         ("gallery-fern", "confirmado", "SaltSculpt", "Fern"))
            conn.execute("INSERT INTO model_group_members VALUES (?,?)", (1, "gallery-fern"))
            conn.execute("INSERT INTO model_group_members VALUES (?,?)", (8, "gallery-fern"))
            conn.execute("INSERT INTO assets VALUES (?,?,?,?,?)",
                         (8, hash_extra, "SaltSculpt/msg_8.jpg", "SaltSculpt", "2026-11-19"))
            conn.execute("INSERT INTO annotations VALUES (?,?,?)", (8, "aprovado", "Fern"))
            conn.execute("INSERT INTO name_proposals VALUES (?,?,?,?,?,?,?,?)",
                         (8, "confirmado", "SaltSculpt", "Fern", "", "", "fern-back.jpg", ""))
            conn.commit()
        save_csv(rights, ["message_id", "sha256", "public_use_authorized", "evidence_url"], [
            {"message_id": mid, "sha256": (hashes[mid] if mid != 6 else "0" * 64),
             "public_use_authorized": "sim",
             "evidence_url": f"https://example.org/rights/{mid}"}
            for mid in (1, 2, 3, 6, 7)
        ] + [{"message_id": 8, "sha256": hash_extra, "public_use_authorized": "sim",
              "evidence_url": "https://example.org/rights/8"}])
        grouped, summary_grouped = m.build_plan(db, source, catalog, rights)
        by_id = {r["message_id"]: r for r in grouped}
        assert by_id[1]["action"] == "stage_new_asset"
        assert by_id[8]["action"] == "stage_new_asset"
        assert by_id[1]["group_image_count"] == 2
        assert summary_grouped["distinct_model_groups"] == 1
        m.write_plan(out, grouped, summary_grouped)
        batches = [json.loads(line) for line in
                   (out / "lote_modelos_elegiveis.jsonl").read_text(encoding="utf-8").splitlines()]
        fern = [b for b in batches if b["group_key"] == "gallery-fern"]
        assert len(fern) == 1, batches
        assert fern[0]["message_ids"] == [1, 8], fern
        assert len((out / "galerias_para_revisao.csv").read_text(encoding="utf-8").splitlines()) == 2

        # Um album ainda provavel ou com identidade divergente nunca vai
        # para o lote publico, mesmo se suas imagens tiverem direitos.
        with closing(sqlite3.connect(db)) as conn:
            conn.execute("UPDATE model_groups SET state='provavel'")
            conn.commit()
        pending, _ = m.build_plan(db, source, catalog, rights)
        assert next(r for r in pending if r["message_id"] == 1)["reason"] == "model_group_not_confirmed"
        with closing(sqlite3.connect(db)) as conn:
            conn.execute("UPDATE model_groups SET state='confirmado',title='Another sculpture'")
            conn.commit()
        mismatched, _ = m.build_plan(db, source, catalog, rights)
        assert next(r for r in mismatched if r["message_id"] == 8)["reason"] == "group_identity_mismatch"
        assert source_extra.read_bytes() == b"fixture-angle-two"
    print("E2E APROVADO: aprovado/direitos, SHA, duplicatas, colisao de modelo, path traversal, sem escrita externa")


if __name__ == "__main__":
    test()
