import { proxyCatalogRequest } from "../functions/catalogo-api/[[path]].js";
import { isRestrictedCatalogMediaPath } from "../scripts/security/catalog-public-media-approval-policy.mjs";

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

    const search = new URLSearchParams(incoming.searchParams);
    search.delete("path");
    const url = new URL(
      "/catalogo-api/" + path + (search.size ? "?" + search.toString() : ""),
      "https://tonart.local",
    );
    const headers = new Headers();
    for (const name of ["accept", "if-none-match"]) {
      const value = req.headers?.[name];
      if (typeof value === "string") headers.set(name, value);
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
    const bytes = Buffer.from(await response.arrayBuffer());
    res.end(bytes);
  } catch {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end("Catalog unavailable");
  }
}
