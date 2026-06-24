import { isRealtimeAvailable } from "@/services/realtime/realtime-service";

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

export { useNotificationCount, useFormattedNotificationCount } from "./use-notification-count";

export function useRealtimeAvailable(): boolean {
  return isRealtimeAvailable();
}

export function useRealtimeManager() {
  const subscriptions = new Map<string, { disconnect: () => void }>();

  const subscribe = <T extends { disconnect: () => void }>(key: string, subscription: T): T => {
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
    subscriptions.forEach((subscription) => {
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
