import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  deleteCollectionTypeRpc,
  saveCollectionTypeRpc,
} from "@/services/admin/config/admin-config-mutations-service";
import {
  checkCollectionTypeNameExists as checkCollectionTypeNameExistsService,
  getCollectionType,
  getNextCollectionTypeSortOrder,
  listCollectionTypes,
} from "@/services/collections/collection-types-service";
import {
  CACHE_CONFIG,
  CollectionType,
  QUERY_KEYS,
  validateCollectionType,
} from "@/types/contextual-pricing";

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

export const collectionTypeKeys = {
  all: [QUERY_KEYS.COLLECTION_TYPES] as const,
  lists: () => [...collectionTypeKeys.all, "list"] as const,
  list: (filters?: string) => [...collectionTypeKeys.lists(), filters] as const,
  detail: (typeId: string) => [...collectionTypeKeys.all, "detail", typeId] as const,
};

export function useCollectionTypes(includeInactive = false) {
  return useQuery({
    queryKey: collectionTypeKeys.list(includeInactive ? "all" : "active"),
    queryFn: () => listCollectionTypes(includeInactive),
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useCollectionType(typeId: string | null | undefined) {
  return useQuery({
    queryKey: collectionTypeKeys.detail(typeId || ""),
    queryFn: async () => {
      if (!typeId) return null;
      return getCollectionType(typeId);
    },
    enabled: !!typeId,
    staleTime: CACHE_CONFIG.STALE_TIME,
  });
}

export function useActiveCollectionTypes() {
  return useCollectionTypes(false);
}

export function useCreateCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateCollectionTypeInput) => {
      const errors = validateCollectionType(input);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      return saveCollectionTypeRpc<CollectionType>({
        data: {
          name: input.name,
          display_name: input.display_name,
          description: input.description || null,
          sort_order: input.sort_order ?? 0,
          is_active: true,
        },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });

      toast({
        title: "Tipo de colecao criado",
        description: `${data.display_name} foi criado com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tipo de colecao",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateCollectionTypeInput) => {
      const errors = validateCollectionType(input);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      const updateData: Record<string, string | number | boolean | null | undefined> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.display_name !== undefined) updateData.display_name = input.display_name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      return saveCollectionTypeRpc<CollectionType>({
        id: input.id,
        data: updateData,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.detail(variables.id) });

      toast({
        title: "Tipo de colecao atualizado",
        description: `${data.display_name} foi atualizado com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tipo de colecao",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useToggleCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      return saveCollectionTypeRpc<CollectionType>({
        id: input.id,
        data: { is_active: input.is_active },
      });
    },
    onSuccess: (data, variables) => {
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

export function useDeleteCollectionType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (typeId: string) => {
      await deleteCollectionTypeRpc(typeId);
      return typeId;
    },
    onSuccess: (typeId) => {
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionTypeKeys.detail(typeId) });

      toast({
        title: "Tipo de colecao deletado",
        description: "O tipo foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar tipo de colecao",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export async function checkCollectionTypeNameExists(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  return checkCollectionTypeNameExistsService(name, excludeId);
}

export async function getNextSortOrder(): Promise<number> {
  return getNextCollectionTypeSortOrder();
}
