import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { scheduleGroupMessage } from "@/services/groups/groups-message-service";

interface ScheduleMessageParams {
  groupId: string;
  message: string;
  scheduledAt: Date;
}

export function useGroupMessageScheduling(onScheduled?: () => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, message, scheduledAt }: ScheduleMessageParams) => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      await scheduleGroupMessage({
        groupId,
        message,
        scheduledAt,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages"] });
      toast.success("Mensagem agendada com sucesso");
      onScheduled?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao agendar mensagem");
    },
  });
}
