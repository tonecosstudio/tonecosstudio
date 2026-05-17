import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserMinus,
  UserPlus,
  Percent,
  Calendar,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SubscriptionMetricsProps {
  data: {
    mrr: number; // Monthly Recurring Revenue
    previousMrr: number;
    activeSubscriptions: number;
    previousActiveSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number; // Taxa de cancelamento
    ltv: number; // Lifetime Value
    averageSubscriptionValue: number;
  };
  className?: string;
}

export function SubscriptionMetrics({ data, className }: SubscriptionMetricsProps) {
  // Calcular mudanças
  const mrrChange = data.mrr - data.previousMrr;
  const mrrChangePercent =
    data.previousMrr > 0 ? ((mrrChange / data.previousMrr) * 100).toFixed(1) : "0";

  const subscriptionsChange = data.activeSubscriptions - data.previousActiveSubscriptions;
  const subscriptionsChangePercent =
    data.previousActiveSubscriptions > 0
      ? ((subscriptionsChange / data.previousActiveSubscriptions) * 100).toFixed(1)
      : "0";

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calcular taxa de retenção
  const retentionRate = 100 - data.churnRate;

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.mrr)}</div>
            <div className="flex items-center gap-1 mt-1">
              {mrrChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${mrrChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {mrrChange >= 0 ? "+" : ""}
                {mrrChangePercent}% vs mês anterior
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Assinaturas Ativas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions}</div>
            <div className="flex items-center gap-1 mt-1">
              {subscriptionsChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p
                className={`text-xs ${subscriptionsChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {subscriptionsChange >= 0 ? "+" : ""}
                {subscriptionsChangePercent}% vs mês anterior
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Churn */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Retenção: {retentionRate.toFixed(1)}%
            </p>
            <Progress value={retentionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        {/* LTV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.ltv)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime Value por cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes de Movimentação */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Movimentação de Assinaturas</CardTitle>
          <CardDescription>Novas vs Canceladas no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Novas */}
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
              <div className="p-2 rounded-lg bg-green-500 bg-opacity-10">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novas</p>
                <p className="text-2xl font-bold text-green-600">{data.newSubscriptions}</p>
              </div>
            </div>

            {/* Canceladas */}
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
              <div className="p-2 rounded-lg bg-red-500 bg-opacity-10">
                <UserMinus className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{data.canceledSubscriptions}</p>
              </div>
            </div>

            {/* Saldo */}
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
              <div className="p-2 rounded-lg bg-blue-500 bg-opacity-10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.newSubscriptions - data.canceledSubscriptions >= 0 ? "+" : ""}
                  {data.newSubscriptions - data.canceledSubscriptions}
                </p>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">💡 Análise</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Valor médio por assinatura: {formatCurrency(data.averageSubscriptionValue)}</li>
              <li>
                •{" "}
                {data.churnRate < 5
                  ? "✅ Churn saudável (abaixo de 5%)"
                  : "⚠️ Churn elevado (acima de 5%)"}
              </li>
              <li>
                •{" "}
                {data.newSubscriptions > data.canceledSubscriptions
                  ? "✅ Crescimento positivo de assinaturas"
                  : "⚠️ Mais cancelamentos que novas assinaturas"}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
