import { useQuery } from "@tanstack/react-query";
import {
  getPaymentSettings,
  type PaymentType,
  type SubscriptionPeriod,
} from "@/services/payments/payment-settings-service";

export type { PaymentInfo, PaymentType, SubscriptionPeriod } from "@/services/payments/payment-settings-service";

/**
 * Hook para buscar chaves PIX e links de pagamento baseado no tipo de transação
 */
export function usePaymentKeys(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod
) {
  return useQuery({
    queryKey: ["payment-keys", paymentType, subscriptionPeriod],
    queryFn: async () => {
      return getPaymentSettings(paymentType, subscriptionPeriod);
    },
    enabled: !!paymentType,
  });
}

/**
 * Hook para buscar apenas a chave PIX
 */
export function usePixKey(paymentType: PaymentType, subscriptionPeriod?: SubscriptionPeriod) {
  return useQuery({
    queryKey: ["pix-key", paymentType, subscriptionPeriod],
    queryFn: async () => {
      const settings = await getPaymentSettings(paymentType, subscriptionPeriod);
      return settings.pix_key;
    },
    enabled: !!paymentType,
  });
}

/**
 * Hook para buscar apenas o link de pagamento
 */
export function usePaymentLink(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod
) {
  return useQuery({
    queryKey: ["payment-link", paymentType, subscriptionPeriod],
    queryFn: async () => {
      const settings = await getPaymentSettings(paymentType, subscriptionPeriod);
      return settings.payment_link;
    },
    enabled: !!paymentType,
  });
}
