/**
 * Card de Personagem - Componente Profissional
 *
 * Exibe informações do personagem com preço contextual
 * e botão de compra inteligente.
 *
 * @module components/catalog/CharacterCard
 */

import { Coins, Lock, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCharacterPrice } from "@/hooks/useCharacterPrice";
import { formatCoins } from "@/types/coins";

// ============================================================================
// TYPES
// ============================================================================

interface Character {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  collection_id: string;
  status: string;
  release_date: string | null;
  release_order: number;
  is_revealed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CharacterCardProps {
  character: Character;
  isSubscriber: boolean;
  userId?: string | null;
  availableCoins: number;
  onPurchase: (character: Character, price: number) => void;
  isPurchasing: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CharacterCard({
  character,
  isSubscriber,
  userId,
  availableCoins,
  onPurchase,
  isPurchasing,
}: CharacterCardProps) {
  // Busca preço contextual
  const { data: price, isLoading: priceLoading } = useCharacterPrice({
    characterId: character.id,
    userId: userId || null,
  });

  // TODO: Buscar preço avulso da tabela character_standalone_pricing
  // Por enquanto, usar valores padrão baseados no tipo
  const standalonePrice = 500; // R$ 500 para standard, R$ 900 para premium

  // Verifica se tem saldo suficiente
  const hasSufficientBalance = price ? availableCoins >= price : false;

  // Calcula economia (aproximada, assumindo 1 coin = R$ 2,50)
  const coinValueInReais = 2.5; // Valor aproximado de 1 coin em reais
  const priceInReais = price ? price * coinValueInReais : 0;
  const savings = standalonePrice - priceInReais;
  const savingsPercentage = standalonePrice > 0 ? Math.round((savings / standalonePrice) * 100) : 0;

  return (
    <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Character Image */}
      <div className="relative aspect-square bg-muted">
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}

        {/* Badge de economia para assinantes */}
        {isSubscriber && savings > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-green-500/90 text-white"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {savingsPercentage}% OFF
          </Badge>
        )}
      </div>

      {/* Character Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{character.name}</h3>

        {character.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{character.description}</p>
        )}

        {/* Price Comparison */}
        {isSubscriber ? (
          <div className="space-y-2 mb-4">
            {/* Preço para assinantes */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Seu preço:</span>
              <div className="flex items-center gap-1">
                {priceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : price ? (
                  <>
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="font-bold text-lg text-primary">{formatCoins(price)}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Indisponível</span>
                )}
              </div>
            </div>

            {/* Preço avulso (riscado) */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço avulso:</span>
              <span className="line-through text-muted-foreground">
                R$ {standalonePrice.toFixed(2)}
              </span>
            </div>

            {/* Economia */}
            {savings > 0 && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    Você economiza:
                  </span>
                  <span className="text-green-700 dark:text-green-300 font-bold">
                    ~R$ {savings.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Preço para não-assinantes */
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Preço avulso:</span>
              <span className="font-bold text-lg">R$ {standalonePrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assinantes pagam apenas {price ? formatCoins(price) : '200 coins'}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          {isSubscriber ? (
            <Button
              size="sm"
              onClick={() => price && onPurchase(character, price)}
              disabled={isPurchasing || priceLoading || !price || !hasSufficientBalance}
              variant={hasSufficientBalance ? "default" : "outline"}
              className="w-full"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Comprando...
                </>
              ) : !hasSufficientBalance ? (
                "Saldo insuficiente"
              ) : (
                "Comprar com Coins"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => {
                // Navegar para planos será tratado pelo componente pai
              }}
            >
              <Lock className="h-3 w-3 mr-1" />
              Assinar e Economizar
            </Button>
          )}

          {/* Insufficient Balance Warning */}
          {isSubscriber && price && !hasSufficientBalance && (
            <p className="text-xs text-destructive text-center">
              Faltam {formatCoins(price - availableCoins)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
