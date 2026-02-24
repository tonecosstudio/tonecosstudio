/**
 * Hook personalizado para gerenciar atualizações em tempo real no dashboard de pagamentos
 *
 * Requirements: 16.1-16.15
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentSystemRealtime } from "@/hooks/use-payment-system-realtime";
import { useRealtimeIndicator } from "./useRealtimeIndicator";

interface UsePaymentRealtimeDashboardOptions {
  enabled?: boolean;
  onNewPayment?: (payment: any) => void;
  onPaymentUpdate?: (payment: any) => void;
  onPaymentRemoved?: (paymentId: string) => void;
  onNewMessage?: (message: any) => void;
}

export function usePaymentRealtimeDashboard(options: UsePaymentRealtimeDashboardOptions = {}) {
  const { enabled = true, onNewPayment, onPaymentUpdate, onPaymentRemoved, onNewMessage } = options;

  const queryClient = useQueryClient();
  const {
    isConnected,
    isReconnecting,
    error,
    hasNewUpdates,
    newUpdateCount,
    incrementUpdateCount,
    resetUpdateCount,
  } = useRealtimeIndicator();

  // Hook para atualizações do sistema de pagamento
  const paymentRealtime = usePaymentSystemRealtime({
    enabled,
    onPaymentCreated: (payment) => {
      console.log("Novo pagamento recebido em tempo real:", payment);
      onNewPayment?.(payment);
      incrementUpdateCount();

      // Invalida a query de pagamentos pendentes
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
    onPaymentUpdated: (payment) => {
      console.log("Pagamento atualizado em tempo real:", payment);
      onPaymentUpdate?.(payment);
      incrementUpdateCount();

      // Invalida queries relacionadas a este pagamento específico
      queryClient.invalidateQueries({ queryKey: ["payment-details", payment.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    },
    onPaymentRemoved: (paymentId) => {
      console.log("Pagamento removido em tempo real:", paymentId);
      onPaymentRemoved?.(paymentId);
      incrementUpdateCount();

      // Invalida queries
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
    onNewMessage: (message) => {
      console.log("Nova mensagem em tempo real:", message);
      onNewMessage?.(message);
      incrementUpdateCount();

      // Invalida queries de conversas
      queryClient.invalidateQueries({ queryKey: ["conversation", message.conversationId] });
    },
  });

  // Função para forçar uma atualização manual
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    resetUpdateCount();
  }, [queryClient, resetUpdateCount]);

  return {
    // Estado da conexão
    isConnected,
    isReconnecting: paymentRealtime.isReconnecting,
    hasError: !!error,
    error,

    // Indicadores de atualização
    hasNewUpdates,
    newUpdateCount,

    // Funções
    refreshData,
    resetUpdateCount,

    // Funções de reconexão
    reconnect: paymentRealtime.reconnect,
    disconnect: paymentRealtime.disconnect,

    // Estatísticas
    stats: {
      totalUpdates: newUpdateCount,
      isConnected,
      lastUpdate: new Date().toISOString(),
    },
  };
}

// Hook para o dashboard admin
export function useAdminDashboardRealtime() {
  const queryClient = useQueryClient();
  const {
    isConnected,
    isReconnecting,
    error,
    hasNewUpdates,
    newUpdateCount,
    incrementUpdateCount,
    resetUpdateCount,
  } = useRealtimeIndicator();

  // Hook para novos pagamentos
  const { isConnected: paymentsConnected } = usePaymentSystemRealtime({
    enabled: true,
    onPaymentCreated: (payment) => {
      console.log("Novo pagamento no dashboard admin:", payment);
      incrementUpdateCount();

      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onPaymentUpdated: (payment) => {
      console.log("Pagamento atualizado no dashboard:", payment);
      incrementUpdateCount();

      // Atualiza o cache do React Query
      queryClient.setQueryData(["payment", payment.id], payment);
      queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    },
  });

  return {
    isConnected,
    isReconnecting,
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount,
    hasError: !!error,
    error,
  };
}

// Hook para o dashboard do cliente
export function useCustomerDashboardRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const { hasNewUpdates, newUpdateCount, incrementUpdateCount, resetUpdateCount } =
    useRealtimeIndicator();

  const { isConnected } = usePaymentSystemRealtime({
    enabled: !!userId,
    onPaymentUpdated: (payment) => {
      if (payment.user_id === userId) {
        console.log("Pagamento do usuário atualizado:", payment);
        incrementUpdateCount();

        // Atualiza o cache do React Query
        queryClient.setQueryData(["user-payments", userId], (oldData: any) => {
          if (!oldData) return oldData;

          return oldData.map((p: any) => (p.id === payment.id ? { ...p, ...payment } : p));
        });
      }
    },
    onNewMessage: (message) => {
      if (message.user_id === userId) {
        console.log("Nova mensagem para o usuário:", message);
        incrementUpdateCount();

        // Invalida queries de conversa
        queryClient.invalidateQueries({
          queryKey: ["conversation", message.conversationId],
        });
      }
    },
  });

  return {
    isConnected,
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount,
  };
}
