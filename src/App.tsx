import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAuthProfileSync } from "@/hooks/useAuthProfileSync";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layouts/MainLayout";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import { CustomerChat } from "@/components/customer/CustomerChat";
import {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
} from "@/config/routes";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const ArcadeLab = lazy(() => import("./pages/ArcadeLab"));
const CatalogArcade = lazy(() => import("./pages/CatalogArcade"));
const CatalogModelsArcade = lazy(() => import("./pages/CatalogModelsArcade"));
const CatalogCharacterArcade = lazy(() => import("./pages/CatalogCharacterArcade"));
const ModelDetails = lazy(() => import("./pages/catalog/ModelDetailsRoute"));
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
const PreLaunchArcade = lazy(() => import("./pages/PreLaunchArcade"));
const NotFoundArcade = lazy(() => import("./pages/NotFoundArcade"));
const MigratePedido = lazy(() => import("./pages/MigratePedido"));

const ProfileArcade = lazy(() => import("./pages/ProfileArcade"));
const PaymentDetails = lazy(() => import("./pages/PaymentDetails"));
const SubscribeCollection = lazy(() => import("./pages/SubscribeCollection"));
const WishlistArcade = lazy(() => import("./pages/WishlistArcade"));
const DashboardArcade = lazy(() => import("./pages/DashboardArcade"));
const NotificationsArcade = lazy(() => import("./pages/NotificationsArcade"));
const CustomerOrderProgressPage = lazy(() => import("./pages/CustomerOrderProgressPage"));
const GroupsArcade = lazy(() => import("./pages/GroupsArcade"));
const MemberGroupDetailsPage = lazy(() => import("./pages/MemberGroupDetailsPage"));
const SubscriberDashboardArcade = lazy(() => import("./pages/SubscriberDashboardArcade"));

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

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const queryClient = new QueryClient();

function HiddenCollectionsPage() {
  return <NotFoundArcade />;
}

