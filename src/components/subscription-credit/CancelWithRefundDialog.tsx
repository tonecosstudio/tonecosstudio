// @ts-nocheck
/**
 * Cancel with Refund Dialog
 * Allows user to cancel subscription with proportional refund
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tantml:react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Subscription } from '@/types/subscription-credit-system';
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';
import { Checkbox } from '@/components/ui/checkbox';

interface CancelWithRefundDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelWithRefundDialog({
  subscription,
  isOpen,
  onOpenChange,
}: CancelWithRefundDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [estimatedRefund, setEstimatedRefund] = useState(0);

  // Calculate estimated refund based on time remaining
  useEffect(() => {
    const today = new Date();
    const endDate = new Date(subscription.end_date);
    const startDate = new Date(subscription.start_date);
    
    const daysRemaining = Math.max(0, differenceInDays(endDate, today));
    const totalDays = differenceInDays(endDate, startDate);
    
    // Estimate price based on plan type (these should come from API)
    const estimatedPrice = subscription.plan_type === 'trimestral' ? 99.90 : 189.90;
    const refund = (estimatedPrice * daysRemaining) / totalDays;
    
    setEstimatedRefund(refund);
  }, [subscription]);

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionCreditAPI.cancelWithRefund(subscription.id),
    onSuccess: (data) => {
      toast({
        title: 'Assinatura cancelada',
        description: `Reembolso de R$ ${data.refund_amount.toFixed(2)} será processado em até 7 dias úteis.`,
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-credit'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCancel = () => {
    if (!confirmed) {
      toast({
        title: 'Confirmação necessária',
        description: 'Por favor, confirme que você entende as consequências do cancelamento.',
        variant: 'destructive',
      });
      return;
    }
    cancelMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancelar com Extorno
          </DialogTitle>
          <DialogDescription>
            Cancele sua assinatura e receba reembolso proporcional
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Estimated Refund */}
          <div className="p-4 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-900">Reembolso Estimado</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              R$ {estimatedRefund.toFixed(2)}
            </div>
            <div className="text-sm text-green-700 mt-1">
              Baseado no tempo restante da sua assinatura
            </div>
          </div>

          {/* Subscription Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-medium">
                {subscription.plan_type === 'trimestral' ? 'Trimestral' : 'Semestral'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de término:</span>
              <span className="font-medium">
                {format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dias restantes:</span>
              <span className="font-medium">
                {Math.max(0, differenceInDays(new Date(subscription.end_date), new Date()))}
              </span>
            </div>
          </div>

          {/* Warnings */}
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-900 space-y-2">
              <p><strong>Atenção! Esta ação é irreversível:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Sua assinatura será cancelada imediatamente</li>
                <li>Todos os créditos restantes expirarão</li>
                <li>Pedidos automáticos pendentes serão cancelados</li>
                <li>O reembolso será processado em até 7 dias úteis</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-cancel"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <label
              htmlFor="confirm-cancel"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Eu entendo que minha assinatura será cancelada imediatamente e todos os créditos
              expirarão
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!confirmed || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
