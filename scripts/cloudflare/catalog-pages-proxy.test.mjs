import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyCatalogRequest } from "../../functions/catalogo-api/[[path]].js";

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
    "api/models/model-one",
    "api/models/model-one/images?version=1",
  ]) {
    const io = mockFetch();
    const response = await proxyCatalogRequest(
      new Request(SITE + "/catalogo-api/" + path), io.fetcher,
    );
    assert.equal(response.status, 200);
    assert.equal(io.calls[0].url, WORKER + "/" + path);
  }
});

test("public media preserves encoded filenames and range", async () => {
  const io = mockFetch("file", 206, { "content-type": "image/webp" });
  const request = new Request(SITE + "/catalogo-api/media/images/part%20one.webp", {
    headers: { Range: "bytes=0-99" },
  });
  const response = await proxyCatalogRequest(request, io.fetcher);
  assert.equal(response.status, 206);
  assert.equal(io.calls[0].url, WORKER + "/media/images/part%20one.webp");
  assert.equal(io.calls[0].options.headers.get("Range"), "bytes=0-99");
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

test("oversized request is rejected before contacting Worker", async () => {
  const io = mockFetch();
  const request = new Request(
    SITE + "/catalogo-api/api/catalog?q=" + "a".repeat(4100),
  );
  const response = await proxyCatalogRequest(request, io.fetcher);
  assert.equal(response.status, 404);
  assert.equal(io.calls.length, 0);
});
