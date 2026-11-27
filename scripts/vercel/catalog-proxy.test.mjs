import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import handler from "../../api/catalogo-proxy.js";
import { isAllowedStandaloneTelegramRoute } from "../../api/catalogo-proxy.js";
import { proxyCatalogRequest } from "../../functions/catalogo-api/[[path]].js";
import { approvedPublicMediaPaths, isRestrictedCatalogMediaPath, validatePublicRenderApprovals } from "../security/catalog-public-media-approval-policy.mjs";

function responseSink() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: null,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(value = "") {
      this.body = value;
    },
  };
}

test("digital-render release register denies everything until rights are explicitly approved", () => {
  assert.equal(approvedPublicMediaPaths.size, 0);
  const modelId = "mdl_1234567890abcdef1234";
  const key = "media/" + modelId + "/img_0123456789abcdef/card.webp";
  const valid = {
    modelId,
    slug: "escultura-original",
    coverStorageKey: key,
    provenance: "tonart-original-render",
    sourceFileRef: "drive:1234567890abcdefghijklmnopqr",
    sourceSha256: "a".repeat(64),
    rightsEvidenceRef: "drive:0987654321abcdefghijklmnopqr",
    rightsHolder: "TONART Studio",
    creatorCredit: "Escultor responsável",
    publicationScope: "tonartstudio.com.br",
    ownerApproved: true,
    approvedOn: "2026-11-08",
  };
  const restricted = { confirmed: [] };
  const approved = validatePublicRenderApprovals({ version: 1, approved: [valid] }, restricted);
  assert.deepEqual([...approved], [key]);
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [valid, valid] }, restricted),
    /duplicate_public_render_approval/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [{ ...valid, ownerApproved: false }] }, restricted),
    /invalid_public_render_approval_entry/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [{ ...valid, rightsEvidenceRef: "" }] }, restricted),
    /invalid_public_render_approval_entry/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [{ ...valid, rightsEvidenceRef: valid.sourceFileRef }] }, restricted),
    /invalid_public_render_approval_entry/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [{ ...valid, sourceSha256: "" }] }, restricted),
    /invalid_public_render_approval_entry/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [valid] }, {
      confirmed: [{ modelId, replacement: { status: "pending_authorized_clean_photo", approvedImageStorageKey: null } }],
    }),
    /specialstl_media_still_quarantined/,
  );
  assert.throws(
    () => validatePublicRenderApprovals({ version: 1, approved: [{ ...valid, coverStorageKey: "media/" + modelId + "/img_0123456789abcdef/specialstl/card.webp" }] }, restricted),
    /invalid_public_render_approval_entry/,
  );
});

test("exact quarantine survives encoded model IDs and branding without hiding ordinary media", () => {
  const held = "mdl_ae8d28d2fa93b1367b0a";
  assert.equal(isRestrictedCatalogMediaPath("media/" + held + "/image/card.webp"), true);
  assert.equal(isRestrictedCatalogMediaPath("media/%6ddl_ae8d28d2fa93b1367b0a/image/card.webp"), true);
  assert.equal(isRestrictedCatalogMediaPath("media/models/%73pecialstl.com/cover.webp"), true);
  assert.equal(isRestrictedCatalogMediaPath("media/%256ddl_ae8d28d2fa93b1367b0a/image/card.webp"), true);
  assert.equal(isRestrictedCatalogMediaPath("media/models/%2Fprivate.webp"), true);
  assert.equal(isRestrictedCatalogMediaPath("media/models/normal/card.webp"), false);
  assert.equal(isRestrictedCatalogMediaPath("media/models/figure%20one.webp"), false);
});

