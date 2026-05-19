/**
 * Hook personalizado para gerenciar atualizações em tempo real na visualização de detalhes de pagamento
 *
 * Requirements: 16.1-16.15
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaymentStatusRealtime } from "@/hooks/use-payment-realtime";
import { useConversationMessagesRealtime } from "@/hooks/use-conversation-realtime";
import { toast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";
import type { SupportMessage } from "@/hooks/use-conversation-realtime";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";
import { useRealtimeIndicator } from "./useRealtimeIndicator";

interface UsePaymentDetailsRealtimeOptions {
  paymentId: string;
  conversationId?: string;
  enabled?: boolean;
  onStatusChange?: (
    newStatus: PaymentStatus,
    oldStatus: PaymentStatus | null,
    payment: ManualPayment
  ) => void;
  onNewMessage?: (message: SupportMessage) => void;
  onError?: (error: Error) => void;
}

function mergePaymentDetailsCache(
  oldData: unknown,
  newStatus: PaymentStatus,
  payment: ManualPayment
) {
  if (!oldData || typeof oldData !== "object" || Array.isArray(oldData)) {
    return oldData;
  }

  return { ...oldData, status: newStatus, ...payment };
}

export function usePaymentDetailsRealtime(options: UsePaymentDetailsRealtimeOptions) {
  const { paymentId, conversationId, enabled = true, onStatusChange, onNewMessage } = options;

  const queryClient = useQueryClient();
  const { hasNewUpdates, newUpdateCount, incrementUpdateCount, resetUpdateCount } =
    useRealtimeIndicator();

  // Hook para atualizações de status do pagamento
  const paymentRealtime = usePaymentStatusRealtime(paymentId, (newStatus, oldStatus, payment) => {
    if (!enabled) return;

    log.info("Status do pagamento atualizado em tempo real", {
      paymentId,
      oldStatus,
      newStatus,
      payment,
    });

    // Incrementa contador de atualizações
    incrementUpdateCount();

    // Chama callback personalizado
    onStatusChange?.(newStatus, oldStatus, payment);

    // Atualiza o cache do React Query
    queryClient.setQueryData(["payment-details", paymentId], (oldData: unknown) =>
      mergePaymentDetailsCache(oldData, newStatus, payment)
    );

    // Invalida queries relacionadas
    queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
    queryClient.invalidateQueries({ queryKey: ["payment-stats"] });

    // Mostra notificação
    toast({
      title: "Status atualizado",
      description: `O status do pagamento foi alterado para ${newStatus}.`,
      duration: 3000,
    });
  });

  // Hook para novas mensagens na conversa
  const conversationRealtime = useConversationMessagesRealtime(
    conversationId || `payment-${paymentId}`,
    (message) => {
      if (!enabled || !conversationId) return;

      log.info("Nova mensagem na conversa", { message, conversationId });

      // Incrementa contador de atualizações
      incrementUpdateCount();

      // Chama callback personalizado
      onNewMessage?.(message);

      // Invalida queries de conversa
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });

      // Mostra notificação
      toast({
        title: "Nova mensagem",
        description: "Uma nova mensagem foi recebida na conversa.",
        duration: 3000,
      });
    }
  );

  // Estado combinado da conexão
  const isConnected =
    paymentRealtime.isConnected && (!conversationId || conversationRealtime.isConnected);

  const isReconnecting =
    paymentRealtime.isReconnecting || (conversationId && conversationRealtime.isReconnecting);

  const hasError = !!paymentRealtime.error || (conversationId && !!conversationRealtime.error);

  // Função para reconectar manualmente
  const reconnect = useCallback(() => {
    paymentRealtime.reconnect?.();
    if (conversationId) {
      conversationRealtime.reconnect?.();
    }
  }, [paymentRealtime, conversationRealtime, conversationId]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    paymentRealtime.disconnect?.();
    if (conversationId) {
      conversationRealtime.disconnect?.();
    }
  }, [paymentRealtime, conversationRealtime, conversationId]);

  // Função para forçar atualização dos dados
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["payment-details", paymentId] });
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    }
    resetUpdateCount();
  }, [queryClient, paymentId, conversationId, resetUpdateCount]);

  return {
    // Estado da conexão
    isConnected,
    isReconnecting,
    hasError,
    error: paymentRealtime.error || conversationRealtime.error,

    // Indicadores de atualização
    hasNewUpdates,
    newUpdateCount,
    resetUpdateCount,

    // Funções
    refreshData,
    reconnect,
    disconnect,

    // Estatísticas
    stats: {
      paymentConnected: paymentRealtime.isConnected,
      conversationConnected: conversationId ? conversationRealtime.isConnected : true,
      totalUpdates: newUpdateCount,
      lastUpdate: new Date().toISOString(),
    },
  };
}

// Hook simplificado para uso em componentes
export function usePaymentDetailsRealtimeSimple(paymentId: string) {
  const queryClient = useQueryClient();
  const { incrementUpdateCount } = useRealtimeIndicator();

  const { isConnected, isReconnecting, error } = usePaymentStatusRealtime(
    paymentId,
    (newStatus, _oldStatus, payment) => {
      log.info("Pagamento atualizado", { paymentId, newStatus });

      // Atualiza o cache
      queryClient.setQueryData(["payment-details", paymentId], (oldData: unknown) =>
        mergePaymentDetailsCache(oldData, newStatus, payment)
      );

      // Incrementa contador
      incrementUpdateCount();

      // Notificação
      toast({
        title: "Pagamento atualizado",
        description: `O status foi alterado para ${newStatus}.`,
        duration: 2000,
      });
    }
  );

  return {
    isConnected,
    isReconnecting,
    hasError: !!error,
    error,
  };
}
