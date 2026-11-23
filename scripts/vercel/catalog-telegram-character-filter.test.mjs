import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../api/catalogo-proxy.js";

function sink() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: null,
    setHeader(k, v) {
      this.headers.set(k.toLowerCase(), v);
    },
    end(value = "") {
      this.body = value;
    },
  };
}

const BASE = "https://tonecos-catalogo-api.tonecosstudio.workers.dev";

test("canonical proxy forwards exact franchise and character filters without SQL or new API", async () => {
  const original = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return Response.json(
      { total: 1, items: [] },
      {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=60" },
      },
    );
  };
  try {
    for (const params of [
      { franchise: "one-piece", character: "Ace" },
      { franchise: "one-piece" },
    ]) {
      const res = sink();
      await handler(
        {
          method: "GET",
          url: "/api/catalogo-proxy?path=api%2Ftelegram-studios",
          query: {
            path: "api/telegram-studios",
            offset: "0",
            limit: "24",
            ...params,
          },
          headers: {
            host: "catalogo.tonartstudio.com.br",
            accept: "application/json",
          },
        },
        res,
      );
      assert.equal(res.statusCode, 200, JSON.stringify(params));
      assert.equal(
        res.headers.get("vercel-cdn-cache-control"),
        "public, s-maxage=60",
      );
    }
    assert.equal(
      requested[0],
      BASE +
        "/api/telegram-studios?offset=0&limit=24&franchise=one-piece&character=Ace",
    );
    assert.equal(
      requested[1],
      BASE + "/api/telegram-studios?offset=0&limit=24&franchise=one-piece",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("canonical proxy rejects unscoped, ambiguous and malformed character filters before Worker read", async () => {
  const original = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls++;
    throw new Error("upstream must not be queried");
  };
  try {
    for (const query of [
      { path: "api/telegram-studios", character: "Ace" },
      {
        path: "api/telegram-studios",
        character: "Ace",
        franchise: "one-piece",
        utm: "1",
      },
      {
        path: "api/telegram-studios",
        character: " Ace",
        franchise: "one-piece",
      },
      {
        path: "api/telegram-studios",
        character: "Ace ",
        franchise: "one-piece",
      },
      {
        path: "api/telegram-studios",
        character: "a".repeat(81),
        franchise: "one-piece",
      },
      {
        path: "api/telegram-studios",
        character: "Ace",
        franchise: ["one-piece", "one-piece"],
      },
      {
        path: "api/telegram-studios",
        character: "Ace",
        franchise: "One Piece",
      },
    ]) {
      const res = sink();
      await handler(
        {
          method: "GET",
          url: "/api/catalogo-proxy?path=api%2Ftelegram-studios",
          query,
          headers: { host: "catalogo.tonartstudio.com.br" },
        },
        res,
      );
      assert.equal(res.statusCode, 400, JSON.stringify(query));
      assert.equal(res.headers.get("cache-control"), "no-store");
    }
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
