import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../../api/catalog-editorial.js";

function response() {
  return {
    code: 200, headers: {}, payload: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(value) { this.code = value; return this; },
    json(value) { this.payload = value; return this; },
  };
}

function request(overrides = {}) {
  return {
    method: "POST",
    headers: {
      origin: "https://tonartstudio.com.br",
      host: "tonartstudio.com.br",
      "content-type": "application/json",
      authorization: "Bearer test.jwt.value",
    },
    body: { edits: [{}] },
    ...overrides,
  };
}

function environment(t) {
  const before = { ...process.env };
  const previousFetch = globalThis.fetch;
  t.after(() => {
    process.env = before;
    globalThis.fetch = previousFetch;
  });
  process.env.VERCEL_ENV = "production";
  process.env.TONECOS_PUBLIC_ORIGIN = "https://tonartstudio.com.br";
  process.env.TONART_SUPABASE_PUBLISHABLE_KEY = "anon-public-test-key";
  delete process.env.TONART_CATALOG_GITHUB_APP_ID;
  delete process.env.TONART_CATALOG_GITHUB_APP_PRIVATE_KEY;
  delete process.env.TONART_CATALOG_GITHUB_INSTALLATION_ID;
}

test("GET cannot invoke backend writes", async (t) => {
  environment(t);
  globalThis.fetch = () => { throw new Error("unexpected network"); };
  const res = response();
  await handler(request({ method: "GET" }), res);
  assert.equal(res.code, 405);
  assert.equal(res.headers["Cache-Control"], "no-store");
});
test("preview and cross-origin submissions cannot call Supabase or GitHub", async (t) => {
  environment(t);
  globalThis.fetch = () => { throw new Error("unexpected network"); };
  for (const req of [
    request({ headers: { ...request().headers, origin: "https://evil.example" } }),
    request({ headers: { ...request().headers, host: "evil.example" } }),
  ]) {
    const res = response();
    await handler(req, res);
    assert.equal(res.code, 403);
  }
  process.env.VERCEL_ENV = "preview";
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 403);
});
test("missing session cannot access external APIs", async (t) => {
  environment(t);
  globalThis.fetch = () => { throw new Error("unexpected network"); };
  const res = response();
  await handler(request({ headers: { ...request().headers, authorization: "" } }), res);
  assert.equal(res.code, 401);
});
test("server rejects non-admin JWT before opening a GitHub session", async (t) => {
  environment(t);
  const called = [];
  globalThis.fetch = async (url) => {
    called.push(String(url));
    if (String(url).endsWith("/auth/v1/user")) {
      return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
    }
    if (String(url).endsWith("/rest/v1/rpc/has_role")) return Response.json(false);
    throw new Error("unexpected GitHub call");
  };
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 403);
  assert.equal(res.payload.error, "editorial_admin_required");
  assert.equal(called.length, 2);
});
test("even approved admin cannot write without scoped GitHub App credentials", async (t) => {
  environment(t);
  const called = [];
  globalThis.fetch = async (url) => {
    called.push(String(url));
    if (String(url).endsWith("/auth/v1/user")) {
      return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
    }
    if (String(url).endsWith("/rest/v1/rpc/has_role")) return Response.json(true);
    throw new Error("unexpected GitHub call");
  };
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 503);
  assert.equal(res.payload.error, "editorial_backend_not_configured");
  assert.equal(called.length, 2);
});
