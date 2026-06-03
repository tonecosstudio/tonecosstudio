#!/usr/bin/env python3
"""Update catalog_hash_index.json from one or more applied Telegram batch CSVs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_ROOT = Path.home() / "Downloads" / "telegram-2370335738-images"
CATALOG_HASH_INDEX = Path("catalogo") / "_controle" / "catalog_hash_index.json"
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


def destination_for_row(root: Path, row: dict[str, str]) -> Path:
    return (
        root
        / "catalogo"
        / safe_part(row.get("category", ""), "sem categoria")
        / safe_part(row.get("franchise", ""), "sem franquia")
        / safe_part(row.get("folder", ""), "sem pasta")
        / safe_part(row.get("filename", ""), "imagem.jpg")
    )


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def load_index(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"files": 0, "hashes_by_size": {}, "catalog_paths_by_sha256": {}}
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        return {"files": 0, "hashes_by_size": {}, "catalog_paths_by_sha256": {}}
    data.setdefault("hashes_by_size", {})
    data.setdefault("catalog_paths_by_sha256", {})
    return data


def update_index(root: Path, index_path: Path, batches: list[Path]) -> dict[str, int]:
    catalog = root / "catalogo"
    data = load_index(index_path)
    hashes_by_size: dict[str, dict[str, str]] = data.setdefault("hashes_by_size", {})
    paths_by_sha: dict[str, list[str]] = data.setdefault("catalog_paths_by_sha256", {})
    stats = {"rows": 0, "missing_destinations": 0, "added_paths": 0, "existing_paths": 0}

    for batch in batches:
        for row in read_csv(batch):
            stats["rows"] += 1
            destination = destination_for_row(root, row)
            if not destination.exists() or not destination.is_file():
                stats["missing_destinations"] += 1
                continue

            size_key = str(destination.stat().st_size)
            digest = sha256(destination)
            relpath = destination.relative_to(catalog).as_posix()

            hashes_by_size.setdefault(size_key, {}).setdefault(digest, relpath)
            relpaths = paths_by_sha.setdefault(digest, [])
            if relpath in relpaths:
                stats["existing_paths"] += 1
            else:
                relpaths.append(relpath)
                stats["added_paths"] += 1

    data["files"] = sum(len(paths) for paths in paths_by_sha.values() if isinstance(paths, list))
    data["updated_at"] = utc_now()
    index_path.parent.mkdir(parents=True, exist_ok=True)
    with index_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update Telegram catalog hash index from applied batch CSVs.")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--index", type=Path, default=None)
    parser.add_argument("--batch", type=Path, action="append", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    index = args.index.resolve() if args.index else root / CATALOG_HASH_INDEX
    batches = [batch.resolve() for batch in args.batch]
    stats = update_index(root, index, batches)
    print(f"Root={root}")
    print(f"Index={index}")
    for key, value in stats.items():
        print(f"{key}={value}")
    return 1 if stats["missing_destinations"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
