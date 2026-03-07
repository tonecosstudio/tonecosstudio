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
  default: "border-l-4 border-l-blue-500 hover:shadow-lg hover:border-l-blue-600",
  critical: "border-l-4 border-l-red-500 hover:shadow-lg hover:border-l-red-600",
  warning: "border-l-4 border-l-yellow-500 hover:shadow-lg hover:border-l-yellow-600",
  success: "border-l-4 border-l-green-500 hover:shadow-lg hover:border-l-green-600",
};

const variantTextColors = {
  default: "text-blue-600 dark:text-blue-400",
  critical: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  success: "text-green-600 dark:text-green-400",
};

const variantBgColors = {
  default: "bg-blue-50 dark:bg-blue-950/20",
  critical: "bg-red-50 dark:bg-red-950/20",
  warning: "bg-yellow-50 dark:bg-yellow-950/20",
  success: "bg-green-50 dark:bg-green-950/20",
};

const variantIconColors = {
  default: "text-blue-500",
  critical: "text-red-500",
  warning: "text-yellow-500",
  success: "text-green-500",
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
        "transition-all duration-200",
        variantStyles[variant],
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-6", compact && "p-4")}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2",
              compact && "text-[10px] mb-1"
            )}>
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className={cn(
                "text-3xl font-bold tracking-tight",
                variantTextColors[variant],
                compact && "text-2xl"
              )}>
                {value}
              </h3>
              {trend && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium",
                    trendUp ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  )}
                >
                  {trend}
                </Badge>
              )}
            </div>
          </div>
          <div className={cn(
            "rounded-full p-3",
            variantBgColors[variant]
          )}>
            <Icon className={cn(
              "h-6 w-6",
              variantIconColors[variant],
              compact && "h-5 w-5"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
