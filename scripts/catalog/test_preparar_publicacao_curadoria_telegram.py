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



def test_reconciliation_matrix():
    """Estatueta != personagem; SHA resolve bytes, não variante nem direitos."""
    with tempfile.TemporaryDirectory(prefix="tonart-reconcile-") as tmp:
        home = Path(tmp)
        source = home / "telegram"
        source.mkdir()
        db = home / "curadoria.sqlite3"
        inventory = home / "catalog.csv"
        originals = {}
        hashes = {}
        cases = {
            101: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", "A"),
            102: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", "A"),
            103: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", "A"),
            104: ("StudioB", "Hero", "Scale 1/6", "aprovado", "confirmado", "B"),
            105: ("StudioB", "Hero", "Scale 1/6", "aprovado", "confirmado", "B"),
            106: ("StudioA", "Hero", "Pose 2", "aprovado", "confirmado", None),
            107: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", None),
            109: ("StudioOther", "Unique Model", "", "aprovado", "confirmado", None),
            110: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", None),
            111: ("StudioX", "Unknown", "", "pendente", "provavel", None),
            112: ("StudioX", "Recoverable", "", "aprovado", "confirmado", None),
            113: ("StudioY", "Partial", "", "aprovado", "confirmado", "J"),
            114: ("StudioY", "Partial", "", "pendente", "confirmado", "J"),
            115: ("StudioZ", "Different Sculpt", "Pose 1", "aprovado", "confirmado", "K"),
            116: ("StudioZ", "Different Sculpt", "Pose 2", "aprovado", "confirmado", "K"),
            117: ("StudioA", "Hero", "Pose 1", "aprovado", "confirmado", None),
            118: ("StudioQ", "One", "", "aprovado", "confirmado", None),
            119: ("StudioQ", "Two", "", "aprovado", "confirmado", None),
        }
        with closing(sqlite3.connect(db)) as con:
            con.executescript("""
                CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
                  source_relative TEXT, original_topic TEXT,source_date TEXT);
                CREATE TABLE annotations(message_id INTEGER PRIMARY KEY,status TEXT,model TEXT);
                CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,status TEXT,
                  studio TEXT,title TEXT,universe TEXT,variant TEXT,filename TEXT,
                  official_url TEXT,evidence_type TEXT,confidence REAL);
                CREATE TABLE model_groups(group_key TEXT PRIMARY KEY,state TEXT,
                  studio TEXT,title TEXT);
                CREATE TABLE model_group_members(message_id INTEGER PRIMARY KEY,group_key TEXT);
            """)
            for group, studio, title in [("A","StudioA","Hero"),("B","StudioB","Hero"),
                                         ("J","StudioY","Partial"),
                                         ("K","StudioZ","Different Sculpt")]:
                con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                            (group,"confirmado",studio,title))
            for mid,(studio,title,variant,review,nstatus,group) in cases.items():
                body = ("photo-"+str(102 if mid==103 else 118 if mid==119 else mid)).encode()
                digest = hashlib.sha256(body).hexdigest()
                hashes[mid] = digest
                relative = f"{studio}/msg_{mid}.jpg"
                target = source / relative
                if mid != 112:
                    target.parent.mkdir(exist_ok=True)
                    target.write_bytes(body)
                    originals[mid] = body
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid,digest,relative,studio,"2026-11-19"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)",(mid,review,title))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid,nstatus,studio,title,"",variant,f"msg_{mid}.jpg",
                             "https://example.org/source","manual_review",1.0))
                if group:
                    con.execute("INSERT INTO model_group_members VALUES(?,?)",(mid,group))
            con.commit()
        with inventory.open("w",encoding="utf-8",newline="") as out:
            writer=csv.DictWriter(out,fieldnames=["model_id","studio","model","variant","sha256"])
            writer.writeheader()
            writer.writerows([
                {"model_id":"existing-hero","studio":"StudioA","model":"Hero",
                 "variant":"Pose 1","sha256":hashes[101]},
                {"model_id":"existing-hero","studio":"StudioA","model":"Hero",
                 "variant":"Pose 1","sha256":hashes[110]},
                {"model_id":"other-model","studio":"StudioOther","model":"Other",
                 "variant":"","sha256":hashes[110]},
                {"model_id":"renamed-model","studio":"Elsewhere","model":"Different",
                 "variant":"","sha256":hashes[117]},
            ])
        rows, summary = m.build_plan(db,source,inventory)
        byid={r["message_id"]:r for r in rows}
        assert byid[101]["action"]=="reuse_existing_asset",byid[101]
        assert byid[102]["action"]=="append_existing_gallery",byid[102]
        assert byid[102]["existing_model_id"]=="existing-hero"
        assert byid[103]["action"]=="skip_duplicate_source",byid[103]
        assert byid[103]["duplicate_of_message_id"]==102
        assert all(byid[mid]["action"]=="stage_new_asset" for mid in (104,105))
        assert byid[106]["reason"]=="variant_conflict",byid[106]
        assert byid[107]["action"]=="review_existing_model",byid[107]
        assert byid[107]["candidate_model_ids"]==["existing-hero"]
        assert byid[109]["action"]=="stage_new_asset"
        assert byid[110]["reason"]=="sha_owned_by_multiple_commercial_models"
        assert byid[111]["action"]=="hold"
        assert byid[112]["reason"]=="source_missing_or_invalid"
        assert byid[117]["reason"]=="exact_sha_catalog_identity_conflict"
        assert all(byid[mid]["reason"]=="same_sha_across_distinct_galleries" for mid in (118,119))
        assert all(byid[mid]["reason"]=="group_variant_or_identity_conflict" for mid in (115,116))
        assert summary["inventory"]["unique_models"]==3
        assert summary["candidate_additional_photos"]==1
        assert summary["duplicate_sha_groups_in_curadoria"]==2
        assert not summary["external_writes"]
        output=home/"staging"
        m.write_plan(output,rows,summary)
        ops=[json.loads(s) for s in (output/"operacoes_conciliadas.jsonl").read_text(encoding="utf-8").splitlines()]
        groupA=[o for o in ops if o["group_key"]=="A"]
        assert len(groupA)==1 and groupA[0]["action"]=="append_to_existing_gallery",groupA
        assert groupA[0]["media_message_ids"]==[101,102] and groupA[0]["message_ids"]==[101,102,103]
        assert len([o for o in ops if o["group_key"]=="B" and o["action"]=="stage_new_model"])==1
        assert not any(113 in o["message_ids"] for o in ops),ops
        assert len({o["operation_id"] for o in ops})==len(ops)
        snapshot={o["identity_key"]:o["operation_id"] for o in ops}
        again, _=m.build_plan(db,source,inventory)
        m.write_plan(output,again,summary)
        second=[json.loads(s) for s in (output/"operacoes_conciliadas.jsonl").read_text(encoding="utf-8").splitlines()]
        assert snapshot=={o["identity_key"]:o["operation_id"] for o in second}
        (source/"StudioX"/"msg_112.jpg").write_bytes(b"photo-112")
        resumed,_=m.build_plan(db,source,inventory)
        assert {r["message_id"]:r for r in resumed}[112]["action"]=="stage_new_asset"
        assert all((source/f"{cases[mid][0]}/msg_{mid}.jpg").read_bytes()==body
                   for mid,body in originals.items())
        assert not any(p.suffix==".webp" for p in output.iterdir())
        assert all(not op["rights_verified"] and not op["production_write_authorized"] for op in ops)
    print("MATRIZ APROVADA: escala/variante, SHA, album, foto extra, colisoes, retomada e idempotencia")

if __name__ == "__main__":
    run()
    test_reconciliation_matrix()
