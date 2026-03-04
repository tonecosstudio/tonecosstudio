// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentType = "onetime" | "voucher" | "subscription";
export type SubscriptionPeriod = "quarterly" | "semiannual" | "annual";

interface PaymentInfo {
  payment_type: PaymentType;
  subscription_period: SubscriptionPeriod | null;
  pix_key: string;
  payment_link: string;
}

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
      const { data, error } = await supabase.rpc("get_payment_info_for_type", {
        p_payment_type: paymentType,
        p_subscription_period: subscriptionPeriod || null,
      });

      if (error) throw error;

      return data?.[0] as PaymentInfo | null;
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
      const { data, error } = await supabase.rpc("get_pix_key_for_payment", {
        p_payment_type: paymentType,
        p_subscription_period: subscriptionPeriod || null,
      });

      if (error) throw error;

      return data as string;
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
      const { data, error } = await supabase.rpc("get_payment_link_for_payment", {
        p_payment_type: paymentType,
        p_subscription_period: subscriptionPeriod || null,
      });

      if (error) throw error;

      return data as string;
    },
    enabled: !!paymentType,
  });
}
