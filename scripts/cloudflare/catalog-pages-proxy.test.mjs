import assert from "node:assert/strict";
import { test } from "node:test";
import { onRequest, proxyCatalogRequest, proxyTelegramAdminRequest } from "../../functions/catalogo-api/[[path]].js";
import vercelCatalogHandler, { isStandaloneTelegramCatalogHost, isAllowedStandaloneTelegramRoute } from "../../api/catalogo-proxy.js";

const SITE = "https://tonecosstudio.pages.dev";
const WORKER = "https://tonecos-catalogo-api.tonecosstudio.workers.dev";

function mockFetch(body = "ok", status = 200, headers = {}) {
  const calls = [];
  return {
    calls,
    fetcher: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(body, { status, headers });
    },
  };
}

test("only same-origin public catalog GET is forwarded", async () => {
  for (const path of [
    "api/catalog?limit=24",
    "api/categories",
    "api/franchises?q=abc&limit=24",
    "api/folders?category=figuras&franchise=marvel",
    "api/recent?limit=6",
    "api/models/model-one",
    "api/models/model-one/images?limit=6&v=1",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.equal(response.status, 200);
    assert.equal(io.calls[0].url, WORKER + "/" + path);
  }
});

test("Telegram provisional filter passes only bounded values through the same catalog proxy", async () => {
  for (const suffix of ["?provisional=1", "?provisional=0", "?studio=3DXM&q=Chibi&provisional=1&limit=24"]) {
    const io = mockFetch();
    const route = "api/telegram-studios" + suffix;
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + route), io.fetcher,
    );
    assert.equal(response.status, 200, route);
    assert.equal(io.calls.length, 1, route);
    assert.equal(io.calls[0].url, WORKER + "/" + route);
  }
  for (const suffix of ["?provisional=2", "?provisional=true", "?provisional=1&provisional=0", "?provisional=1&extra=1"]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/api/telegram-studios" + suffix),
      io.fetcher,
    );
    assert.equal(response.status, 400, suffix);
    assert.equal(io.calls.length, 0, suffix);
  }
});

test("Telegram identity partition is forwarded only on the public list and directory", async () => {
  for (const route of [
    "api/telegram-studios?identity=identified&limit=24",
    "api/telegram-studios?identity=unidentified",
    "api/telegram-studios/studios?identity=identified",
    "api/telegram-studios/studios?identity=unidentified",
    "api/catalog?q=Thanos&scope=all",
    "api/catalog?scope=all&limit=24",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(new Request(SITE + "/catalogo-api/" + route), io.fetcher);
    assert.equal(response.status, 200, route);
    assert.equal(io.calls[0].url, WORKER + "/" + route);
  }
  for (const route of [
    "api/telegram-studios?identity=all",
    "api/telegram-studios?identity=identified&identity=unidentified",
    "api/telegram-studios/studios?identity=unknown",
    "api/catalog?q=Thanos&identity=unidentified",
    "api/telegram-studios/tg_abcdef0123456789abcdef01?identity=identified",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(new Request(SITE + "/catalogo-api/" + route), io.fetcher);
    assert.equal(response.status, 400, route);
    assert.equal(io.calls.length, 0, route);
  }
});

test("Telegram category is forwarded only as a bounded public-list filter", async () => {
  for (const suffix of [
    "?category=anime&limit=1&offset=0",
    "?studio=Studio%20A&category=3d-printing&limit=24",
  ]) {
    const io = mockFetch();
    const route = "api/telegram-studios" + suffix;
    const result = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + route),
      io.fetcher,
    );
    assert.equal(result.status, 200, suffix);
    assert.equal(io.calls.length, 1, suffix);
    assert.equal(io.calls[0].url, WORKER + "/" + route);
  }
  for (const suffix of [
    "?category=Anime", "?category=anime--manga", "?category=",
    "?category=" + "a".repeat(81), "?category=anime&category=manga",
    "?category=anime&debug=1",
  ]) {
    const io = mockFetch();
    const result = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/api/telegram-studios" + suffix),
      io.fetcher,
    );
    assert.equal(result.status, 400, suffix);
    assert.equal(io.calls.length, 0, suffix);
  }
});