function AppContent() {
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
              <Route path={PUBLIC_ROUTES.home} element={<LandingPage />} />
              <Route path={PUBLIC_ROUTES.landing} element={<LandingPage />} />
              <Route path={PUBLIC_ROUTES.arcadeLab} element={<ArcadeLab />} />
              <Route
                path={PUBLIC_ROUTES.migrateOrder}
                element={
                  <RequireAuth>
                    <MigratePedido />
                  </RequireAuth>
                }
              />
              <Route path={PUBLIC_ROUTES.catalog} element={<CatalogArcade />} />
              <Route path={PUBLIC_ROUTES.catalogUniverseTheme} element={<CatalogArcade />} />
              <Route path={PUBLIC_ROUTES.catalogUniverseFranchise} element={<CatalogArcade />} />
              <Route path={PUBLIC_ROUTES.catalogUniverseCharacter} element={<CatalogArcade />} />
              <Route path={PUBLIC_ROUTES.catalogModels} element={<CatalogModelsArcade />} />
              <Route path={PUBLIC_ROUTES.catalogCharacter} element={<CatalogCharacterArcade />} />
              <Route path={PUBLIC_ROUTES.catalogDetails} element={<ModelDetails />} />
              <Route path={PUBLIC_ROUTES.about} element={<AboutArcade />} />
              <Route
                path={PUBLIC_ROUTES.plans}
                element={PUBLIC_COLLECTIONS_ENABLED ? <PlansArcade /> : <HiddenCollectionsPage />}
              />
              <Route
                path={PUBLIC_ROUTES.collections}
                element={
                  PUBLIC_COLLECTIONS_ENABLED ? <CollectionsShowcase /> : <HiddenCollectionsPage />
                }
              />
              <Route
                path={PUBLIC_ROUTES.collectionsArcade}
                element={PUBLIC_COLLECTIONS_ENABLED ? <CollectionsArcade /> : <HiddenCollectionsPage />}
              />
              <Route
                path={PUBLIC_ROUTES.collectionCharacterDetails}
                element={PUBLIC_COLLECTIONS_ENABLED ? <CharacterDetails /> : <HiddenCollectionsPage />}
              />
              <Route
                path={PUBLIC_ROUTES.characterDetails}
                element={PUBLIC_COLLECTIONS_ENABLED ? <CharacterDetails /> : <HiddenCollectionsPage />}
              />
              <Route path={PUBLIC_ROUTES.characterSelect} element={<CharacterSelect />} />
              <Route
                path={PUBLIC_ROUTES.collectionDetails}
                element={
                  PUBLIC_COLLECTIONS_ENABLED ? <CollectionDetailsArcade /> : <HiddenCollectionsPage />
                }
              />
              <Route
                path={PUBLIC_ROUTES.buyCharacter}
                element={PUBLIC_COLLECTIONS_ENABLED ? <BuyCharacter /> : <HiddenCollectionsPage />}
              />
              <Route path={PUBLIC_ROUTES.terms} element={<TermsArcade />} />
              <Route path={PUBLIC_ROUTES.privacy} element={<PrivacyArcade />} />
              <Route path={PUBLIC_ROUTES.contact} element={<ContactArcade />} />
              <Route path={PUBLIC_ROUTES.login} element={<LoginArcade />} />
              <Route
                path={PUBLIC_ROUTES.preLaunch}
                element={PUBLIC_COLLECTIONS_ENABLED ? <PreLaunchArcade /> : <HiddenCollectionsPage />}
              />

              <Route
                path={AUTH_ROUTES.profile}
                element={
                  <RequireAuth>
                    <ProfileArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.profileSection}
                element={
                  <RequireAuth>
                    <ProfileArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.paymentDetails}
                element={
                  <RequireAuth>
                    <PaymentDetails />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.subscribeCollection}
                element={
                  PUBLIC_COLLECTIONS_ENABLED ? (
                    <RequireAuth>
                      <SubscribeCollection />
                    </RequireAuth>
                  ) : (
                    <HiddenCollectionsPage />
                  )
                }
              />
              <Route
                path={AUTH_ROUTES.wishlist}
                element={
                  <RequireAuth>
                    <WishlistArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.dashboard}
                element={
                  <RequireAuth>
                    <DashboardArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.notifications}
                element={
                  <RequireAuth>
                    <NotificationsArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.orderProgress}
                element={
                  <RequireAuth>
                    <CustomerOrderProgressPage />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.groups}
                element={
                  <RequireAuth>
                    <GroupsArcade />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.groupDetails}
                element={
                  <RequireAuth>
                    <MemberGroupDetailsPage />
                  </RequireAuth>
                }
              />
              <Route
                path={AUTH_ROUTES.subscriberDashboard}
                element={
                  PUBLIC_COLLECTIONS_ENABLED ? (
                    <RequireAuth>
                      <SubscriberDashboardArcade />
                    </RequireAuth>
                  ) : (
                    <HiddenCollectionsPage />
                  )
                }
              />

              <Route path={ADMIN_ROUTES.home} element={<RequireAdmin><AdminHome /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.users} element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.userDetails} element={<RequireAdmin><AdminUserDetails /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.userDetailsSection} element={<RequireAdmin><AdminUserDetails /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.catalog} element={<RequireAdmin><AdminCollectionsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.catalogCollections} element={<RequireAdmin><AdminCollectionsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.catalogCreditCharacters} element={<RequireAdmin><AdminCollectionsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.financialHub} element={<RequireAdmin><AdminFinancialHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.financialCollections} element={<RequireAdmin><AdminFinancialHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.orders} element={<RequireAdmin><OrdersPage /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.production} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.productionKanban} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.productionList} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.productionCalendar} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.productionAnalytics} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.productionChoices} element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.credits} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.creditsCoins} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.creditsCycles} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.creditsPlans} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.creditsAnalytics} element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.audit} element={<RequireAdmin><AuditTrail /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.packaging} element={<RequireAdmin><AdminPackaging /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.analytics} element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.settings} element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.settingsOperational} element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.settingsHolidays} element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.settingsLegal} element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.payments} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.paymentMethods} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.paymentKeys} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.paymentCalculator} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.paymentDetails} element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communication} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationGroups} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationQuickReplies} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationTemplates} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationNotifications} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationHistory} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.communicationConversation} element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
              <Route path={ADMIN_ROUTES.groupDetails} element={<RequireAdmin><AdminGroupDetailsPage /></RequireAdmin>} />

              <Route path="*" element={<NotFoundArcade />} />
            </Routes>
          </Suspense>
        </MainLayout>
        <CustomerChat />
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
