/**
 * ProductionStageTracker Component
 *
 * Displays a horizontal timeline of production stages for an order.
 * Shows current stage, completed stages with checkmarks, time spent in each stage,
 * and provides a "Next Stage" button to advance production.
 */

import React, { useState } from "react";
import { Check, Clock, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  useProductionStageHistory,
  type ProductionStageRecord,
} from "@/hooks/admin/useProductionStages";
import { StageTransitionModal } from "./StageTransitionModal";
import { getProductionStageLabel } from "./production-stage-display";

// ============================================================================
// Types
// ============================================================================

interface ProductionStageTrackerProps {
  productionQueueId: string;
  onStageComplete?: (stage: ProductionStageRecord) => void;
}

// ============================================================================
// Component
// ============================================================================

export const ProductionStageTracker: React.FC<ProductionStageTrackerProps> = ({
  productionQueueId,
  onStageComplete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch stage history
  const {
    data: stages = [],
    isLoading,
    error,
  } = useProductionStageHistory(productionQueueId);

  // Find current stage (first non-completed stage)
  const currentStage = stages.find(
    (stage) => stage.status === "in_progress" || stage.status === "pending"
  );

  // Find next stage
  const nextStage = currentStage
    ? stages.find((stage) => stage.stageOrder === currentStage.stageOrder + 1)
    : null;

  // Calculate time spent in each stage
  const calculateDuration = (stage: ProductionStageRecord): string => {
    if (stage.actualDuration !== null) {
      return formatDuration(stage.actualDuration);
    }

    if (stage.startedAt && !stage.completedAt) {
      const elapsed = (Date.now() - new Date(stage.startedAt).getTime()) / (1000 * 60 * 60);
      return formatDuration(elapsed);
    }

    return "-";
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  // Handle next stage button click
  const handleNextStage = () => {
    if (!currentStage) {
      toast({
        title: "Nenhum Estágio Ativo",
        description: "Todos os estágios foram completados.",
        variant: "destructive",
      });
      return;
    }

    if (currentStage.isBlocked) {
      toast({
        title: "Estágio Bloqueado",
        description: "Este estágio está bloqueado. Desbloqueie antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    // Open the transition modal
    setIsModalOpen(true);
  };

  // Handle stage completion from modal
  const handleStageComplete = (updatedStage: ProductionStageRecord) => {
    if (onStageComplete) {
      onStageComplete(updatedStage);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Erro ao carregar estágios: {error instanceof Error ? error.message : "Erro desconhecido"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Progresso de Produção</CardTitle>
        {currentStage && (
          <Button
            onClick={handleNextStage}
            disabled={currentStage.isBlocked}
            size="sm"
          >
            Próximo Estágio
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${(stages.filter((s) => s.status === "completed").length / stages.length) * 100}%`,
              }}
            />
          </div>

          {/* Stages */}
          <div className="relative flex justify-between">
            {stages
              .sort((a, b) => a.stageOrder - b.stageOrder)
              .map((stage) => {
                const stageLabel = getProductionStageLabel(stage.stageName);
                const isCompleted = stage.status === "completed";
                const isCurrent = currentStage?.id === stage.id;
                const isBlocked = stage.isBlocked;

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center flex-1"
                  >
                    {/* Stage circle */}
                    <div
                      className={cn(
                        "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white transition-all duration-300",
                        isCompleted && "bg-primary",
                        isCurrent && !isBlocked && "bg-blue-500 ring-4 ring-blue-200",
                        isCurrent && isBlocked && "bg-red-500 ring-4 ring-red-200",
                        !isCompleted && !isCurrent && "bg-gray-300"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : isCurrent ? (
                        <Clock className="h-6 w-6 text-white" />
                      ) : (
                        <span className="text-sm font-semibold text-white">
                          {stage.stageOrder}
                        </span>
                      )}
                    </div>

                    {/* Stage label */}
                    <div className="mt-3 text-center">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isCurrent && "text-primary font-semibold",
                          !isCurrent && !isCompleted && "text-muted-foreground"
                        )}
                      >
                        {stageLabel}
                      </div>

                      {/* Time spent */}
                      <div className="mt-1 text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {calculateDuration(stage)}
                      </div>

                      {/* Status badges */}
                      <div className="mt-2 flex flex-col items-center gap-1">
                        {isCompleted && stage.completedAt && (
                          <Badge variant="secondary" className="text-xs">
                            {new Date(stage.completedAt).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                        {isBlocked && (
                          <Badge variant="destructive" className="text-xs">
                            Bloqueado
                          </Badge>
                        )}
                        {isCurrent && !isBlocked && (
                          <Badge className="text-xs">Em Progresso</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Current stage info */}
        {currentStage && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">
                  Estágio Atual: {getProductionStageLabel(currentStage.stageName)}
                </h4>
                {currentStage.assignedToName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Atribuído a: {currentStage.assignedToName}
                  </p>
                )}
                {currentStage.isBlocked && currentStage.blockReason && (
                  <p className="text-sm text-destructive mt-2">
                    Bloqueado: {currentStage.blockReason}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Tempo Estimado</div>
                <div className="text-lg font-semibold">
                  {formatDuration(currentStage.estimatedDuration)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All stages completed */}
        {!currentStage && stages.length > 0 && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-900">Todos os estágios foram completados!</p>
            <p className="text-sm text-green-700 mt-1">
              Este item foi enviado e está a caminho do cliente.
            </p>
          </div>
        )}
      </CardContent>

      {/* Stage Transition Modal */}
      {currentStage && (
        <StageTransitionModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          currentStage={currentStage}
          nextStage={nextStage ?? null}
          productionQueueId={productionQueueId}
          onComplete={handleStageComplete}
        />
      )}
    </Card>
  );
};

export default ProductionStageTracker;
