import { proxyCatalogRequest } from "../functions/catalogo-api/[[path]].js";
import { isRestrictedCatalogMediaPath } from "../scripts/security/catalog-public-media-approval-policy.mjs";

// The canonical Worker already controls browser cache headers. Extend only
// Vercel's existing CDN TTL for bounded, anonymous public model metadata:
// 5-minute edge freshness absorbs repeat visits without another D1 read.
// Never cache account/quote operations, errors, Range responses or media here.
const PUBLIC_MODEL_METADATA_ROUTE = /^(?:api\/catalog|api\/recent|api\/models\/[a-z0-9][a-z0-9-]{0,239}(?:\/images)?)$/;
const PUBLIC_MODEL_EDGE_TTL = "public, s-maxage=300";

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
  if (req.method !== "GET") {
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
      PUBLIC_MODEL_METADATA_ROUTE.test(path) &&
      !req.headers?.authorization &&
      /^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") &&
      /^public(?:,|$)/i.test(response.headers.get("cache-control") ?? "") &&
      !response.headers.has("set-cookie") &&
      !response.headers.has("content-range")
    ) {
      // Vercel-only cache override: browser freshness stays owned by Worker
      // Cache-Control. No parallel data cache, KV or D1 mirror.
      res.setHeader("Vercel-CDN-Cache-Control", PUBLIC_MODEL_EDGE_TTL);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    res.end(bytes);
  } catch {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end("Catalog unavailable");
  }
}
