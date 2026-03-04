// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StandalonePurchaseStatus } from "@/components/StandalonePurchaseStatus";
import { 
  Package, 
  User, 
  CreditCard, 
  Calendar,
  FileText,
  XCircle,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ZoomIn
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toBahiaTime } from "@/lib/timezone";
import { 
  markProductionComplete, 
  cancelStandalonePurchase,
  approvePaymentVoucher,
  rejectPaymentVoucher
} from "@/services/standalone-purchase-service";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StandalonePurchaseDetailProps {
  purchase: any; // Full purchase object with relations (user, collection, cycle)
}

/**
 * Admin component to display detailed standalone purchase information
 * 
 * Shows:
 * - Customer information
 * - Collection details
 * - Cycle information
 * - Payment amounts and status
 * - Payment vouchers (deposit and balance)
 * - Status history timeline
 * - Admin action buttons (Mark Production Complete, Cancel Order)
 * 
 * Requirements: 15.6
 */
export function StandalonePurchaseDetail({ purchase }: StandalonePurchaseDetailProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectVoucherType, setRejectVoucherType] = useState<'deposit' | 'balance'>('deposit');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format dates in Bahia timezone
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const bahiaDate = toBahiaTime(dateObj);
    return format(bahiaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatDateOnly = (date: Date | string | null) => {
    if (!date) return "N/A";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const bahiaDate = toBahiaTime(dateObj);
    return format(bahiaDate, "dd/MM/yyyy", { locale: ptBR });
  };

  // Mark production complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      // Get current admin user ID
      const { data: { user } } = await supabase.auth.getUser();
      const adminUserId = user?.id;
      
      return markProductionComplete(purchase.id, adminUserId);
    },
    onSuccess: () => {
      toast({
        title: "Produção Concluída",
        description: "A produção foi marcada como concluída e o cliente foi notificado.",
      });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchase", purchase.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível marcar a produção como concluída.",
        variant: "destructive",
      });
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Get current admin user ID
      const { data: { user } } = await supabase.auth.getUser();
      const adminUserId = user?.id;
      
      return cancelStandalonePurchase(purchase.id, reason, adminUserId);
    },
    onSuccess: () => {
      toast({
        title: "Pedido Cancelado",
        description: "O pedido foi cancelado com sucesso.",
      });
      setShowCancelDialog(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["standalone-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchase", purchase.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar o pedido.",
        variant: "destructive",
      });
    },
  });

  // Approve voucher mutation
  const approveVoucherMutation = useMutation({
    mutationFn: (voucherType: 'deposit' | 'balance') => approvePaymentVoucher(purchase.id, voucherType),
    onSuccess: (_, voucherType) => {
      toast({
        title: "Comprovante Aprovado",
        description: `O comprovante de ${voucherType === 'deposit' ? 'depósito' : 'saldo'} foi aprovado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchase", purchase.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar o comprovante.",
        variant: "destructive",
      });
    },
  });

  // Reject voucher mutation
  const rejectVoucherMutation = useMutation({
    mutationFn: ({ voucherType, reason }: { voucherType: 'deposit' | 'balance'; reason: string }) => 
      rejectPaymentVoucher(purchase.id, voucherType, reason),
    onSuccess: (_, { voucherType }) => {
      toast({
        title: "Comprovante Rejeitado",
        description: `O comprovante de ${voucherType === 'deposit' ? 'depósito' : 'saldo'} foi rejeitado e o cliente foi notificado.`,
      });
      setShowRejectDialog(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["standalone-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-purchase", purchase.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível rejeitar o comprovante.",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = () => {
    if (confirm("Tem certeza que deseja marcar a produção como concluída? O cliente será notificado para pagar o saldo.")) {
      markCompleteMutation.mutate();
    }
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Motivo Obrigatório",
        description: "Por favor, informe o motivo do cancelamento.",
        variant: "destructive",
      });
      return;
    }
    cancelMutation.mutate(cancelReason);
  };

  const handleApproveVoucher = (voucherType: 'deposit' | 'balance') => {
    if (confirm(`Tem certeza que deseja aprovar o comprovante de ${voucherType === 'deposit' ? 'depósito' : 'saldo'}?`)) {
      approveVoucherMutation.mutate(voucherType);
    }
  };

  const handleRejectVoucher = (voucherType: 'deposit' | 'balance') => {
    setRejectVoucherType(voucherType);
    setShowRejectDialog(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Motivo Obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }
    rejectVoucherMutation.mutate({ voucherType: rejectVoucherType, reason: rejectReason });
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageDialog(true);
  };

  // Check if actions are available based on status
  const canMarkComplete = purchase.status === 'deposit_paid' && !purchase.production_complete_at;
  const canCancel = ['deposit_paid', 'awaiting_balance'].includes(purchase.status);

  return (
    <div className="space-y-6">
      {/* Header with Order ID */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Detalhes da Compra</h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            ID: {purchase.id}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Criado em {formatDate(purchase.created_at)}
        </Badge>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Nome</Label>
              <p className="font-medium">{purchase.user?.full_name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{purchase.user?.email || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Telefone</Label>
              <p className="font-medium">{purchase.user?.phone || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">ID do Usuário</Label>
              <p className="font-mono text-xs">{purchase.user_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informações da Coleção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4">
            {purchase.collection?.image_url && (
              <img
                src={purchase.collection.image_url}
                alt={purchase.collection.name}
                className="w-24 h-24 object-cover rounded-md"
              />
            )}
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-muted-foreground">Nome da Coleção</Label>
                <p className="font-medium text-lg">{purchase.collection?.name || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm">{purchase.collection?.description || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle and Timing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ciclo e Prazos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Ciclo</Label>
              <p className="font-medium">
                Ciclo {purchase.cycle?.cycle_number || "N/A"} - {purchase.cycle?.month}/{purchase.cycle?.year}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status do Ciclo</Label>
              <p className="font-medium capitalize">{purchase.cycle?.status || "N/A"}</p>
            </div>
            {purchase.tracking_code && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Código de Rastreamento</Label>
                <p className="font-mono text-sm">{purchase.tracking_code}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Depósito</Label>
              <p className="text-2xl font-bold text-blue-600">
                R$ {purchase.deposit_amount?.toFixed(2) || "0.00"}
              </p>
              {purchase.deposit_paid_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pago em {formatDate(purchase.deposit_paid_at)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Saldo</Label>
              <p className="text-2xl font-bold text-amber-600">
                R$ {purchase.balance_amount?.toFixed(2) || "0.00"}
              </p>
              {purchase.balance_due_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Vence em {formatDateOnly(purchase.balance_due_date)}
                </p>
              )}
              {purchase.balance_paid_at && (
                <p className="text-xs text-green-600 mt-1">
                  Pago em {formatDate(purchase.balance_paid_at)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Total</Label>
              <p className="text-2xl font-bold text-green-600">
                R$ {purchase.total_amount?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Payment Vouchers */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Comprovantes de Pagamento
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Deposit Voucher */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Comprovante de Depósito</Label>
                {purchase.payment_voucher_deposit_url ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      {purchase.payment_voucher_deposit_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <div className="relative">
                          <img
                            src={purchase.payment_voucher_deposit_url}
                            alt="Comprovante de Depósito"
                            className="w-full h-48 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleViewImage(purchase.payment_voucher_deposit_url)}
                          />
                          <button
                            onClick={() => handleViewImage(purchase.payment_voucher_deposit_url)}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <a
                          href={purchase.payment_voucher_deposit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Ver Documento</span>
                        </a>
                      )}
                    </div>
                    
                    <a
                      href={purchase.payment_voucher_deposit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir em Nova Aba
                    </a>

                    {/* Verification Actions */}
                    {purchase.status === 'deposit_paid' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApproveVoucher('deposit')}
                          disabled={approveVoucherMutation.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleRejectVoucher('deposit')}
                          disabled={rejectVoucherMutation.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum comprovante enviado</p>
                )}
              </div>

              {/* Balance Voucher */}
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Comprovante de Saldo</Label>
                {purchase.payment_voucher_balance_url ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      {purchase.payment_voucher_balance_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <div className="relative">
                          <img
                            src={purchase.payment_voucher_balance_url}
                            alt="Comprovante de Saldo"
                            className="w-full h-48 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleViewImage(purchase.payment_voucher_balance_url)}
                          />
                          <button
                            onClick={() => handleViewImage(purchase.payment_voucher_balance_url)}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <a
                          href={purchase.payment_voucher_balance_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Ver Documento</span>
                        </a>
                      )}
                    </div>
                    
                    <a
                      href={purchase.payment_voucher_balance_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir em Nova Aba
                    </a>

                    {/* Verification Actions */}
                    {purchase.status === 'awaiting_balance' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApproveVoucher('balance')}
                          disabled={approveVoucherMutation.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleRejectVoucher('balance')}
                          disabled={rejectVoucherMutation.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {purchase.status === 'awaiting_balance' 
                      ? "Aguardando pagamento do saldo"
                      : "Nenhum comprovante enviado"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Status</CardTitle>
          <CardDescription>
            Linha do tempo completa da compra avulsa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StandalonePurchaseStatus purchase={purchase} />
        </CardContent>
      </Card>

      {/* Admin Actions */}
      {(canMarkComplete || canCancel) && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Administrativas</CardTitle>
            <CardDescription>
              Gerenciar o status da compra avulsa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {canMarkComplete && (
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">Marcar Produção Concluída</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Marca a produção como concluída e notifica o cliente para pagar o saldo.
                    O prazo de 5 dias úteis será calculado automaticamente.
                  </p>
                  <Button
                    onClick={handleMarkComplete}
                    disabled={markCompleteMutation.isPending}
                    className="mt-3"
                  >
                    {markCompleteMutation.isPending ? "Processando..." : "Marcar como Concluída"}
                  </Button>
                </div>
              </div>
            )}

            {canCancel && (
              <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">Cancelar Pedido</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Cancela o pedido. Se o depósito foi pago, ele será retido como arras confirmatórias.
                    A capacidade será liberada.
                  </p>
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="destructive"
                    className="mt-3"
                  >
                    Cancelar Pedido
                  </Button>
                </div>
              </div>
            )}

            {!canMarkComplete && !canCancel && (
              <div className="flex items-center gap-2 text-muted-foreground p-4 border rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  Nenhuma ação disponível para o status atual do pedido.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo do Cancelamento</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Ex: Cliente solicitou cancelamento, Produto indisponível, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
            {purchase.deposit_paid_at && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-900">
                  O depósito de R$ {purchase.deposit_amount?.toFixed(2)} será retido como arras confirmatórias.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
              disabled={cancelMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Voucher Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Comprovante</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O cliente será notificado e poderá enviar um novo comprovante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo da Rejeição</Label>
              <Textarea
                id="reject-reason"
                placeholder="Ex: Comprovante ilegível, Valor incorreto, Data inválida, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-900">
                O cliente receberá uma notificação por email com o motivo da rejeição e poderá enviar um novo comprovante.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}
              disabled={rejectVoucherMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectVoucherMutation.isPending || !rejectReason.trim()}
            >
              {rejectVoucherMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Comprovante</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <img
              src={selectedImage}
              alt="Comprovante de Pagamento"
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImageDialog(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => window.open(selectedImage, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
