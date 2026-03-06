/**
 * Card de personagem para seleção mensal
 * Mostra preço contextual baseado na coleção ativa
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Sparkles } from "lucide-react";
import type { MonthlyRelease } from "@/hooks/useSubscriptionCoins";

interface CharacterSelectionCardProps {
  release: MonthlyRelease;
  price: number;
  isActiveCollection: boolean;
  isSelected: boolean;
  canAfford: boolean;
  currentBalance: number;
  onSelect: () => void;
  disabled?: boolean;
}

export function CharacterSelectionCard({
  release,
  price,
  isActiveCollection,
  isSelected,
  canAfford,
  currentBalance,
  onSelect,
  disabled = false,
}: CharacterSelectionCardProps) {
  const priceDifference = price - 200;
  const balanceAfter = currentBalance - price;

  return (
    <Card
      className={`relative transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-primary shadow-lg scale-105"
          : disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md hover:scale-102"
      } ${!canAfford ? "border-red-300 dark:border-red-900" : ""}`}
      onClick={!disabled ? onSelect : undefined}
    >
      {/* Badge de selecionado */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-green-500 text-white shadow-lg">
            <Check className="h-3 w-3 mr-1" />
            Selecionado
          </Badge>
        </div>
      )}

      {/* Badge de coleção ativa */}
      {isActiveCollection && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-primary text-primary-foreground">
            <Sparkles className="h-3 w-3 mr-1" />
            Coleção Ativa
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        {/* Imagem do personagem */}
        <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-muted">
          {release.character_image_url ? (
            <img
              src={release.character_image_url}
              alt={release.character_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Sparkles className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Nome do personagem */}
        <h3 className="font-bold text-lg mb-1 line-clamp-1">{release.character_name}</h3>

        {/* Coleção */}
        <p className="text-sm text-muted-foreground mb-3">{release.collection_name}</p>

        {/* Descrição */}
        {release.character_description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {release.character_description}
          </p>
        )}

        {/* Preço */}
        <div
          className={`rounded-lg p-3 mb-3 ${
            isActiveCollection
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
              : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Preço:</span>
              <span
                className={`text-xl font-bold ${
                  isActiveCollection ? "text-green-600" : "text-amber-600"
                }`}
              >
                {price} coins
              </span>
            </div>

            {!isActiveCollection && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">vs Coleção Ativa:</span>
                <Badge variant="secondary">+{priceDifference} coins</Badge>
              </div>
            )}

            {isActiveCollection && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                <span>Preço prioritário</span>
              </div>
            )}
          </div>
        </div>

        {/* Impacto no saldo */}
        <div className="bg-muted rounded-lg p-2 mb-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo atual:</span>
            <span className="font-medium">{currentBalance} coins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo após:</span>
            <span
              className={`font-bold ${
                balanceAfter < 0
                  ? "text-red-600"
                  : balanceAfter < 200
                    ? "text-amber-600"
                    : "text-green-600"
              }`}
            >
              {balanceAfter} coins
            </span>
          </div>
        </div>

        {/* Alertas */}
        {!canAfford && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-2 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-900 dark:text-red-100">
                <strong>Saldo insuficiente</strong>
                <p className="mt-1">Faltam {price - currentBalance} coins</p>
              </div>
            </div>
          </div>
        )}

        {canAfford && balanceAfter < 200 && balanceAfter >= 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-2 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 dark:text-amber-100">
                <strong>Atenção</strong>
                <p className="mt-1">Pode faltar saldo para próximo mês</p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de seleção */}
        <Button
          onClick={onSelect}
          disabled={disabled || !canAfford}
          className="w-full"
          variant={isSelected ? "secondary" : "default"}
        >
          {isSelected ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Selecionado
            </>
          ) : !canAfford ? (
            "Saldo Insuficiente"
          ) : (
            "Selecionar"
          )}
        </Button>

        {!canAfford && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Abrir modal de compra de coins
            }}
          >
            Comprar {price - currentBalance} Coins
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
