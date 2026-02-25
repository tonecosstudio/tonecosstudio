import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables } from "@/lib/services/contentService";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function Plans() {
  const { data: content } = useContentSettings();
  const { data: settings } = useSystemSettings();

  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data;
    },
  });

  const plans = plansQuery.data || [];

  // Determinar badges e estilos por tipo
  const getPlanStyle = (planType: string) => {
    switch (planType) {
      case "trimestral":
        return {
          badge: "Mais escolhido",
          badgeColor: "bg-primary text-primary-foreground",
          borderColor: "border-primary",
          icon: Sparkles,
          iconColor: "text-primary",
        };
      case "semestral":
        return {
          badge: "Melhor valor",
          badgeColor: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
          borderColor: "border-amber-500",
          icon: Zap,
          iconColor: "text-amber-500",
        };
      default:
        return {
          badge: null,
          badgeColor: "",
          borderColor: "border-border",
          icon: Sparkles,
          iconColor: "text-muted-foreground",
        };
    }
  };

  // Card de Avulso (para comparação)
  const avulsoCard = {
    name: "Avulso",
    description: "Compra única sem compromisso",
    price_full: settings?.default_price_full || 500,
    price_pix: settings?.default_price_pix || 475,
    deliveries_total: 1,
    max_installments: settings?.max_installments_no_interest || 6,
    plan_type: "avulso",
  };

  return (
    <AppShell>
      <SEOHead
        title="Planos de Assinatura - Ordax"
        description="Escolha o plano ideal para sua coleção. Assinaturas mensais com múltiplas coleções e trocas ilimitadas."
        keywords={["planos", "assinatura", "colecionáveis", "mensal"]}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-16">
        <div className="container px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Planos de Assinatura</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal e receba colecionáveis premium todos os meses
            </p>
          </div>

          {/* Plans Grid */}
          {plansQuery.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="relative">
                  <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
              {/* Card Avulso (para comparação) */}
              <Card className="relative border-2 border-border hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Avulso</CardTitle>
                  <CardDescription className="text-base">
                    Compra única sem compromisso
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Preço */}
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold">R$ 500</div>
                    <div className="text-sm text-muted-foreground">por personagem</div>
                    <div className="text-sm text-muted-foreground mt-2">Total: R$ 500</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="text-primary">
                        {settings?.max_installments_no_interest || 6}x sem juros
                      </span>{" "}
                      ou{" "}
                      <span className="text-primary">
                        {settings?.max_installments_with_interest || 10}x com juros
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">
                        <strong>1 peça</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">
                        <strong>Pintada à mão</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Produção limitada mensal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Certificado de autenticidade</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Embalagem premium</span>
                    </li>
                  </ul>

                  {/* CTA */}
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link to="/colecoes">Ver Coleções</Link>
                  </Button>

                  {/* Sem compromisso */}
                  <p className="text-xs text-center text-muted-foreground mt-2">Sem compromisso</p>
                </CardContent>
              </Card>

              {/* Planos de Assinatura */}
              {plans.map((plan) => {
                const style = getPlanStyle(plan.plan_type);
                const Icon = style.icon;
                const priceFull = plan.price_full || settings?.default_price_full || 500;
                const pixDiscountMultiplier = 1 - (settings?.pix_discount_percentage || 5) / 100;
                const pricePix = plan.price_pix || priceFull * pixDiscountMultiplier;

                return (
                  <Card
                    key={plan.id}
                    className={`relative border-2 ${style.borderColor} hover:shadow-xl transition-all duration-300`}
                  >
                    {/* Badge */}
                    {style.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge
                          className={`${style.badgeColor} px-4 py-1 text-xs font-bold shadow-lg`}
                        >
                          {style.badge}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4">
                        <div
                          className={`w-16 h-16 rounded-full bg-muted flex items-center justify-center`}
                        >
                          <Icon className={`h-8 w-8 ${style.iconColor}`} />
                        </div>
                      </div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="text-base">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Preço */}
                      <div className="text-center space-y-2">
                        <div className="text-4xl font-bold">
                          R${" "}
                          {(priceFull / plan.deliveries_total).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">por personagem</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Total: R$ {priceFull.toLocaleString("pt-BR")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="text-primary">
                            {settings?.max_installments_no_interest || 6}x sem juros
                          </span>{" "}
                          ou{" "}
                          <span className="text-primary">
                            {settings?.max_installments_with_interest || 10}x com juros
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2">
                          <Check className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm">
                            <strong>
                              {plan.deliveries_total}{" "}
                              {plan.deliveries_total === 1 ? "peça" : "peças"}
                              {plan.plan_type === "semestral" && " (6 + 1 bônus)"}
                            </strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm">
                            <strong>Pintadas à mão</strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm">Produção limitada mensal</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm">Certificado de autenticidade</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                          <span className="text-sm">Embalagem premium</span>
                        </li>
                      </ul>

                      {/* CTA */}
                      <Button
                        asChild
                        className={`w-full ${
                          plan.plan_type === "semestral" ? "bg-amber-500 hover:bg-amber-600" : ""
                        }`}
                        size="lg"
                      >
                        <Link to="/colecoes">Escolher Coleções</Link>
                      </Button>

                      {/* Benefícios exclusivos */}
                      {plan.plan_type === "trimestral" && (
                        <p className="text-xs text-center text-primary">
                          Plano com benefício exclusivo
                        </p>
                      )}
                      {plan.plan_type === "semestral" && (
                        <p className="text-xs text-center text-primary">
                          Inclui peça exclusiva para membros
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Perguntas Frequentes</h2>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Como funciona a assinatura?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Você escolhe um plano e seleciona as coleções que deseja receber. Todo mês, você
                    recebe uma peça surpresa de uma das suas coleções escolhidas.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Posso trocar de coleção?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até 1
                    dia antes da produção do próximo lote.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quando recebo a primeira peça?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {content
                      ? processContentVariables(content.faqFirstDelivery, content)
                      : "Carregando..."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Posso cancelar a qualquer momento?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sim, você pode cancelar sua assinatura a qualquer momento. As peças já pagas
                    serão entregues normalmente.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Qual a diferença entre os planos?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A diferença está na quantidade de personagens recebidos e nos benefícios
                    exclusivos para membros dos planos maiores.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">O que é revelação surpresa?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Você escolhe a coleção, e o personagem do mês é revelado no envio. Cada peça é
                    única e exclusiva, tornando sua coleção ainda mais especial.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center mt-16">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Escolha suas coleções favoritas e comece sua jornada de colecionador
            </p>
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/colecoes">Ver Coleções Disponíveis</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
