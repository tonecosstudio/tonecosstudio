#!/usr/bin/env python3
"""Reserve a Telegram catalog batch for one worker without applying it.

This script only writes under catalogo/_controle/workers/<worker>/. It does
not copy images and does not change the central manifest, hash index, or
pendentes.csv.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DEFAULT_ROOT = Path.home() / "Downloads" / "telegram-2370335738-images"
CONTROL_DIR = Path("catalogo") / "_controle"
PENDING_CSV = "pendentes.csv"
INVALID_PATH_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WORKER_RE = re.compile(r"[^A-Za-z0-9_.-]+")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_worker(value: str) -> str:
    value = WORKER_RE.sub("_", value.strip())
    value = value.strip("._-")
    if not value:
        raise ValueError("worker must contain at least one letter or digit")
    return value[:64]


def safe_part(value: str, fallback: str) -> str:
    value = INVALID_PATH_CHARS_RE.sub("_", value or "")
    value = re.sub(r"\s+", " ", value).strip().strip(".")
    return value or fallback


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        fieldnames = list(reader.fieldnames or [])
        rows = [dict(row) for row in reader]
    return fieldnames, rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def iter_existing_batch_csvs(control: Path, workers_dir: Path) -> Iterable[Path]:
    yield from sorted(control.glob("lote_*.csv"))
    if workers_dir.exists():
        yield from sorted(workers_dir.glob("**/lote_*.csv"))


def collect_assigned_sources(control: Path, workers_dir: Path) -> set[str]:
    assigned: set[str] = set()
    for path in iter_existing_batch_csvs(control, workers_dir):
        if not path.is_file():
            continue
        try:
            _, rows = read_csv(path)
        except (OSError, csv.Error, UnicodeDecodeError):
            continue
        for row in rows:
            source = (row.get("source") or "").strip()
            if source:
                assigned.add(Path(source).name)
    return assigned


def next_sequence(worker_dir: Path, worker: str) -> int:
    pattern = re.compile(rf"^lote_{re.escape(worker)}_(\d+)\.csv$")
    highest = 0
    if worker_dir.exists():
        for path in worker_dir.glob(f"lote_{worker}_*.csv"):
            match = pattern.match(path.name)
            if match:
                highest = max(highest, int(match.group(1)))
    return highest + 1


def reserve_batch(args: argparse.Namespace) -> int:
    root = args.root.resolve()
    control = root / CONTROL_DIR
    pending = args.pending.resolve() if args.pending else control / PENDING_CSV
    worker = safe_worker(args.worker)
    workers_dir = args.workers_dir.resolve() if args.workers_dir else control / "workers"
    worker_dir = workers_dir / worker
    sequence = args.sequence if args.sequence is not None else next_sequence(worker_dir, worker)
    output = args.output.resolve() if args.output else worker_dir / f"lote_{worker}_{sequence:03d}.csv"

    if output.exists() and not args.overwrite:
        raise FileExistsError(f"output already exists: {output}")

    fieldnames, pending_rows = read_csv(pending)
    if "source" not in fieldnames:
        raise ValueError(f"pending CSV has no source column: {pending}")

    assigned_sources = collect_assigned_sources(control, workers_dir)
    selected: list[dict[str, str]] = []
    skipped_assigned = 0
    skipped_blank_source = 0
    skipped_offset = 0

    for row in pending_rows:
        source = (row.get("source") or "").strip()
        if not source:
            skipped_blank_source += 1
            continue
        source_name = Path(source).name
        if source_name in assigned_sources:
            skipped_assigned += 1
            continue
        if skipped_offset < args.skip_first:
            skipped_offset += 1
            continue
        selected.append(row)
        if len(selected) >= args.count:
            break

    write_csv(output, fieldnames, selected)

    claim: dict[str, Any] = {
        "created_at": utc_now(),
        "worker": worker,
        "root": str(root),
        "pending": str(pending),
        "batch": str(output),
        "sequence": sequence,
        "requested_count": args.count,
        "selected_count": len(selected),
        "skipped_assigned": skipped_assigned,
        "skipped_blank_source": skipped_blank_source,
        "skipped_offset": skipped_offset,
        "sources": [(row.get("source") or "").strip() for row in selected],
    }
    claim_path = worker_dir / "batch_claims.jsonl"
    worker_dir.mkdir(parents=True, exist_ok=True)
    with claim_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(claim, ensure_ascii=False, separators=(",", ":")) + "\n")

    print(f"Root={root}")
    print(f"Pending={pending}")
    print(f"Worker={worker}")
    print(f"Batch={output}")
    print(f"Claims={claim_path}")
    print(f"selected={len(selected)}")
    print(f"skipped_assigned={skipped_assigned}")
    print(f"skipped_offset={skipped_offset}")
    return 0 if selected else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reserve a Telegram catalog batch for one worker.")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Telegram image download folder.")
    parser.add_argument("--worker", required=True, help="Worker id, for example pc-principal or pc-auxiliar.")
    parser.add_argument("--count", type=int, default=100, help="Number of pending rows to reserve.")
    parser.add_argument("--skip-first", type=int, default=0, help="Skip this many available pending rows before selecting.")
    parser.add_argument("--sequence", type=int, help="Explicit worker batch number.")
    parser.add_argument("--pending", type=Path, help="Path to pendentes.csv.")
    parser.add_argument("--workers-dir", type=Path, help="Path to the workers directory.")
    parser.add_argument("--output", type=Path, help="Explicit output CSV path.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite the output CSV if it already exists.")
    args = parser.parse_args()
    if args.count <= 0:
        parser.error("--count must be greater than zero")
    if args.skip_first < 0:
        parser.error("--skip-first cannot be negative")
    if args.sequence is not None and args.sequence <= 0:
        parser.error("--sequence must be greater than zero")
    return args


def main() -> int:
    args = parse_args()
    return reserve_batch(args)


if __name__ == "__main__":
    raise SystemExit(main())
