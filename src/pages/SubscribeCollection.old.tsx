import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Package, Calendar, CreditCard, Sparkles, Gift, AlertCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

export default function SubscribeCollection() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [planType, setPlanType] = useState<"trimestral" | "semestral" | "anual">("trimestral");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // Mapear planType para subscriptionPeriod
  const periodMap = {
    trimestral: "quarterly" as const,
    semestral: "semiannual" as const,
    anual: "annual" as const,
  };

  // Buscar planos disponíveis
  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar todas as coleções ativas
  const collectionsQuery = useQuery({
    queryKey: ["active-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(
          `
          *,
          collection_characters (
            id,
            name,
            release_order,
            description,
            status
          )
        `
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar coleção inicial (se veio de uma coleção específica)
  const collectionQuery = useQuery({
    queryKey: ["collection", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Verificar se já tem assinatura ativa
  const existingSubscriptionQuery = useQuery({
    queryKey: ["existing-subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status, plan_type")
        .eq("user_id", user!.id)
        .in("status", ["active", "paused"])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Inicializar coleções selecionadas quando carregar
  const collection = collectionQuery.data;
  const allCollections = collectionsQuery.data || [];

  // Auto-selecionar primeira coleção se veio de uma específica
  if (collection && selectedCollections.length === 0 && allCollections.length > 0) {
    setSelectedCollections([collection.id]);
  }

  // Criar assinatura
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Faça login para continuar");
      }

      // Validar número de coleções
      const requiredCollections = getRequiredCollections(planType);
      if (selectedCollections.length !== requiredCollections) {
        throw new Error(
          `Selecione exatamente ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"}`
        );
      }

      // Buscar plano selecionado
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("plan_type", planType)
        .eq("is_active", true)
        .maybeSingle();

      if (planError) throw planError;

      if (!plan) {
        throw new Error("Plano não encontrado ou inativo");
      }

      // Criar assinatura pendente de pagamento
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          plan_type: planType,
          status: "pending_payment",
        })
        .select()
        .single();

      if (subError) throw subError;

      // Associar coleções selecionadas
      for (const collectionId of selectedCollections) {
        const { error: collError } = await supabase.from("subscription_collections").insert({
          subscription_id: subscription.id,
          collection_id: collectionId,
        });

        if (collError) throw collError;
      }

      // Criar solicitação de pagamento manual
      const { data: payment, error: payError } = await supabase
        .from("manual_payments")
        .insert({
          user_id: user.id,
          amount: plan.price_full,
          payment_type: "subscription",
          status: "pending",
          reference_number: `SUB-${Date.now()}`,
          subscription_id: subscription.id,
        })
        .select()
        .single();

      if (payError) throw payError;

      // Criar conversa de suporte
      await supabase.from("support_conversations").insert({
        user_id: user.id,
        subject: `Nova Assinatura - ${planType}`,
        status: "waiting_admin",
        tags: ["assinatura", "pagamento"],
      });

      return { subscription, payment };
    },
    onSuccess: (data) => {
      toast({
        title: "Assinatura criada!",
        description: "Aguarde o link de pagamento. Você receberá uma notificação em breve.",
      });
      navigate(`/pagamentos/${data.payment.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasExistingSubscription = Boolean(existingSubscriptionQuery.data);

  // Buscar plano selecionado
  const plans = plansQuery.data || [];
  const selectedPlan = plans.find((p) => p.plan_type === planType);

  // Determinar quantas coleções são necessárias
  const getRequiredCollections = (plan: string) => {
    const planData = plans.find((p) => p.plan_type === plan);
    if (!planData) return 1;

    // -1 significa todas as coleções
    if (planData.collections_count === -1) {
      return allCollections.length;
    }
    return planData.collections_count;
  };

  const requiredCollections = getRequiredCollections(planType);
  const canSelectMore = selectedCollections.length < requiredCollections;
  const isAnualPlan = planType === "anual";

  // Toggle seleção de coleção
  const toggleCollection = (collectionId: string) => {
    if (isAnualPlan) {
      // Anual: seleciona todas automaticamente
      if (selectedCollections.length === allCollections.length) {
        setSelectedCollections([]);
      } else {
        setSelectedCollections(allCollections.map((c) => c.id));
      }
      return;
    }

    if (selectedCollections.includes(collectionId)) {
      setSelectedCollections(selectedCollections.filter((id) => id !== collectionId));
    } else if (canSelectMore) {
      setSelectedCollections([...selectedCollections, collectionId]);
    }
  };

  // Auto-selecionar todas para plano anual
  if (
    isAnualPlan &&
    selectedCollections.length !== allCollections.length &&
    allCollections.length > 0
  ) {
    setSelectedCollections(allCollections.map((c) => c.id));
  }

  // Preços dinâmicos da tabela subscription_plans
  const selectedPrice = selectedPlan
    ? {
        full: Number(selectedPlan.price_full),
        pix: Number(selectedPlan.price_pix),
      }
    : { full: 0, pix: 0 };
  const finalPrice = paymentMethod === "pix" ? selectedPrice.pix : selectedPrice.full;
  const discount = selectedPrice.full - finalPrice;

  if (collectionsQuery.isLoading || plansQuery.isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (allCollections.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold mb-2">Nenhuma coleção disponível</h3>
            <p className="text-muted-foreground mb-6">Não há coleções ativas no momento</p>
            <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold mb-2">Nenhum plano disponível</h3>
            <p className="text-muted-foreground mb-6">
              Não há planos de assinatura ativos no momento
            </p>
            <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Assinar Coleção"
        description="Escolha seu plano e coleções favoritas"
        keywords={["assinatura", "coleção", "planos"]}
      />

      <div className="container py-8 sm:py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Assinar Coleções</h1>
          <p className="text-xs text-muted-foreground">
            Escolha seu plano e as coleções que deseja receber
          </p>
        </div>

        {/* Alerta se já tem assinatura */}
        {hasExistingSubscription && (
          <Alert className="mb-6">
            <AlertDescription>
              Você já tem uma assinatura ativa.{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/assinaturas")}
              >
                Ver minhas assinaturas
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de desenvolvimento */}
        <Alert className="mb-6 border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Sistema em Desenvolvimento:</strong> A funcionalidade de assinatura está sendo
            implementada. Por enquanto, você pode explorar os planos e coleções disponíveis.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Seleção de Coleções */}
          <Card>
            <CardHeader>
              <CardTitle>Escolha suas Coleções</CardTitle>
              <CardDescription>
                {isAnualPlan
                  ? "Plano Anual: Acesso a todas as coleções"
                  : `Selecione ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"} (${selectedCollections.length}/${requiredCollections})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnualPlan ? (
                <Alert className="mb-4">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    Com o plano Anual, você tem acesso a TODAS as coleções e pode trocar entre elas
                    ilimitadamente!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mb-4">
                  <AlertDescription>
                    Você poderá trocar ILIMITADAMENTE entre as coleções escolhidas até o início da
                    produção.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {allCollections.map((col: any) => {
                  const isSelected = selectedCollections.includes(col.id);
                  const canSelect = isAnualPlan || canSelectMore || isSelected;
                  const characterCount = col.collection_characters?.length || 0;

                  // Não mostrar coleções sem personagens
                  if (characterCount === 0) return null;

                  return (
                    <div
                      key={col.id}
                      onClick={() => canSelect && toggleCollection(col.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : canSelect
                            ? "hover:bg-muted/50"
                            : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold mb-1">{col.name}</h4>
                          {col.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {col.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {characterCount} {characterCount === 1 ? "personagem" : "personagens"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Assinatura */}
          <div className="space-y-6">
            {/* Escolher Plano */}
            <Card>
              <CardHeader>
                <CardTitle>Escolha seu Plano</CardTitle>
                <CardDescription>Receba personagens exclusivos todo mês</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={planType} onValueChange={(v: any) => setPlanType(v)}>
                  <div className="space-y-3">
                    {plans.map((plan: any) => {
                      const isSelected = planType === plan.plan_type;
                      const priceFormatted = Number(plan.price_full).toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      });
                      const pixPriceFormatted = Number(plan.price_pix).toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      });

                      return (
                        <label
                          key={plan.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={plan.plan_type}
                            id={plan.plan_type}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{plan.name}</span>
                              {plan.plan_type === "semestral" && (
                                <Badge variant="secondary">Inclui peça exclusiva</Badge>
                              )}
                              {plan.plan_type === "anual" && (
                                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Melhor Valor
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {plan.deliveries_total} entregas •{" "}
                              {plan.collections_count_description ||
                                `Escolha ${plan.collections_count} ${plan.collections_count === 1 ? "coleção" : "coleções"}`}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">R$ {priceFormatted}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pagamento à vista: R$ {pixPriceFormatted}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Forma de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">
                      Pagamento à vista - R${" "}
                      {selectedPrice.pix.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </SelectItem>
                    <SelectItem value="credit_card">
                      Cartão de Crédito - R${" "}
                      {selectedPrice.full.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}{" "}
                      (até 6x sem juros)
                    </SelectItem>
                    <SelectItem value="boleto">
                      Boleto - R${" "}
                      {selectedPrice.full.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Informações de Pagamento */}
            <PaymentInstructions
              paymentType="subscription"
              subscriptionPeriod={periodMap[planType]}
              amount={finalPrice}
            />

            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plano:</span>
                    <span className="font-medium capitalize">{planType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coleções:</span>
                    <span className="font-medium">
                      {isAnualPlan ? "Todas" : `${selectedCollections.length} selecionadas`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entregas:</span>
                    <span className="font-medium">{selectedPlan?.deliveries_total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forma de pagamento:</span>
                    <span className="font-medium">
                      {paymentMethod === "pix"
                        ? "À vista"
                        : paymentMethod === "credit_card"
                          ? "Cartão"
                          : "Boleto"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        R${" "}
                        {finalPrice.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {paymentMethod === "credit_card" && (
                        <div className="text-xs text-muted-foreground">
                          ou 6x de R${" "}
                          {(finalPrice / 6).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full h-12"
                    size="lg"
                    onClick={() => subscribeMutation.mutate()}
                    disabled={
                      subscribeMutation.isPending ||
                      hasExistingSubscription ||
                      selectedCollections.length !== requiredCollections
                    }
                  >
                    {subscribeMutation.isPending
                      ? "Processando..."
                      : selectedCollections.length !== requiredCollections
                        ? `Selecione ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"}`
                        : "Assinar Agora"}
                  </Button>
                </div>

                {/* Benefícios */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Trocas ilimitadas antes da produção</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Acompanhamento do processo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Entrega rastreada</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cancelamento simples</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
