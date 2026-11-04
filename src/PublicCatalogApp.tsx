/** Catalog-only entry of the existing Tonecos app: no auth, Supabase, purchases or admin imports. */
import { Suspense, lazy, useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ArcadeFrame } from "@/components/layouts/ArcadeFrame";
import { ArcadeNavView } from "@/components/arcade/ArcadeNavView";
import { ArcadeFooterView } from "@/components/arcade/ArcadeFooterView";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";
import { isCatalogPublicMvpEnabled, isCatalogMvpReadOnlyConfigurationSafe } from "@/config/catalog-public-mvp";
import { PUBLIC_ROUTES } from "@/config/routes";
import PublicCatalogContact from "@/pages/PublicCatalogContact";

const Home = lazy(() => import("@/pages/LandingPage"));
const Universe = lazy(() => import("@/pages/CatalogArcade"));
const Models = lazy(() => import("@/pages/CatalogModelsArcade"));
const Details = lazy(() => import("@/pages/catalog/CanonicalModelDetails"));
const About = lazy(() => import("@/pages/AboutArcade"));
const Privacy = lazy(() => import("@/pages/PrivacyArcadeView").then(m => ({ default: m.PrivacyArcadeView })));
const Terms = lazy(() => import("@/pages/TermsArcadeView").then(m => ({ default: m.TermsArcadeView })));
const HistoricalCharacter = lazy(() => import("@/pages/CatalogCharacterArcade"));

const queryClient = new QueryClient();

function PublicRouteScrollReset() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP" || hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}

function NotFound() {
  return (
    <main className="mx-auto max-w-4xl p-12 text-center" role="status">
      <h1 className="text-3xl font-bold text-[hsl(var(--gold-accent))]">Página não encontrada</h1>
      <p className="mt-4 text-sm text-[hsl(0,0%,65%)]">Esta página não faz parte do catálogo público.</p>
      <a className="mt-6 inline-flex border border-[hsl(var(--gold-accent))] p-3" href={PUBLIC_ROUTES.catalogModels}>Ver modelos</a>
    </main>
  );
}

export default function PublicCatalogApp() {
  if (!isCatalogPublicMvpEnabled() || !isCatalogMvpReadOnlyConfigurationSafe() ||
      import.meta.env.VITE_PREVIEW_READ_ONLY !== "true") {
    throw new Error("MVP público exige configuração somente leitura.");
  }
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="tonecos-catalog-theme">
        <BrowserRouter>
          <PublicRouteScrollReset />
          <CatalogBrowsingProvider>
            <ArcadeFrame nav={<ArcadeNavView />} footer={<ArcadeFooterView />}>
              <Suspense fallback={<div role="status" className="min-h-[50vh] p-12 text-center">Carregando catálogo...</div>}>
                <Routes>
                  <Route path={PUBLIC_ROUTES.home} element={<Home />} />
                  <Route path={PUBLIC_ROUTES.landing} element={<Home />} />
                  <Route path={PUBLIC_ROUTES.catalog} element={<Universe />} />
                  <Route path={PUBLIC_ROUTES.catalogUniverseTheme} element={<Universe />} />
                  <Route path={PUBLIC_ROUTES.catalogUniverseFranchise} element={<Universe />} />
                  <Route path={PUBLIC_ROUTES.catalogUniverseCharacter} element={<Universe />} />
                  <Route path={PUBLIC_ROUTES.catalogCharacter} element={<HistoricalCharacter />} />
                  <Route path={PUBLIC_ROUTES.catalogModels} element={<Models />} />
                  <Route path={PUBLIC_ROUTES.catalogDetails} element={<Details />} />
                  <Route path={PUBLIC_ROUTES.about} element={<About />} />
                  <Route path={PUBLIC_ROUTES.contact} element={<PublicCatalogContact />} />
                  <Route path={PUBLIC_ROUTES.privacy} element={<Privacy />} />
                  <Route path={PUBLIC_ROUTES.terms} element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ArcadeFrame>
          </CatalogBrowsingProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
