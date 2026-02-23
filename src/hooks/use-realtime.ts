// @ts-nocheck
/**
 * Barrel file para exportar todos os hooks de realtime do sistema de pagamento
 * 
 * Este arquivo fornece uma interface unificada para importar hooks de realtime
 * do sistema de pagamento manual.
 */

// Exportar tipos e interfaces
export type {
  RealtimeConnectionState,
  ReconnectionConfig,
  UsePaymentRealtimeOptions,
} from "./use-payment-realtime";

export type {
  SupportMessage,
  SupportConversation,
  UseConversationRealtimeOptions,
} from "./use-conversation-realtime";

export type {
  UsePaymentSystemRealtimeOptions,
  CombinedConnectionState,
} from "./use-payment-system-realtime";

// Exportar hooks principais
export {
  usePaymentRealtime,
  usePaymentStatusRealtime,
  useNewPaymentsRealtime,
} from "./use-payment-realtime";

export {
  useConversationRealtime,
  useConversationMessagesRealtime,
  useMessageReadRealtime,
  usePaymentConversationRealtime,
} from "./use-conversation-realtime";

export {
  usePaymentSystemRealtime,
  usePaymentWithConversationRealtime,
  useUserPaymentsRealtime,
  useAdminDashboardRealtime,
} from "./use-payment-system-realtime";

// Exportar hook de notificação existente (para compatibilidade)
export {
  useNotificationCount,
  useFormattedNotificationCount,
} from "./use-notification-count";

/**
 * Hook utilitário para verificar se o Supabase Realtime está disponível
 */
export function useRealtimeAvailable(): boolean {
  // Verificar se o Supabase está configurado com realtime
  // Esta é uma verificação básica - em produção, pode ser mais complexa
  try {
    const { supabase } = require("@/integrations/supabase/client");
    return !!supabase && typeof supabase.channel === "function";
  } catch {
    return false;
  }
}

/**
 * Hook para gerenciar múltiplas assinaturas de realtime
 */
export function useRealtimeManager() {
  const subscriptions = new Map<string, { disconnect: () => void }>();

  const subscribe = <T extends { disconnect: () => void }>(
    key: string,
    subscription: T
  ): T => {
    // Remover assinatura anterior com a mesma chave
    if (subscriptions.has(key)) {
      subscriptions.get(key)?.disconnect();
    }

    subscriptions.set(key, subscription);
    return subscription;
  };

  const unsubscribe = (key: string): void => {
    if (subscriptions.has(key)) {
      subscriptions.get(key)?.disconnect();
      subscriptions.delete(key);
    }
  };

  const unsubscribeAll = (): void => {
    subscriptions.forEach(subscription => {
      subscription.disconnect();
    });
    subscriptions.clear();
  };

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getSubscriptionCount: () => subscriptions.size,
  };
}