#!/usr/bin/env python3
"""Keep Telegram image downloads and the public catalog linked.

The Telegram downloader writes images into the root download folder. This
script treats that folder as immutable source storage: catalog operations copy
files into catalogo/ and record the source file name in a manifest.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
DEFAULT_ROOT = Path.home() / "Downloads" / "telegram-2370335738-images"
CONTROL_DIR = "catalogo/_controle"
CATALOG_MANIFEST = "catalog_manifest.jsonl"
PENDING_CSV = "pendentes.csv"
CATALOG_HASH_INDEX = "catalog_hash_index.json"
REQUIRED_DEST_FIELDS = ("category", "franchise", "folder", "filename")
MESSAGE_ID_RE = re.compile(r"_msg_(?P<message_id>\d+)_")
INVALID_PATH_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_part(value: str, fallback: str) -> str:
    value = INVALID_PATH_CHARS_RE.sub("_", value or "")
    value = re.sub(r"\s+", " ", value).strip().strip(".")
    return value or fallback


def parse_message_id(name: str) -> str:
    match = MESSAGE_ID_RE.search(name)
    return match.group("message_id") if match else ""


def control_path(root: Path, name: str) -> Path:
    return root / CONTROL_DIR / name


def iter_root_images(root: Path) -> Iterable[Path]:
    for path in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            yield path


def read_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict):
                yield data


def read_downloader_manifest(root: Path) -> dict[str, dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for record in read_jsonl(root / "manifest.jsonl"):
        raw_path = record.get("path")
        if not raw_path:
            continue
        by_name[Path(str(raw_path)).name] = record
    return by_name


def source_name(value: str) -> str:
    return Path(value).name


def load_known_sources(root: Path) -> set[str]:
    known: set[str] = set()
    manifest_path = control_path(root, CATALOG_MANIFEST)
    for record in read_jsonl(manifest_path):
        name = record.get("source_name") or record.get("source")
        if name:
            known.add(source_name(str(name)))

    control = root / CONTROL_DIR
    if control.exists():
        for batch in control.glob("lote_*.csv"):
            if "duplicados" in batch.name.lower():
                continue
            for row in read_csv(batch):
                if row.get("source"):
                    known.add(source_name(row["source"]))

        duplicates = control / "duplicados.csv"
        if duplicates.exists():
            for row in read_csv(duplicates):
                if row.get("source"):
                    known.add(source_name(row["source"]))

    return known


def load_catalog_hash_index(root: Path) -> dict[str, dict[str, str]]:
    index_path = control_path(root, CATALOG_HASH_INDEX)
    if not index_path.exists():
        return {}
    with index_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if isinstance(data, dict) and isinstance(data.get("hashes_by_size"), dict):
        return data["hashes_by_size"]
    if isinstance(data, dict):
        return data
    return {}


def load_applied_identities(root: Path, manifest_path: Path) -> dict[str, set[str]]:
    sources: set[str] = set()
    message_ids: set[str] = set()
    hashes: set[str] = set()

    for record in read_jsonl(manifest_path):
        name = record.get("source_name") or record.get("source")
        if name:
            sources.add(source_name(str(name)))
        message_id = record.get("message_id") or parse_message_id(str(name or ""))
        if message_id:
            message_ids.add(str(message_id))
        digest = record.get("sha256") or record.get("hash") or record.get("original_sha256")
        if digest:
            hashes.add(str(digest).strip().lower())

    duplicates = root / CONTROL_DIR / "duplicados.csv"
    if duplicates.exists():
        for row in read_csv(duplicates):
            name = row.get("source") or row.get("source_name")
            if name:
                sources.add(source_name(str(name)))
            message_id = row.get("message_id") or parse_message_id(str(name or ""))
            if message_id:
                message_ids.add(str(message_id))
            digest = row.get("sha256") or row.get("hash") or row.get("original_sha256")
            if digest:
                hashes.add(str(digest).strip().lower())

    return {"sources": sources, "message_ids": message_ids, "hashes": hashes}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def pending(args: argparse.Namespace) -> int:
    root = args.root.resolve()
    output = args.output or control_path(root, PENDING_CSV)
    output = output.resolve()

    downloader_manifest = read_downloader_manifest(root)
    known_sources = load_known_sources(root)
    catalog_hashes = {} if args.no_hash_index else load_catalog_hash_index(root)

    rows: list[dict[str, Any]] = []
    scanned = 0
    known_by_source = 0
    known_by_hash = 0
    empty = 0

    for path in iter_root_images(root):
        scanned += 1
        size = path.stat().st_size
        if size <= 0:
            empty += 1
            continue
        if path.name in known_sources:
            known_by_source += 1
            continue

        if catalog_hashes:
            possible = catalog_hashes.get(str(size))
            if possible:
                digest = sha256(path)
                if digest in possible:
                    known_by_hash += 1
                    continue

        record = downloader_manifest.get(path.name, {})
        rows.append(
            {
                "source": path.name,
                "size": size,
                "message_id": record.get("message_id") or parse_message_id(path.name),
                "date": record.get("date") or "",
                "original_name": record.get("original_name") or "",
                "caption": record.get("caption") or "",
                "category": "",
                "franchise": "",
                "folder": "",
                "filename": "",
                "confidence": "",
                "notes": "",
            }
        )

    write_csv(
        output,
        rows,
        [
            "source",
            "size",
            "message_id",
            "date",
            "original_name",
            "caption",
            "category",
            "franchise",
            "folder",
            "filename",
            "confidence",
            "notes",
        ],
    )

    print(f"Root={root}")
    print(f"Output={output}")
    print(f"ScannedRootImages={scanned}")
    print(f"AlreadyKnownBySource={known_by_source}")
    print(f"AlreadyKnownByCatalogHash={known_by_hash}")
    print(f"SkippedEmptyFiles={empty}")
    print(f"Pending={len(rows)}")
    return 0


def batch_paths(root: Path, args: argparse.Namespace) -> list[Path]:
    if args.all_batches:
        control = root / CONTROL_DIR
        paths = [
            path
            for path in sorted(control.glob("lote_*.csv"), key=lambda item: item.name.lower())
            if "duplicados" not in path.name.lower()
        ]
        return paths
    return [path.resolve() for path in args.batch]


def destination_for_row(root: Path, row: dict[str, str]) -> Path:
    category = safe_part(row.get("category", ""), "sem categoria")
    franchise = safe_part(row.get("franchise", ""), "sem franquia")
    folder = safe_part(row.get("folder", ""), "sem pasta")
    filename = safe_part(row.get("filename", ""), "imagem.jpg")
    return root / "catalogo" / category / franchise / folder / filename


def has_destination_fields(row: dict[str, str]) -> bool:
    return all(row.get(field, "").strip() for field in REQUIRED_DEST_FIELDS)


def manifest_key(source: str, catalog_relpath: str) -> str:
    return f"{source}\0{catalog_relpath}"


def load_manifest_keys(path: Path) -> set[str]:
    keys: set[str] = set()
    for record in read_jsonl(path):
        source = record.get("source_name") or record.get("source")
        catalog_relpath = record.get("catalog_relpath") or record.get("destination")
        if source and catalog_relpath:
            keys.add(manifest_key(source_name(str(source)), str(catalog_relpath)))
    return keys


def append_manifest(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def apply_batches(args: argparse.Namespace) -> int:
    root = args.root.resolve()
    manifest_path = (args.manifest or control_path(root, CATALOG_MANIFEST)).resolve()
    downloader_manifest = read_downloader_manifest(root)
    existing_keys = load_manifest_keys(manifest_path)
    applied = load_applied_identities(root, manifest_path)
    catalog_hashes = {} if args.no_hash_index else load_catalog_hash_index(root)

    stats = {
        "rows": 0,
        "copied": 0,
        "already_exists": 0,
        "already_cataloged_source": 0,
        "duplicate_catalog_hash": 0,
        "missing": 0,
        "empty": 0,
        "incomplete": 0,
        "conflicts": 0,
        "manifest_appended": 0,
    }
    manifest_records: list[dict[str, Any]] = []

    catalog_root = (root / "catalogo").resolve()
    for batch in batch_paths(root, args):
        for row in read_csv(batch):
            stats["rows"] += 1
            raw_source = row.get("source", "").strip()
            if not raw_source:
                stats["missing"] += 1
                continue
            if not args.allow_incomplete and not has_destination_fields(row):
                stats["incomplete"] += 1
                continue

            source = Path(raw_source)
            if not source.is_absolute():
                source = root / raw_source
            source = source.resolve()
            if not source.exists():
                stats["missing"] += 1
                continue
            size = source.stat().st_size
            if size <= 0:
                stats["empty"] += 1
                continue

            message_id = parse_message_id(source.name)
            if source.name in applied["sources"] or (message_id and message_id in applied["message_ids"]):
                stats["already_cataloged_source"] += 1
                continue

            destination = destination_for_row(root, row).resolve()
            if not str(destination).lower().startswith(str(catalog_root).lower()):
                stats["conflicts"] += 1
                continue

            digest = sha256(source)
            possible = catalog_hashes.get(str(size)) if catalog_hashes else None
            if digest in applied["hashes"] or (possible and digest in possible):
                stats["duplicate_catalog_hash"] += 1
                continue

            status = "copied"
            if destination.exists():
                if not args.overwrite:
                    if destination.stat().st_size == size and sha256(destination) == digest:
                        status = "already_exists"
                        stats["already_exists"] += 1
                    else:
                        stats["conflicts"] += 1
                        continue
                elif not args.dry_run:
                    shutil.copy2(source, destination)
                    stats["copied"] += 1
            elif not args.dry_run:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
                stats["copied"] += 1
            else:
                stats["copied"] += 1

            catalog_relpath = destination.relative_to(root / "catalogo").as_posix()
            key = manifest_key(source.name, catalog_relpath)
            if key in existing_keys:
                continue
            existing_keys.add(key)

            download_record = downloader_manifest.get(source.name, {})
            manifest_records.append(
                {
                    "status": status if not args.dry_run else f"dry_run_{status}",
                    "copied_at": utc_now(),
                    "batch": str(batch),
                    "source_name": source.name,
                    "source_path": str(source),
                    "catalog_relpath": catalog_relpath,
                    "catalog_path": str(destination),
                    "size": size,
                    "sha256": digest,
                    "message_id": download_record.get("message_id") or parse_message_id(source.name),
                    "date": download_record.get("date") or "",
                    "original_name": download_record.get("original_name") or "",
                    "caption": download_record.get("caption") or "",
                    "category": row.get("category", ""),
                    "franchise": row.get("franchise", ""),
                    "folder": row.get("folder", ""),
                    "filename": row.get("filename", ""),
                    "confidence": row.get("confidence", ""),
                    "notes": row.get("notes", ""),
                }
            )

    if manifest_records and not args.dry_run:
        append_manifest(manifest_path, manifest_records)
        stats["manifest_appended"] = len(manifest_records)

    print(f"Root={root}")
    print(f"Manifest={manifest_path}")
    print(f"DryRun={args.dry_run}")
    for key, value in stats.items():
        print(f"{key}={value}")
    if args.dry_run:
        print(f"manifest_would_append={len(manifest_records)}")

    return 1 if stats["conflicts"] or stats["missing"] else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy Telegram images into catalogo without losing source identity.")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Telegram image download folder.")

    subparsers = parser.add_subparsers(dest="command", required=True)

    pending_parser = subparsers.add_parser("pending", help="Write a CSV with root images not yet cataloged.")
    pending_parser.add_argument("--output", type=Path, help="Pending CSV path.")
    pending_parser.add_argument("--no-hash-index", action="store_true", help="Do not use catalog_hash_index.json.")
    pending_parser.set_defaults(func=pending)

    apply_parser = subparsers.add_parser("apply", help="Copy one or more filled batch CSVs into catalogo.")
    apply_parser.add_argument("--batch", type=Path, action="append", default=[], help="Batch CSV to apply.")
    apply_parser.add_argument("--all-batches", action="store_true", help="Apply every lote_*.csv except duplicate batches.")
    apply_parser.add_argument("--manifest", type=Path, help="Catalog manifest JSONL path.")
    apply_parser.add_argument("--dry-run", action="store_true", help="Report what would happen without copying.")
    apply_parser.add_argument("--overwrite", action="store_true", help="Overwrite destination files.")
    apply_parser.add_argument("--no-hash-index", action="store_true", help="Do not use catalog_hash_index.json.")
    apply_parser.add_argument(
        "--allow-incomplete",
        action="store_true",
        help="Allow blank destination fields, using safe fallback folders.",
    )
    apply_parser.set_defaults(func=apply_batches)

    args = parser.parse_args()
    if args.command == "apply" and not args.all_batches and not args.batch:
        parser.error("apply requires --batch or --all-batches")
    return args


def main() -> int:
    args = parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
