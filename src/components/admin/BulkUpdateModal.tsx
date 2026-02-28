/**
 * BulkUpdateModal
 * 
 * Modal para atualização em massa do status de entregas.
 * Permite selecionar novo status e adicionar notas opcionais.
 * Exibe resultado com contagem de sucessos e falhas.
 * 
 * Requirements: 15.9
 * Task: 21.7
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BulkUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDeliveryIds: string[];
  onSuccess?: () => void;
}

interface BulkUpdateResult {
  success: boolean;
  message: string;
  successCount: number;
  failureCount: number;
  results: Array<{
    deliveryId: string;
    success: boolean;
    error?: string;
  }>;
}

const statusOptions = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'pending_choice', label: 'Aguardando Escolha' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_production', label: 'Em Produção' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
];

export function BulkUpdateModal({
  open,
  onOpenChange,
  selectedDeliveryIds,
  onSuccess,
}: BulkUpdateModalProps) {
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-update-delivery-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            deliveryIds: selectedDeliveryIds,
            newStatus,
            notes: notes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar entregas');
      }

      return await response.json() as BulkUpdateResult;
    },
    onSuccess: (data) => {
      setResult(data);
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleSubmit = () => {
    if (!newStatus) {
      return;
    }
    setResult(null);
    bulkUpdateMutation.mutate();
  };

  const handleClose = () => {
    setNewStatus('');
    setNotes('');
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
            {/* Status Selection */}
            <div className="space-y-2">
              <Label htmlFor="status">Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre esta atualização..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Error Display */}
            {bulkUpdateMutation.isError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {bulkUpdateMutation.error instanceof Error
                    ? bulkUpdateMutation.error.message
                    : 'Erro ao processar atualização'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Success/Failure Summary */}
            <div className="space-y-3">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>

              {/* Detailed Results */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sucessos:</span>
                  <span className="text-sm font-bold text-green-600">
                    {result.successCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Falhas:</span>
                  <span className="text-sm font-bold text-red-600">
                    {result.failureCount}
                  </span>
                </div>
              </div>

              {/* Show failed deliveries if any */}
              {result.failureCount > 0 && (
                <div className="rounded-lg border p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  <div className="text-sm font-medium mb-2">Entregas com falha:</div>
                  {result.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div
                        key={r.deliveryId}
                        className="text-xs text-muted-foreground border-l-2 border-red-500 pl-2 py-1"
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
