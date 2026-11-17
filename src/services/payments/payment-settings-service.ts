import { supabase } from "@/integrations/supabase/client";

export type PaymentType = "onetime" | "voucher" | "subscription";
export type SubscriptionPeriod = "bimonthly" | "quarterly" | "semiannual" | "annual";

export interface PaymentInfo {
  payment_type: PaymentType;
  subscription_period: SubscriptionPeriod | null;
  pix_key: string;
  payment_link: string;
}

function getPaymentSettingSuffix(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod,
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

export async function getPaymentSettings(
  paymentType: PaymentType,
  subscriptionPeriod?: SubscriptionPeriod,
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
