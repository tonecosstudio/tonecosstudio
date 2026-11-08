import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import handler from "../../api/catalogo-proxy.js";
import { approvedPublicMediaPaths, validatePublicRenderApprovals } from "../security/catalog-public-media-approval-policy.mjs";

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

test("Vercel catalog proxy refuses media and writes before an upstream read", async () => {
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
      url: "/api/catalogo-proxy?path=media%2Fmodels%2Fcard.webp",
      query: { path: "media/models/card.webp" },
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
      query: { path: "api/catalog" },
      headers: { accept: "application/json", cookie: "private=should-not-forward" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url,
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/catalog?limit=12");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.get("Accept"), "application/json");
    assert.equal(calls[0].init.headers.get("cookie"), null);
    assert.equal(res.headers.has("set-cookie"), false);
    assert.match(String(res.body), /"items":\[\]/);
  } finally {
    globalThis.fetch = initialFetch;
  }
});

test("public catalog build fails closed if photo-review hold is absent or disabled", () => {
  const script = fileURLToPath(new URL("../security/assert-catalog-mvp-build.mjs", import.meta.url));
  const run = (env) => spawnSync(process.execPath, [script], { env, encoding: "utf8" });
  const base = { VITE_PUBLIC_CATALOG_MVP: "true", VITE_PREVIEW_READ_ONLY: "true" };

  for (const value of [undefined, "", "false", "TRUE"]) {
    const env = { ...base };
    if (value !== undefined) env.VITE_TONART_HIDE_CATALOG_MEDIA = value;
    const result = run(env);
    assert.equal(result.status, 1, "unapproved media setting " + String(value));
    assert.match(result.stderr, /VITE_TONART_HIDE_CATALOG_MEDIA=true/);
  }

  const approvedConfiguration = run({ ...base, VITE_TONART_HIDE_CATALOG_MEDIA: "true" });
  assert.equal(approvedConfiguration.status, 0, approvedConfiguration.stderr);

  const privateMode = run({ VITE_PUBLIC_CATALOG_MVP: "false" });
  assert.equal(privateMode.status, 0, privateMode.stderr);

  const unsafeReadOnly = run({
    ...base, VITE_PREVIEW_READ_ONLY: "false", VITE_TONART_HIDE_CATALOG_MEDIA: "true",
  });
  assert.equal(unsafeReadOnly.status, 1);
  assert.match(unsafeReadOnly.stderr, /VITE_PREVIEW_READ_ONLY=true/);
});
