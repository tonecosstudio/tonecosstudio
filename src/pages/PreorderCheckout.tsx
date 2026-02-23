import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Package,
  ArrowRight,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PreorderCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quote");
  
  const [paymentOption, setPaymentOption] = useState<"full" | "preorder">("preorder");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");

  // Buscar orçamento
  const quoteQuery = useQuery({
    queryKey: ["quote-checkout", quoteId],
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
          )
        `)
        .eq("id", quoteId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Buscar configurações de pré-venda
  const settingsQuery = useQuery({
    queryKey: ["preorder-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preorder_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const quote = quoteQuery.data;
  const settings = settingsQuery.data;

  // Calcular valores
  const totalAmount = quote?.total_amount || 0;
  const depositAmount = quote?.deposit_amount || settings?.default_deposit_fixed || 100;
  const remainingAmount = totalAmount - depositAmount;

  // Aplicar desconto PIX (5%)
  const pixDiscount = 0.05;
  const finalAmount = paymentOption === "full" 
    ? (paymentMethod === "pix" ? totalAmount * (1 - pixDiscount) : totalAmount)
    : (paymentMethod === "pix" ? depositAmount * (1 - pixDiscount) : depositAmount);

  // Mutation: Processar pagamento (Sistema PLE - Pagamento Link Externo)
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      // 1. Atualizar quote
      const { error: quoteError } = await supabase
        .from("quotes")
        .update({
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          remaining_amount: remainingAmount,
          is_preorder: paymentOption === "preorder",
          payment_status: "pending",
          payment_method: paymentMethod,
        })
        .eq("id", quoteId);

      if (quoteError) throw quoteError;

      // 2. Criar pagamento manual (PLE)
      const { data: payment, error: paymentError } = await supabase
        .from("manual_payments")
        .insert({
          user_id: userData.user.id,
          type: paymentOption === "full" ? "purchase" : "preorder_deposit",
          amount: finalAmount,
          status: "pending",
          payment_method: paymentMethod,
          metadata: {
            quote_id: quoteId,
            payment_type: paymentOption === "full" ? "full" : "deposit",
            total_amount: totalAmount,
            deposit_amount: depositAmount,
            remaining_amount: remainingAmount,
          },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 3. Criar conversa de suporte
      const { error: conversationError } = await supabase
        .from("support_conversations")
        .insert({
          user_id: userData.user.id,
          subject: `Pagamento - Orçamento #${quoteId?.slice(0, 8)}`,
          status: "open",
          priority: "high",
          metadata: {
            payment_id: payment.id,
            quote_id: quoteId,
            payment_type: paymentOption,
            amount: finalAmount,
          },
        });

      if (conversationError) throw conversationError;

      return { paymentId: payment.id };
    },
    onSuccess: ({ paymentId }) => {
      toast({
        title: "Pedido criado!",
        description: "Você será redirecionado para a página de pagamento.",
      });

      // Redirecionar para página de pagamento manual
      setTimeout(() => {
        navigate(`/pagamentos/${paymentId}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!quoteId) {
    return (
      <AppShell>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Orçamento não encontrado</p>
          <Button onClick={() => navigate("/orcamento")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  if (quoteQuery.isLoading || settingsQuery.isLoading) {
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
        title="Finalizar Pedido - Pré-venda"
        description="Escolha como pagar seu pedido"
      />

      <AppShell>
        <div className="container py-12 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Finalizar Pedido</h1>
            <p className="text-muted-foreground">
              Escolha a melhor forma de pagamento para você
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Opções de Pagamento */}
            <div className="space-y-6">
              {/* Opção: Pré-venda */}
              <Card 
                className={`cursor-pointer transition-all ${
                  paymentOption === "preorder" 
                    ? "border-primary shadow-lg" 
                    : "hover:border-primary/50"
                }`}
                onClick={() => setPaymentOption("preorder")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Pré-venda (Recomendado)
                          <Badge variant="default">Mais Popular</Badge>
                        </CardTitle>
                        <CardDescription>
                          Pague o sinal agora e o restante quando estiver pronto
                        </CardDescription>
                      </div>
                    </div>
                    <RadioGroup value={paymentOption} onValueChange={(v: any) => setPaymentOption(v)}>
                      <RadioGroupItem value="preorder" />
                    </RadioGroup>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">Pagar Agora</p>
                        <p className="text-2xl font-bold text-primary">
                          R$ {depositAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Pagar Depois</p>
                        <p className="text-2xl font-bold">
                          R$ {remainingAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Como funciona */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Como funciona:</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Você paga <strong>R$ {depositAmount.toFixed(2)}</strong> agora para reservar</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Iniciamos a produção imediatamente</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Você acompanha todo o processo com fotos</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Quando pronto, você paga os <strong>R$ {remainingAmount.toFixed(2)}</strong> restantes</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Enviamos para você</span>
                        </div>
                      </div>
                    </div>

                    {/* Vantagens */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Vantagens:</strong> Menor investimento inicial, só paga o restante quando ver o produto pronto, sem risco.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Opção: Pagamento Completo */}
              <Card 
                className={`cursor-pointer transition-all ${
                  paymentOption === "full" 
                    ? "border-primary shadow-lg" 
                    : "hover:border-primary/50"
                }`}
                onClick={() => setPaymentOption("full")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>Pagamento Completo</CardTitle>
                        <CardDescription>
                          Pague tudo agora e ganhe desconto no PIX
                        </CardDescription>
                      </div>
                    </div>
                    <RadioGroup value={paymentOption} onValueChange={(v: any) => setPaymentOption(v)}>
                      <RadioGroupItem value="full" />
                    </RadioGroup>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {totalAmount.toFixed(2)}
                      </p>
                      {paymentMethod === "pix" && (
                        <p className="text-sm text-green-600 mt-1">
                          ou R$ {(totalAmount * (1 - pixDiscount)).toFixed(2)} no PIX (5% OFF)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Pagamento único</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Desconto de 5% no PIX</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Produção inicia imediatamente</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Método de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Método de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <div className="space-y-3">
                      <Label
                        htmlFor="pix"
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                          paymentMethod === "pix" 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="pix" id="pix" />
                          <div>
                            <p className="font-medium">PIX</p>
                            <p className="text-sm text-muted-foreground">
                              Aprovação instantânea
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">5% OFF</Badge>
                      </Label>

                      <Label
                        htmlFor="credit_card"
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                          paymentMethod === "credit_card" 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="credit_card" id="credit_card" />
                          <div>
                            <p className="font-medium">Cartão de Crédito</p>
                            <p className="text-sm text-muted-foreground">
                              Parcele em até 10x com juros
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Resumo */}
            <div className="lg:sticky lg:top-4 h-fit">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Itens */}
                  <div className="space-y-3">
                    {quote?.quote_items?.map((item: any) => (
                      <div key={item.id} className="flex gap-3">
                        {item.models?.image_path && (
                          <img
                            src={`${supabase.storage.from(item.models.image_bucket).getPublicUrl(item.models.image_path).data.publicUrl}`}
                            alt={item.models.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">
                            {item.models?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Escala {item.scale} • Qtd: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {totalAmount.toFixed(2)}</span>
                    </div>

                    {paymentOption === "preorder" && (
                      <>
                        <div className="flex justify-between text-sm font-medium text-primary">
                          <span>Sinal (agora)</span>
                          <span>R$ {depositAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Restante (depois)</span>
                          <span>R$ {remainingAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {paymentMethod === "pix" && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto PIX (5%)</span>
                        <span>- R$ {(finalAmount * pixDiscount / (1 - pixDiscount)).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total a Pagar Agora</span>
                      <span className="text-primary">R$ {finalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => processPaymentMutation.mutate()}
                    disabled={processPaymentMutation.isPending}
                  >
                    {processPaymentMutation.isPending ? (
                      "Processando..."
                    ) : (
                      <>
                        Continuar para Pagamento
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Pagamento seguro e protegido
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
