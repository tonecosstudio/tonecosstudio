import { useQuery } from "@tanstack/react-query";
import {
  getCharacterPrice,
  getCharacterPriceDetails,
  hasCharacterMultiplier,
  listCharacterPrices,
  type CharacterPriceParams,
} from "@/services/pricing/character-pricing-service";
import type { PriceInCoins } from "@/types/contextual-pricing";
import { CACHE_CONFIG } from "@/types/contextual-pricing";

export type { CharacterPriceParams, CharacterPriceResponse } from "@/services/pricing/character-pricing-service";

export const characterPriceKeys = {
  all: ["character-price"] as const,
  detail: (characterId: string, userId?: string | null) =>
    [...characterPriceKeys.all, characterId, userId || "anonymous"] as const,
};

export function useCharacterPrice(params: CharacterPriceParams) {
  const { characterId, userId } = params;

  return useQuery({
    queryKey: characterPriceKeys.detail(characterId, userId),
    queryFn: (): Promise<PriceInCoins> => getCharacterPrice(params),
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useCharacterPrices(characterIds: string[], userId?: string | null) {
  return useQuery({
    queryKey: [...characterPriceKeys.all, "batch", characterIds.join(","), userId || "anonymous"],
    queryFn: () => listCharacterPrices(characterIds, userId),
    enabled: characterIds.length > 0,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

export function useCharacterPriceDetails(characterId: string, userId?: string | null) {
  return useQuery({
    queryKey: [...characterPriceKeys.all, "details", characterId, userId || "anonymous"],
    queryFn: () => getCharacterPriceDetails(characterId, userId),
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useHasCharacterMultiplier(characterId: string) {
  return useQuery({
    queryKey: ["character-multiplier-status", characterId],
    queryFn: () => hasCharacterMultiplier(characterId),
    enabled: !!characterId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}
