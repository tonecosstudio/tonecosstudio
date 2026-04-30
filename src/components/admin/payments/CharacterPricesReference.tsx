/**
 * Componente: Referência de Preços de Personagens
 *
 * Exibe os preços atuais definidos em /admin/coins
 * Usado na página /admin/plans como referência
 *
 * SSOT: /admin/coins (somente leitura aqui)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Coins,
  Star,
  Package,
  ShoppingCart,
  Sparkles,
  ExternalLink,
  Info,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useCharacterPricesReference } from "@/hooks/useCharacterPricesReference";
import { useNavigate } from "react-router-dom";

export function CharacterPricesReference() {
  const { data: prices, isLoading } = useCharacterPricesReference();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-500/30">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (!prices) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar preços de referência. Verifique a configuração em /admin/coins.
        </AlertDescription>
      </Alert>
    );
  }

  const priceCards = [
    {
      type: "Coleção Ativa",
      coins: prices.colecaoAtiva,
      description: "Coleção escolhida pelo assinante",
      icon: Star,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-600",
      badge: "Assinante",
      badgeColor: "bg-yellow-500",
    },
    {
      type: "Coleção Secundária",
      coins: prices.colecaoSecundaria,
      description: "Outras coleções disponíveis",
      icon: Package,
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-600",
      badge: "Assinante",
      badgeColor: "bg-blue-500",
    },
    {
      type: "Catálogo Geral",
      coins: prices.catalogoGeral,
      description: "Modelos especiais",
      icon: ShoppingCart,
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      textColor: "text-purple-600",
      badge: "Todos",
      badgeColor: "bg-purple-500",
    },
    {
      type: "Premium",
      coins: prices.premium,
      description: "Peças maiores e complexas",
      icon: Sparkles,
      color: "bg-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      textColor: "text-orange-600",
      badge: "Todos",
      badgeColor: "bg-orange-500",
    },
  ];

  return (
    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-blue-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-blue-950/20 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                Referência: Preços de Personagens
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  SSOT
                </Badge>
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Preços atuais definidos em /admin/coins (somente leitura)
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/admin/coins")}
            className="shadow-md"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Editar Preços
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <strong>Use estes valores como referência</strong> ao configurar planos de assinatura.
            Os preços são calculados automaticamente baseado no contexto do usuário (assinante,
            coleção escolhida, etc.).
          </AlertDescription>
        </Alert>

        {/* Price Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {priceCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Card
                key={card.type}
                className={`${card.bgColor} border-2 ${card.borderColor} hover:shadow-lg transition-all`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${card.color} rounded-lg shadow-md`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <Badge className={`${card.badgeColor} text-white border-0`}>{card.badge}</Badge>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{card.type}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{card.description}</p>

                  <div
                    className={`p-4 bg-white dark:bg-gray-900 rounded-lg border-2 ${card.borderColor}`}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Preço</p>
                    <p className={`text-3xl font-bold ${card.textColor}`}>{card.coins}</p>
                    <p className="text-sm text-muted-foreground mt-1">coins</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Base Reference Info */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-md">
              <Info className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-2">Como Funciona o Cálculo</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Base de Referência:</strong>{" "}
                  {prices.baseReference} coins (Coleção Ativa)
                </p>
                <p>
                  <strong className="text-foreground">Multiplicadores:</strong>
                </p>
                <ul className="ml-6 space-y-1">
                  <li>• Coleção Escolhida: ×{prices.multipliers.chosen} (sem acréscimo)</li>
                  <li>
                    • Coleção Não Escolhida: ×{prices.multipliers.notChosen} (+
                    {Math.round((prices.multipliers.notChosen - 1) * 100)}%)
                  </li>
                  <li>
                    • Sem Assinatura: ×{prices.multipliers.noSubscription} (+
                    {Math.round((prices.multipliers.noSubscription - 1) * 100)}%)
                  </li>
                </ul>
                <p className="mt-4">
                  <strong className="text-foreground">Exemplo:</strong> Coleção Secundária ={" "}
                  {prices.baseReference} × {prices.multipliers.notChosen} ={" "}
                  {prices.colecaoSecundaria} coins
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
