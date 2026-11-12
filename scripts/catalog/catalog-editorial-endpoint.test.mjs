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

test("authorized submission edits original contract in one reviewed GitHub PR", async (t) => {
  environment(t);
  const { generateKeyPairSync } = await import("node:crypto");
  const pem = generateKeyPairSync("rsa", { modulusLength: 2048 })
    .privateKey.export({ type: "pkcs8", format: "pem" });
  process.env.TONART_CATALOG_GITHUB_APP_ID = "111";
  process.env.TONART_CATALOG_GITHUB_INSTALLATION_ID = "222";
  process.env.TONART_CATALOG_GITHUB_APP_PRIVATE_KEY = pem;
  const id = "mdl_aaaaaaaaaaaaaaaaaaaa";
  const model = {
    id, slug: "espresso", code: "ESP01",
    displayName: "Espresso", variantName: "Pequeno",
    categoryName: "Bebidas", categorySlug: "bebidas",
    franchiseName: "Cafe", franchiseSlug: "cafe",
    folderPathKey: "menu", published: 1,
  };
  const lines = Object.entries(model).map(([key, value]) =>
    "      " + JSON.stringify(key) + ": " + JSON.stringify(value));
  const source = '{\n  "version": 1,\n  "source": {"productionModels":1,"publishedModels":1},\n' +
    '  "models": [\n    {\n' + lines.join(",\n") + '\n    }\n  ]\n}';
  const sha = "a".repeat(40);
  const actions = [];
  globalThis.fetch = async (input, options = {}) => {
    const u = new URL(input);
    actions.push({ path: u.pathname, method: options.method ?? "GET" });
    if (u.pathname.endsWith("/auth/v1/user")) {
      return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
    }
    if (u.pathname.endsWith("/rest/v1/rpc/has_role")) return Response.json(true);
    if (u.pathname === "/app/installations/222/access_tokens") {
      assert.equal(options.method, "POST");
      return Response.json({ token: "ghs_test" });
    }
    if (u.pathname.endsWith("/git/ref/heads/main")) {
      return Response.json({ object: { sha: "b".repeat(40) } });
    }
    if (u.pathname.endsWith("/pulls") && options.method === "GET") {
      return Response.json([]);
    }
    if (u.pathname.endsWith("/git/ref/heads/editorial/tonart-admin-review")) {
      return Response.json({ message: "Not Found" }, { status: 404 });
    }
    if (u.pathname.endsWith("/contents/config/catalog-production-model-contract.json") &&
        options.method === "GET") {
      return Response.json({ sha, size: Buffer.byteLength(source) });
    }
    if (u.pathname.endsWith("/git/blobs/" + sha)) {
      return Response.json({ encoding: "base64", content: Buffer.from(source).toString("base64") });
    }
    if (u.pathname.endsWith("/git/refs") && options.method === "POST") {
      assert.equal(JSON.parse(options.body).sha, "b".repeat(40));
      return Response.json({ ref: "refs/heads/editorial/tonart-admin-review" }, { status: 201 });
    }
    if (u.pathname.endsWith("/contents/config/catalog-production-model-contract.json") &&
        options.method === "PUT") {
      const submitted = JSON.parse(options.body);
      assert.equal(submitted.branch, "editorial/tonart-admin-review");
      assert.equal(submitted.sha, sha);
      const updated = JSON.parse(Buffer.from(submitted.content, "base64").toString("utf8"));
      assert.equal(updated.models[0].displayName, "Espresso Especial");
      return Response.json({ content: { sha: "c".repeat(40) } });
    }
    if (u.pathname.endsWith("/pulls") && options.method === "POST") {
      assert.equal(JSON.parse(options.body).base, "main");
      return Response.json({
        html_url: "https://github.com/washingtonmsdj/catalogo/pull/270",
      }, { status: 201 });
    }
    throw new Error("Unexpected endpoint " + u.pathname);
  };
  const res = response();
  await handler(request({
    body: { edits: [{
      id, slug: "espresso", code: "ESP01", name: "Espresso",
      variantName: "Pequeno", category: "Bebidas", franchise: "Cafe",
      newName: "Espresso Especial", newVariant: "",
    }] },
  }), res);
  assert.equal(res.code, 202);
  assert.equal(res.payload.state, "awaiting_review");
  assert.equal(res.payload.receipt, "https://github.com/washingtonmsdj/catalogo/pull/270");
  assert.equal(actions.filter((x) => x.method === "PUT").length, 1);
  assert.equal(actions.filter((x) => x.method === "POST" &&
    x.path.endsWith("/pulls")).length, 1);
});
