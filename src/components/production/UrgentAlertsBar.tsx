import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductionMetrics, type ProductionMetrics } from "@/services/admin/production-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Ban,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getNotificationPreferences,
  checkAndNotifyAlerts,
} from "@/services/notifications/alert-notification-service";

/**
 * UrgentAlertsBar Component
 * 
 * Displays critical alerts at the top of the production dashboard to help admins
 * quickly identify items that need immediate attention.
 * 
 * Alert Types:
 * - Red Badge: Items with deadline < 24h (critical)
 * - Yellow Badge: Pending choices approaching deadline (warning)
 * - Blue Badge: Blocked items (info)
 * - Orange Badge: Items exceeding average stage time (attention)
 * 
 * Features:
 * - Real-time updates via Supabase Realtime
 * - Clickable alerts to filter dashboard
 * - Color-coded badges for visual urgency
 */

interface UrgentAlertsBarProps {
  onAlertClick?: (alertType: AlertType) => void;
}

export type AlertType = "deadline_critical" | "deadline_urgent" | "blocked" | "overdue";

export function UrgentAlertsBar({ onAlertClick }: UrgentAlertsBarProps) {
  const queryClient = useQueryClient();
  const previousMetricsRef = useRef<ProductionMetrics | null>(null);

  // Fetch production metrics
  const { data: metrics, isLoading, error } = useQuery<ProductionMetrics>({
    queryKey: ["production-metrics"],
    queryFn: fetchProductionMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Monitor metrics changes and trigger notifications
  useEffect(() => {
    if (metrics && previousMetricsRef.current) {
      const preferences = getNotificationPreferences();
      checkAndNotifyAlerts(metrics, previousMetricsRef.current, preferences);
    }
    
    if (metrics) {
      previousMetricsRef.current = metrics;
    }
  }, [metrics]);

  // Set up real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("urgent-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_queue",
        },
        () => {
          // Invalidate metrics query when production_queue changes
          queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Carregando alertas...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="text-sm text-destructive">
            Erro ao carregar alertas: {error instanceof Error ? error.message : "Erro desconhecido"}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const { urgent } = metrics;

  // Calculate if there are any urgent alerts
  const hasUrgentAlerts =
    urgent.deadlineCritical > 0 ||
    urgent.deadlineUrgent > 0 ||
    urgent.blocked > 0 ||
    urgent.overdue > 0;

  if (!hasUrgentAlerts) {
    return (
      <Card className="border border-green-200 bg-green-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="font-medium">✓ Nenhum alerta urgente no momento</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAlertClick = (alertType: AlertType) => {
    if (onAlertClick) {
      onAlertClick(alertType);
    }
  };

  return (
    <Card className="border border-orange-200 bg-orange-50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">
              Alertas Urgentes
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Critical Deadline Alert (< 24h) - Red Badge */}
            {urgent.deadlineCritical > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAlertClick("deadline_critical")}
                className="flex items-center gap-2 hover:bg-red-100"
              >
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-900">
                  Prazo &lt; 24h
                </span>
                <Badge
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 border-0"
                >
                  {urgent.deadlineCritical}
                </Badge>
              </Button>
            )}

            {/* Urgent Deadline Alert (pending choices) - Yellow Badge */}
            {urgent.deadlineUrgent > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAlertClick("deadline_urgent")}
                className="flex items-center gap-2 hover:bg-yellow-100"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-900">
                  Escolhas Pendentes
                </span>
                <Badge
                  variant="secondary"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                >
                  {urgent.deadlineUrgent}
                </Badge>
              </Button>
            )}

            {/* Blocked Items Alert - Blue Badge */}
            {urgent.blocked > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAlertClick("blocked")}
                className="flex items-center gap-2 hover:bg-blue-100"
              >
                <Ban className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-900">
                  Itens Bloqueados
                </span>
                <Badge
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  {urgent.blocked}
                </Badge>
              </Button>
            )}

            {/* Overdue Items Alert (exceeding average stage time) - Orange Badge */}
            {urgent.overdue > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAlertClick("overdue")}
                className="flex items-center gap-2 hover:bg-orange-100"
              >
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-900">
                  Tempo Excedido
                </span>
                <Badge
                  variant="secondary"
                  className="bg-orange-600 hover:bg-orange-700 text-white border-0"
                >
                  {urgent.overdue}
                </Badge>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
