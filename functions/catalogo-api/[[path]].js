import { isRestrictedCatalogMediaPath } from "../../scripts/security/catalog-public-media-approval-policy.mjs";
/**
 * Cloudflare Pages transport adapter for the single canonical Tonecos catalog.
 * Only public, read-only routes are forwarded to the existing Worker.
 * No D1 bindings, writes, alternate catalog service or browser credentials.
 */
const CATALOG_ORIGIN = "https://tonecos-catalogo-api.tonecosstudio.workers.dev";
const PREFIX = "/catalogo-api/";
const PUBLIC_LIST_ROUTES = new Set([
  "api/catalog",
  "api/categories",
  "api/franchises",
  "api/folders",
  "api/recent",
]);

// The external publisher cannot set arbitrary headers on our first-party site.
// Preserve only public API/media semantics. Never forward session, site-policy
// or navigation headers from the upstream Worker.
const SAFE_UPSTREAM_RESPONSE_HEADERS = [
  "content-type", "content-length", "content-encoding", "content-language",
  "content-range", "accept-ranges", "etag", "last-modified",
  "cache-control", "vary", "access-control-allow-origin",
  "cross-origin-resource-policy",
];

function isSafeMediaPath(path) {
  if (!path.startsWith("media/")) return false;
  const parts = path.slice("media/".length).split("/");
  if (parts.length < 1 || parts.length > 16) return false;
  return parts.every((segment) => {
    if (
      !segment ||
      segment.length > 256 ||
      !/^(?:[a-zA-Z0-9._~-]|%[0-9a-fA-F]{2})+$/.test(segment)
    ) return false;
    try {
      const decoded = decodeURIComponent(segment);
      return decoded !== "." && decoded !== ".." &&
        !/[\\/\x00-\x1f\x7f%:?#]/.test(decoded);
    } catch {
      return false;
    }
  });
}

// R2 serves a single byte range for public media. Reject malformed or
// multi-range values before they can trigger an unnecessary upstream read.
function isValidMediaRange(value) {
  const absolute = /^bytes=(\d{1,15})-(\d{0,15})$/i.exec(value);
  if (absolute) {
    return !absolute[2] || Number(absolute[1]) <= Number(absolute[2]);
  }
  const suffix = /^bytes=-(\d{1,15})$/i.exec(value);
  return Boolean(suffix && Number(suffix[1]) > 0);
}

// Do not expose or cache a partial response with inconsistent metadata.
function matchesRequestedMediaRange(range, contentRange) {
  if (!range || !contentRange) return false;
  const match = /^bytes (\d{1,15})-(\d{1,15})\/(\d{1,15})$/i.exec(contentRange);
  if (!match) return false;
  const [start, end, total] = match.slice(1).map(Number);
  if (!Number.isSafeInteger(total) || total <= 0 || start > end || end >= total) return false;
  const suffix = /^bytes=-(\d{1,15})$/i.exec(range);
  if (suffix) return start === Math.max(0, total - Number(suffix[1])) && end === total - 1;
  const absolute = /^bytes=(\d{1,15})-(\d{0,15})$/i.exec(range);
  if (!absolute) return false;
  return start === Number(absolute[1]) &&
    end === (absolute[2] ? Math.min(Number(absolute[2]), total - 1) : total - 1);
}

// Some previously deployed Workers incorrectly mark a complete R2 object
// as 206 without any Range request. Accept only a provably full byte span,
// normalize it to 200 and retain strict rejection for genuine partial bodies.
function isCompleteMediaRange(contentRange) {
  if (typeof contentRange !== "string") return false;
  const match = /^bytes 0-(\d{1,15})\/(\d{1,15})$/i.exec(contentRange);
  if (!match) return false;
  const end = Number(match[1]);
  const total = Number(match[2]);
  return Number.isSafeInteger(end) && Number.isSafeInteger(total) &&
    total > 0 && end === total - 1;
}

function isPublicCatalogRoute(path) {
  return PUBLIC_LIST_ROUTES.has(path) ||
    /^api\/models\/[a-z0-9][a-z0-9-]{0,239}(?:\/images)?$/.test(path) ||
    isSafeMediaPath(path);
}

export async function proxyCatalogRequest(request, fetcher) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET", "Cache-Control": "no-store" },
    });
  }

  let incoming;
  try {
    incoming = new URL(request.url);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (!incoming.pathname.startsWith(PREFIX) ||
      incoming.pathname.length + incoming.search.length > 4096) {
    return new Response("Not found", { status: 404 });
  }

  const route = incoming.pathname.slice(PREFIX.length);
  if (!isPublicCatalogRoute(route)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = new URL("/" + route + incoming.search, CATALOG_ORIGIN);
  const headers = new Headers();
  headers.set("Accept", request.headers.get("Accept") || "application/json");
  if (request.headers.has("If-None-Match")) {
    headers.set("If-None-Match", request.headers.get("If-None-Match"));
  }
  if (route.startsWith("media/") && request.headers.has("Range")) {
    const range = request.headers.get("Range");
    if (!isValidMediaRange(range)) {
      return new Response("Invalid media range", {
        status: 416,
        headers: { "Cache-Control": "no-store" },
      });
    }
    headers.set("Range", range);
  }

  try {
    const response = await fetcher(upstream, {
      method: "GET",
      headers,
      redirect: "manual",
      // Preserve client cancellation across the Pages -> Worker service binding.
      // Avoid unnecessary upstream work when navigation or an in-flight read stops.
      signal: request.signal,
    });
    // If the upstream ignores an explicit Range, cancel the potentially full
    // object before the Vercel adapter/Pages response can buffer it. This is
    // essential for the admin's one-byte media probe and saves R2 bandwidth.
    if (route.startsWith("media/") && headers.has("Range") && response.status === 200) {
      await response.body?.cancel().catch(() => undefined);
      return new Response("Upstream media range ignored", {
        status: 502, headers: { "Cache-Control": "no-store" },
      });
    }
    // A complete R2 object from an older Worker may be incorrectly labelled
    // 206. Normalize *only* an exact 0..size-1 span when no Range was sent.
    const completeLegacyMedia = response.status === 206 &&
      route.startsWith("media/") && !headers.has("Range") &&
      isCompleteMediaRange(response.headers.get("Content-Range"));
    if (response.status === 206 &&
        !completeLegacyMedia &&
        (!route.startsWith("media/") ||
         !matchesRequestedMediaRange(headers.get("Range"), response.headers.get("Content-Range")))) {
      return new Response("Invalid upstream media range", {
        status: 502, headers: { "Cache-Control": "no-store" },
      });
    }
    // No arbitrary external redirect or upstream cookie is promoted to our site.
    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      return new Response("Upstream redirect rejected", {
        status: 502, headers: { "Cache-Control": "no-store" },
      });
    }
    const safeHeaders = new Headers();
    for (const name of SAFE_UPSTREAM_RESPONSE_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) safeHeaders.set(name, value);
    }
    safeHeaders.set("X-Content-Type-Options", "nosniff");
    // API/media live on our first-party origin. Even if the other publisher
    // returns text/html or an active image format, navigation must not execute
    // that response as a privileged same-origin document.
    safeHeaders.set("Content-Security-Policy", "sandbox");
    // The source Worker must not make failed public requests cacheable on Pages.
    if (response.status >= 400) safeHeaders.set("Cache-Control", "no-store");
    if (completeLegacyMedia) safeHeaders.delete("Content-Range");
    return new Response(response.body, {
      status: completeLegacyMedia ? 200 : response.status,
      headers: safeHeaders,
    });
  } catch {
    return new Response("Catalog unavailable", {
      status: 502, headers: { "Cache-Control": "no-store" },
    });
  }
}

/** Pages Functions entrypoint. */
export function onRequest({ request, env }) {
  // Block the same confirmed SpecialSTL keys at the server boundary.
  const incomingPath = new URL(request.url).pathname;
  if (incomingPath.startsWith(PREFIX) &&
      isRestrictedCatalogMediaPath(incomingPath.slice(PREFIX.length))) {
    return new Response("Imagem em revisão", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  // A Pages Function and its catalog Worker share one Cloudflare account.
  // Require the native binding; never fall back to the public workers.dev URL.
  return proxyCatalogRequest(request, (url, options) => {
    if (typeof env?.CATALOG_WORKER?.fetch !== "function") {
      throw new Error("catalog_service_binding_unavailable");
    }
    return env.CATALOG_WORKER.fetch(String(url), options);
  });
}
