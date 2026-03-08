// @ts-nocheck
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, CreditCard, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductionLimitBadge } from "@/components/production/ProductionLimitBadge";
import { useCollectionPricing, useGlobalPricingSettings } from "@/hooks/useCollectionPricing";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function BuyCharacter() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSystemSettings();

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

  // Buscar preços dinâmicos
  const { data: pricing, isLoading: isPricingLoading } = useCollectionPricing(collection?.id);

  // Buscar configurações globais para pegar o desconto PIX
  const { data: globalSettings } = useGlobalPricingSettings();

  if (isLoading || isPricingLoading) {
    return (
      <AppShell>
        <div className="container max-w-4xl py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando informações...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!collection) {
    return (
      <AppShell>
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Coleção não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            A coleção que você procura não existe ou foi removida.
          </p>
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

  // Pegar o personagem do mês atual (revealed)
  const currentMonthCharacter = characters.find((c) => c.status === "revealed");

  // Valores de preço (com fallback para valores padrão)
  const priceFull = pricing?.price_full || settings?.default_price_full || 500;
  const pricePix = pricing?.price_pix || settings?.default_price_pix || 475;
  const depositAmount = pricing?.deposit_amount || settings?.default_deposit_amount || 100;
  const remainingPix = pricing?.remaining_pix || pricePix - depositAmount;
  const remainingFull = pricing?.remaining_full || priceFull - depositAmount;
  const pixDiscount =
    globalSettings?.pix_discount_percentage || settings?.pix_discount_percentage || 5;

  return (
    <AppShell>
      <SEOHead
        title={`Comprar Peça Avulsa - ${collection.name}`}
        description={`Compre uma peça avulsa da coleção ${collection.name}`}
        keywords={["compra avulsa", "peça única", collection.name]}
      />

      <div className="container max-w-5xl py-12">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Compra Avulsa</h1>
            <p className="text-muted-foreground text-lg">
              Coleção: <span className="font-semibold text-foreground">{collection.name}</span>
            </p>
          </div>

          {/* Valor da Peça */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Valor da Peça</p>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-5xl font-bold text-primary">R$ {priceFull.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pagamento à vista:{" "}
                <span className="font-semibold text-foreground">R$ {pricePix.toFixed(2)}</span> ou
                até 6x sem juros no cartão
              </p>
            </CardContent>
          </Card>
        </div>

        {!currentMonthCharacter ? (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">Nenhum personagem disponível</h3>
              <p className="text-muted-foreground mb-6">
                Não há personagem do mês disponível para compra avulsa no momento.
              </p>
              <Button asChild>
                <Link to={`/colecoes/${slug}/assinar`}>Ver Planos de Assinatura</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Informações da Compra */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Sistema de Reserva de Produção</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sistema de Reserva */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para garantir sua peça neste ciclo:
                    </p>
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-xl p-5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-primary/20">
                          <span className="font-semibold">Reserva:</span>
                          <span className="text-2xl font-bold text-primary">
                            R$ {depositAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Saldo:</span>
                          <span className="text-lg font-semibold">
                            R$ {remainingFull.toFixed(2)} quando a peça estiver finalizada
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pagamento do Saldo */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-semibold mb-3">Pagamento do saldo:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">• À vista:</span>
                        <span className="font-semibold">R$ {remainingPix.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">• Até 6x sem juros no cartão</span>
                      </div>
                    </div>
                  </div>

                  {/* Processo */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Como Funciona</h3>

                    <div className="space-y-3">
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold shadow-md">
                          1
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-base mb-1">Reserva da Produção</p>
                          <p className="text-sm text-muted-foreground">
                            Você garante sua vaga no ciclo atual com o pagamento da reserva.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold shadow-md">
                          2
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-base mb-1">Produção Artesanal</p>
                          <p className="text-sm text-muted-foreground">
                            A peça é esculpida e pintada à mão.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold shadow-md">
                          3
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-base mb-1">Acompanhamento</p>
                          <p className="text-sm text-muted-foreground">
                            Você recebe atualizações do processo.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold shadow-md">
                          4
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-base mb-1">Pagamento do Saldo</p>
                          <p className="text-sm text-muted-foreground">
                            Após finalização, o saldo é liberado para pagamento.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold shadow-md">
                          5
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-semibold text-base mb-1">Envio Seguro</p>
                          <p className="text-sm text-muted-foreground">
                            Entrega com rastreamento e embalagem premium em MDF.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefícios - Inclui */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-5">
                    <h4 className="font-bold text-green-900 mb-4">Inclui</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-900">Peça artesanal pintada à mão</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-900">Caixa premium em MDF</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-900">Certificado de autenticidade</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-900">Atualizações do processo</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-900">
                          Garantia contra defeitos de fabricação
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personagem do Mês */}
            <div>
              {/* Contador de Vagas */}
              <ProductionLimitBadge />

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-xl">Personagem do Ciclo Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
                    <div className="flex flex-col items-center text-center">
                      {currentMonthCharacter.image_url && (
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted mb-6 max-w-sm border-4 border-white shadow-xl">
                          <img
                            src={currentMonthCharacter.image_url}
                            alt={currentMonthCharacter.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <h3 className="text-3xl font-black mb-3 text-primary">
                        {currentMonthCharacter.name}
                      </h3>
                      {currentMonthCharacter.description && (
                        <p className="text-muted-foreground mb-6 text-base leading-relaxed max-w-md">
                          {currentMonthCharacter.description}
                        </p>
                      )}

                      <div className="w-full space-y-3">
                        <Button
                          className="w-full shadow-lg hover:shadow-xl transition-all"
                          size="lg"
                          onClick={async () => {
                            if (!user) {
                              navigate("/login");
                              return;
                            }

                            try {
                              // Buscar ciclo atual aberto
                              const { data: currentCycle, error: cycleError } = await supabase
                                .from("cycles")
                                .select("id")
                                .eq("status", "open")
                                .single();

                              if (cycleError || !currentCycle) {
                                toast({
                                  title: "Erro",
                                  description: "Nenhum ciclo de produção aberto no momento.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Criar compra avulsa via edge function
                              const { data, error } = await supabase.functions.invoke(
                                'create-standalone-purchase',
                                {
                                  body: {
                                    collectionId: collection.id,
                                    cycleId: currentCycle.id,
                                    characterId: currentMonthCharacter.id, // Personagem escolhido
                                    depositVoucherUrl: null // Será enviado depois
                                  }
                                }
                              );

                              if (error) throw error;

                              if (!data.success) {
                                throw new Error(data.error || 'Erro ao criar compra');
                              }

                              toast({
                                title: "Compra criada!",
                                description: `Sua reserva de ${currentMonthCharacter.name} foi criada com sucesso.`,
                              });

                              // Redirecionar para página de acompanhamento
                              setTimeout(() => {
                                navigate(`/meus-pedidos`);
                              }, 1500);
                            } catch (error: any) {
                              console.error("Erro ao criar compra:", error);
                              
                              let errorMessage = "Ocorreu um erro ao criar sua compra.";
                              
                              if (error.message?.includes('CUTOFF_PASSED')) {
                                errorMessage = "O prazo para compras deste ciclo já passou.";
                              } else if (error.message?.includes('CAPACITY_EXCEEDED')) {
                                errorMessage = "Capacidade esgotada para este ciclo.";
                              } else if (error.message?.includes('CYCLE_NOT_OPEN')) {
                                errorMessage = "Ciclo não está aberto para novas compras.";
                              }
                              
                              toast({
                                title: "Erro ao criar compra",
                                description: errorMessage,
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <span className="text-lg">
                            Reservar com R$ {depositAmount.toFixed(2)}
                          </span>
                        </Button>
                        <p className="text-sm text-center text-muted-foreground">
                          Pagamento do saldo após conclusão da peça.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info sobre assinatura - Sutil */}
                  <div className="mt-6 p-4 bg-muted/30 border border-muted rounded-lg">
                    <p className="text-xs text-muted-foreground text-center mb-2">
                      Quer receber personagens todos os meses?
                    </p>
                    <Button asChild variant="ghost" size="sm" className="w-full text-xs h-8">
                      <Link to={`/colecoes/${slug}/assinar`}>
                        Conheça os Planos de Assinatura →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Formas de Pagamento */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>💳</span>
                    Formas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 p-4 border-2 rounded-lg">
                    <Smartphone className="w-6 h-6 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-sm">Pagamento à Vista</p>
                      <p className="text-xs text-muted-foreground">PIX ou transferência bancária</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Cartão de Crédito</p>
                      <p className="text-xs text-muted-foreground">Parcelamento disponível</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
