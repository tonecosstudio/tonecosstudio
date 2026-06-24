import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getActiveContextMultiplier,
  getChosenCollectionDiscount,
  listActiveContextPricing,
  updateChosenDiscountWithHistory,
  updateMultiplierWithHistory,
} from "@/services/pricing/context-pricing-service";
import type {
  UpdateDiscountInput,
  UpdateDiscountResponse,
  UpdateMultiplierInput,
  UpdateMultiplierResponse,
} from "@/services/pricing/context-pricing-service";
import { CACHE_CONFIG, QUERY_KEYS } from "@/types/contextual-pricing";

export type {
  UpdateDiscountInput,
  UpdateDiscountResponse,
  UpdateMultiplierInput,
  UpdateMultiplierResponse,
} from "@/services/pricing/context-pricing-service";

export const contextPricingKeys = {
  all: [QUERY_KEYS.CONTEXT_PRICING] as const,
  lists: () => [...contextPricingKeys.all, "list"] as const,
  list: (filters?: string) => [...contextPricingKeys.lists(), filters] as const,
  detail: (context: string) => [...contextPricingKeys.all, "detail", context] as const,
};

export function useContextPricing() {
  return useQuery({
    queryKey: contextPricingKeys.lists(),
    queryFn: listActiveContextPricing,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useContextMultiplier(userContext: string | null | undefined) {
  return useQuery({
    queryKey: contextPricingKeys.detail(userContext || ""),
    queryFn: async () => {
      if (!userContext) return null;
      return getActiveContextMultiplier(userContext);
    },
    enabled: !!userContext,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useChosenCollectionDiscount() {
  return useQuery({
    queryKey: [...contextPricingKeys.all, "chosen-discount"],
    queryFn: getChosenCollectionDiscount,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useUpdateMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<UpdateMultiplierResponse, Error, UpdateMultiplierInput>({
    mutationFn: updateMultiplierWithHistory,
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: contextPricingKeys.all });
      queryClient.invalidateQueries({
        queryKey: contextPricingKeys.detail(variables.user_context),
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COLLECTION_PRICE] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Multiplicador atualizado",
        description: result.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar multiplicador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateChosenDiscount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<UpdateDiscountResponse, Error, UpdateDiscountInput>({
    mutationFn: updateChosenDiscountWithHistory,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: contextPricingKeys.all });
      queryClient.invalidateQueries({
        queryKey: [...contextPricingKeys.all, "chosen-discount"],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COLLECTION_PRICE] });
      queryClient.invalidateQueries({ queryKey: ["character-price"] });

      toast({
        title: "Desconto atualizado",
        description: result.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar desconto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
