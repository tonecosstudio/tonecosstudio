import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSentry } from "@/hooks/use-sentry";
import { useAuthProfileSync } from "@/hooks/useAuthProfileSync";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import AdminHome from "./pages/admin/AdminHome";
import UploadQueue from "./pages/admin/UploadQueue";
import Conveyor from "./pages/admin/Conveyor";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import Quote from "./pages/Quote";
import QuoteCart from "./pages/QuoteCart";
import AdminQuotes from "./pages/admin/AdminQuotes";
import PublicProfile from "./pages/PublicProfile";
import RequireAdmin from "./components/RequireAdmin";
import RequireAuth from "./components/RequireAuth";
import About from "./pages/About";
import Profile from "./pages/Profile";
import ModelDetails from "./pages/catalog/ModelDetails";
import Collections from "./pages/Collections";
import CollectionDetails from "./pages/CollectionDetails";
import BuyCharacter from "./pages/BuyCharacter";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AuditTrail from "./pages/admin/AuditTrail";
import CollectionManagement from "./pages/admin/CollectionManagement";
import BonusPieces from "./pages/admin/BonusPieces";
import CapacityManagement from "./pages/admin/CapacityManagement";
import MySubscriptions from "./pages/MySubscriptions";
import MyPaymentsPage from "./pages/MyPaymentsPage";
import PaymentDetails from "./pages/PaymentDetails";
import SubscribeCollection from "./pages/SubscribeCollection";
import Wishlist from "./pages/Wishlist";
import Dashboard from "./pages/Dashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import PreorderCheckout from "./pages/PreorderCheckout";
import PreorderTracking from "./pages/PreorderTracking";
import PaymentPage from "./pages/PaymentPage";
import AdminPackaging from "./pages/admin/AdminPackaging";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPaymentHub from "./pages/admin/AdminPaymentHub";
import AdminCommunication from "./pages/admin/AdminCommunication";
import AdminCollectionsHub from "./pages/admin/AdminCollectionsHub";
import AdminFinancialHub from "./pages/admin/AdminFinancialHub";
import AdminQuickReplies from "./pages/admin/AdminQuickReplies";
import AdminGroupsPage from "./pages/admin/AdminGroupsPage";
import AdminGroupDetailsPage from "./pages/admin/AdminGroupDetailsPage";
import AdminHolidayManager from "./pages/admin/AdminHolidayManager";
import OrdersPage from "./pages/admin/OrdersPage";
import ProductionDashboardPage from "./pages/admin/ProductionDashboardPage";
import CharacterChoiceManagerPage from "./pages/admin/CharacterChoiceManagerPage";
import CustomerOrderProgressPage from "./pages/CustomerOrderProgressPage";
import AdminSubscriptionCreditDashboard from "./pages/admin/AdminSubscriptionCreditDashboard";
import AdminSubscriptionCreditSubscriptions from "./pages/admin/AdminSubscriptionCreditSubscriptions";
import AdminSubscriptionCreditCharacters from "./pages/admin/AdminSubscriptionCreditCharacters";
import AdminSubscriptionCreditCycles from "./pages/admin/AdminSubscriptionCreditCycles";
import AdminPlansConfiguration from "./pages/admin/AdminPlansConfiguration";
import SubscriptionCreditPanel from "./pages/SubscriptionCreditPanel";
import CharacterCatalog from "./pages/CharacterCatalog";

import MemberGroupsPage from "./pages/MemberGroupsPage";
import MemberGroupDetailsPage from "./pages/MemberGroupDetailsPage";
import Contact from "./pages/Contact";
import NotificationHistory from "./pages/NotificationHistory";
import LandingPage from "./pages/LandingPage";
import PreLaunch from "./pages/PreLaunch";
import MigratePedido from "./pages/MigratePedido";
import { ChatButton } from "@/components/customer/ChatButton";

const queryClient = new QueryClient();

