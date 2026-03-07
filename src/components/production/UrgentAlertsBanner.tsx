import { useQuery } from "@tanstack/react-query";
import { fetchProductionMetrics } from "@/services/admin/production-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Ban, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type AlertType = "deadline_critical" | "deadline_urgent" | "blocked" | "overdue";

interface UrgentAlertsBannerProps {
  onAlertClick?: (alertType: AlertType) => void;
}

export function UrgentAlertsBanner({ onAlertClick }: UrgentAlertsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const { data: metrics } = useQuery({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval: 30000,
  });

  if (!metrics || dismissed) return null;

  const { urgent } = metrics;
  const hasUrgentAlerts =
    urgent.deadlineCritical > 0 ||
    urgent.deadlineUrgent > 0 ||
    urgent.blocked > 0 ||
    urgent.overdue > 0;

  if (!hasUrgentAlerts) return null;

  const totalAlerts = urgent.deadlineCritical + urgent.blocked + urgent.overdue;
  const isCritical = urgent.deadlineCritical > 0 || urgent.blocked > 0;

  return (
    <div
      className={cn(
        "sticky top-0 z-50 border-b-2 px-6 py-3 shadow-sm",
        isCritical
          ? "bg-red-50 border-red-500 dark:bg-red-950/20"
          : "bg-yellow-50 border-yellow-500 dark:bg-yellow-950/20"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle
            className={cn(
              "h-5 w-5",
              isCritical ? "text-red-600" : "text-yellow-600"
            )}
          />
          <span
            className={cn(
              "text-sm font-semibold",
              isCritical ? "text-red-900 dark:text-red-400" : "text-yellow-900 dark:text-yellow-400"
            )}
          >
            {totalAlerts} {totalAlerts === 1 ? "Alerta Urgente" : "Alertas Urgentes"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {urgent.deadlineCritical > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("deadline_critical")}
              className="h-8 gap-2 hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              <Clock className="h-3 w-3 text-red-600" />
              <span className="text-xs text-red-900 dark:text-red-400">Prazo &lt; 24h</span>
              <Badge variant="destructive" className="h-5 text-xs">
                {urgent.deadlineCritical}
              </Badge>
            </Button>
          )}

          {urgent.deadlineUrgent > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("deadline_urgent")}
              className="h-8 gap-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
            >
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span className="text-xs text-yellow-900 dark:text-yellow-400">Escolhas</span>
              <Badge className="h-5 text-xs bg-yellow-500 hover:bg-yellow-600 text-white">
                {urgent.deadlineUrgent}
              </Badge>
            </Button>
          )}

          {urgent.blocked > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("blocked")}
              className="h-8 gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/20"
            >
              <Ban className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-blue-900 dark:text-blue-400">Bloqueados</span>
              <Badge className="h-5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                {urgent.blocked}
              </Badge>
            </Button>
          )}

          {urgent.overdue > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("overdue")}
              className="h-8 gap-2 hover:bg-orange-100 dark:hover:bg-orange-900/20"
            >
              <TrendingUp className="h-3 w-3 text-orange-600" />
              <span className="text-xs text-orange-900 dark:text-orange-400">Atrasados</span>
              <Badge className="h-5 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                {urgent.overdue}
              </Badge>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
