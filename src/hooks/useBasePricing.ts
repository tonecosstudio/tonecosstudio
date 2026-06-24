import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getBasePriceByType,
  listActiveBasePricing,
  updateBasePriceWithHistory,
  type CollectionBasePrice,
  type UpdateBasePriceInput,
  type UpdateBasePriceResponse,
} from "@/services/pricing/base-pricing-service";
import { CACHE_CONFIG, isValidPriceInCoins } from "@/types/contextual-pricing";

export type { CollectionBasePrice, UpdateBasePriceInput, UpdateBasePriceResponse };

export const basePricingKeys = {
  all: ["base-pricing"] as const,
  lists: () => [...basePricingKeys.all, "list"] as const,
  list: (filters?: string) => [...basePricingKeys.lists(), filters] as const,
  detail: (typeId: string) => [...basePricingKeys.all, "detail", typeId] as const,
};

export function useBasePricing() {
  return useQuery({
    queryKey: basePricingKeys.lists(),
    queryFn: listActiveBasePricing,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useBasePriceByType(collectionTypeId: string | null | undefined) {
  return useQuery({
    queryKey: basePricingKeys.detail(collectionTypeId || ""),
    queryFn: async () => {
      if (!collectionTypeId) return null;
      return getBasePriceByType(collectionTypeId);
    },
    enabled: !!collectionTypeId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useUpdateBasePrice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateBasePriceInput) => {
      if (!isValidPriceInCoins(input.new_base_price_coins)) {
        throw new Error("Preco deve ser um numero inteiro maior que 0");
      }

      return updateBasePriceWithHistory(input);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: basePricingKeys.all });
      queryClient.invalidateQueries({ queryKey: basePricingKeys.detail(variables.collection_type_id) });
      queryClient.invalidateQueries({ queryKey: ["collection-price"] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Preco base atualizado",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preco base",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
