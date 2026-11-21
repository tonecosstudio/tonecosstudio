#!/usr/bin/env python3
"""Auditoria local do manifesto WebP privado: originais, derivações e proveniência."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path.home() / "Downloads" / "telegram-2370335738-images"
OUTPUT = Path.home() / "Documents" / "TONART-Telegram-Import" / "otimizacao-privada" / "webp"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff", ".tif", ".avif", ".heic", ".heif"}
PROFILE_SIZES = {"telegram-webp-final-v1": (900, 512)}


def sha256(file: Path):
    h = hashlib.sha256()
    with file.open("rb") as fh:
        for part in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(part)
    return h.hexdigest()


def safe_path(root: Path, rel: str):
    path = (root / rel).resolve()
    if root.resolve() not in path.parents:
        raise ValueError("path_outside_root: " + str(rel))
    return path


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=ROOT)
    p.add_argument("--output", type=Path, default=OUTPUT)
    p.add_argument("--db", type=Path, default=Path.home() / "Documents" / "TONART-Telegram-Import" / "espelho-telegram" / "curadoria-local" / "curadoria.sqlite3")
    p.add_argument("--report", type=Path)
    args = p.parse_args()
    root, output = args.root.resolve(), args.output.resolve()
    manifest = output / "manifests" / "manifest_final.jsonl"
    if not manifest.is_file():
        raise ValueError("manifest_final.jsonl nao encontrado")
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    db = sqlite3.connect("file:" + args.db.resolve().as_posix() + "?mode=ro", uri=True)
    try:
        assets = db.execute("SELECT message_id, sha256, source_relative, original_topic FROM assets").fetchall()
    finally:
        db.close()
    expected = {}
    general = 0
    for mid, sha, relative, topic in assets:
        if " ".join(str(topic or "").casefold().split()) == "geral + 50k":
            general += 1
        else:
            expected[int(mid)] = {"sha": str(sha).lower(),
                                  "relative": str(relative).replace("\\", "/"),
                                  "topic": str(topic or "")}
    by_message = {}
    problems = []
    for row in rows:
        mid = int(row.get("message_id") or 0)
        if mid not in expected:
            problems.append(["not_studio_or_general", mid])
            continue
        if mid in by_message:
            problems.append(["duplicate_message", mid])
        by_message[mid] = row
        if row.get("source_sha256") != expected[mid]["sha"]:
            problems.append(["hash_provenance_mismatch", mid])
        if row.get("source_name") != expected[mid]["relative"]:
            problems.append(["path_provenance_mismatch", mid])
        if row.get("original_topic") and row["original_topic"] != expected[mid]["topic"]:
            problems.append(["topic_provenance_mismatch", mid])
        if not row.get("private_staging_only"):
            problems.append(["not_private", mid])
    original_bytes = 0
    unique_original_bytes = 0
    validated_sources = {}
    pending = missing = invalid_hashes = unsupported = 0
    for mid, item in expected.items():
        try:
            src = safe_path(root, item["relative"])
        except ValueError:
            problems.append(["unsafe_original", mid])
            continue
        if src.suffix.lower() not in EXTS:
            unsupported += 1
            continue
        if not src.is_file():
            missing += 1
            continue
        length = src.stat().st_size
        original_bytes += length
        if sha256(src) != item["sha"]:
            invalid_hashes += 1
            problems.append(["original_sha256_mismatch", mid])
            continue
        if item["sha"] not in validated_sources:
            validated_sources[item["sha"]] = length
            unique_original_bytes += length
        if mid not in by_message:
            pending += 1
    validated_webps = {}
    message_converted = 0
    for mid, row in by_message.items():
        if mid not in expected:
            continue
        sha = expected[mid]["sha"]
        key = (str(row.get("telegram_origin_id", "2370335738")), sha, str(row.get("profile_version")))
        if sha not in validated_sources:
            continue
        rels = (row.get("display_relpath"), row.get("thumb_relpath"))
        if any(not rel for rel in rels):
            problems.append(["missing_derivation", mid])
            continue
        if key in validated_webps:
            if validated_webps[key]["paths"] != rels:
                problems.append(["duplicate_derivations_for_same_sha", mid])
                continue
            message_converted += 1
            continue
        if key[2] not in PROFILE_SIZES:
            problems.append(["unknown_profile_version", mid])
            continue
        sizes = []
        valid = True
        for variant, rel, maximum in zip(("display", "thumb"), rels, PROFILE_SIZES[key[2]]):
            try:
                file = safe_path(output, str(rel))
                if not file.is_file():
                    raise ValueError("webp_missing")
                with file.open("rb") as fh:
                    header = fh.read(12)
                if header[:4] != b"RIFF" or header[8:12] != b"WEBP":
                    raise ValueError("not_webp")
                if file.stat().st_size != row.get(variant + "_bytes"):
                    raise ValueError("size_mismatch")
                if max(int(row.get(variant + "_width") or 0), int(row.get(variant + "_height") or 0)) > maximum:
                    raise ValueError("oversized_derivation")
                if row.get(variant + "_sha256") and sha256(file) != row[variant + "_sha256"]:
                    raise ValueError("derivation_sha256_mismatch")
                sizes.append(file.stat().st_size)
            except (OSError, ValueError) as e:
                problems.append(["invalid_" + variant, mid, str(e)])
                valid = False
        if valid:
            validated_webps[key] = {"paths": rels, "bytes": sum(sizes)}
            message_converted += 1
    converted_bytes = sum(x["bytes"] for x in validated_webps.values())
    report = {
        "studio_messages": len(expected),
        "general_excluded_messages": general,
        "studio_unique_sha256": len(set(x["sha"] for x in expected.values())),
        "validated_original_unique_sha256": len(validated_sources),
        "converted_unique_sha256": len(validated_webps),
        "converted_messages": message_converted,
        "pending_valid_messages": pending,
        "missing_originals": missing,
        "unsupported_extensions": unsupported,
        "invalid_source_hashes": invalid_hashes,
        "manifest_rows": len(rows),
        "original_bytes_all_messages": original_bytes,
        "original_bytes_unique_sha256": unique_original_bytes,
        "webp_display_plus_thumbs_unique_bytes": converted_bytes,
        "reduction_pct_unique": round(100 * (1 - converted_bytes / max(unique_original_bytes, 1)), 2),
        "public_upload_performed": False,
        "errors": problems[:50], "error_count": len(problems)
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    if problems or pending or missing or invalid_hashes:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
