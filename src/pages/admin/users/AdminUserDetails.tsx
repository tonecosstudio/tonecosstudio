/**
 * Página de detalhes do usuário no painel admin
 * Refatorado para seguir padrão AAA e remover código legado
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  FileText,
  MapPin,
  CreditCard,
  Bell,
  Trophy,
  Package,
  Heart,
  Shield,
  Mail,
  Phone,
  MessageSquare,
  MapPinned,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { OrderTypeIndicator } from "@/components/admin/orders/OrderTypeIndicator";
import { UserQuickActions } from "@/components/admin/user/UserQuickActions";
import { UserOrderFilters } from "@/components/admin/user/UserOrderFilters";
import { MonthlySelectionsTimeline } from "@/components/admin/user/MonthlySelectionsTimeline";
import { formatCurrency } from "@/lib/utils";
import { useUserDetails } from "@/hooks/admin/useUserDetails";
import { useUserSubscription } from "@/hooks/admin/useUserSubscription";
import { useUserOrders } from "@/hooks/admin/useUserOrders";
import {
  ADMIN_ROUTES,
  adminUserDetailsPath,
  adminUserDetailsSectionPath,
} from "@/config/routes";
import { hasAdminAccessRole } from "@/lib/permissions/adminRoles";
import { getOrderTypeLabel } from "@/config/admin-order-status";
import { normalizeAddressBR, type AddressBR } from "@/lib/profile";

const USER_DETAILS_TABS = new Set([
  "info",
  "personal",
  "address",
  "subscription",
  "collector",
  "orders",
  "preferences",
]);

type PaymentHistoryItem = {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
};

type SubscriptionCollection = {
  name: string;
};

type UserBadgeEntry = {
  id: string;
  earned_at: string;
  badge: {
    icon: string | null;
    name: string;
    description: string | null;
    rarity: string;
  };
};

export default function AdminUserDetails() {
  // Arrange: Obter ID do usuário da URL
  const { userId, section } = useParams<{ userId: string; section?: string }>();
  const navigate = useNavigate();
  const selectedTab =
    section && USER_DETAILS_TABS.has(section) ? section : "info";

  const handleTabChange = (tab: string) => {
    if (!userId) return;
    navigate(
      tab === "info"
        ? adminUserDetailsPath(userId)
        : adminUserDetailsSectionPath(userId, tab),
      { replace: true },
    );
  };

  // Arrange: Hooks customizados para dados do usuário
  const { profile, roles, badges, paymentHistory, isLoading, isError } = useUserDetails({ userId });
  const { activeSubscription, coinsBalance, monthlySelections } = useUserSubscription({ userId });
  const { filteredOrders, stats, filters, setFilters } = useUserOrders({ userId });

  // Act: Renderizar loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  // Act: Renderizar error state
  if (isError || !profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Usuário não encontrado</p>
          <Button asChild className="mt-4">
            <Link to={ADMIN_ROUTES.users}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Arrange: Extrair dados do endereço
  const address: AddressBR | null = normalizeAddressBR(profile.delivery_address, profile.address);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={ADMIN_ROUTES.users}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Usuários
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {profile.display_name || profile.full_name || profile.email}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">ID: {profile.id}</p>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 ? (
                <Badge variant="secondary">user</Badge>
              ) : (
                roles.map((r: { role: string }) => (
                  <Badge key={r.role} variant={hasAdminAccessRole(r.role) ? "default" : "secondary"}>
                    {r.role}
                  </Badge>
                ))
              )}
            </div>
            <UserQuickActions
              userEmail={profile.email || ""}
              userName={profile.display_name || profile.full_name || profile.email || "Usuário"}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {profile.profile_completion || 0}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Perfil Completo</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {profile.collector_level || 1}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Nível</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{profile.pieces_owned || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Peças</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {coinsBalance?.available_credits || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Coins</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalSpent)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Gasto</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-2" />
            Info
          </TabsTrigger>
          <TabsTrigger value="personal">
            <FileText className="h-4 w-4 mr-2" />
            Pessoal
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin className="h-4 w-4 mr-2" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="collector">
            <Trophy className="h-4 w-4 mr-2" />
            Colecionador
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Heart className="h-4 w-4 mr-2" />
            Preferências
          </TabsTrigger>
        </TabsList>

        {/* Tab: Info */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="text-base mt-1">{profile.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">ID</div>
                  <div className="text-xs font-mono mt-1">{profile.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Criado em</div>
                  <div className="text-base mt-1">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleString("pt-BR")
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Perfil atualizado</div>
                  <div className="text-base mt-1">
                    {profile.updated_at
                      ? new Date(profile.updated_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Preferências de Notificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Canal de contato preferido</span>
                  <Badge variant="secondary">
                    {profile.preferred_contact_channel ?? "Não definido"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Preferência: atualizações de orçamento</span>
                  <Badge variant={profile.quote_updates ? "default" : "secondary"}>
                    {profile.quote_updates ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Preferência: atualizações de produção</span>
                  <Badge variant={profile.production_updates ? "default" : "secondary"}>
                    {profile.production_updates ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emails de marketing</span>
                  <Badge variant={profile.marketing_emails ? "default" : "secondary"}>
                    {profile.marketing_emails ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Histórico de Pagamentos ({paymentHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum pagamento registrado
                </p>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment: PaymentHistoryItem) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatCurrency(payment.amount)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {payment.status ?? "pendente"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {payment.payment_method ?? "Método não informado"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date ?? payment.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Personal */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Nome Completo</div>
                  <div className="text-base mt-1">{profile.full_name || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">CPF</div>
                  <div className="text-base mt-1">{profile.cpf || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Data de Nascimento
                  </div>
                  <div className="text-base mt-1">
                    {profile.birth_date
                      ? new Date(profile.birth_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Telefone</div>
                  <div className="text-base mt-1 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {profile.phone || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">WhatsApp</div>
                  <div className="text-base mt-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    {profile.whatsapp || "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Address */}
        <TabsContent value="address" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!address || Object.keys(address).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Endereço não cadastrado
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">CEP</div>
                      <div className="text-base mt-1">{address.cep || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">UF</div>
                      <div className="text-base mt-1">{address.uf || "—"}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Cidade</div>
                    <div className="text-base mt-1">{address.cidade || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Bairro</div>
                    <div className="text-base mt-1">{address.bairro || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Rua</div>
                    <div className="text-base mt-1">{address.rua || "—"}</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Número</div>
                      <div className="text-base mt-1">{address.numero || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Complemento</div>
                      <div className="text-base mt-1">{address.complemento || "—"}</div>
                    </div>
                  </div>

                  {/* Endereço Formatado */}
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Endereço Completo
                    </div>
                    <div className="text-base">
                      {address.rua && `${address.rua}, `}
                      {address.numero && `${address.numero}`}
                      {address.complemento && ` - ${address.complemento}`}
                      <br />
                      {address.bairro && `${address.bairro}, `}
                      {address.cidade && `${address.cidade}`}
                      {address.uf && ` - ${address.uf}`}
                      <br />
                      {address.cep && `CEP: ${address.cep}`}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Subscription & Coins */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assinatura Ativa (Sistema Híbrido) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Assinatura Ativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSubscription ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma assinatura ativa
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Plano</div>
                      <div className="text-base mt-1 capitalize">
                        {activeSubscription.plan?.name || activeSubscription.plan_type || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Status</div>
                      <Badge
                        variant={activeSubscription.status === 'active' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {activeSubscription.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Coleções</div>
                      <div className="text-base mt-1">
                        {activeSubscription.collections_list?.length > 0
                          ? activeSubscription.collections_list.map((c: SubscriptionCollection) => c.name).join(', ')
                          : 'Nenhuma coleção vinculada'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Entregas</div>
                        <div className="text-base mt-1">
                          {activeSubscription.deliveries_completed || 0}
                          {activeSubscription.deliveries_total ? ` / ${activeSubscription.deliveries_total}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Total Pago</div>
                        <div className="text-base mt-1">
                          {formatCurrency(activeSubscription.total_paid || 0)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Início</div>
                      <div className="text-base mt-1">
                        {activeSubscription.started_at
                          ? new Date(activeSubscription.started_at).toLocaleDateString("pt-BR")
                          : new Date(activeSubscription.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saldo de Coins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Saldo de Coins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!coinsBalance ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum saldo disponível
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <div className="text-4xl font-bold text-blue-600">
                        {coinsBalance.available_credits}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">Coins Disponíveis</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-green-600">
                          {coinsBalance.total_earned || 0}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total Ganho</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-orange-600">
                          {coinsBalance.total_spent || 0}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Gastos</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline de Escolhas Mensais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Escolhas Mensais
              </CardTitle>
              <CardDescription>
                Personagens escolhidos organizados por status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlySelectionsTimeline selections={monthlySelections} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Collector */}
        <TabsContent value="collector" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Perfil de Colecionador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Username</div>
                  <div className="text-base mt-1">{profile.username || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Nome de Exibição</div>
                  <div className="text-base mt-1">{profile.display_name || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Bio</div>
                  <div className="text-base mt-1">{profile.bio || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Perfil Público</div>
                  <Badge variant={profile.is_public ? "default" : "secondary"} className="mt-1">
                    {profile.is_public ? "Público" : "Privado"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                      {profile.collector_level || 1}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Nível</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                      {profile.collector_xp || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">XP</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                      {profile.pieces_owned || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Peças</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(stats.totalSpent)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total Gasto</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Badges Conquistados ({badges.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {badges.map((userBadge: UserBadgeEntry) => {
                    const badge = userBadge.badge;
                    return (
                      <div
                        key={userBadge.id}
                        className="flex flex-col items-center text-center p-4 rounded-lg border bg-card"
                      >
                        <div className="text-4xl mb-2">{badge.icon ?? ""}</div>
                        <div className="font-medium text-sm">{badge.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {badge.description}
                        </div>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {badge.rarity}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(userBadge.earned_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Orders */}
        <TabsContent value="orders" className="space-y-6">
          {/* Estatísticas de Pedidos */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total de Pedidos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.filteredCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Filtrados</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalSpent)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Valor Total</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.pendingCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Pendentes</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Pedidos Consolidados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Todos os Pedidos ({stats.filteredCount} de {stats.totalOrders})
              </CardTitle>
              <CardDescription>
                Entregas de assinatura, compras avulsas, pagamentos manuais e orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <UserOrderFilters
                typeFilter={filters.type}
                statusFilter={filters.status}
                searchQuery={filters.search}
                onTypeChange={setFilters.setType}
                onStatusChange={setFilters.setStatus}
                onSearchChange={setFilters.setSearch}
              />

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {stats.totalOrders === 0
                    ? "Nenhum pedido realizado"
                    : "Nenhum pedido encontrado com os filtros aplicados"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <OrderTypeIndicator type={order.type} />
                          <span className="font-medium text-sm">
                            {getOrderTypeLabel(order.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="font-mono text-xs">#{order.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
                          {order.collection && (
                            <>
                              <span>•</span>
                              <span>{order.collection.name}</span>
                            </>
                          )}
                          {order.amount > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold">{formatCurrency(order.amount)}</span>
                            </>
                          )}
                          {order.type === "quote" && order.quote && (
                            <>
                              <span>•</span>
                              <span>{order.quote.items.length} {order.quote.items.length === 1 ? "item" : "itens"}</span>
                            </>
                          )}
                        </div>
                        {order.trackingCode && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Rastreio: {order.trackingCode}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={order.status} />
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`${ADMIN_ROUTES.orders}?id=${encodeURIComponent(order.id)}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile.preferences_text && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Descrição de Preferências
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm whitespace-pre-wrap">{profile.preferences_text}</p>
                  </div>
                </div>
              )}

              {profile.preference_tags && profile.preference_tags.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Tags de Preferência ({profile.preference_tags.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.preference_tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!profile.preferences_text &&
                (!profile.preference_tags || profile.preference_tags.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma preferência cadastrada
                  </p>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
