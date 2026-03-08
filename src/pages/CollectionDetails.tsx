// @ts-nocheck
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, ArrowRight, Sparkles, Check, Star, Package, Truck, Shield, Crown, 
  Lock, Grid3x3, List, TrendingDown, Users, Award, Palette, 
  ChevronRight, Info, Gift, Clock, RefreshCw
} from "lucide-react";
import { ProductionLimitBadge } from "@/components/production/ProductionLimitBadge";
import { getRotationSchedule } from "@/services/collection-service";

type Character = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  release_order: number;
  release_month: number | null;
  status: "upcoming" | "revealed" | "released";
  is_catalog?: boolean;
  price_category_id?: string | null;
  price_category_name?: string | null;
  price_category_display_name?: string | null;
  price_coins?: number | null;
  price_standalone?: number | null;
};

export default function CollectionDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(`
          *,
          collection_characters (
            id,
            name,
            description,
            image_url,
            release_order,
            release_month,
            status,
            is_catalog,
            price_category_id,
            price_categories (
              name,
              display_name,
              price_coins,
              price_standalone
            )
          )
        `)
        .eq("slug", slug || "")
        .maybeSingle();
      if (error) throw error;
      
      // Transform the data to flatten price_categories
      if (data && data.collection_characters) {
        data.collection_characters = data.collection_characters.map((char: any) => ({
          ...char,
          price_category_name: char.price_categories?.name,
          price_category_display_name: char.price_categories?.display_name,
          price_coins: char.price_categories?.price_coins,
          price_standalone: char.price_categories?.price_standalone,
          price_categories: undefined, // Remove nested object
        }));
      }
      
      return data;
    },
  });

  // Fetch rotation schedule for the collection
  const { data: rotationSchedule } = useQuery({
    queryKey: ["collection-rotation", collection?.id],
    queryFn: async () => {
      if (!collection?.id) return null;
      return await getRotationSchedule(collection.id);
    },
    enabled: !!collection?.id,
  });

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

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">Carregando coleção...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!collection) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <Package className="w-24 h-24 text-slate-300 mx-auto" />
            <h1 className="text-4xl font-bold">Coleção não encontrada</h1>
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600">
              <Link to="/colecoes">Explorar Coleções</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const characters = (collection.collection_characters || []) as Character[];
  const sortedCharacters = [...characters].sort((a, b) => a.release_order - b.release_order);
  const releasedCount = characters.filter((c) => c.status === "released").length;
  const revealedCount = characters.filter((c) => c.status === "revealed").length;
  const upcomingCount = characters.filter((c) => c.status === "upcoming").length;
  const heroImage = characters.find((c) => c.image_url)?.image_url;
  const featuredCharacter = sortedCharacters.find((c) => c.status === "revealed");

  const lowestPricePerMonth = plans && plans.length > 0
    ? Math.min(...plans.map(p => Math.floor(Number(p.price_full) / p.deliveries_total)))
    : null;

  // Determine rotation type and format display
  const rotationType = (collection as any)?.rotation_type || 'fixed';
  const isRotating = rotationType !== 'fixed';
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const rotationDisplay = isRotating && rotationSchedule
    ? rotationSchedule.map((m: number) => monthNames[m - 1]).join(', ')
    : null;

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <SEOHead
          title={`${collection.name} - Coleção Exclusiva`}
          description={collection.description || `Descubra a coleção ${collection.name} com ${characters.length} personagens artesanais`}
          keywords={[collection.name, "coleção", "artesanal", "exclusivo"]}
          type="website"
        />

        {/* Hero Split Screen - Imagem + Info */}
        <section className="relative min-h-[85vh] lg:h-auto overflow-hidden">
          <div className="container max-w-7xl mx-auto px-6 py-12 lg:py-20">
            <div className="grid lg:grid-cols-5 gap-12 items-center">
              {/* Lado Esquerdo - Informações (3 colunas) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Badge + Categoria */}
                <div className="flex items-center gap-4">
                  <Badge className="bg-amber-500 text-slate-950 px-4 py-2 text-sm font-bold shadow-lg">
                    <Crown className="w-4 h-4 mr-2" />
                    Edição Limitada
                  </Badge>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-px w-8 bg-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Coleção Premium</span>
                  </div>
                </div>

                {/* Título */}
                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-950 dark:text-white leading-tight">
                  {collection.name}
                </h1>

                {/* Descrição */}
                {collection.description && (
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {collection.description}
                  </p>
                )}

                {/* Rotation Schedule Display */}
                <div className="flex items-center gap-2">
                  {isRotating ? (
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-4 py-2">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span className="font-medium">Disponível: {rotationDisplay}</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="font-medium">Disponível todo mês</span>
                    </Badge>
                  )}
                </div>

                {/* Stats em linha */}
                <div className="flex flex-wrap gap-6 py-4">
                  {[
                    { value: characters.length, label: 'Personagens', icon: Package },
                    { value: revealedCount, label: 'Disponíveis', icon: Star },
                    { value: releasedCount, label: 'Lançados', icon: Check }
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-950 dark:text-white">{stat.value}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">{stat.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Preço Destaque */}
                {lowestPricePerMonth && (
                  <div className="inline-flex items-baseline gap-3 p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl border-2 border-amber-200 dark:border-amber-900">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">A partir de</span>
                    <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">R$ {lowestPricePerMonth}</span>
                    <span className="text-base text-slate-600 dark:text-slate-400">/mês</span>
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button 
                    size="lg" 
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 text-base group shadow-xl"
                    asChild
                  >
                    <Link to={`/colecoes/${slug}/assinar`}>
                      <Crown className="mr-2 h-5 w-5" />
                      Assinar Coleção
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>

                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2 px-8 py-6 text-base font-semibold"
                    asChild
                  >
                    <Link to={`/colecoes/${slug}/comprar`}>
                      Comprar Avulso
                    </Link>
                  </Button>
                </div>

                {/* Features Rápidas */}
                <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {[
                    { icon: Sparkles, text: 'Pintado à Mão', desc: 'Artesanato premium' },
                    { icon: Truck, text: 'Envio Garantido', desc: 'Envio até 5° dia útil' },
                    { icon: Shield, text: 'Produção Limitada', desc: 'Por ciclo mensal' }
                  ].map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-950 dark:text-white">{feature.text}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lado Direito - Imagem (2 colunas) */}
              <div className="lg:col-span-2 relative">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 group">
                  {heroImage ? (
                    <>
                      <img 
                        src={heroImage} 
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                      <Package className="w-24 h-24 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  
                  {/* Badge no canto */}
                  <div className="absolute top-6 right-6">
                    <div className="bg-amber-500 text-slate-950 rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl shadow-2xl">
                      #{sortedCharacters[0]?.release_order || 1}
                    </div>
                  </div>
                </div>

                {/* Decoração */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden lg:block">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <span className="text-xs uppercase tracking-widest">Role para explorar</span>
              <ChevronRight className="w-6 h-6 rotate-90" />
            </div>
          </div>
        </section>

        {/* Personagem em Destaque - Card Grande Interativo */}
        {featuredCharacter && (
          <section className="py-24 px-6">
            <div className="container max-w-7xl">
              {/* Header com Badge */}
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 text-sm font-bold">
                  <Star className="w-4 h-4 mr-2" />
                  Personagem em Destaque Este Mês
                </Badge>
                <h2 className="text-3xl font-bold text-slate-950 dark:text-white mb-3">
                  {featuredCharacter.name}
                </h2>
                {featuredCharacter.release_month && (
                  <p className="text-base text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Disponível no mês {featuredCharacter.release_month} da coleção
                  </p>
                )}
              </div>

              {/* Card Grande */}
              <div className="relative max-w-5xl mx-auto">
                <div className="grid lg:grid-cols-5 gap-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  {/* Imagem - 3 colunas */}
                  <div className="lg:col-span-3 relative aspect-square lg:aspect-auto">
                    {featuredCharacter.image_url ? (
                      <img 
                        src={featuredCharacter.image_url} 
                        alt={featuredCharacter.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <Star className="w-24 h-24 text-slate-300" />
                      </div>
                    )}
                    
                    {/* Badge de Número */}
                    <div className="absolute top-6 right-6 w-16 h-16 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-2xl shadow-xl">
                      #{featuredCharacter.release_order}
                    </div>
                  </div>

                  {/* Info - 2 colunas */}
                  <div className="lg:col-span-2 p-6 lg:p-8 flex flex-col justify-between">
                    <div className="space-y-4">
                      {featuredCharacter.description && (
                        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                          {featuredCharacter.description}
                        </p>
                      )}

                      {/* Características em Pills */}
                      <div className="flex flex-wrap gap-3">
                        {[
                          { icon: Palette, label: 'Artesanal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                          { icon: Crown, label: 'Premium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                          { icon: Lock, label: 'Exclusivo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
                        ].map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <div key={idx} className={`flex items-center gap-2 px-4 py-2 rounded-full ${item.color} font-semibold text-sm`}>
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Produção Limitada */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <ProductionLimitBadge />
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="space-y-2 mt-6">
                      <Button 
                        size="lg" 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3"
                        asChild
                      >
                        <Link to={`/colecoes/${slug}/assinar`}>
                          <Crown className="mr-2 h-4 w-4" />
                          Assinar Coleção Completa
                        </Link>
                      </Button>
                      
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full py-3"
                        asChild
                      >
                        <Link to={`/colecoes/${slug}/comprar`}>
                          Comprar Este Personagem
                        </Link>
                      </Button>

                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">
                        Entrada: R$ 100 • Restante: R$ 375 (PIX) ou R$ 400 (parcelado)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pricing Information Section */}
        <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10">
          <div className="container max-w-6xl px-6">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-amber-500 text-slate-950 px-5 py-2.5 text-sm font-bold">
                <Info className="w-4 h-4 mr-2" />
                Sistema de Preços
              </Badge>
              <h2 className="text-3xl font-bold text-slate-950 dark:text-white mb-3">
                Como Funciona o Sistema de Coins
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Assinantes pagam com coins. Personagens de coleção têm preço contextual, enquanto personagens do catálogo têm preço fixo por categoria.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Personagens de Coleção */}
              <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-white">Personagens de Coleção</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Preço contextual</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Coleção Ativa</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">200 coins</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Outra Coleção</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">300 coins</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Compra Avulsa</span>
                      <span className="text-lg font-bold text-slate-600 dark:text-slate-400">R$ 500</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 leading-relaxed">
                    Personagens de coleção têm desconto quando você assina a coleção correspondente.
                  </p>
                </CardContent>
              </Card>

              {/* Personagens do Catálogo */}
              <Card className="bg-white dark:bg-slate-900 border-2 border-amber-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-white">Personagens do Catálogo</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Preço fixo por categoria</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Padrão</span>
                      <span className="text-lg font-bold text-slate-600 dark:text-slate-400">200 coins</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Premium</span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">300 coins</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Ultra Raro</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">450 coins</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Lendário</span>
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">600 coins</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 leading-relaxed">
                    Personagens do catálogo não pertencem a coleções e têm preço fixo baseado na raridade.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <strong className="text-slate-950 dark:text-white">Importante:</strong> Coins são exclusivos para assinantes e não têm valor monetário. Não podem ser convertidos em dinheiro ou reembolsados.
              </p>
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                <Link to="/planos">
                  <Crown className="mr-2 h-4 w-4" />
                  Ver Planos de Assinatura
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Galeria com Tabs - Grid ou Lista */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container max-w-7xl px-6">
            {/* Header com Controles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white mb-1">
                  Todos os Personagens
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {sortedCharacters.length} personagens únicos • {revealedCount} disponíveis agora
                </p>
              </div>

              {/* Toggle View Mode */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "grid" 
                      ? "bg-amber-500 text-white" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "list" 
                      ? "bg-amber-500 text-white" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">Lista</span>
                </button>
              </div>
            </div>

            {/* Tabs por Status */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-8 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="all" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  Todos ({sortedCharacters.length})
                </TabsTrigger>
                <TabsTrigger value="revealed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  Disponíveis ({revealedCount})
                </TabsTrigger>
                <TabsTrigger value="released" className="data-[state=active]:bg-slate-500 data-[state=active]:text-white">
                  Lançados ({releasedCount})
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Em Breve ({upcomingCount})
                </TabsTrigger>
              </TabsList>

              {/* Grid View */}
              {viewMode === "grid" && (
                <>
                  <TabsContent value="all" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedCharacters.map((char) => (
                      <CharacterCard key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="revealed" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedCharacters.filter(c => c.status === "revealed").map((char) => (
                      <CharacterCard key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="released" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedCharacters.filter(c => c.status === "released").map((char) => (
                      <CharacterCard key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="upcoming" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedCharacters.filter(c => c.status === "upcoming").map((char) => (
                      <CharacterCard key={char.id} character={char} />
                    ))}
                  </TabsContent>
                </>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <>
                  <TabsContent value="all" className="space-y-4">
                    {sortedCharacters.map((char) => (
                      <CharacterListItem key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="revealed" className="space-y-4">
                    {sortedCharacters.filter(c => c.status === "revealed").map((char) => (
                      <CharacterListItem key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="released" className="space-y-4">
                    {sortedCharacters.filter(c => c.status === "released").map((char) => (
                      <CharacterListItem key={char.id} character={char} />
                    ))}
                  </TabsContent>

                  <TabsContent value="upcoming" className="space-y-4">
                    {sortedCharacters.filter(c => c.status === "upcoming").map((char) => (
                      <CharacterListItem key={char.id} character={char} />
                    ))}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </section>

        {/* Timeline de Lançamentos - Compacto */}
        <section className="py-16 bg-white dark:bg-slate-950">
          <div className="container max-w-6xl px-6">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                Processo Simples
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-2">
                Como Funciona a Compra
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                4 passos para receber sua peça exclusiva
              </p>
            </div>

            {/* Timeline Horizontal */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[
                { 
                  step: '1', 
                  title: 'Reserve sua Vaga', 
                  desc: 'Pague R$ 100 de entrada e garanta sua peça no ciclo',
                  icon: Lock,
                  color: 'amber'
                },
                { 
                  step: '2', 
                  title: 'Produção Artesanal', 
                  desc: 'Acompanhe fotos exclusivas do processo de pintura',
                  icon: Palette,
                  color: 'purple'
                },
                { 
                  step: '3', 
                  title: 'Finalize o Pagamento', 
                  desc: 'PIX: R$ 375 (5% OFF) ou Parcele: R$ 400',
                  icon: Check,
                  color: 'green'
                },
                { 
                  step: '4', 
                  title: 'Envio e Entrega', 
                  desc: 'Enviamos na segunda quinzena do mês (a partir do dia 15)',
                  icon: Truck,
                  color: 'blue'
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                
                return (
                  <div key={idx} className="relative">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all hover:shadow-lg h-full flex flex-col">
                      {/* Header do card */}
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-full bg-${item.color}-500 flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className={`text-3xl font-bold text-${item.color}-200 dark:text-${item.color}-900/30`}>
                          {item.step}
                        </div>
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-950 dark:text-white mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {/* Seta conectora (desktop) */}
                    {idx < 3 && (
                      <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                        <ArrowRight className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info adicional + CTA */}
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl border-2 border-amber-200 dark:border-amber-900">
                <div className="text-center sm:text-left flex-1">
                  <p className="text-base font-bold text-slate-950 dark:text-white mb-2">
                    Pronto para começar sua coleção?
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Entrada: <strong className="text-slate-950 dark:text-white">R$ 100</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-500" />
                      PIX: <strong className="text-green-600 dark:text-green-400">R$ 375</strong> (5% OFF)
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Parcele: <strong className="text-slate-950 dark:text-white">R$ 400</strong>
                    </span>
                  </div>
                </div>
                <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 text-base whitespace-nowrap shadow-xl" asChild>
                  <Link to={`/colecoes/${slug}/comprar`}>
                    Reservar Agora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Comparador de Planos - Design Premium */}
        <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
          {/* Pattern Background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          </div>
          
          <div className="container max-w-7xl px-6 relative z-10">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-amber-500 text-slate-950 px-5 py-2.5 text-sm font-bold shadow-xl">
                <TrendingDown className="w-4 h-4 mr-2" />
                Economize Até 40% Assinando
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
                Planos de Assinatura
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Receba personagens exclusivos todo mês com desconto progressivo.<br />
                <span className="text-amber-400 font-semibold">Quanto mais meses, menor o valor por peça.</span>
              </p>
            </div>

            {/* Grid de Planos */}
            <div className="grid md:grid-cols-4 gap-6 mb-10 pt-8 justify-items-center max-w-7xl mx-auto">
              {/* Plano Avulso */}
              <Card 
                className={`relative cursor-pointer transition-all w-full max-w-xs ${
                  selectedPlan === 'avulso' 
                    ? 'ring-4 ring-amber-500 scale-105' 
                    : 'hover:scale-105'
                } bg-white dark:bg-slate-900 overflow-visible shadow-2xl hover:shadow-amber-500/20`}
                onClick={() => setSelectedPlan('avulso')}
              >
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-3xl shadow-lg">
                      🎫
                    </div>
                    <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Compra Avulsa</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Escolha 1 personagem</p>
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-slate-950 dark:text-white mb-1">R$ 500</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">por personagem</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-600">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">Entrada</div>
                      <div className="text-2xl font-bold text-slate-950 dark:text-white">R$ 100</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-6">
                    {[
                      '1 personagem escolhido',
                      'Pintado à mão',
                      'Produção limitada',
                      'Acompanhe com fotos'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Check className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-left">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-lg"
                    asChild
                  >
                    <Link to={`/colecoes/${slug}/comprar`}>Comprar Avulso</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Planos Dinâmicos */}
              {plans && plans.length > 0 && plans.map((plan: any) => {
                const priceFull = Number(plan.price_full);
                const pricePerPiece = Math.floor(priceFull / plan.deliveries_total);
                const savings = 500 * plan.deliveries_total - priceFull;
                const savingsPercent = Math.round((savings / (500 * plan.deliveries_total)) * 100);
                const isPopular = plan.plan_type === "trimestral";
                const isBestValue = plan.plan_type === "anual";
                const planId = plan.id;

                return (
                  <Card 
                    key={planId}
                    className={`relative cursor-pointer transition-all w-full max-w-xs ${
                      selectedPlan === planId 
                        ? 'ring-4 ring-amber-500 scale-105' 
                        : isPopular 
                        ? 'ring-2 ring-amber-400 scale-105' 
                        : 'hover:scale-105'
                    } bg-white dark:bg-slate-900 overflow-visible shadow-2xl hover:shadow-amber-500/20`}
                    onClick={() => setSelectedPlan(planId)}
                  >
                    {(isPopular || isBestValue) && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl z-10 whitespace-nowrap">
                        {isPopular ? '⭐ MAIS POPULAR' : '👑 MELHOR CUSTO'}
                      </div>
                    )}
                    
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg">
                          {plan.plan_type === "trimestral" ? "⭐" : plan.plan_type === "semestral" ? "💎" : "👑"}
                        </div>
                        <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 capitalize">
                          Plano {plan.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{plan.deliveries_total} entregas mensais</p>
                        <div className="mb-4">
                          <div className="flex items-baseline justify-center gap-2 mb-1">
                            <div className="text-4xl font-bold text-slate-950 dark:text-white">R$ {pricePerPiece}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">/peça</div>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500 line-through">R$ 500 por peça</div>
                        </div>
                        
                        {savings > 0 && (
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg">
                            <div className="text-xl mb-0.5">Economize R$ {savings}</div>
                            <div className="text-xs opacity-90">{savingsPercent}% de desconto total</div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm mb-6">
                        {[
                          { text: `${plan.deliveries_total} peças garantidas`, highlight: true },
                          { text: '1 personagem por mês', highlight: false },
                          { text: 'Prioridade na produção', highlight: false },
                          { text: 'Trocas ilimitadas', highlight: false },
                          { text: 'Cancele quando quiser', highlight: false }
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <Check className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'text-amber-500' : 'text-green-500'}`} />
                            <span className={`text-xs text-left ${item.highlight ? 'font-semibold' : ''}`}>{item.text}</span>
                          </div>
                        ))}
                      </div>

                      <Button 
                        className={`w-full font-semibold shadow-lg ${isPopular || isBestValue ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900'}`}
                        asChild
                      >
                        <Link to={`/colecoes/${slug}/assinar`}>
                          Assinar Agora
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Calculadora de Economia Premium */}
            {selectedPlan && selectedPlan !== 'avulso' && (
              <div className="max-w-4xl mx-auto mb-12">
                <div className="bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 backdrop-blur-md rounded-3xl p-8 border-2 border-green-500/50 shadow-2xl">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
                        <Gift className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold mb-2 text-white">Sua Economia Total</h3>
                        <p className="text-base text-green-100">
                          Comparado com compra avulsa
                        </p>
                      </div>
                    </div>
                    <div className="text-center md:text-right bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6">
                      <div className="text-5xl font-bold text-green-400 mb-2">
                        {plans && plans.find((p: any) => p.id === selectedPlan) && (() => {
                          const plan = plans.find((p: any) => p.id === selectedPlan);
                          return plan ? `R$ ${500 * plan.deliveries_total - Number(plan.price_full)}` : '';
                        })()}
                      </div>
                      <div className="text-base text-green-200 font-semibold">
                        {plans && plans.find((p: any) => p.id === selectedPlan) && (() => {
                          const plan = plans.find((p: any) => p.id === selectedPlan);
                          if (!plan) return '';
                          const savings = 500 * plan.deliveries_total - Number(plan.price_full);
                          const percent = Math.round((savings / (500 * plan.deliveries_total)) * 100);
                          return `${percent}% de desconto total`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Benefícios da Assinatura - Design Premium */}
            <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { 
                  icon: Crown, 
                  title: 'Prioridade VIP', 
                  desc: 'Fila preferencial na produção e acesso antecipado',
                  gradient: 'from-amber-500 to-orange-500'
                },
                { 
                  icon: Gift, 
                  title: 'Desconto Progressivo', 
                  desc: 'Quanto mais meses assinar, menor o preço por peça',
                  gradient: 'from-green-500 to-emerald-500'
                },
                { 
                  icon: Check, 
                  title: 'Flexibilidade Total', 
                  desc: 'Cancele quando quiser sem multas ou taxas',
                  gradient: 'from-blue-500 to-cyan-500'
                }
              ].map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div key={idx} className="group text-center p-8 bg-white/5 backdrop-blur-sm rounded-2xl border-2 border-white/10 hover:border-amber-500/50 transition-all hover:scale-105">
                    <div className={`w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br ${benefit.gradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-xl mb-3 text-white">{benefit.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{benefit.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Depoimentos */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container max-w-6xl px-6">
            <div className="text-center mb-12">
              <Badge className="mb-3 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1.5 text-sm">
                <Users className="w-4 h-4 mr-2" />
                Depoimentos
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-3">
                O Que Nossos Colecionadores Dizem
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Carlos Silva',
                  role: 'Colecionador há 2 anos',
                  text: 'A qualidade das peças é excepcional. Cada detalhe é perfeito e a pintura à mão faz toda a diferença.',
                  rating: 5
                },
                {
                  name: 'Ana Paula',
                  role: 'Assinante Anual',
                  text: 'Adoro receber uma surpresa todo mês! O acompanhamento da produção com fotos é incrível.',
                  rating: 5
                },
                {
                  name: 'Roberto Costa',
                  role: 'Colecionador Premium',
                  text: 'Melhor investimento que fiz. As peças valorizam com o tempo e a embalagem é premium.',
                  rating: 5
                }
              ].map((testimonial, idx) => (
                <Card key={idx} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-950 dark:text-white">{testimonial.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="container max-w-4xl px-6">
            <div className="text-center mb-12">
              <Badge className="mb-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 text-sm">
                <Info className="w-4 h-4 mr-2" />
                Perguntas Frequentes
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white">
                Tire Suas Dúvidas
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { 
                  q: 'Como funciona o sistema de ciclos de produção?', 
                  a: 'Trabalhamos com ciclos mensais de produção limitada. Você entra em um ciclo, sua peça é produzida artesanalmente durante aquele mês, e o envio é feito sempre até o 5° dia útil do mês seguinte. Isso garante qualidade e exclusividade em cada peça.' 
                },
                { 
                  q: 'Como funciona a compra avulsa com entrada de R$ 100?', 
                  a: 'Você paga R$ 100 de entrada para reservar sua vaga no ciclo de produção. Acompanha todo o processo artesanal com fotos exclusivas. Quando a peça estiver pronta, você finaliza o pagamento: R$ 375 no PIX (5% de desconto) ou R$ 400 parcelado em até 10x.' 
                },
                { 
                  q: 'Qual a diferença entre compra avulsa e assinatura?', 
                  a: 'Na compra avulsa você escolhe 1 personagem específico por R$ 500 (R$ 100 entrada + R$ 400 restante). Na assinatura, você recebe personagens automaticamente todo mês com desconto progressivo: quanto mais meses assinar, menor o valor por peça. Além disso, assinantes têm prioridade na produção e podem trocar personagens até o fechamento do ciclo.' 
                },
                { 
                  q: 'Quando recebo minha primeira peça?', 
                  a: 'Após confirmar sua compra ou assinatura, sua peça entra no próximo ciclo de produção disponível. O ciclo completo leva aproximadamente 90 dias (3 meses): vendas no primeiro mês, produção no segundo mês, e envio/entrega na segunda quinzena do terceiro mês (a partir do dia 15). Você acompanha todo o processo com fotos exclusivas da produção.' 
                },
                { 
                  q: 'Posso trocar o personagem escolhido?', 
                  a: 'Sim! Assinantes podem trocar o personagem escolhido quantas vezes quiser até o fechamento do ciclo de produção. Na compra avulsa, você pode solicitar troca até 48h após a confirmação do pagamento da entrada.' 
                },
                { 
                  q: 'Posso cancelar minha assinatura?', 
                  a: 'Sim, você pode cancelar sua assinatura quando quiser, sem multas ou taxas. Você continuará recebendo todas as peças dos ciclos já pagos. O cancelamento vale a partir do próximo ciclo ainda não pago.' 
                },
                { 
                  q: 'Qual a garantia oferecida?', 
                  a: 'Oferecemos garantia de satisfação de 7 dias após o recebimento. Se houver qualquer defeito de fabricação ou dano no transporte, substituímos a peça gratuitamente. Todas as peças são enviadas com embalagem premium e seguro.' 
                },
                { 
                  q: 'Como funciona o rastreamento da entrega?', 
                  a: 'Todas as entregas incluem código de rastreamento completo dos Correios. Você recebe o código por e-mail assim que a peça é despachada e pode acompanhar em tempo real pelo site dos Correios ou pelo seu painel na plataforma.' 
                }
              ].map((faq, idx) => (
                <details 
                  key={idx} 
                  className="group bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-800 overflow-hidden hover:border-amber-500 transition-colors"
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-base text-slate-950 dark:text-white">
                    <span>{faq.q}</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90 text-amber-500" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">Ainda tem dúvidas?</p>
              <Button variant="outline" size="lg" asChild>
                <Link to="/perfil?section=support">
                  Falar com Suporte
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Final com Garantias */}
        <section className="py-24 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white relative overflow-hidden">
          {/* Pattern Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>

          <div className="container max-w-5xl px-6 text-center relative z-10">
            <div className="mb-8">
              <Crown className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto para Começar<br />Sua Coleção?
              </h2>
              <p className="text-base text-amber-50 max-w-2xl mx-auto leading-relaxed">
                Cada peça é artesanal, pintada à mão e entregue com embalagem premium.<br />
                Produção limitada por ciclo mensal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-white text-amber-600 hover:bg-amber-50 font-bold px-8 py-3 text-base shadow-2xl"
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
                className="border-2 border-white text-white hover:bg-white hover:text-amber-600 px-8 py-3 text-base"
                asChild
              >
                <Link to={`/colecoes/${slug}/comprar`}>
                  Comprar Avulso
                </Link>
              </Button>
            </div>

            {/* Garantias */}
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: Shield, title: 'Garantia de 7 Dias', desc: 'Satisfação garantida' },
                { icon: Truck, title: 'Envio Rastreado', desc: 'Acompanhe sua entrega' },
                { icon: Award, title: 'Qualidade Premium', desc: 'Artesanato certificado' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-amber-50">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// Componente de Card de Personagem
function CharacterCard({ character }: { character: Character }) {
  const statusConfig = {
    released: { label: 'Lançado', color: 'bg-slate-500' },
    revealed: { label: 'Disponível', color: 'bg-green-500' },
    upcoming: { label: 'Em Breve', color: 'bg-blue-500' }
  };
  const config = statusConfig[character.status];
  
  // Show mystery placeholder if not revealed (Requirements 12.7, 28.4)
  const isRevealed = character.status === "revealed" || character.status === "released";
  const displayImage = isRevealed ? character.image_url : null;
  const displayName = isRevealed ? character.name : "Personagem Misterioso";
  
  // Determine pricing display
  const isCatalog = character.is_catalog === true;
  const priceDisplay = isCatalog && character.price_coins 
    ? `${character.price_coins} coins`
    : '200-300 coins'; // Collection contextual pricing

  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
            <Lock className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-3" />
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-500">Mistério</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <div className={`${config.color} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
            {config.label}
          </div>
          {isCatalog && character.price_category_display_name && (
            <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              {character.price_category_display_name}
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-full">
          #{character.release_order}
        </div>

        {character.status === "revealed" && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Ver Detalhes
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-lg text-slate-950 dark:text-white line-clamp-1 flex-1">
            {displayName}
          </h3>
          {isCatalog && (
            <Badge variant="outline" className="text-xs whitespace-nowrap border-amber-500 text-amber-600 dark:text-amber-400">
              Catálogo
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          {character.release_month && (
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Mês {character.release_month}
            </p>
          )}
          
          {isRevealed && (
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {priceDisplay}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Item de Lista
function CharacterListItem({ character }: { character: Character }) {
  const statusConfig = {
    released: { label: 'Lançado', color: 'bg-slate-500' },
    revealed: { label: 'Disponível', color: 'bg-green-500' },
    upcoming: { label: 'Em Breve', color: 'bg-blue-500' }
  };
  const config = statusConfig[character.status];
  
  // Show mystery placeholder if not revealed (Requirements 12.7, 28.4)
  const isRevealed = character.status === "revealed" || character.status === "released";
  const displayImage = isRevealed ? character.image_url : null;
  const displayName = isRevealed ? character.name : "Personagem Misterioso";
  const displayDescription = isRevealed ? character.description : "Este personagem será revelado em breve. Aguarde a data de revelação!";
  
  // Determine pricing display
  const isCatalog = character.is_catalog === true;
  const priceDisplay = isCatalog && character.price_coins 
    ? `${character.price_coins} coins`
    : '200-300 coins'; // Collection contextual pricing

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-500">
      <div className="flex gap-6 p-4">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
              <Lock className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-1" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-500">Mistério</span>
            </div>
          )}
          
          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
            #{character.release_order}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-950 dark:text-white mb-1">
                  {displayName}
                </h3>
                {isCatalog && character.price_category_display_name && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                    Catálogo • {character.price_category_display_name}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`${config.color} text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap`}>
                  {config.label}
                </div>
                {isRevealed && (
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {priceDisplay}
                  </div>
                )}
              </div>
            </div>
            
            {displayDescription && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                {displayDescription}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            {character.release_month && (
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mês {character.release_month}
              </p>
            )}
            
            {character.status === "revealed" && (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                Ver Detalhes
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
