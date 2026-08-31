import { useState } from "react";
import {
  useAdminPreordersData,
  useRegisterAdminPreorderManualPayment,
  useReleaseAdminPreorderFinalPayment,
} from "@/hooks/admin/useAdminPreorders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Package, DollarSign, AlertCircle, Send, Eye } from "lucide-react";
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
import { adminOrdersPath } from "@/config/routes";

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
    "pending_deposit" | "in_production" | "ready_for_payment" | "completed"
  >("in_production");
  const { preorders, stats } = useAdminPreordersData();
  const releaseFinalPaymentMutation = useReleaseAdminPreorderFinalPayment();
  const markAsPaidMutation = useRegisterAdminPreorderManualPayment();

  const filteredPreorders = preorders.filter((quote) => {
    switch (selectedTab) {
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

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pré-vendas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.in_production || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.ready_for_payment || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {(stats?.total_revenue || 0).toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sinais: R$ {(stats?.total_deposits || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
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
          {filteredPreorders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nenhum pedido nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPreorders.map((quote) => {
                const hasDepositAmount = isValidPaymentAmount(quote.deposit_amount);
                const hasRemainingAmount = isValidPaymentAmount(quote.remaining_amount);

                return (
                  <div
                    key={quote.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <p className="font-medium">#{quote.id.slice(0, 8)}</p>
                          {quote.payment_status === "pending" && (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Aguardando Sinal
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

                        <p className="mb-2 text-sm text-muted-foreground">
                          Cliente: {quote.profiles?.full_name || quote.profiles?.email || "Sem nome"}
                        </p>
                        <p className="mb-3 text-sm text-muted-foreground">
                          {quote.quote_items?.length} item(ns):{" "}
                          {quote.quote_items?.map((item) => item.name).filter(Boolean).join(", ")}
                        </p>

                        <div className="grid grid-cols-3 gap-4 text-sm">
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

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(adminOrdersPath({ type: "quote", search: quote.id }))}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>

                        {quote.payment_status === "pending" && hasDepositAmount && (
                          <SendPaymentLinkDialog
                            quoteId={quote.id}
                            amount={quote.deposit_amount}
                            paymentType="voucher"
                            customerName={quote.profiles?.full_name || "Cliente"}
                            customerEmail={quote.profiles?.email || ""}
                          />
                        )}

                        {quote.payment_status === "pending" && !hasDepositAmount && (
                          <Button size="sm" variant="outline" disabled>
                            Valor do sinal indisponível
                          </Button>
                        )}

                        {quote.payment_status === "deposit_paid" &&
                          quote.ready_for_final_payment &&
                          hasRemainingAmount && (
                            <SendPaymentLinkDialog
                              quoteId={quote.id}
                              amount={quote.remaining_amount}
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
                            disabled={!hasDepositAmount}
                            onClick={() => handleMarkAsPaid(quote.id, "deposit")}
                          >
                            Marcar Sinal Pago
                          </Button>
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
