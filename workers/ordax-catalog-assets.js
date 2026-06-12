export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (!key.startsWith("catalog-webp-final/")) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await env.ORDAX_CATALOG.get(key);

    if (!object) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=60",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "image/webp");

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(object.body, { status: 200, headers });
  },
};
