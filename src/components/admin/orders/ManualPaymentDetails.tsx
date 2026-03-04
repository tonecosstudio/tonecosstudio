// @ts-nocheck
/**
 * Componente de Detalhes de Pagamento Manual
 *
 * Exibe informações detalhadas de um pagamento manual no painel lateral
 */

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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

      // Fechar o painel após 500ms para dar tempo do usuário ver o toast
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (error) {
      toast({
        title: "✗ Erro ao aprovar",
        description:
          error instanceof Error ? error.message : "Não foi possível aprovar o pagamento.",
        variant: "destructive",
      });
    }
  };

  // Handler para rejeitar pagamento
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        paymentId: order.id,
        reason: rejectionReason,
      });

      toast({
        title: "✓ Pagamento rejeitado",
        description: "O pagamento foi rejeitado.",
        variant: "default",
      });

      setShowRejectDialog(false);
      setRejectionReason("");

      // Fechar o painel após 500ms
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (error) {
      toast({
        title: "✗ Erro ao rejeitar",
        description:
          error instanceof Error ? error.message : "Não foi possível rejeitar o pagamento.",
        variant: "destructive",
      });
    }
  };

  // Handler para solicitar mais informações
  const handleRequestInfo = async () => {
    if (!infoRequest.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, informe quais informações são necessárias.",
        variant: "destructive",
      });
      return;
    }

    try {
      await requestInfoMutation.mutateAsync({
        paymentId: order.id,
        message: infoRequest,
      });

      toast({
        title: "✓ Solicitação enviada",
        description: "O cliente foi notificado sobre as informações necessárias.",
        variant: "default",
      });

      setShowInfoDialog(false);
      setInfoRequest("");
    } catch (error) {
      toast({
        title: "✗ Erro ao solicitar",
        description:
          error instanceof Error ? error.message : "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Detalhes do Pagamento Manual
        </h3>

        <div className="space-y-3">
          {/* Número de Referência */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Referência</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {paymentData.referenceNumber}
            </code>
          </div>

          {/* Método de Pagamento */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Método</span>
            <span className="text-sm font-medium">{paymentData.paymentMethodName}</span>
          </div>

          {/* Tipo de Pagamento */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <span className="text-sm">
              {paymentData.paymentType === "one_time" ? "Pagamento Único" : "Recorrente"}
            </span>
          </div>

          {/* Valor */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor</span>
            <span className="text-lg font-semibold">{formatCurrency(order.amount)}</span>
          </div>

          {/* Motivo de Rejeição (se houver) */}
          {paymentData.rejectionReason && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Motivo da Rejeição</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {paymentData.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Informações do Método de Pagamento */}
      {paymentData.paymentMethod && (
        <>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Dados para Pagamento</h3>

            <div className="space-y-3">
              {/* Tipo do Método */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Forma</span>
                <span className="text-sm font-medium capitalize">
                  {paymentData.paymentMethod.type === "pix"
                    ? "PIX"
                    : paymentData.paymentMethod.type === "bank_transfer"
                      ? "Transferência Bancária"
                      : paymentData.paymentMethod.type === "boleto"
                        ? "Boleto"
                        : paymentData.paymentMethod.type}
                </span>
              </div>

              {/* Chave PIX */}
              {paymentData.paymentMethod.pixKey && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Chave PIX</p>
                  <code className="text-sm font-mono break-all">
                    {paymentData.paymentMethod.pixKey}
                  </code>
                </div>
              )}

              {/* Link de Pagamento */}
              {paymentData.paymentMethod.paymentLink && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Link de Pagamento</p>
                  <a
                    href={paymentData.paymentMethod.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {paymentData.paymentMethod.paymentLink}
                  </a>
                </div>
              )}

              {/* Instruções */}
              {paymentData.paymentMethod.instructions && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Instruções</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {paymentData.paymentMethod.instructions}
                  </p>
                </div>
              )}
            </div>
          </section>

          <Separator />
        </>
      )}

      {/* O que foi comprado */}
      {paymentData.linkedTo && (
        <>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Produto/Serviço</h3>

            <div className="space-y-3">
              {paymentData.linkedTo.type === "subscription" && paymentData.linkedTo.details && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className="text-sm font-medium">Assinatura</span>
                  </div>

                  {paymentData.linkedTo.details.plan && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Plano</span>
                        <span className="text-sm font-medium">
                          {paymentData.linkedTo.details.plan.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ciclo</span>
                        <span className="text-sm">
                          {paymentData.linkedTo.details.plan.billingCycle === "monthly"
                            ? "Mensal"
                            : paymentData.linkedTo.details.plan.billingCycle === "quarterly"
                              ? "Trimestral"
                              : paymentData.linkedTo.details.plan.billingCycle === "semiannual"
                                ? "Semestral"
                                : paymentData.linkedTo.details.plan.billingCycle === "annual"
                                  ? "Anual"
                                  : paymentData.linkedTo.details.plan.billingCycle}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Valor do Plano</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(paymentData.linkedTo.details.plan.price)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status da Assinatura</span>
                    <span className="text-sm capitalize">
                      {paymentData.linkedTo.details.status}
                    </span>
                  </div>

                  {paymentData.linkedTo.details.startDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Início</span>
                      <span className="text-sm">
                        {new Date(paymentData.linkedTo.details.startDate).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    </div>
                  )}

                  {paymentData.linkedTo.details.endDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Término</span>
                      <span className="text-sm">
                        {new Date(paymentData.linkedTo.details.endDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </>
              )}

              {paymentData.linkedTo.type === "quote" && paymentData.linkedTo.details && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className="text-sm font-medium">Orçamento</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status do Orçamento</span>
                    <span className="text-sm capitalize">
                      {paymentData.linkedTo.details.status}
                    </span>
                  </div>

                  {paymentData.linkedTo.details.totalPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Valor Total</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(paymentData.linkedTo.details.totalPrice)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <Separator />
        </>
      )}

      {/* Comprovantes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Comprovantes</h3>
        </div>

        {paymentData.files && paymentData.files.length > 0 ? (
          <div className="space-y-2">
            {paymentData.files.map(
              (file: {
                id: string;
                fileName: string;
                filePath: string;
                fileSize: number;
                fileType: string;
              }) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implementar download do arquivo
                      window.open(file.filePath, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum comprovante enviado</p>
        )}
      </section>

      <Separator />

      {/* Ações de Admin */}
      {order.status !== "approved" && order.status !== "rejected" && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Ações</h3>

          <div className="space-y-2">
            {/* Aprovar */}
            <Button
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => setShowApproveDialog(true)}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Pagamento
            </Button>

            {/* Solicitar Informações */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowInfoDialog(true)}
              disabled={isProcessing}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Solicitar Mais Informações
            </Button>

            {/* Rejeitar */}
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
                  <li>Atualizar o status do pedido/assinatura vinculado</li>
                  <li>Notificar o cliente sobre a aprovação</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
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
            <Textarea
              id="rejection-reason"
              placeholder="Ex: Comprovante ilegível, valor incorreto, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              disabled={isProcessing}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
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
            <Textarea
              id="info-request"
              placeholder="Ex: Por favor, envie um comprovante mais nítido..."
              value={infoRequest}
              onChange={(e) => setInfoRequest(e.target.value)}
              rows={4}
              disabled={isProcessing}
            />
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
