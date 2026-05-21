/**
 * StageHistoryPanel Component
 *
 * Displays a detailed history of all production stages for an order.
 * Shows completion times, notes, photos, duration per stage, and highlights
 * stages that took longer than average.
 */

import React, { useMemo } from "react";
import { Clock, FileText, Image as ImageIcon, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useProductionStageHistory,
  type ProductionStageRecord,
  type StageType,
} from "@/hooks/admin/useProductionStages";

// ============================================================================
// Types
// ============================================================================

interface StageHistoryPanelProps {
  productionQueueId: string;
}

// Stage display configuration
const STAGE_CONFIG: Record<StageType, { label: string; color: string }> = {
  awaiting_payment: { label: "Aguardando Pagamento", color: "bg-slate-500" },
  payment_confirmed: { label: "Pagamento Confirmado", color: "bg-emerald-500" },
  awaiting_choice: { label: "Aguardando Escolha", color: "bg-yellow-500" },
  model_preparation: { label: "Preparação do Modelo", color: "bg-blue-500" },
  printing: { label: "Em Impressão 3D", color: "bg-indigo-500" },
  post_processing: { label: "Limpeza e Preparação", color: "bg-violet-500" },
  painting: { label: "Pintura Artesanal", color: "bg-pink-500" },
  quality_check: { label: "Controle de Qualidade", color: "bg-green-500" },
  packaging: { label: "Embalagem", color: "bg-orange-500" },
  ready_to_ship: { label: "Pronto para Envio", color: "bg-amber-500" },
  shipped: { label: "Enviado", color: "bg-cyan-500" },
  delivered: { label: "Entregue", color: "bg-gray-500" },
};

// ============================================================================
// Component
// ============================================================================

export const StageHistoryPanel: React.FC<StageHistoryPanelProps> = ({
  productionQueueId,
}) => {
  // Fetch stage history
  const {
    data: stages = [],
    isLoading,
    error,
  } = useProductionStageHistory(productionQueueId);

  // Calculate average duration for completed stages
  const averageDuration = useMemo(() => {
    const completedStages = stages.filter(
      (stage) => stage.status === "completed" && stage.actualDuration !== null
    );

    if (completedStages.length === 0) return 0;

    const totalDuration = completedStages.reduce(
      (sum, stage) => sum + (stage.actualDuration || 0),
      0
    );

    return totalDuration / completedStages.length;
  }, [stages]);

  // Format duration
  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutos`;
    } else if (hours < 24) {
      return `${Math.round(hours)} horas`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0
        ? `${days} dias ${remainingHours} horas`
        : `${days} dias`;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if stage took longer than average
  const isSlowerThanAverage = (stage: ProductionStageRecord): boolean => {
    if (!stage.actualDuration || averageDuration === 0) return false;
    return stage.actualDuration > averageDuration * 1.5; // 50% longer than average
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Estágios</CardTitle>
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
          <CardTitle>Histórico de Estágios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Erro ao carregar histórico:{" "}
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Estágios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum estágio encontrado para este item.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Estágios</CardTitle>
        {averageDuration > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Duração média: {formatDuration(averageDuration)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages
            .sort((a, b) => a.stageOrder - b.stageOrder)
            .map((stage, index) => {
              const config = STAGE_CONFIG[stage.stageName];
              const isCompleted = stage.status === "completed";
              const isSlow = isSlowerThanAverage(stage);

              return (
                <div key={stage.id}>
                  {/* Stage header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* Stage indicator */}
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold",
                          config?.color || "bg-gray-500"
                        )}
                      >
                        {stage.stageOrder}
                      </div>

                      {/* Stage info */}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {config?.label || stage.stageName}
                        </h3>

                        {/* Status badge */}
                        <div className="flex items-center gap-2 mt-1">
                          {isCompleted && (
                            <Badge variant="secondary">Completo</Badge>
                          )}
                          {stage.status === "in_progress" && (
                            <Badge>Em Progresso</Badge>
                          )}
                          {stage.status === "pending" && (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                          {stage.isBlocked && (
                            <Badge variant="destructive">Bloqueado</Badge>
                          )}
                          {isSlow && (
                            <Badge
                              variant="outline"
                              className="border-orange-500 text-orange-700"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Acima da média
                            </Badge>
                          )}
                        </div>

                        {/* Assigned to */}
                        {stage.assignedToName && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Atribuído a: {stage.assignedToName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    {stage.actualDuration !== null && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Duração</span>
                        </div>
                        <div
                          className={cn(
                            "text-lg font-semibold mt-1",
                            isSlow && "text-orange-600"
                          )}
                        >
                          {formatDuration(stage.actualDuration)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage details */}
                  <div className="ml-13 mt-3 space-y-3">
                    {/* Timestamps */}
                    {(stage.startedAt || stage.completedAt) && (
                      <div className="text-sm space-y-1">
                        {stage.startedAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Iniciado:</span>
                            <span>{formatDate(stage.startedAt)}</span>
                          </div>
                        )}
                        {stage.completedAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Concluído:</span>
                            <span>{formatDate(stage.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Block reason */}
                    {stage.isBlocked && stage.blockReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">
                              Motivo do bloqueio:
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              {stage.blockReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {stage.notes && (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Notas:</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {stage.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {stage.photos && stage.photos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            Fotos ({stage.photos.length})
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {stage.photos.map((photoUrl, photoIndex) => (
                            <a
                              key={photoIndex}
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                            >
                              <img
                                src={photoUrl}
                                alt={`Foto ${photoIndex + 1} do estágio ${config?.label}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Separator between stages */}
                  {index < stages.length - 1 && <Separator className="mt-6" />}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StageHistoryPanel;
