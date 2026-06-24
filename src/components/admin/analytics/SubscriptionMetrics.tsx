import {
  Calendar,
  DollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { formatCurrency as formatConfiguredCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionMetricsProps {
  data: {
    mrr: number;
    previousMrr: number;
    activeSubscriptions: number;
    previousActiveSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number;
    ltv: number;
    averageSubscriptionValue: number;
  };
  className?: string;
}

export function SubscriptionMetrics({ data, className }: SubscriptionMetricsProps) {
  const mrrChange = data.mrr - data.previousMrr;
  const mrrChangePercent =
    data.previousMrr > 0 ? ((mrrChange / data.previousMrr) * 100).toFixed(1) : "0";

  const subscriptionsChange = data.activeSubscriptions - data.previousActiveSubscriptions;
  const subscriptionsChangePercent =
    data.previousActiveSubscriptions > 0
      ? ((subscriptionsChange / data.previousActiveSubscriptions) * 100).toFixed(1)
      : "0";

  const formatCurrency = (value: number) =>
    formatConfiguredCurrency(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const retentionRate = 100 - data.churnRate;

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.mrr)}</div>
            <div className="mt-1 flex items-center gap-1">
              {mrrChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${mrrChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {mrrChange >= 0 ? "+" : ""}
                {mrrChangePercent}% vs periodo anterior
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions}</div>
            <div className="mt-1 flex items-center gap-1">
              {subscriptionsChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p
                className={`text-xs ${
                  subscriptionsChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {subscriptionsChange >= 0 ? "+" : ""}
                {subscriptionsChangePercent}% vs periodo anterior
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de churn</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.churnRate.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Retencao: {retentionRate.toFixed(1)}%
            </p>
            <Progress value={retentionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV medio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.ltv)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Valor medio por cliente</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Movimento de assinaturas</CardTitle>
          <CardDescription>Entradas e cancelamentos no periodo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
              <div className="rounded-lg bg-green-500 bg-opacity-10 p-2">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novas</p>
                <p className="text-2xl font-bold text-green-600">{data.newSubscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-red-50 p-4 dark:bg-red-950/20">
              <div className="rounded-lg bg-red-500 bg-opacity-10 p-2">
                <UserMinus className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{data.canceledSubscriptions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
              <div className="rounded-lg bg-blue-500 bg-opacity-10 p-2">
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

          <div className="mt-4 rounded-lg bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">Analise</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Valor medio por assinatura: {formatCurrency(data.averageSubscriptionValue)}</li>
              <li>
                {data.churnRate < 5
                  ? "Churn controlado abaixo de 5%."
                  : "Churn elevado acima de 5%."}
              </li>
              <li>
                {data.newSubscriptions > data.canceledSubscriptions
                  ? "Saldo positivo de assinaturas no periodo."
                  : "Cancelamentos acima das novas assinaturas no periodo."}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
