/**
 * Hook personalizado para gerenciar atualizações em tempo real no dashboard de pagamentos
 *
 * Requirements: 16.1-16.15
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentSystemRealtime } from "@/hooks/use-payment-system-realtime";
import { log } from "@/lib/logger";
import type { SupportMessage } from "@/hooks/use-conversation-realtime";
import type { ManualPayment } from "@/types/manual-payment";
import { useRealtimeIndicator } from "./useRealtimeIndicator";

interface UsePaymentRealtimeDashboardOptions {
  enabled?: boolean;
  onNewPayment?: (payment: ManualPayment) => void;
  onPaymentUpdate?: (payment: ManualPayment) => void;
  onPaymentRemoved?: (paymentId: string) => void;
  onNewMessage?: (message: SupportMessage) => void;
}

export function usePaymentRealtimeDashboard(options: UsePaymentRealtimeDashboardOptions = {}) {
  const { enabled = true, onNewPayment, onPaymentUpdate, onPaymentRemoved, onNewMessage } = options;

  const queryClient = useQueryClient();
  const {
    isConnected,
    error,
    hasNewUpdates,
    newUpdateCount,
    incrementUpdateCount,
    resetUpdateCount,
  } = useRealtimeIndicator();

  // Hook para atualizações do sistema de pagamento
  const paymentRealtime = usePaymentSystemRealtime({
    subscribeToPayments: enabled,
    subscribeToConversations: enabled,
    paymentOptions: {
      events: ["INSERT", "UPDATE", "DELETE"],
      onPaymentChange: ({ event, old, new: payment }) => {
        if (event === "INSERT" && payment) {
          log.info("Novo pagamento recebido em tempo real", { payment });
          onNewPayment?.(payment);
          incrementUpdateCount();

          // Invalida a query de pagamentos pendentes
          queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
          queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
          return;
        }

        if (event === "UPDATE" && payment) {
          log.info("Pagamento atualizado em tempo real", { payment });
          onPaymentUpdate?.(payment);
          incrementUpdateCount();

          // Invalida queries relacionadas a este pagamento específico
          queryClient.invalidateQueries({ queryKey: ["payment-details", payment.id] });
          queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
          return;
        }

        if (event === "DELETE" && old?.id) {
          log.info("Pagamento removido em tempo real", { paymentId: old.id });
          onPaymentRemoved?.(old.id);
          incrementUpdateCount();

          // Invalida queries
          queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
          queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
        }
      },
    },
    conversationOptions: {
      events: ["INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: false,
      onNewMessage: (message) => {
        log.info("Nova mensagem em tempo real", { message });
        onNewMessage?.(message);
        incrementUpdateCount();

        // Invalida queries de conversas
        queryClient.invalidateQueries({ queryKey: ["conversation", message.conversation_id] });
      },
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
    reconnect: paymentRealtime.reconnectAll,
    disconnect: paymentRealtime.disconnectAll,

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
  usePaymentSystemRealtime({
    paymentOptions: {
      status: ["pending", "under_review", "requires_info"],
      events: ["INSERT", "UPDATE"],
      onPaymentChange: ({ event, new: payment }) => {
        if (event === "INSERT" && payment) {
          log.info("Novo pagamento no dashboard admin", { payment });
          incrementUpdateCount();

          // Invalida queries relacionadas
          queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
          queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
          return;
        }

        if (event === "UPDATE" && payment) {
          log.info("Pagamento atualizado no dashboard", { payment });
          incrementUpdateCount();

          // Atualiza o cache do React Query
          queryClient.setQueryData(["payment", payment.id], payment);
          queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
        }
      },
    },
    conversationOptions: {
      events: ["INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: false,
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
    subscribeToPayments: !!userId,
    subscribeToConversations: !!userId,
    paymentOptions: {
      userId,
      events: ["UPDATE"],
      onPaymentChange: ({ event, new: payment }) => {
        if (event !== "UPDATE" || !payment) return;

        log.info("Pagamento do usuário atualizado", { payment, userId });
        incrementUpdateCount();

        // Atualiza o cache do React Query
        queryClient.setQueryData(["user-payments", userId], (oldData: unknown) => {
          if (!Array.isArray(oldData)) return oldData;

          return (oldData as ManualPayment[]).map((item) =>
            item.id === payment.id ? { ...item, ...payment } : item
          );
        });
      },
    },
    conversationOptions: {
      userId,
      events: ["INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: false,
      onNewMessage: (message) => {
        log.info("Nova mensagem para o usuário", { message, userId });
        incrementUpdateCount();

        // Invalida queries de conversa
        queryClient.invalidateQueries({
          queryKey: ["conversation", message.conversation_id],
        });
      },
    },
  });

  return {
    isConnected,
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount,
  };
}