test("Vercel catalog proxy refuses confirmed SpecialSTL media and writes before an upstream read", async () => {
  const initialFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    throw new Error("unexpected upstream call");
  };
  try {
    const media = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=media%2Fmdl_ae8d28d2fa93b1367b0a%2Fcard.webp",
      query: { path: "media/mdl_ae8d28d2fa93b1367b0a/card.webp" },
      headers: {},
    }, media);
    assert.equal(media.statusCode, 404);
    assert.equal(attempts, 0);

    const write = responseSink();
    await handler({
      method: "POST",
      url: "/api/catalogo-proxy?path=api%2Fcatalog",
      query: { path: "api/catalog" },
      headers: {},
    }, write);
    assert.equal(write.statusCode, 405);
    assert.equal(attempts, 0);

    const traversal = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2F..%2Fcatalog",
      query: { path: "api/../catalog" },
      headers: {},
    }, traversal);
    assert.equal(traversal.statusCode, 404);
    assert.equal(attempts, 0);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("Vercel proxy serves a normal catalog image without a publication allowlist", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response("normal-image", {
      status: 200, headers: { "content-type": "image/webp" },
    });
  };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=media%2Fmdl-ordinary%2Fimage%2Fcard.webp",
      query: { path: "media/mdl-ordinary/image/card.webp" },
      headers: { accept: "image/webp" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0], "https://tonecos-catalogo-api.tonecosstudio.workers.dev/media/mdl-ordinary/image/card.webp");
    assert.equal(res.body.toString(), "normal-image");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel forwards one-byte media range only through canonical GET and returns validated 206", async () => {
  const initialFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(new Uint8Array([0x52]), {
      status: 206,
      headers: { "Content-Type": "image/webp", "Content-Range": "bytes 0-0/200" },
    });
  };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=media%2Fmdl-ordinary%2Fimage%2Fcard.webp",
      query: { path: "media/mdl-ordinary/image/card.webp" },
      headers: { range: "bytes=0-0", cookie: "session=never-forward" },
    }, res);
    assert.equal(res.statusCode, 206);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.get("Range"), "bytes=0-0");
    assert.equal(calls[0].init.headers.get("Cookie"), null);
    assert.equal(res.headers.get("content-range"), "bytes 0-0/200");
    assert.equal(res.body.byteLength, 1);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("Vercel cancels the upstream body if a one-byte range request is ignored", async () => {
  const initialFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("entire-image-must-not-reach-browser", {
      status: 200, headers: { "Content-Type": "image/webp" },
    });
  };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=media%2Fmdl-ordinary%2Fimage%2Fcard.webp",
      query: { path: "media/mdl-ordinary/image/card.webp" },
      headers: { range: "bytes=0-0" },
    }, res);
    assert.equal(calls, 1);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.toString(), "Upstream media range ignored");
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("Vercel refuses malformed/multiple media ranges without upstream reads", async () => {
  const initialFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("unexpected upstream read"); };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=media%2Fmdl-ordinary%2Fimage%2Fcard.webp",
      query: { path: "media/mdl-ordinary/image/card.webp" },
      headers: { range: "bytes=0-1,2-3" },
    }, res);
    assert.equal(res.statusCode, 416);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("Vercel catalog proxy forwards only a bounded read through the canonical proxy", async () => {
  const initialFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ items: [], nextCursor: null }, {
      headers: { "Cache-Control": "public, max-age=60", "Set-Cookie": "secret=should-not-forward" },
    });
  };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2Fcatalog&limit=12",
      query: {
        path: "api/catalog",
        limit: "12",
        _vercel_share: "preview-token",
      },
      headers: { accept: "application/json", cookie: "private=should-not-forward", range: "bytes=0-0" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url,
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/catalog?limit=12");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.get("Accept"), "application/json");
    assert.equal(calls[0].init.headers.get("cookie"), null);
    assert.equal(calls[0].init.headers.get("range"), null);
    assert.equal(res.headers.has("set-cookie"), false);
    assert.match(String(res.body), /"items":\[\]/);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("Vercel proxy builds the public query from request.query after a rewrite", async () => {
  const initialFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return Response.json({ items: [] }, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  };
  try {
    const categories = responseSink();
    await handler({
      method: "GET",
      // Runtime/rewrite transport metadata in req.url is not a client query.
      url: "/api/catalogo-proxy?path=api%2Fcategories&_vercel_share=preview-token",
      query: { path: "api/categories", _vercel_share: "preview-token" },
      headers: { accept: "application/json" },
    }, categories);
    assert.equal(categories.statusCode, 200);
    assert.equal(
      calls[0],
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/categories",
    );

    const catalog = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2Fcatalog&_vercel_share=preview-token",
      query: { path: "api/catalog", limit: "12" },
      headers: { accept: "application/json" },
    }, catalog);
    assert.equal(catalog.statusCode, 200);
    assert.equal(
      calls[1],
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/catalog?limit=12",
    );

    const duplicate = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2Fcatalog",
      query: { path: "api/catalog", limit: ["12", "12"] },
      headers: { accept: "application/json" },
    }, duplicate);
    assert.equal(duplicate.statusCode, 400);
    assert.equal(calls.length, 2);

    const unknown = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2Fcategories",
      query: { path: "api/categories", offset: "0" },
      headers: { accept: "application/json" },
    }, unknown);
    assert.equal(unknown.statusCode, 400);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("canonical proxy rejects unknown, duplicate and cache-busting D1 queries without upstream reads", async () => {
  let upstream = 0;
  const fetcher = async () => { upstream++; return Response.json({ items: [] }); };
  const invalid = [
    "/api/catalog?limit=12&utm_source=bot",
    "/api/catalog?limit=12&limit=12",
    "/api/catalog?limit=000012",
    "/api/catalog?limit=61",
    "/api/catalog?character_id=ab",
    "/api/catalog?character_id=bad%20id",
    "/api/catalog?character_id=" + "x".repeat(101),
    "/api/catalog?character_id=char_a&character_id=char_b",
    "/api/catalog?character_id=char_a&attribute_id=attr_b",
    "/api/telegram-studios?character_id=char_a",
    "/api/telegram-studios?franchise=bleach&character=Yoruichi",
    "/api/telegram-studios?franchise=bleach&attribute_id=attr_a&character_id=char_b",
    "/api/recent?character_id=char_a",
    "/api/catalog?cursor=invalid%25cursor",
    "/api/catalog?q=ab",
    "/api/catalog?q=" + "x".repeat(121),
    "/api/catalog?material=" + "x".repeat(121),
    "/api/recent?cursor=Ng%3D%3D",
    "/api/recent?limit=25",
    "/api/categories?offset=0",
    "/api/franchises?category=filmes&limit=49",
    "/api/folders?category=filmes&franchise=classicos&parent=..",
    "/api/models/modelo-test?noCache=1",
    "/api/models/modelo-test/images?limit=6&v=1&cursor=wrong%25",
    "/media/mdl-ordinary/image/card.webp?cache_bust=random",
  ];
  for (const path of invalid) {
    const response = await proxyCatalogRequest(
      new Request("https://tonartstudio.com.br/catalogo-api" + path),
      fetcher,
    );
    assert.equal(response.status, 400, path);
    assert.equal(response.headers.get("cache-control"), "no-store", path);
  }
  assert.equal(upstream, 0);
});

