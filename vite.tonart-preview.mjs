/** Local-only TONART preview: uses Vite's esbuild JSX transform when SWC native loading is unavailable. */
import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath } from "node:url";
import { catalogReadOnlyViteProxy } from "./scripts/dev/catalog-readonly-vite-proxy.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
// Tailwind v3 resolves content globs from cwd; the local launcher may run elsewhere.
process.chdir(root);
export default defineConfig({
  root,
  plugins: [
    {
      name: "tonart-preview-public-entry",
      transformIndexHtml(html) {
        return html.replace('src="/src/main.tsx"', 'src="/src/main.tonart-preview.tsx"');
      },
    },
    catalogReadOnlyViteProxy(),
  ],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    fs: { allow: [root] },
    hmr: { overlay: true },
  },
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: { "@": path.join(root, "src") },
  },
  esbuild: { jsx: "automatic" },
  css: { postcss: { plugins: [tailwindcss({ config: path.join(root, "tailwind.config.ts") }), autoprefixer()] } },
  optimizeDeps: {
    noDiscovery: true,
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "react-fast-compare", "react-router-dom", "react-helmet-async"],
  },
});
