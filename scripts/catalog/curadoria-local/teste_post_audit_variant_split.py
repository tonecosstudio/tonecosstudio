#!/usr/bin/env python3
"""Synthetic E2E for reviewed mixed sculpture galleries, NEVER the real Telegram."""
import hashlib
import json
import sqlite3
import tempfile
from pathlib import Path

import gallery_operations as ops
import name_curadoria as naming
import smart_curadoria as smart


with tempfile.TemporaryDirectory(prefix="tonart-reviewed-variant-split-") as tmp:
    root = Path(tmp)
    dbpath = root / "curadoria.sqlite3"
    stamp = smart.utc()
    key = "a" * 24
    photos = {}
    for mid in (301, 302):
        raw = ("synthetic-physical-photo-" + str(mid)).encode("utf8")
        (root / ("msg_%d.jpg" % mid)).write_bytes(raw)
        photos[mid] = hashlib.sha256(raw).hexdigest()
    proofs = [
        {"message_id": mid, "sha256": photos[mid], "revision": 0}
        for mid in (301, 302)
    ]
    with smart.db_open(dbpath) as db:
        db.execute("""CREATE TABLE assets(
            message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
            source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
            source_date TEXT,source_caption TEXT,source_album TEXT,
            indexed_at TEXT NOT NULL)""")
        smart.setup(db)
        naming.setup(db)
        db.execute("""INSERT INTO model_groups(
            group_key,studio,title,universe,variant,state,
            confidence,revision,created_at,updated_at)
            VALUES(?,'Wicked','Colossus','Marvel','Full Size',
            'revisar',0,1,?,?)""", (key, stamp, stamp))
        for mid in (301, 302):
            rel = "msg_%d.jpg" % mid
            db.execute("""INSERT INTO assets(
                message_id,sha256,source_relative,original_topic,
                source_caption,source_album,indexed_at)
                VALUES(?,?,?,'Wicked','caption','legacy-album',?)""",
                (mid, photos[mid], rel, stamp))
            db.execute("""INSERT INTO model_group_members(
                message_id,group_key,match_reason,updated_at)
                VALUES(?,?,'reviewed_angles',?)""",
                (mid, key, stamp))
            db.execute("""INSERT INTO name_proposals(
                message_id,studio,title,universe,variant,filename,
                status,confidence,source_fingerprint,revision,modified_at)
                VALUES(?,'Wicked','Colossus','Marvel','Full Size',?,
                'provavel',0.82,?,0,?)""",
                (mid, naming.proposed_name({"title": "Colossus",
                    "variant": "Full Size"},mid,rel), "synthetic-"+str(mid), stamp))
        db.execute("""INSERT INTO curation_events(
            group_key,event_type,detail,occurred_at)
            VALUES(?,'visual_gallery_audited','{}',?)""", (key,stamp))
        db.commit()

    kwargs = dict(group_key=key, revision=1, selected_message_id=301,
        proofs=proofs, corrected_variant="Busto",
        official_url="https://3dwicked.gumroad.com/l/ColossusB",
        note=("The first photo is the official Wicked Colossus Bust image "
             "while the second is the full standing sculpture. Their "
             "shape, base, pose and official products differ; keep both "
             "sources and separate the printing variants editorially."))
    for override, expected in (
        ({"revision": 0}, RuntimeError),
        ({"corrected_variant": "Full Size"}, ValueError),
        ({"official_url": "https://example.com/l/ColossusB"}, ValueError),
        ({"proofs": [dict(proofs[0], sha256="0"*64), proofs[1]]}, RuntimeError),
        ({"selected_message_id": 999}, ValueError),
    ):
        try:
            ops.split_audited_variant(dbpath, root, **{**kwargs, **override})
            raise AssertionError("MUST_FAIL "+repr(override))
        except expected:
            pass
    with smart.db_open(dbpath,readonly=True) as db:
        assert db.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0] == 1
        assert db.execute("""SELECT COUNT(*) FROM curation_events
           WHERE event_type='gallery_post_audit_variant_split_new'""").fetchone()[0] == 0

    result = ops.split_audited_variant(dbpath,root,**kwargs)
    assert result["ok"] and result["moved_id"]==301
    assert result["surviving_id"]==302 and result["new_variant"]=="Busto"
    assert result["old_revision"]==2 and result["new_revision"]==0
    assert result["rights_changed"] is False and result["originals_modified"] is False
    new_key = result["new_group"]
    assert len(new_key)==24 and new_key!=key
    with smart.db_open(dbpath,readonly=True) as db:
        assert dict(db.execute("""SELECT group_key,variant
           FROM model_groups WHERE group_key=?""",(new_key,)).fetchone()) == {
           "group_key":new_key,"variant":"Busto"}
        assert db.execute("SELECT variant FROM model_groups WHERE group_key=?",
            (key,)).fetchone()[0] == "Full Size"
        assert [r[0] for r in db.execute("""SELECT message_id FROM model_group_members
            WHERE group_key=?""",(new_key,))] == [301]
        assert [r[0] for r in db.execute("""SELECT message_id FROM model_group_members
            WHERE group_key=?""",(key,))] == [302]
        moved = db.execute("""SELECT variant,status,revision,filename
            FROM name_proposals WHERE message_id=301""").fetchone()
        assert moved["variant"] == "Busto" and moved["status"]=="revisar"
        assert moved["revision"] == 1 and "-busto-" in moved["filename"]
        assert db.execute("""SELECT COUNT(*) FROM curation_events
            WHERE event_type='gallery_post_audit_variant_split_new'
            AND group_key=?""",(new_key,)).fetchone()[0] == 1
        assert db.execute("""SELECT COUNT(*) FROM curation_events
            WHERE event_type='visual_gallery_audited'
            AND group_key=?""",(new_key,)).fetchone()[0] == 1
        assert db.execute("SELECT COUNT(*) FROM curation_seen").fetchone()[0] == 2
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0] == "ok"
    for mid in (301,302):
        assert hashlib.sha256((root/("msg_%d.jpg"%mid)).read_bytes()).hexdigest()==photos[mid]
    try:
        ops.split_audited_variant(dbpath,root,**kwargs)
        raise AssertionError("Stale CAS must not replay")
    except RuntimeError:
        pass

    # New single-photo galleries can be independently confirmed through
    # the old canonical identity route: do not create another authorizer.
    for k, rev, mid, variant, photo_rev, url in (
        (new_key,0,301,"Busto",1,"https://3dwicked.gumroad.com/l/ColossusB"),
        (key,2,302,"Full Size",0,"https://3dwicked.gumroad.com/l/ColossusS")
    ):
        q = naming.confirm_reviewed_gallery(
            dbpath,root,group_key=k,group_revision=rev,
            proofs=[{"message_id":mid,"sha256":photos[mid],"revision":photo_rev}],
            title="Colossus",universe="Marvel",official_url=url,
            note=("Official Wicked product source image physically matches "
                  "this exact synthetic gallery. Identity only; copyright, "
                  "STL licenses and publication remain unapproved."))
        assert q["confirmed"] == 1 and not q["rights_changed"]
        assert not q["originals_modified"]
        with smart.db_open(dbpath,readonly=True) as db:
            x=db.execute("SELECT variant,status FROM name_proposals WHERE message_id=?",
                         (mid,)).fetchone()
            assert x["variant"] == variant and x["status"]=="confirmado"
    print("POST_AUDIT_VARIANT_SPLIT_E2E_PASS: CAS, SHA, groups, replay, source URLs, confirmation, originals")


