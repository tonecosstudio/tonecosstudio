import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const difference = currentValue - previousValue;
  const percentageChange = previousValue !== 0 ? (difference / previousValue) * 100 : 0;

  const isPositive = difference > 0;
  const isNegative = difference < 0;
  const isNeutral = difference === 0;

  const formatValue = (value: number): string => {
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "number":
      default:
        return value.toLocaleString("pt-BR");
    }
  };

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

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
          <div className="text-2xl font-bold">{formatValue(currentValue)}</div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                trendBgColor,
                trendColor
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>
                {isNeutral ? "0%" : `${isPositive ? "+" : ""}${percentageChange.toFixed(1)}%`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs periodo anterior</span>
          </div>

          <div className="text-xs text-muted-foreground">
            Anterior: {formatValue(previousValue)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
