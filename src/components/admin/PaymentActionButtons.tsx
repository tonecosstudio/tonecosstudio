/**
 * PaymentActionButtons Component
 * 
 * Action buttons for admin payment actions: Approve, Reject, Request More Info
 * 
 * Requirements: 7.1-7.15
 * Task: 13.2 Criar componente PaymentActionButtons
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { PaymentStatus } from '@/types/manual-payment';
import { approvePayment, rejectPayment, requestPaymentInfo } from '@/lib/payment-service';

interface PaymentActionButtonsProps {
  paymentId: string;
  currentStatus: PaymentStatus;
  onActionComplete?: () => void;
}

export function PaymentActionButtons({
  paymentId,
  currentStatus,
  onActionComplete,
}: PaymentActionButtonsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => approvePayment(paymentId, user?.id || ''),
    onSuccess: () => {
      toast({
        title: 'Pagamento aprovado',
        description: 'O pagamento foi aprovado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-details', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setApproveOpen(false);
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectPayment(paymentId, user?.id || '', reason),
    onSuccess: () => {
      toast({
        title: 'Pagamento rejeitado',
        description: 'O pagamento foi rejeitado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-details', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setRejectOpen(false);
      setRejectionReason('');
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao rejeitar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Request info mutation
  const requestInfoMutation = useMutation({
    mutationFn: (message: string) => requestPaymentInfo(paymentId, user?.id || '', message),
    onSuccess: () => {
      toast({
        title: 'Informações solicitadas',
        description: 'A solicitação de informações foi enviada ao cliente.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-details', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setRequestInfoOpen(false);
      setInfoMessage('');
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao solicitar informações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check if actions are disabled based on current status
  const isApproveDisabled = currentStatus === 'approved' || currentStatus === 'rejected';
  const isRejectDisabled = currentStatus === 'approved' || currentStatus === 'rejected';
  const isRequestInfoDisabled = currentStatus === 'approved' || currentStatus === 'rejected';

  // Handle approve
  const handleApprove = () => {
    approveMutation.mutate();
  };

  // Handle reject
  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo da rejeição.',
        variant: 'destructive',
      });
      return;
    }
    rejectMutation.mutate(rejectionReason);
  };

  // Handle request info
  const handleRequestInfo = () => {
    if (!infoMessage.trim()) {
      toast({
        title: 'Mensagem obrigatória',
        description: 'Por favor, informe a mensagem para o cliente.',
        variant: 'destructive',
      });
      return;
    }
    requestInfoMutation.mutate(infoMessage);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Approve Button */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={isApproveDisabled || approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Aprovar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar este pagamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Ao aprovar o pagamento:
            </p>
            <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>O status será alterado para "aprovado"</li>
              <li>O cliente receberá uma notificação por email</li>
              <li>O orçamento ou assinatura vinculada será atualizado</li>
              <li>Um recibo será gerado para o cliente</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                'Confirmar Aprovação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Button */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={isRejectDisabled || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Rejeitar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pagamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ex: Comprovante ilegível, valor incorreto, dados incompletos..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Este motivo será enviado ao cliente e registrado no histórico.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectionReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Button */}
      <Dialog open={requestInfoOpen} onOpenChange={setRequestInfoOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isRequestInfoDisabled || requestInfoMutation.isPending}
          >
            {requestInfoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            Solicitar Info
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Informações Adicionais</DialogTitle>
            <DialogDescription>
              Envie uma mensagem ao cliente solicitando informações ou documentos adicionais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="info-message">Mensagem para o Cliente *</Label>
              <Textarea
                id="info-message"
                placeholder="Ex: Por favor, envie um comprovante mais legível com o valor completo..."
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Esta mensagem será enviada na conversa de suporte e por email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestInfoOpen(false);
                setInfoMessage('');
              }}
              disabled={requestInfoMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestInfo}
              disabled={requestInfoMutation.isPending || !infoMessage.trim()}
            >
              {requestInfoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}