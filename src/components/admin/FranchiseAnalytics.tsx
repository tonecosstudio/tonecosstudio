import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Building2, TrendingUp, Award, AlertCircle } from "lucide-react";

interface FranchiseData {
  name: string;
  sales: number;
  revenue: number;
  growth: number;
  color?: string;
}

interface FranchiseAnalyticsProps {
  data: FranchiseData[];
  className?: string;
}

export function FranchiseAnalytics({ data, className }: FranchiseAnalyticsProps) {
  // Ordenar por receita
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue);

  // Top 3
  const topFranchises = sortedData.slice(0, 3);

  // Calcular totais
  const totalRevenue = data.reduce((acc, f) => acc + f.revenue, 0);
  const totalSales = data.reduce((acc, f) => acc + f.sales, 0);

  // Cores para o gráfico
  const COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
  ];

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Receita:</span>{" "}
              <span className="font-medium">{formatCurrency(data.revenue)}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Vendas:</span>{" "}
              <span className="font-medium">{data.sales}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Crescimento:</span>{" "}
              <span
                className={`font-medium ${data.growth >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {data.growth >= 0 ? "+" : ""}
                {data.growth}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      {/* Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">De {data.length} franquias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Média: {(totalSales / data.length).toFixed(0)} por franquia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue / totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por venda</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Franquia</CardTitle>
          <CardDescription>Comparativo de performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 3 Franquias */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">🏆 Top 3 Franquias</CardTitle>
          <CardDescription>Melhores performances do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topFranchises.map((franchise, index) => {
              const percentage = ((franchise.revenue / totalRevenue) * 100).toFixed(1);
              const medals = ["🥇", "🥈", "🥉"];

              return (
                <div key={franchise.name} className="flex items-center gap-4">
                  <div className="text-3xl">{medals[index]}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{franchise.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={franchise.growth >= 0 ? "default" : "destructive"}>
                          {franchise.growth >= 0 ? "+" : ""}
                          {franchise.growth}%
                        </Badge>
                        <span className="text-sm font-semibold">
                          {formatCurrency(franchise.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{franchise.sales} vendas</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {sortedData.some((f) => f.growth < -10) && (
        <Card className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                Atenção Necessária
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
              As seguintes franquias apresentam queda significativa:
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {sortedData
                .filter((f) => f.growth < -10)
                .map((f) => (
                  <li key={f.name}>
                    • <span className="font-medium">{f.name}</span>: {f.growth}% de queda
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
