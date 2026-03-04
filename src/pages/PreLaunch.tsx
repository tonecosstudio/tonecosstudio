// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles, Package, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEOHead from '@/components/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCycle } from '@/hooks/useCycles';

const DEPOSIT_AMOUNT = 100.00;

export default function PreLaunch() {
  const navigate = useNavigate();
  
  // Buscar ciclo atual
  const { data: currentCycle } = useCurrentCycle();
  
  // Buscar coleções ativas
  const { data: collections, isLoading } = useQuery({
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
    <>
      <SEOHead
        title="Pré-Lançamento ORDAX - Voucher R$ 100 + Assinatura Premium"
        description="Garanta seu voucher de R$ 100 e acesso prioritário às coleções exclusivas. Oferta limitada de pré-lançamento!"
      />

      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Hero Section - Impacto Máximo */}
        <section className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 animate-pulse" style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', 
              backgroundSize: '50px 50px' 
            }}></div>
          </div>

          {/* Gradient Overlays */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

          <div className="relative w-full max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="text-center text-white space-y-8">
              {/* Badge Urgência */}
              <div className="flex flex-col items-center gap-3">
                <Badge className="bg-white text-amber-600 px-4 py-2 text-sm font-black shadow-2xl animate-bounce">
                  🔥 PRÉ-LANÇAMENTO • OFERTA LIMITADA
                </Badge>
                <Badge className="bg-yellow-400 text-slate-900 px-4 py-2 text-xs font-bold shadow-xl">
                  ⏰ Apenas 50 Vouchers Disponíveis
                </Badge>
              </div>

              {/* Título Principal */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                  GANHE R$ 100
                </h1>
                <p className="text-2xl md:text-3xl font-bold text-yellow-200">
                  + Acesso Prioritário às Coleções
                </p>
              </div>

              {/* Proposta de Valor */}
              <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                Seja um dos <span className="font-black text-yellow-300">primeiros 50 fundadores</span> da ORDAX 
                e receba um <span className="font-black text-yellow-300">voucher de R$ 100</span> para usar 
                em qualquer compra + benefícios exclusivos!
              </p>

              {/* CTAs Principais */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button 
                  size="lg"
                  className="bg-white text-amber-600 hover:bg-yellow-50 font-black px-10 py-7 text-xl shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all"
                  onClick={() => navigate('/colecoes')}
                >
                  <Gift className="mr-2 h-6 w-6" />
                  QUERO MEU VOUCHER DE R$ 100
                </Button>
              </div>

              <p className="text-sm text-white/80">
                ✨ Sem compromisso • Cancele quando quiser • Voucher vitalício
              </p>
            </div>
          </div>
        </section>

        {/* Contador de Urgência */}
        <section className="py-8 bg-slate-900 text-white">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl md:text-5xl font-black text-amber-400 mb-2 animate-pulse">50</div>
                <div className="text-sm text-slate-300">Vouchers Totais</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black text-green-400 mb-2 animate-pulse">50</div>
                <div className="text-sm text-slate-300">Ainda Disponíveis</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black text-red-400 mb-2">0</div>
                <div className="text-sm text-slate-300">Já Garantiram</div>
              </div>
            </div>
            <div className="mt-6 bg-slate-800 rounded-full h-4 overflow-hidden">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </section>

        {/* O que você ganha */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-amber-500 text-white px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                BENEFÍCIOS EXCLUSIVOS
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white">
                O Que Você Ganha Como Fundador
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Benefícios que valem muito mais que R$ 100
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Voucher R$ 100 */}
              <Card className="border-4 border-amber-500 shadow-2xl bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"></div>
                <CardContent className="pt-8 pb-8 relative">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-500 p-4 rounded-2xl">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        Voucher de R$ 100
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Use em qualquer compra avulsa ou para reduzir o valor da assinatura
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Válido para sempre</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Use quando quiser</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Acumula com outras promoções</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Acesso Prioritário */}
              <Card className="border-2 border-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-900">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-500 p-4 rounded-2xl">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        Acesso Prioritário
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Seja o primeiro a ter acesso às novas coleções
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Vagas garantidas em lançamentos</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Notificação antecipada</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Escolha primeiro os personagens</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Badge Fundador */}
              <Card className="border-2 border-blue-500 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500 p-4 rounded-2xl">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        Badge de Fundador
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Reconhecimento especial na plataforma
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Badge exclusivo no perfil</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Apenas 50 pessoas terão</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Status vitalício</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suporte VIP */}
              <Card className="border-2 border-green-500 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-500 p-4 rounded-2xl">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        Suporte VIP
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Atendimento prioritário e personalizado
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Resposta em até 24h</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Canal direto com a equipe</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Atendimento personalizado</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-16 bg-white dark:bg-slate-950">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white">
                Como Funciona?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Simples, rápido e sem complicação
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-amber-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                  Escolha sua Opção
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Voucher avulso de R$ 100 ou assinatura com voucher incluso
                </p>
              </div>

              <div className="text-center">
                <div className="bg-amber-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                  Faça o Pagamento
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  PIX rápido e seguro. Confirmação automática
                </p>
              </div>

              <div className="text-center">
                <div className="bg-amber-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                  Receba seus Benefícios
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Voucher + badge + acesso prioritário na hora
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Opções de Compra */}
        <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-amber-500 text-white px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                ESCOLHA SUA OPÇÃO
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Duas Formas de Garantir seu Voucher
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Opção 1: Voucher Avulso */}
              <Card className="border-4 border-amber-500 shadow-2xl bg-white dark:bg-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"></div>
                <CardContent className="pt-8 pb-8 relative">
                  <Badge className="mb-4 bg-amber-500 text-white">
                    MAIS POPULAR
                  </Badge>
                  <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">
                    Voucher Avulso
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-black text-amber-600">R$ 100</span>
                    <span className="text-slate-600 dark:text-slate-400 ml-2">pagamento único</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Voucher de R$ 100 vitalício</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Badge de Fundador</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Acesso prioritário</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Suporte VIP</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Sem mensalidade</span>
                    </li>
                  </ul>

                  <Button 
                    size="lg"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-6 text-lg"
                    onClick={() => navigate('/colecoes')}
                  >
                    GARANTIR VOUCHER DE R$ 100
                  </Button>
                </CardContent>
              </Card>

              {/* Opção 2: Assinatura com Voucher */}
              <Card className="border-2 border-purple-500 shadow-xl bg-white dark:bg-slate-800">
                <CardContent className="pt-8 pb-8">
                  <Badge className="mb-4 bg-purple-500 text-white">
                    MELHOR CUSTO-BENEFÍCIO
                  </Badge>
                  <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">
                    Assinatura Premium
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-black text-purple-600">R$ 150</span>
                    <span className="text-slate-600 dark:text-slate-400 ml-2">/mês</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Voucher de R$ 100 vitalício</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Badge de Fundador</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Acesso prioritário</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">Suporte VIP</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-bold">1 personagem por mês</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-bold">Cancele quando quiser</span>
                    </li>
                  </ul>

                  <Button 
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-6 text-lg"
                    onClick={() => navigate('/colecoes')}
                  >
                    ASSINAR COM VOUCHER
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-slate-400">
                💳 Pagamento 100% seguro via PIX • 🔒 Dados protegidos • ✅ Confirmação automática
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Rápido */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white">
                Perguntas Frequentes
              </h2>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 pb-6">
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    O voucher de R$ 100 expira?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Não! O voucher é vitalício. Use quando quiser, sem prazo de validade.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 pb-6">
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Posso cancelar a assinatura?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Sim! Cancele quando quiser, sem multa. O voucher e os benefícios de fundador permanecem.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 pb-6">
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Como uso o voucher?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    O voucher fica disponível na sua conta. Ao fazer uma compra, ele é aplicado automaticamente ou você pode escolher quando usar.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 pb-6">
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Realmente são apenas 50 vouchers?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Sim! Queremos criar uma comunidade exclusiva de fundadores. Após os 50 primeiros, o programa fecha.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Final Urgente */}
        <section className="py-20 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 animate-pulse" style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', 
              backgroundSize: '50px 50px' 
            }}></div>
          </div>

          <div className="container max-w-4xl mx-auto text-center relative z-10 px-6">
            <Badge className="mb-6 bg-white text-amber-600 px-4 py-2 text-sm font-black shadow-2xl animate-bounce">
              ⚡ ÚLTIMAS VAGAS DISPONÍVEIS
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Não Perca Esta Oportunidade
            </h2>
            
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Apenas <span className="font-black text-yellow-300">50 vouchers</span> disponíveis. 
              Garanta o seu agora e faça parte da história da ORDAX!
            </p>

            <Button
              size="lg"
              className="bg-white text-amber-600 hover:bg-yellow-50 font-black px-12 py-8 text-2xl shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all mb-6"
              onClick={() => navigate('/colecoes')}
            >
              <Gift className="mr-3 h-8 w-8" />
              GARANTIR MEU VOUCHER AGORA
              <ArrowRight className="ml-3 h-8 w-8" />
            </Button>

            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-300" />
                <span>Pagamento Seguro</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span>Ativação Imediata</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-300" />
                <span>Status Vitalício</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Simples */}
        <footer className="py-8 px-6 bg-slate-900 text-white border-t border-slate-800">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              ORDAX © 2026 - Plataforma de Colecionáveis Premium
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
