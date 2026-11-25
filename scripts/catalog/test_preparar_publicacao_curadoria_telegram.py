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
            120: ("StudioPending", "Future Model", "", "pendente", "provavel", None),
            121: ("StudioA", "Hero", "Pose 1", "pendente", "provavel", None),
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
                {"model_id":"pending-commercial","studio":"StudioPending","model":"Future Model",
                 "variant":"","sha256":hashes[120]},
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
        assert byid[120]["action"]=="hold" and byid[120]["candidate_evidence"]=="unverified_sha256"
        assert byid[120]["candidate_model_ids"]==["pending-commercial"]
        assert byid[121]["action"]=="hold" and byid[121]["candidate_evidence"]=="name_only_review_required"
        assert byid[121]["candidate_model_ids"]==["existing-hero"]
        assert summary["unverified_exact_sha_candidate_images"]>=1
        assert summary["inventory"]["unique_models"]==4
        try:
            m.build_plan(db,source,inventory,expected_model_count=3)
            assert False,"Must reject incomplete commercial snapshot"
        except ValueError as exc:
            assert "contagem divergente" in str(exc)
        _,complete=m.build_plan(db,source,inventory,expected_model_count=4)
        assert complete["inventory_completeness_verified"]
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

def test_existing_name_sync_read_only():
    """D1 cards are reused by exact origin identity; no approval shortcut."""
    with tempfile.TemporaryDirectory(prefix="tonart-existing-sync-") as temp:
        home = Path(temp)
        db, csv_path = home / "curadoria.sqlite3", home / "drafts.csv"
        with closing(sqlite3.connect(db)) as con:
            con.executescript("""
                CREATE TABLE assets(message_id INTEGER PRIMARY KEY,sha256 TEXT,
                    source_relative TEXT,original_topic TEXT,source_date TEXT);
                CREATE TABLE annotations(message_id INTEGER PRIMARY KEY,status TEXT,model TEXT);
                CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,status TEXT,
                    studio TEXT,title TEXT,universe TEXT,variant TEXT,filename TEXT,
                    official_url TEXT,evidence_type TEXT,confidence REAL);
                CREATE TABLE model_groups(group_key TEXT PRIMARY KEY,state TEXT,
                    studio TEXT,title TEXT);
                CREATE TABLE model_group_members(message_id INTEGER PRIMARY KEY,group_key TEXT);
            """)
            def insert(mid, title, status="provavel", group=None):
                digest = hashlib.sha256(f"image-{mid}".encode()).hexdigest()
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid, digest, f"Abe3D/msg_{mid}.jpg", "Abe3D", "2026-11-21"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)", (mid, "revisar", title))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid, status, "Abe3D", title, "", "", f"msg_{mid}.jpg", "", "", 0.7))
                if group:
                    con.execute("INSERT INTO model_group_members VALUES(?,?)", (mid, group))
                return digest
            con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                        ("c" * 24, "provavel", "Abe3D", "Selene"))
            one, two = insert(101, "Selene", "confirmado", "c" * 24), insert(102, "Selene", "confirmado", "c" * 24)
            three = insert(103, "Lara")
            four = insert(104, "Unknown", "revisar")
            five = insert(105, "Variant X")
            con.commit()
        fields = ["model_id","studio","model","variant","sha256","image_id",
                  "telegram_group_key","telegram_revision","telegram_review_status",
                  "telegram_name_provisional","telegram_rights_status","published",
                  "image_count","gallery_version"]
        def record(model, mid, digest, old, group="", rev="0", rights="not_reviewed", image_count="1"):
            return dict(model_id=model,studio="Abe3D",model=old,variant="",
                        sha256=digest,image_id=f"tg:{mid}",telegram_group_key=group,
                        telegram_revision=rev,telegram_review_status="pending",
                        telegram_name_provisional="1",telegram_rights_status=rights,published="0",
                        image_count=image_count,gallery_version="1")
        inputs = [
            record("tg_"+"a"*24,101,one,"Modelo sem nome #101","c"*24,image_count="2"),
            record("tg_"+"a"*24,102,two,"Modelo sem nome #101","c"*24,image_count="2"),
            record("tg_"+"b"*24,103,three,"Modelo sem nome #103"),
            record("tg_"+"d"*24,104,four,"Modelo sem nome #104"),
            record("tg_"+"e"*24,105,five,"Manually reviewed title"),
        ]
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields)
            w.writeheader();w.writerows(inputs)
        ready, report=m.plan_existing_telegram_name_updates(db,csv_path)
        assert {r["model_id"] for r in ready}=={"tg_"+"a"*24,"tg_"+"b"*24}, ready
        assert report["ready"]==2 and not report["external_writes"]
        assert all(not r["publication_granted"] and not r["rights_verified"] for r in ready)
        assert ready[0]["admin_patch"]=={"revision":0,"name":"Selene"}
        again,_=m.plan_existing_telegram_name_updates(db,csv_path)
        assert [r["operation_id"] for r in ready]==[r["operation_id"] for r in again]
        # Correct existing provisional names only with complete confirmed local
        # identity and revision zero. Never replace named cards with a proposal.
        for r in inputs[:2]:
            r["model"]="Selene placeholder title"
        inputs[2]["model"]="Lara old title"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        named, report=m.plan_existing_telegram_name_updates(db,csv_path)
        assert [r["model_id"] for r in named]==["tg_"+"a"*24], named
        assert named[0]["admin_patch"]=={"revision":0,"name":"Selene"}
        assert report["held"]["named_card_requires_confirmed_complete_identity"]==2
        # Concurrent manual edit must win.
        for r in inputs[:2]:r["telegram_revision"]="1"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        assert not m.plan_existing_telegram_name_updates(db,csv_path)[0]
        for r in inputs[:2]:
            r["telegram_revision"]="0";r["model"]="Selene"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        aligned, report=m.plan_existing_telegram_name_updates(db,csv_path)
        assert not aligned and report["held"]["already_aligned"]==1
        for r in inputs[:2]:r["model"]="Modelo sem nome #101"
        inputs[2]["model"]="Modelo sem nome #103"
        inputs[2]["telegram_revision"]="1"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        blocked,_=m.plan_existing_telegram_name_updates(db,csv_path)
        assert len(blocked)==1, blocked
        inputs[1]["sha256"]="f"*64
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        mismatch,_=m.plan_existing_telegram_name_updates(db,csv_path)
        assert not mismatch, mismatch
        # A missing group photo must not make a partial D1 export actionable.
        inputs[1]["sha256"]=two
        inputs[1]["image_count"]="3"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        incomplete,report=m.plan_existing_telegram_name_updates(db,csv_path)
        assert not incomplete and report["held"]["ambiguous_d1_gallery"]==1
        # The other image now declares the same count: reject both as incomplete.
        inputs[0]["image_count"]="3"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        incomplete,report=m.plan_existing_telegram_name_updates(db,csv_path)
        assert not incomplete and report["held"]["incomplete_or_unsupported_gallery"]==1
        # Reset to a complete export and enforce stable source identities.
        inputs[0]["image_count"]=inputs[1]["image_count"]="2"
        with csv_path.open("w",encoding="utf8",newline="") as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(inputs)
        # The CLI's names-only mode does not need source files.
        import subprocess,sys
        out=home/"names-only"
        cmd=[sys.executable,str(SCRIPT),"--names-only","--db",str(db),
             "--existing-drafts-csv",str(csv_path),"--expected-draft-count","4",
             "--source-root",str(home/"absent-original-images"),"--out",str(out)]
        result=subprocess.run(cmd,capture_output=True,text=True)
        assert result.returncode==0, result.stdout + "\n" + result.stderr
        report=json.loads((out/"resumo_correcoes_fichas_existentes.json").read_text(encoding="utf8"))
        assert report["ready"]==1 and not report["external_writes"], result.stdout
        wrong=subprocess.run([*cmd[:], "--expected-draft-count","5"],
                             capture_output=True,text=True)
        assert wrong.returncode!=0 and "Snapshot D1 incompleto" in wrong.stderr
        assert not (out/"operacoes_conciliadas.jsonl").exists()




