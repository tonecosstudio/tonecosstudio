// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Check, Package, Crown, Sparkles, Gift, AlertCircle, 
  ArrowRight, Star, Shield, Truck, Calendar, ChevronRight,
  Info, TrendingDown, Lock, RefreshCw, XCircle
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getActiveCollections, getRotationSchedule } from "@/services/collection-service";
import { checkSubscriptionCapacity } from "@/services/capacity-service";
import { nowInBahia } from "@/lib/timezone";

export default function SubscribeCollectionNew() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // Check capacity for selected plan
  const { data: capacityCheck, isLoading: capacityLoading } = useQuery({
    queryKey: ["subscription-capacity", selectedPlanId],
    enabled: Boolean(selectedPlanId),
    queryFn: async () => {
      const selectedPlan = plans?.find(p => p.id === selectedPlanId);
      if (!selectedPlan) return null;
      
      const deliveryCount = selectedPlan.plan_type === "trimestral" ? 3 : 
                           selectedPlan.plan_type === "semestral" ? 6 : 12;
      
      return await checkSubscriptionCapacity(deliveryCount);
    },
  });

  // Buscar planos disponíveis
  const { data: plans, isLoading: plansLoading } = useQuery({
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

  // Buscar coleções ativas para o mês atual (usando serviço de rotação)
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["active-collections"],
    queryFn: async () => {
      // Get current month and year in Bahia timezone
      const currentBahiaTime = nowInBahia();
      const currentMonth = currentBahiaTime.getMonth() + 1; // getMonth() returns 0-11
      const currentYear = currentBahiaTime.getFullYear();
      
      // Get active collections for current month using rotation service
      const activeCollections = await getActiveCollections(currentMonth, currentYear);
      
      // Fetch full collection details with characters
      const collectionIds = activeCollections.map(c => c.id);
      if (collectionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("collections")
        .select(`*, collection_characters (id, name, status)`)
        .in("id", collectionIds)
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      if (error) throw error;
      
      // Attach rotation info to each collection
      const collectionsWithRotation = await Promise.all(
        (data || []).map(async (col: any) => {
          const rotationSchedule = await getRotationSchedule(col.id);
          const rotationType = activeCollections.find(ac => ac.id === col.id)?.rotation_type || 'fixed';
          return {
            ...col,
            rotation_type: rotationType,
            rotation_schedule: rotationSchedule
          };
        })
      );
      
      return collectionsWithRotation;
    },
  });

  // Buscar coleção específica se veio de uma
  const { data: initialCollection } = useQuery({
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

  // Auto-selecionar primeira coleção
  useEffect(() => {
    if (initialCollection && selectedCollections.length === 0) {
      setSelectedCollections([initialCollection.id]);
    }
  }, [initialCollection]);

  // Auto-selecionar primeiro plano
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const popularPlan = plans.find(p => p.plan_type === "trimestral") || plans[0];
      setSelectedPlanId(popularPlan.id);
    }
  }, [plans]);

  // Criar assinatura
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Faça login para continuar");
      }

      const selectedPlan = plans?.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Selecione um plano");

      const requiredCollections = selectedPlan.collections_count === -1 
        ? collections?.length || 0 
        : selectedPlan.collections_count;

      if (selectedCollections.length !== requiredCollections) {
        throw new Error(`Selecione ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"}`);
      }

      // Criar assinatura
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          plan_type: selectedPlan.plan_type,
          status: "pending_payment",
        })
        .select()
        .single();

      if (subError) throw subError;

      // Associar coleções
      for (const collectionId of selectedCollections) {
        await supabase.from("subscription_collections").insert({
          subscription_id: subscription.id,
          collection_id: collectionId,
        });
      }

      // Criar pagamento
      const amount = paymentMethod === "pix" ? selectedPlan.price_pix : selectedPlan.price_full;
      const { data: payment, error: payError } = await supabase
        .from("manual_payments")
        .insert({
          user_id: user.id,
          amount: Number(amount),
          payment_type: "subscription",
          status: "pending",
          reference_number: `SUB-${Date.now()}`,
          subscription_id: subscription.id,
        })
        .select()
        .single();

      if (payError) throw payError;

      return { subscription, payment };
    },
    onSuccess: (data) => {
      toast({
        title: "Assinatura criada!",
        description: "Redirecionando para pagamento...",
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

  if (plansLoading || collectionsLoading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">Carregando planos...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const requiredCollections = selectedPlan 
    ? (selectedPlan.collections_count === -1 ? collections?.length || 0 : selectedPlan.collections_count)
    : 0;
  const isAnualPlan = selectedPlan?.plan_type === "anual";
  const canSelectMore = selectedCollections.length < requiredCollections;
  
  // Check if sold out
  const isSoldOut = capacityCheck && !capacityCheck.available;
  const canPurchase = !isSoldOut && selectedCollections.length === requiredCollections;

  // Auto-selecionar todas para plano anual
  useEffect(() => {
    if (isAnualPlan && collections && selectedCollections.length !== collections.length) {
      setSelectedCollections(collections.map(c => c.id));
    }
  }, [isAnualPlan, collections]);

  const toggleCollection = (collectionId: string) => {
    if (isAnualPlan) return; // Anual não permite desmarcar

    if (selectedCollections.includes(collectionId)) {
      setSelectedCollections(selectedCollections.filter(id => id !== collectionId));
    } else if (canSelectMore) {
      setSelectedCollections([...selectedCollections, collectionId]);
    }
  };

  const finalPrice = selectedPlan 
    ? (paymentMethod === "pix" ? Number(selectedPlan.price_pix) : Number(selectedPlan.price_full))
    : 0;
  const discount = selectedPlan 
    ? Number(selectedPlan.price_full) - Number(selectedPlan.price_pix)
    : 0;

  return (
    <AppShell>
      <SEOHead
        title="Assinar Coleção - Planos Premium"
        description="Escolha seu plano e receba personagens exclusivos todo mês"
        keywords={["assinatura", "coleção", "planos", "premium"]}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Hero Header */}
        <section className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          </div>
          
          <div className="container max-w-6xl px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                Planos Premium
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Assine e Economize
              </h1>
              <p className="text-lg text-amber-50 leading-relaxed">
                Receba personagens exclusivos todo mês com desconto progressivo.<br />
                Quanto mais meses, menor o valor por peça.
              </p>
            </div>
          </div>
        </section>

        <div className="container max-w-7xl px-6 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda - Seleção de Plano e Coleções */}
            <div className="lg:col-span-2 space-y-8">
              {/* Escolha do Plano */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Escolha seu Plano</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Selecione o período de assinatura</p>
                  </div>
                </div>

                <RadioGroup value={selectedPlanId || ""} onValueChange={setSelectedPlanId}>
                  <div className="grid md:grid-cols-3 gap-4">
                    {plans?.map((plan: any) => {
                      const isSelected = selectedPlanId === plan.id;
                      const isPopular = plan.plan_type === "trimestral";
                      const isBestValue = plan.plan_type === "anual";
                      const pricePerPiece = Math.floor(Number(plan.price_full) / plan.deliveries_total);
                      const savings = 500 * plan.deliveries_total - Number(plan.price_full);
                      const savingsPercent = Math.round((savings / (500 * plan.deliveries_total)) * 100);

                      return (
                        <label
                          key={plan.id}
                          className={`relative cursor-pointer transition-all ${
                            isSelected ? 'scale-105' : 'hover:scale-102'
                          }`}
                        >
                          <input
                            type="radio"
                            value={plan.id}
                            checked={isSelected}
                            onChange={() => setSelectedPlanId(plan.id)}
                            className="sr-only"
                          />
                          
                          <Card className={`relative overflow-visible ${
                            isSelected 
                              ? 'ring-4 ring-amber-500 shadow-2xl' 
                              : 'shadow-lg hover:shadow-xl'
                          }`}>
                            {(isPopular || isBestValue) && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 whitespace-nowrap">
                                {isPopular ? '⭐ POPULAR' : '👑 MELHOR'}
                              </div>
                            )}
                            
                            <CardContent className="p-5 pt-6">
                              <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
                                  {plan.plan_type === "trimestral" ? "⭐" : plan.plan_type === "semestral" ? "💎" : "👑"}
                                </div>
                                <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-1 capitalize">
                                  {plan.name}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                  {plan.deliveries_total} entregas
                                </p>
                                
                                {/* Bonus Piece Highlight for Semestral Plan */}
                                {plan.plan_type === "semestral" && (
                                  <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                      <span className="text-2xl">🎁</span>
                                      <span className="text-xs font-bold text-purple-900 dark:text-purple-100">
                                        PEÇA BÔNUS EXCLUSIVA
                                      </span>
                                    </div>
                                    <p className="text-xs text-purple-700 dark:text-purple-300">
                                      Ganhe uma peça especial na 6ª entrega!
                                    </p>
                                  </div>
                                )}
                                
                                <div className="text-3xl font-bold text-slate-950 dark:text-white mb-1">
                                  R$ {pricePerPiece}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">por peça</div>
                                
                                {savings > 0 && (
                                  <div className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                    Economize {savingsPercent}%
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Sold Out Alert */}
              {isSoldOut && capacityCheck && (
                <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-900 dark:text-red-100">
                    <div className="font-bold text-lg mb-2">Esgotado</div>
                    <p className="mb-2">
                      Infelizmente, a capacidade de produção está esgotada para este plano.
                      {capacityCheck.firstUnavailableCycle && (
                        <> O Ciclo {capacityCheck.firstUnavailableCycle.cycleNumber} de{' '}
                        {capacityCheck.firstUnavailableCycle.month}/{capacityCheck.firstUnavailableCycle.year}{' '}
                        (entrega {capacityCheck.firstUnavailableCycle.deliveryNumber}) não tem capacidade disponível.</>
                      )}
                    </p>
                    {capacityCheck.estimatedAvailableDate && (
                      <p className="text-sm">
                        <strong>Disponível novamente em:</strong>{' '}
                        {new Date(capacityCheck.estimatedAvailableDate).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Escolha de Coleções */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Escolha suas Coleções</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {isAnualPlan 
                        ? "Acesso a todas as coleções" 
                        : `Selecione ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"} (${selectedCollections.length}/${requiredCollections})`
                      }
                    </p>
                  </div>
                </div>

                {isAnualPlan && (
                  <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 dark:text-amber-100">
                      Com o plano Anual, você tem acesso a TODAS as coleções e pode trocar entre elas ilimitadamente!
                    </AlertDescription>
                  </Alert>
                )}

                {!isAnualPlan && (
                  <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 dark:text-blue-100">
                      Exibindo apenas coleções disponíveis para o mês atual. Coleções rotativas alternam entre meses pares e ímpares.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {collections?.map((col: any) => {
                    const isSelected = selectedCollections.includes(col.id);
                    const canSelect = isAnualPlan || canSelectMore || isSelected;
                    const characterCount = col.collection_characters?.length || 0;
                    const rotationType = col.rotation_type || 'fixed';
                    const isRotating = rotationType !== 'fixed';
                    
                    // Format rotation schedule for display
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const rotationDisplay = isRotating && col.rotation_schedule
                      ? col.rotation_schedule.map((m: number) => monthNames[m - 1]).join(', ')
                      : null;

                    if (characterCount === 0) return null;

                    return (
                      <Card
                        key={col.id}
                        onClick={() => canSelect && toggleCollection(col.id)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20'
                            : canSelect
                            ? 'hover:shadow-lg'
                            : 'opacity-50 cursor-not-allowed'
                        } ${isAnualPlan ? 'cursor-default' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-950 dark:text-white">{col.name}</h4>
                                {isRotating && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Rotativa
                                  </Badge>
                                )}
                              </div>
                              {col.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                                  {col.description}
                                </p>
                              )}
                              <div className="flex flex-col gap-1">
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  {characterCount} {characterCount === 1 ? "personagem" : "personagens"}
                                </p>
                                {isRotating && rotationDisplay && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Disponível: {rotationDisplay}
                                  </p>
                                )}
                                {!isRotating && (
                                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    Disponível todo mês
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Forma de Pagamento</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Escolha como prefere pagar</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card
                    onClick={() => setPaymentMethod("pix")}
                    className={`cursor-pointer transition-all ${
                      paymentMethod === "pix"
                        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "pix" ? 'border-green-500 bg-green-500' : 'border-slate-300'
                        }`}>
                          {paymentMethod === "pix" && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-950 dark:text-white">PIX</h4>
                            <Badge className="bg-green-500 text-white text-xs">5% OFF</Badge>
                          </div>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                            R$ {selectedPlan ? Number(selectedPlan.price_pix).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 0}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Pagamento à vista</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    onClick={() => setPaymentMethod("credit_card")}
                    className={`cursor-pointer transition-all ${
                      paymentMethod === "credit_card"
                        ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "credit_card" ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                        }`}>
                          {paymentMethod === "credit_card" && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-950 dark:text-white mb-2">Cartão de Crédito</h4>
                          <p className="text-2xl font-bold text-slate-950 dark:text-white mb-1">
                            R$ {selectedPlan ? Number(selectedPlan.price_full).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : 0}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Até 6x sem juros</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Resumo e Checkout */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Resumo do Pedido */}
                <Card className="shadow-2xl border-2">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-6">Resumo do Pedido</h3>
                    
                    {isSoldOut && (
                      <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-500 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-1">
                          <XCircle className="w-5 h-5" />
                          Capacidade Esgotada
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          Este plano não está disponível no momento
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Plano:</span>
                        <span className="font-semibold text-slate-950 dark:text-white capitalize">
                          {selectedPlan?.name || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Entregas:</span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {selectedPlan?.deliveries_total || 0}x
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Coleções:</span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {isAnualPlan ? "Todas" : `${selectedCollections.length} selecionadas`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Pagamento:</span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {paymentMethod === "pix" ? "PIX" : "Cartão"}
                        </span>
                      </div>
                    </div>

                    {paymentMethod === "pix" && discount > 0 && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-semibold mb-1">
                          <TrendingDown className="w-4 h-4" />
                          Desconto PIX
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          - R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-6 mb-6">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-lg font-semibold text-slate-950 dark:text-white">Total:</span>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                            R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </div>
                          {paymentMethod === "credit_card" && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              ou 6x de R$ {(finalPrice / 6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 text-base shadow-xl"
                      onClick={() => subscribeMutation.mutate()}
                      disabled={
                        subscribeMutation.isPending ||
                        !selectedPlanId ||
                        !canPurchase ||
                        capacityLoading
                      }
                    >
                      {subscribeMutation.isPending ? (
                        "Processando..."
                      ) : capacityLoading ? (
                        "Verificando disponibilidade..."
                      ) : isSoldOut ? (
                        <>
                          <XCircle className="mr-2 h-5 w-5" />
                          Esgotado
                        </>
                      ) : selectedCollections.length !== requiredCollections ? (
                        `Selecione ${requiredCollections} ${requiredCollections === 1 ? "coleção" : "coleções"}`
                      ) : (
                        <>
                          Assinar Agora
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
                      Ao assinar, você concorda com nossos termos de serviço
                    </p>
                  </CardContent>
                </Card>

                {/* Benefícios */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                  <CardContent className="p-6">
                    <h4 className="font-bold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-500" />
                      Benefícios Inclusos
                    </h4>
                    <div className="space-y-3">
                      {[
                        { icon: Check, text: "Trocas ilimitadas" },
                        { icon: Star, text: "Prioridade na produção" },
                        { icon: Truck, text: "Envio rastreado" },
                        { icon: Shield, text: "Garantia de 7 dias" },
                        { icon: Calendar, text: "Cancele quando quiser" }
                      ].map((benefit, idx) => {
                        const Icon = benefit.icon;
                        return (
                          <div key={idx} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{benefit.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
