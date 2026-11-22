#!/usr/bin/env python3
"""Synthetic tests for the Telegram-first identity engine; no private data/network."""
from __future__ import annotations

import asyncio
import hashlib
import sqlite3
from contextlib import closing, contextmanager
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import telegram_identity_engine as engine


SOURCE_CHAT = 77


@contextmanager
def _test_db(path):
    db = sqlite3.connect(path)
    try:
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


class FakeSearch:
    def __init__(self, results=None, error=None):
        self.results = list(results or [])
        self.error = error
        self.calls = []

    def search_official(self, query, source):
        self.calls.append((query, source.profile_url))
        if self.error:
            raise self.error
        return self.results


class FakeTelegramClient:
    def __init__(self, messages):
        self.messages = messages
        self.calls = []

    async def get_messages(self, chat_id, *, ids):
        self.calls.append((chat_id, tuple(ids)))
        return [self.messages[item] for item in ids if item in self.messages]


class FakeHistorySource:
    def __init__(self, page):
        self.page = page
        self.calls = []

    def fetch_history_page(self, *, topic_id, after_message_id, limit):
        self.calls.append((topic_id, after_message_id, limit))
        return self.page


class TelegramIdentityEngineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db_path = self.root / "curadoria.sqlite3"
        with _test_db(self.db_path) as db:
            db.executescript("""
            CREATE TABLE assets(
                message_id INTEGER PRIMARY KEY,sha256 TEXT NOT NULL,
                source_relative TEXT NOT NULL,original_topic TEXT NOT NULL,
                source_date TEXT,source_caption TEXT,source_album TEXT,indexed_at TEXT NOT NULL
            );
            CREATE TABLE name_proposals(
                message_id INTEGER PRIMARY KEY,studio TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',universe TEXT NOT NULL DEFAULT '',
                variant TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'revisar',confidence REAL NOT NULL DEFAULT 0,
                evidence_type TEXT NOT NULL DEFAULT '',evidence_message_id INTEGER,
                source_fingerprint TEXT NOT NULL,official_url TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 0,
                modified_at TEXT NOT NULL
            );
            CREATE TABLE name_proposal_events(
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,message_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,evidence TEXT NOT NULL,occurred_at TEXT NOT NULL
            );
            CREATE TABLE model_groups(
                group_key TEXT PRIMARY KEY,studio TEXT,title TEXT,universe TEXT,variant TEXT,
                state TEXT NOT NULL DEFAULT 'revisar',confidence REAL NOT NULL DEFAULT 0,
                revision INTEGER NOT NULL DEFAULT 0,created_at TEXT,updated_at TEXT
            );
            CREATE TABLE model_group_members(
                message_id INTEGER PRIMARY KEY,group_key TEXT NOT NULL,
                match_reason TEXT NOT NULL,updated_at TEXT
            );
            """)

    def tearDown(self):
        self.temp.cleanup()

    def add_asset(self, message_id, caption="", album="", topic="Abe3D"):
        with _test_db(self.db_path) as db:
            db.execute("""
                INSERT INTO assets(message_id,sha256,source_relative,original_topic,
                                   source_caption,source_album,indexed_at)
                VALUES(?,?,?,?,?,?,?)
            """, (
                message_id, f"sha-{message_id}", f"{message_id}.jpg",
                topic, caption, str(album) if album else "", "synthetic",
            ))
        self.add_proposal(message_id)

    def add_proposal(
        self,
        message_id,
        *,
        title="",
        variant="",
        status="revisar",
        evidence_type="",
        notes="",
    ):
        with _test_db(self.db_path) as db:
            db.execute("""
                INSERT OR REPLACE INTO name_proposals(
                    message_id,studio,title,universe,variant,filename,status,confidence,
                    evidence_type,evidence_message_id,source_fingerprint,official_url,
                    notes,revision,modified_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                message_id, "", title, "", variant, "", status, 0.1,
                evidence_type, None, "seed", "", notes, 0, "synthetic",
            ))

    def set_coverage(self, message_id, *, coverage="exhausted", identity="ambiguous", topic_id=5):
        with engine._open_curadoria(self.db_path) as db:
            db.execute("""
                UPDATE telegram_identity_coverage
                SET coverage_status=?,identity_status=?,topic_id=?,topic_name='Abe3D',updated_at=?
                WHERE message_id=?
            """, (coverage, identity, topic_id, "synthetic", message_id))
            db.commit()

    def source_registry(self, _topic):
        return [engine.OfficialSource(
            "Abe3D", "Cults3D", "https://cults3d.com/en/users/abe3d", verified=True
        )]

    def test_structured_caption_preserves_studio_universe_scale_and_version(self):
        parsed = engine.parse_telegram_caption(
            "Abe3D",
            "▪️ Wonder Woman - DC\n▫️ Studio: Abe3D\n▫️ Scale: 1/6\n▫️ Version: Battle Scarred",
            message_id=10,
        )
        self.assertEqual(parsed.identity_status, "telegram_found")
        candidate = parsed.candidates[0]
        self.assertEqual(candidate.title, "Wonder Woman")
        self.assertEqual(candidate.studio, "Abe3D")
        self.assertEqual(candidate.universe, "DC")
        self.assertEqual(candidate.variant, "1/6; Battle Scarred")
        self.assertEqual(candidate.source_message_id, 10)

    def test_short_explicit_pokemon_name_and_alt_version_are_structured(self):
        for name in ("Mew", "Red"):
            with self.subTest(name=name):
                parsed = engine.parse_telegram_caption(
                    "Pokerus Studio",
                    f"▪️ {name} - Pokémon\n▫️ Estúdio: Pokerus Studio\n\n#Pokerus_Studio #{name}",
                    message_id=800,
                )
                selected = [
                    c for c in parsed.candidates if c.evidence_type == "telegram_structured_caption"
                ]
                self.assertEqual(len(selected), 1)
                self.assertEqual((selected[0].title, selected[0].universe), (name, "Pokémon"))
                self.assertEqual(selected[0].status, "provavel")
        alt = engine.parse_telegram_caption(
            "Pokerus Studio",
            "▪️ Umbreon - Alt Version\n▫️ Estúdio: Pokerus Studio\n\n#Pokerus_Studio #Umbreon",
            message_id=801,
        )
        self.assertEqual(len(alt.candidates), 1)
        self.assertEqual((alt.candidates[0].title, alt.candidates[0].universe,
                          alt.candidates[0].variant), ("Umbreon", "", "Alt Version"))
        # No matching character hashtag: do not automatically accept a short name.
        no_tag = engine.parse_telegram_caption(
            "Pokerus Studio", "▪️ Red - Pokémon\n▫️ Estúdio: Pokerus Studio"
        )
        self.assertNotEqual(no_tag.identity_status, "telegram_found")

    def test_free_text_examples_are_candidates_without_confirming_single_words(self):
        cases = {
            "Wonder Woman — Battle Scarred": ("Wonder Woman", "Battle Scarred", "revisar"),
            "Black Widow 2021": ("Black Widow 2021", "", "provavel"),
            "Princess Jasmine": ("Princess Jasmine", "", "provavel"),
            "The Wasp": ("The Wasp", "", "provavel"),
            "Thena": ("Thena", "", "revisar"),
            "Mantis": ("Mantis", "", "revisar"),
            "Mary Jane Watson": ("Mary Jane Watson", "", "provavel"),
            "She-Hulk Bust": ("She-Hulk Bust", "", "provavel"),
            "Elektra": ("Elektra", "", "revisar"),
        }
        for caption, expected in cases.items():
            with self.subTest(caption=caption):
                result = engine.parse_telegram_caption("Mixed Studio Topic", caption)
                self.assertEqual(len(result.candidates), 1)
                candidate = result.candidates[0]
                self.assertEqual((candidate.title, candidate.variant, candidate.status), expected)
                self.assertEqual(candidate.studio, "")

    def test_hashtags_are_candidates_for_review_and_generic_tags_are_ignored(self):
        result = engine.parse_telegram_caption(
            "Abe3D", "#WonderWoman #marvel #3dprinting #wip"
        )
        self.assertEqual(result.identity_status, "ambiguous")
        self.assertEqual([c.title for c in result.candidates], ["Wonder Woman"])
        self.assertEqual(result.candidates[0].status, "revisar")
        self.assertEqual(engine.parse_telegram_caption(
            "Abe3D", "#3dprinting #model #wip #marvel"
        ).identity_status, "unidentified")

    def test_alias_and_version_labels_preserve_original_name(self):
        result = engine.parse_telegram_caption(
            "Abe3D",
            "Title: Black Widow 2021\nAlias: Natasha Romanoff\nScale: 1/10",
        )
        candidate = result.candidates[0]
        self.assertEqual(candidate.title, "Black Widow 2021")
        self.assertEqual(candidate.aliases, ("Natasha Romanoff",))
        self.assertEqual(candidate.variant, "1/10")

    def test_reply_relation_is_verified_and_updates_existing_name_proposal(self):
        self.add_asset(200)
        message = engine.TelegramHistoryMessage(
            SOURCE_CHAT, 220, 5, "Abe3D", "Title: Princess Jasmine",
            reply_to_message_id=200,
        )
        saved = engine.ingest_history_messages(self.db_path, SOURCE_CHAT, [message])
        self.assertEqual(saved["verified_links"], 1)
        result = engine.apply_telegram_evidence(self.db_path)
        self.assertEqual(result["proposed"], 1)
        with _test_db(self.db_path) as db:
            title, evidence_type, status = db.execute(
                "SELECT title,evidence_type,status FROM name_proposals WHERE message_id=200"
            ).fetchone()
            self.assertEqual(db.execute(
                "SELECT relation_type FROM telegram_history_links WHERE asset_message_id=200"
            ).fetchone()[0], "reply_to_asset")
        self.assertEqual((title, evidence_type, status), (
            "Princess Jasmine", "telegram_reply_text", "provavel"
        ))
        self.assertEqual(engine.list_telegram_findings(self.db_path, 200)["related_messages"][0]["evidence_message_id"], 220)

    def test_exact_original_media_message_restores_missing_caption_and_keeps_studio_scope(self):
        self.add_asset(610, topic="Abe3D")
        self.add_asset(611, topic="Other Studio")
        self.add_asset(612, topic="Abe3D")
        with engine._open_curadoria(self.db_path) as db:
            for message_id, topic_id, topic_name in (
                (610, 5, "Abe3D"),
                (611, 7, "Other Studio"),
                (612, 5, "Abe3D"),
            ):
                db.execute("""
                    UPDATE telegram_identity_coverage SET
                        source_chat_id=?, topic_id=?, topic_name=?
                    WHERE message_id=?
                """, (SOURCE_CHAT, topic_id, topic_name, message_id))
            db.commit()
        engine.ingest_history_messages(self.db_path, SOURCE_CHAT, [
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 610, 5, "Abe3D",
                "▪️ Wonder Woman - DC\n▫️ Estúdio: Abe3D", has_media=True,
            ),
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 611, 7, "Other Studio",
                "Title: Other Character", has_media=True,
            ),
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 612, 6, "Wrong Topic",
                "Title: Misattributed Name", has_media=True,
            ),
        ])
        result = engine.apply_telegram_evidence(
            self.db_path, original_topic="Abe3D",
        )
        self.assertEqual(result["proposed"], 1)
        with _test_db(self.db_path) as db:
            rows = db.execute("""
                SELECT message_id,title,evidence_type,status FROM name_proposals
                WHERE message_id IN (610,611,612) ORDER BY message_id
            """).fetchall()
        self.assertEqual(rows[0], (
            610, "Wonder Woman", "telegram_original_message", "provavel",
        ))
        self.assertEqual(rows[1][1], "")
        self.assertEqual(rows[2][1], "")
        self.assertEqual(
            engine.apply_telegram_evidence(self.db_path, original_topic="Abe3D")["proposed"],
            0,
        )

    def test_evidence_writer_yields_between_32_changed_assets(self):
        for message_id in range(1000, 1034):
            self.add_asset(message_id, f"Title: Hero {message_id}", topic="Abe3D")

        real_candidates = engine._related_candidates
        seen = [0]
        checked = [False]

        def probe_candidates(db, asset, **kwargs):
            seen[0] += 1
            if seen[0] == 33:
                # Transaction from first 32 assets must be committed before
                # the 33rd candidate is inspected.
                with closing(sqlite3.connect(self.db_path, timeout=0.2)) as observer:
                    observer.execute("BEGIN IMMEDIATE")
                    observer.rollback()
                checked[0] = True
            return real_candidates(db, asset, **kwargs)

        engine._related_candidates = probe_candidates
        try:
            result = engine.apply_telegram_evidence(
                self.db_path, original_topic="Abe3D", limit=100,
            )
        finally:
            engine._related_candidates = real_candidates
        self.assertTrue(checked[0])
        self.assertEqual(result["proposed"], 34)
        self.assertEqual(
            engine.apply_telegram_evidence(
                self.db_path, original_topic="Abe3D", limit=100,
            )["proposed"],
            0,
        )

    def test_temporal_proximity_never_creates_a_relation(self):
        self.add_asset(300)
        message = engine.TelegramHistoryMessage(
            SOURCE_CHAT, 301, 5, "Abe3D", "Title: Elektra"
        )
        engine.ingest_history_messages(self.db_path, SOURCE_CHAT, [message])
        engine.apply_telegram_evidence(self.db_path)
        finding = engine.list_telegram_findings(self.db_path, 300)
        self.assertEqual(finding["related_messages"], [])
        self.assertEqual(finding["candidates"], [])
        self.assertEqual(finding["coverage"]["identity_status"], "unidentified")

    def test_public_review_reads_do_not_reinitialize_schema(self):
        self.add_asset(900, topic="Abe3D")
        with engine._open_curadoria(self.db_path):
            pass

        original = engine.ensure_schema
        def reject_schema_write(_db):
            raise AssertionError("Leitura tentou reabrir schema para escrita")
        engine.ensure_schema = reject_schema_write
        try:
            findings = engine.list_telegram_findings(self.db_path, 900)
            counts = engine.status_counts(self.db_path)
            cycle = engine.last_cycle_status(self.db_path)
        finally:
            engine.ensure_schema = original
        self.assertEqual(findings["message_id"], 900)
        self.assertEqual(counts["manual_confirmations"], 0)
        self.assertEqual(cycle["status"], "not_started")

    def test_album_history_exact_ids_reveal_review_only_evidence(self):
        self.add_asset(700, topic="Pokerus Studio")
        self.add_asset(701, topic="Pokerus Studio")
        self.add_asset(702, topic="Other Studio")
        with engine._open_curadoria(self.db_path) as db:
            for message_id, topic_id, topic_name in (
                (700, 5, "Pokerus Studio"),
                (701, 5, "Pokerus Studio"),
                (702, 6, "Other Studio"),
            ):
                db.execute("""
                    UPDATE telegram_identity_coverage SET
                    source_chat_id=?,topic_id=?,topic_name=? WHERE message_id=?
                """, (SOURCE_CHAT, topic_id, topic_name, message_id))
            db.commit()
        engine.ingest_history_messages(self.db_path, SOURCE_CHAT, [
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 700, 5, "Pokerus Studio",
                "▪️ Gengar - Pokémon\n▫️ Estúdio: Pokerus Studio",
                grouped_id="album-700", has_media=True,
            ),
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 701, 5, "Pokerus Studio", "",
                grouped_id="album-700", has_media=True,
            ),
            engine.TelegramHistoryMessage(
                SOURCE_CHAT, 702, 6, "Other Studio", "Title: Wrong Name",
                grouped_id="album-700", has_media=True,
            ),
        ])
        result = engine.list_telegram_findings(self.db_path, 701)
        contextual = [
            c for c in result["candidates"]
            if c["evidence_type"] == "telegram_album_context"
        ]
        self.assertEqual(len(contextual), 1)
        self.assertEqual(contextual[0]["title"], "Gengar")
        self.assertEqual(contextual[0]["status"], "revisar")
        self.assertLessEqual(contextual[0]["confidence"], 0.52)
        self.assertEqual(contextual[0]["source_message_id"], 700)
        self.assertEqual(
            [(m["evidence_message_id"], m["relation_type"]) for m in result["related_messages"]],
            [(700, "same_album")],
        )
        other = engine.list_telegram_findings(self.db_path, 702)
        self.assertNotIn(
            "Gengar", [c["title"] for c in other["candidates"]],
        )
        engine.apply_telegram_evidence(self.db_path, original_topic="Pokerus Studio")
        with _test_db(self.db_path) as db:
            title = db.execute(
                "SELECT title FROM name_proposals WHERE message_id=701"
            ).fetchone()[0]
        self.assertEqual(title, "")

    def test_album_text_is_review_context_and_is_not_auto_inherited(self):
        self.add_asset(400, album="album-400")
        message = engine.TelegramHistoryMessage(
            SOURCE_CHAT, 401, 5, "Abe3D", "Title: Uther Lightbringer",
            grouped_id="album-400", has_media=True,
        )
        engine.ingest_history_messages(self.db_path, SOURCE_CHAT, [message])
        finding = engine.list_telegram_findings(self.db_path, 400)
        self.assertEqual(finding["candidates"][0]["evidence_type"], "telegram_album_context")
        self.assertEqual(finding["candidates"][0]["status"], "revisar")
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            title = db.execute(
                "SELECT title FROM name_proposals WHERE message_id=400"
            ).fetchone()[0]
        self.assertEqual(title, "")

    def test_multiple_scales_in_one_album_remain_separate(self):
        self.add_asset(500, "Title: Uther Lightbringer\nScale: 1/6", album="album-500")
        self.add_asset(501, "Title: Uther Lightbringer\nScale: 1/10", album="album-500")
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            rows = db.execute("""
                SELECT message_id,title,variant FROM name_proposals
                WHERE message_id IN (500,501) ORDER BY message_id
            """).fetchall()
            group_count = db.execute("SELECT COUNT(*) FROM model_group_members").fetchone()[0]
        self.assertEqual(rows, [
            (500, "Uther Lightbringer", "1/6"),
            (501, "Uther Lightbringer", "1/10"),
        ])
        self.assertEqual(group_count, 0)

    def test_reviewed_gallery_angles_share_one_external_search(self):
        self.add_asset(600, "#WonderWoman")
        self.add_asset(601, "#WonderWoman")
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            for mid in (600, 601):
                db.execute(
                    "UPDATE telegram_identity_coverage SET coverage_status='exhausted',topic_id=5 "
                    "WHERE message_id=?", (mid,)
                )
                db.execute(
                    "INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at) "
                    "VALUES(?,?,?,?)", (mid, "gallery-600", "reviewed_angles", "synthetic")
                )
            db.commit()
        search = FakeSearch([engine.OfficialSearchResult(
            "Wonder Woman", "https://cults3d.com/en/3d-model/art/wonder-woman"
        )])
        first = engine.research_official_pending(self.db_path, self.source_registry, search)
        second = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(len(search.calls), 1)
        self.assertEqual(first["searches"], 1)
        self.assertEqual(second["searches"], 0)
        with _test_db(self.db_path) as db:
            states = db.execute(
                "SELECT status,official_url FROM name_proposals WHERE message_id IN (600,601)"
            ).fetchall()
        self.assertEqual(states, [("revisar", ""), ("revisar", "")])

    def test_incremental_official_queue_advances_after_cached_gallery(self):
        self.add_asset(605, "#Elektra")
        self.add_asset(606, "#Mantis")
        engine.apply_telegram_evidence(self.db_path)
        self.set_coverage(605, identity="ambiguous")
        self.set_coverage(606, identity="ambiguous")
        search = FakeSearch([engine.OfficialSearchResult(
            "Elektra Statue", "https://cults3d.com/en/3d-model/art/elektra-statue",
            universe="Marvel",
        )])

        first = engine.research_official_pending(
            self.db_path, self.source_registry, search, limit=1,
        )
        second = engine.research_official_pending(
            self.db_path, self.source_registry, search, limit=1,
        )
        self.assertEqual(first["searches"], 1)
        self.assertEqual(second["searches"], 1)
        self.assertEqual([query for query, _ in search.calls], ["Elektra", "Mantis"])
        with _test_db(self.db_path) as db:
            rows = db.execute("""
                SELECT entity_key,results_json FROM telegram_official_search_cache
                ORDER BY query_text
            """).fetchall()
        self.assertEqual(len(rows), 2)
        self.assertTrue(any('"universe": "Marvel"' in row[1] for row in rows))

    def test_same_character_in_separate_reviewed_galleries_is_not_merged(self):
        self.add_asset(610, "#HarleyQuinn")
        self.add_asset(611, "#HarleyQuinn")
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            db.execute("UPDATE name_proposals SET variant='Classic' WHERE message_id=610")
            db.execute("UPDATE name_proposals SET variant='Bikini' WHERE message_id=611")
            for mid, group in ((610, "sculpture-a"), (611, "sculpture-b")):
                db.execute(
                    "UPDATE telegram_identity_coverage SET coverage_status='exhausted' WHERE message_id=?",
                    (mid,),
                )
                db.execute(
                    "INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at) "
                    "VALUES(?,?,?,?)", (mid, group, "reviewed_angles", "synthetic")
                )
            db.commit()
        search = FakeSearch([engine.OfficialSearchResult(
            "Harley Quinn", "https://cults3d.com/en/3d-model/art/harley-quinn"
        )])
        result = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(len(search.calls), 2)
        self.assertEqual(result["searches"], 2)

    def test_incomplete_telegram_coverage_blocks_external_search(self):
        self.add_asset(700, "#Mantis")
        engine.apply_telegram_evidence(self.db_path)
        search = FakeSearch([engine.OfficialSearchResult(
            "Mantis", "https://cults3d.com/en/3d-model/art/mantis"
        )])
        result = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(result["telegram_not_exhausted"], 1)
        self.assertEqual(search.calls, [])

    def test_exhausted_but_unidentified_without_terms_is_not_searched(self):
        self.add_asset(701, "")
        engine.apply_telegram_evidence(self.db_path)
        self.set_coverage(701, identity="unidentified")
        search = FakeSearch()
        result = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(result["no_search_terms"], 1)
        self.assertEqual(search.calls, [])

    def test_official_source_unavailable_is_cached_without_confirmation(self):
        self.add_asset(702, "#Elektra")
        engine.apply_telegram_evidence(self.db_path)
        self.set_coverage(702, identity="ambiguous")
        search = FakeSearch(error=RuntimeError("offline"))
        result = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(result["unavailable_sources"], 1)
        with _test_db(self.db_path) as db:
            status, official_url = db.execute(
                "SELECT status,official_url FROM name_proposals WHERE message_id=702"
            ).fetchone()
            cache_status = db.execute(
                "SELECT status FROM telegram_official_search_cache"
            ).fetchone()[0]
        self.assertEqual(status, "revisar")
        self.assertEqual(official_url, "")
        self.assertEqual(cache_status, "unavailable")

    def test_conflicting_official_pages_remain_candidates_not_confirmations(self):
        self.add_asset(703, "#Elektra")
        engine.apply_telegram_evidence(self.db_path)
        self.set_coverage(703, identity="ambiguous")
        search = FakeSearch([
            engine.OfficialSearchResult(
                "Elektra Bust", "https://cults3d.com/en/3d-model/art/elektra-bust",
                variant="Bust",
            ),
            engine.OfficialSearchResult(
                "Elektra Full Statue", "https://cults3d.com/en/3d-model/art/elektra-statue",
                variant="Full Statue",
            ),
        ])
        result = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(result["conflicts"], 1)
        with _test_db(self.db_path) as db:
            status = db.execute(
                "SELECT status FROM name_proposals WHERE message_id=703"
            ).fetchone()[0]
            cached_status = db.execute(
                "SELECT status FROM telegram_official_search_cache"
            ).fetchone()[0]
        self.assertEqual(status, "revisar")
        self.assertEqual(cached_status, "conflict")

    def test_unverified_source_and_off_domain_result_are_rejected(self):
        self.add_asset(704, "#Thena")
        engine.apply_telegram_evidence(self.db_path)
        self.set_coverage(704, identity="ambiguous")
        search = FakeSearch([engine.OfficialSearchResult(
            "Thena", "https://example.invalid/thena"
        )])
        unverified = lambda _topic: [engine.OfficialSource(
            "Abe3D", "Cults3D", "https://cults3d.com/en/users/abe3d", verified=False
        )]
        result = engine.research_official_pending(self.db_path, unverified, search)
        self.assertEqual(result["unavailable_sources"], 1)
        self.assertEqual(search.calls, [])
        accepted = engine.research_official_pending(self.db_path, self.source_registry, search)
        self.assertEqual(accepted["official_candidates"], 0)
        with _test_db(self.db_path) as db:
            self.assertEqual(db.execute(
                "SELECT status FROM telegram_official_search_cache"
            ).fetchone()[0], "empty")

    def test_manual_review_is_preserved_and_telegram_proposals_never_confirm(self):
        self.add_asset(705, "Princess Jasmine")
        self.add_proposal(705, title="Manual Title", status="revisar", notes="manual note")
        result = engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            title, status = db.execute(
                "SELECT title,status FROM name_proposals WHERE message_id=705"
            ).fetchone()
        self.assertEqual(result["preserved_manual"], 1)
        self.assertEqual((title, status), ("Manual Title", "revisar"))

        self.add_asset(706, "Princess Jasmine")
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            status = db.execute(
                "SELECT status FROM name_proposals WHERE message_id=706"
            ).fetchone()[0]
        self.assertEqual(status, "provavel")
        self.assertNotEqual(status, "confirmado")

    def test_incremental_ignored_message_recovery_preserves_source_database(self):
        self.add_asset(800)
        source_path = self.root / "source.sqlite3"
        with _test_db(source_path) as db:
            db.executescript("""
                CREATE TABLE mensagens(
                    origem INTEGER,mensagem INTEGER,status TEXT,hash TEXT,caminho TEXT,
                    titulo TEXT,data_mensagem TEXT,referencia TEXT,erro TEXT,
                    PRIMARY KEY(origem,mensagem)
                );
                CREATE TABLE topicos_mensagens(
                    origem INTEGER,mensagem INTEGER,topico_id INTEGER,topico_nome TEXT,
                    legenda TEXT,album_id TEXT
                );
            """)
            db.executemany(
                "INSERT INTO mensagens(origem,mensagem,status) VALUES(?,?,?)",
                [(SOURCE_CHAT, 801, "ignorado"), (SOURCE_CHAT, 802, "ignorado")],
            )
            db.executemany(
                "INSERT INTO topicos_mensagens VALUES(?,?,?,?,?,?)",
                [(SOURCE_CHAT, mid, 5, "Abe3D", "", "") for mid in (800, 801, 802)],
            )
        before = hashlib.sha256(source_path.read_bytes()).hexdigest()
        client = FakeTelegramClient({
            801: {"id": 801, "message": "Title: Elektra", "reply_to_message_id": 800, "topic_id": 5},
            802: {"id": 802, "message": "Title: Thena", "topic_id": 5},
        })
        registered = engine.register_asset_topics(source_path, self.db_path, SOURCE_CHAT)
        self.assertEqual(registered["topics_recovered"], 1)
        first = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, client, SOURCE_CHAT, batch_size=1, overlap=0
        ))
        second = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, client, SOURCE_CHAT, batch_size=1, overlap=0
        ))
        self.assertEqual((first["new_message_ids"], second["new_message_ids"]), (1, 1))
        self.assertEqual(first["verified_links"], 1)
        self.assertEqual(client.calls[0][1], (801,))
        self.assertEqual(client.calls[1][1], (802,))
        engine.apply_telegram_evidence(self.db_path)
        with _test_db(self.db_path) as db:
            title = db.execute(
                "SELECT title FROM name_proposals WHERE message_id=800"
            ).fetchone()[0]
        after = hashlib.sha256(source_path.read_bytes()).hexdigest()
        self.assertEqual(title, "Elektra")
        self.assertEqual(before, after)

    def test_ignored_message_recovery_excludes_general_50k(self):
        source_path = self.root / "source-general.sqlite3"
        with _test_db(source_path) as db:
            db.executescript("""
                CREATE TABLE mensagens(origem INTEGER,mensagem INTEGER,status TEXT);
                CREATE TABLE topicos_mensagens(
                    origem INTEGER,mensagem INTEGER,topico_id INTEGER,topico_nome TEXT,
                    legenda TEXT,album_id TEXT
                );
            """)
            db.executemany(
                "INSERT INTO mensagens(origem,mensagem,status) VALUES(?,?,?)",
                [(SOURCE_CHAT, 901, "ignorado"), (SOURCE_CHAT, 902, "ignorado")],
            )
            db.executemany(
                "INSERT INTO topicos_mensagens VALUES(?,?,?,?,?,?)",
                [
                    (SOURCE_CHAT, 901, 9, "Abe3D", "", ""),
                    (SOURCE_CHAT, 902, 35546, "Geral + 50k", "", ""),
                ],
            )
        self.assertEqual(
            engine.read_ignored_message_ids(source_path, SOURCE_CHAT, limit=10), [901, 902]
        )
        self.assertEqual(
            engine.read_recent_ignored_message_ids(
                source_path, SOURCE_CHAT, through_id=1000, limit=10,
            ),
            [901, 902],
        )
        client = FakeTelegramClient({
            901: {"id": 901, "message": "Title: Elektra", "topic_id": 9},
            902: {"id": 902, "message": "Title: General Model", "topic_id": 35546},
        })
        result = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, client, SOURCE_CHAT, batch_size=10, overlap=0,
        ))
        self.assertEqual(result["message_ids_requested"], 2)
        self.assertEqual(result["text_messages_recovered"], 1)
        self.assertEqual(client.calls[0][1], (901, 902))
        with _test_db(self.db_path) as db:
            stored = db.execute("""
                SELECT message_id,topic_name,text FROM telegram_history_messages
                WHERE source_chat_id=? ORDER BY message_id
            """, (SOURCE_CHAT,)).fetchall()
        self.assertEqual(stored, [(901, "Abe3D", "Title: Elektra")])

    def test_history_scan_requires_verified_full_range_and_updates_incrementally(self):
        self.add_asset(900)
        with engine._open_curadoria(self.db_path) as db:
            db.execute("""
                UPDATE telegram_identity_coverage SET topic_id=9,topic_name='Abe3D'
                WHERE message_id=900
            """)
            db.commit()
        partial = FakeHistorySource(engine.HistoryPage(
            messages=[], source_chat_id=SOURCE_CHAT, topic_id=9, topic_name="Abe3D",
            next_cursor=50, history_high_water_id=100, has_more=True,
            coverage_verified=False, range_start_id=1, range_end_id=50,
        ))
        first = asyncio.run(engine.scan_history_batch(
            self.db_path, partial, SOURCE_CHAT, 9, topic_name="Abe3D"
        ))
        self.assertEqual(first["coverage_status"], "partial")
        complete = FakeHistorySource(engine.HistoryPage(
            messages=[], source_chat_id=SOURCE_CHAT, topic_id=9, topic_name="Abe3D",
            next_cursor=100, history_high_water_id=100, has_more=False,
            coverage_verified=True, range_start_id=51, range_end_id=100,
        ))
        second = asyncio.run(engine.scan_history_batch(
            self.db_path, complete, SOURCE_CHAT, 9, topic_name="Abe3D"
        ))
        self.assertEqual(second["coverage_status"], "exhausted")
        with _test_db(self.db_path) as db:
            self.assertEqual(db.execute(
                "SELECT coverage_status FROM telegram_identity_coverage WHERE message_id=900"
            ).fetchone()[0], "exhausted")

    def test_unrecovered_ignored_message_keeps_topic_coverage_incomplete_and_retries(self):
        self.add_asset(810)
        source_path = self.root / "source-missing.sqlite3"
        with _test_db(source_path) as db:
            db.executescript("""
                CREATE TABLE mensagens(
                    origem INTEGER,mensagem INTEGER,status TEXT,hash TEXT,caminho TEXT,
                    titulo TEXT,data_mensagem TEXT,referencia TEXT,erro TEXT,
                    PRIMARY KEY(origem,mensagem)
                );
                CREATE TABLE topicos_mensagens(
                    origem INTEGER,mensagem INTEGER,topico_id INTEGER,topico_nome TEXT,
                    legenda TEXT,album_id TEXT
                );
            """)
            db.execute(
                "INSERT INTO mensagens(origem,mensagem,status) VALUES(?,?,?)",
                (SOURCE_CHAT, 811, "ignorado"),
            )
            db.execute(
                "INSERT INTO topicos_mensagens VALUES(?,?,?,?,?,?)",
                (SOURCE_CHAT, 811, 5, "Abe3D", "", ""),
            )
        with engine._open_curadoria(self.db_path) as db:
            db.execute("""
                UPDATE telegram_identity_coverage SET topic_id=5,topic_name='Abe3D'
                WHERE message_id=810
            """)
            db.commit()

        missing_client = FakeTelegramClient({})
        missing = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, missing_client, SOURCE_CHAT,
            batch_size=1, overlap=0,
        ))
        self.assertEqual(missing["not_returned"], 1)
        with _test_db(self.db_path) as db:
            row = db.execute("""
                SELECT topic_id,fetch_status FROM telegram_history_messages
                WHERE source_chat_id=? AND message_id=811
            """, (SOURCE_CHAT,)).fetchone()
        self.assertEqual(row, (5, "not_returned"))

        complete_page = FakeHistorySource(engine.HistoryPage(
            messages=[], source_chat_id=SOURCE_CHAT, topic_id=5, topic_name="Abe3D",
            next_cursor=100, history_high_water_id=100, has_more=False,
            coverage_verified=True, range_start_id=1, range_end_id=100,
        ))
        blocked = asyncio.run(engine.scan_history_batch(
            self.db_path, complete_page, SOURCE_CHAT, 5, topic_name="Abe3D"
        ))
        self.assertEqual(blocked["coverage_status"], "partial")

        retry_client = FakeTelegramClient({811: {
            "id": 811, "message": "Title: Elektra", "topic_id": 5,
        }})
        retried = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, retry_client, SOURCE_CHAT,
            batch_size=1, overlap=0,
        ))
        self.assertEqual(retried["text_messages_recovered"], 1)
        recovered = asyncio.run(engine.scan_history_batch(
            self.db_path, complete_page, SOURCE_CHAT, 5, topic_name="Abe3D"
        ))
        self.assertEqual(recovered["coverage_status"], "exhausted")

    def test_telethon_message_empty_is_not_treated_as_recovered(self):
        missing_message = type("MessageEmpty", (), {"id": 812})()
        parsed = engine._to_history_message(missing_message, SOURCE_CHAT, "Abe3D")
        self.assertEqual(parsed.fetch_status, "not_returned")

    def test_unrecovered_retries_do_not_block_new_ignored_ids(self):
        source_path = self.root / "source-backlog.sqlite3"
        with _test_db(source_path) as db:
            db.executescript("""
                CREATE TABLE mensagens(
                    origem INTEGER,mensagem INTEGER,status TEXT,hash TEXT,caminho TEXT,
                    titulo TEXT,data_mensagem TEXT,referencia TEXT,erro TEXT,
                    PRIMARY KEY(origem,mensagem)
                );
                CREATE TABLE topicos_mensagens(
                    origem INTEGER,mensagem INTEGER,topico_id INTEGER,topico_nome TEXT,
                    legenda TEXT,album_id TEXT
                );
            """)
            db.executemany(
                "INSERT INTO mensagens(origem,mensagem,status) VALUES(?,?,?)",
                [(SOURCE_CHAT, mid, "ignorado") for mid in range(901, 907)],
            )
            db.executemany(
                "INSERT INTO topicos_mensagens VALUES(?,?,?,?,?,?)",
                [(SOURCE_CHAT, mid, 9, "Abe3D", "", "") for mid in range(901, 907)],
            )
        client = FakeTelegramClient({})
        first = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, client, SOURCE_CHAT,
            batch_size=4, overlap=0,
        ))
        second = asyncio.run(engine.recover_ignored_message_batch(
            source_path, self.db_path, client, SOURCE_CHAT,
            batch_size=4, overlap=0,
        ))
        self.assertEqual((first["new_message_ids"], second["new_message_ids"]), (4, 2))
        self.assertEqual(client.calls[1][1], (901, 905, 906))


if __name__ == "__main__":
    unittest.main(verbosity=2)