test("standalone Vercel adapter forwards the canonical Telegram category to Worker", async () => {
  const oldFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return Response.json({ total: 0, offset: 0, limit: 1, items: [] }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  };
  try {
    const res = {
      statusCode: 200,
      headers: new Map(),
      body: null,
      setHeader(key, value) { this.headers.set(key, value); },
      end(bytes) { this.body = bytes; },
    };
    await vercelCatalogHandler({
      method: "GET",
      headers: { host: "catalogo.tonartstudio.com.br" },
      query: { path: "api/telegram-studios", category: "anime", limit: "1", offset: "0" },
      url: "/api/catalogo-proxy?path=api/telegram-studios&category=anime&limit=1&offset=0",
    }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body.toString()), { total: 0, offset: 0, limit: 1, items: [] });
    assert.deepEqual(calls, [WORKER + "/api/telegram-studios?category=anime&limit=1&offset=0"]);
    assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "public, s-maxage=60");
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test("public media preserves encoded filenames and range", async () => {
  const io = mockFetch("file", 206, {
    "content-type": "image/webp",
    "content-range": "bytes 0-99/300",
  });
  const request = new Request(SITE + "/catalogo-api/media/images/part%20one.webp", {
    headers: { Range: "bytes=0-99" },
  });
  const response = await proxyCatalogRequest(request, io.fetcher);
  assert.equal(response.status, 206);
  assert.equal(io.calls[0].url, WORKER + "/media/images/part%20one.webp");
  assert.equal(io.calls[0].options.headers.get("Range"), "bytes=0-99");
});

test("single-byte media ranges are accepted without changing their values", async () => {
  for (const range of ["bytes=0-99", "bytes=100-", "bytes=-512", "BYTES=1-3"]) {
    const rangeHeader = range === "bytes=100-" ? "bytes 100-199/200"
      : range === "bytes=-512" ? "bytes 0-199/200"
      : range === "BYTES=1-3" ? "bytes 1-3/200"
      : "bytes 0-99/200";
    const io = mockFetch("partial", 206, { "content-range": rangeHeader });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/media/images/figure.webp", {
        headers: { Range: range },
      }),
      io.fetcher,
    );
    assert.equal(response.status, 206, range);
    assert.equal(io.calls.length, 1, range);
    assert.equal(io.calls[0].options.headers.get("Range"), range);
  }
});

test("inconsistent upstream partial images are blocked without public caching", async () => {
  const cases = [
    { range: "bytes=0-99", contentRange: null },
    { range: "bytes=0-99", contentRange: "bytes 20-99/200" },
    { range: "bytes=0-99", contentRange: "bytes 0-120/200" },
    { range: "bytes=0-99", contentRange: "bytes 0-99/90" },
    { range: "bytes=-10", contentRange: "bytes 0-9/200" },
    { range: "bytes=10-", contentRange: "bytes 10-11/*" },
  ];
  for (const item of cases) {
    const io = mockFetch("broken", 206, item.contentRange
      ? { "Content-Range": item.contentRange, "Cache-Control": "public, max-age=3600" }
      : { "Cache-Control": "public, max-age=3600" });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/media/images/figure.webp", {
        headers: { Range: item.range },
      }), io.fetcher,
    );
    assert.equal(response.status, 502, item.range);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.has("Content-Range"), false);
    assert.equal(io.calls.length, 1);
  }
});

test("complete legacy R2 206 response is normalized into a complete 200 image", async () => {
  const io = mockFetch("RIFF-WEBP", 206, {
    "Content-Type": "image/webp",
    "Content-Range": "bytes 0-8/9",
    "Content-Length": "9",
  });
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/media/images/figure.webp"),
    io.fetcher,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/webp");
  assert.equal(response.headers.get("Content-Range"), null);
  assert.equal(await response.text(), "RIFF-WEBP");
  assert.equal(io.calls.length, 1);
  assert.equal(io.calls[0].options.headers.has("Range"), false);
});

