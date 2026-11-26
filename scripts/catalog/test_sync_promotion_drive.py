import datetime as dt
import hashlib
import tempfile
import unittest
from pathlib import Path
from sync_promotion_drive import sync

NOW = dt.datetime(2026, 11, 26, 9, tzinfo=dt.timezone.utc)
ID = "tg_" + "a" * 24
PATH = "/api/telegram-studios/" + ID + "/media/" + "b" * 64 + "/display"
BYTES = b"TONART image"
SHA = hashlib.sha256(BYTES).hexdigest()


def manifest(**kwargs):
    item = dict(sha256=SHA, filename="Modelo - " + SHA[:12] + ".webp",
                mime="image/webp", exportable=True, modelId=ID,
                name="Modelo", category="Games", mediaPath=PATH)
    item.update(kwargs)
    return dict(version=1, campaign="blackfriday", generatedAt=NOW.isoformat(), items=[item])


def get_json(path):
    assert path == "/api/telegram-studios/" + ID
    return dict(id=ID, name="Modelo", category="Games", images=[dict(display=PATH)])


def get_media(path, mime):
    assert path == PATH and mime == "image/webp"
    return BYTES


class TestSync(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / "Blackfriday"
        self.root.mkdir()
        self.folder = self.root / "Games [1]"
        self.folder.mkdir()
        (self.folder / "Manual.jpeg").write_bytes(b"original")

    def tearDown(self):
        self.tmp.cleanup()

    def apply(self, data=None, apply=True, **kwargs):
        return sync(self.root, data or manifest(), apply, kwargs.get("get_json", get_json),
                    kwargs.get("get_media", get_media), NOW)

    def test_dry_run_and_idempotent_apply(self):
        self.assertEqual(self.apply(apply=False)["new"], 1)
        self.assertEqual(len(list(self.folder.iterdir())), 1)
        self.assertEqual(self.apply()["new"], 1)
        self.assertEqual((self.root / "Games [2]" / "Manual.jpeg").read_bytes(), b"original")
        self.assertEqual(self.apply()["duplicates"], 1)
        self.assertEqual(len(list((self.root / "Games [2]").iterdir())), 2)

    def test_changed_hash_leaves_folder_untouched(self):
        with self.assertRaisesRegex(ValueError, "content_changed"):
            self.apply(get_media=lambda *_: b"changed")
        self.assertEqual(len(list(self.folder.iterdir())), 1)

    def test_private_or_expired_selection_is_rejected(self):
        with self.assertRaises(ValueError):
            self.apply(manifest(exportable=False))
        stale = manifest()
        stale["generatedAt"] = (NOW - dt.timedelta(hours=1)).isoformat()
        with self.assertRaisesRegex(ValueError, "expired"):
            self.apply(stale)

    def test_changed_identity_and_traversal_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "identity_changed"):
            self.apply(get_json=lambda _: dict(id=ID, name="Outro", category="Games", images=[dict(display=PATH)]))
        with self.assertRaises(ValueError):
            self.apply(manifest(filename="../Modelo - " + SHA[:12] + ".webp"))


if __name__ == "__main__":
    unittest.main()
