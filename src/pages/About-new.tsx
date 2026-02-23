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
import { Palette, Package, Sparkles, Users } from "lucide-react";

export default function AboutNew() {
  return (
    <AppShell>
      <SEOHead
        title="Sobre - Tonecos Studios & Ordax"
        description="Entenda a relação entre Tonecos Studios (o estúdio criativo) e Ordax (a plataforma). Colecionáveis artesanais premium feitos à mão."
        keywords={['sobre', 'tonecos studios', 'ordax', 'história', 'artesanal', 'washington']}
        type="website"
      />
      
      {/* Hero */}
      <section className="bg-gradient-to-b from-foreground to-foreground/95 text-background border-b border-white/10 -mx-8 sm:-mx-12">
        <div className="container px-8 py-20 sm:px-12 sm:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-medium tracking-widest text-background/60 uppercase mb-6">
              Sobre Nós
            </p>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Tonecos cria.<br />
              Ordax organiza.
            </h1>
            <p className="text-xl text-background/80 leading-relaxed max-w-2xl mx-auto">
              Dois nomes, um ecossistema. Entenda como funciona a relação entre o estúdio criativo e a plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* Explicação Clara */}
      <section className="container py-16 max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 mb-16">
          {/* Tonecos */}
          <Card className="border-2 border-foreground shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center">
                  <Palette className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Tonecos Studios</h2>
                  <p className="text-sm text-muted-foreground">O Estúdio Criativo</p>
                </div>
              </div>
              
              <p className="text-lg mb-6 leading-relaxed">
                <strong>Tonecos Studios</strong> é o estúdio brasileiro responsável pela criação e produção artesanal de colecionáveis premium.
              </p>

              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Criação:</strong> Design autoral e modelagem 3D</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Produção:</strong> Impressão 3D em resina de alta qualidade</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Acabamento:</strong> Tratamento manual e pintura artística</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Qualidade:</strong> Inspeção rigorosa antes do envio</p>
                </div>
              </div>

              <Separator className="my-6" />

              <p className="text-sm text-muted-foreground italic">
                Fundada por <strong className="text-foreground">Washington</strong>, artista e produtor por trás de cada peça.
              </p>
            </CardContent>
          </Card>

          {/* Ordax */}
          <Card className="border-2 border-border shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Ordax</h2>
                  <p className="text-sm text-muted-foreground">A Plataforma</p>
                </div>
              </div>
              
              <p className="text-lg mb-6 leading-relaxed">
                <strong>Ordax</strong> é o sistema que organiza, apresenta e gerencia toda a experiência do cliente com a Tonecos.
              </p>

              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Catálogo:</strong> Apresentação visual de todos os modelos</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Orçamentos:</strong> Sistema de pedidos personalizado</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Timeline:</strong> Acompanhamento da produção em tempo real</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-foreground">•</span>
                  <p><strong className="text-foreground">Experiência:</strong> Interface clara e organizada</p>
                </div>
              </div>

              <Separator className="my-6" />

              <p className="text-sm text-muted-foreground italic">
                Ordax não substitui a Tonecos — ela <strong className="text-foreground">estrutura</strong> e <strong className="text-foreground">potencializa</strong>.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analogia */}
        <div className="rounded-lg border border-border bg-muted/30 p-8 mb-16 text-center">
          <h3 className="text-2xl font-bold mb-4">Pense assim:</h3>
          <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Estúdio</p>
              <p className="text-lg font-semibold">Tonecos Studios</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl text-muted-foreground">+</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Plataforma</p>
              <p className="text-lg font-semibold">Ordax</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-6 max-w-2xl mx-auto">
            É como uma loja física (Tonecos) que tem um site organizado (Ordax). Um não existe sem o outro, mas cada um tem seu papel.
          </p>
        </div>
      </section>

      {/* Processo Artesanal */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Processo Artesanal Tonecos</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Cada peça passa por 6 etapas de produção manual, garantindo qualidade premium.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { num: 1, title: "Modelagem 3D", desc: "Design autoral ou licenciado" },
                { num: 2, title: "Impressão", desc: "Resina de alta qualidade" },
                { num: 3, title: "Acabamento", desc: "Tratamento manual detalhado" },
                { num: 4, title: "Pintura", desc: "Artística feita à mão" },
                { num: 5, title: "Inspeção", desc: "Controle de qualidade rigoroso" },
                { num: 6, title: "Embalagem", desc: "Proteção premium para envio" },
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

            <p className="mt-8 text-center text-sm text-muted-foreground italic max-w-2xl mx-auto">
              Por ser 100% artesanal, nenhuma peça é idêntica à outra. Cada entrega é única e exclusiva.
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="container py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Nossos Valores</h2>
          <p className="text-lg text-muted-foreground">
            O que guia cada decisão na Tonecos e na Ordax
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Qualidade</h3>
              <p className="text-sm text-muted-foreground">
                Cada peça é tratada como obra de arte
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Transparência</h3>
              <p className="text-sm text-muted-foreground">
                Prazos e processos sempre claros
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Artesanal</h3>
              <p className="text-sm text-muted-foreground">
                Feito à mão, com atenção aos detalhes
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-12 w-12 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Organização</h3>
              <p className="text-sm text-muted-foreground">
                Sistema claro e eficiente
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 -mx-8 sm:-mx-12 py-16">
        <div className="container px-8 sm:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Perguntas Frequentes</h2>
              <p className="text-lg text-muted-foreground">
                Transparência faz parte do premium
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="diferenca" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Qual a diferença entre Tonecos e Ordax?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    <strong className="text-foreground">Tonecos Studios</strong> é o estúdio que cria e produz as peças artesanais. 
                    <strong className="text-foreground"> Ordax</strong> é a plataforma digital que organiza o catálogo, pedidos e acompanhamento. 
                    Você compra da Tonecos, através da Ordax.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="prazo" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Qual o prazo de produção?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    O prazo varia conforme complexidade, escala e acabamento. Após você solicitar o orçamento pela Ordax,
                    a Tonecos retorna com uma previsão clara de produção e entrega.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="escala" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Como funciona tamanho/escala?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    A escala define presença, detalhes e também impacta tempo e custo. No orçamento você pode
                    informar a escala desejada (ex: 1/6, 1/4) ou o tamanho aproximado, e validamos a melhor solução.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pintura" className="border-b border-border px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    A pintura é personalizada?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    Sim! A pintura é feita à mão pela Tonecos e pode seguir referências específicas (cenas, skins, versões alternativas).
                    Basta enviar observações no pedido através da Ordax.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="acompanhamento" className="px-6">
                  <AccordionTrigger className="text-left font-semibold">
                    Posso acompanhar a produção?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                    Sim! A Ordax oferece uma timeline visual onde você acompanha cada etapa da produção em tempo real,
                    com fotos e atualizações da Tonecos.
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
              Pronto para começar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore o catálogo na Ordax e solicite um orçamento personalizado para sua próxima peça da Tonecos Studios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-12 px-8">
                <a href="/">Ver Catálogo</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8">
                <a href="/orcamento/carrinho">Fazer Orçamento</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
