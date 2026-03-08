// @ts-nocheck
/**
 * UnblockProductionModal Component
 *
 * Modal for unblocking production items after issues are resolved.
 * Features:
 * - Show original block reason
 * - Add resolution notes
 * - Add "Unblock & Resume" button
 * - Show new estimated completion date
 *
 * Integrates with production-service.ts unblockProduction function
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, Loader2, Calendar, AlertCircle } from "lucide-react";
import { unblockProduction } from "@/services/admin/production-service";
import { calculateEstimatedCompletion } from "@/services/admin/stage-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface UnblockProductionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productionQueueId: string;
  onUnblock?: () => void;
}

interface BlockInfo {
  blockReason: string;
  blockedAt: string;
  currentStage: string;
}

// ============================================================================
// Component
// ============================================================================

export const UnblockProductionModal: React.FC<UnblockProductionModalProps> = ({
  isOpen,
  onOpenChange,
  productionQueueId,
  onUnblock,
}) => {
  const queryClient = useQueryClient();
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [newEstimatedCompletion, setNewEstimatedCompletion] = useState<Date | null>(null);

  // Fetch block information
  const { data: blockInfo, isLoading: isLoadingBlockInfo } = useQuery({
    queryKey: ["production-block-info", productionQueueId],
    queryFn: async (): Promise<BlockInfo> => {
      // Get production queue item to find current stage
      const { data: queueItem, error: queueError } = await supabase
        .from("production_queue")
        .select("current_stage, production_notes")
        .eq("id", productionQueueId)
        .single();

      if (queueError || !queueItem) {
        throw new Error("Erro ao buscar informações do item");
      }

      // Get stage information to find block reason
      const { data: stageData, error: stageError } = await supabase
        .from("production_stages")
        .select("block_reason, blocked_at")
        .eq("production_queue_id", productionQueueId)
        .eq("stage_name", queueItem.current_stage)
        .eq("is_blocked", true)
        .single();

      if (stageError || !stageData) {
        // Fallback to production_notes if stage data not found
        return {
          blockReason: queueItem.production_notes || "Motivo não especificado",
          blockedAt: new Date().toISOString(),
          currentStage: queueItem.current_stage,
        };
      }

      return {
        blockReason: stageData.block_reason || "Motivo não especificado",
        blockedAt: stageData.blocked_at,
        currentStage: queueItem.current_stage,
      };
    },
    enabled: isOpen,
  });

  // Calculate new estimated completion date when modal opens
  useEffect(() => {
    if (isOpen && productionQueueId) {
      calculateEstimatedCompletion(productionQueueId)
        .then((date) => setNewEstimatedCompletion(date))
        .catch((error) => {
          console.error("Erro ao calcular data estimada:", error);
          setNewEstimatedCompletion(null);
        });
    }
  }, [isOpen, productionQueueId]);

  // Unblock production mutation
  const unblockProductionMutation = useMutation({
    mutationFn: async () => {
      // First, update the stage to unblock it
      if (blockInfo) {
        await supabase
          .from("production_stages")
          .update({
            is_blocked: false,
            block_reason: null,
            unblocked_at: new Date().toISOString(),
            status: "in_progress",
            notes: resolutionNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("production_queue_id", productionQueueId)
          .eq("stage_name", blockInfo.currentStage);
      }

      // Then unblock the production queue item
      return unblockProduction(productionQueueId);
    },
    onSuccess: () => {
      toast({
        title: "Produção Desbloqueada",
        description: "O item foi desbloqueado e a produção pode continuar.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      queryClient.invalidateQueries({ queryKey: ["production-stages", productionQueueId] });
      queryClient.invalidateQueries({ queryKey: ["production-block-info", productionQueueId] });

      // Call callback if provided
      if (onUnblock) {
        onUnblock();
      }

      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Desbloquear Produção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setResolutionNotes("");
    setNewEstimatedCompletion(null);
  };

  // Handle modal close
  const handleOpenChange = (open: boolean) => {
    if (!open && !unblockProductionMutation.isPending) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Format date
  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate blocked duration
  const calculateBlockedDuration = (): string => {
    if (!blockInfo?.blockedAt) return "Desconhecido";

    const blockedDate = new Date(blockInfo.blockedAt);
    const now = new Date();
    const diffMs = now.getTime() - blockedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return remainingHours > 0
        ? `${diffDays} ${diffDays === 1 ? "dia" : "dias"} e ${remainingHours} ${remainingHours === 1 ? "hora" : "horas"}`
        : `${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
    } else if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Desbloquear Produção
          </DialogTitle>
          <DialogDescription>
            Desbloqueie este item de produção após resolver o problema que causou o bloqueio.
            O cliente será notificado sobre a retomada da produção.
          </DialogDescription>
        </DialogHeader>

        {isLoadingBlockInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>
                Ao desbloquear, a produção será retomada e uma nova data estimada de conclusão será calculada.
              </AlertDescription>
            </Alert>

            {/* Original Block Reason */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Motivo Original do Bloqueio</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{blockInfo?.blockReason || "Motivo não especificado"}</p>
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Bloqueado em: {blockInfo?.blockedAt ? formatDate(blockInfo.blockedAt) : "Desconhecido"}</span>
                  <span>Duração: {calculateBlockedDuration()}</span>
                </div>
              </div>
            </div>

            {/* Resolution Notes */}
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">
                Notas de Resolução <span className="text-muted-foreground">(Opcional)</span>
              </Label>
              <Textarea
                id="resolution-notes"
                placeholder="Descreva como o problema foi resolvido e quais ações foram tomadas..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas notas serão registradas no histórico do item para referência futura.
              </p>
            </div>

            {/* New Estimated Completion Date */}
            {newEstimatedCompletion && (
              <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Calendar className="h-4 w-4" />
                  Nova Data Estimada de Conclusão
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Data Estimada</div>
                  <div className="text-base font-semibold text-green-700 dark:text-green-400">
                    {formatDate(newEstimatedCompletion)}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Esta é a nova data estimada de conclusão após desbloquear a produção.
                  O cliente será notificado sobre a atualização.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={unblockProductionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={() => unblockProductionMutation.mutate()}
            disabled={unblockProductionMutation.isPending || isLoadingBlockInfo}
            className="bg-green-600 hover:bg-green-700"
          >
            {unblockProductionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Desbloqueando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Desbloquear & Retomar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnblockProductionModal;
