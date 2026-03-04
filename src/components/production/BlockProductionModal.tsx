/**
 * BlockProductionModal Component
 *
 * Modal for blocking production items when issues arise.
 * Features:
 * - Reason textarea (required)
 * - Estimated resolution time input
 * - "Block" button
 * - Shows impact on estimated completion date
 *
 * Integrates with production-service.ts blockProduction function
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2, Clock, Calendar } from "lucide-react";
import { blockProduction } from "@/services/admin/production-service";
import { calculateEstimatedCompletion } from "@/services/admin/stage-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================================================
// Types
// ============================================================================

interface BlockProductionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productionQueueId: string;
  currentEstimatedCompletion?: Date | null;
  onBlock?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const BlockProductionModal: React.FC<BlockProductionModalProps> = ({
  isOpen,
  onOpenChange,
  productionQueueId,
  currentEstimatedCompletion,
  onBlock,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [estimatedResolutionHours, setEstimatedResolutionHours] = useState<string>("");
  const [newEstimatedCompletion, setNewEstimatedCompletion] = useState<Date | null>(null);

  // Calculate new estimated completion date when resolution time changes
  useEffect(() => {
    if (currentEstimatedCompletion && estimatedResolutionHours) {
      const hours = parseFloat(estimatedResolutionHours);
      if (!isNaN(hours) && hours > 0) {
        const newDate = new Date(currentEstimatedCompletion);
        newDate.setHours(newDate.getHours() + hours);
        setNewEstimatedCompletion(newDate);
      } else {
        setNewEstimatedCompletion(null);
      }
    } else {
      setNewEstimatedCompletion(null);
    }
  }, [currentEstimatedCompletion, estimatedResolutionHours]);

  // Block production mutation
  const blockProductionMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error("O motivo do bloqueio é obrigatório");
      }

      // Build reason with resolution time if provided
      let fullReason = reason.trim();
      if (estimatedResolutionHours) {
        const hours = parseFloat(estimatedResolutionHours);
        if (!isNaN(hours) && hours > 0) {
          fullReason += ` | Tempo estimado de resolução: ${formatDuration(hours)}`;
        }
      }

      return blockProduction(productionQueueId, fullReason);
    },
    onSuccess: () => {
      toast({
        title: "Produção Bloqueada",
        description: "O item foi marcado como bloqueado e o cliente será notificado.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      queryClient.invalidateQueries({ queryKey: ["production-stages", productionQueueId] });

      // Call callback if provided
      if (onBlock) {
        onBlock();
      }

      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Bloquear Produção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setReason("");
    setEstimatedResolutionHours("");
    setNewEstimatedCompletion(null);
  };

  // Handle modal close
  const handleOpenChange = (open: boolean) => {
    if (!open && !blockProductionMutation.isPending) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Format duration
  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutos`;
    } else if (hours < 24) {
      return `${Math.round(hours)} horas`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days} dias e ${remainingHours} horas` : `${days} dias`;
    }
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate delay in days
  const calculateDelay = (): number | null => {
    if (!currentEstimatedCompletion || !newEstimatedCompletion) return null;
    const diffMs = newEstimatedCompletion.getTime() - new Date(currentEstimatedCompletion).getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const delay = calculateDelay();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Bloquear Produção
          </DialogTitle>
          <DialogDescription>
            Bloqueie este item de produção quando houver problemas que impeçam o progresso.
            O cliente será notificado sobre o atraso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Bloquear a produção irá pausar o progresso deste item e notificar o cliente sobre o atraso.
              Certifique-se de fornecer uma explicação clara do problema.
            </AlertDescription>
          </Alert>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo do Bloqueio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Aguardando material em falta, equipamento quebrado, problema de qualidade..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será compartilhado com o cliente. Seja claro e profissional.
            </p>
          </div>

          {/* Estimated Resolution Time */}
          <div className="space-y-2">
            <Label htmlFor="resolution-time">
              Tempo Estimado de Resolução (Opcional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="resolution-time"
                type="number"
                min="0"
                step="0.5"
                placeholder="Ex: 24"
                value={estimatedResolutionHours}
                onChange={(e) => setEstimatedResolutionHours(e.target.value)}
                className="max-w-[150px]"
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Informe quanto tempo você estima para resolver o problema.
            </p>
          </div>

          {/* Impact on Estimated Completion Date */}
          {currentEstimatedCompletion && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Impacto na Data de Conclusão
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Current Estimated Date */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Data Atual Estimada</div>
                  <div className="text-sm font-medium">
                    {formatDate(currentEstimatedCompletion)}
                  </div>
                </div>

                {/* New Estimated Date */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Nova Data Estimada</div>
                  <div className="text-sm font-medium">
                    {newEstimatedCompletion ? (
                      <span className="text-destructive">
                        {formatDate(newEstimatedCompletion)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatDate(currentEstimatedCompletion)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delay Warning */}
              {delay !== null && delay > 0 && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <Clock className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-destructive">
                      Atraso de {delay} {delay === 1 ? "dia" : "dias"}
                    </span>
                    <p className="text-muted-foreground mt-1">
                      O cliente será notificado sobre o novo prazo estimado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={blockProductionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => blockProductionMutation.mutate()}
            disabled={blockProductionMutation.isPending || !reason.trim()}
          >
            {blockProductionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Bloqueando...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Bloquear Produção
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockProductionModal;
