#!/usr/bin/env python3
"""Batch *verified image-name* reviews through the existing TONART Curadoria Host.

The input is a private, individually visual-reviewed JSONL proof plan. This
client never writes SQLite, groups, characters, tags, publications or rights.
All mutations go to the ONE existing /api/review-name HTTP endpoint with
optimistic revision checks; interrupted runs may be safely resumed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sqlite3
import time
import urllib.parse
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timezone

HOST = "http://127.0.0.1:8769"
PLAN_KEYS = {
    "message_id", "title", "studio", "universe", "source_sha256",
    "official_url", "visual_evidence_note",
}


def sha256_file(path: pathlib.Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def atomic_json(path: pathlib.Path, item: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(
        json.dumps(item, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf8",
    )
    # Windows/Defender or another reader may transiently hold the previous
    # report: retry only the atomic replace, NEVER the already-committed
    # Curadoria POST. A resumed run sees the CAS-confirmed source and skips it.
    for attempt in range(7):
        try:
            tmp.replace(path)
            break
        except PermissionError:
            if attempt == 6:
                raise
            time.sleep(0.06 * (2 ** attempt))


def validate_plan_rows(rows: list[dict]) -> list[dict]:
    ids = set()
    for lineno, row in enumerate(rows, 1):
        if not isinstance(row, dict) or set(row) != PLAN_KEYS:
            raise ValueError(f"plan row {lineno}: exact proof fields required")
        mid = row["message_id"]
        if type(mid) is not int or mid < 1 or mid in ids:
            raise ValueError(f"plan row {lineno}: invalid/duplicate image ID")
        ids.add(mid)
        if any(
            not isinstance(row[key], str) or not row[key].strip()
            for key in PLAN_KEYS - {"message_id"}
        ):
            raise ValueError(f"plan row {lineno}: blank proof field")
        if len(row["title"]) > 170 or len(row["studio"]) > 120:
            raise ValueError("invalid source title or studio length")
        if not re.fullmatch("[0-9a-f]{64}", row["source_sha256"]):
            raise ValueError("invalid image SHA-256 proof")
        url = urllib.parse.urlparse(row["official_url"])
        if (url.scheme != "https" or not url.hostname or url.username
                or url.password or url.hostname in {"localhost", "127.0.0.1"}):
            raise ValueError("an external HTTPS official-name source is required")
        if len(row["visual_evidence_note"]) > 500:
            raise ValueError("visual review evidence note too long")
    if not 1 <= len(rows) <= 96:
        raise ValueError("proof batch must contain 1..96 images")
    return rows


def load_plan(path: pathlib.Path) -> list[dict]:
    if not path.is_file():
        raise ValueError("private visual review plan is missing")
    rows = [json.loads(line) for line in path.read_text("utf8").splitlines()
            if line.strip()]
    return validate_plan_rows(rows)


GROUP_PROOF_KEYS = frozenset({
    "group_key", "studio", "title", "universe",
    "official_url", "visual_evidence_note",
})


def load_gallery_proofs(path: pathlib.Path) -> list[dict]:
    """One editorial attestation per whole, previously audited gallery."""
    if not path.is_file():
        raise ValueError("private gallery proof plan is missing")
    proofs = [json.loads(line) for line in path.read_text("utf8").splitlines()
              if line.strip()]
    if not 1 <= len(proofs) <= 24:
        raise ValueError("gallery proof plan must have 1..24 groups")
    seen = set()
    for item in proofs:
        if (not isinstance(item, dict)
                or set(item) != GROUP_PROOF_KEYS
                or not all(isinstance(v, str) and v.strip()
                           for v in item.values())
                or not re.fullmatch("[0-9a-f]{24}", item["group_key"])
                or item["group_key"] in seen):
            raise ValueError("duplicate or malformed gallery attestation")
        seen.add(item["group_key"])
        url = urllib.parse.urlparse(item["official_url"])
        if (url.scheme != "https" or not url.hostname or url.username
                or url.password or url.hostname in ("localhost","127.0.0.1")
                or len(item["visual_evidence_note"]) > 400):
            raise ValueError("gallery attestation requires precise HTTPS official evidence")
    return proofs


def expand_gallery_proofs(db: sqlite3.Connection, proofs: list[dict]) -> list[dict]:
    """Expand editor-reviewed galleries to photo-level SHA proofs without writing.

    This DOES NOT infer that galleries sharing a character are identical.
    Every gallery must already have a visual audit event, and the provided
    official creator URL must be from its registered studio provider.
    """
    import name_curadoria as names
    prepared = []
    for proof in proofs:
        key = proof["group_key"]
        group = db.execute(
            "SELECT group_key,studio,title,universe,variant,state,revision "
            "FROM model_groups WHERE group_key=?", (key,)
        ).fetchone()
        if (not group or group["studio"] != proof["studio"]
                or group["title"] != proof["title"]
                or group["universe"] != proof["universe"]
                or group["state"] not in ("provavel","revisar")):
            raise ValueError(f"gallery {key}: editorial source does not match group")
        audit = db.execute(
            "SELECT 1 FROM curation_events WHERE group_key=? "
            "AND event_type='visual_gallery_audited' LIMIT 1", (key,)
        ).fetchone()
        if not audit:
            raise ValueError(f"gallery {key}: full visual audit is missing")
        official_domains = {
            urllib.parse.urlparse(x["url"]).hostname.lower().removeprefix("www.")
            for x in names.official_sources(proof["studio"])
        }
        url = urllib.parse.urlparse(proof["official_url"])
        domain = url.hostname.lower().removeprefix("www.")
        if domain not in official_domains:
            raise ValueError(f"gallery {key}: not an official studio provider")
        members = db.execute(
            """SELECT p.message_id,p.studio,p.title,p.universe,p.variant,
                      p.status,p.revision,a.sha256,a.source_relative,a.original_topic
               FROM model_group_members m
               JOIN name_proposals p ON p.message_id=m.message_id
               JOIN assets a ON a.message_id=m.message_id
               WHERE m.group_key=? ORDER BY p.message_id""", (key,)
        ).fetchall()
        if not 2 <= len(members) <= 96:
            raise ValueError(f"gallery {key}: multifoto size invalid")
        for row in members:
            if (row["studio"] != group["studio"]
                    or row["title"] != group["title"]
                    or row["universe"] != group["universe"]
                    or row["variant"] != group["variant"]
                    or row["original_topic"] != group["studio"]):
                raise ValueError(f"gallery {key}: individual variant/title conflict")
            prepared.append({
                "message_id": row["message_id"],
                "studio": row["studio"],
                "title": row["title"],
                "universe": row["universe"],
                "source_sha256": row["sha256"],
                "official_url": proof["official_url"],
                "visual_evidence_note": proof["visual_evidence_note"],
            })
    return validate_plan_rows(prepared)


def host_json(path: str, *, payload: dict | None = None, token: str = "") -> dict:
    if payload is None:
        request = urllib.request.Request(
            HOST + path,
            headers={"Accept": "application/json"},
        )
    else:
        request = urllib.request.Request(
            HOST + path,
            data=json.dumps(payload, ensure_ascii=False).encode("utf8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": HOST,
                "X-Tonart-Token": token,
            },
            method="POST",
        )
    with urllib.request.urlopen(request, timeout=9) as response:
        if response.status != 200:
            raise ValueError("unexpected Curadoria response code")
        body = response.read(400000)
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise ValueError("invalid Curadoria response")
    return parsed


def read_token() -> str:
    with urllib.request.urlopen(HOST + "/curadoria.js", timeout=7) as response:
        script = response.read(90000).decode("utf8")
    match = re.search(r'const TOKEN="([^"]{20,})";', script)
    if not match:
        raise ValueError("canonical Curadoria auth token unavailable")
    return match.group(1)


@contextmanager
def connect_sqlite(path: pathlib.Path):
    db = sqlite3.connect(
        "file:" + path.resolve().as_posix() + "?mode=ro",
        uri=True,
        timeout=5,
    )
    try:
        db.row_factory = sqlite3.Row
        yield db
    finally:
        # sqlite3.Connection.__exit__ only closes transactions, not the file.
        # Closing explicitly matters on Windows and for shared SQLite WAL.
        db.close()


def preflight(
    db: sqlite3.Connection,
    plan: list[dict],
    media_root: pathlib.Path,
    *,
    live_model=host_json,
) -> list[dict]:
    """Preflight all photos, variant boundaries, audit and live gallery *before* POST.

    A multifoto group must appear in its entirety with one consistent
    creator-specific source; one HTTP GET validates each group, not each image.
    Existing single-photo proof plans retain their previous contracts.
    """
    media_root = media_root.resolve()
    result = []
    plan_members = {}
    plan_sources = {}
    for item in plan:
        group = db.execute(
            "SELECT m.group_key FROM model_group_members m WHERE m.message_id=?",
            (item["message_id"],),
        ).fetchone()
        if group:
            plan_members.setdefault(group["group_key"], set()).add(item["message_id"])
            plan_sources.setdefault(group["group_key"], set()).add(item["official_url"])
    cache = {}
    for row in plan:
        mid = row["message_id"]
        proposal = db.execute(
            "SELECT * FROM name_proposals WHERE message_id=?", (mid,)
        ).fetchone()
        asset = db.execute(
            "SELECT * FROM assets WHERE message_id=?", (mid,)
        ).fetchone()
        group = db.execute(
            "SELECT g.* FROM model_groups g JOIN model_group_members m "
            "ON m.group_key=g.group_key WHERE m.message_id=?", (mid,)
        ).fetchone()
        if not proposal or not asset or not group:
            raise ValueError(f"image {mid}: source model/name missing")
        if (proposal["studio"] != row["studio"]
                or proposal["title"] != row["title"]
                or proposal["universe"] != row["universe"]
                or group["studio"] != row["studio"]
                or group["title"] != row["title"]):
            raise ValueError(f"image {mid}: source identity mismatch")
        key = group["group_key"]
        if key not in cache:
            members = [r[0] for r in db.execute(
                "SELECT message_id FROM model_group_members WHERE group_key=? "
                "ORDER BY message_id", (key,)
            )]
            if not members:
                raise ValueError(f"gallery {key}: no members")
            if len(members) > 1:
                if set(members) != plan_members.get(key, set()):
                    raise ValueError(f"gallery {key}: full multifoto proof required")
                if len(plan_sources.get(key, set())) != 1:
                    raise ValueError(f"gallery {key}: conflicting official sources")
                if not db.execute(
                    "SELECT 1 FROM curation_events WHERE group_key=? "
                    "AND event_type='visual_gallery_audited' LIMIT 1", (key,)
                ).fetchone():
                    raise ValueError(f"gallery {key}: visual audit missing")
                others = db.execute(
                    """SELECT p.studio,p.title,p.universe,p.variant,a.original_topic
                    FROM model_group_members m JOIN name_proposals p USING(message_id)
                    JOIN assets a USING(message_id) WHERE m.group_key=?""", (key,)
                ).fetchall()
                if any(
                    x["studio"] != group["studio"]
                    or x["title"] != group["title"]
                    or x["universe"] != group["universe"]
                    or x["variant"] != group["variant"]
                    or x["original_topic"] != group["studio"]
                    for x in others
                ):
                    raise ValueError(f"gallery {key}: mixed sculpture/variant")
            snapshot = live_model("/api/model/" + key)
            if (snapshot.get("title") != group["title"]
                    or snapshot.get("revision") != group["revision"]
                    or sorted(x.get("message_id") for x in snapshot.get("images", [])) != members):
                raise ValueError(f"gallery {key}: live host/gallery mismatch")
            cache[key] = (members, snapshot)
        photo = (media_root / asset["source_relative"]).resolve()
        if (not photo.is_relative_to(media_root) or not photo.is_file()
                or photo.name != f"msg_{mid}.jpg"):
            raise ValueError(f"image {mid}: original Telegram photo missing")
        if (sha256_file(photo) != row["source_sha256"]
                or asset["sha256"] != row["source_sha256"]):
            raise ValueError(f"image {mid}: physical SHA-256 changed")
        existing = (
            proposal["status"] == "confirmado"
            and proposal["official_url"] == row["official_url"]
            and proposal["revision"] >= 1
        )
        if not existing and (
            proposal["status"] != "provavel" or proposal["revision"] != 0
            or group["state"] != "provavel" or group["revision"] != 0
        ):
            raise ValueError(f"image {mid}: changed source/revision requires review")
        result.append({
            **row,
            "group_key": key,
            "variant": proposal["variant"] or "",
            "name_revision": proposal["revision"],
            "group_revision": group["revision"],
            "group_state": group["state"],
            "already_confirmed": existing,
        })
    return result


def execute(
    db: sqlite3.Connection,
    verified: list[dict],
    plan_digest: str,
    report: pathlib.Path,
    *,
    apply: bool = False,
    send=host_json,
    token_reader=read_token,
) -> dict:
    audit = {
        "schema": "tonart.private.name-review-through-host/1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "plan_sha256": plan_digest,
        "requested": len(verified),
        "applied": 0, "already_confirmed": 0,
        "public_tags_applied": 0, "character_links_applied": 0,
        "publication_rights_changed": False,
        "mode": "apply" if apply else "preflight_only",
        "items": [],
    }
    token = token_reader() if apply and any(
        not r["already_confirmed"] for r in verified
    ) else ""
    for row in verified:
        mid = row["message_id"]
        status = "already_confirmed" if row["already_confirmed"] else "pending"
        if apply and not row["already_confirmed"]:
            payload = {
                "message_id": mid, "revision": row["name_revision"],
                "title": row["title"], "studio": row["studio"],
                "universe": row["universe"], "variant": row["variant"],
                "official_url": row["official_url"], "status": "confirmado",
                "notes": (
                    "Nome conferido com a foto Telegram original SHA-256 e "
                    "título da galeria do próprio artista; evidência visual: "
                    + row["visual_evidence_note"] +
                    "; nomenclatura externa: " + row["official_url"] +
                    ". Não implica personagem aprovado, tags, direitos ou publicação."
                )[:1000],
            }
            answer = send("/api/review-name", payload=payload, token=token)
            if (answer.get("ok") is not True
                    or answer.get("revision") != row["name_revision"] + 1):
                raise ValueError(f"image {mid}: canonical host did not confirm write")
            latest = db.execute(
                "SELECT title,studio,status,revision,official_url "
                "FROM name_proposals WHERE message_id=?",(mid,)
            ).fetchone()
            if (
                latest["title"], latest["studio"], latest["status"],
                latest["revision"], latest["official_url"]
            ) != (
                row["title"], row["studio"], "confirmado",
                row["name_revision"] + 1, row["official_url"]
            ):
                raise ValueError(f"image {mid}: write not physically confirmed")
            status = "applied"
            audit["applied"] += 1
        elif apply:
            audit["already_confirmed"] += 1
        state = db.execute(
            "SELECT state,revision FROM model_groups WHERE group_key=?",
            (row["group_key"],)
        ).fetchone()
        if (state["state"],state["revision"]) != (
            row["group_state"],row["group_revision"]
        ):
            raise ValueError(f"image {mid}: unexpected model-group mutation")
        audit["items"].append({
            "message_id": mid, "group_key": row["group_key"],
            "name": row["title"], "result": status,
            "physical_sha256": row["source_sha256"],
            "source_url": row["official_url"],
        })
        atomic_json(report, audit)
        if apply:
            print(json.dumps({
                "message_id":mid,"name":row["title"],"result":status
            },ensure_ascii=False),flush=True)
    return audit


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite", required=True, type=pathlib.Path)
    parser.add_argument("--media-root", required=True, type=pathlib.Path)
    proof_source = parser.add_mutually_exclusive_group(required=True)
    proof_source.add_argument("--plan", type=pathlib.Path,
        help="Existing, individually reviewed photo SHA JSONL")
    proof_source.add_argument("--gallery-proofs", type=pathlib.Path,
        help="Editor-checked full gallery sources, expanded to photo SHA proofs")
    parser.add_argument("--report", required=True, type=pathlib.Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    with connect_sqlite(args.sqlite) as db:
        rows = (expand_gallery_proofs(db, load_gallery_proofs(args.gallery_proofs))
                if args.gallery_proofs else load_plan(args.plan))
    source_path = args.gallery_proofs or args.plan
    caps = host_json("/api/capabilities")
    if not any(
        item.get("path") == "/api/review-name"
        and item.get("effect") == "write"
        for item in caps.get("operations", [])
    ):
        raise ValueError("canonical Curadoria review-name endpoint unavailable")
    with connect_sqlite(args.sqlite) as db:
        verified = preflight(db, rows, args.media_root)
        print(f"PREFLIGHT_OK {len(verified)} images; apply={args.apply}",flush=True)
        result = execute(
            db, verified, sha256_file(source_path), args.report,
            apply=args.apply
        )
        print(json.dumps({
            "applied":result["applied"],
            "already_confirmed":result["already_confirmed"],
            "requested":result["requested"],
            "report":str(args.report),
        },ensure_ascii=False),flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
