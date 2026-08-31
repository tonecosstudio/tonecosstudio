import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  checkSalesOpen,
  closeMonthlySales,
  getCurrentProductionLimit,
  reopenMonthlySales,
} from "@/services/production/production-limit-service";

function getErrorMessage(error: Error): string {
  return error.message || "Erro inesperado";
}

export function useProductionLimit() {
  const queryClient = useQueryClient();

  const limitQuery = useQuery({
    queryKey: ["production-limit"],
    queryFn: getCurrentProductionLimit,
    refetchInterval: 30000,
  });

  const salesOpenQuery = useQuery({
    queryKey: ["sales-open"],
    queryFn: checkSalesOpen,
    refetchInterval: 60000,
  });

  const closeSales = useMutation({
    mutationFn: closeMonthlySales,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      queryClient.invalidateQueries({ queryKey: ["sales-open"] });
      toast.success("Vendas fechadas com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao fechar vendas", {
        description: getErrorMessage(error),
      });
    },
  });

  const reopenSales = useMutation({
    mutationFn: reopenMonthlySales,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      queryClient.invalidateQueries({ queryKey: ["sales-open"] });
      toast.success("Vendas reabertas com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao reabrir vendas", {
        description: getErrorMessage(error),
      });
    },
  });

  const limit = limitQuery.data;
  const salesOpen = salesOpenQuery.data === true;

  return {
    limit,
    isLoading: limitQuery.isLoading || salesOpenQuery.isLoading,
    isError: limitQuery.isError || salesOpenQuery.isError,
    error: limitQuery.error ?? salesOpenQuery.error ?? null,
    salesOpen,

    available: limit?.prod_available ?? 0,
    total: limit?.prod_global_limit ?? 0,
    percentage: limit?.prod_percentage_sold ?? 0,
    isClosed: limit?.prod_is_closed ?? true,
    isAlmostFull: limit ? limit.prod_percentage_sold >= 80 : false,

    closeSales: closeSales.mutate,
    reopenSales: reopenSales.mutate,

    isClosing: closeSales.isPending,
    isReopening: reopenSales.isPending,
  };
}
