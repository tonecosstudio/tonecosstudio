import assert from "node:assert/strict";
import { test } from "node:test";
import { onRequest, proxyCatalogRequest } from "../../functions/catalogo-api/[[path]].js";

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
    "api/editorial/v1/characters/raven",
    "api/editorial/v1/characters/search?q=raven&limit=12",
    "api/editorial/v1/universes/comics/titans",
    "api/editorial/v1/models/mdl_0033cf3a5cb64ab103fd/characters",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.equal(response.status, 200);
    assert.equal(io.calls[0].url, WORKER + "/" + path);
  }
});

test("editorial proxy rejects missing, oversized and unknown search parameters before Worker reads", async () => {
  const invalid = [
    "api/editorial/v1/characters/search",
    "api/editorial/v1/characters/search?limit=12",
    "api/editorial/v1/characters/search?q=ra",
    "api/editorial/v1/characters/search?q=raven&limit=13",
    "api/editorial/v1/characters/search?q=raven&q=raven",
    "api/editorial/v1/characters/raven?locale=pt-BR",
    "api/editorial/v1/universes/comics/titans?cacheBust=1",
    "api/editorial/v1/models/mdl_0033cf3a5cb64ab103fd/characters?limit=12",
    "api/editorial/v1/characters/unknown/extra",
  ];
  for (const path of invalid) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.ok([400, 404].includes(response.status), path);
    assert.equal(io.calls.length, 0, path);
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
