/**
 * ProgressTimeline Component
 * 
 * Customer-facing visual timeline showing production progress.
 * Displays all stages horizontally with completion status, dates, and animations.
 * 
 * Requirements: 2.4.1 Visual Progress Timeline
 * Task: 5.1.2 Create ProgressTimeline component
 */

import React from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================================================
// Types
// ============================================================================

export type ProductionStage =
  | "awaiting_choice"
  | "design"
  | "production"
  | "quality_check"
  | "packaging"
  | "shipped";

export interface StageInfo {
  name: ProductionStage;
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

// Stage configuration with emojis and labels
const STAGE_CONFIG: Record<
  ProductionStage,
  { label: string; emoji: string; order: number }
> = {
  awaiting_choice: { label: "Aguardando Escolha", emoji: "⏳", order: 1 },
  design: { label: "Design", emoji: "🎨", order: 2 },
  production: { label: "Produção", emoji: "🔨", order: 3 },
  quality_check: { label: "Controle de Qualidade", emoji: "✅", order: 4 },
  packaging: { label: "Embalagem", emoji: "📦", order: 5 },
  shipped: { label: "Enviado", emoji: "🚚", order: 6 },
};

// ============================================================================
// Component
// ============================================================================

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  stages,
  className,
}) => {
  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Calculate progress percentage
  const completedCount = sortedStages.filter((s) => s.status === "completed").length;
  const progressPercentage = (completedCount / sortedStages.length) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop/Tablet View */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Stages */}
          <div className="relative flex justify-between">
            {sortedStages.map((stage) => {
              const config = STAGE_CONFIG[stage.name];
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";

              return (
                <div
                  key={stage.name}
                  className="flex flex-col items-center flex-1 min-w-0"
                >
                  {/* Stage circle with emoji */}
                  <div
                    className={cn(
                      "relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white transition-all duration-300 shadow-md",
                      isCompleted && "bg-primary",
                      isCurrent && "bg-blue-500 ring-4 ring-blue-200 animate-pulse",
                      !isCompleted && !isCurrent && "bg-gray-300"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-8 w-8 text-white" />
                    ) : (
                      <span className="text-2xl" role="img" aria-label={config.label}>
                        {config.emoji}
                      </span>
                    )}
                  </div>

                  {/* Stage label */}
                  <div className="mt-3 text-center px-2">
                    <div
                      className={cn(
                        "text-sm font-medium mb-2",
                        isCurrent && "text-primary font-semibold",
                        !isCurrent && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      {config.label}
                    </div>

                    {/* Completion date */}
                    {isCompleted && stage.completedAt && (
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(stage.completedAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </Badge>
                    )}

                    {/* Current stage indicator */}
                    {isCurrent && (
                      <Badge className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Em Progresso
                      </Badge>
                    )}

                    {/* Estimated date for future stages */}
                    {!isCompleted && !isCurrent && stage.estimatedDate && (
                      <Badge variant="outline" className="text-xs">
                        Prev: {format(new Date(stage.estimatedDate), "dd/MM", {
                          locale: ptBR,
                        })}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile View - Vertical Timeline */}
      <div className="md:hidden space-y-4">
        {sortedStages.map((stage, index) => {
          const config = STAGE_CONFIG[stage.name];
          const isCompleted = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isLast = index === sortedStages.length - 1;

          return (
            <div key={stage.name} className="relative flex items-start gap-4">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-6 top-12 w-1 h-full -ml-0.5",
                    isCompleted ? "bg-primary" : "bg-gray-200"
                  )}
                />
              )}

              {/* Stage circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white transition-all duration-300 shadow-md flex-shrink-0",
                  isCompleted && "bg-primary",
                  isCurrent && "bg-blue-500 ring-4 ring-blue-200 animate-pulse",
                  !isCompleted && !isCurrent && "bg-gray-300"
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <span className="text-xl" role="img" aria-label={config.label}>
                    {config.emoji}
                  </span>
                )}
              </div>

              {/* Stage info */}
              <div className="flex-1 pb-4">
                <div
                  className={cn(
                    "text-base font-medium mb-1",
                    isCurrent && "text-primary font-semibold",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {config.label}
                </div>

                {/* Completion date */}
                {isCompleted && stage.completedAt && (
                  <Badge variant="secondary" className="text-xs">
                    Concluído em {format(new Date(stage.completedAt), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </Badge>
                )}

                {/* Current stage indicator */}
                {isCurrent && (
                  <Badge className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Em Progresso
                  </Badge>
                )}

                {/* Estimated date for future stages */}
                {!isCompleted && !isCurrent && stage.estimatedDate && (
                  <Badge variant="outline" className="text-xs">
                    Previsão: {format(new Date(stage.estimatedDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTimeline;
