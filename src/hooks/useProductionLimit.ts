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

  // Query para buscar limite atual
  const limitQuery = useQuery({
    queryKey: ["production-limit"],
    queryFn: getCurrentProductionLimit,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Query para verificar se vendas estão abertas
  const salesOpenQuery = useQuery({
    queryKey: ["sales-open"],
    queryFn: checkSalesOpen,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // Mutation para fechar vendas (admin)
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

  // Mutation para reabrir vendas (admin)
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

  return {
    // Dados
    limit: limitQuery.data,
    isLoading: limitQuery.isLoading,
    isError: limitQuery.isError,
    salesOpen: salesOpenQuery.data ?? true,

    // Computed
    available: limitQuery.data?.prod_available ?? 0,
    total: limitQuery.data?.prod_global_limit ?? 0,
    percentage: limitQuery.data?.prod_percentage_sold ?? 0,
    isClosed: limitQuery.data?.prod_is_closed ?? false,
    isAlmostFull: (limitQuery.data?.prod_percentage_sold ?? 0) >= 80,

    // Mutations
    closeSales: closeSales.mutate,
    reopenSales: reopenSales.mutate,

    // Loading states
    isClosing: closeSales.isPending,
    isReopening: reopenSales.isPending,
  };
}
