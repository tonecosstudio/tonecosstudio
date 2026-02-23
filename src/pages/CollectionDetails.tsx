// @ts-nocheck
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Sparkles, Check, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ReleaseTimeline } from '@/components/collections/ReleaseTimeline';
import { ProductionLimitBadge } from '@/components/production/ProductionLimitBadge';

export default function CollectionDetails() {
  const { slug } = useParams<{ slug: string }>();

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select(`
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
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar planos de assinatura do banco
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

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
    status: 'upcoming' | 'revealed' | 'released';
  }>;
  const sortedCharacters = [...characters].sort((a, b) => a.release_order - b.release_order);
  
  const releasedCount = characters.filter(c => c.status === 'released').length;
  const revealedCount = characters.filter(c => c.status === 'revealed').length;
  const upcomingCount = characters.filter(c => c.status === 'upcoming').length;

  const heroImage = characters.find(c => c.image_url)?.image_url;
  const featuredCharacter = sortedCharacters.find(c => c.status === 'revealed');

  return (
    <AppShell>
      <SEOHead
        title={`${collection.name} - Coleção Completa`}
        description={collection.description || `Coleção ${collection.name} com ${characters.length} personagens exclusivos`}
        keywords={[collection.name, 'coleção', 'personagens', 'colecionáveis']}
        type="website"
      />

      {/* Hero Compacto e Moderno */}
      <section className="relative bg-foreground text-background overflow-hidden">
        {/* Background */}
        {heroImage && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/95 to-foreground" />
          </>
        )}

        <div className="relative container max-w-6xl py-16 px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-background/10 text-background border-background/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Coleção Premium
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {collection.name}
            </h1>
            
            {collection.description && (
              <p className="text-lg text-background/70 mb-6">
                {collection.description}
              </p>
            )}
            
            {/* Prova Social */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-background/20 border-2 border-background flex items-center justify-center text-xs">👤</div>
                  <div className="w-8 h-8 rounded-full bg-background/20 border-2 border-background flex items-center justify-center text-xs">👤</div>
                  <div className="w-8 h-8 rounded-full bg-background/20 border-2 border-background flex items-center justify-center text-xs">👤</div>
                </div>
                <span className="text-background/80">+50 colecionadores</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-background/80">4.9/5 avaliação</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-background/80" />
                <span className="text-background/80">Entrega garantida</span>
              </div>
            </div>
            
            {/* Stats Inline */}
            <div className="flex flex-wrap gap-4 justify-center mb-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-background/50" />
                <span className="text-background/80">{characters.length} Personagens</span>
              </div>
              {revealedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary">{revealedCount} Disponível Agora</span>
                </div>
              )}
              {releasedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">{releasedCount} Lançados</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                className="bg-background text-foreground hover:bg-background/90 shadow-xl"
                asChild
              >
                <Link to={`/colecoes/${slug}/assinar`}>
                  Assinar Coleção
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-background bg-background/10 text-background hover:bg-background hover:text-foreground backdrop-blur-sm"
                asChild
              >
                <Link to={`/colecoes/${slug}/comprar`}>
                  <span className="flex flex-col items-center">
                    <span className="text-sm font-semibold">Comprar Avulso</span>
                    <span className="text-xs">R$ 100 de entrada</span>
                  </span>
                </Link>
              </Button>
            </div>

            {/* Garantia */}
            <p className="text-xs text-background/60 mt-6">
              ✓ Garantia de satisfação • ✓ Cancele quando quiser • ✓ Suporte dedicado
            </p>
          </div>
        </div>
      </section>

      {/* Personagem em Destaque - Premium */}
      {featuredCharacter && (
        <section className="py-16 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </div>

          <div className="container max-w-6xl relative z-10">
            {/* Header */}
            <div className="text-center mb-10">
              <Badge className="mb-3 text-base px-4 py-1.5">
                <Star className="w-4 h-4 mr-2" />
                Personagem do Mês
              </Badge>
              <h2 className="text-4xl font-bold mb-3">{featuredCharacter.name}</h2>
              {featuredCharacter.release_month && (
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Disponível no mês {featuredCharacter.release_month} da coleção
                </p>
              )}
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Imagem com efeitos */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-2xl">
                  {featuredCharacter.image_url ? (
                    <img
                      src={featuredCharacter.image_url}
                      alt={featuredCharacter.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <Star className="w-24 h-24 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge className="font-bold text-base px-3 py-1.5 shadow-lg">
                      #{featuredCharacter.release_order}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Informações Premium */}
              <div className="space-y-6">
                {/* Descrição */}
                {featuredCharacter.description && (
                  <div className="bg-card border rounded-xl p-6">
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      {featuredCharacter.description}
                    </p>
                  </div>
                )}
                
                {/* Características Premium */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">Artesanal</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Peça única pintada à mão</p>
                  </div>

                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">Premium</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Embalagem em MDF</p>
                  </div>

                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">Rastreável</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Entrega com tracking</p>
                  </div>

                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">Exclusivo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Ciclo Mensal</p>
                  </div>
                </div>

                {/* CTAs Premium */}
                <div className="bg-gradient-to-br from-card to-muted/20 border-2 border-primary/20 rounded-2xl p-6 space-y-4">
                  {/* Contador de Vagas */}
                  <ProductionLimitBadge />
                  
                  <div className="text-center pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-2">Escolha sua forma de aquisição</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Button asChild size="lg" className="h-auto py-4 flex-col gap-1">
                      <Link to={`/colecoes/${slug}/assinar`}>
                        <span className="text-base font-bold">Assinar Coleção</span>
                        <span className="text-xs opacity-80">
                          A partir de R$ {plans && plans.length > 0 
                            ? Math.min(...plans.map(p => Math.floor(Number(p.price_full) / p.deliveries_total)))
                            : 385}/peça
                        </span>
                      </Link>
                    </Button>
                    
                    <Button asChild size="lg" variant="outline" className="h-auto py-4 flex-col gap-1 border-2">
                      <Link to={`/colecoes/${slug}/comprar`}>
                        <span className="text-base font-bold">Comprar Avulso</span>
                        <span className="text-xs opacity-70">R$ 100 de entrada</span>
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <Sparkles className="w-3 h-3" />
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
                    case 'released':
                      return <Badge variant="secondary" className="text-xs">Lançado</Badge>;
                    case 'revealed':
                      return <Badge className="text-xs">Disponível</Badge>;
                    case 'upcoming':
                      return <Badge variant="outline" className="text-xs">Em Breve</Badge>;
                    default:
                      return null;
                  }
                };

                return (
                  <div 
                    key={character.id} 
                    className="group flex-shrink-0 w-48 snap-start"
                  >
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
                              {character.status === 'released' ? '✓' : 
                               character.status === 'revealed' ? '⭐' : '❓'}
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
              <p className="text-sm text-muted-foreground">
                Pague R$ 100 de entrada (valor fixo)
              </p>
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
              <p className="text-sm text-muted-foreground">
                Enviamos sua peça com rastreamento
              </p>
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

      {/* Planos - Compacto */}
      <section className="py-12 bg-background">
        <div className="container max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Escolha seu Plano</h2>
            <p className="text-muted-foreground">
              Monte sua coleção com nossos planos flexíveis
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Avulso */}
            <div className="border-2 border-primary/30 rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                ESTILO IRON STUDIOS
              </div>
              
              <div className="text-center mb-4 mt-2">
                <div className="text-3xl mb-2">🎫</div>
                <h3 className="text-xl font-bold mb-2">Avulso</h3>
                <div className="mb-3">
                  <div className="text-4xl font-bold">R$ 500</div>
                  <div className="text-sm text-muted-foreground">por personagem</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Total: R$ 500 <span className="text-primary">em até 10x com juros</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 mb-2">
                  Entrada: R$ 100 + Restante quando pronto
                </div>
                <div className="text-xs font-semibold">
                  <div className="text-primary">PIX: R$ 375 (5% OFF)</div>
                  <div className="text-muted-foreground mt-1">Parcelado: R$ 400</div>
                </div>
              </div>
              
              <div className="space-y-2 mb-6 text-sm flex-grow">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>1 peça exclusiva</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Pintada à mão</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Produção limitada mensal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Acompanhe a produção</span>
                </div>
              </div>

              <Button asChild className="w-full mt-auto">
                <Link to={`/colecoes/${slug}/comprar`}>Comprar Agora</Link>
              </Button>
            </div>

            {/* Planos de Assinatura - Dinâmicos */}
            {plans && plans.length > 0 ? (
              plans.map((plan: any) => {
                const priceFull = Number(plan.price_full);
                const pricePix = Number(plan.price_pix);
                const discount = priceFull - pricePix;
                const pricePerPiece = priceFull / plan.deliveries_total;
                const savings = (500 * plan.deliveries_total) - priceFull;
                
                // Determinar estilo do card baseado no tipo
                const isPopular = plan.plan_type === 'trimestral';
                const isBestValue = plan.plan_type === 'anual';
                
                const cardClasses = isPopular 
                  ? "border-2 border-primary rounded-xl p-6 relative shadow-lg scale-105 flex flex-col"
                  : isBestValue
                    ? "border-2 border-purple-500/50 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all relative flex flex-col"
                    : "border rounded-xl p-6 hover:border-amber-500/50 hover:shadow-lg transition-all flex flex-col";
                
                const badgeClasses = isPopular
                  ? "absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold"
                  : isBestValue
                    ? "absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                    : "";
                
                const badgeText = isPopular ? "Mais escolhido" : isBestValue ? "MELHOR VALOR" : "";
                
                const emoji = plan.plan_type === 'trimestral' ? '📦' : plan.plan_type === 'semestral' ? '💎' : '👑';
                
                const pixColor = plan.plan_type === 'trimestral' ? 'text-primary' : plan.plan_type === 'semestral' ? 'text-amber-600' : 'text-purple-600';
                
                const buttonVariant = plan.plan_type === 'trimestral' ? 'default' : 'outline';
                const buttonClasses = plan.plan_type === 'anual' ? 'border-purple-500 text-purple-700 hover:bg-purple-50' : '';
                
                return (
                  <div key={plan.id} className={cardClasses}>
                    {badgeText && (
                      <div className={badgeClasses}>
                        {badgeText}
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">{emoji}</div>
                      <h3 className="text-xl font-bold mb-2 capitalize">{plan.name}</h3>
                      <div className="text-3xl font-bold mb-1">R$ {priceFull.toFixed(0)}</div>
                      <div className="mb-3">
                        <div className="text-4xl font-bold">
                          R$ {(priceFull / plan.deliveries_total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-muted-foreground">por personagem</div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Total: R$ {priceFull.toFixed(0)} <span className="text-primary">em até 10x com juros</span>
                        </div>
                      </div>
                      {plan.plan_type === 'trimestral' && (
                        <p className="text-xs text-primary">
                          Plano com benefício exclusivo
                        </p>
                      )}
                      {plan.plan_type === 'semestral' && (
                        <p className="text-xs text-primary">
                          Inclui peça exclusiva para membros
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-6 text-sm flex-grow">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className={plan.plan_type === 'anual' ? 'font-semibold' : ''}>
                          {plan.deliveries_total} {plan.deliveries_total === 1 ? 'peça' : 'peças'}
                          {plan.plan_type === 'anual' && ' + 1 GRÁTIS!'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>1 peça por mês</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>
                          {plan.plan_type === 'trimestral' && 'Prioridade na produção'}
                          {plan.plan_type === 'semestral' && 'Suporte dedicado'}
                          {plan.plan_type === 'anual' && 'Suporte VIP'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>
                          {plan.plan_type === 'trimestral' && 'Trocas ilimitadas'}
                          {plan.plan_type === 'semestral' && 'Cancele quando quiser'}
                          {plan.plan_type === 'anual' && 'Acesso antecipado'}
                        </span>
                      </div>
                    </div>

                    <Button asChild className={`w-full mt-auto ${buttonClasses}`} variant={buttonVariant}>
                      <Link to={`/colecoes/${slug}/assinar`}>
                        Assinar
                        {plan.plan_type === 'trimestral' && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Link>
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
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
                <p>Você paga R$ 100 de entrada para reservar sua peça. Iniciamos a produção imediatamente e você acompanha todo o processo com fotos. Quando a peça estiver pronta, você paga o restante: R$ 375 no PIX (5% OFF) ou R$ 400 parcelado em até 10x.</p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Qual a diferença entre compra avulsa e assinatura?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>Na compra avulsa você escolhe 1 personagem específico por R$ 500. Na assinatura, você recebe personagens mensalmente 
                com benefícios exclusivos para membros dos planos maiores.</p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">O que é revelação surpresa?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>Você escolhe a coleção, e o personagem do mês é revelado no envio. Cada peça é única e exclusiva, 
                tornando sua coleção ainda mais especial.</p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Quando recebo a primeira peça?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15 do mês seguinte (ou até atingir o limite de produção), 
                produção de 15 dias, e envio em até 5 dias úteis (considera feriados). Exemplo: compra em 15/02-15/03, 
                produção 16-30/03, envio até 5º dia útil de Abril.</p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Posso cancelar minha assinatura?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>Sim, você pode cancelar quando quiser, sem multas ou taxas. Basta acessar sua conta e solicitar o cancelamento. Você continuará recebendo as peças já pagas.</p>
              </div>
            </details>

            <details className="group bg-card border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-semibold">Qual a garantia oferecida?</span>
                <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-6 text-muted-foreground">
                <p>Oferecemos garantia de satisfação de 7 dias após o recebimento. Se houver qualquer defeito de fabricação, substituímos a peça gratuitamente. Todas as peças são enviadas com embalagem premium e seguro.</p>
              </div>
            </details>
          </div>

          <div className="text-center mt-10">
            <p className="text-muted-foreground mb-4">Ainda tem dúvidas?</p>
            <Button asChild variant="outline">
              <Link to="/perfil?section=support">
                Falar com Suporte
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Final - Compacto */}
      <section className="py-12 bg-foreground text-background">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar sua coleção?
          </h2>
          <p className="text-background/70 mb-8 max-w-2xl mx-auto">
            Entrada fixa de R$ 100. Acompanhe a produção e pague o restante: R$ 375 no PIX (5% OFF) ou R$ 400 parcelado.
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
    </AppShell>
  );
}
