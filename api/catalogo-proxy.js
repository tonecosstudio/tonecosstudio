import { proxyCatalogRequest, proxyTelegramAdminRequest } from "../functions/catalogo-api/[[path]].js";
import { isRestrictedCatalogMediaPath } from "../scripts/security/catalog-public-media-approval-policy.mjs";

// The canonical Worker already controls browser cache headers. Extend only
// Vercel's existing CDN TTL for bounded, anonymous public model metadata:
// 5-minute edge freshness absorbs repeat visits without another D1 read.
// Never cache account/quote operations, errors, Range responses or media here.
const PUBLIC_MODEL_METADATA_ROUTE = /^(?:api\/catalog|api\/recent|api\/models\/[a-z0-9][a-z0-9-]{0,239}(?:\/images)?)$/;
const PUBLIC_MODEL_EDGE_TTL = "public, s-maxage=300";
// Only already-visible Telegram list metadata; details/media remain live for
// immediate rights/visibility revocation and must never receive edge TTL.
const PUBLIC_TELEGRAM_METADATA_ROUTE = /^(?:api\/telegram-studios|api\/telegram-studios\/studios)$/;
const PUBLIC_TELEGRAM_LIST_EDGE_TTL = "public, s-maxage=60";
const PUBLIC_TELEGRAM_STUDIOS_EDGE_TTL = "public, s-maxage=300";

/** Host-scoped public gallery policy; commercial domains retain their own routes. */
export function isStandaloneTelegramCatalogHost(host) {
  if (typeof host !== "string") return false;
  const hostname = host.toLowerCase().split(":")[0];
  return hostname === "catalogo.tonartstudio.com.br" ||
    hostname === "tonart-catalogo-publico.vercel.app" ||
    /^tonart-catalogo-publico-[a-z0-9-]+\.vercel\.app$/.test(hostname);
}

export function isAllowedStandaloneTelegramRoute(host, path, method) {
  if (!isStandaloneTelegramCatalogHost(host)) return true;
  if (method !== "GET") return false;
  return path === "api/telegram-studios" ||
    path === "api/telegram-studios/studios" ||
    /^api\/telegram-studios\/tg_[a-f0-9]{24}(?:\/media\/[a-f0-9]{64}\/(?:thumb|display))?$/.test(path);
}

/**
 * Vercel rewrites expose destination/client query parameters through
 * request.query. req.url may contain runtime/rewrite transport metadata that
 * is not part of the public catalog query; copying it can make every bounded
 * catalog request fail closed. Ignore only the rewrite path and Vercel's
 * protected-preview share token. Preserve every other public query value
 * (including duplicates represented as arrays) so the canonical proxy rejects
 * unknown, duplicated or cache-busting parameters.
 */
function publicQueryFromVercelRequest(req, incoming) {
  if (req.query && typeof req.query === "object") {
    const search = new URLSearchParams();
    for (const [key, raw] of Object.entries(req.query)) {
      if (
        key === "path" ||
        key === "_vercel_share" ||
        raw === undefined ||
        raw === null
      ) continue;
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        if (typeof value !== "string") return null;
        search.append(key, value);
      }
    }
    return search;
  }

  // Local/direct invocation fallback where VercelRequest helpers are absent.
  const search = new URLSearchParams(incoming.searchParams);
  search.delete("path");
  search.delete("_vercel_share");
  return search;
}

