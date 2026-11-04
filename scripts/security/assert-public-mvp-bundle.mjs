/** Assert that a readonly MVP's reachable JS chunks exclude commercial/Supabase runtime. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

if (process.env.VITE_PUBLIC_CATALOG_MVP === "true") {
  if (process.env.VITE_PREVIEW_READ_ONLY !== "true") throw Error("public MVP is not readonly");
  const manifestPath = join("dist", ".vite", "manifest.json");
  if (!existsSync(manifestPath)) throw Error("Vite manifest not emitted");
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = Object.keys(m).find(k => m[k].src === "src/main.tsx" || k === "src/main.tsx");
  if (!entry) throw Error("main entry missing in Vite manifest");
  const visited = new Set();
  const explore = (k) => {
    if (visited.has(k)) return;
    visited.add(k);
    const item = m[k];
    if (!item) throw Error("unresolved Vite import "+k);
    for (const dependency of [...(item.imports||[]), ...(item.dynamicImports||[])]) explore(dependency);
  };
  explore(entry);
  const suspects = [...visited].filter(k =>
    /(^|[/\\])App\.tsx$|supabase|admin|LoginArcade|ProfileArcade|ContactArcade\.tsx|requireauth/i.test(
      k + " " + (m[k]?.file||"")
    )
  );
  if (suspects.length) throw Error("Public MVP includes commercial runtime chunks: "+suspects.join(", "));
  const files = [...visited].map(k=>m[k]?.file).filter(Boolean);
  if (!files.some(s=>s.includes("PublicCatalogApp")))
    throw Error("PublicCatalogApp not reachable from main entry");
  console.log("MVP public bundle isolated from commercial and Supabase modules", {chunks:visited.size});
}