test("canonical proxy preserves real catalog, folder and padded gallery cursors", async () => {
  const paths = [
    "/api/catalog?limit=12",
    "/api/catalog?category=animes-desenhos&franchise=bleach&character_id=char_bleach_yoruichi&limit=6",
    "/api/catalog?attribute_id=attr_publisher_marvel&limit=6",
    "/api/telegram-studios?franchise=bleach&character_id=char_bleach_yoruichi",
    "/api/telegram-studios?franchise=bleach&attribute_id=attr_publisher_marvel",
    "/api/catalog?category=filmes&franchise=classicos&folder=colecao%2Fpersonagens&limit=12",
    "/api/catalog?category=all&q=Boneco%20Raro&limit=12",
    "/api/catalog?material=Resina&collection=Especial&minHeight=10&maxHeight=120",
    "/api/categories",
    "/api/franchises?category=filmes&q=Boneco&limit=24",
    "/api/folders?category=filmes&franchise=classicos&parent=colecao%2Fpersonagens",
    "/api/recent?limit=12",
    "/api/models/modelo-test",
    "/api/models/modelo-test/images?limit=6&v=1&cursor=Ng%3D%3D",
    "/api/catalog?limit=12&cursor=eyJuYW1lIjoiQm9uZWNvIiwiaWQiOiJtb2RlbG8ifQ",
  ];
  const upstreamPaths = [];
  const fetcher = async (url) => {
    upstreamPaths.push(url.pathname + url.search);
    return Response.json({ items: [] }, { headers: { "Cache-Control": "public, max-age=30" } });
  };
  for (const path of paths) {
    const response = await proxyCatalogRequest(
      new Request("https://tonartstudio.com.br/catalogo-api" + path),
      fetcher,
    );
    assert.equal(response.status, 200, path);
  }
  assert.deepEqual(upstreamPaths, paths);
});

