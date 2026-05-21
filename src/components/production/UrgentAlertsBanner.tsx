import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Ban, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUrgentAlerts } from "@/hooks/admin/useUrgentAlerts";

export type AlertType = "deadline_critical" | "deadline_urgent" | "blocked" | "overdue";

interface UrgentAlertsBannerProps {
  onAlertClick?: (alertType: AlertType) => void;
}

export function UrgentAlertsBanner({ onAlertClick }: UrgentAlertsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const { data: metrics } = useUrgentAlerts();

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
        "sticky top-0 z-50 border-b px-6 py-2.5 shadow-sm backdrop-blur-sm",
        isCritical
          ? "bg-red-50/95 border-red-200 dark:bg-red-950/30 dark:border-red-900"
          : "bg-yellow-50/95 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
      )}
    >
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle
            className={cn(
              "h-4 w-4 flex-shrink-0",
              isCritical ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
            )}
          />
          <span
            className={cn(
              "text-sm font-semibold truncate",
              isCritical ? "text-red-900 dark:text-red-300" : "text-yellow-900 dark:text-yellow-300"
            )}
          >
            {totalAlerts} {totalAlerts === 1 ? "Alerta" : "Alertas"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {urgent.deadlineCritical > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("deadline_critical")}
              className="h-7 gap-1.5 px-2 hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              <Clock className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-900 dark:text-red-300 hidden sm:inline">Prazo &lt; 24h</span>
              <Badge variant="destructive" className="h-5 px-1.5 text-xs font-semibold">
                {urgent.deadlineCritical}
              </Badge>
            </Button>
          )}

          {urgent.deadlineUrgent > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("deadline_urgent")}
              className="h-7 gap-1.5 px-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
            >
              <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs text-yellow-900 dark:text-yellow-300 hidden sm:inline">Escolhas</span>
              <Badge className="h-5 px-1.5 text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-white">
                {urgent.deadlineUrgent}
              </Badge>
            </Button>
          )}

          {urgent.blocked > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("blocked")}
              className="h-7 gap-1.5 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/20"
            >
              <Ban className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-900 dark:text-blue-300 hidden sm:inline">Bloqueados</span>
              <Badge className="h-5 px-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                {urgent.blocked}
              </Badge>
            </Button>
          )}

          {urgent.overdue > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAlertClick?.("overdue")}
              className="h-7 gap-1.5 px-2 hover:bg-orange-100 dark:hover:bg-orange-900/20"
            >
              <TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-orange-900 dark:text-orange-300 hidden sm:inline">Atrasados</span>
              <Badge className="h-5 px-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white">
                {urgent.overdue}
              </Badge>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