with tempfile.TemporaryDirectory(prefix="tonart-reviewed-variant-split-") as tmp:
    root = Path(tmp)
    dbpath = root / "curadoria.sqlite3"
    stamp = smart.utc()
    key = "a" * 24
    photos = {}
    for mid in range(301, 311):
        raw = ("synthetic-physical-photo-" + str(mid)).encode("utf8")
        (root / ("msg_%d.jpg" % mid)).write_bytes(raw)
        photos[mid] = hashlib.sha256(raw).hexdigest()
    proofs = [
        {"message_id": mid, "sha256": photos[mid], "revision": 0}
        for mid in range(301, 311)
    ]
    with smart.db_open(dbpath) as db:
        db.execute("""CREATE TABLE assets(
            message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
            source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
            source_date TEXT,source_caption TEXT,source_album TEXT,
            indexed_at TEXT NOT NULL)""")
        smart.setup(db)
        naming.setup(db)
        db.execute("""INSERT INTO model_groups(
            group_key,studio,title,universe,variant,state,
            confidence,revision,created_at,updated_at)
            VALUES(?,'Wicked','Gamora Swag Pack','Marvel','',
            'revisar',0,1,?,?)""", (key, stamp, stamp))
        for mid in range(301, 311):
            rel = "msg_%d.jpg" % mid
            db.execute("""INSERT INTO assets(
                message_id,sha256,source_relative,original_topic,
                source_caption,source_album,indexed_at)
                VALUES(?,?,?,'Wicked','caption','mixed-pack',?)""",
                (mid, photos[mid], rel, stamp))
            db.execute("""INSERT INTO model_group_members(
                message_id,group_key,match_reason,updated_at)
                VALUES(?,?,'reviewed_angles',?)""",
                (mid, key, stamp))
            db.execute("""INSERT INTO name_proposals(
                message_id,studio,title,universe,variant,filename,
                status,confidence,source_fingerprint,revision,modified_at)
                VALUES(?,'Wicked','Gamora Swag Pack','Marvel','',?,
                'provavel',0.82,?,0,?)""",
                (mid, naming.proposed_name({"title": "Gamora Swag Pack",
                    "variant": ""},mid,rel), "synthetic-"+str(mid), stamp))
        db.execute("""INSERT INTO curation_events(
            group_key,event_type,detail,occurred_at)
            VALUES(?,'visual_gallery_audited','{}',?)""", (key,stamp))
        db.commit()

    kwargs = dict(group_key=key, revision=1, selected_message_ids=list(range(306,311)),
        proofs=proofs, corrected_variant="Acessorio - Espada",
        official_url="https://3dwicked.gumroad.com/l/GamoraSw",
        note=("Ten synthetic images are fully audited: five views of one object "
              "and five views of a separate sword. Preserve the original group "
              "and separate all five sword views together. Identity only."))
    for override in (
        {"selected_message_ids": list(range(301,311))},
        {"selected_message_ids": [306,306]},
        {"selected_message_id": 306},
        {"proofs": proofs[:-1]},
        {"selected_message_ids": []},
    ):
        try:
            ops.split_audited_variant(dbpath,root,**{**kwargs,**override})
            raise AssertionError("MUST_FAIL "+repr(override))
        except ValueError:
            pass
    with smart.db_open(dbpath,readonly=True) as db:
        assert db.execute("SELECT COUNT(*) FROM model_groups").fetchone()[0]==1
    result=ops.split_audited_variant(dbpath,root,**kwargs)
    assert result["moved_ids"]==list(range(306,311))
    assert result["surviving_ids"]==list(range(301,306))
    assert not result["rights_changed"] and not result["originals_modified"]
    with smart.db_open(dbpath,readonly=True) as db:
        for k, mids in ((key,list(range(301,306))),(result["new_group"],list(range(306,311)))):
            assert [r[0] for r in db.execute("SELECT message_id FROM model_group_members WHERE group_key=? ORDER BY message_id",(k,))]==mids
            audit=json.loads(db.execute("SELECT detail FROM curation_events WHERE group_key=? AND event_type='visual_gallery_audited' ORDER BY event_id DESC LIMIT 1",(k,)).fetchone()[0])
            assert audit["member_ids"]==mids
        assert db.execute("SELECT COUNT(*) FROM curation_seen").fetchone()[0]==10
        assert db.execute("PRAGMA quick_check(1)").fetchone()[0]=="ok"
    for mid in range(301,311):
        assert hashlib.sha256((root/("msg_%d.jpg"%mid)).read_bytes()).hexdigest()==photos[mid]
    try:
        ops.split_audited_variant(dbpath,root,**kwargs)
        raise AssertionError("Stale CAS must not replay")
    except RuntimeError:
        pass
    print("POST_AUDIT_MULTI_VARIANT_SPLIT_E2E_PASS")
