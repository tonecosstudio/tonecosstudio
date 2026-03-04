// @ts-nocheck
/**
 * Hook para gerenciar atribuições de coleções a níveis de preço
 * 
 * Fornece queries e mutations para atribuir, remover e gerenciar
 * atribuições de coleções a níveis de preço.
 * Requisitos: 2.1, 2.4, 2.5, 2.7, 10.1
 * Tarefa: 8.2
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  CollectionTierAssignment,
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

/**
 * Hook para buscar a atribuição de nível de uma coleção específica
 * Requisitos: 2.4, 6.4
 */
export function useCollectionTierAssignment(collectionId: string | null | undefined) {
  return useQuery({
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

      return data as CollectionTierAssignment & {
        pricing_tiers: {
          id: string;
          name: string;
          price_full: number;
          price_pix: number;
          deposit_amount: number;
          is_active: boolean;
        };
      } | null;
    },
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar todas as coleções atribuídas a um nível
 * Requisitos: 1.9, 3.1
 */
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
            uses_tier_pricing
          )
        `)
        .eq("tier_id", tierId);

      if (error) {
        throw new Error(`Erro ao buscar coleções do nível: ${error.message}`);
      }

      return data;
    },
    enabled: !!tierId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para atribuir uma coleção a um nível
 * Requisitos: 2.1, 2.2, 2.5, 2.6
 */
export function useAssignCollectionToTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AssignTierInput) => {
      // Validar input
      const validated = assignTierSchema.parse(input);

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { error } = await supabase.rpc("assign_collection_to_tier", {
        p_collection_id: validated.collection_id,
        p_tier_id: validated.tier_id,
        p_assigned_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao atribuir nível: ${error.message}`);
      }

      return validated.collection_id;
    },
    onSuccess: (collectionId) => {
      // Invalidar queries relacionadas
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

/**
 * Hook para remover a atribuição de nível de uma coleção
 * Requisitos: 2.7, 2.8
 */
export function useUnassignCollectionFromTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Chamar função do banco de dados
      const { error } = await supabase.rpc("unassign_collection_from_tier", {
        p_collection_id: collectionId,
        p_unassigned_by: user.id,
      });

      if (error) {
        throw new Error(`Erro ao remover nível: ${error.message}`);
      }

      return collectionId;
    },
    onSuccess: (collectionId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      toast({
        title: "Nível removido",
        description: "A atribuição de nível foi removida. A coleção agora usa preços padrão.",
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

/**
 * Hook para atribuição em massa de coleções a um nível
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export function useBulkAssignTier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BulkAssignTierInput) => {
      // Validar input
      const validated = bulkAssignTierSchema.parse(input);

      // Obter token de autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Chamar Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-assign-tier`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            collection_ids: validated.collection_ids,
            tier_id: validated.tier_id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atribuir níveis em massa");
      }

      const result = (await response.json()) as BulkAssignTierResponse;
      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTierKeys.all });
      queryClient.invalidateQueries({ queryKey: pricingTiersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const successCount = result.success.length;
      const failedCount = result.failed.length;

      const message =
        failedCount > 0
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

/**
 * Hook para buscar coleções disponíveis para atribuição
 * (coleções sem nível ou com preço customizado desabilitado)
 * Requisitos: 10.2
 */
export function useAvailableCollectionsForTier() {
  return useQuery({
    queryKey: [...collectionTierKeys.all, "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, price_full, price_pix, deposit_amount, is_price_custom")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar coleções disponíveis: ${error.message}`);
      }

      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
