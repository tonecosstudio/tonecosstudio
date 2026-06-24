import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProductionStageLabel } from "@/config/production-stages";
import { cn } from "@/lib/utils";
import type { ProductionStage } from "@/types/production";

export type { ProductionStage };

export interface StageInfo {
  name: string;
  displayName: string;
  status: "completed" | "current" | "upcoming";
  completedAt: string | null;
  estimatedDate?: string | null;
  order: number;
}

export interface ProgressTimelineProps {
  stages: StageInfo[];
  className?: string;
}

const STAGE_CONFIG: Record<
  ProductionStage,
  { label: string; shortCode: string; order: number }
> = {
  awaiting_payment: { label: "Aguardando Pagamento", shortCode: "PG", order: 1 },
  payment_confirmed: { label: "Pagamento Confirmado", shortCode: "OK", order: 2 },
  awaiting_choice: { label: "Aguardando Escolha", shortCode: "CH", order: 3 },
  model_preparation: { label: "Preparação do Modelo", shortCode: "MD", order: 4 },
  printing: { label: "Impressão 3D", shortCode: "3D", order: 5 },
  post_processing: { label: "Limpeza e Preparação", shortCode: "LP", order: 6 },
  painting: { label: "Pintura Artesanal", shortCode: "PT", order: 7 },
  quality_check: { label: "Controle de Qualidade", shortCode: "CQ", order: 8 },
  packaging: { label: "Embalagem", shortCode: "EM", order: 9 },
  ready_to_ship: { label: "Pronto para Envio", shortCode: "PE", order: 10 },
  shipped: { label: "Enviado", shortCode: "EV", order: 11 },
  delivered: { label: "Entregue", shortCode: "ET", order: 12 },
};

function getStageConfig(stage: StageInfo) {
  const configured = STAGE_CONFIG[stage.name as ProductionStage];
  const stageLabel = getProductionStageLabel(stage.name);
  const legacyLabelMap: Record<string, string> = {
    design: "Design",
    production: "Produção",
  };

  return {
    label:
      configured?.label ??
      legacyLabelMap[stage.name] ??
      (stageLabel !== stage.name ? stageLabel : stage.displayName || stageLabel),
    shortCode: configured?.shortCode ?? "ET",
    order: configured?.order ?? stage.order,
  };
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ stages, className }) => {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const completedCount = sortedStages.filter((stage) => stage.status === "completed").length;
  const progressPercentage =
    sortedStages.length > 0 ? (completedCount / sortedStages.length) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="hidden md:block">
        <div className="relative">
          <div className="absolute left-0 right-0 top-8 h-1 bg-[hsl(0,0%,12%)]">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="relative flex justify-between gap-3">
            {sortedStages.map((stage) => {
              const config = getStageConfig(stage);
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";

              return (
                <div key={stage.name} className="flex min-w-0 flex-1 flex-col items-center">
                  <div
                    className={cn(
                      "relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[hsl(0,0%,4%)] font-mono text-xs font-bold tracking-[0.18em] shadow-md transition-all duration-300",
                      isCompleted && "bg-primary text-[hsl(0,0%,7%)]",
                      isCurrent &&
                        "animate-pulse bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] ring-4 ring-[hsl(var(--gold-accent)/0.16)]",
                      !isCompleted && !isCurrent && "bg-[hsl(0,0%,14%)] text-[hsl(0,0%,72%)]"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-8 w-8 text-[hsl(0,0%,7%)]" />
                    ) : (
                      <span role="img" aria-label={config.label}>
                        {config.shortCode}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 px-2 text-center">
                    <div
                      className={cn(
                        "mb-2 text-sm font-medium",
                        isCurrent && "font-semibold text-white",
                        !isCurrent && !isCompleted && "text-[hsl(0,0%,58%)]"
                      )}
                    >
                      {config.label}
                    </div>

                    {isCompleted && stage.completedAt ? (
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(stage.completedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    ) : null}

                    {isCurrent ? (
                      <Badge className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        Em Progresso
                      </Badge>
                    ) : null}

                    {!isCompleted && !isCurrent && stage.estimatedDate ? (
                      <Badge variant="outline" className="text-xs">
                        Prev:{" "}
                        {format(new Date(stage.estimatedDate), "dd/MM", { locale: ptBR })}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {sortedStages.map((stage, index) => {
          const config = getStageConfig(stage);
          const isCompleted = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isLast = index === sortedStages.length - 1;

          return (
            <div key={stage.name} className="relative flex items-start gap-4">
              {!isLast ? (
                <div
                  className={cn(
                    "absolute left-6 top-12 h-full w-1 -ml-0.5",
                    isCompleted ? "bg-primary" : "bg-[hsl(0,0%,12%)]"
                  )}
                />
              ) : null}

              <div
                className={cn(
                  "relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-4 border-[hsl(0,0%,4%)] font-mono text-[11px] font-bold tracking-[0.16em] shadow-md transition-all duration-300",
                  isCompleted && "bg-primary text-[hsl(0,0%,7%)]",
                  isCurrent &&
                    "animate-pulse bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] ring-4 ring-[hsl(var(--gold-accent)/0.16)]",
                  !isCompleted && !isCurrent && "bg-[hsl(0,0%,14%)] text-[hsl(0,0%,72%)]"
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-[hsl(0,0%,7%)]" />
                ) : (
                  <span role="img" aria-label={config.label}>
                    {config.shortCode}
                  </span>
                )}
              </div>

              <div className="flex-1 pb-4">
                <div
                  className={cn(
                    "mb-1 text-base font-medium",
                    isCurrent && "font-semibold text-white",
                    !isCurrent && !isCompleted && "text-[hsl(0,0%,58%)]"
                  )}
                >
                  {config.label}
                </div>

                {isCompleted && stage.completedAt ? (
                  <Badge variant="secondary" className="text-xs">
                    Concluído em{" "}
                    {format(new Date(stage.completedAt), "dd/MM/yyyy", { locale: ptBR })}
                  </Badge>
                ) : null}

                {isCurrent ? (
                  <Badge className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Em Progresso
                  </Badge>
                ) : null}

                {!isCompleted && !isCurrent && stage.estimatedDate ? (
                  <Badge variant="outline" className="text-xs">
                    Previsão:{" "}
                    {format(new Date(stage.estimatedDate), "dd/MM/yyyy", { locale: ptBR })}
                  </Badge>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTimeline;
