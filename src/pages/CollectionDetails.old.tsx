import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, Sparkles, Check, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReleaseTimeline } from "@/components/collections/ReleaseTimeline";
import { ProductionLimitBadge } from "@/components/production/ProductionLimitBadge";
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables } from "@/lib/services/contentService";

export default function CollectionDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { data: content } = useContentSettings();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(
          `
          *,
          collection_characters (
            id,
            name,
            description,
            image_url,
            release_order,
            release_month,
            status
          )
        `
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar planos de assinatura do banco
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true});

      if (error) throw error;
      return data || [];
    },
  });

  // Calcular o menor valor mensal entre todos os planos ativos
  const lowestPricePerMonth = plans && plans.length > 0
    ? Math.min(...plans.map(p => Math.floor(Number(p.price_full) / p.deliveries_total)))
    : null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="container max-w-7xl py-16">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!collection) {
    return (
      <AppShell>
        <div className="container max-w-7xl py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Coleção não encontrada</h1>
          <Button asChild>
            <Link to="/colecoes">Ver todas as coleções</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const characters = (collection.collection_characters || []) as Array<{
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    release_order: number;
    release_month: number | null;
    status: "upcoming" | "revealed" | "released";
  }>;
  const sortedCharacters = [...characters].sort((a, b) => a.release_order - b.release_order);

  const releasedCount = characters.filter((c) => c.status === "released").length;
  const revealedCount = characters.filter((c) => c.status === "revealed").length;
  const upcomingCount = characters.filter((c) => c.status === "upcoming").length;

  const heroImage = characters.find((c) => c.image_url)?.image_url;
  const featuredCharacter = sortedCharacters.find((c) => c.status === "revealed");

  return (
    <AppShell>
      <div className="min-h-screen bg-white-override dark:bg-slate-950">
      <SEOHead
        title={`${collection.name} - Coleção Completa`}
        description={
          collection.description ||
          `Coleção ${collection.name} com ${characters.length} personagens exclusivos`
        }
        keywords={[collection.name, "coleção", "personagens", "colecionáveis"]}
        type="website"
      />

      {/* Hero Premium - Melhorado */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Background Image */}
        {heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}

        <div className="relative container max-w-7xl py-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <Badge className="bg-amber-500 text-slate-900 px-4 py-2 text-sm font-bold shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Coleção Premium Exclusiva
              </Badge>
            </div>

            {/* Título */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center leading-tight">
              {collection.name}
            </h1>

            {/* Descrição */}
            {collection.description && (
              <p className="text-xl text-slate-300 mb-8 text-center max-w-3xl mx-auto leading-relaxed">
                {collection.description}
              </p>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-amber-400">{characters.length}</div>
                <div className="text-sm text-slate-300 mt-1">Personagens</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-green-400">{revealedCount}</div>
                <div className="text-sm text-slate-300 mt-1">Disponíveis</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
                <div className="text-3xl font-bold text-blue-400">{releasedCount}</div>
                <div className="text-sm text-slate-300 mt-1">Lançados</div>
              </div>
            </div>

            {/* Prova Social */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-10 text-base">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-sm">
                    👤
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-sm">
                    👤
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-sm">
                    👤
                  </div>
                </div>
                <span className="text-slate-300 font-medium">+50 colecionadores</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="text-slate-300 font-medium ml-2">4.9/5</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-slate-300 font-medium">Entrega Garantida</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-10 py-7 text-lg shadow-2xl hover:shadow-amber-500/50 transition-all"
                asChild
              >
                <Link to={`/colecoes/${slug}/assinar`}>
                  Assinar Coleção Completa
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/30 bg-white/10 text-white hover:bg-white hover:text-slate-900 backdrop-blur-sm px-10 py-7 text-lg transition-all"
                asChild
              >
                <Link to={`/colecoes/${slug}/comprar`}>
                  Comprar Personagem Avulso
                </Link>
              </Button>
            </div>

            {/* Garantias */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-400" />
                Garantia de satisfação
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-400" />
                Cancele quando quiser
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-400" />
                Suporte dedicado
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Personagem em Destaque - Premium Upgrade */}
      {featuredCharacter && (
        <section className="py-20 bg-white dark:bg-slate-950 relative overflow-hidden">
          <div className="container max-w-7xl relative z-10">
            {/* Header */}
            <div className="text-center mb-12">
              <Badge className="mb-4 text-base px-6 py-2 bg-amber-500 text-slate-900 font-bold shadow-lg">
                <Star className="w-5 h-5 mr-2" />
                Personagem em Destaque
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
                {featuredCharacter.name}
              </h2>
              {featuredCharacter.release_month && (
                <p className="text-lg text-muted-foreground flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Disponível no mês {featuredCharacter.release_month} da coleção
                </p>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Imagem com efeitos melhorados */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-transparent rounded-3xl blur-3xl group-hover:blur-[100px] transition-all duration-700" />
                <div className="relative aspect-square rounded-3xl overflow-hidden border-4 border-amber-500/30 shadow-2xl">
                  {featuredCharacter.image_url ? (
                    <img
                      src={featuredCharacter.image_url}
                      alt={featuredCharacter.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                      <Star className="w-32 h-32 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  <div className="absolute top-6 left-6">
                    <Badge className="font-bold text-lg px-4 py-2 shadow-xl bg-slate-900 text-white">
                      #{featuredCharacter.release_order}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Informações Premium */}
              <div className="space-y-8">
                {/* Descrição */}
                {featuredCharacter.description && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg">
                    <p className="text-xl leading-relaxed text-slate-700 dark:text-slate-300">
                      {featuredCharacter.description}
                    </p>
                  </div>
                )}

                {/* Características Premium em Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-2 border-amber-200 dark:border-amber-700/50 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">Artesanal</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Peça única pintada à mão por artistas especializados</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-700/50 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">Premium</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Embalagem exclusiva em MDF com acabamento premium</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700/50 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">Rastreável</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Entrega com código de rastreamento completo</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700/50 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">Exclusivo</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Produção limitada por ciclo mensal</p>
                  </div>
                </div>

                {/* CTAs Premium */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-2 border-amber-500/50 rounded-2xl p-8 space-y-6 shadow-2xl">
                  {/* Contador de Vagas */}
                  <div className="text-center">
                    <ProductionLimitBadge />
                  </div>

                  <div className="text-center pb-6 border-b border-white/10">
                    <p className="text-base text-slate-300 font-medium">
                      Escolha sua forma de aquisição
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Button asChild size="lg" className="h-auto py-6 flex-col gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-xl">
                      <Link to={`/colecoes/${slug}/assinar`}>
                        <span className="text-lg font-bold">Assinar Coleção</span>
                        <span className="text-sm opacity-90">
                          A partir de R$ {lowestPricePerMonth || 385}/peça
                        </span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-auto py-6 flex-col gap-2 border-2 border-white/30 bg-white/10 text-white hover:bg-white hover:text-slate-900"
                    >
                      <Link to={`/colecoes/${slug}/comprar`}>
                        <span className="text-lg font-bold">Comprar Avulso</span>
                        <span className="text-sm opacity-70">R$ 100 de entrada</span>
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-4">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Produção inicia imediatamente após confirmação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Carrossel de Personagens - Compacto */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Todos os Personagens</h2>
            <Badge variant="outline">{sortedCharacters.length} personagens</Badge>
          </div>

          {/* Carrossel */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-3 overflow-x-auto pb-4 carrossel-container snap-x snap-mandatory">
              {sortedCharacters.map((character) => {
                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case "released":
                      return (
                        <Badge variant="secondary" className="text-xs">
                          Lançado
                        </Badge>
                      );
                    case "revealed":
                      return <Badge className="text-xs">Disponível</Badge>;
                    case "upcoming":
                      return (
                        <Badge variant="outline" className="text-xs">
                          Em Breve
                        </Badge>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <div key={character.id} className="group flex-shrink-0 w-48 snap-start">
                    <div className="border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                      {/* Imagem Compacta */}
                      <div className="relative aspect-square bg-muted">
                        {character.image_url ? (
                          <img
                            src={character.image_url}
                            alt={character.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl opacity-20">
                              {character.status === "released"
                                ? "✓"
                                : character.status === "revealed"
                                  ? "⭐"
                                  : "❓"}
                            </span>
                          </div>
                        )}

                        <div className="absolute top-2 left-2">
                          {getStatusBadge(character.status)}
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            #{character.release_order}
                          </Badge>
                        </div>
                      </div>

                      {/* Info Compacta */}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                          {character.name}
                        </h3>

                        {character.release_month && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Mês {character.release_month}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 justify-center mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Disponível ({revealedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted border" />
              <span>Lançados ({releasedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2" />
              <span>Em breve ({upcomingCount})</span>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona o Voucher - Estilo Iron Studios */}
      <section className="py-12 bg-muted/50">
        <div className="container max-w-5xl">
          <div className="text-center mb-8">
            <Badge className="mb-3">
              <Sparkles className="w-3 h-3 mr-1" />
              Sistema de Pré-venda
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Como Funciona a Compra Avulsa</h2>
            <p className="text-muted-foreground">
              Entrada fixa de R$ 100 + Restante no PIX: R$ 375 (5% OFF) ou parcele R$ 400
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Reserve</h3>
              <p className="text-sm text-muted-foreground">Pague R$ 100 de entrada (valor fixo)</p>
            </div>

            <div className="bg-card border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Produção</h3>
              <p className="text-sm text-muted-foreground">
                Iniciamos a produção e você acompanha com fotos
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Finalização</h3>
              <p className="text-sm text-muted-foreground">
                PIX: R$ 375 (5% OFF) ou Parcele: R$ 400
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">4</span>
              </div>
              <h3 className="font-semibold mb-2">Receba</h3>
              <p className="text-sm text-muted-foreground">Enviamos sua peça com rastreamento</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link to={`/colecoes/${slug}/comprar`}>
                Reservar por R$ 100
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Entrada: R$ 100 • Restante: R$ 375 (PIX 5% OFF) ou R$ 400 (parcelado)
            </p>
          </div>
        </div>
      </section>

      {/* Planos - Redesenhado Minimalista */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500 text-slate-900 px-4 py-2 font-bold">
              Planos Flexíveis
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Escolha seu Plano
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Monte sua coleção com nossos planos flexíveis e benefícios exclusivos
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Avulso */}
            <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-amber-500 hover:shadow-xl transition-all flex flex-col bg-white dark:bg-slate-900">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase">
                Estilo Iron Studios
              </div>

              <div className="text-center mb-6 mt-2">
                <div className="text-5xl mb-4">🎫</div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Avulso</h3>
                <div className="mb-4">
                  <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">R$ 500</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">por personagem</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Entrada fixa</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">R$ 100</div>
                </div>
                <div className="text-sm space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">PIX: R$ 375 (5% OFF)</div>
                  <div className="text-slate-600 dark:text-slate-400">ou R$ 400 parcelado</div>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-sm flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">1 peça exclusiva escolhida por você</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Pintada à mão por artistas</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Produção limitada mensal</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Acompanhe a produção com fotos</span>
                </div>
              </div>

              <Button asChild className="w-full mt-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 text-base shadow-lg">
                <Link to={`/colecoes/${slug}/comprar`}>
                  Comprar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Planos de Assinatura */}
            {plans && plans.length > 0 ? (
              plans.map((plan: any) => {
                const priceFull = Number(plan.price_full);
                const pricePerPiece = Math.floor(priceFull / plan.deliveries_total);
                const savings = 500 * plan.deliveries_total - priceFull;

                const isPopular = plan.plan_type === "trimestral";
                const isBestValue = plan.plan_type === "anual";

                const cardClasses = isPopular
                  ? "relative border-4 border-slate-900 dark:border-white rounded-2xl p-8 shadow-2xl scale-105 flex flex-col bg-white dark:bg-slate-900"
                  : "relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xl transition-all flex flex-col bg-white dark:bg-slate-900";

                const badgeClasses = isPopular
                  ? "absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase"
                  : isBestValue
                    ? "absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase"
                    : "";

                const badgeText = isPopular ? "Mais Popular" : isBestValue ? "Melhor Custo-Benefício" : "";

                const emoji = plan.plan_type === "trimestral" ? "⭐" : plan.plan_type === "semestral" ? "💎" : "👑";

                const buttonClasses = isPopular || isBestValue
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900";

                return (
                  <div key={plan.id} className={cardClasses}>
                    {badgeText && <div className={badgeClasses}>{badgeText}</div>}

                    <div className="text-center mb-6 mt-2">
                      <div className="text-5xl mb-4">{emoji}</div>
                      <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white capitalize">
                        {plan.name}
                      </h3>
                      
                      {/* Preço Destaque */}
                      <div className="mb-4">
                        <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                          R$ {pricePerPiece}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">por peça</div>
                      </div>

                      {/* Economia */}
                      {savings > 0 && (
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-3">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Você economiza</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            R$ {savings}
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="text-sm space-y-1">
                        <div className="text-slate-600 dark:text-slate-400">
                          Total: <span className="font-bold text-slate-900 dark:text-white">R$ {priceFull}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">em até 10x com juros</div>
                      </div>
                    </div>

                    {/* Benefícios */}
                    <div className="space-y-3 mb-6 text-sm flex-grow">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          {plan.deliveries_total} {plan.deliveries_total === 1 ? "peça" : "peças"}
                          {plan.plan_type === "anual" && " + 1 BÔNUS!"}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">1 peça por mês garantida</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {plan.plan_type === "trimestral" && "Prioridade na produção"}
                          {plan.plan_type === "semestral" && "Suporte dedicado premium"}
                          {plan.plan_type === "anual" && "Suporte VIP exclusivo"}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-slate-900 dark:text-white flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {plan.plan_type === "trimestral" && "Trocas ilimitadas"}
                          {plan.plan_type === "semestral" && "Cancele quando quiser"}
                          {plan.plan_type === "anual" && "Acesso antecipado a lançamentos"}
                        </span>
                      </div>
                    </div>

                    <Button asChild className={`w-full mt-auto font-bold py-6 text-base shadow-lg ${buttonClasses}`}>
                      <Link to={`/colecoes/${slug}/assinar`}>
                        Assinar Agora
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-8 text-slate-600 dark:text-slate-400">
                Carregando planos...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Perguntas Frequentes</h2>
            <p className="text-muted-foreground">Tudo que você precisa saber sobre a coleção</p>
          </div>

          <div className="space-y-4">
            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Como funciona o sistema de pré-venda?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  Você paga R$ 100 de entrada para reservar sua peça. Iniciamos a produção
                  imediatamente e você acompanha todo o processo com fotos. Quando a peça estiver
                  pronta, você paga o restante: R$ 375 no PIX (5% OFF) ou R$ 400 parcelado em até
                  10x.
                </p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">
                  Qual a diferença entre compra avulsa e assinatura?
                </span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  Na compra avulsa você escolhe 1 personagem específico por R$ 500. Na assinatura,
                  você recebe personagens mensalmente com benefícios exclusivos para membros dos
                  planos maiores.
                </p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">O que é revelação surpresa?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  Você escolhe a coleção, e o personagem do mês é revelado no envio. Cada peça é
                  única e exclusiva, tornando sua coleção ainda mais especial.
                </p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Quando recebo a primeira peça?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  {content
                    ? processContentVariables(content.faqFirstDelivery, content)
                    : "Carregando..."}
                </p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Posso cancelar minha assinatura?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  Sim, você pode cancelar quando quiser, sem multas ou taxas. Basta acessar sua
                  conta e solicitar o cancelamento. Você continuará recebendo as peças já pagas.
                </p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Qual a garantia oferecida?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>
                  Oferecemos garantia de satisfação de 7 dias após o recebimento. Se houver qualquer
                  defeito de fabricação, substituímos a peça gratuitamente. Todas as peças são
                  enviadas com embalagem premium e seguro.
                </p>
              </div>
            </details>
          </div>

          <div className="text-center mt-10">
            <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
            <Button asChild variant="outline">
              <Link to="/perfil?section=support">Falar com Suporte</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Final - Compacto */}
      <section className="py-12 bg-foreground text-background">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar sua coleção?</h2>
          <p className="text-background/70 mb-8 max-w-2xl mx-auto">
            Entrada fixa de R$ 100. Acompanhe a produção e pague o restante: R$ 375 no PIX (5% OFF)
            ou R$ 400 parcelado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link to={`/colecoes/${slug}/assinar`}>
                Assinar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-background/30 text-background hover:bg-background/10"
              asChild
            >
              <Link to={`/colecoes/${slug}/comprar`}>
                <span className="flex flex-col items-center">
                  <span className="text-sm">Comprar Avulso</span>
                  <span className="text-xs opacity-70">R$ 500 (R$ 100 entrada)</span>
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
