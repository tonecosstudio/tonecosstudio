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

function getPaymentSettingSuffix(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod
): string {
  if (paymentType === "subscription") {
    if (!subscriptionPeriod) {
      throw new Error("Periodo de assinatura obrigatorio para pagamento de assinatura");
    }

    return `subscription_${subscriptionPeriod}`;
  }

  return paymentType;
}

function settingValueToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

async function getPaymentSettings(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod
): Promise<PaymentInfo> {
  const suffix = getPaymentSettingSuffix(paymentType, subscriptionPeriod);
  const pixKeySetting = `pix_key_${suffix}`;
  const paymentLinkSetting = `payment_link_${suffix}`;

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", [pixKeySetting, paymentLinkSetting]);

  if (error) {
    throw error;
  }

  const settingsByKey = new Map((data ?? []).map((setting) => [setting.key, setting.value]));

  return {
    payment_type: paymentType,
    subscription_period: paymentType === "subscription" ? subscriptionPeriod ?? null : null,
    pix_key: settingValueToString(settingsByKey.get(pixKeySetting)),
    payment_link: settingValueToString(settingsByKey.get(paymentLinkSetting)),
  };
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
