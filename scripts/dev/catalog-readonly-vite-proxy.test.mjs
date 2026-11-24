import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { catalogReadOnlyViteProxy } from "./catalog-readonly-vite-proxy.mjs";

test("local catalog proxy handles synchronous denials and async validation", async () => {
  let middleware;
  catalogReadOnlyViteProxy().configureServer({
    middlewares: { use(handler) { middleware = handler; } },
  });
  assert.equal(typeof middleware, "function");

  const server = createServer((request, response) =>
    middleware(request, response, () => {
      response.statusCode = 404;
      response.end();
    }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/catalogo-api/`;

  try {
    for (const { path, status, noStore } of [
      { path: "media/specialstl-example/card.webp", status: 404, noStore: true },
      { path: "api/catalog?limit=0", status: 400, noStore: true },
      { path: "api/not-a-public-route", status: 404, noStore: false },
    ]) {
      const response = await fetch(base + path, {
        signal: AbortSignal.timeout(5_000),
      });
      assert.equal(response.status, status, path);
      if (noStore) {
        assert.equal(response.headers.get("cache-control"), "no-store", path);
      }
      await response.text();
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
