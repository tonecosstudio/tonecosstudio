/**
 * Card de Personagem - Componente Profissional
 *
 * Exibe informações do personagem com preço contextual
 * e botão de compra inteligente.
 *
 * @module components/catalog/CharacterCard
 */

import { Coins, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  price_cash?: number | null;
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

  const standalonePrice =
    typeof character.price_cash === "number" &&
    Number.isFinite(character.price_cash) &&
    character.price_cash > 0
      ? character.price_cash
      : null;
  const subscriberPrice = price ?? null;

  // Verifica se tem saldo suficiente
  const hasSufficientBalance = subscriberPrice !== null ? availableCoins >= subscriberPrice : false;

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
                ) : subscriberPrice !== null ? (
                  <>
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="font-bold text-lg text-primary">{formatCoins(subscriberPrice)}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Indisponível</span>
                )}
              </div>
            </div>

            {/* Preço avulso (riscado) */}
            {standalonePrice !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço avulso:</span>
                <div className="text-right">
                  <span className="line-through text-muted-foreground">
                    R$ {standalonePrice.toFixed(2)}
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
              {standalonePrice !== null ? (
                <span className="font-bold text-lg">R$ {standalonePrice.toFixed(2)}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Indisponível</span>
              )}
            </div>
            {subscriberPrice !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Assinantes pagam apenas {formatCoins(subscriberPrice)}
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          {isSubscriber ? (
            <Button
              size="sm"
              onClick={() => subscriberPrice !== null && onPurchase(character, subscriberPrice)}
              disabled={isPurchasing || priceLoading || subscriberPrice === null || !hasSufficientBalance}
              variant={hasSufficientBalance ? "default" : "outline"}
              className="w-full"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Comprando...
                </>
              ) : subscriberPrice === null ? (
                "Preço indisponível"
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
          {isSubscriber && subscriberPrice !== null && !hasSufficientBalance && (
            <p className="text-xs text-destructive text-center">
              Faltam {formatCoins(subscriberPrice - availableCoins)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
