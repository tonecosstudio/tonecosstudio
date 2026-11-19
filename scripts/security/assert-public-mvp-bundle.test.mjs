import { test } from "node:test";
import { strict as assert } from "node:assert";
import { assertPublicMvpManifest, assertPublicMvpRuntimeSources } from "./assert-public-mvp-bundle.mjs";

const base = () => ({
  "index.html": {
    file: "assets/index-1.js",
    src: "index.html",
    isEntry: true,
    imports: ["_vendor-ui.js"],
    dynamicImports: ["src/PublicCatalogApp.tsx"],
  },
  "_vendor-ui.js": { file: "assets/vendor-ui-1.js" },
  "src/PublicCatalogApp.tsx": { file: "assets/PublicCatalogApp-1.js", isDynamicEntry: true },
});
test("accepts Vite's real index.html entry and public route", () => {
  assert.deepEqual(assertPublicMvpManifest(base()), { entry: "index.html", chunks: 3 });
});
test("blocks Supabase reachable via a transitive chunk", () => {
  const m = base();
  m["_vendor-ui.js"].imports = ["_vendor-supabase.js"];
  m["_vendor-supabase.js"] = { file: "assets/vendor-supabase-1.js" };
  assert.throws(() => assertPublicMvpManifest(m), /commercial chunks/);
});
test("blocks the commercial application reachable via dynamic import", () => {
  const m = base();
  m["index.html"].dynamicImports.push("src/App.tsx");
  m["src/App.tsx"] = { file: "assets/App-1.js" };
  assert.throws(() => assertPublicMvpManifest(m), /commercial chunks/);
});
test("inspects compiled public chunks, not only Vite manifest filenames", () => {
  const m = base();
  const safe = () => "export const status = 'catalog-ready'";
  assert.deepEqual(assertPublicMvpRuntimeSources(m, safe), { checkedJsChunks: 3 });
  const auth = file => file.includes("PublicCatalogApp")
    ? 'throw new Error("Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY")'
    : "export const status = 'catalog-ready'";
  assert.throws(() => assertPublicMvpRuntimeSources(m, auth), /embeds Supabase Auth runtime/);
  assert.throws(() => assertPublicMvpRuntimeSources(m, () => null), /unable to inspect/);
});

test("fails closed when public catalog is not reachable", () => {
  const m = base();
  m["index.html"].dynamicImports = [];
  assert.throws(() => assertPublicMvpManifest(m), /PublicCatalogApp not reachable/);
});
test("fails closed for missing dependencies or missing HTML entry", () => {
  const m = base();
  m["index.html"].imports = ["_missing.js"];
  assert.throws(() => assertPublicMvpManifest(m), /missing or invalid/);
  delete m["index.html"];
  assert.throws(() => assertPublicMvpManifest(m), /exactly one/);
});
