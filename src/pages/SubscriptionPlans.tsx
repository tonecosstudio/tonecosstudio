/**
 * Página de Planos de Assinatura com Créditos
 *
 * Exibe planos disponíveis para assinatura baseados em créditos
 * Integra com sistema de coins para compra de personagens
 *
 * Spec: subscription-credit-system
 * Task: 1.1 (Subscription Plans Page)
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  useSubscriptionCreditPlans,
  useUserSubscriptionCreditSummary,
  calculatePricePerCredit,
  formatCredits,
  type SubscriptionCreditPlan,
} from "@/hooks/subscription";
import { useUserCoins } from "@/hooks/useUserCoins";
import { Loader2, Check, Star, Zap, Shield, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PlanFeature {
  icon: React.ReactNode;
  text: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Queries
  const { data: plans, isLoading: isLoadingPlans } = useSubscriptionCreditPlans();
  const { data: userSummary } = useUserSubscriptionCreditSummary(user?.id);
  const { data: userCoins } = useUserCoins(user?.id);

  // Derived state
  const hasActiveSubscription = userSummary?.has_active_subscription || false;
  const activePlanType = userSummary?.plan_type;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectPlan = (planType: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para assinar um plano.",
      });
      navigate("/login");
      return;
    }

    if (hasActiveSubscription) {
      toast({
        title: "Assinatura ativa",
        description: "Você já tem uma assinatura ativa. Gerencie sua assinatura atual primeiro.",
        variant: "destructive",
      });
      navigate("/profile?tab=subscriptions");
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Aceite os termos",
        description: "Você precisa aceitar os Termos de Uso para continuar",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implementar fluxo de checkout
    toast({
      title: "Plano selecionado",
      description: `Plano ${planType} selecionado. Redirecionando para checkout...`,
    });

    // Simular redirecionamento para checkout
    setTimeout(() => {
      navigate(`/checkout?plan=${planType}`);
    }, 1500);
  };

  const handleManageSubscription = () => {
    navigate("/profile?tab=subscriptions");
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderPlanCard = (plan: SubscriptionCreditPlan) => {
    const isPopular = plan.plan_type === "semestral";
    const isBestValue = plan.plan_type === "anual";
    const isCurrentPlan = activePlanType === plan.plan_type;

    const pricePerCredit = calculatePricePerCredit(plan);
    const monthlyPrice =
      plan.price_full /
      (plan.plan_type === "trimestral" ? 3 : plan.plan_type === "semestral" ? 6 : 12);

    const features: PlanFeature[] = [
      { icon: <Zap className="h-4 w-4" />, text: `${formatCredits(plan.total_credits)} totais` },
      { icon: <Gift className="h-4 w-4" />, text: `${formatCredits(plan.bonus_credits)} de bônus` },
      {
        icon: <Shield className="h-4 w-4" />,
        text: `Créditos válidos por ${plan.credit_expiry_days || "∞"} dias`,
      },
      { icon: <Check className="h-4 w-4" />, text: "Acesso a todos os personagens" },
    ];

    if (plan.plan_type === "semestral") {
      features.push({ icon: <Star className="h-4 w-4" />, text: "Personagens exclusivos" });
      features.push({ icon: <Star className="h-4 w-4" />, text: "Prioridade na produção" });
    }

    return (
      <Card
        key={plan.id}
        className={`relative overflow-hidden transition-all hover:shadow-lg ${
          isPopular ? "border-primary shadow-md" : ""
        } ${isCurrentPlan ? "border-green-500 bg-green-50" : ""}`}
      >
        {/* Badges */}
        {isPopular && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          </div>
        )}

        {isBestValue && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-500 text-white">
              <Zap className="h-3 w-3 mr-1" />
              Melhor Valor
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-green-500 text-white">
              <Check className="h-3 w-3 mr-1" />
              Atual
            </Badge>
          </div>
        )}

        <CardHeader>
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>

          {/* Preço */}
          <div className="mt-4">
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">R$ {plan.price_full.toFixed(2)}</span>
              <span className="ml-2 text-muted-foreground">
                /{" "}
                {plan.plan_type === "trimestral"
                  ? "trimestre"
                  : plan.plan_type === "semestral"
                    ? "semestre"
                    : "ano"}
              </span>
            </div>

            <div className="mt-2 text-sm text-muted-foreground">
              <div>≈ R$ {monthlyPrice.toFixed(2)} por mês</div>
              <div>≈ R$ {pricePerCredit.toFixed(4)} por crédito</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Créditos */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Créditos incluídos:</span>
              <span className="text-lg font-bold text-primary">
                {formatCredits(plan.total_credits + plan.bonus_credits)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Base:</div>
              <div className="text-right">{formatCredits(plan.total_credits)}</div>

              <div className="text-muted-foreground">Bônus:</div>
              <div className="text-right text-green-600">+{formatCredits(plan.bonus_credits)}</div>

              <div className="text-muted-foreground">Mensal:</div>
              <div className="text-right">{formatCredits(plan.monthly_credits)}/mês</div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Features */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start">
                <div className="mr-3 mt-0.5 text-primary">{feature.icon}</div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter>
          {isCurrentPlan ? (
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleManageSubscription}
            >
              <Check className="h-4 w-4 mr-2" />
              Gerenciar Assinatura
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleSelectPlan(plan.plan_type)}
              disabled={hasActiveSubscription || !acceptedTerms}
            >
              {hasActiveSubscription ? "Assinatura Ativa" : "Assinar Agora"}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderUserSummary = () => {
    if (!user || !userSummary?.has_active_subscription) return null;

    return (
      <Card className="mb-8 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Check className="h-5 w-5 mr-2 text-green-600" />
            Sua Assinatura Ativa
          </CardTitle>
          <CardDescription>Gerencie seus créditos e assinatura</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plano */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Plano</div>
              <div className="text-lg font-bold">{userSummary.plan_name}</div>
              <div className="text-sm">{userSummary.plan_description}</div>
            </div>

            {/* Créditos */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Créditos</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary">
                  {formatCredits(userSummary.credits_available)}
                </span>
                <span className="ml-2 text-muted-foreground">
                  / {formatCredits(userSummary.credits_total)}
                </span>
              </div>
              <div className="text-sm">{userSummary.percentage_used.toFixed(1)}% utilizados</div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="text-lg font-bold capitalize">{userSummary.status}</div>
              {userSummary.days_until_expiry !== undefined && userSummary.days_until_expiry > 0 && (
                <div className="text-sm">Expira em {userSummary.days_until_expiry} dias</div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Utilização de créditos</span>
              <span>{userSummary.percentage_used.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(userSummary.percentage_used, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleManageSubscription}>
            Gerenciar Assinatura
          </Button>

          <Button onClick={() => navigate("/catalog")}>Usar Créditos no Catálogo</Button>
        </CardFooter>
      </Card>
    );
  };

  const renderCoinsBalance = () => {
    if (!user || !userCoins) return null;

    return (
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Seu Saldo de Coins
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-blue-600">
              {userCoins.balance.toLocaleString("pt-BR")}
            </span>
            <span className="ml-2 text-lg text-blue-500">coins</span>
          </div>

          <div className="mt-2 text-sm text-muted-foreground">
            <div>Total ganho: {userCoins.total_earned.toLocaleString("pt-BR")} coins</div>
            <div>Total gasto: {userCoins.total_spent.toLocaleString("pt-BR")} coins</div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button variant="outline" className="w-full" onClick={() => navigate("/coins/purchase")}>
            Comprar Mais Coins
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingPlans) {
    return (
      <AppShell>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SEOHead
        title="Planos de Assinatura com Créditos"
        description="Assine e receba créditos para comprar personagens no catálogo. Planos trimestral, semestral e anual com bônus exclusivos."
        keywords={["assinatura", "créditos", "coins", "planos", "trimestral", "semestral", "anual"]}
        type="website"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-4">Planos de Assinatura</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Assine e receba créditos mensais para comprar personagens no catálogo. Mais
            flexibilidade, mais economia, mais diversão!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* User Summary */}
        {renderUserSummary()}

        {/* Coins Balance */}
        {renderCoinsBalance()}

        {/* Tabs: Planos vs Comparação */}
        <Tabs defaultValue="plans" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Planos Disponíveis</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-6">
            {/* Legal Warning */}
            <Alert
              variant="default"
              className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold mb-2">⚠️ Regras Importantes sobre Coins</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Coins não possuem valor monetário e não podem ser convertidos em dinheiro
                    </li>
                    <li>Coins servem apenas para seleção de personagens na plataforma</li>
                    <li>Coins não utilizados não são reembolsáveis isoladamente</li>
                    <li>Em cancelamento com reembolso, coins expiram imediatamente</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Terms Acceptance */}
            {!hasActiveSubscription && (
              <div className="mb-6 flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="accept-terms-plans"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label
                  htmlFor="accept-terms-plans"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  Li e concordo com os{" "}
                  <Link to="/terms" className="underline text-primary font-medium" target="_blank">
                    Termos de Uso
                  </Link>
                  , incluindo as regras sobre coins (sem valor monetário, não reembolsáveis, não
                  conversíveis em dinheiro, vinculados à assinatura)
                </label>
              </div>
            )}

            {/* Planos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans?.map(renderPlanCard)}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            {/* Tabela de Comparação */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Planos</CardTitle>
                <CardDescription>Compare os benefícios de cada plano</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Benefício</th>
                        {plans?.map((plan) => (
                          <th key={plan.id} className="text-center py-3 px-4">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Créditos Totais */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Créditos Totais</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {formatCredits(plan.total_credits + plan.bonus_credits)}
                          </td>
                        ))}
                      </tr>

                      {/* Créditos Mensais */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Créditos Mensais</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {formatCredits(plan.monthly_credits)}
                          </td>
                        ))}
                      </tr>

                      {/* Bônus */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Créditos Bônus</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {formatCredits(plan.bonus_credits)}
                          </td>
                        ))}
                      </tr>

                      {/* Preço Total */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Preço Total</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            R$ {plan.price_full.toFixed(2)}
                          </td>
                        ))}
                      </tr>

                      {/* Preço por Crédito */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Preço por Crédito</td>
                        {plans?.map((plan) => {
                          const pricePerCredit = calculatePricePerCredit(plan);
                          return (
                            <td key={plan.id} className="text-center py-3 px-4">
                              R$ {pricePerCredit.toFixed(4)}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Validade */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Validade dos Créditos</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {plan.credit_expiry_days
                              ? `${plan.credit_expiry_days} dias`
                              : "Ilimitada"}
                          </td>
                        ))}
                      </tr>

                      {/* Personagens Exclusivos */}
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Personagens Exclusivos</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {plan.plan_type === "semestral" || plan.plan_type === "anual"
                              ? "✅"
                              : "❌"}
                          </td>
                        ))}
                      </tr>

                      {/* Prioridade na Produção */}
                      <tr>
                        <td className="py-3 px-4 font-medium">Prioridade na Produção</td>
                        {plans?.map((plan) => (
                          <td key={plan.id} className="text-center py-3 px-4">
                            {plan.plan_type === "semestral" || plan.plan_type === "anual"
                              ? "✅"
                              : "❌"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* FAQ Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
            <CardDescription>Tire suas dúvidas sobre o sistema de créditos</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">O que são créditos de assinatura?</h3>
              <p className="text-muted-foreground">
                Créditos são moedas virtuais que você recebe mensalmente com sua assinatura. Use-os
                para comprar personagens no catálogo a preços especiais para assinantes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Os créditos expiram?</h3>
              <p className="text-muted-foreground">
                Sim, créditos não utilizados expiram após {plans?.[0]?.credit_expiry_days || 30}{" "}
                dias do recebimento. Use-os antes que expirem!
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Posso comprar créditos avulsos?</h3>
              <p className="text-muted-foreground">
                Não, créditos só estão disponíveis através de assinaturas. Para compras avulsas, use
                o sistema de coins regular.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                O que acontece se eu cancelar minha assinatura?
              </h3>
              <p className="text-muted-foreground">
                Seu acesso aos créditos continua até o fim do período pago. Créditos não utilizados
                expiram na data de cancelamento.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Posso usar créditos e coins na mesma compra?</h3>
              <p className="text-muted-foreground">
                Sim! O sistema prioriza o uso de créditos primeiro. Se não tiver créditos
                suficientes, pode complementar com coins.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Escolha seu plano, receba créditos mensais e comece a colecionar seus personagens
            favoritos!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/catalog")} variant="outline">
              Ver Catálogo
            </Button>

            <Button
              size="lg"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                } else if (plans?.[1]) {
                  handleSelectPlan(plans[1].plan_type);
                }
              }}
            >
              Assinar Agora
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
