import type { SubscriptionPeriod } from "@/services/payments/payment-settings-service";

export function subscriptionPaymentPeriodForPlanType(
  planType: string | undefined,
): SubscriptionPeriod | null {
  switch (planType?.trim().toLocaleLowerCase()) {
    case "bimestral":
    case "bimonthly":
      return "bimonthly";
    case "trimestral":
    case "quarterly":
      return "quarterly";
    case "semestral":
    case "semiannual":
      return "semiannual";
    case "anual":
    case "annual":
      return "annual";
    default:
      return null;
  }
}
