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
import { PRICING } from "@/config/constants";
import { adminOrdersPath } from "@/config/routes";

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
        description: "Pedido nao encontrado",
        variant: "destructive",
      });
      return;
    }

    const amount = paymentType === "deposit" ? quote.deposit_amount : quote.remaining_amount;
    if (amount == null) {
      toast({
        title: "Erro ao registrar pagamento",
        description: "Valor de pagamento nao disponivel",
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
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Pre-vendas</h2>
        <p className="text-muted-foreground">Gerencie pedidos com pagamento de sinal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pre-vendas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Producao</CardTitle>
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
            <p className="text-xs text-muted-foreground mt-1">
              Sinais: R$ {(stats?.total_deposits || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
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
          Em Producao ({stats?.in_production || 0})
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
          Concluidos ({stats?.completed || 0})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>{filteredPreorders.length} pedido(s) nesta categoria</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPreorders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPreorders.map((quote) => (
                <div key={quote.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">#{quote.id.slice(0, 8)}</p>
                        {quote.payment_status === "pending" && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando Sinal
                          </Badge>
                        )}
                        {quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment && (
                          <Badge variant="default" className="bg-blue-500">
                            <Package className="h-3 w-3 mr-1" />
                            Em Producao
                          </Badge>
                        )}
                        {quote.payment_status === "deposit_paid" && quote.ready_for_final_payment && (
                          <Badge variant="default" className="bg-orange-500">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Aguardando Pagamento
                          </Badge>
                        )}
                        {quote.payment_status === "fully_paid" && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pago
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        Cliente: {quote.profiles?.full_name || quote.profiles?.email || "Sem nome"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {quote.quote_items?.length} item(ns):{" "}
                        {quote.quote_items?.map((item) => item.name).filter(Boolean).join(", ")}
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sinal:</span>
                          <p className="font-medium">R$ {quote.deposit_amount?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Restante:</span>
                          <p className="font-medium">R$ {quote.remaining_amount?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="font-medium">R$ {quote.total_amount?.toFixed(2)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Criado em{" "}
                        {format(new Date(quote.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(adminOrdersPath({ type: "quote", search: quote.id }))}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>

                      {quote.payment_status === "pending" && (
                        <SendPaymentLinkDialog
                          quoteId={quote.id}
                          amount={quote.deposit_amount ?? PRICING.DEFAULT_DEPOSIT_AMOUNT}
                          paymentType="voucher"
                          customerName={quote.profiles?.full_name || "Cliente"}
                          customerEmail={quote.profiles?.email || ""}
                        />
                      )}

                      {quote.payment_status === "deposit_paid" && quote.ready_for_final_payment && (
                        <SendPaymentLinkDialog
                          quoteId={quote.id}
                          amount={quote.remaining_amount || 0}
                          paymentType="final"
                          customerName={quote.profiles?.full_name || "Cliente"}
                          customerEmail={quote.profiles?.email || ""}
                        />
                      )}

                      {quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="default">
                              <Send className="h-4 w-4 mr-2" />
                              Liberar Pagamento
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Liberar Pagamento Final?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O cliente sera notificado para pagar o restante de{" "}
                                <strong>R$ {quote.remaining_amount?.toFixed(2)}</strong>.
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
                        <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(quote.id, "deposit")}>
                          Marcar Sinal Pago
                        </Button>
                      )}

                      {quote.payment_status === "deposit_paid" && quote.ready_for_final_payment && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(quote.id, "final")}>
                          Marcar Final Pago
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
