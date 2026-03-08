import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Shield, CheckCircle2, Sparkles, Crown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function LandingPage() {
  const navigate = useNavigate();
  
  // Buscar coleções ativas do banco de dados
  const { data: collections } = useQuery({
    queryKey: ['collections-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });
  


  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero Section - Compacto */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-6 py-16">
          <div className="text-center text-white space-y-6">
            {/* Badge de Lançamento */}
            <Badge className="bg-amber-500 text-slate-900 px-3 py-1 text-xs font-bold shadow-lg">
              VAGAS ABERTAS • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </Badge>

            {/* Títulos */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold">
                ORDAX
              </h1>
              <p className="text-lg md:text-xl text-slate-300">
                Plataforma de Gestão e Colecionáveis Artesanais
              </p>
            </div>

            {/* Subtítulo */}
            <h2 className="text-xl md:text-2xl font-bold max-w-3xl mx-auto">
              Transparência. Organização. <span className="text-amber-400">Exclusividade.</span>
            </h2>

            <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Uma nova <span className="font-semibold">estrutura</span> para <span className="font-semibold">colecionadores</span> que buscam controle,
              clareza e produção organizada em ciclos fechados.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-5"
                onClick={() => navigate('/colecoes')}
              >
                Garantir Vaga nas Coleções Ativas
              </Button>
              
              <Button 
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-5"
                onClick={() => navigate('/migrar-pedido')}
              >
                Tenho Pedido Anterior
              </Button>
            </div>
          </div>
        </div>
      </section>



      {/* O que é ORDAX */}
      <section className="py-10 bg-white dark:bg-slate-950">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              O QUE É A <span className="text-amber-600 dark:text-amber-400">ORDAX</span>?
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              A <span className="text-amber-600 dark:text-amber-400 font-semibold">ORDAX</span> é uma plataforma criada para{' '}
              <span className="font-semibold">organizar</span>, documentar e profissionalizar a{' '}
              <span className="font-semibold">experiência</span> de colecionadores de peças artesanais.
            </p>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-8 bg-slate-50 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              COMO FUNCIONA
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              As coleções são <span className="font-semibold">produzidas em ciclos mensais</span> organizados (2 ciclos por mês), garantindo qualidade e previsibilidade.
            </p>
          </div>
        </div>
      </section>

      {/* Coleções Preview */}
      <section id="colecoes-preview" className="py-10 bg-white dark:bg-slate-950">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white">
              COLEÇÕES ATIVAS ORDAX
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300">
              Curadoria limitada e <span className="font-semibold">produção organizada</span> por lote fechado.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {collections && collections.length > 0 ? collections.map((collection, index) => (
              <Card
                key={index}
                className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative group"
              >
                {/* Área da Imagem do Personagem */}
                <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full flex items-center justify-center border-4 border-amber-500/30">
                      <Sparkles className="w-10 h-10 text-amber-400" />
                    </div>
                  </div>
                </div>

                <CardHeader className="pb-2 px-4 pt-3">
                  <CardTitle className="text-base font-bold">{collection.name}</CardTitle>
                  <p className="text-amber-400 text-xs">
                    Ativa até {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('pt-BR')}
                  </p>
                </CardHeader>

                <CardContent className="space-y-2.5 px-4 pb-4">
                  {/* Features */}
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 leading-tight">Produção organizada por ciclo</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 leading-tight">Controle real de vagas</span>
                    </li>
                  </ul>

                  {/* Vagas */}
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
                    <div className="text-2xl font-bold text-white">
                      Disponível
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">VAGAS ABERTAS</div>
                  </div>

                  {/* CTA */}
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 text-sm"
                    onClick={() => navigate(`/colecoes/${collection.slug}`)}
                  >
                    Garantir Vaga
                  </Button>
                </CardContent>
              </Card>
            )) : (
              // Fallback se não houver coleções
              [1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                  <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-amber-400" />
                  </div>
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-base font-bold">Coleção {i}</CardTitle>
                    <p className="text-amber-400 text-xs">Em breve</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Button 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 text-sm"
                      onClick={() => navigate('/colecoes')}
                    >
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pagamento via PIX com confirmação e registro formal no sistema.
            </p>
          </div>
        </div>
      </section>

      {/* Produção Organizada por Ciclo */}
      <section className="py-8 bg-slate-50 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              Produção Organizada por Ciclo
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Cada coleção ativa é produzida em <span className="font-semibold">lotes mensais</span> estruturados. Durante esse período,
              os participantes recebem atualizações sobre as etapas de produção até a finalização.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-md">
              <Truck className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Produção e envio organizados mensalmente
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Já possui pedido anterior / Programa Fundadores */}
      <section className="py-10 bg-white dark:bg-slate-950">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Já possui pedido anterior */}
            <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-lg">
              <CardContent className="pt-6 pb-6 text-center">
                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">
                  Já possui pedido anterior?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                  A ORDAX está integrando pedidos anteriores à nova estrutura para organização e acompanhamento centralizado.
                </p>
                <Button 
                  variant="outline"
                  className="border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                  onClick={() => navigate('/colecoes')}
                >
                  Migrar Meu Pedido
                </Button>
              </CardContent>
            </Card>

            {/* Programa Fundadores */}
            <Card className="border-2 border-amber-500 dark:border-amber-600 shadow-lg bg-gradient-to-br from-amber-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardContent className="pt-6 pb-6 text-center">
                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">
                  Programa Fundadores ORDAX
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                  Um grupo limitado terá acesso prioritário às próximas coleções e benefícios exclusivos dentro da plataforma.
                </p>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  onClick={() => navigate('/colecoes')}
                >
                  Entrar na Lista Prioritária
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>



      {/* CTA Final Melhorado e Compacto */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern Animado */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 animate-pulse" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Gradient Overlays */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="container max-w-5xl mx-auto text-center relative z-10 px-6">
          <Badge className="mb-4 bg-amber-500 text-slate-900 px-3 py-1.5 text-xs font-bold shadow-lg animate-pulse">
            <Crown className="w-3.5 h-3.5 mr-1.5" />
            PROGRAMA FUNDADORES • VAGAS LIMITADAS
          </Badge>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Seja um dos Primeiros
          </h2>
          
          <p className="text-base text-slate-300 mb-6 max-w-2xl mx-auto leading-relaxed">
            Entre para o grupo exclusivo de fundadores e tenha acesso prioritário às próximas coleções, 
            condições especiais e benefícios únicos.
          </p>

          {/* Contador de Vagas - Lançamento */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-4xl font-bold text-amber-400 mb-1">60</div>
                <div className="text-sm text-slate-300">Vagas Totais</div>
                <div className="text-xs text-slate-400 mt-1">Primeiro Ciclo</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-400 mb-1 animate-pulse">60</div>
                <div className="text-sm text-slate-300">Disponíveis</div>
                <div className="text-xs text-slate-400 mt-1">Garanta a sua!</div>
              </div>
            </div>
            <div className="mt-4 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">🚀 Lançamento oficial - Seja um dos primeiros fundadores</p>
          </div>

          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-5 text-lg shadow-xl shadow-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/70 hover:scale-105 transition-all mb-4"
            onClick={() => navigate('/colecoes')}
          >
            GARANTIR MINHA VAGA AGORA
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-xs text-slate-400 mb-10">
            🚀 Lançamento oficial • Vagas limitadas • Sem compromisso de longo prazo
          </p>

          {/* Features Grid - Compacto */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Package, title: 'Produção Exclusiva', desc: 'Limitada por ciclo' },
              { icon: Sparkles, title: 'Artesanal Premium', desc: 'Pintado à mão' },
              { icon: Shield, title: '100% Transparente', desc: 'Acompanhamento total' },
            ].map((item, i) => (
              <div key={i} className="p-5 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:bg-slate-800/70 hover:border-amber-500/50 transition-all group">
                <item.icon className="w-8 h-8 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white mb-0.5 text-sm">{item.title}</div>
                <div className="text-slate-400 text-xs">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Garantia */}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Pagamento 100% seguro • Registro formal • Suporte dedicado</span>
          </div>
        </div>
      </section>

      {/* Footer - Compacto */}
      <footer className="py-6 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ORDAX © 2026 - Plataforma de Gestão de Colecionáveis Artesanais
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Termos</a>
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Privacidade</a>
              <a href="#" className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
