import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, Calendar, Clock, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBlockProduction } from "@/hooks/admin/useProductionActions";

interface BlockProductionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productionQueueId: string;
  currentEstimatedCompletion?: Date | null;
  onBlock?: () => void;
}

export function BlockProductionModal({
  isOpen,
  onOpenChange,
  productionQueueId,
  currentEstimatedCompletion,
  onBlock,
}: BlockProductionModalProps) {
  const [reason, setReason] = useState("");
  const [estimatedResolutionHours, setEstimatedResolutionHours] = useState("");
  const [newEstimatedCompletion, setNewEstimatedCompletion] = useState<Date | null>(null);

  useEffect(() => {
    if (!currentEstimatedCompletion || !estimatedResolutionHours) {
      setNewEstimatedCompletion(null);
      return;
    }

    const hours = parseFloat(estimatedResolutionHours);
    if (Number.isNaN(hours) || hours <= 0) {
      setNewEstimatedCompletion(null);
      return;
    }

    const newDate = new Date(currentEstimatedCompletion);
    newDate.setHours(newDate.getHours() + hours);
    setNewEstimatedCompletion(newDate);
  }, [currentEstimatedCompletion, estimatedResolutionHours]);

  const resetForm = () => {
    setReason("");
    setEstimatedResolutionHours("");
    setNewEstimatedCompletion(null);
  };

  const blockProductionMutation = useBlockProduction({
    productionQueueId,
    onSuccess: () => {
      toast({
        title: "Producao bloqueada",
        description: "O item foi marcado como bloqueado e o cliente sera notificado.",
      });
      onBlock?.();
      resetForm();
      onOpenChange(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && !blockProductionMutation.isPending) {
      resetForm();
    }
    onOpenChange(open);
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} minutos`;
    if (hours < 24) return `${Math.round(hours)} horas`;

    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days} dias e ${remainingHours} horas` : `${days} dias`;
  };

  const formatDate = (date: Date): string =>
    new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const delay =
    currentEstimatedCompletion && newEstimatedCompletion
      ? Math.ceil(
          (newEstimatedCompletion.getTime() - new Date(currentEstimatedCompletion).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  const handleBlockProduction = () => {
    if (!reason.trim()) return;

    let fullReason = reason.trim();
    if (estimatedResolutionHours) {
      const hours = parseFloat(estimatedResolutionHours);
      if (!Number.isNaN(hours) && hours > 0) {
        fullReason += ` | Tempo estimado de resolucao: ${formatDuration(hours)}`;
      }
    }

    blockProductionMutation.mutate(fullReason, {
      onError: (error: Error) => {
        toast({
          title: "Erro ao bloquear producao",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Bloquear Producao
          </DialogTitle>
          <DialogDescription>
            Use este bloqueio quando houver um impedimento real para continuar a producao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atencao</AlertTitle>
            <AlertDescription>
              O bloqueio pausa o fluxo deste item e dispara notificacao para o cliente.
              Use apenas quando o prazo ou a execucao realmente precisarem ser interrompidos.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo do bloqueio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: aguardando material, equipamento quebrado, problema de qualidade..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution-time">Tempo estimado de resolucao</Label>
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
          </div>

          {currentEstimatedCompletion && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4" />
                Impacto na data estimada
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Data atual</div>
                  <div className="text-sm font-medium">{formatDate(currentEstimatedCompletion)}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Nova data</div>
                  <div className="text-sm font-medium">
                    {newEstimatedCompletion ? (
                      <span className="text-destructive">{formatDate(newEstimatedCompletion)}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatDate(currentEstimatedCompletion)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {delay !== null && delay > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
                  <Clock className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="text-sm">
                    <span className="font-medium text-destructive">
                      Atraso de {delay} {delay === 1 ? "dia" : "dias"}
                    </span>
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
            onClick={handleBlockProduction}
            disabled={blockProductionMutation.isPending || !reason.trim()}
          >
            {blockProductionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bloqueando...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Bloquear Producao
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlockProductionModal;
