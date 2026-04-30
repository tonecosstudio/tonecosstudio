import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle2,
  Package,
  DollarSign,
  AlertCircle,
  Send,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
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

export default function AdminPreorders() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<
    "pending_deposit" | "in_production" | "ready_for_payment" | "completed"
  >("in_production");

  // Buscar pré-vendas
  const preordersQuery = useQuery({
    queryKey: ["admin-preorders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          quote_items (
            id,
            models (
              name
            )
          )
        `
        )
        .eq("is_preorder", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar dados do usuário separadamente
      const quotesWithUserData = await Promise.all(
        (data || []).map(async (quote: any) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", quote.user_id)
            .maybeSingle();

          return {
            ...quote,
            profiles: profileData || { full_name: "N/A", email: "N/A" },
          };
        })
      );

      return quotesWithUserData;
    },
  });

  // Buscar estatísticas
  const statsQuery = useQuery({
    queryKey: ["admin-preorders-stats"],
    queryFn: async () => {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("payment_status, deposit_amount, remaining_amount, total_amount")
        .eq("is_preorder", true);

      const stats = {
        total: quotes?.length || 0,
        pending_deposit: quotes?.filter((q) => q.payment_status === "pending").length || 0,
        in_production:
          quotes?.filter((q) => q.payment_status === "deposit_paid" && !q.ready_for_final_payment)
            .length || 0,
        ready_for_payment:
          quotes?.filter((q) => q.payment_status === "deposit_paid" && q.ready_for_final_payment)
            .length || 0,
        completed: quotes?.filter((q) => q.payment_status === "fully_paid").length || 0,
        total_deposits: quotes?.reduce((acc, q) => acc + (q.deposit_amount || 0), 0) || 0,
        total_remaining: quotes?.reduce((acc, q) => acc + (q.remaining_amount || 0), 0) || 0,
        total_revenue: quotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0,
      };

      return stats;
    },
  });

  const preorders = preordersQuery.data || [];
  const stats = statsQuery.data;

  // Filtrar por tab
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

  // Mutation: Liberar pagamento final
  const releaseFinalPaymentMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("quotes")
        .update({
          ready_for_final_payment: true,
          final_payment_notified_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (error) throw error;

      // TODO: Enviar notificação ao cliente (email/WhatsApp)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-preorders"] });
      qc.invalidateQueries({ queryKey: ["admin-preorders-stats"] });
      toast({
        title: "Pagamento liberado!",
        description: "O cliente foi notificado para pagar o restante.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao liberar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Marcar como pago manualmente
  const markAsPaidMutation = useMutation({
    mutationFn: async ({
      quoteId,
      paymentType,
    }: {
      quoteId: string;
      paymentType: "deposit" | "final";
    }) => {
      // 1. Criar registro de pagamento
      const quote = preorders.find((q) => q.id === quoteId);
      if (!quote) throw new Error("Pedido não encontrado");

      const amount = paymentType === "deposit" ? quote.deposit_amount : quote.remaining_amount;

      const { error: paymentError } = await supabase.from("quote_payments").insert({
        quote_id: quoteId,
        payment_type: paymentType,
        amount: amount,
        status: "completed",
        payment_method: "manual",
        paid_at: new Date().toISOString(),
      });

      if (paymentError) throw paymentError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-preorders"] });
      qc.invalidateQueries({ queryKey: ["admin-preorders-stats"] });
      toast({
        title: "Pagamento registrado!",
        description: "O status do pedido foi atualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Pré-vendas</h2>
        <p className="text-muted-foreground">Gerencie pedidos com pagamento de sinal</p>
      </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
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
              <div className="text-2xl font-bold text-orange-600">
                {stats?.ready_for_payment || 0}
              </div>
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

        {/* Tabs */}
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

        {/* Lista de Pré-vendas */}
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
                {filteredPreorders.map((quote: any) => (
                  <div
                    key={quote.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">#{quote.id.slice(0, 8)}</p>
                          {quote.payment_status === "pending" && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Aguardando Sinal
                            </Badge>
                          )}
                          {quote.payment_status === "deposit_paid" &&
                            !quote.ready_for_final_payment && (
                              <Badge variant="default" className="bg-blue-500">
                                <Package className="h-3 w-3 mr-1" />
                                Em Produção
                              </Badge>
                            )}
                          {quote.payment_status === "deposit_paid" &&
                            quote.ready_for_final_payment && (
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

                        {/* Cliente */}
                        <p className="text-sm text-muted-foreground mb-2">
                          Cliente:{" "}
                          {quote.profiles?.full_name || quote.profiles?.email || "Sem nome"}
                        </p>

                        {/* Itens */}
                        <p className="text-sm text-muted-foreground mb-3">
                          {quote.quote_items?.length} item(ns):{" "}
                          {quote.quote_items?.map((item: any) => item.models?.name).join(", ")}
                        </p>

                        {/* Valores */}
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

                        {/* Data */}
                        <p className="text-xs text-muted-foreground mt-2">
                          Criado em{" "}
                          {format(new Date(quote.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/orcamentos/${quote.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>

                        {/* Botão Enviar Link de Pagamento */}
                        {quote.payment_status === "pending" && (
                          <SendPaymentLinkDialog
                            quoteId={quote.id}
                            amount={quote.deposit_amount || 100}
                            paymentType="voucher"
                            customerName={quote.profiles?.full_name || "Cliente"}
                            customerEmail={quote.profiles?.email || ""}
                          />
                        )}

                        {quote.payment_status === "deposit_paid" &&
                          quote.ready_for_final_payment && (
                            <SendPaymentLinkDialog
                              quoteId={quote.id}
                              amount={quote.remaining_amount || 0}
                              paymentType="final"
                              customerName={quote.profiles?.full_name || "Cliente"}
                              customerEmail={quote.profiles?.email || ""}
                            />
                          )}

                        {quote.payment_status === "deposit_paid" &&
                          !quote.ready_for_final_payment && (
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
                                    O cliente será notificado para pagar o restante de{" "}
                                    <strong>R$ {quote.remaining_amount?.toFixed(2)}</strong>.
                                    <br />
                                    <br />
                                    Isso irá:
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>Enviar notificação no site</li>
                                      <li>Liberar o pagamento final</li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => releaseFinalPaymentMutation.mutate(quote.id)}
                                  >
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
                            onClick={() =>
                              markAsPaidMutation.mutate({
                                quoteId: quote.id,
                                paymentType: "deposit",
                              })
                            }
                          >
                            Marcar Sinal Pago
                          </Button>
                        )}

                        {quote.payment_status === "deposit_paid" &&
                          quote.ready_for_final_payment && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                markAsPaidMutation.mutate({
                                  quoteId: quote.id,
                                  paymentType: "final",
                                })
                              }
                            >
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
