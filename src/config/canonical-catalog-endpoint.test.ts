import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import vercelConfig from "../../vercel.json";
import {
  CANONICAL_CATALOG_PROXY_PATH,
  resolveCanonicalCatalogApiBase,
} from "./canonical-catalog-endpoint";

// Vitest runs UI tests in jsdom; import.meta.url can use an http scheme.
const pagesFunction = readFileSync(
  resolve(process.cwd(), "functions/catalogo-api/[[path]].js"),
  "utf8",
);
const pagesHeaders = readFileSync(
  resolve(process.cwd(), "public/_headers"),
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

  it("permits mock endpoints only in development", () => {
    expect(resolveCanonicalCatalogApiBase(
      " https://catalog.example.test/api/ ",
      "https://tonecosstudio.pages.dev",
      false,
    )).toBe("https://catalog.example.test/api/");
    expect(resolveCanonicalCatalogApiBase(
      undefined, "https://tonecosstudio.pages.dev", false,
    )).toBe("");
    expect(resolveCanonicalCatalogApiBase(
      undefined, "http://127.0.0.1:8080", false,
    )).toBe("http://127.0.0.1:8080/catalogo-api/");
    expect(resolveCanonicalCatalogApiBase(
      "", "http://localhost:5173", false,
    )).toBe("");
  });

  it("accepts only the exact first-party Pages endpoint in production", () => {
    const origin = "https://tonecosstudio.pages.dev";
    expect(resolveCanonicalCatalogApiBase(
      " https://tonecosstudio.pages.dev/catalogo-api/ ", origin, true,
    )).toBe("https://tonecosstudio.pages.dev/catalogo-api/");
    for (const override of [
      "https://catalog.example.test/api/",
      "https://tonecosstudio.pages.dev/api/catalog",
      "https://tonecosstudio.pages.dev/catalogo-api/?debug=1",
      "https://tonecosstudio.pages.dev/catalogo-api/#other",
      "http://tonecosstudio.pages.dev/catalogo-api/",
      "https://tonecosstudio.pages.dev.evil.test/catalogo-api/",
      "https://user:pass@tonecosstudio.pages.dev/catalogo-api/",
      "//tonecosstudio.pages.dev/catalogo-api/",
      "/catalogo-api/",
    ]) {
      expect(resolveCanonicalCatalogApiBase(override, origin, true)).toBe("");
    }
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

  it("keeps Cloudflare CSP and the Vercel site manually deployable through one read-only API", () => {
    expect(pagesHeaders).toContain("Content-Security-Policy:");
    expect(pagesHeaders).toContain("connect-src 'self'");
    expect(pagesHeaders).toContain("img-src 'self'");
    expect(pagesHeaders).not.toContain("workers.dev");
    // Domain is served by Vercel, but source pushes never auto-publish.
    expect(vercelConfig.git?.deploymentEnabled).toBe(false);
    expect(vercelConfig.rewrites[0]).toEqual({
      source: "/catalogo-api/:path*",
      destination: "/api/catalogo-proxy?path=:path*",
    });
    expect(vercelConfig.rewrites.at(-1)).toEqual({
      source: "/((?!.*\\.).*)",
      destination: "/index.html",
    });
    // Vercel may route extensionless SPA paths to index.html, but missing
    // robots/sitemap/favicon/assets must not receive HTML with HTTP 200.
    const spaRoute = new RegExp("^" + vercelConfig.rewrites.at(-1).source + "$");
    for (const route of ["/", "/login", "/conta", "/admin", "/modelos/example-model"]) {
      expect(spaRoute.test(route)).toBe(true);
    }
    for (const asset of ["/sitemap.xml", "/favicon.ico", "/robots.txt",
      "/favicon.svg", "/assets/missing.js", "/images/example.webp"]) {
      expect(spaRoute.test(asset)).toBe(false);
    }
    expect(vercelConfig.headers.flatMap((rule) => rule.headers)).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    });
    const csp = vercelConfig.headers.flatMap((rule) => rule.headers)
      .find((header) => header.key === "Content-Security-Policy")?.value;
    expect(csp).toContain("connect-src 'self' https://icmtmaakjucmuzxnofkd.supabase.co;");
    expect(csp).not.toContain("*.supabase.co");
    expect(csp).not.toContain("ordax");

  });
});
