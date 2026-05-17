import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, Users, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FunnelStage {
  name: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

interface ConversionFunnelProps {
  data: {
    visitors: number;
    leads: number;
    quotes: number;
    conversions: number;
  };
  className?: string;
}

export function ConversionFunnel({ data, className }: ConversionFunnelProps) {
  const stages: FunnelStage[] = [
    {
      name: "Visitantes",
      value: data.visitors,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      name: "Leads",
      value: data.leads,
      icon: ShoppingCart,
      color: "bg-purple-500",
    },
    {
      name: "Orçamentos",
      value: data.quotes,
      icon: CreditCard,
      color: "bg-amber-500",
    },
    {
      name: "Conversões",
      value: data.conversions,
      icon: CheckCircle2,
      color: "bg-green-500",
    },
  ];

  // Calcular percentuais
  const calculatePercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  const calculateConversionRate = (index: number) => {
    if (index === 0) return 100;
    return calculatePercentage(stages[index].value, stages[index - 1].value);
  };

  // Taxa de conversão geral
  const overallConversionRate = calculatePercentage(data.conversions, data.visitors);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <CardDescription>
          Taxa de conversão geral:{" "}
          <span className="font-semibold text-green-600">{overallConversionRate}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const conversionRate = calculateConversionRate(index);
            const progressValue = (stage.value / stages[0].value) * 100;

            return (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stage.color} bg-opacity-10`}>
                      <Icon className={`h-5 w-5 ${stage.color.replace("bg-", "text-")}`} />
                    </div>
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage.value.toLocaleString("pt-BR")} usuários
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">conversão</p>
                  </div>
                </div>

                <Progress value={progressValue} className="h-3" />

                {index < stages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">💡 Insights</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • {calculatePercentage(data.leads, data.visitors)}% dos visitantes se tornam leads
            </li>
            <li>• {calculatePercentage(data.quotes, data.leads)}% dos leads solicitam orçamento</li>
            <li>
              • {calculatePercentage(data.conversions, data.quotes)}% dos orçamentos convertem
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
