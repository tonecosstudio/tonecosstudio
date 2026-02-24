/**
 * Banner de Informações do Ciclo Atual
 * Busca dados dinamicamente usando o novo modelo de ciclos (v2.0)
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useBatchInfo } from "@/hooks/useBatchInfo";
import {
  formatBatchDate,
  formatBatchDateFull,
  getDaysUntilSalesEnd,
} from "@/lib/services/batchCalculator";
import { Skeleton } from "@/components/ui/skeleton";

interface BatchInfoBannerProps {
  showButton?: boolean;
  buttonText?: string;
  buttonLink?: string;
}

export function BatchInfoBanner({
  showButton = true,
  buttonText = "Ver Planos",
  buttonLink = "/planos",
}: BatchInfoBannerProps) {
  const { currentBatch, isLoading } = useBatchInfo();

  if (isLoading) {
    return (
      <Alert className="border-primary/20 bg-primary/5">
        <Skeleton className="h-20 w-full" />
      </Alert>
    );
  }

  if (!currentBatch) {
    return null;
  }

  const daysLeft = getDaysUntilSalesEnd(currentBatch);
  const isClosingSoon = daysLeft <= 3;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Calendar className="h-5 w-5 text-primary" />
      <AlertTitle className="ml-2 text-lg font-semibold">🔥 {currentBatch.name} Aberto!</AlertTitle>
      <AlertDescription className="ml-2 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Vendas:</strong> {formatBatchDate(currentBatch.salesStart)} a{" "}
              {formatBatchDate(currentBatch.salesEnd)} ({currentBatch.salesDuration} dias)
            </p>
            <p className="text-sm">
              <strong>Produção:</strong> {formatBatchDate(currentBatch.productionStart)} a{" "}
              {formatBatchDate(currentBatch.productionEnd)} ({currentBatch.productionDuration} dias)
            </p>
            <p className="text-sm">
              <strong>Envio:</strong> Até {formatBatchDateFull(currentBatch.shippingDeadlineDate)} (
              {currentBatch.shippingMonth}/{currentBatch.shippingYear})
            </p>
            {daysLeft > 0 && (
              <p
                className={`text-sm font-semibold flex items-center gap-2 ${isClosingSoon ? "text-orange-600" : "text-primary"}`}
              >
                <Clock className="w-4 h-4" />
                {isClosingSoon ? "⚠️ " : ""}Faltam {daysLeft} dias para o fechamento!
              </p>
            )}
          </div>
          {showButton && (
            <Button asChild>
              <Link to={buttonLink}>
                {buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
