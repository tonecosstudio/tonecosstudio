import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import {
  fetchEstimatedProductionCompletion,
  fetchProductionBlockInfo,
  unblockBlockedProductionItem,
} from "@/services/admin/blocked-production-service";

interface UseUnblockProductionOptions {
  productionQueueId: string;
  onSuccess?: () => void;
}

export function useProductionBlockInfo(productionQueueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["production-block-info", productionQueueId],
    queryFn: () => fetchProductionBlockInfo(productionQueueId),
    enabled,
  });
}

export function useEstimatedProductionCompletion(productionQueueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["production-estimated-completion", productionQueueId],
    queryFn: () => fetchEstimatedProductionCompletion(productionQueueId),
    enabled,
  });
}

export function useUnblockProduction({
  productionQueueId,
  onSuccess,
}: UseUnblockProductionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resolutionNotes: string) =>
      unblockBlockedProductionItem({ productionQueueId, resolutionNotes }),
    onSuccess: () => {
      toast({
        title: "Producao desbloqueada",
        description: "O item foi desbloqueado e a producao pode continuar.",
      });

      void queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["blocked-production-items"] });
      void queryClient.invalidateQueries({ queryKey: ["production-stages", productionQueueId] });
      void queryClient.invalidateQueries({
        queryKey: ["production-block-info", productionQueueId],
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desbloquear producao",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
