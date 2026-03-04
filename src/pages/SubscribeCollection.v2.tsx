// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PlanSelector, SubscriptionPlan } from "@/components/subscription/PlanSelector";
import { CollectionSelector, Collection } from "@/components/subscription/CollectionSelector";
import { CycleInfo } from "@/components/subscription/CycleInfo";
import { useCurrentCycle } from "@/hooks/useCycles";

type Step = "plan" | "collection" | "confirmation";

export default function SubscribeCollectionV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

  // Buscar ciclo atual
  const { data: currentCycle, isLoading: cycleLoading } = useCurrentCycle();

  // Buscar planos disponíveis
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .in("plan_type", ["trimestral", "semestral"])
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Buscar coleções ativas
  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ["active-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Collection[];
    },
  });

  // Verificar assinatura existente
  const { data: existingSubscription } = useQuery({
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

  // Criar assinatura
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Faça login para continuar");
      }

      if (!selectedPlanId || !selectedCollectionId) {
        throw new Error("Selecione um plano e uma coleção");
      }

      if (!currentCycle) {
        throw new Error("Nenhum ciclo ativo no momento");
      }

      // Buscar plano selecionado
      const selectedPlan = plans.find((p) => p.id === selectedPlanId);
      if (!selectedPlan) {
        throw new Error("Plano não encontrado");
      }

      // Chamar Edge Function para criar assinatura
      const { data, error } = await supabase.functions.invoke("create-subscription-v2", {
        body: {
          user_id: user.id,
          plan_id: selectedPlanId,
          collection_id: selectedCollectionId,
          entry_cycle_id: currentCycle.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Assinatura criada com sucesso!",
        description: `Sua assinatura foi criada. ${data.deliveries_count} entregas agendadas.`,
      });
      navigate("/assinaturas");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setSelectedCollectionId(""); // Reset collection when plan changes
    setStep("collection");
  };

  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setStep("confirmation");
  };

  const handleConfirm = () => {
    subscribeMutation.mutate();
  };

  const isLoading = plansLoading || collectionsLoading || cycleLoading;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!currentCycle) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhum ciclo ativo</h3>
            <p className="text-muted-foreground mb-6">
              Não há ciclos abertos para novas assinaturas no momento
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
        title="Assinar Clube Premium"
        description="Escolha seu plano e coleção favorita"
        keywords={["assinatura", "clube premium", "planos"]}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Clube Premium - Assinatura
          </h1>
          <p className="text-muted-foreground">
            Escolha o plano e depois selecione o universo que deseja receber
          </p>
        </div>

        {/* Alerta se já tem assinatura */}
        {existingSubscription && (
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

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "plan"
                  ? "bg-primary text-primary-foreground"
                  : selectedPlanId
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {selectedPlanId && step !== "plan" ? <Check className="h-5 w-5" /> : "1"}
            </div>
            <span className="text-sm font-medium">Plano</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "collection"
                  ? "bg-primary text-primary-foreground"
                  : selectedCollectionId
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {selectedCollectionId && step === "confirmation" ? (
                <Check className="h-5 w-5" />
              ) : (
                "2"
              )}
            </div>
            <span className="text-sm font-medium">Coleção</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "confirmation"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <span className="text-sm font-medium">Confirmação</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Cycle Info */}
          <div className="lg:col-span-1">
            <CycleInfo cycle={currentCycle} showCountdown={true} />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Plan Selection */}
            {step === "plan" && (
              <PlanSelector
                selectedPlanId={selectedPlanId}
                onPlanSelect={handlePlanSelect}
                plans={plans}
                isLoading={plansLoading}
              />
            )}

            {/* Step 2: Collection Selection */}
            {step === "collection" && selectedPlan && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" onClick={() => setStep("plan")}>
                    ← Voltar
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Plano selecionado: <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                </div>
                <CollectionSelector
                  planId={selectedPlanId}
                  planType={selectedPlan.plan_type}
                  selectedCollectionId={selectedCollectionId}
                  onCollectionSelect={handleCollectionSelect}
                  collections={collections}
                  isLoading={collectionsLoading}
                />
              </>
            )}

            {/* Step 3: Confirmation */}
            {step === "confirmation" && selectedPlan && selectedCollection && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" onClick={() => setStep("collection")}>
                    ← Voltar
                  </Button>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Resumo da Assinatura</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Plano:</span>
                          <span className="font-medium">{selectedPlan.name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Coleção:</span>
                          <span className="font-medium">{selectedCollection.name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Entregas:</span>
                          <span className="font-medium">
                            {selectedPlan.deliveries_total} entregas consecutivas
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Ciclo de Entrada:</span>
                          <span className="font-medium">
                            Ciclo {currentCycle.cycle_number} - {currentCycle.month}/
                            {currentCycle.year}
                          </span>
                        </div>
                        {selectedPlan.includes_bonus && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Bônus:</span>
                            <span className="font-medium text-green-600">
                              1 peça exclusiva na última entrega
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-baseline mb-6">
                        <span className="text-lg font-semibold">Valor Total:</span>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">
                            {selectedPlan.price_full.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            À vista:{" "}
                            {selectedPlan.price_pix.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full h-12"
                        size="lg"
                        onClick={handleConfirm}
                        disabled={subscribeMutation.isPending || Boolean(existingSubscription)}
                      >
                        {subscribeMutation.isPending ? "Processando..." : "Confirmar Assinatura"}
                      </Button>
                    </div>

                    {/* Benefícios */}
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Trocas ilimitadas de personagem até o fechamento do ciclo</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Entregas automáticas em ciclos consecutivos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Acompanhamento completo do processo</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Entrega rastreada</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
