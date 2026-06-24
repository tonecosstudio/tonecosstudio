import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatCurrency as formatConfiguredCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  title = "Receita mensal",
  description = "Periodo selecionado",
  showGoal = false,
  className,
}: RevenueChartProps) {
  const firstPoint = data[0]?.receita || 0;
  const lastPoint = data[data.length - 1]?.receita || 0;
  const trend = lastPoint > firstPoint ? "up" : "down";
  const trendPercentage =
    firstPoint > 0 ? (((lastPoint - firstPoint) / firstPoint) * 100).toFixed(1) : "0";

  const formatCurrency = (value: number) =>
    formatConfiguredCurrency(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const toNumericValue = (value: ValueType | undefined): number =>
    typeof value === "number" ? value : Number(value ?? 0);

  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="mb-2 font-semibold">{payload[0].payload.month}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-primary">Receita:</span>{" "}
            <span className="font-medium">{formatCurrency(toNumericValue(payload[0].value))}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Orcamentos:</span>{" "}
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
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 sm:h-5 sm:w-5" />
            )}
            <span
              className={`text-xs font-medium sm:text-sm ${
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
              name="Orcamentos"
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
