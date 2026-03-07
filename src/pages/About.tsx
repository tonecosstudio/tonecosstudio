import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, Shield, Palette, Clock, Heart, Zap } from "lucide-react";

export default function About() {
  return (
    <AppShell>
      <SEOHead
        title="Sobre a Ordax - Colecionáveis Premium"
        description="Ordax é a plataforma brasileira especializada em colecionáveis premium sob encomenda. Tecnologia, qualidade e transparência em cada peça."
        keywords={[
          "sobre",
          "ordax",
          "colecionáveis premium",
          "brasileiro",
          "impressão 3d",
          "pintura profissional",
        ]}
        type="website"
      />

      {/* Hero */}
      <section className="bg-foreground text-background border-b border-white/10 -mx-8 sm:-mx-12">
        <div className="container px-8 py-20 sm:px-12 sm:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-medium tracking-widest text-background/60 uppercase mb-6">
              Sobre a Ordax
            </p>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Colecionáveis que contam histórias
            </h1>
            <p className="text-xl sm:text-2xl text-background/80 leading-relaxed max-w-3xl mx-auto">
              Transformamos a experiência de adquirir colecionáveis premium através de tecnologia,
              transparência e qualidade excepcional.
            </p>
          </div>
        </div>
      </section>

      {/* Nossa Missão */}
      <article className="container py-20 max-w-6xl">
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">Nossa Missão</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Tornar colecionáveis premium acessíveis através de uma plataforma organizada,
              transparente e confiável. Cada peça é produzida sob encomenda com atenção aos detalhes
              e acompanhamento completo.
            </p>
          </div>
        </section>

        {/* Como Trabalhamos */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">Como Trabalhamos</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tecnologia de organização + Produção especializada = Experiência completa
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Plataforma Ordax */}
            <div className="rounded-2xl border-2 border-border bg-gradient-to-br from-card to-card/50 p-10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-foreground text-background">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold">Plataforma Ordax</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Catálogo digital</strong> organizado por
                    franquias e categorias
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Sistema de pedidos</strong> personalizado
                    com orçamento sob medida
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Timeline de acompanhamento</strong> com
                    fotos em tempo real
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Comunicação direta</strong> e transparente
                    durante todo processo
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Garantia de qualidade</strong> e suporte
                    completo
                  </p>
                </li>
              </ul>
            </div>

            {/* Produção Profissional */}
            <div className="rounded-2xl border-2 border-border bg-gradient-to-br from-card to-card/50 p-10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-foreground text-background">
                  <Palette className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold">Produção Profissional</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Produção realizada</strong> por estúdio
                    criativo especializado
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Impressão 3D</strong> em resina de alta
                    qualidade
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Acabamento profissional</strong> detalhado
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Pintura profissional</strong> feita por
                    especialistas
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Inspeção rigorosa</strong> antes do envio
                  </p>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground italic">
                  Produção principal: <strong className="text-foreground">Tonecos Studios</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Nossos Valores */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">Nossos Valores</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              O que guia cada decisão na Ordax
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-foreground text-background mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Qualidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cada peça passa por inspeção rigorosa antes do envio. Padrões elevados em todas as
                etapas.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-foreground text-background mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Transparência</h3>
              <p className="text-muted-foreground leading-relaxed">
                Você acompanha cada etapa com fotos e atualizações. Sem mistérios, sem surpresas.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-foreground text-background mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalização</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sua peça, suas especificações, seu resultado. Customização completa disponível.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 rounded-2xl bg-foreground text-background mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Confiabilidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Prazos claros, comunicação direta, compromisso cumprido. Você pode confiar.
              </p>
            </div>
          </div>
        </section>

        {/* Processo de Produção */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Processo de Produção
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              6 etapas que garantem qualidade premium
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold mb-3">Modelagem 3D</h3>
              <p className="text-muted-foreground leading-relaxed">
                Design digital preciso com atenção aos detalhes e proporções corretas.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold mb-3">Impressão 3D</h3>
              <p className="text-muted-foreground leading-relaxed">
                Impressão em resina de alta qualidade, garantindo definição e durabilidade.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold mb-3">Acabamento Manual</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lixamento, tratamento de superfície e preparação profissional para pintura.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                4
              </div>
              <h3 className="text-2xl font-bold mb-3">Pintura Artística</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pintura à mão com técnicas profissionais, seguindo referências específicas quando
                solicitado.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                5
              </div>
              <h3 className="text-2xl font-bold mb-3">Inspeção de Qualidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Verificação rigorosa de acabamento, pintura e detalhes antes da aprovação final.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-foreground text-background font-bold text-2xl mb-6">
                6
              </div>
              <h3 className="text-2xl font-bold mb-3">Embalagem e Envio</h3>
              <p className="text-muted-foreground leading-relaxed">
                Embalagem premium com proteção adequada para garantir entrega perfeita.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground italic">
              Tempo médio estimado de produção:{" "}
              <strong className="text-foreground">30 dias (mês completo)</strong>, com envio na segunda quinzena do mês seguinte (a partir do dia 15).
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-center">
            Perguntas Frequentes
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transparência faz parte do premium: prazos, escala e acabamento variam por peça.
          </p>

          <div className="rounded-lg border border-border bg-card shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="prazo" className="border-b border-border px-6">
                <AccordionTrigger className="text-left font-semibold">
                  Qual o prazo de produção?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  O prazo depende da complexidade do modelo, da escala e do acabamento solicitado.
                  Após você montar o orçamento, retornamos com uma previsão clara de produção e
                  entrega.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="escala" className="border-b border-border px-6">
                <AccordionTrigger className="text-left font-semibold">
                  Como funciona tamanho/escala?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  A escala define presença e detalhes (e também impacta tempo e custo). No orçamento
                  você pode informar a escala desejada — ou descrever o tamanho aproximado — e
                  validamos a melhor solução.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pintura" className="border-b border-border px-6">
                <AccordionTrigger className="text-left font-semibold">
                  Vocês fazem pintura artística?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  Sim. A pintura é feita à mão e pode seguir referências específicas (cenas, skins,
                  versões alternativas) quando você enviar observações no pedido. Cada peça passa
                  por inspeção antes do envio.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="entrega" className="px-6">
                <AccordionTrigger className="text-left font-semibold">
                  Como é a entrega?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  Trabalhamos com envio conforme o destino e o tipo de peça. No retorno do
                  orçamento, confirmamos embalagem, proteção e modalidade de frete mais adequada
                  para garantir que a peça chegue perfeita.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="rounded-lg border border-border bg-card p-12 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Pronto para começar?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Explore nosso catálogo e solicite um orçamento personalizado para sua próxima peça.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <a href="/">Ver Catálogo</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/orcamento/carrinho">Fazer Orçamento</a>
              </Button>
            </div>
          </div>
        </section>
      </article>
    </AppShell>
  );
}
