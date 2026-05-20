import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProductionLimit } from "@/hooks/useProductionLimit";

export function ProductionLimitBadge() {
  const { limit, isLoading } = useProductionLimit();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Clock className="h-3 w-3 animate-spin" />
        Carregando...
      </Badge>
    );
  }

  if (!limit) return null;

  const isClosed = limit.prod_is_closed;
  const isAlmostFull = limit.prod_percentage_sold >= 80;
  const monthName = new Date(limit.prod_year, limit.prod_month - 1).toLocaleDateString("pt-BR", {
    month: "long",
  });

  if (isClosed) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Produção do mês esgotada!</strong>
          <br />
          Todas as {limit.prod_global_limit} vagas foram preenchidas.
          <br />
          Próxima abertura: 15 de{" "}
          {new Date(limit.prod_year, limit.prod_month).toLocaleDateString("pt-BR", {
            month: "long",
          })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAlmostFull ? (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium">
            Ciclo de {monthName} {limit.prod_year}
          </span>
        </div>
        <Badge variant={isAlmostFull ? "destructive" : "secondary"} className="gap-1">
          Produção limitada: {limit.prod_global_limit} peças
        </Badge>
      </div>

      {limit.prod_units_sold > 0 && (
        <div className="space-y-1">
          <Progress
            value={limit.prod_percentage_sold}
            className="h-2"
            indicatorClassName={isAlmostFull ? "bg-orange-500" : "bg-green-500"}
          />
          <p className="text-xs text-muted-foreground text-right">
            {limit.prod_available} vagas restantes
          </p>
        </div>
      )}

      {isAlmostFull && (
        <Alert variant="default" className="border-orange-500/50">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-xs">
            Últimas vagas disponíveis neste ciclo
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