function AppContent() {
  // Integra Sentry com autenticação
  useSentry();
  
  // Sincroniza profile após login OAuth
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
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home-antiga" element={<Home />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/pre-lancamento" element={<PreLaunch />} />
          <Route path="/migrar-pedido" element={<MigratePedido />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/catalogo/:id" element={<ModelDetails />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/colecoes" element={<Collections />} />
          <Route path="/colecoes/:slug" element={<CollectionDetails />} />
          <Route path="/colecoes/:slug/comprar" element={<BuyCharacter />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/collector/:username" element={<PublicProfile />} />

          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />

          <Route
            path="/orcamento"
            element={
              <RequireAuth>
                <Quote />
              </RequireAuth>
            }
          />

          <Route
            path="/orcamento/carrinho"
            element={
              <RequireAuth>
                <QuoteCart />
              </RequireAuth>
            }
          />

          <Route path="/suporte" element={<Navigate to="/perfil?section=support" replace />} />

          <Route
            path="/assinaturas"
            element={
              <RequireAuth>
                <MySubscriptions />
              </RequireAuth>
            }
          />

          <Route
            path="/pagamentos"
            element={
              <RequireAuth>
                <MyPaymentsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/pagamentos/:paymentId"
            element={
              <RequireAuth>
                <PaymentDetails />
              </RequireAuth>
            }
          />

          <Route
            path="/colecoes/:slug/assinar"
            element={
              <RequireAuth>
                <SubscribeCollection />
              </RequireAuth>
            }
          />

          <Route
            path="/wishlist"
            element={
              <RequireAuth>
                <Wishlist />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/notificacoes"
            element={
              <RequireAuth>
                <NotificationHistory />
              </RequireAuth>
            }
          />

          <Route
            path="/orcamento/checkout"
            element={
              <RequireAuth>
                <PreorderCheckout />
              </RequireAuth>
            }
          />

          <Route
            path="/orcamento/acompanhar/:quoteId"
            element={
              <RequireAuth>
                <PreorderTracking />
              </RequireAuth>
            }
          />

          <Route
            path="/pedido/:orderType/:orderId/progresso"
            element={
              <RequireAuth>
                <CustomerOrderProgressPage />
              </RequireAuth>
            }
          />

          <Route
            path="/orcamento/pagamento"
            element={
              <RequireAuth>
                <PaymentPage />
              </RequireAuth>
            }
          />

          <Route
            path="/grupos"
            element={
              <RequireAuth>
                <MemberGroupsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/grupos/:groupId"
            element={
              <RequireAuth>
                <MemberGroupDetailsPage />
              </RequireAuth>
            }
          />

          {/* Sistema de Créditos - Usuário */}
          <Route
            path="/painel-creditos"
            element={
              <RequireAuth>
                <SubscriptionCreditPanel />
              </RequireAuth>
            }
          />
          <Route
            path="/catalogo-personagens"
            element={
              <RequireAuth>
                <CharacterCatalog />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminHome />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <RequireAdmin>
                <UploadQueue />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/esteira"
            element={
              <RequireAdmin>
                <Conveyor />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AdminUsers />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <RequireAdmin>
                <AdminUserDetails />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/orcamentos"
            element={
              <RequireAdmin>
                <AdminQuotes />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/colecoes"
            element={<Navigate to="/admin/catalogo?tab=collections" replace />}
          />
          <Route
            path="/admin/catalogo"
            element={
              <RequireAdmin>
                <AdminCollectionsHub />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/modelos"
            element={<Navigate to="/admin/catalogo?tab=models" replace />}
          />
          <Route
            path="/admin/franquias"
            element={<Navigate to="/admin/catalogo?tab=models" replace />}
          />
          <Route
            path="/admin/modelos-franquias"
            element={<Navigate to="/admin/catalogo?tab=models" replace />}
          />
          <Route
            path="/admin/financeiro"
            element={<Navigate to="/admin/financeiro-hub?tab=collections" replace />}
          />
          <Route
            path="/admin/pre-vendas"
            element={<Navigate to="/admin/catalogo?tab=preorders" replace />}
          />
          <Route
            path="/admin/gerenciar-colecoes"
            element={<Navigate to="/admin/catalogo?tab=collections" replace />}
          />
          {/* Redirects de Preços para Página Única */}
          <Route
            path="/admin/precos"
            element={<Navigate to="/admin/planos" replace />}
          />
          <Route
            path="/admin/niveis-preco"
            element={<Navigate to="/admin/planos?tab=collection-pricing" replace />}
          />
          <Route
            path="/admin/precos-planos"
            element={<Navigate to="/admin/planos" replace />}
          />
          <Route
            path="/admin/precos-gerenciar"
            element={<Navigate to="/admin/planos?tab=collection-pricing" replace />}
          />
          <Route
            path="/admin/pricing"
            element={<Navigate to="/admin/planos?tab=collection-pricing" replace />}
          />
          <Route
            path="/admin/catalogo"
            element={
              <RequireAdmin>
                <AdminCollectionsHub />
              </RequireAdmin>
            }
          />
          {/* Hub Financeiro */}
          <Route
            path="/admin/financeiro-hub"
            element={
              <RequireAdmin>
                <AdminFinancialHub />
              </RequireAdmin>
            }
          />
          {/* Redirect Cupons para Financeiro */}
          <Route
            path="/admin/cupons"
            element={<Navigate to="/admin/financeiro-hub?tab=coupons" replace />}
          />
          <Route
            path="/admin/pedidos"
            element={
              <RequireAdmin>
                <OrdersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/producao"
            element={
              <RequireAdmin>
                <ProductionDashboardPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/escolhas-personagens"
            element={
              <RequireAdmin>
                <CharacterChoiceManagerPage />
              </RequireAdmin>
            }
          />
          {/* Sistema de Créditos - Admin */}
          <Route
            path="/admin/creditos/dashboard"
            element={
              <RequireAdmin>
                <AdminSubscriptionCreditDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/creditos/assinaturas"
            element={
              <RequireAdmin>
                <AdminSubscriptionCreditSubscriptions />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/creditos/personagens"
            element={
              <RequireAdmin>
                <AdminSubscriptionCreditCharacters />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/creditos/ciclos"
            element={
              <RequireAdmin>
                <AdminSubscriptionCreditCycles />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/creditos/planos"
            element={
              <RequireAdmin>
                <AdminPlansConfiguration />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/planos"
            element={
              <RequireAdmin>
                <AdminPlansConfiguration />
              </RequireAdmin>
            }
          />
          {/* Redirects das páginas antigas para a nova página consolidada */}
          <Route
            path="/admin/assinaturas"
            element={<Navigate to="/admin/pedidos?type=subscription" replace />}
          />
          <Route
            path="/admin/entregas"
            element={<Navigate to="/admin/pedidos?type=subscription" replace />}
          />
          <Route
            path="/admin/compras-avulsas"
            element={<Navigate to="/admin/pedidos?type=standalone" replace />}
          />
          <Route
            path="/admin/auditoria"
            element={
              <RequireAdmin>
                <AuditTrail />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/capacidade"
            element={
              <RequireAdmin>
                <CapacityManagement />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/pecas-bonus"
            element={
              <RequireAdmin>
                <BonusPieces />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/embalagem"
            element={
              <RequireAdmin>
                <AdminPackaging />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/cupons"
            element={<Navigate to="/admin/financeiro-hub?tab=coupons" replace />}
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireAdmin>
                <AdminAnalytics />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/configuracoes"
            element={
              <RequireAdmin>
                <AdminSettings />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/feriados"
            element={
              <RequireAdmin>
                <AdminHolidayManager />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/chaves-pagamento"
            element={<Navigate to="/admin/pagamentos?tab=keys" replace />}
          />
          {/* Redirects para compatibilidade com URLs antigas - Comunicação */}
          <Route
            path="/admin/notificacoes"
            element={<Navigate to="/admin/comunicacao?tab=notifications" replace />}
          />
          <Route
            path="/admin/notificacoes/historico"
            element={<Navigate to="/admin/comunicacao?tab=history" replace />}
          />
          {/* Redirects para compatibilidade com URLs antigas - Configurações */}
          <Route
            path="/admin/configuracoes-sistema"
            element={<Navigate to="/admin/configuracoes?tab=general" replace />}
          />
          <Route
            path="/admin/configuracoes-conteudo"
            element={<Navigate to="/admin/configuracoes?tab=content" replace />}
          />
          <Route
            path="/admin/limite-producao"
            element={<Navigate to="/admin/configuracoes?tab=production" replace />}
          />
          <Route
            path="/admin/conformidade-legal"
            element={<Navigate to="/admin/configuracoes?tab=legal" replace />}
          />
          <Route
            path="/admin/calculadora"
            element={<Navigate to="/admin/pagamentos?tab=calculator" replace />}
          />
          <Route
            path="/admin/pagamentos"
            element={
              <RequireAdmin>
                <AdminPaymentHub />
              </RequireAdmin>
            }
          />
          {/* Redirects para compatibilidade - Pagamentos */}
          <Route
            path="/admin/payments"
            element={<Navigate to="/admin/pagamentos?tab=payments" replace />}
          />
          <Route
            path="/admin/payments/:paymentId"
            element={<Navigate to="/admin/pagamentos?tab=payments" replace />}
          />
          <Route
            path="/admin/metodos-pagamento"
            element={<Navigate to="/admin/pagamentos?tab=methods" replace />}
          />
          <Route
            path="/admin/calculadora"
            element={<Navigate to="/admin/pagamentos?tab=calculator" replace />}
          />
          <Route
            path="/admin/comunicacao"
            element={
              <RequireAdmin>
                <AdminCommunication />
              </RequireAdmin>
            }
          />
          {/* Redirects para compatibilidade - Comunicação */}
          <Route
            path="/admin/suporte"
            element={<Navigate to="/admin/comunicacao?tab=support" replace />}
          />
          <Route
            path="/admin/grupos"
            element={<Navigate to="/admin/comunicacao?tab=groups" replace />}
          />
          <Route
            path="/admin/grupos/:groupId"
            element={
              <RequireAdmin>
                <AdminGroupDetailsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/respostas-rapidas"
            element={<Navigate to="/admin/comunicacao?tab=quick-replies" replace />}
          />
          <Route
            path="/admin/templates-comunicacao"
            element={<Navigate to="/admin/comunicacao?tab=templates" replace />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Floating chat button - disponível em todas as páginas para usuários autenticados */}
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
