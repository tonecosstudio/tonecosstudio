import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, Shield, Palette, Clock, Package, Eye } from "lucide-react";

export default function AboutFinal() {
  return (
    <AppShell>
      <SEOHead
        title="Sobre a Ordax - Colecionáveis Premium Artesanais"
        description="Ordax é a plataforma brasileira de colecionáveis artesanais premium. Catálogo organizado, processo transparente e qualidade garantida em cada peça."
        keywords={['sobre', 'ordax', 'colecionáveis', 'artesanal', 'premium', 'qualidade']}
        type="website"
      />
      
      {/* Hero */}
      <section className="bg-gradient-to-b from-foreground to-foreground/95 text-background border-b border-white/10 -mx-8 sm:-mx-12">
        <div className="container px-8 py-20 sm:px-12 sm:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Colecionáveis que<br />
              contam histórias.
            </h1>
            <p className="text-xl text-background/80 leading-relaxed max-w-2xl mx-auto">
              Ordax transforma a experiência de adquirir colecionáveis artesanais: 
              catálogo organizado, processo transparente e qualidade garantida.
            </p>
          </div>
        </div>
      </section>

      {/* Nossa Missão */}
      <section className="container py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-6">Nossa Missão</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Tornar colecionáveis artesanais premium acessíveis através de uma plataforma organizada, 
            transparente e confiável. Cada peça é produzida sob encomenda com atenção aos detalhes 
            e acompanhamento completo.
          </p>
        </div>
      </section>

      {/* Como Trabalhamos */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Como Trabalhamos</h2>
              <p className="text-lg text-muted-foreground">
                Tecnologia de organização + Produção artesanal especializada = Experiência completa
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Plataforma Ordax */}
              <Card className="border-2 border-foreground shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center">
                      <Package className="h-6 w-6 text-background" />
                    </div>
                    <h3 className="text-2xl font-bold">Plataforma Ordax</h3>
                  </div>
                  
                  <div className="space-y-4 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Catálogo digital organizado por franquias e categorias</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Sistema de pedidos personalizado com orçamento sob medida</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Timeline de acompanhamento com fotos em tempo real</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Comunicação direta e transparente durante todo processo</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Garantia de qualidade e suporte completo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produção Artesanal */}
              <Card className="border-2 border-border shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Palette className="h-6 w-6 text-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold">Produção Artesanal</h3>
                  </div>
                  
                  <div className="space-y-4 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Produção realizada por estúdio criativo especializado</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Impressão 3D em resina de alta qualidade</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Acabamento manual detalhado e profissional</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Pintura artística feita à mão por profissionais</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-foreground font-bold">•</span>
                      <p>Inspeção rigorosa antes do envio</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-6 pt-4 border-t border-border">
                    Produção principal: Tonecos Studios
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Nossos Valores */}
      <section className="container py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Nossos Valores</h2>
          <p className="text-lg text-muted-foreground">
            O que guia cada decisão na Ordax
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-3">Qualidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cada peça passa por inspeção rigorosa antes do envio. Padrões elevados em todas as etapas.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-3">Transparência</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você acompanha cada etapa com fotos e atualizações. Sem mistérios, sem surpresas.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-3">Personalização</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sua peça, suas especificações, seu resultado. Customização completa disponível.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-3">Confiabilidade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Prazos claros, comunicação direta, compromisso cumprido. Você pode confiar.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Processo Detalhado */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Processo de Produção</h2>
              <p className="text-lg text-muted-foreground">
                6 etapas que garantem qualidade premium
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <CardContent className="p-8">
                <ol className="space-y-6">
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      1
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Modelagem 3D</h3>
                      <p className="text-muted-foreground">
                        Design digital preciso com atenção aos detalhes e proporções corretas.
                      </p>
                    </div>
                  </li>
                  <Separator />
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      2
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Impressão 3D</h3>
                      <p className="text-muted-foreground">
                        Impressão em resina de alta qualidade, garantindo definição e durabilidade.
                      </p>
                    </div>
                  </li>
                  <Separator />
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      3
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Acabamento Manual</h3>
                      <p className="text-muted-foreground">
                        Lixamento, tratamento de superfície e preparação profissional para pintura.
                      </p>
                    </div>
                  </li>
                  <Separator />
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      4
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Pintura Artística</h3>
                      <p className="text-muted-foreground">
                        Pintura à mão com técnicas profissionais, seguindo referências específicas quando solicitado.
                      </p>
                    </div>
                  </li>
                  <Separator />
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      5
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Inspeção de Qualidade</h3>
                      <p className="text-muted-foreground">
                        Verificação rigorosa de acabamento, pintura e detalhes antes da aprovação final.
                      </p>
                    </div>
                  </li>
                  <Separator />
                  <li className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                      6
                    </span>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Embalagem e Envio</h3>
                      <p className="text-muted-foreground">
                        Embalagem premium com proteção adequada para garantir entrega perfeita.
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground italic">
              Tempo médio estimado de produção: 15 a 45 dias úteis, podendo variar conforme complexidade e escala.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Perguntas Frequentes</h2>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa saber sobre a Ordax
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="producao" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Quem produz as peças?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                As peças são produzidas artesanalmente por estúdios criativos especializados, seguindo os 
                padrões de qualidade, processo e acompanhamento definidos pela Ordax.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="estudio" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Quem é o estúdio responsável pela produção?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                A produção principal é realizada pela Tonecos Studios, estúdio especializado que integra 
                o ecossistema Ordax.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prazo" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Qual o prazo de produção?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                O prazo varia de 15 a 45 dias dependendo da complexidade do modelo, escala e acabamento solicitado. 
                Após você solicitar o orçamento, retornamos com uma previsão clara e você acompanha tudo pela timeline.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="garantia" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Qual a garantia de qualidade?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                Todas as peças passam por inspeção rigorosa antes do envio. Caso haja algum problema de fabricação, 
                oferecemos suporte completo para resolução, incluindo reparo ou substituição quando necessário.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="personalizacao" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Posso personalizar a peça?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                Sim! Você pode definir escala, cores, acabamento e enviar referências específicas. 
                Validamos a viabilidade técnica e incluímos no orçamento personalizado.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="acompanhamento" className="border-b border-border px-6">
              <AccordionTrigger className="text-left font-semibold">
                Como acompanho meu pedido?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                Através da timeline visual na plataforma Ordax. Você recebe atualizações com fotos de cada etapa: 
                modelagem, impressão, acabamento, pintura e finalização.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="acompanhamento-digital" className="px-6">
              <AccordionTrigger className="text-left font-semibold">
                Como funciona o acompanhamento digital?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                O acompanhamento ocorre de forma digital, com registros visuais enviados durante as etapas 
                de produção. Você recebe fotos e atualizações em tempo real através da timeline na plataforma.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </section>

      {/* CTA Final */}
      <section className="bg-foreground text-background -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Pronto para sua próxima peça?
            </h2>
            <p className="text-xl text-background/80 mb-8 max-w-2xl mx-auto">
              Explore nosso catálogo e solicite um orçamento personalizado. 
              Transformamos sua ideia em realidade com qualidade premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base">
                <a href="/">Explorar Catálogo</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base border-background/20 text-background hover:bg-background/10">
                <a href="/orcamento/carrinho">Solicitar Orçamento</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
