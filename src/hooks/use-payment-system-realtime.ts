/**
 * usePaymentSystemRealtime - Hook combinado para assinar todo o sistema de pagamento em tempo real
 *
 * Requirements: 16.1-16.15
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * Este hook combina usePaymentRealtime e useConversationRealtime para fornecer
 * uma interface unificada para assinar todas as mudanças relevantes do sistema de pagamento.
 */

import { useCallback } from "react";
import { usePaymentRealtime, UsePaymentRealtimeOptions } from "./use-payment-realtime";
import {
  useConversationRealtime,
  UseConversationRealtimeOptions,
} from "./use-conversation-realtime";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";
import type { SupportMessage, SupportConversation } from "./use-conversation-realtime";

/**
 * Opções para o hook usePaymentSystemRealtime
 */
export interface UsePaymentSystemRealtimeOptions {
  /** Configuração para assinaturas de pagamento */
  paymentOptions?: UsePaymentRealtimeOptions;
  /** Configuração para assinaturas de conversa */
  conversationOptions?: UseConversationRealtimeOptions;
  /** Se deve assinar pagamentos (padrão: true) */
  subscribeToPayments?: boolean;
  /** Se deve assinar conversas (padrão: true) */
  subscribeToConversations?: boolean;
}

/**
 * Estado combinado da conexão
 */
export interface CombinedConnectionState {
  /** Se todas as conexões estão ativas */
  isConnected: boolean;
  /** Se alguma conexão está tentando reconectar */
  isReconnecting: boolean;
  /** Número total de tentativas de reconexão */
  retryCount: number;
  /** Último erro de qualquer conexão */
  error: Error | null;
  /** Se a conexão de pagamento está ativa */
  paymentConnected: boolean;
  /** Se a conexão de conversa está ativa */
  conversationConnected: boolean;
}

/**
 * Hook combinado para assinar todo o sistema de pagamento em tempo real
 *
 * @param options Opções de configuração
 * @returns Estado combinado e funções de controle
 */
export function usePaymentSystemRealtime(options: UsePaymentSystemRealtimeOptions = {}) {
  const {
    paymentOptions = {},
    conversationOptions = {},
    subscribeToPayments = true,
    subscribeToConversations = true,
  } = options;

  // Hook para pagamentos
  const paymentRealtime = usePaymentRealtime({
    ...paymentOptions,
    // Desabilitar se não deve assinar pagamentos
    ...(subscribeToPayments ? {} : { events: [] }),
  });

  // Hook para conversas
  const conversationRealtime = useConversationRealtime({
    ...conversationOptions,
    // Desabilitar se não deve assinar conversas
    ...(subscribeToConversations
      ? {}
      : { subscribeToMessages: false, subscribeToConversations: false }),
  });

  // Calcular estado combinado
  const isConnected =
    (!subscribeToPayments || paymentRealtime.isConnected) &&
    (!subscribeToConversations || conversationRealtime.isConnected);

  const isReconnecting = paymentRealtime.isReconnecting || conversationRealtime.isReconnecting;

  const retryCount = Math.max(paymentRealtime.retryCount, conversationRealtime.retryCount);

  const error = paymentRealtime.error || conversationRealtime.error;

  /**
   * Desconecta todas as assinaturas
   */
  const disconnectAll = useCallback(() => {
    paymentRealtime.disconnect();
    conversationRealtime.disconnect();
  }, [paymentRealtime, conversationRealtime]);

  /**
   * Reconecta todas as assinaturas
   */
  const reconnectAll = useCallback(() => {
    paymentRealtime.reconnect();
    conversationRealtime.reconnect();
  }, [paymentRealtime, conversationRealtime]);

  return {
    // Estado combinado
    isConnected,
    isReconnecting,
    retryCount,
    error,
    paymentConnected: paymentRealtime.isConnected,
    conversationConnected: conversationRealtime.isConnected,

    // Estados individuais
    paymentState: paymentRealtime,
    conversationState: conversationRealtime,

    // Funções de controle
    disconnectAll,
    reconnectAll,
    disconnectPayment: paymentRealtime.disconnect,
    reconnectPayment: paymentRealtime.reconnect,
    disconnectConversation: conversationRealtime.disconnect,
    reconnectConversation: conversationRealtime.reconnect,
  };
}

