/**
 * Credits Dashboard Component
 *
 * Overview dashboard for the credits system showing key metrics.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw, Wallet, TrendingUp, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditsDashboardMetrics } from "@/hooks/admin/useCreditsDashboardMetrics";

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
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
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
  const { data: metrics } = useCreditsDashboardMetrics();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Coins em Circulação"
          value={metrics?.coins.total?.toLocaleString() || "0"}
          description="Saldo líquido (créditos - débitos)"
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Assinantes Ativos"
          value={metrics?.subscribers.active || 0}
          description={`${metrics?.subscribers.total || 0} total`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Usuários com Coins"
          value={metrics?.coinUsers.count || 0}
          description="Possuem saldo de coins"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Ciclos Ativos"
          value={metrics?.cycles.active || 0}
          description="Em produção"
          icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Níveis de Preço"
          value={metrics?.tiers.active || 0}
          description="Tiers ativos"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Pacotes de Coins"
          value={metrics?.packages.active || 0}
          description="Disponíveis para venda"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funcionalidades mais usadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/creditos?tab=coins")}>
              <Coins className="mr-2 h-4 w-4" />
              Gerenciar Coins
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/creditos?tab=cycles")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Ver Ciclos
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/creditos?tab=plans")}>
              <Wallet className="mr-2 h-4 w-4" />
              Configurar Planos
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/pedidos?type=subscription")}>
              <Users className="mr-2 h-4 w-4" />
              Ver Pedidos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>Visão geral do sistema de créditos</CardDescription>
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
                <span className="text-sm">Níveis de Preço</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
