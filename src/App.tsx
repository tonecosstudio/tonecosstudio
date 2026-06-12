import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useSentry } from "@/hooks/use-sentry";
import { useAuthProfileSync } from "@/hooks/useAuthProfileSync";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layouts/MainLayout";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import { ChatButton } from "@/components/customer/ChatButton";
import {
  ADMIN_REDIRECTS,
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  adminPaymentDetailsPath,
  catalogModelDetailsPath,
} from "@/config/routes";

// ─── Lazy-loaded pages ───────────────────────────────────────────────
const LandingPage = lazy(() => import("./pages/LandingPage"));
const CatalogArcade = lazy(() => import("./pages/CatalogArcade"));
const ModelDetails = lazy(() => import("./pages/catalog/ModelDetails"));
const AboutArcade = lazy(() => import("./pages/AboutArcade"));
const PlansArcade = lazy(() => import("./pages/PlansArcade"));
const CollectionsShowcase = lazy(() => import("./pages/CollectionsShowcase"));
const CollectionsArcade = lazy(() => import("./pages/CollectionsArcade"));
const CharacterDetails = lazy(() => import("./pages/CharacterDetailsArcade"));
const CharacterSelect = lazy(() => import("./pages/CharacterSelect"));
const CollectionDetailsArcade = lazy(() => import("./pages/CollectionDetailsArcade"));
const BuyCharacter = lazy(() => import("./pages/BuyCharacter"));
const TermsArcade = lazy(() => import("./pages/TermsArcade"));
const PrivacyArcade = lazy(() => import("./pages/PrivacyArcade"));
const ContactArcade = lazy(() => import("./pages/ContactArcade"));
const LoginArcade = lazy(() => import("./pages/LoginArcade"));
const PublicProfileArcade = lazy(() => import("./pages/PublicProfileArcade"));
const PreLaunchArcade = lazy(() => import("./pages/PreLaunchArcade"));
const NotFoundArcade = lazy(() => import("./pages/NotFoundArcade"));
const MigratePedido = lazy(() => import("./pages/MigratePedido"));

// Auth-required pages
const ProfileArcade = lazy(() => import("./pages/ProfileArcade"));
const MyPaymentsArcade = lazy(() => import("./pages/MyPaymentsArcade"));
const PaymentDetails = lazy(() => import("./pages/PaymentDetails"));
const SubscribeCollection = lazy(() => import("./pages/SubscribeCollection"));
const WishlistArcade = lazy(() => import("./pages/WishlistArcade"));
const DashboardArcade = lazy(() => import("./pages/DashboardArcade"));
const NotificationsArcade = lazy(() => import("./pages/NotificationsArcade"));
const CustomerOrderProgressPage = lazy(() => import("./pages/CustomerOrderProgressPage"));
const GroupsArcade = lazy(() => import("./pages/GroupsArcade"));
const MemberGroupDetailsPage = lazy(() => import("./pages/MemberGroupDetailsPage"));
const SubscriberDashboardArcade = lazy(() => import("./pages/SubscriberDashboardArcade"));
const CoinsPurchaseArcade = lazy(() => import("./pages/CoinsPurchaseArcade"));

// Admin pages
const AdminHome = lazy(() => import("./pages/admin/analytics/AdminHome"));
const AdminUsers = lazy(() => import("./pages/admin/users/AdminUsers"));
const AdminUserDetails = lazy(() => import("./pages/admin/users/AdminUserDetails"));
const AuditTrail = lazy(() => import("./pages/admin/settings/AuditTrail"));
const AdminCreditsHub = lazy(() => import("./pages/admin/credits/AdminCreditsHub"));
const AdminAnalytics = lazy(() => import("./pages/admin/analytics/AdminAnalytics"));
const AdminPackaging = lazy(() => import("./pages/admin/production/AdminPackaging"));
const AdminSettings = lazy(() => import("./pages/admin/settings/AdminSettings"));
const AdminPaymentHub = lazy(() => import("./pages/admin/payments/AdminPaymentHub"));
const AdminCommunication = lazy(() => import("./pages/admin/support/AdminCommunication"));
const AdminCollectionsHub = lazy(() => import("./pages/admin/collections/AdminCollectionsHub"));
const AdminFinancialHub = lazy(() => import("./pages/admin/payments/AdminFinancialHub"));
const AdminGroupDetailsPage = lazy(() => import("./pages/admin/users/AdminGroupDetailsPage"));
const OrdersPage = lazy(() => import("./pages/admin/production/OrdersPage"));
const ProductionHub = lazy(() => import("./pages/admin/production/ProductionHub"));

// ─── Loading fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

function LegacyAdminPaymentRedirect() {
  const { paymentId } = useParams<{ paymentId?: string }>();

  return (
    <Navigate
      to={paymentId ? adminPaymentDetailsPath(paymentId) : `${ADMIN_ROUTES.payments}?tab=payments`}
      replace
    />
  );
}

function LegacyCatalogRedirect() {
  const { id } = useParams<{ id?: string }>();

  return (
    <Navigate
      to={id ? catalogModelDetailsPath(id) : PUBLIC_ROUTES.catalog}
      replace
    />
  );
}

