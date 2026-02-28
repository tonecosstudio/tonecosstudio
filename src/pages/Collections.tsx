import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Crown, ArrowRight, Truck, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useCurrentCycle } from "@/hooks/useCycles";

export default function Collections() {
  // Buscar ciclo atual
  const { data: currentCycle, isLoading: cycleLoading } = useCurrentCycle();

  // Buscar configurações do sistema (incluindo hero_image_url)
  const { data: systemSettings, refetch: refetchSettings } = useSystemSettings();
  
  // Forçar refetch ao montar o componente
  useEffect(() => {
    refetchSettings();
  }, [refetchSettings]);

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

  // Calcular o menor valor mensal entre todos os planos ativos
  const lowestPricePerMonth = plans && plans.length > 0
    ? Math.min(...plans.map(p => Math.floor(Number(p.price_full) / p.deliveries_total)))
    : null;

  // Formatar data do ciclo
  const formatCycleDate = (month: number, year: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-white-override dark:bg-slate-950">
        <SEOHead
          title="Coleções Exclusivas - Ordax"
          description="Coleções artesanais personalizadas. Escolha seus personagens favoritos e receba peças únicas pintadas à mão."
          keywords={["coleções", "personalizadas", "artesanal", "colecionáveis", "premium"]}
          type="website"
        />

        {/* Hero Section Premium - Com Imagem - Layout 75/25 */}
        <section className="relative min-h-[40vh] bg-white-override dark:bg-slate-900 overflow-hidden flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Coluna Esquerda - Texto (70%) */}
            <div className="w-full md:w-[70%] flex flex-col justify-center items-center space-y-6 pr-0 md:pr-12">
              {/* Main Heading */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-slate-900 dark:text-white text-center">
                O SEU ESTÚDIO PREMIUM<br />
                DE COLECIONÁVEIS ARTESANAIS
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 text-center max-w-2xl leading-relaxed">
                Produção limitada por ciclo. Envio sempre até o 5° dia útil do mês.
              </p>

              {/* Cycle Info Badge */}
              {currentCycle && !cycleLoading && (
                <div className="inline-flex items-center bg-slate-900 dark:bg-slate-800 text-white rounded-lg px-6 py-3 text-sm shadow-lg">
                  <span className="text-slate-400 font-medium">VAGAS LIMITADAS EM</span>
                  <span className="mx-2 text-amber-400">•</span>
                  <span className="font-bold">{formatCycleDate(currentCycle.month, currentCycle.year).toUpperCase()}</span>
                </div>
              )}

              {/* CTA Button */}
              <div>
                <Button 
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 text-base shadow-xl hover:shadow-2xl transition-all"
                  asChild
                >
                  <Link to="#colecoes-disponiveis">
                    ENTRAR NO CICLO ATUAL
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Coluna Direita - Imagem (30%) */}
            <div className="w-full md:w-[30%] pl-0 md:pl-8">
              {systemSettings?.hero_image_url && (
                <img 
                  src={systemSettings.hero_image_url} 
                  alt="Guerreiro Artesanal Premium" 
                  className="w-full h-auto object-contain"
                  loading="eager"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Features - Divisória */}
      <section className="bg-slate-900 dark:bg-slate-950 border-y border-slate-700/50">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 py-4 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Produção por Ciclo</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Envio até 5° Dia Útil</span>
            </div>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Edição Limitada</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ciclo Atual - Banner Melhorado */}
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="container max-w-5xl mx-auto">
          {currentCycle && !cycleLoading ? (
            <div className="text-center">
              <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
                Ciclo Atual: {formatCycleDate(currentCycle.month, currentCycle.year)}
              </h2>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 inline-block">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">Compras até</span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {new Date(currentCycle.open_end).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400 rotate-90 sm:rotate-0" />

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">Produção até</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {new Date(currentCycle.production_end).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400 rotate-90 sm:rotate-0" />

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground font-medium">Envio até</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {new Date(currentCycle.shipping_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4 font-medium">
                Produção: ~30 dias • Envio: até 5° dia útil • Entrega: 7-15 dias úteis
              </p>
            </div>
          ) : cycleLoading ? (
            <div className="text-center">
              <Skeleton className="h-6 w-48 mx-auto mb-4" />
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-800 inline-block">
                <div className="flex justify-center gap-6">
                  <Skeleton className="h-12 w-20" />
                  <Skeleton className="h-12 w-20" />
                  <Skeleton className="h-12 w-20" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl shadow-lg p-8 border border-slate-200 dark:border-slate-700 inline-block">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                  Nenhum Ciclo Ativo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aguarde o próximo ciclo de produção
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Produção Artesanal Premium */}
      <section id="colecoes-disponiveis" className="py-8 bg-slate-50 dark:bg-slate-900">
        <div className="container max-w-7xl">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-2 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {collections.map((collection, index) => {
                const characterCount = collection.collection_characters?.[0]?.count || 0;

                // Categorias por coleção
                const getCategory = (name: string) => {
                  if (name.toLowerCase().includes("guerreiro") || name.toLowerCase().includes("warrior")) 
                    return { name: "GUERREIROS SOMBRIOS", badge: "MAIS ASSINADA" };
                  if (name.toLowerCase().includes("mestre") || name.toLowerCase().includes("mage") || name.toLowerCase().includes("místico")) 
                    return { name: "MESTRES MÍSTICOS", badge: null };
                  if (name.toLowerCase().includes("criatura") || name.toLowerCase().includes("beast") || name.toLowerCase().includes("rúnico")) 
                    return { name: "CRIATURAS RÚNICAS", badge: null };
                  return { name: collection.name.toUpperCase(), badge: index === 0 ? "MAIS ASSINADA" : null };
                };

                const category = getCategory(collection.name);
                const pricePerMonth = lowestPricePerMonth || 385;

                return (
                  <Card
                    key={collection.id}
                    className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative flex flex-col h-full"
                  >
                    {/* Badge de Destaque - Reposicionado */}
                    {category.badge && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-amber-500 text-slate-900 px-2 py-0.5 text-[10px] font-bold shadow-lg border border-amber-600">
                          {category.badge}
                        </Badge>
                      </div>
                    )}

                    {/* Imagem da Coleção */}
                    <div className="relative aspect-[4/3] bg-slate-800 overflow-hidden">
                      {collection.image_url ? (
                        <>
                          <img
                            src={collection.image_url}
                            alt={collection.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900">
                          <div className="text-center">
                            <Package className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                            <p className="text-xs text-slate-400">Imagem em breve</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-2 px-3 pt-3 flex-grow">
                      <CardTitle className="text-sm font-bold mb-1 tracking-tight">
                        {category.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {collection.description || `${characterCount} personagens exclusivos`}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-2 px-3 pb-3 mt-auto">
                      {/* Preço Destaque - Melhorado */}
                      <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg p-3 shadow-md">
                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] text-slate-800 font-semibold uppercase tracking-wide mb-0.5">
                            A partir de
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-slate-800 font-medium">R$</span>
                            <span className="text-2xl font-bold text-slate-900">{pricePerMonth}</span>
                            <span className="text-slate-700 text-xs font-medium">/mês</span>
                          </div>
                        </div>
                      </div>

                      {/* Botão CTA Principal - Melhorado */}
                      <Button 
                        asChild 
                        className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold h-9 text-xs shadow-md hover:shadow-lg transition-all"
                      >
                        <Link to={`/colecoes/${collection.slug}`} className="flex items-center justify-center gap-1.5">
                          ASSINAR AGORA
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>

                      {/* Link secundário - Melhorado */}
                      <button 
                        onClick={() => {
                          window.location.href = `/colecoes/${collection.slug}`;
                        }}
                        className="w-full text-center text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium"
                      >
                        Ver catálogo completo
                      </button>
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

      {/* How It Works - Melhorado */}
      <section className="py-16 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900 dark:text-white">Como Funciona</h2>
            <p className="text-base text-muted-foreground">Simples, transparente e premium</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Escolha seu Plano</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Selecione o plano que melhor se adequa ao seu perfil de colecionador
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Selecione Coleções</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Escolha as coleções e personagens que deseja receber
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Receba Mensalmente</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Peças artesanais pintadas à mão. Envio até o 5° dia útil do mês.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Premium - Melhorado */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="container max-w-5xl mx-auto text-center relative z-10">
          <Badge className="mb-4 bg-amber-500 text-slate-900 px-3 py-1 text-xs font-bold shadow-lg">
            <Crown className="w-3 h-3 mr-1" />
            Colecionáveis Premium
          </Badge>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar sua coleção?
          </h2>
          
          <p className="text-base text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Cada peça é artesanal, pintada à mão e entregue com embalagem premium. Edição limitada por ciclo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-6 text-base shadow-xl hover:shadow-2xl transition-all"
              asChild
            >
              <Link to="/planos">
                Ver Planos e Preços
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-2 border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500 px-8 py-6 text-base transition-all"
              onClick={() => {
                const section = document.getElementById("colecoes-disponiveis");
                section?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explorar Coleções
            </Button>
          </div>

          {/* Features Footer */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-all">
              <Package className="w-8 h-8 text-amber-400" />
              <span className="font-bold text-base text-white">Produção por Ciclo</span>
              <span className="text-slate-400 text-sm">Limitada e exclusiva</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-all">
              <Sparkles className="w-8 h-8 text-amber-400" />
              <span className="font-bold text-base text-white">Pintado à Mão</span>
              <span className="text-slate-400 text-sm">Artesanato premium</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-all">
              <Truck className="w-8 h-8 text-amber-400" />
              <span className="font-bold text-base text-white">Envio Garantido</span>
              <span className="text-slate-400 text-sm">Até 5° dia útil</span>
            </div>
          </div>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
