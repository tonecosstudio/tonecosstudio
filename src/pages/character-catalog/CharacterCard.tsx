import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Coins, DollarSign, TrendingDown, Loader2, Info, Crown, Sparkles, ShoppingCart } from 'lucide-react';
import type { Character, PlanType } from '@/types/subscription-credit-system';
import { useCharacterPrice, useCharacterPriceDetails } from '@/hooks/useCharacterPrice';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { BalanceIndicator } from '@/components/character-catalog/BalanceIndicator';
import { InsufficientBalanceMessage } from '@/components/character-catalog/InsufficientBalanceMessage';
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
  planType: _planType,
  availableCredits,
  onPurchase,
}: CharacterCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get contextual price for the character (includes multiplier - RN008)
  const { data: contextualPrice, isLoading: priceLoading } = useCharacterPrice({
    characterId: character.id,
    userId: user?.id
  });

  // Get price details for breakdown display
  const { data: priceDetails } = useCharacterPriceDetails(character.id, user?.id);

  // Use contextual price if available, fallback to character.price_credits
  const priceInCoins = contextualPrice || character.price_credits;
  const hasEnoughCredits = availableCredits >= priceInCoins;

  // Check if price is discounted (contextual price is lower than base price)
  const hasDiscount = contextualPrice && contextualPrice < character.price_credits;
  const discountAmount = hasDiscount ? character.price_credits - contextualPrice : 0;
  const discountPercentage = hasDiscount
    ? Math.round((discountAmount / character.price_credits) * 100)
    : 0;

  // Check if character has price multiplier (RN008)
  const hasMultiplier = priceDetails?.has_multiplier || false;
  const multiplier = priceDetails?.price_multiplier || 1.0;

  // Get multiplier badge info (RN008)
  const getMultiplierBadge = () => {
    if (!hasMultiplier) return null;

    if (multiplier >= 2.0) {
      return { label: 'Raro', icon: Crown, color: 'bg-purple-500' };
    } else if (multiplier >= 1.5) {
      return { label: 'Premium', icon: Sparkles, color: 'bg-amber-500' };
    } else if (multiplier >= 1.3) {
      return { label: 'Grande', icon: Star, color: 'bg-blue-500' };
    } else if (multiplier > 1.0) {
      return { label: 'Especial', icon: Star, color: 'bg-indigo-500' };
    }
    return null;
  };

  const multiplierBadge = getMultiplierBadge();

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
          decoding="async"
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

        {/* Multiplier badge (RN008 - Task 9.4) */}
        {multiplierBadge && (
          <div className="absolute top-3 left-3 z-10" style={{ marginTop: character.is_exclusive_semestral ? '2.5rem' : '0' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`${multiplierBadge.color} text-white border-0 gap-1 shadow-lg cursor-help`}>
                    <multiplierBadge.icon className="h-3 w-3" />
                    {multiplierBadge.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Personagem {multiplierBadge.label}</p>
                  <p className="text-xs mb-2">
                    Este personagem tem um multiplicador de preço de {multiplier}x devido a suas características especiais.
                  </p>
                  {priceDetails && (
                    <p className="text-xs text-muted-foreground">
                      Cálculo: {priceDetails.collection_price} 🪙 (coleção) × {multiplier} = {priceDetails.final_price} 🪙
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Discount badge for contextual pricing (RN009 - Task 9.10) */}
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
                  <p className="text-xs mb-2">
                    Você está recebendo um desconto especial nesta coleção.
                  </p>
                  {priceDetails && (
                    <div className="text-xs space-y-1 mb-2">
                      <p className="font-semibold">Breakdown do cálculo:</p>
                      <p>• Preço da coleção: {priceDetails.collection_price} 🪙</p>
                      {hasMultiplier && (
                        <p>• Multiplicador do personagem: {multiplier}x</p>
                      )}
                      <p>• Preço original: {character.price_credits} 🪙</p>
                      <p className="text-green-400 font-semibold">• Seu preço: {priceInCoins} 🪙</p>
                    </div>
                  )}
                  <p className="text-xs text-green-400">
                    Economize {discountAmount} 🪙 neste personagem!
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

          {/* Credit price (only for subscribers) - Task 9.12 */}
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
                    {(hasDiscount || hasMultiplier) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Como funciona o preço?</p>
                            {priceDetails && (
                              <div className="text-xs space-y-1 mb-2">
                                <p className="font-semibold">Cálculo:</p>
                                <p>1. Preço da coleção: {priceDetails.collection_price} 🪙</p>
                                {hasMultiplier && (
                                  <p>2. Multiplicador: {multiplier}x ({multiplierBadge?.label})</p>
                                )}
                                <p className="text-green-400 font-semibold">
                                  = Preço final: {priceInCoins} 🪙
                                </p>
                              </div>
                            )}
                            <p className="text-xs mb-2">
                              O preço é calculado baseado no seu contexto:
                            </p>
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              <li>Tipo de coleção</li>
                              <li>Seu plano de assinatura</li>
                              <li>Coleções que você escolheu</li>
                              {hasMultiplier && <li>Características do personagem</li>}
                            </ul>
                            {hasDiscount && (
                              <p className="text-xs mt-2 text-green-400">
                                Você economiza {discountAmount} 🪙 neste personagem!
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>

              {/* Discount breakdown - Task 9.12 */}
              {hasDiscount && !priceLoading && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  💰 Economize {discountAmount} 🪙 ({discountPercentage}% de desconto)
                </div>
              )}

              {/* Multiplier info - RN008 */}
              {hasMultiplier && !priceLoading && priceDetails && (
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                  ⭐ {multiplierBadge?.label}: {priceDetails.collection_price} 🪙 × {multiplier} = {priceInCoins} 🪙
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

        {/* Purchase buttons - Task 9A.3 */}
        <div className="mt-auto pt-6 space-y-2">
          {isSubscriber ? (
            <>
              {/* Balance indicator - Task 9A.1 */}
              {!priceLoading && (
                <BalanceIndicator
                  currentBalance={availableCredits}
                  requiredAmount={priceInCoins}
                />
              )}

              {/* Insufficient balance message - Task 9A.2 */}
              {!hasEnoughCredits && !priceLoading && (
                <InsufficientBalanceMessage
                  requiredAmount={priceInCoins}
                  availableAmount={availableCredits}
                  className="mt-2"
                />
              )}

              {/* Buy with credits button or Buy Coins button - Task 9A.3 */}
              {hasEnoughCredits ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => onPurchase(character, true)}
                  disabled={priceLoading}
                >
                  <Coins className="h-4 w-4" />
                  {priceLoading
                    ? 'Calculando preço...'
                    : `Comprar com ${priceInCoins} 🪙`}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="w-full gap-2"
                        variant="default"
                        onClick={() => navigate('/coins/purchase')}
                        disabled={priceLoading}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Comprar Coins
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Você precisa de mais {priceInCoins - availableCredits} 🪙 para comprar este personagem
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

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
