/**
 * BulkUpdateModal
 *
 * Modal para atualizacao em massa do status de entregas.
 */

import { useState } from 'react';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import { ValidationFeedback } from '@/components/ui/validation-feedback';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { FORM_RATE_LIMITS } from '@/lib/security/sanitization-config';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  type BulkUpdateResult,
  useBulkDeliveryStatusUpdate,
} from '@/hooks/admin/useBulkDeliveryStatusUpdate';
import { getOrderStatusOptionsForType } from '@/config/admin-order-status';
import type { SubscriptionDeliveryStatus } from '@/types/admin/orders';

interface BulkUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDeliveryIds: string[];
  onSuccess?: () => void;
}

const statusOptions = getOrderStatusOptionsForType('subscription_delivery');

export function BulkUpdateModal({
  open,
  onOpenChange,
  selectedDeliveryIds,
  onSuccess,
}: BulkUpdateModalProps) {
  const [newStatus, setNewStatus] = useState<SubscriptionDeliveryStatus | ''>('');
  const [notesRaw, setNotesRaw, notesSanitized] = useSanitizedInput('', 'html');
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  const { toast } = useToast();

  const bulkUpdateMutation = useBulkDeliveryStatusUpdate((data) => {
    setResult(data);
    onSuccess?.();
  });

  const handleSubmit = () => {
    if (!newStatus) return;

    const rateLimitKey = `admin-bulk-delivery-update:${selectedDeliveryIds.join(',')}`;
    const rateLimit = checkRateLimit(rateLimitKey, FORM_RATE_LIMITS.adminDeliveryUpdate);

    if (!rateLimit.allowed) {
      toast({
        title: 'Limite excedido',
        description: `Aguarde ${rateLimit.retryAfter}s antes de tentar novamente`,
        variant: 'destructive',
      });
      return;
    }

    setResult(null);
    bulkUpdateMutation.mutate({
      deliveryIds: selectedDeliveryIds,
      newStatus,
      notes: notesSanitized || undefined,
    });
  };

  const handleClose = () => {
    setNewStatus('');
    setNotesRaw('');
    setResult(null);
    onOpenChange(false);
  };

  const isProcessing = bulkUpdateMutation.isPending;
  const hasResult = result !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atualização em Massa</DialogTitle>
          <DialogDescription>
            Atualizar o status de {selectedDeliveryIds.length} entrega(s) selecionada(s)
          </DialogDescription>
        </DialogHeader>

        {!hasResult ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Novo Status</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as SubscriptionDeliveryStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre esta atualização..."
                value={notesRaw}
                onChange={(e) => setNotesRaw(e.target.value)}
                rows={3}
              />
              {notesRaw !== notesSanitized && <ValidationFeedback info="Conteudo HTML foi sanitizado para seguranca" />}
            </div>

            {bulkUpdateMutation.isError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {bulkUpdateMutation.error instanceof Error
                    ? bulkUpdateMutation.error.message
                    : 'Erro ao processar atualizacao'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sucessos:</span>
                  <span className="text-sm font-bold text-green-600">{result.successCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Falhas:</span>
                  <span className="text-sm font-bold text-red-600">{result.failureCount}</span>
                </div>
              </div>

              {result.failureCount > 0 && (
                <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border p-4">
                  <div className="mb-2 text-sm font-medium">Entregas com falha:</div>
                  {result.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div
                        key={r.deliveryId}
                        className="border-l-2 border-red-500 py-1 pl-2 text-xs text-muted-foreground"
                      >
                        <div className="font-mono">{r.deliveryId.substring(0, 8)}...</div>
                        <div className="text-red-600">{r.error}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!hasResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!newStatus || isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? 'Processando...' : 'Atualizar'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
