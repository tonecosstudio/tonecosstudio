import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canNavigateTelegramIndex,
  resolveTelegramIndexNeighbor,
} from "../../src/services/catalog/tonart-telegram-navigation.ts";

const item = (n) => ({ id: "tg_" + String(n), name: "Modelo " + n });
const page = (offset, size = 24, total = 25) => ({
  offset, limit: size, total,
  items: Array.from({ length: Math.min(size, total - offset) }, (_, i) => item(offset + i + 1)),
});

test("within-page navigation never loads another page or mutates data", async () => {
  const current = page(0);
  let loaded = 0;
  const target = await resolveTelegramIndexNeighbor(current, item(4).id, 1, async () => {
    loaded += 1; throw Error("unexpected page load");
  });
  assert.deepEqual(target, { id: item(5).id, newPage: null, newOffset: 0 });
  assert.equal(loaded, 0);
  assert.equal(current.items.length, 24);
});

test("curation passes 24 to 25 without skipping the boundary", async () => {
  const original = page(0);
  const requested = [];
  const next = await resolveTelegramIndexNeighbor(original, item(24).id, 1, async (offset) => {
    requested.push(offset);
    return page(offset);
  });
  assert.deepEqual(requested, [24]);
  assert.equal(next?.id, item(25).id);
  assert.equal(next?.newOffset, 24);
  assert.equal(next?.newPage?.items.length, 1);
  assert.equal(canNavigateTelegramIndex(next.newPage, item(25).id, 1), false);
});

test("curation returns from 25 to 24 across pages", async () => {
  const next = await resolveTelegramIndexNeighbor(page(24), item(25).id, -1, async (offset) => {
    assert.equal(offset, 0);
    return page(offset);
  });
  assert.equal(next?.id, item(24).id);
  assert.equal(next?.newOffset, 0);
  assert.equal(next?.newPage?.items.length, 24);
});

test("no navigation when selected model is missing or already at the end", async () => {
  assert.equal(canNavigateTelegramIndex(page(24), item(25).id, 1), false);
  assert.equal(canNavigateTelegramIndex(page(24), "unknown", -1), false);
  assert.equal(await resolveTelegramIndexNeighbor(page(24), item(25).id, 1, async () => {
    throw Error("must not be called");
  }), null);
});

test("rejects stale, empty or mismatched adjacent pages", async () => {
  const previous = page(0);
  for (const invalid of [
    { ...page(24), offset: 23 },
    { ...page(24), limit: 12 },
    { ...page(24), items: [] },
  ]) {
    await assert.rejects(
      resolveTelegramIndexNeighbor(previous, item(24).id, 1, async () => invalid),
      /adjacent_page_unavailable/,
    );
  }
});

test("read failure propagates without changing the selected page", async () => {
  const current = page(0);
  await assert.rejects(
    resolveTelegramIndexNeighbor(current, item(24).id, 1, async () => {
      throw new Error("network unavailable");
    }),
    /network unavailable/,
  );
  assert.equal(current.offset, 0);
  assert.equal(current.items[23].id, item(24).id);
});
