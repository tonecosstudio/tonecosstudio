import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Coins, DollarSign, TrendingDown } from 'lucide-react';
import type { Character, PlanType } from '@/types/subscription-credit-system';

interface CharacterCardProps {
  character: Character;
  isSubscriber: boolean;
  planType?: PlanType;
  availableCredits: number;
  onPurchase: (character: Character, useCredits: boolean) => void;
}

export function CharacterCard({
  character,
  isSubscriber,
  planType,
  availableCredits,
  onPurchase,
}: CharacterCardProps) {
  const hasEnoughCredits = availableCredits >= character.price_credits;
  
  // Calculate savings percentage when using credits
  const savingsPercentage = character.price_cash > 0
    ? Math.round(((character.price_cash - (character.price_credits * 0.1)) / character.price_cash) * 100)
    : 0;

  return (
    <Card className="group flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-premium">
      {/* Image */}
      <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
        <img
          src={character.image_url || '/placeholder-character.png'}
          alt={character.name}
          className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.02]"
          loading="lazy"
        />
        
        {/* Exclusive badge */}
        {character.is_exclusive_semestral && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-purple-500 text-white border-0 gap-1 shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              Exclusivo Semestral
            </Badge>
          </div>
        )}

        {/* Savings badge for subscribers */}
        {isSubscriber && savingsPercentage > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="outline" className="bg-green-500/90 text-white border-0 gap-1 shadow-lg">
              <TrendingDown className="h-3 w-3" />
              {savingsPercentage}% economia
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex flex-col flex-1 p-6">
        {/* Character name */}
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold leading-tight">{character.name}</h3>
          {character.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {character.description}
            </p>
          )}
        </div>

        {/* Pricing section */}
        <div className="mt-4 space-y-3">
          {/* Cash price (always visible) */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço em dinheiro:</span>
            <span className="text-lg font-bold">
              R$ {character.price_cash.toFixed(2)}
            </span>
          </div>

          {/* Credit price (only for subscribers) */}
          {isSubscriber && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Coins className="h-4 w-4" />
                Preço em créditos:
              </span>
              <span className="text-xl font-bold text-primary">
                {character.price_credits} créditos
              </span>
            </div>
          )}

          {/* Comparison for subscribers */}
          {isSubscriber && savingsPercentage > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400 text-center">
              Economize {savingsPercentage}% usando créditos!
            </div>
          )}
        </div>

        {/* Purchase buttons */}
        <div className="mt-auto pt-6 space-y-2">
          {isSubscriber ? (
            <>
              {/* Buy with credits button */}
              <Button
                className="w-full gap-2"
                onClick={() => onPurchase(character, true)}
                disabled={!hasEnoughCredits}
                variant={hasEnoughCredits ? 'default' : 'outline'}
              >
                <Coins className="h-4 w-4" />
                {hasEnoughCredits
                  ? `Comprar com ${character.price_credits} créditos`
                  : 'Créditos insuficientes'}
              </Button>

              {/* Buy with cash button (secondary) */}
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => onPurchase(character, false)}
              >
                <DollarSign className="h-4 w-4" />
                Comprar com dinheiro
              </Button>
            </>
          ) : (
            <>
              {/* Non-subscriber: only cash option */}
              <Button
                className="w-full gap-2"
                onClick={() => onPurchase(character, false)}
              >
                <DollarSign className="h-4 w-4" />
                Comprar por R$ {character.price_cash.toFixed(2)}
              </Button>

              {/* Call to action for subscription */}
              <p className="text-xs text-center text-muted-foreground">
                <a href="/plans" className="text-primary hover:underline">
                  Assine e ganhe créditos
                </a>{' '}
                para comprar
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
