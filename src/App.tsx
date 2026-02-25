import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSentry } from "@/hooks/use-sentry";
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
import AdminModels from "./pages/admin/AdminModels";
import AdminFranchises from "./pages/admin/AdminFranchises";
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
import AdminCollections from "./pages/admin/AdminCollections";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminCoupons from "./pages/admin/AdminCoupons";
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
import AdminPreorders from "./pages/admin/AdminPreorders";
import AdminPackaging from "./pages/admin/AdminPackaging";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotificationSettings from "./pages/admin/AdminNotificationSettings";
import AdminNotificationHistory from "./pages/admin/AdminNotificationHistory";
import AdminPaymentHub from "./pages/admin/AdminPaymentHub";
import AdminCommunication from "./pages/admin/AdminCommunication";
import AdminCollectionFinancials from "./pages/admin/AdminCollectionFinancials";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminQuickReplies from "./pages/admin/AdminQuickReplies";
import AdminGroupsPage from "./pages/admin/AdminGroupsPage";
import AdminGroupDetailsPage from "./pages/admin/AdminGroupDetailsPage";
import MemberGroupsPage from "./pages/MemberGroupsPage";
import MemberGroupDetailsPage from "./pages/MemberGroupDetailsPage";
import Contact from "./pages/Contact";
import { ChatButton } from "@/components/customer/ChatButton";

const queryClient = new QueryClient();

function AppContent() {
  // Integra Sentry com autenticação
  useSentry();

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
          <Route path="/" element={<Home />} />
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
            path="/admin/modelos"
            element={
              <RequireAdmin>
                <AdminModels />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/franquias"
            element={
              <RequireAdmin>
                <AdminFranchises />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/colecoes"
            element={
              <RequireAdmin>
                <AdminCollections />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/planos"
            element={
              <RequireAdmin>
                <AdminPlans />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/assinaturas"
            element={
              <RequireAdmin>
                <AdminSubscriptions />
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
            element={
              <RequireAdmin>
                <AdminCoupons />
              </RequireAdmin>
            }
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
            path="/admin/pre-vendas"
            element={
              <RequireAdmin>
                <AdminPreorders />
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
            path="/admin/notificacoes"
            element={
              <RequireAdmin>
                <AdminNotificationSettings />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/notificacoes/historico"
            element={
              <RequireAdmin>
                <AdminNotificationHistory />
              </RequireAdmin>
            }
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
            path="/admin/precos"
            element={<Navigate to="/admin/configuracoes?tab=pricing" replace />}
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
            path="/admin/financeiro"
            element={
              <RequireAdmin>
                <AdminCollectionFinancials />
              </RequireAdmin>
            }
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
