/** Shared catalog shell: no Supabase, auth, quoting or commercial imports. */
import { Suspense, lazy, useLayoutEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ArcadeFrame } from "@/components/layouts/ArcadeFrame";
import { ArcadeNavView } from "@/components/arcade/ArcadeNavView";
import { ArcadeFooterView } from "@/components/arcade/ArcadeFooterView";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";
import { PUBLIC_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import PublicCatalogContact from "@/pages/PublicCatalogContact";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

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
    <section
      aria-labelledby="public-not-found-title"
      className="mx-auto flex min-h-[50vh] w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6 sm:py-16"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--gold-accent))]">
        ERRO 404
      </span>
      <h1
        id="public-not-found-title"
        className="text-2xl font-bold leading-tight text-[hsl(var(--gold-accent))] sm:text-3xl"
      >
        Página não encontrada
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(0,0%,65%)]">
        Esta página não faz parte do catálogo público.
      </p>
      <Link
        className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
        to={PUBLIC_ROUTES.catalogModels}
      >
        Ver modelos
      </Link>
    </section>
  );
}

export function CatalogMvpShell({
  navigation,
  extraRoutes,
}: { navigation?: ReactNode; extraRoutes?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="tonecos-catalog-theme">
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <PublicRouteScrollReset />
          <CatalogBrowsingProvider>
            <ArcadeFrame nav={navigation ?? <ArcadeNavView />} footer={<ArcadeFooterView />}>
              <Suspense fallback={<div role="status" className="min-h-[50vh] p-12 text-center">Carregando catálogo...</div>}>
                <Routes>
                  <Route path={PUBLIC_ROUTES.home} element={
                    import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true" &&
                    import.meta.env.VITE_CATALOG_GALLERY_HOME === "true"
                      ? <Navigate to={PUBLIC_ROUTES.catalogModels} replace />
                      : <Home />
                  } />
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
                  {import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" && (
                    <Route path={PUBLIC_ROUTES.quotePortal}
                      element={<Navigate to={TONECOS_COMMERCIAL_ROUTES.login} replace />} />
                  )}
                  <Route path={PUBLIC_ROUTES.privacy} element={<Privacy />} />
                  <Route path={PUBLIC_ROUTES.terms} element={<Terms />} />
                  {extraRoutes}
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
