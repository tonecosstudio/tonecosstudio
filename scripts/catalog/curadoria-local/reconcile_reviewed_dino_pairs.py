#!/usr/bin/env python3
"""Reconcile cached DINO pairs against live Curadoria state.

Cached similarity is only a queueing signal. Writes are limited to pairs whose
current, complete galleries already have a positive same_sculpture audit for
every member, identical editorial identity/variant, and an unconfirmed state.
All merges still pass through Curadoria's CAS + SHA-verifying API.
"""
from __future__ import annotations

import argparse
from itertools import combinations
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path


def read_snapshot(database: Path) -> tuple[dict[int, dict], dict[int, tuple[str, str]]]:
    """Return live groups and latest positive visual-audit proof per member."""
    uri = database.resolve().as_uri() + "?mode=ro"
    with sqlite3.connect(uri, uri=True, timeout=5) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            """SELECT g.group_key,g.studio,g.title,g.universe,g.variant,g.state,
                      g.revision,m.message_id,a.sha256
                 FROM model_groups g
                 JOIN model_group_members m USING(group_key)
                 JOIN assets a USING(message_id)
                ORDER BY g.group_key,m.message_id"""
        ).fetchall()
        groups: dict[int, dict] = {}
        for row in rows:
            item = dict(row)
            key = item.pop("group_key")
            group = groups.setdefault(key, {
                **{field: item[field] for field in
                   ("studio", "title", "universe", "variant", "state", "revision")},
                "images": [],
            })
            group["images"].append({"message_id": item["message_id"], "sha256": item["sha256"]})

        audit_rows = db.execute(
            """SELECT event_id,detail FROM curation_events
                WHERE event_type='visual_gallery_audited' ORDER BY event_id"""
        ).fetchall()
    audits: dict[int, tuple[int, str, str]] = {}
    for row in audit_rows:
        try:
            detail = json.loads(row["detail"])
            ids, hashes = detail["member_ids"], detail["sha256s"]
            if len(ids) != len(hashes):
                continue
            for message_id, digest in zip(ids, hashes):
                if type(message_id) is int and isinstance(digest, str):
                    audits[message_id] = (row["event_id"], detail.get("classification", ""), digest)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            continue

    positive = {
        message_id: (classification, digest)
        for message_id, (_event_id, classification, digest) in audits.items()
    }
    return groups, positive


def classify_pair(pair: dict, groups: dict, positive_audits: dict) -> dict:
    """Classify a cached pair without trusting its cached group keys."""
    images = pair.get("images")
    if not isinstance(images, list) or len(images) != 2:
        return {"status": "invalid_candidate"}
    ids = [image.get("message_id") for image in images]
    if any(type(message_id) is not int for message_id in ids) or ids[0] == ids[1]:
        return {"status": "invalid_candidate"}
    located = []
    expected_sha = {image["message_id"]: image.get("sha256") for image in images}
    for message_id in ids:
        matches = [(key, group) for key, group in groups.items()
                   if any(image["message_id"] == message_id for image in group["images"])]
        if len(matches) != 1:
            return {"status": "missing_or_ambiguous_live_member", "message_ids": ids}
        key, group = matches[0]
        live_image = next(image for image in group["images"] if image["message_id"] == message_id)
        if expected_sha.get(message_id) and expected_sha[message_id] != live_image["sha256"]:
            return {"status": "stale_candidate_sha_hold", "message_ids": ids}
        located.append((key, group))
    (key_a, a), (key_b, b) = located
    result = {"message_ids": ids, "live_group_keys": [key_a, key_b],
              "score": pair.get("score"), "studio": pair.get("studio"),
              "source_kind": pair.get("source_kind", "strong_pair")}
    if key_a == key_b:
        return {**result, "status": "already_merged", "member_count": len(a["images"])}
    fields = ("studio", "title", "universe", "variant")
    if any(a.get(field) != b.get(field) for field in fields):
        return {**result, "status": "editorial_or_variant_conflict"}
    if a["state"] == "confirmado" or b["state"] == "confirmado":
        return {**result, "status": "confirmed_identity_hold"}
    for group in (a, b):
        for image in group["images"]:
            audit = positive_audits.get(image["message_id"])
            if not audit or audit != ("same_sculpture", image["sha256"]):
                return {**result, "status": "visual_review_required"}
    return {**result, "status": "ready_from_existing_visual_audits",
            "title": a["title"], "studio": a["studio"],
            "member_ids": [[image["message_id"] for image in a["images"]],
                           [image["message_id"] for image in b["images"]]]}


def expand_candidates(report: dict) -> list[dict]:
    """Include pairwise edges from both embedding suggestions and exact-SHA clusters."""
    candidates = []
    strong_pairs = report.get("strong_pairs", [])
    exact_clusters = report.get("exact_clusters", [])
    if not isinstance(strong_pairs, list) or not isinstance(exact_clusters, list):
        raise ValueError("Relatório visual inválido")
    candidates.extend({**pair, "source_kind": "strong_pair"} for pair in strong_pairs)
    for cluster in exact_clusters:
        ids = cluster.get("message_ids")
        digest = cluster.get("sha256")
        if (not isinstance(ids, list) or len(ids) < 2 or
                not isinstance(digest, str) or len(digest) != 64):
            continue
        for left, right in combinations(ids, 2):
            candidates.append({
                "studio": cluster.get("studio"), "score": 1.0,
                "source_kind": "exact_sha_cluster",
                "images": [{"message_id": left, "sha256": digest},
                           {"message_id": right, "sha256": digest}],
            })
    if not candidates:
        raise ValueError("O relatório não contém strong_pairs nem exact_clusters")
    return candidates