def test_private_draft_plan_without_publication():
    with tempfile.TemporaryDirectory(prefix="tonart-private-import-plan-") as temp:
        home = Path(temp)
        db, known, fr, known_images = (home/"c.sqlite3", home/"d1.csv",
                                       home/"franchises.csv", home/"d1-images.csv")
        with closing(sqlite3.connect(db)) as con:
            con.executescript("""
                CREATE TABLE assets(message_id INTEGER PRIMARY KEY, sha256 TEXT,
                    source_relative TEXT, original_topic TEXT, source_date TEXT);
                CREATE TABLE annotations(message_id INTEGER PRIMARY KEY,status TEXT,model TEXT);
                CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,status TEXT,
                    studio TEXT,title TEXT,universe TEXT,variant TEXT,filename TEXT,
                    official_url TEXT,evidence_type TEXT,confidence REAL);
                CREATE TABLE model_groups(group_key TEXT PRIMARY KEY,state TEXT,
                    studio TEXT,title TEXT);
                CREATE TABLE model_group_members(message_id INTEGER PRIMARY KEY,group_key TEXT);
            """)
            def insert(mid, studio, title, universe, group, digest=None):
                sha = digest or hashlib.sha256(str(mid).encode()).hexdigest()
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid,sha,f"{studio}/src_{mid}.jpg",studio,"2026-11-21"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)", (mid,"revisar",title))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid,"provavel",studio,title,universe,"",f"{mid}.jpg","","caption",0.7))
                if group:
                    con.execute("INSERT INTO model_group_members VALUES(?,?)",(mid,group))
            con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                        ("a"*24,"provavel","Studio A","Eevee"))
            con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                        ("b"*24,"provavel","Studio A","Mew"))
            con.execute("INSERT INTO model_groups VALUES(?,?,?,?)",
                        ("c"*24,"provavel","Studio A","Mixed"))
            insert(11,"Studio A","Eevee","Pokémon","a"*24)
            insert(12,"Studio A","Eevee","Pokémon","a"*24)
            insert(13,"Studio A","Mew","Pokémon","b"*24)
            insert(14,"Studio A","Mixed","Pokémon","c"*24)
            insert(15,"Studio A","Other","Pokémon","c"*24)
            insert(16,"Studio A","Kirby","Unknown Universe",None)
            insert(17,"Studio A","Pikachu","Pokémon",None)
            insert(18,"Geral + 50k","Private","Pokémon",None)
            con.commit()
        with known.open("w",encoding="utf8",newline="") as file:
            fields=["model_id","studio","telegram_group_key","published","image_count","gallery_version","name","variant_name"]
            w=csv.DictWriter(file,fieldnames=fields)
            w.writeheader();w.writerow(dict(model_id="tg_"+"b"*24,studio="Studio A",
                telegram_group_key="b"*24,published=0,image_count=1,gallery_version=1,
                name="Mew",variant_name=""))
        with known_images.open("w",encoding="utf8",newline="") as file:
            fields=["model_id","image_id","source_sha256","studio","telegram_group_key","telegram_origin_id","position","gallery_version","model_gallery_version"]
            w=csv.DictWriter(file,fieldnames=fields);w.writeheader()
            w.writerow(dict(model_id="tg_"+"b"*24,image_id="tg:13",
                source_sha256=hashlib.sha256(b"13").hexdigest(),studio="Studio A",
                telegram_group_key="b"*24,telegram_origin_id="2370335738",position=0,
                gallery_version=1,model_gallery_version=1))
        with fr.open("w",encoding="utf8",newline="") as file:
            w=csv.DictWriter(file,fieldnames=["id","name"])
            w.writeheader();w.writerow(dict(id=57,name="Pokémon"))
        def plan(expected_models=1, expected_franchises=1, expected_images=1, pending=None):
            return m.plan_private_telegram_drafts(db,known,expected_models,fr,
                expected_franchises,known_d1_images_csv=known_images,
                expected_d1_images=expected_images,pending_franchise_id=pending)
        ready, held, summary = plan()
        assert len(ready)==2,ready
        assert summary["existing_d1_models"]==1 and summary["franchises_in_d1"]==1
        assert summary["reasons"]["already_in_d1"]==1 and summary["held"]==3,summary
        assert {o["import_manifest"]["groupKey"] for o in ready}=={
            "a"*24,"single:17"}
        assert {x["identity_key"] for x in held
                if x["reason"]=="name_identification_pending"}=={"single:14","single:15"}
        assert summary["conservative_split_groups"]==1
        assert summary["conservative_split_images"]==2
        assert all(o["import_manifest"]["franchiseId"]==57 for o in ready)
        assert all(not o["apply_executed"] and not o["showcase_visible"]
                   and not o["rights_verified"] and not o["r2_verified"] for o in ready)
        assert ready[0]["import_manifest"]["images"]==[
            {"messageId":11,"sha256":hashlib.sha256(b"11").hexdigest()},
            {"messageId":12,"sha256":hashlib.sha256(b"12").hexdigest()},
        ]
        second,_,_ = plan()
        assert [x["operation_id"] for x in ready]==[x["operation_id"] for x in second]
        # A gallery whose identity is unresolved remains in Curadoria,
        # even when the individual proposals contain a name.
        with closing(sqlite3.connect(db)) as con:
            con.execute("UPDATE model_groups SET state='revisar' WHERE group_key=?",("c"*24,))
            con.execute("UPDATE name_proposals SET title='Mixed' WHERE message_id=15")
            con.execute("UPDATE annotations SET model='Mixed' WHERE message_id=15")
            con.commit()
        review_split,review_held,review_summary=plan()
        assert not any(x["source_group_key"]=="c"*24 for x in review_split)
        assert {x["identity_key"] for x in review_held
                if x["reason"]=="name_identification_pending"}=={"single:14","single:15"}
        assert review_summary["conservative_split_groups"]==1
        try:
            plan(expected_models=2)
            assert False, "partial D1 export must be blocked"
        except ValueError as exc:
            assert "Snapshot D1 incompleto" in str(exc)
        try:
            plan(expected_franchises=2)
            assert False, "partial franchise export must be blocked"
        except ValueError as exc:
            assert "franquias D1 incompleto" in str(exc)
        assert not any(path.suffix==".webp" for path in home.iterdir())
        # Original topic may list two credited studios; proposal remains
        # 'Studio A' while the Telegram topic includes that exact component.
        with closing(sqlite3.connect(db)) as con:
            for mid,topic,proposal,title,universe in [
                (19,"Studio A _ Secondary","Studio A","Mudkip","Pokémon"),
                (20,"Studio A","Studio A","Goku","Dragon Ball Z"),
                (21,"Studio A _ Secondary","Secondary","Raichu","Pokémon"),
            ]:
                sha=hashlib.sha256(str(mid).encode()).hexdigest()
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid,sha,f"{topic}/src_{mid}.jpg",topic,"2026-11-21"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)",(mid,"revisar",title))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid,"provavel",proposal,title,universe,"",f"{mid}.jpg","","caption",0.7))
            con.commit()
        with fr.open("w",encoding="utf8",newline="") as file:
            w=csv.DictWriter(file,fieldnames=["id","name"])
            w.writeheader();w.writerows([
                {"id":57,"name":"Pokémon"},
                {"id":77,"name":"Dragon Ball"},
            ])
        extended,held,report=plan(expected_franchises=2)
        assert len(extended)==5,extended
        assert len(held)==3
        assert report["franchises_in_d1"]==2
        imported={x["import_manifest"]["groupKey"]:x for x in extended}
        assert imported["single:19"]["studio"]=="Studio A"
        assert imported["single:19"]["import_manifest"]["studio"]=="Studio A"
        assert imported["single:20"]["import_manifest"]["franchiseId"]==77
        assert imported["single:20"]["import_manifest"]["universe"]=="Dragon Ball Z"
        assert imported["single:21"]["studio"]=="Secondary"
        assert imported["single:21"]["import_manifest"]["studio"]=="Secondary"
        with fr.open("w",encoding="utf8",newline="") as file:
            w=csv.DictWriter(file,fieldnames=["id","name"])
            w.writeheader();w.writerows([
                {"id":57,"name":"Pokémon"},
                {"id":77,"name":"Dragon Ball"},
                {"id":99,"name":"Franquia a identificar"},
            ])
        provisional,unknown_held,unknown_summary=plan(expected_franchises=3,pending=99)
        assert len(provisional)==6,provisional
        pending={x["import_manifest"]["groupKey"]:x for x in provisional}
        assert pending["single:16"]["franchise_pending"]
        assert pending["single:16"]["import_manifest"]["franchiseId"]==99
        assert pending["single:16"]["import_manifest"]["universe"]=="Unknown Universe"
        assert unknown_summary["pending_franchise_candidates"]==1
        assert len(unknown_held)==2
        assert not pending["single:16"]["apply_executed"]
        # Unnamed material stays in Curadoria even with a valid pending
        # franchise. Rejected media remains held.
        with closing(sqlite3.connect(db)) as con:
            for mid,status in [(22,"revisar"),(23,"descartado")]:
                sha=hashlib.sha256(str(mid).encode()).hexdigest()
                con.execute("INSERT INTO assets VALUES(?,?,?,?,?)",
                            (mid,sha,f"Studio A/src_{mid}.jpg","Studio A","2026-11-21"))
                con.execute("INSERT INTO annotations VALUES(?,?,?)",(mid,status,""))
                con.execute("INSERT INTO name_proposals VALUES(?,?,?,?,?,?,?,?,?,?)",
                            (mid,"revisar","Studio A","","","",f"{mid}.jpg","","",0))
            con.execute("UPDATE model_groups SET state='confirmado' WHERE group_key=?",("a"*24,))
            con.commit()
        coverage,held,coverage_summary=plan(expected_franchises=3,pending=99)
        coverage_map={x["import_manifest"]["groupKey"]:x for x in coverage}
        assert "single:22" not in coverage_map
        assert any(x["identity_key"]=="single:22" and
                   x["reason"]=="name_identification_pending" for x in held)
        assert "single:23" not in coverage_map
        assert "a"*24 in coverage_map
        assert coverage_summary["pending_name_candidates"]==0
        assert coverage_summary["reasons"]["name_identification_pending"]==3
        assert coverage_summary["reasons"]["rejected_media"]==1
        assert all(not x["showcase_visible"] and not x["apply_executed"]
                   for x in coverage)
        try:
            plan(expected_franchises=3,pending=57)
            assert False,"wrong provisional ID must be rejected"
        except ValueError as exc:
            assert "Franquia provisoria" in str(exc)

        # A same-key gallery can safely append newly curated source images to
        # its existing private draft. The importer receives the complete live
        # gallery plus new images, so replay remains idempotent.
        with closing(sqlite3.connect(db)) as con:
            insert(24,"Studio A","Mew","Pokémon","b"*24)
            con.commit()
        appended,_,append_summary=plan(expected_franchises=3)
        append_op=next(x for x in appended if x["append_to_existing_private_draft"])
        assert append_op["model_id"]=="tg_"+"b"*24
        assert append_op["existing_d1_model"]=="tg_"+"b"*24
        assert not append_op["new_private_draft_only"]
        assert [x["messageId"] for x in append_op["import_manifest"]["images"]]==[13,24]
        assert append_summary["private_draft_appends"]==1
        appended_again,_,_=plan(expected_franchises=3)
        assert append_op["operation_id"]==next(
            x["operation_id"] for x in appended_again
            if x["append_to_existing_private_draft"])

        # A Curadoria key change must not turn an image already owned by a
        # different D1 model into a permanent duplicate singleton.
        with known.open("w",encoding="utf8",newline="") as file:
            fields=["model_id","studio","telegram_group_key","published","image_count","gallery_version","name","variant_name"]
            w=csv.DictWriter(file,fieldnames=fields);w.writeheader()
            w.writerows([
                dict(model_id="tg_"+"b"*24,studio="Studio A",telegram_group_key="b"*24,
                     published=0,image_count=1,gallery_version=1,name="Mew",variant_name=""),
                dict(model_id="tg_"+"d"*24,studio="Studio A",telegram_group_key="d"*24,
                     published=0,image_count=1,gallery_version=1,name="Incompatible",variant_name=""),
            ])
        with known_images.open("w",encoding="utf8",newline="") as file:
            fields=["model_id","image_id","source_sha256","studio","telegram_group_key","telegram_origin_id","position","gallery_version","model_gallery_version"]
            w=csv.DictWriter(file,fieldnames=fields);w.writeheader()
            w.writerows([
                dict(model_id="tg_"+"b"*24,image_id="tg:13",
                     source_sha256=hashlib.sha256(b"13").hexdigest(),studio="Studio A",
                     telegram_group_key="b"*24,telegram_origin_id="2370335738",position=0,
                     gallery_version=1,model_gallery_version=1),
                dict(model_id="tg_"+"d"*24,image_id="tg:14",
                     source_sha256=hashlib.sha256(b"14").hexdigest(),studio="Studio A",
                     telegram_group_key="d"*24,telegram_origin_id="2370335738",position=0,
                     gallery_version=1,model_gallery_version=1),
            ])
        reconciled,overlap_held,overlap_summary=plan(
            expected_models=2,expected_franchises=3,expected_images=2)
        assert not any(x["source_group_key"]=="c"*24 for x in reconciled)
        conflict=next(x for x in overlap_held
                      if x["identity_key"]=="c"*24)
        assert conflict["reason"]=="existing_image_identity_conflict"
        assert conflict["conflicting_d1_models"]==["tg_"+"d"*24]
        assert overlap_summary["reasons"]["existing_image_identity_conflict"]==1

        # Historical catalog SHA ownership also blocks a Telegram duplicate.
        with known_images.open("a",encoding="utf8",newline="") as file:
            w=csv.DictWriter(file,fieldnames=fields)
            w.writerow(dict(model_id="legacy-model",image_id="img_legacy01",
                source_sha256=hashlib.sha256(b"16").hexdigest(),studio="",
                telegram_group_key="",telegram_origin_id="",position=0,
                gallery_version=42,model_gallery_version=42))
        historical,history_held,history_summary=plan(
            expected_models=2,expected_franchises=3,expected_images=3)
        assert "single:16" not in {x["import_manifest"]["groupKey"] for x in historical}
        assert any(x["identity_key"]=="single:16" and
                   x["reason"]=="existing_image_identity_conflict" for x in history_held)

        # The same studio/name/variant check used by the Worker catches a
        # likely sculpture duplicate before a batch reaches the API.
        with known.open("w",encoding="utf8",newline="") as file:
            fields=["model_id","studio","telegram_group_key","published","image_count","gallery_version","name","variant_name"]
            w=csv.DictWriter(file,fieldnames=fields);w.writeheader()
            w.writerows([
                dict(model_id="tg_"+"b"*24,studio="Studio A",telegram_group_key="b"*24,
                     published=0,image_count=1,gallery_version=1,name="Pikachu",variant_name=""),
                dict(model_id="tg_"+"d"*24,studio="Studio A",telegram_group_key="d"*24,
                     published=0,image_count=1,gallery_version=1,name="Incompatible",variant_name=""),
            ])
        identity_plan,identity_held,identity_summary=plan(
            expected_models=2,expected_franchises=3,expected_images=3)
        assert "single:17" not in {x["import_manifest"]["groupKey"] for x in identity_plan}
        pikachu=next(x for x in identity_held
                     if x["identity_key"]=="single:17")
        assert pikachu["reason"]=="possible_same_studio_sculpture"
        assert pikachu["conflicting_d1_models"]==["tg_"+"b"*24]




if __name__ == "__main__":
    run()
    test_reconciliation_matrix()
    test_existing_name_sync_read_only()
    test_private_draft_plan_without_publication()
