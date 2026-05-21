import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Eye } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { metricsService } from "@/lib/services/metricsService";
import { cn } from "@/lib/utils";

interface GroupMetricsProps {
  groupId: string;
  className?: string;
}

/**
 * GroupMetrics - Displays key metrics for a group
 *
 * Metrics:
 * - Total members
 * - Total messages
 * - Estimated view rate (% of members who viewed after last message)
 *
 * Features:
 * - Loading skeleton
 * - Error handling
 * - Responsive grid layout
 */
export function GroupMetrics({ groupId, className }: GroupMetricsProps) {
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["group-metrics", groupId],
    queryFn: () => metricsService.getGroupMetrics(groupId),
    staleTime: 30000, // 30 seconds
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error || !metrics) {
    return (
      <div className={cn("bg-destructive/10 text-destructive px-4 py-3 rounded-lg", className)}>
        <p className="text-sm">
          Erro ao carregar métricas: {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {/* Total Members */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Membros</p>
              <p className="text-3xl font-bold">{metrics.total_members}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Messages */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Mensagens</p>
              <p className="text-3xl font-bold">{metrics.total_messages}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated View Rate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Eye className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Visualização</p>
              <p className="text-3xl font-bold">{Math.round(metrics.estimated_view_rate)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
