import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { refundCoinPurchaseForCurrentUserRpc } from "@/services/coins-mutations-service";
import type {
  CoinsAmount,
  PurchaseCharacterParams,
  PurchaseWithCoinsResponse,
  UserId,
} from "@/types/coins";
import { invalidateCoinsBalance } from "./useCoinsBalance";
import { invalidateCoinsTransactions } from "./useCoinsTransactions";

type PurchaseCoinsRpcResult = {
  success: boolean;
  message: string;
  new_balance: CoinsAmount;
  transaction_id?: string | null;
};

export interface PurchaseCollectionParams {
  user_id: UserId;
  collection_id: string;
}

export interface RefundPurchaseParams {
  user_id: UserId;
  item_id: string;
  item_type: "character" | "collection";
  reason: string;
}

function firstPurchaseRpcResult(data: PurchaseCoinsRpcResult | PurchaseCoinsRpcResult[] | null) {
  return Array.isArray(data) ? data[0] : data;
}

function toPurchaseResponse(
  result: PurchaseCoinsRpcResult | null | undefined,
  itemId: string,
  fallbackMessage: string
): PurchaseWithCoinsResponse {
  if (!result?.success) {
    throw new Error(result?.message ?? fallbackMessage);
  }

  return {
    success: result.success,
    message: result.message,
    new_balance: result.new_balance,
    item_id: itemId,
    transaction_id: result.transaction_id || "",
  };
}

function invalidateCoinPurchaseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: UserId
) {
  invalidateCoinsBalance(queryClient, userId);
  invalidateCoinsTransactions(queryClient);
  queryClient.invalidateQueries({ queryKey: ["user-characters"] });
  queryClient.invalidateQueries({ queryKey: ["user-collections"] });
}

function toPurchaseErrorMessage(message: string, itemType: "character" | "collection") {
  if (message.includes("insufficient")) {
    return "Saldo insuficiente para esta compra.";
  }

  if (message.includes("already owns")) {
    return itemType === "character"
      ? "Voce ja possui este personagem."
      : "Voce ja possui esta colecao.";
  }

  if (message.includes("not found")) {
    return itemType === "character"
      ? "Personagem nao encontrado."
      : "Colecao nao encontrada.";
  }

  return message;
}

export function usePurchaseCharacter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: PurchaseCharacterParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, character_id } = params;
      await assertCurrentUserId(user_id);

      const { data, error } = await supabase.rpc("purchase_character_with_coins", {
        p_user_id: user_id,
        p_character_id: character_id,
      });

      if (error) {
        throw new Error(error.message);
      }

      return toPurchaseResponse(
        firstPurchaseRpcResult(data),
        character_id,
        "Compra de personagem nao retornou resultado."
      );
    },
    onSuccess: (data, variables) => {
      invalidateCoinPurchaseCaches(queryClient, variables.user_id);

      toast({
        title: "Compra realizada!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na compra",
        description: toPurchaseErrorMessage(error.message, "character"),
        variant: "destructive",
      });
    },
  });
}

export function usePurchaseCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: PurchaseCollectionParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, collection_id } = params;
      await assertCurrentUserId(user_id);

      const { data, error } = await supabase.rpc("purchase_collection_with_coins", {
        p_user_id: user_id,
        p_collection_id: collection_id,
      });

      if (error) {
        throw new Error(error.message);
      }

      return toPurchaseResponse(
        firstPurchaseRpcResult(data),
        collection_id,
        "Compra de colecao nao retornou resultado."
      );
    },
    onSuccess: (data, variables) => {
      invalidateCoinPurchaseCaches(queryClient, variables.user_id);

      toast({
        title: "Compra realizada!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na compra",
        description: toPurchaseErrorMessage(error.message, "collection"),
        variant: "destructive",
      });
    },
  });
}

export function useRefundPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      params: RefundPurchaseParams
    ): Promise<PurchaseWithCoinsResponse> => {
      const { user_id, item_id, item_type, reason } = params;
      await assertCurrentUserId(user_id);

      return refundCoinPurchaseForCurrentUserRpc({
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

export function usePurchaseItem() {
  const purchaseCharacter = usePurchaseCharacter();
  const purchaseCollection = usePurchaseCollection();

  return useMutation({
    mutationFn: async (params: {
      userId: UserId;
      itemId: string;
      itemType: "character" | "collection";
    }) => {
      const { userId, itemId, itemType } = params;

      if (itemType === "character") {
        return purchaseCharacter.mutateAsync({
          user_id: userId,
          character_id: itemId,
        });
      }

      return purchaseCollection.mutateAsync({
        user_id: userId,
        collection_id: itemId,
      });
    },
  });
}
