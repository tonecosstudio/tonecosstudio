/**
 * Componente: Calculadora de Poder de Compra
 *
 * Mostra o que o usuário pode comprar com os coins do plano
 * Baseado nos preços atuais de /admin/coins
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calculator,
  Star,
  Package,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { usePurchasingPower, useValidatePlan } from "@/hooks/useCharacterPricesReference";
import { Separator } from "@/components/ui/separator";

interface PurchasingPowerCalculatorProps {
  totalCoins: number;
  planName?: string;
}

export function PurchasingPowerCalculator({
  totalCoins,
  planName = "Este plano",
}: PurchasingPowerCalculatorProps) {
  const purchasingPower = usePurchasingPower(totalCoins);
  const validation = useValidatePlan(totalCoins);

  if (!purchasingPower) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { canBuy, remaining, suggestions } = purchasingPower;

  // Determinar cor do alerta baseado na validação
  const alertVariant =
    validation.severity === "error"
      ? "destructive"
      : validation.severity === "warning"
        ? "default"
        : "default";

  const alertIcon =
    validation.severity === "error"
      ? AlertTriangle
      : validation.severity === "warning"
        ? Lightbulb
        : CheckCircle2;

  const AlertIcon = alertIcon;

  const purchaseOptions = [
    {
      type: "Coleção Ativa",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      count: canBuy.colecaoAtiva,
      remaining: remaining.colecaoAtiva,
    },
    {
      type: "Coleção Secundária",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      count: canBuy.colecaoSecundaria,
      remaining: remaining.colecaoSecundaria,
    },
    {
      type: "Catálogo Geral",
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      count: canBuy.catalogoGeral,
      remaining: remaining.catalogoGeral,
    },
    {
      type: "Premium",
      icon: Sparkles,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      count: canBuy.premium,
      remaining: remaining.premium,
    },
  ];

  return (
    <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Poder de Compra</CardTitle>
            <CardDescription className="text-base mt-1">
              {planName} • {totalCoins.toLocaleString("pt-BR")} coins
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Alert */}
        <Alert
          variant={alertVariant}
          className={
            validation.severity === "error"
              ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
              : validation.severity === "warning"
                ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
                : "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
          }
        >
          <AlertIcon
            className={`h-4 w-4 ${
              validation.severity === "error"
                ? "text-red-600"
                : validation.severity === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          />
          <AlertDescription>
            <strong>{validation.message}</strong>
            {validation.suggestion && <p className="mt-2 text-sm">{validation.suggestion}</p>}
          </AlertDescription>
        </Alert>

        {/* Purchase Options Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {purchaseOptions.map((option) => {
            const IconComponent = option.icon;
            const hasRemaining = option.remaining > 0;

            return (
              <Card
                key={option.type}
                className={`${option.bgColor} border-2 ${option.borderColor}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <IconComponent className={`h-5 w-5 ${option.color}`} />
                    <h4 className="font-semibold text-sm">{option.type}</h4>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Pode comprar</p>
                      <p className={`text-4xl font-bold ${option.color}`}>{option.count}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.count === 1 ? "personagem" : "personagens"}
                      </p>
                    </div>

                    {hasRemaining && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Sobram: {option.remaining} coins
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500 rounded-xl shadow-md">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-4">Combinações Possíveis</h4>
                <div className="space-y-3">
                  {suggestions.map((suggestion: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-md">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total de Coins</p>
              <p className="text-2xl font-bold text-primary">
                {totalCoins.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Melhor Opção</p>
              <p className="text-2xl font-bold text-green-600">{canBuy.colecaoAtiva}</p>
              <p className="text-xs text-muted-foreground">personagens (Coleção Ativa)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Coins Restantes</p>
              <p className="text-2xl font-bold text-yellow-600">{remaining.colecaoAtiva}</p>
              <p className="text-xs text-muted-foreground">
                {remaining.colecaoAtiva > 0 ? "não utilizados" : "uso completo"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
