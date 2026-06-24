import { useQuery } from "@tanstack/react-query";
import {
  getCharacterPricesReference,
  type CharacterPricesReference,
} from "@/services/pricing/character-pricing-service";

export type { CharacterPricesReference } from "@/services/pricing/character-pricing-service";

export interface PurchasingPower {
  totalCoins: number;
  canBuy: {
    colecaoAtiva: number;
    colecaoSecundaria: number;
    catalogoGeral: number;
    premium: number;
  };
  remaining: {
    colecaoAtiva: number;
    colecaoSecundaria: number;
    catalogoGeral: number;
    premium: number;
  };
  suggestions: string[];
}

export const characterPricesReferenceKeys = {
  all: ["character-prices-reference"] as const,
  prices: () => [...characterPricesReferenceKeys.all, "prices"] as const,
};

export function useCharacterPricesReference() {
  return useQuery({
    queryKey: characterPricesReferenceKeys.prices(),
    queryFn: (): Promise<CharacterPricesReference> => getCharacterPricesReference(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function usePurchasingPower(totalCoins: number): PurchasingPower | null {
  const { data: prices } = useCharacterPricesReference();

  if (!prices || totalCoins <= 0) return null;

  const canBuy = {
    colecaoAtiva: Math.floor(totalCoins / prices.colecaoAtiva),
    colecaoSecundaria: Math.floor(totalCoins / prices.colecaoSecundaria),
    catalogoGeral: Math.floor(totalCoins / prices.catalogoGeral),
    premium: Math.floor(totalCoins / prices.premium),
  };

  const remaining = {
    colecaoAtiva: totalCoins % prices.colecaoAtiva,
    colecaoSecundaria: totalCoins % prices.colecaoSecundaria,
    catalogoGeral: totalCoins % prices.catalogoGeral,
    premium: totalCoins % prices.premium,
  };

  const suggestions: string[] = [];

  if (canBuy.colecaoAtiva > 0) {
    suggestions.push(
      `${canBuy.colecaoAtiva} personagens da Colecao Ativa (${canBuy.colecaoAtiva} x ${prices.colecaoAtiva} = ${canBuy.colecaoAtiva * prices.colecaoAtiva} coins)`,
    );
  }

  if (canBuy.colecaoAtiva >= 2 && canBuy.colecaoSecundaria > 0) {
    const ativas = canBuy.colecaoAtiva - 1;
    const secundarias = Math.floor(
      (totalCoins - ativas * prices.colecaoAtiva) / prices.colecaoSecundaria,
    );
    if (secundarias > 0) {
      suggestions.push(`${ativas} da Colecao Ativa + ${secundarias} da Secundaria`);
    }
  }

  if (canBuy.catalogoGeral > 0) {
    suggestions.push(`${canBuy.catalogoGeral} personagens do Catalogo Geral`);
  }

  if (canBuy.premium > 0) {
    suggestions.push(`${canBuy.premium} personagens Premium`);
  }

  return {
    totalCoins,
    canBuy,
    remaining,
    suggestions,
  };
}

export function useValidatePlan(totalCoins: number) {
  const { data: prices } = useCharacterPricesReference();

  if (!prices || totalCoins <= 0) {
    return {
      isValid: false,
      message: "Plano sem coins definidos",
      severity: "error" as const,
    };
  }

  const cheapestPrice = prices.colecaoAtiva;

  if (totalCoins < cheapestPrice) {
    return {
      isValid: false,
      message: `Plano insuficiente! Minimo: ${cheapestPrice} coins (1 personagem)`,
      severity: "error" as const,
      suggestion: `Aumente para pelo menos ${cheapestPrice} coins`,
    };
  }

  const canBuyCount = Math.floor(totalCoins / cheapestPrice);
  const remaining = totalCoins % cheapestPrice;

  if (remaining > 0 && remaining < cheapestPrice * 0.5) {
    return {
      isValid: true,
      message: `Plano adequado (${canBuyCount} personagens)`,
      severity: "warning" as const,
      suggestion: `Sobram ${remaining} coins. Considere ajustar para ${totalCoins + (cheapestPrice - remaining)} coins (${canBuyCount + 1} personagens)`,
    };
  }

  return {
    isValid: true,
    message: `Plano adequado (${canBuyCount} personagens)`,
    severity: "success" as const,
  };
}

export function usePlanSuggestions() {
  const { data: prices } = useCharacterPricesReference();

  if (!prices) return [];

  const basePrice = prices.colecaoAtiva;

  return [
    {
      label: "Plano Basico",
      coins: basePrice * 2,
      characters: 2,
      description: "2 personagens da Colecao Ativa",
    },
    {
      label: "Plano Intermediario",
      coins: basePrice * 4,
      characters: 4,
      description: "4 personagens da Colecao Ativa",
    },
    {
      label: "Plano Avancado",
      coins: basePrice * 6,
      characters: 6,
      description: "6 personagens da Colecao Ativa",
    },
    {
      label: "Plano Premium",
      coins: basePrice * 8,
      characters: 8,
      description: "8 personagens da Colecao Ativa",
    },
  ];
}