test("Vercel CDN caches only successful public catalog JSON for five minutes", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return Response.json({ items: [], nextCursor: null }, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=30, s-maxage=120" },
    });
  };
  try {
    for (const path of [
      "api/catalog", "api/recent", "api/models/modelo-exemplo",
      "api/models/modelo-exemplo/images",
    ]) {
      const res = responseSink();
      const query = new URLSearchParams({ path });
      await handler({
        method: "GET", url: "/api/catalogo-proxy?" + query,
        query: { path }, headers: { accept: "application/json" },
      }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers.get("vercel-cdn-cache-control"), "public, s-maxage=300");
      assert.equal(res.headers.get("cache-control"), "public, max-age=30, s-maxage=120");
      assert.equal(res.headers.has("set-cookie"), false);
    }
    assert.equal(requests.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel caches only anonymous Telegram metadata (60s models, 300s studios)", async () => {
 const originalFetch = globalThis.fetch;
 let response = Response.json({items: [], total: 0}, {
   headers: {"Cache-Control": "public, max-age=0, s-maxage=60"},
 });
 globalThis.fetch = async () => response.clone();
 try {
   for (const path of ["api/telegram-studios", "api/telegram-studios/studios"]) {
     const res = responseSink();
     await handler({
       method: "GET", url: "/api/catalogo-proxy?path=" + encodeURIComponent(path),
       query: {path}, headers: {host:"catalogo.tonartstudio.com.br",accept:"application/json"},
     },res);
     assert.equal(res.statusCode,200,path);
     assert.equal(res.headers.get("vercel-cdn-cache-control"),
       path.endsWith("/studios") ? "public, s-maxage=300" : "public, s-maxage=60",path);
   }
   for (const entry of [
     {path:"api/telegram-studios/"+TELEGRAM_ID, cache:"public, max-age=0, s-maxage=60"},
     {path:"api/telegram-studios/"+TELEGRAM_ID+"/media/"+"a".repeat(64)+"/thumb", cache:"public, max-age=0, s-maxage=60"},
     {path:"api/telegram-studios", cookie:"session=private"},
     {path:"api/telegram-studios", authorization:"Bearer private"},
     {path:"api/telegram-studios", bad:true},
   ]) {
     response=entry.bad?Response.json({error:"unavailable"},{status:503,headers:{"Cache-Control":"public, max-age=0, s-maxage=60"}}):
       Response.json({items:[]},{headers:{"Cache-Control":entry.cache || "public, max-age=0, s-maxage=60"}});
     const res=responseSink();
     await handler({
       method:"GET",url:"/api/catalogo-proxy?path="+encodeURIComponent(entry.path),
       query:{path:entry.path},
       headers:{host:"catalogo.tonartstudio.com.br",accept:"application/json",
         ...(entry.cookie?{cookie:entry.cookie}:{}),
         ...(entry.authorization?{authorization:entry.authorization}:{})},
     },res);
     assert.equal(res.headers.has("vercel-cdn-cache-control"),false,entry.path);
   }
 }finally{globalThis.fetch=originalFetch;}
});

