/** Opt-in Tonecos commercial MVP. No public Pages preview enables this entry. */
import { lazy, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Route, useLocation } from "react-router-dom";
import { CatalogMvpShell } from "@/CatalogMvpShell";
import {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_SUBSCRIPTIONS_ENABLED,
  PUBLIC_ROUTES,
  TONECOS_COMMERCIAL_ROUTES,
  loginReturnToPath,
} from "@/config/routes";
import { hasTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  CommercialPage,
  secondaryClass,
} from "@/pages/commercial/CommercialPage";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { LOCAL_SUPABASE_FALLBACK, PREVIEW_READ_ONLY } from "@/config/supabase-environment";
import TonecosCommercialNav from "@/pages/commercial/TonecosCommercialNav";
import { TonartBlackFridayDriveProvider } from "@/components/catalog/TonartBlackFridayDriveProvider";

const Account = lazy(() => import("@/pages/commercial/TonecosAccountPage"));
const Recovery = lazy(
  () => import("@/pages/commercial/TonecosPasswordRecoveryPage"),
);
const Request = lazy(
  () => import("@/pages/commercial/TonecosQuoteRequestPage"),
);
const Quotes = lazy(() => import("@/pages/commercial/TonecosMyQuotesPage"));
const AdminQuotes = lazy(
  () => import("@/pages/commercial/TonecosAdminQuotesPage"),
);
const AdminHome = lazy(() => import("@/pages/commercial/TonecosAdminHomePage"));
const CustomerSections = lazy(
  () => import("@/pages/commercial/TonecosCustomerSections"),
);
const Coins = lazy(() => import("@/pages/commercial/TonecosCoinsPage"));
const AdminCoins = lazy(
  () => import("@/pages/commercial/TonecosAdminCoinsPage"),
);
const PaymentDetails = lazy(
  () => import("@/pages/commercial/TonecosPaymentDetailsPage"),
);
const AdminSubscriptionPayments = lazy(
  () => import("@/pages/commercial/TonecosAdminSubscriptionPaymentsPage"),
);
const AdminPaymentHub = lazy(
  () => import("@/pages/admin/payments/AdminPaymentHub"),
);
const SubscribeCollection = lazy(() => import("@/pages/SubscribeCollection"));
const SubscriptionUnavailable = lazy(
  () => import("@/pages/commercial/TonecosSubscriptionUnavailable"),
);

/** Central UI gate; the database remains the only authority for admin operations. */
function AdminAccessGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<
    "checking" | "guest" | "allowed" | "denied" | "error"
  >("checking");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const current = await getTonecosCurrentUser();
        if (!current) {
          if (mounted) setStatus("guest");
          return;
        }
        const allowed = await hasTonecosAdminAccess();
        if (mounted) setStatus(allowed ? "allowed" : "denied");
      } catch {
        if (mounted) setStatus("error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <CommercialPage
        title="Administração"
        intro="Verificando as permissões da conta..."
      >
        <p role="status">Verificando acesso administrativo...</p>
      </CommercialPage>
    );
  }
  if (status === "guest") {
    return (
      <Navigate
        to={loginReturnToPath(location.pathname + location.search)}
        replace
      />
    );
  }
  if (status === "allowed") return <>{children}</>;
  return (
    <CommercialPage
      title="Acesso administrativo"
      intro={
        status === "denied"
          ? "Sua conta não possui autorização administrativa ativa."
          : "Não foi possível validar a autorização neste momento."
      }
    >
      <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.account}>
        Minha conta
      </Link>
    </CommercialPage>
  );
}

const commercialRoutes: ReactNode = (
  <>
    <Route path={TONECOS_COMMERCIAL_ROUTES.login} element={<Account />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.account} element={<Account />} />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.account + "/conta"}
      element={<Navigate to={TONECOS_COMMERCIAL_ROUTES.account} replace />}
    />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.account + "/:section"}
      element={<CustomerSections />}
    />
    <Route path={AUTH_ROUTES.paymentDetails} element={<PaymentDetails />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.recovery} element={<Recovery />} />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.adminHome}
      element={
        <AdminAccessGate>
          <AdminHome />
        </AdminAccessGate>
      }
    />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.adminSubscriptions}
      element={
        <AdminAccessGate>
          {PUBLIC_SUBSCRIPTIONS_ENABLED ? (
            <AdminSubscriptionPayments />
          ) : (
            <SubscriptionUnavailable audience="admin" />
          )}
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.payments}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.paymentMethods}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.paymentKeys}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.paymentCalculator}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.preorders}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    <Route
      path={ADMIN_ROUTES.paymentDetails}
      element={
        <AdminAccessGate>
          <AdminPaymentHub />
        </AdminAccessGate>
      }
    />
    {/* Existing original backoffice paths share one guarded commercial workspace. */}
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.adminHome + "/*"}
      element={
        <AdminAccessGate>
          <AdminHome />
        </AdminAccessGate>
      }
    />
    <Route path={PUBLIC_ROUTES.quoteRequest} element={<Request />} />
    <Route path={TONECOS_COMMERCIAL_ROUTES.history} element={<Quotes />} />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
      element={
        <AdminAccessGate>
          <AdminQuotes />
        </AdminAccessGate>
      }
    />
    <Route path={TONECOS_COMMERCIAL_ROUTES.coins} element={<Coins />} />
    <Route
      path={TONECOS_COMMERCIAL_ROUTES.adminCoins}
      element={
        <AdminAccessGate>
          <AdminCoins />
        </AdminAccessGate>
      }
    />
    <Route
      path={PUBLIC_ROUTES.plans}
      element={
        PUBLIC_SUBSCRIPTIONS_ENABLED ? (
          <SubscribeCollection />
        ) : (
          <SubscriptionUnavailable />
        )
      }
    />
    <Route
      path={AUTH_ROUTES.subscribeCollection}
      element={
        PUBLIC_SUBSCRIPTIONS_ENABLED ? (
          <SubscribeCollection />
        ) : (
          <SubscriptionUnavailable />
        )
      }
    />
  </>
);

export default function TonecosCommercialApp() {
  if (
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP !== "true" ||
    import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true" ||
    (PREVIEW_READ_ONLY && !LOCAL_SUPABASE_FALLBACK)
  ) {
    throw new Error("tonecos_commercial_mvp_disabled");
  }
  assertTonecosCommercialEnabled();
  return (
    <TonartBlackFridayDriveProvider>
      <CatalogMvpShell
        navigation={<TonecosCommercialNav />}
        extraRoutes={commercialRoutes}
      />
    </TonartBlackFridayDriveProvider>
  );
}
