import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  createGroupFromForm,
  listCollectionsForGroupRules,
  type GroupCreationFormValues,
} from "@/services/groups/group-management-service";
import type { GroupType } from "@/types/groups";

export function useGroupCollections(selectedType?: GroupType) {
  return useQuery({
    queryKey: ["collections-for-groups"],
    queryFn: listCollectionsForGroupRules,
    enabled: selectedType === "assinantes" || selectedType === "colecao",
  });
}

export function useCreateGroupActions(options: { onSuccess?: () => void } = {}) {
  const { user } = useAuth();

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupCreationFormValues) => {
      if (!user) throw new Error("Usuario nao autenticado");
      return createGroupFromForm(data, user.id);
    },
    onSuccess: () => {
      toast.success("Grupo criado com sucesso");
      options.onSuccess?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar grupo");
    },
  });

  return {
    createGroup: createGroupMutation.mutateAsync,
    isCreating: createGroupMutation.isPending,
  };
}
