"""Offline tests for the live-session and official-profile adapters."""
from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import telegram_curadoria_adapter as adapter
import telegram_identity_engine as identity


class FakeHistoryClient:
    def __init__(self):
        self.messages = [
            {"id": 100, "message": "caption one"},
            {"id": 101, "message": "caption two"},
            {"id": 102, "message": "caption three"},
        ]
        self.calls = []

    async def get_messages(self, entity, **kwargs):
        self.calls.append(kwargs)
        if "ids" in kwargs:
            return [{"id": 50, "message": "Topic title"}]
        min_id = kwargs["min_id"]
        values = [row for row in self.messages if row["id"] > min_id]
        return values[:kwargs["limit"]]


class FakeHeaders:
    def get_content_type(self):
        return "text/html"

    def get_content_charset(self):
        return "utf-8"


class FakeResponse:
    def __init__(self, body):
        self.body = body
        self.headers = FakeHeaders()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def geturl(self):
        return "https://official.example/studio"

    def read(self, limit):
        return self.body[:limit]


class FakeOpener:
    def __init__(self, response):
        self.response = response
        self.request = None
        self.timeout = None

    def open(self, request, timeout):
        self.request = request
        self.timeout = timeout
        return self.response


class TelegramCuradoriaAdapterTests(unittest.TestCase):
    def test_history_pages_are_forward_only_and_bounded_to_the_requested_topic(self):
        client = FakeHistoryClient()
        source = adapter.TelethonHistorySource(client, "chat", 99, 50, "Studio")
        first = asyncio.run(source.fetch_history_page(
            topic_id=50, after_message_id=0, limit=2,
        ))
        self.assertEqual([item["id"] for item in first.messages], [50, 100, 101])
        self.assertEqual(first.next_cursor, 101)
        self.assertEqual(first.history_high_water_id, 102)
        self.assertTrue(first.has_more)
        request = next(call for call in client.calls if "ids" not in call)
        self.assertEqual(request["reply_to"], 50)
        self.assertEqual(request["min_id"], 0)
        self.assertTrue(request["reverse"])
        self.assertEqual(request["limit"], 3)

        second = asyncio.run(source.fetch_history_page(
            topic_id=50, after_message_id=101, limit=2,
        ))
        self.assertEqual([item["id"] for item in second.messages], [102])
        self.assertEqual(second.next_cursor, 102)
        self.assertFalse(second.has_more)
        self.assertTrue(second.coverage_verified)

    def test_official_profile_search_returns_specific_same_host_links_only(self):
        body = b"""
            <a href='/studio/elektra-statue'>Elektra Statue</a>
            <a href='/studio/3d-models'>Elektra models</a>
            <a href='https://other.example/elektra'>Elektra bust</a>
        """
        opener = FakeOpener(FakeResponse(body))
        with patch.object(adapter, "build_opener", return_value=opener):
            results = adapter.OfficialProfileSearch().search_official(
                "Elektra", identity.OfficialSource(
                    "Studio", "Official Catalog", "https://official.example/studio",
                    verified=True,
                ),
            )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Elektra Statue")
        self.assertEqual(results[0]["url"], "https://official.example/studio/elektra-statue")
        self.assertEqual(opener.timeout, 8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
