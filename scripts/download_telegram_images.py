#!/usr/bin/env python3
"""Download all image media from a Telegram chat using the user's account."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import mimetypes
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from telethon import TelegramClient, errors, utils
except ImportError:
    print(
        "Telethon is not installed. Run: python -m pip install telethon",
        file=sys.stderr,
    )
    raise


DEFAULT_CHAT = "https://t.me/c/2370335738/35546"
IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".heic",
    ".heif",
    ".jpeg",
    ".jpg",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
}
PRIVATE_LINK_RE = re.compile(r"(?:https?://)?t\.me/c/(?P<chat_id>\d+)(?:/(?P<message_id>\d+))?")


@dataclass
class DownloadStats:
    scanned_messages: int = 0
    image_messages: int = 0
    downloaded: int = 0
    skipped_existing: int = 0
    failed: int = 0
    started_at: str = ""
    finished_at: str = ""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def default_session_path() -> Path:
    repo_root = Path(__file__).resolve().parents[1]
    return repo_root / "tmp" / "telegram-downloader" / "telegram_session"


def default_output_dir(chat: str) -> Path:
    match = PRIVATE_LINK_RE.search(chat)
    suffix = match.group("chat_id") if match else "chat"
    return Path.home() / "Downloads" / f"telegram-{suffix}-images"


def parse_private_chat_id(chat: str) -> int | None:
    match = PRIVATE_LINK_RE.search(chat)
    if not match:
        return None
    return int(match.group("chat_id"))


def parse_peer_id(chat: str) -> int | None:
    text = chat.strip()
    if text.startswith("-100") and text[4:].isdigit():
        return int(text)
    if text.lstrip("-").isdigit():
        return int(text)
    private_id = parse_private_chat_id(text)
    if private_id is not None:
        return int(f"-100{private_id}")
    return None


def sanitize_filename(value: str, max_len: int = 90) -> str:
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value)
    value = re.sub(r"\s+", " ", value).strip().strip(".")
    return (value or "image")[:max_len]


def extension_for_message(message: Any) -> str:
    if getattr(message, "photo", None):
        return ".jpg"

    file = getattr(message, "file", None)
    ext = (getattr(file, "ext", None) or "").lower()
    if ext:
        return ext

    mime_type = (getattr(file, "mime_type", None) or "").lower()
    guessed = mimetypes.guess_extension(mime_type)
    if guessed:
        return ".jpg" if guessed == ".jpe" else guessed

    return ".bin"


def is_image_message(message: Any) -> bool:
    if getattr(message, "photo", None):
        return True

    file = getattr(message, "file", None)
    if not file:
        return False

    mime_type = (getattr(file, "mime_type", None) or "").lower()
    if mime_type.startswith("image/"):
        return True

    ext = (getattr(file, "ext", None) or "").lower()
    return ext in IMAGE_EXTENSIONS


def build_output_path(output_dir: Path, message: Any) -> Path:
    message_date = getattr(message, "date", None)
    if isinstance(message_date, datetime):
        timestamp = message_date.strftime("%Y%m%d_%H%M%S")
    else:
        timestamp = "unknown_date"

    file = getattr(message, "file", None)
    original_name = sanitize_filename(getattr(file, "name", None) or "photo")
    ext = extension_for_message(message)
    if not original_name.lower().endswith(ext.lower()):
        original_name = f"{original_name}{ext}"

    return output_dir / f"{timestamp}_msg_{message.id}_{original_name}"


async def resolve_chat(client: TelegramClient, chat: str) -> Any:
    peer_id = parse_peer_id(chat)
    private_chat_id = parse_private_chat_id(chat)

    if peer_id is None and PRIVATE_LINK_RE.search(chat):
        raise ValueError(f"Unsupported Telegram link: {chat}")

    if peer_id is None:
        target = chat
        if target.startswith("https://t.me/"):
            target = target.removeprefix("https://t.me/").split("/", 1)[0]
        if target.startswith("http://t.me/"):
            target = target.removeprefix("http://t.me/").split("/", 1)[0]
        return await client.get_entity(target)

    await client.get_dialogs()
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        entity_peer_id = utils.get_peer_id(entity)
        entity_id = getattr(entity, "id", None)
        if peer_id == entity_peer_id or private_chat_id == entity_id:
            return entity

    raise ValueError(
        "Chat not found in this Telegram account. Open the group once in Telegram, "
        "confirm this account has access, then run the command again."
    )


async def download_images(args: argparse.Namespace) -> DownloadStats:
    stats = DownloadStats(started_at=utc_now())

    output_dir = args.out.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    args.session.parent.mkdir(parents=True, exist_ok=True)

    client = TelegramClient(str(args.session), args.api_id, args.api_hash)
    await client.start(phone=args.phone)

    try:
        entity = await resolve_chat(client, args.chat)
        manifest_path = output_dir / "manifest.jsonl"
        failures_path = output_dir / "failures.jsonl"

        print(f"Saving images to: {output_dir}")
        print("Scanning messages. Stop with Ctrl+C; rerun to continue and skip existing files.")

        async for message in client.iter_messages(
            entity,
            limit=args.limit,
            min_id=args.min_id,
            max_id=args.max_id,
            reverse=args.oldest_first,
        ):
            stats.scanned_messages += 1
            if not is_image_message(message):
                if stats.scanned_messages % args.progress_every == 0:
                    print_progress(stats)
                continue

            stats.image_messages += 1
            target_path = build_output_path(output_dir, message)

            if target_path.exists() and target_path.stat().st_size > 0:
                stats.skipped_existing += 1
                write_jsonl(manifest_path, manifest_record(message, target_path, "skipped_existing"))
                if stats.scanned_messages % args.progress_every == 0:
                    print_progress(stats)
                continue

            try:
                while True:
                    try:
                        downloaded_path = await message.download_media(file=str(target_path))
                        break
                    except errors.FloodWaitError as exc:
                        wait_seconds = int(getattr(exc, "seconds", 1)) + 1
                        print(f"Telegram rate limit: waiting {wait_seconds}s")
                        await asyncio.sleep(wait_seconds)

                if downloaded_path:
                    stats.downloaded += 1
                    write_jsonl(
                        manifest_path,
                        manifest_record(message, Path(downloaded_path), "downloaded"),
                    )
                else:
                    stats.failed += 1
                    write_jsonl(
                        failures_path,
                        failure_record(message, "download_media returned no path"),
                    )
            except Exception as exc:  # noqa: BLE001 - continue the bulk download.
                stats.failed += 1
                write_jsonl(failures_path, failure_record(message, repr(exc)))

            if stats.scanned_messages % args.progress_every == 0:
                print_progress(stats)

    finally:
        await client.disconnect()
        stats.finished_at = utc_now()
        (output_dir / "download-summary.json").write_text(
            json.dumps(asdict(stats), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print_progress(stats)

    return stats


def manifest_record(message: Any, path: Path, status: str) -> dict[str, Any]:
    file = getattr(message, "file", None)
    return {
        "status": status,
        "message_id": message.id,
        "date": message.date.isoformat() if getattr(message, "date", None) else None,
        "path": str(path),
        "size": path.stat().st_size if path.exists() else None,
        "mime_type": getattr(file, "mime_type", None),
        "original_name": getattr(file, "name", None),
        "caption": message.message or None,
    }


def failure_record(message: Any, error: str) -> dict[str, Any]:
    return {
        "message_id": getattr(message, "id", None),
        "date": message.date.isoformat() if getattr(message, "date", None) else None,
        "error": error,
    }


def write_jsonl(path: Path, data: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(data, ensure_ascii=False) + "\n")


def print_progress(stats: DownloadStats) -> None:
    print(
        "Progress: "
        f"scanned={stats.scanned_messages} "
        f"images={stats.image_messages} "
        f"downloaded={stats.downloaded} "
        f"skipped={stats.skipped_existing} "
        f"failed={stats.failed}",
        flush=True,
    )


def read_api_id(value: str | None) -> int:
    value = value or os.getenv("TELEGRAM_API_ID")
    if not value:
        value = input("Telegram API ID: ").strip()
    return int(value)


def read_api_hash(value: str | None) -> str:
    value = value or os.getenv("TELEGRAM_API_HASH")
    if not value:
        value = getpass.getpass("Telegram API hash: ").strip()
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download all images from a Telegram chat that your account can access.",
    )
    parser.add_argument("--chat", default=DEFAULT_CHAT, help="Telegram chat link, username, title, or -100 id.")
    parser.add_argument("--out", type=Path, help="Destination folder.")
    parser.add_argument("--session", type=Path, default=default_session_path(), help="Telethon session path.")
    parser.add_argument("--api-id", type=str, help="Telegram API ID. Can also use TELEGRAM_API_ID.")
    parser.add_argument("--api-hash", type=str, help="Telegram API hash. Can also use TELEGRAM_API_HASH.")
    parser.add_argument("--phone", default=os.getenv("TELEGRAM_PHONE"), help="Phone number. Can also use TELEGRAM_PHONE.")
    parser.add_argument("--limit", type=int, default=None, help="Optional max number of messages to scan.")
    parser.add_argument("--min-id", type=int, default=0, help="Only scan messages with id greater than this.")
    parser.add_argument("--max-id", type=int, default=0, help="Only scan messages with id lower than this.")
    parser.add_argument("--oldest-first", action="store_true", help="Scan from oldest to newest.")
    parser.add_argument("--progress-every", type=int, default=250, help="Print progress every N scanned messages.")

    args = parser.parse_args()
    args.api_id = read_api_id(args.api_id)
    args.api_hash = read_api_hash(args.api_hash)
    if args.out is None:
        args.out = default_output_dir(args.chat)
    return args


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(download_images(args))
    except KeyboardInterrupt:
        print("Stopped by user. Run again to continue; existing files will be skipped.")


if __name__ == "__main__":
    main()
