import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  updateMultiplierSchema,
  updatePurchaseModeSchema,
} from "@/lib/validations/pricing-restructure";
import { updatePurchaseModeRpc } from "@/services/admin/config/admin-config-mutations-service";
import {
  listActivePurchaseModes,
  listPurchaseModes,
  updatePurchaseModeMultiplier,
} from "@/services/payments/purchase-modes-service";
import type { UpdatePurchaseModeInput } from "@/types/pricing-restructure";

export const purchaseModesKeys = {
  all: ["purchase-modes"] as const,
  lists: () => [...purchaseModesKeys.all, "list"] as const,
  active: () => [...purchaseModesKeys.all, "active"] as const,
  detail: (modeKey: string) => [...purchaseModesKeys.all, "detail", modeKey] as const,
};

export function usePurchaseModes() {
  return useQuery({
    queryKey: purchaseModesKeys.lists(),
    queryFn: listPurchaseModes,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActivePurchaseModes() {
  return useQuery({
    queryKey: purchaseModesKeys.active(),
    queryFn: listActivePurchaseModes,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdatePurchaseMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      modeKey,
      input,
    }: {
      modeKey: string;
      input: UpdatePurchaseModeInput;
    }) => {
      const validated = updatePurchaseModeSchema.parse(input);

      await updatePurchaseModeRpc(modeKey, validated);

      return modeKey;
    },
    onSuccess: (modeKey) => {
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.detail(modeKey) });

      toast({
        title: "Modalidade atualizada",
        description: "A modalidade de compra foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar modalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePurchaseModeMultiplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      modeKey,
      newMultiplier,
    }: {
      modeKey: string;
      newMultiplier: number;
    }) => {
      const validated = updateMultiplierSchema.parse({
        mode_key: modeKey,
        new_multiplier: newMultiplier,
      });

      return updatePurchaseModeMultiplier({
        modeKey: validated.mode_key,
        newMultiplier: validated.new_multiplier,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.detail(variables.modeKey) });
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["tier-with-plans"] });

      toast({
        title: "Multiplicador atualizado",
        description: `${result.plans_updated} planos recalculados em ${result.tiers_affected} niveis.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar multiplicador",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
