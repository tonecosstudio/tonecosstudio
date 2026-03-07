import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "critical" | "warning" | "success";
  compact?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: "border-l-blue-500",
  critical: "border-l-red-500",
  warning: "border-l-yellow-500",
  success: "border-l-green-500",
};

const variantTextColors = {
  default: "text-blue-600",
  critical: "text-red-600",
  warning: "text-yellow-600",
  success: "text-green-600",
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  variant = "default",
  compact = false,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 transition-all hover:shadow-md",
        variantStyles[variant],
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-center justify-between mb-2">
          <span className={cn("text-xs font-medium text-muted-foreground", compact && "text-[10px]")}>
            {label}
          </span>
          <Icon className={cn("h-4 w-4 text-muted-foreground", compact && "h-3 w-3")} />
        </div>
        <div className="flex items-end justify-between">
          <div className={cn("text-2xl font-bold", variantTextColors[variant], compact && "text-xl")}>
            {value}
          </div>
          {trend && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
