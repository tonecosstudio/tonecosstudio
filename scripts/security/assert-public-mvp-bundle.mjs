/** Assert a public MVP's reachable Vite chunks exclude every commercial runtime. */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function assertPublicMvpManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("invalid Vite manifest");
  }
  // Vite's normal SPA entry is index.html, not src/main.tsx.
  const entrypoints = Object.keys(manifest).filter(key => {
    const item = manifest[key];
    return item?.isEntry === true && (key === "index.html" || item.src === "index.html" ||
      key === "src/main.tsx" || item.src === "src/main.tsx");
  });
  if (entrypoints.length !== 1) {
    throw new Error("expected exactly one Vite HTML or main entry, got " + entrypoints.length);
  }

  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    const item = manifest[key];
    if (!item || typeof item.file !== "string" || !item.file) {
      throw new Error("missing or invalid Vite chunk " + key);
    }
    visited.add(key);
    for (const dependency of [...(item.imports ?? []), ...(item.dynamicImports ?? [])]) {
      visit(dependency);
    }
  }
  visit(entrypoints[0]);
  const suspicious = [...visited].filter(key => {
    const chunk = manifest[key];
    // Match each source/asset path individually: anchored patterns fail on
    // a concatenated string and can silently miss the commercial App.tsx.
    const paths = [key, chunk.file, chunk.src ?? ""];
    return paths.some(path =>
      /(^|[/\\])App\.tsx$|supabase|(?:^|[/\\])admin|LoginArcade|ProfileArcade|ContactArcade\.tsx|RequireAuth/i.test(path)
    );
  });
  if (suspicious.length) throw new Error("Public MVP contains commercial chunks: " + suspicious.join(", "));
  if (![...visited].some(key =>
    /(?:^|[/\\])PublicCatalogApp(?:\.tsx)?$/.test(key) ||
    /PublicCatalogApp/.test(manifest[key].file)
  )) throw new Error("PublicCatalogApp not reachable from Vite entry");
  return { entry: entrypoints[0], chunks: visited.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.VITE_PUBLIC_CATALOG_MVP === "true") {
    if (process.env.VITE_PREVIEW_READ_ONLY !== "true") throw new Error("public MVP is not readonly");
    const path = join("dist", ".vite", "manifest.json");
    if (!existsSync(path)) throw new Error("Vite manifest not emitted");
    const result = assertPublicMvpManifest(JSON.parse(readFileSync(path, "utf8")));
    console.log("Public catalog excludes commercial and Supabase runtime", result);
  }
}
