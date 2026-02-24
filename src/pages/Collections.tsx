import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Check, Zap, Crown, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { NextReleaseBanner } from "@/components/collections/NextReleaseBanner";
import { ReleaseTimeline } from "@/components/collections/ReleaseTimeline";
import { BatchInfoBanner } from "@/components/content/BatchInfoBanner";
import { DynamicFAQ } from "@/components/content/DynamicFAQ";
import CollectionHero from "@/components/collections/CollectionHero";
import HowItWorks from "@/components/collections/HowItWorks";

export default function Collections() {
  // Buscar coleções ativas do banco de dados
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(
          `
          *,
          collection_characters(count)
        `
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Buscar planos de assinatura do banco (SSOT)
  const { data: plans } = useQuery({
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

  // Calcular valores dinâmicos (apenas Trimestral e Semestral)
  const trimestralPlan = plans?.find((p) => p.plan_type === "trimestral" && p.is_active);
  const semestralPlan = plans?.find((p) => p.plan_type === "semestral" && p.is_active);

  // Preço avulso (fixo)
  const avulsoPrice = 500;
  const avulsoEntrada = 100;
  const avulsoRestante = 400;

  // Calcular menor preço por peça (Semestral tem melhor custo-benefício)
  const minPricePerPiece = semestralPlan
    ? Math.floor(Number(semestralPlan.price_full) / semestralPlan.deliveries_total)
    : 385;

  // Calcular economia máxima (Semestral tem maior economia)
  const maxSavings = semestralPlan
    ? avulsoPrice * semestralPlan.deliveries_total - Number(semestralPlan.price_full)
    : 800;
  return (
    <AppShell>
      <SEOHead
        title="Coleções Exclusivas - Ordax"
        description="Coleções artesanais personalizadas. Escolha seus personagens favoritos e receba peças únicas pintadas à mão."
        keywords={["coleções", "personalizadas", "artesanal", "colecionáveis", "premium"]}
        type="website"
      />

      {/* Hero Section */}
      <CollectionHero />

      {/* Next Release Banner */}
      <section className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container max-w-7xl">
          <NextReleaseBanner />
        </div>
      </section>

      {/* Release Timeline */}
      <section className="py-12 bg-muted/20">
        <div className="container max-w-7xl">
          <ReleaseTimeline />
        </div>
      </section>

      {/* Lote Alert */}
      <section className="py-8 bg-muted/20">
        <div className="container max-w-7xl">
          <BatchInfoBanner showButton={true} buttonText="Ver Planos" buttonLink="/planos" />
        </div>
      </section>

      {/* Coleções Disponíveis */}
      <section
        id="colecoes-disponiveis"
        className="py-20 sm:py-28 bg-gradient-to-b from-muted/20 to-background"
      >
        <div className="container max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Coleções Disponíveis
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Escolha uma coleção completa e receba personagens exclusivos mensalmente
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {collections.map((collection, index) => {
                const characterCount = collection.collection_characters?.[0]?.count || 0;

                // Emojis por coleção
                const getEmoji = (name: string) => {
                  if (name.toLowerCase().includes("thunder")) return "⚡";
                  if (name.toLowerCase().includes("x-men")) return "✖️";
                  if (
                    name.toLowerCase().includes("vilões") ||
                    name.toLowerCase().includes("spider")
                  )
                    return "🕷️";
                  if (name.toLowerCase().includes("batman")) return "🦇";
                  if (name.toLowerCase().includes("star wars")) return "⭐";
                  if (name.toLowerCase().includes("marvel")) return "🦸";
                  return "🎭";
                };

                // Badge por posição
                const getBadge = (idx: number) => {
                  if (idx === 0)
                    return {
                      text: "Mais escolhido",
                      icon: Star,
                      color: "bg-primary text-primary-foreground",
                    };
                  if (idx === 1)
                    return {
                      text: "NOVO",
                      icon: Sparkles,
                      color: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                    };
                  if (idx === 2)
                    return {
                      text: "DESTAQUE",
                      icon: Zap,
                      color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                    };
                  return null;
                };

                const badge = getBadge(index);

                return (
                  <Card
                    key={collection.id}
                    className="group overflow-hidden border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 relative flex flex-col h-full"
                  >
                    {/* Badge de Destaque */}
                    {badge && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                        <Badge className={`${badge.color} px-3 py-1 text-xs font-bold shadow-lg`}>
                          <badge.icon className="w-3 h-3 mr-1" />
                          {badge.text}
                        </Badge>
                      </div>
                    )}

                    {/* Imagem/Ícone da Coleção */}
                    <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {collection.image_url ? (
                        <>
                          <img
                            src={collection.image_url}
                            alt={collection.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 p-6">
                          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <span className="text-4xl">{getEmoji(collection.name)}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Ciclo Anual
                          </Badge>
                        </div>
                      )}

                      {/* Overlay com Info Rápida */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                        <div className="text-center text-white">
                          <p className="text-xs mb-3 line-clamp-3">
                            {collection.description ||
                              `Coleção exclusiva com ${characterCount} personagens únicos pintados à mão.`}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                            asChild
                          >
                            <Link to={`/colecoes/${collection.slug}`}>
                              Ver Detalhes
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {collection.name}
                      </CardTitle>
                      <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                        {collection.description ||
                          `Coleção exclusiva com ${characterCount} personagens únicos.`}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col h-full">
                      {/* Conteúdo flexível que pode crescer */}
                      <div className="flex-grow space-y-3">
                        {/* Informações */}
                        <div className="flex items-center justify-between text-xs border-t pt-3">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {characterCount} personagens
                          </span>
                          <Badge variant="outline" className="text-xs">
                            1/mês
                          </Badge>
                        </div>

                        {/* Preços Compactos */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">Avulso:</span>
                            <span className="text-sm font-bold">R$ {avulsoPrice}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">Assinatura:</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-primary">
                                A partir de R$ {minPricePerPiece}/peça
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CTA - Sempre na parte inferior */}
                      <div className="mt-4 pt-3 border-t">
                        <Button asChild className="w-full" size="sm">
                          <Link to={`/colecoes/${collection.slug}`}>
                            Ver Coleção
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto">
                <CardContent className="pt-6">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-muted-foreground mb-4">
                    Nenhuma coleção disponível no momento.
                  </p>
                  <Button variant="outline" size="lg">
                    Solicitar Coleção Personalizada
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* CTA Final - Premium */}
      <section className="py-20 sm:py-28 bg-foreground text-background">
        <div className="container max-w-5xl text-center">
          <div className="mb-12">
            <Badge className="mb-6 bg-background/20 text-background border-background/30 backdrop-blur-sm text-base px-6 py-2">
              <Crown className="w-4 h-4 mr-2" />
              Colecionáveis Premium
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Pronto para começar sua coleção?
            </h2>
            <p className="text-xl text-background/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Escolha entre compra avulsa ou assinatura e garanta seus personagens favoritos. Cada
              peça é artesanal, pintada à mão e entregue com embalagem premium.
            </p>
          </div>

          {/* Comparação Rápida */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
            <Card className="bg-background/10 backdrop-blur-sm border-2 border-background/20 text-left overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl text-background">Compra Avulsa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-background">R$ {avulsoPrice}</div>
                  <div className="text-sm text-background/70 mt-1">
                    R$ {avulsoEntrada} entrada + R$ {avulsoRestante}
                  </div>
                </div>
                <ul className="space-y-2 text-background/80">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />1 peça artesanal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Pintura à mão
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Embalagem premium
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Sem compromisso
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full bg-background/10 border-background/30 text-background hover:bg-background/20"
                  asChild
                >
                  <Link to="/planos">Ver Detalhes</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-background/20 backdrop-blur-sm border-2 border-background/40 text-left overflow-hidden relative">
              <div className="absolute top-4 right-4 bg-background text-foreground text-xs font-bold px-3 py-1 rounded-full">
                MELHOR VALOR
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-background">Assinatura Semestral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {semestralPlan ? (
                  <>
                    <div>
                      <div className="text-4xl font-bold text-background mb-1">
                        R$ {Number(semestralPlan.price_full).toFixed(0)}
                      </div>
                      <div className="text-sm text-background/80">
                        R${" "}
                        {Math.floor(
                          Number(semestralPlan.price_full) / semestralPlan.deliveries_total
                        )}
                        /peça ({semestralPlan.deliveries_total} peças)
                      </div>
                    </div>
                    <ul className="space-y-2 text-background/90">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {semestralPlan.deliveries_total} peças exclusivas
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4" />1 peça por mês
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Prioridade na produção
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Suporte dedicado
                      </li>
                    </ul>
                  </>
                ) : (
                  <div className="text-background/70">Carregando...</div>
                )}
                <Button
                  className="w-full bg-background text-foreground hover:bg-background/90 shadow-2xl"
                  asChild
                >
                  <Link to="/planos">Assinar Agora</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Botões Finais */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="bg-background/10 border-2 border-background/30 text-background hover:bg-background/20 h-14 px-10 text-lg"
              asChild
            >
              <Link to="/planos">Ver Todos os Planos</Link>
            </Button>
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 h-14 px-10 text-lg shadow-2xl font-bold"
              onClick={() => {
                const section = document.getElementById("colecoes-disponiveis");
                section?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explorar Coleções
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tudo o que você precisa saber sobre nossas coleções
            </p>
          </div>

          <div className="space-y-4">
            <DynamicFAQ
              items={[
                {
                  q: "Como funciona a assinatura?",
                  a: "Você escolhe um plano e seleciona as coleções que deseja receber. Todo mês, você recebe uma peça surpresa de uma das suas coleções escolhidas, com revelação antecipada.",
                },
                {
                  q: "Posso trocar de coleção?",
                  a: "{{faq_exchange}}",
                },
                {
                  q: "Quando recebo a primeira peça?",
                  a: "{{faq_first_delivery}}",
                },
                {
                  q: "Posso cancelar a qualquer momento?",
                  a: "{{faq_cancellation}}",
                },
                {
                  q: "Qual a diferença entre os planos?",
                  a: (content) =>
                    `A principal diferença é a quantidade de coleções e o número de entregas. Planos maiores têm mais benefícios e melhor custo-benefício, com economia de até R$ ${maxSavings.toFixed(0)} no Anual.`,
                },
              ]}
            />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
