import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSentry } from "@/hooks/use-sentry";
import { useAuthProfileSync } from "@/hooks/useAuthProfileSync";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import { ChatButton } from "@/components/customer/ChatButton";

// ─── Lazy-loaded pages ───────────────────────────────────────────────
const LandingPage = lazy(() => import("./pages/LandingPage"));
const CatalogArcade = lazy(() => import("./pages/CatalogArcade"));
const ModelDetails = lazy(() => import("./pages/catalog/ModelDetails"));
const AboutArcade = lazy(() => import("./pages/AboutArcade"));
const PlansArcade = lazy(() => import("./pages/PlansArcade"));
const CollectionsShowcase = lazy(() => import("./pages/CollectionsShowcase"));
const CollectionsArcade = lazy(() => import("./pages/CollectionsArcade"));
const CharacterDetails = lazy(() => import("./pages/CharacterDetails"));
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
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const AuditTrail = lazy(() => import("./pages/admin/AuditTrail"));
const AdminCreditsHub = lazy(() => import("./pages/admin/AdminCreditsHub"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminPackaging = lazy(() => import("./pages/admin/AdminPackaging"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPaymentHub = lazy(() => import("./pages/admin/AdminPaymentHub"));
const AdminCommunication = lazy(() => import("./pages/admin/AdminCommunication"));
const AdminCollectionsHub = lazy(() => import("./pages/admin/AdminCollectionsHub"));
const AdminFinancialHub = lazy(() => import("./pages/admin/AdminFinancialHub"));
const AdminGroupDetailsPage = lazy(() => import("./pages/admin/AdminGroupDetailsPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const ProductionHub = lazy(() => import("./pages/admin/ProductionHub"));

// ─── Loading fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

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
        <SidebarProvider defaultOpen={false}>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              {/* Global sidebar trigger */}
              <div className="sticky top-0 z-50 flex items-center h-12 border-b border-border/30 bg-background/80 backdrop-blur-md px-2 md:hidden">
                <SidebarTrigger />
              </div>
              <div className="hidden md:flex sticky top-0 z-50 items-center h-10 px-2">
                <SidebarTrigger />
              </div>

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/migrar-pedido" element={<MigratePedido />} />
                  <Route path="/catalogo" element={<CatalogArcade />} />
                  <Route path="/catalogo/:id" element={<ModelDetails />} />
                  <Route path="/sobre" element={<AboutArcade />} />
                  <Route path="/planos" element={<PlansArcade />} />
                  <Route path="/colecoes" element={<CollectionsShowcase />} />
                  <Route path="/colecoes-arcade" element={<CollectionsArcade />} />
                  <Route path="/colecoes/:slug/:characterId" element={<CharacterDetails />} />
                  <Route path="/personagem/:characterId" element={<CharacterDetails />} />
                  <Route path="/selecionar-personagem" element={<CharacterSelect />} />
                  <Route path="/colecoes/:slug" element={<CollectionDetailsArcade />} />
                  <Route path="/colecoes/:slug/comprar" element={<BuyCharacter />} />
                  <Route path="/termos" element={<TermsArcade />} />
                  <Route path="/privacidade" element={<PrivacyArcade />} />
                  <Route path="/contato" element={<ContactArcade />} />
                  <Route path="/login" element={<LoginArcade />} />
                  <Route path="/collector/:username" element={<PublicProfileArcade />} />
                  <Route path="/pre-lancamento" element={<PreLaunchArcade />} />

                  {/* Auth-required */}
                  <Route path="/perfil" element={<RequireAuth><ProfileArcade /></RequireAuth>} />
                  <Route path="/suporte" element={<Navigate to="/perfil?section=support" replace />} />
                  <Route path="/pagamentos" element={<RequireAuth><MyPaymentsArcade /></RequireAuth>} />
                  <Route path="/pagamentos/:paymentId" element={<RequireAuth><PaymentDetails /></RequireAuth>} />
                  <Route path="/colecoes/:slug/assinar" element={<RequireAuth><SubscribeCollection /></RequireAuth>} />
                  <Route path="/wishlist" element={<RequireAuth><WishlistArcade /></RequireAuth>} />
                  <Route path="/dashboard" element={<RequireAuth><DashboardArcade /></RequireAuth>} />
                  <Route path="/notificacoes" element={<RequireAuth><NotificationsArcade /></RequireAuth>} />
                  <Route path="/pedido/:orderType/:orderId/progresso" element={<RequireAuth><CustomerOrderProgressPage /></RequireAuth>} />
                  <Route path="/grupos" element={<RequireAuth><GroupsArcade /></RequireAuth>} />
                  <Route path="/grupos/:groupId" element={<RequireAuth><MemberGroupDetailsPage /></RequireAuth>} />
                  <Route path="/painel-assinante" element={<RequireAuth><SubscriberDashboardArcade /></RequireAuth>} />
                  <Route path="/coins/purchase" element={<RequireAuth><CoinsPurchaseArcade /></RequireAuth>} />

                  {/* Redirects de compatibilidade */}
                  <Route path="/assinaturas" element={<Navigate to="/painel-assinante" replace />} />
                  <Route path="/planos-assinatura" element={<Navigate to="/planos" replace />} />

                  {/* Admin */}
                  <Route path="/admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
                  <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
                  <Route path="/admin/users/:userId" element={<RequireAdmin><AdminUserDetails /></RequireAdmin>} />
                  <Route path="/admin/catalogo" element={<RequireAdmin><AdminCollectionsHub /></RequireAdmin>} />
                  <Route path="/admin/financeiro-hub" element={<RequireAdmin><AdminFinancialHub /></RequireAdmin>} />
                  <Route path="/admin/pedidos" element={<RequireAdmin><OrdersPage /></RequireAdmin>} />
                  <Route path="/admin/producao" element={<RequireAdmin><ProductionHub /></RequireAdmin>} />
                  <Route path="/admin/creditos" element={<RequireAdmin><AdminCreditsHub /></RequireAdmin>} />
                  <Route path="/admin/auditoria" element={<RequireAdmin><AuditTrail /></RequireAdmin>} />
                  <Route path="/admin/embalagem" element={<RequireAdmin><AdminPackaging /></RequireAdmin>} />
                  <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
                  <Route path="/admin/configuracoes" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
                  <Route path="/admin/pagamentos" element={<RequireAdmin><AdminPaymentHub /></RequireAdmin>} />
                  <Route path="/admin/comunicacao" element={<RequireAdmin><AdminCommunication /></RequireAdmin>} />
                  <Route path="/admin/grupos/:groupId" element={<RequireAdmin><AdminGroupDetailsPage /></RequireAdmin>} />

                  {/* Admin redirects */}
                  <Route path="/admin/colecoes" element={<Navigate to="/admin/catalogo?tab=collections" replace />} />
                  <Route path="/admin/financeiro" element={<Navigate to="/admin/financeiro-hub?tab=collections" replace />} />
                  <Route path="/admin/pre-vendas" element={<Navigate to="/admin/catalogo?tab=preorders" replace />} />
                  <Route path="/admin/gerenciar-colecoes" element={<Navigate to="/admin/catalogo?tab=collections" replace />} />
                  <Route path="/admin/precos" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/niveis-preco" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/precos-planos" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/precos-gerenciar" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/pricing" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/fila-producao" element={<Navigate to="/admin/producao?tab=production&view=list" replace />} />
                  <Route path="/admin/escolhas-personagens" element={<Navigate to="/admin/producao?tab=choices" replace />} />
                  <Route path="/admin/creditos/planos" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/planos" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/planos-configuracao" element={<Navigate to="/admin/creditos?tab=plans" replace />} />
                  <Route path="/admin/creditos/dashboard" element={<Navigate to="/admin/creditos" replace />} />
                  <Route path="/admin/creditos/analytics" element={<Navigate to="/admin/creditos?tab=analytics" replace />} />
                  <Route path="/admin/creditos/personagens" element={<Navigate to="/admin/catalogo?tab=credit-characters" replace />} />
                  <Route path="/admin/coins" element={<Navigate to="/admin/creditos?tab=coins" replace />} />
                  <Route path="/admin/ciclos" element={<Navigate to="/admin/creditos?tab=cycles" replace />} />
                  <Route path="/admin/assinaturas" element={<Navigate to="/admin/pedidos?type=subscription" replace />} />
                  <Route path="/admin/assinaturas-gerenciar" element={<Navigate to="/admin/pedidos?type=subscription" replace />} />
                  <Route path="/admin/entregas" element={<Navigate to="/admin/pedidos?type=subscription" replace />} />
                  <Route path="/admin/compras-avulsas" element={<Navigate to="/admin/pedidos?type=standalone" replace />} />
                  <Route path="/admin/creditos/assinaturas" element={<Navigate to="/admin/pedidos?type=subscription" replace />} />
                  <Route path="/admin/feriados" element={<Navigate to="/admin/configuracoes?tab=holidays" replace />} />
                  <Route path="/admin/chaves-pagamento" element={<Navigate to="/admin/pagamentos?tab=keys" replace />} />
                  <Route path="/admin/notificacoes" element={<Navigate to="/admin/comunicacao?tab=notifications" replace />} />
                  <Route path="/admin/notificacoes/historico" element={<Navigate to="/admin/comunicacao?tab=history" replace />} />
                  <Route path="/admin/configuracoes-sistema" element={<Navigate to="/admin/configuracoes?tab=general" replace />} />
                  <Route path="/admin/configuracoes-conteudo" element={<Navigate to="/admin/configuracoes?tab=content" replace />} />
                  <Route path="/admin/limite-producao" element={<Navigate to="/admin/configuracoes?tab=production" replace />} />
                  <Route path="/admin/conformidade-legal" element={<Navigate to="/admin/configuracoes?tab=legal" replace />} />
                  <Route path="/admin/calculadora" element={<Navigate to="/admin/pagamentos?tab=calculator" replace />} />
                  <Route path="/admin/payments" element={<Navigate to="/admin/pagamentos?tab=payments" replace />} />
                  <Route path="/admin/payments/:paymentId" element={<Navigate to="/admin/pagamentos?tab=payments" replace />} />
                  <Route path="/admin/metodos-pagamento" element={<Navigate to="/admin/pagamentos?tab=methods" replace />} />
                  <Route path="/admin/suporte" element={<Navigate to="/admin/comunicacao?tab=support" replace />} />
                  <Route path="/admin/grupos" element={<Navigate to="/admin/comunicacao?tab=groups" replace />} />
                  <Route path="/admin/respostas-rapidas" element={<Navigate to="/admin/comunicacao?tab=quick-replies" replace />} />
                  <Route path="/admin/templates-comunicacao" element={<Navigate to="/admin/comunicacao?tab=templates" replace />} />

                  {/* 404 */}
                  <Route path="*" element={<NotFoundArcade />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </SidebarProvider>

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
