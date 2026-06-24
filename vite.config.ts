import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import os from "os";
import path from "path";
import { componentTagger } from "lovable-tagger";

const catalogWebpOutput = path.resolve(
  process.env.CATALOG_WEBP_OUTPUT ||
    path.join(os.homedir(), "Downloads", "ordax-catalogo-webp-final"),
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(__dirname), catalogWebpOutput],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI libraries
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],

          // Charts (heavy)
          'vendor-charts': ['recharts'],

          // Utilities
          'vendor-utils': ['date-fns', 'zod', 'clsx'],

          // Query
          'vendor-query': ['@tanstack/react-query'],

          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
}));
