"""Apply a freshly exported TONART promotional manifest to a flat, existing Drive folder.

No Google API, browser tokens, direct database writes, or deletion of existing images.
Dry-run unless --apply is explicitly provided. Network reads use the commercial site only.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import urllib.parse
import urllib.request

ORIGIN = "https://tonartstudio.com.br/catalogo-api"
CATEGORIES = {"Animes & Desenhos", "Filmes & Séries", "Games", "Marvel & DC",
              "A identificar", "Tokusatsu & Cultura Japonesa", "Pessoas"}
EXTENSIONS = {"image/webp": ".webp", "image/jpeg": ".jpg", "image/png": ".png",
              "image/avif": ".avif", "image/gif": ".gif"}
IMAGE_SUFFIXES = set(EXTENSIONS.values()) | {".jpeg", ".bmp", ".tif", ".tiff"}
SHA = re.compile(r"[a-f0-9]{64}\Z")
SLUG = re.compile(r"[a-z0-9][a-z0-9-]{0,239}\Z")
MODEL = re.compile(r"mdl_[a-f0-9]{16,40}\Z")
TELEGRAM = re.compile(r"/api/telegram-studios/(tg_[a-f0-9]{24})/media/([a-f0-9]{64})/display\Z")
MAX_BYTES = 8 * 1024 * 1024
MAX_ITEMS = 1000


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(path, expected):
    if not path.startswith("/") or path.startswith("//") or "\\" in path:
        raise ValueError("invalid_source_path")
    url = ORIGIN + path
    request = urllib.request.Request(url, headers={"Accept": expected, "Cache-Control": "no-cache"})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        if response.status != 200 or response.headers.get_content_type() != expected:
            raise ValueError("unexpected_media_response")
        payload = response.read(MAX_BYTES + 1)
        if not payload or len(payload) > MAX_BYTES:
            raise ValueError("invalid_payload_size")
        return payload


def read_json(path):
    return json.loads(fetch(path, "application/json"))


def file_hash(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def category_of(name):
    return re.sub(r" \[\d+\]$", "", name)


def safe_file(item):
    name = item.get("filename")
    ext = EXTENSIONS.get(item.get("mime"))
    digest = item.get("sha256")
    if (not isinstance(name, str) or not ext or not isinstance(digest, str)
            or not SHA.fullmatch(digest) or len(name) > 220
            or not name.endswith(" - " + digest[:12] + ext)
            or any(ord(c) < 32 or c in '<>:"/\\|?*' for c in name)
            or name in (".", "..") or Path(name).name != name):
        raise ValueError("invalid_filename")
    return name


def validate_manifest(manifest, now=None):
    if (not isinstance(manifest, dict) or manifest.get("version") != 1
            or manifest.get("campaign") != "blackfriday"
            or not isinstance(manifest.get("items"), list) or len(manifest["items"]) > MAX_ITEMS):
        raise ValueError("invalid_manifest")
    when = dt.datetime.fromisoformat(manifest["generatedAt"].replace("Z", "+00:00"))
    age = (now or dt.datetime.now(dt.timezone.utc)) - when
    if not dt.timedelta(seconds=-30) <= age <= dt.timedelta(minutes=30):
        raise ValueError("manifest_expired_export_again")
    seen = set()
    for item in manifest["items"]:
        safe_file(item)
        if item["sha256"] in seen or item.get("exportable") is not True:
            raise ValueError("duplicate_or_restricted_selection")
        seen.add(item["sha256"])
        if item.get("category") not in CATEGORIES or not isinstance(item.get("mediaPath"), str):
            raise ValueError("invalid_category_or_media_path")
    return manifest["items"]


def validate_source(item, get_json=read_json):
    """Recheck live identity/gallery membership via the official public gateway."""
    path = item["mediaPath"]
    telegram = TELEGRAM.fullmatch(path)
    if telegram:
        if telegram[1] != item.get("modelId"):
            raise ValueError("model_mismatch")
        model = get_json("/api/telegram-studios/" + telegram[1])
        if model.get("id") != telegram[1] or not any(
                image.get("display") == path for image in model.get("images", [])):
            raise ValueError("media_no_longer_public")
        current_category = "A identificar" if model.get("provisional") else model.get("category")
    else:
        slug, model_id = item.get("modelSlug"), item.get("modelId")
        if (not isinstance(slug, str) or not SLUG.fullmatch(slug)
                or not isinstance(model_id, str) or not MODEL.fullmatch(model_id)
                or not re.fullmatch(r"/media/(?:[A-Za-z0-9._~%-]+/){2,16}[A-Za-z0-9._~%-]+", path)):
            raise ValueError("invalid_historical_media")
        key = urllib.parse.unquote(path[1:])
        if any(p in ("", ".", "..") or any(c in p for c in "\\%?#:") for p in key.split("/")):
            raise ValueError("invalid_historical_key")
        detail = "/api/models/" + slug
        model = get_json(detail)
        if model.get("id") != model_id:
            raise ValueError("model_mismatch")
        approved = model.get("cover_storage_key") == key
        cursor = None
        for _ in range(10):
            if approved:
                break
            query = {"limit": "60"}
            if cursor:
                query["cursor"] = cursor
            page = get_json(detail + "/images?" + urllib.parse.urlencode(query))
            approved = any(key in [i.get("variantKeys", {}).get(role) for role in ("thumb", "card", "detail")]
                           for i in page.get("items", []))
            nxt = page.get("nextCursor")
            if not nxt or nxt == cursor:
                break
            cursor = nxt
        if not approved:
            raise ValueError("media_no_longer_public")
        current_category = model.get("category")
        if model.get("category_slug") == "curadoria-pendente":
            current_category = "A identificar"
    if (current_category or "A identificar") != item["category"] or model.get("name") != item.get("name"):
        raise ValueError("editorial_identity_changed_export_again")


def inventory(root):
    folders = {}
    hashes = {}
    for folder in root.iterdir():
        if folder.is_dir():
            category = category_of(folder.name)
            if category not in CATEGORIES:
                raise ValueError("unexpected_promotion_subfolder:" + folder.name)
            if category in folders or folder.is_symlink():
                raise ValueError("ambiguous_promotion_folder:" + category)
            folders[category] = folder
            for image in folder.iterdir():
                if image.is_dir() or image.is_symlink():
                    raise ValueError("nested_or_linked_promotion_item")
                if image.suffix.lower() in IMAGE_SUFFIXES:
                    hashes.setdefault(file_hash(image), str(image.relative_to(root)))
        elif folder.suffix.lower() in IMAGE_SUFFIXES:
            raise ValueError("image_at_promotion_root")
    return folders, hashes


def atomic_add(staged, destination, expected):
    # Exclusive create: never overwrite a manually added file. Delete only
    # our own incomplete write if an I/O error occurs.
    created = False
    try:
        with destination.open("xb") as target, staged.open("rb") as source:
            created = True
            shutil.copyfileobj(source, target)
        if file_hash(destination) != expected:
            raise IOError("copy_integrity_failed")
    except Exception:
        if created:
            destination.unlink(missing_ok=True)
        raise


def sync(root, manifest, apply=False, get_json=read_json, get_media=fetch, now=None):
    root = Path(root)
    if root.name.casefold() != "blackfriday" or not root.is_dir():
        raise ValueError("expected_existing_blackfriday_folder")
    items = validate_manifest(manifest, now)
    folders, existing = inventory(root)
    planned, duplicates = [], []
    with tempfile.TemporaryDirectory(prefix="tonart-promotion-") as scratch:
        for item in items:
            validate_source(item, get_json)
            digest = item["sha256"]
            if digest in existing:
                duplicates.append({"sha256": digest, "existing": existing[digest]})
                continue
            filename = safe_file(item)
            category = item["category"]
            folder = folders.get(category, root / (category + " [0]"))
            if (folder / filename).exists():
                raise ValueError("filename_collision:" + filename)
            data = get_media(item["mediaPath"], item["mime"])
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError("public_content_changed_export_again")
            staged = Path(scratch) / digest
            staged.write_bytes(data)
            planned.append((item, staged))
        # No Drive write until every selected item passes live preflight.
        if apply:
            for item, staged in planned:
                category = item["category"]
                if category not in folders:
                    folder = root / (category + " [0]")
                    folder.mkdir()
                    folders[category] = folder
                destination = folders[category] / safe_file(item)
                atomic_add(staged, destination, item["sha256"])
            folders, after = inventory(root)
            if any(item["sha256"] not in after for item in items):
                raise IOError("post_copy_inventory_mismatch")
            for category, folder in folders.items():
                count = sum(p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES for p in folder.iterdir())
                correct = root / (category + " [" + str(count) + "]")
                if folder != correct:
                    if correct.exists():
                        raise ValueError("category_rename_collision")
                    folder.rename(correct)
            folders, verified = inventory(root)
            if any(digest not in verified for digest in existing) or any(i["sha256"] not in verified for i in items):
                raise IOError("final_inventory_mismatch")
    return {"applied": apply, "selected": len(items), "new": len(planned), "duplicates": len(duplicates),
            "preserved_existing_hashes": len(existing), "categories": {c: p.name for c, p in folders.items()},
            "duplicate_locations": duplicates}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(json.dumps(sync(args.root, json.loads(args.manifest.read_text(encoding="utf-8-sig")), args.apply),
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
