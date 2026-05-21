import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  sendGroupBroadcastMessage,
  type GroupRichMessageFields,
} from "@/services/groups/group-management-service";

interface SendGroupBroadcastInput {
  message: string;
  richFields?: GroupRichMessageFields;
  attachments?: File[];
}

export function useSendGroupBroadcastMessage(groupId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: SendGroupBroadcastInput) => {
      if (!user) throw new Error("Usuario nao autenticado");
      return sendGroupBroadcastMessage({
        groupId,
        senderId: user.id,
        message: input.message,
        richFields: input.richFields,
        attachments: input.attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada para todos os membros do grupo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  return {
    sendMessage: mutation.mutate,
    isSending: mutation.isPending,
  };
}
