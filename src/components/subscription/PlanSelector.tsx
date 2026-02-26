import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: "trimestral" | "semestral";
  price_full: number;
  price_pix: number;
  deliveries_total: number;
  includes_bonus: boolean;
  is_active: boolean;
}

interface PlanSelectorProps {
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  disabled?: boolean;
  plans: SubscriptionPlan[];
  isLoading?: boolean;
}

export function PlanSelector({
  selectedPlanId,
  onPlanSelect,
  disabled = false,
  plans,
  isLoading = false,
}: PlanSelectorProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escolha seu Plano</CardTitle>
          <CardDescription>Carregando planos disponíveis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escolha seu Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum plano disponível no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolha seu Plano</CardTitle>
        <CardDescription>
          Planos com preço fixo - escolha a coleção depois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPlanId}
          onValueChange={onPlanSelect}
          disabled={disabled}
        >
          <div className="space-y-3">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const priceFormatted = plan.price_full.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });
              const pixPriceFormatted = plan.price_pix.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });

              return (
                <label
                  key={plan.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value={plan.id}
                    id={plan.id}
                    className="mt-1"
                    disabled={disabled}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{plan.name}</span>
                      {plan.includes_bonus && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Peça Bônus
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {plan.deliveries_total} entregas consecutivas • 1 coleção
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {priceFormatted}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ou até 6x sem juros
                        </span>
                      </div>
                      <p className="text-sm text-green-600 font-medium">
                        À vista no PIX: {pixPriceFormatted}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
