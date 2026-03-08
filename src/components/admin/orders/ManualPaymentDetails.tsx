// @ts-nocheck
/**
 * Componente de Detalhes de Pagamento Manual
 *
 * Exibe informações detalhadas de um pagamento manual no painel lateral
 * Alinhado com a estrutura real da tabela manual_payments
 */

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle, XCircle, AlertCircle, CreditCard, Calendar, Hash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { UnifiedOrder } from "@/types/admin/orders";
import { formatCurrency } from "@/lib/utils";
import {
  useApproveManualPayment,
  useRejectManualPayment,
  useRequestManualPaymentInfo,
} from "@/hooks/admin/useOrderMutations";

interface ManualPaymentDetailsProps {
  order: UnifiedOrder;
  onClose?: () => void;
}

// Payment method labels
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  bank_transfer: "Transferência Bancária",
  cash: "Dinheiro",
};

// Reference type labels
const REFERENCE_TYPE_LABELS: Record<string, string> = {
  subscription: "Assinatura",
  standalone_purchase: "Compra Avulsa",
  quote: "Orçamento",
};

export function ManualPaymentDetails({ order, onClose }: ManualPaymentDetailsProps) {
  const { toast } = useToast();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [infoRequest, setInfoRequest] = useState("");

  // Mutations
  const approveMutation = useApproveManualPayment();
  const rejectMutation = useRejectManualPayment();
  const requestInfoMutation = useRequestManualPaymentInfo();

  const isProcessing =
    approveMutation.isPending || rejectMutation.isPending || requestInfoMutation.isPending;

  if (order.type !== "manual_payment" || !order.manualPayment) {
    return null;
  }

  const paymentData = order.manualPayment;

  // Handler para aprovar pagamento
  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(order.id);
      toast({
        title: "✓ Pagamento aprovado",
        description: "O pagamento foi aprovado com sucesso.",
        variant: "default",
      });
      setShowApproveDialog(false);
      setTimeout(() => { onClose?.(); }, 500);
    } catch (error) {
      toast({
        title: "✗ Erro ao aprovar",
        description: error instanceof Error ? error.message : "Não foi possível aprovar o pagamento.",
        variant: "destructive",
      });
    }
  };

  // Handler para rejeitar pagamento
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Por favor, informe o motivo da rejeição.", variant: "destructive" });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ paymentId: order.id, reason: rejectionReason });
      toast({ title: "✓ Pagamento rejeitado", description: "O pagamento foi rejeitado.", variant: "default" });
      setShowRejectDialog(false);
      setRejectionReason("");
      setTimeout(() => { onClose?.(); }, 500);
    } catch (error) {
      toast({ title: "✗ Erro ao rejeitar", description: error instanceof Error ? error.message : "Não foi possível rejeitar o pagamento.", variant: "destructive" });
    }
  };

  // Handler para solicitar mais informações
  const handleRequestInfo = async () => {
    if (!infoRequest.trim()) {
      toast({ title: "Mensagem obrigatória", description: "Por favor, informe quais informações são necessárias.", variant: "destructive" });
      return;
    }
    try {
      await requestInfoMutation.mutateAsync({ paymentId: order.id, message: infoRequest });
      toast({ title: "✓ Solicitação enviada", description: "O cliente foi notificado sobre as informações necessárias.", variant: "default" });
      setShowInfoDialog(false);
      setInfoRequest("");
    } catch (error) {
      toast({ title: "✗ Erro ao solicitar", description: error instanceof Error ? error.message : "Não foi possível enviar a solicitação.", variant: "destructive" });
    }
  };

  return (
    <>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Detalhes do Pagamento Manual
        </h3>

        <div className="space-y-3">
          {/* Valor */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <span className="text-sm font-medium">Valor</span>
            <span className="text-lg font-semibold">{formatCurrency(order.amount)}</span>
          </div>

          {/* Método de Pagamento */}
          {paymentData.paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Método</span>
              <Badge variant="outline" className="capitalize">
                <CreditCard className="h-3 w-3 mr-1" />
                {PAYMENT_METHOD_LABELS[paymentData.paymentMethod] || paymentData.paymentMethod}
              </Badge>
            </div>
          )}

          {/* Data do Pagamento */}
          {paymentData.paymentDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data do Pagamento</span>
              <span className="text-sm font-medium">
                {new Date(paymentData.paymentDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {/* Referência */}
          {paymentData.referenceId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Referência</span>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {paymentData.referenceId.slice(0, 8)}
              </code>
            </div>
          )}

          {/* Tipo de Referência */}
          {paymentData.referenceType && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vinculado a</span>
              <span className="text-sm font-medium">
                {REFERENCE_TYPE_LABELS[paymentData.referenceType] || paymentData.referenceType}
              </span>
            </div>
          )}

          {/* Confirmação */}
          {paymentData.confirmedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confirmado em</span>
              <span className="text-sm font-medium text-green-600">
                {new Date(paymentData.confirmedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {/* Notas */}
          {paymentData.notes && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{paymentData.notes}</p>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Ações de Admin */}
      {order.status !== "approved" && order.status !== "rejected" && order.status !== "confirmed" && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Ações</h3>

          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => setShowApproveDialog(true)}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Pagamento
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowInfoDialog(true)}
              disabled={isProcessing}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Solicitar Mais Informações
            </Button>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar Pagamento
            </Button>
          </div>
        </section>
      )}

      {/* Dialog de Aprovação */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aprovar Pagamento
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Você está prestes a aprovar este pagamento manual. Esta ação irá:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Confirmar o recebimento do pagamento</li>
                  <li>Atualizar o status do pedido vinculado</li>
                  <li>Notificar o cliente sobre a aprovação</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? "Processando..." : "Confirmar Aprovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Rejeição */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeitar Pagamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da rejeição. O cliente será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo da Rejeição</Label>
            <Textarea id="rejection-reason" placeholder="Ex: Comprovante ilegível, valor incorreto, etc." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} disabled={isProcessing} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
              {isProcessing ? "Processando..." : "Confirmar Rejeição"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Solicitação de Informações */}
      <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Solicitar Mais Informações
            </AlertDialogTitle>
            <AlertDialogDescription>
              Descreva quais informações adicionais são necessárias. O cliente será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="info-request">Informações Necessárias</Label>
            <Textarea id="info-request" placeholder="Ex: Por favor, envie um comprovante mais nítido..." value={infoRequest} onChange={(e) => setInfoRequest(e.target.value)} rows={4} disabled={isProcessing} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestInfo} disabled={isProcessing}>
              {isProcessing ? "Enviando..." : "Enviar Solicitação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