test("only an exact complete legacy span may be normalized", async () => {
  for (const range of ["bytes 0-8/10", "bytes 1-9/10", "bytes 0-9/*", "bytes 0-0/0"]) {
    const io = mockFetch("partial", 206, { "Content-Range": range });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/media/images/figure.webp"), io.fetcher,
    );
    assert.equal(response.status, 502, range);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("unexpected partial JSON and unrequested partial media cannot reach Pages", async () => {
  for (const path of ["api/catalog", "media/images/figure.webp"]) {
    const io = mockFetch("partial", 206, {
      "Content-Range": "bytes 0-3/100",
      "Cache-Control": "public, max-age=3600",
    });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path),
      io.fetcher,
    );
    assert.equal(response.status, 502, path);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("invalid media ranges fail before any Worker or R2 read", async () => {
  for (const range of [
    "bytes=10-2", "bytes=-0", "bytes=-", "bytes=abc",
    "bytes=0-1,3-4", "items=0-1", "bytes=1-9999999999999999",
    "bytes=9999999999999999-", "bytes=0-1;unexpected",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/media/images/figure.webp", {
        headers: { Range: range },
      }),
      io.fetcher,
    );
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(io.calls.length, 0, range);
  }
});

test("Range is not forwarded on catalog JSON reads", async () => {
  const io = mockFetch();
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/api/catalog", {
      headers: { Range: "bytes=0-1" },
    }),
    io.fetcher,
  );
  assert.equal(response.status, 200);
  assert.equal(io.calls.length, 1);
  assert.equal(io.calls[0].options.headers.has("Range"), false);
});

test("mutations never reach the canonical Worker", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/api/catalog", { method }), io.fetcher,
    );
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET");
    assert.equal(io.calls.length, 0);
  }
});

test("admin and unknown endpoints or unsafe media fail closed", async () => {
  for (const path of [
    "api/admin", "api/quotes", "api/models", "api/models/model-one/publish",
    "api/models/%2e%2e", "media/a%2fb.webp", "media/a%5cb.webp",
    "media/a%00b.webp", "media/%zz.webp", "media/%2e%2e%2fprivate.webp",
    "media/%252e%252e%252fsecret.webp", "media/%252e%252e%255csecret.webp",
    "media/images/%252fsecret.webp", "media/images/%253asecret.webp",
    "unknown", "api/catalog/extra",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.equal(response.status, 404, "Unexpected status for " + path);
    assert.equal(io.calls.length, 0, "Unexpected Worker request for " + path);
  }
});

test("cookies and authorization are never forwarded", async () => {
  const io = mockFetch();
  const request = new Request(SITE + "/catalogo-api/api/categories", {
    headers: {
      Cookie: "session=private",
      Authorization: "Bearer private",
      "X-Customer-ID": "private",
      "If-None-Match": '"123"',
    },
  });
  await proxyCatalogRequest(request, io.fetcher);
  const headers = io.calls[0].options.headers;
  assert.equal(headers.has("Cookie"), false);
  assert.equal(headers.has("Authorization"), false);
  assert.equal(headers.has("X-Customer-ID"), false);
  assert.equal(headers.get("If-None-Match"), '"123"');
  assert.equal(io.calls[0].options.redirect, "manual");
});

test("client cancellation propagates to the existing Worker binding", async () => {
  const controller = new AbortController();
  const request = new Request(SITE + "/catalogo-api/api/catalog", {
    signal: controller.signal,
  });
  let forwarded;
  const pending = proxyCatalogRequest(request, (_url, options) => {
    forwarded = options;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        reject(new DOMException("Client cancelled request", "AbortError"));
      }, { once: true });
    });
  });

  assert.ok(forwarded, "upstream fetch begins before cancellation");
  assert.equal(forwarded.signal, request.signal);
  controller.abort();
  assert.equal(forwarded.signal.aborted, true);
  const response = await pending;
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("the native binding receives the original client AbortSignal", async () => {
  const controller = new AbortController();
  const request = new Request(SITE + "/catalogo-api/api/categories", {
    signal: controller.signal,
  });
  let forwardedSignal;
  const response = await onRequest({
    request,
    env: {
      CATALOG_WORKER: {
        async fetch(_url, options) {
          forwardedSignal = options.signal;
          return Response.json({ items: [] });
        },
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(forwardedSignal, request.signal);
});

test("upstream cannot set cookies on Pages", async () => {
  const io = mockFetch("ok", 200, {
    "Set-Cookie": "session=foreign",
    "Cache-Control": "public, max-age=60",
  });
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/api/catalog"), io.fetcher,
  );
  assert.equal(response.headers.has("Set-Cookie"), false);
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=60");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
});

test("the Worker cannot inject first-party cookie, navigation or site-policy headers", async () => {
  const io = mockFetch("ok", 200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60",
    "ETag": '"catalog-v2"',
    "Access-Control-Allow-Origin": "*",
    "Set-Cookie": "session=foreign",
    "Clear-Site-Data": '"cookies", "storage"',
    "Refresh": "0;url=https://external.invalid",
    "Content-Security-Policy": "default-src *",
    "Content-Disposition": "attachment; filename=foreign.html",
    "Location": "https://external.invalid",
    "Access-Control-Allow-Credentials": "true",
    "Link": "<https://external.invalid/evil.js>; rel=preload; as=script",
  });
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/api/catalog"), io.fetcher,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=60");
  assert.equal(response.headers.get("ETag"), '"catalog-v2"');
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Content-Security-Policy"), "sandbox");
  for (const name of [
    "Set-Cookie", "Clear-Site-Data", "Refresh",
    "Content-Disposition", "Location", "Access-Control-Allow-Credentials", "Link",
  ]) {
    assert.equal(response.headers.has(name), false, "unsafe header: " + name);
  }
});

test("range responses preserve essential public media headers", async () => {
  const io = mockFetch("part", 206, {
    "Content-Type": "image/webp",
    "Content-Range": "bytes 0-3/300",
    "Accept-Ranges": "bytes",
    "ETag": '"media-v2"',
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Disposition": "attachment; filename=unsafe.webp",
  });
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/media/images/example.webp", {
      headers: { Range: "bytes=0-3" },
    }),
    io.fetcher,
  );
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 0-3/300");
  assert.equal(response.headers.get("Accept-Ranges"), "bytes");
  assert.equal(response.headers.get("ETag"), '"media-v2"');
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "cross-origin");
  assert.equal(response.headers.get("Content-Security-Policy"), "sandbox");
  assert.equal(response.headers.has("Content-Disposition"), false);
});