def _request(api: str, path: str, token: str, *, write: dict | None = None) -> dict:
    headers = {"X-Curadoria-Token": token, "Accept": "application/json"}
    data = None
    if write is not None:
        headers.update({"Origin": api, "X-Tonart-Token": token,
                        "Content-Type": "application/json"})
        data = json.dumps(write, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(api + path, data=data, headers=headers,
                                      method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        body = exc.read(4096).decode("utf-8", errors="replace")
        raise RuntimeError(f"Curadoria HTTP {exc.code}: {body}") from exc


def reconcile(database: Path, report: dict, api: str, token: str, apply: bool) -> dict:
    candidates = expand_candidates(report)
    results = []
    groups, audits = read_snapshot(database)
    for candidate in candidates:
        plan = classify_pair(candidate, groups, audits)
        if plan["status"] != "ready_from_existing_visual_audits" or not apply:
            results.append(plan)
            continue

        # Refresh immediately before a write, then retain the new snapshot until
        # this process changes state again. Curadoria CAS handles other writers.
        groups, audits = read_snapshot(database)
        plan = classify_pair(candidate, groups, audits)
        if plan["status"] != "ready_from_existing_visual_audits":
            results.append(plan)
            continue

        key_a, key_b = plan["live_group_keys"]
        a, b = _request(api, f"/api/model/{key_a}", token), _request(api, f"/api/model/{key_b}", token)
        if a.get("group_key") != key_a or b.get("group_key") != key_b:
            results.append({**plan, "status": "concurrent_change_hold"})
            continue
        if any(a.get(field) != b.get(field) for field in ("studio", "title", "universe", "variant")):
            results.append({**plan, "status": "editorial_or_variant_conflict"})
            continue
        if any(a.get(field) != groups[key_a].get(field) for field in
               ("studio", "title", "universe", "variant", "state", "revision")) or \
           any(b.get(field) != groups[key_b].get(field) for field in
               ("studio", "title", "universe", "variant", "state", "revision")):
            results.append({**plan, "status": "concurrent_change_hold"})
            continue
        proofs = [{"message_id": image["message_id"], "sha256": image["sha256"]}
                  for model in (a, b) for image in model["images"]]
        body = {
            "target": key_a, "source": key_b,
            "target_rev": a["revision"], "source_rev": b["revision"],
            "proofs": proofs,
            "note": ("Aplicação idempotente de auditorias visuais positivas same_sculpture "
                     "preexistentes; galerias completas e SHA conferidos; identidade e variante "
                     "iguais. Nomes, direitos e publicação não foram aprovados nem alterados."),
        }
        try:
            mutation = _request(api, "/api/merge-reviewed-galleries", token, write=body)
        except RuntimeError as exc:
            results.append({**plan, "status": "merge_rejected", "reason": str(exc)[:500]})
            continue
        refreshed, _ = read_snapshot(database)
        final = refreshed.get(key_a)
        message_ids = set(ids for ids in plan["message_ids"])
        final_ids = {image["message_id"] for image in final["images"]} if final else set()
        if (not final or not message_ids <= final_ids or mutation.get("names_changed")
                or mutation.get("rights_changed")):
            raise RuntimeError("A fusão não passou na verificação de leitura posterior")
        results.append({**plan, "status": "merged", "group_key": key_a,
                        "revision": final["revision"], "member_count": len(final_ids),
                        "names_changed": False, "rights_changed": False})
    counts: dict[str, int] = {}
    for result in results:
        counts[result["status"]] = counts.get(result["status"], 0) + 1
    return {"schema": "tonart.reviewed-dino-reconciliation/2",
            "applied": apply, "candidate_count": len(candidates),
            "counts": counts, "results": results}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path, help="SQLite vivo da Curadoria")
    parser.add_argument("--candidate-report", required=True, type=Path, help="Cache JSON do DINO/triagem")
    parser.add_argument("--api", default="http://127.0.0.1:8769", help="API local canônica da Curadoria")
    parser.add_argument("--token-file", type=Path, help="Arquivo local token-local.txt; não é exibido")
    parser.add_argument("--apply", action="store_true", help="Fundir somente pares já auditados same_sculpture")
    parser.add_argument("--output", type=Path, help="Salvar recibo JSON sem dados de autenticação")
    args = parser.parse_args(argv)
    token = os.environ.get("TONART_CURADORIA_TOKEN", "")
    if args.token_file:
        token = args.token_file.read_text(encoding="ascii").strip()
    if args.apply and not token:
        parser.error("--apply requer --token-file ou TONART_CURADORIA_TOKEN")
    try:
        report = json.loads(args.candidate_report.read_text(encoding="utf-8"))
        result = reconcile(args.database, report, args.api.rstrip("/"), token, args.apply)
    except (OSError, json.JSONDecodeError, sqlite3.Error, ValueError, RuntimeError) as exc:
        print(f"reconciliação não concluída: {exc}", file=sys.stderr)
        return 1
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
