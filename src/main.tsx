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

createRoot(document.getElementById("root")!).render(
  <>
    <ErrorBoundary>
      <HelmetProvider>
        <Suspense fallback={<div role="status" className="min-h-screen bg-black text-white" aria-label="Carregando catálogo" />}>
          <App />
        </Suspense>
      </HelmetProvider>
    </ErrorBoundary>
  </>,
);
