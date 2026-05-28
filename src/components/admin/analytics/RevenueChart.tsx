import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

interface RevenueData {
  month: string;
  receita: number;
  orcamentos: number;
  meta?: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
  description?: string;
  showGoal?: boolean;
  className?: string;
}

export function RevenueChart({
  data,
  title = "Receita Mensal",
  description = "Últimos 6 meses",
  showGoal = false,
  className,
}: RevenueChartProps) {
  // Calcular tendência
  const firstMonth = data[0]?.receita || 0;
  const lastMonth = data[data.length - 1]?.receita || 0;
  const trend = lastMonth > firstMonth ? "up" : "down";
  const trendPercentage =
    firstMonth > 0 ? (((lastMonth - firstMonth) / firstMonth) * 100).toFixed(1) : "0";

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toNumericValue = (value: ValueType | undefined): number => {
    return typeof value === "number" ? value : Number(value ?? 0);
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-primary">Receita:</span>{" "}
              <span className="font-medium">{formatCurrency(toNumericValue(payload[0].value))}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Orçamentos:</span>{" "}
              <span className="font-medium">{payload[1]?.value || 0}</span>
            </p>
            {showGoal && payload[2] && (
              <p className="text-sm">
                <span className="text-amber-600">Meta:</span>{" "}
                <span className="font-medium">{formatCurrency(toNumericValue(payload[2].value))}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            )}
            <span
              className={`text-xs sm:text-sm font-medium ${
                trend === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend === "up" ? "+" : ""}
              {trendPercentage}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOrcamentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} iconSize={12} />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorReceita)"
              yAxisId="left"
            />
            <Area
              type="monotone"
              dataKey="orcamentos"
              name="Orçamentos"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorOrcamentos)"
              yAxisId="right"
            />
            {showGoal && (
              <Area
                type="monotone"
                dataKey="meta"
                name="Meta"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
