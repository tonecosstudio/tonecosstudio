import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Package, RefreshCw, TrendingUp, Users, Wallet } from "lucide-react";
import { ADMIN_ROUTES } from "@/config/routes";
import { useCreditsDashboardMetrics } from "@/hooks/admin/useCreditsDashboardMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
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
          title="Coins em circulacao"
          value={metrics?.coins.total?.toLocaleString() || "0"}
          description="Saldo liquido entre creditos e debitos"
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Assinantes ativos"
          value={metrics?.subscribers.active || 0}
          description={`${metrics?.subscribers.total || 0} assinaturas registradas`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Usuarios com coins"
          value={metrics?.coinUsers.count || 0}
          description="Contas com saldo disponivel"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Ciclos ativos"
          value={metrics?.cycles.active || 0}
          description="Frentes de producao abertas"
          icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Niveis de preco"
          value={metrics?.tiers.active || 0}
          description="Tiers ativos no momento"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Pacotes de coins"
          value={metrics?.packages.active || 0}
          description="Disponiveis para venda"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acoes rapidas</CardTitle>
          <CardDescription>Atalhos para as areas operacionais mais usadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`${ADMIN_ROUTES.credits}?tab=coins`)}>
              <Coins className="mr-2 h-4 w-4" />
              Gerenciar coins
            </Button>
            <Button variant="outline" onClick={() => navigate(`${ADMIN_ROUTES.credits}?tab=cycles`)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Ver ciclos
            </Button>
            <Button variant="outline" onClick={() => navigate(`${ADMIN_ROUTES.credits}?tab=plans`)}>
              <Wallet className="mr-2 h-4 w-4" />
              Configurar planos
            </Button>
            <Button variant="outline" onClick={() => navigate(`${ADMIN_ROUTES.orders}?type=subscription`)}>
              <Users className="mr-2 h-4 w-4" />
              Ver pedidos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status do sistema</CardTitle>
          <CardDescription>Leitura rapida da saude operacional do modulo de creditos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Sistema de coins</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Ciclos de producao</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Niveis de preco</span>
              </div>
              <span className="text-sm font-medium text-green-600">Operacional</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
