// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductionLimit {
  prod_month: number;
  prod_year: number;
  prod_global_limit: number;
  prod_units_sold: number;
  prod_available: number;
  prod_is_closed: boolean;
  prod_percentage_sold: number;
}

export function useProductionLimit() {
  const queryClient = useQueryClient();

  // Query para buscar limite atual
  const limitQuery = useQuery({
    queryKey: ["production-limit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_current_production_limit").single();

      if (error) throw error;
      return data as ProductionLimit;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Query para verificar se vendas estão abertas
  const salesOpenQuery = useQuery({
    queryKey: ["sales-open"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("are_sales_open");
      if (error) throw error;
      return data as boolean;
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // Mutation para incrementar vendas
  const incrementSales = useMutation({
    mutationFn: async (quantity: number = 1) => {
      const { data, error } = await supabase.rpc("increment_monthly_sales", {
        quantity,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      queryClient.invalidateQueries({ queryKey: ["sales-open"] });
    },
    onError: (error: any) => {
      if (error.message?.includes("Limite de produção mensal atingido")) {
        toast.error("Limite de produção atingido", {
          description: "Todas as vagas do mês foram preenchidas.",
        });
      } else {
        toast.error("Erro ao processar venda", {
          description: error.message,
        });
      }
    },
  });

  // Mutation para fechar vendas (admin)
  const closeSales = useMutation({
    mutationFn: async (reason: string = "manual") => {
      const { data, error } = await supabase.rpc("close_monthly_sales", {
        reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      queryClient.invalidateQueries({ queryKey: ["sales-open"] });
      toast.success("Vendas fechadas com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao fechar vendas", {
        description: error.message,
      });
    },
  });

  // Mutation para reabrir vendas (admin)
  const reopenSales = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reopen_monthly_sales");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      queryClient.invalidateQueries({ queryKey: ["sales-open"] });
      toast.success("Vendas reabertas com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao reabrir vendas", {
        description: error.message,
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
    incrementSales: incrementSales.mutate,
    closeSales: closeSales.mutate,
    reopenSales: reopenSales.mutate,

    // Loading states
    isIncrementing: incrementSales.isPending,
    isClosing: closeSales.isPending,
    isReopening: reopenSales.isPending,
  };
}
