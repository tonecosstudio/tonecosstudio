import { useState } from "react";
import {
  useAdminPreordersData,
  useRegisterAdminPreorderManualPayment,
  useRejectAdminPreorderVoucher,
  useReleaseAdminPreorderFinalPayment,
} from "@/hooks/admin/useAdminPreorders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Package, DollarSign, AlertCircle, Send, Eye, RefreshCw } from "lucide-react";
import { SendPaymentLinkDialog } from "@/components/admin/payments/SendPaymentLinkDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";

function isValidPaymentAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatAmount(value: number | null | undefined): string {
  return isValidPaymentAmount(value) ? `R$ ${value.toFixed(2)}` : "Indisponível";
}

export default function AdminPreorders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<
    "under_review" | "pending_deposit" | "in_production" | "ready_for_payment" | "completed"
  >("under_review");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const { preorders, stats, preordersQuery, statsQuery } = useAdminPreordersData();
  const releaseFinalPaymentMutation = useReleaseAdminPreorderFinalPayment();
  const markAsPaidMutation = useRegisterAdminPreorderManualPayment();
  const rejectVoucherMutation = useRejectAdminPreorderVoucher();

  const filteredPreorders = preorders.filter((quote) => {
    switch (selectedTab) {
      case "under_review":
        return quote.payment_status === "under_review";
      case "pending_deposit":
        return quote.payment_status === "pending";
      case "in_production":
        return quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment;
      case "ready_for_payment":
        return quote.payment_status === "deposit_paid" && quote.ready_for_final_payment;
      case "completed":
        return quote.payment_status === "fully_paid";
      default:
        return true;
    }
  });

  const handleReleaseFinalPayment = (quoteId: string) => {
    const quote = preorders.find((item) => item.id === quoteId);
    if (!quote || !isValidPaymentAmount(quote.remaining_amount)) {
      toast({
        title: "Pagamento indisponível",
        description: "O valor restante oficial não está configurado para este pedido.",
        variant: "destructive",
      });
      return;
    }

    releaseFinalPaymentMutation.mutate(quoteId, {
      onSuccess: () => {
        toast({
          title: "Pagamento liberado!",
          description: "O cliente foi notificado para pagar o restante.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Erro ao liberar pagamento",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleRejectVoucher = (quoteId: string) => {
    const rejectionReason = rejectionReasons[quoteId]?.trim() ?? "";
    if (!rejectionReason) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe ao cliente o que precisa ser corrigido no comprovante.",
        variant: "destructive",
      });
      return;
    }
    rejectVoucherMutation.mutate(
      { quoteId, rejectionReason },
      {
        onSuccess: () => {
          setRejectionReasons((current) => ({ ...current, [quoteId]: "" }));
          toast({ title: "Comprovante recusado", description: "O cliente poderá enviar outro comprovante nesta mesma pré-venda." });
        },
        onError: (error: Error) => toast({
          title: "Erro ao recusar comprovante",
          description: error.message,
          variant: "destructive",
        }),
      },
    );
  };

  const handleMarkAsPaid = (quoteId: string, paymentType: "deposit" | "final") => {
    const quote = preorders.find((item) => item.id === quoteId);
    if (!quote) {
      toast({
        title: "Erro ao registrar pagamento",
        description: "Pedido não encontrado",
        variant: "destructive",
      });
      return;
    }

    const amount = paymentType === "deposit" ? quote.deposit_amount : quote.remaining_amount;
    if (!isValidPaymentAmount(amount)) {
      toast({
        title: "Pagamento indisponível",
        description: "O valor oficial deste pagamento não está disponível.",
        variant: "destructive",
      });
      return;
    }

    markAsPaidMutation.mutate(
      { quoteId, paymentType, amount },
      {
        onSuccess: () => {
          toast({
            title: "Pagamento registrado!",
            description: "O status do pedido foi atualizado.",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Erro ao registrar pagamento",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Pré-vendas</h2>
        <p className="text-muted-foreground">Gerencie pedidos com pagamento de sinal</p>
      </div>

      {(preordersQuery.isError || statsQuery.isError) && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">
            {preordersQuery.isError
              ? "Não foi possível carregar a fila de pré-vendas. Os pedidos não serão exibidos como uma fila vazia."
              : "Não foi possível atualizar os indicadores de pré-vendas."}
          </p>
          <div className="flex flex-wrap gap-2">
            {preordersQuery.isError && (
              <Button size="sm" variant="outline" onClick={() => void preordersQuery.refetch()} disabled={preordersQuery.isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${preordersQuery.isFetching ? "animate-spin" : ""}`} />
                Tentar fila novamente
              </Button>
            )}
            {statsQuery.isError && (
              <Button size="sm" variant="outline" onClick={() => void statsQuery.refetch()} disabled={statsQuery.isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
                Atualizar indicadores
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprovantes em análise</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statsQuery.isLoading || statsQuery.isError ? "—" : stats?.pending_review ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pré-vendas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsQuery.isLoading || statsQuery.isError ? "—" : stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statsQuery.isLoading || statsQuery.isError ? "—" : stats?.in_production ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statsQuery.isLoading || statsQuery.isError ? "—" : stats?.ready_for_payment ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsQuery.isLoading || statsQuery.isError ? "—" : `R$ ${(stats?.total_revenue || 0).toFixed(2)}`}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sinais: {statsQuery.isLoading || statsQuery.isError ? "—" : `R$ ${(stats?.total_deposits || 0).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        <Button
          variant={selectedTab === "under_review" ? "default" : "outline"}
          onClick={() => setSelectedTab("under_review")}
          className="whitespace-nowrap"
        >
          Revisar comprovantes ({stats?.pending_review || 0})
        </Button>
        <Button
          variant={selectedTab === "pending_deposit" ? "default" : "outline"}
          onClick={() => setSelectedTab("pending_deposit")}
          className="whitespace-nowrap"
        >
          Aguardando Sinal ({stats?.pending_deposit || 0})
        </Button>
        <Button
          variant={selectedTab === "in_production" ? "default" : "outline"}
          onClick={() => setSelectedTab("in_production")}
          className="whitespace-nowrap"
        >
          Em Produção ({stats?.in_production || 0})
        </Button>
        <Button
          variant={selectedTab === "ready_for_payment" ? "default" : "outline"}
          onClick={() => setSelectedTab("ready_for_payment")}
          className="whitespace-nowrap"
        >
          Pronto para Pagar ({stats?.ready_for_payment || 0})
        </Button>
        <Button
          variant={selectedTab === "completed" ? "default" : "outline"}
          onClick={() => setSelectedTab("completed")}
          className="whitespace-nowrap"
        >
          Concluídos ({stats?.completed || 0})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>{filteredPreorders.length} pedido(s) nesta categoria</CardDescription>
        </CardHeader>
        <CardContent>
          {preordersQuery.isLoading ? (
            <div role="status" className="py-8 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Carregando pré-vendas…
            </div>
          ) : preordersQuery.isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              A fila não está disponível no momento. Use a opção de tentar novamente acima.
            </div>
          ) : filteredPreorders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nenhum pedido nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPreorders.map((quote) => {
                const depositAmount = isValidPaymentAmount(quote.deposit_amount)
                  ? quote.deposit_amount
                  : null;
                const remainingAmount = isValidPaymentAmount(quote.remaining_amount)
                  ? quote.remaining_amount
                  : null;
                const hasDepositAmount = depositAmount !== null;
                const hasRemainingAmount = remainingAmount !== null;

                return (
                  <div
                    key={quote.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <p className="font-medium">#{quote.id.slice(0, 8)}</p>
                          {quote.payment_status === "pending" && (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Aguardando Sinal
                            </Badge>
                          )}
                          {quote.payment_status === "under_review" && (
                            <Badge variant="default" className="bg-orange-500">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Comprovante em análise
                            </Badge>
                          )}
                          {quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment && (
                            <Badge variant="default" className="bg-blue-500">
                              <Package className="mr-1 h-3 w-3" />
                              Em Produção
                            </Badge>
                          )}
                          {quote.payment_status === "deposit_paid" && quote.ready_for_final_payment && (
                            <Badge variant="default" className="bg-orange-500">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Aguardando Pagamento
                            </Badge>
                          )}
                          {quote.payment_status === "fully_paid" && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Pago
                            </Badge>
                          )}
                        </div>

                        <p className="mb-3 text-sm text-muted-foreground">
                          Cliente: {quote.profiles?.full_name || quote.profiles?.email || "Sem nome"}
                        </p>

                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                          <div>
                            <span className="text-muted-foreground">Sinal:</span>
                            <p className="font-medium">{formatAmount(quote.deposit_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Restante:</span>
                            <p className="font-medium">{formatAmount(quote.remaining_amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">{formatAmount(quote.total_amount)}</p>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          Criado em{" "}
                          {format(new Date(quote.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-40">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(
                            TONECOS_COMMERCIAL_ROUTES.adminQuotes + "?quote=" + encodeURIComponent(quote.id),
                          )}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>

                        {quote.payment_status === "pending" && depositAmount !== null && (
                          quote.total_amount !== null && quote.total_amount > depositAmount ? (
                            <SendPaymentLinkDialog
                              quoteId={quote.id}
                              amount={depositAmount}
                              paymentType="deposit"
                              customerName={quote.profiles?.full_name || "Cliente"}
                              customerEmail={quote.profiles?.email || ""}
                            />
                          ) : (
                            <Button size="sm" variant="outline" disabled>Confirme o orçamento primeiro</Button>
                          )
                        )}

                        {quote.payment_status === "pending" && !hasDepositAmount && (
                          <Button size="sm" variant="outline" disabled>
                            Valor do sinal indisponível
                          </Button>
                        )}

                        {quote.payment_status === "deposit_paid" &&
                          quote.ready_for_final_payment &&
                          remainingAmount !== null && (
                            <SendPaymentLinkDialog
                              quoteId={quote.id}
                              amount={remainingAmount}
                              paymentType="final"
                              customerName={quote.profiles?.full_name || "Cliente"}
                              customerEmail={quote.profiles?.email || ""}
                            />
                          )}

                        {quote.payment_status === "deposit_paid" &&
                          quote.ready_for_final_payment &&
                          !hasRemainingAmount && (
                            <Button size="sm" variant="outline" disabled>
                              Valor final indisponível
                            </Button>
                          )}

                        {quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="default" disabled={!hasRemainingAmount}>
                                <Send className="mr-2 h-4 w-4" />
                                Liberar Pagamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Liberar Pagamento Final?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O cliente será notificado para pagar o restante de{" "}
                                  <strong>{formatAmount(quote.remaining_amount)}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleReleaseFinalPayment(quote.id)}>
                                  Sim, Liberar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {quote.payment_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasDepositAmount || quote.total_amount === null || quote.total_amount <= (depositAmount ?? 0)}
                            onClick={() => handleMarkAsPaid(quote.id, "deposit")}
                          >
                            Marcar Sinal Pago
                          </Button>
                        )}

                        {quote.payment_status === "under_review" && (
                          <div className="w-full min-w-0 space-y-2 rounded-md border border-orange-500/30 bg-orange-500/5 p-3 sm:min-w-64">
                            {quote.payment_voucher_url ? (
                              <a
                                href={quote.payment_voucher_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                <Eye className="h-4 w-4" /> Abrir comprovante
                              </a>
                            ) : (
                              <p role="alert" className="text-xs text-destructive">Comprovante indisponível. Atualize a fila antes de aprovar.</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Tipo: {quote.payment_voucher_type === "final" ? "saldo final" : "entrada"} · valor oficial: {formatAmount(quote.payment_voucher_type === "final" ? quote.remaining_amount : quote.deposit_amount)}
                            </p>
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={!quote.payment_voucher_url || !quote.payment_voucher_type || markAsPaidMutation.isPending}
                              onClick={() => quote.payment_voucher_type && handleMarkAsPaid(quote.id, quote.payment_voucher_type)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar comprovante
                            </Button>
                            <label htmlFor={`preorder-reject-${quote.id}`} className="block text-xs font-medium">
                              Motivo para recusar
                            </label>
                            <input
                              id={`preorder-reject-${quote.id}`}
                              value={rejectionReasons[quote.id] ?? ""}
                              maxLength={500}
                              onChange={(event) => setRejectionReasons((current) => ({ ...current, [quote.id]: event.target.value }))}
                              className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              placeholder="Ex.: comprovante ilegível"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled={!rejectionReasons[quote.id]?.trim() || rejectVoucherMutation.isPending}
                              onClick={() => handleRejectVoucher(quote.id)}
                            >
                              Recusar e solicitar novo
                            </Button>
                          </div>
                        )}

                        {quote.payment_status === "deposit_paid" && quote.ready_for_final_payment && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasRemainingAmount}
                            onClick={() => handleMarkAsPaid(quote.id, "final")}
                          >
                            Marcar Final Pago
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
