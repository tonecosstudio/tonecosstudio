import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { PaymentMethod } from "@/types/manual-payment";
import {
  clearPaymentMethodCache,
  deletePaymentMethod,
  listAllPaymentMethods,
  setDefaultPaymentMethod,
  togglePaymentMethodActive,
  updatePaymentMethod,
} from "@/lib/payment-method-service";

export function useAdminPaymentMethods() {
  const queryClient = useQueryClient();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const {
    data: paymentMethods = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payment-methods", "all"],
    queryFn: listAllPaymentMethods,
  });

  useEffect(() => {
    if (paymentMethods.length > 0) {
      setMethods(paymentMethods);
      return;
    }

    setMethods([]);
  }, [paymentMethods]);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePaymentMethodActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Status atualizado",
        description: "Status do método de pagamento foi atualizado com sucesso.",
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar status: ${mutationError.message}`,
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Método padrão definido",
        description: "Método de pagamento definido como padrão com sucesso.",
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao definir método padrão: ${mutationError.message}`,
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updatedMethods: PaymentMethod[]) => {
      const updates = updatedMethods.map((method, index) =>
        updatePaymentMethod(method.id, { display_order: index })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Ordem atualizada",
        description: "Ordem de exibição dos métodos de pagamento foi atualizada.",
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar ordem: ${mutationError.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Método excluído",
        description: "Método de pagamento excluído com sucesso.",
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao excluir método de pagamento: ${mutationError.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    methods,
    setMethods,
    isLoading,
    error,
    toggleActiveMutation,
    setDefaultMutation,
    updateOrderMutation,
    deleteMutation,
  };
}
