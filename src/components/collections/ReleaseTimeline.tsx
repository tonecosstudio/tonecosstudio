import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Truck, CheckCircle } from "lucide-react";

export function ReleaseTimeline() {
  const timeline = [
    {
      phase: "Vendas",
      period: "15/02 – 15/03",
      duration: "30 dias",
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Período de vendas aberto para todas as coleções",
      status: "active"
    },
    {
      phase: "Produção",
      period: "16/03 – 30/03",
      duration: "15 dias",
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Produção artesanal das peças",
      status: "upcoming"
    },
    {
      phase: "Envio",
      period: "Até 5º dia útil",
      duration: "5 dias úteis",
      icon: Truck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Embalagem e postagem (considera feriados)",
      status: "upcoming"
    },
    {
      phase: "Entrega",
      period: "Abril",
      duration: "7-15 dias",
      icon: CheckCircle,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Receba em casa",
      status: "upcoming"
    }
  ];

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">📊 Cronograma de Lançamento</CardTitle>
            <CardDescription className="text-base mt-2">
              Todas as coleções seguem o mesmo padrão de lançamento
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            Lote Atual
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {timeline.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.status === "active";
            
            return (
              <div
                key={index}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isActive 
                    ? "border-primary bg-primary/5 shadow-lg" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Número da Fase */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border-2 border-current flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Ícone */}
                <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{item.phase}</h3>
                    {isActive && (
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        Agora
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.period}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.duration}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Linha conectora (exceto último) */}
                {index < timeline.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Nota Importante */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">📅 Padrão fixo:</strong> Todas as coleções e personagens são lançados no dia 15 de cada mês. 
            Quando um lote encerra (dia 15), o próximo já começa automaticamente. 
            Envio em até 5 dias úteis (considera feriados). 
            Prazo total da compra até recebimento: <strong className="text-foreground">50-60 dias</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