test("unexpected active HTML from the Worker is sandboxed on the site origin", async () => {
  for (const path of ["api/catalog", "media/images/example.webp"]) {
    const io = mockFetch("<script>window.evil = 1</script>", 200, {
      "Content-Type": "text/html",
      "Content-Security-Policy": "sandbox allow-scripts allow-same-origin",
      "Cache-Control": "public, max-age=60",
    });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.equal(response.headers.get("Content-Security-Policy"), "sandbox");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  }
});

test("redirects are rejected instead of followed", async () => {
  const io = mockFetch(null, 302, { Location: "https://external.invalid" });
  const response = await proxyCatalogRequest(
    new Request(SITE + "/catalogo-api/api/catalog"), io.fetcher,
  );
  assert.equal(response.status, 502);
  assert.equal(response.headers.has("Location"), false);
});

test("upstream errors propagate and offline Worker fails closed", async () => {
  const io = mockFetch("unavailable", 503);
  const request = new Request(SITE + "/catalogo-api/api/catalog");
  assert.equal((await proxyCatalogRequest(request, io.fetcher)).status, 503);
  const failed = await proxyCatalogRequest(
    request, () => Promise.reject(new Error("offline")),
  );
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get("Cache-Control"), "no-store");
});

test("upstream errors can never request public caching on the Pages origin", async () => {
  for (const status of [400, 404, 429, 500, 503]) {
    const io = mockFetch("unavailable", status, {
      "Cache-Control": "public, max-age=604800",
      ETag: '"stale"',
    });
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/api/catalog"), io.fetcher,
    );
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(io.calls.length, 1);
  }
});

test("oversized request is rejected before contacting Worker", async () => {
  const io = mockFetch();
  const request = new Request(
    SITE + "/catalogo-api/api/catalog?q=" + "a".repeat(4100),
  );
  const response = await proxyCatalogRequest(request, io.fetcher);
  assert.equal(response.status, 404);
  assert.equal(io.calls.length, 0);
});

