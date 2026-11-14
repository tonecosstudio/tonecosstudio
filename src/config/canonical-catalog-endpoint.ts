/**
 * One browser origin for the canonical, read-only catalog.
 * Cloudflare Pages Functions forwards only public read-only paths through
 * the native CATALOG_WORKER binding. No catalog rows are copied to Supabase.
 */
export const CANONICAL_CATALOG_PROXY_PATH = "/catalogo-api/";

export function resolveCanonicalCatalogApiBase(
  configured: string | undefined,
  pageOrigin: string | undefined,
  production: boolean,
): string {
  const explicit = configured?.trim();
  // Development may use a local/mock API. A production catalog must always
  // use the exact same-origin Pages Function, never an external override.
  if (!production) {
    if (explicit) return explicit;
    try {
      const origin = new URL(pageOrigin ?? "");
      if (
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname) &&
        origin.port === "8080"
      ) {
        return new URL(CANONICAL_CATALOG_PROXY_PATH, origin.origin).toString();
      }
    } catch {
      // A missing or non-local page origin has no implicit development API.
    }
    return "";
  }
  if (!pageOrigin) return "";

  try {
    const url = new URL(pageOrigin);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.hostname === "ordax.com.br" ||
      url.hostname === "www.ordax.com.br"
    ) {
      return "";
    }
    const canonical = new URL(CANONICAL_CATALOG_PROXY_PATH, url.origin).toString();
    // Reject rather than silently ignore a misconfigured production endpoint.
    // Exact comparison also excludes query parameters, paths and credentials.
    if (explicit && explicit !== canonical) return "";
    return canonical;
  } catch {
    return "";
  }
}

export const CANONICAL_CATALOG_API_BASE = resolveCanonicalCatalogApiBase(
  import.meta.env.VITE_CANONICAL_CATALOG_API_BASE,
  typeof window === "undefined" ? undefined : window.location.origin,
  import.meta.env.PROD,
);
