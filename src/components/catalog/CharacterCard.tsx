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

  // Verifica se tem saldo suficiente
  const hasSufficientBalance = price ? availableCoins >= price : false;

  // Verifica se tem multiplicador (não mais usado, mantido para compatibilidade)
  const hasMultiplier = false; // Não temos mais price_multiplier na tabela

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

        {/* Multiplicador Badge (removido - não temos mais price_multiplier) */}
        {/* {hasMultiplier && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-yellow-500/90 text-white"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {character.price_multiplier}x
          </Badge>
        )} */}
      </div>

      {/* Character Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{character.name}</h3>

        {character.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{character.description}</p>
        )}

        {/* Price & Action */}
        <div className="flex items-center justify-between">
          {/* Price */}
          <div className="flex items-center gap-1">
            {priceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : price ? (
              <>
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold">{formatCoins(price)}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Preço indisponível</span>
            )}
          </div>

          {/* Action Button */}
          {isSubscriber ? (
            <Button
              size="sm"
              onClick={() => price && onPurchase(character, price)}
              disabled={isPurchasing || priceLoading || !price || !hasSufficientBalance}
              variant={hasSufficientBalance ? "default" : "outline"}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Comprando...
                </>
              ) : !hasSufficientBalance ? (
                "Saldo insuficiente"
              ) : (
                "Comprar"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Navegar para planos será tratado pelo componente pai
              }}
            >
              <Lock className="h-3 w-3 mr-1" />
              Assinar
            </Button>
          )}
        </div>

        {/* Insufficient Balance Warning */}
        {isSubscriber && price && !hasSufficientBalance && (
          <p className="text-xs text-destructive mt-2">
            Você precisa de mais {formatCoins(price - availableCoins)}
          </p>
        )}
      </div>
    </div>
  );
}