test("onRequest forwards public reads via native Pages Service Binding", async () => {
  const calls = [];
  const service = {
    fetch(url, options) {
      assert.equal(this, service, "the Fetcher method keeps its binding context");
      calls.push({ url, options });
      return Promise.resolve(Response.json({ items: [], nextCursor: null }));
    },
  };
  const request = new Request(SITE + "/catalogo-api/api/catalog?limit=1");
  const response = await onRequest({ request, env: { CATALOG_WORKER: service } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], nextCursor: null });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WORKER + "/api/catalog?limit=1");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.redirect, "manual");
});

test("onRequest rejects an absent service binding without an outbound fetch", async () => {
  const request = new Request(SITE + "/catalogo-api/api/catalog?limit=1");
  for (const env of [undefined, {}, { CATALOG_WORKER: {} }]) {
    const response = await onRequest({ request, env });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("onRequest preserves allowlist on bound service", async () => {
  let calls = 0;
  const env = { CATALOG_WORKER: { fetch() { calls++; return Promise.resolve(new Response("wrong")); } } };
  const mutation = await onRequest({
    request: new Request(SITE + "/catalogo-api/api/catalog", { method: "POST" }),
    env,
  });
  const unknown = await onRequest({
    request: new Request(SITE + "/catalogo-api/api/admin"),
    env,
  });
  assert.equal(mutation.status, 405);
  assert.equal(unknown.status, 404);
  assert.equal(calls, 0);
});

test("Pages blocks confirmed SpecialSTL media but forwards unrelated images", async () => {
  let workerCalls = 0;
  const worker = { fetch() {
    workerCalls += 1;
    return Promise.resolve(new Response("image", { status: 200, headers: { "content-type": "image/webp" } }));
  } };
  const env = { CATALOG_WORKER: worker };
  const blocked = await onRequest({
    request: new Request(SITE + "/catalogo-api/media/mdl_ae8d28d2fa93b1367b0a/card.webp"), env,
  });
  assert.equal(blocked.status, 404);
  assert.equal(workerCalls, 0);
  const visible = await onRequest({
    request: new Request(SITE + "/catalogo-api/media/mdl-unrelated/card.webp"), env,
  });
  assert.equal(visible.status, 200);
  assert.equal(workerCalls, 1);
});


const DRAFT_ID = 'tg_04e28eadb6e1811af4f37845';
const DRAFT_PREFIX = '/catalogo-api/api/admin/telegram-drafts';

test("private Pages draft gateway rejects anonymous requests before the Worker", async () => {
  for (const method of ['GET', 'PATCH']) {
    const io = mockFetch('{}', 200, { 'content-type':'application/json' });
    const r = await proxyTelegramAdminRequest(
      new Request(SITE + DRAFT_PREFIX, {
        method, ...(method === 'PATCH' ? { body:'{}',headers:{'content-type':'application/json'} } : {}),
      }), io.fetcher);
    assert.equal(r.status, method === 'PATCH' ? 404 : 403);
    assert.equal(io.calls.length,0);
  }
});

test("private draft studio directory is admin-only on the same Worker and read-only", async () => {
  const path = SITE + DRAFT_PREFIX + "/studios";
  const token = "Bearer " + "a".repeat(100);
  const io = mockFetch(JSON.stringify({ studios: [{ studio: "Kuton Sculpts", total: 1 }] }), 200, {
    "content-type": "application/json",
    "cache-control": "public, max-age=86400",
  });
  const anonymous = await proxyTelegramAdminRequest(new Request(path), io.fetcher);
  assert.equal(anonymous.status, 403);
  assert.equal(io.calls.length, 0);
  const authenticated = await proxyTelegramAdminRequest(new Request(path, {
    headers: { authorization: token, cookie: "secret=never-forward" },
  }), io.fetcher);
  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), { studios: [{ studio: "Kuton Sculpts", total: 1 }] });
  assert.equal(io.calls.length, 1);
  assert.equal(io.calls[0].url, WORKER + "/api/admin/telegram-drafts/studios");
  assert.equal(io.calls[0].options.method, "GET");
  assert.equal(io.calls[0].options.headers.has("cookie"), false);
  assert.equal(authenticated.headers.get("cache-control"), "private, no-store");
  const mutation = await proxyTelegramAdminRequest(new Request(path, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: "{}",
  }), io.fetcher);
  assert.equal(mutation.status, 404);
  assert.equal(io.calls.length, 1);
});

