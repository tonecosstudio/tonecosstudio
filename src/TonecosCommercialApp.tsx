/** Opt-in Tonecos commercial MVP. No public Pages preview enables this entry. */
import { lazy, type ReactNode } from "react";
import { Route } from "react-router-dom";
import { CatalogMvpShell } from "@/CatalogMvpShell";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import TonecosCommercialNav from "@/pages/commercial/TonecosCommercialNav";

const Account = lazy(() => import("@/pages/commercial/TonecosAccountPage"));
const Request = lazy(() => import("@/pages/commercial/TonecosQuoteRequestPage"));
const Quotes = lazy(() => import("@/pages/commercial/TonecosMyQuotesPage"));
const AdminQuotes = lazy(() => import("@/pages/commercial/TonecosAdminQuotesPage"));
const Coins = lazy(() => import("@/pages/commercial/TonecosCoinsPage"));

const commercialRoutes: ReactNode = (
  <>
    <Route path={TONECOS_COMMERCIAL_ROUTES.login} element={<Account />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.account} element={<Account />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.request} element={<Request />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.history} element={<Quotes />} />
    {import.meta.env.VITE_TONECOS_COINS_ENABLED === "true" &&
      <Route path={TONECOS_COMMERCIAL_ROUTES.coins} element={<Coins />} />}
    <Route path={TONECOS_COMMERCIAL_ROUTES.adminQuotes} element={<AdminQuotes />} />
  </>
);

export default function TonecosCommercialApp() {
  if (import.meta.env.VITE_TONECOS_COMMERCIAL_MVP !== "true" ||
      import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true" ||
      import.meta.env.VITE_PREVIEW_READ_ONLY !== "false") {
    throw new Error("tonecos_commercial_mvp_disabled");
  }
  assertTonecosCommercialEnabled();
  return (
    <CatalogMvpShell
      navigation={<TonecosCommercialNav />}
      extraRoutes={commercialRoutes}
    />
  );
}
