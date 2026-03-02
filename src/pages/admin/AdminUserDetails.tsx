import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrdersByUserId } from "@/services/admin/orders-service";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { OrderTypeIndicator } from "@/components/admin/orders/OrderTypeIndicator";
import { UserQuickActions } from "@/components/admin/user/UserQuickActions";
import { UserOrderFilters } from "@/components/admin/user/UserOrderFilters";
import { formatCurrency } from "@/lib/utils";

export default function AdminUserDetails() {
  const { userId } = useParams<{ userId: string }>();
  
  // Estados para filtros de pedidos
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  // Query para perfil completo (inclui email)
  const profileQuery = useQuery({
    queryKey: ["admin-user-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Usuário não encontrado");
      }

      return data;
    },
  });

  // Query para roles
  const rolesQuery = useQuery({
    queryKey: ["admin-user-roles", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return data || [];
    },
  });

  // Query para badges
  const badgesQuery = useQuery({
    queryKey: ["admin-user-badges", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select(
          `
          id,
          earned_at,
          badge:collector_badges(*)
        `
        )
        .eq("user_id", userId!);
      if (error) throw error;
      return data || [];
    },
  });

  // Query para métodos de pagamento
  const paymentMethodsQuery = useQuery({
    queryKey: ["admin-user-payment-methods", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", userId!)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Query para pedidos consolidados (todos os tipos)
  const ordersQuery = useQuery({
    queryKey: ["admin-user-orders", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      return await fetchOrdersByUserId(userId);
    },
  });

  // Query para assinaturas
  const subscriptionsQuery = useQuery({
    queryKey: ["admin-user-subscriptions", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          collection:collections(name, slug)
        `
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = profileQuery.isLoading;
  const profile = profileQuery.data;
  const roles = rolesQuery.data || [];
  const badges = badgesQuery.data || [];
  const paymentMethods = paymentMethodsQuery.data || [];
  const orders = ordersQuery.data || [];
  const subscriptions = subscriptionsQuery.data || [];

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro por tipo
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter((order) => order.type === orderTypeFilter);
    }

    // Filtro por status
    if (orderStatusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === orderStatusFilter);
    }

    // Filtro por busca
    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          (order.trackingCode && order.trackingCode.toLowerCase().includes(query)) ||
          (order.collection && order.collection.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [orders, orderTypeFilter, orderStatusFilter, orderSearchQuery]);

  // Calcular estatísticas de pedidos (usando pedidos filtrados)
  const totalSpent = filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const pendingOrders = filteredOrders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "under_review" ||
      order.status === "requires_info" ||
      order.status === "reviewing"
  );

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

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Usuário não encontrado</p>
          <Button asChild className="mt-4">
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const address = profile.address as any;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/admin/users">
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
                roles.map((r: any) => (
                  <Badge key={r.role} variant={r.role === "admin" ? "default" : "secondary"}>
                    {r.role}
                  </Badge>
                ))
              )}
            </div>
            <UserQuickActions 
              userId={profile.id} 
              userEmail={profile.email || ""} 
              userName={profile.display_name || profile.full_name || profile.email || "Usuário"}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totalSpent)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Gasto</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
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
                    {new Date(profile.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Último login</div>
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
                  <span className="text-sm">Notificações por Email</span>
                  <Badge variant={profile.email_notifications ? "default" : "secondary"}>
                    {profile.email_notifications ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Atualizações de Pedidos</span>
                  <Badge variant={profile.order_updates ? "default" : "secondary"}>
                    {profile.order_updates ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emails de Marketing</span>
                  <Badge variant={profile.marketing_emails ? "default" : "secondary"}>
                    {profile.marketing_emails ? "Ativo" : "Inativo"}
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
                Métodos de Pagamento ({paymentMethods.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum método de pagamento cadastrado
                </p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method: any) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {method.card_brand?.toUpperCase() || method.type} ••••{" "}
                              {method.card_last4}
                            </span>
                            {method.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Padrão
                              </Badge>
                            )}
                          </div>
                          {method.card_holder_name && (
                            <p className="text-sm text-muted-foreground">
                              {method.card_holder_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {method.card_expiry_month && method.card_expiry_year && (
                        <span className="text-sm text-muted-foreground">
                          {String(method.card_expiry_month).padStart(2, "0")}/
                          {method.card_expiry_year}
                        </span>
                      )}
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
                {profile.is_public && profile.username && (
                  <div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/collector/${profile.username}`} target="_blank">
                        Ver Perfil Público
                      </Link>
                    </Button>
                  </div>
                )}
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
                      {formatCurrency(totalSpent)}
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
                  {badges.map((userBadge: any) => {
                    const badge = userBadge.badge;
                    return (
                      <div
                        key={userBadge.id}
                        className="flex flex-col items-center text-center p-4 rounded-lg border bg-card"
                      >
                        <div className="text-4xl mb-2">{badge.icon}</div>
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
                  <div className="text-2xl font-bold text-primary">{orders.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total de Pedidos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredOrders.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Filtrados</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(totalSpent)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Valor Total</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{pendingOrders.length}</div>
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
                Todos os Pedidos ({filteredOrders.length} de {orders.length})
              </CardTitle>
              <CardDescription>
                Entregas de assinatura, compras avulsas, pagamentos manuais e orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <UserOrderFilters
                typeFilter={orderTypeFilter}
                statusFilter={orderStatusFilter}
                searchQuery={orderSearchQuery}
                onTypeChange={setOrderTypeFilter}
                onStatusChange={setOrderStatusFilter}
                onSearchChange={setOrderSearchQuery}
              />

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {orders.length === 0 
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
                            {order.type === "subscription_delivery" && "Entrega de Assinatura"}
                            {order.type === "standalone_purchase" && "Compra Avulsa"}
                            {order.type === "manual_payment" && "Pagamento Manual"}
                            {order.type === "quote" && "Orçamento"}
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
                          <Link to={`/admin/pedidos?id=${order.id}`}>
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

          {/* Assinaturas */}
          {subscriptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Assinaturas Ativas ({subscriptions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <div className="font-medium">{sub.collection?.name}</div>
                        <div className="text-sm text-muted-foreground">Plano: {sub.plan_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {sub.deliveries_completed}/{sub.deliveries_total} entregas
                        </div>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