test("Vercel never extends CDN cache for errors, private payloads, media or Authorization", async () => {
  const originalFetch = globalThis.fetch;
  let reply = Response.json({ items: [] }, {
    headers: { "Cache-Control": "no-store" },
  });
  globalThis.fetch = async () => reply;
  try {
    const scenarios = [
      { path: "api/catalog", reply: Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } }) },
      { path: "api/catalog", reply: Response.json({ error: "down" }, { status: 503, headers: { "Cache-Control": "public, max-age=120" } }) },
      { path: "api/catalog", reply: new Response("private", { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=120" } }) },
      { path: "media/mdl-ordinary/image/card.webp", reply: new Response("image", { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, s-maxage=604800" } }) },
      { path: "api/catalog", reply: Response.json({ items: [] }, { headers: { "Cache-Control": "public, max-age=60" } }), auth: true },
    ];
    for (const item of scenarios) {
      reply = item.reply;
      const res = responseSink();
      const query = new URLSearchParams({ path: item.path });
      await handler({
        method: "GET", url: "/api/catalogo-proxy?" + query,
        query: { path: item.path },
        headers: { accept: item.path.startsWith("media/") ? "image/webp" : "application/json",
          ...(item.auth ? { authorization: "Bearer secret-not-forwarded" } : {}) },
      }, res);
      assert.equal(res.headers.has("vercel-cdn-cache-control"), false, item.path);
      if (res.statusCode >= 400) assert.equal(res.headers.get("cache-control"), "no-store");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public catalog build keeps read-only gates without requiring blanket image hiding", () => {
  const script = fileURLToPath(new URL("../security/assert-catalog-mvp-build.mjs", import.meta.url));
  const run = (env) => spawnSync(process.execPath, [script], { env, encoding: "utf8" });
  const base = { VITE_PUBLIC_CATALOG_MVP: "true", VITE_PREVIEW_READ_ONLY: "true" };
  for (const value of [undefined, "", "false", "true"]) {
    const env = { ...base };
    if (value !== undefined) env.VITE_TONART_HIDE_CATALOG_MEDIA = value;
    const result = run(env);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(run({ VITE_PUBLIC_CATALOG_MVP: "false" }).status, 0);
  assert.equal(run({ ...base, VITE_PREVIEW_READ_ONLY: "false" }).status, 1);
});


const TELEGRAM_ID = "tg_04e28eadb6e1811af4f37845";
const TELEGRAM_PATH = "api/admin/telegram-drafts";
const TELEGRAM_AUTH = "Bearer " + "a".repeat(100);

test("Vercel sends authenticated Telegram draft GET to the existing Worker with private cache only", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ total: 8, items: [{ id: TELEGRAM_ID, name: "Monica Rambeau" }] }, {
      headers: { "Cache-Control": "public, max-age=600", "Set-Cookie": "unsafe=1" },
    });
  };
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=api%2Fadmin%2Ftelegram-drafts",
      query: { path: TELEGRAM_PATH, studio: "Abe3D" },
      headers: { authorization: TELEGRAM_AUTH, cookie: "private=not-forwarded" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body.toString()).total, 8);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url,
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/admin/telegram-drafts?studio=Abe3D");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.get("authorization"), TELEGRAM_AUTH);
    assert.equal(calls[0].init.headers.has("cookie"), false);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(res.headers.get("vercel-cdn-cache-control"), "private, no-store");
    assert.equal(res.headers.has("set-cookie"), false);
  } finally {
    globalThis.fetch = original;
  }
});

