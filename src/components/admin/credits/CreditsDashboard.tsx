/**
 * Credits Dashboard Component
 * 
 * Overview dashboard for the credits system showing key metrics,
 * charts, and quick actions.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Coins, RefreshCw, Wallet, TrendingUp, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
}

function MetricCard({ title, value, description, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function CreditsDashboard() {
  const navigate = useNavigate();

  // Fetch total coins in circulation
  const { data: coinsData } = useQuery({
    queryKey: ["credits-total-coins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_coins")
        .select("balance");
      
      if (error) throw error;
      
      const total = data?.reduce((sum, user) => sum + (user.balance || 0), 0) || 0;
      return { total };
    },
  });

  // Fetch active cycles count
  const { data: cyclesData } = useQuery({
    queryKey: ["credits-active-cycles"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscription_credit_production_cycles")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      
      if (error) throw error;
      return { count: count || 0 };
    },
  });

  // Fetch active subscription plans
  const { data: plansData } = useQuery({
    queryKey: ["credits-active-plans"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscription_plans")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (error) throw error;
      return { count: count || 0 };
    },
  });

  // Fetch active subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: ["credits-active-subscriptions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      
      if (error) throw error;
      return { count: count || 0 };
    },
  });

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Coins"
          value={coinsData?.total?.toLocaleString() || "0"}
          description="Em circulação"
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Ciclos Ativos"
          value={cyclesData?.count || 0}
          description="Em produção"
          icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Planos Ativos"
          value={plansData?.count || 0}
          description="Disponíveis"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Assinaturas Ativas"
          value={subscriptionsData?.count || 0}
          description="Usuários ativos"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades mais usadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/creditos?tab=coins")}
            >
              <Coins className="mr-2 h-4 w-4" />
              Gerenciar Coins
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/creditos?tab=cycles")}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Ver Ciclos
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/creditos?tab=plans")}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Configurar Planos
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/pedidos?type=subscription")}
            >
              <Users className="mr-2 h-4 w-4" />
              Ver Assinaturas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>
            Visão geral do sistema de créditos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Sistema de Coins</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Ciclos de Produção</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Planos de Assinatura</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
