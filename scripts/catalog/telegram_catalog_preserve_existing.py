#!/usr/bin/env python3
"""Preserve an existing Telegram catalog before creating new batches.

This is the "etapa zero" companion for telegram_catalog_sync.py. It treats the
Telegram download root as immutable source storage and only writes control
files under catalogo/_controle.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath
from typing import Any, Iterable


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
DEFAULT_ROOT = Path.home() / "Downloads" / "telegram-2370335738-images"
CONTROL_DIR = Path("catalogo") / "_controle"
CATALOG_MANIFEST = "catalog_manifest.jsonl"
CATALOG_HASH_INDEX = "catalog_hash_index.json"
PENDING_CSV = "pendentes.csv"
REPORT_JSON = "etapa_zero_report.json"
MESSAGE_ID_RE = re.compile(r"_msg_(?P<message_id>\d+)_")
INVALID_PATH_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
DEST_FIELDS = ("category", "franchise", "folder", "filename")
HASH_COLUMNS = ("sha256", "hash", "image_hash", "original_sha256")
FILE_ATTRIBUTE_OFFLINE = 0x00001000
FILE_ATTRIBUTE_RECALL_ON_OPEN = 0x00040000
FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 0x00400000
OFFLINE_ATTRIBUTE_MASK = (
    FILE_ATTRIBUTE_OFFLINE
    | FILE_ATTRIBUTE_RECALL_ON_OPEN
    | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS
)


@dataclass(frozen=True)
class ImageRecord:
    path: Path
    relpath: str
    size: int
    sha256: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log(message: str) -> None:
    print(message, flush=True)


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


def source_name(value: str | None) -> str:
    if not value:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    return PureWindowsPath(text).name or Path(text).name


def parse_message_id(value: str | None) -> str:
    name = source_name(value)
    match = MESSAGE_ID_RE.search(name)
    return match.group("message_id") if match else ""


def normalize_hash(value: str | None) -> str:
    return str(value or "").strip().lower()


def control_path(root: Path, name: str) -> Path:
    return root / CONTROL_DIR / name


def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTS


def requires_cloud_recall(stat_result: Any) -> bool:
    attributes = int(getattr(stat_result, "st_file_attributes", 0) or 0)
    return bool(attributes & OFFLINE_ATTRIBUTE_MASK)


def iter_root_images(root: Path) -> Iterable[Path]:
    for path in root.iterdir():
        if is_image(path):
            yield path


def iter_catalog_images(root: Path) -> Iterable[Path]:
    catalog = root / "catalogo"
    for path in sorted(catalog.rglob("*"), key=lambda item: item.as_posix().lower()):
        if not is_image(path):
            continue
        rel = path.relative_to(catalog).as_posix()
        rel_lower = rel.lower()
        if rel_lower.startswith("_controle/") or rel_lower.startswith("_duplicados/"):
            continue
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


def read_csv(path: Path) -> Iterable[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        yield from csv.DictReader(file)


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def append_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def destination_relpath(row: dict[str, str]) -> str:
    if not all(row.get(field, "").strip() for field in DEST_FIELDS):
        return ""
    return "/".join(
        [
            safe_part(row.get("category", ""), "sem categoria"),
            safe_part(row.get("franchise", ""), "sem franquia"),
            safe_part(row.get("folder", ""), "sem pasta"),
            safe_part(row.get("filename", ""), "imagem.jpg"),
        ]
    )


def read_downloader_manifest(root: Path) -> dict[str, dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for record in read_jsonl(root / "manifest.jsonl"):
        raw_path = record.get("path")
        name = source_name(str(raw_path)) if raw_path else source_name(record.get("file_name"))
        if name:
            by_name[name] = record
    return by_name


def manifest_key(source: str, catalog_relpath: str) -> str:
    return f"{source}\0{catalog_relpath}"


def load_existing_manifest(path: Path) -> tuple[set[str], set[str], set[str], set[str], set[str], int]:
    keys: set[str] = set()
    source_names: set[str] = set()
    message_ids: set[str] = set()
    hashes: set[str] = set()
    catalog_relpaths: set[str] = set()
    records = 0

    for record in read_jsonl(path):
        records += 1
        source = source_name(record.get("source_name") or record.get("source"))
        rel = str(record.get("catalog_relpath") or record.get("destination") or "").strip()
        digest = normalize_hash(record.get("sha256") or record.get("hash") or record.get("original_sha256"))
        message_id = str(record.get("message_id") or parse_message_id(source)).strip()

        if source:
            source_names.add(source)
        if message_id:
            message_ids.add(message_id)
        if digest:
            hashes.add(digest)
        if rel:
            catalog_relpaths.add(rel)
        if source and rel:
            keys.add(manifest_key(source, rel))

    return keys, source_names, message_ids, hashes, catalog_relpaths, records


def load_control_csvs(control: Path) -> dict[str, Any]:
    sources: set[str] = set()
    message_ids: set[str] = set()
    hashes: set[str] = set()
    rows_by_relpath: dict[str, dict[str, str]] = {}
    row_counts: dict[str, int] = {}
    duplicate_rows = 0
    batch_rows = 0

    csv_paths = sorted(control.glob("lote_*.csv"), key=lambda item: item.name.lower())
    duplicates_path = control / "duplicados.csv"
    if duplicates_path.exists():
        csv_paths.append(duplicates_path)

    for csv_path in csv_paths:
        count = 0
        is_duplicate_file = "duplicados" in csv_path.name.lower()
        for row in read_csv(csv_path):
            count += 1
            name = source_name(row.get("source") or row.get("source_name"))
            if name:
                sources.add(name)
                parsed_message_id = parse_message_id(name)
                if parsed_message_id:
                    message_ids.add(parsed_message_id)
            explicit_message_id = str(row.get("message_id") or "").strip()
            if explicit_message_id:
                message_ids.add(explicit_message_id)
            for column in HASH_COLUMNS:
                digest = normalize_hash(row.get(column))
                if digest:
                    hashes.add(digest)

            rel = destination_relpath(row)
            if rel and not is_duplicate_file:
                rows_by_relpath.setdefault(rel, {**row, "_batch": csv_path.name})

        row_counts[csv_path.name] = count
        if is_duplicate_file:
            duplicate_rows += count
        else:
            batch_rows += count

    return {
        "sources": sources,
        "message_ids": message_ids,
        "hashes": hashes,
        "rows_by_relpath": rows_by_relpath,
        "row_counts": row_counts,
        "batch_rows": batch_rows,
        "duplicate_rows": duplicate_rows,
        "files_read": len(csv_paths),
    }


def index_catalog(root: Path) -> tuple[list[ImageRecord], dict[str, dict[str, str]], dict[str, list[str]]]:
    catalog = root / "catalogo"
    records: list[ImageRecord] = []
    hashes_by_size: dict[str, dict[str, str]] = defaultdict(dict)
    paths_by_sha: dict[str, list[str]] = defaultdict(list)

    for path in iter_catalog_images(root):
        size = path.stat().st_size
        digest = sha256(path)
        rel = path.relative_to(catalog).as_posix()
        records.append(ImageRecord(path=path, relpath=rel, size=size, sha256=digest))
        hashes_by_size[str(size)].setdefault(digest, rel)
        paths_by_sha[digest].append(rel)

    return records, dict(hashes_by_size), dict(paths_by_sha)


def load_catalog_hash_index(root: Path, index_path: Path) -> tuple[list[ImageRecord], dict[str, dict[str, str]], dict[str, list[str]]]:
    catalog = root / "catalogo"
    with index_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    raw_hashes_by_size = data.get("hashes_by_size", {}) if isinstance(data, dict) else {}
    if not isinstance(raw_hashes_by_size, dict):
        raise ValueError(f"Invalid hash index: {index_path}")

    records: list[ImageRecord] = []
    hashes_by_size: dict[str, dict[str, str]] = {}
    paths_by_sha: dict[str, list[str]] = defaultdict(list)

    raw_paths_by_sha = data.get("catalog_paths_by_sha256", {}) if isinstance(data, dict) else {}
    if not isinstance(raw_paths_by_sha, dict):
        raw_paths_by_sha = {}

    for size_key, hash_map in raw_hashes_by_size.items():
        if not isinstance(hash_map, dict):
            continue
        size = int(size_key)
        hashes_by_size.setdefault(str(size), {})
        for digest, rel_value in hash_map.items():
            digest = normalize_hash(digest)
            relpaths = raw_paths_by_sha.get(digest)
            if not isinstance(relpaths, list) or not relpaths:
                relpaths = [rel_value]
            relpaths = [str(relpath).replace("\\", "/") for relpath in relpaths if relpath]
            if not relpaths:
                continue
            hashes_by_size[str(size)].setdefault(digest, relpaths[0])
            for relpath in relpaths:
                records.append(ImageRecord(path=catalog / relpath, relpath=relpath, size=size, sha256=digest))
                if relpath not in paths_by_sha[digest]:
                    paths_by_sha[digest].append(relpath)

    return records, hashes_by_size, dict(paths_by_sha)


def index_root(
    root: Path,
    hash_sizes: set[int],
    skip_sources: set[str],
    skip_message_ids: set[str],
    skip_offline_hashes: bool,
) -> tuple[list[ImageRecord], dict[str, ImageRecord], dict[str, list[ImageRecord]], int, set[str]]:
    records: list[ImageRecord] = []
    by_name: dict[str, ImageRecord] = {}
    by_sha: dict[str, list[ImageRecord]] = defaultdict(list)
    hashed = 0
    hash_skipped_sources: set[str] = set()

    for path in iter_root_images(root):
        stat_result = path.stat()
        size = stat_result.st_size
        message_id = parse_message_id(path.name)
        should_hash = size in hash_sizes and path.name not in skip_sources and message_id not in skip_message_ids
        digest = ""
        if should_hash:
            if skip_offline_hashes and requires_cloud_recall(stat_result):
                hash_skipped_sources.add(path.name)
            else:
                if hashed and hashed % 100 == 0:
                    log(f"RootHashProgress={hashed}")
                digest = sha256(path)
        if digest:
            hashed += 1
        record = ImageRecord(path=path, relpath=path.name, size=size, sha256=digest)
        records.append(record)
        by_name[path.name] = record
        if digest:
            by_sha[digest].append(record)

    return records, by_name, dict(by_sha), hashed, hash_skipped_sources


def split_catalog_relpath(relpath: str) -> tuple[str, str, str, str]:
    parts = relpath.split("/")
    category = parts[0] if len(parts) > 0 else ""
    franchise = parts[1] if len(parts) > 1 else ""
    folder = parts[2] if len(parts) > 2 else ""
    filename = parts[-1] if parts else ""
    return category, franchise, folder, filename


def choose_source(
    catalog_record: ImageRecord,
    batch_row: dict[str, str] | None,
    root_by_name: dict[str, ImageRecord],
    root_by_sha: dict[str, list[ImageRecord]],
) -> ImageRecord | None:
    if batch_row:
        name = source_name(batch_row.get("source"))
        if name and name in root_by_name:
            return root_by_name[name]

    matches = root_by_sha.get(catalog_record.sha256, [])
    if matches:
        return sorted(matches, key=lambda item: item.path.name.lower())[0]

    return None


def build_retro_manifest(
    root: Path,
    catalog_records: list[ImageRecord],
    root_by_name: dict[str, ImageRecord],
    root_by_sha: dict[str, list[ImageRecord]],
    existing_keys: set[str],
    existing_relpaths: set[str],
    rows_by_relpath: dict[str, dict[str, str]],
    downloader_manifest: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    rows: list[dict[str, Any]] = []
    unmatched = 0
    generated_at = utc_now()

    for catalog_record in catalog_records:
        if catalog_record.relpath in existing_relpaths:
            continue

        batch_row = rows_by_relpath.get(catalog_record.relpath)
        root_record = choose_source(catalog_record, batch_row, root_by_name, root_by_sha)
        source = root_record.path.name if root_record else ""
        key = manifest_key(source, catalog_record.relpath)
        if key in existing_keys:
            continue
        existing_keys.add(key)

        if not root_record:
            unmatched += 1

        download_record = downloader_manifest.get(source, {})
        category, franchise, folder, filename = split_catalog_relpath(catalog_record.relpath)
        source_path = str(root_record.path) if root_record else ""
        message_id = (
            str(download_record.get("message_id") or "").strip()
            or parse_message_id(source)
            or (str(batch_row.get("message_id") or "").strip() if batch_row else "")
        )

        rows.append(
            {
                "source_type": "telegram",
                "status": "already_cataloged" if root_record else "catalog_without_root_match",
                "retroactive": True,
                "generated_at": generated_at,
                "source_name": source,
                "message_id": message_id,
                "source_path": source_path,
                "catalog_relpath": catalog_record.relpath,
                "catalog_path": str(catalog_record.path),
                "size": catalog_record.size,
                "sha256": catalog_record.sha256,
                "category": batch_row.get("category", category) if batch_row else category,
                "franchise": batch_row.get("franchise", franchise) if batch_row else franchise,
                "folder": batch_row.get("folder", folder) if batch_row else folder,
                "filename": batch_row.get("filename", filename) if batch_row else filename,
                "confidence": batch_row.get("confidence", "") if batch_row else "",
                "notes": batch_row.get("notes", "") if batch_row else "",
                "batch": batch_row.get("_batch", "") if batch_row else "",
            }
        )

    return rows, unmatched


def write_hash_index(path: Path, catalog_records: list[ImageRecord], hashes_by_size: dict[str, dict[str, str]], paths_by_sha: dict[str, list[str]]) -> None:
    data = {
        "generated_at": utc_now(),
        "files": len(catalog_records),
        "hashes_by_size": hashes_by_size,
        "catalog_paths_by_sha256": paths_by_sha,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))


def build_pending_rows(
    root_records: list[ImageRecord],
    known_sources: set[str],
    known_message_ids: set[str],
    known_hashes: set[str],
    hash_skipped_sources: set[str],
    downloader_manifest: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    rows: list[dict[str, Any]] = []
    skipped = {
        "by_source": 0,
        "by_message_id": 0,
        "by_hash": 0,
        "hash_unchecked_offline": 0,
        "empty": 0,
    }

    for record in root_records:
        name = record.path.name
        message_id = parse_message_id(name)
        if record.size <= 0:
            skipped["empty"] += 1
            continue
        if name in known_sources:
            skipped["by_source"] += 1
            continue
        if message_id and message_id in known_message_ids:
            skipped["by_message_id"] += 1
            continue
        if record.sha256 and record.sha256 in known_hashes:
            skipped["by_hash"] += 1
            continue
        if name in hash_skipped_sources:
            skipped["hash_unchecked_offline"] += 1
            continue

        download_record = downloader_manifest.get(name, {})
        rows.append(
            {
                "source": name,
                "size": record.size,
                "message_id": download_record.get("message_id") or message_id,
                "date": download_record.get("date") or "",
                "original_name": download_record.get("original_name") or "",
                "caption": download_record.get("caption") or "",
                "category": "",
                "franchise": "",
                "folder": "",
                "filename": "",
                "confidence": "",
                "notes": "",
            }
        )

    return rows, skipped


def run(args: argparse.Namespace) -> int:
    root = args.root.resolve()
    if not root.exists():
        raise FileNotFoundError(root)

    control = root / CONTROL_DIR
    control.mkdir(parents=True, exist_ok=True)
    manifest_path = control / CATALOG_MANIFEST
    hash_index_path = control / CATALOG_HASH_INDEX
    pending_path = args.pending_output.resolve() if args.pending_output else control / PENDING_CSV
    report_path = args.report.resolve() if args.report else control / REPORT_JSON

    (
        existing_keys,
        manifest_sources,
        manifest_message_ids,
        manifest_hashes,
        manifest_relpaths,
        existing_manifest_records,
    ) = load_existing_manifest(manifest_path)
    control_data = load_control_csvs(control)
    downloader_manifest = read_downloader_manifest(root)

    log(f"Root={root}")
    log(f"Control={control}")
    catalog_index_mode = "rebuild"
    if hash_index_path.exists() and not args.rebuild_catalog_index:
        log("IndexingCatalog=reuse_existing_hash_index")
        catalog_records, hashes_by_size, paths_by_sha = load_catalog_hash_index(root, hash_index_path)
        catalog_index_mode = "reuse_existing_hash_index"
    else:
        log("IndexingCatalog=started")
        catalog_records, hashes_by_size, paths_by_sha = index_catalog(root)
    write_hash_index(hash_index_path, catalog_records, hashes_by_size, paths_by_sha)
    log(f"CatalogImagesIndexed={len(catalog_records)}")
    log(f"CatalogIndexMode={catalog_index_mode}")
    log(f"HashIndex={hash_index_path}")

    log("IndexingRoot=started")
    root_hash_sizes = {record.size for record in catalog_records}
    preknown_sources = set(manifest_sources) | set(control_data["sources"])
    preknown_message_ids = set(manifest_message_ids) | set(control_data["message_ids"])
    root_records, root_by_name, root_by_sha, root_hashes_computed, hash_skipped_sources = index_root(
        root,
        root_hash_sizes,
        preknown_sources,
        preknown_message_ids,
        not args.hash_offline_root_files,
    )
    log(f"RootImagesIndexed={len(root_records)}")
    log(f"RootHashesComputed={root_hashes_computed}")
    log(f"RootHashesSkippedOffline={len(hash_skipped_sources)}")

    retro_rows, unmatched_catalog = build_retro_manifest(
        root=root,
        catalog_records=catalog_records,
        root_by_name=root_by_name,
        root_by_sha=root_by_sha,
        existing_keys=existing_keys,
        existing_relpaths=manifest_relpaths,
        rows_by_relpath=control_data["rows_by_relpath"],
        downloader_manifest=downloader_manifest,
    )
    if retro_rows:
        append_jsonl(manifest_path, retro_rows)

    known_sources = set(manifest_sources) | set(control_data["sources"]) | {row["source_name"] for row in retro_rows if row.get("source_name")}
    known_message_ids = set(manifest_message_ids) | set(control_data["message_ids"]) | {str(row["message_id"]) for row in retro_rows if row.get("message_id")}
    known_hashes = set(manifest_hashes) | set(control_data["hashes"]) | set(paths_by_sha)
    known_hashes |= {row["sha256"] for row in retro_rows if row.get("sha256")}

    pending_rows, skipped = build_pending_rows(
        root_records=root_records,
        known_sources=known_sources,
        known_message_ids=known_message_ids,
        known_hashes=known_hashes,
        hash_skipped_sources=hash_skipped_sources,
        downloader_manifest=downloader_manifest,
    )
    write_csv(
        pending_path,
        pending_rows,
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

    report = {
        "generated_at": utc_now(),
        "root": str(root),
        "control": str(control),
        "root_images_indexed": len(root_records),
        "root_hashes_computed": root_hashes_computed,
        "root_hashes_skipped_offline": len(hash_skipped_sources),
        "catalog_images_indexed": len(catalog_records),
        "catalog_index_mode": catalog_index_mode,
        "existing_manifest_records": existing_manifest_records,
        "retro_manifest_appended": len(retro_rows),
        "catalog_without_root_match": unmatched_catalog,
        "control_csv_files_read": control_data["files_read"],
        "control_batch_rows": control_data["batch_rows"],
        "control_duplicate_rows": control_data["duplicate_rows"],
        "known_sources": len(known_sources),
        "known_message_ids": len(known_message_ids),
        "known_hashes": len(known_hashes),
        "pending_rows": len(pending_rows),
        "pending_skipped": skipped,
        "outputs": {
            "catalog_hash_index": str(hash_index_path),
            "catalog_manifest": str(manifest_path),
            "pending_csv": str(pending_path),
        },
    }
    with report_path.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    log(f"ExistingManifestRecords={existing_manifest_records}")
    log(f"RetroManifestAppended={len(retro_rows)}")
    log(f"CatalogWithoutRootMatch={unmatched_catalog}")
    log(f"ControlCsvFilesRead={control_data['files_read']}")
    log(f"ControlBatchRows={control_data['batch_rows']}")
    log(f"ControlDuplicateRows={control_data['duplicate_rows']}")
    log(f"Pending={len(pending_rows)}")
    for key, value in skipped.items():
        log(f"PendingSkipped_{key}={value}")
    log(f"PendingCsv={pending_path}")
    log(f"Report={report_path}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run etapa zero for the Telegram catalog workflow.")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Telegram image download folder.")
    parser.add_argument("--pending-output", type=Path, help="Path for pendentes.csv.")
    parser.add_argument("--report", type=Path, help="Path for the JSON report.")
    parser.add_argument(
        "--rebuild-catalog-index",
        action="store_true",
        help="Rehash catalogo/ instead of reusing catalog_hash_index.json when it exists.",
    )
    parser.add_argument(
        "--hash-offline-root-files",
        action="store_true",
        help="Allow hashing root files that Windows marks as cloud recall/offline.",
    )
    return parser.parse_args()


def main() -> int:
    return run(parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
