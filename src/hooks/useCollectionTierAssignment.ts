import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  assignCollectionToTierRpc,
  bulkAssignCollectionsToTierRpc,
  unassignCollectionFromTierRpc,
} from "@/services/admin/config/admin-config-mutations-service";
import {
  getCollectionTierAssignment,
  listAvailableCollectionsForTier,
  listCollectionsByTier,
} from "@/services/pricing/pricing-tier-read-service";
import type {
  AssignTierInput,
  BulkAssignTierInput,
  BulkAssignTierResponse,
} from "@/types/pricing-tiers";
import {
  assignTierSchema,
  bulkAssignTierSchema,
} from "@/lib/validations/pricing-tiers";
import { pricingTiersKeys } from "./usePricingTiers";

export const collectionTierKeys = {
  all: ["collection-tier-assignments"] as const,
  lists: () => [...collectionTierKeys.all, "list"] as const,
  list: (filters?: string) => [...collectionTierKeys.lists(), filters] as const,
  details: () => [...collectionTierKeys.all, "detail"] as const,
  detail: (collectionId: string) => [...collectionTierKeys.details(), collectionId] as const,
  byTier: (tierId: string) => [...collectionTierKeys.all, "tier", tierId] as const,
};

export function useCollectionTierAssignment(collectionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: collectionTierKeys.detail(collectionId || ""),
    queryFn: () => getCollectionTierAssignment(collectionId),
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000,
  });

  const assignTier = useMutation({
    mutationFn: async (input: { tierId: string }) => {
      if (!collectionId) throw new Error("Collection ID required");

      await assignCollectionToTierRpc({
        collectionId,
        tierId: input.tierId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unassignTier = useMutation({
    mutationFn: async () => {
      if (!collectionId) throw new Error("Collection ID required");

      await unassignCollectionFromTierRpc(collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    ...query,
    assignTier,
    unassignTier,
  };
}

export function useCollectionsByTier(tierId: string | null | undefined) {
  return useQuery({
    queryKey: collectionTierKeys.byTier(tierId || ""),
    queryFn: () => listCollectionsByTier(tierId),
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAssignCollectionToTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AssignTierInput) => {
      const validated = assignTierSchema.parse(input);

      await assignCollectionToTierRpc({
        collectionId: validated.collection_id,
        tierId: validated.tier_id,
      });

      return validated.collection_id;
    },
    onSuccess: (collectionId) => {
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      toast({
        title: "Nivel atribuido",
        description: "A colecao foi atribuida ao nivel com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnassignCollectionFromTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      await unassignCollectionFromTierRpc(collectionId);
      return collectionId;
    },
    onSuccess: (collectionId) => {
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      toast({
        title: "Nivel removido",
        description: "A atribuicao de nivel foi removida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover nivel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBulkAssignTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BulkAssignTierInput) => {
      const validated = bulkAssignTierSchema.parse(input);

      return bulkAssignCollectionsToTierRpc<BulkAssignTierResponse>({
        tierId: validated.tier_id,
        collectionIds: validated.collection_ids,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const successCount = result.success.length;
      const failedCount = result.failed.length;
      const message = failedCount > 0
        ? `${successCount} colecoes atribuidas, ${failedCount} falharam.`
        : `${successCount} colecoes atribuidas com sucesso.`;

      toast({
        title: "Atribuicao em massa concluida",
        description: message,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atribuicao em massa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAvailableCollectionsForTier() {
  return useQuery({
    queryKey: [...collectionTierKeys.all, "available"],
    queryFn: listAvailableCollectionsForTier,
    staleTime: 2 * 60 * 1000,
  });
}
