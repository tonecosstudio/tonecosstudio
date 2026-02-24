/**
 * Componente de Gerenciamento de Ciclos
 * Interface admin para visualizar e gerenciar ciclos (v2.0)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  Package,
  Truck,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useBatchInfo } from "@/hooks/useBatchInfo";
import {
  formatBatchDate,
  formatBatchDateFull,
  getDaysUntilSalesEnd,
  getBatchSummary,
  getCustomerDeadlineText,
  getStatusText,
} from "@/lib/services/batchCalculator";

export function CycleManagement() {
  const { currentBatch, nextBatch, futureBatches, isLoading } = useBatchInfo(6);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentBatch) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as informações do ciclo atual.
        </AlertDescription>
      </Alert>
    );
  }

  const daysLeft = getDaysUntilSalesEnd(currentBatch);
  const isClosingSoon = daysLeft <= 3 && daysLeft > 0;

  return (
    <div className="space-y-6">
      {/* Alerta de Fechamento Próximo */}
      {isClosingSoon && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-600">Atenção: Ciclo Fechando em Breve!</AlertTitle>
          <AlertDescription className="text-orange-600">
            Faltam apenas {daysLeft} dias para o fechamento do {currentBatch.name}. Prepare-se para
            o próximo ciclo.
          </AlertDescription>
        </Alert>
      )}

      {/* Ciclo Atual */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                {currentBatch.name}
              </CardTitle>
              <CardDescription className="text-base mt-2">Ciclo atual em andamento</CardDescription>
            </div>
            <Badge variant="default" className="text-lg px-4 py-2">
              {currentBatch.cycleType === "cycle1" ? "Ciclo 1" : "Ciclo 2"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-semibold">Status:</span>
            <span>{getStatusText(currentBatch.status)}</span>
          </div>

          {/* Grid de Informações */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Vendas */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Calendar className="h-5 w-5" />
                <h3 className="font-semibold">Vendas</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Início:</strong> {formatBatchDateFull(currentBatch.salesStart)}
                </p>
                <p>
                  <strong>Fim:</strong> {formatBatchDateFull(currentBatch.salesEnd)}
                </p>
                <p>
                  <strong>Duração:</strong> {currentBatch.salesDuration} dias
                </p>
                {daysLeft > 0 && (
                  <p
                    className={
                      isClosingSoon ? "text-orange-600 font-semibold" : "text-primary font-semibold"
                    }
                  >
                    <Clock className="inline h-4 w-4 mr-1" />
                    Faltam {daysLeft} dias
                  </p>
                )}
              </div>
            </div>

            {/* Produção */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-amber-600">
                <Package className="h-5 w-5" />
                <h3 className="font-semibold">Produção</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Início:</strong> {formatBatchDateFull(currentBatch.productionStart)}
                </p>
                <p>
                  <strong>Fim:</strong> {formatBatchDateFull(currentBatch.productionEnd)}
                </p>
                <p>
                  <strong>Duração:</strong> {currentBatch.productionDuration} dias
                </p>
              </div>
            </div>

            {/* Envio */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <Truck className="h-5 w-5" />
                <h3 className="font-semibold">Envio</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Prazo:</strong> Até {currentBatch.shippingDeadline}º dia útil
                </p>
                <p>
                  <strong>Data:</strong> {formatBatchDateFull(currentBatch.shippingDeadlineDate)}
                </p>
                <p>
                  <strong>Mês:</strong> {currentBatch.shippingMonth}/{currentBatch.shippingYear}
                </p>
              </div>
            </div>

            {/* Prazos para Cliente */}
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-purple-600">
                <Info className="h-5 w-5" />
                <h3 className="font-semibold">Prazos para Cliente</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Mínimo:</strong> ~{currentBatch.minDeliveryDays} dias
                </p>
                <p>
                  <strong>Máximo:</strong> ~{currentBatch.maxDeliveryDays} dias
                </p>
                <p>
                  <strong>Médio:</strong> ~{currentBatch.avgDeliveryDays} dias
                </p>
              </div>
            </div>
          </div>

          {/* Resumo Textual */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{getBatchSummary(currentBatch)}</p>
          </div>

          {/* Texto para Cliente */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
              Texto para Comunicação com Cliente:
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {getCustomerDeadlineText(currentBatch)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Próximo Ciclo */}
      {nextBatch && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  {nextBatch.name}
                </CardTitle>
                <CardDescription>Próximo ciclo</CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                {nextBatch.cycleType === "cycle1" ? "Ciclo 1" : "Ciclo 2"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Vendas</p>
                <p className="font-medium">
                  {formatBatchDate(nextBatch.salesStart)} a {formatBatchDate(nextBatch.salesEnd)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Produção</p>
                <p className="font-medium">
                  {formatBatchDate(nextBatch.productionStart)} a{" "}
                  {formatBatchDate(nextBatch.productionEnd)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Envio</p>
                <p className="font-medium">
                  Até {formatBatchDateFull(nextBatch.shippingDeadlineDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendário de Próximos Ciclos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Calendário dos Próximos Ciclos</CardTitle>
          <CardDescription>
            Visualização dos próximos {futureBatches.length} ciclos (próximos{" "}
            {Math.ceil(futureBatches.length / 2)} meses)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {futureBatches.map((batch, index) => {
              const isCurrent = index === 0;
              const isNext = index === 1;

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : isNext
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{batch.name}</span>
                      <Badge variant={isCurrent ? "default" : "outline"} className="text-xs">
                        {batch.cycleType === "cycle1" ? "Ciclo 1" : "Ciclo 2"}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Atual
                        </Badge>
                      )}
                      {isNext && (
                        <Badge variant="secondary" className="text-xs">
                          Próximo
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Prazo médio: ~{batch.avgDeliveryDays} dias
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Vendas</p>
                      <p>
                        {formatBatchDate(batch.salesStart)} - {formatBatchDate(batch.salesEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produção</p>
                      <p>
                        {formatBatchDate(batch.productionStart)} -{" "}
                        {formatBatchDate(batch.productionEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Envio</p>
                      <p>Até {formatBatchDateFull(batch.shippingDeadlineDate)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Ações</CardTitle>
          <CardDescription>Gerenciar ciclos e configurações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informação</AlertTitle>
            <AlertDescription>
              Os ciclos são calculados automaticamente baseado na data atual. Para avançar
              manualmente para o próximo ciclo, use o botão abaixo.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline" disabled>
              <ArrowRight className="h-4 w-4 mr-2" />
              Avançar para Próximo Ciclo
            </Button>
            <Button variant="outline" disabled>
              <Calendar className="h-4 w-4 mr-2" />
              Exportar Calendário
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nota: Funcionalidades de gerenciamento manual serão implementadas em versões futuras.
            Por enquanto, os ciclos são gerenciados automaticamente pelo sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