test("authenticated draft reads traverse the existing binding with no cookies or public cache", async () => {
  const auth = 'Bearer ' + 'a'.repeat(100);
  const io = mockFetch(JSON.stringify({ id:DRAFT_ID, imageCount:4 }),200, {
    'content-type':'application/json', 'set-cookie':'foreign=secret', 'cache-control':'public,max-age=900',
  });
  const request = new Request(SITE + DRAFT_PREFIX + '/' + DRAFT_ID, {
    headers:{ authorization:auth,cookie:'session=secret','x-draft-actor':'ignored' },
  });
  const r = await proxyTelegramAdminRequest(request,io.fetcher);
  assert.equal(r.status,200);
  assert.equal((await r.json()).imageCount,4);
  assert.equal(io.calls.length,1);
  assert.equal(io.calls[0].url, WORKER+'/api/admin/telegram-drafts/'+DRAFT_ID);
  assert.equal(io.calls[0].options.headers.get('authorization'),auth);
  assert.equal(io.calls[0].options.headers.has('cookie'),false);
  assert.equal(io.calls[0].options.headers.has('x-draft-actor'),false);
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  assert.equal(r.headers.has('set-cookie'),false);
});

test("authenticated draft edits remain scoped; public catalog mutations still blocked", async () => {
  const auth = 'Bearer ' + 'b'.repeat(100);
  const body = {revision:0,name:'Monica Rambeau — revisão',studio:'Abe3D',character:'Monica Rambeau',variant:'',reviewStatus:'reviewing'};
  const io=mockFetch(JSON.stringify({ id:DRAFT_ID,revision:1,name:body.name }),200,{'content-type':'application/json'});
  const request = new Request(SITE + DRAFT_PREFIX + '/' + DRAFT_ID,{
    method:'PATCH',headers:{authorization:auth,'content-type':'application/json'},
    body:JSON.stringify(body),
  });
  const response = await proxyTelegramAdminRequest(request,io.fetcher);
  assert.equal(response.status,200);
  assert.equal((await response.json()).revision,1);
  assert.equal(io.calls[0].options.method,'PATCH');
  assert.equal(io.calls[0].options.body,JSON.stringify(body));
  assert.equal(io.calls[0].options.headers.get('authorization'),auth);
  const bad=await proxyTelegramAdminRequest(new Request(SITE+DRAFT_PREFIX,{method:'PUT',headers:{authorization:auth}}),io.fetcher);
  assert.equal(bad.status,405);
  assert.equal(io.calls.length,1);
  const publicCall=await proxyCatalogRequest(new Request(SITE+'/catalogo-api/api/catalog',{method:'PATCH',headers:{authorization:auth},body:'{}'}),io.fetcher);
  assert.equal(publicCall.status,405);
  assert.equal(io.calls.length,1);
});

test("private media is exact-key scoped and only image/webp is allowed",async()=>{
  const auth='Bearer '+'c'.repeat(100);
  const sha='3c7f50718e6cab3787df0443404f01a9b5e5976036a542c13daff9e51e4884e7';
  const io=mockFetch('RIFF____WEBP',200,{'content-type':'image/webp'});
  const path=DRAFT_PREFIX+'/'+DRAFT_ID+'/media/'+sha+'/thumb';
  const r=await proxyTelegramAdminRequest(new Request(SITE+path,{headers:{authorization:auth}}),io.fetcher);
  assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),'image/webp');
  const bad=await proxyTelegramAdminRequest(new Request(SITE+DRAFT_PREFIX+'/'+DRAFT_ID+'/media/'+sha+'/../thumb',{headers:{authorization:auth}}),io.fetcher);
  assert.equal(bad.status,404);
  assert.equal(io.calls.length,1);
});

