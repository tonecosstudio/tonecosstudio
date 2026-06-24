import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  purchaseCharacterWithCoinsForCurrentUser,
  purchaseCollectionWithCoinsForCurrentUser,
  refundCoinPurchaseForCurrentUserRpc,
} from "@/services/coins/coins-mutations-service";
import type {
  PurchaseCharacterParams,
  PurchaseWithCoinsResponse,
  UserId,
} from "@/types/coins";
import { invalidateCoinsBalance } from "./useCoinsBalance";
import { invalidateCoinsTransactions } from "./useCoinsTransactions";

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
      return purchaseCharacterWithCoinsForCurrentUser(params);
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
      return purchaseCollectionWithCoinsForCurrentUser(params);
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
