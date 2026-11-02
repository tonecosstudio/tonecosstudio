/**
 * One browser origin for the canonical, read-only catalog.
 * Vercel forwards only public model, category, franchise and media routes to
 * the Cloudflare Worker. No catalog rows are copied to Supabase.
 */
export const CANONICAL_CATALOG_PROXY_PATH = "/catalogo-api/";

export function resolveCanonicalCatalogApiBase(
  configured: string | undefined,
  pageOrigin: string | undefined,
  production: boolean,
): string {
  const explicit = configured?.trim();
  if (explicit) return explicit;
  if (!production || !pageOrigin) return "";

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
    return new URL(CANONICAL_CATALOG_PROXY_PATH, url.origin).toString();
  } catch {
    return "";
  }
}

export const CANONICAL_CATALOG_API_BASE = resolveCanonicalCatalogApiBase(
  import.meta.env.VITE_CANONICAL_CATALOG_API_BASE,
  typeof window === "undefined" ? undefined : window.location.origin,
  import.meta.env.PROD,
);
