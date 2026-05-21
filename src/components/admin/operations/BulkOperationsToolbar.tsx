/**
 * BulkOperationsToolbar Component
 *
 * Componente para operações em lote no dashboard de pagamentos admin.
 *
 * Requirements: 12.1-12.15
 * Task: 14.2 Criar componente BulkOperationsToolbar
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  CheckSquare,
  Square,
  Download,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import type { PaymentListItem, BulkOperationResult } from "@/types/manual-payment";
import {
  bulkApprovePayments,
  exportPaymentsToCSV,
  bulkSendMessage,
  startAsyncBulkApprove,
  startAsyncBulkMessage,
  startAsyncBulkExport,
  getBulkOperationStatus,
} from "@/lib/admin-payment-service";
import { useAuth } from "@/lib/auth";
import { log } from "@/lib/logger";

interface BulkOperationsToolbarProps {
  selectedPayments: string[];
  payments: PaymentListItem[];
  onSelectAll: (selectAll: boolean) => void;
  onClearSelection: () => void;
  onSelectionChange?: (selectedIds: string[]) => void;
}

type BulkOperationType = "approve" | "export" | "message";

interface OperationProgress {
  processed: number;
  total: number;
  isComplete: boolean;
  result?: BulkOperationResult;
}

export function BulkOperationsToolbar({
  selectedPayments,
  payments,
  onSelectAll: _onSelectAll,
  onClearSelection,
  onSelectionChange,
}: BulkOperationsToolbarProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [activeOperation, setActiveOperation] = useState<BulkOperationType | null>(null);
  const [operationProgress, setOperationProgress] = useState<OperationProgress | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [asyncOperationStatus, setAsyncOperationStatus] = useState<{
    operation_type: string;
    status: "pending" | "processing" | "completed" | "failed";
    success_count?: number;
    payment_ids?: string[];
  } | null>(null);

  // Check if all payments on current page are selected
  useEffect(() => {
    const allPaymentIds = payments.map((p) => p.id);
    const allSelected =
      allPaymentIds.length > 0 && allPaymentIds.every((id) => selectedPayments.includes(id));
    setIsSelectAll(allSelected);
  }, [selectedPayments, payments]);

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (isSelectAll) {
      // Deselect all payments on current page
      const allPaymentIds = payments.map((p) => p.id);
      const newSelection = selectedPayments.filter((id) => !allPaymentIds.includes(id));
      onSelectionChange?.(newSelection);
    } else {
      // Select all payments on current page
      const allPaymentIds = payments.map((p) => p.id);
      const newSelection = [...new Set([...selectedPayments, ...allPaymentIds])];
      onSelectionChange?.(newSelection);
    }
  };

  // Get selected payment details
  const selectedPaymentDetails = payments.filter((p) => selectedPayments.includes(p.id));

  // Get status counts for selected payments
  const statusCounts = selectedPaymentDetails.reduce(
    (acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get total amount for selected payments
  const totalAmount = selectedPaymentDetails.reduce((sum, payment) => sum + payment.amount, 0);

  // Check if bulk approve is valid (only payments with status 'under_review' can be approved)
  const canBulkApprove = selectedPaymentDetails.some((p) => p.status === "under_review");

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: ({ paymentIds, adminId }: { paymentIds: string[]; adminId: string }) =>
      bulkApprovePayments(paymentIds, adminId, (processed, total) => {
        setOperationProgress({ processed, total, isComplete: false });
      }),
    onMutate: () => {
      setActiveOperation("approve");
      setOperationProgress({ processed: 0, total: selectedPayments.length, isComplete: false });
    },
    onSuccess: (result) => {
      setOperationProgress((prev) => (prev ? { ...prev, isComplete: true, result } : null));
      setShowSummary(true);

      toast({
        title: "Aprovação em lote concluída",
        description: `${result.success_count} pagamento(s) aprovado(s) com sucesso.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
    onError: (error) => {
      toast({
        title: "Erro na aprovação em lote",
        description: error.message,
        variant: "destructive",
      });
      setOperationProgress(null);
    },
    onSettled: () => {
      setActiveOperation(null);
    },
  });

  // Bulk export mutation
  const bulkExportMutation = useMutation({
    mutationFn: (paymentIds: string[]) => exportPaymentsToCSV(paymentIds),
    onMutate: () => {
      setActiveOperation("export");
      setOperationProgress({ processed: 0, total: selectedPayments.length, isComplete: false });
    },
    onSuccess: (csvBlob) => {
      setOperationProgress((prev) => (prev ? { ...prev, isComplete: true } : null));

      // Create download link
      const url = URL.createObjectURL(csvBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pagamentos-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `Arquivo CSV com ${selectedPayments.length} pagamento(s) baixado.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
      setOperationProgress(null);
    },
    onSettled: () => {
      setActiveOperation(null);
    },
  });

  // Bulk message mutation
  const bulkMessageMutation = useMutation({
    mutationFn: ({
      paymentIds,
      message,
      adminId,
    }: {
      paymentIds: string[];
      message: string;
      adminId: string;
    }) =>
      bulkSendMessage(paymentIds, message, adminId, (processed, total) => {
        setOperationProgress({ processed, total, isComplete: false });
      }),
    onMutate: () => {
      setActiveOperation("message");
      setOperationProgress({ processed: 0, total: selectedPayments.length, isComplete: false });
    },
    onSuccess: (result) => {
      setOperationProgress((prev) => (prev ? { ...prev, isComplete: true, result } : null));
      setShowSummary(true);
      setMessageText("");

      toast({
        title: "Mensagem em lote enviada",
        description: `${result.success_count} mensagem(ns) enviada(s) com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no envio de mensagem",
        description: error.message,
        variant: "destructive",
      });
      setOperationProgress(null);
    },
    onSettled: () => {
      setActiveOperation(null);
    },
  });

  // Start async bulk approve
  const handleAsyncBulkApprove = async () => {
    if (!user?.id) return;

    try {
      const operationId = await startAsyncBulkApprove(selectedPayments, user.id);
      toast({
        title: "Aprovação em lote iniciada",
        description:
          "A operação está sendo processada em segundo plano. Você pode continuar trabalhando.",
      });

      // Start polling for status
      pollAsyncOperationStatus(operationId);
    } catch (error) {
      toast({
        title: "Erro ao iniciar aprovação em lote",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Start async bulk message
  const handleAsyncBulkMessage = async () => {
    if (!user?.id || !messageText.trim()) return;

    try {
      const operationId = await startAsyncBulkMessage(selectedPayments, messageText, user.id);
      setMessageText("");

      toast({
        title: "Mensagem em lote iniciada",
        description:
          "A operação está sendo processada em segundo plano. Você pode continuar trabalhando.",
      });

      // Start polling for status
      pollAsyncOperationStatus(operationId);
    } catch (error) {
      toast({
        title: "Erro ao iniciar mensagem em lote",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Start async bulk export
  const handleAsyncBulkExport = async () => {
    if (!user?.id) return;

    try {
      const operationId = await startAsyncBulkExport(selectedPayments, user.id);
      toast({
        title: "Exportação em lote iniciada",
        description:
          "A operação está sendo processada em segundo plano. Você será notificado quando concluir.",
      });

      // Start polling for status
      pollAsyncOperationStatus(operationId);
    } catch (error) {
      toast({
        title: "Erro ao iniciar exportação em lote",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Poll async operation status
  const pollAsyncOperationStatus = async (operationId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getBulkOperationStatus(operationId);
        setAsyncOperationStatus(status);

        if (status.status === "completed" || status.status === "failed") {
          clearInterval(interval);

          if (status.status === "completed") {
            toast({
              title: "Operação em lote concluída",
              description: `Operação ${operationId} concluída com sucesso.`,
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
            queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
          } else {
            toast({
              title: "Operação em lote falhou",
              description: `Operação ${operationId} falhou.`,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        log.error("Error polling operation status", { error, operationId });
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  // Handle bulk approve
  const handleBulkApprove = () => {
    if (!user?.id) return;

    // For large selections (>10), use async processing
    if (selectedPayments.length > 10) {
      handleAsyncBulkApprove();
    } else {
      bulkApproveMutation.mutate({ paymentIds: selectedPayments, adminId: user.id });
    }
  };

  // Handle bulk export
  const handleBulkExport = () => {
    // For large selections (>10), use async processing
    if (selectedPayments.length > 10 && user?.id) {
      handleAsyncBulkExport();
    } else {
      bulkExportMutation.mutate(selectedPayments);
    }
  };

  // Handle bulk message
  const handleBulkMessage = () => {
    if (!user?.id || !messageText.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, digite uma mensagem para enviar.",
        variant: "destructive",
      });
      return;
    }

    // For large selections (>10), use async processing
    if (selectedPayments.length > 10) {
      handleAsyncBulkMessage();
    } else {
      bulkMessageMutation.mutate({
        paymentIds: selectedPayments,
        message: messageText,
        adminId: user.id,
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "under_review":
        return <AlertCircle className="h-3 w-3" />;
      case "requires_info":
        return <AlertCircle className="h-3 w-3" />;
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "rejected":
        return <X className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "under_review":
        return "Em Revisão";
      case "requires_info":
        return "Precisa de Info";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  // If no payments selected, don't show the toolbar
  if (selectedPayments.length === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Selection info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllToggle}
                title={isSelectAll ? "Desmarcar todos" : "Marcar todos"}
              >
                {isSelectAll ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-medium">{selectedPayments.length} selecionado(s)</span>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatCurrency(totalAmount)}
              </Badge>

              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs flex items-center gap-1">
                  {getStatusIcon(status)}
                  {count} {getStatusLabel(status)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!canBulkApprove || activeOperation !== null}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Selecionados
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Aprovação em Lote</DialogTitle>
                  <DialogDescription>
                    Você está prestes a aprovar {selectedPayments.length} pagamento(s).
                    {!canBulkApprove && (
                      <div className="mt-2 text-amber-600 text-sm">
                        Apenas pagamentos com status "Em Revisão" serão aprovados. Os demais serão
                        ignorados.
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="text-sm text-gray-600">
                    <p>Esta ação não pode ser desfeita.</p>
                    {selectedPayments.length > 10 && (
                      <p className="mt-2 text-amber-600">
                        Como há mais de 10 pagamentos selecionados, a operação será processada em
                        segundo plano para melhor performance.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {}}>
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleBulkApprove}
                    disabled={activeOperation !== null}
                  >
                    Confirmar Aprovação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              disabled={activeOperation !== null}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" disabled={activeOperation !== null}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Enviar Mensagem em Lote</SheetTitle>
                  <SheetDescription>
                    Envie uma mensagem para {selectedPayments.length} cliente(s) selecionado(s).
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      placeholder="Digite sua mensagem aqui..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={6}
                    />
                    <p className="text-sm text-gray-500">
                      A mensagem será enviada para a conversa de suporte de cada pagamento.
                    </p>
                  </div>

                  {selectedPayments.length > 10 && (
                    <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                      <p className="text-sm text-amber-800">
                        Como há mais de 10 pagamentos selecionados, a operação será processada em
                        segundo plano para melhor performance.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => {}}>
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleBulkMessage}
                    disabled={!messageText.trim() || activeOperation !== null}
                  >
                    Enviar Mensagem
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Progress indicator */}
        {operationProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {activeOperation === "approve" && "Aprovando pagamentos..."}
                {activeOperation === "export" && "Exportando pagamentos..."}
                {activeOperation === "message" && "Enviando mensagens..."}
              </span>
              <span className="text-sm text-gray-500">
                {operationProgress.processed} de {operationProgress.total}
              </span>
            </div>
            <Progress
              value={(operationProgress.processed / operationProgress.total) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Async operation status */}
        {asyncOperationStatus && (
          <div className="mt-4 p-3 border rounded-md bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  Operação em segundo plano: {asyncOperationStatus.operation_type}
                </span>
              </div>
              <Badge
                variant={
                  asyncOperationStatus.status === "completed"
                    ? "default"
                    : asyncOperationStatus.status === "failed"
                      ? "destructive"
                      : "outline"
                }
              >
                {asyncOperationStatus.status === "pending" && "Pendente"}
                {asyncOperationStatus.status === "processing" && "Processando"}
                {asyncOperationStatus.status === "completed" && "Concluído"}
                {asyncOperationStatus.status === "failed" && "Falhou"}
              </Badge>
            </div>

            {asyncOperationStatus.status === "processing" && (
              <div className="mt-2">
                <Progress value={50} className="h-1" />
              </div>
            )}

            {asyncOperationStatus.status === "completed" && asyncOperationStatus.success_count && (
              <div className="mt-2 text-sm text-gray-600">
                {asyncOperationStatus.success_count} de{" "}
                {asyncOperationStatus.payment_ids?.length || 0} concluído(s)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operation summary dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo da Operação em Lote</DialogTitle>
            <DialogDescription>
              Resultado da operação {activeOperation} concluída.
            </DialogDescription>
          </DialogHeader>

          {operationProgress?.result && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500">Sucesso</div>
                  <div className="text-2xl font-bold text-green-600">
                    {operationProgress.result.success_count}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500">Falhas</div>
                  <div className="text-2xl font-bold text-red-600">
                    {operationProgress.result.failure_count}
                  </div>
                </div>
              </div>

              {operationProgress.result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Erros encontrados:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {operationProgress.result.errors.map((error, index) => (
                      <div key={index} className="p-3 border-b last:border-b-0">
                        <div className="text-sm font-medium">Pagamento: {error.payment_id}</div>
                        <div className="text-sm text-red-600 mt-1">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>
                  Os pagamentos com sucesso foram processados normalmente.
                  {operationProgress.result.failure_count > 0 && (
                    <span> Os pagamentos com falha mantiveram seu status original.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setShowSummary(false);
                onClearSelection();
                setOperationProgress(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