/**
 * Hook para assinar um pagamento específico e sua conversa associada
 *
 * @param paymentId ID do pagamento
 * @param onPaymentChange Callback quando o pagamento muda
 * @param onConversationChange Callback quando a conversa muda
 * @param onNewMessage Callback quando há nova mensagem
 * @returns Estado combinado
 */
export function usePaymentWithConversationRealtime(
  paymentId: string,
  onPaymentChange?: (payment: ManualPayment, oldPayment: ManualPayment | null) => void,
  onConversationChange?: (conversation: SupportConversation) => void,
  onNewMessage?: (message: SupportMessage) => void
) {
  const combinedState = usePaymentSystemRealtime({
    paymentOptions: {
      paymentId,
      events: ["UPDATE"],
      onPaymentChange: (payload) => {
        if (payload.event === "UPDATE" && payload.new && onPaymentChange) {
          onPaymentChange(payload.new as ManualPayment, payload.old as ManualPayment | null);
        }
      },
    },
    conversationOptions: {
      paymentId,
      events: ["UPDATE", "INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: true,
      onConversationUpdate: (conversation) => {
        if (onConversationChange) {
          onConversationChange(conversation);
        }
      },
      onNewMessage,
    },
  });

  return combinedState;
}

/**
 * Hook para assinar todos os pagamentos de um usuário e suas conversas
 *
 * @param userId ID do usuário
 * @param onNewPayment Callback quando um novo pagamento é criado
 * @param onPaymentStatusChange Callback quando o status de um pagamento muda
 * @param onNewMessage Callback quando há nova mensagem nas conversas do usuário
 * @returns Estado combinado
 */
export function useUserPaymentsRealtime(
  userId: string,
  onNewPayment?: (payment: ManualPayment) => void,
  onPaymentStatusChange?: (
    paymentId: string,
    newStatus: PaymentStatus,
    oldStatus: PaymentStatus | null
  ) => void,
  onNewMessage?: (message: SupportMessage) => void
) {
  const combinedState = usePaymentSystemRealtime({
    paymentOptions: {
      userId,
      events: ["INSERT", "UPDATE"],
      onPaymentChange: (payload) => {
        if (payload.event === "INSERT" && payload.new && onNewPayment) {
          onNewPayment(payload.new as ManualPayment);
        } else if (payload.event === "UPDATE" && payload.new && onPaymentStatusChange) {
          const oldStatus = payload.old?.status as PaymentStatus | null;
          const newStatus = payload.new.status as PaymentStatus;

          if (oldStatus !== newStatus) {
            onPaymentStatusChange(payload.new.id, newStatus, oldStatus);
          }
        }
      },
    },
    conversationOptions: {
      userId,
      events: ["INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: false,
      onNewMessage,
    },
  });

  return combinedState;
}

/**
 * Hook para o dashboard admin assinar todos os pagamentos pendentes
 *
 * @param onNewPayment Callback quando um novo pagamento é criado
 * @param onPaymentStatusChange Callback quando o status de um pagamento muda
 * @param onNewMessage Callback quando há nova mensagem
 * @returns Estado combinado
 */
export function useAdminDashboardRealtime(
  onNewPayment?: (payment: ManualPayment) => void,
  onPaymentStatusChange?: (
    paymentId: string,
    newStatus: PaymentStatus,
    oldStatus: PaymentStatus | null
  ) => void,
  onNewMessage?: (message: SupportMessage) => void
) {
  const combinedState = usePaymentSystemRealtime({
    paymentOptions: {
      status: ["pending", "under_review", "requires_info"],
      events: ["INSERT", "UPDATE"],
      onPaymentChange: (payload) => {
        if (payload.event === "INSERT" && payload.new && onNewPayment) {
          onNewPayment(payload.new as ManualPayment);
        } else if (payload.event === "UPDATE" && payload.new && onPaymentStatusChange) {
          const oldStatus = payload.old?.status as PaymentStatus | null;
          const newStatus = payload.new.status as PaymentStatus;

          if (oldStatus !== newStatus) {
            onPaymentStatusChange(payload.new.id, newStatus, oldStatus);
          }
        }
      },
    },
    conversationOptions: {
      events: ["INSERT"],
      subscribeToMessages: true,
      subscribeToConversations: false,
      onNewMessage,
    },
  });

  return combinedState;
}
