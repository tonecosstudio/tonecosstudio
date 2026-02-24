import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { 
  CheckCircle2, 
  Clock, 
  Package,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentLinkCard } from "@/components/PaymentLinkCard";

export default function PreorderTracking() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Buscar orçamento
  const quoteQuery = useQuery({
    queryKey: ["quote-tracking", quoteId],
    enabled: Boolean(quoteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          quote_items (
            id,
            quantity,
            scale,
            models (
              id,
              name,
              image_bucket,
              image_path
            )
          ),
          quote_production (
            id,
            current_stage,
            started_at,
            updated_at
          ),
          quote_production_updates (
            id,
            stage,
            note,
            created_at,
            quote_production_photos (
              id,
              url,
              caption
            )
          )
        `)
        .eq("id", quoteId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Orçamento não encontrado");
      }
      
      return data;
    },
  });

  // Buscar pagamentos
  const paymentsQuery = useQuery({
    queryKey: ["quote-payments", quoteId],
    enabled: Boolean(quoteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_payments")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const quote = quoteQuery.data;
  const payments = paymentsQuery.data || [];

  const depositPayment = payments.find(p => p.payment_type === "deposit" && p.status === "completed");
  const finalPayment = payments.find(p => p.payment_type === "final" && p.status === "completed");

  // Status do pedido
  const getStatusInfo = () => {
    if (!quote) return { label: "Carregando...", color: "gray", icon: Clock };

    if (quote.payment_status === "pending") {
      return { 
        label: "Aguardando Pagamento do Sinal", 
        color: "yellow", 
        icon: AlertCircle 
      };
    }

    if (quote.payment_status === "deposit_paid" && !quote.ready_for_final_payment) {
      return { 
        label: "Em Produção", 
        color: "blue", 
        icon: Package 
      };
    }

    if (quote.payment_status === "deposit_paid" && quote.ready_for_final_payment) {
      return { 
        label: "Aguardando Pagamento Final", 
        color: "orange", 
        icon: CreditCard 
      };
    }

    if (quote.payment_status === "fully_paid") {
      return { 
        label: "Pago - Pronto para Envio", 
        color: "green", 
        icon: CheckCircle2 
      };
    }

    return { label: "Processando", color: "gray", icon: Clock };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Mutation: Processar pagamento final
  const processFinalPaymentMutation = useMutation({
    mutationFn: async () => {
      // Redirecionar para página de pagamento
      navigate(`/orcamento/pagamento?quote=${quoteId}&type=final`);
    },
  });

  if (!quoteId) {
    return (
      <AppShell>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  if (quoteQuery.isLoading) {
    return (
      <AppShell>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <SEOHead
        title={`Pedido #${quoteId?.slice(0, 8)} - Acompanhamento`}
        description="Acompanhe seu pedido em tempo real"
      />

      <AppShell>
        <div className="container py-12 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Pedido #{quoteId?.slice(0, 8)}
                </h1>
                <p className="text-muted-foreground">
                  Acompanhe o progresso do seu pedido
                </p>
              </div>
              <Badge 
                variant={statusInfo.color === "green" ? "default" : "secondary"}
                className="text-sm px-4 py-2"
              >
                <StatusIcon className="h-4 w-4 mr-2" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            {/* Conteúdo Principal */}
            <div className="space-y-6">
              {/* Card de Link de Pagamento */}
              {quote?.payment_link_sent_at && (
                <PaymentLinkCard
                  quoteId={quoteId!}
                  amount={quote.payment_status === "pending" ? (quote.deposit_amount || 100) : (quote.remaining_amount || 0)}
                  paymentLink={quote.payment_link}
                  pixKey={quote.pix_key}
                  instructions={quote.payment_instructions}
                  paymentLinkSentAt={quote.payment_link_sent_at}
                  customerPaidNotificationAt={quote.customer_paid_notification_at}
                />
              )}

              {/* Alerta de Pagamento Final (fallback se não tiver link) */}
              {quote?.ready_for_final_payment && quote?.payment_status === "deposit_paid" && !quote?.payment_link_sent_at && (
                <Alert className="border-orange-500 bg-orange-500/10">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <AlertTitle className="text-orange-600 font-bold">
                    🎉 Seu Pedido Está Pronto!
                  </AlertTitle>
                  <AlertDescription className="text-orange-600">
                    <p className="mb-3">
                      A produção foi finalizada e seu pedido está pronto para envio.
                      Aguarde o link de pagamento do restante.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Informações de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sinal */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Sinal</p>
                        {depositPayment ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pago
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {quote?.deposit_amount?.toFixed(2)}
                      </p>
                      {depositPayment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pago em {format(new Date(depositPayment.paid_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Restante */}
                  <div className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Restante</p>
                        {finalPayment ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pago
                          </Badge>
                        ) : quote?.ready_for_final_payment ? (
                          <Badge variant="default" className="bg-orange-500">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pronto para Pagar
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando Produção
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold">
                        R$ {quote?.remaining_amount?.toFixed(2)}
                      </p>
                      {finalPayment ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pago em {format(new Date(finalPayment.paid_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      ) : quote?.ready_for_final_payment ? (
                        <p className="text-xs text-orange-600 mt-1">
                          Pague agora para liberarmos o envio
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pagar quando o produto estiver pronto
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor Total</span>
                      <span className="text-xl font-bold">
                        R$ {quote?.total_amount?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline de Produção */}
              {quote?.quote_production && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Progresso da Produção
                    </CardTitle>
                    <CardDescription>
                      Acompanhe cada etapa da produção
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {quote.quote_production_updates && quote.quote_production_updates.length > 0 ? (
                      <div className="space-y-6">
                        {quote.quote_production_updates.map((update: any, index: number) => (
                          <div key={update.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                index === 0 ? "bg-primary" : "bg-muted"
                              }`}>
                                <CheckCircle2 className={`h-5 w-5 ${
                                  index === 0 ? "text-primary-foreground" : "text-muted-foreground"
                                }`} />
                              </div>
                              {index < quote.quote_production_updates.length - 1 && (
                                <div className="w-0.5 h-full bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">{update.stage}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(update.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              {update.note && (
                                <p className="text-sm text-muted-foreground mb-3">
                                  {update.note}
                                </p>
                              )}
                              {update.quote_production_photos && update.quote_production_photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {update.quote_production_photos.map((photo: any) => (
                                    <Dialog key={photo.id}>
                                      <DialogTrigger asChild>
                                        <img
                                          src={photo.url}
                                          alt={photo.caption || "Foto da produção"}
                                          className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                      </DialogTrigger>
                                      <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                          <DialogTitle>{update.stage}</DialogTitle>
                                          {photo.caption && (
                                            <DialogDescription>{photo.caption}</DialogDescription>
                                          )}
                                        </DialogHeader>
                                        <img
                                          src={photo.url}
                                          alt={photo.caption || "Foto da produção"}
                                          className="w-full h-auto rounded"
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aguardando início da produção</p>
                        <p className="text-sm mt-2">
                          Você receberá atualizações assim que iniciarmos
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Resumo */}
            <div className="lg:sticky lg:top-4 h-fit space-y-6">
              {/* Itens do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quote?.quote_items?.map((item: any) => (
                    <div key={item.id} className="flex gap-3">
                      {item.models?.image_path ? (
                        <img
                          src={`${supabase.storage.from(item.models.image_bucket).getPublicUrl(item.models.image_path).data.publicUrl}`}
                          alt={item.models.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">
                          {item.models?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Escala {item.scale}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Quantidade: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ações */}
              {quote?.ready_for_final_payment && quote?.payment_status === "deposit_paid" && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-primary">Ação Necessária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Seu pedido está pronto! Pague o restante para liberarmos o envio.
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => processFinalPaymentMutation.mutate()}
                    >
                      Pagar R$ {quote.remaining_amount?.toFixed(2)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Suporte */}
              <Card>
                <CardHeader>
                  <CardTitle>Precisa de Ajuda?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Entre em contato conosco para qualquer dúvida sobre seu pedido.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/perfil?section=support")}
                  >
                    Falar com Suporte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