test("private group ingestion uses the same first-party catalog Worker, never public routes",async()=>{
  const token='Bearer '+'d'.repeat(100);
  const path=DRAFT_PREFIX+'/import';
  const group={
    originId:'2370335738',studio:'Abe3D',
    groupKey:'b2b99222c387716d35aba4c3',name:'Bowsette',
    universe:'Super Mario',variant:'',franchiseId:197,
    images:[{messageId:17278,sha256:'1'.repeat(64)}],
  };
  const io=mockFetch(JSON.stringify({id:'tg_'+group.groupKey,created:true}),201,{
    'content-type':'application/json',
    'cache-control':'public,max-age=500',
    'set-cookie':'test=bad',
  });
  const req=new Request(SITE+path,{
    method:'POST',headers:{authorization:token,'content-type':'application/json'},
    body:JSON.stringify(group),
  });
  const res=await proxyTelegramAdminRequest(req,io.fetcher);
  assert.equal(res.status,201);
  assert.equal((await res.json()).created,true);
  assert.equal(io.calls.length,1);
  assert.equal(io.calls[0].url,WORKER+'/api/admin/telegram-drafts/import');
  assert.equal(io.calls[0].options.method,'POST');
  assert.equal(io.calls[0].options.headers.get('authorization'),token);
  assert.equal(io.calls[0].options.body,JSON.stringify(group));
  assert.equal(res.headers.get('cache-control'),'private, no-store');
  assert.equal(res.headers.has('set-cookie'),false);
  const anon=await proxyTelegramAdminRequest(new Request(SITE+path,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(group),
  }),io.fetcher);
  assert.equal(anon.status,403);
  assert.equal(io.calls.length,1);
});


test("the standalone Telegram catalog never exposes commercial or admin API routes", async () => {
  const hosts = [
    "catalogo.tonartstudio.com.br",
    "tonart-catalogo-publico.vercel.app",
    "tonart-catalogo-publico-git-main-jogo-brasils-projects.vercel.app",
  ];
  const publicModel = "api/telegram-studios/tg_" + "a".repeat(24);
  for (const host of hosts) {
    assert.equal(isStandaloneTelegramCatalogHost(host), true);
    for (const route of ["api/catalog", "api/categories", "api/models/model-one", "media/images/demo.webp", "api/admin/telegram-drafts"]) {
      assert.equal(isAllowedStandaloneTelegramRoute(host, route, "GET"), false, host + " " + route);
    }
    for (const route of ["api/telegram-studios", "api/telegram-studios/studios", publicModel, publicModel + "/media/" + "b".repeat(64) + "/thumb"]) {
      assert.equal(isAllowedStandaloneTelegramRoute(host, route, "GET"), true, host + " " + route);
      assert.equal(isAllowedStandaloneTelegramRoute(host, route, "POST"), false, host + " " + route);
    }
  }
  assert.equal(isStandaloneTelegramCatalogHost("tonartstudio.com.br"), false);
  assert.equal(isAllowedStandaloneTelegramRoute("tonartstudio.com.br", "api/catalog", "GET"), true);

  const res = {
    statusCode: 200,
    headers: new Map(),
    body: "",
    setHeader(name, value) { this.headers.set(name, value); },
    end(body) { this.body = body; },
  };
  await vercelCatalogHandler({
    method: "GET",
    headers: { host: "catalogo.tonartstudio.com.br" },
    query: { path: "api/catalog" },
    url: "/api/catalogo-proxy?path=api/catalog",
  }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body, "Not found");
});

test("promotion proxy is authenticated and exact-route-only", async () => {
  const url="https://tonartstudio.com.br/catalogo-api/api/admin/promotions/blackfriday";
  const authorization="Bearer "+"a".repeat(100);
  let called=0;
  const fetcher=async (target,options)=>{
    called++;
    assert.equal(String(target),"https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/admin/promotions/blackfriday");
    assert.equal(options.headers.get("authorization"),authorization);
    assert.equal(options.headers.get("cookie"),null);
    return new Response(JSON.stringify({saved:true}),{headers:{"content-type":"application/json","cache-control":"public,max-age=600"}});
  };
  assert.equal((await proxyTelegramAdminRequest(new Request(url),fetcher)).status,403);
  for(const suffix of ["/other","?x=1"]){
    assert.equal((await proxyTelegramAdminRequest(new Request(url+suffix,{headers:{authorization}}),fetcher)).status,404);
  }
  assert.equal(called,0);
  const res=await proxyTelegramAdminRequest(new Request(url,{method:"POST",headers:{authorization,"content-type":"application/json"},body:JSON.stringify({action:"remove",sha256:"a".repeat(64)})}),fetcher);
  assert.equal(res.status,200);
  assert.equal(res.headers.get("cache-control"),"private, no-store");
  assert.equal(called,1);
});
