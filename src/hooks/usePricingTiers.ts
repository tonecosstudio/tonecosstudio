import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  createPricingTierSchema,
  updatePricingTierSchema,
} from "@/lib/validations/pricing-tiers";
import {
  createPricingTier,
  deactivatePricingTier,
  fetchPricingTiersWithStats,
  getDefaultPricingTier,
  getPricingTier,
  listActivePricingTiers,
  propagateTierPricing,
  updatePricingTier,
} from "@/services/pricing/pricing-tiers-service";
import type { CreatePricingTierInput, UpdatePricingTierInput } from "@/types/pricing-tiers";

export { fetchPricingTiersWithStats } from "@/services/pricing/pricing-tiers-service";

export const pricingTiersKeys = {
  all: ["pricing-tiers"] as const,
  lists: () => [...pricingTiersKeys.all, "list"] as const,
  list: (filters?: string) => [...pricingTiersKeys.lists(), filters] as const,
  details: () => [...pricingTiersKeys.all, "detail"] as const,
  detail: (id: string) => [...pricingTiersKeys.details(), id] as const,
  stats: () => [...pricingTiersKeys.all, "stats"] as const,
  active: () => [...pricingTiersKeys.all, "active"] as const,
};

export function usePricingTiers() {
  return useQuery({
    queryKey: pricingTiersKeys.stats(),
    queryFn: fetchPricingTiersWithStats,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActivePricingTiers() {
  return useQuery({
    queryKey: pricingTiersKeys.active(),
    queryFn: listActivePricingTiers,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePricingTier(tierId: string | null | undefined) {
  return useQuery({
    queryKey: pricingTiersKeys.detail(tierId || ""),
    queryFn: async () => {
      if (!tierId) return null;
      return getPricingTier(tierId);
    },
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDefaultPricingTier() {
  return useQuery({
    queryKey: [...pricingTiersKeys.all, "default"],
    queryFn: getDefaultPricingTier,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePricingTierInput) => {
      const validated = createPricingTierSchema.parse(input);
      return createPricingTier(validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });

      toast({
        title: "Nivel criado",
        description: "O nivel de preco foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tierId,
      input,
    }: {
      tierId: string;
      input: UpdatePricingTierInput;
    }) => {
      const validated = updatePricingTierSchema.parse(input);
      return updatePricingTier({ tierId, input: validated });
    },
    onSuccess: (tierId) => {
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.detail(tierId) });

      toast({
        title: "Nivel atualizado",
        description: "O nivel de preco foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeactivatePricingTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deactivatePricingTier,
    onSuccess: (tierId) => {
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.detail(tierId) });

      toast({
        title: "Nivel desativado",
        description: "O nivel de preco foi desativado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePropagateTierPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: propagateTierPricing,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const message =
        result.failed_count > 0
          ? `${result.updated_count} colecoes atualizadas, ${result.failed_count} falharam.`
          : `${result.updated_count} colecoes atualizadas com sucesso.`;

      toast({
        title: "Precos propagados",
        description: message,
        variant: result.failed_count > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao propagar precos",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
