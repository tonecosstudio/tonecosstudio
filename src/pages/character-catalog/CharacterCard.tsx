import { Link } from "react-router-dom";
import {
  Coins,
  Crown,
  DollarSign,
  Info,
  Loader2,
  Sparkles,
  Star,
  TrendingDown,
} from "lucide-react";
import { BalanceIndicator } from "@/components/character-catalog/BalanceIndicator";
import { InsufficientBalanceMessage } from "@/components/character-catalog/InsufficientBalanceMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ASSETS } from "@/config/constants";
import { PUBLIC_ROUTES } from "@/config/routes";
import { useCharacterPrice, useCharacterPriceDetails } from "@/hooks/useCharacterPrice";
import { useAuth } from "@/lib/auth";
import type { Character, PlanType } from "@/types/subscription-credit-system";

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
  const { data: contextualPrice, isLoading: priceLoading } = useCharacterPrice({
    characterId: character.id,
    userId: user?.id,
  });
  const { data: priceDetails } = useCharacterPriceDetails(character.id, user?.id);

  const priceInCoins = contextualPrice ?? character.price_credits;
  const hasValidCoinPrice = Number.isFinite(priceInCoins) && priceInCoins > 0;
  const hasEnoughCredits = hasValidCoinPrice && availableCredits >= priceInCoins;
  const hasDiscount =
    hasValidCoinPrice &&
    Number.isFinite(character.price_credits) &&
    character.price_credits > 0 &&
    priceInCoins < character.price_credits;
  const discountAmount = hasDiscount ? character.price_credits - priceInCoins : 0;
  const discountPercentage = hasDiscount
    ? Math.round((discountAmount / character.price_credits) * 100)
    : 0;

  const hasMultiplier = priceDetails?.has_multiplier === true;
  const multiplier = priceDetails?.price_multiplier ?? 1;

  const multiplierBadge = (() => {
    if (!hasMultiplier) return null;
    if (multiplier >= 2) return { label: "Raro", icon: Crown, className: "bg-purple-500" };
    if (multiplier >= 1.5) return { label: "Premium", icon: Sparkles, className: "bg-amber-500" };
    if (multiplier >= 1.3) return { label: "Grande", icon: Star, className: "bg-blue-500" };
    if (multiplier > 1) return { label: "Especial", icon: Star, className: "bg-indigo-500" };
    return null;
  })();

  return (
    <Card
      className={`group flex flex-col overflow-hidden bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-premium ${
        hasDiscount ? "border-2 border-green-500/50" : "border border-border"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <img
          src={character.image_url || ASSETS.FALLBACK_IMAGE_URL}
          alt={character.name}
          className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />

        {character.is_exclusive_semestral && (
          <div className="absolute left-3 top-3 z-10">
            <Badge className="gap-1 border-0 bg-purple-500 text-white shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              Exclusivo Semestral
            </Badge>
          </div>
        )}

        {multiplierBadge && (
          <div
            className="absolute left-3 top-3 z-10"
            style={{ marginTop: character.is_exclusive_semestral ? "2.5rem" : "0" }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={`${multiplierBadge.className} cursor-help gap-1 border-0 text-white shadow-lg`}
                  >
                    <multiplierBadge.icon className="h-3 w-3" />
                    {multiplierBadge.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="mb-1 font-semibold">Personagem {multiplierBadge.label}</p>
                  <p className="text-xs">
                    O preço em coins considera o multiplicador oficial de {multiplier}x deste personagem.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {hasDiscount && (
          <div className="absolute right-3 top-3 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="cursor-help gap-1 border-0 bg-green-500 text-white shadow-lg">
                    <TrendingDown className="h-3 w-3" />
                    {discountPercentage}% OFF
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="mb-1 font-semibold">Desconto em coins</p>
                  <p className="text-xs">
                    Preço base: {character.price_credits} coins. Preço contextual: {priceInCoins} coins.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-6">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold leading-tight">{character.name}</h3>
          {character.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {character.description}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço em dinheiro:</span>
            <span className="text-lg font-bold">R$ {character.price_cash.toFixed(2)}</span>
          </div>

          {isSubscriber && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-t pt-3">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  Preço em créditos:
                </span>
                {priceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : hasValidCoinPrice ? (
                  <div className="flex items-center gap-2">
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through">
                        {character.price_credits} coins
                      </span>
                    )}
                    <span className={`text-xl font-bold ${hasDiscount ? "text-green-600" : "text-primary"}`}>
                      {priceInCoins} coins
                    </span>
                    {(hasDiscount || hasMultiplier) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="mb-1 font-semibold">Preço contextual</p>
                            <p className="text-xs">
                              O valor em coins é calculado pelas regras de preço ativas. Nenhuma conversão fixa de coins para reais é aplicada nesta tela.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-destructive">Preço indisponível</span>
                )}
              </div>

              {hasDiscount && !priceLoading && (
                <div className="rounded bg-green-50 p-2 text-xs text-green-600 dark:bg-green-950/20 dark:text-green-400">
                  Economize {discountAmount} coins ({discountPercentage}% no preço em coins).
                </div>
              )}

              {hasMultiplier && !priceLoading && priceDetails && hasValidCoinPrice && (
                <div className="rounded bg-blue-50 p-2 text-xs text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
                  {multiplierBadge?.label ?? "Especial"}: {priceDetails.collection_price} coins × {multiplier} = {priceInCoins} coins.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2 pt-6">
          {isSubscriber ? (
            <>
              {!priceLoading && hasValidCoinPrice && (
                <BalanceIndicator
                  currentBalance={availableCredits}
                  requiredAmount={priceInCoins}
                />
              )}

              {!hasEnoughCredits && !priceLoading && hasValidCoinPrice && (
                <InsufficientBalanceMessage
                  requiredAmount={priceInCoins}
                  availableAmount={availableCredits}
                  className="mt-2"
                />
              )}

              <Button
                className="w-full gap-2"
                onClick={() => onPurchase(character, true)}
                disabled={priceLoading || !hasEnoughCredits || !hasValidCoinPrice}
              >
                <Coins className="h-4 w-4" />
                {priceLoading
                  ? "Calculando preço..."
                  : !hasValidCoinPrice
                    ? "Preço em coins indisponível"
                    : hasEnoughCredits
                      ? `Comprar com ${priceInCoins} coins`
                      : "Saldo de coins insuficiente"}
              </Button>

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
              <Button
                className="w-full gap-2"
                onClick={() => onPurchase(character, false)}
              >
                <DollarSign className="h-4 w-4" />
                Comprar por R$ {character.price_cash.toFixed(2)}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to={PUBLIC_ROUTES.login} className="text-primary hover:underline">
                  Entre na sua conta
                </Link>{" "}
                para consultar seu saldo e preços em coins.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
