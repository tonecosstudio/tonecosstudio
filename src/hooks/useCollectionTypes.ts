/**
 * Hook para gerenciar tipos de coleção dinâmicos
 * 
 * Permite admin criar, atualizar e gerenciar tipos de coleção
 * de forma dinâmica sem necessidade de alterar código.
 * 
 * Spec: contextual-pricing-system
 * Task: 5.1
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";
import {
  deleteCollectionTypeRpc,
  saveCollectionTypeRpc,
} from "@/services/admin/admin-config-mutations-service";
import {
  CollectionType,
  QUERY_KEYS,
  CACHE_CONFIG,
  validateCollectionType,
} from "@/types/contextual-pricing";

// =====================================================
// TYPES
// =====================================================

export interface CreateCollectionTypeInput {
  name: string;
  display_name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateCollectionTypeInput {
  id: string;
  name?: string;
  display_name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const collectionTypeKeys = {
  all: [QUERY_KEYS.COLLECTION_TYPES] as const,
  lists: () => [...collectionTypeKeys.all, "list"] as const,
  list: (filters?: string) => [...collectionTypeKeys.lists(), filters] as const,
  detail: (typeId: string) => [...collectionTypeKeys.all, "detail", typeId] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar todos os tipos de coleção
 */
export function useCollectionTypes(includeInactive = false) {
  return useQuery({
    queryKey: collectionTypeKeys.list(includeInactive ? "all" : "active"),
    queryFn: async () => {
      let query = supabase
        .from("collection_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar tipos de coleção: ${error.message}`);
      }

      return data as CollectionType[];
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar um tipo de coleção específico
 */
export function useCollectionType(typeId: string | null | undefined) {
  return useQuery({
    queryKey: collectionTypeKeys.detail(typeId || ""),
    queryFn: async () => {
      if (!typeId) return null;

      const { data, error } = await supabase
        .from("collection_types")
        .select("*")
        .eq("id", typeId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar tipo de coleção: ${error.message}`);
      }

      return data as CollectionType;
    },
    enabled: !!typeId,
    staleTime: CACHE_CONFIG.STALE_TIME, // 5 minutos (RN010)
  });
}

/**
 * Hook para buscar tipos ativos ordenados
 */
export function useActiveCollectionTypes() {
  return useCollectionTypes(false);
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para criar novo tipo de coleção
 */
export function useCreateCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateCollectionTypeInput) => {
      // Validar input
      const errors = validateCollectionType(input);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      // Criar tipo
      const data = await saveCollectionTypeRpc<CollectionType>({
        data: {
          name: input.name,
          display_name: input.display_name,
          description: input.description || null,
          sort_order: input.sort_order ?? 0,
          is_active: true,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });

      toast({
        title: "Tipo de coleção criado",
        description: `${data.display_name} foi criado com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tipo de coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar tipo de coleção
 */
export function useUpdateCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateCollectionTypeInput) => {
      // Validar input
      const errors = validateCollectionType(input);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      // Preparar dados para atualização
      const updateData: Record<string, string | number | boolean | null | undefined> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.display_name !== undefined) updateData.display_name = input.display_name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      const data = await saveCollectionTypeRpc<CollectionType>({
        id: input.id,
        data: updateData,
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.detail(variables.id) });

      toast({
        title: "Tipo de coleção atualizado",
        description: `${data.display_name} foi atualizado com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tipo de coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para ativar/desativar tipo de coleção
 */
export function useToggleCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const data = await saveCollectionTypeRpc<CollectionType>({
        id: input.id,
        data: { is_active: input.is_active },
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.detail(variables.id) });

      const status = variables.is_active ? "ativado" : "desativado";
      toast({
        title: `Tipo ${status}`,
        description: `${data.display_name} foi ${status} com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar tipo de coleção
 * 
 * ATENÇÃO: Isso irá deletar em cascata todos os preços base associados
 */
export function useDeleteCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (typeId: string) => {
      await deleteCollectionTypeRpc(typeId);

      return typeId;
    },
    onSuccess: (typeId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.detail(typeId) });

      toast({
        title: "Tipo de coleção deletado",
        description: "O tipo foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar tipo de coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Verifica se um nome de tipo já existe
 */
export async function checkCollectionTypeNameExists(name: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from("collection_types")
    .select("id")
    .eq("name", name);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    log.error("Failed to check collection type name", { error, name, excludeId });
    return false;
  }

  return data && data.length > 0;
}

/**
 * Obtém o próximo sort_order disponível
 */
export async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from("collection_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 0;
  }

  return (data[0].sort_order ?? 0) + 1;
}
