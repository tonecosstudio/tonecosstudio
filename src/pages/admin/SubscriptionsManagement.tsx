// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Eye, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SubscriptionsManagement() {
  const customersQuery = useQuery({
    queryKey: ["admin-customers-subscriptions"],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar dados relacionados para cada usuário
      const usersWithData = await Promise.all(
        (users || []).map(async (user: any) => {
          // Buscar assinatura
          const { data: subscriptions } = await supabase
            .from("subscription_credit_subscriptions")
            .select("id, plan_type, status")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          // Buscar saldo apenas se houver assinatura
          let balance = null;
          if (subscriptions?.id) {
            const { data: balanceData } = await supabase
              .from("subscription_credit_balances")
              .select("available_credits")
              .eq("subscription_id", subscriptions.id)
              .maybeSingle();
            balance = balanceData;
          }

          // Buscar pedidos
          const { data: orders } = await supabase
            .from("subscription_credit_orders")
            .select("id")
            .eq("user_id", user.id);

          return {
            id: user.id,
            name: user.full_name || user.email?.split('@')[0] || 'Sem nome',
            email: user.email,
            plan: subscriptions?.status === 'active' ? subscriptions.plan_type : 'Nenhum',
            planStatus: subscriptions?.status || 'none',
            coins: balance?.available_credits || 0,
            ordersCount: orders?.length || 0,
            lastActivity: user.updated_at,
          };
        })
      );

      return usersWithData;
    },
    refetchInterval: 60000,
  });

  const customers = customersQuery.data || [];
  const stats = {
    total: customers.length,
    active: customers.filter((c: any) => c.planStatus === 'active').length,
    totalCoins: customers.reduce((acc: number, c: any) => acc + c.coins, 0),
    totalOrders: customers.reduce((acc: number, c: any) => acc + c.ordersCount, 0),
  };

  return (
    <>
      <SEOHead
        title="Admin - Gerenciamento de Assinaturas"
        description="Gerenciamento de clientes e assinaturas"
        noindex={true}
      />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Assinaturas</h1>
          <p className="text-muted-foreground mt-2">Visão geral de clientes e suas assinaturas</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Com plano ativo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Coins</CardTitle>
              <Coins className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalCoins}</div>
              <p className="text-xs text-muted-foreground">Em circulação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Realizados</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Lista de todos os clientes cadastrados</p>
          </CardHeader>
          <CardContent>
            {customersQuery.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando clientes...</div>
            ) : customersQuery.isError ? (
              <div className="text-center py-12 text-destructive">Erro ao carregar clientes</div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-center">Coins</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead>Última atividade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.planStatus === 'active' ? (
                            <Badge className="bg-green-500 capitalize">{customer.plan}</Badge>
                          ) : customer.planStatus === 'expired' ? (
                            <Badge variant="secondary">Expirado</Badge>
                          ) : (
                            <Badge variant="outline">Nenhum</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono font-semibold text-blue-600">{customer.coins}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{customer.ordersCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(customer.lastActivity), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.location.href = `/admin/users/${customer.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminLayout>
    </>
  );
}
