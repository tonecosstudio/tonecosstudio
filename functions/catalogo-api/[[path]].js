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
  "api/telegram-studios",
  "api/telegram-studios/studios",
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
    /^api\/telegram-studios\/tg_[a-f0-9]{24}(?:\/media\/[a-f0-9]{64}\/(?:thumb|display))?$/.test(path) ||
    isSafeMediaPath(path);
}

// Budget guard on public D1-backed routes. Extra/duplicate query arguments
// do not change the canonical Worker query but otherwise create new CDN keys,
// allowing accidental or abusive cache misses. Validate before ANY D1 read.
// Media routes keep their existing independent key/range protections.
function isBoundedPublicQuery(route, searchParams) {
  // Media keys are immutable; irrelevant query arguments merely fragment
  // CDN caches and can cause new R2 reads with no change in image content.
  if (route.startsWith("media/")) return searchParams.size === 0;
  const routeKeys = route === "api/telegram-studios"
    ? ["studio", "q", "provisional", "offset", "limit"]
    : route === "api/telegram-studios/studios" || /^api\/telegram-studios\/tg_[a-f0-9]{24}(?:\/media\/[a-f0-9]{64}\/(?:thumb|display))?$/.test(route)
      ? []
    : route === "api/catalog"
    ? ["category", "franchise", "folder", "q", "material", "collection", "minHeight", "maxHeight", "limit", "cursor"]
    : route === "api/franchises"
      ? ["category", "q", "limit"]
      : route === "api/folders"
        ? ["category", "franchise", "parent"]
        : route === "api/recent"
          ? ["limit"]
          : route === "api/categories" || /^api\/models\/[a-z0-9][a-z0-9-]{0,239}$/.test(route)
            ? []
            : /^api\/models\/[a-z0-9][a-z0-9-]{0,239}\/images$/.test(route)
              ? ["limit", "cursor", "v"]
              : null;
  if (!routeKeys) return false;
  const allowed = new Set(routeKeys);
  const seen = new Set();
  for (const [key, value] of searchParams) {
    if (!allowed.has(key) || seen.has(key) || !value ||
        value.length > 2048 || /[\x00-\x1f\x7f]/.test(value)) return false;
    seen.add(key);
    if (key === "limit") {
      const max = route === "api/recent" ? 24 : route === "api/franchises" || route === "api/telegram-studios" ? 48 : 60;
      if (!/^[1-9][0-9]?$/.test(value) || Number(value) > max) return false;
    } else if (key === "offset") {
      if (!/^(0|[1-9][0-9]{0,4})$/.test(value)) return false;
    } else if (key === "studio") {
      if (value.length > 120 || /[\x00-\x1f\x7f]/.test(value)) return false;
    } else if (key === "provisional") {
      if (route !== "api/telegram-studios" || !/^[01]$/.test(value)) return false;
    } else if (key === "minHeight" || key === "maxHeight") {
      if (!/^[1-9][0-9]{0,2}$/.test(value) || Number(value) > 300) return false;
    } else if (key === "v") {
      if (!/^[1-9][0-9]{0,14}$/.test(value) ||
          !Number.isSafeInteger(Number(value))) return false;
    } else if (key === "cursor") {
      // Gallery cursors use padded base64 (e.g. "Ng=="); model list
      // cursors use unpadded base64url. Preserve both canonical encodings.
      if (!/^[A-Za-z0-9+/_-]{1,2048}={0,2}$/.test(value)) return false;
    } else if (key === "category" || key === "franchise") {
      if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(value)) return false;
    } else if (key === "folder" || key === "parent") {
      if (value.length > 240 || value.includes("\\") ||
          value.split("/").some((part) => !part || part === "." || part === "..")) return false;
    } else if (key === "q") {
      const length = Array.from(value.trim()).length;
      if (length < 3 || length > 120) return false;
    } else if (key === "material" || key === "collection") {
      if (Array.from(value).length > 120) return false;
    }
  }
  return true;
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
  if (incoming.search.length > 2048 ||
      !isBoundedPublicQuery(route, incoming.searchParams)) {
    return new Response("Invalid catalog query", {
      status: 400, headers: { "Cache-Control": "no-store" },
    });
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


// Private, authenticated administration lives behind the SAME first-party
// Pages → CATALOG_WORKER binding; public routes retain the read-only proxy.
// Never forward browser cookies, custom headers, unknown methods or public caches.
const PRIVATE_DRAFT_ROUTE =
  /^api\/admin\/telegram-drafts(?:\/import|\/tg_[a-f0-9]{24}(?:\/media\/[a-f0-9]{64}\/(?:display|thumb))?)?$/;
const BEARER_TOKEN = /^Bearer [A-Za-z0-9._~-]{60,8192}$/;

export async function proxyTelegramAdminRequest(request, fetcher) {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith(PREFIX)) {
    return new Response("Not found", { status: 404 });
  }
  const route = incoming.pathname.slice(PREFIX.length);
  if (!PRIVATE_DRAFT_ROUTE.test(route) ||
      incoming.pathname.length + incoming.search.length > 4096 ||
      incoming.search.length > 2048) {
    return new Response("Not found", { status: 404 });
  }
  const method = request.method;
  if (!["GET", "PATCH", "POST"].includes(method)) {
    return new Response("Method not allowed", { status: 405,
      headers: { Allow: "GET, PATCH, POST", "Cache-Control": "no-store" } });
  }
  const targetIsModel = /^api\/admin\/telegram-drafts\/tg_[a-f0-9]{24}$/.test(route);
  if ((method === "PATCH" && (incoming.search || !targetIsModel)) ||
      (method === "POST" && (incoming.search || route !== "api/admin/telegram-drafts/import")) ||
      (method === "GET" && route === "api/admin/telegram-drafts/import")) {
    return new Response("Not found", { status: 404 });
  }
  const authorization = request.headers.get("authorization") || "";
  if (!BEARER_TOKEN.test(authorization)) {
    return new Response("Admin required", { status: 403,
      headers: { "Cache-Control": "no-store" } });
  }
  const upstream = new URL("/" + route + incoming.search, CATALOG_ORIGIN);
  const headers = new Headers({ Authorization: authorization,
    Accept: request.headers.get("Accept") || "application/json" });
  let body;
  if (method === "PATCH" || method === "POST") {
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
      return new Response("Invalid body", { status: 400 });
    }
    body = await request.text();
    if (!body || body.length > (method === "POST" ? 20000 : 8192)) return new Response("Invalid body", { status: 400 });
    headers.set("Content-Type", "application/json");
  }
  try {
    const response = await fetcher(upstream, {
      method, headers, ...(body === undefined ? {} : { body }),
      redirect: "manual", signal: request.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel().catch(() => undefined);
      return new Response("Upstream redirect rejected", { status: 502,
        headers: { "Cache-Control": "no-store" } });
    }
    const type = response.headers.get("content-type") || "";
    if (!type.startsWith("application/json") && !type.startsWith("image/webp")) {
      await response.body?.cancel().catch(() => undefined);
      return new Response("Invalid upstream content", { status: 502,
        headers: { "Cache-Control": "no-store" } });
    }
    const safe = new Headers({
      "Content-Type": type, "Cache-Control": "private, no-store",
      "Vary": "Authorization",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Referrer-Policy": "no-referrer",
    });
    return new Response(response.body, { status: response.status, headers: safe });
  } catch {
    return new Response("Private catalog unavailable", { status: 502,
      headers: { "Cache-Control": "no-store" } });
  }
}

/** Pages Functions entrypoint. */
export function onRequest({ request, env }) {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/catalogo-api/api/admin/telegram-drafts" ||
      pathname.startsWith("/catalogo-api/api/admin/telegram-drafts/")) {
    return proxyTelegramAdminRequest(request, (url, options) => {
      if (typeof env?.CATALOG_WORKER?.fetch !== "function") {
        throw new Error("catalog_service_binding_unavailable");
      }
      return env.CATALOG_WORKER.fetch(String(url), options);
    });
  }
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
