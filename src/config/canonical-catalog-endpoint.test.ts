import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import legacy from "../../vercel.json";
import {
  CANONICAL_CATALOG_PROXY_PATH,
  resolveCanonicalCatalogApiBase,
} from "./canonical-catalog-endpoint";

const pagesFunction = readFileSync(
  new URL("../../functions/catalogo-api/[[path]].js", import.meta.url),
  "utf8",
);
const pagesHeaders = readFileSync(
  new URL("../../public/_headers", import.meta.url),
  "utf8",
);

describe("Cloudflare Pages canonical public catalog", () => {
  it("uses HTTPS same-origin Pages Function for public MVP", () => {
    expect(resolveCanonicalCatalogApiBase(
      undefined,
      "https://tonecosstudio.pages.dev",
      true,
    )).toBe("https://tonecosstudio.pages.dev/catalogo-api/");
    expect(CANONICAL_CATALOG_PROXY_PATH).toBe("/catalogo-api/");
  });

  it("accepts an explicitly configured base without inferring another provider", () => {
    expect(resolveCanonicalCatalogApiBase(
      " https://catalog.example.test/api/ ",
      "https://tonecosstudio.pages.dev",
      true,
    )).toBe("https://catalog.example.test/api/");
  });

  it.each([
    [undefined, "https://tonecosstudio.pages.dev", false],
    [undefined, "http://localhost:5173", true],
    [undefined, "https://ordax.com.br", true],
    [undefined, "https://www.ordax.com.br", true],
    [undefined, "https://example.com/other", true],
    [undefined, "https://example.com?other=1", true],
    [undefined, "not-a-url", true],
    [undefined, undefined, true],
  ] as const)("fails closed without a trustworthy production origin %#", (configured, origin, prod) => {
    expect(resolveCanonicalCatalogApiBase(configured, origin, prod)).toBe("");
  });

  it("requires the existing Cloudflare Pages Service Binding and read-only transport", () => {
    expect(pagesFunction).toContain("env.CATALOG_WORKER.fetch(String(url), options)");
    expect(pagesFunction).toContain('const PUBLIC_LIST_ROUTES = new Set([');
    expect(pagesFunction).toContain('if (request.method !== "GET")');
    expect(pagesFunction).toContain('return new Response("Catalog unavailable"');
    expect(pagesFunction).not.toContain("env.DB");
    expect(pagesFunction).not.toContain("env.MEDIA");
    // Request/response behavior, including unauthorized routes, is covered by
    // scripts/cloudflare/catalog-pages-proxy.test.mjs on the same CI job.
  });

  it("keeps the first-party CSP and disables the obsolete Vercel publisher", () => {
    expect(pagesHeaders).toContain("Content-Security-Policy:");
    expect(pagesHeaders).toContain("connect-src 'self'");
    expect(pagesHeaders).toContain("img-src 'self'");
    expect(pagesHeaders).not.toContain("workers.dev");
    expect(legacy.git?.deploymentEnabled).toBe(false);
    expect(legacy).not.toHaveProperty("rewrites");
    expect(legacy).not.toHaveProperty("headers");
  });
});
