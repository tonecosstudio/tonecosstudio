// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForecastMonth {
  month: number;
  year: number;
  projectedUsage: number;
  capacityLimit: number;
  utilizationPercentage: number;
  exceedsCapacity: boolean;
}

export function CapacityForecast() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastMonth[]>([]);

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    try {
      setLoading(true);

      // Calculate next 3 months
      const forecastData: ForecastMonth[] = [];
      const today = new Date();

      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const month = futureDate.getMonth() + 1;
        const year = futureDate.getFullYear();

        // Get or estimate cycles for this month
        const { data: cycles, error: cyclesError } = await supabase
          .from("cycles")
          .select("id, cycle_number, capacity_max, capacity_current")
          .eq("month", month)
          .eq("year", year)
          .order("cycle_number");

        if (cyclesError) throw cyclesError;

        // Calculate total capacity limit for the month
        let totalCapacityLimit = 0;
        let currentUsage = 0;

        if (cycles && cycles.length > 0) {
          // Cycles exist - use actual values
          totalCapacityLimit = cycles.reduce((sum, cycle) => sum + (cycle.capacity_max || 100), 0);
          currentUsage = cycles.reduce((sum, cycle) => sum + (cycle.capacity_current || 0), 0);
        } else {
          // Cycles don't exist yet - use default capacity (100 per cycle = 200 per month)
          totalCapacityLimit = 200;
        }

        // Count scheduled deliveries for this month
        const { data: scheduledDeliveries, error: deliveriesError } = await supabase
          .from("subscription_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("status", "scheduled")
          .gte("expected_delivery_date", `${year}-${String(month).padStart(2, "0")}-01`)
          .lt("expected_delivery_date", `${year}-${String(month + 1).padStart(2, "0")}-01`);

        if (deliveriesError) throw deliveriesError;

        const scheduledCount = scheduledDeliveries || 0;

        // Count active subscriptions that will have deliveries in this month
        // This is an approximation based on subscription creation dates and plan types
        const { data: activeSubscriptions, error: subsError } = await supabase
          .from("subscriptions")
          .select("id, plan_type, deliveries_completed, deliveries_total, created_at")
          .eq("status", "active");

        if (subsError) throw subsError;

        // Estimate deliveries from active subscriptions
        let estimatedDeliveries = 0;
        if (activeSubscriptions) {
          for (const sub of activeSubscriptions) {
            const remainingDeliveries = sub.deliveries_total - sub.deliveries_completed;
            if (remainingDeliveries > 0) {
              // Simple heuristic: assume deliveries are spread monthly
              // This is a rough estimate - in production, you'd calculate exact delivery schedules
              const monthsSinceCreation = Math.floor(
                (futureDate.getTime() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
              );
              
              // If this subscription would have a delivery in this month
              if (monthsSinceCreation >= 0 && monthsSinceCreation < remainingDeliveries) {
                estimatedDeliveries++;
              }
            }
          }
        }

        // Count standalone purchases for this month
        const { data: standalonePurchases, error: standaloneError } = await supabase
          .from("standalone_purchases")
          .select("id", { count: "exact", head: true })
          .in("status", ["deposit_paid", "awaiting_balance", "balance_paid"])
          .gte("created_at", `${year}-${String(month).padStart(2, "0")}-01`)
          .lt("created_at", `${year}-${String(month + 1).padStart(2, "0")}-01`);

        if (standaloneError) throw standaloneError;

        const standaloneCount = standalonePurchases || 0;

        // Calculate projected usage
        const projectedUsage = currentUsage + scheduledCount + estimatedDeliveries + standaloneCount;
        const utilizationPercentage = totalCapacityLimit > 0 
          ? Math.round((projectedUsage / totalCapacityLimit) * 100) 
          : 0;
        const exceedsCapacity = projectedUsage > totalCapacityLimit;

        forecastData.push({
          month,
          year,
          projectedUsage,
          capacityLimit: totalCapacityLimit,
          utilizationPercentage,
          exceedsCapacity,
        });
      }

      setForecast(forecastData);
    } catch (error: any) {
      console.error("Error loading capacity forecast:", error);
      toast({
        title: "Erro ao carregar previsão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return months[month - 1];
  };

  const getStatusIcon = (exceedsCapacity: boolean, percentage: number) => {
    if (exceedsCapacity) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    if (percentage >= 80) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getRowClassName = (exceedsCapacity: boolean, percentage: number) => {
    if (exceedsCapacity) {
      return "bg-red-50 dark:bg-red-950/20";
    }
    if (percentage >= 80) {
      return "bg-yellow-50 dark:bg-yellow-950/20";
    }
    return "";
  };

  const getUtilizationColor = (exceedsCapacity: boolean, percentage: number) => {
    if (exceedsCapacity) {
      return "text-red-600 dark:text-red-400 font-bold";
    }
    if (percentage >= 80) {
      return "text-yellow-600 dark:text-yellow-400 font-semibold";
    }
    return "text-green-600 dark:text-green-400";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previsão de Capacidade
          </CardTitle>
          <CardDescription>
            Projeção de uso de capacidade para os próximos 3 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = forecast.some(f => f.exceedsCapacity || f.utilizationPercentage >= 80);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Previsão de Capacidade
        </CardTitle>
        <CardDescription>
          Projeção de uso de capacidade para os próximos 3 meses baseada em assinaturas ativas e entregas agendadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasWarnings && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Um ou mais meses podem exceder a capacidade de produção. Considere aumentar os limites ou gerenciar as entregas.
            </AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Mês/Ano</TableHead>
              <TableHead className="text-right">Uso Projetado</TableHead>
              <TableHead className="text-right">Limite de Capacidade</TableHead>
              <TableHead className="text-right">Utilização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecast.map((monthData) => (
              <TableRow 
                key={`${monthData.year}-${monthData.month}`}
                className={getRowClassName(monthData.exceedsCapacity, monthData.utilizationPercentage)}
              >
                <TableCell>
                  {getStatusIcon(monthData.exceedsCapacity, monthData.utilizationPercentage)}
                </TableCell>
                <TableCell className="font-medium">
                  {getMonthName(monthData.month)} {monthData.year}
                </TableCell>
                <TableCell className="text-right">
                  {monthData.projectedUsage} peças
                </TableCell>
                <TableCell className="text-right">
                  {monthData.capacityLimit} peças
                </TableCell>
                <TableCell className={`text-right ${getUtilizationColor(monthData.exceedsCapacity, monthData.utilizationPercentage)}`}>
                  {monthData.utilizationPercentage}%
                  {monthData.exceedsCapacity && (
                    <span className="ml-2 text-xs">
                      (Excede em {monthData.projectedUsage - monthData.capacityLimit})
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Legenda:</p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Capacidade normal (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-muted-foreground">Atenção (80-100%)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-muted-foreground">Excede capacidade (&gt;100%)</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Nota:</strong> Esta previsão é baseada em assinaturas ativas, entregas agendadas e compras avulsas. 
            Os valores são estimativas e podem variar conforme novas assinaturas são criadas ou canceladas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
