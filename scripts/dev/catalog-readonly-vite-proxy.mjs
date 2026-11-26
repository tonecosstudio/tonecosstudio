import { ACTIVE_CATALOG_CLOUD } from "../../config/catalog-cloud-routing.mjs";
import { Readable } from "node:stream";
import { onRequest } from "../../functions/catalogo-api/[[path]].js";

/**
 * Local-only adapter for the canonical read-only catalog API.
 * Reuses the Pages Function allowlist, query limits and media quarantine.
 */
export function catalogReadOnlyViteProxy() {
  return {
    name: "tonecos-local-readonly-catalog-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/catalogo-api/")) return next();

        const controller = new AbortController();
        request.once("aborted", () => controller.abort());
        response.once("close", () => {
          if (!response.writableEnded) controller.abort();
        });

        const headers = new Headers();
        for (const name of ["accept", "if-none-match", "range"]) {
          const value = request.headers[name];
          if (typeof value === "string") headers.set(name, value);
        }

        let pagesRequest;
        try {
          pagesRequest = new Request(
            new URL(request.url, "http://127.0.0.1:8080"),
            {
              method: request.method ?? "GET",
              headers,
              signal: controller.signal,
            },
          );
        } catch {
          response.statusCode = 400;
          response.end("Bad request");
          return;
        }

        void Promise.resolve().then(() => onRequest({
          request: pagesRequest,
          env: {
            CATALOG_CLOUD: ACTIVE_CATALOG_CLOUD,
            CATALOG_WORKER: {
              fetch: (url, options) => {
                // Node's fetch transparently decompresses upstream bodies.
                // Request identity encoding so the Pages adapter won't forward
                // a stale content-encoding header with the decoded body.
                const upstreamHeaders = new Headers(options?.headers);
                upstreamHeaders.set("Accept-Encoding", "identity");
                return fetch(url, { ...options, headers: upstreamHeaders });
              },
            },
          },
        })).then((result) => {
          if (response.destroyed) return;
          response.statusCode = result.status;
          result.headers.forEach((value, name) => response.setHeader(name, value));
          if (!result.body) {
            response.end();
            return;
          }
          Readable.fromWeb(result.body).pipe(response);
        }).catch(() => {
          if (response.destroyed) return;
          response.statusCode = 502;
          response.setHeader("Cache-Control", "no-store");
          response.end("Catalog unavailable");
        });
      });
    },
  };
}
