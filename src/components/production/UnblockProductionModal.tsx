import { useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useEstimatedProductionCompletion,
  useProductionBlockInfo,
  useUnblockProduction,
} from "@/hooks/admin/useUnblockProduction";

interface UnblockProductionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productionQueueId: string;
  onUnblock?: () => void;
}

export function UnblockProductionModal({
  isOpen,
  onOpenChange,
  productionQueueId,
  onUnblock,
}: UnblockProductionModalProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const { data: blockInfo, isLoading: isLoadingBlockInfo } = useProductionBlockInfo(
    productionQueueId,
    isOpen
  );
  const { data: estimatedCompletion } = useEstimatedProductionCompletion(productionQueueId, isOpen);
  const unblockProductionMutation = useUnblockProduction({
    productionQueueId,
    onSuccess: () => {
      resetForm();
      onUnblock?.();
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setResolutionNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !unblockProductionMutation.isPending) {
      resetForm();
    }

    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Desbloquear Producao
          </DialogTitle>
          <DialogDescription>
            Desbloqueie este item de producao apos resolver o problema que causou o bloqueio.
            O cliente sera notificado sobre a retomada da producao.
          </DialogDescription>
        </DialogHeader>

        {isLoadingBlockInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Informacao</AlertTitle>
              <AlertDescription>
                Ao desbloquear, a producao sera retomada e uma nova data estimada de conclusao
                sera calculada.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Motivo Original do Bloqueio</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">
                  {blockInfo?.blockReason || "Motivo nao especificado"}
                </p>
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Bloqueado em:{" "}
                    {blockInfo?.blockedAt ? formatDate(blockInfo.blockedAt) : "Desconhecido"}
                  </span>
                  <span>Duracao: {formatBlockedDuration(blockInfo?.blockedAt)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-notes">
                Notas de Resolucao <span className="text-muted-foreground">(Opcional)</span>
              </Label>
              <Textarea
                id="resolution-notes"
                placeholder="Descreva como o problema foi resolvido e quais acoes foram tomadas..."
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas notas serao registradas no historico do item para referencia futura.
              </p>
            </div>

            {estimatedCompletion && (
              <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Calendar className="h-4 w-4" />
                  Nova Data Estimada de Conclusao
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Data Estimada</div>
                  <div className="text-base font-semibold text-green-700 dark:text-green-400">
                    {formatDate(estimatedCompletion)}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Esta e a nova data estimada de conclusao apos desbloquear a producao. O cliente
                  sera notificado sobre a atualizacao.
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
            onClick={() => unblockProductionMutation.mutate(resolutionNotes)}
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
                Desbloquear e Retomar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBlockedDuration(blockedAt?: string): string {
  if (!blockedAt) {
    return "Desconhecido";
  }

  const diffMs = Date.now() - new Date(blockedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0
      ? `${diffDays} ${diffDays === 1 ? "dia" : "dias"} e ${remainingHours} ${
          remainingHours === 1 ? "hora" : "horas"
        }`
      : `${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  }

  if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
}

export default UnblockProductionModal;
