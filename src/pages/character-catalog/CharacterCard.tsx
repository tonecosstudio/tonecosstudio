import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Coins, DollarSign, TrendingDown, Loader2, Info } from 'lucide-react';
import type { Character, PlanType } from '@/types/subscription-credit-system';
import { useCollectionPrice } from '@/hooks/useCollectionPrice';
import { useAuth } from '@/lib/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { user } = useAuth();
  
  // Get contextual price for the character's collection
  const { data: contextualPrice, isLoading: priceLoading } = useCollectionPrice(
    character.collection_id,
    user?.id
  );
  
  // Use contextual price if available, fallback to character.price_credits
  const priceInCoins = contextualPrice || character.price_credits;
  const hasEnoughCredits = availableCredits >= priceInCoins;
  
  // Check if price is discounted (contextual price is lower than base price)
  const hasDiscount = contextualPrice && contextualPrice < character.price_credits;
  const discountAmount = hasDiscount ? character.price_credits - contextualPrice : 0;
  const discountPercentage = hasDiscount 
    ? Math.round((discountAmount / character.price_credits) * 100)
    : 0;
  
  // Calculate savings percentage when using credits
  const savingsPercentage = character.price_cash > 0
    ? Math.round(((character.price_cash - (priceInCoins * 0.1)) / character.price_cash) * 100)
    : 0;

  return (
    <Card className={`group flex flex-col overflow-hidden bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-premium ${
      hasDiscount 
        ? 'border-2 border-green-500/50' 
        : 'border border-border'
    }`}>
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

        {/* Discount badge for contextual pricing */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-green-500 text-white border-0 gap-1 shadow-lg cursor-help">
                    <TrendingDown className="h-3 w-3" />
                    {discountPercentage}% OFF
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Preço com desconto!</p>
                  <p className="text-xs">
                    Você está recebendo um desconto especial nesta coleção.
                    Economize {discountAmount} 🪙 por personagem!
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Savings badge for subscribers (only if no discount badge) */}
        {isSubscriber && savingsPercentage > 0 && !hasDiscount && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="outline" className="bg-blue-500/90 text-white border-0 gap-1 shadow-lg">
              <Coins className="h-3 w-3" />
              Use créditos
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
            <div className="space-y-2">
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  Preço em créditos:
                </span>
                {priceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex items-center gap-2">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        {character.price_credits} 🪙
                      </span>
                    )}
                    <span className={`text-xl font-bold ${hasDiscount ? 'text-green-600' : 'text-primary'}`}>
                      {priceInCoins} 🪙
                    </span>
                    {hasDiscount && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Como funciona o desconto?</p>
                            <p className="text-xs mb-2">
                              O preço é calculado baseado no seu contexto:
                            </p>
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              <li>Tipo de coleção</li>
                              <li>Seu plano de assinatura</li>
                              <li>Coleções que você escolheu</li>
                            </ul>
                            <p className="text-xs mt-2 text-green-400">
                              Você economiza {discountAmount} 🪙 neste personagem!
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
              
              {/* Discount breakdown */}
              {hasDiscount && !priceLoading && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  💰 Economize {discountAmount} 🪙 ({discountPercentage}% de desconto)
                </div>
              )}
            </div>
          )}

          {/* Comparison for subscribers */}
          {isSubscriber && savingsPercentage > 0 && !hasDiscount && (
            <div className="text-xs text-blue-600 dark:text-blue-400 text-center bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
              💡 Economize {savingsPercentage}% usando créditos ao invés de dinheiro!
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
                disabled={!hasEnoughCredits || priceLoading}
                variant={hasEnoughCredits ? 'default' : 'outline'}
              >
                <Coins className="h-4 w-4" />
                {priceLoading
                  ? 'Calculando preço...'
                  : hasEnoughCredits
                    ? `Comprar com ${priceInCoins} 🪙`
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
