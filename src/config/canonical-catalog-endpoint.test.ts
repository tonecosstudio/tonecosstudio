import { describe, expect, it } from "vitest";
import deployment from "../../vercel.json";
import {
  CANONICAL_CATALOG_PROXY_PATH,
  resolveCanonicalCatalogApiBase,
} from "./canonical-catalog-endpoint";

describe("canonical catalog first-party integration", () => {
  it("derives only the same-origin, HTTPS endpoint for production previews", () => {
    expect(resolveCanonicalCatalogApiBase(
      undefined,
      "https://tonecosstudio-preview.vercel.app",
      true,
    )).toBe("https://tonecosstudio-preview.vercel.app/catalogo-api/");
    expect(CANONICAL_CATALOG_PROXY_PATH).toBe("/catalogo-api/");
  });

  it("keeps the explicit deployment base as the only override", () => {
    expect(resolveCanonicalCatalogApiBase(
      " https://custom.example/api/ ",
      "https://tonecosstudio-preview.vercel.app",
      true,
    )).toBe("https://custom.example/api/");
  });

  it.each([
    [undefined, "https://tonecosstudio-preview.vercel.app", false],
    [undefined, "http://localhost:5173", true],
    [undefined, "https://ordax.com.br", true],
    [undefined, "https://www.ordax.com.br", true],
    [undefined, "https://example.com/other", true],
    [undefined, "https://example.com?other=1", true],
    [undefined, "not-a-url", true],
    [undefined, undefined, true],
  ] as const)("fails closed without a trustworthy origin %#", (configured, origin, prod) => {
    expect(resolveCanonicalCatalogApiBase(configured, origin, prod)).toBe("");
  });

  it("rewrites only public catalog reads and images, never an unrestricted Worker API", () => {
    const rewrites = deployment.rewrites;
    const origin = "https://tonecos-catalogo-api.tonecosstudio.workers.dev";
    expect(rewrites.slice(0, 6)).toEqual([
      { source: "/catalogo-api/api/catalog", destination: origin + "/api/catalog" },
      { source: "/catalogo-api/api/categories", destination: origin + "/api/categories" },
      { source: "/catalogo-api/api/franchises", destination: origin + "/api/franchises" },
      { source: "/catalogo-api/api/models/:slug/images", destination: origin + "/api/models/:slug/images" },
      { source: "/catalogo-api/api/models/:slug", destination: origin + "/api/models/:slug" },
      { source: "/catalogo-api/media/:path*", destination: origin + "/media/:path*" },
    ]);
    expect(rewrites.at(-1)).toEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
    expect(rewrites.some((route) => route.source === "/catalogo-api/:path*" ||
      route.source === "/catalogo-api/api/:path*")).toBe(false);
  });

  it("keeps catalog caching subordinate to origin policy, with a restrictive site CSP", () => {
    const rule = deployment.headers.find((entry) =>
      entry.source === "/catalogo-api/:path*");
    expect(rule?.headers).toContainEqual({
      key: "x-vercel-enable-rewrite-caching",
      value: "1",
    });
    const siteHeaders = deployment.headers.find((entry) => entry.source === "/(.*)");
    const csp = siteHeaders?.headers.find((header) =>
      header.key === "Content-Security-Policy")?.value;
    expect(csp).toContain("img-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("workers.dev");
  });
});
