import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package, Truck, CheckCircle } from "lucide-react";
import { useBatchInfo } from "@/hooks/useBatchInfo";
import { formatBatchDate, formatBatchDateFull } from "@/lib/services/batchCalculator";

export function ReleaseTimeline() {
  const { currentBatch, isLoading } = useBatchInfo();

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentBatch) return null;

  const timeline = [
    {
      phase: "Vendas",
      period: `${formatBatchDate(currentBatch.salesStart)} – ${formatBatchDate(currentBatch.salesEnd)}`,
      duration: `${currentBatch.salesDuration} dias`,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Período de vendas aberto para todas as coleções",
      status: "active",
    },
    {
      phase: "Produção",
      period: `${formatBatchDate(currentBatch.productionStart)} – ${formatBatchDate(currentBatch.productionEnd)}`,
      duration: `${currentBatch.productionDuration} dias`,
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Produção artesanal das peças",
      status: "upcoming",
    },
    {
      phase: "Envio",
      period: `Até ${currentBatch.shippingDeadline}º dia útil`,
      duration: `${currentBatch.shippingDeadline} dias úteis`,
      icon: Truck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Embalagem e postagem (considera feriados)",
      status: "upcoming",
    },
    {
      phase: "Entrega",
      period: currentBatch.shippingMonth,
      duration: "Segunda quinzena",
      icon: CheckCircle,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Receba em casa",
      status: "upcoming",
    },
  ];

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">📊 {currentBatch.name}</CardTitle>
            <CardDescription className="text-base mt-2">
              Cronograma do ciclo atual - Todas as coleções seguem o mesmo padrão
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            {currentBatch.cycleType === "cycle1" ? "Ciclo 1" : "Ciclo 2"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {timeline.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.status === "active";

            return (
              <div
                key={index}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Número da Fase */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border-2 border-current flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Ícone */}
                <div
                  className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center mb-3`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{item.phase}</h3>
                    {isActive && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Agora</Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{item.period}</p>
                    <p className="text-xs text-muted-foreground">{item.duration}</p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Linha conectora (exceto último) */}
                {index < timeline.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Nota Importante */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">📅 Modelo Recorrente:</strong> Operamos com 2 ciclos
            por mês. Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia). Cada ciclo tem seu próprio
            cronograma de produção e envio. Envio em até {currentBatch.shippingDeadline} dias úteis
            (considera feriados). Prazo médio:{" "}
            <strong className="text-foreground">~{currentBatch.avgDeliveryDays} dias</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
