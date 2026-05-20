import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  deleteGroupMessageTemplate,
  listGroupMessageTemplates,
  saveGroupMessageTemplate,
  type GroupMessageTemplate,
} from "@/services/groups-message-service";

export interface SaveMessageTemplateParams {
  id?: string;
  name: string;
  content: string;
}

const groupMessageTemplateKeys = {
  all: ["message-templates"] as const,
};

export function useGroupMessageTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: groupMessageTemplateKeys.all,
    queryFn: listGroupMessageTemplates,
    enabled: Boolean(user),
  });

  const saveTemplate = useMutation({
    mutationFn: async (data: SaveMessageTemplateParams) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      await saveGroupMessageTemplate({
        ...data,
        createdBy: user.id,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: groupMessageTemplateKeys.all });
      toast.success(variables.id ? "Template atualizado" : "Template criado");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: deleteGroupMessageTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupMessageTemplateKeys.all });
      toast.success("Template deletado");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar template");
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    saveTemplate,
    deleteTemplate,
  };
}

export type { GroupMessageTemplate };
