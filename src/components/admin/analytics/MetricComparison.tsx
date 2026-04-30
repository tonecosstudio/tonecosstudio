import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricComparisonProps {
  title: string;
  currentValue: number;
  previousValue: number;
  format?: "currency" | "percentage" | "number";
  icon?: React.ReactNode;
  className?: string;
}

export function MetricComparison({
  title,
  currentValue,
  previousValue,
  format = "number",
  icon,
  className,
}: MetricComparisonProps) {
  // Calcular diferença e percentual
  const difference = currentValue - previousValue;
  const percentageChange = previousValue !== 0 ? (difference / previousValue) * 100 : 0;

  // Determinar tendência
  const isPositive = difference > 0;
  const isNegative = difference < 0;
  const isNeutral = difference === 0;

  // Formatar valor
  const formatValue = (value: number): string => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "number":
      default:
        return value.toLocaleString("pt-BR");
    }
  };

  // Ícone de tendência
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  // Cor da tendência
  const trendColor = isPositive
    ? "text-green-600 dark:text-green-400"
    : isNegative
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400";

  const trendBgColor = isPositive
    ? "bg-green-100 dark:bg-green-900/20"
    : isNegative
      ? "bg-red-100 dark:bg-red-900/20"
      : "bg-gray-100 dark:bg-gray-900/20";

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Valor Atual */}
          <div className="text-2xl font-bold">{formatValue(currentValue)}</div>

          {/* Comparação com Período Anterior */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                trendBgColor,
                trendColor
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>
                {isNeutral ? "0%" : `${isPositive ? "+" : ""}${percentageChange.toFixed(1)}%`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs período anterior</span>
          </div>

          {/* Valor Anterior (opcional) */}
          <div className="text-xs text-muted-foreground">
            Anterior: {formatValue(previousValue)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
