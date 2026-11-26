/**
 * One browser origin for the canonical, read-only catalog.
 * Cloudflare Pages Functions forwards only public read-only paths through
 * the native CATALOG_WORKER binding. No catalog rows are copied to Supabase.
 */
export const CANONICAL_CATALOG_PROXY_PATH = "/catalogo-api/";
export const CANONICAL_CATALOG_WORKER_ORIGIN =
  "https://tonecos-catalogo-api.tonecosstudio.workers.dev";

const DIRECT_ADMIN_WORKER_HOSTS = new Set([
  "tonartstudio.com.br",
  "www.tonartstudio.com.br",
]);

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
    const canonical = new URL(
      CANONICAL_CATALOG_PROXY_PATH,
      url.origin,
    ).toString();
    // Reject rather than silently ignore a misconfigured production endpoint.
    // Exact comparison also excludes query parameters, paths and credentials.
    if (explicit && explicit !== canonical) return "";
    return canonical;
  } catch {
    return "";
  }
}

export function resolveCanonicalCatalogAdminApiBase(
  publicBase: string,
  pageOrigin: string | undefined,
  production: boolean,
): string {
  if (!publicBase) return "";
  if (!production) return publicBase;

  try {
    const url = new URL(pageOrigin ?? "");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      DIRECT_ADMIN_WORKER_HOSTS.has(url.hostname)
    ) {
      return CANONICAL_CATALOG_WORKER_ORIGIN;
    }
  } catch {
    // Unknown production origins stay on the existing same-origin proxy.
  }

  // Cloudflare Pages keeps using its native service binding and development
  // keeps its configured mock. Only the official Vercel domains bypass the
  // body-forwarding proxy for authenticated admin requests.
  return publicBase;
}

export const CANONICAL_CATALOG_API_BASE = resolveCanonicalCatalogApiBase(
  import.meta.env.VITE_CANONICAL_CATALOG_API_BASE,
  typeof window === "undefined" ? undefined : window.location.origin,
  import.meta.env.PROD,
);

export const CANONICAL_CATALOG_ADMIN_API_BASE =
  resolveCanonicalCatalogAdminApiBase(
    CANONICAL_CATALOG_API_BASE,
    typeof window === "undefined" ? undefined : window.location.origin,
    import.meta.env.PROD,
  );