test("Vercel forwards parsed Telegram edit and import only with admin bearer and no public writes", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ id: TELEGRAM_ID, revision: 1, published: false }, {
      status: init.method === "POST" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  };
  try {
    const patch = responseSink();
    const edit = {
      revision: 0, name: "Monica Rambeau corrigida", studio: "Abe3D",
      character: "Monica Rambeau", variant: "", reviewStatus: "reviewing",
      imageOrder: [21448, 21449, 21450, 21451],
    };
    await handler({
      method: "PATCH",
      url: "/api/catalogo-proxy?path=api%2Fadmin%2Ftelegram-drafts%2F" + TELEGRAM_ID,
      query: { path: TELEGRAM_PATH + "/" + TELEGRAM_ID },
      headers: { authorization: TELEGRAM_AUTH, "content-type": "application/json" },
      body: edit,
    }, patch);
    assert.equal(patch.statusCode, 200);
    assert.equal(calls[0].init.method, "PATCH");
    assert.deepEqual(JSON.parse(calls[0].init.body), edit);

    const importBody = {
      originId: "2370335738", studio: "Abe3D", groupKey: "b2b99222c387716d35aba4c3",
      name: "Bowsette", universe: "Super Mario", variant: "", franchiseId: 197,
      images: [{ messageId: 17278, sha256: "1".repeat(64) }],
    };
    const ingest = responseSink();
    await handler({
      method: "POST",
      url: "/api/catalogo-proxy?path=api%2Fadmin%2Ftelegram-drafts%2Fimport",
      query: { path: TELEGRAM_PATH + "/import" },
      headers: { authorization: TELEGRAM_AUTH, "content-type": "application/json" },
      body: importBody,
    }, ingest);
    assert.equal(ingest.statusCode, 201);
    assert.equal(calls[1].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[1].init.body), importBody);

    const denied = responseSink();
    await handler({
      method: "POST",
      url: "/api/catalogo-proxy?path=api%2Fadmin%2Ftelegram-drafts%2Fimport",
      query: { path: TELEGRAM_PATH + "/import" },
      headers: { "content-type": "application/json" },
      body: importBody,
    }, denied);
    assert.equal(denied.statusCode, 403);
    assert.equal(calls.length, 2);

    const publicWrite = responseSink();
    await handler({
      method: "POST", url: "/api/catalogo-proxy?path=api%2Fcatalog",
      query: { path: "api/catalog" }, headers: { authorization: TELEGRAM_AUTH },
    }, publicWrite);
    assert.equal(publicWrite.statusCode, 405);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("Vercel private Telegram WebP response remains non-cacheable and strips upstream cookies", async () => {
  const original = globalThis.fetch;
  const sha = "3c7f50718e6cab3787df0443404f01a9b5e5976036a542c13daff9e51e4884e7";
  const path = TELEGRAM_PATH + "/" + TELEGRAM_ID + "/media/" + sha + "/thumb";
  globalThis.fetch = async () => new Response(new Uint8Array([0x52,0x49,0x46,0x46]), {
    headers: { "Content-Type": "image/webp", "Set-Cookie": "private=leak" },
  });
  try {
    const res = responseSink();
    await handler({
      method: "GET",
      url: "/api/catalogo-proxy?path=" + encodeURIComponent(path),
      query: { path }, headers: { authorization: TELEGRAM_AUTH, accept: "image/webp" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers.get("content-type"), "image/webp");
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(res.headers.get("vercel-cdn-cache-control"), "private, no-store");
    assert.equal(res.headers.has("set-cookie"), false);
    assert.equal(res.body.length, 4);
  } finally {
    globalThis.fetch = original;
  }
});


test("the Telegram-only Vercel host rejects commercial browser routes without changing the commercial site", async () => {
  const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.rewrites.length, 3);
  const [rule, apiRewrite, spaFallback] = config.rewrites;
  assert.equal(apiRewrite.source, "/catalogo-api/:path*");
  assert.equal(spaFallback.destination, "/index.html");
  assert.equal(rule.destination, "/api/catalogo-proxy?path=api/catalog");
  const pathMatch = rule.source.match(/^\/:blocked\(([^)]+)\)$/);
  assert.ok(pathMatch, "commercial path blocklist must be one explicit route matcher");
  const blocked = new RegExp("^(?:" + pathMatch[1] + ")$");
  for (const route of ["login", "cadastro", "registrar", "conta", "minha-conta", "solicitar-orcamento", "orcamentos", "carrinho", "checkout", "admin"]) {
    assert.equal(blocked.test(route), true, route);
  }
  for (const route of ["", "galeria", "modelos", "telegram-studios", "api", "index.html"]) {
    assert.equal(blocked.test(route), false, route);
  }
  assert.equal(rule.has.length, 1);
  assert.equal(rule.has[0].type, "host");
  const hostMatch = new RegExp("^(?:" + rule.has[0].value + ")$");
  for (const hostname of [
    "catalogo.tonartstudio.com.br",
    "tonart-catalogo-publico.vercel.app",
    "tonart-catalogo-publico-krym10bza-jogo-brasils-projects.vercel.app",
  ]) {
    assert.equal(hostMatch.test(hostname), true, hostname);
  }
  for (const hostname of [
    "tonartstudio.com.br",
    "www.tonartstudio.com.br",
    "tonart-studio-public.vercel.app",
    "example.com",
  ]) {
    assert.equal(hostMatch.test(hostname), false, hostname);
  }
  const res = responseSink();
  await handler({
    method: "GET",
    url: "/api/catalogo-proxy?path=api/catalog",
    query: { path: "api/catalog" },
    headers: { host: "catalogo.tonartstudio.com.br" },
  }, res);
  assert.equal(res.statusCode, 404);
});

test("standalone public catalog never proxies the promotion administration route", async () => {
  const path="api/admin/promotions/blackfriday";
  for(const method of ["GET","POST"]){
    assert.equal(isAllowedStandaloneTelegramRoute("catalogo.tonartstudio.com.br",path,method),false);
  }
});
