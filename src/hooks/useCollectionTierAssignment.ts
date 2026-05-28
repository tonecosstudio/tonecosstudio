/**
 * Hook para gerenciar atribuições de coleções a níveis de preço
 * 
 * Fornece queries e mutations para atribuir, remover e gerenciar
 * atribuições de coleções a níveis de preço.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  assignCollectionToTierRpc,
  bulkAssignCollectionsToTierRpc,
  unassignCollectionFromTierRpc,
} from "@/services/admin/admin-config-mutations-service";
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

// =====================================================
// QUERY KEYS
// =====================================================

export const collectionTierKeys = {
  all: ["collection-tier-assignments"] as const,
  lists: () => [...collectionTierKeys.all, "list"] as const,
  list: (filters?: string) => [...collectionTierKeys.lists(), filters] as const,
  details: () => [...collectionTierKeys.all, "detail"] as const,
  detail: (collectionId: string) => [...collectionTierKeys.details(), collectionId] as const,
  byTier: (tierId: string) => [...collectionTierKeys.all, "tier", tierId] as const,
};

// =====================================================
// QUERIES
// =====================================================

export function useCollectionTierAssignment(collectionId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: collectionTierKeys.detail(collectionId || ""),
    queryFn: async () => {
      if (!collectionId) return null;

      const { data, error } = await supabase
        .from("collection_tier_assignments")
        .select(`
          *,
          pricing_tiers (
            id,
            name,
            price_full,
            price_pix,
            deposit_amount,
            is_active
          )
        `)
        .eq("collection_id", collectionId)
        .maybeSingle();

      if (error) {
        throw new Error(`Erro ao buscar atribuição: ${error.message}`);
      }

      return data;
    },
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
        title: "Erro ao atribuir nível",
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
        title: "Erro ao remover nível",
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
    queryFn: async () => {
      if (!tierId) return [];

      const { data, error } = await supabase
        .from("collection_tier_assignments")
        .select(`
          *,
          collections (
            id,
            name,
            slug,
            is_active,
            is_price_custom
          )
        `)
        .eq("tier_id", tierId);

      if (error) {
        throw new Error(`Erro ao buscar coleções do nível: ${error.message}`);
      }

      return data;
    },
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

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
        title: "Nível atribuído",
        description: "A coleção foi atribuída ao nível com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir nível",
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
        title: "Nível removido",
        description: "A atribuição de nível foi removida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover nível",
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
        ? `${successCount} coleções atribuídas, ${failedCount} falharam.`
        : `${successCount} coleções atribuídas com sucesso.`;

      toast({
        title: "Atribuição em massa concluída",
        description: message,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atribuição em massa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAvailableCollectionsForTier() {
  return useQuery({
    queryKey: [...collectionTierKeys.all, "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, is_price_custom")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar coleções disponíveis: ${error.message}`);
      }

      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
