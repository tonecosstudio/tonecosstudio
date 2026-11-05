/** Opt-in Tonecos commercial MVP. No public Pages preview enables this entry. */
import { lazy, type ReactNode } from "react";
import { Route } from "react-router-dom";
import { CatalogMvpShell } from "@/CatalogMvpShell";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import TonecosCommercialNav from "@/pages/commercial/TonecosCommercialNav";

const Account = lazy(() => import("@/pages/commercial/TonecosAccountPage"));
const Request = lazy(() => import("@/pages/commercial/TonecosQuoteRequestPage"));
const Quotes = lazy(() => import("@/pages/commercial/TonecosMyQuotesPage"));
const AdminQuotes = lazy(() => import("@/pages/commercial/TonecosAdminQuotesPage"));

const commercialRoutes: ReactNode = (
  <>
    <Route path="/login" element={<Account />} />
    <Route path="/perfil" element={<Account />} />
    <Route path="/orcamento" element={<Request />} />
    <Route path="/meus-orcamentos" element={<Quotes />} />
    <Route path="/admin/orcamentos" element={<AdminQuotes />} />
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