// Vercel is the public site. The existing Worker stays the only catalog API.
// Adapt the reviewed Pages read-only proxy; no parallel catalog implementation.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // Private Telegram editor is the only non-GET exception to public read-only
  // Vercel catalog routes. The canonical authenticated adapter owns the allowlist.
  const rawCandidate =
    req.query?.path ?? new URL(req.url || "/", "https://tonart.local").searchParams.get("path");
  const candidate = Array.isArray(rawCandidate) ? rawCandidate.join("/") : rawCandidate;
  const isTelegramPrivate =
    typeof candidate === "string" &&
    (candidate === "api/admin/telegram-drafts" ||
      candidate.startsWith("api/admin/telegram-drafts/"));
  // Separate public Telegram catalog: do not proxy the legacy commercial
  // catalog, nor admin draft endpoints, on the dedicated public hostname.
  if (!isAllowedStandaloneTelegramRoute(req.headers?.host, candidate, req.method)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
  if (req.method !== "GET" && !isTelegramPrivate) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method not allowed");
    return;
  }

  try {
    const incoming = new URL(req.url || "/", "https://tonart.local");
    const rawPath = req.query?.path ?? incoming.searchParams.get("path");
    const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    if (typeof path !== "string" || !path || path.length > 2048 ||
        path.startsWith("/") || path.includes("\\") ||
        path.split("/").some((part) => !part || part === "." || part === "..")) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    if (isTelegramPrivate) {
      // Reuse the same authenticated Pages adapter, Worker and D1; do not
      // create a Vercel catalog data layer or forward browser cookies.
      const search = publicQueryFromVercelRequest(req, incoming);
      if (!search) {
        res.statusCode = 400;
        res.end("Invalid private catalog query");
        return;
      }
      const url = new URL(
        "/catalogo-api/" + path + (search.size ? "?" + search.toString() : ""),
        "https://tonart.local",
      );
      const headers = new Headers();
      for (const name of ["authorization", "accept", "content-type"]) {
        const value = req.headers?.[name];
        if (typeof value === "string") headers.set(name, value);
      }
      let body;
      if (req.method === "POST" || req.method === "PATCH") {
        // Vercel usually parses application/json before the handler runs.
        // Only pass a bounded JSON body to the existing Worker path.
        const length = Number(req.headers?.["content-length"] || 0);
        if (!Number.isFinite(length) || length < 0 || length > 20000) {
          res.statusCode = 413;
          res.end("Invalid private catalog payload length");
          return;
        }
        if (typeof req.body === "string") body = req.body;
        else if (Buffer.isBuffer(req.body)) body = req.body.toString("utf8");
        else if (req.body && typeof req.body === "object") body = JSON.stringify(req.body);
        if (!body || body.length > 20000) {
          res.statusCode = 400;
          res.end("Invalid private catalog payload");
          return;
        }
      }
      const response = await proxyTelegramAdminRequest(
        new Request(url, { method: req.method, headers, ...(body ? { body } : {}) }),
        (upstreamUrl, options) => fetch(upstreamUrl, options),
      );
      res.statusCode = response.status;
      response.headers.forEach((value, name) => {
        if (!["content-length", "content-encoding", "set-cookie"].includes(name)) {
          res.setHeader(name, value);
        }
      });
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Vercel-CDN-Cache-Control", "private, no-store");
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    // Preserve all ordinary catalog images. Block only identified SpecialSTL media.
    if (isRestrictedCatalogMediaPath(path)) {
      res.statusCode = 404;
      res.end("Imagem em revisão");
      return;
    }

    const search = publicQueryFromVercelRequest(req, incoming);
    if (!search) {
      res.statusCode = 400;
      res.end("Invalid catalog query");
      return;
    }
    const url = new URL(
      "/catalogo-api/" + path + (search.size ? "?" + search.toString() : ""),
      "https://tonart.local",
    );
    const headers = new Headers();
    for (const name of ["accept", "if-none-match"]) {
      const value = req.headers?.[name];
      if (typeof value === "string") headers.set(name, value);
    }
    // Range is supported by the existing canonical Pages/Worker proxy.
    // Forward it only for media; that adapter validates one-range syntax
    // before any upstream R2 read, and rejects malformed/multi-range values.
    if (path.startsWith("media/") && typeof req.headers?.range === "string") {
      headers.set("Range", req.headers.range);
    }

    const response = await proxyCatalogRequest(
      new Request(url, { method: "GET", headers }),
      (upstreamUrl, options) => fetch(upstreamUrl, options),
    );
    // Only report a failing media transport status. Do not log media keys,
    // visitor headers, or model identity; ordinary successes stay silent.
    if (path.startsWith("media/") && response.status !== 200 && response.status !== 206 && response.status !== 304) {
      console.warn("[tonart-media] upstream rejected image", { status: response.status });
    }
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      // Node fetch transparently decompresses upstream bodies. Never carry
      // the upstream compressed length/encoding into the Vercel response.
      if (name !== "content-length" && name !== "content-encoding") {
        res.setHeader(name, value);
      }
    });
    if (
      response.status === 200 &&
      (PUBLIC_MODEL_METADATA_ROUTE.test(path) || PUBLIC_TELEGRAM_METADATA_ROUTE.test(path)) &&
      !req.headers?.authorization &&
      !req.headers?.cookie &&
      /^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") &&
      /^public(?:,|$)/i.test(response.headers.get("cache-control") ?? "") &&
      !response.headers.has("set-cookie") &&
      !response.headers.has("content-range")
    ) {
      // Vercel-only cache override: browser freshness stays owned by Worker
      // Cache-Control. No parallel data cache, KV or D1 mirror.
      res.setHeader("Vercel-CDN-Cache-Control", path === "api/telegram-studios/studios"
        ? PUBLIC_TELEGRAM_STUDIOS_EDGE_TTL
        : path === "api/telegram-studios" ? PUBLIC_TELEGRAM_LIST_EDGE_TTL : PUBLIC_MODEL_EDGE_TTL);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    res.end(bytes);
  } catch {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end("Catalog unavailable");
  }
}