function AppContent() {
  useSentry();
  useAuthProfileSync();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public */}
            <Route path={PUBLIC_ROUTES.home} element={<LandingPage />} />
            <Route path={PUBLIC_ROUTES.landing} element={<LandingPage />} />
            <Route path={PUBLIC_ROUTES.migrateOrder} element={<RequireAuth><MigratePedido /></RequireAuth>} />
            <Route path={PUBLIC_ROUTES.catalog} element={<CatalogArcade />} />
            <Route path={PUBLIC_ROUTES.catalogDetails} element={<ModelDetails />} />
            <Route path={PUBLIC_ROUTES.legacyCatalog} element={<Navigate to={PUBLIC_ROUTES.catalog} replace />} />
            <Route path={PUBLIC_ROUTES.legacyCatalogDetails} element={<LegacyCatalogRedirect />} />
            <Route path={PUBLIC_ROUTES.about} element={<AboutArcade />} />
            <Route path={PUBLIC_ROUTES.plans} element={<PlansArcade />} />
            <Route path={PUBLIC_ROUTES.collections} element={<CollectionsShowcase />} />
            <Route path={PUBLIC_ROUTES.collectionsArcade} element={<CollectionsArcade />} />
            <Route path={PUBLIC_ROUTES.collectionCharacterDetails} element={<CharacterDetails />} />
            <Route path={PUBLIC_ROUTES.characterDetails} element={<CharacterDetails />} />
            <Route path={PUBLIC_ROUTES.characterSelect} element={<CharacterSelect />} />
            <Route path={PUBLIC_ROUTES.collectionDetails} element={<CollectionDetailsArcade />} />
            <Route path={PUBLIC_ROUTES.buyCharacter} element={<BuyCharacter />} />
            <Route path={PUBLIC_ROUTES.terms} element={<TermsArcade />} />
            <Route path={PUBLIC_ROUTES.privacy} element={<PrivacyArcade />} />
            <Route path={PUBLIC_ROUTES.contact} element={<ContactArcade />} />
            <Route path={PUBLIC_ROUTES.login} element={<LoginArcade />} />
            <Route path={PUBLIC_ROUTES.publicProfile} element={<PublicProfileArcade />} />
            <Route path={PUBLIC_ROUTES.preLaunch} element={<PreLaunchArcade />} />

            {/* Auth-required */}
            <Route path={AUTH_ROUTES.profile} element={<RequireAuth><ProfileArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.support} element={<Navigate to={`${AUTH_ROUTES.profile}?section=support`} replace />} />
            <Route path={AUTH_ROUTES.payments} element={<RequireAuth><MyPaymentsArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.paymentDetails} element={<RequireAuth><PaymentDetails /></RequireAuth>} />
            <Route path={AUTH_ROUTES.subscribeCollection} element={<RequireAuth><SubscribeCollection /></RequireAuth>} />
            <Route path={AUTH_ROUTES.wishlist} element={<RequireAuth><WishlistArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.dashboard} element={<RequireAuth><DashboardArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.notifications} element={<RequireAuth><NotificationsArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.orderProgress} element={<RequireAuth><CustomerOrderProgressPage /></RequireAuth>} />
            <Route path={AUTH_ROUTES.groups} element={<RequireAuth><GroupsArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.groupDetails} element={<RequireAuth><MemberGroupDetailsPage /></RequireAuth>} />
            <Route path={AUTH_ROUTES.subscriberDashboard} element={<RequireAuth><SubscriberDashboardArcade /></RequireAuth>} />
            <Route path={AUTH_ROUTES.coinsPurchase} element={<RequireAuth><CoinsPurchaseArcade /></RequireAuth>} />

            {/* Redirects de compatibilidade */}
            <Route path="/assinaturas" element={<Navigate to={AUTH_ROUTES.subscriberDashboard} replace />} />
            <Route path="/planos-assinatura" element={<Navigate to={PUBLIC_ROUTES.plans} replace />} />

            {/* Admin */}
            <Route path={ADMIN_ROUTES.home} element={<RequireAdmin><AdminHome /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.users} element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.userDetails} element={<RequireAdmin><AdminUserDetails /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.catalog} element={<RequireAdmin><AdminCollectionsHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.financialHub} element={<RequireAdmin><AdminFinancialHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.orders} element={<RequireAdmin><OrdersPage /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.production} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.credits} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.audit} element={<RequireAdmin><AuditTrail /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.packaging} element={<RequireAdmin><AdminPackaging /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.analytics} element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.settings} element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.payments} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.paymentDetails} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.communication} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
            <Route path={ADMIN_ROUTES.groupDetails} element={<RequireAdmin><AdminGroupDetailsPage /></RequireAdmin>} />

            {/* Admin redirects */}
            <Route path="/admin/payments/:paymentId" element={<RequireAdmin><LegacyAdminPaymentRedirect /></RequireAdmin>} />
            {ADMIN_REDIRECTS.map(({ from, to }) => (
              <Route key={from} path={from} element={<RequireAdmin><Navigate to={to} replace /></RequireAdmin>} />
            ))}

            {/* 404 */}
            <Route path="*" element={<NotFoundArcade />} />
          </Routes>
        </Suspense>
        </MainLayout>

        <ChatButton />
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="ordax-ui-theme">
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
