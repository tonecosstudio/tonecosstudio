import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
// Build-time choice: the public catalog must never load commercial/auth modules.
const App = lazy(
  import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true"
    ? () => import("./TonecosCommercialApp")
    : import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true"
      ? () => import("./PublicCatalogApp")
      : () => import("./App"),
);
import "./index.css";
import "./styles/landing-page.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LOCAL_SUPABASE_FALLBACK } from "./config/supabase-environment";

createRoot(document.getElementById("root")!).render(
  <>
    {LOCAL_SUPABASE_FALLBACK && (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100 sm:text-sm"
      >
        Preview local sem Supabase: login, dados da conta e pagamentos não estão conectados.
      </div>
    )}
    <ErrorBoundary>
      <HelmetProvider>
        <Suspense fallback={<div role="status" className="min-h-screen bg-black text-white" aria-label="Carregando catálogo" />}>
          <App />
        </Suspense>
      </HelmetProvider>
    </ErrorBoundary>
  </>,
);
