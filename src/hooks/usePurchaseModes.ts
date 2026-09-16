import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  updateMultiplierSchema,
  updatePurchaseModeSchema,
} from "@/lib/validations/pricing-restructure";
import { updatePurchaseModeRpc } from "@/services/admin/config/admin-config-mutations-service";
import { listAdminPurchaseModes } from "@/services/admin/pricing/purchase-modes-read-service";
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
    queryFn: listAdminPurchaseModes,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActivePurchaseModes() {
  return useQuery({
    queryKey: purchaseModesKeys.lists(),
    queryFn: listAdminPurchaseModes,
    select: (modes) => modes.filter((mode) => mode.is_active),
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

      await updatePurchaseModeRpc(validated.mode_key, {
        price_multiplier: validated.new_multiplier,
      });

      return validated.mode_key;
    },
    onSuccess: (modeKey) => {
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseModesKeys.detail(modeKey) });
      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["tier-with-plans"] });

      toast({
        title: "Multiplicador atualizado",
        description:
          "A referência da modalidade foi atualizada. Preços já persistidos nos planos não são recalculados automaticamente.",
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
