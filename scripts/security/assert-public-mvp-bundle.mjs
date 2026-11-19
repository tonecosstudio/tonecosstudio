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

/**
 * The Vite manifest lists chunks, not modules inlined into chunks.
 * A commercial Auth module can therefore be embedded inside PublicCatalogApp
 * without appearing as a "supabase" file in the manifest.
 * Reject the actual compiled runtime when it contains Supabase bootstrap code.
 */
export function assertPublicMvpRuntimeSources(manifest, readAsset) {
  const chunks = Object.values(manifest).filter(item =>
    typeof item?.file === "string" && item.file.endsWith(".js")
  );
  if (chunks.length === 0) throw new Error("public MVP has no JavaScript chunks");
  for (const chunk of chunks) {
    const source = readAsset(chunk.file);
    if (typeof source !== "string") throw new Error("unable to inspect built chunk " + chunk.file);
    if (
      source.includes("Missing required environment variables:") ||
      source.includes("VITE_SUPABASE_PUBLISHABLE_KEY") ||
      source.includes("Invalid VITE_SUPABASE_URL format:")
    ) {
      throw new Error("Public MVP embeds Supabase Auth runtime: " + chunk.file);
    }
  }
  return { checkedJsChunks: chunks.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.VITE_PUBLIC_CATALOG_MVP === "true") {
    if (process.env.VITE_PREVIEW_READ_ONLY !== "true") throw new Error("public MVP is not readonly");
    const path = join("dist", ".vite", "manifest.json");
    if (!existsSync(path)) throw new Error("Vite manifest not emitted");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const result = assertPublicMvpManifest(manifest);
    const js = assertPublicMvpRuntimeSources(manifest, file =>
      readFileSync(join("dist", file), "utf8")
    );
    console.log("Public catalog manifest and compiled Auth isolation verified", { ...result, ...js });
  }
}
