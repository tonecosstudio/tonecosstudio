import assert from "node:assert/strict";
import test from "node:test";
import { applyIndexHold, PUBLIC_STATIC_PATHS, renderRobots, renderSitemap, resolveIndexingRelease } from "./generate-public-index.mjs";

const production = {
  CF_PAGES: "1", CF_PAGES_BRANCH: "main",
  VITE_PUBLIC_CATALOG_MVP: "true", VITE_PREVIEW_READ_ONLY: "true",
  TONECOS_PUBLIC_INDEXING_RELEASE: "true",
  TONECOS_PUBLIC_ORIGIN: "https://tonecosstudio.pages.dev",
};

test("preview and production default to noindex without explicit release", () => {
  for (const env of [{}, { ...production, TONECOS_PUBLIC_INDEXING_RELEASE: undefined },
    { ...production, CF_PAGES_BRANCH: "integration/tonecosstudio-canonical-20261101", TONECOS_PUBLIC_INDEXING_RELEASE: undefined }]) {
    const mode = resolveIndexingRelease(env);
    assert.equal(mode.enabled, false);
    assert.match(renderRobots(mode), /Disallow: \/$/m);
    assert.doesNotMatch(renderRobots(mode), /Sitemap:/);
  }
});

test("index hold is idempotent and never duplicates a meta tag", () => {
  const html = '<!doctype html><html><head><title>Tonecos</title></head><body></body></html>';
  const blocked = applyIndexHold(html);
  assert.equal(blocked.match(/name="robots"/g)?.length, 1);
  assert.equal(applyIndexHold(blocked), blocked);
  assert.match(blocked, /noindex,nofollow/);
  assert.throws(() => applyIndexHold('<html><body></body></html>'), /Missing HTML head/);
  assert.throws(() => applyIndexHold('<head><meta name="robots" content="index,follow"></head>'), /Unexpected/);
});

test("only approved Pages main readonly with exact Tonecos origin can release indexing", () => {
  const mode = resolveIndexingRelease(production);
  assert.deepEqual(mode, { enabled: true, origin: "https://tonecosstudio.pages.dev" });
  assert.match(renderRobots(mode), /^Allow: \/$/m);
  assert.match(renderRobots(mode), /Sitemap: https:\/\/tonecosstudio.pages.dev\/sitemap.xml/);
  for (const changed of [
    { CF_PAGES: undefined },
    { CF_PAGES_BRANCH: "integration/tonecosstudio-canonical-20261101" },
    { VITE_PUBLIC_CATALOG_MVP: "false" },
    { VITE_PREVIEW_READ_ONLY: "false" },
    { TONECOS_PUBLIC_ORIGIN: "https://ordax.com.br" },
    { TONECOS_PUBLIC_ORIGIN: "https://tonecosstudio.pages.dev.evil.test" },
    { TONECOS_PUBLIC_ORIGIN: "http://tonecosstudio.pages.dev" },
    { TONECOS_PUBLIC_ORIGIN: "https://tonecosstudio.pages.dev/login" },
    { TONECOS_PUBLIC_ORIGIN: "https://someone@tonecosstudio.pages.dev" },
    { TONECOS_PUBLIC_ORIGIN: "https://tonecosstudio.pages.dev/?debug=1" },
    { TONECOS_PUBLIC_ORIGIN: undefined },
  ]) {
    assert.throws(() => resolveIndexingRelease({ ...production, ...changed }), JSON.stringify(changed));
  }
  assert.throws(() => resolveIndexingRelease({
    ...production, TONECOS_PUBLIC_INDEXING_RELEASE: "yes",
  }), /Invalid public indexing/);
});

test("sitemap covers only static catalog and informational routes without querying D1", () => {
  const mode = resolveIndexingRelease(production);
  const sitemap = renderSitemap(mode.origin);
  assert.equal((sitemap.match(/<url>/g)||[]).length, PUBLIC_STATIC_PATHS.length);
  for (const route of PUBLIC_STATIC_PATHS) {
    assert.ok(sitemap.includes('<loc>' + mode.origin + route + '</loc>'), route);
  }
  assert.doesNotMatch(sitemap, /\/login|\/admin|\/pedido|\/modelos\/[^<]/);
  assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
});
