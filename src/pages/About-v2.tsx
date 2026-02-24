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
import { Sparkles, Package, Palette, Clock } from "lucide-react";

export default function AboutV2() {
  return (
    <AppShell>
      <SEOHead
        title="Sobre a Ordax - Colecionáveis Premium Artesanais"
        description="Ordax é a plataforma brasileira de colecionáveis artesanais premium. Produção sob encomenda com qualidade excepcional e acompanhamento em tempo real."
        keywords={["sobre", "ordax", "colecionáveis", "artesanal", "premium", "brasileiro"]}
        type="website"
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-foreground to-foreground/95 text-background border-b border-white/10 -mx-8 sm:-mx-12">
        <div className="container px-8 py-20 sm:px-12 sm:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-medium tracking-widest text-background/60 uppercase mb-6">
              Sobre a Ordax
            </p>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Colecionáveis premium
              <br />
              feitos para você.
            </h1>
            <p className="text-xl text-background/80 leading-relaxed max-w-2xl mx-auto">
              Ordax é a plataforma brasileira especializada em colecionáveis artesanais de alta
              qualidade, produzidos sob encomenda com atenção aos detalhes.
            </p>
          </div>
        </div>
      </section>

      {/* O que é Ordax */}
      <section className="container py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">O que é a Ordax</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para colecionadores que buscam peças únicas e personalizadas
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Catálogo Vivo</h3>
              <p className="text-sm text-muted-foreground">
                Centenas de modelos disponíveis para produção
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Sob Encomenda</h3>
              <p className="text-sm text-muted-foreground">
                Cada peça é produzida especialmente para você
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Acompanhamento</h3>
              <p className="text-sm text-muted-foreground">Timeline visual do início ao fim</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Qualidade Premium</h3>
              <p className="text-sm text-muted-foreground">
                Acabamento artesanal e inspeção rigorosa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Diferenciais */}
        <div className="rounded-lg border-2 border-foreground bg-card p-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-6 text-center">Por que escolher a Ordax</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-lg mb-2">🎨 Produção Artesanal</h4>
              <p className="text-muted-foreground">
                Cada peça passa por modelagem 3D, impressão em resina de alta qualidade, acabamento
                manual e pintura artística feita à mão.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">📦 Personalização Total</h4>
              <p className="text-muted-foreground">
                Escolha escala, acabamento, cores e detalhes. Você define como quer sua peça, nós
                validamos a viabilidade e produzimos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">⏱️ Transparência</h4>
              <p className="text-muted-foreground">
                Acompanhe cada etapa da produção com fotos e atualizações em tempo real. Sem
                surpresas, sem mistério.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">✨ Peças Únicas</h4>
              <p className="text-muted-foreground">
                Por ser 100% artesanal, nenhuma peça é idêntica à outra. Cada entrega é exclusiva e
                especial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Como funciona</h2>
              <p className="text-lg text-muted-foreground">
                Do pedido à entrega, tudo organizado e transparente
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  num: 1,
                  title: "Escolha seu modelo",
                  desc: "Navegue pelo catálogo e selecione a peça desejada",
                },
                {
                  num: 2,
                  title: "Personalize",
                  desc: "Defina escala, acabamento e detalhes específicos",
                },
                {
                  num: 3,
                  title: "Solicite orçamento",
                  desc: "Receba prazo e valor personalizado em até 48h",
                },
                {
                  num: 4,
                  title: "Aprovação",
                  desc: "Confirme o pedido e acompanhe a produção",
                },
                {
                  num: 5,
                  title: "Produção",
                  desc: "Veja fotos e atualizações de cada etapa",
                },
                {
                  num: 6,
                  title: "Entrega",
                  desc: "Receba sua peça com embalagem premium",
                },
              ].map((step) => (
                <Card key={step.num} className="border-border shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold">
                        {step.num}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nosso Processo */}
      <section className="container py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Nosso Processo de Produção</h2>
          <p className="text-lg text-muted-foreground">
            Tecnologia e artesanato trabalhando juntos
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <ol className="space-y-6">
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                1
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Modelagem 3D</h3>
                <p className="text-muted-foreground">
                  Criação ou adaptação do modelo digital com atenção aos detalhes e proporções.
                </p>
              </div>
            </li>
            <Separator />
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Impressão 3D</h3>
                <p className="text-muted-foreground">
                  Impressão em resina de alta qualidade, garantindo definição e durabilidade.
                </p>
              </div>
            </li>
            <Separator />
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                3
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Acabamento Manual</h3>
                <p className="text-muted-foreground">
                  Lixamento, tratamento de superfície e preparação para pintura.
                </p>
              </div>
            </li>
            <Separator />
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                4
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Pintura Artística</h3>
                <p className="text-muted-foreground">
                  Pintura à mão com técnicas profissionais, seguindo referências específicas.
                </p>
              </div>
            </li>
            <Separator />
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                5
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Inspeção de Qualidade</h3>
                <p className="text-muted-foreground">
                  Verificação rigorosa de acabamento, pintura e detalhes antes do envio.
                </p>
              </div>
            </li>
            <Separator />
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                6
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">Embalagem e Envio</h3>
                <p className="text-muted-foreground">
                  Embalagem premium com proteção adequada para garantir entrega perfeita.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground italic">
          Tempo médio de produção: 15 a 45 dias, dependendo da complexidade e escala da peça.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Perguntas Frequentes</h2>
              <p className="text-lg text-muted-foreground">
                Tudo o que você precisa saber sobre a Ordax
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="prazo" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Qual o prazo de produção?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    O prazo varia de 15 a 45 dias dependendo da complexidade do modelo, escala e
                    acabamento solicitado. Após você montar o orçamento, retornamos com uma previsão
                    clara e você acompanha tudo pela timeline.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="escala" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Como funciona a escala?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    A escala define o tamanho final da peça (ex: 1/6 = aproximadamente 30cm para um
                    personagem humano). Você pode informar a escala desejada ou o tamanho
                    aproximado, e validamos a melhor opção técnica e de custo.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="personalizacao" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Posso personalizar a pintura?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    Sim! A pintura pode seguir referências específicas como cenas, skins
                    alternativas ou versões especiais. Basta enviar as referências no campo de
                    observações do orçamento.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="acompanhamento" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Como acompanho meu pedido?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    Através da timeline visual na plataforma Ordax. Você recebe atualizações com
                    fotos de cada etapa: modelagem, impressão, acabamento, pintura e finalização.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="entrega" className="px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Como é a entrega?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    Enviamos com embalagem premium e proteção adequada para o tipo de peça. No
                    retorno do orçamento, confirmamos a modalidade de frete mais adequada para seu
                    destino.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container py-16 max-w-4xl">
        <Card className="border-2 border-foreground shadow-lg overflow-hidden">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Pronto para sua próxima peça?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore nosso catálogo e solicite um orçamento personalizado. Transformamos sua ideia
              em realidade com qualidade premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 h-12 px-8"
              >
                <a href="/">Explorar Catálogo</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8">
                <a href="/orcamento/carrinho">Solicitar Orçamento</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
