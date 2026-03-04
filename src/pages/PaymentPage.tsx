// @ts-nocheck
/**
 * PaymentPage Component
 *
 * Page for initiating manual payments for quotes or subscriptions.
 *
 * Requirements: 2.1-2.10, 15.1-15.2, 15.3-15.7
 * Tasks: 16.2 Integrar iniciação de pagamento no fluxo de orçamento
 *        16.3 Integrar iniciação de pagamento no fluxo de assinatura
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { PaymentInitiationFlow } from "@/components/customer/PaymentInitiationFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle, CheckCircle, Package, CreditCard } from "lucide-react";
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";
import type { PaymentType, SubscriptionPeriod } from "@/hooks/usePaymentKeys";

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const quoteId = searchParams.get("quote");
  const subscriptionId = searchParams.get("subscription");
  const paymentType = searchParams.get("type") || "one_time";

  const [amount, setAmount] = useState<number>(0);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Determinar tipo de pagamento para as chaves
  const getPaymentType = (): PaymentType => {
    if (quoteId) {
      if (paymentType === "deposit") return "voucher";
      return "onetime";
    }
    if (subscriptionId) return "subscription";
    return "onetime";
  };

  const getSubscriptionPeriod = (): SubscriptionPeriod | undefined => {
    if (!subscriptionId || !subscriptionQuery.data) return undefined;
    const plan = subscriptionQuery.data.plans;
    // Mapear do banco para o tipo correto
    if (plan?.billing_cycle === "quarterly") return "quarterly";
    if (plan?.billing_cycle === "semiannual") return "semiannual";
    if (plan?.billing_cycle === "annual") return "annual";
    // Fallback baseado no nome do plano
    if (plan?.name?.toLowerCase().includes("trimestral")) return "quarterly";
    if (plan?.name?.toLowerCase().includes("semestral")) return "semiannual";
    if (plan?.name?.toLowerCase().includes("anual")) return "annual";
    return "quarterly";
  };

  // Fetch quote details if quoteId is provided
  const quoteQuery = useQuery({
    queryKey: ["quote-payment", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          quote_items (
            id,
            quantity,
            scale,
            models (
              id,
              name
            )
          )
        `
        )
        .eq("id", quoteId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Orçamento não encontrado");
      }

      return data;
    },
  });

  // Fetch subscription details if subscriptionId is provided
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-payment", subscriptionId],
    enabled: !!subscriptionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          plans (
            id,
            name,
            price,
            currency
          ),
          collections (
            id,
            name,
            slug
          )
        `
        )
        .eq("id", subscriptionId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Assinatura não encontrada");
      }

      return data;
    },
  });

  // Determine payment amount and details
  useEffect(() => {
    if (quoteId && quoteQuery.data) {
      const quote = quoteQuery.data;

      if (paymentType === "deposit" && quote.deposit_amount) {
        setAmount(quote.deposit_amount);
        setTitle(`Pagamento do Sinal - Orçamento #${quoteId.slice(0, 8)}`);
        setDescription("Realize o pagamento do sinal para iniciar a produção do seu pedido.");
      } else if (paymentType === "final" && quote.remaining_amount) {
        setAmount(quote.remaining_amount);
        setTitle(`Pagamento Final - Orçamento #${quoteId.slice(0, 8)}`);
        setDescription("Realize o pagamento final para liberar o envio do seu pedido.");
      } else if (quote.total_amount) {
        setAmount(quote.total_amount);
        setTitle(`Pagamento Total - Orçamento #${quoteId.slice(0, 8)}`);
        setDescription("Realize o pagamento total do seu orçamento.");
      }
    } else if (subscriptionId && subscriptionQuery.data) {
      const subscription = subscriptionQuery.data;
      const plan = subscription.plans;

      if (plan) {
        setAmount(plan.price);
        setTitle(`Assinatura - ${plan.name}`);
        setDescription(
          `Pagamento da assinatura ${subscription.collections?.name || "da coleção"}.`
        );
      }
    }
  }, [quoteQuery.data, subscriptionQuery.data, quoteId, subscriptionId, paymentType]);

  // Handle payment success
  const handlePaymentSuccess = (paymentId: string) => {
    toast({
      title: "Pagamento registrado com sucesso!",
      description: "Agora você pode enviar o comprovante de pagamento.",
    });

    // Navigate to payment details page
    navigate(`/payments/${paymentId}`);
  };

  // Handle cancel
  const handleCancel = () => {
    if (quoteId) {
      navigate(`/orcamento/acompanhar/${quoteId}`);
    } else if (subscriptionId) {
      navigate("/assinaturas");
    } else {
      navigate("/dashboard");
    }
  };

  // Check if we have valid data
  if (!quoteId && !subscriptionId) {
    return (
      <AppShell>
        <div className="container py-12 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Parâmetros inválidos</AlertTitle>
            <AlertDescription>
              Não foi possível identificar o item para pagamento. Por favor, volte e tente
              novamente.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  const isLoading =
    (quoteId && quoteQuery.isLoading) || (subscriptionId && subscriptionQuery.isLoading);
  const error = quoteQuery.error || subscriptionQuery.error;

  if (isLoading) {
    return (
      <AppShell>
        <div className="container py-12 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="container py-12 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar informações</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <Button onClick={handleCancel} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <SEOHead title={title} description={description} />

      <AppShell>
        <div className="container py-8 sm:py-12 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="mb-6 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
              </div>

              {amount > 0 && (
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(amount)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
            {/* Payment Flow */}
            <div className="space-y-6">
              {/* Informações de Pagamento */}
              <PaymentInstructions
                paymentType={getPaymentType()}
                subscriptionPeriod={getSubscriptionPeriod()}
                amount={amount}
              />

              <PaymentInitiationFlow
                quoteId={quoteId || undefined}
                subscriptionId={subscriptionId || undefined}
                amount={amount}
                currency="BRL"
                paymentType={paymentType as any}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancel}
              />
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:sticky lg:top-4 h-fit space-y-6">
              {/* Quote Summary */}
              {quoteId && quoteQuery.data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Resumo do Orçamento
                    </CardTitle>
                    <CardDescription>Detalhes do seu pedido</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Número</span>
                        <span className="text-sm font-medium">#{quoteId.slice(0, 8)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge
                          variant={
                            quoteQuery.data.payment_status === "pending"
                              ? "secondary"
                              : quoteQuery.data.payment_status === "deposit_paid"
                                ? "default"
                                : "outline"
                          }
                        >
                          {quoteQuery.data.payment_status === "pending" && "Aguardando Sinal"}
                          {quoteQuery.data.payment_status === "deposit_paid" && "Sinal Pago"}
                          {quoteQuery.data.payment_status === "fully_paid" && "Pago Totalmente"}
                        </Badge>
                      </div>

                      {quoteQuery.data.quote_items && quoteQuery.data.quote_items.length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Itens:</p>
                          <ul className="space-y-2">
                            {quoteQuery.data.quote_items.map((item: any) => (
                              <li key={item.id} className="text-sm">
                                {item.models?.name} × {item.quantity}
                                <span className="text-muted-foreground block text-xs">
                                  Escala: {item.scale}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subscription Summary */}
              {subscriptionId && subscriptionQuery.data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Resumo da Assinatura
                    </CardTitle>
                    <CardDescription>Detalhes da sua assinatura</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Plano</span>
                        <span className="text-sm font-medium">
                          {subscriptionQuery.data.plans?.name}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Coleção</span>
                        <span className="text-sm font-medium">
                          {subscriptionQuery.data.collections?.name}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge
                          variant={
                            subscriptionQuery.data.status === "active"
                              ? "default"
                              : subscriptionQuery.data.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {subscriptionQuery.data.status === "active" && "Ativa"}
                          {subscriptionQuery.data.status === "pending" && "Pendente"}
                          {subscriptionQuery.data.status === "cancelled" && "Cancelada"}
                        </Badge>
                      </div>

                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Benefícios:</p>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Acesso à coleção</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Descontos exclusivos</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Conteúdo premium</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Important Information */}
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-amber-700">
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>Após o pagamento, você precisará enviar o comprovante</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>Mantenha o comprovante em mãos para upload</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>O processamento pode levar até 24 horas úteis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>Em caso de dúvidas, entre em contato com nosso suporte</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
