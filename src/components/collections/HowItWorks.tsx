import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar, Gift, Check } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Package,
      title: "Escolha sua Coleção",
      description:
        "Selecione uma ou mais coleções temáticas. Thundercats, X-Men ou Vilões do Homem-Aranha.",
    },
    {
      icon: Calendar,
      title: "Assine Bimestralmente",
      description: "Pagamento automático a cada 2 meses. Planos flexíveis disponíveis.",
    },
    {
      icon: Gift,
      title: "Receba Surpresas",
      description: "Um personagem diferente a cada entrega. Revelação 1 mês antes do envio.",
    },
  ];

  const benefits = [
    "Personagem surpresa a cada 2 meses",
    "Embalagem premium em MDF",
    "Produção artesanal Tonecos Studios",
    "Revelação antecipada do próximo personagem",
    "Prioridade na produção",
    "Plano anual com 10% de desconto",
    "Pode assinar múltiplas coleções",
    "Cancele quando quiser",
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="container max-w-6xl">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Como Funciona</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simples, transparente e feito para colecionadores
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 sm:grid-cols-3 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="pt-12 pb-8 px-6">
                  <div className="absolute top-4 right-4 text-6xl font-bold text-muted/10">
                    {index + 1}
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits */}
        <Card className="bg-muted/50">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">Benefícios da Assinatura</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
