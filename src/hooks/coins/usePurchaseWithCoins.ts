import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { refundCoinPurchaseForCurrentUserRpc } from "@/services/coins/coins-mutations-service";
import type { PurchaseWithCoinsResponse, UserId } from "@/types/coins";
import { invalidateCoinsBalance } from "./useCoinsBalance";
import { invalidateCoinsTransactions } from "./useCoinsTransactions";

export interface RefundPurchaseParams {
  user_id: UserId;
  item_id: string;
  item_type: "character" | "collection";
  reason: string;
}

function invalidateCoinPurchaseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: UserId,
) {
  invalidateCoinsBalance(queryClient, userId);
  invalidateCoinsTransactions(queryClient);
  queryClient.invalidateQueries({ queryKey: ["user-characters"] });
  queryClient.invalidateQueries({ queryKey: ["user-collections"] });
}

export function useRefundPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: RefundPurchaseParams,
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, item_id, item_type, reason } = params;

      return refundCoinPurchaseForCurrentUserRpc({
        userId: user_id,
        itemId: item_id,
        itemType: item_type,
        reason,
      });
    },
    onSuccess: (data, variables) => {
      invalidateCoinPurchaseCaches(queryClient, variables.user_id);

      toast({
        title: "Reembolso realizado!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no reembolso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
